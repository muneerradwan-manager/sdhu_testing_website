"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Download, GraduationCap, Megaphone, PenLine, PencilLine, Scale, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { pointsOf, weightsLabel } from "@/lib/data/admin-exam";
import { matches } from "@/lib/ops";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { resultOf } from "@/app/administrator/_lib/admin";
import { useAllQuestions, useExamRules } from "@/app/administrator/_lib/admin-rules";
import { markedExam, roleKeyOf, useHalls } from "@/app/administrator/_lib/halls";
import { patchAdmin, roleLabel, type AdminRow } from "../../_components/data";
import { Drawer, Empty, fmtDateTime, Meter, Panel, logAs, smallInputClass, stamp, useStaffUser } from "../../_components/kit";
import { SearchBox } from "../../_components/ops-ui";
import { STANDING, useExamDesk, type Standing } from "./desk";
import { RecordHistory, Records } from "./records";
import { Chip, Field, Segments, downloadCsv, selectClass } from "./ui";

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (w: number) => Math.round(w * 100);

type Filter = "all" | Standing;
const FILTERS: Filter[] = ["all", "waiting", "grading", "oral", "ready", "published", "below", "absent", "exempt"];

/** A paper's number for the grader: the applicant's name stays hidden until the mark is in */
export const paperCode = (id: string) => `1448-W-${id.slice(-5)}`;

/**
 * The results, from the sitting to the announcement, in one list: each applicant with where he stands and
 * the one thing to do next — grade his written answers, enter his oral, or announce. The rules results are
 * judged by sit on top of the list, so a change is seen with what it changes.
 */
