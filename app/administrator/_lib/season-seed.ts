/**
 * The rest of the season: a dozen more cluster requests over the branches, tiers and states, every one composed
 * by the administration's numbers (./structure-defaults) — its groups of every category with their heads and
 * seats, its cluster assistants, coordinators and female guides, its accountant — then the approved groups no
 * request took yet and the qualified people still free in each branch. The names are invented from common first
 * and family names; none is a real person's, and no cluster carries a real cluster's name.
 *
 * Drawn once by a seeded generator and kept as data (testdata/admins/season-*.json), the way the administration's
 * platform would return them: the heads with their groups, the people a cluster head picks from, what the season
 * says of each, and the requests. The demo's two grade «ج» guides who finished their journey (./admin DEMO_ADMINS)
 * hold the places in تكتل الصفا والمروة that the draw gave to two generated people.
 */
import { withStaffNames } from "@/lib/staff";
import { personName } from "@/lib/registry";
import type { ClusterInvite, ClusterRecord, ClusterStatus, GroupInvite, Seat } from "@/lib/store";
import type { SeasonalRole } from "./structure";
import HEADS from "@/testdata/admins/season-heads.json";
import ROSTER from "@/testdata/admins/season-roster.json";
import PEOPLE_RAW from "@/testdata/admins/season-people.json";
import CLUSTERS_RAW from "@/testdata/admins/season-clusters.json";

const PEOPLE = withStaffNames(PEOPLE_RAW);
const CLUSTERS = withStaffNames(CLUSTERS_RAW);

type Head = { id: string; name: string; group: number; seasons: number; rating: number; branch: string; category: string; pilgrims: number; age: number };
type Person = { id: string; name: string; roleKey: string; branch: string; area: string; score: number; seasons: number; rating: number | null; skills: string[]; age: number };
type Seed = { category?: string; branch: string; extra?: string[]; seasonal?: SeasonalRole; age: number };

/** The approved groups of the season's generated heads, numbered from 70 (the story's own are below) */
export const GEN_HEADS: Head[] = HEADS;
/** The generated people a cluster head picks from: the cadre of the generated clusters, and those still free in every branch */
export const GEN_ROSTER: Person[] = ROSTER;
/** What the season says of each generated person: his branch and age, a head's category, extra branches, a seasonal role */
export const GEN_PEOPLE: Record<string, Seed> = Object.fromEntries(
  Object.entries(PEOPLE as Record<string, Omit<Seed, "seasonal"> & { seasonal?: Omit<SeasonalRole, "at"> & { at: string } }>).map(([id, p]) => [id, p.seasonal ? { ...p, seasonal: { ...p.seasonal, at: Date.parse(p.seasonal.at) } } : (p as Seed)]),
);

/**
 * A cluster request as testdata/admins keeps it: everyone by id (the name comes from where the person is
 * written), one moment for every invitation and the ids still pending, a group by its head (its number, branch,
 * category and pilgrims written only when the heads pool does not hold them), and the groups sorted to each
 * coordinator and female guide by his id. Times are ISO strings.
 */
export type RawCluster = {
  headId: string;
  headGroup?: number;
  cluster: {
    id: string;
    name: string;
    tier: string;
    status: ClusterStatus;
    createdAt: string;
    firstSentAt?: string;
    sentAt?: string;
    review?: { at: string; by: string };
    decision?: { status: "approved" | "rejected"; at: string; by: string; note?: string };
    feePaidAt?: string;
    invitedAt: string;
    pending: string[];
    accountant?: string;
    groups: { head: string; number?: number; branch?: string; category?: string; pilgrims?: number }[];
    seats: Record<string, { kind: Seat["kind"]; free?: boolean; who: string }[]>;
    assistants: string[];
    coordinators: string[];
    femaleGuides: string[];
    sorting: Record<string, number[]>;
    guideSorting: Record<string, number[]>;
  };
};

/** A request of the season as the screens use it: its people named, its invitations answered, its groups with their heads' numbers */
export function seedCluster(raw: RawCluster, nameOf: (id: string) => string, heads: readonly Head[]): { headId: string; headName: string; headGroup?: number; cluster: ClusterRecord } {
  const c = raw.cluster;
  const ms = (s?: string) => (s === undefined ? undefined : Date.parse(s));
  const at = Date.parse(c.invitedAt);
  const invite = (id: string): ClusterInvite => ({ id, name: nameOf(id), at, status: c.pending.includes(id) ? "pending" : "accepted" });
  const group = (g: RawCluster["cluster"]["groups"][number]): GroupInvite => {
    const h = heads.find((x) => x.id === g.head);
    return { ...invite(g.head), number: g.number ?? h!.group, branch: g.branch ?? h!.branch, category: g.category ?? h!.category, pilgrims: g.pilgrims ?? h!.pilgrims };
  };
  const sorting = (map: Record<string, number[]>) => Object.fromEntries(Object.entries(map).flatMap(([id, ns]) => ns.map((n) => [n, id])));
  return {
    headId: raw.headId,
    headName: nameOf(raw.headId),
    headGroup: raw.headGroup,
    cluster: {
      id: c.id,
      name: c.name,
      createdAt: Date.parse(c.createdAt),
      tier: c.tier,
      status: c.status,
      ...(c.firstSentAt && { firstSentAt: ms(c.firstSentAt) }),
      ...(c.sentAt && { sentAt: ms(c.sentAt) }),
      ...(c.review && { review: { ...c.review, at: Date.parse(c.review.at) } }),
      ...(c.decision && { decision: { ...c.decision, at: Date.parse(c.decision.at) } }),
      ...(c.feePaidAt && { feePaidAt: ms(c.feePaidAt) }),
      accountant: c.accountant ? invite(c.accountant) : undefined,
      groups: Object.fromEntries(c.groups.map(group).map((g) => [g.number, g])),
      seats: Object.fromEntries(Object.entries(c.seats).map(([n, seats]) => [n, seats.map((s): Seat => ({ kind: s.kind, ...(s.free && { free: true }), who: invite(s.who) }))])),
      assistants: c.assistants.map(invite),
      coordinators: c.coordinators.map(invite),
      femaleGuides: c.femaleGuides.map(invite),
      sorting: sorting(c.sorting),
      guideSorting: sorting(c.guideSorting),
    },
  };
}

/** A generated person's name as the season writes it; the demo accounts among them from the civil registry */
const NAMES = new Map<string, string>([...GEN_HEADS, ...GEN_ROSTER].map((x) => [x.id, x.name]));
const nameOf = (id: string) => NAMES.get(id) ?? personName(id);

/**
 * In the administration's order: the requests of the season, every branch, every tier, every state. The approved
 * clusters of «التكتلات والمجموعات» (lib/data/clusters: الصفا والمروة، اليقين، الشهباء، العاصي، بوابة الحرمين، سهل
 * حوران) are among them under the same ids, so the directory shows the people these requests hold.
 */
export const GEN_CLUSTERS = (CLUSTERS as unknown as RawCluster[]).map((x) => seedCluster(x, nameOf, GEN_HEADS));
