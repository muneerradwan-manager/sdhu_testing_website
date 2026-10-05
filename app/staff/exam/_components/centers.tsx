"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { AlertTriangle, Check, Landmark, MapPin, Pencil, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { GOVERNORATES } from "@/lib/ops";
import { getStaff, STAFF } from "@/lib/staff";
import { cn } from "@/lib/utils";
import { hallActions, runKey, STAGE_LABEL, stageOf, useHalls, type ExamCenter } from "@/app/administrator/_lib/halls";
import { Drawer, Panel, logAs, smallInputClass, useStaffUser } from "../../_components/kit";
import { useExamDesk } from "./desk";
import { RecordHistory, Records } from "./records";
import { Chip, Field, Pick, Switch, selectClass } from "./ui";

/**
 * The centres where the written is sat. Each serves governorates — an applicant sits in his registry
 * governorate's centre unless moved — and has a hall, its seats and the supervisor who runs its sittings.
 * A centre is created, edited, and switched off or on here, all from one card and one form.
 */
export function Centers() {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const desk = useExamDesk();
  const [editing, setEditing] = useState<ExamCenter | "new" | null>(null);
  const [confirmOff, setConfirmOff] = useState<string | null>(null);
  const served = new Set(halls.live.flatMap((c) => c.governorates));
  const uncovered = GOVERNORATES.filter((g) => !served.has(g));

  const setActive = (c: ExamCenter, on: boolean) => {
    const live = halls.exams.some((e) => ["open", "running"].includes(stageOf(halls.runs[runKey(e.id, c.id)])));
    if (!on && live) {
      toast({ title: "في القاعة جلسة الآن", body: "لا يُعطَّل مركز وقاعته مفتوحة. انتظر حتى ينهي المشرف الامتحان.", tone: "warning", icon: "🏛️" });
      return;
    }
    hallActions.saveCenter({ ...c, off: on ? undefined : true }, halls.centers);
    logAs(user, { action: on ? "تفعيل مركز امتحاني" : "تعطيل مركز امتحاني", target: c.name, detail: on ? undefined : `${desk.expected.filter((a) => a.center?.id === c.id).length} متقدمين كانوا فيه`, system: "exams", area: "centers", ref: c.id, important: true });
    toast({ title: on ? `فُعّل ${c.name}` : `عُطّل ${c.name}`, body: on ? "يعود إليه متقدمو محافظاته." : "لا يُسند إليه أحد، ولا تُفتح قاعته.", tone: on ? "success" : "info", icon: "🏛️" });
    setConfirmOff(null);
  };

  return (
    <div className="space-y-4">
      <Panel
        icon={<Landmark />}
        title="المراكز الامتحانية"
        action={
          <Button size="sm" variant="gold" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> مركز جديد
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          {halls.live.length} مراكز فعّالة{halls.centers.length > halls.live.length ? ` و${halls.centers.length - halls.live.length} معطّلة` : ""}. يُسند كل متقدم تلقائياً إلى مركز محافظة قيده، ولكل مركز مشرف قاعة يفتحها ويدير جلساتها. اضغط «تعديل» لتغيير أي شيء في المركز من مكان واحد.
        </p>
        {uncovered.length > 0 && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-maroon/20 p-3 text-sm text-white ring-1 ring-maroon/50">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" /> محافظات لا يخدمها أي مركز فعّال: {uncovered.join("، ")}. من كان قيده فيها يبقى بلا مركز حتى تضيفها إلى مركز أو تنقله.
          </p>
        )}
      </Panel>

      <ul className="grid gap-3 lg:grid-cols-2">
        {halls.centers.map((c, i) => {
          const sup = halls.supervisorOf(c.id);
          const here = desk.expected.filter((a) => a.center?.id === c.id);
          const live = halls.exams.map((e) => ({ e, st: stageOf(halls.runs[runKey(e.id, c.id)]) })).filter((x) => x.st === "open" || x.st === "running");
          const full = desk.crowded.filter((x) => x.center.id === c.id);
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn("rounded-3xl p-4 ring-1", c.off ? "bg-black/20 ring-white/10" : !sup && here.length ? "bg-maroon/15 ring-maroon/40" : "bg-white/[.06] ring-white/10")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("flex flex-wrap items-center gap-2 font-display text-lg font-bold", c.off ? "text-white/50" : "text-white")}>
                    {c.name} {c.off && <Chip tone="muted">معطّل</Chip>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-white/65">
                    <MapPin className="size-3 shrink-0" /> {c.hall}
                  </p>
                  <p className="mt-0.5 text-xs text-white/55">يخدم: {c.governorates.length ? c.governorates.join("، ") : "لا محافظة — يُنقل إليه المتقدمون نقلاً"}</p>
                </div>
                <Switch on={!c.off} onChange={(on) => (on ? setActive(c, true) : setConfirmOff(c.id))} label={`${c.name} فعّال`} />
              </div>

              {confirmOff === c.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 rounded-2xl bg-maroon/25 p-3 text-sm text-white ring-1 ring-maroon/50">
                  <p>
                    تعطيل {c.name}: {here.length ? `${here.length} متقدمين ينتظرون فيه يصبحون بلا مركز حتى تضيف محافظاتهم إلى مركز آخر أو تنقلهم.` : "لا أحد ينتظر فيه الآن."} ويصل الخبر إلى مديرة الموسم.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="maroon" onClick={() => setActive(c, false)}>
                      تعطيل
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white" onClick={() => setConfirmOff(null)}>
                      تراجع
                    </Button>
                  </div>
                </motion.div>
              )}

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-black/15 p-2">
                  <dt className="text-[11px] text-white/60">ينتظرون</dt>
                  <dd className="font-display text-xl font-bold tabular-nums text-white">{here.length}</dd>
                </div>
                <div className="rounded-xl bg-black/15 p-2">
                  <dt className="text-[11px] text-white/60">المقاعد</dt>
                  <dd className={cn("font-display text-xl font-bold tabular-nums", full.length ? "text-gold" : "text-white")}>{c.capacity ?? "—"}</dd>
                </div>
                <div className="rounded-xl bg-black/15 p-2">
                  <dt className="text-[11px] text-white/60">جلسات الآن</dt>
                  <dd className="font-display text-xl font-bold tabular-nums text-white">{live.length}</dd>
                </div>
              </dl>

              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <ShieldCheck className="size-4 text-gold" />
                {sup ? (
                  <span className="text-white">
                    مشرف القاعة: <b>{sup.name}</b>
                  </span>
                ) : (
                  <span className="font-bold text-gold">بلا مشرف{here.length ? ": لا تُفتح قاعته حتى تسند مشرفاً" : ""}</span>
                )}
              </p>
              {(live.length > 0 || full.length > 0) && (
                <p className="mt-2 flex flex-wrap gap-1">
                  {live.map(({ e, st }) => (
                    <Chip key={e.id} tone="green">
                      {e.name}: {STAGE_LABEL[st]}
                    </Chip>
                  ))}
                  {full.map((x) => (
                    <Chip key={x.exam.id} tone="maroon">
                      {x.exam.name}: {x.n} لـ {c.capacity} مقعداً
                    </Chip>
                  ))}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="glass" onClick={() => setEditing(c)}>
                  <Pencil className="size-4" /> تعديل
                </Button>
                <Link href={`/staff/exam/manage/people?c=${c.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-gold hover:bg-white/10">
                  <UsersRound className="size-4" /> متقدموه
                </Link>
              </div>
            </motion.li>
          );
        })}
      </ul>

      <Records area="centers" />
      <CenterDrawer center={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

type Draft = { name: string; hall: string; governorates: string[]; capacity: string; supervisor: string };

function CenterDrawer({ center, onClose }: { center: ExamCenter | "new" | null; onClose: () => void }) {
  return (
    <Drawer open={!!center} onClose={onClose} title={center === "new" ? "مركز امتحاني جديد" : center ? `تعديل ${center.name}` : ""} width="max-w-xl">
      {center && <CenterForm key={center === "new" ? "new" : center.id} center={center === "new" ? null : center} onClose={onClose} />}
    </Drawer>
  );
}

function CenterForm({ center, onClose }: { center: ExamCenter | null; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const halls = useHalls();
  const [d, setD] = useState<Draft>(() => ({
    name: center?.name ?? "",
    hall: center?.hall ?? "",
    governorates: center?.governorates ?? [],
    capacity: center?.capacity ? String(center.capacity) : "",
    supervisor: center ? (halls.supervisors[center.id] ?? "") : "",
  }));
  const ownerOf = (g: string) => halls.centers.find((c) => c.id !== center?.id && c.governorates.includes(g));

  const save = () => {
    if (!d.name.trim() || !d.hall.trim()) {
      toast({ title: "أكمل اسم المركز وقاعته", tone: "warning", icon: "✍️" });
      return;
    }
    const id = center?.id ?? `c-${Date.now().toString(36)}`;
    const next: ExamCenter = {
      id,
      name: d.name.trim(),
      hall: d.hall.trim(),
      governorates: d.governorates,
      ...(Number(d.capacity) > 0 ? { capacity: Number(d.capacity) } : {}),
      // Switched off and on from its card, where the director hears of it
      ...(center?.off ? { off: true as const } : {}),
    };
    const taken = d.governorates.filter((g) => ownerOf(g)).map((g) => `${g} من ${ownerOf(g)!.name}`);
    hallActions.saveCenter(next, halls.centers);
    logAs(user, {
      action: center ? "تعديل مركز امتحاني" : "إضافة مركز امتحاني",
      target: next.name,
      after: `${next.hall} — ${next.governorates.join("، ") || "بلا محافظة"}${next.capacity ? ` — ${next.capacity} مقعداً` : ""}`,
      detail: taken.length ? `انتقلت إليه: ${taken.join("، ")}` : undefined,
      system: "exams",
      area: "centers",
      ref: id,
      important: !center,
    });
    const before = center ? (halls.supervisors[center.id] ?? "") : "";
    if (d.supervisor !== before) {
      hallActions.assignSupervisor(id, d.supervisor);
      logAs(user, { action: d.supervisor ? "إسناد مشرف قاعة امتحانية" : "إلغاء إسناد مشرف قاعة", target: next.name, before: getStaff(before)?.name, after: getStaff(d.supervisor)?.name ?? "—", system: "exams", area: "centers", ref: id });
    }
    toast({ title: center ? `حُفظ ${next.name}` : `أُضيف ${next.name}`, body: d.supervisor ? `مشرف قاعته ${getStaff(d.supervisor)?.name}، وتظهر له «قاعتي الامتحانية».` : "لم يُسند له مشرف بعد.", tone: "success", icon: "🏛️" });
    onClose();
  };

  return (
    <div className="space-y-4">
      <Field label="اسم المركز">
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={smallInputClass} placeholder="مركز طرطوس" />
      </Field>
      <Field label="القاعة وموقعها" hint="يراه المتقدم في بوابته مع موعد امتحانه.">
        <input value={d.hall} onChange={(e) => setD({ ...d, hall: e.target.value })} className={smallInputClass} placeholder="قاعة الامتحانات — مديرية أوقاف طرطوس" />
      </Field>
      <div>
        <p className="mb-1 text-sm font-bold text-white">المحافظات التي يخدمها</p>
        <p className="mb-2 text-xs leading-5 text-white/60">يُسند إليه تلقائياً كل متقدم قيده في هذه المحافظات. المحافظة تتبع مركزاً واحداً: إن اخترت محافظة يخدمها مركز آخر انتقلت إلى هذا.</p>
        <div className="flex flex-wrap gap-1.5">
          {GOVERNORATES.map((g) => {
            const other = ownerOf(g);
            const on = d.governorates.includes(g);
            return (
              <Pick key={g} on={on} onClick={() => setD({ ...d, governorates: on ? d.governorates.filter((x) => x !== g) : [...d.governorates, g] })}>
                {g}
                {other && !on && <span className="font-normal text-white/40"> ({other.name.replace("مركز ", "")})</span>}
              </Pick>
            );
          })}
        </div>
      </div>
      <Field label="عدد المقاعد" hint="لكل جلسة. ينبهك النظام إن زاد متقدمو امتحان في المركز عليها.">
        <input type="number" min={0} value={d.capacity} onChange={(e) => setD({ ...d, capacity: e.target.value })} className={cn(smallInputClass, "w-32 text-center")} dir="ltr" />
      </Field>
      <Field label="مشرف القاعة" hint="يفتح القاعة ويؤكد الحضور ويبدأ الامتحان وينهيه. تظهر له «قاعتي الامتحانية»، ولا يمنحه الإسناد شيئاً آخر.">
        <select value={d.supervisor} onChange={(e) => setD({ ...d, supervisor: e.target.value })} className={selectClass}>
          <option value="">— لم يُسند —</option>
          {STAFF.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex gap-2 pt-2">
        <Button variant="gold" onClick={save}>
          <Check className="size-4" /> {center ? "حفظ المركز" : "إضافة المركز"}
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
      {center && <RecordHistory refId={center.id} />}
    </div>
  );
}