export function Results() {
  const params = useSearchParams();
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const rules = useExamRules();
  const halls = useHalls();
  const start = params.get("s");
  const [filter, setFilter] = useState<Filter>(FILTERS.includes(start as Filter) ? (start as Filter) : "all");
  const [q, setQ] = useState("");
  const [grading, setGrading] = useState(start === "grading" && desk.answers > 0);
  const [editingRules, setEditingRules] = useState(false);
  const [oralFor, setOralFor] = useState<AdminRow | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const standing = (r: AdminRow) => desk.standings.get(r.id) ?? "waiting";
  const shown = desk.rows.filter((r) => (filter === "all" || standing(r) === filter) && matches(q, [r.name, r.id]));
  const ready = desk.rows.filter((r) => standing(r) === "ready");

  const announce = (rows: AdminRow[]) => {
    const at = stamp();
    for (const r of rows) patchAdmin(r, { resultPublishedAt: at }, actions.upsertAdmin);
    const passed = rows.filter((r) => resultOf(r.profile, rules).passed).length;
    if (rows.length === 1) {
      const res = resultOf(rows[0].profile, rules);
      logAs(user, { action: "إعلان نتيجة التأهيل", target: rows[0].name, after: `${res.final} — ${res.passed ? "ناجح" : "غير ناجح"}`, system: "exams", area: "results", ref: rows[0].id });
    } else {
      logAs(user, { action: "إعلان النتائج", target: `${rows.length} نتائج`, after: `${passed} ناجحون، ${rows.length - passed} غير ناجحين`, detail: rows.map((r) => r.name).slice(0, 6).join("، ") + (rows.length > 6 ? "…" : ""), system: "exams", area: "results", important: true });
    }
    toast({ title: rows.length === 1 ? `أُعلنت نتيجة ${rows[0].name.split(" ")[0]}` : `أُعلنت ${rows.length} نتائج`, body: "وصل الإشعار إلى أصحابها في بوابة الإداري.", tone: "success", icon: "📣" });
    setConfirmAll(false);
  };

  const download = () =>
    downloadCsv("نتائج-امتحان-التأهيل-1448.csv", [
      ["الاسم", "الرقم الوطني", "الصفة", "المركز", "الحال", "الكتابي", "الشفهي", "النهائية", "ناجح", "أُعلنت"],
      ...desk.rows.map((r) => {
        const res = resultOf(r.profile, rules);
        return [r.name, maskNationalId(r.id), roleLabel(r), halls.centerOf(r.id)?.name, STANDING[standing(r)].label, res.written, res.oral, res.final, res.passed ? "نعم" : "لا", r.profile.resultPublishedAt ? fmtDateTime(r.profile.resultPublishedAt) : ""];
      }),
    ]);

  return (
    <div className="space-y-4">
      <Panel
        icon={<Scale />}
        title="قواعد النجاح"
        action={
          <span className="flex items-center gap-2">
            <Button size="sm" variant="glass" onClick={() => setEditingRules(true)}>
              تعديل القواعد
            </Button>
            <Button size="sm" variant="glass" onClick={download}>
              <Download className="size-4" /> تنزيل النتائج
            </Button>
          </span>
        }
      >
        <p className="text-sm leading-7 text-white">
          قواعد هذا الموسم، وتضبطها من «تعديل القواعد»: النجاح من <b className="text-gold">{rules.passMark}</b> · {weightsLabel(rules)} · لا يُستدعى للشفهي من نزل كتابيُّه عن <b className="text-gold">{rules.writtenMin}</b>.
        </p>
      </Panel>

      <div className="grid gap-3 md:grid-cols-3">
        <WorkCard icon={<PenLine />} title="إجابات تحريرية للتصحيح" n={desk.answers} hint={`في ${desk.papers.length} أوراق، دون أسماء أصحابها`} cta="ابدأ التصحيح" onClick={() => setGrading(true)} />
        <WorkCard icon={<PencilLine />} title="بانتظار نتيجة الشفهي" n={desk.count("oral")} hint={`بلغوا حد الكتابي (${rules.writtenMin})`} cta="اعرضهم" onClick={() => setFilter("oral")} />
        <WorkCard icon={<Megaphone />} title="نتائج جاهزة للإعلان" n={ready.length} hint="لا يراها أصحابها قبل إعلانها" cta={confirmAll ? `تأكيد إعلان ${ready.length}` : "إعلان الكل"} onClick={() => (confirmAll ? announce(ready) : setConfirmAll(true))} tone={confirmAll ? "maroon" : "gold"} />
      </div>

      <Panel bodyClass="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox className="lg:w-80" value={q} onChange={setQ} label="بحث في النتائج" placeholder="اسم أو آخر أرقام الرقم الوطني..." />
          <Segments label="حال المتقدم" value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ value: f, label: f === "all" ? "الكل" : STANDING[f].label, count: f === "all" ? desk.rows.length : desk.count(f) }))} />
        </div>
        {shown.length === 0 ? (
          <Empty icon={<UsersRound />} title="لا أحد هنا" text="غيّر التصفية أو امسح البحث." />
        ) : (
          shown.map((r, i) => <ResultRow key={r.id} r={r} i={i} standing={standing(r)} onOral={() => setOralFor(r)} onAnnounce={() => announce([r])} />)
        )}
      </Panel>

      <Records area="results" />

      <Drawer open={grading} onClose={() => setGrading(false)} title="تصحيح الأسئلة التحريرية" width="max-w-3xl">
        <Grading />
      </Drawer>
      <Drawer open={editingRules} onClose={() => setEditingRules(false)} title="قواعد النجاح" width="max-w-xl">
        <RulesForm />
      </Drawer>
      <Modal open={!!oralFor} onClose={() => setOralFor(null)} className="max-w-xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {oralFor && <OralForm key={oralFor.id} row={oralFor} onClose={() => setOralFor(null)} />}
      </Modal>
    </div>
  );
}

function WorkCard({ icon, title, n, hint, cta, onClick, tone = "gold" }: { icon: ReactNode; title: string; n: number; hint: string; cta: string; onClick: () => void; tone?: "gold" | "maroon" }) {
  return (
    <div className={cn("flex flex-col rounded-3xl border p-4", n ? "border-gold/40 bg-gold/10" : "border-white/10 bg-white/[.04]")}>
      <p className="flex items-center gap-2 text-sm font-bold text-white [&_svg]:size-4 [&_svg]:text-gold">
        {icon} {title}
      </p>
      <p className={cn("mt-1 font-display text-3xl font-bold tabular-nums", n ? "text-gold" : "text-white/40")}>{n}</p>
      <p className="text-xs text-white/60">{hint}</p>
      {n > 0 && (
        <Button size="sm" variant={tone} className="mt-3 self-start" onClick={onClick}>
          {cta}
        </Button>
      )}
    </div>
  );
}

