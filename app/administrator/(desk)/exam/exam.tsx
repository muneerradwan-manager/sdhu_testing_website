"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import confetti from "canvas-confetti";
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Cloud,
  CloudUpload,
  Flag,
  Gavel,
  GraduationCap,
  Hourglass,
  Landmark,
  ListChecks,
  RotateCcw,
  Send,
  ShieldCheck,
  Trophy,
  UsersRound,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Modal, StarRating, useToast } from "@/components/ui/widgets";
import { EXAM_DISTRIBUTION, scoreExam } from "@/lib/data/admin-exam";
import { finalScoreWith, useExamQuestions, useExamRules } from "../../_lib/admin-rules";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, resultOf, useAdmin } from "../../_lib/admin";
import { AdminShell, LockedCard, SimButton } from "../../_components/ui";

export function AdminExam() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const [justSubmitted, setJustSubmitted] = useState(false);
  const onSubmitted = useCallback(() => setJustSubmitted(true), []);
  const onGraded = useCallback(() => setJustSubmitted(false), []);

  if (!p?.eligibleAt) {
    return (
      <AdminShell title="الامتحان الكتابي المؤتمت" subtitle="15 ربيع الآخر 1448 — الساعة 09:00 — على المنصة.">
        <LockedCard title="الامتحان غير متاح بعد" text="يُفتح الامتحان الكتابي بعد تقديم طلب المشاركة وتسديد الرسم واكتمال التحقق من الأهلية." href="/administrator/apply" cta="إلى طلب المشاركة" />
      </AdminShell>
    );
  }

  if (p.examExempt) {
    return (
      <AdminShell title="الامتحان الكتابي المؤتمت" subtitle="لا امتحان هذا الموسم: جدّدت الصفة نفسها بتقييم مستوفٍ وفق شروط الإدارة.">
        <LockedCard title="معفى من الامتحانين" text="من يجدد صفته التي شغلها الموسم الماضي بتقييم لا يقل عن الحد الذي حددته الإدارة يُعفى من الامتحانين الكتابي والشفهي، ويعامَل معاملة الناجح في التأهيل." href="/administrator/group" cta="متابعة إلى مجموعتي" />
      </AdminShell>
    );
  }

  if (p.exam && !p.exam.submittedAt) return <ExamRunner onSubmitted={onSubmitted} />;

  return (
    <AdminShell
      image="/images/haram-2022.jpg"
      title={p.exam?.submittedAt ? "نتيجتي في التأهيل" : "الامتحان الكتابي المؤتمت"}
      subtitle={p.exam?.submittedAt ? "الكتابي 60% + الشفهي 40% — الحد الأدنى للنجاح 70." : "يُولَّد امتحان كل متقدم من بنك الأسئلة، فلا يتطابق امتحان متقدمَين."}
    >
      {p.exam?.submittedAt ? <Results grading={justSubmitted} onGraded={onGraded} /> : <RulesScreen />}
    </AdminShell>
  );
}

// ───────────────────────── Rules ─────────────────────────

