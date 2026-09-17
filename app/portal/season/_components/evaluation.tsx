"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Award, History, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Emblem } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { fullName, relationLabel } from "@/lib/registry";
import { actions, useStore, type PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import { EVALUATION } from "../_data";
import type { SeasonCtx } from "./ctx";
import { logPilgrimSeason } from "./meals";
import { useMyTickets } from "./tickets";

const EMPTY: PostAcceptance = { documents: {}, payments: {}, ratings: {} };

function avg(values: number[]) {
  const v = values.filter((x) => x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function ReturnHome({ ctx }: { ctx: SeasonCtx }) {
  const toast = useToast();
  const post = useStore((s) => s.post[ctx.sessionId]) ?? EMPTY;
  const tickets = useMyTickets(ctx.sessionId);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const related = (keys: string[]) =>
    avg(
      keys.flatMap((k) => {
        const [src, key] = k.split(":");
        if (src === "app") return [ctx.app.ratings[key] ?? 0];
        if (src === "post") return [post.ratings[key] ?? 0];
        if (src === "tickets") return tickets.map((t) => t.rating ?? 0);
        if (key.endsWith("*")) return Object.entries(ctx.ratings).filter(([rk]) => rk.startsWith(key.slice(0, -1))).map(([, v]) => v);
        return [ctx.ratings[key] ?? 0];
      }),
    );

  const answered = EVALUATION.filter((e) => ctx.ratings[`eval-${e.key}`] !== undefined).length;
  const complete = answered === EVALUATION.length;

  const rate = (key: string, v: number) => actions.setInSeason(ctx.sessionId, { ratings: { ...ctx.ratings, [`eval-${key}`]: v } });

  return (
    <div className="space-y-8">
      {/* Welcome home */}
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-[2.25rem] bg-green-dark p-8 text-center text-white md:p-14">
        <div className="bg-pattern absolute inset-0 opacity-20" />
        <motion.div className="absolute -right-24 -top-24 size-80 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 5 }} />
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="relative">
          <Emblem className="mx-auto size-20" animated />
          <p className="mt-5 font-display text-4xl font-bold md:text-6xl">حمداً لله على السلامة</p>
          <p className="mt-3 text-xl text-gold md:text-2xl">حجٌّ مبرور، وسعيٌ مشكور، وذنبٌ مغفور</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/80">
            وصلتم إلى دمشق الساعة 17:10 — {ctx.app.members.map((m) => m.person.firstName).join("، ")}. أُغلق آخر تجمّع للمجموعة 27: «وصل الجميع».
          </p>
          <SpeakButton text="حمداً لله على السلامة. حج مبرور وسعي مشكور. نرجو تقييم رحلتك كاملة." className="mt-5 border-white/20 bg-white/10 text-white" />
        </motion.div>
      </motion.div>

      {/* Comprehensive evaluation */}
      <section id="evaluation" className="scroll-mt-40 rounded-[2rem] border border-gold/30 bg-white p-5 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gold-dark">خلال أسبوع من العودة</p>
            <h2 className="font-display text-3xl font-bold text-green-dark md:text-4xl">التقييم الشامل للرحلة</h2>
            <p className="mt-1 max-w-2xl text-lg leading-8 text-ink-soft">نظرة كلية على رحلتك. بجانب كل بند متوسط تقييماتك السابقة للمراحل المرتبطة به.</p>
          </div>
          <div className="text-center">
            <p className="font-display text-4xl font-bold text-green-dark">{answered}<span className="text-xl text-hint"> / {EVALUATION.length}</span></p>
            <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-gold-light">
              <motion.div className="h-full rounded-full bg-green-light" animate={{ width: `${(answered / EVALUATION.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <ol className="mt-6 space-y-3">
          {EVALUATION.map((e, i) => {
            const key = `eval-${e.key}`;
            const value = ctx.ratings[key];
            const past = related(e.related);
            return (
              <motion.li key={e.key} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className={cn("grid items-center gap-3 rounded-3xl border-2 p-4 md:grid-cols-[1.3fr_auto_1fr] md:gap-5", value !== undefined ? "border-green-light/40 bg-green-light/5" : "border-gold/40 bg-white")}>
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-bold transition-colors", value !== undefined ? "bg-green-light text-white" : "bg-sand text-gold-dark")}>{i + 1}</span>
                  <div>
                    <p className="text-lg font-bold">{e.label}</p>
                    <p className="text-sm text-hint">متوسط تقييماتك للمراحل: {past === null ? "—" : past.toFixed(1)}</p>
                  </div>
                </div>
                {e.yesNo ? (
                  <div className="flex gap-2">
                    {[
                      { v: 5, label: "نعم", icon: <ThumbsUp className="size-5" /> },
                      { v: 1, label: "لا", icon: <ThumbsDown className="size-5" /> },
                    ].map((o) => (
                      <button key={o.v} type="button" onClick={() => rate(e.key, o.v)} className={cn("flex items-center gap-2 rounded-2xl px-6 py-3 text-lg font-bold transition", value === o.v ? "bg-green-dark text-white" : "bg-sand text-ink-soft hover:bg-gold-light")}>
                        {o.icon} {o.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <StarRating size="lg" value={value ?? 0} onChange={(v) => rate(e.key, v)} />
                )}
                <input value={comments[e.key] ?? ""} onChange={(ev) => setComments((c) => ({ ...c, [e.key]: ev.target.value }))} placeholder="تعليق (اختياري)" className="h-12 w-full rounded-2xl border-2 border-gold/40 bg-white px-4 outline-none focus:border-green-light" />
              </motion.li>
            );
          })}
        </ol>

        <Button
          size="xl"
          className="mt-6 w-full"
          disabled={!complete || sent}
          onClick={() => {
            setSent(true);
            logPilgrimSeason(
              ctx,
              "التقييم الشامل بعد العودة",
              EVALUATION.map((e) => `${e.label}: ${e.yesNo ? (ctx.ratings[`eval-${e.key}`] === 5 ? "نعم" : "لا") : ctx.ratings[`eval-${e.key}`]}${comments[e.key] ? ` «${comments[e.key]}»` : ""}`).join(" | "),
            );
            toast({ title: "شكراً لك — أُرسل تقييمك الشامل", body: "أُغلقت حالتك على «اكتمل الموسم».", icon: "🌟", tone: "gold" });
            confetti({ particleCount: 120, spread: 90, origin: { y: 0.7 }, colors: ["#D9C89E", "#00594F", "#289E92", "#ffffff"] });
          }}
        >
          <Send className="size-6" /> {sent ? "أُرسل التقييم ✓" : complete ? "إرسال التقييم الشامل" : `أكمل البنود (${answered} من ${EVALUATION.length})`}
        </Button>
      </section>

      <AnimatePresence>{(complete || sent) && <Certificates ctx={ctx} />}</AnimatePresence>
    </div>
  );
}

function Certificates({ ctx }: { ctx: SeasonCtx }) {
  const number = `1448-C-${ctx.app.number.padStart(6, "0")}`;
  const history =
    ctx.self.person.id === "01012345412"
      ? [
          { s: "1446", t: "تقدّم — لم يُقبل" },
          { s: "1447", t: "لم يتقدم" },
        ]
      : [
          { s: "1446", t: "لم يتقدم" },
          { s: "1447", t: "لم يتقدم" },
        ];
  return (
    <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
        <span className="grid size-12 place-items-center rounded-2xl bg-gold text-ink"><Award className="size-6" /></span>
        شهادة أداء الحج
      </h2>
      <div className="scrollbar-none -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4">
        {ctx.app.members.map((m, i) => (
          <motion.div
            key={m.person.id}
            initial={{ opacity: 0, rotateY: -40, y: 20 }}
            animate={{ opacity: 1, rotateY: 0, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12, type: "spring", damping: 18 }}
            className="relative w-[22rem] shrink-0 snap-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-green-dark via-green to-green-dark p-6 text-white shadow-2xl md:w-[26rem]"
          >
            <div className="bg-pattern absolute inset-0 opacity-20" />
            <div className="absolute inset-3 rounded-[1.25rem] border border-gold/50" />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.14)_50%,transparent_65%)] bg-[length:250%_100%] animate-shimmer" />
            <div className="relative text-center">
              <Emblem className="mx-auto size-12" />
              <p className="mt-2 text-sm text-gold">المنصة الوطنية للحج — موسم 1448هـ</p>
              <p className="mt-1 font-display text-2xl font-bold text-gold-shine">شهادة أداء فريضة الحج</p>
              <p className="mt-4 text-sm text-white/70">تشهد الإدارة بأن الحاج{m.person.gender === "F" ? "ة" : ""}</p>
              <p className="font-display text-2xl font-bold">{fullName(m.person)}</p>
              <p className="text-sm text-white/70">{m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}</p>
              <p className="mt-3 leading-7 text-white/85">أدّى فريضة الحج مع تكتل النور لخدمة الحجاج — المجموعة 27 — وعاد في 23 ذو الحجة 1448</p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <span className="rounded-xl bg-white p-2">
                  <QRCodeSVG value={`https://hajj-demo.sy/verify/${number}${i ? `-${i + 1}` : ""}`} size={84} fgColor="#00594F" />
                </span>
                <span className="text-right text-xs">
                  <span className="block text-white/60">رقم الشهادة</span>
                  <span className="block font-mono text-base font-bold text-gold" dir="ltr">{number}{i ? `-${i + 1}` : ""}</span>
                  <span className="mt-1 block text-white/60">محفوظة في خزنة الوثائق</span>
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[2rem] border border-gold/30 bg-white p-6">
        <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
          <History className="size-6" /> ملفك الدائم — سجل المواسم
        </p>
        <ol className="mt-4 space-y-2">
          {history.map((h) => (
            <li key={h.s} className="flex items-center gap-3 rounded-2xl bg-sand p-3.5 text-lg">
              <span className="font-mono font-bold text-hint">{h.s}</span> — {h.t}
            </li>
          ))}
          <motion.li initial={{ opacity: 0, x: 40, backgroundColor: "rgba(217,200,158,.9)" }} animate={{ opacity: 1, x: 0, backgroundColor: "rgba(40,158,146,.10)" }} transition={{ delay: 0.6, duration: 1.2 }} className="flex flex-wrap items-center gap-3 rounded-2xl p-3.5 text-lg ring-2 ring-green-light/40">
            <span className="font-mono font-bold text-green-dark">1448</span>
            <span className="font-bold text-green-dark">
              — قُبل — طلب عائلي {ctx.app.number} — تكتل النور — المجموعة 27 — أدى الحج — عاد في 23 ذو الحجة — شهادة الحج محفوظة
            </span>
            <span className="rounded-full bg-green-light px-2.5 py-0.5 text-sm font-bold text-white">جديد</span>
          </motion.li>
        </ol>
      </div>
    </motion.section>
  );
}