function ResultRow({ r, i, standing, onOral, onAnnounce }: { r: AdminRow; i: number; standing: Standing; onOral: () => void; onAnnounce: () => void }) {
  const rules = useExamRules();
  const halls = useHalls();
  const res = resultOf(r.profile, rules);
  const center = halls.centerOf(r.id);
  const sitting = center ? halls.sittingOf(r.id, roleKeyOf(r.profile.positions[0] ?? r.position)) : undefined;
  const { written, oral, final } = res;
  const s = STANDING[standing];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 12) * 0.03 }}
      className="grid gap-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[.09] hover:ring-gold/40 md:grid-cols-[1.5fr_.8fr_.8fr_1fr_auto] md:items-center"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/20 font-display text-lg font-bold text-gold ring-1 ring-gold/40">{r.name.replace("الشيخ ", "")[0]}</span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
            {r.name} <Chip tone={s.tone}>{s.label}</Chip>
          </p>
          <p className="text-xs text-white/75">
            {roleLabel(r)} · <span dir="ltr">{maskNationalId(r.id)}</span>
            {center && !r.profile.examExempt ? ` · ${center.name}` : ""}
            {sitting && standing === "waiting" ? ` · ${sitting.exam.name}: ${sitting.exam.date}` : ""}
          </p>
          {r.previous && <p className="text-[11px] text-gold">{r.previous}</p>}
        </div>
      </div>
      <ScoreCell label={`الكتابي ×${pct(rules.writtenWeight)}%`} value={written} empty={r.previous ? "معفى" : r.profile.exam?.submittedAt ? `مبدئية ${r.profile.exam.provisional ?? "—"}` : "—"} />
      <ScoreCell label={`الشفهي ×${pct(rules.oralWeight)}%`} value={oral} empty={standing === "below" ? "لا يُستدعى" : "—"} />
      <div>
        <p className="text-[11px] text-white/75">النتيجة النهائية</p>
        {final !== undefined ? (
          <>
            <p className={cn("flex items-center gap-2 font-display text-2xl font-bold tabular-nums", res.passed ? "text-white" : "text-gold")}>
              {final}
              <Chip tone={res.passed ? "green" : "maroon"}>{res.passed ? "ناجح" : `دون ${rules.passMark}`}</Chip>
            </p>
            <Meter value={final} tone={res.passed ? "teal" : "gold"} className="mt-1" />
          </>
        ) : (
          <p className="text-sm text-white/75">—</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {(standing === "oral" || (oral !== undefined && standing !== "published")) && (
          <Button size="sm" variant={oral === undefined ? "gold" : "glass"} onClick={onOral}>
            <PencilLine className="size-4" /> {oral === undefined ? "إدخال الشفهي" : "تعديل الشفهي"}
          </Button>
        )}
        {standing === "ready" && (
          <Button size="sm" variant="gold" onClick={onAnnounce}>
            <Megaphone className="size-4" /> إعلان
          </Button>
        )}
        {r.profile.resultPublishedAt && (
          <Chip tone="green">
            <CheckCircle2 className="size-3" /> {fmtDateTime(r.profile.resultPublishedAt)}
          </Chip>
        )}
      </div>
    </motion.div>
  );
}

function ScoreCell({ label, value, empty }: { label: string; value?: number; empty: string }) {
  return (
    <div>
      <p className="text-[11px] text-white/75">{label}</p>
      {value !== undefined ? <p className="font-display text-xl font-bold tabular-nums text-white">{value}</p> : <p className="text-sm text-gold">{empty}</p>}
    </div>
  );
}

// ───────────────────────── The oral ─────────────────────────

