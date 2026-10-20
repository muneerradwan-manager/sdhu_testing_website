"use client";

import { AnimatePresence, motion } from "motion/react";
import { MoonStar, Play, Sun, Sunrise, Sunset } from "lucide-react";
import { useEffect, useState } from "react";
import { str } from "@/components/cms/bits";
import { CmsImage } from "@/components/cms/image";
import { Modal } from "@/components/ui/widgets";
import { useMediaUrl } from "@/lib/cms/media";
import { useSection } from "@/lib/cms/store";
import { CITIES, PRAYERS, formatTime, nextPrayer, prayerTimes } from "@/lib/prayer";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useLang, useT } from "@/lib/i18n";
import { CITY_EN, PRAYER_EN, hijriDateIn } from "@/components/site/en-format";

const ICONS = { fajr: MoonStar, sunrise: Sunrise, dhuhr: Sun, asr: Sun, maghrib: Sunset, isha: MoonStar } as const;
const PICK = ["damascus", "aleppo", "makkah", "madinah"];

/** A prayer's time: as lib/prayer writes it in Arabic, «05:12 am» in English */
const timeIn = (en: boolean, d: Date) =>
  en ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }).format(d) : formatTime(d);

export function PrayerWidget({ className }: { className?: string }) {
  const t = useT();
  const lang = useLang();
  const en = lang === "en";
  const hydrated = useHydrated();
  const [slug, setSlug] = useState("damascus");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const city = CITIES.find((c) => c.slug === slug)!;
  const times = hydrated ? prayerTimes(city, now) : null;
  const next = hydrated ? nextPrayer(city, now) : null;
  const left = next ? Math.max(0, next.time.getTime() - now.getTime()) : 0;
  const hh = String(Math.floor(left / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor(left / 60_000) % 60).padStart(2, "0");
  const ss = String(Math.floor(left / 1000) % 60).padStart(2, "0");

  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] bg-green-dark p-6 text-white shadow-2xl md:p-8", className)}>
      <div className="bg-pattern absolute inset-0 opacity-20" />
      <div className="absolute -end-16 -top-16 size-56 rounded-full bg-green-light/30 blur-3xl" />
      {/* Its times grow to fill the card's height, which beside the Academy on the home page is its column's */}
      <div className="relative flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl font-bold">{en ? CITY_EN[city.slug] : city.name}</p>
            <p className="text-xs text-white/60">{hydrated ? hijriDateIn(lang, now, true) : " "}</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl bg-white/10 p-1">
            {PICK.map((s) => {
              const c = CITIES.find((x) => x.slug === s)!;
              return (
                <button
                  key={s}
                  onClick={() => setSlug(s)}
                  className={cn("relative rounded-xl px-3 py-1.5 text-xs font-bold transition", slug === s ? "on-light text-ink" : "text-white/75 hover:text-white")}
                >
                  {slug === s && <motion.span layoutId="home-city" className="absolute inset-0 -z-10 rounded-xl bg-gold" />}
                  {en ? CITY_EN[c.slug] : c.name.replace(" المكرمة", "").replace(" المنورة", "")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur">
          <div>
            <p className="text-sm text-white/70">{t("الصلاة القادمة", "Next prayer")}</p>
            <AnimatePresence mode="wait">
              <motion.p key={`${slug}-${next?.key}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-display text-3xl font-bold text-gold">
                {next ? (en ? PRAYER_EN[next.key] : next.name) : "—"}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="font-display text-4xl font-bold tabular-nums tracking-wider" dir="ltr">
            {hydrated ? `${hh}:${mm}:${ss}` : "--:--:--"}
          </p>
        </div>

        <div className="mt-4 grid flex-1 grid-cols-3 grid-rows-2 gap-2">
          {PRAYERS.map((p) => {
            const Icon = ICONS[p.key];
            const active = next?.key === p.key;
            return (
              <div key={p.key} className={cn("flex flex-col items-center justify-center rounded-2xl p-3 text-center transition", active ? "bg-gold text-ink shadow-lg" : "bg-white/5")}>
                <Icon className={cn("mx-auto size-5", active ? "text-maroon" : "text-gold")} />
                <p className="mt-1 text-sm font-semibold">{en ? PRAYER_EN[p.key] : p.name}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums md:text-xl">{times ? timeIn(en, times[p.key]) : "--:--"}</p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export function AcademyTeaser() {
  const v = useSection("home", "academy");
  const [open, setOpen] = useState(false);
  const video = useMediaUrl(v.videoSrc);
  const poster = useMediaUrl(v.videoPoster);

  return (
    <>
      <button onClick={() => setOpen(true)} className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[2rem] text-start shadow-2xl lg:aspect-video">
        <CmsImage src={v.videoPoster} alt={str(v, "videoTitle")} fill sizes="(min-width: 1024px) 50vw, 100vw" quality={70} className="object-cover transition duration-[1.2s] group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition duration-500 group-hover:scale-110 group-hover:bg-gold group-hover:text-ink">
          <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
          <Play className="size-8 translate-x-[-2px] fill-current" />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          {str(v, "videoBadge") && <span className="rounded-full bg-maroon px-2.5 py-1 text-xs font-bold">{str(v, "videoBadge")}</span>}
          <p className="mt-3 font-display text-2xl font-bold">{str(v, "videoTitle")}</p>
          <p className="text-sm text-white/70">{str(v, "videoNote")}</p>
        </div>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-4xl bg-ink p-2 sm:p-3">
        <video src={video} poster={poster} controls autoPlay playsInline className="aspect-video w-full rounded-2xl bg-black" />
      </Modal>
    </>
  );
}
