"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Accessibility, BookOpen, Bus, CheckCircle2, Clock, HandHelping, Headphones, MapPin, MessageCircleQuestion, Send, UserRound, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, SpeakButton, useToast } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";
import { TRIPS, lessonsFor, type Trip } from "../_data";
import type { SeasonCtx } from "./ctx";
import { logPilgrimSeason } from "./meals";

export function TripsSection({ ctx }: { ctx: SeasonCtx }) {
  const toast = useToast();
  const [going, setGoing] = useState<string[]>([]);
  const [chair, setChair] = useState<string[]>([]);
  const trips = TRIPS.filter((t) => t.days.includes(ctx.day.i));
  const mashaer = ["mina", "arafat", "muzdalifah"].includes(ctx.where);

  const toggle = (t: Trip) => {
    const on = going.includes(t.id);
    setGoing((g) => (on ? g.filter((x) => x !== t.id) : [...g, t.id]));
    logPilgrimSeason(ctx, on ? `إلغاء التسجيل في رحلة: ${t.title}` : `تأكيد الرغبة في رحلة: ${t.title}`, t.when);
    toast(
      on
        ? { title: "ألغيت تسجيلك", body: t.title, icon: "↩️" }
        : { title: "سجّلناك في الرحلة", body: `${t.title} — التجمّع: ${t.gather}. يصلك تنبيه قبل الموعد بساعة.`, icon: "🚌", tone: "success" },
    );
  };

  return (
    <section id="trips" className="scroll-mt-40">
      <h2 className="mb-4 flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
        <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold"><Bus className="size-6" /></span>
        الحافلات والرحلات
      </h2>
      {trips.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-lg leading-8 text-ink-soft">
          {mashaer ? "في أيام المشاعر يتحرك الجميع مع المجموعة بالحافلتين 7 و8، ولا توجد رحلات اختيارية. التزم بنقطة التجمّع أمام الخيمة 12." : "لا توجد رحلات منظّمة اليوم. تابع إشعارات المجموعة."}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {trips.map((t, i) => {
            const on = going.includes(t.id) || !!t.mandatory;
            const booked = t.booked + (going.includes(t.id) ? 1 : 0);
            const left = t.seats - booked;
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={cn("overflow-hidden rounded-[1.75rem] border-2 bg-white transition-colors", on ? "border-green-light/60" : "border-gold/40")}>
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold leading-8 text-green-dark">{t.title}</p>
                    {t.mandatory && <span className="rounded-full bg-maroon/10 px-3 py-1 text-sm font-bold text-maroon">إلزامية للمجموعة</span>}
                  </div>
                  <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
                    <p className="flex items-center gap-2"><Clock className="size-4 text-gold-dark" /> <b>{t.when}</b></p>
                    <p className="flex items-center gap-2"><MapPin className="size-4 text-gold-dark" /> التجمّع: {t.gather}</p>
                    <p className="flex items-center gap-2"><Bus className="size-4 text-gold-dark" /> العودة: {t.back}</p>
                    <p className="flex items-center gap-2"><UserRound className="size-4 text-gold-dark" /> المشرف: {t.lead}</p>
                  </dl>
                  {t.note && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm leading-6">{t.note}</p>}

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 font-bold"><UsersRound className="size-4" /> أكدوا الرغبة: <motion.span key={booked} initial={{ scale: 1.6, color: "#289e92" }} animate={{ scale: 1, color: "#021526" }}>{booked}</motion.span> من {t.seats}</span>
                      <span className={cn("font-bold", left < 5 ? "text-maroon" : "text-green")}>المتبقي: {left}</span>
                    </div>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-gold-light">
                      <motion.div className={cn("h-full rounded-full", left < 5 ? "bg-maroon" : "bg-green-light")} initial={{ width: 0 }} animate={{ width: `${(booked / t.seats) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>

                  {ctx.elderly && on && (
                    <button
                      type="button"
                      onClick={() => {
                        setChair((c) => (c.includes(t.id) ? c.filter((x) => x !== t.id) : [...c, t.id]));
                        if (!chair.includes(t.id)) toast({ title: `طُلب كرسي متحرك لـ${ctx.elderly!.person.firstName}`, body: "يُطلب مسبقاً قبل 3 ساعات — وحافلة مهيأة.", icon: "♿", tone: "success" });
                      }}
                      className={cn("mt-3 flex w-full items-center gap-2 rounded-2xl p-3 text-right font-semibold transition", chair.includes(t.id) ? "bg-green-light/10 text-green" : "bg-sand text-ink-soft hover:bg-gold-light")}
                    >
                      <Accessibility className="size-5" /> {chair.includes(t.id) ? `✓ كرسي متحرك محجوز لـ${ctx.elderly.person.firstName}` : `أحتاج كرسياً متحركاً لـ${ctx.elderly.person.firstName}`}
                    </button>
                  )}
                </div>
                {t.mandatory ? (
                  <p className="flex items-center justify-center gap-2 bg-green-light/10 py-4 text-lg font-bold text-green">
                    <CheckCircle2 className="size-5" /> مسجّل مع المجموعة
                  </p>
                ) : (
                  <button type="button" onClick={() => toggle(t)} disabled={!on && left <= 0} className={cn("flex w-full items-center justify-center gap-2 py-4 text-lg font-bold transition disabled:opacity-40", on ? "bg-green-light/10 text-green hover:bg-maroon/5 hover:text-maroon" : "bg-green-dark text-white hover:bg-green")}>
                    <AnimatePresence mode="wait">
                      <motion.span key={String(on)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2">
                        {on ? <><CheckCircle2 className="size-5" /> مسجّل — اضغط لإلغاء تسجيلي</> : <><HandHelping className="size-5" /> أريد الذهاب</>}
                      </motion.span>
                    </AnimatePresence>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function LessonsSection({ ctx }: { ctx: SeasonCtx }) {
  const toast = useToast();
  const lessons = lessonsFor(ctx.day.i, ctx.where);
  const [attend, setAttend] = useState<string[]>([]);
  const [ask, setAsk] = useState(false);
  const [question, setQuestion] = useState(ctx.elderly?.person.gender === "F" ? `ما حكم تغطية ${ctx.elderly.person.firstName} رأسها في الإحرام؟` : "");
  const defaultQuestion = ctx.elderly?.person.gender === "F";

  return (
    <section id="lessons" className="scroll-mt-40">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
          <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold"><BookOpen className="size-6" /></span>
          الدروس
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAsk(true)}>
            <MessageCircleQuestion className="size-5" /> سؤال شرعي خاص
          </Button>
          <Link href="/academy" className="inline-flex h-11 items-center gap-2 rounded-2xl px-4 font-semibold text-green-dark hover:bg-green-dark/8">
            <Headphones className="size-5" /> تسجيلات الدروس
          </Link>
        </div>
      </div>
      {lessons.length === 0 ? (
        <p className="rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-lg text-ink-soft">لا دروس مجدولة في هذا اليوم.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((l, i) => {
            const on = attend.includes(l.id);
            return (
              <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="flex flex-col rounded-[1.75rem] border border-gold/40 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gold-dark">{l.when}</span>
                  {l.scope && <span className="rounded-full bg-gold/30 px-2.5 py-0.5 text-xs font-bold text-maroon">على مستوى التكتل</span>}
                </div>
                <p className="mt-1 font-display text-xl font-bold leading-8 text-green-dark">{l.title}</p>
                <p className="mt-1 text-ink-soft">{l.place} — {l.by}</p>
                <SpeakButton text={`${l.title}. ${l.when}. ${l.place}. المحاضر ${l.by}.`} className="mt-3 w-fit" />
                <button
                  type="button"
                  onClick={() => {
                    setAttend((a) => (on ? a.filter((x) => x !== l.id) : [...a, l.id]));
                    if (!on) {
                      logPilgrimSeason(ctx, `سأحضر درس: ${l.title}`, l.when);
                      toast({ title: "سجّلنا اهتمامك", body: "يُسجَّل الحضور بمسح البطاقة عند باب القاعة.", icon: "📖", tone: "success" });
                    }
                  }}
                  className={cn("mt-4 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-lg font-bold transition", on ? "bg-green-light/15 text-green" : "bg-green-dark text-white hover:bg-green")}
                >
                  {on ? <CheckCircle2 className="size-5" /> : <HandHelping className="size-5" />} {on ? "✓ سأحضر" : "سأحضر"}
                  <span className={cn("rounded-full px-2 py-0.5 text-sm", on ? "bg-white" : "bg-white/15")}>{l.interested + (on ? 1 : 0)} مهتماً</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={ask} onClose={() => setAsk(false)}>
        <p className="font-display text-2xl font-bold text-green-dark">سؤال إلى الموجّه الديني</p>
        <p className="mt-1 text-ink-soft">يصل سؤالك إلى الشيخ خالد الرفاعي، وتصلك الإجابة خلال ساعات.</p>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} className="mt-4 w-full rounded-2xl border-2 border-gold/50 p-4 text-lg leading-8 outline-none focus:border-green-light" />
        <Button
          size="xl"
          className="mt-4 w-full"
          disabled={question.trim().length < 5}
          onClick={() => {
            logPilgrimSeason(ctx, "سؤال شرعي إلى الموجّه", question.trim());
            toast({ title: "أُرسل سؤالك", body: "إلى الشيخ خالد الرفاعي.", icon: "📨", tone: "info" });
            setAsk(false);
            setTimeout(() => toast({ title: "أجاب الشيخ خالد الرفاعي عن سؤالك", body: defaultQuestion && question.includes("رأسها") ? "يجب على المرأة المحرمة تغطية رأسها، وإحرامها في وجهها وكفيها. تقبّل الله منكم." : "وصلتك الإجابة في رسائل المجموعة. تقبّل الله منكم.", icon: "🕌", tone: "gold" }), 7000);
          }}
        >
          <Send className="size-5" /> إرسال السؤال
        </Button>
      </Modal>
    </section>
  );
}