function RulesScreen() {
  const rules = useExamRules();
  const admin = useAdmin()!;
  const [agree, setAgree] = useState(false);
  const max = Math.max(...EXAM_DISTRIBUTION.map((d) => d.count));
  const start = () => {
    actions.upsertAdmin(admin.id, { exam: { startedAt: Date.now(), answers: {} } });
    logAdmin(admin.id, "بدء الامتحان الكتابي", `الإداري ${admin.id.slice(-3)}`, `${rules.questions} سؤالاً — ${rules.minutes} دقيقة`);
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-green-dark to-green text-gold"><GraduationCap className="size-8" /></span>
          <div>
            <p className="text-sm text-hint">{rules.date}</p>
            <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">تعليمات الامتحان</h2>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            [String(rules.questions), "سؤالاً"],
            [String(rules.minutes), "دقيقة"],
            [`${rules.writtenMin}+`, "لاجتياز الكتابي"],
          ].map(([v, k]) => (
            <div key={k} className="rounded-2xl bg-sand p-4">
              <dd className="font-display text-3xl font-bold text-maroon">{v}</dd>
              <dt className="text-xs text-hint">{k}</dt>
            </div>
          ))}
        </dl>
        <ul className="mt-6 space-y-3">
          {[
            { icon: CloudUpload, t: "الإجابات تُحفظ تلقائياً مع كل اختيار." },
            { icon: WifiOff, t: "عند انقطاع الإنترنت تستأنف من حيث توقفت خلال المدة." },
            { icon: Flag, t: "علّم أي سؤال للمراجعة وارجع إليه من شبكة الأسئلة." },
            { icon: AlarmClock, t: "عند انتهاء الوقت يُرسل الامتحان تلقائياً." },
            { icon: ShieldCheck, t: "لا يمكن الرجوع بعد الإرسال." },
          ].map((r) => (
            <li key={r.t} className="flex items-center gap-3 rounded-2xl border border-gold/30 p-3">
              <r.icon className="size-5 shrink-0 text-gold-dark" /> <span className="leading-7">{r.t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-2xl bg-gold/15 p-4 text-sm leading-7 text-ink-soft">
          النسخة التجريبية: {rules.questions} سؤالاً في {rules.minutes} دقيقة. الامتحان الفعلي 60 سؤالاً في 90 دقيقة، ويضم صح/خطأ واختياراً متعدداً وترتيب خطوات وسيناريوهات يصححها مصحح مخوّل.
        </p>
        <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl bg-sand p-4">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="size-5 accent-green-dark" />
          <span className="font-semibold">قرأت التعليمات، وأتعهد بأداء الامتحان بنفسي.</span>
        </label>
        <Button size="xl" className="mt-6 w-full" disabled={!agree} onClick={start}>
          ابدأ الامتحان الآن <ArrowLeft className="size-6" />
        </Button>
      </Card>

      <Card className="md:p-8">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><ListChecks className="size-5 text-gold-dark" /> توزيع الأسئلة في الامتحان الكامل</h3>
        <p className="text-xs text-hint">كما أعدّته لجنة المناهج لموسم 1448 — 60 سؤالاً</p>
        <ul className="mt-5 space-y-3">
          {EXAM_DISTRIBUTION.map((d, i) => (
            <li key={d.category}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{d.category}</span>
                <span className="font-bold tabular-nums text-maroon">{d.count}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-sand">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-green-dark to-green-light" initial={{ width: 0 }} animate={{ width: `${(d.count / max) * 100}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-2xl border border-gold/40 p-4 text-sm leading-7">
          <p className="font-bold text-green-dark">بعد الكتابي</p>
          <p className="text-ink-soft">الامتحان الشفهي: {rules.oralDate}. تُدخل النتيجة على المنصة من شؤون الإداريين.</p>
          <p className="mt-1 text-ink-soft">
            النتيجة النهائية: الكتابي {Math.round(rules.writtenWeight * 100)}% + الشفهي {Math.round(rules.oralWeight * 100)}%، والنجاح من <b className="text-maroon">{rules.passMark}</b> — كما حددتها الإدارة لهذا الموسم.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ───────────────────────── Runner ─────────────────────────

function ExamRunner({ onSubmitted }: { onSubmitted: () => void }) {
  const rules = useExamRules();
  const questions = useExamQuestions();
  const admin = useAdmin()!;
  const toast = useToast();
  const exam = admin.profile!.exam!;
  const answers = exam.answers;
  const [idx, setIdx] = useState(0);
  const [flags, setFlags] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [confirm, setConfirm] = useState(false);
  const [dir, setDir] = useState(1);
  const submitted = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);

  const total = rules.minutes * 60_000;
  const remaining = Math.max(0, total - (now - exam.startedAt));
  const expired = remaining <= 0;
  const q = questions[idx];
  const answeredCount = questions.filter((x) => answers[x.id] !== undefined).length;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    document.body.style.overflow = "hidden";
    container.current?.focus();
    return () => {
      clearInterval(t);
      document.body.style.overflow = "";
      window.clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (Object.keys(exam.answers).length > 0) toast({ title: "استأنفنا من حيث توقفت", body: "إجاباتك السابقة محفوظة، والوقت يُحسب من لحظة البدء.", icon: "☁️", tone: "info" });
    // Only once, when the runner opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      const { score, correct, total: n } = scoreExam(exam.answers, questions);
      onSubmitted();
      actions.upsertAdmin(admin.id, { exam: { ...exam, submittedAt: Date.now(), score } });
      logAdmin(admin.id, auto ? "إرسال الامتحان الكتابي تلقائياً (انتهى الوقت)" : "إرسال الامتحان الكتابي", `الإداري ${admin.id.slice(-3)}`, `${correct} من ${n} إجابات صحيحة — النتيجة ${score} من 100`);
    },
    [admin.id, exam, onSubmitted, questions],
  );

  useEffect(() => {
    if (expired) submit(true);
  }, [expired, submit]);

  const choose = (option: number) => {
    actions.upsertAdmin(admin.id, { exam: { ...exam, answers: { ...answers, [q.id]: option } } });
    setSaving("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaving("saved"), 650);
  };

  const goTo = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    setDir(i > idx ? 1 : -1);
    setIdx(i);
  };

  const toggleFlag = () => setFlags((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]));

  const onKey = (e: React.KeyboardEvent) => {
    if (confirm) return;
    const n = Number(e.key);
    if (n >= 1 && n <= q.options.length) choose(n - 1);
    if (e.key === "ArrowLeft") goTo(idx + 1);
    if (e.key === "ArrowRight") goTo(idx - 1);
  };

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 2 * 60_000;

  return (
    <div ref={container} className="fixed inset-0 z-[60] overflow-y-auto bg-sand outline-none" tabIndex={-1} onKeyDown={onKey} role="application" aria-label="الامتحان الكتابي">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b border-gold/30 bg-green-dark text-white shadow-lg">
        <div className="bg-pattern pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gold text-ink"><GraduationCap className="size-5" /></span>
            <div>
              <p className="font-display font-bold">الامتحان الكتابي — موسم 1448</p>
              <p className="text-xs text-white/70">{admin.name} — السؤال {idx + 1} من {questions.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-white/75 sm:flex" aria-live="polite">
              {saving === "saving" ? <CloudUpload className="size-4 animate-pulse" /> : <Cloud className="size-4" />}
              {saving === "saving" ? "جارٍ الحفظ..." : saving === "saved" ? "حُفظ تلقائياً" : "الحفظ التلقائي مفعّل"}
            </span>
            <motion.span
              animate={low ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={low ? { repeat: Infinity, duration: 1 } : undefined}
              className={cn("flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums", low ? "bg-maroon text-white" : "bg-white/10 text-gold")}
              dir="ltr"
              role="timer"
              aria-label="الوقت المتبقي"
            >
              <Hourglass className="size-4" />
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </motion.span>
            <Button variant="gold" size="sm" onClick={() => setConfirm(true)}>
              <Send className="size-4" /> إرسال
            </Button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <motion.div className="h-full bg-gold" animate={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 md:px-8 lg:grid-cols-[1fr_17rem]">
        <div className="overflow-hidden rounded-[2rem] border border-gold/30 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-10">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={q.id} initial={{ opacity: 0, x: dir * -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * 40 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge tone="gold">{q.category}</Badge>
                <button type="button" onClick={toggleFlag} aria-pressed={flags.includes(q.id)} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition", flags.includes(q.id) ? "bg-maroon text-white" : "bg-sand text-ink-soft hover:bg-maroon/10 hover:text-maroon")}>
                  <Flag className={cn("size-4", flags.includes(q.id) && "fill-current")} /> {flags.includes(q.id) ? "معلَّم للمراجعة" : "علّم للمراجعة"}
                </button>
              </div>
              {q.scenario && (
                <div className="mt-5 rounded-2xl border-r-4 border-maroon bg-maroon/5 p-4 text-sm leading-7 text-ink">
                  <span className="font-bold text-maroon">سيناريو تشغيلي: </span>
                  {q.scenario}
                </div>
              )}
              <h2 className="mt-5 font-display text-xl font-bold leading-[1.7] text-ink md:text-2xl">
                <span className="text-maroon">{idx + 1}.</span> {q.text}
              </h2>
              <ul className="mt-6 space-y-3" role="radiogroup" aria-label="الخيارات">
                {q.options.map((o, i) => {
                  const on = answers[q.id] === i;
                  return (
                    <li key={o}>
                      <motion.button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => choose(i)}
                        className={cn("flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-right transition", on ? "border-green-dark bg-green-dark/5 shadow-md" : "border-gold/40 hover:border-gold-dark hover:bg-sand")}
                      >
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl font-bold transition", on ? "bg-green-dark text-gold" : "bg-sand text-ink-soft")}>
                          {on ? <Check className="size-5" /> : ["أ", "ب", "ج", "د"][i]}
                        </span>
                        <span className="leading-7">{o}</span>
                        <kbd className="mr-auto hidden rounded-md border border-gold/50 px-1.5 font-mono text-xs text-hint md:inline">{i + 1}</kbd>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-gold-light pt-6">
            <Button variant="ghost" onClick={() => goTo(idx - 1)} disabled={idx === 0}>
              <ArrowRight className="size-4" /> السابق
            </Button>
            {idx < questions.length - 1 ? (
              <Button onClick={() => goTo(idx + 1)}>
                التالي <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <Button variant="maroon" onClick={() => setConfirm(true)}>
                مراجعة وإرسال <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <p className="text-sm font-bold text-green-dark">شبكة الأسئلة</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {questions.map((x, i) => {
                const answered = answers[x.id] !== undefined;
                const flagged = flags.includes(x.id);
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`السؤال ${i + 1}${answered ? " — مُجاب" : ""}${flagged ? " — معلَّم" : ""}`}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-xl text-sm font-bold transition",
                      answered ? "bg-green-dark text-white" : "bg-sand text-ink-soft hover:bg-gold/30",
                      i === idx && "ring-2 ring-gold-dark ring-offset-2",
                    )}
                  >
                    {i + 1}
                    {flagged && <span className="absolute -left-1 -top-1 size-3 rounded-full bg-maroon ring-2 ring-white" />}
                  </button>
                );
              })}
            </div>
            <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
              <li className="flex items-center gap-2"><span className="size-3 rounded bg-green-dark" /> مُجاب ({answeredCount})</li>
              <li className="flex items-center gap-2"><span className="size-3 rounded bg-sand ring-1 ring-gold" /> بلا إجابة ({questions.length - answeredCount})</li>
              <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-maroon" /> للمراجعة ({flags.length})</li>
            </ul>
          </div>
          <p className="rounded-3xl bg-green-dark/6 p-4 text-xs leading-6 text-green-dark">اختصارات: الأرقام 1–4 للاختيار، والأسهم للتنقل.</p>
        </aside>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <div className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/10 text-maroon"><Send className="size-8" /></span>
          <h3 className="mt-4 font-display text-2xl font-bold text-green-dark">إرسال الامتحان نهائياً؟</h3>
          <p className="mt-2 text-ink-soft">لا يمكن الرجوع أو تعديل الإجابات بعد الإرسال.</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-green-light/10 p-3"><p className="font-display text-2xl font-bold text-green">{answeredCount}</p>مُجاب</div>
            <div className="rounded-2xl bg-sand p-3"><p className="font-display text-2xl font-bold text-ink">{questions.length - answeredCount}</p>بلا إجابة</div>
            <div className="rounded-2xl bg-maroon/8 p-3"><p className="font-display text-2xl font-bold text-maroon">{flags.length}</p>للمراجعة</div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => setConfirm(false)}>متابعة الإجابة</Button>
            <Button
              variant="maroon"
              onClick={() => {
                setConfirm(false);
                submit(false);
              }}
            >
              نعم، أرسل الامتحان <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ───────────────────────── Results ─────────────────────────

function ScoreRing({ value, label, tone = "green", size = 150 }: { value: number; label: string; tone?: "green" | "gold" | "maroon"; size?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => (Math.round(v * 10) / 10).toString());
  const offset = useTransform(mv, (v) => 283 - (283 * v) / 100);
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [mv, value]);
  const stroke = tone === "gold" ? "#AD9E6E" : tone === "maroon" ? "#672146" : "#289E92";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E4DDD3" strokeWidth="7" />
        <motion.circle cx="50" cy="50" r="45" fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeDasharray="283" style={{ strokeDashoffset: offset }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.p className="font-display text-4xl font-bold tabular-nums text-ink">{text}</motion.p>
          <p className="text-xs text-hint">{label}</p>
        </div>
      </div>
    </div>
  );
}

function Results({ grading, onGraded }: { grading: boolean; onGraded: () => void }) {
  const rules = useExamRules();
  const questions = useExamQuestions();
  const admin = useAdmin()!;
  const toast = useToast();
  const p = admin.profile!;
  const r = resultOf(p);
  const { correct, total } = scoreExam(p.exam!.answers, questions);
  const [review, setReview] = useState(false);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!grading) return;
    const t = setTimeout(onGraded, 2400);
    return () => clearTimeout(t);
  }, [grading, onGraded]);

  const simulateOral = () => {
    const at = Date.now();
    const written = p.exam?.score ?? 0;
    const final = finalScoreWith(written, 84, rules);
    actions.upsertAdmin(admin.id, {
      oral: { score: 84, by: "ماهر عيسى", at, note: "قوي في السيناريوهات الميدانية، يحتاج إلى تحسين الإلقاء" },
      finalScore: final,
      resultPublishedAt: at,
    });
    actions.logEvent({ actor: "ماهر عيسى", role: "موظف", action: "إدخال نتيجة الامتحان الشفهي (محاكاة)", target: admin.name, detail: "84 من 100 (17 من 20) — اللجنة رقم 3" });
    actions.logEvent({ actor: "رئيس اللجان", role: "موظف", action: "اعتماد ونشر النتائج النهائية (محاكاة)", target: admin.name, detail: `النهائية ${final} — ${final >= rules.passMark ? "ناجح" : "لم يجتز"}` });
    logAdmin(admin.id, "الاطلاع على النتيجة النهائية", `الإداري ${admin.id.slice(-3)}`, `الكتابي ${written} × 60% + الشفهي 84 × 40% = ${final}`);
    toast({ title: "نُشرت نتيجتك النهائية", body: `النتيجة: ${final} من 100`, icon: "📜", tone: "gold" });
  };

  const retake = () => {
    actions.upsertAdmin(admin.id, { exam: undefined, oral: undefined, finalScore: undefined, resultPublishedAt: undefined });
    logAdmin(admin.id, "إعادة الامتحان الكتابي (نسخة تجريبية)", `الإداري ${admin.id.slice(-3)}`);
  };

  if (grading) {
    return (
      <Card className="grid min-h-96 place-items-center text-center">
        <div>
          <div className="relative mx-auto size-28">
            <motion.span className="absolute inset-0 rounded-full border-4 border-gold-light border-t-green-dark" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
            <span className="absolute inset-0 grid place-items-center text-green-dark"><ListChecks className="size-10" /></span>
          </div>
          <p className="mt-6 font-display text-2xl font-bold text-green-dark">نصحح إجاباتك تلقائياً...</p>
          <p className="mt-1 text-hint">الأسئلة الموضوعية تُصحَّح فور الإرسال</p>
        </div>
      </Card>
    );
  }

  const published = r.published && r.final !== undefined;

  return (
    <div className="space-y-6">
      {published ? (
        <FinalResult written={r.written!} oral={r.oral!} final={r.final!} passed={r.passed} note={p.oral?.note} by={p.oral?.by} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* written */}
        <Card className="md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><GraduationCap className="size-6 text-gold-dark" /> الامتحان الكتابي</h3>
            <Badge tone={r.writtenPassed ? "green" : "maroon"}>{r.writtenPassed ? "اجتزت الحد الأدنى" : "دون الحد الأدنى"}</Badge>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <ScoreRing value={r.written ?? 0} label="من 100" tone={r.writtenPassed ? "green" : "maroon"} />
            <dl className="space-y-2 text-sm">
              <div><dt className="inline text-hint">الإجابات الصحيحة: </dt><dd className="inline font-bold">{correct} من {total}</dd></div>
              <div><dt className="inline text-hint">الوزن في النتيجة: </dt><dd className="inline font-bold">60%</dd></div>
              <div><dt className="inline text-hint">المدة المستغرقة: </dt><dd className="inline font-bold">{Math.max(1, Math.round(((p.exam!.submittedAt ?? 0) - p.exam!.startedAt) / 60000))} دقيقة</dd></div>
            </dl>
          </div>
          <p className="mt-5 rounded-2xl bg-sand p-4 text-xs leading-6 text-ink-soft">في المنصة الفعلية لا تظهر النتيجة إلا بعد اعتماد نتائج الكتابي لجميع المتقدمين، لضمان تصحيح الأسئلة المفتوحة للجميع بمعيار واحد.</p>
          <button type="button" onClick={() => setReview((v) => !v)} className="mt-4 flex items-center gap-1.5 text-sm font-bold text-green-dark">
            مراجعة الإجابات <ChevronDown className={cn("size-4 transition", review && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {review && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {questions.map((q, i) => {
                  const ok = p.exam!.answers[q.id] === q.answer;
                  return (
                    <li key={q.id} className="mt-3 rounded-2xl border border-gold/30 p-3 text-sm">
                      <p className="flex items-start gap-2 font-semibold">
                        {ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-light" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-maroon" />}
                        {i + 1}. {q.text}
                      </p>
                      <p className="mr-7 mt-1 text-green">الصحيح: {q.options[q.answer]}</p>
                      <p className="mr-7 mt-0.5 text-xs leading-5 text-ink-soft">{q.explanation}</p>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
          {!r.writtenPassed && (
            <div className="mt-6 rounded-2xl bg-maroon/6 p-4">
              <p className="text-sm leading-7 text-maroon">لم تبلغ الحد الأدنى ({rules.writtenMin}) في الكتابي، فلا تنتقل إلى الشفهي هذا الموسم.</p>
              <SimButton className="mt-3" onClick={retake}><RotateCcw className="size-4" /> إعادة المحاولة (للتجربة فقط)</SimButton>
            </div>
          )}
        </Card>

        {/* oral */}
        <Card className="md:p-8">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark"><Gavel className="size-6 text-gold-dark" /> الامتحان الشفهي</h3>
          <p className="mt-1 text-sm text-hint">خارج المنصة — ونتيجته على المنصة</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Landmark className="size-4 text-gold-dark" /> {rules.oralDate}</li>
            <li className="flex items-center gap-2"><UsersRound className="size-4 text-gold-dark" /> ثلاثة أعضاء — 20 دقيقة: حاج غاضب، إغماء في الحافلة، قراءة خريطة المشاعر</li>
          </ul>
          {r.oral !== undefined ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-wrap items-center gap-6">
              <ScoreRing value={r.oral} label="من 100" tone="gold" size={130} />
              <dl className="space-y-2 text-sm">
                <div><dt className="inline text-hint">أدخلها: </dt><dd className="inline font-bold">{p.oral?.by}</dd></div>
                <div><dt className="inline text-hint">على الورقة الرسمية: </dt><dd className="inline font-bold">{Math.round((r.oral / 100) * 20)} من 20</dd></div>
                {p.oral?.note && <div><dt className="inline text-hint">ملاحظات اللجنة: </dt><dd className="inline font-bold">«{p.oral.note}»</dd></div>}
              </dl>
            </motion.div>
          ) : r.writtenPassed ? (
            <div className="mt-6 rounded-3xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-6 text-center">
              <motion.span animate={{ rotate: [0, 180, 180, 360] }} transition={{ repeat: Infinity, duration: 3, times: [0, 0.4, 0.6, 1] }} className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-gold-dark">
                <Hourglass className="size-7" />
              </motion.span>
              <p className="mt-4 font-display text-xl font-bold text-green-dark">بانتظار إدخال نتيجة اللجنة</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">يُدخلها ماهر عيسى (شؤون الإداريين) من لوحة الموظفين، ولا تظهر إلا بعد اعتماد رئيس اللجان. الصفحة تتحدث تلقائياً.</p>
              <SimButton className="mt-5" onClick={simulateOral}>محاكاة: إدخال اللجنة للنتيجة</SimButton>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-sand p-4 text-sm text-ink-soft">غير متاح — يلزم اجتياز الكتابي أولاً.</p>
          )}
        </Card>
      </div>

      {published && (
        <Card className="text-center md:p-8">
          <p className="font-bold">هل كانت معايير التقييم ونتيجتك واضحة؟</p>
          <div className="mt-3 flex justify-center">
            <StarRating
              value={stars}
              size="lg"
              onChange={(v) => {
                setStars(v);
                logAdmin(admin.id, "تقييم مرحلة النتيجة النهائية", "تجربة الإداري", `${v} من 5`);
                toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

function FinalResult({ written, oral, final, passed, note, by }: { written: number; oral: number; final: number; passed: boolean; note?: string; by?: string }) {
  const rules = useExamRules();
  const fired = useRef(false);
  useEffect(() => {
    if (!passed || fired.current) return;
    fired.current = true;
    const colors = ["#D9C89E", "#AD9E6E", "#00594F", "#672146"];
    const t1 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.2, y: 0.5 }, colors }), 900);
    const t2 = setTimeout(() => confetti({ particleCount: 120, spread: 90, origin: { x: 0.8, y: 0.5 }, colors }), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [passed]);

  const parts = useMemo(
    () => [
      { k: "الكتابي", v: written, w: 0.6, c: "bg-green-light" },
      { k: "الشفهي", v: oral, w: 0.4, c: "bg-gold-dark" },
    ],
    [written, oral],
  );

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={cn("relative overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl md:p-10", passed ? "bg-gradient-to-br from-green-dark via-green to-maroon" : "bg-ink")}>
      <div className="bg-pattern absolute inset-0 opacity-15" />
      {passed && <motion.div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity }} />}
      <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <motion.div initial={{ rotate: -120, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", damping: 11, delay: 0.2 }} className="mx-auto grid size-36 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-ink shadow-2xl ring-8 ring-white/10">
          <div className="text-center">
            {passed ? <Trophy className="mx-auto size-10" /> : <CircleX className="mx-auto size-10" />}
            <p className="font-display text-3xl font-bold tabular-nums">{final}</p>
          </div>
        </motion.div>
        <div>
          <p className="text-sm text-gold">نتيجتي النهائية — نُشرت في {rules.resultsDate}</p>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">{passed ? "تهانينا، اجتزت التأهيل!" : "لم تجتز التأهيل هذا الموسم"}</h2>
          <p className="mt-2 leading-8 text-white/80">
            {passed ? "الترتيب: 41 من 1,380 متقدماً — اسمك في قائمة الناجحين — مرشّح لمنصب رئيس مجموعة." : `الحد الأدنى للنجاح ${rules.passMark}. يبقى سجلك مرجعاً في أي تأهيل لاحق.`}
          </p>
          <div className="mt-6 space-y-3">
            {parts.map((x, i) => (
              <div key={x.k}>
                <div className="flex justify-between text-sm">
                  <span>{x.k}: {x.v} × {x.w * 100}%</span>
                  <span className="font-bold tabular-nums text-gold">{(Math.round(x.v * x.w * 10) / 10).toFixed(1)}</span>
                </div>
                <div className="relative mt-1 h-2.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div className={cn("h-full rounded-full", x.c)} initial={{ width: 0 }} animate={{ width: `${x.v * x.w}%` }} transition={{ delay: 0.4 + i * 0.25, duration: 1 }} />
                </div>
              </div>
            ))}
            <div className="relative pt-3">
              <div className="flex justify-between text-sm font-bold">
                <span>النهائية</span>
                <span className="text-gold">{final} من 100</span>
              </div>
              <div className="relative mt-1 h-3.5 overflow-hidden rounded-full bg-white/15">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-gold to-gold-dark" initial={{ width: 0 }} animate={{ width: `${final}%` }} transition={{ delay: 1, duration: 1.2 }} />
                <span className="absolute inset-y-0 w-0.5 bg-white" style={{ right: `${rules.passMark}%` }} />
              </div>
              <p className="mt-1 text-xs text-white/60" style={{ marginRight: `calc(${rules.passMark}% - 1.5rem)` }}>حد النجاح {rules.passMark}</p>
            </div>
          </div>
          {note && <p className="mt-4 text-sm text-white/70">ملاحظات اللجنة ({by}): «{note}»</p>}
          {passed && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="/administrator/group" variant="gold" size="lg">
                <BadgeCheck className="size-5" /> التالي: طلب تشكيل مجموعة
              </ButtonLink>
              <span className="text-sm text-white/70">من 11 إلى 25 جمادى الأولى</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
