"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft, Clock, Layers, ListVideo } from "lucide-react";
import { useHydrated, useStore } from "@/lib/store";
import { LESSON_FORMS, arabicCount, type TrackIcon as TrackIconName } from "@/lib/data/academy";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./progress-ring";
import { TrackIcon } from "./track-icon";

export type TrackCardData = {
  slug: string;
  title: string;
  short: string;
  image: string;
  icon: TrackIconName;
  tone: "green" | "maroon" | "gold";
  levels: number;
  minutes: number;
  lessonSlugs: string[];
};

const LEVEL_FORMS = { one: "مستوى واحد", two: "مستويان", few: "مستويات", many: "مستوى" };

const TONES = {
  green: "from-green-dark via-green-dark/75",
  maroon: "from-maroon-dark via-maroon/70",
  gold: "from-ink via-ink/60",
};

export function TrackGrid({ tracks }: { tracks: TrackCardData[] }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const academy = useStore((s) => s.academy);
  const loggedIn = hydrated && !!session;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {tracks.map((t, i) => {
        const done = loggedIn ? t.lessonSlugs.filter((l) => academy[`${t.slug}/${l}`]).length : 0;
        const pct = done / t.lessonSlugs.length;
        const featured = i === 0;
        return (
          <motion.div
            key={t.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6 }}
          >
            <Link
              href={`/academy/${t.slug}`}
              className="group relative flex h-full min-h-80 flex-col overflow-hidden rounded-3xl bg-ink text-white shadow-[0_24px_60px_-34px_rgba(2,21,38,.6)] ring-1 ring-gold/30 transition-shadow hover:shadow-[0_36px_80px_-34px_rgba(2,21,38,.7)]"
            >
              <Image src={t.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" quality={70} className="object-cover opacity-80 transition duration-[1.2s] ease-out group-hover:scale-110" />
              <span className={cn("absolute inset-0 bg-gradient-to-t to-transparent", TONES[t.tone])} />
              <span className="bg-pattern absolute inset-0 opacity-0 transition duration-700 group-hover:opacity-20" />

              <span className="relative flex items-start justify-between p-5">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/15 text-gold ring-1 ring-white/20 backdrop-blur-md transition group-hover:rotate-6 group-hover:bg-gold group-hover:text-ink">
                  <TrackIcon name={t.icon} className="size-6" />
                </span>
                {loggedIn ? (
                  <ProgressRing value={pct} size={58} stroke={4} light>
                    <span className="text-xs font-bold tabular-nums">{Math.round(pct * 100)}%</span>
                  </ProgressRing>
                ) : (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">{featured ? "المسار الأساسي" : "مجاني"}</span>
                )}
              </span>

              <span className="relative mt-auto p-5 pt-0">
                <span className={cn("block font-display font-bold", featured ? "text-3xl" : "text-2xl")}>{t.title}</span>
                <span className="mt-2 block text-sm leading-7 text-white/80">{t.short}</span>
                <span className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/85">
                  <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">
                    <ListVideo className="size-3.5 text-gold" /> {arabicCount(t.lessonSlugs.length, LESSON_FORMS)}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">
                    <Layers className="size-3.5 text-gold" /> {arabicCount(t.levels, LEVEL_FORMS)}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur" dir="rtl">
                    <Clock className="size-3.5 text-gold" /> {Math.floor(t.minutes / 60)} س {t.minutes % 60} د
                  </span>
                </span>
                <span className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-sm font-bold">
                  <span className="text-gold">{loggedIn ? (done ? `أتممت ${done} من ${t.lessonSlugs.length}` : "ابدأ المسار") : "تصفح الدروس"}</span>
                  <span className="grid size-9 place-items-center rounded-full bg-white/10 transition group-hover:-translate-x-1 group-hover:bg-gold group-hover:text-ink">
                    <ChevronLeft className="size-5" />
                  </span>
                </span>
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
