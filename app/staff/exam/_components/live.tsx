"use client";

import { motion } from "motion/react";
import { DoorOpen, Hourglass, RadioTower, ShieldCheck } from "lucide-react";
import { STAGE_LABEL } from "@/app/administrator/_lib/halls";
import { cn } from "@/lib/utils";
import { Empty, Panel, fmtTime, useNow } from "../../_components/kit";
import { useExamDesk } from "./desk";
import { Records } from "./records";
import { useSittingRows, type SittingRow } from "./sittings";
import { Chip, Figure } from "./ui";

/** A sitting's numbers as its supervisor's panel counts them */
function countsOf(s: SittingRow) {
  const n = (st: string) => s.attempts.filter((a) => a.status === st).length;
  return {
    listed: s.listed.length,
    present: Object.keys(s.run?.present ?? {}).length,
    requests: Object.keys(s.run?.requests ?? {}).length,
    testing: n("active"),
    waiting: n("submitted"),
    confirmed: n("confirmed"),
  };
}

/** «12:40» left of the test's time from its start; nothing before it starts */
function timeLeft(s: SittingRow, now: number) {
  if (!s.run?.startedAt) return null;
  const left = s.run.startedAt + s.exam.minutes * 60_000 - now;
  if (left <= 0) return "انتهى الوقت — بانتظار أن ينهي المشرف الجلسة";
  const m = Math.floor(left / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * The sittings open or running now, to follow them as they go: the halls opened and not started, the tests
 * under way with their time left, and in each how many came, are answering, wait for confirmation and are
 * confirmed. Nothing is done from here: the supervisor runs his sitting from his own panel.
 */
export function LiveSittings() {
  const desk = useExamDesk();
  const rows = useSittingRows(desk).filter((s) => s.stage === "open" || s.stage === "running");
  const now = useNow(1000);
  const all = rows.map(countsOf);
  const sum = (k: keyof ReturnType<typeof countsOf>) => all.reduce((a, c) => a + c[k], 0);

  return (
    <div className="space-y-4">
      <Panel icon={<RadioTower />} title="الجلسات الفعالة">
        <p className="text-sm leading-7 text-white/70">للمتابعة فقط؛ الإدارة الفعلية من لوحة المشرف. تتحدّث الأرقام وحدها كلما سجّل المشرف حضوراً أو وافق على دخول أو أكّد تسليماً.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          <Figure label="جلسات جارية" value={rows.filter((s) => s.stage === "running").length} tone={rows.some((s) => s.stage === "running") ? "green" : undefined} />
          <Figure label="قاعات مفتوحة (لم تبدأ)" value={rows.filter((s) => s.stage === "open").length} />
          <Figure label="حاضرون" value={sum("present")} />
          <Figure label="يختبرون الآن" value={sum("testing")} tone={sum("testing") ? "gold" : undefined} />
          <Figure label="بانتظار التأكيد" value={sum("waiting")} tone={sum("waiting") ? "gold" : undefined} />
          <Figure label="مؤكَّدون" value={sum("confirmed")} />
        </div>
      </Panel>

      {rows.length === 0 ? (
        <Panel>
          <Empty icon={<DoorOpen />} title="لا توجد جلسات مفتوحة أو جارية الآن." text="تظهر هنا كل جلسة منذ يفتح المشرف قاعتها حتى ينهيها." />
        </Panel>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {rows.map((s, i) => {
            const c = all[i];
            const left = timeLeft(s, now);
            return (
              <motion.li
                key={s.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn("rounded-3xl p-4 ring-1", s.stage === "running" ? "bg-green-light/10 ring-green-light/40" : "bg-white/[.06] ring-white/10")}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-white">{s.exam.name}</p>
                    <p className="text-xs text-white/65">
                      {s.center.name} · <ShieldCheck className="-mt-0.5 inline size-3 text-gold" /> {s.supervisor?.name ?? "بلا مشرف"}
                    </p>
                  </div>
                  <Chip tone={s.stage === "running" ? "green" : "gold"}>{STAGE_LABEL[s.stage]}</Chip>
                </div>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
                  <span>فُتحت {s.run?.openedAt ? fmtTime(s.run.openedAt) : "—"}</span>
                  <span>بدأ {s.run?.startedAt ? fmtTime(s.run.startedAt) : "لم يبدأ بعد"}</span>
                  {left && (
                    <span className="font-bold text-gold">
                      <Hourglass className="-mt-0.5 inline size-3" /> الوقت المتبقي: <span className="tabular-nums">{left}</span>
                    </span>
                  )}
                  {s.run?.mobileData && <span className="font-bold text-gold">بيانات الجوال مسموحة (طوارئ)</span>}
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                  {(
                    [
                      ["مدرجون", c.listed],
                      ["حاضرون", c.present],
                      ["طلبات معلّقة", c.requests],
                      ["يختبرون", c.testing],
                      ["بانتظار التأكيد", c.waiting],
                      ["مؤكَّدون", c.confirmed],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-black/15 p-2">
                      <dt className="text-[10px] leading-4 text-white/60">{k}</dt>
                      <dd className={cn("font-display text-xl font-bold tabular-nums", v && (k === "طلبات معلّقة" || k === "بانتظار التأكيد") ? "text-gold" : "text-white")}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </motion.li>
            );
          })}
        </ul>
      )}

      <Records area="live" />
    </div>
  );
}
