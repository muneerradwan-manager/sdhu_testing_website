import { DEMO_ADMINS, seasonHistory } from "@/app/administrator/_lib/admin";
import { HEADS_POOL, PEOPLE, ROSTER } from "@/app/administrator/_lib/people";
import { CLUSTERS } from "@/lib/data/clusters";
import { DEMO_GROUPS } from "@/lib/data/grading-demo";
import { tierOf } from "@/lib/grading";
import { groupName } from "@/lib/groups";
import { SEASON } from "@/lib/season";
import { seeded } from "@/lib/utils";

/**
 * «لوحة الشرف»: the administrators each season honoured, read from the platform's own records rather than a
 * parallel cast. The demo accounts keep the seasons «السجل الموسمي» tells (app/administrator/_lib/admin
 * seasonHistory); the season's other heads and cadre (app/administrator/_lib/people HEADS_POOL, ROSTER) carry
 * the number of seasons they served and the rating of the last one, 1447, and their earlier seasons follow from
 * it on a fixed seed — the same on every load. Season 1447's classification (lib/data/grading-demo) gives the
 * groups it ranked their score and tier. Every name is the demo's own; none is a real person's.
 */

/** The seasons that ended and were rated, oldest first; the current one is still running */
export const PAST_SEASONS = ["1444", "1445", "1446", "1447"] as const;
export const LATEST = PAST_SEASONS[PAST_SEASONS.length - 1];
export const CURRENT = String(SEASON.hijriYear);
export type SeasonKey = (typeof PAST_SEASONS)[number] | typeof CURRENT;
export const ALL_SEASONS: SeasonKey[] = [...PAST_SEASONS, CURRENT];

/** The Hajj of each season in the Gregorian calendar */
export const GREGORIAN: Record<string, number> = { "1444": 2023, "1445": 2024, "1446": 2025, "1447": 2026, "1448": 2027 };

/** The roles as the public reads them; the administration's own names (app/administrator/_lib/structure DEFAULT_ROLES) */
export const ROLES: Record<string, { ar: string; en: string; female?: boolean }> = {
  "group-head": { ar: "رئيس مجموعة", en: "Group head" },
  "group-deputy": { ar: "معاون", en: "Assistant" },
  "assistant-count": { ar: "معاون بعدد", en: "Assistant (adds pilgrims)" },
  tech: { ar: "منسق تقني", en: "Technical coordinator" },
  "assistant-tech": { ar: "معاون ومنسق تقني", en: "Assistant and technical coordinator" },
  murshid: { ar: "موجّه ديني أ", en: "Religious guide, grade A" },
  "guide-m": { ar: "موجّه ديني ب", en: "Religious guide, grade B" },
  "guide-m-c": { ar: "موجّه ديني ج", en: "Religious guide, grade C" },
  murshida: { ar: "موجّهة دينية أ", en: "Female religious guide, grade A", female: true },
  "guide-f": { ar: "موجّهة دينية ب", en: "Female religious guide, grade B", female: true },
  "guide-f-c": { ar: "موجّهة دينية ج", en: "Female religious guide, grade C", female: true },
};

/** The awards beside the group heads', each over the roles it gathers */
export const AWARDS = [
  { key: "tech", ar: "أفضل منسق تقني", en: "Best technical coordinator", roles: ["tech", "assistant-tech"] },
  { key: "guide", ar: "أفضل موجّه ديني", en: "Best religious guide", roles: ["murshid", "guide-m", "guide-m-c"] },
  { key: "guide-f", ar: "أفضل موجّهة دينية", en: "Best female religious guide", roles: ["murshida", "guide-f", "guide-f-c"] },
  { key: "deputy", ar: "أفضل معاون", en: "Best assistant", roles: ["group-deputy", "assistant-count"] },
] as const;
export type AwardKey = (typeof AWARDS)[number]["key"];

/** One person honoured in one season */
export type Honouree = {
  id: string;
  name: string;
  female: boolean;
  roleKey: string;
  /** The season's rating out of 5: the pilgrims 40%, the staff 45%, the platform's conduct record 15% */
  rating: number;
  /** Seasons served up to and including this one */
  seasons: number;
  office: string;
  /** «مجموعة الخبير», or «تكتل النور — مجموعة الخبير» when the record names the cluster */
  where?: string;
  /** A group head's tier that season */
  tier?: number;
  /** A group head's classification score out of 100 (lib/data/grading-demo SCORE_PARTS) */
  score: number;
  rank: number;
};

