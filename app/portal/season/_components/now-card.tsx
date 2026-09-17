"use client";

import { AnimatePresence, motion } from "motion/react";
import { BedDouble, Bus, CalendarHeart, MapPin, Tent, UsersRound, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { MapEmbed, SpeakButton } from "@/components/ui/widgets";
import { GROUP, PLACES } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { WHERE, mealsFor, nextBus, nextMeal } from "../_data";
import type { SeasonCtx } from "./ctx";

export function stayText(ctx: SeasonCtx) {
  const { where, self, assignments } = ctx;
  const others = assignments.filter((a) => a.person.id !== self.person.id);
  const byRoom = (pick: (a: (typeof assignments)[number]) => string | number, prefix: string) => {
    const groups = new Map<string, string[]>();
    for (const a of others) {
      const k = String(pick(a));
      if (k === String(pick(self))) continue;
      groups.set(k, [...(groups.get(k) ?? []), a.person.firstName]);
    }
    const with_ = others.filter((a) => String(pick(a)) === String(pick(self))).map((a) => a.person.firstName);
    const parts = [...groups.entries()].map(([k, names]) => `${names.join(" و")} في ${prefix ? `${prefix} ` : ""}${k}`);
    return { with: with_, elsewhere: parts.length ? `عائلتك: ${parts.join(" — ")}` : "" };
  };
  switch (where) {
    case "makkah": {
      const r = byRoom((a) => a.room, "");
      return { icon: <BedDouble className="size-6" />, main: `${PLACES.makkahHotel.name} — ${PLACES.makkahHotel.tower} — الطابق ${PLACES.makkahHotel.floor} — الغرفة ${self.room}`, family: r.elsewhere || (r.with.length ? `معك في الغرفة: ${r.with.join(" و")}` : "") };
    }
    case "madinah": {
      const r = byRoom((a) => a.madinahRoom, "");
      return { icon: <BedDouble className="size-6" />, main: `${PLACES.madinahHotel.name} — الطابق ${PLACES.madinahHotel.floor} — الغرفة ${self.madinahRoom}`, family: r.elsewhere || (r.with.length ? `معك في الغرفة: ${r.with.join(" و")}` : "") };
    }
    case "mina":
    case "arafat": {
      const r = byRoom((a) => a.tent, "الخيمة");
      const camp = where === "mina" ? "مخيم 42 — المعيصم — المربع 7" : "مخيم التكتل بجوار مسجد نمرة";
      return { icon: <Tent className="size-6" />, main: `${camp} — الخيمة ${self.tent}`, family: r.elsewhere ? `${r.elsewhere} (بجانبك)` : "" };
    }
    case "muzdalifah":
      return { icon: <Tent className="size-6" />, main: "المبيت في العراء — نقطة المجموعة 27 قرب المشعر الحرام", family: "العائلة معاً مع المجموعة" };
    case "damascus":
      return { icon: <MapPin className="size-6" />, main: "ساحة المزة ← مطار دمشق — الرحلة 1448-07 — البوابة 3", family: `المقاعد: ${assignments.map((a) => `${a.person.firstName} ${a.seat}`).join(" | ")}` };
    case "jeddah":
      return { icon: <MapPin className="size-6" />, main: "صالة الحجاج — الساحة (ج) — الحافلة 32", family: "الوصول إلى الفندق نحو 12:05" };
    case "home":
      return { icon: <MapPin className="size-6" />, main: "مطار دمشق الدولي — ثم حافلة التكتل إلى ساحة المزة", family: "حمداً لله على سلامتكم جميعاً" };
  }
}

export function NowCard({ ctx }: { ctx: SeasonCtx }) {
  const { day, moment, where } = ctx;
  const w = WHERE[where];
  const stay = stayText(ctx);
  const meals = mealsFor(where, day.i);
  const meal = nextMeal(meals, moment.time);
  const bus = nextBus(where, day.i);
  const daysLeft = 28 - day.i;
  const jamarat = day.i === 15;
  const map = jamarat ? { lat: PLACES.jamarat.lat, lng: PLACES.jamarat.lng, label: PLACES.jamarat.name } : { lat: w.lat, lng: w.lng, label: w.mapLabel };
  const speech = `أنت في ${w.label}. ${moment.stage}. ${stay.main}. ${stay.family}. ${bus}. ${meal ? `الوجبة التالية: ${meal.name} ${meal.time}` : ""}. ${daysLeft ? `العودة إلى الوطن بعد ${daysLeft} يوماً` : "اليوم يوم العودة"}.`;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-gold/30 bg-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
      <div className={cn("relative overflow-hidden p-6 text-white md:p-8", w.tone === "gold" ? "bg-gradient-to-br from-gold-dark to-maroon" : w.tone === "maroon" ? "bg-gradient-to-br from-maroon to-maroon-dark" : w.tone === "ink" ? "bg-gradient-to-br from-ink to-green-dark" : "bg-gradient-to-br from-green to-green-dark")}>
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <motion.div className="absolute -left-20 -top-20 size-64 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 5 }} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-gold">
              <span className="relative flex size-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-green-light" />
                <span className="relative size-3 rounded-full bg-green-light" />
              </span>
              الآن {moment.time} — {day.weekday}
            </p>
            <AnimatePresence mode="wait">
              <motion.div key={`${day.i}-${where}`} initial={{ opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }}>
                <p className="mt-2 font-display text-4xl font-bold md:text-6xl">أنت في: {w.short}</p>
                <p className="mt-2 text-xl text-white/85 md:text-2xl">{moment.stage}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="rounded-3xl bg-white/12 p-4 text-center backdrop-blur">
            <p className="font-display text-5xl font-bold text-gold">{daysLeft}</p>
            <p className="text-sm text-white/75">{daysLeft ? "يوماً على العودة" : "يوم العودة"}</p>
          </div>
        </div>
        <SpeakButton text={speech} label="استمع إلى حالتي" className="relative mt-4 border-white/20 bg-white/10 text-white hover:border-white/50" />
      </div>

      <div className="grid gap-6 p-5 md:p-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="grid content-start gap-3">
          <Fact icon={stay.icon} label={where === "mina" || where === "arafat" || where === "muzdalifah" ? "مكان المبيت" : where === "makkah" || where === "madinah" ? "الفندق والغرفة" : "المكان"} value={stay.main} sub={stay.family} big />
          <Fact icon={<Bus className="size-6" />} label="التنقل التالي" value={bus} />
          <Fact icon={<UtensilsCrossed className="size-6" />} label="الوجبة التالية" value={meal ? `${meal.name} ${meal.time} — ${meal.place}` : "انتهت وجبات اليوم — الفطور غداً"} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Fact icon={<UsersRound className="size-6" />} label="المجموعة" value={`27 — ${GROUP.team[0].name.split(" ").slice(0, 2).join(" ")}`} sub={`الموجّه: ${GROUP.team[2].name}`} />
            <Fact icon={<CalendarHeart className="size-6" />} label="العودة إلى الوطن" value={daysLeft ? `بعد ${daysLeft} يوماً — 23 ذو الحجة` : "اليوم — الرحلة 1448-07R"} />
          </div>
        </div>
        <div id="map" className="scroll-mt-40">
          <MapEmbed key={`${map.lat}-${map.lng}`} lat={map.lat} lng={map.lng} label={map.label} zoom={w.zoom} className="h-full min-h-80" />
        </div>
      </div>
    </div>
  );
}

function Fact({ icon, label, value, sub, big }: { icon: ReactNode; label: string; value: string; sub?: string; big?: boolean }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div key={value} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={cn("flex items-start gap-3 rounded-3xl p-4", big ? "bg-green-dark/6 ring-1 ring-green-dark/10" : "bg-sand")}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-green-dark shadow-sm">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gold-dark">{label}</p>
          <p className={cn("font-bold leading-8 text-ink", big ? "text-xl" : "text-lg")}>{value}</p>
          {sub && <p className="text-ink-soft">{sub}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
