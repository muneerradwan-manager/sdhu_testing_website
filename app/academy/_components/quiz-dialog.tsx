"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, RotateCcw, Trophy, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/widgets";
import type { QuizQuestion } from "@/lib/data/academy";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./progress-ring";
import { celebrate } from "./lesson-actions";

const LETTERS = ["أ", "ب", "ج", "د"];

export function QuizDialog({ open, onClose, title, questions }: { open: boolean; onClose: () => void; title: string; questions: QuizQuestion[] }) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-xl p-0">
      {open && <QuizBody title={title} questions={questions} onClose={onClose} />}
    </Modal>
  );
}

function QuizBody({ title, questions, onClose }: { title: string; questions: QuizQuestion[]; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const finished = step >= questions.length;
  const q = questions[Math.min(step, questions.length - 1)];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const nextStep = () => {
    const last = step === questions.length - 1;
    const finalScore = score;
    setPicked(null);
    setStep((s) => s + 1);
    if (last && finalScore >= 4) void celebrate(0.5, 0.45);
  };

  const restart = () => {
    setStep(0);
    setPicked(null);
    setScore(0);
  };

  return (
    <div className="overflow-hidden rounded-3xl">
      <div className="relative bg-green-dark px-6 pb-5 pt-6 text-white">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <p className="relative text-xs font-semibold text-gold">اختبار قصير للمراجعة — لا يؤثر في أي طلب</p>
        <h2 className="relative mt-1 pe-8 font-display text-xl font-bold">{title}</h2>
        <div className="relative mt-4 flex gap-1.5" dir="ltr">
          {questions.map((_, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
              <motion.span className="block h-full bg-gold" initial={false} animate={{ width: i < step || finished ? "100%" : i === step && picked !== null ? "100%" : "0%" }} />
            </span>
          ))}
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div key={step} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }}>
              <p className="text-xs font-bold text-maroon">
                السؤال {step + 1} من {questions.length}
              </p>
              <h3 className="mt-2 text-lg font-bold leading-8 text-ink">{q.q}</h3>
              <div className="mt-5 space-y-2.5" role="radiogroup" aria-label={q.q}>
                {q.options.map((opt, i) => {
                  const isPicked = picked === i;
                  const isRight = picked !== null && i === q.answer;
                  const isWrong = isPicked && i !== q.answer;
                  return (
                    <motion.button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={isPicked}
                      disabled={picked !== null}
                      onClick={() => pick(i)}
                      animate={isWrong ? { x: [0, -8, 8, -5, 5, 0] } : isRight && isPicked ? { scale: [1, 1.03, 1] } : {}}
                      transition={{ duration: 0.4 }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-right font-semibold transition-colors",
                        picked === null && "border-gold/30 hover:border-green-light hover:bg-green-light/5",
                        isRight && "border-green-light bg-green-light/10 text-green",
                        isWrong && "border-maroon/50 bg-maroon/5 text-maroon",
                        picked !== null && !isRight && !isWrong && "border-gold/20 opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-xl font-display text-sm",
                          isRight ? "bg-green-light text-white" : isWrong ? "bg-maroon text-white" : "bg-sand text-ink-soft",
                        )}
                      >
                        {isRight ? <Check className="size-4" /> : isWrong ? <X className="size-4" /> : LETTERS[i]}
                      </span>
                      <span className="leading-7">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence>
                {picked !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                    <p className={cn("mt-4 rounded-2xl p-3.5 text-sm leading-7", picked === q.answer ? "bg-green-light/10 text-green" : "bg-gold-light/60 text-ink-soft")}>
                      <strong>{picked === q.answer ? "إجابة صحيحة! " : "الإجابة الصحيحة: " + q.options[q.answer] + ". "}</strong>
                      {q.explain}
                    </p>
                    <button type="button" onClick={nextStep} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-dark py-3 font-bold text-white hover:bg-green">
                      {step === questions.length - 1 ? "عرض النتيجة" : "السؤال التالي"} <ChevronLeft className="size-5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-4 text-center">
              <ProgressRing value={score / questions.length} size={130} stroke={10}>
                <span className="flex flex-col items-center">
                  <Trophy className={cn("size-6", score >= 4 ? "text-gold-dark" : "text-hint")} />
                  <span className="font-display text-3xl font-bold text-green-dark tabular-nums">
                    {score}/{questions.length}
                  </span>
                </span>
              </ProgressRing>
              <h3 className="mt-4 font-display text-2xl font-bold text-green-dark">
                {score === questions.length ? "ممتاز! علامة كاملة" : score >= 4 ? "أحسنت، نتيجة رائعة" : score >= 3 ? "جيد، راجع بعض الدروس" : "لا بأس، أعد مراجعة المستوى"}
              </h3>
              <p className="mt-2 max-w-sm leading-7 text-ink-soft">الاختبار للمراجعة فقط. يمكنك إعادته متى شئت.</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={restart} className="inline-flex items-center gap-2 rounded-2xl border-2 border-green-dark/20 px-5 py-2.5 font-semibold text-green-dark hover:border-green-dark">
                  <RotateCcw className="size-4" /> إعادة الاختبار
                </button>
                <button type="button" onClick={onClose} className="rounded-2xl bg-green-dark px-5 py-2.5 font-bold text-white hover:bg-green">
                  إنهاء
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
