"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Hand, KeyRound, Layers, Plane, RadioTower, ScrollText, Star, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { STAFF } from "@/lib/staff";
import { useStore } from "@/lib/store";
import { SYSTEM_KEYS, SYSTEMS, systemActions, useHolders, type SystemKey } from "@/lib/systems";
import { cn, formatNumber } from "@/lib/utils";
import { useHalls } from "@/app/administrator/_lib/halls";
import { useAdminsStatus } from "../admins/desk";
import { useEmployeesStatus } from "../employees/desk";
import { useExamDesk } from "../exam/_components/desk";
import { Chip, selectClass } from "../exam/_components/ui";
import { useFlightsDesk } from "../flights/desk";
import { ago, Empty, fmtDate, fmtDateTime, Gate, PageHeader, Panel, useNow, useStaffUser } from "../_components/kit";
import { useSystemEvents, type Alert } from "../_components/system";

/**
 * The director's page for the management permissions — «إدارة الامتحانات», «إدارة الطيران»: each one
 * opens a whole file to whoever holds it. She grants it and takes it back here, and follows each file's
 * state, what blocks it, what its holders raise to her, and its important events — nothing of its daily
 * detail, which stays with them.
 */
export function SystemsView() {
  return (
    <Gate perms={["systems.assign"]}>
      <Systems />
    </Gate>
  );
}

/** How one file stands, in the few words and numbers the director needs */
type Status = { state: { label: string; tone: "green" | "maroon"; icon: ReactNode }; numbers: { k: string; v: ReactNode; hint?: string }[]; high: Alert[] };

function useExamStatus(): Status {
  const desk = useExamDesk();
  const halls = useHalls();
  return {
    state: desk.live.length
      ? { label: `امتحان جارٍ الآن في ${desk.live.length} قاعات`, tone: "green", icon: <RadioTower className="size-4" /> }
      : desk.high.length
        ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: <AlertTriangle className="size-4" /> }
        : { label: "تسير بانتظام", tone: "green", icon: <CheckCircle2 className="size-4" /> },
    numbers: [
      { k: "امتحانات مفعّلة", v: `${halls.exams.filter((e) => !e.off).length} من ${halls.exams.length}` },
      { k: "ينتظرون امتحانهم", v: desk.expected.length },
      { k: "جلسات جارية الآن", v: desk.live.length },
      { k: "نتائج معلنة", v: desk.count("published"), hint: `الناجحون ${desk.passed}` },
    ],
    high: desk.high,
  };
}

function useFlightsStatus(): Status {
  const desk = useFlightsDesk();
  return {
    state: desk.inAir.length
      ? { label: `في الجو الآن ${desk.inAir.length} رحلات`, tone: "green", icon: <Plane className="size-4" /> }
      : desk.high.length
        ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: <AlertTriangle className="size-4" /> }
        : { label: "تسير بانتظام", tone: "green", icon: <CheckCircle2 className="size-4" /> },
    numbers: [
      { k: "رحلات الموسم", v: desk.live.length, hint: `${desk.drafts.length} مسودة` },
      { k: "مقاعد الحجاج المسندة", v: formatNumber(desk.seated), hint: `من ${formatNumber(desk.seats)}` },
      { k: "بلا رحلة ذهاب", v: formatNumber(desk.travellers - desk.withOut), hint: `من ${formatNumber(desk.travellers)}` },
      { k: "أقلعت", v: desk.done.length, hint: desk.inAir.length ? `في الجو ${desk.inAir.length}` : undefined },
    ],
    high: desk.high,
  };
}

function Systems() {
  const seen = useStore((s) => s.systems?.seen);
  // What was new when the page opened stays marked while she reads it
  const [since] = useState(() => seen ?? {});
  useEffect(() => {
    for (const k of SYSTEM_KEYS) systemActions.seen(k);
  }, []);
  const status: Record<SystemKey, Status> = { staff: useEmployeesStatus(), admins: useAdminsStatus(), exams: useExamStatus(), flights: useFlightsStatus() };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مدير الموسم"
        title="صلاحيات الإدارة"
        icon={<Layers />}
        description="صلاحية إدارة الملف تفتحه كله لصاحبها، فيديره بتفاصيله دون عشرات الصلاحيات الصغيرة. تمنحها هنا وتسحبها، وتتابع حال كل ملف وما يعطّله وأحداثه المهمة فقط، ويصلك من أصحابها ما يحتاج تدخّلك."
      />
      {SYSTEM_KEYS.map((k) => (
        <PermissionCard key={k} system={k} since={since[k] ?? 0} status={status[k]} />
      ))}
      <p className="rounded-2xl bg-white/[.05] p-4 text-sm leading-7 text-white/65 ring-1 ring-white/10">
        الموظفون والإداريون والامتحانات والطيران صارت صلاحيات إدارة. التسجيل والقبول، والتسكين في مكة والمدينة والمشاعر، وغرفة العمليات، ومحتوى الموقع ما زالت صلاحيات لمهام منفصلة، وتصير صلاحية إدارة لكل ملف تباعاً.
      </p>
    </div>
  );
}

