"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Bus, Luggage, Map as MapIcon, MessageSquareWarning, Siren, Ticket as TicketIcon, UtensilsCrossed } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { assign } from "@/lib/journey";
import { ageOf, relationLabel } from "@/lib/registry";
import { actions, useStore, type InSeason } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useNow } from "../application/_components/post/shared";
import { WHERE, dayOf } from "./_data";
import { DIET_NEEDS, type SeasonCtx } from "./_components/ctx";
import { EmergencyModal } from "./_components/emergency";
import { ReturnHome } from "./_components/evaluation";
import { LostSection } from "./_components/lost";
import { ComplaintModal, MealsSection } from "./_components/meals";
import { NoticesFeed, StageRating } from "./_components/notices";
import { NowCard } from "./_components/now-card";
import { DayScrubber } from "./_components/scrubber";
import { TicketTimeline, useMyTickets, useTicketFallback } from "./_components/tickets";
import { LessonsSection, TripsSection } from "./_components/trips";

const EMPTY_SEASON: InSeason = { day: 0, ratings: {}, lostReports: 0 };

export default function SeasonPage() {
  const sessionId = useStore((s) => s.sessionId)!;
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const post = useStore((s) => s.post[s.sessionId ?? ""]);
  const inSeason = useStore((s) => s.inSeason[s.sessionId ?? ""]) ?? EMPTY_SEASON;
  const now = useNow(1000);
  const [momentIdx, setMomentIdx] = useState(0);
  const [sos, setSos] = useState(false);
  const [complaint, setComplaint] = useState(false);
  const tickets = useMyTickets(sessionId);
  useTicketFallback(tickets);

  const onDay = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(28, i));
      setMomentIdx(0);
      actions.setInSeason(sessionId, { day: next });
    },
    [sessionId],
  );

  const assignments = useMemo(() => (app ? assign(app.members, (m) => (m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender))) : []), [app]);

  if (!app || !post?.visaAt) {
    return (
      <PortalShell title="حالتي الآن" subtitle="رفيقك اليومي في الموسم.">
        <Card className="text-center">
          <p className="text-5xl">🛂</p>
          <p className="mt-3 font-display text-2xl font-bold text-green-dark">تُفتح «حالتي الآن» بعد صدور التأشيرة</p>
          <p className="mt-2 text-lg text-ink-soft">{app ? "أكمل خطوات ما بعد القبول في صفحة طلبك: التأكيد، الأوراق، المجموعة، التسديد، ثم التأشيرة." : "قدّم طلب حج أولاً، ثم تابع خطواته."}</p>
          <ButtonLink href={app ? "/portal/application#steps" : "/portal/apply"} size="xl" className="mt-6">
            {app ? "إلى خطوات طلبي" : "تقديم طلب"}
          </ButtonLink>
        </Card>
      </PortalShell>
    );
  }

  const day = dayOf(inSeason.day);
  const moment = day.moments[Math.min(momentIdx, day.moments.length - 1)];
  const where = moment.where;
  const self = assignments.find((a) => a.person.id === sessionId) ?? assignments[0];
  const elderly = [...app.members].filter((m) => ageOf(m.person) >= 69).sort((a, b) => ageOf(b.person) - ageOf(a.person))[0] ?? null;
  const companion = elderly?.companionId ? (app.members.find((m) => m.person.id === elderly.companionId) ?? null) : null;
  const special = app.members.filter((m) => m.needs.some((n) => DIET_NEEDS.includes(n)) || ageOf(m.person) >= 69);
  const ctx: SeasonCtx = { app, sessionId, day, moment, where, assignments, self, ratings: inSeason.ratings, now, elderly, companion, special };
  const returned = where === "home";
  const activeTickets = tickets.filter((t) => t.kind !== "lost" && (t.status !== "resolved" || !t.rating));

  const quick: { label: string; icon: ReactNode; onClick?: () => void; href?: string; tone?: "danger" }[] = [
    { label: "طوارئ", icon: <Siren className="size-8" />, onClick: () => setSos(true), tone: "danger" },
    { label: "شكوى", icon: <MessageSquareWarning className="size-8" />, onClick: () => setComplaint(true) },
    { label: "الوجبات", icon: <UtensilsCrossed className="size-8" />, href: "#meals" },
    { label: "الرحلات", icon: <Bus className="size-8" />, href: "#trips" },
    { label: "الدروس", icon: <BookOpen className="size-8" />, href: "#lessons" },
    { label: "خريطتي", icon: <MapIcon className="size-8" />, href: "#map" },
    { label: "المفقودات", icon: <Luggage className="size-8" />, href: "#lost" },
  ];

  return (
    <PortalShell
      wide
      image={day.i === 15 ? "/images/jamarat.jpg" : WHERE[where].image}
      title={
        <span className="flex flex-wrap items-center gap-3">
          حالتي الآن
          <span className="rounded-full bg-white/15 px-3 py-1 text-base font-normal backdrop-blur">طلب {app.number} — المجموعة 27</span>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-3">
          <Link href="/portal/application" className="inline-flex items-center gap-1 text-gold hover:underline">
            <ArrowRight className="size-4" /> ملف رحلتي
          </Link>
          <span>{app.members.map((m) => m.person.firstName).join(" • ")}</span>
        </span>
      }
    >
      <div className="space-y-8">
        <DayScrubber day={day} momentIdx={Math.min(momentIdx, day.moments.length - 1)} onDay={onDay} onMoment={setMomentIdx} />

        {/* Quick buttons */}
        <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-7 md:gap-3", returned && "hidden")}>
          {quick.map((q, i) => {
            const cls = cn(
              "flex flex-col items-center justify-center gap-2 rounded-3xl p-3 text-center text-base font-bold shadow-sm transition hover:-translate-y-1 hover:shadow-lg md:p-4 md:text-lg",
              q.tone === "danger" ? "bg-maroon text-white shadow-maroon/30 animate-pulse-ring" : "bg-white text-green-dark ring-1 ring-gold/40",
            );
            const inner = (
              <>
                {q.icon}
                {q.label}
              </>
            );
            return (
              <motion.div key={q.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={i === 0 ? "col-span-2 sm:col-span-1" : ""}>
                {q.href ? (
                  <a href={q.href} className={cn(cls, "h-full")}>
                    {inner}
                  </a>
                ) : (
                  <button type="button" onClick={q.onClick} className={cn(cls, "h-full w-full")}>
                    {inner}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={returned ? "home" : "season"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
            {returned ? (
              <>
                <StageRating ctx={ctx} />
                <ReturnHome ctx={ctx} />
              </>
            ) : (
              <>
                <div className="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
                  <NowCard ctx={ctx} />
                  <NoticesFeed ctx={ctx} />
                </div>

                <StageRating ctx={ctx} />

                {activeTickets.length > 0 && (
                  <section id="tickets" className="scroll-mt-40">
                    <h2 className="mb-4 flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
                      <span className="grid size-12 place-items-center rounded-2xl bg-maroon text-white"><TicketIcon className="size-6" /></span>
                      بلاغاتي وتذاكري
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {activeTickets.map((t) => (
                        <TicketTimeline key={t.id} ticket={t} now={now} />
                      ))}
                    </div>
                  </section>
                )}

                <MealsSection ctx={ctx} />
                <TripsSection ctx={ctx} />
                <LessonsSection ctx={ctx} />
                <LostSection ctx={ctx} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating emergency button — always one tap away */}
      <motion.button
        type="button"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring" }}
        onClick={() => setSos(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-maroon px-6 py-4 text-lg font-bold text-white shadow-2xl shadow-maroon/40 animate-pulse-ring"
      >
        <Siren className="size-6" /> طوارئ
      </motion.button>

      <EmergencyModal ctx={ctx} open={sos} onClose={() => setSos(false)} />
      <ComplaintModal ctx={ctx} open={complaint} onClose={() => setComplaint(false)} />
    </PortalShell>
  );
}
