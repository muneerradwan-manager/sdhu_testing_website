/**
 * The season's people who are not demo accounts, and what the season's story says of the demo accounts:
 * every name here is invented for the demo. A group head's category and branch, a candidate's role and
 * branch, ages (for the cluster's «شارة العمر»), the seasonal roles the administration granted, and the base
 * roles it set («رئيس تكتل» for whoever leads a cluster every season).
 */
import { staffName } from "@/lib/staff";
import { ageOf, getPerson, personName } from "@/lib/registry";
import type { SeasonalRole } from "./structure";
import STORY_HEADS from "@/testdata/admins/heads-pool.json";
import STORY_ROSTER from "@/testdata/admins/roster.json";
import STORY_PEOPLE from "@/testdata/admins/story-people.json";
import { GEN_HEADS, GEN_PEOPLE, GEN_ROSTER } from "./season-seed";

/** Approved groups of the season whose heads are not on this device, each with the pilgrims who joined it */
export type PoolHead = { id: string; name: string; group: number; seasons: number; rating: number; branch: string; category: string; pilgrims: number; age: number };

export const HEADS_POOL: PoolHead[] = [
  // The story's own groups (testdata/admins/heads-pool.json); the season's generated ones follow (./season-seed)
  ...STORY_HEADS,
  ...GEN_HEADS,
];

/**
 * The administrators who qualified for season 1448 in the roles a cluster head picks from: guides and
 * guides of every grade for the groups' guide seats, assistants for their assistant seats and for the cluster's own
 * assistants, coordinators, and female guides of every grade. A cluster head searches it within his branches and
 * invites one person at a time; that person accepts from his own account.
 */
export type Candidate = {
  id: string;
  name: string;
  /** His role this season (a key of the structure's roles) */
  roleKey: string;
  branch: string;
  area: string;
  /** This season's qualification score (written + oral, by the season's weights) */
  score: number;
  seasons: number;
  rating: number | null;
  skills: string[];
  age: number;
};

/** A candidate's name and age from the civil registry (testdata/people/citizens.json): written there, once */
function fromRegistry(c: Omit<Candidate, "name" | "age">): Candidate {
  const p = getPerson(c.id)!;
  return { ...c, name: personName(c.id), age: ageOf(p) };
}

/** The story's roster (testdata/admins/roster.json): by role — assistants, assistants by count, assistants and technical coordinators, coordinators, then the guides of every grade, men and women */
export const ROSTER: Candidate[] = (STORY_ROSTER as Omit<Candidate, "name" | "age">[]).map(fromRegistry).concat(
  // The season's generated people: the cadre of its other clusters, and those still free in every branch
  GEN_ROSTER,
);

const granted = (role: string, reason: string, label?: string): SeasonalRole => ({ role, reason, label, by: staffName("mazen"), at: Date.UTC(2026, 9, 28, 9) });

type StorySeed = { category?: string; branch: string; extra?: string[]; seasonal?: SeasonalRole; age?: number; primary?: string };

/**
 * What the season's story says of the demo accounts and of the heads pool (testdata/admins/story-people.json): a group
 * head's category, branches, the seasonal role the administration granted (its reason; who granted it and when is
 * `granted`), and — for the pool's heads who lead a cluster every season — the base role it set (`primary`)
 */
const DEMO_PEOPLE: Record<string, StorySeed> = Object.fromEntries(
  Object.entries(STORY_PEOPLE as Record<string, Omit<StorySeed, "seasonal"> & { seasonal?: { role: string; reason: string; label?: string } }>).map(([id, x]) => [
    id,
    x.seasonal ? { ...x, seasonal: granted(x.seasonal.role, x.seasonal.reason, x.seasonal.label) } : (x as StorySeed),
  ]),
);

/** Everyone's seed, by national id (or seed id); `primary`: a base role the administration set, over the one applied for */
export const PEOPLE: Record<string, { category?: string; branch?: string; extra?: string[]; seasonal?: SeasonalRole; age?: number; primary?: string }> = {
  ...Object.fromEntries(ROSTER.map((c) => [c.id, { branch: c.branch, age: c.age }])),
  ...Object.fromEntries(HEADS_POOL.map((h) => [h.id, { category: h.category, branch: h.branch, age: h.age }])),
  // The generated people whole: their seasonal roles and extra branches too
  ...GEN_PEOPLE,
  // The demo accounts, and the pool's heads who lead a cluster every season by base role, as on the administration's platform
  ...DEMO_PEOPLE,
};

/** A person's name by id: a citizen's from the registry (testdata/people/citizens.json), a group head of the season not on this device from HEADS_POOL */
export const nameOf = (id: string) => HEADS_POOL.find((h) => h.id === id)?.name ?? personName(id);
