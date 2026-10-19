"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BookOpen, Building2, HeartHandshake, Laptop, Trophy, UsersRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { placeEn } from "@/app/conditions/_lib/en";
import { useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import { AWARDS, type AwardKey, type Honouree, type SeasonRoll } from "../_lib/roll";
import { Medallion, Stars, useWords } from "./shared";

const EASE = [0.16, 1, 0.3, 1] as const;

const ICONS: Record<AwardKey, LucideIcon> = { tech: Laptop, guide: BookOpen, "guide-f": HeartHandshake, deputy: UsersRound };

/** The season's best cluster first and widest, then one card for every other award */
export function Awards({ roll }: { roll: SeasonRoll }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <ClusterAward roll={roll} />
      {roll.awards.map((a, i) => (
        <RoleAward key={a.key} award={a} i={i + 1} />
      ))}
    </div>
  );
}

function Card({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.65, delay: (i % 3) * 0.08, ease: EASE }}
      className={cn("relative flex flex-col overflow-hidden rounded-3xl border border-gold/40 bg-white p-5 transition-shadow hover:shadow-[0_24px_60px_-30px_rgba(2,21,38,.45)] sm:p-6", className)}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-gold-dark via-gold to-gold-dark" />
      {children}
    </motion.div>
  );
}

function Title({ icon: Icon, title, note, id }: { icon: LucideIcon; title: string; note: string; id: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-dark text-gold">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <h3 id={id} className="font-display text-lg font-bold text-green-dark">
          {title}
        </h3>
        <span className="block text-xs text-hint">{note}</span>
      </span>
    </div>
  );
}

/** The best cluster: its name, governorate and years of service, linked to its page in «التكتلات والمجموعات» */
function ClusterAward({ roll }: { roll: SeasonRoll }) {
  const t = useT();
  const [first, ...others] = roll.clusters;
  if (!first) return null;
  return (
    <Card i={0} className="md:col-span-2 lg:col-span-1 lg:row-span-2">
      <section aria-labelledby="award-cluster" className="flex flex-1 flex-col">
        <Title icon={Building2} id="award-cluster" title={t("أفضل تكتل", "Best cluster")} note={t(`من ${formatNumber(roll.clusters.length)} تكتلات معتمدة`, `Of ${formatNumber(roll.clusters.length)} approved clusters`)} />
        <div className="relative mt-6 flex flex-1 flex-col items-center justify-center rounded-3xl bg-green-dark p-6 text-center text-white">
          <span aria-hidden className="bg-pattern absolute inset-0 rounded-3xl opacity-15" />
          <Trophy className="relative size-12 text-gold" aria-hidden />
          <p className="relative mt-3 font-display text-2xl font-bold text-balance">{first.name}</p>
          <p className="relative mt-1 text-sm text-white/70">
            {t(first.governorate, placeEn(first.governorate))} · {t(`يخدم الحجاج منذ ${first.since}هـ`, `Serving pilgrims since ${first.since} AH`)}
          </p>
          <Stars rating={first.rating} light className="relative mt-3" />
          <p className="relative mt-1 text-xs text-gold">{t(`${first.score.toFixed(1)} من 100`, `${first.score.toFixed(1)} / 100`)}</p>
          <Link href={`/clusters/${first.slug}`} className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink transition hover:bg-white">
            {t("صفحة التكتل", "The cluster's page")}
            <ArrowLeft className="size-4" />
          </Link>
        </div>
        <ol start={2} className="mt-4 space-y-2">
          {others.slice(0, 2).map((c) => (
            <li key={c.slug}>
              <Link href={`/clusters/${c.slug}`} className="flex items-center gap-3 rounded-2xl bg-sand/70 p-2.5 transition hover:bg-gold-light/60">
                <span className="w-6 text-center font-display font-bold text-gold-dark" aria-hidden>
                  {c.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{c.name}</span>
                <Stars rating={c.rating} />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </Card>
  );
}

function RoleAward({ award, i }: { award: SeasonRoll["awards"][number]; i: number }) {
  const t = useT();
  const def = AWARDS.find((a) => a.key === award.key)!;
  const [first, ...others] = award.top;
  return (
    <Card i={i}>
      <section aria-labelledby={`award-${award.key}`} className="flex flex-1 flex-col">
        <Title
          icon={ICONS[award.key]}
          id={`award-${award.key}`}
          title={t(def.ar, def.en)}
          note={t(`من ${formatNumber(award.total)} قيّمهم الموسم`, `Of ${formatNumber(award.total)} rated this season`)}
        />
        {first ? (
          <>
            <Winner h={first} />
            {others.length > 0 && (
              <ol start={2} className="mt-3 space-y-1.5">
                {others.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 rounded-2xl bg-sand/70 p-2">
                    <Medallion name={h.name} female={h.female} place={h.rank} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{h.name}</span>
                    <span className="shrink-0 text-sm font-bold text-gold-dark tabular-nums">{h.rating.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-sand/70 p-4 text-sm text-ink-soft">{t("لا سجلات لهذه الصفة في هذا الموسم.", "No records for this role that season.")}</p>
        )}
      </section>
    </Card>
  );
}

function Winner({ h }: { h: Honouree }) {
  const w = useWords();
  return (
    <div className="mt-5 flex items-center gap-4 rounded-2xl bg-gradient-to-l from-gold/30 to-transparent p-3">
      <Medallion name={h.name} female={h.female} place={1} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold leading-snug text-green-dark">{h.name}</span>
        <span className="block truncate text-xs text-ink-soft">
          {w.role(h.roleKey)} · {w.seasons(h.seasons)}
        </span>
        <span className="block truncate text-xs text-hint">{h.where ?? w.office(h.office)}</span>
        <Stars rating={h.rating} className="mt-1" />
      </span>
    </div>
  );
}
