"use client";

import { motion } from "motion/react";
import { AlertTriangle, Info, Lock, PlaneLanding, PlaneTakeoff, Printer, Users } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import {
  ASSIGNMENT_LABEL,
  STATUS_LABEL,
  TRAVEL_LABEL,
  airportOf,
  carrierOf,
  familiesOfGroup,
  flightOfGroup,
  fmtClock,
  fmtGreg,
  fmtHijri,
  fmtHijriShort,
  itineraryOf,
  teamOfGroup,
  useFlightsData,
  type Direction,
  type Family,
  type Flight,
  type FlightsData,
  type GroupRef,
  type Traveler,
} from "@/lib/flights";
import { groupName } from "@/lib/groups";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { AdminShell, LockedCard } from "../../_components/ui";
import { isClusterRole, isTechCoordinator, useAdmin } from "../../_lib/admin";
import { clusterViewOf } from "../../_lib/cluster";
import { useClusterGroupsOf } from "../../_lib/formation";
import { useCoordinatorPost } from "../../_lib/coordinators";

/**
 * الرحلات — for reading only. The flight officer (a staff member) puts whole groups on flights; the cluster
 * head asks him outside the platform when his groups should travel, and sees the result here. The group
 * head and his team see their group's two flights and print the list for the airport.
 */
export function AdminFlights() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const g = p?.group;
  const coord = useCoordinatorPost(admin.id, p);
  // The coordinator has no group: he sees the flights of the groups sorted to him
  if (isTechCoordinator(p)) {
    return coord?.groups.length ? (
      <ClusterFlights />
    ) : (
      <AdminShell image="/images/haram-2022.jpg" title="الرحلات" subtitle="رحلات الذهاب والعودة للمجموعات التي وُزّعت عليها.">
        <LockedCard title="الرحلات تظهر بعد توزيعك على مجموعات" text="المنسق التقني للتكتل: حين يدعوك رئيس تكتل ويوزّعك على مجموعات منه، ترى هنا رحلاتها." href="/administrator/groups" cta="إدارة المجموعات" />
      </AdminShell>
    );
  }
  if (!g?.approvedAt) {
    return (
      <AdminShell image="/images/haram-2022.jpg" title="الرحلات" subtitle="رحلات الذهاب والعودة لمجموعتك أو لمجموعات تكتلك.">
        <LockedCard title="الرحلات تظهر بعد اعتماد المجموعة" text="حين تُعتمد مجموعتك ويضعها مسؤول الطيران على رحلة، ترى هنا رحلة الذهاب ورحلة العودة لكل عائلة." href="/administrator/groups" cta="إدارة المجموعة" />
      </AdminShell>
    );
  }
  return isClusterRole(p) ? <ClusterFlights /> : <GroupFlights />;
}

type GroupStats = { g: GroupRef; families: Family[]; team: Traveler[]; total: number; out: { n: number; flight?: Flight }; back: { n: number; flight?: Flight } };

function useGroupStats(groups: GroupRef[], data: FlightsData): GroupStats[] {
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const admins = useStore((s) => s.admins);
  return useMemo(
    () =>
      groups.map((g) => {
        const families = familiesOfGroup(g, post, applications);
        const team = teamOfGroup(g, admins);
        const members = [...families.flatMap((f) => f.members), ...team];
        const its = members.map((m) => itineraryOf(m.id, data));
        const leg = (dir: Direction) => ({ n: its.filter((i) => i[dir]).length, flight: flightOfGroup(g.clusterId, g.number, dir, data) });
        return { g, families, team, total: members.length, out: leg("outbound"), back: leg("return") };
      }),
    [groups, data, post, applications, admins],
  );
}

function WhoAssigns() {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-gold/15 p-4 text-sm leading-7 text-ink ring-1 ring-gold/40">
      <Info className="mt-1 size-4 shrink-0 text-gold-dark" />
      <span>يضع مسؤول الطيران في إدارة الحج المجموعاتِ على الرحلات، كل مجموعة كاملة. تنسّق معه مباشرة متى تسافر مجموعاتك، ولا يُرسل طلب من المنصة. كل من يُسجَّل في المجموعة بعد إسنادها يلحق برحلتها تلقائياً.</span>
    </p>
  );
}

// ───────────────────────── Cluster head and deputy ─────────────────────────

