"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Info, PartyPopper, RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SpeakButton } from "@/components/ui/widgets";
import { SAI_LAPS, SAI_SAFA_DUA, TAWAF_BETWEEN_CORNERS, TAWAF_ROUNDS } from "@/lib/data/guide";
import { cn } from "@/lib/utils";

async function burst() {
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#D9C89E", "#AD9E6E", "#00594F", "#289E92", "#ffffff"];
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.55 }, colors });
  setTimeout(() => confetti({ particleCount: 80, spread: 120, startVelocity: 30, origin: { y: 0.5 }, colors }), 250);
}

export function RitualCounter() {
  const [mode, setMode] = useState<"tawaf" | "sai">("tawaf");
  return (
    <div>
      <div role="tablist" aria-label="نوع العدّاد" className="mx-auto flex w-fit gap-1 rounded-2xl border border-gold/40 bg-white p-1 shadow-sm">
        {(
          [
            { id: "tawaf", label: "عدّاد الطواف" },
            { id: "sai", label: "عدّاد السعي" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mode === t.id}
            onClick={() => setMode(t.id)}
            className={cn("relative rounded-xl px-6 py-2.5 font-bold transition-colors", mode === t.id ? "text-white" : "text-ink-soft hover:text-green-dark")}
          >
            {mode === t.id && <motion.span layoutId="ritual-pill" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="mt-8">
          {mode === "tawaf" ? <TawafCounter /> : <SaiCounter />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Tawaf ─────────────────────────

const C = 160; // svg center
const ORBIT = 118;
const RING = 146;
const START_DEG = 45; // Black Stone corner (bottom-right on this map)

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
};

function segmentPath(i: number) {
  const step = 360 / 7;
  const a0 = START_DEG - i * step - 2.5;
  const a1 = START_DEG - (i + 1) * step + 2.5;
  const p0 = polar(a0, RING);
  const p1 = polar(a1, RING);
  return `M ${p0.x} ${p0.y} A ${RING} ${RING} 0 0 0 ${p1.x} ${p1.y}`;
}

function TawafCounter() {
  const [count, setCount] = useState(0);
  const progress = useMotionValue(0);
  const running = useRef<ReturnType<typeof animate> | null>(null);
  const done = count >= 7;

  const angle = useTransform(progress, (v) => START_DEG - v * 360);
  const dotX = useTransform(angle, (a) => polar(a, ORBIT).x);
  const dotY = useTransform(angle, (a) => polar(a, ORBIT).y);
  const circumference = 2 * Math.PI * ORBIT;
  const trailOffset = useTransform(progress, (v) => {
    if (v <= 0) return circumference;
    const frac = v - Math.floor(v - 1e-6);
    return circumference * (1 - frac);
  });

  useEffect(() => () => running.current?.stop(), []);

  const moveTo = (target: number, duration: number) => {
    running.current?.stop();
    running.current = animate(progress, target, { duration, ease: [0.45, 0, 0.25, 1] });
  };

  const next = () => {
    if (done) return;
    const n = count + 1;
    setCount(n);
    moveTo(n, 2.2);
    if (n === 7) setTimeout(() => void burst(), 2000);
  };

  const undo = () => {
    if (count === 0) return;
    setCount(count - 1);
    moveTo(count - 1, 0.6);
  };

  const reset = () => {
    setCount(0);
    moveTo(0, 0.8);
  };

  const round = TAWAF_ROUNDS[Math.min(count, 6)];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="relative mx-auto w-full max-w-[440px]">
        <svg viewBox="-12 -12 344 344" className="w-full drop-shadow-[0_30px_40px_rgba(2,21,38,.25)]" role="img" aria-label={`رسم الكعبة من الأعلى، أتممت ${count} من 7 أشواط`}>
          <defs>
            <radialGradient id="mataf" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e4ddd3" />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={C} cy={C} r={160} fill="url(#mataf)" stroke="#D9C89E" strokeWidth="1.5" />
          {/* crowd flow rings */}
          <motion.g style={{ originX: "50%", originY: "50%" }} animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
            {[70, 96, 132].map((r) => (
              <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="#AD9E6E" strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 8" />
            ))}
          </motion.g>

          {/* 7 round segments */}
          {Array.from({ length: 7 }, (_, i) => (
            <g key={i}>
              <path d={segmentPath(i)} fill="none" stroke="#E4DDD3" strokeWidth="9" strokeLinecap="round" />
              <motion.path
                d={segmentPath(i)}
                fill="none"
                stroke={done ? "#289E92" : "#AD9E6E"}
                strokeWidth="9"
                strokeLinecap="round"
                initial={false}
                animate={{ pathLength: i < count ? 1 : 0, opacity: i < count ? 1 : 0 }}
                transition={{ duration: 0.8, delay: i < count ? 1.4 : 0 }}
              />
            </g>
          ))}

          {/* orbit trail */}
          <circle cx={C} cy={C} r={ORBIT} fill="none" stroke="#00594F" strokeOpacity=".12" strokeWidth="14" />
          {/* mirrored + rotated so the dash grows counter-clockwise from the Black Stone */}
          <g transform={`rotate(${START_DEG} ${C} ${C}) translate(0 ${2 * C}) scale(1 -1)`}>
            <motion.circle
              cx={C}
              cy={C}
              r={ORBIT}
              fill="none"
              stroke="#289E92"
              strokeOpacity=".55"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: trailOffset }}
            />
          </g>

          {/* start line from the Black Stone */}
          {(() => {
            const a = polar(START_DEG, 62);
            const b = polar(START_DEG, 160);
            return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#672146" strokeWidth="2" strokeDasharray="5 4" />;
          })()}

          {/* Hijr Ismail */}
          <path d="M 118 108 A 44 40 0 0 1 202 108" fill="none" stroke="#021526" strokeOpacity=".55" strokeWidth="6" strokeLinecap="round" />
          <text x={C} y={60} textAnchor="middle" fontSize="10" fill="#4A4A4A" fontWeight="700">حِجر إسماعيل</text>

          {/* Kaaba */}
          <g>
            <rect x={116} y={116} width={88} height={88} rx={3} fill="#021526" />
            <rect x={116} y={134} width={88} height={9} fill="#AD9E6E" />
            <rect x={116} y={134} width={88} height={9} fill="url(#mataf)" opacity=".15" />
            {/* door on the north-east face */}
            <rect x={200} y={150} width={4} height={24} fill="#D9C89E" />
          </g>
          {/* Maqam Ibrahim */}
          <g>
            <circle cx={238} cy={146} r={7} fill="#D9C89E" stroke="#AD9E6E" strokeWidth="2" />
            <text x={238} y={128} textAnchor="middle" fontSize="9" fill="#4A4A4A" fontWeight="700">المقام</text>
          </g>
          {/* corners */}
          <circle cx={204} cy={204} r={6} fill="#672146" stroke="#fff" strokeWidth="2" />
          <text x={214} y={228} fontSize="10" fill="#672146" fontWeight="800">الحجر الأسود</text>
          <circle cx={116} cy={204} r={4} fill="#AD9E6E" />
          <text x={108} y={226} textAnchor="end" fontSize="10" fill="#4A4A4A" fontWeight="700">الركن اليماني</text>

          {/* pilgrim */}
          <motion.circle cx={dotX} cy={dotY} r={11} fill="#289E92" opacity=".25" filter="url(#glow)" />
          <motion.circle cx={dotX} cy={dotY} r={7} fill="#00594F" stroke="#fff" strokeWidth="2.5" />

          {/* counter in the middle */}
          <text x={C} y={C + 8} textAnchor="middle" fontSize="26" fontWeight="800" fill="#D9C89E" style={{ fontFamily: "var(--font-kufi)" }}>
            {count}/7
          </text>
        </svg>
        <p className="mt-2 text-center text-xs text-hint">الاتجاه عكس عقارب الساعة، والكعبة عن يسارك</p>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 20 }}
              className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white sm:p-8"
            >
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <PartyPopper className="relative size-10 text-gold" />
              <p className="relative mt-3 font-display text-3xl font-bold">تقبّل الله طوافك</p>
              <p className="relative mt-3 leading-8 text-white/85">
                أتممت سبعة أشواط. غطِّ كتفك الأيمن إن كنت مضطبعاً، ثم صلِّ ركعتين خلف مقام إبراهيم إن تيسّر، واشرب من ماء زمزم.
              </p>
              <button type="button" onClick={reset} className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 font-bold text-ink hover:bg-white">
                <RotateCcw className="size-4" /> طواف جديد
              </button>
            </motion.div>
          ) : (
            <motion.div key={count} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
              <p className="text-sm font-bold text-maroon">{count === 0 ? "ابدأ من خط الحجر الأسود" : `أتممت ${count} من 7`}</p>
              <h3 className="mt-1 font-display text-3xl font-bold text-green-dark">الشوط {count + 1} من 7</h3>
              <p className="mt-3 leading-8 text-ink-soft">{round.hint}</p>
              <div className="mt-5 rounded-3xl border border-gold/40 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gold-dark">دعاء مقترح</span>
                  <SpeakButton text={round.dua} className="px-3 py-1.5" />
                </div>
                <p className="mt-2 font-quran text-2xl leading-[2.2] text-ink">{round.dua}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!done && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={next}
              className="relative inline-flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-green-dark px-6 py-4 text-lg font-bold text-white shadow-[0_14px_30px_-12px_rgba(0,89,79,.8)] transition hover:bg-green sm:flex-none"
            >
              <span className="absolute inset-0 animate-pulse-ring rounded-2xl text-green-light" />
              أتممت الشوط {count + 1}
            </motion.button>
            <button type="button" onClick={undo} disabled={count === 0} aria-label="تراجع عن آخر شوط" className="grid size-14 place-items-center rounded-2xl border-2 border-green-dark/15 text-green-dark hover:border-green-dark disabled:opacity-40">
              <Undo2 className="size-5" />
            </button>
          </div>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-gold-light/60 p-4 text-sm leading-7 text-ink-soft">
          <Info className="mt-1 size-5 shrink-0 text-gold-dark" />
          <p>
            لا يثبت دعاء مخصوص لكل شوط؛ هذه أدعية عامة مقترحة، وادعُ بما تحب. وبين الركن اليماني والحجر الأسود قل:{" "}
            <span className="font-quran text-lg text-green-dark">«{TAWAF_BETWEEN_CORNERS}»</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Sa'i ─────────────────────────

const SAFA_X = 318;
const MARWA_X = 62;
const GREEN_FROM = 214; // green lights, nearer to Safa
const GREEN_TO = 156;

function SaiCounter() {
  const [count, setCount] = useState(0);
  const done = count >= 7;
  const atSafa = count % 2 === 0;
  const from = atSafa ? MARWA_X : SAFA_X;
  const to = atSafa ? SAFA_X : MARWA_X;

  const next = () => {
    if (done) return;
    const n = count + 1;
    setCount(n);
    if (n === 7) setTimeout(() => void burst(), 2200);
  };

  const lap = SAI_LAPS[Math.min(count, 6)];
  const goingToMarwa = count % 2 === 0;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-[520px]">
        <svg viewBox="0 0 380 220" className="w-full drop-shadow-[0_30px_40px_rgba(2,21,38,.2)]" role="img" aria-label={`مسار السعي بين الصفا والمروة، أتممت ${count} من 7 أشواط`}>
          <rect x="4" y="30" width="372" height="160" rx="28" fill="#fff" stroke="#D9C89E" strokeWidth="1.5" />
          {/* hills */}
          <path d={`M ${SAFA_X - 34} 150 Q ${SAFA_X} 70 ${SAFA_X + 44} 150 Z`} fill="#AD9E6E" opacity=".55" />
          <path d={`M ${MARWA_X - 44} 150 Q ${MARWA_X} 78 ${MARWA_X + 34} 150 Z`} fill="#AD9E6E" opacity=".55" />
          <text x={SAFA_X} y={58} textAnchor="middle" fontSize="15" fontWeight="800" fill="#00594F">الصفا</text>
          <text x={MARWA_X} y={58} textAnchor="middle" fontSize="15" fontWeight="800" fill="#00594F">المروة</text>

          {/* corridor */}
          <rect x={MARWA_X} y="118" width={SAFA_X - MARWA_X} height="26" rx="13" fill="#F7F4EF" stroke="#E4DDD3" />
          <line x1={MARWA_X + 10} y1="131" x2={SAFA_X - 10} y2="131" stroke="#AD9E6E" strokeOpacity=".5" strokeDasharray="3 6" />

          {/* green lights zone */}
          <motion.rect
            x={GREEN_TO}
            y="112"
            width={GREEN_FROM - GREEN_TO}
            height="38"
            rx="8"
            fill="#289E92"
            animate={{ opacity: [0.18, 0.4, 0.18] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {[GREEN_TO, GREEN_FROM].map((x) => (
            <g key={x}>
              <rect x={x - 2} y="92" width="4" height="22" rx="2" fill="#289E92" />
              <motion.circle cx={x} cy="90" r="6" fill="#289E92" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} />
            </g>
          ))}
          <text x={(GREEN_FROM + GREEN_TO) / 2} y="176" textAnchor="middle" fontSize="10" fontWeight="700" fill="#016D5D">العلمان الأخضران: يُسرع الرجل</text>

          {/* lap dots */}
          {Array.from({ length: 7 }, (_, i) => (
            <motion.circle
              key={i}
              cx={130 + i * 20}
              cy="204"
              r="5"
              initial={false}
              animate={{ fill: i < count ? (done ? "#289E92" : "#AD9E6E") : "#E4DDD3", scale: i === count - 1 ? [1, 1.6, 1] : 1 }}
              transition={{ duration: 0.5, delay: 1.6 }}
            />
          ))}

          {/* pilgrim */}
          <motion.g
            key={count}
            initial={{ x: count === 0 ? SAFA_X : from }}
            animate={{ x: count === 0 ? [SAFA_X] : [from, from > to ? GREEN_FROM : GREEN_TO, from > to ? GREEN_TO : GREEN_FROM, to] }}
            transition={{ duration: 2, times: count === 0 ? undefined : [0, 0.4, 0.58, 1], ease: "easeInOut" }}
          >
            <circle cx="0" cy="131" r="13" fill="#289E92" opacity=".25" />
            <circle cx="0" cy="131" r="8" fill="#00594F" stroke="#fff" strokeWidth="2.5" />
          </motion.g>
        </svg>
        <p className="mt-2 text-center text-xs text-hint">يبدأ السعي بالصفا وينتهي بالمروة، والذهاب شوط والعودة شوط</p>
      </div>

      <div>
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 20 }}
              className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white sm:p-8"
            >
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <PartyPopper className="relative size-10 text-gold" />
              <p className="relative mt-3 font-display text-3xl font-bold">تقبّل الله سعيك</p>
              <p className="relative mt-3 leading-8 text-white/85">انتهيت عند المروة بعد سبعة أشواط. إن كانت عمرة فاحلق أو قصّر، وتقص المرأة قدر أنملة.</p>
              <button type="button" onClick={() => setCount(0)} className="relative mt-6 inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 font-bold text-ink hover:bg-white">
                <RotateCcw className="size-4" /> سعي جديد
              </button>
            </motion.div>
          ) : (
            <motion.div key={count} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.35 }}>
              <p className="text-sm font-bold text-maroon">{goingToMarwa ? "من الصفا ← إلى المروة" : "من المروة ← إلى الصفا"}</p>
              <h3 className="mt-1 font-display text-3xl font-bold text-green-dark">الشوط {count + 1} من 7</h3>
              <p className="mt-3 leading-8 text-ink-soft">{lap}</p>
              <div className="mt-5 rounded-3xl border border-gold/40 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gold-dark">على الصفا والمروة (مستقبلاً الكعبة)</span>
                  <SpeakButton text={SAI_SAFA_DUA} className="px-3 py-1.5" />
                </div>
                <p className="mt-2 font-quran text-xl leading-[2.2] text-ink">{SAI_SAFA_DUA}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!done && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={next}
              className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-dark px-6 py-4 text-lg font-bold text-white shadow-[0_14px_30px_-12px_rgba(0,89,79,.8)] transition hover:bg-green sm:flex-none"
            >
              <span className="absolute inset-0 animate-pulse-ring rounded-2xl text-green-light" />
              {goingToMarwa ? "وصلت إلى المروة" : "وصلت إلى الصفا"}
            </motion.button>
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(0, c - 1))}
              disabled={count === 0}
              aria-label="تراجع عن آخر شوط"
              className="grid size-14 place-items-center rounded-2xl border-2 border-green-dark/15 text-green-dark hover:border-green-dark disabled:opacity-40"
            >
              <Undo2 className="size-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
