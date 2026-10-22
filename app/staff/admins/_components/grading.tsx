"use client";

import { ArrowDownRight, ArrowUpRight, BadgeCheck, Medal, Minus, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { SCORE_PARTS } from "@/lib/data/grading-demo";
import { useEvaluatedIds, useGraded } from "@/lib/grading-live";
import { OUTCOME_TEXT, classify, tierLabel, type Outcome, type Ranked, type TierResult } from "@/lib/grading";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";
import { Drawer, fmtDateTime, stamp, useCan, useStaffUser } from "../../_components/kit";
import { SearchBox } from "../../_components/ops-ui";
import { Box, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, Locked, TitleCell } from "./ui";
import { logAdmins, useAdminsDesk } from "../desk";

type Scope = "groups" | "clusters";

/** The entry tier cannot demote (it warns) and the top tier cannot promote (it holds its ceiling) */
type Filter = "all" | "up" | "hold" | "down" | "honored";
const FILTERS: Record<Filter, (r: Ranked) => boolean> = {
  all: () => true,
  up: (r) => r.outcome === "promote" || r.outcome === "ceiling",
  hold: (r) => r.outcome === "hold",
  down: (r) => r.outcome === "demote" || r.outcome === "warned",
  honored: (r) => r.honored,
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
 * «التصنيف» — the end of the season, as a site's list with its publish box: the groups and the clusters ranked
 * inside their tier across every office, the top share of each tier promoted and the bottom share moved down,
 * by the shares the director set in «إعدادات الموسم». The ranking is one table filtered by scope, tier and
 * outcome; publishing is the side box. How each tier splits is on the file's summary.
 */
export function GradingTab() {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const desk = useAdminsDesk();
  const published = useStore((s) => s.grading);
  const mayPublish = useCan()("admins.grading.publish");
  const [scope, setScope] = useState<Scope>("groups");
  const [tierKey, setTierKey] = useState("all");
  const [only, setOnly] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(50);
  const [open, setOpen] = useState<{ r: Ranked; tier: TierResult } | null>(null);
  const rules = { promoteShare: season.grading.promoteShare, demoteShare: season.grading.demoteShare, honorTop: season.grading.honorTop };
  const entries = useGraded(scope);
  const evaluated = useEvaluatedIds(scope);
  const tiers = useMemo(() => classify(entries, rules), [entries, rules.promoteShare, rules.demoteShare, rules.honorTop]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = SCOPES.find((s) => s.key === scope)!;
  const inTier = tiers.filter((t) => tierKey === "all" || String(t.tier) === tierKey).flatMap((t) => t.rows.map((r) => ({ r, tier: t })));
  const q = query.trim();
  const list = inTier.filter(({ r }) => FILTERS[only](r)).filter(({ r }) => !q || r.entry.name.includes(q) || r.entry.head.includes(q) || r.entry.office.includes(q));
  const tier = tiers.find((t) => String(t.tier) === tierKey);
  const upPct = Math.round(rules.promoteShare * 100);
  const downPct = Math.round(rules.demoteShare * 100);

  const publish = () => {
    const { groups, clusters } = desk.classified;
    actions.setGrading({ publishedAt: stamp(), publishedBy: user.name });
    logAdmins(user, "grading", {
      action: published.publishedAt ? "إعادة اعتماد نتائج التصنيف ونشرها" : "اعتماد نتائج التصنيف ونشرها",
      target: `${formatNumber(groups.total)} مجموعة و${formatNumber(clusters.total)} تكتلاً`,
      detail: `${upPct}% ترقية و${downPct}% تخفيض في كل فئة — المجموعات: ${groups.up} ترقية و${groups.down} تخفيض، التكتلات: ${clusters.up} ترقية و${clusters.down} تخفيض`,
      important: true,
    });
    toast({ title: "اعتُمد التصنيف ونُشر", body: "يرى كل رئيس مجموعة أو تكتل مرتبته ومآل فئته.", icon: "🏅", tone: "success" });
  };

  return (
    <div className="space-y-5">
      <EditLayout
        main={
          <div className="space-y-4">
            <Title>ترتيب {meta.label}</Title>
            <Lead>
              داخل كل فئة على مستوى كل المكاتب: الأعلى {upPct}% تُرقّى فئةً، والأدنى {downPct}% تُخفَّض فئةً، ومن بينهما يبقى في فئته.
            </Lead>
            <div className="flex flex-wrap items-center gap-3">
              <Filters
                label="المجموعات أو التكتلات"
                value={scope}
                onChange={(v) => {
                  setScope(v);
                  setTierKey("all");
                }}
                items={SCOPES.map((s) => ({ key: s.key, label: s.label }))}
              />
              <span className="text-white/25">—</span>
              <Filters label="الفئة" value={tierKey} onChange={setTierKey} items={[{ key: "all", label: "كل الفئات", count: tiers.reduce((n, t) => n + t.total, 0) }, ...tiers.map((t) => ({ key: String(t.tier), label: t.label, count: t.total }))]} />
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Filters
                label="المآل"
                value={only}
                onChange={setOnly}
                items={[
                  { key: "all", label: "الكل", count: inTier.length },
                  { key: "up", label: "المرقّاة", count: inTier.filter(({ r }) => FILTERS.up(r)).length },
                  { key: "hold", label: "الثابتة", count: inTier.filter(({ r }) => FILTERS.hold(r)).length },
                  { key: "down", label: "المخفَّضة", count: inTier.filter(({ r }) => FILTERS.down(r)).length },
                  { key: "honored", label: "المكرَّمون", count: inTier.filter(({ r }) => r.honored).length },
                ]}
              />
              <SearchBox className="md:w-72" value={query} onChange={setQuery} placeholder="الاسم أو الرئيس أو المكتب" label="بحث في الترتيب" />
            </div>
            <ListTable head={["المرتبة", meta.unit === "مجموعة" ? "المجموعة" : "التكتل", "الفئة", "النتيجة", "المآل"]}>
              {list.length === 0 && <EmptyRow cols={5}>لا نتائج مطابقة.</EmptyRow>}
              {list.slice(0, shown).map(({ r, tier: t }) => {
                const info = OUTCOME_TEXT[r.outcome];
                const Icon = OUTCOME_ICON[r.outcome];
                return (
                  <tr key={r.entry.id} className={r.honored ? "bg-gold/[.07]" : undefined}>
                    <td className="w-16 p-3 align-top font-display text-lg font-bold text-gold">
                      {r.rank}
                      {r.honored && <Medal className="ms-1 inline size-4" aria-label="مكرَّم" />}
                    </td>
                    <TitleCell
                      title={r.entry.name}
                      onOpen={() => setOpen({ r, tier: t })}
                      sub={
                        <>
                          {r.entry.head} — {r.entry.office}
                          {evaluated.has(r.entry.id) && <span className="ms-1 font-bold text-gold">— محتسبة من تقييم الموظفين</span>}
                        </>
                      }
                      actions={
                        <RowActions>
                          <RowLink onClick={() => setOpen({ r, tier: t })}>التفاصيل</RowLink>
                        </RowActions>
                      }
                    />
                    <td className="p-3 align-top text-white/80">{t.label}</td>
                    <td className="p-3 align-top font-display text-lg font-bold tabular-nums">{r.entry.score}%</td>
                    <td className="p-3 align-top">
                      <Tag tone={info.tone}>
                        <Icon className="me-1 size-3.5" /> {info.label}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </ListTable>
            {list.length > shown && (
              <Button size="sm" variant="glass" onClick={() => setShown(shown + 100)}>
                عرض المزيد ({list.length - shown})
              </Button>
            )}
          </div>
        }
        side={
          <>
            <Box title="النشر">
              {published.publishedAt ? (
                <p>
                  <Tag tone="green">منشور</Tag> <span className="text-xs text-white/65">اعتمده {published.publishedBy} في {fmtDateTime(published.publishedAt)}</span>
                </p>
              ) : (
                <Tag tone="gold">لم يُنشر بعد</Tag>
              )}
              {desk.stale && <p className="rounded-xl bg-maroon/25 p-2 text-xs font-bold text-white ring-1 ring-maroon/50">حُفظت تقييمات بعد نشره: أعد اعتماده ليراها.</p>}
              <p className="text-xs text-white/60">محتسب من تقييم {desk.evaluated.length} إداريين. بعد النشر يرى كل رئيس مجموعة أو تكتل مرتبته ومآل فئته.</p>
              <Button variant="gold" className="w-full" disabled={!mayPublish} onClick={publish}>
                {published.publishedAt ? "إعادة اعتماد النتائج" : "اعتماد النتائج ونشرها"}
              </Button>
              <Locked perm="admins.grading.publish" />
            </Box>
            <Help title="كيف يُحسب التصنيف؟">
              <p>
                الترتيب داخل كل فئة على مستوى كل المكاتب معاً. الأعلى تقييماً بنسبة {upPct}% من الفئة تُرقّى فئةً، والأدنى بنسبة {downPct}% تُخفَّض فئةً. فئة البداية لا تُخفَّض بل تُنذَر، والفئة العليا لا تُرقّى. ويُكرَّم الأوائل {rules.honorTop} في كل فئة.
              </p>
              <p>رئيس المجموعة في موسمه الأول يبدأ من الفئة الأولى حصراً. النسب من «إعدادات الموسم».</p>
              {tier && (
                <p className="text-xs text-white/60">
                  في {tier.label}: {formatNumber(tier.total)} × {upPct}% ← {tier.promoteCount} {tier.promoteCount > 0 && tier.rows[0]?.outcome === "ceiling" ? "تبقى في أعلى فئة" : `تُرقّى إلى ${tierLabel(tier.tier + 1)}`}، و{formatNumber(tier.total)} × {downPct}% ← {tier.demoteCount} {tier.tier === 1 ? "تُنذَر" : `تُخفَّض إلى ${tierLabel(tier.tier - 1)}`}، و{tier.holdCount} تبقى. حدّ الترقية عند المرتبة {tier.promoteCount}، وحدّ التخفيض يبدأ من المرتبة {tier.total - tier.demoteCount + 1}.
                </p>
              )}
            </Help>
          </>
        }
      />
      <RecordsBox system="admins" area="grading" title="سجل التصنيف" />

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.r.entry.name ?? ""} width="max-w-lg">
        {open && (
          <div className="space-y-4 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <Tag tone={OUTCOME_TEXT[open.r.outcome].tone}>{OUTCOME_TEXT[open.r.outcome].label}</Tag>
              {open.r.honored && <Tag tone="gold">مكرَّم</Tag>}
            </p>
            <p className="leading-7 text-white/75">
              {open.r.entry.name} — المرتبة {open.r.rank} في {open.tier.label} على مستوى كل المكاتب. {OUTCOME_TEXT[open.r.outcome].note}.
            </p>
            <p className="text-white/70">
              {open.r.entry.head} — {open.r.entry.office}
            </p>
            <ListTable head={["المكوّن", "وزنه", "قيمته"]} minWidth="20rem">
              {open.r.entry.parts.map((p) => (
                <tr key={p.label}>
                  <td className="p-3 text-white/80">{p.label}</td>
                  <td className="p-3 tabular-nums text-white/60">{Math.round(p.weight * 100)}%</td>
                  <td className="p-3 font-bold tabular-nums">{p.value}%</td>
                </tr>
              ))}
            </ListTable>
            <p className="text-xs text-white/50">
              النتيجة النهائية = مجموع المكوّنات بأوزانها ({SCORE_PARTS.map((p) => `${Math.round(p.weight * 100)}%`).join(" + ")}) = {open.r.entry.score}%
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