function OralForm({ row, onClose }: { row: AdminRow; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const rules = useExamRules();
  const prev = row.profile.oral;
  const written = row.profile.exam?.score;
  const [score, setScore] = useState(prev?.score ?? 80);
  const [committee, setCommittee] = useState("3");
  const [note, setNote] = useState(prev?.note ?? "");
  const [reason, setReason] = useState("");
  // The same judge as the results list and the administrator's portal, on the mark being typed
  const res = resultOf({ ...row.profile, oral: { score, by: user.name, at: 0 } }, rules);
  const final = res.final!;
  const pass = res.passed;
  const needsReason = !!prev && prev.score !== score;

  const save = () => {
    if (needsReason && reason.trim().length < 5) {
      toast({ title: "اكتب سبب التعديل", body: "كل تعديل على نتيجة مدخلة يُسجَّل مع السبب.", tone: "warning", icon: "✍️" });
      return;
    }
    patchAdmin(row, { oral: { score, by: user.name, at: Date.now(), note: note.trim() || undefined }, resultPublishedAt: undefined }, actions.upsertAdmin);
    logAs(user, {
      action: prev ? "تعديل نتيجة الشفهي" : "إدخال نتيجة الشفهي",
      target: row.name,
      before: prev ? `${prev.score} من 100` : undefined,
      after: `${score} من 100 — النهائية ${final}`,
      detail: [`اللجنة رقم ${committee}`, note.trim(), needsReason ? `السبب: ${reason.trim()}` : ""].filter(Boolean).join(" — "),
      system: "exams",
      area: "results",
      ref: row.id,
    });
    toast({ title: "حُفظت نتيجة الشفهي", body: `${row.name}: ${final} — ${pass ? "ناجح" : "دون الحد الأدنى"}. لا تظهر للمتقدم قبل الإعلان.`, tone: pass ? "success" : "gold", icon: pass ? "🎓" : "📝" });
    onClose();
  };

  return (
    <div>
      <p className="text-xs font-bold text-gold">الامتحان الشفهي — أمام اللجنة، ونتيجته هنا</p>
      <h3 className="mt-1 font-display text-xl font-bold text-white">{row.name}</h3>
      <p className="text-sm text-white/75">{row.position}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_7rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-white">درجة الشفهي (0 – 100)</span>
          <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full accent-[#D9C89E]" style={{ direction: "ltr" }} aria-label="درجة الشفهي" />
          <span className="text-xs text-white/75">تعادل {round1(score / 5)} من 20 على ورقة اللجنة</span>
        </label>
        <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className={cn(smallInputClass, "h-14 text-center font-display text-2xl font-bold")} dir="ltr" aria-label="درجة الشفهي رقماً" />
      </div>

      <div className="mt-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
        <div className="grid grid-cols-3 items-center gap-2 text-center text-sm">
          <div>
            <p className="text-[11px] text-white/75">الكتابي</p>
            <p className="font-bold tabular-nums text-white">{written === undefined ? "معفى" : `${written} × ${pct(rules.writtenWeight)}% = ${round1(written * rules.writtenWeight)}`}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/75">الشفهي</p>
            <p className="font-bold tabular-nums text-white">{written === undefined ? `${score} × 100%` : `${score} × ${pct(rules.oralWeight)}% = ${round1(score * rules.oralWeight)}`}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/75">النهائية</p>
            <motion.p key={final} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={cn("font-display text-3xl font-bold tabular-nums", pass ? "text-white" : "text-gold")}>
              {final}
            </motion.p>
          </div>
        </div>
        <div className="relative mt-3">
          <Meter value={final} tone={pass ? "teal" : "gold"} className="h-3" />
          <span className="absolute -top-1 h-5 w-0.5 bg-white" style={{ right: `${rules.passMark}%` }} title={`الحد الأدنى ${rules.passMark}`} />
        </div>
        <p className="mt-3 text-center">
          <Chip tone={pass ? "green" : "maroon"}>{pass ? "ناجح — مرشّح للصفة" : res.writtenPassed ? `دون الحد الأدنى للنجاح (${rules.passMark})` : `الكتابي دون حده (${rules.writtenMin})`}</Chip>
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <Field label="اللجنة">
          <select value={committee} onChange={(e) => setCommittee(e.target.value)} className={selectClass}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                رقم {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ملاحظات اللجنة">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="قوي في السيناريوهات الميدانية..." className={smallInputClass} />
        </Field>
      </div>
      {needsReason && (
        <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 block">
          <span className="mb-1 block text-sm font-bold text-gold">
            سبب تعديل الدرجة ({prev?.score} ← {score})
          </span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: خطأ في الجمع — تصويب اللجنة" className={smallInputClass} />
        </motion.label>
      )}
      <div className="mt-5 flex gap-2">
        <Button variant="gold" onClick={save}>
          <CheckCircle2 className="size-4" /> حفظ النتيجة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
      <div className="mt-5">
        <RecordHistory refId={row.id} />
      </div>
    </div>
  );
}

// ───────────────────────── Grading ─────────────────────────

/**
 * The written answers waiting for a grader. The automated questions were marked the moment a paper was
 * sent; here the grader sees the paper's number, not its owner's name, with what the answer should
 * contain. The written mark is final once its last answer is graded.
 */
function Grading() {
  const desk = useExamDesk();
  if (!desk.papers.length) return <Empty icon={<CheckCircle2 />} title="لا إجابات تنتظر التصحيح" text="كل ما أُرسل من أوراق صُحّح." />;
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-white/70">
        {desk.answers} إجابات في {desk.papers.length} أوراق. يرى المصحح رقم الورقة لا اسم صاحبها. تكتمل علامة الكتابي حين تُصحَّح آخر إجابة في الورقة، ويراها المتقدم في بوابته.
      </p>
      {desk.papers.map(({ row, ids }) => (
        <Paper key={row.id} row={row} ids={ids} />
      ))}
    </div>
  );
}

function Paper({ row, ids }: { row: AdminRow; ids: number[] }) {
  const all = useAllQuestions();
  const e = row.profile.exam!;
  const sectionOf = (id: number) => e.paper?.find((s) => s.ids.includes(id));
  return (
    <div className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
      <p className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg font-bold text-gold" dir="ltr">
          {paperCode(row.id)}
        </span>
        <span className="text-xs text-white/65">علامته المبدئية {e.provisional} من 100</span>
      </p>
      <ul className="mt-3 space-y-3">
        {ids.map((id) => {
          const q = all.find((x) => x.id === id);
          return q ? <Answer key={id} row={row} qid={id} max={pointsOf(q)} text={q.text} guide={q.explanation} section={sectionOf(id)?.name} /> : null;
        })}
      </ul>
    </div>
  );
}

function Answer({ row, qid, max, text, guide, section }: { row: AdminRow; qid: number; max: number; text: string; guide: string; section?: string }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [mark, setMark] = useState<number | null>(null);
  const e = row.profile.exam!;

  const save = () => {
    if (mark === null) return;
    const next = markedExam(e, qid, mark, user.name);
    patchAdmin(row, { exam: next }, actions.upsertAdmin);
    logAs(user, { action: "تصحيح إجابة تحريرية", target: `ورقة ${paperCode(row.id)}`, after: `${mark} من ${max}`, detail: next.score !== undefined ? `اكتملت علامة الكتابي: ${next.score} من 100` : undefined, system: "exams", area: "results" });
    toast({ title: `حُفظت الدرجة: ${mark} من ${max}`, body: next.score !== undefined ? `اكتملت الورقة: الكتابي ${next.score} من 100.` : "بقيت إجابات في هذه الورقة.", tone: "success", icon: "✍️" });
  };

  return (
    <li className="rounded-2xl bg-black/15 p-3 ring-1 ring-white/10">
      {section && <p className="text-xs font-bold text-gold">{section}</p>}
      <p className="mt-0.5 font-bold text-white">{text}</p>
      <p className="mt-2 whitespace-pre-line rounded-xl bg-white/[.07] p-3 text-sm leading-7 text-white">{String(e.answers[qid] ?? "")}</p>
      <p className="mt-2 text-xs leading-6 text-white/60">
        <b className="text-white/80">ما ينتظره السؤال: </b>
        {guide}
      </p>
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
    </li>
  );
}

// ───────────────────────── The rules ─────────────────────────

const RULE_FIELDS: { key: "passMark" | "writtenMin" | "writtenWeight" | "oralWeight"; label: string; unit: string; min: number; max: number; step?: number; hint: (v: number) => string }[] = [
  { key: "passMark", label: "علامة النجاح النهائية", unit: "من 100", min: 40, max: 100, hint: () => "الكتابي والشفهي معاً بأوزانهما" },
  { key: "writtenMin", label: "الحد الأدنى للكتابي وحده", unit: "من 100", min: 0, max: 100, hint: () => "من ينزل عنه لا يُستدعى للشفهي" },
  { key: "writtenWeight", label: "وزن الكتابي من النتيجة", unit: "%", min: 0, max: 100, step: 5, hint: (v) => `والباقي للشفهي: ${100 - v}%` },
  { key: "oralWeight", label: "وزن الشفهي من النتيجة", unit: "%", min: 0, max: 100, step: 5, hint: (v) => `والباقي للكتابي: ${100 - v}%` },
];

/** One rule's value, saved once when the field is left, so the log and the director get one change, not every keystroke */
function RuleInput({ f, value, onSave }: { f: (typeof RULE_FIELDS)[number]; value: number; onSave: (n: number) => void }) {
  const [v, setV] = useState(String(value));
  const commit = () => {
    const n = Number(v);
    if (Number.isFinite(n) && n >= f.min && n <= f.max && n !== value) onSave(n);
    else setV(String(value));
  };
  return (
    <input
      type="number"
      value={v}
      min={f.min}
      max={f.max}
      step={f.step ?? 1}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={cn(smallInputClass, "w-28 text-center font-display text-lg")}
      aria-label={f.label}
    />
  );
}

function RulesForm() {
  const user = useStaffUser()!;
  const toast = useToast();
  const exam = useExamRules();
  const stored = useStore((s) => s.adminRules.exam);
  const desk = useExamDesk();
  const announced = desk.count("published");
  const value = (k: (typeof RULE_FIELDS)[number]["key"]) => (k === "writtenWeight" || k === "oralWeight" ? Math.round(exam[k] * 100) : exam[k]);

  const set = (k: (typeof RULE_FIELDS)[number]["key"], v: number, label: string) => {
    const before = value(k);
    // The two weights are one setting: the oral is whatever the written leaves of 100
    const patch = k === "writtenWeight" ? { writtenWeight: v / 100 } : k === "oralWeight" ? { writtenWeight: (100 - v) / 100 } : { [k]: v };
    actions.setAdminRules({ exam: { ...stored, ...patch } });
    logAs(user, { action: "تعديل قواعد النجاح", target: label, before: String(before), after: String(v), detail: announced ? `بعد إعلان ${announced} نتائج: تتغير المعلنة أيضاً` : undefined, system: "exams", area: "results", important: true });
    toast({ title: `حُفظ: ${label}`, body: `من ${before} إلى ${v}`, tone: "success", icon: "💾" });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-white/70">
        كيف تُحكم النتيجة: تُطبَّق على كل متقدم لم يُعفَ من الامتحانين، في بوابة الموظفين وبوابة الإداري معاً. وزنا الكتابي والشفهي يكمّل أحدهما الآخر إلى 100، فتغيير أحدهما يغيّر الآخر. يُحفظ كل تعديل حين تغادر خانته، ويصل إلى مديرة الموسم.
      </p>
      {announced > 0 && (
        <p className="rounded-2xl bg-gold/10 p-3 text-xs font-semibold leading-6 text-gold ring-1 ring-gold/40">
          أُعلنت {announced} نتائج. النتيجة النهائية لا تُحفظ رقماً ثابتاً بل تُحسب دائماً بهذه القواعد، فتعديلها يغيّر النتائج المعلنة أيضاً.
        </p>
      )}
      <ul className="space-y-3">
        {RULE_FIELDS.map((f) => {
          const v = value(f.key);
          return (
            <li key={f.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
              <div className="min-w-0">
                <p className="font-bold text-white">{f.label}</p>
                <p className="text-xs text-white/60">{f.hint(v)}</p>
              </div>
              <div className="flex items-center gap-2">
                <RuleInput key={`${f.key}-${v}`} f={f} value={v} onSave={(n) => set(f.key, n, f.label)} />
                <span className="text-sm text-white/70">{f.unit}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-2 text-xs text-white/55">
        <GraduationCap className="size-4 text-gold" /> مدة كل امتحان وأقسامه في «الامتحانات».
      </p>
    </div>
  );
}
