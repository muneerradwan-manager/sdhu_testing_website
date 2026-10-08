"use client";

import { useMemo } from "react";
import { groupsName } from "@/lib/groups";
import { useStore, type AdminProfile, type ClusterRecord, type TeamPool } from "@/lib/store";
import { groupsFromCluster, headRecordOf, type ClusterGroup } from "./cluster";
import { useStructure, type Structure } from "./structure";

/**
 * The technical coordinator is not part of a group's team: he works for the cluster. A cluster has one
 * coordinator for every so many units of its groups' categories (the administration's composition of the
 * tier), one of them «معاون ومنسق تقني», and its head sorts its groups among them: one coordinator may take
 * all the groups of a small cluster, or three coordinators some each. A coordinator works only in the groups
 * sorted to him: he files pilgrims' applications in the office, enrolls the families who chose one of his
 * groups, and takes their health files.
 */
export const COORDINATOR_ROLE = { key: "tech", label: "المنسق التقني", note: "يعمل في المجموعات التي وُزّع عليها، ويأخذ ملفات حجاجها الصحية" } as const;

export function coordinatorsLabel(n: number) {
  return n === 0 ? "لا منسق" : n === 1 ? "منسق واحد" : n === 2 ? "منسقان" : `${n} منسقين`;
}

export type CoordinatorPost = { clusterId: string; clusterName: string; headId: string; headName: string; role: TeamPool; groups: ClusterGroup[] };

/**
 * Where someone the cluster's head picked works: the groups a coordinator or a female guide was distributed on,
 * a guide's or an assistant's seat's group, or the whole cluster for a cluster assistant. Read from the
 * head's own record when it is on this device, so a change reaches him at once; else from the season's
 * seeded request; else from what his invitation left on his record.
 */
export function coordinatorPostOf(s: Structure, id: string, p: AdminProfile | undefined, admins: Record<string, AdminProfile>, overrides: Record<string, ClusterRecord> = {}): CoordinatorPost | null {
  const c = p?.coordinatorIn ?? p?.servesIn;
  if (!c) return null;
  const role: TeamPool = p?.coordinatorIn ? "tech" : p!.servesIn!.role;
  const rec = headRecordOf({ ...p!, cluster: undefined, deputyOf: undefined, accountantOf: undefined }, admins, overrides);
  if (rec && rec.cluster.id === c.clusterId) {
    const all = groupsFromCluster(s, rec.cluster, rec.headGroup);
    const mine =
      role === "tech"
        ? all.filter((g) => rec.cluster.sorting[g.number] === id)
        : role === "guide-f"
          ? all.filter((g) => rec.cluster.guideSorting?.[g.number] === id)
          : role === "guide" || role === "assistant"
            ? all.filter((g) => (rec.cluster.seats[g.number] ?? []).some((x) => x.who?.id === id && x.who.status === "accepted"))
            : all;
    return { ...c, role, groups: mine };
  }
  return { ...c, role, groups: [] };
}

export function useCoordinatorPost(id: string, p: AdminProfile | undefined) {
  const admins = useStore((s) => s.admins);
  const overrides = useStore((s) => s.formation.overrides);
  const s = useStructure();
  return useMemo(() => coordinatorPostOf(s, id, p, admins, overrides), [s, id, p, admins, overrides]);
}

/** «مجموعات اللطيف والخبير وأحفاد بني هاشم» — by their names, never their numbers */
export function groupsLabel(numbers: number[]) {
  return numbers.length ? groupsName(numbers) : "لا مجموعة بعد";
}
