"use client";

import { motion } from "motion/react";
import { CircleAlert, CircleCheck, Layers, MessageSquareQuote, Star, ThumbsUp } from "lucide-react";
import { Badge, Modal } from "@/components/ui/widgets";
import { useSeason } from "@/lib/season-live";
import { cn, countOf } from "@/lib/utils";
import { lastServed, roleOptions, type SeasonRecord } from "../../_lib/admin";
import { PILGRIMS, seasonRating } from "../../_lib/ratings";

const tone = (v: number) => (v >= 4.5 ? "bg-green-light" : v >= 3.5 ? "bg-gold-dark" : "bg-maroon");

/**
 * One season of «السجل الموسمي», opened: not only the rating but how it was reached — the four sources
 * and their weights, the pilgrims' stars, what was recorded against him and what was praised — and,
 * for his last season, what it means for this season's application.
 */
export function SeasonSheet({ id, record, onClose }: { id: string; record: SeasonRecord | null; onClose: () => void }) {
  const season = useSeason();
  const d = record ? seasonRating(id, record) : null;
  const last = lastServed(id);
  const keep = d && last?.season === d.season ? roleOptions(id, { keepRoleMinRating: season.administrators.keepRoleMinRating }).keep : null;

  return (
    <Modal open={!!d} onClose={onClose} className="max-w-2xl! md:p-8">
      {d && (
        <div className="space-y-7">
          <header className="flex flex-wrap items-end justify-between gap-4 pl-8">
            <div>
              <p className="text-sm font-bold text-gold-dark">موسم {d.season}</p>
              <h3 className="font-display text-2xl font-bold text-green-dark">
                {d.role}
                {d.group && <span className="text-ink-soft"> — {d.group}</span>}
              </h3>
            </div>
            <p className={cn("flex items-center gap-1.5 rounded-2xl px-4 py-2 font-display text-2xl font-bold text-white", tone(d.rating))}>
              <Star className="size-5 fill-current" /> {d.rating} <span className="text-sm font-normal text-white/80">من 5</span>
            </p>
          </header>

          <section>
            <h4 className="font-bold text-ink">كيف حُسب التقييم</h4>
            <p className="mt-1 text-sm text-ink-soft">أربعة مصادر، لكل منها وزنه في لائحة التقييم التي وافقت عليها في «قبول التقييم».</p>
            <ul className="mt-4 space-y-3">
              {d.sources.map((s, i) => (
                <li key={s.key} className="rounded-2xl bg-sand p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold">
                      {s.label} {s.who && <span className="text-xs font-normal text-hint">— {s.who}</span>}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-ink-soft" dir="ltr">
                      {s.value.toFixed(1)} × {Math.round(s.weight * 100)}% = <b className="text-ink">{s.points.toFixed(2)}</b>
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <motion.div className={cn("h-full rounded-full", tone(s.value))} initial={{ width: 0 }} animate={{ width: `${(s.value / 5) * 100}%` }} transition={{ delay: 0.05 * i }} />
                  </div>
                  <p className="mt-1.5 text-xs text-hint">{s.how}</p>
                  {s.note && <p className="mt-2 border-r-2 border-gold pr-3 text-sm leading-6 text-ink-soft">«{s.note}»</p>}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center justify-between rounded-2xl border-2 border-gold/40 px-4 py-2.5 font-bold">
              <span>المجموع</span>
              <span className="font-mono tabular-nums" dir="ltr">
                {d.sources.map((s) => s.points.toFixed(2)).join(" + ")} = {d.sources.reduce((t, s) => t + s.points, 0).toFixed(2)} ≈ {d.rating}
              </span>
            </p>
          </section>

          <section>
            <h4 className="font-bold text-ink">نجوم الحجاج</h4>
            <ul className="mt-3 space-y-1.5">
              {d.stars.map((n, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 font-bold text-gold-dark">{5 - i} ★</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand">
                    <motion.span className={cn("block h-full rounded-full", 5 - i >= 4 ? "bg-green-light" : 5 - i === 3 ? "bg-gold-dark" : "bg-maroon")} initial={{ width: 0 }} animate={{ width: `${(n / d.raters) * 100}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-left text-xs tabular-nums text-ink-soft">{countOf(n, PILGRIMS)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="flex items-center gap-2 font-bold text-ink">
              <CircleAlert className="size-4 text-maroon" /> ما سُجّل عليه
            </h4>
            {d.deductions.length ? (
              <ul className="mt-3 space-y-2">
                {d.deductions.map((x) => (
                  <li key={x.text} className="flex items-start justify-between gap-3 rounded-2xl border border-maroon/20 bg-maroon/5 px-4 py-3 text-sm">
                    <span>
                      <span className="leading-6 text-ink">{x.text}</span>
                      <span className="block text-xs text-hint">سجّله: {x.by}</span>
                    </span>
                    <span className="shrink-0 font-mono font-bold text-maroon" dir="ltr">−{x.points.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-2xl bg-green-light/10 px-4 py-3 text-sm font-semibold text-green">لا مخالفة مسجّلة في هذا الموسم — الانضباط 5 من 5.</p>
            )}
          </section>

          {d.praise.length > 0 && (
            <section>
              <h4 className="flex items-center gap-2 font-bold text-ink">
                <ThumbsUp className="size-4 text-green" /> ما أُشيد به
              </h4>
              <ul className="mt-3 space-y-1.5 text-sm">
                {d.praise.map((t) => (
                  <li key={t} className="flex items-start gap-2 leading-6">
                    <CircleCheck className="mt-1 size-4 shrink-0 text-green-light" /> {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="flex items-center gap-2 font-bold text-ink">
              <MessageSquareQuote className="size-4 text-gold-dark" /> من تعليقات الحجاج
            </h4>
            <ul className="mt-3 space-y-2">
              {d.quotes.map((q) => (
                <li key={q.text} className="rounded-2xl bg-sand px-4 py-3 text-sm leading-6">
                  <span className="text-gold-dark">{"★".repeat(q.stars)}</span>
                  <span className="text-hint">{"★".repeat(5 - q.stars)}</span> «{q.text}»
                </li>
              ))}
            </ul>
          </section>

          {d.standing && (
            <section className="rounded-2xl border-2 border-gold/40 p-4">
              <h4 className="flex flex-wrap items-center justify-between gap-2 font-bold text-ink">
                <span className="flex items-center gap-2">
                  <Layers className="size-4 text-gold-dark" /> تصنيف {d.standing.group} نهاية الموسم
                </span>
                <Badge tone={d.standing.tone}>{d.standing.outcome}</Badge>
              </h4>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                نتيجة {d.standing.group} {d.standing.score} من 100 — المرتبة {d.standing.rank} من {d.standing.total} في {d.standing.tier} على مستوى كل المكاتب. {d.standing.note}.
              </p>
            </section>
          )}

          {keep && (
            <p className={cn("rounded-2xl px-4 py-3 text-sm font-semibold leading-6", keep.ok ? "bg-green-light/10 text-green" : "bg-maroon/10 text-maroon")}>
              أثره على طلب موسم 1448: {keep.reason}.{!keep.ok && " وتبقى له الصفات الأخرى بالامتحانين."}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
