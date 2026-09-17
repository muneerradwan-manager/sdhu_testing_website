"use client";

import { AnimatePresence, motion } from "motion/react";
import { Compass, Navigation, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { distanceToKaaba, qiblaBearing, type City } from "@/lib/prayer";
import { cn, formatNumber } from "@/lib/utils";
import { useToast } from "@/components/ui/widgets";

const CX = 160;
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CX - r * Math.cos(a) };
};

const CARDINALS = [
  { deg: 0, label: "ش" },
  { deg: 90, label: "شر" },
  { deg: 180, label: "ج" },
  { deg: 270, label: "غ" },
];

function directionName(b: number) {
  const names = ["الشمال", "الشمال الشرقي", "الشرق", "الجنوب الشرقي", "الجنوب", "الجنوب الغربي", "الغرب", "الشمال الغربي"];
  return names[Math.round(b / 45) % 8];
}

function KaabaGlyph({ x, y, size = 16 }: { x: number; y: number; size?: number }) {
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})`}>
      <rect width={size} height={size} rx={2} fill="#021526" stroke="#D9C89E" strokeWidth={1} />
      <rect y={size * 0.28} width={size} height={size * 0.14} fill="#D9C89E" />
      <rect x={size * 0.62} y={size * 0.55} width={size * 0.2} height={size * 0.45} fill="#AD9E6E" />
    </g>
  );
}

export function QiblaCompass({ city }: { city: City }) {
  const bearing = qiblaBearing(city);
  const distance = distanceToKaaba(city);
  const inMakkah = distance < 5;
  const toast = useToast();

  const [heading, setHeading] = useState<number | null>(null);
  const continuous = useRef(0);
  const cleanup = useRef<(() => void) | null>(null);
  const gotReading = useRef(false);

  useEffect(() => () => cleanup.current?.(), []);

  const enableSensor = async () => {
    if (cleanup.current) {
      cleanup.current();
      cleanup.current = null;
      setHeading(null);
      return;
    }
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      toast({ title: "البوصلة غير متاحة", body: "جهازك لا يدعم حساس الاتجاه. اعتمد على الزاوية المكتوبة.", tone: "warning", icon: "🧭" });
      return;
    }
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === "function") {
      try {
        if ((await DOE.requestPermission()) !== "granted") return;
      } catch {
        return;
      }
    }
    gotReading.current = false;
    const handler = (e: DeviceOrientationEvent) => {
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      const h = typeof webkit === "number" ? webkit : e.alpha != null ? 360 - e.alpha : null;
      if (h == null) return;
      gotReading.current = true;
      const prev = continuous.current;
      const delta = ((((h - prev) % 360) + 540) % 360) - 180;
      continuous.current = prev + delta;
      setHeading(continuous.current);
    };
    const absEvent = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(absEvent, handler as EventListener);
    cleanup.current = () => window.removeEventListener(absEvent, handler as EventListener);
    setTimeout(() => {
      if (!gotReading.current && cleanup.current) {
        cleanup.current();
        cleanup.current = null;
        toast({ title: "لم نتمكن من قراءة البوصلة", body: "جرّب من هاتف محمول، أو وجّه أعلى الشاشة نحو الشمال.", tone: "info", icon: "🧭" });
      }
    }, 2500);
  };

  const live = heading !== null;
  const dialRotation = live ? -heading : 0;
  const needleRotation = live ? bearing - heading : bearing;
  const offBy = live ? Math.abs(((((bearing - heading) % 360) + 540) % 360) - 180) : 999;
  const aligned = offBy < 5;

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-gold/35 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(2,21,38,.5)]">
      <div className="bg-pattern-dark absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
            <Compass className="size-5 text-gold-dark" /> اتجاه القبلة
          </p>
          <p className="mt-1 text-sm text-ink-soft">من {city.name} نحو الكعبة المشرّفة</p>
        </div>
        <button
          type="button"
          onClick={enableSensor}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
            live ? "border-green-light bg-green-light/10 text-green" : "border-green-dark/15 text-green-dark hover:border-green-dark/40",
          )}
          aria-pressed={live}
        >
          <Smartphone className="size-3.5" />
          {live ? "إيقاف البوصلة" : "بوصلة الجهاز"}
        </button>
      </div>

      <div className="relative mx-auto my-6 aspect-square w-full max-w-[18rem]">
        <motion.div
          className={cn("absolute inset-0 rounded-full transition-shadow duration-500", aligned && "shadow-[0_0_60px_10px_rgba(40,158,146,.45)]")}
          animate={{ rotate: dialRotation }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
        >
          <svg viewBox="0 0 320 320" className="size-full" role="img" aria-label={`القبلة على زاوية ${Math.round(bearing)} درجة من الشمال`}>
            <defs>
              <radialGradient id="dial-bg" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#F7F4EF" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CX} r={156} fill="#00594F" />
            <circle cx={CX} cy={CX} r={150} fill="none" stroke="#D9C89E" strokeWidth={1.5} />
            <circle cx={CX} cy={CX} r={138} fill="url(#dial-bg)" />
            {Array.from({ length: 72 }, (_, i) => {
              const deg = i * 5;
              const major = deg % 30 === 0;
              const a = polar(138, deg);
              const b = polar(major ? 124 : deg % 15 === 0 ? 129 : 132, deg);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={major ? "#00594F" : "#AD9E6E"}
                  strokeWidth={major ? 2 : 1}
                  strokeLinecap="round"
                />
              );
            })}
            {Array.from({ length: 12 }, (_, i) => i * 30)
              .filter((d) => d % 90 !== 0)
              .map((d) => {
                const p = polar(110, d);
                return (
                  <text key={d} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#62748e" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {d}
                  </text>
                );
              })}
            {CARDINALS.map((c) => {
              const p = polar(106, c.deg);
              return (
                <text
                  key={c.deg}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={c.deg === 0 ? 20 : 16}
                  fontWeight={700}
                  fill={c.deg === 0 ? "#672146" : "#00594F"}
                >
                  {c.label}
                </text>
              );
            })}
            {/* Rose */}
            <g opacity={0.12}>
              {[0, 45, 90, 135].map((d) => (
                <path key={d} transform={`rotate(${d} ${CX} ${CX})`} d={`M${CX} 70 L${CX + 10} ${CX} L${CX} 250 L${CX - 10} ${CX}z`} fill="#00594F" />
              ))}
            </g>
            {/* Qibla arc from north to bearing */}
            <path
              d={(() => {
                const s = polar(92, 0);
                const e = polar(92, bearing);
                return `M${s.x} ${s.y} A92 92 0 ${bearing > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
              })()}
              fill="none"
              stroke="#D9C89E"
              strokeWidth={3}
              strokeDasharray="2 5"
              strokeLinecap="round"
            />
            {(() => {
              const k = polar(147, bearing);
              return <KaabaGlyph x={k.x} y={k.y} size={18} />;
            })()}
          </svg>
        </motion.div>

        {/* Needle */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ rotate: 0 }}
          animate={{ rotate: needleRotation }}
          transition={{ type: "spring", stiffness: 40, damping: 9, mass: 1.2, delay: live ? 0 : 0.3 }}
          aria-hidden
        >
          <svg viewBox="0 0 320 320" className="size-full drop-shadow-[0_6px_10px_rgba(2,21,38,.35)]">
            <defs>
              <linearGradient id="needle-gold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#AD9E6E" />
                <stop offset="50%" stopColor="#FFF6DC" />
                <stop offset="100%" stopColor="#D9C89E" />
              </linearGradient>
            </defs>
            <path d={`M${CX} 58 L${CX + 13} ${CX} L${CX - 13} ${CX}z`} fill="url(#needle-gold)" stroke="#AD9E6E" strokeWidth={1} />
            <path d={`M${CX} 236 L${CX + 13} ${CX} L${CX - 13} ${CX}z`} fill="#672146" opacity={0.85} />
            <KaabaGlyph x={CX} y={46} size={20} />
            <circle cx={CX} cy={CX} r={11} fill="#00594F" stroke="#D9C89E" strokeWidth={3} />
            <circle cx={CX} cy={CX} r={3} fill="#D9C89E" />
          </svg>
        </motion.div>
      </div>

      <AnimatePresence>
        {aligned && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative -mt-2 mb-3 rounded-full bg-green-light/15 py-1.5 text-center text-sm font-bold text-green"
          >
            أنت الآن باتجاه القبلة ✓
          </motion.p>
        )}
      </AnimatePresence>

      <dl className="relative mt-auto grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-sand p-3 text-center ring-1 ring-gold/25">
          <dt className="text-xs text-hint">زاوية القبلة</dt>
          <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-green-dark">{Math.round(bearing)}°</dd>
          <dd className="text-[11px] text-ink-soft">نحو {directionName(bearing)}</dd>
        </div>
        <div className="rounded-2xl bg-sand p-3 text-center ring-1 ring-gold/25">
          <dt className="text-xs text-hint">المسافة إلى الكعبة</dt>
          <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-green-dark">{inMakkah ? "قريبة" : formatNumber(distance)}</dd>
          <dd className="text-[11px] text-ink-soft">{inMakkah ? "أنت في مكة المكرمة" : "كيلومتر تقريباً"}</dd>
        </div>
      </dl>
      <p className="relative mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-hint">
        <Navigation className="size-3" />
        {live ? "حرّك هاتفك ببطء حتى يشير السهم إلى الأعلى" : "وجّه أعلى الشاشة نحو الشمال لتقرأ الاتجاه"}
      </p>
    </div>
  );
}
