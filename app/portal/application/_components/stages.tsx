"use client";

import { motion } from "motion/react";
import { CalendarClock, CheckCircle2, FileCheck2, Radio, ScanSearch, Table2, Ticket, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { MONTHS, birthOf, describePick, drawTotals, mainApplicant, matchingPick, sortPicks, type PublishedDraw } from "@/lib/lottery";
import { fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { SEASON } from "@/lib/season";
import type { Application } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";

export function StageSubmitted({ app }: { app: Application }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-28 place-items-center rounded-full bg-green-light/15 text-green-light">
        <FileCheck2 className="size-14" />
      </motion.div>
      <div>
        <p className="font-display text-3xl font-bold text-green-dark">استلمنا طلبك رقم {app.number}</p>
        <p className="mt-2 text-lg leading-8 text-ink-soft">
          {app.members.length} أفراد — الإيصال <span className="font-mono font-bold" dir="ltr">{app.receipt}</span> — {app.office}
        </p>
        <p className="mt-3 flex items-center gap-2 font-semibold text-gold-dark">
          <CalendarClock className="size-5" /> {app.track === "lottery" ? "طلب في التسجيل الأولي على القرعة" : "طلب في التسجيل على القبول المباشر"} — الخطوة التالية: تدقيق البيانات، صلات القرابة والوثائق
        </p>
      </div>
    </div>
  );
}

/**
 * The registration staff review the application's data: each member's kinship to the applicant, and the documents
 * uploaded with the registration. Eligibility and the accepted ages were checked before payment, so nothing else is.
 */
export function StageChecking({ members }: { members: Member[] }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 140);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <p className="flex items-center gap-3 font-display text-2xl font-bold text-green-dark">
        <ScanSearch className="size-8 animate-pulse text-gold-dark" /> يدقق موظف التسجيل بيانات طلبك...
      </p>
      <p className="mt-2 text-ink-soft">صلة كل فرد بصاحب الطلب، والوثائق التي رفعتها عند التسجيل. الأهلية والأعمار المقبولة فُحصت قبل الدفع.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {members.map((m, i) => {
          const items = m.relation === "self" ? ["صاحب الطلب", "الوثائق المرفوعة"] : ["صلة القرابة بصاحب الطلب", "الوثائق المرفوعة"];
          return (
            <div key={m.person.id} className="relative overflow-hidden rounded-2xl border border-gold/40 bg-white p-4">
              <motion.div className="absolute inset-y-0 w-16 bg-gradient-to-l from-transparent via-green-light/15 to-transparent" animate={{ right: ["-20%", "120%"] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }} />
              <p className="font-bold">{fullName(m.person)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((r, j) => {
                  const ok = tick > i * 3 + j * 3;
                  return (
                    <span key={r} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold transition", ok ? "bg-green-light/15 text-green" : "bg-sand text-hint")}>
                      {ok ? "✓ " : ""}
                      {r}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StageLottery({ app, draw, elapsed }: { app: Application; draw: PublishedDraw | null; elapsed: number }) {
  const main = mainApplicant(app)!;
  const b = birthOf(main);
  const picks = draw ? sortPicks(draw.picks) : [];
  // Revealed between the start of the draw (6.5 s) and the result (10 s)
  const shown = Math.max(0, Math.min(picks.length, Math.floor(((elapsed - 6.5) / 3.2) * picks.length) + 1));
  const hit = draw ? matchingPick(main, draw.picks) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white md:p-8">
      <div className="bg-pattern absolute inset-0 opacity-10" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 rounded-full bg-maroon px-3 py-1 text-sm font-bold">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-white" />
            <span className="relative size-2.5 rounded-full bg-white" />
          </span>
          بث مباشر
        </span>
        <span className="flex items-center gap-2 text-sm text-white/70">
          <Radio className="size-4" /> القرعة العلنية — {SEASON.windows.lottery.draw} — بإشراف لجنة تنظيم القرعة
        </span>
      </div>
      <p className="relative mt-5 text-center text-white/80">
        صاحب طلبك من مواليد <b className="text-gold">{MONTHS[b.month - 1]} {b.year}</b>
      </p>
      {draw ? (
        <ul className="relative mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-2">
          {picks.slice(0, shown).map((p) => {
            const mine = p.year === b.year;
            return (
              <motion.li
                key={p.year}
                initial={{ opacity: 0, y: -14, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", damping: 14 }}
                className={cn("flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1", mine ? (hit ? "bg-gold text-ink ring-gold" : "bg-white/15 ring-white/30") : "bg-white/[.07] ring-white/15")}
              >
                <span className="font-display text-2xl font-bold tabular-nums">{p.year}</span>
                <span className={cn("text-sm", mine && hit ? "font-bold" : "text-white/80")}>{describePick(p)}</span>
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <p className="relative mx-auto mt-6 max-w-xl rounded-2xl bg-white/10 p-4 text-center leading-7 text-white/85">
          <CalendarClock className="mx-auto mb-2 size-7 text-gold" />
          انتهى البث، والنتائج بانتظار اعتمادها ونشرها. تصلك نتيجة طلبك هنا فور نشرها.
        </p>
      )}
      {draw && (
        <p className="relative mt-6 text-center text-white/70">
          {shown >= picks.length ? (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("font-bold", hit ? "text-gold" : "text-white")}>
              {hit ? `سُحبت مواليد ${hit.months === "all" ? b.year : `${MONTHS[b.month - 1]} ${b.year}`} — طلبك مقبول!` : `اكتمل السحب: ${formatNumber(drawTotals(draw.picks).seats)} مقعداً`}
            </motion.span>
          ) : (
            `تُسحب سنوات الميلاد حتى تكتمل ${formatNumber(SEASON.lotterySeats)} مقعداً...`
          )}
        </p>
      )}
    </div>
  );
}

/** A lottery application whose applicant's birth year (or month) was not drawn: it ends here for this season */
export function StageNotAccepted({ app, draw }: { app: Application; draw: PublishedDraw | null }) {
  return <LotteryNotDrawn app={app} draw={draw} />;
}

/** The draw did not take the main applicant's birth year (or month): the application ends this season */
function LotteryNotDrawn({ app, draw }: { app: Application; draw: PublishedDraw | null }) {
  const b = birthOf(mainApplicant(app)!);
  const year = draw?.picks.find((p) => p.year === b.year);
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-24 place-items-center rounded-full bg-maroon/10 text-maroon">
        <XCircle className="size-12" />
      </motion.div>
      <div>
        <p className="font-display text-2xl font-bold text-maroon md:text-3xl">لم يُقبل طلبك في قرعة هذا الموسم</p>
        <p className="mt-2 text-lg leading-8 text-ink-soft">
          صاحب طلبك من مواليد {MONTHS[b.month - 1]} {b.year}.{" "}
          {year ? `سُحبت سنة ${b.year} بأشهر محددة (${describePick(year).replace("مواليد ", "")}) ليس منها ${MONTHS[b.month - 1]}.` : `ولم تكن سنة ${b.year} بين سنوات الميلاد المسحوبة.`}
        </p>
        {app.firstPaid?.creditFrom && <p className="mt-2 rounded-2xl bg-gold/20 p-3 leading-7 text-ink">الدفعة الأولى المحفوظة من طلب القبول المباشر تُعاد إليك.</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonLink href="/results#lists" size="lg" variant="outline">
            <Table2 className="size-5" /> جدول نتائج القرعة
          </ButtonLink>
          <span className="text-sm text-hint">يمكنك التسجيل في الموسم القادم.</span>
        </div>
      </div>
    </div>
  );
}

export function StageIcon({ k }: { k: string }) {
  const map: Record<string, React.ReactNode> = {
    submitted: <FileCheck2 className="size-5" />,
    checking: <ScanSearch className="size-5" />,
    lottery: <Ticket className="size-5" />,
    accepted: <CheckCircle2 className="size-5" />,
    notAccepted: <XCircle className="size-5" />,
  };
  return <>{map[k]}</>;
}
