"use client";

import { useMemo } from "react";
import { useFinalScores } from "@/app/administrator/_lib/evaluation";
import { DEMO_CLUSTERS, DEMO_GROUPS } from "./data/grading-demo";
import type { Graded } from "./grading";
import { groupName } from "./groups";
import { useStore } from "./store";

/** The part of the season score that the staff evaluation feeds */
const STAFF_PART = "تقييم الموظفين";

/** A group's entry under the name its group carries now: its head may have named it since the data was built */
const named = (e: Graded): Graded => ({ ...e, name: groupName(Number(e.id.slice(2))) });

function recompute(entry: Graded, avgOutOfFive: number): Graded {
  const parts = entry.parts.map((p) => (p.label === STAFF_PART ? { ...p, value: Math.round((avgOutOfFive / 5) * 1000) / 10 } : p));
  const score = Math.round(parts.reduce((t, p) => t + p.value * p.weight, 0) * 10) / 10;
  return { ...entry, parts, score };
}

/**
 * The season's scores, with the evaluation folded in. An administrator's adopted evaluation (the staff's score, or the
 * committee's where he objected — app/administrator/_lib/evaluation) is out of 5. A group's head stands for his group
 * and a cluster's head for his cluster, so each one's score replaces the staff-rating part of his group's or his
 * cluster's, and the total is recomputed from the parts and their weights: the evaluation feeds the score, and the
 * score decides the tier.
 */
export function useGraded(scope: "groups" | "clusters"): Graded[] {
  const admins = useStore((s) => s.admins);
  const finals = useFinalScores();
  return useMemo(() => {
    const base = scope === "groups" ? DEMO_GROUPS.map(named) : DEMO_CLUSTERS;
    const byEntry = new Map<string, number>();
    for (const [id, v] of Object.entries(finals)) {
      const p = admins[id];
      if (!p) continue;
      if (scope === "groups" && p.group && !p.cluster) byEntry.set(`g-${p.group.number}`, v);
      if (scope === "clusters" && p.cluster) {
        const c = DEMO_CLUSTERS.find((x) => x.name === p.cluster!.name);
        if (c) byEntry.set(c.id, v);
      }
    }
    if (!byEntry.size) return base;
    return base.map((e) => (byEntry.has(e.id) ? recompute(e, byEntry.get(e.id)!) : e));
  }, [scope, admins, finals]);
}

/** Which entries were recomputed from an evaluation, for the screens that say so */
export function useEvaluatedIds(scope: "groups" | "clusters"): Set<string> {
  const admins = useStore((s) => s.admins);
  const finals = useFinalScores();
  return useMemo(() => {
    const ids = new Set<string>();
    for (const id of Object.keys(finals)) {
      const p = admins[id];
      if (!p) continue;
      if (scope === "groups" && p.group && !p.cluster) ids.add(`g-${p.group.number}`);
      if (scope === "clusters" && p.cluster) {
        const c = DEMO_CLUSTERS.find((x) => x.name === p.cluster!.name);
        if (c) ids.add(c.id);
      }
    }
    return ids;
  }, [scope, admins, finals]);
}
