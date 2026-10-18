"use client";

import type { ClusterTeam, TeamGroup, TeamMember } from "@/lib/data/clusters";
import type { AdminProfile, ClusterInvite } from "@/lib/store";
import { seasonHistory } from "./admin";
import { contactOf } from "./cadre";
import { ACCOUNTANT_TITLE, POOLS, roleOfPerson, type ClusterRequest } from "./formation";
import { HEADS_POOL, ROSTER } from "./people";
import { branchOf, roleName, roleOf, type Cadre, type Structure } from "./structure";

/**
 * A cluster's people as «التكتلات والمجموعات» shows them, read from its approved request (./directory): its
 * head and accountant, its assistants, coordinators and female guides, and every group with its head and
 * the guides and assistants in its seats. Each with his role this season, his seasons on the platform and the
 * rating of his last one — what a pilgrim weighs before he signs with a group.
 */

/** His experience on the platform: the season's records of the qualified and of the groups' heads, else his own file */
function experience(id: string) {
  const known = ROSTER.find((x) => x.id === id) ?? HEADS_POOL.find((x) => x.id === id);
  if (known) return { seasons: known.seasons, rating: known.seasons ? known.rating || null : null };
  const served = seasonHistory(id).filter((h) => h.roleKey);
  return { seasons: served.length, rating: served.at(-1)?.rating ?? null };
}

export function teamOf(s: Structure, cadre: Cadre, admins: Record<string, AdminProfile>, r: ClusterRequest): ClusterTeam {
  const c = r.cluster;
  const yes = (x?: ClusterInvite) => x?.status === "accepted";
  // Everyone's phone is public for the pilgrims to call, but the female religious guides'
  const member = (x: { id: string; name: string }, post: string): TeamMember => {
    const role = roleOfPerson(x.id, admins, cadre);
    const female = roleOf(s, role)?.gender === "F";
    return { id: x.id, name: x.name, post, role: role ? roleName(role, s) : "", ...experience(x.id), branch: branchOf(x.id, cadre), female: female || undefined, phone: female ? undefined : contactOf(x.id, cadre).phone };
  };
  // The head's own group first, as the cluster's screens show it
  const groups: TeamGroup[] = [...r.groups].sort((a, b) => Number(!!b.own) - Number(!!a.own)).map((g) => {
    const seats = c.seats[g.number] ?? [];
    const sat = (kind: "guide" | "assistant") => seats.filter((x) => x.kind === kind && yes(x.who)).map((x) => member(x.who!, POOLS[kind].title));
    return {
      no: g.number,
      category: g.categoryName,
      capacity: g.capacity,
      pilgrims: g.pilgrims,
      own: !!g.own,
      head: member({ id: g.headId, name: g.head }, g.own ? "رئيس التكتل ورئيس مجموعته" : "رئيس المجموعة"),
      guides: sat("guide"),
      assistants: sat("assistant"),
      coordinator: c.coordinators.find((x) => yes(x) && x.id === c.sorting[g.number])?.name,
      femaleGuide: c.femaleGuides.find((x) => yes(x) && x.id === c.guideSorting?.[g.number])?.name,
    };
  });
  return {
    tier: s.tiers.find((t) => t.id === c.tier)?.name ?? "",
    head: member({ id: r.headId, name: r.headName }, "رئيس التكتل"),
    accountant: yes(c.accountant) ? member(c.accountant!, ACCOUNTANT_TITLE) : undefined,
    assistants: c.assistants.filter(yes).map((x) => member(x, POOLS["cluster-assistant"].title)),
    coordinators: c.coordinators.filter(yes).map((x) => member(x, POOLS.tech.title)),
    femaleGuides: c.femaleGuides.filter(yes).map((x) => member(x, POOLS["guide-f"].title)),
    groups,
    size: r.cadre,
    badges: r.badges,
    ageAvg: r.age.avg,
  };
}
