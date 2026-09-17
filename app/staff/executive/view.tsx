"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bus,
  Flag,
  HeartPulse,
  MessageSquareWarning,
  Printer,
  Star,
  Trophy,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { Counter } from "@/components/ui/motion";
import { EXEC } from "@/lib/data/staff-seed";
import { cn, formatNumber } from "@/lib/utils";
import { Donut, Gate, Legend, PageHeader, Panel, Tabs } from "../_components/kit";

export function ExecutiveView() {
  return (
    <Gate perms={["season.settings", "audit.read"]}>
      <Executive />
    </Gate>
  );
}

function Executive() {
  const [stageView, setStageView] = useState<"compare" | "1448">("compare");
  const funnelMax = EXEC.headline[0].value;
  const splitTotal = EXEC.split.reduce((a, s) => a + s.value, 0);

  return (
    <div>
      <PageHeader
        eyebrow="تقرير نهاية الموسم"
        title="لوحة الإدارة العليا — موسم 1448"
        icon={<BarChart3 />}
        description="ملخص الموسم كما تراه مديرة الموسم والإدارة العليا: من تقدّم ومن حجّ، ورضا الحجاج في كل مرحلة، وأين تتركز الحاجة إلى التحسين في الموسم القادم."
        actions={
          <Button variant="glass" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة التقرير
          </Button>
        }
      />

      {/* Hero numbers */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-green-dark via-green-dark to-[#00352f] p-6 md:p-8">
        <div className="bg-pattern absolute inset-0 opacity-10" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="mb-4 text-sm font-bold text-gold">من التقديم إلى أداء الفريضة</p>
            <ul className="space-y-3">
              {EXEC.headline.map((h, i) => (
                <li key={h.label} className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
                  <span className="text-sm text-white/70">{h.label}</span>
                  <div className="relative h-9 overflow-hidden rounded-xl bg-white/5">
                    <motion.div
                      className={cn("absolute inset-y-0 right-0 rounded-xl", i === EXEC.headline.length - 1 ? "bg-gradient-to-l from-gold to-gold-dark" : "bg-gradient-to-l from-green-light/80 to-green-light/40")}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(6, (h.value / funnelMax) * 100)}%` }}
                      transition={{ duration: 1.1, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center font-display text-lg font-bold text-white">
                      <Counter to={h.value} duration={1.6} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10">
            <p className="text-sm text-white/70">التقييم العام للحجاج</p>
            <p className="font-display text-7xl font-bold text-gold">
              4.3<span className="text-2xl text-white/50"> / 5</span>
            </p>
            <div className="flex gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.span key={n} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4 + n * 0.08, type: "spring" }}>
                  <Star className={cn("size-6", n <= 4 ? "fill-gold text-gold" : "fill-gold/30 text-gold")} />
                </motion.span>
              ))}
            </div>
            <Badge tone="green" className="bg-green-light/20 text-green-light">
              <ArrowUpRight className="size-3.5" /> من 4.0 في موسم 1447
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* People strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { icon: <UsersRound />, label: "الإداريون", value: EXEC.people.admins, hint: `${formatNumber(EXEC.people.adminsCompleted)} أكملوا الموسم` },
          { icon: <Bus />, label: "الموظفون المسافرون", value: EXEC.people.travellingStaff, hint: "البعثات الأربع وفريق المطار" },
          { icon: <HeartPulse />, label: "الحالات الحرجة", value: EXEC.people.critical, hint: "جميعها أُغلقت" },
          { icon: <UserRoundSearch />, label: "المفقودون", value: EXEC.people.missing, hint: `متوسط العثور ${EXEC.people.missingMinutes} دقيقة` },
          { icon: <Trophy />, label: "متوسط أداء الإداريين", value: EXEC.people.adminAvg, hint: "من 100" },
          { icon: <AlertTriangle />, label: "إداريون تحت 70", value: EXEC.people.adminsBelow, hint: "لا يُرشَّحون تلقائياً في 1449" },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="rounded-3xl border border-white/10 bg-white/[.07] p-4 text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-gold [&_svg]:size-4.5">{k.icon}</span>
            <p className="mt-2 text-xs text-white/60">{k.label}</p>
            <p className="font-display text-2xl font-bold">
              <Counter to={k.value} />
            </p>
            <p className="text-[11px] text-white/45">{k.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Panel title="توزيع المؤهلين" icon={<BarChart3 />} delay={0.1}>
          <div className="flex flex-col items-center gap-5">
            <Donut size={190} thickness={26} segments={EXEC.split.map((s) => ({ value: s.value, color: s.color, label: s.label }))}>
              <div>
                <p className="font-display text-2xl font-bold text-green-dark">{formatNumber(splitTotal)}</p>
                <p className="text-xs text-hint">طلباً مؤهلاً</p>
              </div>
            </Donut>
            <div className="w-full">
              <Legend items={EXEC.split.map((s) => ({ label: s.label, color: s.color, value: `${formatNumber(s.value)} · ${Math.round((s.value / splitTotal) * 100)}%` }))} />
            </div>
          </div>
        </Panel>

        <Panel
          title="رضا الحجاج حسب المرحلة"
          icon={<Star />}
          delay={0.15}
          action={
            <Tabs
              id="exec-stage"
              value={stageView}
              onChange={setStageView}
              tabs={[
                { value: "compare", label: "1447 مقابل 1448" },
                { value: "1448", label: "1448 فقط" },
              ]}
            />
          }
        >
          <ul className="space-y-2.5">
            {EXEC.stages.map((s, i) => {
              const delta = Math.round((s.y1448 - s.y1447) * 10) / 10;
              return (
                <li key={s.stage} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3">
                  <span className="truncate text-sm text-ink-soft">{s.stage}</span>
                  <div className="space-y-1">
                    {stageView === "compare" && (
                      <div className="h-2 overflow-hidden rounded-full bg-sand">
                        <motion.div className="h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${(s.y1447 / 5) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.03 }} />
                      </div>
                    )}
                    <div className={cn("overflow-hidden rounded-full bg-sand", stageView === "compare" ? "h-2.5" : "h-4")}>
                      <motion.div
                        className={cn("h-full rounded-full", s.y1448 < 3.8 ? "bg-maroon" : "bg-green-dark")}
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.y1448 / 5) * 100}%` }}
                        transition={{ duration: 0.9, delay: 0.1 + i * 0.03 }}
                      />
                    </div>
                  </div>
                  <span className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums">
                    {s.y1448.toFixed(1)}
                    {stageView === "compare" && <span className={cn("text-[10px]", delta >= 0 ? "text-green-light" : "text-maroon")}>+{delta}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-hint">
            {stageView === "compare" && (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-gold" /> 1447
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-green-dark" /> 1448
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-maroon" /> دون 3.8 — تحتاج خطة تحسين
            </span>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="أكثر الشكاوى تكراراً" icon={<MessageSquareWarning />} delay={0.1}>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Donut size={160} thickness={22} segments={EXEC.complaints.parts.map((p) => ({ value: p.value, color: p.color, label: p.label }))}>
              <div>
                <p className="font-display text-2xl font-bold text-maroon">{formatNumber(EXEC.complaints.total)}</p>
                <p className="text-[11px] text-hint">شكوى</p>
              </div>
            </Donut>
            <div className="w-full flex-1">
              <Legend items={EXEC.complaints.parts.map((p) => ({ label: p.label, color: p.color, value: `${p.value}%` }))} />
              <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-xs text-ink-soft">
                متوسط زمن الإغلاق: <b className="text-green-dark">{EXEC.complaints.avgHours} ساعة</b> — أكثر من نصف الشكاوى عن الوجبات والنقل، وهو ما يوجّه قرارات التعاقد.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="ترتيب التكتلات: الجهات المقيّمة مقابل التقييم الذاتي" icon={<Trophy />} delay={0.15}>
          <ul className="space-y-3">
            {EXEC.clusters.map((c, i) => {
              const gap = Math.round((c.self - c.evaluators) * 10) / 10;
              const flagged = gap > 1;
              const pos = (v: number) => `${((v - 3) / 2) * 100}%`;
              return (
                <motion.li key={c.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="grid grid-cols-[1.5rem_8.5rem_1fr_auto] items-center gap-3">
                  <span className={cn("grid size-6 place-items-center rounded-full text-xs font-bold", i === 0 ? "bg-gold text-ink" : "bg-sand text-ink-soft")}>{i + 1}</span>
                  <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                  <div className="relative h-6" dir="ltr">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-gold/40" />
                    <motion.div
                      className={cn("absolute top-1/2 h-1 -translate-y-1/2 rounded-full", flagged ? "bg-maroon/50" : "bg-green-light/40")}
                      initial={{ width: 0 }}
                      animate={{ left: pos(c.evaluators), width: `${(gap / 2) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                    />
                    <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-dark ring-2 ring-white" style={{ left: pos(c.evaluators) }} title={`الجهات المقيّمة ${c.evaluators}`} />
                    <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold ring-2 ring-white" style={{ left: pos(c.self) }} title={`التقييم الذاتي ${c.self}`} />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold tabular-nums">
                    {c.evaluators}
                    {flagged && (
                      <Badge tone="maroon" className="px-1.5 py-0.5">
                        <Flag className="size-3" /> +{gap}
                      </Badge>
                    )}
                  </span>
                </motion.li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-hint">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green-dark" /> الجهات المقيّمة</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-gold" /> التقييم الذاتي</span>
            <span className="flex items-center gap-1.5"><Flag className="size-3 text-maroon" /> فرق أكثر من نقطة — للمراجعة</span>
            <span className="mr-auto" dir="ltr">3.0 ← 5.0</span>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="مقارنة 1447 مقابل 1448" icon={<BarChart3 />} delay={0.1}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-right text-xs text-hint">
                  <th className="pb-2 font-bold">المؤشر</th>
                  <th className="pb-2 font-bold">1447</th>
                  <th className="pb-2 font-bold">1448</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/20">
                {EXEC.compare.map((r) => (
                  <tr key={r.label}>
                    <td className="py-2.5 font-semibold text-ink">{r.label}</td>
                    <td className="py-2.5 tabular-nums text-hint">{r.y1447}</td>
                    <td className="py-2.5 font-bold tabular-nums text-green-dark">{r.y1448}</td>
                    <td className="py-2.5">
                      {r.better ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-green-light"><ArrowUpRight className="size-4" /> تحسّن</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-maroon"><ArrowDownRight className="size-4" /> تراجع</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="مقدّمو الخدمات" icon={<Bus />} delay={0.15}>
          <ul className="space-y-3">
            {EXEC.providers.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="w-32 truncate text-sm font-semibold text-ink">{p.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand">
                  <motion.div className={cn("h-full rounded-full", p.rating < 3.5 ? "bg-maroon" : p.rating >= 4.5 ? "bg-gold-dark" : "bg-green-dark")} initial={{ width: 0 }} animate={{ width: `${(p.rating / 5) * 100}%` }} transition={{ duration: 0.9 }} />
                </div>
                <span className="w-8 text-left text-sm font-bold tabular-nums">{p.rating}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-start gap-2 rounded-2xl bg-gold/15 p-3 text-ink">
              <Trophy className="mt-0.5 size-4 shrink-0 text-gold-dark" /> أفضل مقدّم نقل: شركة (س) 4.7 — أفضل تكتل: النور 4.6
            </p>
            <p className="flex items-start gap-2 rounded-2xl bg-maroon/5 p-3 text-maroon ring-1 ring-maroon/15">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> أدنى مقدّم إعاشة: شركة (ص) 3.1 ← توصية: مراجعة العقد قبل موسم 1449
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
