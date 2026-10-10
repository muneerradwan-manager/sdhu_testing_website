"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Hand, KeyRound, Layers, Plane, RadioTower, UserPlus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
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
import { useRegistrationStatus } from "../hajj/desk";
import { ago, fmtDate, fmtDateTime, Gate, PageHeader, Panel, useNow, useStaffUser } from "../_components/kit";
import { useSystemEvents, type Alert } from "../_components/system";
import { Box, EditHeader, EditLayout, EmptyRow, ListTable, RowActions, RowLink } from "../_components/wp";

const BASE = "/staff/systems";

/**
 * The director's page for the management permissions — «إدارة الامتحانات», «إدارة الطيران»: each one
 * opens a whole file to whoever holds it. The page itself is an overview: how each file stands, what blocks
 * it, what its holders raise to her and its important events — nothing of its daily detail, which stays with
 * them. Who holds a permission is managed on its own screen (`?id=`), where she grants it and takes it back.
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
  const confirmed = desk.attempts.filter((a) => a.status === "confirmed");
  return {
    state: desk.live.length
      ? { label: `اختبار جارٍ الآن في ${desk.live.length} قاعات`, tone: "green", icon: <RadioTower className="size-4" /> }
      : desk.high.length
        ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: <AlertTriangle className="size-4" /> }
        : { label: "تسير بانتظام", tone: "green", icon: <CheckCircle2 className="size-4" /> },
    numbers: [
      { k: "اختبارات منشورة", v: `${halls.exams.filter((e) => e.status === "published").length} من ${halls.exams.length}` },
      { k: "ينتظرون اختبارهم", v: desk.expected.length },
      { k: "جلسات جارية الآن", v: desk.live.length },
      { k: "نتائج مؤكَّدة", v: confirmed.length, hint: `ناجحون ${confirmed.filter((a) => a.passed).length}${desk.decisions.length ? ` · تحتاج قراراً ${desk.decisions.length}` : ""}` },
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
  const params = useSearchParams();
  const id = params.get("id") as SystemKey | null;
  const seen = useStore((s) => s.systems?.seen);
  // What was new when the page opened stays marked while she reads it
  const [since] = useState(() => seen ?? {});
  useEffect(() => {
    for (const k of SYSTEM_KEYS) systemActions.seen(k);
  }, []);
  const status: Record<SystemKey, Status> = { staff: useEmployeesStatus(), registration: useRegistrationStatus(), admins: useAdminsStatus(), exams: useExamStatus(), flights: useFlightsStatus() };

  if (id && SYSTEM_KEYS.includes(id)) return <HoldersScreen key={id} system={id} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="مدير الموسم" title="صلاحيات الإدارة" icon={<Layers />} description="حال كل ملف إدارة وما يعطّله وأحداثه المهمة. منح الصلاحية وسحبها من «من يحملها» في كل ملف." />
      {SYSTEM_KEYS.map((k) => (
        <FileOverview key={k} system={k} since={since[k] ?? 0} status={status[k]} />
      ))}
      <Box title="أي الملفات صارت صلاحيات إدارة؟" open={false}>
        <p>الموظفون والتسجيل على الحج والإداريون والامتحانات والطيران صارت صلاحيات إدارة: تفتح الملف كله لصاحبها، فيديره بتفاصيله دون عشرات الصلاحيات الصغيرة.</p>
        <p>مراجعة الطلبات والقبول والقرعة، والتسكين في مكة والمدينة والمشاعر، وغرفة العمليات، ومحتوى الموقع ما زالت صلاحيات لمهام منفصلة، وتصير صلاحية إدارة لكل ملف تباعاً.</p>
      </Box>
    </div>
  );
}

/** One file, read only: its state, its numbers, what blocks it, what was raised, its important events */
function FileOverview({ system, since, status }: { system: SystemKey; since: number; status: Status }) {
  const holders = useHolders()[system];
  const events = useSystemEvents(system, true);
  const now = useNow(30_000);
  const def = SYSTEMS[system];
  const escalations = events.filter((e) => e.action === "رفع أمر إلى المدير").slice(0, 3);
  const fresh = events.filter((e) => e.live && e.at > since).length;

  return (
    <Panel
      title={def.label}
      icon={<KeyRound />}
      action={
        <Chip tone={status.state.tone} className="px-3 py-1.5 text-sm">
          {status.state.icon} {status.state.label}
        </Chip>
      }
    >
      <p className="mb-4 flex flex-wrap items-center gap-x-2 text-sm text-white/75">
        <span>يحملها: {holders.length ? <b className="text-white">{holders.map((h) => h.staff.name).join(" و")}</b> : <b className="text-[#ffb4c8]">لا أحد — الملف بلا من يديره</b>}</span>
        <Link href={`${BASE}?id=${system}`} className="font-bold text-gold hover:underline">
          من يحملها ←
        </Link>
      </p>

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
        <div className="mt-4">
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

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
          <AlertTriangle className="size-4 text-gold" /> ما يعطّل العمل
        </p>
        {status.high.length === 0 ? (
          <p className="text-sm text-white/70">لا شيء يعطّل العمل الآن.</p>
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

      <div className="mt-4">
        <Box title={`أهم الأحداث (${events.length})${fresh ? ` — ${fresh} جديد` : ""}`} open={fresh > 0}>
          {events.length === 0 ? (
            <p className="text-white/60">لا أحداث مهمة بعد.</p>
          ) : (
            <ol className="space-y-2">
              {events.slice(0, 8).map((e) => {
                const isNew = e.live && e.at > since;
                return (
                  <li key={e.id} className={cn("rounded-xl p-3 ring-1", isNew ? "bg-gold/10 ring-gold/40" : "bg-white/[.05] ring-white/10")}>
                    <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                      {isNew && <Chip tone="gold">جديد</Chip>}
                      {e.action}
                      {e.target ? ` — ${e.target}` : ""}
                    </p>
                    {(e.after || e.detail) && <p className="mt-0.5 text-xs leading-5 text-white/70">{[e.before && `${e.before} ←`, e.after, e.action === "رفع أمر إلى المدير" ? "" : e.detail].filter(Boolean).join(" ")}</p>}
                    <p className="mt-1 text-[11px] text-white/50">
                      {e.actor} · {e.live ? ago(e.at, now) : fmtDateTime(e.at)}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Box>
      </div>
    </Panel>
  );
}

/** Who holds one management permission: the list, with «سحب» under each name, and «منح» in the side box */
function HoldersScreen({ system }: { system: SystemKey }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const holders = useHolders()[system];
  const changes = useSystemEvents(system, true).filter((e) => e.action === "منح صلاحية" || e.action === "سحب صلاحية");
  const now = useNow(30_000);
  const [to, setTo] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const def = SYSTEMS[system];
  const leaving = holders.find((h) => h.staffId === revoking);

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
    <div>
      <EditHeader back={BASE} backLabel="صلاحيات الإدارة" title={`«${def.label}»: من يحملها`}>
        {def.desc}
      </EditHeader>
      <EditLayout
        main={
          <ListTable head={["الموظف", "الصفة", "يحملها منذ"]} minWidth="30rem">
            {holders.length === 0 && <EmptyRow cols={3}>لا أحد يحملها: الملف بلا من يديره. امنحها لموظف من الصندوق الجانبي.</EmptyRow>}
            {holders.map((h) => (
              <tr key={h.staffId} className="align-top">
                <td className="p-3">
                  <p className="flex items-center gap-2 font-bold text-white">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold to-gold-dark font-display text-ink">{h.staff.initials}</span>
                    {h.staff.name}
                  </p>
                  <RowActions>
                    <RowLink danger onClick={() => setRevoking(h.staffId)}>
                      سحب الصلاحية
                    </RowLink>
                  </RowActions>
                </td>
                <td className="p-3 text-xs text-white/70">{h.staff.title}</td>
                <td className="p-3 text-xs text-white/70">{h.at ? fmtDate(h.at) : "منذ فتح الموسم"}</td>
              </tr>
            ))}
          </ListTable>
        }
        side={
          <>
            <Box title="منح الصلاحية">
              <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label={`منح ${def.label}`}>
                <option value="">— اختر موظفاً —</option>
                {STAFF.filter((s) => !holders.some((h) => h.staffId === s.id)).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.title}
                  </option>
                ))}
              </select>
              <Button variant="gold" className="w-full" disabled={!to} onClick={grant}>
                <UserPlus className="size-4" /> منح
              </Button>
              <p className="text-xs leading-5 text-white/55">تكفيه هذه الصلاحية وحدها ليدير الملف كله: تظهر له «{def.summary.label}» و«{def.manage.label}».</p>
            </Box>
            <Box title="سجل المنح والسحب" open={false}>
              {changes.length === 0 ? (
                <p className="text-white/60">لا تغييرات مسجّلة بعد.</p>
              ) : (
                <ol className="space-y-2">
                  {changes.slice(0, 10).map((e) => (
                    <li key={e.id} className="text-xs">
                      <p className="font-bold text-white">
                        {e.action} — {e.target}
                      </p>
                      <p className="text-white/55">
                        {e.actor} · {e.live ? ago(e.at, now) : fmtDateTime(e.at)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Box>
          </>
        }
      />

      <Modal open={!!leaving} onClose={() => setRevoking(null)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {leaving && (
          <div>
            <p className="font-display text-xl font-bold">
              سحب «{def.label}» من {leaving.staff.name}؟
            </p>
            <p className="mt-2 text-sm leading-7 text-white/75">{holders.length === 1 ? "هو وحده يحملها: سيبقى الملف بلا من يديره." : "يبقى الملف مع غيره."} لا يعود يرى الملف، ويُسجَّل السحب باسمك.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="maroon" onClick={() => revoke(leaving.staffId)}>
                سحب
              </Button>
              <Button variant="glass" onClick={() => setRevoking(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
