"use client";

import { useMemo } from "react";
import {
  allClusterIds,
  clusterName,
  flightOfGroup,
  flightWarnings,
  groupsOfCluster,
  isActive,
  membersOfGroup,
  seatStats,
  useAirportReps,
  useFlightsData,
  type Direction,
  type Flight,
  type GroupRef,
  type Traveler,
} from "@/lib/flights";
import { CURRENT_SEASON, fullName, inSeason, postingsOf, useEmployees, useOpFiles, usePlaces } from "@/lib/ops";
import { getStaff } from "@/lib/staff";
import { useStore } from "@/lib/store";
import type { Alert } from "../_components/system";

/**
 * The flights system seen whole, for its owner and for the director: every group and the flights it is
 * on, who lost a seat, which flights need his hand, which airports have no representative. Every screen of
 * the system reads from here, so a number is the same on the owner's summary, his tabs and the director's board.
 */

export type GroupRow = { g: GroupRef; total: number; out: number; back: number; flightOut?: Flight; flightBack?: Flight; warnings: string[] };
export type NeedsFlight = { t: Traveler; dir: Direction; why: string };

export function useFlightsDesk() {
  const data = useFlightsData();
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const { reps } = useAirportReps();

  return useMemo(() => {
    const flightById = new Map(data.flights.map((f) => [f.id, f]));
    // Each traveller's active seat each way, indexed once: thousands of travellers, thousands of seats
    const seat = new Map<string, Partial<Record<Direction, string>>>();
    for (const a of data.assignments) {
      if (!isActive(a)) continue;
      const f = flightById.get(a.flightId);
      if (!f) continue;
      seat.set(a.travelerId, { ...seat.get(a.travelerId), [f.direction]: a.flightId });
    }

    const clusters = allClusterIds().map((cid) => ({
      cluster: cid,
      rows: groupsOfCluster(cid).map<GroupRow>((g) => {
        const members = membersOfGroup(g, post, applications, admins);
        const mine = members.map((m) => ({ ...seat.get(m.id), other: !!data.otherMeans[m.id] }));
        const warnings: string[] = [];
        const outs = new Set(mine.map((s) => s.outbound).filter(Boolean));
        if (outs.size > 1) warnings.push(`أفراد المجموعة على ${outs.size} رحلات ذهاب`);
        const flightOut = flightOfGroup(g.clusterId, g.number, "outbound", data);
        const missing = mine.filter((s) => !s.outbound && !s.other).length;
        if (flightOut && missing) warnings.push(`${missing} بلا مقعد على رحلة المجموعة`);
        const retOnly = mine.filter((s) => s.return && !s.outbound && !s.other).length;
        if (retOnly) warnings.push(`${retOnly} على العودة دون ذهاب`);
        return { g, total: members.length, out: mine.filter((s) => s.outbound).length, back: mine.filter((s) => s.return).length, flightOut, flightBack: flightOfGroup(g.clusterId, g.number, "return", data), warnings };
      }),
    }));
    const groups = clusters.flatMap((c) => c.rows);

    // Travellers who lost their seat: last assignment cancelled or a no-show, and nothing active that way
    const seen = new Set<string>();
    const needsFlight: NeedsFlight[] = [];
    for (const a of [...data.assignments].sort((x, y) => (y.cancelledAt ?? y.assignedAt) - (x.cancelledAt ?? x.assignedAt))) {
      if (a.status !== "cancelled" && a.status !== "noShow") continue;
      const f = flightById.get(a.flightId);
      if (!f) continue;
      const key = `${a.travelerId}:${f.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // a group taken off a flight on purpose is not "lost": it shows among the groups without a flight
      const groupOff = !!a.reason?.startsWith("إزالة المجموعة من الرحلة");
      if (seat.get(a.travelerId)?.[f.direction] || data.otherMeans[a.travelerId] || groupOff) continue;
      needsFlight.push({
        t: { id: a.travelerId, name: a.name, kind: a.travelerKind, gender: a.gender, age: a.age, needs: a.needs, requestId: a.requestId, groupNumber: a.groupNumber, clusterId: a.clusterId },
        dir: f.direction,
        why: a.status === "noShow" ? `تخلّف عن ${f.flightNo}` : `أُلغي إسناده على ${f.flightNo}${a.reason ? ` — ${a.reason}` : ""}`,
      });
    }

    const seasonFiles = files.filter((f) => f.season === CURRENT_SEASON);
    const staffNoFlight = employees
      .filter((e) => inSeason(e) && !e.suspended && postingsOf(e.id, seasonFiles, places).length > 0 && !seat.get(e.id)?.outbound)
      .sort((a, b) => fullName(a).localeCompare(fullName(b), "ar"));

    const flightAlerts = data.flights.filter((f) => ["published", "full", "locked"].includes(f.status)).flatMap((f) => flightWarnings(f, data).map((w) => ({ f, w })));
    const live = data.flights.filter((f) => !["draft", "cancelled"].includes(f.status));
    const drafts = data.flights.filter((f) => f.status === "draft");
    const postponed = data.flights.filter((f) => f.status === "postponed");
    // A locked flight whose seats changed after its manifest was issued
    const stale = data.flights.filter((f) => {
      if (f.status !== "locked") return false;
      const m = data.manifests.filter((x) => x.flightId === f.id).sort((a, b) => b.version - a.version)[0];
      return !!m && data.assignments.some((a) => a.flightId === f.id && (a.assignedAt > m.issuedAt || (a.cancelledAt ?? 0) > m.issuedAt));
    });
    const inAir = data.flights.filter((f) => f.status === "departed");
    const done = data.flights.filter((f) => f.status === "departed" || f.status === "arrived");

    // Airports the season flies from or to, and who represents each
    const airports = data.airports
      .filter((a) => !a.archived && live.some((f) => f.fromId === a.id || (f.divertedToId ?? f.toId) === a.id))
      .map((a) => ({
        a,
        rep: reps[a.id] ? getStaff(reps[a.id]) : null,
        departures: live.filter((f) => f.fromId === a.id).length,
        arrivals: live.filter((f) => (f.divertedToId ?? f.toId) === a.id).length,
      }));
    const noRep = airports.filter((x) => !x.rep);

    const pilgrimStats = live.filter((f) => f.audience === "pilgrims").map((f) => seatStats(f, data.assignments));
    const seats = pilgrimStats.reduce((n, s) => n + s.pilgrimSeats, 0);
    const seated = pilgrimStats.reduce((n, s) => n + s.assignedPilgrims, 0);
    const travellers = groups.reduce((n, r) => n + r.total, 0);
    const withOut = groups.reduce((n, r) => n + r.out, 0);
    const withBack = groups.reduce((n, r) => n + r.back, 0);
    const noOut = groups.filter((r) => r.total && !r.flightOut);
    const noBack = groups.filter((r) => r.total && !r.flightBack);

    // Blockers first, then the rest; each group in the order the work is done: airports, flights, dispatch
    const alerts: Alert[] = [
      ...postponed.map((f) => ({ id: `post-${f.id}`, level: "high" as const, title: `الرحلة ${f.flightNo} مؤجلة بلا موعد جديد`, hint: `${f.postponeReason ?? ""} — ينتظر مسافروها موعدها.`, href: `/staff/flights/manage/flights?f=${f.id}`, action: "حدّد الموعد" })),
      ...(flightAlerts.length
        ? [{ id: "warn", level: "high" as const, title: `${flightAlerts.length} تنبيهات على الرحلات`, hint: flightAlerts.slice(0, 2).map((x) => `${x.f.flightNo}: ${x.w}`).join(" · "), href: "/staff/flights/manage/dispatch#alerts", action: "راجعها" }]
        : []),
      ...(needsFlight.length
        ? [{ id: "lost", level: "high" as const, title: `${needsFlight.length} مسافرين فقدوا مقاعدهم`, hint: "أُلغي إسنادهم أو تخلّفوا أو أُلغيت رحلتهم، ولا رحلة لهم الآن.", href: "/staff/flights/manage/dispatch#needs", action: "أسندهم" }]
        : []),
      ...noRep.map((x) => ({ id: `rep-${x.a.id}`, level: "work" as const, title: `${x.a.name} بلا مندوب`, hint: `${x.departures} رحلات تغادر منه و${x.arrivals} تصل إليه، ولا أحد هناك يسجل إقلاعها وهبوطها غيرك.`, href: "/staff/flights/manage", action: "أسند مندوباً" })),
      ...(drafts.length ? [{ id: "drafts", level: "work" as const, title: `${drafts.length} رحلات مسودة لم تُنشر`, hint: drafts.map((f) => f.flightNo).join("، "), href: "/staff/flights/manage/flights", action: "راجعها" }] : []),
      ...stale.map((f) => ({ id: `stale-${f.id}`, level: "work" as const, title: `كشف ركاب ${f.flightNo} تغيّر بعد إصداره`, hint: "أُسند أحد أو أُلغي إسناده بعد إقفال الرحلة.", href: `/staff/flights/manage/flights?f=${f.id}`, action: "أصدر كشفاً جديداً" })),
      ...(noOut.length ? [{ id: "no-out", level: "work" as const, title: `${noOut.length} مجموعات بلا رحلة ذهاب`, hint: `${noOut.reduce((n, r) => n + r.total, 0)} مسافراً، بعد التنسيق مع رؤساء تكتلاتها.`, href: "/staff/flights/manage/dispatch", action: "أسندها" }] : []),
      ...(noBack.length ? [{ id: "no-back", level: "work" as const, title: `${noBack.length} مجموعات بلا رحلة عودة`, hint: `${noBack.reduce((n, r) => n + r.total, 0)} مسافراً.`, href: "/staff/flights/manage/dispatch", action: "أسندها" }] : []),
      ...(staffNoFlight.length ? [{ id: "staff", level: "work" as const, title: `${staffNoFlight.length} موظفين بلا رحلة ذهاب`, hint: "مشاركون في الموسم ولهم منصب في ملف تشغيلي.", href: "/staff/flights/manage/dispatch#staff", action: "أسندهم" }] : []),
    ];

    return {
      data,
      clusters,
      groups,
      needsFlight,
      staffNoFlight,
      flightAlerts,
      live,
      drafts,
      postponed,
      stale,
      inAir,
      done,
      airports,
      noRep,
      seats,
      seated,
      travellers,
      withOut,
      withBack,
      alerts,
      high: alerts.filter((a) => a.level === "high"),
      badges: { flights: postponed.length + stale.length, dispatch: needsFlight.length, refs: noRep.length },
      clusterTotals: clusters.map((c) => ({
        cluster: c.cluster,
        name: clusterName(c.cluster),
        groups: c.rows.length,
        total: c.rows.reduce((n, r) => n + r.total, 0),
        out: c.rows.reduce((n, r) => n + r.out, 0),
        back: c.rows.reduce((n, r) => n + r.back, 0),
      })),
    };
  }, [data, post, applications, admins, employees, files, places, reps]);
}

export type FlightsDesk = ReturnType<typeof useFlightsDesk>;
