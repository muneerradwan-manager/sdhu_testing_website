"use client";

import { useMemo } from "react";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type AdminProfile, type ClusterInvite, type GroupInvite, type State, type TeamPool } from "@/lib/store";
import { adminName, logAdmin } from "./admin";
import { HEADS_POOL, SEED_CLUSTERS, acceptedGroups } from "./cluster";
import { coordinatorTierFor, useCoordinatorTiers } from "./coordinators";
import { assignedRealFamilies } from "./group";
import type { Candidate } from "./roster";

export type Cluster = NonNullable<AdminProfile["cluster"]>;

/**
 * The cluster's people, chosen for the cluster and not group by group: then its head assigns each of them
 * to the groups he sees fit — a guide to this group, a coordinator to how many groups he can run, an
 * assistant likewise. One person may serve several groups.
 */
export const POOLS: Record<TeamPool, { label: string; one: string; roster: Candidate["roleKey"]; note: string; title: string }> = {
  guide: { label: "الموجّهون الدينيون", one: "موجّه ديني", title: "الموجّه الديني", roster: "guide-m", note: "الدروس والمناسك والأسئلة الشرعية" },
  tech: { label: "المنسقون التقنيون", one: "منسق تقني", title: "المنسق التقني", roster: "tech", note: "يلحق الحجاج بمجموعاته ويأخذ ملفاتهم الصحية" },
  assistant: { label: "المعاونون", one: "معاون", title: "معاون رئيس المجموعة", roster: "group-deputy", note: "الحضور والتجمّع وتوزيع الوجبات الخاصة" },
};
export const POOL_ORDER: TeamPool[] = ["guide", "tech", "assistant"];

export const DEPUTY_TITLE = "نائب رئيس التكتل";

/** A new request: the head's own group is in it from the start */
export function newCluster(id: string, name: string, at: number, own: GroupInvite): Cluster {
  return { id, name, createdAt: at, groups: { [own.number]: own }, team: { guide: [], tech: [], assistant: [] }, posts: { guide: {}, tech: {}, assistant: {} } };
}

/**
 * What the deadline checks: enough groups, the deputy, and every group with a guide, a coordinator and
 * an assistant from those who accepted. How many coordinators the category allows is held at invitation.
 */
export function completenessOf(c: Cluster, minGroups: number) {
  const groups = acceptedGroups(c);
  const served = (pool: TeamPool) => groups.filter((g) => c.team[pool].some((x) => x.status === "accepted" && x.id === c.posts[pool][g.number]));
  const checks = [
    { key: "groups", label: `${groups.length} مجموعات، والحد الأدنى ${minGroups}`, ok: groups.length >= minGroups },
    { key: "deputy", label: c.deputy?.status === "accepted" ? `${DEPUTY_TITLE}: ${c.deputy.name}` : `${DEPUTY_TITLE} لم يقبل بعد`, ok: c.deputy?.status === "accepted" },
    ...POOL_ORDER.map((pool) => {
      const n = served(pool).length;
      return { key: pool, label: `${POOLS[pool].title}: ${n} من ${groups.length} مجموعات أُسند إليها`, ok: groups.length > 0 && n === groups.length };
    }),
  ];
  return { checks, complete: checks.every((x) => x.ok) };
}

export type Decision = State["formation"]["decisions"][string];

/** A request as the season sees it: on this device or seeded, with its checks, its decision and its groups after the distribution */
export type ClusterRequest = {
  headId: string;
  headName: string;
  headGroup?: number;
  cluster: Cluster;
  /** Filed by a group head who is not on this device */
  seed: boolean;
  checks: { key: string; label: string; ok: boolean }[];
  complete: boolean;
  decision?: Decision;
  /** Its groups now: its own accepted ones, without those the distribution moved out, with those it moved in */
  groups: GroupInvite[];
  allowed: number;
};

