import type { AdminProfile, ClusterInvite, GroupInvite, TeamPool } from "@/lib/store";

/**
 * A cluster head is not elected. Any group head who meets the season's conditions files a request to form
 * a cluster, and is its head from then on: he invites the groups he wants — each comes with the pilgrims it
 * already has, and keeps its own head — his deputy, and the cluster's people (religious guides, assistants,
 * technical coordinators), then assigns those people to the groups himself. The request is preliminary
 * until the administration's deadline: a complete cluster is approved, an incomplete one excluded and its
 * groups distributed among the approved.
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
  /** The head's own group */
  own?: boolean;
};

/** The season's other group heads — their groups approved, each with the pilgrims who joined it */
export const HEADS_POOL: { id: string; name: string; group: number; seasons: number; rating: number; office: string; capacity: number; pilgrims: number }[] = [
  { id: "seed-01", name: "عبد الرحمن القباني", group: 61, seasons: 4, rating: 4.7, office: "مكتب ريف دمشق", capacity: 50, pilgrims: 47 },
  { id: "seed-02", name: "فراس البيطار", group: 9, seasons: 3, rating: 4.2, office: "مكتب دمشق", capacity: 50, pilgrims: 44 },
  { id: "seed-03", name: "رضوان الزعبي", group: 41, seasons: 3, rating: 4.4, office: "مكتب درعا", capacity: 45, pilgrims: 43 },
  { id: "seed-04", name: "حسام الساعاتي", group: 52, seasons: 5, rating: 4.6, office: "مكتب حمص", capacity: 50, pilgrims: 49 },
  { id: "seed-05", name: "صالح العلي", group: 47, seasons: 3, rating: 4.1, office: "مكتب حماة", capacity: 50, pilgrims: 45 },
  { id: "seed-06", name: "نزار الشيخ", group: 33, seasons: 3, rating: 4.3, office: "مكتب اللاذقية", capacity: 45, pilgrims: 40 },
  { id: "seed-07", name: "طارق الحوراني", group: 18, seasons: 4, rating: 4.5, office: "مكتب دمشق", capacity: 50, pilgrims: 48 },
  { id: "seed-08", name: "ماهر الجابي", group: 55, seasons: 2, rating: 4.0, office: "مكتب حلب", capacity: 45, pilgrims: 38 },
  { id: "seed-09", name: "غسان النحاس", group: 44, seasons: 1, rating: 3.9, office: "مكتب دير الزور", capacity: 50, pilgrims: 36 },
  { id: "seed-10", name: "لؤي حمدان", group: 8, seasons: 2, rating: 4.2, office: "مكتب دمشق", capacity: 45, pilgrims: 41 },
  { id: "seed-11", name: "يحيى المصري", group: 12, seasons: 2, rating: 4.4, office: "مكتب دمشق", capacity: 50, pilgrims: 39 },
  { id: "seed-12", name: "عمر الدباغ", group: 14, seasons: 1, rating: 4.1, office: "مكتب ريف دمشق", capacity: 50, pilgrims: 33 },
  { id: "seed-13", name: "كمال الصباغ", group: 22, seasons: 3, rating: 4.6, office: "مكتب دمشق", capacity: 75, pilgrims: 61 },
  { id: "seed-14", name: "هشام العطار", group: 36, seasons: 0, rating: 0, office: "مكتب حمص", capacity: 50, pilgrims: 28 },
  { id: "seed-15", name: "أيمن السمان", group: 58, seasons: 2, rating: 3.8, office: "مكتب حماة", capacity: 40, pilgrims: 30 },
];

const acc = (id: string, name: string): ClusterInvite => ({ id, name, at: 0, status: "accepted" });

function poolGroup(id: string): GroupInvite {
  const h = HEADS_POOL.find((x) => x.id === id)!;
  return { ...acc(h.id, h.name), number: h.group, office: h.office, capacity: h.capacity, pilgrims: h.pilgrims };
}

