"use client";

import { useMemo } from "react";
import { DEMO_CLUSTERS, DEMO_GROUPS } from "./data/grading-demo";
import type { Graded } from "./grading";
import { useStore } from "./store";

/** The part of the season score that the staff evaluation feeds */
const STAFF_PART = "تقييم الموظفين ورئيس التكتل";

function recompute(entry: Graded, avgOutOfFive: number): Graded {
  const parts = entry.parts.map((p) => (p.label === STAFF_PART ? { ...p, value: Math.round((avgOutOfFive / 5) * 1000) / 10 } : p));
  const score = Math.round(parts.reduce((t, p) => t + p.value * p.weight, 0) * 10) / 10;
  return { ...entry, parts, score };
}

/**
 * The season's scores, with the evaluations the staff actually entered folded in. An evaluation is
 * given to an administrator out of 5; it replaces the staff-rating part of his group's score, and the
 * total is recomputed from the parts and their weights. So the chain runs end to end: the evaluation
 * screen feeds the score, and the score decides the tier.
 */
export function useGraded(scope: "groups" | "clusters"): Graded[] {
  const admins = useStore((s) => s.admins);
  const evaluations = useStore((s) => s.evaluations);
  return useMemo(() => {
    const base = scope === "groups" ? DEMO_GROUPS : DEMO_CLUSTERS;
    if (!Object.keys(evaluations).length) return base;
    // An administrator's evaluation lands on the group he heads, or on the cluster he was elected to run
    const byEntry = new Map<string, number>();
    for (const [id, ev] of Object.entries(evaluations)) {
      const p = admins[id];
      if (!p) continue;
      if (scope === "groups" && p.group) byEntry.set(`g-${p.group.number}`, ev.avg);
      if (scope === "clusters" && p.cluster) {
        const c = DEMO_CLUSTERS.find((x) => x.name === p.cluster!.name);
        if (c) byEntry.set(c.id, ev.avg);
      }
    }
    if (!byEntry.size) return base;
    return base.map((e) => (byEntry.has(e.id) ? recompute(e, byEntry.get(e.id)!) : e));
  }, [scope, admins, evaluations]);
}

/** Which entries were recomputed from a staff evaluation, for the screens that say so */
export function useEvaluatedIds(scope: "groups" | "clusters"): Set<string> {
  const admins = useStore((s) => s.admins);
  const evaluations = useStore((s) => s.evaluations);
  return useMemo(() => {
    const ids = new Set<string>();
    for (const id of Object.keys(evaluations)) {
      const p = admins[id];
      if (!p) continue;
      if (scope === "groups" && p.group) ids.add(`g-${p.group.number}`);
      if (scope === "clusters" && p.cluster) {
        const c = DEMO_CLUSTERS.find((x) => x.name === p.cluster!.name);
        if (c) ids.add(c.id);
      }
    }
    return ids;
  }, [scope, admins, evaluations]);
}