export function useClusterRequests(): ClusterRequest[] {
  const admins = useStore((s) => s.admins);
  const formation = useStore((s) => s.formation);
  const minGroups = useSeason().administrators.clusterMinGroups;
  const tiers = useCoordinatorTiers();
  return useMemo(() => {
    const live = Object.values(admins)
      .filter((a) => a.cluster)
      .map((a) => ({ headId: a.nationalId, headName: adminName(a.nationalId), headGroup: a.group?.number, cluster: a.cluster!, seed: false }));
    const seeds = SEED_CLUSTERS.filter((s) => !live.some((l) => l.cluster.id === s.cluster.id)).map((s) => ({ ...s, seed: true }));
    const all = [...live, ...seeds];
    const everyGroup = new Map(all.flatMap((r) => acceptedGroups(r.cluster).map((g) => [g.number, g] as const)));
    for (const h of HEADS_POOL) if (!everyGroup.has(h.group)) everyGroup.set(h.group, { id: h.id, name: h.name, at: 0, status: "accepted", number: h.group, office: h.office, capacity: h.capacity, pilgrims: h.pilgrims });
    return all.map((r) => {
      const own = acceptedGroups(r.cluster).filter((g) => formation.moves[g.number] === undefined || formation.moves[g.number] === r.cluster.id);
      const moved = Object.entries(formation.moves)
        .filter(([n, to]) => to === r.cluster.id && !own.some((g) => g.number === Number(n)))
        .flatMap(([n]) => {
          const g = everyGroup.get(Number(n));
          return g ? [{ ...g, distributed: true }] : [];
        });
      const groups = [...own, ...moved];
      const allowed = coordinatorTierFor(r.headId, Math.max(groups.length, 1), tiers).tier?.coordinators ?? 0;
      const { checks, complete } = completenessOf(r.cluster, minGroups);
      return { ...r, checks, complete, decision: formation.decisions[r.cluster.id] ?? r.cluster.decision, groups, allowed };
    });
  }, [admins, formation, minGroups, tiers]);
}

export function useClusterRequest(id: string | undefined) {
  const all = useClusterRequests();
  return all.find((r) => r.cluster.id === id);
}

/** A group a head may invite, with where it already stands */
export type PoolGroup = { headId: string; headName: string; number: number; office: string; capacity: number; pilgrims: number; onDevice: boolean; takenBy?: string };

/**
 * The season's approved groups other than the inviter's: those on this device, then the season's other
 * group heads. A group that accepted another cluster's invitation shows where it went.
 */
export function useGroupPool(selfId: string): PoolGroup[] {
  const admins = useStore((s) => s.admins);
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const requests = useClusterRequests();
  return useMemo(() => {
    const takenBy = (n: number, headId: string) => requests.find((r) => r.headId !== selfId && acceptedGroups(r.cluster).some((g) => g.number === n && g.id === headId))?.cluster.name;
    const live = Object.values(admins)
      .filter((a) => a.nationalId !== selfId && a.group?.approvedAt && a.positions[0] === "group-head")
      .map((a) => {
        const n = a.group!.number;
        const pilgrims = assignedRealFamilies(n, post, applications).reduce((k, f) => k + f.members.length, 0);
        return { headId: a.nationalId, headName: adminName(a.nationalId), number: n, office: "مكتب دمشق", capacity: a.group!.capacity, pilgrims, onDevice: true, takenBy: takenBy(n, a.nationalId) };
      });
    const seeds = HEADS_POOL.filter((h) => !live.some((l) => l.number === h.group)).map((h) => ({ headId: h.id, headName: h.name, number: h.group, office: h.office, capacity: h.capacity, pilgrims: h.pilgrims, onDevice: false, takenBy: takenBy(h.group, h.id) }));
    return [...live, ...seeds].sort((a, b) => Number(!!a.takenBy) - Number(!!b.takenBy) || a.number - b.number);
  }, [admins, post, applications, requests, selfId]);
}

export type InviteKind = "group" | "deputy" | TeamPool;
export type Inbound = { req: ClusterRequest; kind: InviteKind; invite: ClusterInvite; number?: number };