/** The demo administrators' groups in the story (./admin demoGroupNumber): the cluster's head 31, أحمد 27, بسام 5 */
function demoGroup(id: string, name: string, number: number, pilgrims: number): GroupInvite {
  return { ...acc(id, name), number, office: "مكتب دمشق", capacity: 50, pilgrims };
}

export type SeedCluster = { headId: string; headName: string; headGroup: number; cluster: NonNullable<AdminProfile["cluster"]> };

const byNumber = (gs: GroupInvite[]) => Object.fromEntries(gs.map((g) => [g.number, g]));
const posts = (map: Record<string, number[]>) => Object.fromEntries(Object.entries(map).flatMap(([id, ns]) => ns.map((n) => [n, id])));

/**
 * The requests the season already has, filed by group heads who are not on this device. تكتل النور is
 * the demo's own (its head عبد الرحمن العلي signs in with it); تكتل الشهباء is complete; تكتل الياسمين has
 * too few groups and no deputy, so the deadline excludes it and its groups are distributed.
 */
export const SEED_CLUSTERS: SeedCluster[] = [
  {
    headId: "01033300881",
    headName: "عبد الرحمن العلي",
    headGroup: 31,
    cluster: {
      id: "al-nour",
      name: "تكتل النور",
      createdAt: 0,
      deputy: acc("01033300883", "بسام درويش"),
      groups: byNumber([demoGroup("01033300881", "عبد الرحمن العلي", 31, 45), demoGroup("01033300871", "أحمد سليمان الحمصي", 27, 44), demoGroup("01033300883", "بسام درويش", 5, 42), poolGroup("seed-07"), poolGroup("seed-06"), poolGroup("seed-05")]),
      team: {
        guide: [acc("01033300873", "الشيخ خالد الرفاعي"), acc("01033300951", "الشيخ معتز البارودي")],
        tech: [acc("01033300874", "سامر نبيل نجار"), acc("01033300961", "لؤي العظمة")],
        assistant: [acc("01033300872", "ياسر عبد الله"), acc("01033300941", "عماد الشامي")],
      },
      posts: {
        guide: posts({ "01033300873": [31, 27, 5], "01033300951": [18, 33, 47] }),
        tech: posts({ "01033300874": [31, 27, 5], "01033300961": [18, 33, 47] }),
        assistant: posts({ "01033300872": [31, 27, 5], "01033300941": [18, 33, 47] }),
      },
    },
  },
  {
    headId: "seed-04",
    headName: "حسام الساعاتي",
    headGroup: 52,
    cluster: {
      id: "al-shahba",
      name: "تكتل الشهباء",
      createdAt: 0,
      deputy: acc("seed-03", "رضوان الزعبي"),
      groups: byNumber([poolGroup("seed-04"), poolGroup("seed-03"), poolGroup("seed-02"), poolGroup("seed-10")]),
      team: {
        guide: [acc("01033300952", "الشيخ أيمن قصاب باشي")],
        tech: [acc("01033300962", "كرم الدباس")],
        assistant: [acc("01033300945", "تمّام الخطيب"), acc("01033300946", "أنس الدقاق")],
      },
      posts: {
        guide: posts({ "01033300952": [52, 41, 9, 8] }),
        tech: posts({ "01033300962": [52, 41, 9, 8] }),
        assistant: posts({ "01033300945": [52, 41], "01033300946": [9, 8] }),
      },
    },
  },
  {
    headId: "seed-01",
    headName: "عبد الرحمن القباني",
    headGroup: 61,
    cluster: {
      id: "al-yasmin",
      name: "تكتل الياسمين",
      createdAt: 0,
      groups: byNumber([poolGroup("seed-01"), poolGroup("seed-08"), poolGroup("seed-09")]),
      team: { guide: [acc("01033300954", "الشيخ رياض الأتاسي")], tech: [acc("01033300964", "سيف الدين حلاق")], assistant: [] },
      posts: { guide: posts({ "01033300954": [61] }), tech: posts({ "01033300964": [61, 55] }), assistant: {} },
    },
  },
];

/** A cluster's groups whose heads accepted, in the order they were invited */
export function acceptedGroups(c: NonNullable<AdminProfile["cluster"]> | undefined): GroupInvite[] {
  return Object.values(c?.groups ?? {}).filter((g) => g.status === "accepted");
}

