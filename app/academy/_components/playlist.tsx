"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CheckCircle2, Headphones, PlayCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { minutesLabel } from "@/lib/data/academy";

export type PlaylistLevel = {
  title: string;
  lessons: { slug: string; title: string; minutes: number; media: "video" | "audio" }[];
};

export function Playlist({ trackSlug, trackTitle, levels, current }: { trackSlug: string; trackTitle: string; levels: PlaylistLevel[]; current: string }) {
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const academy = useStore((s) => s.academy);
  const listRef = useRef<HTMLDivElement>(null);
  const total = levels.reduce((n, l) => n + l.lessons.length, 0);
  const loggedIn = hydrated && !!session;
  const done = loggedIn ? levels.flatMap((l) => l.lessons).filter((l) => academy[`${trackSlug}/${l.slug}`]).length : 0;

  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>("[aria-current='page']");
    if (list && el) list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [current]);

  const offsets = levels.map((_, i) => levels.slice(0, i).reduce((sum, l) => sum + l.lessons.length, 0));
  return (
    <aside className="overflow-hidden rounded-3xl border border-gold/35 bg-white shadow-[0_20px_60px_-40px_rgba(2,21,38,.4)] lg:sticky lg:top-28">
      <div className="relative overflow-hidden bg-green-dark p-5 text-white">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <p className="relative text-xs font-semibold text-gold">دروس المسار</p>
        <Link href={`/academy/${trackSlug}`} className="relative mt-1 block font-display text-xl font-bold hover:text-gold">
          {trackTitle}
        </Link>
        <div className="relative mt-3 flex items-center gap-3 text-xs text-white/75">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <motion.div className="h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${(done / total) * 100}%` }} transition={{ duration: 1 }} />
          </div>
          <span className="tabular-nums">
            {done}/{total}
          </span>
        </div>
      </div>
      <div ref={listRef} className="max-h-[calc(70vh/var(--zoom))] overflow-y-auto p-2">
        {levels.map((level, li) => (
          <div key={level.title} className="mb-1">
            <p className="sticky top-0 z-10 bg-white/95 px-3 py-2 text-xs font-bold text-maroon backdrop-blur">{level.title}</p>
            {level.lessons.map((l, i) => {
              const n = offsets[li] + i + 1;
              const isCurrent = l.slug === current;
              const isDone = loggedIn && !!academy[`${trackSlug}/${l.slug}`];
              return (
                <Link
                  key={l.slug}
                  href={`/academy/${trackSlug}/${l.slug}`}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                    isCurrent ? "bg-gold-light/70" : "hover:bg-sand",
                  )}
                >
                  {isCurrent && <motion.span layoutId="playlist-current" className="absolute inset-y-2 right-0 w-1 rounded-full bg-gold-dark" />}
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold tabular-nums",
                      isDone ? "bg-green-light/15 text-green" : isCurrent ? "bg-green-dark text-gold" : "bg-sand text-ink-soft",
                    )}
                  >
                    {isDone ? <CheckCircle2 className="size-4" /> : isCurrent ? <Equalizer /> : n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-semibold", isCurrent ? "text-green-dark" : "text-ink")}>{l.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-hint">
                      {l.media === "audio" ? <Headphones className="size-3" /> : <PlayCircle className="size-3" />}
                      {minutesLabel(l.minutes)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}

function Equalizer() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-label="الدرس الحالي">
      {[0.9, 0.5, 0.75].map((d, i) => (
        <motion.span key={i} className="w-[3px] rounded-full bg-gold" animate={{ height: ["30%", "100%", "45%", "80%", "30%"] }} transition={{ duration: d + 0.4, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </span>
  );
}