/** Every invitation this administrator received: to serve in a cluster, or to bring his group into one */
export function invitationsFor(id: string, requests: ClusterRequest[]): Inbound[] {
  return requests.flatMap((req) => {
    const c = req.cluster;
    if (req.headId === id) return [];
    const out: Inbound[] = [];
    for (const g of Object.values(c.groups)) if (g.id === id) out.push({ req, kind: "group", invite: g, number: g.number });
    if (c.deputy?.id === id) out.push({ req, kind: "deputy", invite: c.deputy });
    for (const pool of POOL_ORDER) for (const x of c.team[pool]) if (x.id === id) out.push({ req, kind: pool, invite: x });
    return out;
  });
}

export function useMyInvitations(id: string) {
  const requests = useClusterRequests();
  return useMemo(() => invitationsFor(id, requests), [id, requests]);
}

/** The groups a person serves in, role by role */
export function groupsOfPerson(c: Cluster, pool: TeamPool, id: string) {
  return acceptedGroups(c)
    .map((g) => g.number)
    .filter((n) => c.posts[pool][n] === id);
}

/**
 * Writes the head's cluster, and tells everyone on this device where he now works: the deputy his cluster
 * role, every coordinator, guide and assistant the groups assigned to him. Whoever left loses his post.
 */
export function saveCluster(head: { id: string; name: string; group?: number }, next: Cluster, admins: Record<string, AdminProfile>) {
  actions.upsertAdmin(head.id, { cluster: next });
  const base = { clusterId: next.id, clusterName: next.name, headId: head.id, headName: head.name };
  for (const [id, a] of Object.entries(admins)) {
    if (id === head.id) continue;
    if (a.deputyOf?.clusterId === next.id || next.deputy?.id === id) {
      const stays = next.deputy?.id === id && next.deputy.status === "accepted";
      actions.upsertAdmin(id, { deputyOf: stays ? { ...base, headGroup: head.group ?? 0 } : undefined });
    }
    for (const pool of POOL_ORDER) {
      const mine = next.team[pool].find((x) => x.id === id);
      const was = pool === "tech" ? a.coordinatorIn?.clusterId === next.id : a.servesIn?.clusterId === next.id && a.servesIn.role === pool;
      if (!mine && !was) continue;
      const post = mine?.status === "accepted" ? { ...base, groups: groupsOfPerson(next, pool, id) } : undefined;
      actions.upsertAdmin(id, pool === "tech" ? { coordinatorIn: post } : { servesIn: post && { ...post, role: pool } });
    }
    // A group head who accepted brings his group into the cluster
    const g = Object.values(next.groups).find((x) => x.id === id);
    if (g && a.group?.number === g.number) {
      const inIt = g.status === "accepted";
      if (inIt ? a.group.clusterId !== next.id : a.group.clusterId === next.id) actions.upsertAdmin(id, { group: { ...a.group, clusterId: inIt ? next.id : undefined } });
    }
  }
}

/**
 * The invited person answers. Accepting one cluster declines whatever else is pending for the same thing:
 * a group joins one cluster, a person serves in one.
 */
export function answerInvitation(me: { id: string; name: string }, inbound: Inbound, status: "accepted" | "declined", admins: Record<string, AdminProfile>, requests: ClusterRequest[], reason?: string) {
  const at = Date.now();
  const touched = new Map<string, Cluster>();
  const edit = (req: ClusterRequest, fn: (c: Cluster) => Cluster) => touched.set(req.headId, fn(touched.get(req.headId) ?? req.cluster));
  const mark = (x: ClusterInvite, s: ClusterInvite["status"], why?: string) => ({ ...x, status: s, at, reason: why });
  const apply = (req: ClusterRequest, kind: InviteKind, s: ClusterInvite["status"], why?: string) =>
    edit(req, (c) =>
      kind === "group"
        ? { ...c, groups: Object.fromEntries(Object.entries(c.groups).map(([n, g]) => [n, g.id === me.id ? { ...mark(g, s, why), number: g.number, office: g.office, capacity: g.capacity, pilgrims: g.pilgrims } : g])) }
        : kind === "deputy"
          ? { ...c, deputy: c.deputy && mark(c.deputy, s, why) }
          : { ...c, team: { ...c.team, [kind]: c.team[kind].map((x) => (x.id === me.id ? mark(x, s, why) : x)) } },
    );
  apply(inbound.req, inbound.kind, status, reason);
  if (status === "accepted") {
    const same = (k: InviteKind) => (inbound.kind === "group" ? k === "group" : k !== "group");
    for (const other of invitationsFor(me.id, requests)) {
      if (other.req.cluster.id === inbound.req.cluster.id || other.invite.status !== "pending" || !same(other.kind)) continue;
      apply(other.req, other.kind, "declined", `قبِل دعوة ${inbound.req.cluster.name}`);
    }
  }
  for (const [headId, c] of touched) {
    const req = requests.find((r) => r.headId === headId)!;
    if (req.seed) continue;
    saveCluster({ id: headId, name: req.headName, group: req.headGroup }, c, admins);
  }
  const what = inbound.kind === "group" ? `انضمام المجموعة ${inbound.number} إلى ${inbound.req.cluster.name}` : `${inbound.kind === "deputy" ? DEPUTY_TITLE : POOLS[inbound.kind].one} في ${inbound.req.cluster.name}`;
  logAdmin(me.id, status === "accepted" ? `قبول دعوة: ${what}` : `اعتذار عن دعوة: ${what}`, inbound.req.headName, reason, { area: "clusters", ref: inbound.req.cluster.id });
}