export type ClusterHonour = { slug: string; name: string; governorate: string; since: number; rating: number; score: number; rank: number };

export type SeasonRoll = {
  season: string;
  heads: Honouree[];
  /** The first `honorTop` of every tier, as the classification honours them */
  tiers: { tier: number; label: string; service: string; total: number; top: Honouree[] }[];
  awards: { key: AwardKey; total: number; top: Honouree[] }[];
  clusters: ClusterHonour[];
  /** Everyone rated that season */
  rated: number;
  average: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The office a branch belongs to, named as lib/season OFFICES names it */
function officeOf(branch: string | undefined) {
  if (!branch) return "مكتب دمشق";
  if (branch === "اسطنبول" || branch === "إسطنبول") return "مكتب تركيا — إسطنبول";
  if (branch === "غازي عنتاب") return "مكتب تركيا — غازي عنتاب";
  if (branch === "مصر") return "مكتب مصر — القاهرة";
  return `مكتب ${branch}`;
}

/** Two spellings of one man: «عبد الرحمن صالح العلي» and «عبد الرحمن العلي» */
function sameName(a: string, b: string) {
  const words = (s: string) => s.replace(/^الشيخ\s+/, "").split(/\s+/);
  const [x, y] = [words(a), words(b)];
  return x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
}

/**
 * A season before the ones on record, from the rating of the next one he served: a little lower the further
 * back, never under the minimum that let him keep his role (lib/season keepRole.minRating)
 */
function earlier(anchor: number, k: number, seed: string) {
  const rnd = seeded(seed);
  const top = anchor >= 5 ? 5 : 4.9;
  return round1(clamp(anchor - 0.05 * k + (rnd() - 0.5) * 0.3, SEASON.administrators.keepRole.minRating, top));
}

/** The classification score that goes with a rating: one band per tenth, so the order of the two never differs */
function scoreOf(rating: number, seed: string) {
  return round1(clamp(rating * 19.6 + 2 + (seeded(seed)() - 0.5) * 1.8, 40, 99.6));
}

type Served = { roleKey: string; rating: number; group?: number; where?: string };
/** `total`: every season served, those before the roll's first one included */
type Career = { id: string; name: string; branch?: string; category?: number; total: number; seasons: Map<string, Served> };

/** Fills the seasons before the earliest on record, going back, until he has served `total` */
function extend(c: Career, total: number, roleKey: string, group?: number) {
  c.total = Math.max(c.total, total, c.seasons.size);
  const known = [...c.seasons.keys()].sort();
  if (!known.length) return;
  const first = Number(known[0]);
  const anchor = c.seasons.get(known[0])!.rating;
  for (let k = 1; c.seasons.size < total && first - k >= Number(PAST_SEASONS[0]); k++) {
    const s = String(first - k);
    c.seasons.set(s, { roleKey, rating: earlier(anchor, k, `${c.id}:${s}`), group });
  }
}

function careers(): Career[] {
  const out = new Map<string, Career>();
  const roster = new Map(ROSTER.map((r) => [r.id, r]));

  // The demo accounts: exactly the seasons their «السجل الموسمي» tells
  for (const d of DEMO_ADMINS) {
    const c: Career = { id: d.id, name: d.title.split(" — ")[0], branch: PEOPLE[d.id]?.branch, category: Number(PEOPLE[d.id]?.category?.slice(1)) || undefined, total: 0, seasons: new Map() };
    for (const h of seasonHistory(d.id)) {
      if (!h.roleKey || h.rating === null || !ROLES[h.roleKey]) continue;
      c.seasons.set(h.season, { roleKey: h.roleKey, rating: h.rating, group: h.groups.length === 1 ? h.groups[0] : undefined, where: h.group || undefined });
    }
    // «خمسة مواسم»: the roster counts seasons older than the record shows
    const earliest = [...c.seasons.entries()].sort(([a], [b]) => a.localeCompare(b))[0];
    const r = roster.get(d.id);
    if (earliest) extend(c, r?.seasons ?? 0, earliest[1].roleKey, earliest[1].group);
    if (c.seasons.size) out.set(d.id, c);
  }

  // The season's other group heads: their group and tier as this season knows them
  for (const h of HEADS_POOL) {
    if (out.has(h.id) || !h.seasons || !h.rating) continue;
    const c: Career = { id: h.id, name: h.name, branch: h.branch, category: Number(h.category.slice(1)) || 1, total: 0, seasons: new Map([[LATEST, { roleKey: "group-head", rating: h.rating, group: h.group }]]) };
    extend(c, h.seasons, "group-head", h.group);
    out.set(h.id, c);
  }

  // Everyone else in the season's roster, in the role they hold
  for (const r of ROSTER) {
    if (out.has(r.id) || !r.seasons || r.rating === null || !ROLES[r.roleKey]) continue;
    const c: Career = { id: r.id, name: r.name, branch: r.branch, total: 0, seasons: new Map([[LATEST, { roleKey: r.roleKey, rating: r.rating }]]) };
    extend(c, r.seasons, r.roleKey);
    out.set(r.id, c);
  }
  return [...out.values()];
}

/** Ranked by score, then by name, so equal scores keep one order */
function ranked<T extends { score: number; name: string; rank: number }>(xs: T[]) {
  return xs.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ar")).map((x, i) => ({ ...x, rank: i + 1 }));
}

function rollOf(season: string, all: Career[]): SeasonRoll {
  const people: Honouree[] = [];
  // A group carries one head a season: the record's own first, then the others, each to a free name
  const taken = new Set<number>();
  const demo = new Set(DEMO_ADMINS.map((d) => d.id));
  const order = [...all].sort((a, b) => Number(demo.has(b.id)) - Number(demo.has(a.id)));
  for (const c of order) {
    const s = c.seasons.get(season);
    if (!s) continue;
    // Seasons served up to this one: all of them, less those served after it
    const served = c.total - [...c.seasons.keys()].filter((x) => x > season).length;
    const head = s.roleKey === "group-head";
    let group = s.group;
    if (head && group !== undefined) {
      while (taken.has(group)) group += 300;
      taken.add(group);
    }
    // Season 1447's classification ranked this very group under this very head: its score and tier stand
    const graded = head && season === LATEST && group !== undefined ? DEMO_GROUPS.find((g) => g.id === `g-${group}` && sameName(g.head, c.name)) : undefined;
    people.push({
      id: c.id,
      name: c.name,
      female: !!ROLES[s.roleKey].female,
      roleKey: s.roleKey,
      rating: s.rating,
      seasons: served,
      office: officeOf(c.branch),
      where: head && group !== undefined ? groupName(group) : s.where,
      // The entry tier in a first season, one up each season after, as far as he has reached
      tier: head ? (graded?.tier ?? Math.max(1, Math.min(served, c.category ?? 1, 3))) : undefined,
      score: graded?.score ?? scoreOf(s.rating, `${c.id}:${season}:score`),
      rank: 0,
    });
  }

  const heads = ranked(people.filter((p) => p.roleKey === "group-head"));
  const honorTop = SEASON.grading.honorTop;
  const tiers = SEASON.grading.tiers
    .map((t) => {
      const inTier = heads.filter((h) => h.tier === t.key);
      return { tier: t.key, label: tierOf(t.key).label, service: t.service, total: inTier.length, top: inTier.slice(0, honorTop) };
    })
    .reverse();

  // The other awards: the higher rating first, the longer service when two are equal
  const awards = AWARDS.map((a) => {
    const pool = people
      .filter((p) => (a.roles as readonly string[]).includes(p.roleKey))
      .sort((x, y) => y.rating - x.rating || y.seasons - x.seasons || y.score - x.score || x.name.localeCompare(y.name, "ar"))
      .map((p, i) => ({ ...p, rank: i + 1 }));
    return { key: a.key, total: pool.length, top: pool.slice(0, 3) };
  });

  // The approved clusters that were already serving, from the directory (lib/data/clusters); its rating is 1447's
  const clusters = ranked(
    CLUSTERS.filter((c) => c.since <= Number(season)).map((c) => {
      const rating = season === LATEST ? c.rating : earlier(c.rating, Number(LATEST) - Number(season), `${c.slug}:${season}`);
      return { slug: c.slug, name: c.name, governorate: c.governorate, since: c.since, rating, score: scoreOf(rating, `${c.slug}:${season}:score`), rank: 0 };
    }),
  );

  return {
    season,
    heads,
    tiers,
    awards,
    clusters,
    rated: people.length,
    average: people.length ? Math.round((people.reduce((t, p) => t + p.rating, 0) / people.length) * 100) / 100 : 0,
  };
}

/** Every finished season's roll, oldest first */
export function honourRolls(): SeasonRoll[] {
  const all = careers();
  return PAST_SEASONS.map((s) => rollOf(s, all));
}
