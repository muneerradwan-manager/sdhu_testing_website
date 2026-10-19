"use client";

import { seedPilgrimScenario } from "./demo-scenarios";
import type { OperationState } from "./operations";
import { DEMO_SCENARIOS } from "./registry";
import { actions, getState } from "./store";
import { nowMs } from "./utils";

/**
 * The six demo cases of the pilgrim portal, entered the same way whether the pilgrim signed in from the demo card or
 * created his account himself: a case that starts from scratch moves the demo's day into its registration's window
 * and opens the form; a case already applied gets its application, as far as it went; each lands on its own page.
 * Returns where to go — none for a person who is not one of the cases.
 */
export function enterDemoCase(id: string, ops: { direct: OperationState; lottery: OperationState }): string | null {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === id);
  if (!scenario?.outcome) return null;
  if (scenario.fresh) {
    // From the start: an application left by an earlier try goes
    if (getState().applications[id]) actions.deleteApplication(id);
    const op = scenario.fresh === "direct" ? ops.direct : ops.lottery;
    if (!op.open) actions.setToday(op.start, op.startTime);
    return "/portal/apply";
  }
  seedPilgrimScenario(id, { applications: getState().applications }, nowMs());
  return scenario.seed === "complete" ? "/portal/season" : "/portal/application";
}

/** What the case's way in says, on its button */
export function caseCta(id: string) {
  const s = DEMO_SCENARIOS.find((x) => x.id === id);
  if (!s?.outcome) return null;
  if (s.fresh) return s.fresh === "direct" ? "قدّم طلبك على القبول المباشر" : "قدّم طلبك على القرعة";
  return s.seed === "complete" ? "ادخل إلى «حالتي الآن»" : "تابع طلبك";
}
