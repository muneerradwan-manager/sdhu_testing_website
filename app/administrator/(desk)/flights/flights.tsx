"use client";

import { motion } from "motion/react";
import { AlertTriangle, CalendarDays, Check, Info, Lock, PlaneLanding, PlaneTakeoff, Printer, Search, UserPlus, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import {
  ASSIGNMENT_LABEL,
  DIRECTION_LABEL,
  STATUS_LABEL,
  TRAVEL_LABEL,
  airportOf,
  allotmentsOf,
  carrierOf,
  clusterSeats,
  familiesOfGroup,
  flightOfGroup,
  flightsActions,
  fmtClock,
  fmtGreg,
  fmtHijri,
  fmtHijriShort,
  isActive,
  isOpenForAssignment,
  itineraryOf,
  placeOf,
  returnAirportsFor,
  teamOfGroup,
  tripLabel,
  tripProblem,
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
 * الرحلات. The flight officer (a staff member) gives each cluster its days — the flights it travels on, each
 * with the seats it holds there. The cluster's head puts his groups on them, each group whole, and adds a
 * pilgrim by hand for the rare one who travels apart from his group; the return lands where the airport he
 * took off from allows. Once the officer locks a flight its manifest is out, and only he changes it. The
 * coordinators see their groups' flights; the group head and his team see their group's two flights and
 * print the list for the airport.
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
        <LockedCard title="الرحلات تظهر بعد توزيعك على مجموعات" text="المنسق التقني للتكتل: حين يُشكَّل التكتل في المكتب ويوزّعك رئيسه على مجموعات منه، ترى هنا رحلاتها." href="/administrator/groups" cta="إدارة المجموعات" />
      </AdminShell>
    );
  }
  if (!g?.approvedAt) {
    return (
      <AdminShell image="/images/haram-2022.jpg" title="الرحلات" subtitle="رحلات الذهاب والعودة لمجموعتك أو لمجموعات تكتلك.">
        <LockedCard title="الرحلات تظهر بعد تشكيل المجموعة" text="حين تُشكَّل مجموعتك في المكتب ويضعها رئيس التكتل على رحلة، ترى هنا رحلة الذهاب ورحلة العودة لكل عائلة." href="/administrator/groups" cta="إدارة المجموعة" />
      </AdminShell>
    );
  }
  return isClusterRole(p) ? <ClusterFlights /> : <GroupFlights />;
}

type GroupStats = { g: GroupRef; families: Family[]; team: Traveler[]; members: Traveler[]; total: number; out: { n: number; flight?: Flight }; back: { n: number; flight?: Flight } };

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
        return { g, families, team, members, total: members.length, out: leg("outbound"), back: leg("return") };
      }),
    [groups, data, post, applications, admins],
  );
}

function HowItWorks({ head }: { head: boolean }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-gold/15 p-4 text-sm leading-7 text-ink ring-1 ring-gold/40">
      <Info className="mt-1 size-4 shrink-0 text-gold-dark" />
      <span>
        يعطي مسؤول الطيران في إدارة الحج التكتلَ أيام رحلاته: رحلات ذهاب من دمشق أو حلب إلى مكة المكرمة (مطار جدة) أو المدينة المنورة، ورحلات عودة، ولكل رحلة مقاعد التكتل عليها.
        {head ? " تضع أنت مجموعاتك عليها، كل مجموعة كاملة، وتضيف حاجاً بمفرده إن سافر وحده. " : " يضع رئيس التكتل المجموعات عليها، كل مجموعة كاملة، ويضيف حاجاً بمفرده إن سافر وحده. "}
        وتهبط العودة حيث يسمح مطار الذهاب: من أقلع من دمشق يعود إلى دمشق أو اللاذقية، ومن أقلع من حلب إلى حلب أو اللاذقية. ومن يُسجَّل في مجموعة بعد إسنادها يلحق برحلتها تلقائياً، وحين يقفل المسؤول الرحلة يصدر كشفها ولا تتغير إلا عنده.
      </span>
    </p>
  );
}

