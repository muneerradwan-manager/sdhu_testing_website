"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChartColumn, Printer } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button } from "@/components/ui/button";
import { getPerson } from "@/lib/registry";
import { dayLabel, useToday } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { useAllQuestions } from "@/app/administrator/_lib/admin-rules";
import { roleLabelOf, useHalls } from "@/app/administrator/_lib/halls";
import { Empty, Panel, logAs, useStaffUser } from "../../_components/kit";
import { FilterSelect } from "../../_components/ops-ui";
import { useExamDesk, type AttemptRow } from "./desk";
import { Records } from "./records";
import { examOfAttempt, seatOf, useSittingRows } from "./sittings";
import { Figure, Switch, pct, share } from "./ui";

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, x) => a + x, 0) / xs.length) * 10) / 10 : undefined);
function median(xs: number[]) {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 10) / 10;
}

/** A column of a sortable table: its heading, the value it sorts by, how it reads as text (on paper too), and on screen */
type Col<T> = { key: string; label: string; value: (r: T) => number | string; text?: (r: T) => number | string; show?: (r: T) => ReactNode };

/** A table sorted by any of its columns: a click on a heading sorts by it, a second click reverses */
function SortTable<T>({ rows, cols, rowKey, start, empty }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; start: { key: string; dir: 1 | -1 }; empty: string }) {
  const [sort, setSort] = useState(start);
  const col = cols.find((c) => c.key === sort.key) ?? cols[0];
  const sorted = [...rows].sort((a, b) => {
    const x = col.value(a);
    const y = col.value(b);
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "ar")) * sort.dir;
  });
  if (!rows.length) return <p className="text-sm text-white/60">{empty}</p>;
  return (
    <div className="-mx-5 overflow-x-auto px-5 md:-mx-6 md:px-6">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-right text-xs text-gold">
            {cols.map((c) => {
              const on = c.key === sort.key;
              return (
                <th key={c.key} className="pb-2 font-bold" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => setSort({ key: c.key, dir: on ? (sort.dir === 1 ? -1 : 1) : -1 })} className={cn("inline-flex items-center gap-1 hover:text-gold-light", on && "text-white")}>
                    {c.label}
                    {on ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-50" />}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {sorted.map((r) => (
            <tr key={rowKey(r)} className="text-white">
              {cols.map((c) => (
                <td key={c.key} className="py-2 tabular-nums">
                  {c.show ? c.show(r) : c.text ? c.text(r) : c.value(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The same table on paper, in the order it was built */
function PrintTable<T>({ title, rows, cols, rowKey }: { title: string; rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-1.5 text-[11pt] font-bold text-[#00594F]">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-[9pt]">لا بيانات.</p>
      ) : (
        <table className="w-full border-collapse text-[9pt]">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="border border-black/40 bg-black/5 px-1.5 py-1 text-right">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)}>
                {cols.map((c) => (
                  <td key={c.key} className="border border-black/30 px-1.5 py-1">
                    {c.text ? c.text(r) : c.value(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** A group of results (a hall, a governorate): who sat, passed, failed, was absent, the mean and the pass rate */
type Group = { key: string; name: string; sat: number; passed: number; absent: number; scores: number[] };
const failedOf = (g: Group, absentFail: boolean) => g.sat - g.passed + (absentFail ? g.absent : 0);
const rateOf = (g: Group, absentFail: boolean) => share(g.passed, g.sat + (absentFail ? g.absent : 0));

function groupBy(confirmed: AttemptRow[], absent: { id: string; centerId: string }[], keyOf: (x: { id: string; centerId: string }) => string, nameOf: (k: string) => string): Group[] {
  const m = new Map<string, Group>();
  const at = (k: string) => {
    if (!m.has(k)) m.set(k, { key: k, name: nameOf(k), sat: 0, passed: 0, absent: 0, scores: [] });
    return m.get(k)!;
  };
  for (const a of confirmed) {
    const g = at(keyOf({ id: a.row.id, centerId: a.centerId }));
    g.sat += 1;
    if (a.passed) g.passed += 1;
    g.scores.push(a.attempt.score ?? 0);
  }
  for (const x of absent) at(keyOf(x)).absent += 1;
  return [...m.values()];
}

/**
 * The statistics of one test, built on its confirmed attempts only: how many sat it, passed and failed, the mean,
 * median, highest and lowest share and the pass rate — then by section (which sections fail the most), by sitting,
 * by governorate and by question. Absentees, when counted as failed, join the failed and the pass rate, never the
 * mean. Printed to PDF from the browser.
 */
export function Stats() {
  const user = useStaffUser()!;
  const desk = useExamDesk();
  const halls = useHalls();
  const sittings = useSittingRows(desk);
  const questions = useAllQuestions();
  const today = useToday();
  const confirmedAll = desk.attempts.filter((a) => a.status === "confirmed");
  const [examId, setExamId] = useState(() => halls.exams.find((e) => confirmedAll.some((a) => examOfAttempt(a) === e.id))?.id ?? halls.exams[0]?.id ?? "");
  const [absentFail, setAbsentFail] = useState(false);
  const exam = halls.examById(examId);

  const confirmed = confirmedAll.filter((a) => examOfAttempt(a) === examId);
  const absent = sittings.filter((s) => s.exam.id === examId && s.stage === "closed").flatMap((s) => s.listed.filter((r) => seatOf(s, r.id).absent).map((r) => ({ id: r.id, centerId: s.center.id })));
  const counted = absentFail ? absent.length : 0;
  const scores = confirmed.map((a) => a.attempt.score ?? 0);
  const passed = confirmed.filter((a) => a.passed).length;
  const failed = confirmed.length - passed + counted;

  // By section: which sections fail the most applicants (failing any one fails the test)
  type SectionRow = { id: string; name: string; pass: number; n: number; mean?: number; rate: number; failed: number };
  const sectionIds = [...(exam?.sections.map((s) => s.id) ?? []), ...confirmed.flatMap((a) => a.sections.map((s) => s.id))].filter((id, i, all) => all.indexOf(id) === i);
  const bySection: SectionRow[] = sectionIds
    .map((id) => {
      const res = confirmed.flatMap((a) => a.sections.filter((s) => s.id === id));
      const def = exam?.sections.find((s) => s.id === id);
      const ok = res.filter((s) => s.passed).length;
      return { id, name: def?.name ?? res[0]?.name ?? id, pass: def?.pass ?? res[0]?.pass ?? 50, n: res.length, mean: mean(res.map((s) => s.percent)), rate: share(ok, res.length), failed: res.length - ok };
    })
    .filter((s) => s.n > 0 || exam?.sections.some((x) => x.id === s.id));

  const bySitting = groupBy(confirmed, absent, (x) => x.centerId, (k) => halls.centerById(k)?.name ?? "قبل القاعات");
  const byGov = groupBy(confirmed, absent, (x) => getPerson(x.id)?.governorate ?? "غير معروفة", (k) => k);

  // By question: how often each was served, answered, and answered right
  type QuestionRow = { id: number; text: string; section: string; shown: number; answered: number; correct: number };
  const qMap = new Map<number, QuestionRow>();
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const a of confirmed)
    for (const sec of a.attempt.paper ?? [])
      for (const id of sec.ids) {
        const q = byId.get(id);
        const row = qMap.get(id) ?? { id, text: q?.text ?? `سؤال ${id}`, section: sec.name, shown: 0, answered: 0, correct: 0 };
        const ans = a.attempt.answers[id];
        row.shown += 1;
        if (ans !== undefined && ans !== "") row.answered += 1;
        if (q && ans === q.answer) row.correct += 1;
        qMap.set(id, row);
      }
  const byQuestion = [...qMap.values()];

  const groupCols: Col<Group>[] = [
    { key: "name", label: "", value: (g) => g.name, show: (g) => <span className="font-bold">{g.name}</span> },
    { key: "sat", label: "المؤدّون", value: (g) => g.sat },
    { key: "passed", label: "الناجحون", value: (g) => g.passed },
    { key: "failed", label: "الراسبون", value: (g) => failedOf(g, absentFail) },
    { key: "absent", label: "الغائبون", value: (g) => g.absent },
    { key: "mean", label: "المتوسط", value: (g) => mean(g.scores) ?? -1, text: (g) => pct(mean(g.scores)) },
    { key: "rate", label: "نسبة النجاح", value: (g) => rateOf(g, absentFail), text: (g) => pct(rateOf(g, absentFail)) },
  ];
  const sittingCols = [{ ...groupCols[0], label: "القاعة" }, ...groupCols.slice(1)];
  const govCols = [{ ...groupCols[0], label: "المحافظة" }, ...groupCols.slice(1)];
  const sectionCols: Col<SectionRow>[] = [
    { key: "name", label: "القسم", value: (s) => s.name, show: (s) => <span className="font-bold">{s.name}</span> },
    { key: "pass", label: "النسبة المطلوبة", value: (s) => s.pass, text: (s) => `${s.pass}%` },
    { key: "n", label: "العدد", value: (s) => s.n },
    { key: "mean", label: "المتوسط", value: (s) => s.mean ?? -1, text: (s) => pct(s.mean) },
    { key: "rate", label: "نسبة النجاح فيه", value: (s) => s.rate, text: (s) => pct(s.rate) },
    { key: "failed", label: "الراسبون فيه", value: (s) => s.failed, show: (s) => <span className={s.failed ? "font-bold text-gold" : ""}>{s.failed}</span> },
  ];
  const questionCols: Col<QuestionRow>[] = [
    { key: "text", label: "السؤال", value: (q) => q.text, text: (q) => `${q.id}. ${q.text}`, show: (q) => <span className="line-clamp-2 max-w-[26rem] leading-6">{`${q.id}. ${q.text}`}</span> },
    { key: "section", label: "القسم", value: (q) => q.section },
    { key: "shown", label: "ظهر", value: (q) => q.shown },
    { key: "answered", label: "أُجيب", value: (q) => q.answered },
    { key: "correct", label: "صحيح", value: (q) => q.correct },
    { key: "rate", label: "نسبة الصحة", value: (q) => share(q.correct, q.shown), text: (q) => pct(share(q.correct, q.shown)) },
  ];

  const kpis: [string, string | number, string?][] = [
    ["عدد المؤدّين", confirmed.length],
    ["الناجحون", passed],
    ["الراسبون", failed, counted ? `منهم غائبون ${counted}` : absent.length ? `والغائبون ${absent.length} لا يُحسبون` : undefined],
    ["المتوسط", pct(mean(scores))],
    ["الوسيط", pct(median(scores))],
    ["أعلى نسبة", pct(scores.length ? Math.max(...scores) : undefined)],
    ["أدنى نسبة", pct(scores.length ? Math.min(...scores) : undefined)],
    ["نسبة النجاح", pct(share(passed, confirmed.length + counted))],
  ];

  const print = () => {
    logAs(user, { action: "تصدير الإحصائيات PDF", target: exam?.name ?? "", detail: absentFail ? "الغائبون راسبون" : undefined, system: "exams", area: "stats" });
    window.print();
  };

  return (
    <div className="space-y-4">
      <Panel
        icon={<ChartColumn />}
        title="الإحصائيات"
        action={
          <Button size="sm" variant="glass" onClick={print} disabled={!exam}>
            <Printer className="size-4" /> تصدير PDF
          </Button>
        }
        bodyClass="space-y-3"
      >
        <p className="text-sm leading-7 text-white/70">مبنية على المحاولات المؤكَّدة فقط. الغائبون (بعد «اعتبار الغائبين راسبين») يدخلون في الراسبين ونسبة النجاح، لا في المتوسط.</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span className="md:w-96">
            <FilterSelect label="الاختبار" all="— اختر الاختبار —" value={examId} onChange={setExamId} options={halls.exams.map((e) => ({ value: e.id, label: `${e.name} (${confirmedAll.filter((a) => examOfAttempt(a) === e.id).length})` }))} />
          </span>
          <label className="flex items-center gap-2 text-sm font-bold text-white/85">
            اعتبار الغائبين راسبين
            <Switch on={absentFail} onChange={setAbsentFail} label="اعتبار الغائبين راسبين" />
          </label>
        </div>
        {exam && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map(([k, v, h]) => (
              <Figure key={k} label={k} value={v} hint={h} tone={k === "نسبة النجاح" ? "gold" : undefined} />
            ))}
          </div>
        )}
      </Panel>

      {!exam ? (
        <Panel>
          <Empty icon={<ChartColumn />} title="اختر اختباراً" text="تُبنى الإحصائيات لاختبار واحد، على محاولاته المؤكَّدة." />
        </Panel>
      ) : (
        <>
          <Panel title="حسب القسم">
            <p className="mb-3 text-xs leading-5 text-white/60">الراسب في أي قسم راسب في الاختبار كله، لذا يبيّن هذا الجدول أي الأقسام يُسقط أكثر المتقدمين.</p>
            <SortTable rows={bySection} cols={sectionCols} rowKey={(s) => s.id} start={{ key: "failed", dir: -1 }} empty="لا محاولات مؤكَّدة بأقسام بعد." />
          </Panel>
          <Panel title="حسب الجلسة">
            <SortTable rows={bySitting} cols={sittingCols} rowKey={(g) => g.key} start={{ key: "sat", dir: -1 }} empty="لا جلسات بنتائج بعد." />
          </Panel>
          <Panel title="حسب المحافظة">
            <SortTable rows={byGov} cols={govCols} rowKey={(g) => g.key} start={{ key: "sat", dir: -1 }} empty="لا نتائج بعد." />
          </Panel>
          <Panel title="حسب السؤال">
            <SortTable rows={byQuestion} cols={questionCols} rowKey={(q) => String(q.id)} start={{ key: "rate", dir: 1 }} empty="لا أوراق محفوظة قسماً قسماً في المحاولات المؤكَّدة بعد." />
          </Panel>

          <PrintSheet>
            <article className="text-[10pt] leading-relaxed text-black">
              <header className="border-b-2 border-[#00594F] pb-2">
                <p className="text-[9pt] text-[#555]">إدارة الامتحانات — الإحصائيات</p>
                <h1 className="font-display text-[15pt] font-bold text-[#00594F]">{exam.name}</h1>
                <p className="text-[9pt]">
                  لصفة {roleLabelOf(exam.role)} · {dayLabel(today, true)} · مبنية على المحاولات المؤكَّدة فقط{absentFail ? " · الغائبون محسوبون راسبين" : ""}
                </p>
              </header>
              <table className="mt-3 w-full border-collapse text-[9pt]">
                <tbody>
                  {[0, 4].map((i) => (
                    <tr key={i}>
                      {kpis.slice(i, i + 4).map(([k, v, h]) => (
                        <td key={k} className="border border-black/30 px-1.5 py-1">
                          {k}: <b>{v}</b>
                          {h ? ` (${h})` : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <PrintTable title="حسب القسم" rows={bySection} cols={sectionCols} rowKey={(s) => s.id} />
              <PrintTable title="حسب الجلسة" rows={bySitting} cols={sittingCols} rowKey={(g) => g.key} />
              <PrintTable title="حسب المحافظة" rows={byGov} cols={govCols} rowKey={(g) => g.key} />
              <PrintTable title="حسب السؤال" rows={byQuestion} cols={questionCols} rowKey={(q) => String(q.id)} />
            </article>
          </PrintSheet>
        </>
      )}

      <Records area="stats" />
    </div>
  );
}
