"use client";

import { motion } from "motion/react";
import { AlertTriangle, CalendarDays, Info, Lock, PlaneLanding, PlaneTakeoff, Printer, UserPlus, Users, X } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { PrintSheet } from "@/components/print/print-sheet";
import { PrintDocument, PrintSection, PrintTable, PrintTick } from "@/components/print/print-document";
import { ListHeader } from "../lists/header-card";
import { PeoplePicker, type PickGroup } from "../lists/people-picker";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
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
import { AdminShell, LockedCard, ViewOnlyNote } from "@/app/administrator/_components/ui";
import { useAdminScope, viewOnlyText } from "@/app/administrator/_lib/scope";
import { isClusterRole, isTechCoordinator, useAdmin } from "@/app/administrator/_lib/admin";
import { clusterViewOf } from "@/app/administrator/_lib/cluster";
import { useClusterGroupsOf } from "@/app/administrator/_lib/formation";
import { useCoordinatorPost } from "@/app/administrator/_lib/coordinators";

/**
 * الرحلات. The flight officer (a staff member) gives each cluster its days — the flights it travels on, each
 * with the seats it holds there. Each technical coordinator puts the groups sorted to him on them, each group
 * whole, and adds a pilgrim by hand for the rare one who travels apart from his group; the return lands where
 * the airport he took off from allows. Once the officer locks a flight its manifest is out, and only he changes
 * it. The cluster's head, its assistant and its accountant follow every group's flights; the group head and his
 * team see their group's two flights and print the list for the airport.
 */
/**
 * The flights are a tab of «القوائم» (embedded: no page around them, their title a heading); /portal/flights
 * leads there.
 */
const Embedded = createContext(false);
function Shell({ title, subtitle, children }: ComponentProps<typeof AdminShell>) {
  const embedded = useContext(Embedded);
  if (!embedded) return <AdminShell image="/images/haram-2022.jpg" title={title} subtitle={subtitle}>{children}</AdminShell>;
  // A tab of «القوائم»: its header is the tabs' own card (ListHeader), drawn by each view
  return <div>{children}</div>;
}

export function AdminFlights({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <Embedded.Provider value={embedded}>
      <Flights />
    </Embedded.Provider>
  );
}

function Flights() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const g = p?.group;
  const coord = useCoordinatorPost(admin.id, p);
  // Whoever works in groups he does not head — the coordinator, the guide or the assistant in a group's seat, the
  // cluster's female guide or assistant — sees the flights of the groups he works in
  if (coord && !p?.group?.approvedAt) {
    return coord.groups.length ? (
      <ClusterFlights />
    ) : (
      <Shell title="الرحلات" subtitle="رحلات الذهاب والعودة للمجموعات التي تعمل فيها.">
        <LockedCard title="الرحلات تظهر بعد مكانك في مجموعة" text={isTechCoordinator(p) ? "المنسق التقني للتكتل: حين يُشكَّل التكتل في المكتب ويوزّعك رئيسه على مجموعات منه، ترى هنا رحلاتها." : "حين يُجلسك المكتب في مقعد في مجموعة، أو يوزّعك رئيس التكتل على مجموعات منه، ترى هنا رحلاتها."} href="/portal/groups" cta="إدارة المجموعات" />
      </Shell>
    );
  }
  if (!g?.approvedAt) {
    return (
      <Shell title="الرحلات" subtitle="رحلات الذهاب والعودة لمجموعتك أو لمجموعات تكتلك.">
        <LockedCard title="الرحلات تظهر بعد تشكيل المجموعة" text="حين تُشكَّل مجموعتك في المكتب ويضعها منسقها على رحلة، ترى هنا رحلة الذهاب ورحلة العودة لكل عائلة." href="/portal/groups" cta="إدارة المجموعة" />
      </Shell>
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
        {head ? " تضع أنت مجموعاتك عليها، كل مجموعة كاملة، وتضيف حاجاً بمفرده إن سافر وحده. " : " يضع المنسق التقني مجموعاته عليها، كل مجموعة كاملة، ويضيف حاجاً بمفرده إن سافر وحده. "}
        وتهبط العودة حيث يسمح مطار الذهاب: من أقلع من دمشق يعود إلى دمشق أو اللاذقية، ومن أقلع من حلب إلى حلب أو اللاذقية. ومن يُسجَّل في مجموعة بعد إسنادها يلحق برحلتها تلقائياً، وحين يقفل المسؤول الرحلة يصدر كشفها ولا تتغير إلا عنده.
      </span>
    </p>
  );
}

