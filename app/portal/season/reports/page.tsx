"use client";

import { MessageSquareWarning, Siren, Ticket as TicketIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { SeasonHeading, SeasonPage } from "../_components/season-shell";
import { TicketTimeline, useMyTickets, useTicketFallback } from "../_components/tickets";

/**
 * «بلاغاتي»: calling for help — the emergency, a complaint — and every report the family sent in the season, each
 * with who took it and where it stands, the open ones first.
 */
export default function ReportsPage() {
  const sessionId = useStore((s) => s.sessionId) ?? "";
  const tickets = useMyTickets(sessionId);
  useTicketFallback(tickets);
  const mine = tickets.filter((t) => t.kind !== "lost");
  const open = mine.filter((t) => t.status !== "resolved");
  const closed = mine.filter((t) => t.status === "resolved");
  return (
    <SeasonPage title="بلاغاتي">
      {({ ctx, sos, complain }) => (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={sos} className="flex items-center gap-4 rounded-3xl bg-maroon p-5 text-right text-white shadow-lg shadow-maroon/30 transition hover:-translate-y-0.5">
              <Siren className="size-9 shrink-0" />
              <span>
                <span className="block font-display text-2xl font-bold">طوارئ</span>
                <span className="text-sm text-white/80">حالة صحية، حاج مفقود، تأخر حافلة: يصل البلاغ فوراً إلى من يعنيه.</span>
              </span>
            </button>
            <button type="button" onClick={complain} className="flex items-center gap-4 rounded-3xl bg-white p-5 text-right ring-1 ring-gold/40 transition hover:-translate-y-0.5 hover:shadow-lg">
              <MessageSquareWarning className="size-9 shrink-0 text-green-dark" />
              <span>
                <span className="block font-display text-2xl font-bold text-green-dark">شكوى</span>
                <span className="text-sm text-ink-soft">وجبة أو غرفة أو خدمة: تصل إلى المسؤول عنها، وتتابعها هنا.</span>
              </span>
            </button>
          </div>
          <section>
            <SeasonHeading icon={<TicketIcon className="size-6" />} title="بلاغاتي المفتوحة" text="ما زال عند من استلمه: تتابع مراحله هنا حتى يُغلق." />
            {open.length === 0 ? (
              <p className="rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-ink-soft">لا بلاغ مفتوحاً لعائلتك.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {open.map((t) => (
                  <TicketTimeline key={t.id} ticket={t} now={ctx.now} />
                ))}
              </div>
            )}
          </section>
          {closed.length > 0 && (
            <section>
              <SeasonHeading icon={<TicketIcon className="size-6" />} title="بلاغات أُغلقت" />
              <div className="grid gap-4 lg:grid-cols-2">
                {closed.map((t) => (
                  <TicketTimeline key={t.id} ticket={t} now={ctx.now} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </SeasonPage>
  );
}
