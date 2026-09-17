"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { StarRating, useToast } from "@/components/ui/widgets";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

async function celebrate(x = 0.5, y = 0.6) {
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 90, spread: 70, startVelocity: 38, origin: { x, y }, colors: ["#D9C89E", "#AD9E6E", "#00594F", "#289E92", "#ffffff"], scalar: 0.9 });
}

export { celebrate };

export function LessonActions({ lessonKey, lessonTitle, isLastInTrack }: { lessonKey: string; lessonTitle: string; isLastInTrack: boolean }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const done = useStore((s) => !!s.academy[lessonKey]);
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const loggedIn = hydrated && !!session;

  const complete = (e: MouseEvent<HTMLButtonElement>) => {
    if (done) return;
    actions.completeLesson(lessonKey);
    const r = e.currentTarget.getBoundingClientRect();
    void celebrate((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight);
    toast({
      title: "أحسنت! أتممت الدرس",
      body: isLastInTrack ? "هذا آخر درس في المسار — راجع صفحة المسار لشهادتك." : `حُفظ تقدمك في «${lessonTitle}».`,
      tone: "gold",
      icon: "🌟",
    });
  };

  const rate = (v: number) => {
    setRating(v);
    toast({ title: "شكراً لتقييمك", body: `قيّمت الدرس ${v} من 5 نجوم. رأيك يساعدنا على تحسين الدروس.`, tone: "success", icon: "⭐" });
  };

  if (!loggedIn) {
    return (
      <div className="flex flex-col items-start justify-between gap-3 rounded-3xl border border-dashed border-gold-dark/40 bg-gold-light/40 p-4 sm:flex-row sm:items-center sm:p-5">
        <p className="flex items-center gap-2.5 text-sm leading-7 text-ink-soft">
          <Lock className="size-5 shrink-0 text-gold-dark" />
          سجّل الدخول لتحفظ إتمام الدرس، وتقيّمه، وتحصل على شهادة المسار.
        </p>
        <div className="flex shrink-0 gap-2">
          <Link href="/register" className="rounded-xl bg-green-dark px-4 py-2 text-sm font-bold text-white hover:bg-green">
            إنشاء حساب
          </Link>
          <Link href="/login" className="rounded-xl border border-green-dark/20 px-4 py-2 text-sm font-semibold text-green-dark hover:bg-green-dark/5">
            دخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-gold/35 bg-white p-4 shadow-[0_20px_60px_-40px_rgba(2,21,38,.4)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <motion.button
        type="button"
        onClick={complete}
        whileTap={{ scale: 0.96 }}
        aria-pressed={done}
        className={cn(
          "relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-6 py-3.5 font-bold transition-colors",
          done ? "bg-green-light/12 text-green ring-1 ring-green-light/40" : "bg-green-dark text-white shadow-lg hover:bg-green",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span key="done" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} className="flex">
              <CheckCircle2 className="size-5" />
            </motion.span>
          ) : (
            <motion.span key="todo" exit={{ scale: 0 }} className="flex">
              <Circle className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {done ? "أتممت هذا الدرس" : "تحديد الدرس كمكتمل"}
        {!done && <span className="absolute inset-0 -translate-x-full animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,.18)_50%,transparent_70%)] bg-[length:200%_100%]" />}
      </motion.button>

      <div className={cn("flex items-center gap-3 transition-opacity", !done && "opacity-50")}>
        <span className="text-sm font-semibold text-ink-soft">{done ? "قيّم الدرس:" : "قيّم بعد الإتمام"}</span>
        <StarRating value={rating} onChange={done ? rate : undefined} />
      </div>
    </div>
  );
}
