"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, FileSpreadsheet, Globe2, Loader2, Plane, Send, Stamp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { FLIGHTS } from "@/lib/journey";
import { fullName } from "@/lib/registry";
import { actions } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { logPilgrim, useNow, type StepProps } from "./shared";

const PER_MEMBER = 1300;
const LEAD = 2600;

export function StepVisa({ app, sessionId }: StepProps) {
  const toast = useToast();
  const now = useNow(150);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const n = app.members.length;
  const elapsed = startedAt ? now - startedAt : 0;

  const start = () => {
    setStartedAt(Date.now());
    logPilgrim(app, "متابعة حالة التأشيرة");
    setTimeout(() => {
      actions.setPost(sessionId, { visaAt: Date.now() });
      actions.logEvent({ actor: "رنا حداد (محاكاة)", role: "إدارة التسجيل", action: "صدور التأشيرات عبر نسك مسار", target: `طلب ${app.number}`, detail: `${n} تأشيرات` });
      toast({ title: "صدرت تأشيرات جميع أفراد طلبك", body: `رحلتك: دمشق ← جدة ${FLIGHTS.outbound.hijri} ${FLIGHTS.outbound.departure}. الحضور إلى المطار ${FLIGHTS.outbound.airportAt}.`, icon: "🛂", tone: "success" });
      const colors = ["#D9C89E", "#00594F", "#289E92", "#ffffff"];
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 }, colors });
    }, LEAD + PER_MEMBER * n + 600);
  };

  const pipeline = [
    { icon: <FileSpreadsheet className="size-5" />, t: "قوائم الخارجية", d: "ملف الإكسل وصور الجوازات للمسددين", at: 0 },
    { icon: <Send className="size-5" />, t: "نسك مسار", d: "التعاقدات والمخيمات وبيانات الحجاج", at: 1000 },
    { icon: <Stamp className="size-5" />, t: "إصدار التأشيرات", d: "لكل فرد على حدة", at: LEAD },
  ];

  return (
    <Question
      step="الخطوة 5 من 5"
      title="التأشيرة والرحلة"
      hint="بعد التسديد يرسل المكتب قوائمكم، فتصدر التأشيرات ثم تُحدَّد الرحلات والفنادق والمخيمات وبطاقات الحج."
      speak="التأشيرة والرحلة. اضغط الزر لمتابعة حالة التأشيرة لكل فرد."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {pipeline.map((p, i) => {
          const ok = startedAt !== null && elapsed > p.at + 900;
          const active = startedAt !== null && elapsed > p.at && !ok;
          return (
            <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={cn("flex items-center gap-3 rounded-3xl border-2 p-4 transition-colors", ok ? "border-green-light/50 bg-green-light/5" : active ? "border-gold-dark bg-gold/10" : "border-gold/40 bg-white")}>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl transition-colors", ok ? "bg-green-light text-white" : "bg-sand text-gold-dark")}>{active ? <Loader2 className="size-5 animate-spin" /> : ok ? <BadgeCheck className="size-5" /> : p.icon}</span>
              <span>
                <span className="block font-bold">{p.t}</span>
                <span className="text-sm text-ink-soft">{p.d}</span>
              </span>
            </motion.div>
          );
        })}
      </div>

      <ul className="mt-5 space-y-3">
        {app.members.map((m, i) => {
          const issueAt = LEAD + PER_MEMBER * (i + 1);
          const status = startedAt === null ? "idle" : elapsed >= issueAt ? "issued" : elapsed >= LEAD ? "pending" : "sent";
          return (
            <motion.li key={m.person.id} layout className={cn("relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl border-2 bg-white p-4", status === "issued" ? "border-green-light/50" : "border-gold/40")}>
              <span className={cn("grid size-14 place-items-center rounded-2xl font-display text-2xl font-bold", m.person.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>{m.person.firstName[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{fullName(m.person)}</p>
                <p className="font-mono text-sm text-hint" dir="ltr">{maskNationalId(m.person.id)}</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 font-bold",
                    status === "issued" ? "bg-green-light text-white" : status === "idle" ? "bg-sand text-hint" : "bg-gold/30 text-maroon",
                  )}
                >
                  {status === "issued" && <BadgeCheck className="size-5" />}
                  {(status === "pending" || status === "sent") && <Loader2 className="size-5 animate-spin" />}
                  {status === "idle" ? "لم تبدأ" : status === "sent" ? "أُرسلت البيانات" : status === "pending" ? "قيد الإصدار" : "صادرة"}
                </motion.span>
              </AnimatePresence>
              {status === "issued" && (
                <motion.span initial={{ scale: 2.4, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 0.16, rotate: -12 }} transition={{ type: "spring", damping: 12 }} className="pointer-events-none absolute left-40 top-1/2 -translate-y-1/2 rounded-xl border-4 border-green-dark px-3 py-1 font-display text-3xl font-bold text-green-dark">
                  VISA
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ul>

      {startedAt === null ? (
        <Button size="xl" className="mt-6 w-full" onClick={start}>
          <Globe2 className="size-6" /> تابع حالة التأشيرة الآن
        </Button>
      ) : (
        <p className="mt-6 flex items-center justify-center gap-2 text-lg font-bold text-green-dark">
          <motion.span animate={{ x: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Plane className="size-6" />
          </motion.span>
          نحجز مقاعدكم على الرحلة {FLIGHTS.outbound.code}...
        </p>
      )}
    </Question>
  );
}
