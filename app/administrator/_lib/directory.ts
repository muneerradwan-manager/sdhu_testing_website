"use client";

import { clustersNow } from "@/lib/cms/content";
import type { Cluster, ServiceLevel } from "@/lib/data/clusters";
import { fullName, getPerson } from "@/lib/registry";
import { getState, type AdminProfile, type ClusterRecord } from "@/lib/store";
import { SEED_CLUSTERS, acceptedGroups, asGroup } from "./cluster";
import { structureNow, type Structure } from "./structure";

/**
 * «التكتلات والمجموعات» (the public directory) and the administrators' platform hold the same clusters: the content team publishes a
 * cluster's programme (lib/data/clusters, «محتوى الموقع»), and everything else the directory shows of it — its
 * level, its groups and their heads, the seats left, its people — is read from its request here, under the same
 * id. A cluster appears in the directory once its request is approved, and leaves it if the request is archived.
 */

/** The administration's tiers as the directory names them */
export const LEVEL_OF_TIER: Record<string, ServiceLevel> = { eco: "اقتصادي", "eco-plus": "اقتصادي محسن", five: "خمس نجوم" };

export type LinkedRequest = { headId: string; headName: string; headGroup?: number; cluster: ClusterRecord };

/**
 * A cluster's request as it stands now, outside React (the pilgrim's group, the office's lists): its head's on
 * this device, else the administration's edit of the season's request, else the request itself
 */
export function requestNow(id: string): LinkedRequest | undefined {
  const { admins, formation } = getState();
  if (formation.archived[id]) return undefined;
  const live = Object.values(admins).find((a) => a.cluster?.id === id);
  if (live?.cluster) {
    const p = getPerson(live.nationalId);
    return { headId: live.nationalId, headName: p ? fullName(p) : live.nationalId, headGroup: live.group?.number, cluster: live.cluster };
  }
  const seed = [...SEED_CLUSTERS, ...formation.created].find((x) => x.cluster.id === id);
  return seed && { ...seed, cluster: formation.overrides[id] ?? seed.cluster };
}

/** What the directory shows of a cluster from its request: its level, and its groups with their heads and the seats left */
export function structureFacts(s: Structure, r: LinkedRequest): Pick<Cluster, "level" | "groupsCount" | "pilgrims" | "groups"> {
  const groups = acceptedGroups(r.cluster)
    .map((g) => asGroup(s, r.cluster, g, g.number === r.headGroup))
    .sort((a, b) => Number(b.own) - Number(a.own));
  return {
    level: LEVEL_OF_TIER[r.cluster.tier ?? ""] ?? "اقتصادي",
    groupsCount: groups.length,
    pilgrims: groups.reduce((n, g) => n + g.pilgrims, 0),
    groups: groups.map((g) => ({ no: g.number, leader: g.head, capacity: g.capacity, remaining: Math.max(0, g.capacity - g.pilgrims) })),
  };
}

/** The directory now, outside React: every published programme whose cluster's request is approved */
export function directoryNow(): Cluster[] {
  const s = structureNow();
  return clustersNow().flatMap((c) => {
    const r = requestNow(c.slug);
    return r?.cluster.status === "approved" ? [{ ...c, ...structureFacts(s, r) }] : [];
  });
}

/** The groups he signed a contract with at the office: his own as its head, or the group whose seat the office gave him */
export function myGroupNumbers(id: string, p: AdminProfile | undefined, admins: Record<string, AdminProfile>): number[] {
  const out = new Set<number>();
  if (p?.group?.approvedAt) out.add(p.group.number);
  if (p?.servesIn && (p.servesIn.role === "guide" || p.servesIn.role === "assistant")) p.servesIn.groups.forEach((n) => out.add(n));
  for (const a of Object.values(admins)) if (a.group?.approvedAt && (a.group.seats?.some((x) => x.who?.id === id) || a.group.countAssistant?.id === id)) out.add(a.group.number);
  return [...out];
}

/** Who writes a group's public page (its picture, its word, its gallery): its head once it is approved, or its assistant */
export function groupWriterOf(p: AdminProfile | undefined): { no: number; post: string; clusterId?: string; clusterName?: string } | null {
  if (!p) return null;
  if (p.group?.approvedAt) {
    const id = p.group.clusterId;
    return { no: p.group.number, post: "رئيس المجموعة", clusterId: id, clusterName: id ? requestNow(id)?.cluster.name : undefined };
  }
  if (p.servesIn?.role === "assistant" && p.servesIn.groups[0]) return { no: p.servesIn.groups[0], post: "معاون المجموعة", clusterId: p.servesIn.clusterId, clusterName: p.servesIn.clusterName };
  return null;
}

/** The groups' pages someone writes: the cluster's head all its groups, a group's head or assistant his */
export type GroupPagesAccess = { post: string; clusterId?: string; clusterName?: string; groups: number[] };

export function groupPagesOf(p: AdminProfile | undefined): GroupPagesAccess | null {
  if (!p) return null;
  const clusterId = p.cluster?.id;
  if (clusterId) {
    const r = requestNow(clusterId);
    const groups = acceptedGroups(r?.cluster ?? p.cluster)
      .map((g) => g.number)
      .sort((a, b) => a - b);
    if (groups.length) return { post: "رئيس التكتل", clusterId, clusterName: r?.cluster.name ?? p.cluster?.name, groups };
  }
  const own = groupWriterOf(p);
  return own ? { post: own.post, clusterId: own.clusterId, clusterName: own.clusterName, groups: [own.no] } : null;
}

/** Who writes a cluster's public page, and as what */
export type PageWriter = { clusterId: string; clusterName: string; post: string };

/**
 * A cluster's public page is written by its team once the cluster is formed: its head, its
 * assistants and technical coordinators, and its groups' heads and their assistants (not its guides). Whatever
 * any of them sends waits for the administration, under the sender's name.
 */
export function pageWriterOf(p: AdminProfile | undefined): PageWriter | null {
  if (!p) return null;
  if (p.cluster) return { clusterId: p.cluster.id, clusterName: p.cluster.name, post: "رئيس التكتل" };
  if (p.coordinatorIn) return { clusterId: p.coordinatorIn.clusterId, clusterName: p.coordinatorIn.clusterName, post: "منسق تقني" };
  if (p.servesIn?.role === "cluster-assistant") return { clusterId: p.servesIn.clusterId, clusterName: p.servesIn.clusterName, post: "معاون التكتل" };
  if (p.servesIn?.role === "assistant") return { clusterId: p.servesIn.clusterId, clusterName: p.servesIn.clusterName, post: "معاون مجموعة" };
  const own = p.group?.approvedAt ? p.group.clusterId : undefined;
  if (p.positions[0] === "group-head" && own) return { clusterId: own, clusterName: requestNow(own)?.cluster.name ?? own, post: "رئيس مجموعة" };
  return null;
}