function asGroup(g: GroupInvite, own: boolean): ClusterGroup {
  return {
    id: `g-${g.number}`,
    number: g.number,
    head: g.name,
    office: g.office,
    capacity: g.capacity,
    pilgrims: g.pilgrims,
    joined: own ? "مجموعة رئيس التكتل" : g.distributed ? "وزّعتها الإدارة على التكتل" : "قبِل رئيسها دعوة التكتل",
    own,
  };
}

/** The cluster an administrator works at this season, whether he heads it or is its deputy */
export type ClusterView = {
  id: string;
  name: string;
  headId: string;
  headName: string;
  headGroup?: number;
  deputyName?: string;
  /** true when the viewer is the head; false when he is the deputy */
  isHead: boolean;
};

/** The head's record: his own when he is the head, else the head's on this device, else the season's seeded request */
export function headRecordOf(p: AdminProfile | undefined, admins: Record<string, AdminProfile> = {}) {
  if (p?.cluster) return { headId: p.nationalId, cluster: p.cluster };
  const d = p?.deputyOf;
  if (!d) return null;
  const live = admins[d.headId]?.cluster;
  if (live?.id === d.clusterId) return { headId: d.headId, cluster: live };
  const seed = SEED_CLUSTERS.find((s) => s.cluster.id === d.clusterId);
  return seed ? { headId: seed.headId, cluster: seed.cluster } : null;
}

export function clusterViewOf(p: AdminProfile | undefined, myName: string): ClusterView | null {
  if (p?.cluster) {
    return { id: p.cluster.id, name: p.cluster.name, headId: p.nationalId, headName: myName, headGroup: p.group?.number, deputyName: p.cluster.deputy?.status === "accepted" ? p.cluster.deputy.name : undefined, isHead: true };
  }
  if (p?.deputyOf) {
    const d = p.deputyOf;
    return { id: d.clusterId, name: d.clusterName, headId: d.headId, headName: d.headName, headGroup: d.headGroup, deputyName: myName, isHead: false };
  }
  return null;
}

/**
 * Every group of the cluster, for the head or for the deputy: the groups whose heads accepted its
 * invitation, the head's own first. Whichever of them belongs to the viewer is marked as his own.
 */
export function clusterGroupsOf(p: AdminProfile | undefined, _myName: string, admins: Record<string, AdminProfile> = {}): ClusterGroup[] {
  const rec = headRecordOf(p, admins);
  if (!rec) return [];
  const mine = p?.group?.number;
  const headGroup = rec.headId === p?.nationalId ? mine : admins[rec.headId]?.group?.number ?? SEED_CLUSTERS.find((s) => s.headId === rec.headId)?.headGroup;
  return acceptedGroups(rec.cluster)
    .map((g) => ({ ...asGroup(g, g.number === headGroup), own: g.number === mine }))
    .sort((a, b) => Number(b.number === headGroup) - Number(a.number === headGroup));
}

/** A cluster's groups from its record alone, the head's group first */
export function groupsFromCluster(c: NonNullable<AdminProfile["cluster"]>, headGroup?: number): ClusterGroup[] {
  return acceptedGroups(c)
    .map((g) => asGroup(g, g.number === headGroup))
    .sort((a, b) => Number(b.own) - Number(a.own));
}

export function clusterTotals(groups: ClusterGroup[]) {
  return {
    groups: groups.length,
    pilgrims: groups.reduce((n, g) => n + g.pilgrims, 0),
    capacity: groups.reduce((n, g) => n + g.capacity, 0),
  };
}

/** Who serves a group, role by role, among the people who accepted */
export function postsOf(c: NonNullable<AdminProfile["cluster"]>, number: number): Record<TeamPool, ClusterInvite | undefined> {
  const find = (pool: TeamPool) => c.team[pool].find((x) => x.status === "accepted" && x.id === c.posts[pool][number]);
  return { guide: find("guide"), tech: find("tech"), assistant: find("assistant") };
}
