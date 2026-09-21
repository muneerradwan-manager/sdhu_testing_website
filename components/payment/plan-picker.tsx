"use client";

import { CalendarClock, Landmark } from "lucide-react";
import { planAmounts, seasonPlan } from "@/lib/installments";
import { SEASON } from "@/lib/season";
import { formatUSD } from "@/lib/utils";

/**
 * How the Hajj cost is paid this season — set by the administration, shown to the pilgrim (never chosen).
 * For the application's people: what is due now, and what follows and when.
 */
export function SeasonPlanNote({ people, fees, dueNowLabel = "تدفع الآن" }: { people: number; fees: { hajjCost: number; firstInstallment: number; installmentCount: 1 | 2 }; dueNowLabel?: string }) {
  const plan = seasonPlan(fees);
  const amounts = planAmounts(plan, fees);
  return (
    <div className="rounded-3xl border-2 border-gold/50 bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-gold-dark">
        <Landmark className="size-4" /> حددت الإدارة لموسم {SEASON.hijriYear}: {plan === 1 ? "دفعة واحدة كاملة" : "الدفع على دفعتين"}
      </p>
      <ul className="mt-3 space-y-2">
        {amounts.map((a, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sand/60 px-4 py-3">
            <span>
              <span className="block font-bold">{plan === 1 ? "تكلفة الحج كاملة" : i === 0 ? "الدفعة الأولى" : "الدفعة الثانية"}</span>
              <span className="flex items-center gap-1 text-xs text-ink-soft">
                <CalendarClock className="size-3.5" /> {i === 0 ? dueNowLabel : SEASON.installments.windows[i]}
              </span>
            </span>
            <span className="text-left">
              <b className="font-display text-xl text-green-dark">{formatUSD(a * people)}</b>
              <span className="block text-xs text-hint">
                {people} × {formatUSD(a)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
