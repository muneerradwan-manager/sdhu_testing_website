"use client";

import { CheckCircle2, PenLine } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { pointsOf } from "@/lib/data/admin-exam";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAllQuestions } from "@/app/administrator/_lib/admin-rules";
import { markedExam } from "@/app/administrator/_lib/halls";
import { patchAdmin, useAdminRows, type AdminRow } from "../_components/data";
import { Empty, Panel, logAs, useStaffUser } from "../_components/kit";

/** A paper's number for the grader: the applicant's name stays hidden until the mark is in */
export const paperCode = (id: string) => `1448-W-${id.slice(-5)}`;

/** The written answers still to grade, paper by paper */
export function usePendingWritten() {
  const rows = useAdminRows();
  return rows.flatMap((r) => {
    const e = r.profile.exam;
    const ids = (e?.toGrade ?? []).filter((id) => e?.marks?.[id] === undefined);
    return e?.submittedAt && ids.length ? [{ row: r, ids }] : [];
  });
}

/**
 * Grading the written answers. The automated questions were marked the moment a paper was sent; the
 * written ones wait here for an authorised grader, who sees the paper's number, not its owner's name,
 * with what the answer should contain. The written mark is final once its last answer is graded.
 */
export function Grading({ manage }: { manage: boolean }) {
  const pending = usePendingWritten();
  const answers = pending.reduce((a, p) => a + p.ids.length, 0);
  return (
    <Panel icon={<PenLine />} title="تصحيح الأسئلة التحريرية" action={<span className="text-xs font-bold text-gold">{answers} إجابات في {pending.length} أوراق</span>} bodyClass="space-y-4">
      <p className="text-sm leading-7 text-white/70">
        الأسئلة المؤتمتة تُصحَّح فور الإرسال، والتحريرية تنتظر هنا مصححاً مخوّلاً. يرى المصحح رقم الورقة لا اسم صاحبها، وما ينتظره السؤال من الإجابة. تكتمل علامة الكتابي حين تُصحَّح آخر إجابة في الورقة، ويراها المتقدم في بوابته.
      </p>
      {!pending.length && <Empty icon={<CheckCircle2 />} title="لا إجابات تنتظر التصحيح" text="كل ما أُرسل من أوراق صُحّح." />}
      {pending.map(({ row, ids }) => (
        <Paper key={row.id} row={row} ids={ids} manage={manage} />
      ))}
    </Panel>
  );
}

function Paper({ row, ids, manage }: { row: AdminRow; ids: number[]; manage: boolean }) {
  const all = useAllQuestions();
  const e = row.profile.exam!;
  const sectionOf = (id: number) => e.paper?.find((s) => s.ids.includes(id));
  return (
    <div className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg font-bold text-gold" dir="ltr">{paperCode(row.id)}</span>
        <span className="text-xs text-white/65">علامته المبدئية {e.provisional} من 100</span>
      </p>
      <ul className="mt-3 space-y-3">
        {ids.map((id) => {
          const q = all.find((x) => x.id === id);
          return q ? <Answer key={id} row={row} qid={id} max={pointsOf(q)} text={q.text} guide={q.explanation} section={sectionOf(id)?.name} manage={manage} /> : null;
        })}
      </ul>
    </div>
  );
}

function Answer({ row, qid, max, text, guide, section, manage }: { row: AdminRow; qid: number; max: number; text: string; guide: string; section?: string; manage: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [mark, setMark] = useState<number | null>(null);
  const e = row.profile.exam!;

  const save = () => {
    if (mark === null) return;
    const next = markedExam(e, qid, mark, user.name);
    patchAdmin(row, { exam: next }, actions.upsertAdmin);
    logAs(user, { action: "تصحيح إجابة تحريرية", target: `ورقة ${paperCode(row.id)}`, after: `${mark} من ${max}`, detail: next.score !== undefined ? `اكتملت علامة الكتابي: ${next.score} من 100` : undefined });
    toast({ title: `حُفظت الدرجة: ${mark} من ${max}`, body: next.score !== undefined ? `اكتملت الورقة: الكتابي ${next.score} من 100.` : "بقيت إجابات في هذه الورقة.", tone: "success", icon: "✍️" });
  };

  return (
    <li className="rounded-2xl bg-black/15 p-3 ring-1 ring-white/10">
      {section && <p className="text-xs font-bold text-gold">{section}</p>}
      <p className="mt-0.5 font-bold text-white">{text}</p>
      <p className="mt-2 whitespace-pre-line rounded-xl bg-white/[.07] p-3 text-sm leading-7 text-white">{String(e.answers[qid] ?? "")}</p>
      <p className="mt-2 text-xs leading-6 text-white/60"><b className="text-white/80">ما ينتظره السؤال: </b>{guide}</p>
      {manage ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/80">الدرجة:</span>
          {Array.from({ length: max + 1 }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={mark === i}
              onClick={() => setMark(i)}
              className={cn("grid size-9 place-items-center rounded-xl text-sm font-bold ring-1 transition", mark === i ? "bg-gold text-ink ring-gold" : "bg-white/10 text-white ring-white/15 hover:bg-white/20")}
            >
              {i}
            </button>
          ))}
          <span className="text-sm text-white/60">من {max}</span>
          <Button size="sm" variant="gold" disabled={mark === null} onClick={save}>
            <CheckCircle2 className="size-4" /> حفظ الدرجة
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/55">التصحيح من صلاحية شؤون الإداريين والامتحانات.</p>
      )}
    </li>
  );
}
