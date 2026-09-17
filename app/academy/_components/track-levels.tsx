"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ChevronDown, ChevronLeft, ClipboardCheck, Headphones, Lock, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { LESSON_FORMS, arabicCount, minutesLabel, type QuizQuestion } from "@/lib/data/academy";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./progress-ring";
import { QuizDialog } from "./quiz-dialog";

export type LevelData = {
  title: string;
  subtitle: string;
  quiz: QuizQuestion[];
  lessons: { slug: string; title: string; minutes: number; media: "video" | "audio"; lecturer: string; hasAudio?: boolean; real?: boolean }[];
};

export function TrackLevels({ trackSlug, levels }: { trackSlug: string; levels: LevelData[] }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const academy = useStore((s) => s.academy);
  const loggedIn = hydrated && !!session;
  const [open, setOpen] = useState(0);
  const [quiz, setQuiz] = useState<number | null>(null);

  const numbered = levels.map((l, li) => {
    const offset = levels.slice(0, li).reduce((sum, x) => sum + x.lessons.length, 0);
    return l.lessons.map((_, i) => offset + i + 1);
  });

  return (
    <div className="relative">
      {/* timeline spine */}
      <span className="absolute bottom-6 right-[27px] top-6 w-0.5 bg-gradient-to-b from-gold-dark via-gold to-transparent sm:right-[31px]" aria-hidden />
      <ol className="space-y-5">
        {levels.map((level, li) => {
          const doneCount = loggedIn ? level.lessons.filter((l) => academy[`${trackSlug}/${l.slug}`]).length : 0;
          const complete = loggedIn && doneCount === level.lessons.length;
          const isOpen = open === li;
          const minutes = level.lessons.reduce((s, l) => s + l.minutes, 0);
          return (
            <motion.li
              key={level.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: li * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative ps-16 sm:ps-20"
            >
              <span className="absolute right-0 top-3">
                <ProgressRing value={loggedIn ? doneCount / level.lessons.length : 0} size={56} stroke={4} className="bg-sand sm:scale-110">
                  <span className={cn("grid size-10 place-items-center rounded-full font-display text-lg font-bold", complete ? "bg-green-light text-white" : "bg-green-dark text-gold")}>
                    {complete ? <CheckCircle2 className="size-5" /> : li + 1}
                  </span>
                </ProgressRing>
              </span>

              <div className={cn("overflow-hidden rounded-3xl border bg-white transition-shadow", isOpen ? "border-gold-dark/40 shadow-[0_24px_60px_-36px_rgba(2,21,38,.45)]" : "border-gold/30 hover:shadow-lg")}>
                <button type="button" onClick={() => setOpen(isOpen ? -1 : li)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-5 text-right sm:p-6">
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold text-green-dark sm:text-2xl">{level.title}</span>
                    <span className="mt-1 block text-sm text-ink-soft">{level.subtitle}</span>
                    <span className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-sand px-2.5 py-1 font-semibold text-ink-soft">{arabicCount(level.lessons.length, LESSON_FORMS)}</span>
                      <span className="rounded-full bg-sand px-2.5 py-1 font-semibold text-ink-soft">{minutesLabel(minutes)}</span>
                      <span className="rounded-full bg-gold/30 px-2.5 py-1 font-semibold text-maroon">اختبار من 5 أسئلة</span>
                      {loggedIn && (
                        <span className="rounded-full bg-green-light/12 px-2.5 py-1 font-bold text-green tabular-nums">
                          أتممت {doneCount}/{level.lessons.length}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronDown className={cn("size-6 shrink-0 text-gold-dark transition-transform duration-300", isOpen && "rotate-180")} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                      <ul className="divide-y divide-gold/20 border-t border-gold/25">
                        {level.lessons.map((l, i) => {
                          const done = loggedIn && !!academy[`${trackSlug}/${l.slug}`];
                          return (
                            <motion.li key={l.slug} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i + 0.1 }}>
                              <Link href={`/academy/${trackSlug}/${l.slug}`} className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-sand sm:px-6">
                                <span
                                  className={cn(
                                    "grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-bold tabular-nums transition group-hover:scale-105",
                                    done ? "bg-green-light/15 text-green" : "bg-gold-light/70 text-green-dark",
                                  )}
                                >
                                  {done ? <CheckCircle2 className="size-5" /> : numbered[li][i]}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold text-ink group-hover:text-green-dark">{l.title}</span>
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-hint">
                                    <span className="flex items-center gap-1">
                                      {l.media === "audio" ? <Headphones className="size-3.5" /> : <PlayCircle className="size-3.5" />}
                                      {l.media === "audio" ? "صوتي" : "فيديو"} • {minutesLabel(l.minutes)}
                                    </span>
                                    <span>{l.lecturer}</span>
                                    {l.hasAudio && <span className="text-maroon">+ ملف صوتي</span>}
                                    {l.real && <span className="font-bold text-gold-dark">تصوير من الحرم</span>}
                                  </span>
                                </span>
                                <ChevronLeft className="size-5 shrink-0 text-gold-dark opacity-0 transition group-hover:-translate-x-1 group-hover:opacity-100" />
                              </Link>
                            </motion.li>
                          );
                        })}
                      </ul>
                      <div className="flex flex-col items-start justify-between gap-3 border-t border-gold/25 bg-sand/60 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
                        <p className="flex items-center gap-2 text-sm text-ink-soft">
                          <ClipboardCheck className="size-5 text-gold-dark" />
                          خمسة أسئلة لمراجعة المستوى، ولا تؤثر في أي طلب.
                        </p>
                        {loggedIn ? (
                          <button type="button" onClick={() => setQuiz(li)} className="inline-flex items-center gap-2 rounded-2xl bg-maroon px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-maroon-dark">
                            <ClipboardCheck className="size-4" /> ابدأ اختبار المستوى
                          </button>
                        ) : (
                          <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-maroon/30 px-5 py-2 text-sm font-bold text-maroon hover:border-maroon">
                            <Lock className="size-4" /> أنشئ حساباً لأداء الاختبار
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.li>
          );
        })}
      </ol>
      <QuizDialog open={quiz !== null} onClose={() => setQuiz(null)} title={quiz !== null ? levels[quiz].title : ""} questions={quiz !== null ? levels[quiz].quiz : []} />
    </div>
  );
}
