import type { AdminProfile, ClusterInvite, ClusterRecord, GroupInvite, Seat } from "@/lib/store";
import { HEADS_POOL } from "./people";
import { categoryOfId, seatsOf, type Structure } from "./structure";

export { HEADS_POOL };

/**
 * A cluster is formed by whoever holds a role that leads one this season (the administration grants it):
 * he files the request, picks its tier, invites its groups — each keeps its head and comes with the pilgrims
 * it has — and fills every group's seats by its category under the tier, then the cluster's assistants,
 * coordinators and female guides by the sum of the categories, his deputy and the accountant. Everyone
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
  /** The pilgrims its category takes under the cluster's tier */
  capacity: number;
  pilgrims: number;
  /** How this group came into the cluster */
  joined: string;
  /** The head's own group */
  own?: boolean;
};

const at = (d: number, h = 9) => Date.UTC(2026, 10, d, h);
const acc = (id: string, name: string, when = at(14)): ClusterInvite => ({ id, name, at: when, status: "accepted" });

function poolGroup(id: string): GroupInvite {
  const h = HEADS_POOL.find((x) => x.id === id)!;
  return { ...acc(h.id, h.name), number: h.group, branch: h.branch, category: h.category, pilgrims: h.pilgrims };
}

/** The demo administrators' groups in the story (./admin demoGroupNumber): the cluster's head 31, أحمد 27, بسام 5 */
function demoGroup(id: string, name: string, number: number, category: string, pilgrims: number): GroupInvite {
  return { ...acc(id, name), number, branch: "دمشق", category, pilgrims };
}

const guide = (id: string, name: string, free = false): Seat => ({ kind: "guide", free: free || undefined, who: acc(id, name) });
const assistant = (id: string, name: string, free = false): Seat => ({ kind: "assistant", free: free || undefined, who: acc(id, name) });

export type SeedCluster = { headId: string; headName: string; headGroup?: number; cluster: ClusterRecord };

const byNumber = (gs: GroupInvite[]) => Object.fromEntries(gs.map((g) => [g.number, g]));
const sorting = (map: Record<string, number[]>) => Object.fromEntries(Object.entries(map).flatMap(([id, ns]) => ns.map((n) => [n, id])));

/**
 * The requests the season already has, filed by heads who are not on this device (and تكتل النور, whose head
 * عبد الرحمن العلي signs in with it). تكتل النور is approved; تكتل الشهباء was sent and waits for its
 * review; تكتل الياسمين was sent back with notes to fix.
 */
