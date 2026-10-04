"use client";

import { CalendarClock, Landmark, MapPin, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useToast } from "@/components/ui/widgets";
import { getPerson } from "@/lib/registry";
import { STAFF } from "@/lib/staff";
import { cn, maskNationalId } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { EXAM_CENTERS, STAGE_LABEL, centerById, centerOf, hallActions, mustSit, roleKeyOf, runKey, stageOf, useHalls, type HallStage } from "@/app/administrator/_lib/halls";
import { useAdminRows } from "../_components/data";
import { Panel, logAs, smallInputClass, useStaffUser } from "../_components/kit";

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
  muted: "bg-white/10 text-white/70 ring-white/15",
} as const;

function Chip({ tone = "green", children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

const STAGE_TONE: Record<HallStage, keyof typeof CHIP> = { idle: "muted", open: "gold", running: "green", ended: "gold", closed: "muted" };
const selectClass = cn(smallInputClass, "[&>option]:text-ink");

/** Everyone who still has to sit the written this season, with his role and centre */
function useApplicants() {
  const rows = useAdminRows();
  const halls = useHalls();
  return rows
    .filter((r) => mustSit(r.profile))
    .map((r) => ({ row: r, role: roleKeyOf(r.profile.positions[0] ?? r.position), center: centerOf(r.id, halls.moved) }));
}

/**
 * The exam's map, for the exam desk: each role's day and hour (the same in every centre), each centre's
 * hall and the staff account supervising it, and who sits where — by registry governorate, unless the
 * desk moves an applicant to another centre.
 */
export function CentersAndSessions({ manage }: { manage: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const applicants = useApplicants();

  const assign = (centerId: string, staffId: string) => {
    const center = centerById(centerId)!;
    hallActions.assignSupervisor(centerId, staffId);
    const who = STAFF.find((s) => s.id === staffId);
    logAs(user, { action: staffId ? "إسناد مشرف قاعة امتحانية" : "إلغاء إسناد مشرف قاعة", target: center.name, after: who?.name ?? "—" });
    toast({ title: who ? `${who.name} مشرف ${center.name}` : `${center.name} بلا مشرف`, body: who ? "تظهر له «قاعتي الامتحانية» في قائمته." : undefined, tone: "success", icon: "🏛️" });
  };

  return (
    <div className="space-y-4">
      <Panel icon={<CalendarClock />} title="جلسات الامتحان">
        <p className="text-sm leading-7 text-white/70">لكل صفة جلسة واحدة في يوم وساعة واحدين في كل المراكز: يؤدي كل المتقدمين لتلك الصفة الامتحان معاً، كلٌّ في قاعة مركزه.</p>
        <ul className="mt-4 space-y-2">
          {APPLIED_ROLES.map((r) => {
            const s = halls.sessions[r.key];
            const stages = EXAM_CENTERS.map((c) => stageOf(halls.runs[runKey(r.key, c.id)])).filter((x) => x !== "idle");
            const count = applicants.filter((a) => a.role === r.key).length;
            return (
              <li key={r.key} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                <p className="min-w-40 flex-1 font-bold text-white">
                  امتحان {r.label}
                  <span className="block text-xs font-normal text-white/60">{count} متقدمين لم يؤدّوه بعد</span>
                </p>
                <span className="w-44 shrink-0">
                  <input
                    value={s.date}
                    disabled={!manage}
                    onChange={(e) => hallActions.setSession(r.key, { ...s, date: e.target.value })}
                    onBlur={() => logAs(user, { action: "تعديل موعد جلسة امتحان", target: `امتحان ${r.label}`, after: `${s.date} — ${s.time}` })}
                    className={smallInputClass}
                    aria-label={`تاريخ امتحان ${r.label}`}
                  />
                </span>
                <span className="w-24 shrink-0">
                  <input
                    value={s.time}
                    disabled={!manage}
                    dir="ltr"
                    onChange={(e) => hallActions.setSession(r.key, { ...s, time: e.target.value })}
                    onBlur={() => logAs(user, { action: "تعديل موعد جلسة امتحان", target: `امتحان ${r.label}`, after: `${s.date} — ${s.time}` })}
                    className={cn(smallInputClass, "text-center")}
                    aria-label={`ساعة امتحان ${r.label}`}
                  />
                </span>
                <span className="flex flex-wrap gap-1">
                  {stages.length ? (
                    (["open", "running", "ended", "closed"] as HallStage[]).map((st) => {
                      const n = stages.filter((x) => x === st).length;
                      return n ? <Chip key={st} tone={STAGE_TONE[st]}>{STAGE_LABEL[st]} في {n}</Chip> : null;
                    })
                  ) : (
                    <Chip tone="muted">لم تُفتح في أي مركز</Chip>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel icon={<Landmark />} title="المراكز الامتحانية ومشرفو القاعات">
        <p className="text-sm leading-7 text-white/70">
          لكل مركز قاعته ومشرفها. المشرف موظف تسنده هنا، فتظهر له في قائمته «قاعتي الامتحانية»: منها يفتح القاعة ويؤكد الحضور ويبدأ الامتحان وينهيه ويغلق القاعة. الإسناد لا يمنحه أي صلاحية أخرى.
        </p>
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {EXAM_CENTERS.map((c) => {
            const sup = halls.supervisors[c.id] ?? "";
            const here = applicants.filter((a) => a.center?.id === c.id).length;
            const live = APPLIED_ROLES.map((r) => ({ r, st: stageOf(halls.runs[runKey(r.key, c.id)]) })).filter((x) => x.st !== "idle");
            return (
              <li key={c.id} className={cn("rounded-2xl p-4 ring-1", sup ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-white/65"><MapPin className="size-3" /> {c.hall}</p>
                    <p className="text-xs text-white/55">يخدم: {c.governorates.join("، ")}</p>
                  </div>
                  <Chip tone={here ? "gold" : "muted"}>{here} متقدمين</Chip>
                </div>
                <label className="mt-3 block text-sm text-white/80">
                  <span className="mb-1 block text-xs text-white/60">مشرف القاعة</span>
                  <select value={sup} disabled={!manage} onChange={(e) => assign(c.id, e.target.value)} className={selectClass} aria-label={`مشرف قاعة ${c.name}`}>
                    <option value="">— لم يُسند —</option>
                    {STAFF.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.title}
                      </option>
                    ))}
                  </select>
                </label>
                {!sup && <p className="mt-2 text-xs font-bold text-gold">بلا مشرف: لا تُفتح قاعة هذا المركز حتى تسند مشرفاً.</p>}
                {live.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-1">
                    {live.map(({ r, st }) => (
                      <Chip key={r.key} tone={STAGE_TONE[st]}>{r.label}: {STAGE_LABEL[st]}</Chip>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel icon={<UsersRound />} title="توزيع المتقدمين على المراكز">
        <p className="text-sm leading-7 text-white/70">يؤدي كل متقدم الامتحان في مركز محافظة قيده تلقائياً. انقله إلى مركز آخر حين يلزم، أو أسند مركزاً لمن لا تتبع محافظته أي مركز.</p>
        <ul className="mt-4 space-y-2">
          {applicants.map(({ row, role, center }) => {
            const auto = centerOf(row.id);
            const moved = halls.moved[row.id];
            return (
              <li key={row.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", center ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{row.name}</p>
                  <p className="text-xs text-white/65">
                    {APPLIED_ROLES.find((r) => r.key === role)?.label ?? row.position} · <span dir="ltr">{maskNationalId(row.id)}</span> · {getPerson(row.id)?.governorate ?? "محافظة غير معروفة"}
                  </p>
                </div>
                {moved && <Chip tone="gold">نقله قسم الامتحانات</Chip>}
                <span className="w-60 max-w-full shrink-0">
                <select
                  value={moved ?? ""}
                  disabled={!manage}
                  onChange={(e) => {
                    const to = e.target.value || undefined;
                    hallActions.move(row.id, to);
                    logAs(user, { action: "نقل متقدم إلى مركز امتحاني", target: row.name, before: center?.name ?? "بلا مركز", after: centerById(to)?.name ?? auto?.name ?? "بلا مركز" });
                  }}
                  className={selectClass}
                  aria-label={`مركز ${row.name}`}
                >
                  <option value="">{auto ? `تلقائي — ${auto.name}` : "— بلا مركز —"}</option>
                  {EXAM_CENTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                </span>
              </li>
            );
          })}
          {!applicants.length && <li className="rounded-2xl bg-white/[.06] p-4 text-sm text-white/70">لا متقدمين ينتظرون الامتحان الكتابي: كل من دفع رسم التسجيل أدّاه أو أُعفي منه.</li>}
        </ul>
      </Panel>
    </div>
  );
}