// ───────────────────────── Cluster head ─────────────────────────

type Dialog = { kind: "add"; f: Flight } | null;

function ClusterFlights() {
  const admin = useAdmin()!;
  const data = useFlightsData();
  const coord = useCoordinatorPost(admin.id, admin.profile);
  const cluster = clusterViewOf(admin.profile, admin.name);
  const view = coord ? { id: coord.clusterId, name: coord.clusterName } : { id: cluster?.id ?? "", name: cluster?.name ?? "" };
  // The coordinator places his groups; the cluster's head, its assistant and its accountant follow them
  const scope = useAdminScope();
  const head = scope.kind === "tech";
  const own = useClusterGroupsOf(admin.profile);
  const groups: GroupRef[] = useMemo(
    () => (coord ? coord.groups : own).map((x) => ({ clusterId: view.id, clusterName: view.name, number: x.number, head: x.head, pilgrims: x.pilgrims, capacity: x.capacity })),
    [coord, own, view.id, view.name],
  );
  const stats = useGroupStats(groups, data);
  const [dialog, setDialog] = useState<Dialog>(null);
  // What goes to paper: one flight's list, or every day's
  const [printing, setPrinting] = useState<string | null>(null);
  const print = (flightId: string | null) => {
    flushSync(() => setPrinting(flightId));
    window.print();
  };
  const total = stats.reduce((n, s) => n + s.total, 0);
  const outN = stats.reduce((n, s) => n + s.out.n, 0);
  const backN = stats.reduce((n, s) => n + s.back.n, 0);
  const days = allotmentsOf(view.id, data);
  const embedded = useContext(Embedded);
  // flights the officer put some of them on outside the cluster's days
  const elsewhere = [...new Set(data.assignments.filter((a) => a.clusterId === view.id && isActive(a) && !days.some((x) => x.f.id === a.flightId) && stats.some((s) => s.g.number === a.groupNumber)).map((a) => a.flightId))]
    .map((id) => data.flights.find((f) => f.id === id))
    .filter((f): f is Flight => !!f);

  return (
    <Shell
      title={coord ? (coord.groups.length === 1 ? `رحلات ${groupName(coord.groups[0].number)}` : "رحلات مجموعاتي") : `رحلات ${view.name}`}
      subtitle={`${coord ? `${view.name} — ` : ""}${groups.length} مجموعات — ${formatNumber(total)} حاجاً وإدارياً. ${head ? "ضع مجموعاتك على أيام رحلات تكتلك ذهاباً وعودة." : "رحلة كل مجموعة ذهاباً وعودة كما وضعها منسقها."}`}
    >
      {embedded ? (
        <ListHeader
          title="الطيران"
          desc={`رحلات الذهاب والعودة لـ${coord ? (coord.groups.length === 1 ? groupName(coord.groups[0].number) : "مجموعاتك") : view.name}: ${groups.length} مجموعات. ${head ? "ضع مجموعاتك على أيام رحلات تكتلك." : "رحلة كل مجموعة كما وضعها منسقها."}`}
          when={days.length ? `أيام رحلات التكتل: ${days.map((x) => fmtHijriShort(x.f.departAt)).join("، ")}` : "لم يعطِ مسؤول الطيران التكتل أياماً بعد"}
          printLabel="طباعة كشوف الرحلات"
          onPrint={days.length ? () => print(null) : undefined}
          stats={[
            { k: "حجاج وإداريون", v: total },
            { k: "على رحلة ذهاب", v: outN },
            { k: "على رحلة عودة", v: backN },
          ]}
          warning={total - outN > 0 ? `${formatNumber(total - outN)} بلا رحلة ذهاب بعد.` : undefined}
        />
      ) : (
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
      )}

      {scope.viewOnly && <ViewOnlyNote>{viewOnlyText(scope, "إسناد المجموعات إلى الرحلات", true)}</ViewOnlyNote>}
      <div className="mb-6"><HowItWorks head={head} /></div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><CalendarDays className="size-6 text-gold-dark" /> أيام رحلات التكتل</h2>
          {days.length > 0 && !embedded && (
            <Button variant="outline" size="sm" onClick={() => print(null)}>
              <Printer className="size-4" /> طباعة كشوف الرحلات
            </Button>
          )}
        </div>
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
                    <DayCard key={f.id} f={f} clusterId={view.id} data={data} head={head} onPrint={() => print(f.id)} onAdd={() => setDialog({ kind: "add", f })} />
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

      <PrintSheet>
        <FlightsSheet title={`كشوف رحلات ${coord ? (coord.groups.length === 1 ? groupName(coord.groups[0].number) : "مجموعاتي") : view.name}`} cluster={view.name} flights={days.map((x) => x.f).filter((f) => !printing || f.id === printing)} clusterId={view.id} groups={stats.map((x) => x.g.number)} data={data} />
      </PrintSheet>

      {dialog?.kind === "add" && <AddTravellers f={dialog.f} clusterId={view.id} data={data} stats={stats} onClose={() => setDialog(null)} />}
    </Shell>
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
function DayCard({ f, clusterId, data, head, onAdd, onPrint }: { f: Flight; clusterId: string; data: FlightsData; head: boolean; onAdd: () => void; onPrint: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const seats = clusterSeats(f, clusterId, data);
  const open = isOpenForAssignment(f);
  const actor = { name: admin.name, role: "المنسق التقني" };
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
        <span className="flex items-center gap-1">
          <button type="button" onClick={onPrint} aria-label={`طباعة كشف ${f.flightNo}`} title={`طباعة كشف ${f.flightNo}`} className="rounded-lg p-1.5 text-green-dark hover:bg-sand">
            <Printer className="size-4" />
          </button>
          <Badge tone={statusTone(f)}>{STATUS_LABEL[f.status]}</Badge>
        </span>
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
                    <button type="button" aria-label={`إزالة ${x.name} عن الرحلة`} className="rounded-lg p-1 text-maroon hover:bg-maroon/10" onClick={() => done(flightsActions.unassign([x.id], actor, "أزاله المنسق التقني", scope), `أُزيل ${x.name} عن ${f.flightNo}`)}>
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
            <Button size="sm" onClick={onAdd} disabled={seats.remaining === 0}><UserPlus className="size-4" /> إضافة مسافرين</Button>
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

/**
 * Who travels on one of the cluster's days, in one step (the picker of «القوائم»): the groups as tabs, «الكل» to take a
 * whole group, then unticking whoever is not going. A group taken whole — every one of it without a seat this way —
 * is put on the flight as a group, so whoever joins it later follows it (and, from an outbound, on a return of the
 * cluster's days too); anyone else picked goes one by one, moved from another flight if he is on one.
 */
function AddTravellers({ f, clusterId, data, stats, onClose }: { f: Flight; clusterId: string; data: FlightsData; stats: GroupStats[]; onClose: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
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
  const backFlight = data.flights.find((x) => x.id === back);
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
  const fresh = (s: GroupStats) => s.members.filter((m) => !itineraryOf(m.id, data)[f.direction]);
  const groups: PickGroup[] = stats.map((s) => {
    const block = groupTripBlock(s, f, data);
    const families = [...s.families.map((fam) => ({ title: fam.applicant, members: fam.members })), { title: "فريق المجموعة", members: s.team }];
    return {
      number: s.g.number,
      title: groupName(s.g.number),
      sub: block ? `لا تُسند كاملة: ${block}. يُضاف أفرادها واحداً واحداً.` : `رئيسها ${s.g.head}. إن اخترتها كلها أُسندت مجموعةً، ومن ينضم إليها لاحقاً يلحق بها.`,
      people: families.flatMap((fam) =>
        fam.members.map((m) => {
          const st = stateOf(m);
          return { id: m.id, name: m.name, administrator: m.kind === "administrator", family: fam.title, blocked: st.block, note: st.from ? `يُنقل من ${st.from.flightNo}` : `بلا رحلة ${DIRECTION_LABEL[f.direction]}` };
        }),
      ),
    };
  });

  const submit = (ids: string[]) => {
    const actor = { name: admin.name, role: "المنسق التقني" };
    const scope = { asCluster: clusterId };
    // whole groups: not on a flight this way, nothing in the way, and every one of them without a seat picked
    const whole = stats.filter((s) => !(outbound ? s.out.flight : s.back.flight) && !groupTripBlock(s, f, data) && fresh(s).length > 0 && fresh(s).every((m) => ids.includes(m.id)));
    const covered = new Set(whole.flatMap((s) => fresh(s).map((m) => m.id)));
    const done: string[] = [];
    if (whole.length) {
      const list = whole.map((s) => ({ ref: s.g, members: s.members }));
      const r = flightsActions.assignGroups(f.id, list, actor, undefined, scope);
      if (!r.ok) return toast({ title: "لم تُسند", body: r.error, tone: "warning", icon: "⚠️" });
      done.push(whole.length === 1 ? `${groupName(whole[0].g.number)} كاملة` : `${whole.length} مجموعات كاملة`);
      const toBack = whole.filter((s) => !s.back.flight).map((s) => ({ ref: s.g, members: s.members }));
      if (outbound && backFlight && toBack.length) {
        const rb = flightsActions.assignGroups(backFlight.id, toBack, actor, undefined, scope);
        if (rb.ok) done.push(`وعودتها ${backFlight.flightNo}`);
        else toast({ title: `لم تُسند العودة ${backFlight.flightNo}`, body: rb.error, tone: "warning", icon: "⚠️" });
      }
    }
    // everyone else picked, one by one
    const all = stats.flatMap((x) => x.members);
    const rest = all.filter((m) => ids.includes(m.id) && !covered.has(m.id));
    const reason = "يسافر بمفرده — أضافه المنسق التقني";
    const alone = rest.filter((m) => !stateOf(m).from);
    const moving = rest.filter((m) => stateOf(m).from);
    if (alone.length) {
      const r = flightsActions.assign(f.id, alone, actor, reason, scope);
      if (!r.ok) return toast({ title: "لم تُنفَّذ الإضافة", body: r.error, tone: "warning", icon: "⚠️" });
      done.push(`${alone.length} فرادى`);
    }
    const byFlight = new Map<string, string[]>();
    for (const m of moving) {
      const a = itineraryOf(m.id, data)[f.direction]!;
      byFlight.set(a.flightId, [...(byFlight.get(a.flightId) ?? []), a.id]);
    }
    for (const list of byFlight.values()) {
      const r = flightsActions.move(list, f.id, actor, reason, scope);
      if (!r.ok) return toast({ title: "لم يُنفَّذ النقل", body: r.error, tone: "warning", icon: "⚠️" });
    }
    if (moving.length) done.push(`نُقل ${moving.length} من رحلتهم السابقة`);
    toast({ title: `أُضيف ${ids.length} مسافراً إلى ${f.flightNo}`, body: done.join(" — "), tone: "success", icon: "✈️" });
    onClose();
  };

  return (
    <PeoplePicker
      title={<>إضافة مسافرين إلى <span dir="ltr" className="font-mono">{f.flightNo}</span></>}
      subtitle={`${DIRECTION_LABEL[f.direction]} ${fmtHijri(f.departAt)} — ${tripLabel(data, f)}. اختر مجموعة من الأعلى، ثم «الكل» أو من يسافر منها.`}
      groups={groups}
      capacity={seats.remaining}
      confirm="إضافة إلى الرحلة"
      onConfirm={submit}
      onClose={onClose}
      extra={
        outbound ? (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-xs font-bold text-ink-soft">وعودة المجموعات المسندة كاملة (لمن لا عودة له بعد)</span>
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
        ) : undefined
      }
    />
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
  const embedded = useContext(Embedded);

  return (
    <Shell title={`رحلات ${groupName(g.number)}`} subtitle="رحلة الذهاب ورحلة العودة للمجموعة كلها، كما وضعها المنسق التقني على أيام تكتله. اطبع الكشف ليوم المطار.">
      {embedded && (
        <ListHeader
          title="الطيران"
          desc={`رحلة الذهاب ورحلة العودة لـ${groupName(g.number)} كلها، كما وضعها المنسق التقني على أيام تكتله. اطبع الكشف ليوم المطار.`}
          when={legs.length ? legs.map((f) => `${DIRECTION_LABEL[f.direction]}: ${fmtHijriShort(f.departAt)} ${fmtClock(f.departAt)}`).join(" — ") : "لم توضع المجموعة على رحلة بعد"}
          printLabel="طباعة كشف المجموعة"
          onPrint={() => window.print()}
          stats={[
            { k: "أفراد المجموعة", v: s.total },
            { k: "على رحلة ذهاب", v: s.out.n },
            { k: "على رحلة عودة", v: s.back.n },
          ]}
        />
      )}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {legs.map((f) => <FlightCard key={f.id} f={f} data={data} />)}
        {legs.length === 0 && <p className="rounded-3xl border border-gold/30 bg-white p-8 text-center text-ink-soft md:col-span-2">لم توضع مجموعتك على رحلة بعد. يضعها منسقها التقني على أحد أيام رحلات تكتله، ويصلك إشعار حين تُحدد.</p>}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Users className="size-6 text-gold-dark" /> كشف المجموعة</h2>
          {!embedded && <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> طباعة الكشف</Button>}
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
      <PrintSheet>
        <GroupSheet title={`كشف ${groupName(g.number)}`} rows={rows} data={data} />
      </PrintSheet>
    </Shell>
  );
}

/** The cluster's flights on paper, in the platform's printed look: each flight on a page of its own — its day, times and carrier — then its travellers of the groups shown, a line each to tick at the gate */
function FlightsSheet({ title, cluster, flights, clusterId, groups, data }: { title: string; cluster: string; flights: Flight[]; clusterId: string; groups: number[]; data: FlightsData }) {
  const onOf = (f: Flight) =>
    data.assignments
      .filter((a) => a.flightId === f.id && a.clusterId === clusterId && isActive(a) && a.travelerKind !== "employee" && a.groupNumber !== undefined && groups.includes(a.groupNumber))
      .sort((x, y) => (x.groupNumber ?? 0) - (y.groupNumber ?? 0) || x.name.localeCompare(y.name, "ar"));
  const total = flights.reduce((n, f) => n + onOf(f).length, 0);
  return (
    <PrintDocument
      title={flights.length === 1 ? `كشف الرحلة ${flights[0].flightNo}` : title}
      source={cluster}
      meta={[
        { label: "الرحلات", value: flights.length },
        { label: "المسافرون", value: total },
        { label: "المجموعات", value: groups.map(groupName).join("، ") || "—" },
      ]}
    >
      {flights.map((f, i) => {
        const on = onOf(f);
        return (
          <PrintSection
            key={f.id}
            newPage={i > 0}
            title={`${f.flightNo} — ${DIRECTION_LABEL[f.direction]} — ${tripLabel(data, f)}`}
            meta={[
              { label: "اليوم", value: `${fmtHijri(f.departAt)} — ${fmtGreg(f.departAt)}` },
              { label: "الإقلاع", value: fmtClock(f.departAt) },
              { label: "الوصول", value: fmtClock(f.arriveAt) },
              { label: "الناقل", value: carrierOf(data, f.carrierId)?.name ?? "—" },
              { label: "المسافرون", value: on.length },
            ]}
          >
            <PrintTable
              head={["#", "الاسم", "الصفة", "المجموعة", "المقعد", "يحتاج", "صعد"]}
              narrow={[0, 4, 6]}
              rows={on.map((a, n) => [n + 1, a.name, a.travelerKind === "administrator" ? "إداري" : "حاج", a.groupNumber !== undefined ? groupName(a.groupNumber) : "—", <span key="s" dir="ltr">{a.seat ?? "—"}</span>, a.needs?.join("، ") || "—", <PrintTick key="t" />])}
              empty="لا أحد عليها من هذه المجموعات."
            />
          </PrintSection>
        );
      })}
    </PrintDocument>
  );
}

/** The group's manifest on paper: family by family, each member's flight out and back, and a box to tick at the gate */
function GroupSheet({ title, rows, data }: { title: string; rows: { id: string; title: string; members: Traveler[] }[]; data: FlightsData }) {
  const fl = (id?: string) => data.flights.find((f) => f.id === id);
  const leg = (id: string, d: Direction) => {
    const f = fl(itineraryOf(id, data)[d]?.flightId);
    return f ? `${f.flightNo} — ${fmtHijriShort(f.departAt)} ${fmtClock(f.departAt)}` : "—";
  };
  let n = 0;
  const people = rows.reduce((k, r) => k + r.members.length, 0);
  return (
    <PrintDocument
      title={title}
      meta={[
        { label: "الأفراد", value: people },
        { label: "العائلات", value: rows.filter((r) => r.id !== "team").length },
      ]}
    >
      <PrintTable
        head={["#", "الاسم", "الذهاب", "العودة", "صعد"]}
        narrow={[0, 4]}
        rows={rows.flatMap((r) => [
          { band: r.title },
          ...r.members.map((m) => [++n, `${m.name}${m.needs?.length ? ` (${m.needs.join("، ")})` : ""}`, <span key="o" dir="ltr">{leg(m.id, "outbound")}</span>, <span key="r" dir="ltr">{leg(m.id, "return")}</span>, <PrintTick key="t" />]),
        ])}
      />
    </PrintDocument>
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
