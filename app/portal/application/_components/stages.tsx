"use client";

import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, FileCheck2, Radio, ScanSearch, Table2, Ticket, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { MONTHS, birthOf, describePick, drawTotals, mainApplicant, matchingPick, sortPicks, type PublishedDraw } from "@/lib/lottery";
import { ageOf, fullName } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { SEASON } from "@/lib/season";
import type { Application } from "@/lib/store";
import { cn, formatNumber, seeded } from "@/lib/utils";

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
          <CalendarClock className="size-5" /> {app.track === "lottery" ? "طلب في التسجيل الأولي على القرعة" : "طلب في التسجيل على القبول المباشر"} — الخطوة التالية: تدقيق البيانات والتحقق من الأهلية
        </p>
      </div>
    </div>
  );
}

export function StageChecking({ members }: { members: Member[] }) {
  const rules = ["مطابقة الشؤون المدنية", "تكرار الأرقام الوطنية", "الأوراق الأساسية", "شروط الموسم بسنة الميلاد", "الشروط الثابتة"];
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 140);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <p className="flex items-center gap-3 font-display text-2xl font-bold text-green-dark">
        <ScanSearch className="size-8 animate-pulse text-gold-dark" /> ندقق بيانات كل فرد في الطلب...
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {members.map((m, i) => (
          <div key={m.person.id} className="relative overflow-hidden rounded-2xl border border-gold/40 bg-white p-4">
            <motion.div className="absolute inset-y-0 w-16 bg-gradient-to-l from-transparent via-green-light/15 to-transparent" animate={{ right: ["-20%", "120%"] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }} />
            <p className="font-bold">{fullName(m.person)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rules.map((r, j) => {
                const ok = tick > i * 3 + j * 2;
                return (
                  <span key={r} className={cn("rounded-full px-2 py-0.5 text-xs font-semibold transition", ok ? "bg-green-light/15 text-green" : "bg-sand text-hint")}>
                    {ok ? "✓ " : ""}
                    {r}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageEligible({ app }: { app: Application }) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }} className="mx-auto grid size-28 place-items-center rounded-full bg-green-light text-white shadow-2xl shadow-green-light/40">
        <BadgeCheck className="size-14" />
      </motion.div>
      <div>
        <p className="font-display text-3xl font-bold text-green-dark">جميع أفراد الطلب مؤهلون</p>
        {app.track === "lottery" ? (
          <>
            <p className="mt-2 text-lg leading-8 text-ink-soft">
              طلبك في التسجيل الأولي على القرعة ({Math.round(SEASON.lotteryShare * 100)}% من الحصة). في القرعة تُسحب سنوات ميلاد، ولبعضها أشهر، ويُطابَق طلبك بميلاد صاحبه
              ({MONTHS[birthOf(mainApplicant(app)!).month - 1]} {birthOf(mainApplicant(app)!).year}): إن سُحبت سنته، أو شهره منها، قُبل الطلب بأفراده كلهم.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-gold/30 px-3 py-1.5 font-bold text-maroon">القرعة: {SEASON.windows.lottery.draw} — بث مباشر</span>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg leading-8 text-ink-soft">
              يُرتَّب طلبك في القبول المباشر بعمر صاحب الطلب ({ageOf(app.members[0].person)} عاماً)، ويُقبل الأكبر سناً حتى تكتمل {Math.round(SEASON.directShare * 100)}% من الحصة.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-gold/30 px-3 py-1.5 font-bold text-maroon">اعتماد القوائم: {SEASON.windows.direct.announce}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Oldest-first cut: a distribution of eligible applicants with the 66+ threshold line */
export function StageDirect({ age }: { age: number }) {
  const bars = useMemo(() => {
    const rnd = seeded("ages");
    return Array.from({ length: 50 }, (_, i) => {
      const a = 30 + i; // 30 → 79
      const peak = Math.exp(-((a - 55) ** 2) / 220);
      return { age: a, h: 12 + peak * 80 + rnd() * 8 };
    });
  }, []);
  const accepted = age >= SEASON.acceptedDirectAge;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold text-green-dark">القبول المباشر وفق الأكبر سناً</p>
          <p className="text-ink-soft">
            {formatNumber(SEASON.directSeats)} مقعداً (35%) — الأعمار المقبولة: <b className="text-maroon">{SEASON.acceptedDirectAge} عاماً فأكثر</b>
          </p>
        </div>
        <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 }} className={cn("rounded-2xl px-4 py-2 font-bold", accepted ? "bg-green-light text-white" : "bg-gold/30 text-maroon")}>
          {accepted ? "✓ طلبك ضمن القبول المباشر" : `عمر صاحب الطلب ${age} — دون الأعمار المقبولة`}
        </motion.span>
      </div>
      <div className="relative mt-8 flex h-44 items-end gap-[3px]" dir="ltr">
        {bars.map((b, i) => {
          const isCut = b.age >= SEASON.acceptedDirectAge;
          const mine = b.age === Math.min(79, Math.max(30, age));
          return (
            <motion.div
              key={b.age}
              initial={{ height: 0 }}
              animate={{ height: `${b.h}%` }}
              transition={{ delay: i * 0.015, duration: 0.5 }}
              className={cn("relative flex-1 rounded-t", mine ? "bg-maroon" : isCut ? "bg-green-light" : "bg-gold-light")}
            >
              {mine && (
                <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white">
                  طلبك
                </motion.span>
              )}
            </motion.div>
          );
        })}
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.8 }} className="absolute bottom-0 top-0 w-0.5 origin-bottom bg-green-dark" style={{ left: `${((SEASON.acceptedDirectAge - 30) / 50) * 100}%` }}>
          <span className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-green-dark">{SEASON.acceptedDirectAge}+</span>
        </motion.div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-hint" dir="ltr">
        <span>30</span>
        <span>العمر</span>
        <span>79</span>
      </div>
    </div>
  );
}

/**
 * The live broadcast: the drawn birth years come up one by one (all months, or the drawn ones), and the
 * main applicant's year lights up if it is among them. Until the results are published, it waits.
 */
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

/**
 * Direct acceptance ended without a place. Nothing moves to the lottery by itself — the lottery is a
 * separate registration that the pilgrim makes with a new application. A lottery application that was
 * not drawn ends here for this season.
 */
export function StageNotAccepted({ age, app, draw }: { age: number; app: Application; draw: PublishedDraw | null }) {
  if (app.track === "lottery") return <LotteryNotDrawn app={app} draw={draw} />;
  return (
    <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-24 place-items-center rounded-full bg-maroon/10 text-maroon">
        <XCircle className="size-12" />
      </motion.div>
      <div>
        <p className="font-display text-2xl font-bold text-maroon md:text-3xl">لم يُقبل طلبك في القبول المباشر</p>
        <p className="mt-2 text-lg leading-8 text-ink-soft">
          الأعمار المقبولة {SEASON.acceptedDirectAge} عاماً فأكثر، وعمر صاحب الطلب {age} عاماً. لا ينتقل طلبك إلى القرعة تلقائياً — التسجيل الأولي على القرعة طلب مستقل
          يُفتح {SEASON.windows.lottery.hijri} ({SEASON.windows.lottery.gregorian}).
        </p>
        <p className="mt-2 rounded-2xl bg-gold/20 p-3 leading-7 text-ink">
          الدفعة الأولى التي دفعتها مع التسجيل محفوظة لك: إن سجّلت على القرعة وقُبلت تُحسب رصيداً فلا تدفعها مرة أخرى، وإن لم تسجّل أو لم تُقبل تُعاد إليك.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonLink href="/portal/apply" size="lg" variant="gold">
            <Ticket className="size-5" /> سجّل على القرعة بالأفراد أنفسهم <ArrowLeft className="size-5" />
          </ButtonLink>
          <span className="text-sm text-hint">بضغطة واحدة دون إعادة الخطوات: الملخص ثم رسم التسجيل الأولي — القرعة: {SEASON.windows.lottery.draw}</span>
        </div>
      </div>
    </div>
  );
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
    eligible: <BadgeCheck className="size-5" />,
    direct: <CalendarClock className="size-5" />,
    lottery: <Ticket className="size-5" />,
    accepted: <CheckCircle2 className="size-5" />,
    notAccepted: <XCircle className="size-5" />,
  };
  return <>{map[k]}</>;
}