function PermissionCard({ system, since, status }: { system: SystemKey; since: number; status: Status }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const holders = useHolders()[system];
  const events = useSystemEvents(system, true);
  const now = useNow(30_000);
  const [to, setTo] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const def = SYSTEMS[system];
  const escalations = events.filter((e) => e.action === "رفع أمر إلى المدير").slice(0, 3);

  const grant = () => {
    if (!to) return;
    systemActions.grant(system, to, user);
    toast({ title: `مُنحت «${def.label}»`, body: `${STAFF.find((s) => s.id === to)?.name}: تظهر له «${def.summary.label}» و«${def.manage.label}».`, tone: "success", icon: "🔑" });
    setTo("");
  };
  const revoke = (id: string) => {
    systemActions.revoke(system, id, user);
    toast({ title: `سُحبت «${def.label}»`, body: `${STAFF.find((s) => s.id === id)?.name}: لم يعد يرى الملف.`, tone: "info", icon: "🔒" });
    setRevoking(null);
  };

  return (
    <Panel bodyClass="-m-5 grid md:-m-6 lg:grid-cols-[21rem_1fr]">
      {/* The permission and who holds it */}
      <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-l md:p-6">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-gold">
          <KeyRound className="size-5" /> {def.label}
        </p>
        <p className="mt-1 text-sm leading-6 text-white/70">{def.desc}</p>
        <p className="mt-4 text-xs font-bold text-white/60">يحملها</p>
        {holders.length === 0 ? (
          <p className="mt-1 rounded-2xl bg-maroon/25 p-3 text-sm font-bold text-white ring-1 ring-maroon/50">لا أحد: الملف بلا من يديره.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {holders.map((h) => (
              <li key={h.staffId} className="rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold-dark font-display text-lg font-bold text-ink">{h.staff.initials}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-white">{h.staff.name}</p>
                    <p className="truncate text-xs text-white/60">
                      {h.staff.title}
                      {h.at ? ` · منذ ${fmtDate(h.at)}` : ""}
                    </p>
                  </div>
                  {revoking !== h.staffId && (
                    <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={() => setRevoking(h.staffId)} aria-label={`سحب الصلاحية من ${h.staff.name}`}>
                      <UserMinus className="size-4" />
                    </Button>
                  )}
                </div>
                {revoking === h.staffId && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/75">
                    {holders.length === 1 ? "هو وحده يحملها: سيبقى الملف بلا من يديره." : "يبقى الملف مع غيره."}
                    <Button size="sm" variant="maroon" onClick={() => revoke(h.staffId)}>
                      سحب
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white" onClick={() => setRevoking(null)}>
                      تراجع
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label={`منح ${def.label}`}>
            <option value="">— منحها لموظف —</option>
            {STAFF.filter((s) => !holders.some((h) => h.staffId === s.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.title}
              </option>
            ))}
          </select>
          <Button size="sm" variant="gold" className="h-11 shrink-0" disabled={!to} onClick={grant}>
            <UserPlus className="size-4" /> منح
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/55">تكفيه هذه الصلاحية وحدها ليدير الملف كله.</p>
      </div>

      {/* How the file stands */}
      <div className="space-y-5 p-5 md:p-6">
        <Chip tone={status.state.tone} className="px-3 py-1.5 text-sm">
          {status.state.icon} {status.state.label}
        </Chip>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {status.numbers.map((s) => (
            <div key={s.k} className="rounded-2xl bg-black/15 p-3">
              <dt className="text-[11px] text-white/60">{s.k}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-white">{s.v}</dd>
              {s.hint && <dd className="text-[11px] text-white/55">{s.hint}</dd>}
            </div>
          ))}
        </dl>

        {escalations.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
              <Hand className="size-4 text-gold" /> طلبات تدخّل
            </p>
            <ul className="space-y-2">
              {escalations.map((e) => (
                <li key={e.id} className="rounded-2xl bg-maroon/25 p-3 ring-1 ring-maroon/50">
                  <p className="text-sm leading-6 text-white">{e.detail}</p>
                  <p className="mt-1 text-[11px] text-white/60">
                    {e.actor} · {e.live ? ago(e.at, now) : fmtDateTime(e.at)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
            <AlertTriangle className="size-4 text-gold" /> ما يعطّل العمل
          </p>
          {status.high.length === 0 ? (
            <p className="rounded-2xl bg-green-light/15 p-3 text-sm text-white ring-1 ring-green-light/30">لا شيء يعطّل العمل الآن.</p>
          ) : (
            <ul className="space-y-2">
              {status.high.map((a) => (
                <li key={a.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                  <p className="text-sm font-bold text-white">{a.title}</p>
                  <p className="text-xs text-white/65">{a.hint}</p>
                </li>
              ))}
              <li className="text-xs text-white/55">يعالجها {holders.map((h) => h.staff.name).join(" و") || "صاحب الصلاحية"}، ويراها في «ما ينتظرك الآن».</li>
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
            <ScrollText className="size-4 text-gold" /> أهم الأحداث
          </p>
          {events.length === 0 ? (
            <Empty icon={<Star />} title="لا أحداث مهمة بعد" />
          ) : (
            <ol className="space-y-2">
              {events.slice(0, 8).map((e, i) => {
                const fresh = e.live && e.at > since;
                return (
                  <motion.li key={e.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={cn("rounded-2xl p-3 ring-1", fresh ? "bg-gold/10 ring-gold/40" : "bg-white/[.05] ring-white/10")}>
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-white">
                      {fresh && <Chip tone="gold">جديد</Chip>}
                      {e.action}
                      {e.target ? ` — ${e.target}` : ""}
                    </p>
                    {(e.after || e.detail) && <p className="mt-0.5 text-xs leading-5 text-white/70">{[e.before && `${e.before} ←`, e.after, e.action === "رفع أمر إلى المدير" ? "" : e.detail].filter(Boolean).join(" ")}</p>}
                    <p className="mt-1 text-[11px] text-white/50">
                      {e.actor} · {e.live ? ago(e.at, now) : fmtDateTime(e.at)}
                    </p>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </Panel>
  );
}
