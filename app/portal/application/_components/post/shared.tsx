"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { fullName } from "@/lib/registry";
import { actions, type Application, type PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { CostLine, StepKey } from "./model";

export type StepProps = {
  app: Application;
  post: PostAcceptance;
  sessionId: string;
  lines: CostLine[];
};

/** Ticking clock for countdowns and simulated progress (never Date.now() during render) */
export function useNow(interval = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

export function applicantOf(app: Application) {
  return app.members.find((m) => m.relation === "self") ?? app.members[0];
}

/** Every pilgrim step lands in the append-only audit trail */
export function logPilgrim(app: Application, action: string, detail?: string) {
  actions.logEvent({ actor: fullName(applicantOf(app).person), role: "حاج", action, target: `طلب ${app.number}`, detail });
}

/** The rating question shown after a stage is complete (spec «⭐ تقييم المرحلة») */
export function StepRating({ stepKey, question, post, sessionId, app }: { stepKey: StepKey; question: string; post: PostAcceptance; sessionId: string; app: Application }) {
  const toast = useToast();
  const value = post.ratings[stepKey] ?? 0;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-3xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-5 text-center">
      <p className="text-sm font-bold text-gold-dark">⭐ سؤال قصير عن هذه المرحلة</p>
      <p className="mt-1 font-display text-xl font-bold leading-9 text-green-dark md:text-2xl">{question}</p>
      <div className="mt-3 flex justify-center">
        <StarRating
          size="lg"
          value={value}
          onChange={(v) => {
            actions.setPost(sessionId, { ratings: { ...post.ratings, [stepKey]: v } });
            logPilgrim(app, "تقييم مرحلة", `${question} — ${v} من 5`);
            toast({ title: "شكراً لتقييمك", body: "يظهر تقييمك في لوحة الجودة وتقرير الموسم.", icon: "⭐", tone: "gold" });
          }}
        />
      </div>
      <AnimatePresence>
        {value > 0 && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 text-sm font-semibold text-green">
            تم حفظ تقييمك: {value} من 5
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Completed-step screen: big check, summary, rating, and the next step button */
export function StepDone({
  title,
  body,
  children,
  rating,
  next,
  onNext,
}: {
  title: string;
  body?: ReactNode;
  children?: ReactNode;
  rating: ReactNode;
  next?: string;
  onNext?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 11 }} className="relative grid size-24 place-items-center rounded-full bg-green-light text-white shadow-2xl shadow-green-light/40">
          <motion.span className="absolute inset-0 rounded-full border-4 border-green-light" initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.2, repeat: 2 }} />
          <CheckCircle2 className="size-12" />
        </motion.span>
        <p className="mt-4 font-display text-3xl font-bold text-green-dark">{title}</p>
        {body && <div className="mt-2 max-w-2xl text-lg leading-8 text-ink-soft">{body}</div>}
        <SpeakButton text={`${title}. ${typeof body === "string" ? body : ""}`} className="mt-3" />
      </div>
      {children}
      {rating}
      {next && onNext && (
        <div className="text-center">
          <Button size="xl" onClick={onNext}>
            التالي: {next} <ArrowLeft className="size-6" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function Pill({ children, tone = "green", className }: { children: ReactNode; tone?: "green" | "gold" | "maroon" | "ink"; className?: string }) {
  const tones = {
    green: "bg-green-light/15 text-green",
    gold: "bg-gold/35 text-maroon",
    maroon: "bg-maroon/10 text-maroon",
    ink: "bg-ink/5 text-ink-soft",
  };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold", tones[tone], className)}>{children}</span>;
}