// ───────────────────────── Cluster head ─────────────────────────

type Dialog = { kind: "groups" | "pilgrims"; f: Flight } | null;

function ClusterFlights() {
  const admin = useAdmin()!;
  const data = useFlightsData();
  const coord = useCoordinatorPost(admin.id, admin.profile);
  const cluster = clusterViewOf(admin.profile, admin.name);
  const view = coord ? { id: coord.clusterId, name: coord.clusterName } : { id: cluster?.id ?? "", name: cluster?.name ?? "" };
  // its head places; a coordinator sees his groups' flights
  const head = !coord && isClusterRole(admin.profile);
  const own = useClusterGroupsOf(admin.profile);
  const groups: GroupRef[] = useMemo(
    () => (coord ? coord.groups : own).map((x) => ({ clusterId: view.id, clusterName: view.name, number: x.number, head: x.head, pilgrims: x.pilgrims, capacity: x.capacity })),
    [coord, own, view.id, view.name],
  );
  const stats = useGroupStats(groups, data);
  const [dialog, setDialog] = useState<Dialog>(null);
  const total = stats.reduce((n, s) => n + s.total, 0);
  const outN = stats.reduce((n, s) => n + s.out.n, 0);
  const backN = stats.reduce((n, s) => n + s.back.n, 0);
  const days = allotmentsOf(view.id, data);
  // flights the officer put some of them on outside the cluster's days
  const elsewhere = [...new Set(data.assignments.filter((a) => a.clusterId === view.id && isActive(a) && !days.some((x) => x.f.id === a.flightId) && stats.some((s) => s.g.number === a.groupNumber)).map((a) => a.flightId))]
    .map((id) => data.flights.find((f) => f.id === id))
    .filter((f): f is Flight => !!f);

  return (
    <AdminShell
      image="/images/haram-2022.jpg"
      title={coord ? "رحلات مجموعاتي" : `رحلات ${view.name}`}
      subtitle={`${coord ? `${view.name} — ` : ""}${groups.length} مجموعات — ${formatNumber(total)} حاجاً وإدارياً. ${head ? "ضع مجموعاتك على أيام رحلات تكتلك ذهاباً وعودة." : "رحلة كل مجموعة ذهاباً وعودة كما وضعها رئيس التكتل."}`}
    >
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

      <div className="mb-6"><HowItWorks head={head} /></div>

      <Card className="mb-6">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><CalendarDays className="size-6 text-gold-dark" /> أيام رحلات التكتل</h2>
        <p className="mt-1 text-sm text-ink-soft">الرحلات التي أعطاها مسؤول الطيران {view.name}، ومقاعد التكتل على كل منها.</p>
        {days.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-sand/70 p-6 text-center text-ink-soft">لم يعطِ مسؤول الطيران تكتلك أياماً بعد. حين يعطيه إياها تظهر هنا رحلات الذهاب والعودة{head ? "، فتضع مجموعاتك عليها" : ""}.</p>
        ) : (
          (["outbound", "return"] as Direction[]).map((dir) => {
            const list = days.filter((x) => x.f.direction === dir);
            return (
              <section key={dir} className="mt-5">
                <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-green-dark">
                  {dir === "outbound" ? <PlaneTakeoff className="size-5 text-gold-dark" /> : <PlaneLanding className="size-5 text-gold-dark" />}
                  {dir === "outbound" ? "الذهاب: من دمشق أو حلب إلى مكة المكرمة أو المدينة المنورة" : "العودة: إلى المدينة التي أقلع منها الحاج، أو اللاذقية"}
                  <span className="text-sm font-normal text-hint">— {list.length ? list.map((x) => fmtHijriShort(x.f.departAt)).join("، ") : "لا أيام"}</span>
                </h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  {list.map(({ f }) => (
                    <DayCard key={f.id} f={f} clusterId={view.id} data={data} head={head} onGroups={() => setDialog({ kind: "groups", f })} onPilgrims={() => setDialog({ kind: "pilgrims", f })} />
                  ))}
                  {list.length === 0 && <p className="rounded-2xl bg-sand/60 p-4 text-sm text-ink-soft lg:col-span-2">لا رحلة {DIRECTION_LABEL[dir]} لتكتلك بعد.</p>}
                </div>
              </section>
            );
          })
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Users className="size-6 text-gold-dark" /> {coord ? "مجموعاتي ورحلاتها" : "مجموعات تكتلي ورحلاتها"}</h2>
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
                        {x.flight ? <FlightChip f={x.flight} data={data} /> : <span className="text-xs font-bold text-maroon">لم تُسند بعد</span>}
                        {x.flight && x.n < s.total && <span className="mt-0.5 block text-[11px] text-gold-dark">{x.n}/{s.total} على رحلة {k === "out" ? "ذهاب" : "عودة"}</span>}
                        {!x.flight && x.n > 0 && <span className="mt-0.5 block text-[11px] text-gold-dark">{x.n} منهم فرادى على رحلات</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {elsewhere.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-xl font-bold text-green-dark">رحلات أخرى عليها من تكتلك</h2>
          <p className="mb-3 text-sm text-ink-soft">وضعهم عليها مسؤول الطيران خارج أيام التكتل، كمن تخلّف عن رحلته. تغييرها عنده.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {elsewhere.map((f) => <FlightCard key={f.id} f={f} data={data} groups={stats.filter((s) => s.out.flight?.id === f.id || s.back.flight?.id === f.id).map((s) => s.g.number)} />)}
          </div>
        </>
      )}

      {dialog?.kind === "groups" && <AssignGroups f={dialog.f} clusterId={view.id} data={data} stats={stats} onClose={() => setDialog(null)} />}
      {dialog?.kind === "pilgrims" && <AddPilgrims f={dialog.f} clusterId={view.id} data={data} stats={stats} onClose={() => setDialog(null)} />}
    </AdminShell>
  );
}

function FlightChip({ f, data }: { f: Flight; data: FlightsData }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-sand px-2 py-1 text-xs">
      <span dir="ltr" className="font-mono font-bold">{f.flightNo}</span> {fmtHijriShort(f.departAt)} {fmtClock(f.departAt)}
      <span className="text-hint">— {tripLabel(data, f)}</span>
      {f.status === "locked" && <Lock className="size-3 text-gold-dark" aria-label="مقفلة" />}
      {f.status === "postponed" && <Badge tone="maroon">مؤجلة</Badge>}
    </span>
  );
}

