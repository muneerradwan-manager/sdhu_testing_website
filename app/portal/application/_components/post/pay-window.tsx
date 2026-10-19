"use client";

import { CalendarClock, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * A payment's window, as the demo shows it: in the real season the administration opens it on its dates, and the
 * pilgrim pays only then; here a simulation opens it now, said plainly, and the payment follows. Once open, the
 * payment shows with a line saying its window was opened by simulation.
 */
export function PayWindow({ what, when, opened, onOpen, children }: { what: string; when: string; opened: boolean; onOpen: () => void; children: ReactNode }) {
  if (!opened)
    return (
      <div className="rounded-3xl border-2 border-dashed border-gold-dark/60 bg-gold/10 p-5 md:p-6">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-maroon">
          <CalendarClock className="size-6" /> لم يحن موعد {what} بعد
        </p>
        <p className="mt-2 leading-8 text-ink-soft">
          في الموسم الفعلي تفتح الإدارة موعد {what} {when}، فتدفعها حين يُفتح ويصلك إشعار بذلك. في النسخة التجريبية تفتحه الآن بالمحاكاة لتكمل التجربة.
        </p>
        <Button className="mt-4" variant="gold" onClick={onOpen}>
          <FlaskConical className="size-4" /> محاكاة: حان موعد {what}
        </Button>
      </div>
    );
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 rounded-2xl bg-gold/15 px-4 py-2 text-sm font-semibold text-maroon">
        <FlaskConical className="size-4 shrink-0" /> محاكاة: فُتح موعد {what} للتجربة
      </p>
      {children}
    </div>
  );
}
