"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Layers, Medal, Minus, ShieldAlert, Trophy } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { Badge } from "@/components/ui/widgets";
import { DEMO_CLUSTERS, DEMO_GROUPS } from "@/lib/data/grading-demo";
import { OUTCOME_TEXT, standingOf, tierLabel } from "@/lib/grading";
import { useSeason } from "@/lib/season-live";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";

const ICON = { promote: ArrowUpRight, ceiling: Trophy, hold: Minus, demote: ArrowDownRight, warned: ShieldAlert };

/**
 * What the season's classification did to this group or cluster. It is ranked inside its own tier
 * against every tier-mate in the country, and only appears once the administration publishes the
 * results. The head sees his rank, his score, and whether his tier moved.
 */
export function StandingCard({ scope, name }: { scope: "group" | "cluster"; name: string | number | undefined }) {
  const season = useSeason();
  const published = useStore((s) => s.grading.publishedAt);
  const entries = scope === "group" ? DEMO_GROUPS : DEMO_CLUSTERS;
  const id = scope === "group" ? `g-${name}` : entries.find((e) => e.name === name)?.id;
  const rules = { promoteShare: season.grading.promoteShare, demoteShare: season.grading.demoteShare, honorTop: season.grading.honorTop };
  const standing = id ? standingOf(id, entries, rules) : null;
  if (!published || !standing) return null;

  const info = OUTCOME_TEXT[standing.outcome];
  const Icon = ICON[standing.outcome];
  const tier = standing.tierResult;
  const mine = scope === "group" ? "مجموعتك" : "تكتلك";
  const pct = Math.round((standing.rank / tier.total) * 100);

  return (
    <Card className="md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
          <Layers className="size-5 text-gold-dark" /> تصنيف {scope === "group" ? "مجموعتك" : "تكتلك"} — نهاية الموسم
        </h3>
        <Badge tone={info.tone === "green" ? "green" : info.tone === "gold" ? "gold" : "maroon"}>
          <Icon className="size-3.5" /> {info.label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["الفئة الحالية", tier.label, tier.service],
          ["نتيجة التقييم", `${standing.entry.score}%`, "من 100"],
          ["المرتبة في الفئة", `${standing.rank} من ${formatNumber(tier.total)}`, `على مستوى كل المكاتب — أعلى ${pct}%`],
        ].map(([k, v, hint]) => (
          <div key={k} className="rounded-2xl bg-sand p-3">
            <p className="text-xs text-hint">{k}</p>
            <p className="mt-0.5 font-display text-xl font-bold text-green-dark">{v}</p>
            <p className="text-xs text-ink-soft">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sand" role="img" aria-label="موقعك في الفئة">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${100 - pct}%` }}
          transition={{ duration: 0.8 }}
          className={cn("h-full", info.tone === "green" ? "bg-green-light" : info.tone === "gold" ? "bg-gold-dark" : "bg-maroon")}
        />
      </div>

      <p className="mt-3 leading-7 text-ink-soft">
        {info.note}.{" "}
        {standing.outcome === "promote"
          ? `تنتقل ${mine} إلى ${tierLabel(standing.nextTier)} في الموسم القادم.`
          : standing.outcome === "demote"
            ? `تنتقل ${mine} إلى ${tierLabel(standing.nextTier)} في الموسم القادم.`
            : standing.outcome === "warned"
              ? `لا فئة أدنى من فئة البداية، فيُسجَّل إنذار في ملفك وتبقى ${mine} في ${tier.label}.`
              : `تبقى ${mine} في ${tier.label}.`}{" "}
        الترقية للأعلى تقييماً بنسبة {Math.round(rules.promoteShare * 100)}% من الفئة، والتخفيض للأدنى بنسبة {Math.round(rules.demoteShare * 100)}%.
      </p>

      {standing.honored && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-gold/20 p-4 font-bold text-maroon">
          <Medal className="size-5" /> من الأوائل {rules.honorTop} في {tier.label} — تُكرَّم في ختام الموسم.
        </p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-maroon">مكوّنات نتيجتك</summary>
        <ul className="mt-2 space-y-1.5 text-sm">
          {standing.entry.parts.map((p) => (
            <li key={p.label} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2">
              <span>
                {p.label} <span className="text-xs text-hint">({Math.round(p.weight * 100)}%)</span>
              </span>
              <b className="tabular-nums">{p.value}%</b>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
