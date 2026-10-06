"use client";

import { Cpu, Shuffle, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { actions, useStore, type AdminProfile } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, useAdmin } from "../../_lib/admin";
import { clusterGroupsOf } from "../../_lib/cluster";
import { COORDINATOR_ROLE, coordinatorTierFor, coordinatorsLabel, groupsLabel, useCoordinatorTiers } from "../../_lib/coordinators";
import { SectionTitle } from "../../_components/ui";
import { TeamPicker, teamComplete, type Role, type TeamPick } from "../group/team-picker";

type Cluster = NonNullable<AdminProfile["cluster"]>;

/**
 * The cluster's technical coordinators, managed by its head: he invites them — as many as the cluster's
 * category allows, which the administration sets by the groups it takes and the head's rating — and sorts
 * the cluster's groups among them. Each group has one coordinator; one coordinator may hold one group or
 * all of them. A coordinator who has a record on the platform sees his post at once.
 */
export function CoordinatorsPanel() {
  const admin = useAdmin()!;
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const tiers = useCoordinatorTiers();
  const cluster = admin.profile!.cluster!;
  const groups = clusterGroupsOf(admin.profile, admin.name);
  const { tier, rating } = coordinatorTierFor(admin.id, cluster.capacityGroups, tiers);
  const allowed = tier?.coordinators ?? 0;
  const current = cluster.coordinators ?? [];
  const assignment = cluster.assignment ?? {};
  const open = Math.max(0, allowed - current.length);
  const [team, setTeam] = useState<TeamPick>({});
  const slots: Role[] = Array.from({ length: open }, (_, i) => ({ ...COORDINATOR_ROLE, key: `tech-${current.length + i + 1}`, label: `المنسق التقني ${current.length + i + 1}`, roster: "tech" }));
  const accepted = slots.filter((r) => team[r.key]?.status === "accepted");
  const unsorted = groups.filter((g) => !current.some((c) => c.id === assignment[g.number]));

  /** Writes the cluster, and tells every coordinator on the platform where he now works */
  const save = (next: Cluster, before: Cluster["coordinators"] = current) => {
    actions.upsertAdmin(admin.id, { cluster: next });
    const ids = new Set([...(before ?? []), ...(next.coordinators ?? [])].map((c) => c.id));
    for (const id of ids) {
      if (!admins[id]) continue;
      const stays = next.coordinators?.some((c) => c.id === id);
      const mine = groups.filter((g) => next.assignment?.[g.number] === id).map((g) => g.number);
      actions.upsertAdmin(id, { coordinatorIn: stays ? { clusterId: next.id, clusterName: next.name, headId: admin.id, headName: admin.name, groups: mine } : undefined });
    }
  };

  const add = () => {
    const people = accepted.map((r) => ({ id: team[r.key]!.candidate.id, name: team[r.key]!.candidate.name }));
    const coordinators = [...current, ...people];
    // A cluster with a single coordinator gives him every group not sorted yet
    const fill = coordinators.length === 1 ? Object.fromEntries(groups.map((g) => [g.number, coordinators[0].id])) : {};
    save({ ...cluster, coordinators, assignment: { ...fill, ...assignment } });
    logAdmin(admin.id, `إضافة منسقين تقنيين إلى ${cluster.name}`, people.map((x) => x.name).join("، "), `${coordinators.length} من ${allowed} — بدعوات فردية قبِلها أصحابها`, { area: "clusters", ref: cluster.id });
    toast({ title: people.length === 1 ? `انضم ${people[0].name} إلى منسقي تكتلك` : `انضم ${people.length} منسقين إلى تكتلك`, body: "افرز عليهم مجموعات التكتل.", icon: "🧑‍💻", tone: "success" });
    setTeam({});
  };

  const remove = (id: string) => {
    const who = current.find((c) => c.id === id)!;
    const coordinators = current.filter((c) => c.id !== id);
    const left = Object.fromEntries(Object.entries(assignment).filter(([, c]) => c !== id));
    save({ ...cluster, coordinators, assignment: left });
    logAdmin(admin.id, `إخراج منسق تقني من ${cluster.name}`, who.name, "تبقى مجموعاته بلا منسق حتى تفرزها", { area: "clusters", ref: cluster.id });
  };

  const sort = (number: number, id: string) => {
    const next = { ...assignment };
    if (id) next[number] = id;
    else delete next[number];
    save({ ...cluster, assignment: next });
    const who = current.find((c) => c.id === id);
    logAdmin(admin.id, `فرز المجموعة ${number} على منسق`, who?.name ?? "دون منسق", cluster.name, { area: "clusters", ref: cluster.id });
  };

  /** Even shares, in the order of the groups: three coordinators and six groups give two each */
  const spread = () => {
    if (!current.length) return;
    const per = Math.ceil(groups.length / current.length);
    const next = Object.fromEntries(groups.map((g, i) => [g.number, current[Math.min(current.length - 1, Math.floor(i / per))].id]));
    save({ ...cluster, assignment: next });
    logAdmin(admin.id, `توزيع مجموعات ${cluster.name} على منسقيه بالتساوي`, current.map((c) => c.name).join("، "), `${groups.length} مجموعات على ${current.length}`, { area: "clusters", ref: cluster.id });
    toast({ title: "وُزّعت المجموعات على المنسقين", body: "غيّر منسق أي مجموعة من قائمتها.", icon: "🔀", tone: "info" });
  };

  return (
    <Card>
      <SectionTitle icon={Cpu} action={<Badge tone={current.length >= allowed && allowed > 0 ? "green" : "gold"}>{current.length} من {allowed}</Badge>}>
        منسقو التكتل
      </SectionTitle>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        المنسق التقني للتكتل لا للمجموعة. فئة تكتلك عند إدارة الإداريين: <b className="text-green-dark">{tier?.label ?? "لا تنطبق عليه فئة"}</b> ({cluster.capacityGroups} مجموعة، وتقييمك {rating ?? "—"})، فلك <b className="text-green-dark">{coordinatorsLabel(allowed)}</b>. ادعُهم واحداً واحداً، ثم افرز عليهم مجموعات التكتل: لكل مجموعة منسق واحد، وللمنسق مجموعة أو أكثر.
      </p>

      {current.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {current.map((c) => {
            const mine = groups.filter((g) => assignment[g.number] === c.id).map((g) => g.number);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-sand p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-green-dark">
                  <Cpu className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.name}</span>
                  <span className="block text-xs text-ink-soft">{groupsLabel(mine)}</span>
                </span>
                <button type="button" onClick={() => remove(c.id)} aria-label={`إخراج ${c.name}`} className="grid size-9 place-items-center rounded-xl text-hint hover:bg-maroon/10 hover:text-maroon">
                  <UserMinus className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-2 font-bold text-ink">
            <UserPlus className="size-5 text-gold-dark" /> {current.length ? `بقي ${coordinatorsLabel(open)}` : `ادعُ ${coordinatorsLabel(open)}`}
          </p>
          <TeamPicker team={team} setTeam={setTeam} roles={slots} place={cluster.name} exclude={current.map((c) => c.id)} />
          <Button className="mt-4" onClick={add} disabled={!accepted.length || !teamComplete(team, accepted)}>
            <UserPlus className="size-4" /> {accepted.length ? `ضمّ ${coordinatorsLabel(accepted.length)} إلى التكتل` : "بانتظار قبول الدعوات"}
          </Button>
        </div>
      )}

      {current.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-ink">فرز المجموعات على المنسقين</p>
            {current.length > 1 && (
              <Button size="sm" variant="outline" onClick={spread}>
                <Shuffle className="size-4" /> توزيع بالتساوي
              </Button>
            )}
          </div>
          {unsorted.length > 0 && <p className="mt-2 rounded-2xl bg-maroon/8 p-3 text-sm font-semibold text-maroon">{unsorted.length === 1 ? `المجموعة ${unsorted[0].number} بلا منسق` : `${unsorted.length} مجموعات بلا منسق`}: لا يُسجَّل فيها حاج حتى تفرزها.</p>}
          <ul className="mt-3 space-y-2">
            {groups.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold/30 p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand font-display font-bold text-green-dark">{g.number}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-bold">المجموعة {g.number}</span>
                  <span className="block text-xs text-ink-soft">رئيسها {g.own ? `${admin.name} (أنت)` : g.head}</span>
                </span>
                <select
                  value={current.some((c) => c.id === assignment[g.number]) ? assignment[g.number] : ""}
                  onChange={(e) => sort(g.number, e.target.value)}
                  aria-label={`منسق المجموعة ${g.number}`}
                  className={cn("h-11 min-w-48 rounded-xl border-2 bg-white px-3 text-sm font-semibold outline-none focus:border-green-light", assignment[g.number] ? "border-gold/50" : "border-maroon/50 text-maroon")}
                >
                  <option value="">— بلا منسق —</option>
                  {current.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
