"use client";

import { motion } from "motion/react";
import { CalendarClock, CalendarX2, PauseCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { dayTimeLabel, rangeLabel, type OperationState } from "@/lib/operations";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Can the demo move its date into this operation? Not into one the staff stopped by hand */
const jumpable = (state: OperationState) => !!state.start && (state.status === "upcoming" || state.status === "closed");

/**
 * The demo's way past an operation's dates: it moves the demo's «today» to the operation's first day, as the
 * date bar at the foot of the page does, so a tester reaches a closed step without hunting for its date.
 */
export function DemoJump({ state, className }: { state: OperationState; className?: string }) {
  if (!jumpable(state)) return null;
  return (
    <Button size="sm" variant="outline" className={cn("bg-white", className)} onClick={() => actions.setToday(state.start, state.startTime)}>
      <CalendarClock className="size-4" /> جرّبها الآن: انقل تاريخ التجربة إلى {dayTimeLabel(state.start, state.startTime)}
    </Button>
  );
}

/**
 * An operation outside its time: before its start, after its end, or stopped by the staff who control it.
 * Whatever was already done in it stays where it is; only what is new waits for it to open.
 */
export function OperationClosed({ state, text, children }: { state: OperationState; text?: ReactNode; children?: ReactNode }) {
  const Icon = state.status === "off" ? PauseCircle : state.status === "upcoming" ? CalendarClock : CalendarX2;
  const title =
    state.status === "off"
      ? `«${state.label}» موقوفة الآن`
      : state.status === "upcoming"
        ? `«${state.label}» تفتح ${dayTimeLabel(state.start, state.startTime, true)}`
        : `أُغلقت «${state.label}» ${dayTimeLabel(state.end, state.endTime, true)}`;
  const why =
    state.status === "off"
      ? "أوقفتها الإدارة بيدها، وتعود حين تفعّلها أو تعيدها إلى تواريخها."
      : state.status === "upcoming"
        ? `مدتها هذا الموسم ${rangeLabel(state.start, state.end)}، وتُفتح وحدها في يومها الأول${state.startTime ? ` الساعة ${state.startTime}` : ""}.`
        : `كانت مفتوحة ${rangeLabel(state.start, state.end)}. لا جديد فيها بعد إغلاقها إلا بقرار من الإدارة.`;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] border border-gold/30 bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-12">
      <div className="bg-pattern-dark absolute inset-0" />
      <div className="relative">
        <span className="mx-auto grid size-20 place-items-center rounded-3xl bg-sand text-gold-dark">
          <Icon className="size-9" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl leading-8 text-ink-soft">{why}</p>
        {text && <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-ink-soft">{text}</p>}
        {(children || jumpable(state)) && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {children}
            <DemoJump state={state} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
