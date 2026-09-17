"use client";

import { AnimatePresence, motion } from "motion/react";
import { BellRing, CheckCircle2, Info, Thermometer, User, UsersRound } from "lucide-react";
import { SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MASHAER_ITEMS, noticesFor, stageQuestionFor, type Notice } from "../_data";
import type { SeasonCtx } from "./ctx";
import { logPilgrimSeason } from "./meals";

const TONE: Record<Notice["tone"], { cls: string; icon: React.ReactNode }> = {
  heat: { cls: "border-maroon/40 bg-maroon/8", icon: <Thermometer className="size-5 text-maroon" /> },
  crowd: { cls: "border-gold-dark/50 bg-gold/20", icon: <UsersRound className="size-5 text-maroon" /> },
  info: { cls: "border-gold/40 bg-white", icon: <Info className="size-5 text-green-dark" /> },
  good: { cls: "border-green-light/40 bg-green-light/8", icon: <CheckCircle2 className="size-5 text-green-light" /> },
  personal: { cls: "border-green-dark/25 bg-green-dark/5", icon: <User className="size-5 text-green-dark" /> },
};

export function NoticesFeed({ ctx }: { ctx: SeasonCtx }) {
  const companion = ctx.elderly && ctx.companion ? { name: ctx.companion.person.id === ctx.self.person.id ? "أنت" : ctx.companion.person.firstName, elder: ctx.elderly.person.firstName } : undefined;
  const notices = noticesFor(ctx.day.i, ctx.app.members.length, companion);
  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-gold/30 bg-white p-5 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
          <span className="relative">
            <BellRing className="size-6" />
            <span className="absolute -left-1 -top-1 grid size-4 place-items-center rounded-full bg-maroon text-[10px] font-bold text-white">{notices.length}</span>
          </span>
          إشعارات اليوم
        </p>
        <SpeakButton text={notices.map((n) => n.text).join(". ")} label="استمع" />
      </div>
      <ul className="mt-4 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {notices.map((n, i) => {
            const t = TONE[n.tone];
            const future = n.time > ctx.moment.time;
            return (
              <motion.li
                key={`${ctx.day.i}-${i}`}
                layout
                initial={{ opacity: 0, x: 30, scale: 0.96 }}
                animate={{ opacity: future ? 0.55 : 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ delay: i * 0.08, type: "spring", damping: 22 }}
                className={cn("flex gap-3 rounded-2xl border p-3.5", t.cls)}
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">{t.icon}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-hint">
                    <span className="font-mono">{n.time}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-gold-dark">{n.scope}</span>
                    {future && <span>قادم</span>}
                  </p>
                  <p className={cn("mt-1 leading-7", n.tone === "heat" ? "text-lg font-bold text-maroon" : "font-semibold")}>{n.text}</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/** Stage rating question from the spec, tied to the day (hotel after the first night, mashaer after returning to Makkah...) */
export function StageRating({ ctx }: { ctx: SeasonCtx }) {
  const toast = useToast();
  const q = stageQuestionFor(ctx.day.i, ctx.where);
  const mashaer = (ctx.day.i === 17 && ctx.where === "makkah") || ctx.day.i === 18;
  if (!q && !mashaer) return null;

  const rate = (key: string, label: string, v: number) => {
    actions.setInSeason(ctx.sessionId, { ratings: { ...ctx.ratings, [key]: v } });
    logPilgrimSeason(ctx, "تقييم مرحلة", `${label} — ${v} من 5`);
    toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] border-2 border-dashed border-gold-dark/50 bg-gold/10 p-6 text-center">
      <p className="text-sm font-bold text-gold-dark">⭐ سؤال قصير عن هذه المرحلة</p>
      {q && (
        <>
          <p className="mt-1 font-display text-2xl font-bold leading-10 text-green-dark">{q.q}</p>
          <div className="mt-3 flex justify-center">
            <StarRating size="lg" value={ctx.ratings[q.key] ?? 0} onChange={(v) => rate(q.key, q.q, v)} />
          </div>
        </>
      )}
      {mashaer && (
        <>
          <p className="mt-1 font-display text-2xl font-bold text-green-dark">كيف كانت أيام المشاعر؟ قيّم كل بند وحده</p>
          <div className="mx-auto mt-4 grid max-w-3xl gap-2 sm:grid-cols-2">
            {MASHAER_ITEMS.map((m) => (
              <div key={m.key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3">
                <span className="font-bold">{m.label}</span>
                <StarRating value={ctx.ratings[m.key] ?? 0} onChange={(v) => rate(m.key, m.label, v)} />
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
