"use client";

import { AlertTriangle, ArrowLeftRight, CalendarRange, Plane, PlaneLanding, PlaneTakeoff, Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import {
  DIRECTION_LABEL,
  STATUS_LABEL,
  airportOf,
  allClusterIds,
  carrierOf,
  clusterName,
  flightWarnings,
  groupsOnFlight,
  flightsActions,
  fmtClock,
  fmtGregShort,
  fmtHijriShort,
  isActive,
  seatStats,
  useFlightsData,
  type Actor,
  type Flight,
  type FlightStatus,
} from "@/lib/flights";
import { can } from "@/lib/staff";
import { cn, formatNumber } from "@/lib/utils";
import { Gate, Kpi, PageHeader, Panel, Tabs, useStaffUser } from "../_components/kit";
import { Chip, FilterSelect, SearchBox } from "../_components/ops-ui";
import { DispatchBoard } from "./board";
import { FlightDrawer } from "./flight-drawer";
import { FlightForm, draftOf, emptyFlight, toFlights, type FlightDraft } from "./flight-form";
import { FlightRefs } from "./refs";
import { SeatBar, StatusChip } from "./shared";

export function FlightsView() {
  return (
    <Gate perms={["flights.manage", "flights.view"]}>
      <Flights />
    </Gate>
  );
}

type Tab = "flights" | "board" | "refs";
const STATUSES: FlightStatus[] = ["draft", "published", "full", "locked", "postponed", "departed", "arrived", "cancelled"];

/**
 * ملف الطيران. The officer (فريق المواصلات) creates the flights, sets their seats and shares, publishes,
 * locks and exports; the operations room records take-offs and landings; everybody with a view right
 * follows the dispatch board. Pilgrims are seated from the administrators' portal by the cluster heads.
 */
function Flights() {
  const user = useStaffUser()!;
  const toast = useToast();
  const data = useFlightsData();
  const officer = can(user, "flights.manage");
  const actor: Actor = { name: user.name, role: user.title };
  const [tab, setTab] = useState<Tab>("flights");
  const [dir, setDir] = useState("");
  const [from, setFrom] = useState("");
  const [status, setStatus] = useState("");
  const [cluster, setCluster] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<FlightDraft | null>(null);

  const rows = useMemo(
    () =>
      data.flights
        .filter((f) => !dir || f.direction === dir)
        .filter((f) => !from || f.fromId === from)
        .filter((f) => !status || f.status === status)
        .filter((f) => !cluster || groupsOnFlight(f.id, data.groups).some((g) => g.clusterId === cluster))
        .filter((f) => !q || `${f.flightNo} ${carrierOf(data, f.carrierId)?.name ?? ""} ${airportOf(data, f.fromId)?.city ?? ""} ${airportOf(data, f.toId)?.city ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.departAt - b.departAt),
    [data, dir, from, status, cluster, q],
  );

  const live = data.flights.filter((f) => !["draft", "cancelled"].includes(f.status));
  const stats = live.filter((f) => f.audience === "pilgrims").map((f) => seatStats(f, data.assignments));
  const seats = stats.reduce((n, s) => n + s.pilgrimSeats, 0);
  const assigned = stats.reduce((n, s) => n + s.assignedPilgrims, 0);
  const alerts = live.reduce((n, f) => n + flightWarnings(f, data).length, 0);
  const open = data.flights.find((f) => f.id === openId) ?? null;

  const save = (d: FlightDraft) => {
    const existing = d.id ? data.flights.find((f) => f.id === d.id) : undefined;
    const { main: f, back } = toFlights(d, existing, user.name);
    flightsActions.saveFlight(f, actor, existing, back);
    toast({ title: existing ? "حُفظت التعديلات" : back ? "حُفظت الرحلتان" : "حُفظت المسودة", body: back ? `${f.flightNo} ذهاباً و${back.flightNo} عودة — مرتبطتان` : `${f.flightNo} — ${DIRECTION_LABEL[f.direction]}`, tone: "success", icon: "✈️" });
    setForm(null);
    setOpenId(f.id);
  };
  const assignedOn = (d: FlightDraft) => {
    if (!d.id) return { pilgrims: 0, staff: 0 };
    const f = data.flights.find((x) => x.id === d.id);
    if (!f) return { pilgrims: 0, staff: 0 };
    const s = seatStats(f, data.assignments);
    return { pilgrims: s.assignedPilgrims, staff: s.assignedStaff };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={officer ? "فريق المواصلات — ملف الطيران" : "الاطلاع على الطيران"}
        icon={<Plane />}
        title="الطيران"
        description="رحلات الموسم ذهاباً وعودة، للحجاج وللموظفين. مسؤول الطيران ينشئ الرحلة (ذهاباً فقط، أو عودة فقط، أو ذهاباً وعودة معاً)، ويسند إليها الموظفين، ويضع عليها مجموعات الحجاج كاملة بعد التنسيق مع رؤساء التكتلات خارج المنصة، ثم يقفلها ويصدر كشف الركاب. وغرفة العمليات تسجّل الإقلاع والهبوط."
        actions={
          officer && (
            <Button variant="gold" onClick={() => setForm(emptyFlight())}>
              <Plus className="size-4" /> رحلة جديدة
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="رحلات الموسم" value={live.length} icon={<CalendarRange />} hint={`${live.filter((f) => f.direction === "outbound").length} ذهاب · ${live.filter((f) => f.direction === "return").length} عودة · ${data.flights.filter((f) => f.status === "draft").length} مسودة`} />
        <Kpi label="مقاعد الحجاج" value={seats} icon={<Users />} tone="teal" delay={0.05} hint={`${formatNumber(stats.reduce((n, s) => n + s.staffReserve, 0))} مقعداً محجوزاً للمرافقين`} />
        <Kpi label="مسندون" value={assigned} icon={<PlaneTakeoff />} tone="gold" delay={0.1} hint={`${formatNumber(seats - assigned)} مقعداً متبقياً`} />
        <Kpi label="تنبيهات" value={alerts} icon={<AlertTriangle />} tone="maroon" delay={0.15} hint="مجموعات بلا مرافق، عودة دون ذهاب" pulse={alerts > 0} />
      </div>

      <Tabs<Tab> id="flights-tab" value={tab} onChange={setTab} tabs={[{ value: "flights", label: "الرحلات", count: data.flights.length }, { value: "board", label: "لوحة التفويج" }, { value: "refs", label: "المطارات والناقلون" }]} />

      {tab === "flights" && (
        <Panel bodyClass="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
            <SearchBox value={q} onChange={setQ} label="بحث في الرحلات" placeholder="رقم الرحلة، الناقل، المدينة..." />
            <FilterSelect value={dir} onChange={setDir} label="الاتجاه" all="ذهاب وعودة" options={[{ value: "outbound", label: "ذهاب" }, { value: "return", label: "عودة" }]} />
            <FilterSelect value={from} onChange={setFrom} label="مطار المغادرة" all="كل المطارات" options={data.airports.map((a) => ({ value: a.id, label: a.city }))} />
            <FilterSelect value={status} onChange={setStatus} label="الحالة" all="كل الحالات" options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
            <FilterSelect value={cluster} onChange={setCluster} label="التكتل" all="كل التكتلات" options={allClusterIds().map((c) => ({ value: c, label: clusterName(c) }))} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-right text-xs text-white/60">
                  <th className="p-2 font-bold">الرحلة</th>
                  <th className="p-2 font-bold">المسار</th>
                  <th className="p-2 font-bold">الموعد</th>
                  <th className="p-2 font-bold">المقاعد</th>
                  <th className="p-2 font-bold">المجموعات</th>
                  <th className="p-2 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const w = flightWarnings(f, data).length;
                  return (
                    <tr key={f.id} onClick={() => setOpenId(f.id)} className="cursor-pointer border-t border-white/10 transition hover:bg-white/5">
                      <td className="p-2">
                        <span className="flex items-center gap-2">
                          <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", f.direction === "outbound" ? "bg-green-light/20 text-green-light" : "bg-maroon/40 text-white")}>{f.direction === "outbound" ? <PlaneTakeoff className="size-4" /> : <PlaneLanding className="size-4" />}</span>
                          <span>
                            <span className="block font-mono font-bold text-white" dir="ltr">{f.flightNo}</span>
                            <span className="block text-xs text-white/60">{carrierOf(data, f.carrierId)?.name}{f.audience === "staff" ? " — موظفون" : ""}</span>
                          </span>
                        </span>
                      </td>
                      <td className="p-2 text-white">
                        {airportOf(data, f.fromId)?.city} ← {airportOf(data, f.divertedToId ?? f.toId)?.city}
                        {f.divertedToId && <span className="mr-1 text-xs text-gold"><ArrowLeftRight className="inline size-3" /> محوّلة</span>}
                      </td>
                      <td className="p-2 text-white/85">
                        <span className="block">{fmtHijriShort(f.departAt)}</span>
                        <span className="block text-xs text-white/60">{fmtGregShort(f.departAt)} — {fmtClock(f.departAt)}</span>
                      </td>
                      <td className="p-2"><SeatBar f={f} assignments={data.assignments} compact /><span className="mt-1 block text-[11px] text-white/60">{f.audience === "staff" ? `${seatStats(f, data.assignments).assignedStaff}/${f.capacity} موظفاً` : `${seatStats(f, data.assignments).assignedPilgrims}/${f.capacity - f.staffReserve} — متبقٍّ ${seatStats(f, data.assignments).remaining}`}</span></td>
                      <td className="p-2">
                        <span className="flex flex-wrap gap-1">
                          {f.audience === "staff" ? <Chip tone="gold">موظفون</Chip> : (() => { const gs = groupsOnFlight(f.id, data.groups); if (!gs.length) return <Chip tone="muted">لا مجموعات بعد</Chip>; const by = [...new Set(gs.map((g) => g.clusterId))]; return by.map((c) => <Chip key={c} tone="green">{clusterName(c)} — {gs.filter((g) => g.clusterId === c).map((g) => g.groupNumber).join("، ")}</Chip>); })()}
                        </span>
                      </td>
                      <td className="p-2"><span className="flex items-center gap-1"><StatusChip f={f} />{w > 0 && <Chip tone="maroon"><AlertTriangle className="size-3" /> {w}</Chip>}</span></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-white/60">لا رحلة تطابق التصفية</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-white/50">{data.assignments.filter(isActive).length} إسناداً نشطاً في الموسم. اضغط الرحلة لفتحها.</p>
        </Panel>
      )}

      {tab === "board" && <DispatchBoard data={data} officer={officer} actor={actor} onOpenFlight={(id) => setOpenId(id)} />}
      {tab === "refs" && <FlightRefs data={data} canEdit={officer} />}

      {open && <FlightDrawer key={open.id} flight={open} data={data} onClose={() => setOpenId(null)} onEdit={(f: Flight) => { setOpenId(null); setForm(draftOf(f)); }} />}
      {form && <FlightForm open onClose={() => setForm(null)} initial={form} data={data} onSave={save} assigned={assignedOn(form)} notifyCount={form.id ? data.assignments.filter((a) => a.flightId === form.id && isActive(a)).length : 0} />}
    </div>
  );
}