/**
 * The administration's decision on a request once the deadline passed. On this device it also reaches the
 * head's record; an excluded cluster lets its deputy and its people go, and its groups wait to be distributed.
 */
export function decideCluster(req: ClusterRequest, status: "approved" | "excluded", by: string, admins: Record<string, AdminProfile>, decisions: State["formation"]["decisions"], reason?: string) {
  const d = { status, at: Date.now(), by, reason };
  actions.setFormation({ decisions: { ...decisions, [req.cluster.id]: d } });
  if (req.seed) return;
  actions.upsertAdmin(req.headId, { cluster: { ...req.cluster, decision: d } });
  if (status === "approved") return;
  for (const [id, a] of Object.entries(admins)) {
    if (a.deputyOf?.clusterId === req.cluster.id) actions.upsertAdmin(id, { deputyOf: undefined });
    if (a.coordinatorIn?.clusterId === req.cluster.id) actions.upsertAdmin(id, { coordinatorIn: undefined });
    if (a.servesIn?.clusterId === req.cluster.id) actions.upsertAdmin(id, { servesIn: undefined });
    if (a.group?.clusterId === req.cluster.id) actions.upsertAdmin(id, { group: { ...a.group, clusterId: undefined } });
  }
}

/** A group left outside every approved cluster: its own head's, from a request that was excluded or that no request took */
export type OutsideGroup = { number: number; headId: string; headName: string; office: string; capacity: number; pilgrims: number; from?: string };

/** The groups the distribution has to place: in no approved or still undecided request */
export function outsideGroups(requests: ClusterRequest[], pool: { headId: string; headName: string; number: number; office: string; capacity: number; pilgrims: number }[]): OutsideGroup[] {
  const placed = new Set(requests.filter((r) => r.decision?.status !== "excluded").flatMap((r) => r.groups.map((g) => g.number)));
  const fromExcluded = requests
    .filter((r) => r.decision?.status === "excluded")
    .flatMap((r) => acceptedGroups(r.cluster).map((g) => ({ number: g.number, headId: g.id, headName: g.name, office: g.office, capacity: g.capacity, pilgrims: g.pilgrims, from: r.cluster.name })));
  const all = [...fromExcluded, ...pool.filter((g) => !fromExcluded.some((x) => x.number === g.number))];
  return all.filter((g) => !placed.has(g.number)).sort((a, b) => a.number - b.number);
}

/** The administration places them, and each head on this device sees his group in its new cluster */
export function distributeGroups(moves: Record<number, string>, groups: OutsideGroup[], by: string, admins: Record<string, AdminProfile>, current: State["formation"]) {
  actions.setFormation({ moves: { ...current.moves, ...moves }, distributedAt: Date.now(), distributedBy: by });
  for (const [n, to] of Object.entries(moves)) {
    const g = groups.find((x) => x.number === Number(n));
    const a = g ? admins[g.headId] : undefined;
    if (g && a?.group) actions.upsertAdmin(g.headId, { group: { ...a.group, clusterId: to } });
  }
}
