"use client";

import { Building2, Plane, Route } from "lucide-react";
import type { ReactNode } from "react";
import { SYSTEMS } from "@/lib/systems";
import { PageHeader } from "../_components/kit";
import { SectionTabs, SystemRecords } from "../_components/system";
import { DispatchBoard } from "./board";
import { useFlightsDesk } from "./desk";
import { useFlightPanels } from "./panels";
import { AirportReps, FlightRefs } from "./refs";

/**
 * The flights file's management: one page, a tab for each part of the work in the order it is done — what
 * the flights are built from (airports, carriers, their representatives), then the flights, then who goes
 * on them — each with its records.
 */
export function FlightsManageShell({ children }: { children: ReactNode }) {
  const desk = useFlightsDesk();
  return (
    <div>
      <PageHeader
        eyebrow={SYSTEMS.flights.label}
        title={SYSTEMS.flights.manage.label}
        icon={<Plane />}
        description="عمل الطيران كله في صفحة واحدة، بترتيب العمل: تجهّز المطارات والناقلين ومندوبيها أولاً، ثم تنشئ الرحلات، ثم تضع المجموعات والموظفين عليها. وفي كل تبويب سجلّه، وفي ورقة كل رحلة سجلّها."
      />
      <SectionTabs
        label="تبويبات إدارة الطيران"
        tabs={[
          { href: "/staff/flights/manage", label: "المطارات والناقلون", icon: <Building2 />, index: true, urgent: desk.badges.refs },
          { href: "/staff/flights/manage/flights", label: "الرحلات", icon: <Plane />, count: desk.data.flights.length, urgent: desk.badges.flights },
          { href: "/staff/flights/manage/dispatch", label: "التفويج", icon: <Route />, urgent: desk.badges.dispatch },
        ]}
      />
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
