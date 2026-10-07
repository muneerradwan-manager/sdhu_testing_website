"use client";

import { motion } from "motion/react";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, BadgeCheck, Layers, Medal, Minus, Search, ShieldAlert, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { SCORE_PARTS } from "@/lib/data/grading-demo";
import { useEvaluatedIds, useGraded } from "@/lib/grading-live";
import { OUTCOME_TEXT, classify, tierLabel, type Outcome, type Ranked, type TierResult } from "@/lib/grading";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { fmtDateTime, Panel, smallInputClass, stamp, useStaffUser } from "../../_components/kit";
import { Chip } from "../../_components/ops-ui";
import { SystemRecords } from "../../_components/system";
import { logAdmins, useAdminsDesk } from "../desk";

type Scope = "groups" | "clusters";

/** The entry tier cannot demote (it warns) and the top tier cannot promote (it holds its ceiling) */
type Filter = "all" | "up" | "hold" | "down";
const FILTERS: Record<Filter, (o: Outcome) => boolean> = {
  all: () => true,
  up: (o) => o === "promote" || o === "ceiling",
  hold: (o) => o === "hold",
  down: (o) => o === "demote" || o === "warned",
};

const SCOPES: { key: Scope; label: string; unit: string }[] = [
  { key: "groups", label: "المجموعات", unit: "مجموعة" },
  { key: "clusters", label: "التكتلات", unit: "تكتل" },
];

const OUTCOME_ICON: Record<Outcome, typeof ArrowUpRight> = {
  promote: ArrowUpRight,
  ceiling: BadgeCheck,
  hold: Minus,
  demote: ArrowDownRight,
  warned: ShieldAlert,
};

/**
 * The end of the season: the groups and the clusters ranked inside their tier across every office, the
 * top share of each tier promoted and the bottom share moved down, by the shares the director set in
 * «إعدادات الموسم». The scores are the season's, with the evaluation the holder entered folded in; he
 * publishes the classification, and every head then sees his rank and where his tier goes.
 */
export function GradingTab() {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const desk = useAdminsDesk();
  const published = useStore((s) => s.grading);
  const [scope, setScope] = useState<Scope>("groups");
  const rules = { promoteShare: season.grading.promoteShare, demoteShare: season.grading.demoteShare, honorTop: season.grading.honorTop };
  const entries = useGraded(scope);
  const evaluated = useEvaluatedIds(scope);
  const tiers = useMemo(() => classify(entries, rules), [entries, rules.promoteShare, rules.demoteShare, rules.honorTop]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = SCOPES.find((s) => s.key === scope)!;
  const totals = tiers.reduce(
    (t, x) => ({ total: t.total + x.total, up: t.up + x.rows.filter((r) => r.outcome === "promote").length, down: t.down + x.rows.filter((r) => r.outcome === "demote").length }),
    { total: 0, up: 0, down: 0 },
  );

  const publish = () => {
    const { groups, clusters } = desk.classified;
    actions.setGrading({ publishedAt: stamp(), publishedBy: user.name });
    logAdmins(user, "grading", {
      action: published.publishedAt ? "إعادة اعتماد نتائج التصنيف ونشرها" : "اعتماد نتائج التصنيف ونشرها",
      target: `${formatNumber(groups.total)} مجموعة و${formatNumber(clusters.total)} تكتلاً`,
      detail: `${Math.round(rules.promoteShare * 100)}% ترقية و${Math.round(rules.demoteShare * 100)}% تخفيض في كل فئة — المجموعات: ${groups.up} ترقية و${groups.down} تخفيض، التكتلات: ${clusters.up} ترقية و${clusters.down} تخفيض`,
      important: true,
    });
    toast({ title: "اعتُمد التصنيف ونُشر", body: "يرى كل رئيس مجموعة أو تكتل مرتبته ومآل فئته.", icon: "🏅", tone: "success" });
  };

  return (
    <div className="space-y-6">
      <Panel
        icon={<Layers />}
        title="التصنيف ونشره"
        action={
          <Button size="sm" variant="gold" onClick={publish}>
            {published.publishedAt ? "إعادة اعتماد النتائج" : "اعتماد النتائج ونشرها"}
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/80">
          الترتيب داخل كل فئة على مستوى كل المكاتب معاً. الأعلى تقييماً بنسبة <b className="text-gold">{Math.round(rules.promoteShare * 100)}%</b> من الفئة تُرقّى فئةً، والأدنى بنسبة{" "}
          <b className="text-gold">{Math.round(rules.demoteShare * 100)}%</b> تُخفَّض فئةً، ومن بينهما يبقى في فئته. رئيس المجموعة في موسمه الأول يبدأ من الفئة الأولى حصراً. النسب من «إعدادات الموسم».
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {published.publishedAt ? (
            <Chip tone="green">
              <BadgeCheck className="size-3.5" /> منشور — اعتمده {published.publishedBy} في {fmtDateTime(published.publishedAt)}
            </Chip>
          ) : (
            <Chip tone="gold">لم يُنشر بعد</Chip>
          )}
          {desk.stale && <Chip tone="maroon">حُفظت تقييمات بعد نشره</Chip>}
          <span className="text-white/60">محتسب من تقييم {desk.evaluated.length} إداريين</span>
        </p>
      </Panel>

      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={scope === s.key}
            onClick={() => setScope(s.key)}
            className={cn("rounded-full border-2 px-5 py-2 text-sm font-bold transition", scope === s.key ? "border-gold bg-gold text-green-dark" : "border-white/20 bg-white/5 text-white/80 hover:border-gold/50")}
          >
            {s.label}
          </button>
        ))}
        <span className="text-sm text-white/60">
          {formatNumber(totals.total)} {meta.unit} في {tiers.length} فئات — {totals.up} ترقية و{totals.down} تخفيض
        </span>
      </div>

      {tiers.map((tier, i) => (
        <TierPanel key={tier.tier} tier={tier} unit={meta.unit} honorTop={rules.honorTop} shares={rules} evaluated={evaluated} delay={i * 0.05} />
      ))}

      <SystemRecords system="admins" area="grading" title="سجل التصنيف" />
    </div>
  );
}

