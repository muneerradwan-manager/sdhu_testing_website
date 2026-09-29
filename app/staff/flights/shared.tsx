"use client";

import type { ReactNode } from "react";
import { STATUS_LABEL, seatStats, type Flight, type FlightAssignment, type FlightStatus } from "@/lib/flights";
import { cn, formatNumber } from "@/lib/utils";
import { Chip, type ChipTone } from "../_components/ops-ui";

export const STATUS_TONE: Record<FlightStatus, ChipTone> = {
  draft: "muted",
  published: "green",
  full: "gold",
  locked: "gold",
  departed: "green",
  arrived: "muted",
  postponed: "maroon",
  cancelled: "maroon",
};

export function StatusChip({ f }: { f: Flight }) {
  return (
    <Chip tone={STATUS_TONE[f.status]}>
      {STATUS_LABEL[f.status]}
      {f.divertedToId && " — محوّلة"}
    </Chip>
  );
}

/** Capacity bar: staff reserve on the right, assigned pilgrims, remaining on the left */
export function SeatBar({ f, assignments, compact = false }: { f: Flight; assignments: FlightAssignment[]; compact?: boolean }) {
  const s = seatStats(f, assignments);
  const total = Math.max(1, f.capacity);
  const pct = (n: number) => `${(Math.max(0, n) / total) * 100}%`;
  const staffSeats = f.audience === "staff" ? f.capacity : f.staffReserve;
  return (
    <div className={cn("min-w-0", compact ? "w-40" : "w-full")}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10" role="img" aria-label={`السعة ${f.capacity}: موظفون ${s.assignedStaff} من ${staffSeats}، حجاج ${s.assignedPilgrims}، متبقٍّ ${s.remaining}`}>
        <span className="bg-gold" style={{ width: pct(s.assignedStaff) }} />
        <span className="bg-gold/30" style={{ width: pct(staffSeats - s.assignedStaff) }} />
        <span className="bg-green-light" style={{ width: pct(s.assignedPilgrims) }} />
      </div>
      {!compact && (
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-white/70">
          <span><b className="text-gold">{formatNumber(s.assignedStaff)}</b>/{formatNumber(staffSeats)} موظفون</span>
          {f.audience === "pilgrims" && (
            <>
              <span><b className="text-green-light">{formatNumber(s.assignedPilgrims)}</b> حجاج مسندون</span>
              <span><b className={s.remaining > 0 ? "text-white" : "text-maroon-light"}>{formatNumber(s.remaining)}</b> متبقٍّ</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Stat({ label, value, tone = "white" }: { label: string; value: ReactNode; tone?: "white" | "gold" | "green" | "maroon" }) {
  const c = { white: "text-white", gold: "text-gold", green: "text-green-light", maroon: "text-maroon-light" }[tone];
  return (
    <div className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-white/10">
      <p className="text-[11px] text-white/60">{label}</p>
      <p className={cn("font-display text-xl font-bold tabular-nums", c)}>{value}</p>
    </div>
  );
}

export function download(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
