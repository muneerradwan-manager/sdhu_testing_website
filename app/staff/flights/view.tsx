"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, Plane, PlaneLanding, PlaneTakeoff, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABEL,
  airportOf,
  allClusterIds,
  carrierOf,
  clusterName,
  flightWarnings,
  groupsOnFlight,
  fmtClock,
  fmtGregShort,
  fmtHijriShort,
  isActive,
  seatStats,
  useFlightsData,
  type FlightStatus,
} from "@/lib/flights";
import { groupsName } from "@/lib/groups";
import { cn } from "@/lib/utils";
import { Panel } from "../_components/kit";
import { Chip, FilterSelect, SearchBox } from "../_components/ops-ui";
import { SystemRecords } from "../_components/system";
import { useFlightPanels } from "./panels";
import { SeatBar, StatusChip } from "./shared";

const STATUSES: FlightStatus[] = ["draft", "published", "full", "locked", "postponed", "departed", "arrived", "cancelled"];

/**
 * The flights tab of the flights file's management, after its airports and carriers: every flight of the season, searched and filtered,
 * each opening its sheet — seats, groups, staff, manifest, actions and its own record. A link from the
 * summary (`?f=`) opens one flight's sheet straight away. The tab's records are under the list.
 */
export function FlightsList() {
  const params = useSearchParams();
  const data = useFlightsData();
  const panels = useFlightPanels(params.get("f"));
  const [dir, setDir] = useState("");
  const [from, setFrom] = useState("");
  const [status, setStatus] = useState("");
  const [cluster, setCluster] = useState("");
  const [q, setQ] = useState("");
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

  return (
    <div className="space-y-4">
      <Panel
        icon={<Plane />}
        title="رحلات الموسم"
        action={
          <Button size="sm" variant="gold" onClick={panels.create}>
            <Plus className="size-4" /> رحلة جديدة
          </Button>
        }
        bodyClass="space-y-3"
      >
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
                  <tr key={f.id} onClick={() => panels.open(f.id)} className="cursor-pointer border-t border-white/10 transition hover:bg-white/5">
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
                        {f.audience === "staff" ? <Chip tone="gold">موظفون</Chip> : (() => { const gs = groupsOnFlight(f.id, data.groups); if (!gs.length) return <Chip tone="muted">لا مجموعات بعد</Chip>; const by = [...new Set(gs.map((g) => g.clusterId))]; return by.map((c) => <Chip key={c} tone="green">{clusterName(c)} — {groupsName(gs.filter((g) => g.clusterId === c).map((g) => g.groupNumber))}</Chip>); })()}
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

      <SystemRecords system="flights" area="flights" title="سجل الرحلات" />
      {panels.node}
    </div>
  );
}
