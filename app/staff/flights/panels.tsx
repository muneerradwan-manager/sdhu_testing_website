"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { DIRECTION_LABEL, flightsActions, isActive, seatStats, useFlightsData, type Actor, type Flight } from "@/lib/flights";
import { useStaffUser } from "../_components/kit";
import { FlightDrawer } from "./flight-drawer";
import { FlightForm, draftOf, emptyFlight, toFlights, type FlightDraft } from "./flight-form";

/**
 * A flight's sheet and its form, for any tab of the management page: the list, the dispatch board, or a
 * link from the summary (`?f=`) opens the same sheet, and editing from it opens the same form.
 */
export function useFlightPanels(initial: string | null = null) {
  const user = useStaffUser()!;
  const toast = useToast();
  const data = useFlightsData();
  const actor: Actor = { name: user.name, role: user.title };
  const [openId, setOpenId] = useState<string | null>(initial);
  const [form, setForm] = useState<FlightDraft | null>(null);
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
    const f = d.id ? data.flights.find((x) => x.id === d.id) : undefined;
    if (!f) return { pilgrims: 0, staff: 0 };
    const s = seatStats(f, data.assignments);
    return { pilgrims: s.assignedPilgrims, staff: s.assignedStaff };
  };

  const node = (
    <>
      {open && (
        <FlightDrawer
          key={open.id}
          flight={open}
          data={data}
          onClose={() => setOpenId(null)}
          onEdit={(f: Flight) => {
            setOpenId(null);
            setForm(draftOf(f));
          }}
        />
      )}
      {form && <FlightForm open onClose={() => setForm(null)} initial={form} data={data} onSave={save} assigned={assignedOn(form)} notifyCount={form.id ? data.assignments.filter((a) => a.flightId === form.id && isActive(a)).length : 0} />}
    </>
  );

  return { open: setOpenId, create: () => setForm(emptyFlight()), node, actor };
}