export const SEED_CLUSTERS: SeedCluster[] = [
  {
    headId: "01033300881",
    headName: "عبد الرحمن العلي",
    headGroup: 31,
    cluster: {
      id: "al-nour",
      name: "تكتل النور",
      createdAt: at(12),
      tier: "eco",
      status: "approved",
      firstSentAt: at(16),
      sentAt: at(16),
      review: { at: at(17), by: "مازن الحلبي" },
      decision: { status: "approved", at: at(18, 11), by: "مازن الحلبي" },
      deputy: acc("01033300883", "بسام درويش"),
      accountant: acc("seed-07", "طارق الحوراني"),
      groups: byNumber([
        demoGroup("01033300881", "عبد الرحمن العلي", 31, "c3", 112),
        demoGroup("01033300871", "أحمد سليمان الحمصي", 27, "c2", 44),
        demoGroup("01033300883", "بسام درويش", 5, "c2", 71),
        poolGroup("seed-07"),
        poolGroup("seed-06"),
        poolGroup("seed-05"),
      ]),
      seats: {
        31: [guide("01033300951", "الشيخ معتز البارودي"), assistant("01033300941", "عماد الشامي"), guide("01033300955", "الشيخ مأمون الحلواني", true)],
        27: [guide("01033300873", "الشيخ خالد الرفاعي"), assistant("01033300872", "ياسر عبد الله")],
        5: [guide("01033300957", "الشيخ عمار الكردي"), assistant("01033300944", "مهند السيد")],
        18: [guide("01033300953", "الشيخ وائل الحافظ")],
        33: [guide("01033300958", "الشيخ يوسف المحمد")],
        47: [guide("01033300959", "الشيخ حسن القادري"), assistant("01033300948", "فراس الأحمد")],
      },
      assistants: [acc("01033300947", "عمر الحايك"), acc("01033300975", "عبد الكريم الشلاح")],
      coordinators: [acc("01033300874", "سامر نبيل نجار"), acc("01033300961", "لؤي العظمة")],
      femaleGuides: [acc("01033300981", "هالة الدقر"), acc("01033300985", "نهى الطباع")],
      sorting: sorting({ "01033300874": [31, 27, 5], "01033300961": [18, 33, 47] }),
    },
  },
  {
    headId: "seed-04",
    headName: "حسام الساعاتي",
    headGroup: 52,
    cluster: {
      id: "al-shahba",
      name: "تكتل الشهباء",
      createdAt: at(12),
      tier: "eco-plus",
      status: "pending",
      firstSentAt: at(17),
      sentAt: at(17),
      deputy: acc("seed-03", "رضوان الزعبي"),
      accountant: acc("seed-02", "فراس البيطار"),
      groups: byNumber([poolGroup("seed-04"), poolGroup("seed-03"), poolGroup("seed-02"), poolGroup("seed-10")]),
      seats: {
        52: [guide("01033300954", "الشيخ رياض الأتاسي"), assistant("01033300945", "تمّام الخطيب")],
        41: [guide("01033300956", "الشيخ بلال العبسي"), assistant("01033300943", "زياد العطار")],
        9: [guide("01033300952", "الشيخ أيمن قصاب باشي")],
        8: [guide("01033300960", "الشيخ زهير الملا")],
      },
      assistants: [acc("01033300946", "أنس الدقاق")],
      coordinators: [acc("01033300972", "حسان المارديني")],
      femaleGuides: [acc("01033300982", "سمر الخطيب")],
      sorting: sorting({ "01033300972": [52, 41, 9, 8] }),
    },
  },
  {
    headId: "seed-01",
    headName: "عبد الرحمن القباني",
    headGroup: 61,
    cluster: {
      id: "al-yasmin",
      name: "تكتل الياسمين",
      createdAt: at(13),
      tier: "five",
      status: "rejected",
      firstSentAt: at(15),
      sentAt: at(15),
      review: { at: at(16), by: "مازن الحلبي" },
      decision: { status: "rejected", at: at(16, 12), by: "مازن الحلبي", note: "تسمية التكتلات (النظام الإداري): «تكتل الياسمين» يشبه تسمية تكتل قائم، ويُشترط ألا يتشابه الاسم كلياً أو جزئياً مع أسماء التكتلات الأخرى. غيّر الاسم ثم أعد الإرسال." },
      deputy: acc("seed-08", "ماهر الجابي"),
      accountant: acc("seed-09", "غسان النحاس"),
      groups: byNumber([poolGroup("seed-01"), poolGroup("seed-08"), poolGroup("seed-09")]),
      seats: { 61: [], 55: [], 44: [] },
      assistants: [],
      coordinators: [],
      femaleGuides: [],
      sorting: {},
    },
  },
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
    capacity: seatsOf(s, c.tier, g.category).pilgrims,
    pilgrims: g.pilgrims,
    joined: own ? "مجموعة رئيس التكتل" : g.byAdministration ? `أضافتها الإدارة — ${g.byAdministration.reason}` : "قبِل رئيسها دعوة التكتل",
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

/** Who sits in a group's seats, among those who accepted: its guides and its assistants, and its coordinator */
export function teamOf(c: ClusterRecord, number: number) {
  const seats = c.seats[number] ?? [];
  const sat = (k: Seat["kind"]) => seats.filter((x) => x.kind === k && x.who?.status === "accepted").map((x) => x.who!);
  return { guides: sat("guide"), assistants: sat("assistant"), coordinator: c.coordinators.find((x) => x.status === "accepted" && x.id === c.sorting[number]) };
}

/**
 * The head's record: his own when he is the head, else the head's on this device, else the season's seeded
 * request as the administration left it
 */
export function headRecordOf(p: AdminProfile | undefined, admins: Record<string, AdminProfile> = {}, overrides: Record<string, ClusterRecord> = {}) {
  if (p?.cluster) return { headId: p.nationalId, headGroup: p.group?.number, cluster: p.cluster };
  const ref = p?.deputyOf ?? p?.accountantOf ?? p?.coordinatorIn ?? p?.servesIn;
  if (!ref) return null;
  const live = admins[ref.headId]?.cluster;
  if (live?.id === ref.clusterId) return { headId: ref.headId, headGroup: admins[ref.headId]?.group?.number, cluster: live };
  const seed = SEED_CLUSTERS.find((x) => x.cluster.id === ref.clusterId);
  return seed ? { headId: seed.headId, headGroup: seed.headGroup, cluster: overrides[seed.cluster.id] ?? seed.cluster } : null;
}

/**
 * Every group of the cluster, for the head or for the deputy: the groups whose heads accepted its
 * invitation, the head's own first. Whichever of them belongs to the viewer is marked as his own.
 */
export function clusterGroupsOf(s: Structure, p: AdminProfile | undefined, admins: Record<string, AdminProfile> = {}, overrides: Record<string, ClusterRecord> = {}): ClusterGroup[] {
  if (!p?.cluster && !p?.deputyOf) return [];
  const rec = headRecordOf(p, admins, overrides);
  if (!rec) return [];
  const mine = p?.group?.number;
  return acceptedGroups(rec.cluster)
    .map((g) => ({ ...asGroup(s, rec.cluster, g, g.number === rec.headGroup), own: g.number === mine }))
    .sort((a, b) => Number(b.number === rec.headGroup) - Number(a.number === rec.headGroup));
}
