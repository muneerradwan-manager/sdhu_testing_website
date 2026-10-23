"use client";

import { ChartColumn } from "lucide-react";
import { PERM_SYSTEM, statsKey, type StatsSystem } from "@/lib/permissions";
import { Gate, PageHeader, useStaffUser } from "../_components/kit";
import { SystemStats } from "./sections";

/** A system's statistics, to whoever holds `<system>.stats.GET` */
export function StatsView({ sys }: { sys: StatsSystem }) {
  const user = useStaffUser()!;
  return (
    <Gate perms={[statsKey(sys)]}>
      <PageHeader eyebrow={PERM_SYSTEM[sys].label} icon={<ChartColumn />} title="الإحصائيات" description="أرقام هذا النظام الآن، وما ينتظر فيه. كل رقم يُدار من صفحة النظام نفسها." />
      <SystemStats sys={sys} user={user} />
    </Gate>
  );
}
