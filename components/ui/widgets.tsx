"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, Loader2, MapPin, Star, Volume2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ───────────────────────── Map ─────────────────────────

/** Keyless OpenStreetMap embed with a marker, plus deep links to Google Maps */
export function MapEmbed({
  lat,
  lng,
  label,
  zoom = 0.012,
  className,
}: {
  lat: number;
  lng: number;
  label: string;
  zoom?: number;
  className?: string;
}) {
  const bbox = [lng - zoom, lat - zoom * 0.6, lng + zoom, lat + zoom * 0.6].join(",");
  return (
    <div className={cn("group relative overflow-hidden rounded-3xl border border-gold/40 bg-gold-light", className)}>
      <iframe
        title={label}
        loading="lazy"
        className="h-full min-h-64 w-full grayscale-[.25] transition duration-500 group-hover:grayscale-0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
      />
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-2">
        <span className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-green-dark shadow-lg">
          <MapPin className="size-3.5 text-maroon" />
          {label}
        </span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto flex items-center gap-1 rounded-full bg-green-dark px-3 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-green"
        >
          افتح في الخرائط <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

// ───────────────────────── Speech ─────────────────────────

/** Only one read-aloud plays at a time across the page */
let activeStop: (() => void) | null = null;

/** Reads Arabic text aloud in a natural Syrian voice — a lifeline for elderly pilgrims */
export function SpeakButton({ text, className, label = "استمع", voice = "f" }: { text: string; className?: string; label?: string; voice?: "f" | "m" }) {
  const [state, setState] = useState<"idle" | "loading" | "speaking">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speaking = state !== "idle";

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
    setState("idle");
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, []);

  /** Fallback when the voice service is unreachable: the browser's own voice, if it has Arabic */
  const browserSpeak = () => {
    const synth = window.speechSynthesis;
    const arabic = synth?.getVoices().find((v) => v.lang.startsWith("ar"));
    if (!synth || !arabic) return setState("idle");
    const u = new SpeechSynthesisUtterance(text);
    u.voice = arabic;
    u.lang = arabic.lang;
    u.rate = 0.9;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    synth.speak(u);
    setState("speaking");
  };

  const speak = () => {
    if (speaking) return stop();
    activeStop?.();
    activeStop = stop;
    setState("loading");
    const audio = new Audio(`/api/tts?voice=${voice}&text=${encodeURIComponent(text)}`);
    audioRef.current = audio;
    audio.onplaying = () => setState("speaking");
    audio.onended = () => setState("idle");
    audio.onerror = () => {
      if (audioRef.current === audio) browserSpeak();
    };
    audio.play().catch(() => {
      if (audioRef.current === audio) browserSpeak();
    });
  };

  return (
    <button
      type="button"
      onClick={speak}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-green-dark/15 bg-white px-3.5 py-2 text-sm font-semibold text-green-dark transition hover:border-green-dark/40",
        speaking && "border-green-light bg-green-light/10 text-green",
        className,
      )}
      aria-pressed={speaking}
    >
      <span className="relative flex">
        {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
        {state === "speaking" && <span className="absolute inset-0 animate-ping rounded-full bg-green-light/40" />}
      </span>
      {state === "loading" ? "جارٍ التحضير..." : speaking ? "إيقاف" : label}
    </button>
  );
}

// ───────────────────────── Stars ─────────────────────────

export function StarRating({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" | "lg" }) {
  const [hover, setHover] = useState(0);
  const s = size === "lg" ? "size-10" : size === "sm" ? "size-4" : "size-7";
  return (
    <div className="flex items-center gap-1" dir="ltr" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <motion.button
            key={n}
            type="button"
            disabled={!onChange}
            whileHover={onChange ? { scale: 1.2, rotate: -8 } : undefined}
            whileTap={onChange ? { scale: 0.9 } : undefined}
            onMouseEnter={() => onChange && setHover(n)}
            onClick={() => onChange?.(n)}
            aria-label={`${n} نجوم`}
            className="disabled:cursor-default"
          >
            <Star className={cn(s, "transition-colors", active ? "fill-gold-dark text-gold-dark" : "text-gold")} />
          </motion.button>
        );
      })}
    </div>
  );
}

// ───────────────────────── Modal ─────────────────────────

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-3 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={cn("relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl", className)}
          >
            <button onClick={onClose} className="absolute left-4 top-4 rounded-full p-1.5 text-hint hover:bg-sand hover:text-ink" aria-label="إغلاق">
              <X className="size-5" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────── Toasts ─────────────────────────

type Toast = { id: number; title: string; body?: string; tone?: "success" | "info" | "warning" | "gold"; icon?: ReactNode };
const ToastCtx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);

  const tones = {
    success: "border-green-light/40 before:bg-green-light",
    info: "border-green-dark/20 before:bg-green-dark",
    warning: "border-maroon/30 before:bg-maroon",
    gold: "border-gold-dark/40 before:bg-gold-dark",
  };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[90] flex flex-col items-center gap-2 sm:left-auto sm:right-4 sm:top-24 sm:w-96 sm:items-stretch">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              className={cn(
                "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border bg-white/95 p-4 pr-5 shadow-xl backdrop-blur before:absolute before:inset-y-0 before:right-0 before:w-1.5",
                tones[t.tone ?? "info"],
              )}
            >
              <span className="mt-0.5 text-xl leading-none">{t.icon ?? "🔔"}</span>
              <div className="min-w-0">
                <p className="font-bold text-ink">{t.title}</p>
                {t.body && <p className="mt-0.5 text-sm leading-6 text-ink-soft">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ───────────────────────── Badge ─────────────────────────

export function Badge({ children, tone = "green", className }: { children: ReactNode; tone?: "green" | "gold" | "maroon" | "ink"; className?: string }) {
  const tones = {
    green: "bg-green-light/12 text-green ring-green-light/25",
    gold: "bg-gold/35 text-maroon ring-gold-dark/25",
    maroon: "bg-maroon/10 text-maroon ring-maroon/20",
    ink: "bg-ink/5 text-ink-soft ring-ink/10",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", tones[tone], className)}>{children}</span>;
}
