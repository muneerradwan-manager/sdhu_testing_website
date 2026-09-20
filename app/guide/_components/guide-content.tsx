"use client";

import { Stagger, StaggerItem } from "@/components/ui/motion";
import { useGuideDays, useGuideDuas } from "@/lib/cms/content";
import { DayStepper } from "./day-stepper";
import { DuaCard } from "./dua-card";

/** أيام الحج كما رتّبها الموظف في لوحة المحتوى */
export function GuideDays() {
  const days = useGuideDays();
  if (!days.length) return null;
  return <DayStepper days={days} />;
}

/** أدعية المناسك من لوحة المحتوى */
export function GuideDuas() {
  const duas = useGuideDuas();
  if (!duas.length) return null;
  return (
    <Stagger className="grid gap-4 md:grid-cols-2">
      {duas.map((d, i) => (
        <StaggerItem key={`${d.title}-${i}`}>
          <DuaCard title={d.title} text={d.text} source={d.source} when={d.when} dark={i === 4} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
