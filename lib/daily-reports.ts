"use client";

import { useMemo } from "react";
import { useToday } from "./operations";
import { effectiveRole, positionLabelOf, DEMO_ADMINS } from "@/app/administrator/_lib/admin";
import { teamOfGroup, type GroupRef } from "./flights";
import { useStore, type AdminProfile, type DailyReport } from "./store";
import { nowMs, seeded } from "./utils";

/**
 * «يومي»: the day's reports and where they go. Every administrator who works in a group (its head, its assistant,
 * its guide, its coordinator) sends his own report of that group's day; the cluster's head and its assistant read
 * them all, and either of them sends the cluster's report to the administration, which reads it in the operations
 * room. A report says when it was read, and by whom.
 */
export type { DailyReport };

/** His own reports, newest first */
export function useMyDailyReports(byId: string | undefined) {
  const all = useStore((s) => s.dailyReports);
  return useMemo(() => all.filter((r) => r.byId === byId).sort((a, b) => b.at - a.at), [all, byId]);
}

const GENERAL = ["مستقرة", "مستقرة — يوم مزدحم في الحرم", "جيدة"];
const HEALTH = ["لا حالات", "حالة واحدة في العيادة — مستقرة", "حالتان إجهاد حراري — عولجتا"];
const COMPLAINTS = ["لا شكاوى", "شكوى تكييف في غرفة — قيد المعالجة", "تأخر حافلة العصر 20 دقيقة"];

/** What each of a group's team is, for the cluster's day: his role if his file is here, else his place in the group */
function roleOf(id: string, index: number, admins: Record<string, AdminProfile>) {
  const p = admins[id];
  if (p) return positionLabelOf(effectiveRole(p));
  const demo = DEMO_ADMINS.find((d) => d.id === id);
  if (demo) return positionLabelOf(demo.position);
  if (id.endsWith("-d")) return "معاون";
  if (id.endsWith("-g")) return "موجّه ديني";
  if (id.endsWith("-t")) return "منسق تقني";
  return index === 0 ? "رئيس المجموعة" : "إداري";
}

export type TeamReport = { id: string; name: string; role: string; report?: DailyReport; seed: boolean };

/**
 * The day of a cluster's groups, as its head and its assistant read it: in each group every administrator who works
 * in it — its head, the people in its seats, its coordinator — with the report he sent today, or none yet. Everyone
 * sends his own. The demo adds the reports of the people who are not on this device, so some arrive before anyone
 * here sends one; whoever is on this device sends his own.
 */
export function useClusterDay(clusterId: string | undefined, groups: { number: number; head: string }[]) {
  const all = useStore((s) => s.dailyReports);
  const admins = useStore((s) => s.admins);
  const day = useToday();
  return useMemo(() => {
    const real = all.filter((r) => r.to === "cluster" && r.clusterId === clusterId && r.day === day);
    return groups.map((g) => {
      const ref: GroupRef = { clusterId: clusterId ?? "", clusterName: "", number: g.number, head: g.head, pilgrims: 0, capacity: 0 };
      const members: TeamReport[] = teamOfGroup(ref, admins).map((m, i) => {
        const role = roleOf(m.id, i, admins);
        const mine = real.filter((r) => r.byId === m.id && r.groupNumber === g.number).sort((a, b) => b.at - a.at)[0];
        if (mine || admins[m.id]) return { id: m.id, name: m.name, role, report: mine, seed: false };
        // Two in three of those not on this device have sent theirs today
        const rnd = seeded(`${clusterId}-${g.number}-${m.id}-${day}`);
        if (rnd() > 0.66) return { id: m.id, name: m.name, role, seed: false };
        const at = nowMs() - (10 + Math.floor(rnd() * 170)) * 60_000;
        const pick = (xs: string[]) => xs[Math.floor(rnd() * xs.length)];
        const report: DailyReport = { id: `seed-${g.number}-${m.id}-${day}`, at, day, byId: m.id, by: m.name, role, to: "cluster", clusterId, groupNumber: g.number, general: pick(GENERAL), health: pick(HEALTH), complaints: pick(COMPLAINTS) };
        return { id: m.id, name: m.name, role, report, seed: true };
      });
      return { group: g, members };
    });
  }, [all, admins, clusterId, groups, day]);
}

/** The clusters' reports to the administration, newest first (the operations room's) */
export function useAdministrationReports() {
  const all = useStore((s) => s.dailyReports);
  return useMemo(() => all.filter((r) => r.to === "administration").sort((a, b) => b.at - a.at), [all]);
}
