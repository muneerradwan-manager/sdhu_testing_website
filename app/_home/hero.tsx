"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, BookOpen, ChevronDown, ShieldCheck, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { list, str } from "@/components/cms/bits";
import { ButtonLink } from "@/components/ui/button";
import { useSection } from "@/lib/cms/store";
import { useMediaUrl } from "@/lib/cms/media";
import { useHydrated } from "@/lib/store";

function useCountdown(target: Date) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    ready: hydrated,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 min-w-16 overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-2 backdrop-blur-md md:h-16 md:min-w-20">
        <motion.span
          key={text}
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 260 }}
          className="absolute inset-0 grid place-items-center font-display text-3xl font-bold tabular-nums text-white md:text-4xl"
        >
          {text}
        </motion.span>
        <span className="absolute inset-x-0 top-1/2 h-px bg-black/20" />
      </div>
      <span className="mt-1.5 text-xs text-white/60">{label}</span>
    </div>
  );
}

export function Hero() {
  const v = useSection("home", "hero");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundOn, setSoundOn] = useState(false);

  const words = list<{ word: string; highlight: boolean }>(v, "titleWords");
  const rows = list<{ label: string; value: string; live: boolean }>(v, "rows");
  const trust = list<{ text: string }>(v, "trust");
  const videoSrc = useMediaUrl(v.video);
  const posterSrc = useMediaUrl(v.poster);

  /** موعد العدّ التنازلي يضبطه الموظف من لوحة المحتوى؛ التاريخ غير الصالح لا يُسقط الصفحة */
  const target = useMemo(() => {
    const parsed = new Date(str(v, "countdownTarget"));
    return Number.isNaN(parsed.getTime()) ? new Date("2027-05-15T05:00:00+03:00") : parsed;
  }, [v]);
  const c = useCountdown(target);

  const toggleSound = () => {
    const el = videoRef.current;
    if (!el) return;
    const next = !soundOn;
    el.muted = !next;
    el.volume = 0.7;
    if (next) void el.play().catch(() => {});
    setSoundOn(next);
  };

  return (
    <section ref={ref} className="relative isolate flex min-h-[calc(100svh/var(--zoom))] items-center overflow-hidden bg-ink text-white">
      <motion.div style={{ y, scale }} className="absolute inset-0 -z-20">
        {videoSrc ? (
          <video ref={videoRef} className="size-full object-cover" src={videoSrc} poster={posterSrc} autoPlay muted loop playsInline preload="metadata" />
        ) : posterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- خلفية بملء الشاشة، قد تكون صورة مرفوعة من لوحة المحتوى
          <img src={posterSrc} alt="" className="size-full object-cover" />
        ) : null}
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-ink/40 via-green-dark/70 to-ink/95" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-ink/40" />
      <div className="bg-pattern absolute inset-0 -z-10 opacity-[.12] [mask-image:radial-gradient(ellipse_at_left,black,transparent_70%)]" />

      <motion.div style={{ opacity: fade }} className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-24 pt-40 md:px-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          {str(v, "badge") && (
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold backdrop-blur"
            >
              <Sparkles className="size-4" /> {str(v, "badge")}
            </motion.span>
          )}

          <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.25] sm:text-5xl md:text-7xl">
            {words.map((w, i) => (
              <motion.span
                key={`${w.word}-${i}`}
                initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.35 + i * 0.12, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`ml-4 inline-block ${w.highlight ? "text-gold-shine" : ""}`}
              >
                {w.word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.7 }}
            className="mt-6 max-w-xl text-lg leading-9 text-white/80 md:text-xl"
          >
            {str(v, "description")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.25, duration: 0.7 }} className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={str(v, "primaryHref", "/register")} variant="gold" size="lg" className="shadow-2xl">
              {str(v, "primaryLabel")}
              <ArrowLeft className="size-5 transition-transform group-hover/btn:-translate-x-1" />
            </ButtonLink>
            <ButtonLink href={str(v, "secondaryHref", "/academy")} variant="glass" size="lg">
              <BookOpen className="size-5" /> {str(v, "secondaryLabel")}
            </ButtonLink>
          </motion.div>

          {trust.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/65">
              {trust.map((t, i) => (
                <span key={`${t.text}-${i}`} className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-green-light" /> {t.text}
                </span>
              ))}
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, x: -40, rotate: -2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ delay: 0.9, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gold/20 blur-3xl" />
          <div className="rounded-[2rem] border border-white/15 bg-white/[.07] p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <p className="text-sm text-gold">{str(v, "countdownEyebrow")}</p>
            <p className="mt-1 font-display text-2xl font-bold">{str(v, "countdownTitle")}</p>
            <div className="mt-6 flex justify-between gap-2" dir="rtl">
              <Digit value={c.ready ? c.days : 0} label="يوم" />
              <Digit value={c.ready ? c.hours : 0} label="ساعة" />
              <Digit value={c.ready ? c.minutes : 0} label="دقيقة" />
              <Digit value={c.ready ? c.seconds : 0} label="ثانية" />
            </div>
            {rows.length > 0 && (
              <div className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm">
                {rows.map((r, i) => (
                  <div key={`${r.label}-${i}`} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-white/70">
                      {r.live ? (
                        <span className="relative flex size-2">
                          <span className="absolute inset-0 animate-ping rounded-full bg-green-light" />
                          <span className="relative size-2 rounded-full bg-green-light" />
                        </span>
                      ) : (
                        <span className="size-2 rotate-45 bg-gold/60" />
                      )}
                      {r.label}
                    </span>
                    <span className="font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {videoSrc && (
        <motion.button
          type="button"
          onClick={toggleSound}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 }}
          aria-pressed={soundOn}
          className="absolute bottom-8 left-4 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 md:left-8"
        >
          <span className="relative flex">
            {soundOn ? <Volume2 className="size-5 text-gold" /> : <VolumeX className="size-5" />}
            {!soundOn && <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />}
          </span>
          {soundOn ? str(v, "soundOn") : str(v, "soundOff")}
        </motion.button>
      )}

      <motion.a
        href="#services"
        style={{ opacity: fade }}
        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs text-white/60"
        aria-label="انتقل إلى الخدمات"
      >
        {str(v, "scrollHint")}
        <motion.span animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ChevronDown className="size-5" />
        </motion.span>
      </motion.a>
    </section>
  );
}
