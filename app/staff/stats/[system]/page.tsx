import type { Metadata } from "next";
import { STATS_SYSTEMS, PERM_SYSTEM, type StatsSystem } from "@/lib/permissions";
import { StatsView } from "../view";

export const dynamicParams = false;

/** A page for each system with statistics of its own (lib/permissions.ts STATS_SYSTEMS) */
export function generateStaticParams() {
  return STATS_SYSTEMS.map((system) => ({ system }));
}

export async function generateMetadata({ params }: { params: Promise<{ system: string }> }): Promise<Metadata> {
  const { system } = await params;
  return { title: `إحصائيات ${PERM_SYSTEM[system]?.label ?? ""}` };
}

export default async function Page({ params }: { params: Promise<{ system: string }> }) {
  const { system } = await params;
  return <StatsView sys={system as StatsSystem} />;
}
