"use client";

import { useSearchParams } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { useState } from "react";
import { matches } from "@/lib/ops";
import type { StaffUser } from "@/lib/staff";
import { cn } from "@/lib/utils";
import { useAllQuestions } from "@/app/administrator/_lib/admin-rules";
import { ATTEMPT_LABEL, roleLabelOf, useHalls } from "@/app/administrator/_lib/halls";
import type { AdminRow } from "../../_components/data";
import { Drawer, Empty, fmtDateTime, logAs, useCan, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { EmptyRow, ListTable, RowActions, RowLink, Title } from "../../_components/wp";
import { useExamDesk, type AttemptRow } from "./desk";
import { Records, type Area } from "./records";
import { examOfAttempt, seatOf, useSittingRows } from "./sittings";
import { ATTEMPT_TONE, Chip, SectionChips, Segments, Switch, alertParts, downloadCsv, pct } from "./ui";

/** Who looked at whose answers, and when: every review of a paper is in the record */
export function logAnswers(user: StaffUser, a: AttemptRow, area: Area, examName?: string) {
  logAs(user, { action: "مراجعة إجابات", target: a.row.name, detail: examName, system: "exams", area, ref: a.row.id });
}

/** One attempt's answers, section by section: each question, what he chose, and the right option when he missed it */
export function AnswersDrawer({ a, onClose }: { a: AttemptRow | null; onClose: () => void }) {
  return (
    <Drawer open={!!a} onClose={onClose} title={a ? `إجابات ${a.row.name}` : ""} width="max-w-3xl">
      {a && <Answers a={a} />}
    </Drawer>
  );
}

function Answers({ a }: { a: AttemptRow }) {
  const halls = useHalls();
  const may = useCan();
  // An applicant's answers, the correct options and his national id are each confidential: each its own permission
  const seeAnswers = may("exams.attempt-answers.GET");
  const seeCorrect = may("exams.questions-answers.GET");
  const seePii = may("exams.applicants-pii.GET");
  const all = useAllQuestions();
  const byId = new Map(all.map((q) => [q.id, q]));
  const exam = halls.examById(examOfAttempt(a));
  const at = a.attempt;
  const parts = alertParts(at);
  const sent = !!at.submittedAt;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
        {sent && <Chip tone="muted">النسبة {pct(at.score)}</Chip>}
        {sent && a.status !== "voided" && <Chip tone={a.passed ? "green" : "maroon"}>{a.passed ? "ناجح في كل الأقسام" : "راسب"}</Chip>}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {[
          ["الاختبار", exam?.name ?? roleLabelOf(a.role)],
          ["القاعة", halls.centerById(a.centerId)?.name ?? "—"],
          ["الرقم الوطني", seePii ? <span key="id" dir="ltr">{a.row.id}</span> : "مخفي — صلاحية مستقلة"],
          ["بدأ", at.startedAt ? fmtDateTime(at.startedAt) : "—"],
          ["سلّم", at.submittedAt ? `${fmtDateTime(at.submittedAt)}${at.autoSubmitted ? " (تلقائياً)" : ""}` : "—"],
          ["أُكّد", at.confirmedAt ? `${fmtDateTime(at.confirmedAt)}${at.confirmedBy ? ` — ${at.confirmedBy}` : ""}` : "—"],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl bg-black/15 p-2">
            <dt className="text-[11px] text-white/60">{k}</dt>
            <dd className="font-bold leading-6 text-white">{v}</dd>
          </div>
        ))}
      </dl>
      {at.unconfirmedReason && <p className="rounded-2xl bg-maroon/20 p-3 text-sm leading-6 text-white ring-1 ring-maroon/40">لم يؤكده المشرف: {at.unconfirmedReason}</p>}
      {at.decision && (
        <p className="rounded-2xl bg-gold/10 p-3 text-sm leading-6 text-gold ring-1 ring-gold/40">
          {at.decision.kind === "approve" ? "اعتماد إداري" : "إلغاء إداري"} — {at.decision.by}، {fmtDateTime(at.decision.at)}: {at.decision.note}
        </p>
      )}
      {parts.length > 0 && (
        <p className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-white/60">التنبيهات:</span>
          {parts.map((p) => (
            <Chip key={p} tone="gold">
              {p}
            </Chip>
          ))}
        </p>
      )}

      {!seeAnswers ? (
        <Empty icon={<FileText />} title="الإجابات لا تظهر لك" text="الاطلاع على إجابات المتقدمين صلاحية مستقلة: «عرض — إجابات المتقدمين»." />
      ) : !at.paper?.length ? (
        <Empty icon={<FileText />} title="لا ورقة محفوظة لهذه المحاولة" text="سُلّمت قبل أن تُحفظ الأوراق قسماً قسماً، فتبقى نسبتها وحدها." />
      ) : (
        at.paper.map((sec) => {
          const res = a.sections.find((x) => x.id === sec.id);
          return (
            <section key={sec.id} className="rounded-2xl bg-white/[.05] p-3 ring-1 ring-white/10">
              <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                {sec.name}
                {res ? (
                  <Chip tone={res.passed ? "green" : "maroon"}>
                    {res.earned} من {res.possible} — {pct(res.percent)} / {res.pass}%
                  </Chip>
                ) : (
                  <Chip tone="muted">لم يُصحَّح بعد</Chip>
                )}
              </p>
              <ol className="mt-2 space-y-2">
                {sec.ids.map((id, i) => {
                  const q = byId.get(id);
                  const ans = at.answers[id];
                  const chosen = typeof ans === "number" && q ? q.options[ans] : undefined;
                  const ok = !!q && ans === q.answer;
                  return (
                    <li key={id} className={cn("rounded-xl p-2.5 ring-1", ok ? "bg-green-light/10 ring-green-light/25" : "bg-black/15 ring-white/10")}>
                      <p className="text-sm leading-6 text-white">
                        <span className="me-1 font-bold text-gold">{i + 1}.</span>
                        {q?.text ?? `سؤال ${id} — لم يعد في البنك`}
                      </p>
                      {q && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className={cn("font-bold", ok ? "text-white" : "text-gold")}>
                            {ok ? <Check className="-mt-0.5 inline size-3.5" /> : <X className="-mt-0.5 inline size-3.5" />} إجابته: {chosen ?? "لم يُجب"}
                          </span>
                          {!ok && seeCorrect && <span className="text-white/75">الصحيحة: {q.options[q.answer]}</span>}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}

/** One line of the results: an attempt, or an applicant absent from a sitting counted as failed */
type Line = { id: string; row: AdminRow; role: string; examId: string; centerId: string; a?: AttemptRow };

/**
 * The results as a list: confirmed attempts only by default, each with its share and every section's share against
 * the share it asks — the one who passed every section passed. Absentees can be counted as failed. Any attempt's
 * answers open for review, and every review is recorded. The pass rate and the means are on the dashboard and in
 * «الإحصائيات».
 */
export function Results() {
  const params = useSearchParams();
  const user = useStaffUser()!;
  const desk = useExamDesk();
  const halls = useHalls();
  const sittings = useSittingRows(desk);
  const [startExam, startHall] = (params.get("s") ?? "").split("@");
  const [exam, setExam] = useState(startExam && halls.examById(startExam) ? startExam : "");
  const [center, setCenter] = useState(startHall ?? "");
  const [absentFail, setAbsentFail] = useState(false);
  const [scope, setScope] = useState<"confirmed" | "sent">("confirmed");
  const [outcome, setOutcome] = useState<"all" | "passed" | "failed">("all");
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<AttemptRow | null>(null);
  const may = useCan();
  const seeAnswers = may("exams.attempt-answers.GET");
  const seePii = may("exams.applicants-pii.GET");

  const attempts = desk.attempts.filter((a) => (scope === "confirmed" ? a.status === "confirmed" : !!a.attempt.submittedAt) && (!exam || examOfAttempt(a) === exam) && (!center || a.centerId === center));
  const absent: Line[] = absentFail
    ? sittings
        .filter((s) => s.stage === "closed" && (!exam || s.exam.id === exam) && (!center || s.center.id === center))
        .flatMap((s) => s.listed.filter((r) => seatOf(s, r.id).absent).map((r) => ({ id: `${s.key}:${r.id}`, row: r, role: s.exam.role, examId: s.exam.id, centerId: s.center.id })))
    : [];
  const lines: Line[] = [...attempts.map((a) => ({ id: `${a.key}:${a.row.id}:${a.role}`, row: a.row, role: a.role, examId: examOfAttempt(a), centerId: a.centerId, a })), ...absent];
  const examName = (id: string) => halls.examById(id)?.name ?? `الاختبار المؤتمت لصفة ${roleLabelOf(id)}`;
  const resultOfLine = (l: Line) => (!l.a ? "راسب (غائب)" : l.a.status === "voided" ? "—" : l.a.passed ? "ناجح" : "راسب");
  const isPassed = (l: Line) => resultOfLine(l) === "ناجح";
  const isFailed = (l: Line) => resultOfLine(l).startsWith("راسب");
  const shown = lines.filter((l) => (outcome === "all" || (outcome === "passed" ? isPassed(l) : isFailed(l))) && matches(q, [l.row.name, seePii ? l.row.id : undefined]));

  const review = (a: AttemptRow) => {
    setViewing(a);
    logAnswers(user, a, "results", examName(examOfAttempt(a)));
  };

  const download = () => {
    downloadCsv(`نتائج-${exam ? examName(exam) : "الاختبارات"}-1448.csv`, [
      ["الاسم", ...(seePii ? ["الرقم الوطني"] : []), "الصفة", "الاختبار", "القاعة", "النسبة", "الأقسام", "النتيجة", "الحالة", "أُكّد"],
      ...lines.map((l) => [
        l.row.name,
        ...(seePii ? [l.row.id] : []),
        roleLabelOf(l.role),
        examName(l.examId),
        halls.centerById(l.centerId)?.name ?? "",
        l.a?.attempt.score ?? "",
        l.a ? l.a.sections.map((s) => `${s.name} ${s.percent}% (المطلوب ${s.pass}%)`).join("؛ ") : "",
        resultOfLine(l),
        l.a ? ATTEMPT_LABEL[l.a.status] : "غائب",
        l.a?.attempt.confirmedAt ? fmtDateTime(l.a.attempt.confirmedAt) : "",
      ]),
    ]);
    logAs(user, { action: "تصدير النتائج", target: exam ? examName(exam) : "كل الاختبارات", detail: `${lines.length} سطراً${absentFail ? " — الغائبون راسبون" : ""}`, system: "exams", area: "results" });
  };

  return (
    <div className="space-y-5">
      <Title
        action={
          may("exams.results.export") && (
            <span className="text-sm font-bold">
              <RowLink onClick={download}>تصدير Excel</RowLink>
            </span>
          )
        }
      />
      <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} label="بحث في النتائج" placeholder={seePii ? "اسم أو رقم وطني..." : "اسم..."} />
        <FilterSelect label="الاختبار" all="كل الاختبارات" value={exam} onChange={setExam} options={halls.exams.map((e) => ({ value: e.id, label: e.name }))} />
        <FilterSelect label="الجلسة (القاعة)" all="كل القاعات" value={center} onChange={setCenter} options={halls.centers.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segments
          label="النتيجة"
          value={outcome}
          onChange={setOutcome}
          items={[
            { value: "all", label: "الكل", count: lines.length },
            { value: "passed", label: "ناجحون", count: lines.filter(isPassed).length },
            { value: "failed", label: "راسبون", count: lines.filter(isFailed).length },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Segments
            label="المحاولات المعروضة"
            value={scope}
            onChange={setScope}
            items={[
              { value: "confirmed", label: "المؤكَّدة فقط" },
              { value: "sent", label: "كل المسلَّمة" },
            ]}
          />
          <label className="flex items-center gap-2 text-sm font-bold text-white/85">
            اعتبار الغائبين راسبين
            <Switch on={absentFail} onChange={setAbsentFail} label="اعتبار الغائبين راسبين" />
          </label>
        </div>
      </div>

      <ListTable head={["المتقدم", "الصفة", "القاعة", "النسبة", "الأقسام", "النتيجة"]} minWidth="60rem">
        {shown.length === 0 && <EmptyRow cols={6}>{lines.length ? "لا أحد يطابق هذا البحث." : "لا محاولات مؤكَّدة لهذا الاختيار بعد: غيّر الاختبار أو القاعة، أو اعرض كل المسلَّمة."}</EmptyRow>}
        {shown.map((l) => {
          const a = l.a;
          const res = resultOfLine(l);
          return (
            <tr key={l.id} className="align-top">
              <td className="p-3">
                {a && seeAnswers ? (
                  <button type="button" onClick={() => review(a)} className="text-right font-bold text-white hover:text-gold">
                    {l.row.name}
                  </button>
                ) : (
                  <p className="font-bold text-white">{l.row.name}</p>
                )}
                {seePii && (
                  <p className="text-xs text-white/55" dir="ltr">
                    {l.row.id}
                  </p>
                )}
                {a && seeAnswers && (
                  <RowActions>
                    <RowLink onClick={() => review(a)}>مراجعة الإجابات</RowLink>
                  </RowActions>
                )}
              </td>
              <td className="p-3">
                {roleLabelOf(l.role)}
                {!exam && <span className="block text-[11px] text-white/55">{examName(l.examId)}</span>}
              </td>
              <td className="p-3">{halls.centerById(l.centerId)?.name ?? "—"}</td>
              <td className="p-3 font-display text-lg font-bold tabular-nums">{a ? pct(a.attempt.score) : "—"}</td>
              <td className="max-w-[18rem] p-3">{a ? <SectionChips sections={a.sections} /> : <span className="text-xs text-white/55">لم يحضر</span>}</td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  <Chip tone={res === "ناجح" ? "green" : res === "—" ? "muted" : "maroon"}>{res}</Chip>
                  {a ? <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip> : <Chip tone="maroon">غائب</Chip>}
                </span>
                {a && a.status !== "confirmed" && a.status !== "voided" && <span className="block text-[11px] text-white/55">غير معتمدة بعد</span>}
                {a?.attempt.decision && <span className="block text-[11px] text-gold">{a.attempt.decision.kind === "approve" ? "اعتماد إداري" : "إلغاء إداري"}</span>}
              </td>
            </tr>
          );
        })}
      </ListTable>

      <Records area="results" />
      <AnswersDrawer a={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
