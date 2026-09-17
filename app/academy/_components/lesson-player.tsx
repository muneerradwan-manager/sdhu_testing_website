"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Captions,
  CaptionsOff,
  ChevronLeft,
  Download,
  Gauge,
  Headphones,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatClock, minutesLabel, type Lesson, type Lecturer } from "@/lib/data/academy";
import { seeded, cn } from "@/lib/utils";
import { useVideoEngine, type PlayerEngine } from "./player-engine";

export type PlayerLesson = Pick<Lesson, "slug" | "title" | "minutes" | "media" | "poster" | "gallery" | "videoSrc" | "summary" | "points" | "hasAudio">;

type Props = {
  lesson: PlayerLesson;
  lecturer: Pick<Lecturer, "name" | "role" | "initials">;
  fallbackGallery: string[];
  nextHref?: string;
  nextTitle?: string;
  /** End-screen call to action; defaults to «الدرس التالي» */
  nextLabel?: string;
  className?: string;
  /** Base path of the narrated summary: `${narration}.mp3` + `${narration}.json` (sentence timings) */
  narration?: string;
};

type Cue = { start: number; end: number; text: string };

const SPEEDS = [0.75, 1, 1.25, 1.5];
const CAPTION_SECONDS = 4.5;
const SLIDE_SECONDS = 9;

/** Picks the right player for the lesson: real video, simulated video, or audio */
export function LessonPlayer(props: Props) {
  if (props.lesson.media === "audio") return <AudioPlayer {...props} />;
  if (props.lesson.videoSrc) return <RealVideoPlayer {...props} />;
  return <SimVideoPlayer {...props} />;
}

// ───────────────────────── helpers ─────────────────────────

