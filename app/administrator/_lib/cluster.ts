import type { AdminProfile } from "@/lib/store";
import { DEMO_ADMINS, adminName, demoGroupNumber } from "./admin";


/**
 * A cluster head is not the head of one group. He is elected from among the group heads, and what he
 * takes over is the management of ALL the cluster's groups: his own group and every group whose head
 * asked to join and signed the contract with him. Each of those groups keeps its own head and team;
 * the cluster head runs the cluster over them.
 */
export type ClusterGroup = {
  id: string;
  number: number;
  head: string;
  office: string;
  capacity: number;
  pilgrims: number;
  /** How this group came into the cluster */
  joined: string;
  /** The head's own group, the one he led before the election */
  own?: boolean;
};

/** Group heads of other groups this season — they stand in the election and ask to join clusters */
export const HEADS_POOL: { id: string; name: string; group: number; seasons: number; rating: number; votes: number; candidate: boolean; office: string; capacity: number; pilgrims: number }[] = [
  { id: "seed-01", name: "عبد الرحمن القباني", group: 61, seasons: 4, rating: 4.7, votes: 9, candidate: true, office: "مكتب ريف دمشق", capacity: 50, pilgrims: 47 },
  { id: "seed-02", name: "فراس البيطار", group: 9, seasons: 3, rating: 4.2, votes: 6, candidate: true, office: "مكتب دمشق", capacity: 50, pilgrims: 44 },
  { id: "seed-03", name: "رضوان الزعبي", group: 41, seasons: 3, rating: 4.4, votes: 7, candidate: true, office: "مكتب درعا", capacity: 45, pilgrims: 43 },
  { id: "seed-04", name: "حسام الساعاتي", group: 52, seasons: 5, rating: 4.6, votes: 8, candidate: true, office: "مكتب حمص", capacity: 50, pilgrims: 49 },
  { id: "seed-05", name: "صالح العلي", group: 47, seasons: 3, rating: 4.1, votes: 4, candidate: true, office: "مكتب حماة", capacity: 50, pilgrims: 45 },
  { id: "seed-06", name: "نزار الشيخ", group: 33, seasons: 3, rating: 4.3, votes: 5, candidate: true, office: "مكتب اللاذقية", capacity: 45, pilgrims: 40 },
  { id: "seed-07", name: "طارق الحوراني", group: 18, seasons: 4, rating: 4.5, votes: 7, candidate: true, office: "مكتب دمشق", capacity: 50, pilgrims: 48 },
  { id: "seed-08", name: "ماهر الجابي", group: 55, seasons: 2, rating: 4.0, votes: 0, candidate: false, office: "مكتب حلب", capacity: 45, pilgrims: 38 },
  { id: "seed-09", name: "غسان النحاس", group: 44, seasons: 1, rating: 3.9, votes: 0, candidate: false, office: "مكتب دير الزور", capacity: 50, pilgrims: 36 },
];

/** Groups already inside تكتل النور in the demo, besides the head's own group and whatever he accepts live */
const SEEDED_MEMBERS: Record<string, string[]> = {
  "al-nour": ["seed-07", "seed-06", "seed-05"],
};

/** Groups the demo cluster took in by contract, for the deputy who does not hold the head record */
const SEEDED_ACCEPTED: Record<string, string[]> = {
  "al-nour": ["01033300871"],
};

function fromPool(id: string, joined: string): ClusterGroup | null {
  const s = HEADS_POOL.find((x) => x.id === id);
  return s ? { id, number: s.group, head: s.name, office: s.office, capacity: s.capacity, pilgrims: s.pilgrims, joined } : null;
}

function fromAdmin(id: string, joined: string): ClusterGroup | null {
  if (!DEMO_ADMINS.some((d) => d.id === id)) return null;
  const number = demoGroupNumber(id);
  return { id, number, head: adminName(id), office: "مكتب دمشق", capacity: 50, pilgrims: number === 27 ? 44 : 42, joined };
}

/** The cluster an administrator works at this season, whether he heads it or is its deputy */
export type ClusterView = {
  id: string;
  name: string;
  headName: string;
  headGroup?: number;
  deputyName?: string;
  capacityGroups: number;
  /** true when the viewer is the head; false when he is the deputy */
  isHead: boolean;
};

export function clusterViewOf(p: AdminProfile | undefined, myName: string): ClusterView | null {
  if (p?.cluster) {
    return { id: p.cluster.id, name: p.cluster.name, headName: myName, headGroup: p.group?.number, deputyName: p.cluster.deputyName, capacityGroups: p.cluster.capacityGroups, isHead: true };
  }
  if (p?.deputyOf) {
    const d = p.deputyOf;
    return { id: d.clusterId, name: d.clusterName, headName: d.headName, headGroup: d.headGroup, deputyName: myName, capacityGroups: d.capacityGroups, isHead: false };
  }
  return null;
}

/**
 * Every group of the cluster, for the head or for the deputy: the head's group, the groups that asked
 * to join and signed, and the ones the demo cluster already had. Whichever of them belongs to the
 * viewer is marked as his own. A cluster created live in the demo holds only what it really took.
 */
export function clusterGroupsOf(p: AdminProfile | undefined, myName: string): ClusterGroup[] {
  const view = clusterViewOf(p, myName);
  if (!view) return [];
  const mine = p?.group?.number;
  const headGroup: ClusterGroup[] = view.headGroup
    ? [
        {
          id: "head-group",
          number: view.headGroup,
          head: view.headName,
          office: "مكتب دمشق",
          capacity: p?.cluster && p.group ? p.group.capacity : 50,
          pilgrims: 45,
          joined: "مجموعة رئيس التكتل قبل انتخابه",
          own: view.isHead,
        },
      ]
    : [];
  const decisions = p?.cluster?.decisions ?? {};
  const accepted = Object.entries(decisions)
    .filter(([, d]) => d.status === "accepted")
    .map(([id]) => fromAdmin(id, "انضمت بطلب وعقد موقّع") ?? fromPool(id, "انضمت بطلب وعقد موقّع"))
    .filter(Boolean) as ClusterGroup[];
  // The deputy does not hold the head's decision record, but his own group is in the cluster
  const deputyOwn: ClusterGroup[] =
    !view.isHead && mine
      ? [{ id: "own", number: mine, head: myName, office: "مكتب دمشق", capacity: p?.group?.capacity ?? 50, pilgrims: 42, joined: "انضمت بطلب وعقد موقّع", own: true }]
      : [];
  const alsoAccepted = (view.isHead ? [] : (SEEDED_ACCEPTED[view.id] ?? []))
    .map((id) => fromAdmin(id, "انضمت بطلب وعقد موقّع"))
    .filter(Boolean) as ClusterGroup[];
  const known = [...headGroup, ...accepted, ...alsoAccepted, ...deputyOwn];
  const seeded = (SEEDED_MEMBERS[view.id] ?? [])
    .map((id) => fromPool(id, "انضمت بطلب وعقد موقّع"))
    .filter(Boolean)
    .filter((g) => !known.some((k) => k!.number === g!.number)) as ClusterGroup[];
  return [...known, ...seeded].filter((g, i, all) => all.findIndex((x) => x.number === g.number) === i);
}

export function clusterTotals(groups: ClusterGroup[]) {
  return {
    groups: groups.length,
    pilgrims: groups.reduce((n, g) => n + g.pilgrims, 0),
    capacity: groups.reduce((n, g) => n + g.capacity, 0),
  };
}
