import { withStaffNames } from "@/lib/staff";
import { getState, type AdminProfile, type ClusterRecord, type GroupInvite, type Seat } from "@/lib/store";
import STORY_RAW from "@/testdata/admins/clusters.json";
import { HEADS_POOL, nameOf } from "./people";
import { GEN_CLUSTERS, seedCluster, type RawCluster } from "./season-seed";
import { categoryOfId, seatsOf, weightOf, type Structure } from "./structure";

const STORY = withStaffNames(STORY_RAW);

export { HEADS_POOL };

/**
 * A cluster is formed by whoever holds a role that leads one this season (the administration grants it):
 * he files the request, picks its tier, invites its groups — each keeps its head and comes with the pilgrims
 * it has — and fills every group's seats by its category under the tier, then the cluster's assistants,
 * coordinators and female guides by the sum of the categories, and the accountant. Everyone
 * answers his own invitation. Once complete he sends it, and the administration reviews it.
 */
export type ClusterGroup = {
  id: string;
  number: number;
  head: string;
  headId: string;
  branch: string;
  category: string;
  categoryName: string;
  /** Its category's units: what it weighs on the coordinator and the female guide it is distributed to */
  units: number;
  /** The pilgrims its category takes under the cluster's tier */
  capacity: number;
  pilgrims: number;
  /** How this group came into the cluster */
  joined: string;
  /** The head's own group */
  own?: boolean;
};

export type SeedCluster = { headId: string; headName: string; headGroup?: number; cluster: ClusterRecord };

/**
 * The clusters the season already has, formed at the office with heads who are not on this device (and تكتل
 * النور, whose head عبد الرحمن العلي signs in with it): تكتل النور، تكتل ابن الوليد، تكتل الياسمين، تكتل البيان،
 * and a dozen more generated over the branches — every one formed, its fee paid, everyone in it in his place.
 */
export const SEED_CLUSTERS: SeedCluster[] = [
  // The story's own (testdata/admins/clusters.json)
  ...(STORY as unknown as RawCluster[]).map((x) => seedCluster(x, nameOf, HEADS_POOL)),
  // The season's other requests, over every branch, tier and state (./season-seed)
  ...GEN_CLUSTERS,
];

/** A cluster's groups whose heads accepted, in the order they were invited */
export function acceptedGroups(c: ClusterRecord | undefined): GroupInvite[] {
  return Object.values(c?.groups ?? {}).filter((g) => g.status === "accepted");
}

/** A group as a cluster's screens show it: its category's pilgrims under the cluster's tier */
export function asGroup(s: Structure, c: ClusterRecord, g: GroupInvite, own: boolean): ClusterGroup {
  return {
    id: `g-${g.number}`,
    number: g.number,
    head: g.name,
    headId: g.id,
    branch: g.branch,
    category: g.category,
    categoryName: categoryOfId(s, g.category)?.name ?? "—",
    units: weightOf(s, g.category),
    capacity: seatsOf(s, c.tier, g.category).pilgrims,
    pilgrims: g.pilgrims,
    joined: own ? "مجموعة رئيس التكتل" : g.byAdministration ? `أضافتها الإدارة — ${g.byAdministration.reason}` : "قبِل رئيسها دعوة التكتل",
    own,
  };
}

/** The cluster an administrator heads this season */
export type ClusterView = {
  id: string;
  name: string;
  headId: string;
  headName: string;
  headGroup?: number;
  /** Always the viewer: only its head manages a cluster */
  isHead: boolean;
};

export function clusterViewOf(p: AdminProfile | undefined, myName: string): ClusterView | null {
  if (p?.cluster) {
    return { id: p.cluster.id, name: p.cluster.name, headId: p.nationalId, headName: myName, headGroup: p.group?.number, isHead: true };
  }
  return null;
}

/** A cluster's groups from its record, the head's group first */
export function groupsFromCluster(s: Structure, c: ClusterRecord, headGroup?: number): ClusterGroup[] {
  return acceptedGroups(c)
    .map((g) => asGroup(s, c, g, g.number === headGroup))
    .sort((a, b) => Number(b.own) - Number(a.own));
}

export function clusterTotals(groups: ClusterGroup[]) {
  return {
    groups: groups.length,
    pilgrims: groups.reduce((n, g) => n + g.pilgrims, 0),
    capacity: groups.reduce((n, g) => n + g.capacity, 0),
  };
}

/** Who sits in a group's seats, among those who accepted: its guides and its assistants, and the coordinator and the female guide distributed on it */
export function teamOf(c: ClusterRecord, number: number) {
  const seats = c.seats[number] ?? [];
  const sat = (k: Seat["kind"]) => seats.filter((x) => x.kind === k && x.who?.status === "accepted").map((x) => x.who!);
  return {
    guides: sat("guide"),
    assistants: sat("assistant"),
    coordinator: c.coordinators.find((x) => x.status === "accepted" && x.id === c.sorting[number]),
    femaleGuide: c.femaleGuides.find((x) => x.status === "accepted" && x.id === c.guideSorting?.[number]),
  };
}

/**
 * The head's record: his own when he is the head, else the head's on this device, else the season's seeded
 * cluster or the one the office formed for a head not on this device, as the administration left it. A group's
 * head finds it by his group's cluster.
 */
export function headRecordOf(p: AdminProfile | undefined, admins: Record<string, AdminProfile> = {}, overrides: Record<string, ClusterRecord> = {}) {
  if (p?.cluster) return { headId: p.nationalId, headGroup: p.group?.number, cluster: p.cluster };
  const ref = p?.accountantOf ?? p?.coordinatorIn ?? p?.servesIn;
  const id = ref?.clusterId ?? p?.group?.clusterId;
  if (!id) return null;
  const head = Object.values(admins).find((a) => a.cluster?.id === id);
  if (head) return { headId: head.nationalId, headGroup: head.group?.number, cluster: head.cluster! };
  const seed = [...SEED_CLUSTERS, ...getState().formation.created].find((x) => x.cluster.id === id);
  return seed ? { headId: seed.headId, headGroup: seed.headGroup, cluster: overrides[seed.cluster.id] ?? seed.cluster } : null;
}

/**
 * Every group of the cluster, for its head: its groups, his own first, marked as his own.
 */
export function clusterGroupsOf(s: Structure, p: AdminProfile | undefined, admins: Record<string, AdminProfile> = {}, overrides: Record<string, ClusterRecord> = {}): ClusterGroup[] {
  if (!p?.cluster) return [];
  const rec = headRecordOf(p, admins, overrides);
  if (!rec) return [];
  const mine = p?.group?.number;
  return acceptedGroups(rec.cluster)
    .map((g) => ({ ...asGroup(s, rec.cluster, g, g.number === rec.headGroup), own: g.number === mine }))
    .sort((a, b) => Number(b.number === rec.headGroup) - Number(a.number === rec.headGroup));
}
