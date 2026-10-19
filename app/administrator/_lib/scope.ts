"use client";

import { useMemo } from "react";
import type { AdminProfile } from "@/lib/store";
import { isTechCoordinator, useAdmin } from "./admin";
import { useCoordinatorPost } from "./coordinators";

/**
 * Who does the operations in the administrators' portal, and on which groups:
 * - the cluster's head, its assistant and its accountant follow them all, and do none («للاطلاع فقط»);
 * - the technical coordinator does them all, on every group sorted to him;
 * - a group's head and its assistant do them on their own group only;
 * - the guides and the female guides only the religious lessons and activities — never the field.
 */
export type ScopeKind = "cluster" | "tech" | "group" | "guide" | "none";

export type AdminScope = {
  kind: ScopeKind;
  /** His post as the pages name it: «رئيس التكتل», «المنسق التقني»… */
  post: string;
  /** The groups he does the operations on */
  acts: number[];
  /** Follows the operations without doing any */
  viewOnly: boolean;
  canAct: (group?: number) => boolean;
};

export function scopeOf(p: AdminProfile | undefined, coordinatorGroups?: number[]): AdminScope {
  const make = (kind: ScopeKind, post: string, acts: number[] = []): AdminScope => ({
    kind,
    post,
    acts,
    viewOnly: kind === "cluster",
    canAct: (g) => (kind === "tech" || kind === "group") && (g === undefined ? acts.length > 0 : acts.includes(g)),
  });
  if (!p) return make("none", "");
  if (p.cluster) return make("cluster", "رئيس التكتل");
  if (p.servesIn?.role === "cluster-assistant") return make("cluster", "معاون رئيس التكتل");
  if (p.accountantOf) return make("cluster", "محاسب التكتل");
  if (p.coordinatorIn || isTechCoordinator(p)) return make("tech", "المنسق التقني", coordinatorGroups?.length ? coordinatorGroups : (p.coordinatorIn?.groups ?? []));
  if (p.positions[0] === "group-head" && p.group?.approvedAt) return make("group", "رئيس المجموعة", [p.group.number]);
  if (p.servesIn?.role === "assistant") return make("group", "معاون رئيس المجموعة", p.servesIn.groups);
  if (p.servesIn?.role === "guide") return make("guide", "الموجّه الديني");
  if (p.servesIn?.role === "guide-f") return make("guide", "الموجّهة الدينية");
  return make("none", "");
}

/** His scope now: a coordinator's groups read live from his cluster's sorting */
export function useAdminScope(): AdminScope {
  const admin = useAdmin();
  const post = useCoordinatorPost(admin?.id ?? "", admin?.profile);
  const live = post?.role === "tech" ? post.groups.map((g) => g.number) : undefined;
  const key = live?.join(",");
  return useMemo(() => scopeOf(admin?.profile, key ? key.split(",").map(Number) : undefined), [admin?.profile, key]);
}

/** The line a page shows whoever follows it without acting */
export function viewOnlyText(s: AdminScope, what: string) {
  return `${s.post}: للاطلاع فقط. يتابع ${what} ولا يشارك فيها؛ يقوم بها المنسق التقني في مجموعاته، ورئيس المجموعة ومعاونه في مجموعتهما.`;
}
