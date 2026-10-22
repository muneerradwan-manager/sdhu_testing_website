"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, Plane, PlaneLanding, PlaneTakeoff, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { STATUS_LABEL, airportOf, allClusterIds, carrierOf, clusterName, flightWarnings, flightsActions, fmtClock, fmtGregShort, fmtHijriShort, groupsOnFlight, seatStats, useFlightsData, type Flight, type FlightStatus } from "@/lib/flights";
import { groupsName } from "@/lib/groups";
import { cn } from "@/lib/utils";
import { useCan } from "../_components/kit";
import { Chip, FilterSelect, SearchBox } from "../_components/ops-ui";
import { OperationHeader } from "../_components/system";
import { AddButton, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Title } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { FlightScreen, flightHref } from "./flight-screen";
import { useFlightForm } from "./flight-form";
import { StatusChip } from "./shared";

const STATUSES: FlightStatus[] = ["draft", "published", "full", "locked", "postponed", "departed", "arrived", "cancelled"];

/**
 * «الرحلات»: the season's flights as a list — filtered by status beside its counts, searched, each opening on
 * its number — or, from `?f=` (a link from the summary, the dispatch or another flight), that flight's own
 * screen.
 */
export function FlightsList() {
  const params = useSearchParams();
  const id = params.get("f") ?? params.get("id");
  if (id) return <FlightScreen id={id} />;
  return <List />;
}

