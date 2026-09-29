"use client";

import { Archive, ArchiveRestore, Building2, Plane, Plus, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { flightsActions, newFlightId, type Airport, type Carrier, type FlightsData } from "@/lib/flights";
import { Panel, logAs, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";

const INPUT = "h-11 w-full rounded-2xl border-2 border-gold/40 bg-white px-3 text-base text-ink outline-none transition focus:border-green-dark";

/** Airports and carriers: the two reference lists the flights choose from */
export function FlightRefs({ data, canEdit }: { data: FlightsData; canEdit: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [airport, setAirport] = useState<Partial<Airport> | null>(null);
  const [carrier, setCarrier] = useState<Partial<Carrier> | null>(null);
  const used = (airportId: string) => data.flights.some((f) => f.fromId === airportId || f.toId === airportId || f.divertedToId === airportId);
  const usedCarrier = (id: string) => data.flights.some((f) => f.carrierId === id);

  const saveAirport = () => {
    if (!airport?.code || !airport.name || !airport.city) return;
    const a: Airport = { id: airport.id ?? newFlightId("ap"), code: airport.code.toUpperCase().trim(), name: airport.name.trim(), city: airport.city.trim(), country: (airport.country ?? "").trim(), archived: airport.archived };
    flightsActions.saveAirport(a);
    logAs(user, { action: airport.id ? "تعديل مطار" : "إضافة مطار", target: `${a.city} (${a.code})` });
    toast({ title: airport.id ? "حُفظ المطار" : "أُضيف المطار", body: a.name, tone: "success", icon: "✈️" });
    setAirport(null);
  };
  const saveCarrier = () => {
    if (!carrier?.code || !carrier.name) return;
    const c: Carrier = { id: carrier.id ?? newFlightId("ca"), code: carrier.code.toUpperCase().trim(), name: carrier.name.trim(), phone: carrier.phone?.trim() || undefined, archived: carrier.archived };
    flightsActions.saveCarrier(c);
    logAs(user, { action: carrier.id ? "تعديل ناقل جوي" : "إضافة ناقل جوي", target: `${c.name} (${c.code})` });
    toast({ title: carrier.id ? "حُفظ الناقل" : "أُضيف الناقل", body: c.name, tone: "success", icon: "✈️" });
    setCarrier(null);
  };
  const toggleAirport = (a: Airport) => {
    if (!a.archived && used(a.id)) return toast({ title: "المطار مستعمل في رحلة", body: "لا يُؤرشف مطار عليه رحلات هذا الموسم.", tone: "warning", icon: "⚠️" });
    flightsActions.saveAirport({ ...a, archived: !a.archived });
    logAs(user, { action: a.archived ? "استعادة مطار" : "أرشفة مطار", target: `${a.city} (${a.code})` });
  };
  const toggleCarrier = (c: Carrier) => {
    if (!c.archived && usedCarrier(c.id)) return toast({ title: "الناقل مستعمل في رحلة", tone: "warning", icon: "⚠️" });
    flightsActions.saveCarrier({ ...c, archived: !c.archived });
    logAs(user, { action: c.archived ? "استعادة ناقل" : "أرشفة ناقل", target: c.name });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="المطارات" icon={<Building2 />} action={canEdit && <Button size="sm" variant="gold" onClick={() => setAirport({ country: "سوريا" })}><Plus className="size-4" /> مطار</Button>}>
        <ul className="divide-y divide-white/10">
          {data.airports.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className="w-14 shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-center font-mono text-sm font-bold text-gold" dir="ltr">{a.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-white">{a.city} <span className="font-normal text-white/60">— {a.country}</span></span>
                <span className="block truncate text-xs text-white/60">{a.name}</span>
              </span>
              {a.archived ? <Chip tone="muted">مؤرشف</Chip> : used(a.id) ? <Chip tone="green">مستعمل</Chip> : null}
              {canEdit && (
                <span className="flex gap-1">
                  <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-gold hover:bg-white/10" onClick={() => setAirport(a)}>تعديل</button>
                  <button type="button" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label={a.archived ? "استعادة" : "أرشفة"} onClick={() => toggleAirport(a)}>{a.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="الناقلون الجويون" icon={<Plane />} action={canEdit && <Button size="sm" variant="gold" onClick={() => setCarrier({})}><Plus className="size-4" /> ناقل</Button>}>
        <ul className="divide-y divide-white/10">
          {data.carriers.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="w-14 shrink-0 rounded-lg bg-white/10 px-2 py-0.5 text-center font-mono text-sm font-bold text-gold" dir="ltr">{c.code}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-white">{c.name}</span>
                <span className="block truncate text-xs text-white/60" dir="ltr">{c.phone ?? ""}</span>
              </span>
              {c.archived ? <Chip tone="muted">مؤرشف</Chip> : usedCarrier(c.id) ? <Chip tone="green">{data.flights.filter((f) => f.carrierId === c.id).length} رحلات</Chip> : null}
              {canEdit && (
                <span className="flex gap-1">
                  <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-gold hover:bg-white/10" onClick={() => setCarrier(c)}>تعديل</button>
                  <button type="button" className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label={c.archived ? "استعادة" : "أرشفة"} onClick={() => toggleCarrier(c)}>{c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Modal open={!!airport} onClose={() => setAirport(null)}>
        <h2 className="font-display text-xl font-bold text-green-dark">{airport?.id ? "تعديل مطار" : "مطار جديد"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-bold text-ink-soft">الرمز (IATA)</span><input className={INPUT} dir="ltr" value={airport?.code ?? ""} onChange={(e) => setAirport({ ...airport, code: e.target.value })} placeholder="DAM" /></label>
          <label className="block"><span className="mb-1 block text-xs font-bold text-ink-soft">المدينة</span><input className={INPUT} value={airport?.city ?? ""} onChange={(e) => setAirport({ ...airport, city: e.target.value })} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-bold text-ink-soft">اسم المطار</span><input className={INPUT} value={airport?.name ?? ""} onChange={(e) => setAirport({ ...airport, name: e.target.value })} /></label>
          <label className="block"><span className="mb-1 block text-xs font-bold text-ink-soft">الدولة</span><input className={INPUT} value={airport?.country ?? ""} onChange={(e) => setAirport({ ...airport, country: e.target.value })} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setAirport(null)}>إلغاء</Button><Button onClick={saveAirport} disabled={!airport?.code || !airport?.name || !airport?.city}><Save className="size-4" /> حفظ</Button></div>
      </Modal>
      <Modal open={!!carrier} onClose={() => setCarrier(null)}>
        <h2 className="font-display text-xl font-bold text-green-dark">{carrier?.id ? "تعديل ناقل" : "ناقل جديد"}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-xs font-bold text-ink-soft">الرمز</span><input className={INPUT} dir="ltr" value={carrier?.code ?? ""} onChange={(e) => setCarrier({ ...carrier, code: e.target.value })} placeholder="RB" /></label>
          <label className="block"><span className="mb-1 block text-xs font-bold text-ink-soft">الاسم</span><input className={INPUT} value={carrier?.name ?? ""} onChange={(e) => setCarrier({ ...carrier, name: e.target.value })} /></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-bold text-ink-soft">هاتف التنسيق</span><input className={INPUT} dir="ltr" value={carrier?.phone ?? ""} onChange={(e) => setCarrier({ ...carrier, phone: e.target.value })} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setCarrier(null)}>إلغاء</Button><Button onClick={saveCarrier} disabled={!carrier?.code || !carrier?.name}><Save className="size-4" /> حفظ</Button></div>
      </Modal>
    </div>
  );
}
