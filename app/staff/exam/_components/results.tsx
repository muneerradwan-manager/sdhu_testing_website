"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, Download, Eye, FileText, GraduationCap, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { matches } from "@/lib/ops";
import type { StaffUser } from "@/lib/staff";
import { cn } from "@/lib/utils";
import { useAllQuestions } from "@/app/administrator/_lib/admin-rules";
import { ATTEMPT_LABEL, roleLabelOf, useHalls } from "@/app/administrator/_lib/halls";
import type { AdminRow } from "../../_components/data";
import { Drawer, Empty, Panel, fmtDateTime, logAs, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { useExamDesk, type AttemptRow } from "./desk";
import { Records, type Area } from "./records";
import { examOfAttempt, seatOf, useSittingRows } from "./sittings";
import { ATTEMPT_TONE, Chip, Figure, SectionChips, Segments, Switch, alertParts, downloadCsv, pct, share } from "./ui";

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
          ["الرقم الوطني", <span key="id" dir="ltr">{a.row.id}</span>],
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

      {!at.paper?.length ? (
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
                          {!ok && <span className="text-white/75">الصحيحة: {q.options[q.answer]}</span>}
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
 * The results as the administration's platform judges them: confirmed attempts only by default, each with its
 * share and every section's share against the share it asks — the one who passed every section passed. Absentees
 * can be counted as failed. Any attempt's answers open for review, and every review is recorded.
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
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<AttemptRow | null>(null);

  const attempts = desk.attempts.filter((a) => (scope === "confirmed" ? a.status === "confirmed" : !!a.attempt.submittedAt) && (!exam || examOfAttempt(a) === exam) && (!center || a.centerId === center));
  const absent: Line[] = absentFail
    ? sittings
        .filter((s) => s.stage === "closed" && (!exam || s.exam.id === exam) && (!center || s.center.id === center))
        .flatMap((s) => s.listed.filter((r) => seatOf(s, r.id).absent).map((r) => ({ id: `${s.key}:${r.id}`, row: r, role: s.exam.role, examId: s.exam.id, centerId: s.center.id })))
    : [];
  const lines: Line[] = [...attempts.map((a) => ({ id: `${a.key}:${a.row.id}:${a.role}`, row: a.row, role: a.role, examId: examOfAttempt(a), centerId: a.centerId, a })), ...absent];
  const shown = lines.filter((l) => matches(q, [l.row.name, l.row.id]));
  const confirmed = attempts.filter((a) => a.status === "confirmed");
  const passed = confirmed.filter((a) => a.passed).length;
  const failed = confirmed.length - passed + absent.length;
  const examName = (id: string) => halls.examById(id)?.name ?? `الاختبار المؤتمت لصفة ${roleLabelOf(id)}`;
  const resultOfLine = (l: Line) => (!l.a ? "راسب (غائب)" : l.a.status === "voided" ? "—" : l.a.passed ? "ناجح" : "راسب");

  const review = (a: AttemptRow) => {
    setViewing(a);
    logAnswers(user, a, "results", examName(examOfAttempt(a)));
  };

  const download = () => {
    downloadCsv(`نتائج-${exam ? examName(exam) : "الاختبارات"}-1448.csv`, [
      ["الاسم", "الرقم الوطني", "الصفة", "الاختبار", "القاعة", "النسبة", "الأقسام", "النتيجة", "الحالة", "أُكّد"],
      ...lines.map((l) => [
        l.row.name,
        l.row.id,
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
    <div className="space-y-4">
      <Panel
        icon={<GraduationCap />}
        title="النتائج"
        action={
          <Button size="sm" variant="glass" onClick={download}>
            <Download className="size-4" /> تصدير Excel
          </Button>
        }
        bodyClass="space-y-3"
      >
        <p className="text-sm leading-7 text-white/70">الافتراضي: المحاولات المؤكَّدة فقط. الناجح هو من نجح في كل الأقسام: لكل قسم نسبته المطلوبة، ولا مجموع يُبلَغ. المحاولة التي لم تُؤكَّد تنتظر قرار الإدارة في «المراجعة والتقارير».</p>
        <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <SearchBox value={q} onChange={setQ} label="بحث في النتائج" placeholder="اسم أو رقم وطني..." />
          <FilterSelect label="الاختبار" all="كل الاختبارات" value={exam} onChange={setExam} options={halls.exams.map((e) => ({ value: e.id, label: e.name }))} />
          <FilterSelect label="الجلسة (القاعة)" all="كل القاعات" value={center} onChange={setCenter} options={halls.centers.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Figure label="محاولات مؤكَّدة" value={confirmed.length} />
          <Figure label="الناجحون" value={passed} tone={passed ? "green" : undefined} />
          <Figure label="الراسبون" value={failed} hint={absent.length ? `منهم ${absent.length} غائبون` : undefined} />
          <Figure label="نسبة النجاح" value={pct(share(passed, confirmed.length + absent.length))} tone="gold" />
        </div>
      </Panel>

      <Panel bodyClass="-mx-5 md:-mx-6">
        {shown.length === 0 ? (
          <div className="px-5 md:px-6">
            <Empty icon={<UsersRound />} title="لا نتائج هنا" text={lines.length ? "امسح البحث." : "لا محاولات مؤكَّدة لهذا الاختيار بعد: غيّر الاختبار أو القاعة، أو اعرض كل المسلَّمة."} />
          </div>
        ) : (
          <div className="overflow-x-auto px-5 md:px-6">
            <table className="w-full min-w-[62rem] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-right text-xs text-gold">
                  {["المتقدم", "الصفة", "القاعة", "النسبة", "الأقسام", "النتيجة", "الحالة", ""].map((h, i) => (
                    <th key={i} className="pb-2 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {shown.map((l, i) => {
                  const a = l.a;
                  const res = resultOfLine(l);
                  return (
                    <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.02 }} className="align-top text-white">
                      <td className="py-2.5">
                        <p className="font-bold">{l.row.name}</p>
                        <p className="text-xs text-white/60" dir="ltr">
                          {l.row.id}
                        </p>
                      </td>
                      <td className="py-2.5">
                        {roleLabelOf(l.role)}
                        {!exam && <span className="block text-[11px] text-white/55">{examName(l.examId)}</span>}
                      </td>
                      <td className="py-2.5">{halls.centerById(l.centerId)?.name ?? "—"}</td>
                      <td className="py-2.5 font-display text-lg font-bold tabular-nums">{a ? pct(a.attempt.score) : "—"}</td>
                      <td className="max-w-[18rem] py-2.5">{a ? <SectionChips sections={a.sections} /> : <span className="text-xs text-white/55">لم يحضر</span>}</td>
                      <td className="py-2.5">
                        <Chip tone={res === "ناجح" ? "green" : res === "—" ? "muted" : "maroon"}>{res}</Chip>
                        {a && a.status !== "confirmed" && a.status !== "voided" && <span className="block text-[11px] text-white/55">غير معتمدة بعد</span>}
                      </td>
                      <td className="py-2.5">
                        {a ? <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip> : <Chip tone="maroon">غائب</Chip>}
                        {a?.attempt.decision && <span className="block text-[11px] text-gold">{a.attempt.decision.kind === "approve" ? "اعتماد إداري" : "إلغاء إداري"}</span>}
                      </td>
                      <td className="py-2.5 text-left">
                        {a && (
                          <Button size="sm" variant="glass" onClick={() => review(a)}>
                            <Eye className="size-4" /> مراجعة
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Records area="results" />
      <AnswersDrawer a={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