const statusTone = (f: Flight) => (f.status === "published" ? "green" : f.status === "locked" || f.status === "full" ? "gold" : f.status === "postponed" || f.status === "cancelled" ? "maroon" : "ink");

/** One of the cluster's days: the flight, the cluster's seats on it, its groups and the pilgrims added by hand */
function DayCard({ f, clusterId, data, head, onGroups, onPilgrims }: { f: Flight; clusterId: string; data: FlightsData; head: boolean; onGroups: () => void; onPilgrims: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const seats = clusterSeats(f, clusterId, data);
  const open = isOpenForAssignment(f);
  const actor = { name: admin.name, role: "رئيس التكتل" };
  const scope = { asCluster: clusterId };
  const legs = data.groups.filter((g) => g.active && g.flightId === f.id && g.clusterId === clusterId).sort((x, y) => x.groupNumber - y.groupNumber);
  const mine = data.assignments.filter((x) => x.flightId === f.id && x.clusterId === clusterId && isActive(x) && x.travelerKind !== "employee");
  // pilgrims on it apart from their group: their group is not on this flight
  const apart = mine.filter((x) => !legs.some((g) => g.groupNumber === x.groupNumber));
  const done = (r: { ok: true } | { ok: false; error: string }, title: string, body?: string) =>
    r.ok ? toast({ title, body, tone: "success", icon: "✈️" }) : toast({ title: "لم يُنفَّذ", body: r.error, tone: "warning", icon: "⚠️" });

  return (
    <div data-day={f.flightNo} className={cn("rounded-3xl border bg-white p-5", seats.used ? "border-gold/40" : "border-gold/25")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gold-dark">{fmtHijri(f.departAt)} — {fmtGreg(f.departAt)}</p>
          <p className="font-display text-xl font-bold text-green-dark"><span dir="ltr" className="font-mono">{f.flightNo}</span> <span className="text-sm font-normal text-hint">— {carrierOf(data, f.carrierId)?.name}</span></p>
          <p className="mt-1 font-bold">{tripLabel(data, f)} <span className="font-normal text-ink-soft">— {fmtClock(f.departAt)} ← {fmtClock(f.arriveAt)}</span></p>
          {f.direction === "return" && <p className="mt-0.5 text-xs text-hint">لمن أقلع من {homesFor(f, data)}</p>}
        </div>
        <Badge tone={statusTone(f)}>{STATUS_LABEL[f.status]}</Badge>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-ink">مقاعد تكتلك: <span className="tabular-nums">{seats.used}/{seats.quota}</span></span>
          <span className="text-hint">{seats.whole ? "الرحلة كلها لتكتلك" : "مقاعدك من رحلة مشتركة"}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
          <div className={cn("h-full rounded-full", seats.used >= seats.quota ? "bg-gold-dark" : "bg-green")} style={{ width: `${Math.min(100, (seats.used / Math.max(1, seats.quota)) * 100)}%` }} />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {legs.map((g) => {
          const n = mine.filter((x) => x.groupNumber === g.groupNumber).length;
          return (
            <div key={g.id} className="flex items-center justify-between gap-2 rounded-xl bg-sand/70 px-3 py-1.5 text-sm">
              <span><span className="font-bold">{groupName(g.groupNumber)}</span> <span className="text-xs text-hint">— {n} مسافراً</span></span>
              {head && open && (
                <button type="button" aria-label={`إزالة ${groupName(g.groupNumber)} عن الرحلة`} className="rounded-lg p-1 text-maroon hover:bg-maroon/10" onClick={() => done(flightsActions.unassignGroup(g.id, actor, undefined, scope), `أُزيلت ${groupName(g.groupNumber)} عن ${f.flightNo}`, "صارت بحاجة إلى رحلة في هذا الاتجاه")}>
                  <X className="size-4" />
                </button>
              )}
            </div>
          );
        })}
        {apart.length > 0 && (
          <div className="rounded-xl border border-dashed border-gold/50 px-3 py-2 text-sm">
            <p className="mb-1 text-xs font-bold text-gold-dark">فرادى خارج رحلة مجموعتهم ({apart.length})</p>
            <ul className="space-y-1">
              {apart.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2">
                  <span>{x.name} <span className="text-xs text-hint">— {x.groupNumber !== undefined ? groupName(x.groupNumber) : ""}</span></span>
                  {head && open && (
                    <button type="button" aria-label={`إزالة ${x.name} عن الرحلة`} className="rounded-lg p-1 text-maroon hover:bg-maroon/10" onClick={() => done(flightsActions.unassign([x.id], actor, "أزاله رئيس التكتل", scope), `أُزيل ${x.name} عن ${f.flightNo}`)}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {legs.length === 0 && apart.length === 0 && <p className="text-sm text-hint">لا أحد من تكتلك عليها بعد.</p>}
      </div>

      {f.status === "postponed" && <p className="mt-3 text-sm text-maroon">مؤجلة: {f.postponeReason}. تبقى المجموعات عليها حتى الموعد الجديد.</p>}
      {f.groundLegs.map((l, i) => <p key={i} className="mt-2 text-sm text-maroon">بعد الهبوط: {l.buses} حافلات من {l.from} إلى {l.to}</p>)}

      {head &&
        (open ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={onGroups} disabled={seats.remaining === 0}><Users className="size-4" /> إسناد مجموعات</Button>
            <Button size="sm" variant="outline" onClick={onPilgrims} disabled={seats.remaining === 0}><UserPlus className="size-4" /> إضافة حجاج</Button>
            {seats.remaining === 0 && <span className="self-center text-xs text-gold-dark">امتلأت مقاعد تكتلك عليها</span>}
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-hint"><Lock className="size-3.5" /> {f.status === "locked" ? "مقفلة: صدر كشف ركابها، وأي تغيير عليها عند مسؤول الطيران." : `الرحلة ${STATUS_LABEL[f.status]}: التغيير عند مسؤول الطيران.`}</p>
        ))}
    </div>
  );
}

/** The airports whose travellers this return may take home: those whose returns may land where it lands */
const homesFor = (f: Flight, data: FlightsData) =>
  data.airports
    .filter((x) => !x.archived && !x.arrivalsOnly && x.country !== "السعودية" && returnAirportsFor(data, x.id).includes(f.toId))
    .map((x) => x.city)
    .join(" أو ") || "—";

/** Why a whole group cannot go on this flight with the other half of its trip (by the group's own flight that way) */
function groupTripBlock(s: GroupStats, f: Flight, data: FlightsData) {
  const other = f.direction === "outbound" ? s.back.flight : s.out.flight;
  if (!other) return null;
  const [out, back] = f.direction === "outbound" ? [f, other] : [other, f];
  if (back.departAt <= out.arriveAt) return `عودتها ${back.flightNo} قبل وصول هذه الرحلة`;
  if (!returnAirportsFor(data, out.fromId).includes(back.toId)) return f.direction === "return" ? `أقلعت من ${airportOf(data, out.fromId)?.city}: لا تعود إلى ${airportOf(data, back.toId)?.city}` : `عودتها إلى ${airportOf(data, back.toId)?.city} لا تناسب الإقلاع من ${airportOf(data, out.fromId)?.city}`;
  return null;
}

/** Put whole groups on one of the cluster's days (and, from an outbound, on a return of its days too) */
function AssignGroups({ f, clusterId, data, stats, onClose }: { f: Flight; clusterId: string; data: FlightsData; stats: GroupStats[]; onClose: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [chosen, setChosen] = useState<number[]>([]);
  const seats = clusterSeats(f, clusterId, data);
  const outbound = f.direction === "outbound";
  // the returns of the cluster's days this outbound allows, its paired one first
  const returns = outbound
    ? allotmentsOf(clusterId, data)
        .map((x) => x.f)
        .filter((x) => x.direction === "return" && isOpenForAssignment(x) && returnAirportsFor(data, f.fromId).includes(x.toId) && x.departAt > f.arriveAt)
        .sort((x, y) => Number(y.id === f.pairedFlightId) - Number(x.id === f.pairedFlightId) || x.departAt - y.departAt)
    : [];
  const [back, setBack] = useState(() => returns[0]?.id ?? "");
  const rows = stats.map((s) => {
    const here = (outbound ? s.out.flight : s.back.flight)?.id === f.id;
    const taken = outbound ? s.out.flight : s.back.flight;
    const block = here ? "على هذه الرحلة" : taken ? `على ${taken.flightNo}` : groupTripBlock(s, f, data);
    // members already seated this way one by one keep their seats
    const n = s.members.filter((m) => !itineraryOf(m.id, data)[f.direction]).length;
    return { s, block, n };
  });
  const picked = rows.filter((r) => chosen.includes(r.s.g.number));
  const need = picked.reduce((n, r) => n + r.n, 0);
  const backFlight = data.flights.find((x) => x.id === back);
  const backNeed = picked.filter((r) => !r.s.back.flight).reduce((n, r) => n + r.s.members.filter((m) => !itineraryOf(m.id, data).return).length, 0);
  const backRoom = backFlight ? clusterSeats(backFlight, clusterId, data).remaining : 0;
  const toggle = (n: number) => setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));

  const submit = () => {
    const actor = { name: admin.name, role: "رئيس التكتل" };
    const scope = { asCluster: clusterId };
    const list = picked.map((r) => ({ ref: r.s.g, members: r.s.members }));
    const r = flightsActions.assignGroups(f.id, list, actor, undefined, scope);
    if (!r.ok) return toast({ title: "لم تُسند", body: r.error, tone: "warning", icon: "⚠️" });
    const done = [`${DIRECTION_LABEL[f.direction]}: ${f.flightNo}`];
    const toBack = list.filter((x) => !picked.find((p) => p.s.g.number === x.ref.number)?.s.back.flight);
    if (outbound && backFlight && toBack.length) {
      const rb = flightsActions.assignGroups(backFlight.id, toBack, actor, undefined, scope);
      if (rb.ok) done.push(`العودة: ${backFlight.flightNo}`);
      else toast({ title: `لم تُسند العودة ${backFlight.flightNo}`, body: rb.error, tone: "warning", icon: "⚠️" });
    }
    toast({ title: picked.length === 1 ? `أُسندت ${groupName(picked[0].s.g.number)}` : `أُسندت ${picked.length} مجموعات`, body: `${need} مسافراً — ${done.join("، ")}`, tone: "success", icon: "✈️" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} className="max-w-xl">
      <h2 className="font-display text-xl font-bold text-green-dark">إسناد مجموعات إلى <span dir="ltr" className="font-mono">{f.flightNo}</span></h2>
      <p className="mt-1 text-sm text-ink-soft">{DIRECTION_LABEL[f.direction]} {fmtHijri(f.departAt)} — {tripLabel(data, f)}. تُسند المجموعة كاملة: عائلاتها وفريقها، ومن ينضم إليها لاحقاً يلحق بها.</p>
      <p className="mt-2 text-sm font-bold text-ink">بقي من مقاعد تكتلك عليها: <span className="tabular-nums">{seats.remaining}</span></p>
      <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto">
        {rows.map(({ s, block, n }) => {
          const on = chosen.includes(s.g.number);
          return (
            <button key={s.g.number} type="button" disabled={!!block} onClick={() => toggle(s.g.number)} aria-pressed={on} className={cn("flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-right text-sm transition", block ? "cursor-not-allowed border-gold/15 opacity-55" : on ? "border-green bg-green/5" : "border-gold/30 hover:bg-sand/60")}>
              <span className="flex items-center gap-2">
                <span className={cn("grid size-5 place-items-center rounded-md border", on ? "border-green bg-green text-white" : "border-gold/50")}>{on && <Check className="size-3.5" />}</span>
                <span><span className="font-bold">{groupName(s.g.number)}</span> <span className="text-xs text-hint">— {s.g.head}</span></span>
              </span>
              <span className="text-xs text-ink-soft">{block ?? `${n} مسافراً`}</span>
            </button>
          );
        })}
      </div>
      {outbound && (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-xs font-bold text-ink-soft">وعودتها (لمن لا عودة له بعد)</span>
          <select className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3" value={back} onChange={(e) => setBack(e.target.value)}>
            <option value="">— لاحقاً —</option>
            {returns.map((x) => (
              <option key={x.id} value={x.id}>
                {x.flightNo} — {fmtHijriShort(x.departAt)} — {tripLabel(data, x)} — بقي {clusterSeats(x, clusterId, data).remaining}
              </option>
            ))}
          </select>
          {returns.length === 0 && <span className="mt-1 block text-xs text-hint">لا عودة في أيام تكتلك تناسب الإقلاع من {airportOf(data, f.fromId)?.city}.</span>}
        </label>
      )}
      <p className={cn("mt-3 text-sm", need > seats.remaining || (outbound && backFlight && backNeed > backRoom) ? "font-bold text-maroon" : "text-ink-soft")}>
        المختارون {need} مسافراً من {seats.remaining} مقعداً
        {outbound && backFlight ? ` — وعلى العودة ${backNeed} من ${backRoom}` : ""}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>رجوع</Button>
        <Button onClick={submit} disabled={!picked.length || need > seats.remaining}><Check className="size-4" /> إسناد</Button>
      </div>
    </Modal>
  );
}

/** Add pilgrims one by one: a pilgrim who travels apart from his group (moved off his seat this way if he has one) */
function AddPilgrims({ f, clusterId, data, stats, onClose }: { f: Flight; clusterId: string; data: FlightsData; stats: GroupStats[]; onClose: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const [group, setGroup] = useState<number>(stats[0]?.g.number ?? 0);
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const seats = clusterSeats(f, clusterId, data);
  const s = stats.find((x) => x.g.number === group);
  const all = stats.flatMap((x) => x.members);
  const families = s ? [...s.families.map((fam) => ({ id: fam.id, title: fam.applicant, members: fam.members })), { id: "team", title: "فريق المجموعة", members: s.team }] : [];
  const stateOf = (m: Traveler) => {
    const now = itineraryOf(m.id, data)[f.direction];
    const from = now && data.flights.find((x) => x.id === now.flightId);
    if (from?.id === f.id) return { block: "على هذه الرحلة" };
    if (from && !isOpenForAssignment(from)) return { block: `رحلته ${from.flightNo} ${STATUS_LABEL[from.status]}` };
    // the pair rule against his other half, as if he left his seat this way
    const without = { ...data, assignments: data.assignments.filter((a) => a.id !== now?.id) };
    const problem = tripProblem(m, f, without);
    if (problem) return { block: problem.replace(`${m.name}: `, "") };
    return { from };
  };
  const picked = all.filter((m) => chosen.includes(m.id));
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const submit = () => {
    const actor = { name: admin.name, role: "رئيس التكتل" };
    const scope = { asCluster: clusterId };
    const reason = "يسافر بمفرده — أضافه رئيس التكتل";
    const fresh = picked.filter((m) => !stateOf(m).from);
    const moving = picked.filter((m) => stateOf(m).from);
    if (fresh.length) {
      const r = flightsActions.assign(f.id, fresh, actor, reason, scope);
      if (!r.ok) return toast({ title: "لم تُنفَّذ الإضافة", body: r.error, tone: "warning", icon: "⚠️" });
    }
    // those with a seat this way move from it, one flight at a time
    const byFlight = new Map<string, string[]>();
    for (const m of moving) {
      const a = itineraryOf(m.id, data)[f.direction]!;
      byFlight.set(a.flightId, [...(byFlight.get(a.flightId) ?? []), a.id]);
    }
    for (const ids of byFlight.values()) {
      const r = flightsActions.move(ids, f.id, actor, reason, scope);
      if (!r.ok) return toast({ title: "لم يُنفَّذ النقل", body: r.error, tone: "warning", icon: "⚠️" });
    }
    toast({ title: `أُضيف ${picked.length === 1 ? picked[0].name : `${picked.length} حجاج`} إلى ${f.flightNo}`, body: moving.length ? `نُقل ${moving.length} من رحلتهم السابقة` : undefined, tone: "success", icon: "✈️" });
    onClose();
  };

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-green-dark">إضافة حجاج إلى <span dir="ltr" className="font-mono">{f.flightNo}</span></h2>
      <p className="mt-1 text-sm text-ink-soft">{DIRECTION_LABEL[f.direction]} {fmtHijri(f.departAt)} — {tripLabel(data, f)}. لمن يسافر وحده بعيداً عن رحلة مجموعته. من كان على رحلة {DIRECTION_LABEL[f.direction]} أخرى يُنقل منها.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select aria-label="المجموعة" className="h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3 text-sm" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
          {stats.map((x) => <option key={x.g.number} value={x.g.number}>{groupName(x.g.number)} — {x.total} فرداً</option>)}
        </select>
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-3.5 size-4 text-hint" />
          <input aria-label="بحث بالاسم" className="h-11 w-full rounded-2xl border-2 border-gold/40 pr-9 pl-3 text-sm" placeholder="بحث بالاسم" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-gold/25">
        {families.map((fam) => {
          const members = fam.members.filter((m) => !q.trim() || m.name.includes(q.trim()));
          if (!members.length) return null;
          return (
            <div key={fam.id}>
              <p className="sticky top-0 bg-sand px-3 py-1.5 text-xs font-bold text-green-dark">{fam.title}</p>
              {members.map((m) => {
                const st = stateOf(m);
                const on = chosen.includes(m.id);
                return (
                  <button key={m.id} type="button" disabled={!!st.block} onClick={() => toggle(m.id)} aria-pressed={on} className={cn("flex w-full items-center justify-between gap-3 border-t border-gold/10 px-3 py-2 text-right text-sm", st.block ? "cursor-not-allowed opacity-55" : on ? "bg-green/5" : "hover:bg-sand/50")}>
                    <span className="flex items-center gap-2">
                      <span className={cn("grid size-5 place-items-center rounded-md border", on ? "border-green bg-green text-white" : "border-gold/50")}>{on && <Check className="size-3.5" />}</span>
                      {m.name}
                    </span>
                    <span className="text-xs text-ink-soft">{st.block ?? (st.from ? `يُنقل من ${st.from.flightNo}` : `بلا رحلة ${DIRECTION_LABEL[f.direction]}`)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className={cn("mt-3 text-sm", picked.length > seats.remaining ? "font-bold text-maroon" : "text-ink-soft")}>المختارون {picked.length} من {seats.remaining} مقعداً باقية لتكتلك على الرحلة</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>رجوع</Button>
        <Button onClick={submit} disabled={!picked.length || picked.length > seats.remaining}><UserPlus className="size-4" /> إضافة</Button>
      </div>
    </Modal>
  );
}

function FlightCard({ f, data, groups }: { f: Flight; data: FlightsData; groups?: number[] }) {
  return (
    <div className="rounded-3xl border border-gold/30 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-gold-dark">{f.direction === "outbound" ? "رحلة الذهاب" : "رحلة العودة"}</p>
          <p className="font-display text-xl font-bold text-green-dark"><span dir="ltr" className="font-mono">{f.flightNo}</span> <span className="text-sm font-normal text-hint">— {carrierOf(data, f.carrierId)?.name}</span></p>
          <p className="mt-1 font-bold">{placeOf(airportOf(data, f.fromId))} ← {placeOf(airportOf(data, f.divertedToId ?? f.toId))}{f.divertedToId && <span className="mr-2 text-xs text-maroon">محوّلة</span>}</p>
          <p className="text-sm text-ink-soft">{fmtHijri(f.departAt)} — {fmtGreg(f.departAt)} — {fmtClock(f.departAt)}</p>
          {f.gathering && <p className="mt-1 text-xs text-hint">التجمّع: {f.gathering}</p>}
        </div>
        <Badge tone={statusTone(f)}>{STATUS_LABEL[f.status]}</Badge>
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
    <AdminShell image="/images/haram-2022.jpg" title={`رحلات ${groupName(g.number)}`} subtitle="رحلة الذهاب ورحلة العودة للمجموعة كلها، كما وضعها رئيس التكتل على أيام تكتله. اطبع الكشف ليوم المطار.">
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {legs.map((f) => <FlightCard key={f.id} f={f} data={data} />)}
        {legs.length === 0 && <p className="rounded-3xl border border-gold/30 bg-white p-8 text-center text-ink-soft md:col-span-2">لم توضع مجموعتك على رحلة بعد. يضعها رئيس التكتل على أحد أيام رحلات تكتله، ويصلك إشعار حين تُحدد.</p>}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Users className="size-6 text-gold-dark" /> كشف المجموعة</h2>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> طباعة</Button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{s.total} فرداً: {s.out.n} على رحلة ذهاب، {s.back.n} على رحلة عودة. من يسافر وحده تظهر رحلته في سطره.</p>
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
              return <td key={d} className="p-2 text-xs">{f ? <><span dir="ltr" className="font-mono font-bold">{f.flightNo}</span> {fmtHijriShort(f.departAt)} {fmtClock(f.departAt)} <span className="text-hint">({ASSIGNMENT_LABEL[a!.status]})</span><span className="block text-[11px] text-hint">{tripLabel(data, f)}</span></> : <span className="text-hint">—</span>}</td>;
            })}
            <td className="p-2 text-xs"><Badge tone={it.status === "none" ? "maroon" : it.status === "complete" ? "green" : "gold"}>{TRAVEL_LABEL[it.status]}</Badge></td>
          </tr>
        );
      })}
    </>
  );
}
