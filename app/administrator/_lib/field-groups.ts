"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useAdmin } from "./admin";
import { acceptedGroups, headRecordOf } from "./cluster";
import { groupCount } from "./group";

/**
 * The groups he works in the field: a group head his own; the cluster's head and its assistant, every
 * group of the cluster; a coordinator, a guide or a female guide the groups the cluster's head sorted to him —
 * each with as many pilgrims as its cluster counts for it.
 */
export function useFieldGroups() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const admins = useStore((x) => x.admins);
  const overrides = useStore((x) => x.formation.overrides);
  const post = useStore((x) => x.post);
  const applications = useStore((x) => x.applications);
  return useMemo(() => {
    const rec = headRecordOf(p, admins, overrides);
    const all = rec ? acceptedGroups(rec.cluster).map((g) => ({ number: g.number, head: g.name, pilgrims: g.pilgrims })).sort((a, b) => Number(b.number === rec.headGroup) - Number(a.number === rec.headGroup)) : [];
    const pick = (ns: number[]) => all.filter((g) => ns.includes(g.number));
    const groups =
      p?.cluster
        ? all
        : p?.coordinatorIn
          ? pick(p.coordinatorIn.groups)
          : p?.servesIn
            ? p.servesIn.role === "cluster-assistant"
              ? all
              : pick(p.servesIn.groups)
            : p?.group?.approvedAt
              ? [{ number: p.group.number, head: admin.name, pilgrims: 0 }]
              : [];
    const home = p?.group?.number;
    const clusterId = rec?.cluster.id ?? p?.group?.clusterId;
    return groups.map((g) => ({ ...g, clusterId, size: g.number === home && !all.length ? undefined : groupCount(g.number, post, applications, all.find((x) => x.number === g.number), home) }));
  }, [p, admins, overrides, post, applications, admin.name]);
}

