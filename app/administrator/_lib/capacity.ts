import type { AdminProfile } from "@/lib/store";
import { HEADS_POOL } from "./people";

/**
 * This season's group numbers — the platform's key only, never shown: a group is known by the name its head
 * gives it (@/lib/groups). Given in order as the requests arrive, the next one free. Before this demo
 * 1 to 26 were given, and the season's story holds others already (27 is أحمد's, 31 the cluster head's).
 */
const ISSUED_BEFORE = 26;
const SEEDED_NUMBERS = [27, 31, 5, 63, ...HEADS_POOL.map((h) => h.group)];

export function nextGroupNumber(admins: Record<string, AdminProfile>, self: string) {
  const used = new Set([...SEEDED_NUMBERS, ...Object.entries(admins).flatMap(([id, p]) => (id !== self && p.group ? [p.group.number] : []))]);
  let n = ISSUED_BEFORE + 1;
  while (used.has(n)) n++;
  return n;
}
