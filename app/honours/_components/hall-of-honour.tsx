"use client";

import Link from "next/link";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, Crown, Hourglass, Scale, Sparkles, Trophy } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { RATING_SOURCES } from "@/app/administrator/_lib/ratings";
import { dateEn } from "@/app/conditions/_lib/en";
import { Counter, Reveal, SectionHeading } from "@/components/ui/motion";
import { SCORE_PARTS } from "@/lib/data/grading-demo";
import { useT } from "@/lib/i18n";
import { SEASON } from "@/lib/season";
import { cn, seeded } from "@/lib/utils";
import { ALL_SEASONS, CURRENT, GREGORIAN, LATEST, honourRolls, type SeasonKey, type SeasonRoll } from "../_lib/roll";
import { Awards } from "./awards";
import { Podium } from "./podium";
import { Ranking, TierHonours } from "./ranking";
import { Medallion } from "./shared";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Gold motes drifting up the hero, placed by a fixed seed so the server and the browser draw the same */
const MOTES = (() => {
  const rnd = seeded("honours-motes");
  return Array.from({ length: 18 }, () => ({ x: rnd() * 100, y: 30 + rnd() * 70, size: 2 + rnd() * 4, delay: rnd() * 6, duration: 7 + rnd() * 6 }));
})();

/**
 * «لوحة الشرف»: the season's ceremony. The hero names it and holds the seasons; under it the stage of the chosen
 * season — its numbers and the podium of its three best group heads — then the rest of the ranking, the honoured
 * of every tier, and the awards of the other roles. The current season is still running, so its tab says when
 * its roll is announced. Below, every season's champions side by side, and how the roll is reached.
 */
export function HallOfHonour() {
  const rolls = useMemo(() => honourRolls(), []);
  const [season, setSeason] = useState<SeasonKey>(LATEST);
  const roll = rolls.find((r) => r.season === season);
  const stage = useRef<HTMLDivElement>(null);

  const choose = (s: SeasonKey, scroll = false) => {
    setSeason(s);
    if (scroll) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
      <Hero season={season} onChoose={choose} />

      <div ref={stage} id="honours-panel" role="tabpanel" aria-labelledby={`season-tab-${season}`} className="scroll-mt-20">
        <motion.div key={season} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {roll ? <SeasonStage roll={roll} /> : <ComingSeason onBack={() => choose(LATEST)} />}
        </motion.div>
      </div>

      <Champions rolls={rolls} season={season} onChoose={(s) => choose(s, true)} />
      <Method />
    </MotionConfig>
  );
}