function ClusterFlights() {
  const admin = useAdmin()!;
  const data = useFlightsData();
  const coord = useCoordinatorPost(admin.id, admin.profile);
  const cluster = clusterViewOf(admin.profile, admin.name);
  const view = coord ? { id: coord.clusterId, name: coord.clusterName } : { id: cluster?.id ?? "", name: cluster?.name ?? "" };
  const own = useClusterGroupsOf(admin.profile);
  const groups: GroupRef[] = useMemo(
    () => (coord ? coord.groups : own).map((x) => ({ clusterId: view.id, clusterName: view.name, number: x.number, head: x.head, pilgrims: x.pilgrims, capacity: x.capacity })),
    [coord, own, view.id, view.name],
  );
  const stats = useGroupStats(groups, data);
  const total = stats.reduce((n, s) => n + s.total, 0);
  const outN = stats.reduce((n, s) => n + s.out.n, 0);
  const backN = stats.reduce((n, s) => n + s.back.n, 0);
  const flights = [...new Map(stats.flatMap((s) => [s.out.flight, s.back.flight]).filter(Boolean).map((f) => [f!.id, f!])).values()].sort((a, b) => a.departAt - b.departAt);

  return (
    <AdminShell image="/images/haram-2022.jpg" title={coord ? "رحلات مجموعاتي" : `رحلات ${view.name}`} subtitle={`${coord ? `${view.name} — ` : ""}${groups.length} مجموعات — ${formatNumber(total)} حاجاً وإدارياً. رحلة كل مجموعة ذهاباً وعودة كما وضعها مسؤول الطيران.`}>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { k: "حجاج وإداريون", v: total, icon: Users },
          { k: "على رحلة ذهاب", v: outN, icon: PlaneTakeoff },
          { k: "على رحلة عودة", v: backN, icon: PlaneLanding },
          { k: "بلا رحلة ذهاب", v: total - outN, icon: AlertTriangle },
        ].map((s, i) => (
          <motion.div key={s.k} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3 rounded-3xl border border-gold/30 bg-white p-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-sand text-green-dark"><s.icon className="size-5" /></span>
            <div>
              <p className={cn("font-display text-2xl font-bold", s.k === "بلا رحلة ذهاب" && s.v > 0 ? "text-maroon" : "text-green-dark")}>{formatNumber(s.v)}</p>
              <p className="text-xs text-hint">{s.k}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mb-6"><WhoAssigns /></div>

      <Card className="mb-6">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Users className="size-6 text-gold-dark" /> مجموعات تكتلي ورحلاتها</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="text-right text-xs text-hint"><th className="p-2">المجموعة</th><th className="p-2">الأفراد</th><th className="p-2">الذهاب</th><th className="p-2">العودة</th></tr></thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.g.number} className="border-t border-gold/20">
                  <td className="p-2 font-bold text-ink">{groupName(s.g.number)} <span className="block text-xs font-normal text-hint">{s.g.head}</span></td>
                  <td className="p-2 tabular-nums">{s.total} <span className="text-xs text-hint">({s.families.length} عائلة + فريق {s.team.length})</span></td>
                  {(["out", "back"] as const).map((k) => {
                    const x = s[k];
                    return (
                      <td key={k} className="p-2">
                        {x.flight ? (
                          <span className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-sand px-2 py-1 text-xs">
                            <span dir="ltr" className="font-mono font-bold">{x.flight.flightNo}</span> {fmtHijriShort(x.flight.departAt)} {fmtClock(x.flight.departAt)}
                            {x.flight.status === "locked" && <Lock className="size-3 text-gold-dark" aria-label="مقفلة" />}
                            {x.flight.status === "postponed" && <Badge tone="maroon">مؤجلة</Badge>}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-maroon">لم تُسند بعد</span>
                        )}
                        {x.flight && x.n < s.total && <span className="mt-0.5 block text-[11px] text-gold-dark">{x.n}/{s.total} على الرحلة</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {flights.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {flights.map((f) => <FlightCard key={f.id} f={f} data={data} groups={stats.filter((s) => s.out.flight?.id === f.id || s.back.flight?.id === f.id).map((s) => s.g.number)} />)}
        </div>
      )}
    </AdminShell>
  );
}

function FlightCard({ f, data, groups }: { f: Flight; data: FlightsData; groups?: number[] }) {
  const from = airportOf(data, f.fromId);
  const to = airportOf(data, f.divertedToId ?? f.toId);
  return (
    <div className="rounded-3xl border border-gold/30 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gold-dark">{f.direction === "outbound" ? "رحلة الذهاب" : "رحلة العودة"}</p>
          <p className="font-display text-xl font-bold text-green-dark"><span dir="ltr" className="font-mono">{f.flightNo}</span> <span className="text-sm font-normal text-hint">— {carrierOf(data, f.carrierId)?.name}</span></p>
          <p className="mt-1 font-bold">{from?.city} ← {to?.city}{f.divertedToId && <span className="mr-2 text-xs text-maroon">محوّلة</span>}</p>
          <p className="text-sm text-ink-soft">{fmtHijri(f.departAt)} — {fmtGreg(f.departAt)} — {fmtClock(f.departAt)}</p>
          {f.gathering && <p className="mt-1 text-xs text-hint">التجمّع: {f.gathering}</p>}
        </div>
        <Badge tone={f.status === "published" ? "green" : f.status === "locked" ? "gold" : f.status === "postponed" || f.status === "cancelled" ? "maroon" : "ink"}>{STATUS_LABEL[f.status]}</Badge>
      </div>
      {groups && groups.length > 0 && <p className="mt-3 text-sm text-ink-soft">مجموعاتك عليها: {groups.map(groupName).join("، ")}</p>}
      {f.status === "postponed" && <p className="mt-3 text-sm text-maroon">مؤجلة: {f.postponeReason}. تبقى المجموعات عليها حتى الموعد الجديد.</p>}
      {f.groundLegs.map((l, i) => <p key={i} className="mt-2 text-sm text-maroon">بعد الهبوط: {l.buses} حافلات من {l.from} إلى {l.to}</p>)}
    </div>
  );
}

// ───────────────────────── Group head and team ─────────────────────────

function GroupFlights() {
  const admin = useAdmin()!;
  const data = useFlightsData();
  const g = admin.profile!.group!;
  const clusterId = g.clusterId ?? "al-nour";
  const ref: GroupRef = useMemo(() => ({ clusterId, clusterName: "", number: g.number, head: admin.name, pilgrims: g.number === 27 ? 44 : 42, capacity: g.capacity }), [clusterId, g.number, g.capacity, admin.name]);
  const [s] = useGroupStats([ref], data);
  const legs = [s.out.flight, s.back.flight].filter(Boolean) as Flight[];
  const rows = [...s.families.map((fam) => ({ id: fam.id, title: fam.applicant, members: fam.members })), { id: "team", title: "فريق المجموعة", members: s.team }];

  return (
    <AdminShell image="/images/haram-2022.jpg" title={`رحلات ${groupName(g.number)}`} subtitle="رحلة الذهاب ورحلة العودة للمجموعة كلها، كما وضعها مسؤول الطيران. اطبع الكشف ليوم المطار.">
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {legs.map((f) => <FlightCard key={f.id} f={f} data={data} />)}
        {legs.length === 0 && <p className="rounded-3xl border border-gold/30 bg-white p-8 text-center text-ink-soft md:col-span-2">لم توضع مجموعتك على رحلة بعد. يضعها مسؤول الطيران بالتنسيق مع رئيس التكتل، ويصلك إشعار حين تُحدد.</p>}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Users className="size-6 text-gold-dark" /> كشف المجموعة</h2>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> طباعة</Button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{s.total} فرداً: {s.out.n} على رحلة ذهاب، {s.back.n} على رحلة عودة.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-right text-xs text-hint"><th className="p-2">الاسم</th><th className="p-2">الذهاب</th><th className="p-2">العودة</th><th className="p-2">الحالة</th></tr></thead>
            <tbody>
              {rows.map((r) => <FamilyRows key={r.id} title={r.title} members={r.members} data={data} />)}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}

function FamilyRows({ title, members, data }: { title: string; members: Traveler[]; data: FlightsData }) {
  const fl = (id?: string) => data.flights.find((f) => f.id === id);
  return (
    <>
      <tr className="border-t border-gold/30 bg-sand/60"><td colSpan={4} className="p-2 font-bold text-green-dark">{title}</td></tr>
      {members.map((m) => {
        const it = itineraryOf(m.id, data);
        return (
          <tr key={m.id} className="border-t border-gold/10">
            <td className="p-2">{m.name}{m.needs?.length ? <span className="mr-2 text-xs text-maroon">{m.needs.join("، ")}</span> : null}</td>
            {(["outbound", "return"] as const).map((d) => {
              const a = it[d];
              const f = fl(a?.flightId);
              return <td key={d} className="p-2 text-xs">{f ? <><span dir="ltr" className="font-mono font-bold">{f.flightNo}</span> {fmtHijriShort(f.departAt)} {fmtClock(f.departAt)} <span className="text-hint">({ASSIGNMENT_LABEL[a!.status]})</span></> : <span className="text-hint">—</span>}</td>;
            })}
            <td className="p-2 text-xs"><Badge tone={it.status === "none" ? "maroon" : it.status === "complete" ? "green" : "gold"}>{TRAVEL_LABEL[it.status]}</Badge></td>
          </tr>
        );
      })}
    </>
  );
}
