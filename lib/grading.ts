import { SEASON } from "./season";

/**
 * End-of-season classification. Groups (and clusters, by exactly the same rule) are ranked INSIDE
 * their own tier, across all offices together — a first-tier group competes with every first-tier
 * group in the country, never with a higher tier. The administration sets the shares: the top
 * `promoteShare` of each tier moves up one tier, the bottom `demoteShare` moves down one, and
 * everyone between them stays where they are. The first `honorTop` of every tier are honoured.
 *
 * A group head entering his first season always starts at the entry tier, so a tier is earned.
 */
export type GradingRules = { promoteShare: number; demoteShare: number; honorTop: number };

/** One ranked entity: a group or a cluster, with the season score the evaluation produced */
export type Graded = {
  id: string;
  /** Group number, or the cluster's name */
  name: string;
  /** Head and office, shown under the name */
  head: string;
  office: string;
  tier: number;
  /** The season's evaluation as a percentage of 100 */
  score: number;
  /** What the score is made of, for the administration to see why */
  parts: { label: string; value: number; weight: number }[];
};

export type Outcome = "promote" | "hold" | "demote" | "ceiling" | "warned";

export type Ranked = {
  rank: number;
  entry: Graded;
  outcome: Outcome;
  nextTier: number;
  honored: boolean;
};

export type TierResult = {
  tier: number;
  label: string;
  service: string;
  total: number;
  promoteCount: number;
  demoteCount: number;
  holdCount: number;
  rows: Ranked[];
};

export const TIERS = SEASON.grading.tiers;
export const MAX_TIER = TIERS[TIERS.length - 1].key;

export function tierOf(n: number) {
  return TIERS.find((t) => t.key === n) ?? TIERS[0];
}

export function tierLabel(n: number) {
  return tierOf(n).label;
}

/** The number of entities in a share of the tier, rounded to the nearest whole entity */
export function shareCount(total: number, share: number) {
  return Math.round(total * share);
}

/**
 * Rank one tier and decide who moves. The shares are taken from the tier's own total, and the two
 * ends are never allowed to overlap: if the tier is small enough for them to meet, the middle wins
 * and nobody is both promoted and demoted.
 */
export function classifyTier(tier: number, entries: Graded[], rules: GradingRules): TierResult {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar"));
  const total = sorted.length;
  let promoteCount = shareCount(total, rules.promoteShare);
  let demoteCount = shareCount(total, rules.demoteShare);
  if (promoteCount + demoteCount > total) {
    const over = promoteCount + demoteCount - total;
    demoteCount = Math.max(0, demoteCount - Math.ceil(over / 2));
    promoteCount = Math.max(0, total - demoteCount);
  }
  const rows: Ranked[] = sorted.map((entry, i) => {
    const rank = i + 1;
    const up = rank <= promoteCount;
    const down = rank > total - demoteCount;
    // The top tier has nothing above it and the entry tier nothing below it
    const nextTier = up ? Math.min(tier + 1, MAX_TIER) : down ? Math.max(tier - 1, TIERS[0].key) : tier;
    const outcome: Outcome = up ? (nextTier > tier ? "promote" : "ceiling") : down ? (nextTier < tier ? "demote" : "warned") : "hold";
    return { rank, entry, outcome, nextTier, honored: rank <= rules.honorTop };
  });
  return {
    tier,
    label: tierOf(tier).label,
    service: tierOf(tier).service,
    total,
    promoteCount,
    demoteCount,
    holdCount: total - promoteCount - demoteCount,
    rows,
  };
}

/** Every tier that has entities, from the entry tier upward */
export function classify(entries: Graded[], rules: GradingRules): TierResult[] {
  return TIERS.map((t) => classifyTier(t.key, entries.filter((e) => e.tier === t.key), rules)).filter((r) => r.total > 0);
}

/** Where one entity landed, for the head's own screen */
export function standingOf(id: string, entries: Graded[], rules: GradingRules) {
  for (const tier of classify(entries, rules)) {
    const row = tier.rows.find((r) => r.entry.id === id);
    if (row) return { ...row, tierResult: tier };
  }
  return null;
}

export const OUTCOME_TEXT: Record<Outcome, { label: string; note: string; tone: "green" | "gold" | "maroon" }> = {
  promote: { label: "ترقية فئة", note: "ضمن الأعلى تقييماً في فئته", tone: "green" },
  ceiling: { label: "يبقى في الفئة العليا", note: "ضمن الأعلى تقييماً، ولا فئة أعلى منها", tone: "green" },
  hold: { label: "يبقى في فئته", note: "بين الحدّين — لا ترقية ولا تخفيض", tone: "gold" },
  demote: { label: "تخفيض فئة", note: "ضمن الأدنى تقييماً في فئته", tone: "maroon" },
  warned: { label: "إنذار — لا فئة أدنى", note: "ضمن الأدنى تقييماً وهو في فئة البداية", tone: "maroon" },
};
