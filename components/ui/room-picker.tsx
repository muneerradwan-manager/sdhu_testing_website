"use client";

import { Bed, Minus, Plus } from "lucide-react";
import { ROOM_BEDS, ROOM_LABEL, bedsOf, type RoomCounts, type RoomPrices } from "@/lib/rooms";
import { cn, formatUSD } from "@/lib/utils";

/**
 * How a request spreads over private rooms: a count for each room type, as long as every member has a bed and
 * no bed is left over (a father with two sons in one room of three, the mother with two daughters in another).
 * Shared by the costs calculator and the pilgrim's accommodation step.
 */
export function RoomPicker({
  people,
  prices,
  rooms,
  onChange,
  disabled,
  dark,
}: {
  people: number;
  prices: RoomPrices;
  rooms: RoomCounts;
  onChange: (r: RoomCounts) => void;
  disabled?: boolean;
  /** On the calculator's dark green */
  dark?: boolean;
}) {
  const beds = bedsOf(rooms);
  const left = people - beds;

  return (
    <div>
      <ul className="space-y-2">
        {[...ROOM_BEDS].reverse().map((b) => (
          <li key={b} className={cn("flex items-center gap-3 rounded-2xl border bg-white p-2.5 text-ink transition", rooms[b] ? "border-green-dark/50" : "border-gold/40")}>
            <span className="flex w-20 shrink-0 justify-center gap-0.5 text-green-dark" aria-hidden>
              {Array.from({ length: b }, (_, i) => (
                <Bed key={i} className="size-4" />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{ROOM_LABEL[b]}</span>
              <span className="block text-xs text-ink-soft">{formatUSD(prices[b])} للفرد</span>
            </span>
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`إنقاص: ${ROOM_LABEL[b]}`}
                disabled={disabled || rooms[b] === 0}
                onClick={() => onChange({ ...rooms, [b]: rooms[b] - 1 })}
                className="flex size-8 items-center justify-center rounded-xl bg-sand transition hover:bg-gold-light active:scale-90 disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center font-display text-lg font-bold tabular-nums">{rooms[b]}</span>
              <button
                type="button"
                aria-label={`زيادة: ${ROOM_LABEL[b]}`}
                disabled={disabled || beds + b > people}
                onClick={() => onChange({ ...rooms, [b]: rooms[b] + 1 })}
                className="flex size-8 items-center justify-center rounded-xl bg-sand transition hover:bg-gold-light active:scale-90 disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: people }, (_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < beds ? (dark ? "bg-gold" : "bg-green") : dark ? "bg-white/15" : "bg-ink/10")} />
          ))}
        </span>
        <span className={cn("text-xs font-bold", left === 0 ? (dark ? "text-gold" : "text-green") : dark ? "text-white/80" : "text-maroon")}>
          {left === 0 ? (people === 1 ? "سرير لك وحدك" : people === 2 ? "سريران لفردين — لكل فرد سرير" : `${people} أسرّة لـ${people} أفراد — لكل فرد سرير`) : left === 1 ? "بقي فرد واحد دون سرير" : left === 2 ? "بقي فردان دون سرير" : `بقي ${left} أفراد دون سرير`}
        </span>
      </div>
    </div>
  );
}
