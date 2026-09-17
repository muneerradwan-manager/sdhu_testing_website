"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Clock, MoonStar, Play, Sun, Sunrise, Sunset } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/widgets";
import { CITIES, PRAYERS, formatTime, nextPrayer, prayerTimes } from "@/lib/prayer";
import { useHydrated } from "@/lib/store";
import { asset, cn, hijriDate } from "@/lib/utils";

const ICONS = { fajr: MoonStar, sunrise: Sunrise, dhuhr: Sun, asr: Sun, maghrib: Sunset, isha: MoonStar } as const;
const PICK = ["damascus", "aleppo", "makkah", "madinah"];

export function PrayerWidget() {
  const hydrated = useHydrated();
  const [slug, setSlug] = useState("damascus");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const city = CITIES.find((c) => c.slug === slug)!;
  const times = hydrated ? prayerTimes(city, now) : null;
  const next = hydrated ? nextPrayer(city, now) : null;
  const left = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0;
  const hh = String(Math.floor(left / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor(left / 60_000) % 60).padStart(2, "0");
  const ss = String(Math.floor(left / 1000) % 60).padStart(2, "0");

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white shadow-2xl md:p-8">
      <div className="bg-pattern absolute inset-0 opacity-20" />
      <div className="absolute -left-16 -top-16 size-56 rounded-full bg-green-light/30 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gold">مواقيت الصلاة</p>
            <p className="font-display text-2xl font-bold">{city.name}</p>
            <p className="text-xs text-white/60">{hydrated ? hijriDate(now, { weekday: "long" }) : " "}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl bg-white/10 p-1">
            {PICK.map((s) => {
              const c = CITIES.find((x) => x.slug === s)!;
              return (
                <button
                  key={s}
                  onClick={() => setSlug(s)}
                  className={cn("relative rounded-xl px-3 py-1.5 text-xs font-bold transition", slug === s ? "text-ink" : "text-white/75 hover:text-white")}
                >
                  {slug === s && <motion.span layoutId="home-city" className="absolute inset-0 -z-10 rounded-xl bg-gold" />}
                  {c.name.replace(" المكرمة", "").replace(" المنورة", "")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur">
          <div>
            <p className="text-sm text-white/70">الصلاة القادمة</p>
            <AnimatePresence mode="wait">
              <motion.p key={`${slug}-${next?.key}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-display text-3xl font-bold text-gold">
                {next?.name ?? "—"}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="font-display text-4xl font-bold tabular-nums tracking-wider" dir="ltr">
            {hydrated ? `${hh}:${mm}:${ss}` : "--:--:--"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRAYERS.map((p) => {
            const Icon = ICONS[p.key];
            const active = next?.key === p.key;
            return (
              <div key={p.key} className={cn("rounded-2xl p-3 text-center transition", active ? "bg-gold text-ink shadow-lg" : "bg-white/5")}>
                <Icon className={cn("mx-auto size-4", active ? "text-maroon" : "text-gold")} />
                <p className="mt-1 text-xs font-semibold">{p.name}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">{times ? formatTime(times[p.key]) : "--:--"}</p>
              </div>
            );
          })}
        </div>

        <Link href="/prayer-times" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-gold hover:underline">
          <Clock className="size-4" /> الجدول الشهري واتجاه القبلة <ArrowLeft className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function AcademyTeaser() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[2rem] text-right shadow-2xl">
        <Image src="/images/tawaf-night.jpg" alt="الطواف حول الكعبة" fill sizes="(min-width: 1024px) 50vw, 100vw" quality={70} className="object-cover transition duration-[1.2s] group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition duration-500 group-hover:scale-110 group-hover:bg-gold group-hover:text-ink">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
          <Play className="size-8 translate-x-[-2px] fill-current" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <span className="rounded-full bg-maroon px-2.5 py-1 text-xs font-bold">فيديو • 13 ثانية</span>
          <p className="mt-3 font-display text-2xl font-bold">لقطات من طواف الإفاضة</p>
          <p className="text-sm text-white/70">من مسار «فقه الحج» — المستوى الثاني: الطواف والسعي</p>
        </div>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-4xl bg-ink p-2 sm:p-3">
        <video src={asset("/videos/tawaf-ifadha.webm")} poster={asset("/images/tawaf-night.jpg")} controls autoPlay playsInline className="aspect-video w-full rounded-2xl bg-black" />
      </Modal>
    </>
  );
}
