"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarDays, Siren } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { groupInfo } from "@/lib/assignment";
import { assign } from "@/lib/journey";
import { ageOf, relationLabel } from "@/lib/registry";
import { useStore, type InSeason } from "@/lib/store";
import { useNow } from "../../application/_components/post/shared";
import { PilgrimShell } from "../../_components/pilgrim-shell";
import { WHERE, dayOf } from "../_data";
import { DIET_NEEDS, type SeasonCtx } from "./ctx";
import { EmergencyModal } from "./emergency";
import { ComplaintModal } from "./meals";

const EMPTY_SEASON: InSeason = { day: 0, ratings: {}, lostReports: 0 };

/** What a page of the season gets: the day and the family, and the two ways to call for help */
export type SeasonTools = { ctx: SeasonCtx; sos: () => void; complain: () => void };

/**
 * One page of the pilgrim's season — «حالتي الآن», «أداء المناسك», «الوجبات»… — each short, each its own entry in the
 * sidebar. They share the day the pilgrim is on (chosen on «حالتي الآن», kept with his season), the family as the
 * season seats it, and the emergency button, one tap away on every one of them. Before the visa they say so.
 * `moment`: the moment of the day the page shows (only «حالتي الآن» moves through the day; the others take its first).
 */
/**
 * The season as the pilgrim lives it, for any page that shows a part of it: the day he is on (chosen on «حالتي
 * الآن», kept with his season), the moment of it, and the family as the season seats it. Nothing before the visa.
 */
export function useSeasonCtx(moment = 0): SeasonCtx | null {
  const sessionId = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const post = useStore((s) => s.post[s.sessionId ?? ""]);
  const inSeason = useStore((s) => s.inSeason[s.sessionId ?? ""]) ?? EMPTY_SEASON;
  const now = useNow(1000);
  const assignments = useMemo(() => (app ? assign(app.members, (m) => (m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender))) : []), [app]);
  if (!app || !post?.visaAt) return null;
  const day = dayOf(inSeason.day);
  const m = day.moments[Math.min(moment, day.moments.length - 1)];
  const self = assignments.find((a) => a.person.id === sessionId) ?? assignments[0];
  const elderly = [...app.members].filter((x) => ageOf(x.person) >= 69).sort((a, b) => ageOf(b.person) - ageOf(a.person))[0] ?? null;
  const companion = elderly?.companionId ? (app.members.find((x) => x.person.id === elderly.companionId) ?? null) : null;
  const special = app.members.filter((x) => x.needs.some((n) => DIET_NEEDS.includes(n)) || ageOf(x.person) >= 69);
  return { app, sessionId, day, moment: m, where: m.where, assignments, self, ratings: inSeason.ratings, now, elderly, companion, special, group: groupInfo(post.clusterId, post.groupNumber) };
}

/**
 * One page of the pilgrim's season — «حالتي الآن», «أداء المناسك», «الوجبات»… — each short, each its own entry in the
 * sidebar. They share the day the pilgrim is on, the family as the season seats it, and the emergency button, one
 * tap away on every one of them. Before the visa they say so.
 * `moment`: the moment of the day the page shows (only «حالتي الآن» moves through the day; the others take its first).
 */
export function SeasonPage({ title, subtitle, moment = 0, children }: { title: string; subtitle?: ReactNode; moment?: number; children: (t: SeasonTools) => ReactNode }) {
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const ctx = useSeasonCtx(moment);
  const [sos, setSos] = useState(false);
  const [complaint, setComplaint] = useState(false);

  if (!ctx) {
    return (
      <PilgrimShell title={title} subtitle="من صفحات موسمك: تُفتح بعد صدور التأشيرة.">
        <Card className="text-center">
          <p className="text-5xl">🛂</p>
          <p className="mt-3 font-display text-2xl font-bold text-green-dark">تُفتح صفحات الموسم بعد صدور التأشيرة</p>
          <p className="mt-2 text-lg text-ink-soft">{app ? "أكمل خطوات ما بعد القبول في «طلبي وخطواته»: التأكيد، والوثائق، والمجموعة، والتسديد، ثم التأشيرة." : "قدّم طلب حج أولاً، ثم تابع خطواته."}</p>
          <ButtonLink href={app ? "/portal/application#steps" : "/portal/apply"} size="xl" className="mt-6">
            {app ? "إلى خطوات طلبي" : "تقديم طلب"}
          </ButtonLink>
        </Card>
      </PilgrimShell>
    );
  }

  const day = ctx.day;
  const m = ctx.moment;
  const home = m.where === "home";

  return (
    <PilgrimShell
      image={day.i === 15 ? "/images/jamarat.jpg" : WHERE[m.where].image}
      title={title}
      subtitle={
        <span className="flex flex-wrap items-center gap-3">
          {subtitle}
          <Link href="/portal/season" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-base backdrop-blur hover:bg-white/25">
            <CalendarDays className="size-4 text-gold" /> {day.weekday} {day.hijri} — {WHERE[m.where].short}
          </Link>
        </span>
      }
    >
      {children({ ctx, sos: () => setSos(true), complain: () => setComplaint(true) })}

      {/* The emergency button, one tap away on every page of the season */}
      {!home && (
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          onClick={() => setSos(true)}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-maroon px-6 py-4 text-lg font-bold text-white shadow-2xl shadow-maroon/40 animate-pulse-ring"
        >
          <Siren className="size-6" /> طوارئ
        </motion.button>
      )}
      <EmergencyModal ctx={ctx} open={sos} onClose={() => setSos(false)} />
      <ComplaintModal ctx={ctx} open={complaint} onClose={() => setComplaint(false)} />
    </PilgrimShell>
  );
}

/** A page's heading inside the season: its icon, its title and a line on what it holds */
export function SeasonHeading({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-green-dark text-gold">{icon}</span>
        <div>
          <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{title}</h2>
          {text && <p className="text-sm leading-6 text-ink-soft">{text}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
