"use client";

import { useMemo } from "react";
import { useStore, type AdminProfile } from "@/lib/store";
import { seasonHistory } from "./admin";

/**
 * How many pilgrims a group may take is not the head's choice: the holder of «إدارة الإداريين» sets it
 * for the season in categories, by the head's experience leading a group and how he was rated for it. A
 * first-time head takes fewer, a head rated well before takes more, one rated poorly fewer again. The
 * head's request is given the capacity of the first category he falls in, in the order they are listed.
 *
 * The group has no team of its own: its head forms it alone, and the head of the cluster it enters assigns
 * it a religious guide, a technical coordinator and an assistant from the cluster's people (./formation).
 */
export type CapacityTier = {
  id: string;
  label: string;
  /** «first»: has never led a group; «returning»: has, and his last rating as head is within the range */
  when: "first" | "returning";
  /** Out of 5, inclusive; the range is open on the side left empty */
  minRating?: number;
  /** Out of 5, exclusive */
  maxRating?: number;
  capacity: number;
};

export const DEFAULT_CAPACITY_TIERS: CapacityTier[] = [
  { id: "first", label: "رئيس مجموعة لأول مرة", when: "first", capacity: 50 },
  { id: "excellent", label: "سبق له رئاسة مجموعة — تقييم ممتاز", when: "returning", minRating: 4.5, capacity: 100 },
  { id: "good", label: "سبق له رئاسة مجموعة — تقييم جيد", when: "returning", minRating: 3.5, maxRating: 4.5, capacity: 75 },
  { id: "poor", label: "سبق له رئاسة مجموعة — تقييم ضعيف", when: "returning", maxRating: 3.5, capacity: 40 },
];

/** His record leading groups: the seasons he led one, and his rating in the last of them */
export function headRecord(id: string) {
  const led = seasonHistory(id).filter((h) => h.roleKey === "group-head");
  return { seasons: led.length, rating: led.at(-1)?.rating ?? null };
}

export function tierMatches(t: CapacityTier, rec: { seasons: number; rating: number | null }) {
  if (t.when === "first") return rec.seasons === 0;
  if (rec.seasons === 0) return false;
  const r = rec.rating ?? 0;
  return (t.minRating === undefined || r >= t.minRating) && (t.maxRating === undefined || r < t.maxRating);
}

/** The category a head falls in, or none when the administration's categories leave him out */
export function capacityFor(id: string, tiers: CapacityTier[]) {
  const rec = headRecord(id);
  return { ...rec, tier: tiers.find((t) => tierMatches(t, rec)) };
}

/** What a category asks, in words: «لأول مرة»، «سبق له، وتقييمه 4.5 فأكثر» */
export function tierCondition(t: CapacityTier) {
  if (t.when === "first") return "لم يرأس مجموعة من قبل";
  const from = t.minRating !== undefined ? `${t.minRating} فأكثر` : "";
  const to = t.maxRating !== undefined ? `دون ${t.maxRating}` : "";
  return `رأس مجموعة من قبل${from || to ? `، وتقييمه في آخر رئاسة ${[from, to].filter(Boolean).join(" و")}` : ""}`;
}

export function useCapacityTiers(): CapacityTier[] {
  const saved = useStore((s) => s.adminRules.capacityTiers);
  return useMemo(() => saved ?? DEFAULT_CAPACITY_TIERS, [saved]);
}

/**
 * This season's group numbers — the platform's key only, never shown: a group is known by the name its head
 * gives it (@/lib/groups). Given in order as the requests arrive, the next one free. Before this demo
 * 1 to 26 were given, and the season's story holds others already (27 is أحمد's, 31 the elected head's).
 */
const ISSUED_BEFORE = 26;
const SEEDED_NUMBERS = [27, 31, 5, 8, 61, 9, 41, 52, 47, 33, 18, 55, 44];

export function nextGroupNumber(admins: Record<string, AdminProfile>, self: string) {
  const used = new Set([...SEEDED_NUMBERS, ...Object.entries(admins).flatMap(([id, p]) => (id !== self && p.group ? [p.group.number] : []))]);
  let n = ISSUED_BEFORE + 1;
  while (used.has(n)) n++;
  return n;
}
