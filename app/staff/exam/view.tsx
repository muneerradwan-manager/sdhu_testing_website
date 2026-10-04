"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, GraduationCap, Lock, Megaphone, PenLine, PencilLine, RotateCcw, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { weightsLabel } from "@/lib/data/admin-exam";
import { can } from "@/lib/staff";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { resultOf } from "@/app/administrator/_lib/admin";
import { useExamBank, useExamRules } from "@/app/administrator/_lib/admin-rules";
import { STAGE_LABEL, centerOf, roleKeyOf, runKey, stageOf, useHalls } from "@/app/administrator/_lib/halls";
import { awaitsOral, patchAdmin, roleLabel, useAdminRows, type AdminRow } from "../_components/data";
import { canAny, fmtDateTime, Gate, Kpi, logAs, Meter, PageHeader, Panel, smallInputClass, stamp, Tabs, useStaffUser } from "../_components/kit";
import { Grading, usePendingWritten } from "./grading";
import { CentersAndSessions } from "./halls";
import { Bank, Blueprints, ExamRules } from "./rules";

type Tab = "results" | "centers" | "blueprints" | "bank" | "grading" | "rules";

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (w: number) => Math.round(w * 100);

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/50",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon text-white ring-maroon-light",
} as const;

/** Status chip readable on the dark cards */
function Chip({ tone = "green", children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

/**
 * The administrators' qualification exam in one place: who sat the written and how it went, the
 * committees' oral marks and the announcement of results; the centres, their halls and supervisors and
 * each role's sitting; each role's exam built in weighted sections; the question bank of three types;
 * the grading of written answers; and the rules results are judged by. Every result is judged by the
 * rules on this page as they stand now (resultOf), in both portals.
 */
export function ExamView() {
  return (
    <Gate perms={["administrators.manage", "season.settings", "groups.approve"]}>
      <Exam />
    </Gate>
  );
}

function Exam() {
  const user = useStaffUser()!;
  const toast = useToast();
  // The rules and the bank belong to the season and the administrators' affairs; the office manager
  // follows the results, which decide who may form a group
  const rulesAllowed = canAny(user, ["season.settings", "administrators.manage"]);
  const manage = can(user, "administrators.manage");
  const [tab, setTab] = useState<Tab>("results");
  const rows = useAdminRows();
  const rules = useExamRules();
  const bank = useExamBank();
  const stored = useStore((s) => s.adminRules);
  const edited = [stored.exam, stored.questionsOff, stored.questionEdits, stored.questionRoles, stored.blueprints, stored.questionsAdded].some((v) => v !== undefined);
  const pending = usePendingWritten();
  const toGrade = pending.reduce((a, p) => a + p.ids.length, 0);
  const waiting = rows.filter((r) => awaitsOral(r, rules)).length;
  const passed = rows.filter((r) => resultOf(r.profile, rules).passed).length;

  return (
    <div>
      <PageHeader
        eyebrow="الجزء الثاني — الإداريون الموسميون"
        title="إدارة الامتحان"
        icon={<GraduationCap />}
        description={`امتحان تأهيل الإداريين في صفحة واحدة: الكتابي جماعي لكل صفة في قاعات المراكز الامتحانية بإشراف مشرفيها، وأقسامه وأسئلته من هنا، وتحريريّه يُصحَّح هنا؛ والشفهي أمام اللجان خارجها وتُدخل نتيجته هنا ثم تُعلن. كل نتيجة تُحسب بالقواعد المعمول بها الآن: ${weightsLabel(rules)}، والنجاح من ${rules.passMark}.`}
        actions={
          rulesAllowed &&
          edited && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              onClick={() => {
                actions.setAdminRules({ exam: undefined, questionsOff: undefined, questionEdits: undefined, questionRoles: undefined, blueprints: undefined, questionsAdded: undefined });
                logAs(user, { action: "إعادة قواعد الامتحان وهيكله وبنك أسئلته إلى الأصل", target: "موسم 1448" });
                toast({ title: "أُعيد الامتحان إلى الأصل", body: "القواعد والهيكل والأسئلة كما تطلقها المنصة.", tone: "info", icon: "↩️" });
              }}
            >
              <RotateCcw className="size-4" /> إعادة الامتحان إلى الأصل
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="بانتظار الشفهي" value={waiting} icon={<PencilLine />} tone="gold" pulse={waiting > 0} hint={`بلغوا حد الكتابي (${rules.writtenMin})`} />
        <Kpi label="ناجحون في القائمة" value={passed} icon={<UsersRound />} tone="teal" delay={0.05} hint={`من ${rows.length} في القائمة`} />
        <Kpi label="إجابات تحريرية للتصحيح" value={toGrade} icon={<PenLine />} delay={0.1} pulse={toGrade > 0} hint={`في ${pending.length} أوراق — البنك فيه ${bank.length} سؤالاً`} />
        <Kpi label="علامة النجاح من 100" value={rules.passMark} icon={<GraduationCap />} tone="maroon" delay={0.15} hint={weightsLabel(rules)} />
      </div>

      <div className="mt-6">
        <Tabs
          id="exam"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "results", label: "المتقدمون والنتائج", count: rows.length },
            ...(rulesAllowed
              ? ([
                  { value: "centers", label: "المراكز والجلسات" },
                  { value: "blueprints", label: "هيكل الامتحان" },
                  { value: "bank", label: "بنك الأسئلة", count: bank.length },
                  { value: "grading", label: "التصحيح", count: toGrade },
                  { value: "rules", label: "قواعد الامتحان" },
                ] as const)
              : []),
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4 space-y-4">
          {tab === "results" && <Results rows={rows} />}
          {tab === "centers" && <CentersAndSessions manage={manage} />}
          {tab === "blueprints" && <Blueprints />}
          {tab === "bank" && <Bank />}
          {tab === "grading" && <Grading manage={manage} />}
          {tab === "rules" && <ExamRules />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Results ─────────────────────────

function Results({ rows }: { rows: AdminRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const rules = useExamRules();
  const halls = useHalls();
  const manage = can(user, "administrators.manage");
  const [editing, setEditing] = useState<AdminRow | null>(null);

  const publish = (r: AdminRow) => {
    const res = resultOf(r.profile, rules);
    patchAdmin(r, { resultPublishedAt: stamp() }, actions.upsertAdmin);
    logAs(user, { action: "اعتماد وإعلان نتيجة التأهيل", target: r.name, after: `${res.final} — ${res.passed ? "ناجح" : "غير ناجح"}` });
    toast({ title: `أُعلنت نتيجة ${r.name.split(" ")[0]}`, body: "وصل الإشعار إلى المتقدم.", tone: "success", icon: "📣" });
  };

  return (
    <>
      <Panel bodyClass="space-y-3">
        {!manage && (
          <p className="flex items-center gap-2 rounded-2xl bg-white/[.06] p-3 text-sm text-white/90 ring-1 ring-white/10">
            <Lock className="size-4 text-gold" /> عرض فقط — إدخال نتائج الشفهي وإعلانها من صلاحية شؤون الإداريين.
          </p>
        )}
        {rows.map((r, i) => {
          const res = resultOf(r.profile, rules);
          const center = centerOf(r.id, halls.moved);
          const sitting = center ? stageOf(halls.runs[runKey(roleKeyOf(r.profile.positions[0] ?? r.position), center.id)]) : "idle";
          const { written, oral, final } = res;
          // Below the written minimum nobody is called to the oral
          const below = written !== undefined && written < rules.writtenMin;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid gap-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[.09] hover:ring-gold/40 md:grid-cols-[1.4fr_1fr_1fr_1.1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/20 font-display text-lg font-bold text-gold ring-1 ring-gold/40">{r.name.replace("الشيخ ", "")[0]}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                    {r.name}
                    {!r.seed && <Chip tone="gold">من بوابة الإداريين</Chip>}
                  </p>
                  <p className="text-xs text-white/75">
                    {roleLabel(r)} · <span dir="ltr">{maskNationalId(r.id)}</span>
                  </p>
                  {r.profile.examExempt && <Chip tone="green">مجدَّد في صفته — معفى من الامتحانين</Chip>}
                  {/* The written is sat in a centre's hall: say which, and where its sitting stands */}
                  {!r.profile.examExempt && !r.previous && (center ? <Chip tone="gold">{center.name}{!written && !r.profile.exam?.submittedAt ? ` — ${STAGE_LABEL[sitting]}` : ""}</Chip> : !r.profile.exam?.submittedAt && <Chip tone="maroon">بلا مركز امتحاني</Chip>)}
                  {r.previous && <p className="text-[11px] text-gold">{r.previous}</p>}
                </div>
              </div>
              <ScoreCell label={`الكتابي ×${pct(rules.writtenWeight)}%`} value={written} empty={r.previous ? "معفى" : r.profile.exam?.submittedAt ? `قيد التصحيح — مبدئية ${r.profile.exam.provisional ?? "—"}` : sitting === "closed" ? "غائب عن جلسته" : "لم يُقدَّم"} />
              <ScoreCell label={`الشفهي ×${pct(rules.oralWeight)}%`} value={oral} empty={below ? "لا يُستدعى" : "بانتظار اللجنة"} />
              <div>
                <p className="text-[11px] text-white/75">النتيجة النهائية</p>
                {final !== undefined ? (
                  <>
                    <p className={cn("flex items-center gap-2 font-display text-2xl font-bold tabular-nums", res.passed ? "text-white" : "text-gold")}>
                      {final}
                      <Chip tone={res.passed ? "green" : "maroon"}>{res.passed ? "ناجح" : below ? `دون حد الكتابي` : `دون ${rules.passMark}`}</Chip>
                    </p>
                    <Meter value={final} tone={res.passed ? "teal" : "gold"} className="mt-1" />
                  </>
                ) : below ? (
                  <p className="mt-1">
                    <Chip tone="maroon">دون حد الكتابي ({rules.writtenMin})</Chip>
                  </p>
                ) : (
                  <p className="text-sm text-white/75">—</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {manage && (oral !== undefined || awaitsOral(r, rules)) && (
                  <Button size="sm" variant={oral === undefined ? "gold" : "glass"} onClick={() => setEditing(r)}>
                    <PencilLine className="size-4" /> {oral === undefined ? "إدخال الشفهي" : "تعديل"}
                  </Button>
                )}
                {manage && final !== undefined && !r.profile.resultPublishedAt && (
                  <Button size="sm" variant="gold" onClick={() => publish(r)}>
                    <Megaphone className="size-4" /> إعلان
                  </Button>
                )}
                {r.profile.resultPublishedAt && <Chip tone="green"><CheckCircle2 className="size-3" /> أُعلنت {fmtDateTime(r.profile.resultPublishedAt)}</Chip>}
              </div>
            </motion.div>
          );
        })}
      </Panel>
      {/* outside the Panel: its backdrop-blur would trap the fixed overlay inside the card */}
      <OralModal row={editing} onClose={() => setEditing(null)} />
    </>
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

function OralModal({ row, onClose }: { row: AdminRow | null; onClose: () => void }) {
  return (
    <Modal open={!!row} onClose={onClose} className="max-w-xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      {row && <OralForm key={row.id} row={row} onClose={onClose} />}
    </Modal>
  );
}

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
    });
    toast({ title: "حُفظت نتيجة الشفهي", body: `${row.name}: ${final} — ${pass ? "ناجح" : "دون الحد الأدنى"}. لا تظهر للمتقدم قبل الإعلان.`, tone: pass ? "success" : "gold", icon: pass ? "🎓" : "📝" });
    onClose();
  };

  return (
    <div>
      <p className="text-xs font-bold text-gold">الامتحان الشفهي — خارج المنصة، ونتيجته على المنصة</p>
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
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-white">اللجنة</span>
          <select value={committee} onChange={(e) => setCommittee(e.target.value)} className={cn(smallInputClass, "[&>option]:text-ink")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                رقم {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-white">ملاحظات اللجنة</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="قوي في السيناريوهات الميدانية..." className={smallInputClass} />
        </label>
      </div>
      {needsReason && (
        <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 block">
          <span className="mb-1 block text-sm font-bold text-gold">سبب تعديل الدرجة ({prev?.score} ← {score})</span>
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
    </div>
  );
}
