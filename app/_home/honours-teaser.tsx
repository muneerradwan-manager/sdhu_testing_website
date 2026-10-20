"use client";

import { ArrowLeft, Hourglass, Landmark, Trophy } from "lucide-react";
import { useMemo } from "react";
import { str } from "@/components/cms/bits";
import { ButtonLink } from "@/components/ui/button";
import { Reveal, SectionHeading } from "@/components/ui/motion";
import { useSection } from "@/lib/cms/store";
import { useT } from "@/lib/i18n";
import { AWARDS, CURRENT, LATEST, honourRolls } from "@/app/honours/_lib/roll";
import { Podium } from "@/app/honours/_components/podium";
import { Medallion, Stars, useWords } from "@/app/honours/_components/shared";

/**
 * «نجوم الموسم» on the home page: a glance at «لوحة الشرف». It always tells two seasons: the last one that ended and
 * was rated (its three best group heads on the podium, its best cluster, the best of every other role), and the
 * current one, still running, whose roll is announced after the pilgrims return. «لوحة الشرف كاملة» leads to the page
 */
export function HonoursTeaser() {
  const t = useT();
  const w = useWords();
  const v = useSection("home", "honours");
  const roll = useMemo(() => honourRolls().find((r) => r.season === LATEST), []);
  if (!roll || !roll.heads.length) return null;
  const cluster = roll.clusters[0];
  const fill = (s: string) => s.replaceAll("{last}", LATEST).replaceAll("{current}", CURRENT);

  return (
    <section id="honours" className="relative scroll-mt-28 overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading eyebrow={fill(str(v, "eyebrow"))} title={fill(str(v, "title"))} description={fill(str(v, "description"))} />

        <Reveal>
          {/* The last season's stage, as «لوحة الشرف» sets it */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-ink via-green-dark to-green-dark px-4 pb-8 pt-10 text-white shadow-2xl sm:px-8">
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div aria-hidden className="absolute left-1/2 top-0 size-96 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl" />
            <div className="relative">
              <p className="mb-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-sm text-white/70">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-bold text-gold">
                  <Trophy className="size-4" /> {t(`موسم ${LATEST}هـ`, `Season ${LATEST} AH`)}
                </span>
                <span>{t(`${roll.rated} إدارياً قُيّموا، ومتوسط تقييمهم ${roll.average.toFixed(2)} من 5`, `${roll.rated} administrators rated, averaging ${roll.average.toFixed(2)} of 5`)}</span>
              </p>
              <Podium top={roll.heads.slice(0, 3)} />

              {/* The best cluster, then the best of each other role */}
              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {cluster && (
                  <li className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/15 p-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold text-ink">
                      <Landmark className="size-6" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-gold">{t("أفضل تكتل", "Best cluster")}</span>
                      <span className="block font-display text-base font-bold leading-snug">{cluster.name}</span>
                      <Stars rating={cluster.rating} light className="mt-0.5" />
                    </span>
                  </li>
                )}
                {roll.awards.map((a) => {
                  const best = a.top[0];
                  const award = AWARDS.find((x) => x.key === a.key)!;
                  if (!best) return null;
                  return (
                    <li key={a.key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                      <Medallion name={best.name} female={best.female} place={1} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-xs text-gold">{t(award.ar, award.en)}</span>
                        <span className="block truncate font-bold">{best.name}</span>
                        <span className="block truncate text-xs text-white/60">{best.where ?? w.role(best.roleKey)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* The current season: still running, its roll comes after the return */}
          <div className="mt-5 flex flex-col items-start gap-4 rounded-3xl border border-dashed border-gold-dark/50 bg-gold-light/40 p-5 dark:border-gold/40 dark:bg-gold/[.07] md:flex-row md:items-center md:p-6">
            <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-white text-maroon shadow-sm">
              <Hourglass className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-green-dark">{fill(str(v, "currentTitle"))}</p>
              <p className="mt-1 text-sm leading-7 text-ink-soft">{fill(str(v, "currentText"))}</p>
            </div>
            <ButtonLink href={str(v, "ctaHref", "/honours")} size="lg">
              {str(v, "ctaLabel")} <ArrowLeft className="size-5" />
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
