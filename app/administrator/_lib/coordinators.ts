"use client";

import { useMemo } from "react";
import { NOUR_GROUPS } from "@/lib/flights";
import { useStore, type AdminProfile } from "@/lib/store";
import { lastServed } from "./admin";
export { NOUR_ASSIGNMENT, NOUR_COORDINATORS } from "./admin";
import { clusterGroupsOf, type ClusterGroup } from "./cluster";

/**
 * The technical coordinator is not part of a group's team: he works for the cluster. The cluster head
 * invites the cluster's coordinators — as many as its category allows — from those who qualified as
 * coordinators, and sorts the cluster's groups among them: one coordinator may take all six groups of a
 * small cluster, or three coordinators two each. A coordinator works only in the groups sorted to him: he
 * files pilgrims' applications in the office, enrolls the families who chose one of his groups, and takes
 * their health files.
 */
export const COORDINATOR_ROLE = { key: "tech", label: "المنسق التقني", note: "يسجّل الحجاج في مجموعاته المفروزة له، ويأخذ ملفاتهم الصحية" } as const;

/**
 * How many coordinators a cluster has is the administration's: categories by the number of groups the
 * cluster takes and its head's last rating, the first that fits in their order.
 */
export type CoordinatorTier = {
  id: string;
  label: string;
  /** The cluster takes at most this many groups (open when empty) */
  maxGroups?: number;
  /** The head's last rating, out of 5: from (inclusive) */
  minRating?: number;
  /** To (exclusive) */
  maxRating?: number;
  coordinators: number;
};

export const DEFAULT_COORDINATOR_TIERS: CoordinatorTier[] = [
  { id: "small", label: "تكتل صغير", maxGroups: 6, coordinators: 1 },
  { id: "mid-excellent", label: "تكتل متوسط — رئيس بتقييم ممتاز", maxGroups: 12, minRating: 4.5, coordinators: 3 },
  { id: "mid", label: "تكتل متوسط", maxGroups: 12, coordinators: 2 },
  { id: "large", label: "تكتل كبير", coordinators: 4 },
];

export function coordinatorTierMatches(t: CoordinatorTier, groups: number, rating: number | null) {
  const r = rating ?? 0;
  return (t.maxGroups === undefined || groups <= t.maxGroups) && (t.minRating === undefined || r >= t.minRating) && (t.maxRating === undefined || r < t.maxRating);
}

/** The category a cluster falls in: by the groups it takes and its head's last rating */
export function coordinatorTierFor(headId: string, groups: number, tiers: CoordinatorTier[]) {
  const rating = lastServed(headId)?.rating ?? null;
  return { rating, tier: tiers.find((t) => coordinatorTierMatches(t, groups, rating)) };
}

/** «حتى 12 مجموعة، ورئيسه بتقييم 4.5 فأكثر» */
export function coordinatorTierCondition(t: CoordinatorTier) {
  const size = t.maxGroups !== undefined ? `حتى ${t.maxGroups} مجموعة` : "أي عدد من المجموعات";
  const from = t.minRating !== undefined ? `${t.minRating} فأكثر` : "";
  const to = t.maxRating !== undefined ? `دون ${t.maxRating}` : "";
  return `${size}${from || to ? `، وتقييم رئيسه ${[from, to].filter(Boolean).join(" و")}` : ""}`;
}

export function coordinatorsLabel(n: number) {
  return n === 1 ? "منسق واحد" : n === 2 ? "منسقان" : `${n} منسقين`;
}

export function useCoordinatorTiers(): CoordinatorTier[] {
  return useStore((s) => s.adminRules.coordinatorTiers) ?? DEFAULT_COORDINATOR_TIERS;
}


export type CoordinatorPost = { clusterId: string; clusterName: string; headId: string; headName: string; groups: ClusterGroup[] };

/**
 * Where a coordinator works: his cluster and the groups its head sorted to him. Read from the head's own
 * record when it is on this device, so a change to the sorting reaches him at once; otherwise from what
 * his invitation left on his record.
 */
export function coordinatorPostOf(id: string, p: AdminProfile | undefined, admins: Record<string, AdminProfile>): CoordinatorPost | null {
  const c = p?.coordinatorIn;
  if (!c) return null;
  const head = admins[c.headId];
  if (head?.cluster?.id === c.clusterId) {
    const all = clusterGroupsOf(head, c.headName);
    return { ...c, groups: all.filter((g) => head.cluster!.assignment?.[g.number] === id) };
  }
  const pool = c.clusterId === "al-nour" ? NOUR_GROUPS : [];
  const groups = c.groups.flatMap((n) => {
    const g = pool.find((x) => x.number === n);
    return g ? [{ id: `g-${n}`, number: n, head: g.head, office: "مكتب دمشق", capacity: g.capacity, pilgrims: g.pilgrims, joined: "مفروزة لك" }] : [];
  });
  return { ...c, groups };
}

export function useCoordinatorPost(id: string, p: AdminProfile | undefined) {
  const admins = useStore((s) => s.admins);
  return useMemo(() => coordinatorPostOf(id, p, admins), [id, p, admins]);
}

/** «المجموعات 27 و31 و5» */
export function groupsLabel(numbers: number[]) {
  if (!numbers.length) return "لا مجموعة بعد";
  if (numbers.length === 1) return `المجموعة ${numbers[0]}`;
  return `المجموعات ${numbers.slice(0, -1).join(" و")} و${numbers.at(-1)}`;
}
