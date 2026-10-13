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
export const LEVEL_OF_TIER: Record<string, ServiceLevel> = { eco: "عادي", "eco-plus": "محسّن", five: "خمس نجوم" };

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
    level: LEVEL_OF_TIER[r.cluster.tier ?? ""] ?? "عادي",
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

/** Who writes a cluster's public page, and as what */
export type PageWriter = { clusterId: string; clusterName: string; post: string };

/**
 * A cluster's public page is written by its team once the cluster is approved: its head and deputy, its
 * assistants and technical coordinators, and its groups' heads and their assistants (not its guides). Whatever
 * any of them sends waits for the administration, under the sender's name.
 */
export function pageWriterOf(p: AdminProfile | undefined): PageWriter | null {
  if (!p) return null;
  if (p.cluster) return { clusterId: p.cluster.id, clusterName: p.cluster.name, post: "رئيس التكتل" };
  if (p.deputyOf) return { clusterId: p.deputyOf.clusterId, clusterName: p.deputyOf.clusterName, post: "نائب رئيس التكتل" };
  if (p.coordinatorIn) return { clusterId: p.coordinatorIn.clusterId, clusterName: p.coordinatorIn.clusterName, post: "منسق تقني" };
  if (p.servesIn?.role === "cluster-assistant") return { clusterId: p.servesIn.clusterId, clusterName: p.servesIn.clusterName, post: "معاون التكتل" };
  if (p.servesIn?.role === "assistant") return { clusterId: p.servesIn.clusterId, clusterName: p.servesIn.clusterName, post: "معاون مجموعة" };
  const own = p.group?.approvedAt ? p.group.clusterId : undefined;
  if (p.positions[0] === "group-head" && own) return { clusterId: own, clusterName: requestNow(own)?.cluster.name ?? own, post: "رئيس مجموعة" };
  return null;
}
