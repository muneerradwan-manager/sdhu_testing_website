"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { CITIES } from "@/lib/prayer";
import { cn } from "@/lib/utils";
import { PrayerIcon } from "./prayer-icon";
import { humanRemaining, schedule, timeParts, wallHMS } from "./time";

const TRIO = [
  { slug: "damascus", image: "/images/umayyad.jpg", note: "الجامع الأموي" },
  { slug: "makkah", image: "/images/clock-tower.jpg", note: "المسجد الحرام" },
  { slug: "madinah", image: "/images/nabawi.jpg", note: "المسجد النبوي" },
];

function Analog({ nowMs, dark }: { nowMs: number; dark?: boolean }) {
  const { h, m, s } = wallHMS(nowMs);
  const hourDeg = ((h % 12) + m / 60) * 30;
  const minDeg = (m + s / 60) * 6;
  const secDeg = s * 6;
  return (
    <svg viewBox="0 0 100 100" className="size-24 shrink-0 drop-shadow-lg" aria-hidden>
      <circle cx="50" cy="50" r="48" fill={dark ? "rgba(2,21,38,.55)" : "#fff"} stroke="#D9C89E" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="50"
          y1="6"
          x2="50"
          y2={i % 3 === 0 ? 13 : 10}
          stroke={i % 3 === 0 ? "#D9C89E" : "rgba(217,200,158,.55)"}
          strokeWidth={i % 3 === 0 ? 2.5 : 1.2}
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="50" x2="50" y2="27" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${hourDeg} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />
      <g transform={`rotate(${secDeg} 50 50)`} style={{ transition: s === 0 ? "none" : "transform .35s cubic-bezier(.16,1,.3,1)" }}>
        <line x1="50" y1="58" x2="50" y2="12" stroke="#D9C89E" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="3" fill="#D9C89E" />
    </svg>
  );
}

export function CityClocks({ nowMs, activeSlug }: { nowMs: number; activeSlug: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TRIO.map((t, i) => {
        const city = CITIES.find((c) => c.slug === t.slug)!;
        const sched = schedule(city, nowMs);
        const clock = timeParts(new Date(nowMs), true);
        const nt = timeParts(sched.next.time);
        const active = activeSlug === t.slug;
        return (
          <motion.article
            key={t.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "group relative isolate overflow-hidden rounded-3xl p-5 text-white ring-1 transition-all duration-500 hover:-translate-y-1",
              active ? "ring-2 ring-gold" : "ring-gold/25",
            )}
          >
            <Image
              src={t.image}
              alt=""
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
              quality={70}
              className="-z-20 object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-green-dark/85 to-green-dark/50" />
            <div className="flex items-center gap-4">
              <Analog nowMs={nowMs} dark />
              <div className="min-w-0">
                <p className="font-display text-xl font-bold">{city.name}</p>
                <p className="text-xs text-white/60">{t.note}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span dir="ltr" className="text-2xl font-bold tabular-nums">
                    {clock.time}
                  </span>
                  <span className="text-xs text-white/70">{clock.period}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-sm ring-1 ring-white/10 backdrop-blur">
              <span className="flex items-center gap-2">
                <PrayerIcon prayer={sched.next.key} className="size-4 text-gold" />
                <span className="text-white/70">القادمة:</span>
                <span className="font-bold text-gold">{sched.next.name}</span>
                <span className="tabular-nums">{nt.time}</span>
              </span>
              <span className="truncate text-xs text-white/60">{sched.remaining < 60_000 ? "حان الوقت" : `بعد ${humanRemaining(sched.remaining)}`}</span>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