function TierPanel({
  tier,
  unit,
  honorTop,
  shares,
  evaluated,
  delay,
}: {
  tier: TierResult;
  unit: string;
  honorTop: number;
  shares: { promoteShare: number; demoteShare: number };
  evaluated: Set<string>;
  delay: number;
}) {
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<Filter>("all");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim();
  const filtered = tier.rows.filter((r) => FILTERS[only](r.outcome)).filter((r) => !q || r.entry.name.includes(q) || r.entry.head.includes(q) || r.entry.office.includes(q));
  const rows = showAll || q || only !== "all" ? filtered : filtered.slice(0, 12);
  const podium = tier.rows.slice(0, honorTop);
  const upPct = Math.round(shares.promoteShare * 100);
  const downPct = Math.round(shares.demoteShare * 100);

  return (
    <Panel
      delay={delay}
      icon={<Layers />}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {tier.label} <span className="text-sm font-normal text-white/60">— مستوى الخدمة {tier.service}</span>
        </span>
      }
      action={<span className="font-display text-2xl font-bold text-gold">{formatNumber(tier.total)} {unit}</span>}
    >
      {/* the arithmetic, written out */}
      <p className="rounded-2xl bg-white/5 p-4 text-sm leading-7 text-white/85">
        {formatNumber(tier.total)} {unit} في هذه الفئة على مستوى كل المكاتب. الأعلى تقييماً {upPct}% = <b className="text-green-light">{tier.promoteCount}</b>{" "}
        {tier.promoteCount > 0 && tier.rows[0]?.outcome === "ceiling" ? "تبقى في أعلى فئة (لا فئة فوقها)" : `تُرقّى إلى ${tierLabel(tier.tier + 1)}`}، والأدنى تقييماً {downPct}% ={" "}
        <b className="text-maroon-light">{tier.demoteCount}</b> {tier.tier === 1 ? "تُنذَر (لا فئة أدنى من فئة البداية)" : `تُخفَّض إلى ${tierLabel(tier.tier - 1)}`}، و<b>{tier.holdCount}</b> بينهما تبقى في فئتها.
        <span className="mt-1 block text-xs text-white/55">
          الحساب: {formatNumber(tier.total)} × {upPct}% = {(tier.total * shares.promoteShare).toFixed(1)} ← {tier.promoteCount} — و{formatNumber(tier.total)} × {downPct}% ={" "}
          {(tier.total * shares.demoteShare).toFixed(1)} ← {tier.demoteCount}
        </span>
      </p>

      {/* the split as one bar */}
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10" role="img" aria-label="توزيع الفئة">
        <motion.span initial={{ width: 0 }} animate={{ width: `${(tier.promoteCount / tier.total) * 100}%` }} transition={{ duration: 0.7 }} className="bg-green-light" />
        <motion.span initial={{ width: 0 }} animate={{ width: `${(tier.holdCount / tier.total) * 100}%` }} transition={{ duration: 0.7, delay: 0.1 }} className="bg-gold/70" />
        <motion.span initial={{ width: 0 }} animate={{ width: `${(tier.demoteCount / tier.total) * 100}%` }} transition={{ duration: 0.7, delay: 0.2 }} className="bg-maroon" />
      </div>

      {/* the honoured */}
      <div className="mt-5">
        <p className="flex items-center gap-2 text-sm font-bold text-gold">
          <Trophy className="size-4" /> الأوائل {honorTop} في {tier.label} — يُكرَّمون في ختام الموسم
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {podium.map((r, i) => (
            <li key={r.entry.id} className={cn("flex items-center gap-3 rounded-2xl p-3 ring-1", i === 0 ? "bg-gold/20 ring-gold/50" : "bg-white/5 ring-white/15")}>
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-lg font-bold", i === 0 ? "bg-gold text-green-dark" : "bg-white/10 text-gold")}>
                <Medal className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-white">{r.entry.name}</span>
                <span className="block truncate text-xs text-white/60">
                  {r.entry.head} — {r.entry.score}%
                </span>
              </span>
              <span className="mr-auto font-display text-xl font-bold text-gold">{r.rank}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* search and filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`ابحث في ${tier.label} بالاسم أو الرئيس أو المكتب`} aria-label={`بحث في ${tier.label}`} className={cn(smallInputClass, "pr-10")} />
        </label>
        {(
          [
            ["all", "الكل"],
            ["up", "المرقّاة"],
            ["hold", "الثابتة"],
            ["down", "المخفَّضة"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={only === k}
            onClick={() => setOnly(k)}
            className={cn("rounded-full border px-3 py-2 text-xs font-bold transition", only === k ? "border-gold bg-gold text-green-dark" : "border-white/20 bg-white/5 text-white/75")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* the ranking */}
      <ul className="mt-3 space-y-1.5">
        {rows.length === 0 && <li className="rounded-xl bg-white/5 px-3 py-3 text-sm text-white/50">لا نتائج مطابقة.</li>}
        {rows.map((r) => (
          <Row key={r.entry.id} r={r} evaluated={evaluated.has(r.entry.id)} />
        ))}
      </ul>
      {!q && only === "all" && tier.rows.length > 12 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10" onClick={() => setShowAll(!showAll)}>
            {showAll ? "عرض الأوائل فقط" : `عرض الترتيب كاملاً (${formatNumber(tier.total)})`} <ArrowLeft className="size-4" />
          </Button>
          {!showAll && (
            <span className="text-xs text-white/50">
              حدّ الترقية عند المرتبة {tier.promoteCount}، وحدّ التخفيض يبدأ من المرتبة {tier.total - tier.demoteCount + 1}
            </span>
          )}
        </div>
      )}
    </Panel>
  );
}

function Row({ r, evaluated }: { r: Ranked; evaluated?: boolean }) {
  const [open, setOpen] = useState(false);
  const info = OUTCOME_TEXT[r.outcome];
  const Icon = OUTCOME_ICON[r.outcome];
  return (
    <li className={cn("rounded-xl ring-1 transition", r.honored ? "bg-gold/10 ring-gold/35" : "bg-white/5 ring-white/10")}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-3 p-3 text-right">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg font-display font-bold", r.honored ? "bg-gold text-green-dark" : "bg-white/10 text-white/80")}>{r.rank}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-white">
            {r.entry.name}
            {r.honored && <span className="mr-2 text-xs font-bold text-gold">مكرَّم</span>}
          </span>
          <span className="block truncate text-xs text-white/55">
            {r.entry.head} — {r.entry.office}
            {evaluated && <span className="mr-1.5 font-bold text-gold">— محتسبة من تقييم الموظفين</span>}
          </span>
        </span>
        <span className="font-display text-xl font-bold text-white tabular-nums">{r.entry.score}%</span>
        <Chip tone={info.tone} className="py-1">
          <Icon className="size-3.5" /> {info.label}
        </Chip>
      </button>
      {open && (
        <div className="border-t border-white/10 p-3 text-sm">
          <p className="text-white/70">
            {r.entry.name} — المرتبة {r.rank} على مستوى كل المكاتب في فئته. {info.note}.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {r.entry.parts.map((p) => (
              <li key={p.label} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                <span className="text-white/70">
                  {p.label} <span className="text-xs text-white/40">({Math.round(p.weight * 100)}%)</span>
                </span>
                <span className="font-bold text-white tabular-nums">{p.value}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-white/45">
            النتيجة النهائية = مجموع المكوّنات بأوزانها ({SCORE_PARTS.map((p) => `${Math.round(p.weight * 100)}%`).join(" + ")}) = {r.entry.score}%
          </p>
        </div>
      )}
    </li>
  );
}
