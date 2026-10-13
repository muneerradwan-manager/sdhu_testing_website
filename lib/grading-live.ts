"use client";

import { useMemo } from "react";
import { SEED_CLUSTERS } from "@/app/administrator/_lib/cluster";
import { DEMO_CLUSTERS, DEMO_GROUPS } from "./data/grading-demo";
import type { Graded } from "./grading";
import { groupName } from "./groups";
import { useStore, type State } from "./store";

/** The part of the season score that the staff evaluation feeds */
const STAFF_PART = "تقييم الموظفين";

/** A group's entry under the name its group carries now: its head may have named it since the data was built */
const named = (e: Graded): Graded => ({ ...e, name: groupName(Number(e.id.slice(2))) });

/**
 * What the staff and the cluster's head gave an administrator, out of 5: the administration's evaluation and
 * every posted staff member's and head's after the season (app/administrator/_lib/evaluation), each one rater
 */
function staffAndHead(id: string, evaluations: State["evaluations"], peers: State["peerEvaluations"]): number | null {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const raters = [
    ...(evaluations[id] ? [evaluations[id].avg] : []),
    ...Object.values(peers[id] ?? {}).map((p) => avg(Object.values(p.stages).map((x) => x.score).filter((x) => x > 0))).filter((x): x is number => x !== null),
  ];
  return avg(raters);
}

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
  const peers = useStore((s) => s.peerEvaluations);
  return useMemo(() => {
    const base = scope === "groups" ? DEMO_GROUPS.map(named) : DEMO_CLUSTERS;
    const ids = new Set([...Object.keys(evaluations), ...Object.keys(peers)]);
    if (!ids.size) return base;
    // What the staff gave each entry: the group or the cluster rated as a whole («g-<group>», «c-<cluster>»), and its
    // head's own evaluation — averaged when there are both
    const parts = new Map<string, number[]>();
    const add = (entry: string, v: number | null) => v !== null && parts.set(entry, [...(parts.get(entry) ?? []), v]);
    for (const id of ids) {
      if (id.startsWith("g-")) {
        if (scope === "groups") add(id, staffAndHead(id, evaluations, peers));
        continue;
      }
      if (id.startsWith("c-")) {
        const name = SEED_CLUSTERS.find((x) => x.cluster.id === id.slice(2))?.cluster.name;
        const c = DEMO_CLUSTERS.find((x) => x.name === name);
        if (scope === "clusters" && c) add(c.id, staffAndHead(id, evaluations, peers));
        continue;
      }
      const p = admins[id];
      const v = staffAndHead(id, evaluations, peers);
      if (!p || v === null) continue;
      if (scope === "groups" && p.group) add(`g-${p.group.number}`, v);
      if (scope === "clusters" && p.cluster) {
        const c = DEMO_CLUSTERS.find((x) => x.name === p.cluster!.name);
        if (c) add(c.id, v);
      }
    }
    const byEntry = new Map([...parts].map(([k, vs]) => [k, vs.reduce((a, b) => a + b, 0) / vs.length]));
    if (!byEntry.size) return base;
    return base.map((e) => (byEntry.has(e.id) ? recompute(e, byEntry.get(e.id)!) : e));
  }, [scope, admins, evaluations, peers]);
}

/** Which entries were recomputed from a staff evaluation, for the screens that say so */
export function useEvaluatedIds(scope: "groups" | "clusters"): Set<string> {
  const admins = useStore((s) => s.admins);
  const evaluations = useStore((s) => s.evaluations);
  const peers = useStore((s) => s.peerEvaluations);
  return useMemo(() => {
    const ids = new Set<string>();
    for (const id of new Set([...Object.keys(evaluations), ...Object.keys(peers)])) {
      if (id.startsWith("g-")) {
        if (scope === "groups") ids.add(id);
        continue;
      }
      if (id.startsWith("c-")) {
        const name = SEED_CLUSTERS.find((x) => x.cluster.id === id.slice(2))?.cluster.name;
        const c = DEMO_CLUSTERS.find((x) => x.name === name);
        if (scope === "clusters" && c) ids.add(c.id);
        continue;
      }
      const p = admins[id];
      if (!p) continue;
      if (scope === "groups" && p.group) ids.add(`g-${p.group.number}`);
      if (scope === "clusters" && p.cluster) {
        const c = DEMO_CLUSTERS.find((x) => x.name === p.cluster!.name);
        if (c) ids.add(c.id);
      }
    }
    return ids;
  }, [scope, admins, evaluations, peers]);
}