function captionChunks(summary: string[]) {
  const out: string[] = [];
  for (const paragraph of summary) {
    for (const sentence of paragraph.split(/[.؛:]\s+|،\s+/)) {
      const words = sentence.replace(/[«»"]/g, "").trim().split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i += 8) out.push(words.slice(i, i + 8).join(" "));
    }
  }
  return out.filter((c) => c.length > 4);
}

/** Long sentences are split into ~9-word captions, timed proportionally inside the sentence */
function splitCues(raw: Cue[]) {
  const out: Cue[] = [];
  for (const c of raw) {
    const words = c.text.split(/\s+/).filter(Boolean);
    const parts = Math.max(1, Math.ceil(words.length / 9));
    const size = Math.ceil(words.length / parts);
    const span = c.end - c.start;
    for (let i = 0; i < parts; i++) {
      const from = i * size;
      if (from >= words.length) break;
      out.push({
        start: c.start + (span * from) / words.length,
        end: c.start + (span * Math.min(words.length, from + size)) / words.length,
        text: words.slice(from, from + size).join(" "),
      });
    }
  }
  return out;
}

function useCues(base?: string) {
  const [cues, setCues] = useState<Cue[] | null>(null);
  useEffect(() => {
    if (!base) return;
    let alive = true;
    fetch(`${base}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Cue[]>) : null))
      .then((raw) => {
        if (alive && raw) setCues(splitCues(raw));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [base]);
  return cues;
}

function chaptersFor(lesson: PlayerLesson, duration: number) {
  const titles = ["مقدمة الدرس", ...lesson.points.slice(0, 3)];
  return titles.map((title, i) => ({ at: (i / titles.length) * duration, title }));
}

// ───────────────────────── Real video ─────────────────────────

function RealVideoPlayer({ lesson, lecturer, nextHref, nextTitle, nextLabel, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { engine, handlers } = useVideoEngine(videoRef);
  const chapters = useMemo(() => chaptersFor(lesson, engine.duration), [lesson, engine.duration]);
  const captions = useMemo(() => captionChunks(lesson.summary), [lesson.summary]);

  return (
    <PlayerFrame
      engine={engine}
      lesson={lesson}
      lecturer={lecturer}
      chapters={engine.duration ? chapters : []}
      captions={captions}
      nextHref={nextHref}
      nextTitle={nextTitle}
      nextLabel={nextLabel}
      className={className}
      badge="تصوير من الحرم"
    >
      <video
        ref={videoRef}
        src={lesson.videoSrc}
        poster={lesson.poster}
        preload="metadata"
        playsInline
        className="absolute inset-0 size-full object-cover"
        {...handlers}
      />
    </PlayerFrame>
  );
}

// ───────────────────────── Simulated video ─────────────────────────

function SimVideoPlayer({ lesson, lecturer, fallbackGallery, nextHref, nextTitle, nextLabel, className, narration }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { engine, handlers } = useVideoEngine(audioRef);
  const images = lesson.gallery?.length ? lesson.gallery : fallbackGallery;
  const chapters = useMemo(() => chaptersFor(lesson, engine.duration), [lesson, engine.duration]);
  const captions = useMemo(() => captionChunks(lesson.summary), [lesson.summary]);
  const cues = useCues(narration);

  return (
    <PlayerFrame
      engine={engine}
      lesson={lesson}
      lecturer={lecturer}
      chapters={engine.duration ? chapters : []}
      captions={captions}
      cues={cues}
      nextHref={nextHref}
      nextTitle={nextTitle}
      nextLabel={nextLabel}
      className={className}
      badge="ملخص الدرس مسموعاً"
    >
      <KenBurns images={images} time={engine.time} />
      <audio ref={audioRef} src={narration ? `${narration}.mp3` : undefined} preload="metadata" {...handlers} />
    </PlayerFrame>
  );
}

const ORIGINS = ["30% 35%", "70% 30%", "50% 70%", "25% 60%", "75% 55%"];

/** Deterministic Ken-Burns slideshow driven by the player clock, so it pauses and scrubs */
function KenBurns({ images, time }: { images: string[]; time: number }) {
  const n = images.length;
  const slot = Math.floor(time / SLIDE_SECONDS);
  const index = slot % n;
  const nextIndex = (index + 1) % n;
  const p = (time % SLIDE_SECONDS) / SLIDE_SECONDS;
  const fade = Math.min(1, Math.max(0, (p - 0.82) / 0.18));

  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      {images.map((src, i) => {
        const isCurrent = i === index;
        const isNext = i === nextIndex && fade > 0;
        if (!isCurrent && !isNext) return null;
        const localP = isCurrent ? p : 0;
        const dir = (slot + (isCurrent ? 0 : 1)) % 2 === 0 ? 1 : -1;
        return (
          <div
            key={src}
            className="absolute inset-0 will-change-transform"
            style={{
              opacity: isCurrent ? 1 : fade,
              zIndex: isCurrent ? 1 : 2,
              transformOrigin: ORIGINS[i % ORIGINS.length],
              transform: `scale(${1.06 + 0.14 * localP}) translateX(${dir * localP * 1.5}%)`,
            }}
          >
            <Image src={src} alt="" fill sizes="(min-width: 1024px) 800px, 100vw" quality={70} className="object-cover" />
          </div>
        );
      })}
      <div className="absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,21,38,.55))]" />
    </div>
  );
}

// ───────────────────────── Frame (overlays + controls) ─────────────────────────

function PlayerFrame({
  engine,
  lesson,
  lecturer,
  chapters,
  captions,
  nextHref,
  nextTitle,
  nextLabel = "الدرس التالي",
  className,
  badge,
  children,
  cues,
}: {
  cues?: Cue[] | null;
  engine: PlayerEngine;
  lesson: PlayerLesson;
  lecturer: Props["lecturer"];
  chapters: { at: number; title: string }[];
  captions: string[];
  nextHref?: string;
  nextTitle?: string;
  nextLabel?: string;
  className?: string;
  badge?: string;
  children: ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [burst, setBurst] = useState<{ id: number; icon: "play" | "pause" | "fwd" | "back" } | null>(null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      clearTimeout(idleTimer.current);
    };
  }, []);

  const wake = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2600);
  };

  const flash = (icon: "play" | "pause" | "fwd" | "back") => setBurst({ id: Date.now(), icon });

  const toggle = () => {
    flash(engine.playing ? "pause" : "play");
    engine.toggle();
    wake();
  };

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  const skip = (delta: number) => {
    engine.seek(engine.time + delta);
    flash(delta > 0 ? "fwd" : "back");
    wake();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key.toLowerCase();
    const target = e.target as HTMLElement;
    if (target.closest("input")) return;
    // Buttons already react to Space/Enter natively — don't double-toggle
    const onButton = target !== e.currentTarget && !!target.closest("button");
    if (k === "k" || (k === " " && !onButton)) {
      e.preventDefault();
      toggle();
    } else if (k === "arrowright") {
      e.preventDefault();
      skip(10);
    } else if (k === "arrowleft") {
      e.preventDefault();
      skip(-10);
    } else if (k === "m") engine.toggleMute();
    else if (k === "f") toggleFullscreen();
    else if (k === "c") setShowCaptions((s) => !s);
  };

  const controlsVisible = !engine.started || !engine.playing || !idle;
  const captionIndex = cues?.length
    ? cues.findLastIndex((c) => engine.time >= c.start)
    : captions.length
      ? Math.floor(engine.time / CAPTION_SECONDS) % captions.length
      : -1;
  const captionText = captionIndex < 0 ? "" : cues?.length ? cues[captionIndex].text : captions[captionIndex];
  const chapterNow = [...chapters].reverse().find((c) => engine.time >= c.at);
  const lowerThird = engine.started && !engine.loading && engine.time % 150 < 7;

  return (
    <div
      ref={shellRef}
      tabIndex={0}
      role="region"
      aria-label={`مشغل الدرس: ${lesson.title}`}
      onKeyDown={onKey}
      onPointerMove={wake}
      onPointerLeave={() => engine.playing && setIdle(true)}
      className={cn(
        "group/player relative isolate aspect-video w-full select-none overflow-hidden rounded-3xl bg-ink shadow-[0_30px_80px_-30px_rgba(2,21,38,.7)] ring-1 ring-gold/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-light/60",
        fullscreen && "rounded-none ring-0",
        !controlsVisible && "cursor-none",
        className,
      )}
    >
      {children}

      {/* click surface */}
      <button
        type="button"
        aria-label={engine.playing ? "إيقاف مؤقت" : "تشغيل"}
        onClick={toggle}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-10 cursor-[inherit] focus:outline-none"
      />

      {/* top gradient + title */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-gradient-to-b from-ink/80 to-transparent p-3 transition-opacity duration-500 sm:p-5",
          engine.started && !controlsVisible ? "opacity-0" : "opacity-100",
        )}
      >
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-white sm:text-lg">{lesson.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-white/70 sm:text-xs">
            {lecturer.name}
            {chapterNow && engine.started ? ` • ${chapterNow.title}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {badge && <span className="hidden rounded-md bg-maroon/85 px-2 py-0.5 text-[10px] font-bold text-white sm:inline">{badge}</span>}
          <span className="rounded-md border border-gold/60 bg-ink/40 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-gold backdrop-blur" dir="ltr">
            HD
          </span>
        </div>
      </div>

      {/* lower third */}
      <AnimatePresence>
        {lowerThird && controlsVisible === false && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2.5 rounded-2xl border-r-4 border-gold bg-ink/70 py-2 pl-4 pr-3 backdrop-blur-md sm:right-6 sm:top-6"
          >
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-display text-lg font-bold text-ink">{lecturer.initials}</span>
            <span>
              <span className="block text-sm font-bold text-white">{lecturer.name}</span>
              <span className="block text-[11px] text-gold">{lecturer.role}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* captions */}
      <AnimatePresence mode="wait">
        {engine.started && showCaptions && captionText && !engine.ended && (
          <motion.div
            key={captionIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "pointer-events-none absolute inset-x-3 z-20 flex justify-center transition-[bottom] duration-300",
              controlsVisible ? "bottom-20 sm:bottom-24" : "bottom-5 sm:bottom-8",
            )}
          >
            <p className="max-w-[92%] rounded-xl bg-ink/75 px-3 py-1.5 text-center text-[13px] font-semibold leading-7 text-white backdrop-blur-sm sm:text-lg">
              {captionText.split(" ").map((w, i) => (
                <motion.span key={i} initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ delay: i * 0.07, duration: 0.25 }}>
                  {w}{" "}
                </motion.span>
              ))}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* center burst */}
      <AnimatePresence>
        {burst && engine.started && (
          <motion.span
            key={burst.id}
            initial={{ opacity: 0.9, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            onAnimationComplete={() => setBurst(null)}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur"
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-gold"
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            {burst.icon === "play" && <Play className="size-9 translate-x-0.5 fill-white" />}
            {burst.icon === "pause" && <Pause className="size-9 fill-white" />}
            {burst.icon === "fwd" && <span className="text-sm font-bold" dir="ltr">+10</span>}
            {burst.icon === "back" && <span className="text-sm font-bold" dir="ltr">-10</span>}
          </motion.span>
        )}
      </AnimatePresence>

      {/* poster / start screen */}
      <AnimatePresence>
        {!engine.started && (
          <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="pointer-events-none absolute inset-0 z-[15]">
            <Image src={lesson.poster} alt="" fill sizes="(min-width: 1024px) 800px, 100vw" quality={70} className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
            <div className="bg-pattern absolute inset-0 opacity-10" />
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 p-4 sm:p-6">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">{minutesLabel(lesson.minutes)}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur">ترجمة عربية</span>
              {lesson.hasAudio && <span className="rounded-full bg-gold/90 px-3 py-1 text-xs font-bold text-ink">+ ملف صوتي</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* big play button */}
      <AnimatePresence>
        {(!engine.started || (!engine.playing && !engine.loading && !engine.ended)) && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ type: "spring", damping: 18, stiffness: 260 }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
          >
            <span className="relative grid size-16 place-items-center rounded-full bg-gold text-ink shadow-[0_0_0_10px_rgba(217,200,158,.18)] transition-transform duration-300 group-hover/player:scale-110 sm:size-24">
              {!engine.started && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/40 [animation-duration:2.2s]" />
                  <span className="absolute -inset-3 rounded-full border border-gold/40" />
                </>
              )}
              <Play className="relative size-7 translate-x-0.5 fill-ink sm:size-10" />
            </span>
          </motion.span>
        )}
      </AnimatePresence>

      {/* loading shimmer */}
      <AnimatePresence>
        {engine.loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-ink/55">
            <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(100deg,transparent_30%,rgba(217,200,158,.16)_50%,transparent_70%)] bg-[length:200%_100%]" />
            <div className="relative flex flex-col items-center gap-3">
              <span className="size-14 animate-spin rounded-full border-4 border-white/15 border-t-gold" />
              <span className="text-xs font-semibold text-white/80">جارٍ تحميل الدرس…</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* end screen */}
      <AnimatePresence>
        {engine.ended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-ink/80 p-4 text-center backdrop-blur-sm"
          >
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="font-display text-xl font-bold text-gold sm:text-3xl">
              بارك الله فيك، انتهى الدرس
            </motion.p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={engine.replay} className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
                <RotateCcw className="size-4" /> إعادة المشاهدة
              </button>
              {nextHref && (
                <Link href={nextHref} className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2.5 text-sm font-bold text-ink hover:bg-gold-dark hover:text-white">
                  {nextLabel}{nextTitle ? `: ${nextTitle}` : ""} <ChevronLeft className="size-4" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent px-3 pb-2 pt-10 transition-all duration-500 sm:px-5 sm:pb-3",
          controlsVisible && engine.started ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <Timeline engine={engine} chapters={chapters} />
        <div className="mt-1.5 flex items-center justify-between gap-2 text-white" dir="ltr">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <CtrlButton label={engine.playing ? "إيقاف مؤقت" : "تشغيل"} onClick={toggle}>
              {engine.playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
            </CtrlButton>
            <CtrlButton label="رجوع 10 ثوانٍ" onClick={() => skip(-10)} className="hidden sm:grid">
              <RotateCcw className="size-[18px]" />
            </CtrlButton>
            <CtrlButton label="تقديم 10 ثوانٍ" onClick={() => skip(10)} className="hidden sm:grid">
              <RotateCw className="size-[18px]" />
            </CtrlButton>
            <VolumeControl engine={engine} />
            <span className="ms-1 text-[11px] font-semibold tabular-nums text-white/90 sm:text-[13px]">
              {formatClock(engine.time)} <span className="text-white/45">/ {formatClock(engine.duration)}</span>
            </span>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <CtrlButton label={showCaptions ? "إخفاء الترجمة" : "إظهار الترجمة"} onClick={() => setShowCaptions((s) => !s)} active={showCaptions}>
              {showCaptions ? <Captions className="size-5" /> : <CaptionsOff className="size-5" />}
            </CtrlButton>
            <SpeedMenu engine={engine} />
            <CtrlButton label={fullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </CtrlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function CtrlButton({ label, onClick, children, className, active }: { label: string; onClick: () => void; children: ReactNode; className?: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-xl text-white/90 transition hover:bg-white/15 hover:text-white active:scale-90 focus-visible:outline-2 focus-visible:outline-gold",
        active && "text-gold",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Timeline({ engine, chapters }: { engine: PlayerEngine; chapters: { at: number; title: string }[] }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const d = engine.duration || 1;

  const fracAt = (clientX: number) => {
    const r = barRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };

  const played = (engine.time / d) * 100;
  const buffered = (Math.min(engine.buffered, d) / d) * 100;
  const hoverChapter = hover !== null ? [...chapters].reverse().find((c) => hover * d >= c.at) : undefined;

  return (
    <div
      ref={barRef}
      dir="ltr"
      role="slider"
      tabIndex={0}
      aria-label="شريط التقدم"
      aria-valuemin={0}
      aria-valuemax={Math.round(d)}
      aria-valuenow={Math.round(engine.time)}
      aria-valuetext={`${formatClock(engine.time)} من ${formatClock(d)}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") engine.seek(engine.time + 5);
        if (e.key === "ArrowLeft") engine.seek(engine.time - 5);
        if (e.key.startsWith("Arrow")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        engine.seek(fracAt(e.clientX) * d);
      }}
      onPointerMove={(e) => {
        const f = fracAt(e.clientX);
        setHover(f);
        if (dragging) engine.seek(f * d);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => !dragging && setHover(null)}
      className="group/bar relative flex h-5 cursor-pointer touch-none items-center"
    >
      <div className={cn("relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-[height] duration-200 group-hover/bar:h-1.5", dragging && "h-1.5")}>
        <div className="absolute inset-y-0 left-0 bg-white/35" style={{ width: `${buffered}%` }} />
        {hover !== null && <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${hover * 100}%` }} />}
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-dark to-gold" style={{ width: `${played}%` }} />
        {chapters.slice(1).map((c) => (
          <span key={c.at} className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-ink/80" style={{ left: `${(c.at / d) * 100}%` }} />
        ))}
      </div>
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-gold shadow-[0_0_0_4px_rgba(217,200,158,.3)] transition-transform group-hover/bar:scale-100",
          dragging && "scale-100",
        )}
        style={{ left: `${played}%` }}
      />
      {hover !== null && (
        <span
          className="pointer-events-none absolute bottom-6 flex -translate-x-1/2 flex-col items-center gap-0.5 whitespace-nowrap rounded-lg bg-ink/90 px-2 py-1 text-center shadow-lg ring-1 ring-white/10"
          style={{ left: `${Math.min(92, Math.max(8, hover * 100))}%` }}
        >
          {hoverChapter && <span className="max-w-44 truncate text-[10px] text-gold" dir="rtl">{hoverChapter.title}</span>}
          <span className="text-[11px] font-bold tabular-nums text-white">{formatClock(hover * d)}</span>
        </span>
      )}
    </div>
  );
}

function VolumeControl({ engine }: { engine: PlayerEngine }) {
  const level = engine.muted ? 0 : engine.volume;
  return (
    <div className="group/vol flex items-center">
      <CtrlButton label={engine.muted ? "تشغيل الصوت" : "كتم الصوت"} onClick={engine.toggleMute}>
        {level === 0 ? <VolumeX className="size-5" /> : level < 0.5 ? <Volume1 className="size-5" /> : <Volume2 className="size-5" />}
      </CtrlButton>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={level}
        aria-label="مستوى الصوت"
        onChange={(e) => engine.setVolume(Number(e.target.value))}
        className="hidden h-1 w-0 cursor-pointer accent-gold opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:w-20 focus:opacity-100 sm:block"
      />
    </div>
  );
}

function SpeedMenu({ engine }: { engine: PlayerEngine }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="سرعة التشغيل"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1 rounded-xl px-2 text-[12px] font-bold text-white/90 hover:bg-white/15"
      >
        <Gauge className="size-4" />
        {engine.rate}x
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute bottom-11 right-0 z-40 w-32 overflow-hidden rounded-2xl bg-ink/95 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur"
          >
            <p className="px-3 pb-1 pt-1.5 text-right text-[10px] font-semibold text-white/50" dir="rtl">
              سرعة التشغيل
            </p>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={engine.rate === s}
                onClick={() => {
                  engine.setRate(s);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-sm font-semibold text-white/85 hover:bg-white/10",
                  engine.rate === s && "bg-gold/15 text-gold",
                )}
              >
                <span>{s}x</span>
                {s === 1 && <span className="text-[10px] text-white/50">عادي</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Audio ─────────────────────────

function AudioPlayer({ lesson, lecturer, className, narration }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { engine, handlers } = useVideoEngine(audioRef);
  const duration = engine.duration || lesson.minutes * 60;
  const cues = useCues(narration);
  const bars = useMemo(() => {
    const rand = seeded(lesson.slug);
    return Array.from({ length: 72 }, (_, i) => {
      const wave = Math.sin(i / 5) * 0.25 + Math.sin(i / 1.7) * 0.15;
      return { h: Math.max(0.14, Math.min(1, 0.45 + wave + rand() * 0.4)), speed: 0.45 + rand() * 0.6 };
    });
  }, [lesson.slug]);
  const frac = engine.time / duration;
  const captions = useMemo(() => captionChunks(lesson.summary), [lesson.summary]);
  const captionIndex = cues?.length ? Math.max(0, cues.findLastIndex((c) => engine.time >= c.start)) : Math.floor(engine.time / CAPTION_SECONDS) % captions.length;
  const captionText = cues?.length ? cues[captionIndex].text : captions[captionIndex];

  return (
    <div className={cn("relative isolate overflow-hidden rounded-3xl bg-green-dark p-5 text-white shadow-[0_30px_80px_-30px_rgba(0,89,79,.8)] ring-1 ring-gold/30 sm:p-8", className)}>
      <audio ref={audioRef} src={narration ? `${narration}.mp3` : undefined} preload="metadata" {...handlers} />
      <Image src={lesson.poster} alt="" fill sizes="(min-width: 1024px) 800px, 100vw" quality={70} className="-z-20 object-cover opacity-20 blur-sm" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-green-dark via-green-dark/95 to-maroon-dark/90" />
      <div className="bg-pattern absolute inset-0 -z-10 opacity-15" />

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <div className="relative grid size-28 shrink-0 place-items-center sm:size-36">
          <span className={cn("absolute inset-0 rounded-full border-2 border-dashed border-gold/50", engine.playing && "animate-spin-slow [animation-duration:12s]")} />
          <motion.span
            animate={engine.playing ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 1.6, repeat: engine.playing ? Infinity : 0 }}
            className="absolute inset-3 rounded-full bg-gold/15"
          />
          <span className="relative grid size-20 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark font-display text-4xl font-bold text-ink shadow-xl sm:size-24">
            {lecturer.initials}
          </span>
          <span className="absolute -bottom-1 flex items-center gap-1 rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-bold">
            <Headphones className="size-3" /> درس صوتي
          </span>
        </div>

        <div className="w-full min-w-0 flex-1 text-center sm:text-right">
          <p className="text-xs font-semibold text-gold">{lecturer.name} • {lecturer.role}</p>
          <h3 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{lesson.title}</h3>
          <div className="mt-2 h-7 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={engine.started ? captionIndex : "idle"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="truncate text-sm text-white/75"
              >
                {engine.started ? captionText : "اضغط تشغيل للاستماع إلى الدرس"}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* waveform */}
      <div
        dir="ltr"
        role="slider"
        tabIndex={0}
        aria-label="موضع الاستماع"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(engine.time)}
        aria-valuetext={formatClock(engine.time)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") engine.seek(engine.time + 15);
          if (e.key === "ArrowLeft") engine.seek(engine.time - 15);
          if (e.key === " ") {
            e.preventDefault();
            engine.toggle();
          }
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          engine.seek(((e.clientX - r.left) / r.width) * duration);
        }}
        className="relative mt-6 flex h-20 cursor-pointer items-center gap-[2px] rounded-2xl sm:h-24 sm:gap-[3px]"
      >
        {bars.map((b, i) => {
          const done = i / bars.length < frac;
          const near = Math.abs(i / bars.length - frac) < 0.12;
          return (
            <motion.span
              key={i}
              className={cn("block flex-1 origin-center rounded-full transition-colors duration-300", done ? "bg-gold" : "bg-white/25")}
              style={{ height: `${b.h * 100}%` }}
              animate={engine.playing ? { scaleY: near ? [1, 0.35, 1.1, 1] : [1, 0.7, 1] } : { scaleY: engine.loading ? [1, 0.5, 1] : 1 }}
              transition={engine.playing || engine.loading ? { duration: b.speed * (near ? 1 : 1.8), repeat: Infinity, ease: "easeInOut", delay: engine.loading ? i * 0.015 : 0 } : { duration: 0.3 }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs tabular-nums text-white/70" dir="ltr">
        <span>{formatClock(engine.time)}</span>
        <span>{formatClock(duration)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3" dir="ltr">
        <div className="flex items-center gap-1">
          <CtrlButton label="كتم الصوت" onClick={engine.toggleMute}>
            {engine.muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </CtrlButton>
          <SpeedMenu engine={engine} />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <CtrlButton label="رجوع 15 ثانية" onClick={() => engine.seek(engine.time - 15)}>
            <RotateCcw className="size-5" />
          </CtrlButton>
          <button
            type="button"
            onClick={engine.toggle}
            aria-label={engine.playing ? "إيقاف مؤقت" : "تشغيل"}
            className="relative grid size-16 place-items-center rounded-full bg-gold text-ink shadow-[0_10px_30px_-8px_rgba(217,200,158,.8)] transition hover:scale-105 active:scale-95"
          >
            {engine.loading ? (
              <span className="size-7 animate-spin rounded-full border-[3px] border-ink/20 border-t-ink" />
            ) : engine.playing ? (
              <Pause className="size-7 fill-ink" />
            ) : (
              <Play className="size-7 translate-x-0.5 fill-ink" />
            )}
            {!engine.started && <span className="absolute inset-0 animate-ping rounded-full bg-gold/40 [animation-duration:2.2s]" />}
          </button>
          <CtrlButton label="تقديم 15 ثانية" onClick={() => engine.seek(engine.time + 15)}>
            <RotateCw className="size-5" />
          </CtrlButton>
        </div>
        {narration && (
          <a href={`${narration}.mp3`} download className="hidden items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/20 sm:flex" dir="rtl">
            <Download className="size-4" /> تحميل MP3
          </a>
        )}
      </div>
    </div>
  );
}
