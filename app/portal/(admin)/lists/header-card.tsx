"use client";

import { CalendarClock, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

/**
 * The card at the top of every tab of «القوائم» — the flights, the Tarwiya, Arafat, Mina's days, the travel to
 * Madinah, the Rawdah: what the list is, when, a button to print it, and its three numbers beside it.
 */
export function ListHeader({ title, desc, when, printLabel, onPrint, stats, warning }: { title: string; desc: ReactNode; when?: ReactNode; printLabel?: string; onPrint?: () => void; stats: { k: string; v: number | string; alert?: boolean }[]; warning?: ReactNode }) {
  return (
    <Card className="mb-6 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold text-green-dark">{title}</p>
          <p className="mt-1 text-ink-soft">{desc}</p>
          {when && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gold-dark"><CalendarClock className="size-4" /> {when}</p>}
          {onPrint && (
            <Button size="sm" variant="outline" className="mt-3" onClick={onPrint}>
              <Printer className="size-4" /> {printLabel}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {stats.map((s) => (
            <div key={s.k} className="rounded-2xl bg-sand/70 px-4 py-2">
              <p className={`font-display text-2xl font-bold tabular-nums ${s.alert ? "text-maroon" : "text-green-dark"}`}>{typeof s.v === "number" ? formatNumber(s.v) : s.v}</p>
              <p className="text-xs text-hint">{s.k}</p>
            </div>
          ))}
        </div>
      </div>
      {warning && <p className="mt-3 rounded-2xl bg-maroon/5 px-4 py-2 text-sm font-semibold text-maroon">{warning}</p>}
    </Card>
  );
}
