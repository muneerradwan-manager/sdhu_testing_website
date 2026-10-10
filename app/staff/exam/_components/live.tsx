"use client";

import { STAGE_LABEL } from "@/app/administrator/_lib/halls";
import { cn } from "@/lib/utils";
import { fmtTime, useNow } from "../../_components/kit";
import { EmptyRow, ListTable, RowActions, RowLink, Tag } from "../../_components/wp";
import { useExamDesk } from "./desk";
import { Records } from "./records";
import { useSittingRows, type SittingRow } from "./sittings";

/** A sitting's numbers as its supervisor's panel counts them */
export function liveCounts(s: SittingRow) {
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
  if (left <= 0) return "انتهى الوقت";
  const m = Math.floor(left / 60_000);
  const sec = Math.floor((left % 60_000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * The sittings open or running now, one line each, to follow them as they go: where each stands, its time left,
 * and in it how many came, ask to enter, are answering, wait for confirmation and are confirmed. Nothing is done
 * from here: the supervisor runs his sitting from his own panel. The totals are on the file's dashboard.
 */
export function LiveSittings() {
  const desk = useExamDesk();
  const rows = useSittingRows(desk).filter((s) => s.stage === "open" || s.stage === "running");
  const now = useNow(1000);

  return (
    <div className="space-y-5">
      <ListTable head={["الجلسة", "الحالة", "الوقت", "حاضرون", "طلبات معلّقة", "يختبرون", "بانتظار التأكيد", "مؤكَّدون"]} minWidth="58rem">
        {rows.length === 0 && <EmptyRow cols={8}>لا توجد جلسات مفتوحة أو جارية الآن. تظهر هنا كل جلسة منذ يفتح المشرف قاعتها حتى ينهيها.</EmptyRow>}
        {rows.map((s) => {
          const c = liveCounts(s);
          const left = timeLeft(s, now);
          const hot = (v: number) => (v ? "font-bold text-gold" : "");
          return (
            <tr key={s.key} className="align-top">
              <td className="p-3">
                <p className="font-bold text-white">{s.exam.name}</p>
                <p className="text-xs text-white/55">
                  {s.center.name} · {s.supervisor?.name ?? "بلا مشرف"}
                </p>
                <RowActions>
                  <RowLink href={`/staff/exam/manage/people?c=${s.center.id}`}>متقدمو القاعة</RowLink>
                  <RowLink href={`/staff/exam/manage/results?s=${s.key}`}>النتائج</RowLink>
                </RowActions>
              </td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  <Tag tone={s.stage === "running" ? "green" : "gold"}>{STAGE_LABEL[s.stage]}</Tag>
                  {s.run?.mobileData && <Tag tone="gold">بيانات الجوال (طوارئ)</Tag>}
                </span>
              </td>
              <td className="p-3 text-xs text-white/70">
                فُتحت {s.run?.openedAt ? fmtTime(s.run.openedAt) : "—"}
                <span className="block">بدأ {s.run?.startedAt ? fmtTime(s.run.startedAt) : "لم يبدأ"}</span>
                {left && <span className="block font-bold tabular-nums text-gold">بقي {left}</span>}
              </td>
              <td className="p-3 tabular-nums">
                {c.present} <span className="text-xs text-white/50">من {c.listed}</span>
              </td>
              <td className={cn("p-3 tabular-nums", hot(c.requests))}>{c.requests}</td>
              <td className="p-3 tabular-nums">{c.testing}</td>
              <td className={cn("p-3 tabular-nums", hot(c.waiting))}>{c.waiting}</td>
              <td className="p-3 tabular-nums">{c.confirmed}</td>
            </tr>
          );
        })}
      </ListTable>
      <Records area="live" />
    </div>
  );
}
