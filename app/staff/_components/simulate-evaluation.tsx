"use client";

import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useSimulateEvaluation } from "@/app/administrator/_lib/evaluation-demo";

/**
 * The demo's shortcut to the whole evaluation at once (app/administrator/_lib/evaluation-demo): his self-evaluation, two staff
 * rating him, his objection with evidence and a rater's answer — so the committee's page has a case to decide.
 */
export function SimulateEvaluation({ className }: { className?: string }) {
  const simulate = useSimulateEvaluation();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className={className}>
      <Button
        variant="glass"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await simulate();
          setBusy(false);
          toast({ title: r.ok ? "جرت محاكاة التقييم" : "لم تجرِ المحاكاة", body: r.message, icon: "🧪", tone: r.ok ? "success" : "info" });
        }}
      >
        <FlaskConical className="size-4" /> محاكاة: تقييم واعتراض (تجريبي)
      </Button>
    </div>
  );
}