function Hero({ season, onChoose }: { season: SeasonKey; onChoose: (s: SeasonKey) => void }) {
  const t = useT();
  const still = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden bg-ink pb-12 pt-36 text-white md:pt-44">
      {/* The hall: a spotlight from above, the star lattice, two slow beams and the season in great numerals */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(217,200,158,.28),transparent_60%)]" />
      <div aria-hidden className="bg-pattern absolute inset-0 -z-10 opacity-[.12] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      {[-1, 1].map((side) => (
        <motion.div
          key={side}
          aria-hidden
          className="absolute -top-40 -z-10 h-[46rem] w-40 origin-top bg-gradient-to-b from-gold/30 via-gold/5 to-transparent blur-2xl"
          style={{ left: side === -1 ? "18%" : "auto", right: side === 1 ? "18%" : "auto" }}
          initial={{ rotate: side * 22, opacity: 0 }}
          animate={still ? { rotate: side * 22, opacity: 0.8 } : { rotate: [side * 16, side * 28, side * 16], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 9, repeat: still ? 0 : Infinity, ease: "easeInOut" }}
        />
      ))}
      {!still &&
        MOTES.map((m, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute -z-10 rounded-full bg-gold"
            style={{ left: `${m.x}%`, top: `${m.y}%`, width: m.size, height: m.size }}
            animate={{ y: [0, -120], opacity: [0, 0.9, 0] }}
            transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={season}
          aria-hidden
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="pointer-events-none absolute inset-x-0 top-24 -z-10 select-none text-center font-display text-[9rem] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(217,200,158,.18)] sm:text-[14rem] md:top-28 md:text-[18rem]"
        >
          {season}
        </motion.span>
      </AnimatePresence>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="flex flex-col items-center text-center">
          <nav aria-label={t("مسار التنقل", "Breadcrumb")} className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
            <Link href="/" className="hover:text-gold">
              {t("الرئيسية", "Home")}
            </Link>
            <ChevronLeft className="size-3.5" />
            <span className="text-gold">{t("لوحة الشرف", "Hall of Honour")}</span>
          </nav>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/5 px-4 py-1.5 text-xs font-bold tracking-wide text-gold backdrop-blur">
            <Sparkles className="size-3.5" />
            {t("حفل التكريم السنوي للإداريين", "The administrators' annual honours")}
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold text-balance md:text-7xl">
            <span className="text-gold-shine">{t("لوحة الشرف", "Hall of Honour")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/75 md:text-lg">
            {t(
              "المتميّزون من إداريي المنصة في كل موسم: رؤساء المجموعات الأعلى تقييماً، وأفضل التكتلات، والأوائل من المنسقين والموجّهين والمعاونين — كما قيّمهم الحجاج والموظفون وسجلّ المنصة. اختر الموسم لترى أبطاله.",
              "The platform's distinguished administrators of every season: the highest-rated group heads, the best clusters, and the leading coordinators, guides and assistants — as the pilgrims, the staff and the platform's own record rated them. Choose a season to see its champions.",
            )}
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <SeasonTabs season={season} onChoose={onChoose} />
        </Reveal>
      </div>
    </section>
  );
}

/** The seasons as tabs: the finished ones, then the current one, which is still running */
function SeasonTabs({ season, onChoose }: { season: SeasonKey; onChoose: (s: SeasonKey) => void }) {
  const t = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrows move along the row as it is drawn: in Arabic the next season is to the left
  const onKey = (e: KeyboardEvent) => {
    const i = ALL_SEASONS.indexOf(season);
    const rtl = document.documentElement.dir !== "ltr";
    const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 }[e.key as "ArrowLeft" | "ArrowRight"];
    let next = i;
    if (step) next = (i + step + ALL_SEASONS.length) % ALL_SEASONS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = ALL_SEASONS.length - 1;
    else return;
    e.preventDefault();
    onChoose(ALL_SEASONS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t("المواسم", "Seasons")}
      onKeyDown={onKey}
      className="mx-auto mt-10 grid w-full max-w-3xl grid-cols-5 gap-1 rounded-3xl border border-gold/25 bg-white/5 p-1.5 backdrop-blur"
    >
      {ALL_SEASONS.map((s, i) => {
        const on = s === season;
        const running = s === CURRENT;
        return (
          <button
            key={s}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`season-tab-${s}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls="honours-panel"
            tabIndex={on ? 0 : -1}
            onClick={() => onChoose(s)}
            className={cn("relative flex min-w-0 flex-col items-center rounded-2xl px-1 py-2.5 transition sm:py-3", on ? "on-light text-ink" : "text-white/80 hover:bg-white/10 hover:text-white")}
          >
            {on && <motion.span layoutId="season-pill" className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#fff6dc] to-gold shadow-[0_8px_30px_-8px_rgba(217,200,158,.8)]" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <span className="relative font-display text-base font-bold tabular-nums sm:text-xl">
              {s}
              <span className="text-xs">{t("هـ", " AH")}</span>
            </span>
            <span className={cn("relative mt-0.5 text-[10px] sm:text-xs", on ? "text-ink/70" : "text-white/55")}>
              {running ? (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 animate-pulse rounded-full bg-current" />
                  {t("جارٍ", "Running")}
                </span>
              ) : (
                t(`حج ${GREGORIAN[s]}`, `Hajj ${GREGORIAN[s]}`)
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The chosen season: its numbers and podium on the dark stage, then the rest of its roll */
function SeasonStage({ roll }: { roll: SeasonRoll }) {
  const t = useT();
  const latest = roll.season === LATEST;
  const stats = [
    { label: t("رئيس مجموعة قُيِّم", "Group heads rated"), value: roll.heads.length },
    { label: t("إدارياً في السجل", "Administrators on record"), value: roll.rated },
    { label: t("تكتلاً معتمداً", "Approved clusters"), value: roll.clusters.length },
  ];
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink pb-20 text-white md:pb-24">
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-green-dark/60 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                <Counter to={s.value} className="font-display text-3xl font-bold text-gold" duration={1.6} />
                <p className="mt-1 text-xs text-white/65">{s.label}</p>
              </Reveal>
            ))}
            <Reveal delay={0.18} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="font-display text-3xl font-bold text-gold tabular-nums">{roll.average.toFixed(2)}</p>
              <p className="mt-1 text-xs text-white/65">{t("متوسط التقييم من 5", "Average rating out of 5")}</p>
            </Reveal>
          </div>

          <div className="mt-16 text-center">
            <SectionHeading
              light
              eyebrow={latest ? t(`آخر موسم مكتمل · حج ${GREGORIAN[roll.season]}`, `The latest completed season · Hajj ${GREGORIAN[roll.season]}`) : t(`موسم ${roll.season}هـ · حج ${GREGORIAN[roll.season]}`, `Season ${roll.season} AH · Hajj ${GREGORIAN[roll.season]}`)}
              title={t("أفضل رؤساء المجموعات", "The best group heads")}
              description={t(
                "مرتّبون بدرجة التصنيف من 100 التي نالتها مجموعاتهم في نهاية الموسم، وتحت كل اسم تقييم صاحبه من 5.",
                "Ranked by the classification score out of 100 their groups earned at the end of the season, with each head's own rating out of 5.",
              )}
              className="mb-14 sm:mb-20"
            />
          </div>
          <Podium top={roll.heads.slice(0, 3)} />
        </div>
        <svg className="absolute -bottom-px left-0 right-0 h-10 w-full text-sand md:h-14" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60V30c240-30 480-30 720 0s480 30 720 0v30z" fill="currentColor" />
        </svg>
      </section>

      <section className="bg-pattern-dark">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-8">
          <SectionHeading
            eyebrow={t("الترتيب العام", "The overall ranking")}
            title={t("من المركز الرابع", "From fourth place")}
            description={t("رؤساء مجموعات الموسم كلهم، من كل المكاتب والفئات معاً.", "Every group head of the season, from every office and tier together.")}
          />
          <Ranking roll={roll} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
          <SectionHeading
            eyebrow={t("المكرَّمون في كل فئة", "Honoured in every tier")}
            title={t(`الأوائل في كل فئة`, "The first of every tier")}
            description={t(
              `تُرتَّب المجموعات داخل فئتها، عبر المكاتب كلها، ويُكرَّم أول ${SEASON.grading.honorTop} في كل فئة — فلا تنافس مجموعةٌ من الفئة الأولى مجموعاتِ فئةٍ أعلى.`,
              `Groups are ranked within their own tier, across every office, and the first ${SEASON.grading.honorTop} of every tier are honoured — a first-tier group never competes with a higher tier.`,
            )}
          />
          <TierHonours roll={roll} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
          <SectionHeading
            eyebrow={t("تميّز في كل صفة", "Excellence in every role")}
            title={t("أوائل الصفات الأخرى", "The leaders of the other roles")}
            description={t(
              "أفضل تكتل، والأوائل من المنسقين التقنيين والموجّهين والموجّهات والمعاونين. يتقدّم الأعلى تقييماً، وعند التساوي الأقدم خدمة.",
              "The best cluster, and the leading technical coordinators, guides, female guides and assistants. The higher rating comes first; on a tie, the longer service.",
            )}
          />
          <Awards roll={roll} />
        </div>
      </section>
    </>
  );
}

/** The current season has no roll yet: it is rated after the pilgrims are home */
function ComingSeason({ onBack }: { onBack: () => void }) {
  const t = useT();
  const back = SEASON.dates[SEASON.dates.length - 1];
  return (
    <section className="relative isolate overflow-hidden bg-ink pb-28 text-white">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <Reveal className="rounded-3xl border border-gold/25 bg-white/5 p-8 text-center backdrop-blur sm:p-12">
          <motion.span
            className="mx-auto grid size-16 place-items-center rounded-full bg-gold/15 text-gold"
            animate={{ rotate: [0, 180, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }}
            aria-hidden
          >
            <Hourglass className="size-8" />
          </motion.span>
          <h2 className="mt-6 font-display text-3xl font-bold">{t(`موسم ${CURRENT}هـ لم يُختتم بعد`, `Season ${CURRENT} AH has not ended yet`)}</h2>
          <p className="mx-auto mt-4 max-w-xl leading-8 text-white/75">
            {t(
              `يُقيَّم الإداريون بعد العودة إلى الوطن (${back.hijri} — ${back.gregorian})، حين يقيّمهم الحجاج في التقييم الشامل ويكتمل تقييم الموظفين وسجلّ المنصة. ثم تُرتَّب المجموعات وتُعلَن لوحة شرف الموسم هنا.`,
              `Administrators are rated after the return home (${dateEn(back.gregorian)}), when the pilgrims rate them in the full evaluation and the staff's ratings and the platform's record are complete. Then the groups are ranked and the season's roll is announced here.`,
            )}
          </p>
          <button type="button" onClick={onBack} className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-bold text-ink transition hover:bg-white">
            <Trophy className="size-4" />
            {t(`متميّزو موسم ${LATEST}هـ`, `The distinguished of ${LATEST} AH`)}
          </button>
        </Reveal>
      </div>
      <svg className="absolute -bottom-px left-0 right-0 h-10 w-full text-sand md:h-14" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 60V30c240-30 480-30 720 0s480 30 720 0v30z" fill="currentColor" />
      </svg>
    </section>
  );
}

/** Every finished season's champions side by side; a card opens its season. Then whoever reached the podium more than once */
function Champions({ rolls, season, onChoose }: { rolls: SeasonRoll[]; season: SeasonKey; onChoose: (s: SeasonKey) => void }) {
  const t = useT();
  const legends = useMemo(() => {
    const by = new Map<string, { name: string; female: boolean; seasons: string[] }>();
    for (const r of rolls)
      for (const h of r.heads.slice(0, 3)) {
        const x = by.get(h.id) ?? { name: h.name, female: h.female, seasons: [] };
        x.seasons.push(r.season);
        by.set(h.id, x);
      }
    return [...by.values()].filter((x) => x.seasons.length > 1).sort((a, b) => b.seasons.length - a.seasons.length);
  }, [rolls]);

  return (
    <section className="relative isolate overflow-hidden bg-green-dark py-20 text-white">
      <div aria-hidden className="bg-pattern absolute inset-0 -z-10 opacity-15" />
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          light
          eyebrow={t("سجلّ الأبطال", "The champions' record")}
          title={t("أبطال المواسم", "Champions of every season")}
          description={t("أول رؤساء المجموعات وأفضل تكتل في كل موسم مضى. اختر موسماً لترى لوحته كاملة.", "The first group head and the best cluster of every past season. Choose one to see its whole roll.")}
        />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rolls.map((r, i) => {
            const head = r.heads[0];
            const cluster = r.clusters[0];
            const on = r.season === season;
            return (
              <motion.li
                key={r.season}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              >
                <button
                  type="button"
                  onClick={() => onChoose(r.season as SeasonKey)}
                  aria-label={t(`افتح لوحة موسم ${r.season}`, `Open the roll of ${r.season} AH`)}
                  className={cn(
                    "relative flex h-full w-full flex-col rounded-3xl border p-5 text-start transition hover:-translate-y-1",
                    on ? "border-gold bg-white/15 shadow-[0_20px_50px_-24px_rgba(217,200,158,.8)]" : "border-white/15 bg-white/5 hover:border-gold/50",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-3xl font-bold text-gold tabular-nums">
                      {r.season}
                      <span className="text-base">{t("هـ", " AH")}</span>
                    </span>
                    <span className="text-xs text-white/55">{t(`حج ${GREGORIAN[r.season]}`, `Hajj ${GREGORIAN[r.season]}`)}</span>
                  </span>
                  {head && (
                    <span className="mt-4 flex items-center gap-3">
                      <Medallion name={head.name} female={head.female} place={1} size="sm" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-gold">
                          <Crown className="size-3.5" />
                          {t("أول رؤساء المجموعات", "First group head")}
                        </span>
                        <span className="block truncate font-bold">{head.name}</span>
                        <span className="block truncate text-xs text-white/60">{head.where}</span>
                      </span>
                    </span>
                  )}
                  {cluster && (
                    <span className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-sm">
                      <Trophy className="size-4 shrink-0 text-gold" />
                      <span className="min-w-0 truncate text-white/85">{cluster.name}</span>
                    </span>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ol>

        {legends.length > 0 && (
          <Reveal className="mt-10 rounded-3xl border border-gold/25 bg-ink/30 p-5 sm:p-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-gold">
              <Sparkles className="size-5" />
              {t("على منصة التتويج أكثر من موسم", "On the podium more than once")}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {legends.map((l) => (
                <li key={l.name} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <Medallion name={l.name} female={l.female} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{l.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {l.seasons.map((s) => (
                        <span key={s} className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold tabular-nums">
                          {s}
                          {t("هـ", " AH")}
                        </span>
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/** How the roll is reached: the rating out of 5 (app/administrator/_lib/ratings) and the classification score out of 100 */
function Method() {
  const t = useT();
  const g = SEASON.grading;
  const PARTS_EN: Record<string, string> = {
    "تقييم الحجاج": "The pilgrims' rating",
    "تقييم الموظفين": "The staff's rating",
    "الالتزام بالمراحل التسع": "Keeping to the nine stages",
    "البلاغات والمخالفات": "Reports and violations",
    "الانضباط — من سجل المنصة": "Conduct — from the platform's record",
  };
  const cards = [
    {
      icon: Scale,
      title: t("تقييم الإداري من 5", "The administrator's rating out of 5"),
      note: t("لكل إداري في كل موسم، ويقبله حين يتقدّم للصفة", "For every administrator each season; he accepts it when he applies"),
      parts: RATING_SOURCES.map((s) => ({ label: t(s.label, PARTS_EN[s.label] ?? s.label), weight: s.weight })),
    },
    {
      icon: Trophy,
      title: t("درجة تصنيف المجموعة من 100", "The group's classification score out of 100"),
      note: t("تُرتَّب بها المجموعات والتكتلات في نهاية الموسم", "Groups and clusters are ranked by it at the end of the season"),
      parts: SCORE_PARTS.map((s) => ({ label: t(s.label, PARTS_EN[s.label] ?? s.label), weight: s.weight })),
    },
  ];
  const rules = [
    t(`يُكرَّم أول ${g.honorTop} في كل فئة`, `The first ${g.honorTop} of every tier are honoured`),
    t(`ويرتقي أعلى ${g.promoteShare * 100}% من كل فئة فئةً واحدة`, `The top ${g.promoteShare * 100}% of every tier move one tier up`),
    t(`وينزل أدنى ${g.demoteShare * 100}% فئةً واحدة`, `The bottom ${g.demoteShare * 100}% move one tier down`),
    t("ويبدأ كل رئيس مجموعة جديد من الفئة الأولى", "Every new group head starts in the first tier"),
  ];
  return (
    <section className="bg-pattern-dark">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <SectionHeading
          eyebrow={t("الشفافية", "Transparency")}
          title={t("كيف يُختار المتميّزون", "How the distinguished are chosen")}
          description={t(
            "لا لجنة تختار الأسماء: الترتيب يخرج من التقييمات نفسها، بأوزان أعلنتها الإدارة قبل الموسم.",
            "No committee picks the names: the ranking comes out of the ratings themselves, by weights the administration announced before the season.",
          )}
        />
        <div className="grid gap-5 md:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.1} className="rounded-3xl border border-gold/40 bg-white p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/25 text-gold-dark">
                  <c.icon className="size-5" />
                </span>
                <span>
                  <h3 className="font-display text-lg font-bold text-green-dark">{c.title}</h3>
                  <span className="block text-xs text-hint">{c.note}</span>
                </span>
              </div>
              <ul className="mt-5 space-y-3">
                {c.parts.map((p) => (
                  <li key={p.label}>
                    <span className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink">{p.label}</span>
                      <span className="font-bold text-green-dark tabular-nums">{Math.round(p.weight * 100)}%</span>
                    </span>
                    <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-gold-light" aria-hidden>
                      <motion.span
                        className="block h-full rounded-full bg-gradient-to-l from-green-dark to-green-light"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${p.weight * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.1, ease: EASE }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6 flex flex-wrap justify-center gap-2">
          {rules.map((r) => (
            <span key={r} className="rounded-full border border-gold/40 bg-white px-4 py-2 text-sm text-ink-soft">
              {r}
            </span>
          ))}
        </Reveal>
        <p className="mt-8 text-center text-xs text-hint">
          {t("نسخة تجريبية — الأسماء والتقييمات كلها وهمية لأغراض العرض.", "Demo version — every name and rating is fictitious, for demonstration only.")}
        </p>
      </div>
    </section>
  );
}
