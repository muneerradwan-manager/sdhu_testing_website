"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Hand, KeyRound, Plane, RadioTower } from "lucide-react";
import type { ReactNode } from "react";
import { SYSTEMS, useHolders, type SystemKey } from "@/lib/systems";
import { cn, formatNumber } from "@/lib/utils";
import { useHalls } from "@/app/administrator/_lib/halls";
import { useExamDesk } from "../exam/_components/desk";
import { Chip } from "../exam/_components/ui";
import { useFlightsDesk } from "../flights/desk";
import { ago, can, fmtDateTime, Panel, useNow, useStaffUser } from "../_components/kit";
import { useSystemEvents, type Alert } from "../_components/system";
import { Box } from "../_components/wp";

/**
 * «ملفات الإدارة» on the permissions page: how each management file stands, what blocks it, what was raised to
 * the director (`access.escalations.GET`) and its important events (`access.important-events.GET`) — nothing of
 * its daily detail, which stays with whoever holds its permissions.
 */

export const BASE = "/staff/access";

/** A management file's key in the permissions catalog */
export const PERM_OF: Record<SystemKey, string> = { staff: "staff", registration: "registration", admins: "admins", exams: "exams", flights: "flights" };

/** How one file stands, in the few words and numbers the director needs */
export type Status = { state: { label: string; tone: "green" | "maroon"; icon: ReactNode }; numbers: { k: string; v: ReactNode; hint?: string }[]; high: Alert[] };

export function useExamStatus(): Status {
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

export function useFlightsStatus(): Status {
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

/** One file, read only: its state, its numbers, what blocks it, what was raised, its important events */
export function FileOverview({ system, since, status }: { system: SystemKey; since: number; status: Status }) {
  const user = useStaffUser();
  const holders = useHolders()[system];
  const events = useSystemEvents(system, true);
  const showEvents = can(user, "access.important-events.GET");
  const now = useNow(30_000);
  const def = SYSTEMS[system];
  const escalations = can(user, "access.escalations.GET") ? events.filter((e) => e.action === "رفع أمر إلى المدير").slice(0, 3) : [];
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
        <span>يتابع لوحته: {holders.length ? <b className="text-white">{holders.map((h) => h.staff.name).join(" و")}</b> : <b className="text-[#ffb4c8]">لا أحد — الملف بلا من يتابعه</b>}</span>
        <Link href={`${BASE}?system=${PERM_OF[system]}`} className="font-bold text-gold hover:underline">
          من يملك ماذا فيه ←
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
            <li className="text-xs text-white/55">يعالجها {holders.map((h) => h.staff.name).join(" و") || "من يملك صلاحياتها"}، ويراها في «ما ينتظرك الآن».</li>
          </ul>
        )}
      </div>

      {showEvents && (
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
      )}
    </Panel>
  );
}