function List() {
  const data = useFlightsData();
  const router = useRouter();
  const toast = useToast();
  const form = useFlightForm((id, created) => created && router.push(flightHref(id)));
  const may = useCan();
  const [status, setStatus] = useState<"" | FlightStatus>("");
  const [dir, setDir] = useState("");
  const [from, setFrom] = useState("");
  const [cluster, setCluster] = useState("");
  const [q, setQ] = useState("");
  const [removing, setRemoving] = useState<Flight | null>(null);

  const filtered = useMemo(
    () =>
      data.flights
        .filter((f) => !dir || f.direction === dir)
        .filter((f) => !from || f.fromId === from)
        .filter((f) => !cluster || groupsOnFlight(f.id, data.groups).some((g) => g.clusterId === cluster))
        .filter((f) => !q || `${f.flightNo} ${carrierOf(data, f.carrierId)?.name ?? ""} ${airportOf(data, f.fromId)?.city ?? ""} ${airportOf(data, f.toId)?.city ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.departAt - b.departAt),
    [data, dir, from, cluster, q],
  );
  const rows = filtered.filter((f) => !status || f.status === status);
  const count = (s: FlightStatus) => data.flights.filter((f) => f.status === s).length;

  const publish = (f: Flight) => {
    const paired = data.flights.find((x) => x.id === f.pairedFlightId);
    const r = flightsActions.publish(f.id, form.actor);
    toast(r.ok ? { title: paired?.status === "draft" ? "نُشرت الرحلتان" : "نُشرت الرحلة", body: "صارت متاحة للإسناد", tone: "success", icon: "✈️" } : { title: "لم يُنفَّذ", body: r.error, tone: "warning", icon: "⚠️" });
  };

  return (
    <div className="space-y-5">
      <OperationHeader system="flights" icon={<Plane />} />
      <Title
        action={
          may("flights.flights.POST") && (
            <AddButton onClick={form.create}>
              <Plus className="size-4" /> إضافة رحلة
            </AddButton>
          )
        }
      />

      <Segments<"" | FlightStatus>
        value={status}
        onChange={setStatus}
        label="الحالة"
        items={[{ value: "" as const, label: "الكل", count: data.flights.length }, ...STATUSES.filter((s) => count(s) > 0 || s === status).map((s) => ({ value: s, label: STATUS_LABEL[s], count: count(s), tone: s === "postponed" ? ("maroon" as const) : undefined }))]}
      />
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
        <SearchBox value={q} onChange={setQ} label="بحث في الرحلات" placeholder="رقم الرحلة، الناقل، المدينة..." />
        <FilterSelect value={dir} onChange={setDir} label="الاتجاه" all="ذهاب وعودة" options={[{ value: "outbound", label: "ذهاب" }, { value: "return", label: "عودة" }]} />
        <FilterSelect value={from} onChange={setFrom} label="مطار المغادرة" all="كل المطارات" options={data.airports.map((a) => ({ value: a.id, label: a.city }))} />
        <FilterSelect value={cluster} onChange={setCluster} label="التكتل" all="كل التكتلات" options={allClusterIds().map((c) => ({ value: c, label: clusterName(c) }))} />
      </div>

      <ListTable head={["الرحلة", "المسار", "الموعد", "المقاعد", "المجموعات", "الحالة"]} minWidth="54rem">
        {rows.map((f) => {
          const w = flightWarnings(f, data).length;
          const st = seatStats(f, data.assignments);
          const gs = groupsOnFlight(f.id, data.groups);
          return (
            <tr key={f.id} className="align-top">
              <td className="p-3">
                <span className="flex items-start gap-2">
                  <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl", f.direction === "outbound" ? "bg-green-light/20 text-green-light" : "bg-maroon/40 text-white")} aria-label={f.direction === "outbound" ? "ذهاب" : "عودة"}>
                    {f.direction === "outbound" ? <PlaneTakeoff className="size-4" /> : <PlaneLanding className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <Link href={flightHref(f.id)} className="block font-mono font-bold text-white hover:text-gold" dir="ltr">
                      {f.flightNo}
                    </Link>
                    <span className="block text-xs text-white/60">
                      {carrierOf(data, f.carrierId)?.name}
                      {f.audience === "staff" ? " — موظفون" : ""}
                    </span>
                    <RowActions>
                      <RowLink href={flightHref(f.id)}>فتح</RowLink>
                      {may("flights.flights.PUT") && ["draft", "published", "full", "locked"].includes(f.status) && <RowLink onClick={() => form.edit(f)}>تعديل البيانات</RowLink>}
                      {may("flights.flights.publish") && f.status === "draft" && <RowLink onClick={() => publish(f)}>نشر</RowLink>}
                      {may("flights.flights.DELETE") && f.status === "draft" && (
                        <RowLink danger onClick={() => setRemoving(f)}>
                          حذف
                        </RowLink>
                      )}
                    </RowActions>
                  </span>
                </span>
              </td>
              <td className="p-3">
                {airportOf(data, f.fromId)?.city} ← {airportOf(data, f.divertedToId ?? f.toId)?.city}
                {f.divertedToId && (
                  <span className="mr-1 text-xs text-gold">
                    <ArrowLeftRight className="inline size-3" /> محوّلة
                  </span>
                )}
              </td>
              <td className="p-3 text-white/85">
                <span className="block">{fmtHijriShort(f.departAt)}</span>
                <span className="block text-xs text-white/60">
                  {fmtGregShort(f.departAt)} — {fmtClock(f.departAt)}
                </span>
              </td>
              <td className="p-3 text-white/85">
                {f.audience === "staff" ? (
                  `${st.assignedStaff}/${f.capacity} موظفاً`
                ) : (
                  <>
                    {st.assignedPilgrims}/{f.capacity - f.staffReserve}
                    <span className={cn("block text-xs", st.remaining > 0 ? "text-white/60" : "text-maroon-light")}>متبقٍّ {st.remaining}</span>
                  </>
                )}
              </td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  {f.audience === "staff" ? (
                    <Chip tone="gold">موظفون</Chip>
                  ) : !gs.length ? (
                    <Chip tone="muted">لا مجموعات بعد</Chip>
                  ) : (
                    [...new Set(gs.map((g) => g.clusterId))].map((c) => (
                      <Chip key={c} tone="green">
                        {clusterName(c)} — {groupsName(gs.filter((g) => g.clusterId === c).map((g) => g.groupNumber))}
                      </Chip>
                    ))
                  )}
                </span>
              </td>
              <td className="p-3">
                <span className="flex flex-wrap items-center gap-1">
                  <StatusChip f={f} />
                  {w > 0 && (
                    <Chip tone="maroon">
                      <AlertTriangle className="size-3" /> {w}
                    </Chip>
                  )}
                </span>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && <EmptyRow cols={6}>لا رحلة تطابق التصفية.</EmptyRow>}
      </ListTable>

      <RecordsBox system="flights" area="flights" title="سجل الرحلات" />
      {form.node}

      <Modal open={!!removing} onClose={() => setRemoving(null)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {removing && (
          <div>
            <p className="font-display text-xl font-bold">
              حذف المسودة <span dir="ltr" className="font-mono">{removing.flightNo}</span>؟
            </p>
            <p className="mt-2 text-sm leading-7 text-white/75">تُحذف نهائياً، وتبقى رحلتها المقابلة إن كانت لها.</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="maroon"
                onClick={() => {
                  flightsActions.deleteDraft(removing.id, form.actor);
                  toast({ title: "حُذفت المسودة", body: removing.flightNo, tone: "success", icon: "🗑️" });
                  setRemoving(null);
                }}
              >
                <Trash2 className="size-4" /> حذف
              </Button>
              <Button variant="glass" onClick={() => setRemoving(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
