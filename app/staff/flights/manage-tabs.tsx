"use client";

import { Plane } from "lucide-react";
import type { ReactNode } from "react";
import { OperationHeader, SystemRecords } from "../_components/system";
import { DispatchBoard } from "./board";
import { useFlightsDesk } from "./desk";
import { useFlightPanels } from "./panels";
import { AirportReps, FlightRefs } from "./refs";

/**
 * One operation of the flights' file: its own page from its own entry in the menu — what the flights are built
 * from (airports, carriers, their representatives), then the flights, then who goes on them — each with its
 * records.
 */
export function FlightsManageShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <OperationHeader system="flights" icon={<Plane />} />
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Groups and travellers on their flights: who goes on what, who lost a seat, which staff have none */
export function DispatchTab() {
  const desk = useFlightsDesk();
  const panels = useFlightPanels();
  return (
    <div className="space-y-6">
      <DispatchBoard desk={desk} officer actor={panels.actor} onOpenFlight={panels.open} />
      <SystemRecords system="flights" area="dispatch" title="سجل التفويج" />
      {panels.node}
    </div>
  );
}

/** What the flights are built from: the airports and carriers first, then who represents each airport */
export function RefsTab() {
  const desk = useFlightsDesk();
  return (
    <div className="space-y-6">
      <FlightRefs data={desk.data} canEdit />
      <AirportReps data={desk.data} />
      <SystemRecords system="flights" area="refs" title="سجل المطارات والناقلين" />
    </div>
  );
}
