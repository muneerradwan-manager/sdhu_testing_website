"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Medal } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import type { Honouree, SeasonRoll } from "../_lib/roll";
import { Medallion, Stars, useWords } from "./shared";

/** The places shown under the podium before «الترتيب كاملاً» */
const SHOWN = 20;

const EASE = [0.16, 1, 0.3, 1] as const;

/** The group heads after the podium, fourth onward: rank, head, group and office, tier, rating and score */
export function Ranking({ roll }: { roll: SeasonRoll }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const rest = roll.heads.slice(3);
  const shown = all ? rest : rest.slice(0, SHOWN - 3);
  const best = roll.heads[0]?.score ?? 100;

  return (
    <div>
      <ol start={4} aria-label={t(`ترتيب رؤساء المجموعات في موسم ${roll.season}`, `Group heads ranked, season ${roll.season} AH`)} className="space-y-2.5">
        <AnimatePresence initial={false}>
          {shown.map((h, i) => (
            <motion.li
              key={h.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, delay: Math.min(i, SHOWN) * 0.03, ease: EASE }}
            >
              <Row h={h} best={best} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      {rest.length > SHOWN - 3 && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            aria-expanded={all}
            className="inline-flex items-center gap-2 rounded-full border border-gold-dark/40 bg-white px-5 py-2.5 text-sm font-bold text-green-dark transition hover:border-gold-dark hover:bg-gold-light/40"
          >
            {all
              ? t(`أول ${SHOWN} فقط`, `Only the first ${SHOWN}`)
              : t(`الترتيب كاملاً — ${formatNumber(roll.heads.length)} رئيس مجموعة`, `The full ranking — ${formatNumber(roll.heads.length)} group heads`)}
            <ChevronDown className={cn("size-4 transition", all && "rotate-180")} />
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ h, best }: { h: Honouree; best: number }) {
  const t = useT();
  const w = useWords();
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-gold/30 bg-white p-3 transition hover:-translate-y-0.5 hover:border-gold-dark/50 hover:shadow-[0_16px_40px_-24px_rgba(2,21,38,.4)] sm:gap-4 sm:px-5">
      <span className="w-8 shrink-0 text-center font-display text-xl font-bold text-gold-dark tabular-nums sm:w-10 sm:text-2xl" aria-hidden>
        {h.rank}
      </span>
      <Medallion name={h.name} female={h.female} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-green-dark">{h.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          {h.where && <span className="truncate">{h.where}</span>}
          <span className="text-hint">{w.office(h.office)}</span>
        </span>
        <span className="mt-1 flex items-center gap-2 sm:hidden">
          {h.tier !== undefined && <span className="whitespace-nowrap rounded-full bg-sand px-2 py-0.5 text-[11px] font-bold text-maroon">{w.tier(h.tier)}</span>}
          <Stars rating={h.rating} />
        </span>
      </span>
      {h.tier !== undefined && <span className="hidden shrink-0 whitespace-nowrap rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-maroon md:inline">{w.tier(h.tier)}</span>}
      <span className="hidden shrink-0 sm:block">
        <Stars rating={h.rating} />
      </span>
      <span className="w-16 shrink-0 text-end sm:w-28">
        <span className="block text-sm font-bold text-ink tabular-nums">{h.score.toFixed(1)}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-gold-light" aria-hidden>
          <motion.span
            className="block h-full rounded-full bg-gradient-to-l from-gold-dark to-green-light"
            initial={{ width: 0 }}
            whileInView={{ width: `${(h.score / best) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: EASE }}
          />
        </span>
        <span className="sr-only">{t("من 100", "out of 100")}</span>
      </span>
    </div>
  );
}

/**
 * The classification honours the first `honorTop` of every tier, each tier on its own across every office
 * (lib/grading): the highest tier first
 */
export function TierHonours({ roll }: { roll: SeasonRoll }) {
  const t = useT();
  const w = useWords();
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {roll.tiers.map((tier, i) => (
        <motion.section
          key={tier.tier}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
          aria-labelledby={`tier-${tier.tier}`}
          className="relative overflow-hidden rounded-3xl border border-gold/40 bg-white p-5"
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-gold-dark via-gold to-gold-dark" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id={`tier-${tier.tier}`} className="font-display text-xl font-bold text-green-dark">
                {w.tier(tier.tier)}
              </h3>
              <p className="text-sm text-ink-soft">
                {w.service(tier.tier)} · {t(`${formatNumber(tier.total)} رئيس مجموعة`, `${formatNumber(tier.total)} group heads`)}
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold/25 text-gold-dark">
              <Medal className="size-5" />
            </span>
          </div>
          {tier.top.length ? (
            <ol className="mt-4 space-y-2">
              {tier.top.map((h, place) => (
                <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-sand/70 p-2.5">
                  <Medallion name={h.name} female={h.female} place={place + 1} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{h.name}</span>
                    <span className="block truncate text-xs text-ink-soft">{h.where}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-gold-dark tabular-nums">{h.score.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl bg-sand/70 p-4 text-sm text-ink-soft">{t("لم تبلغ مجموعةٌ هذه الفئة في هذا الموسم.", "No group had reached this tier that season.")}</p>
          )}
        </motion.section>
      ))}
    </div>
  );
}
