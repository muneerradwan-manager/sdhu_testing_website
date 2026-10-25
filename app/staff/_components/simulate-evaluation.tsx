"use client";

import { FlaskConical, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useSimulateEvaluation, type EvaluationStep } from "@/app/administrator/_lib/evaluation-demo";

const STEPS: { step: EvaluationStep; label: string; hint: string }[] = [
  { step: "ratings", label: "١ التقييم والنقاط", hint: "رئيس تكتل النور يقيّم نفسه، ويقيّمه وسام وهيثم، ويضيفان له سلبية وإيجابية" },
  { step: "objection", label: "٢ الاعتراض", hint: "يعترض على مرحلة وعلى السلبية بدليل، ويردّ وسام" },
  { step: "all", label: "٣ إلى اللجنة", hint: "ينفّذ ما بقي وينقل التاريخ إلى نافذة اللجنة لتقرّر" },
];

/**
 * The demo's shortcut through the whole evaluation, in steps (app/administrator/_lib/evaluation-demo): each step does its part,
 * moves the demo's day into the matching window and says which account to sign in with to try that side by hand — the staff,
 * the administrator, the committee. «البدء من جديد» forgets it all.
 */
export function SimulateEvaluation({ className }: { className?: string }) {
  const simulate = useSimulateEvaluation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (step: EvaluationStep) => {
    setBusy(true);
    const r = await simulate(step);
    setBusy(false);
    toast({ title: r.ok ? "جرت المحاكاة" : "لم تجرِ المحاكاة", body: r.message, icon: "🧪", tone: r.ok ? "success" : "info" });
  };
  return (
    <div className={className}>
      <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          <FlaskConical className="size-4 text-gold" /> محاكاة التقييم كله (تجريبي)
        </p>
        <p className="mt-1 text-xs leading-6 text-white/65">خطوة بعد خطوة، لتجرّب كل جهة بنفسك: الموظف المقيِّم، ثم الإداري، ثم لجنة التقييم. كل خطوة تنقل تاريخ التجربة إلى نافذتها.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((s) => (
            <Button key={s.step} variant="glass" size="sm" disabled={busy} title={s.hint} onClick={() => run(s.step)}>
              {s.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" disabled={busy} className="bg-transparent text-white" onClick={() => run("reset")}>
            <RotateCcw className="size-4" /> البدء من جديد
          </Button>
        </div>
      </div>
    </div>
  );
}
