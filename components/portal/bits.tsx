"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, FlaskConical, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEMO_SCENARIOS } from "@/lib/registry";
import { cn } from "@/lib/utils";

export const DEMO_OTP = "1448";

/** Big, forgiving one-time-code boxes: auto-advance, paste support, numeric keyboard */
export function OtpInput({ value, onChange, length = 4, invalid }: { value: string; onChange: (v: string) => void; length?: number; invalid?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const set = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, length));
  };

  return (
    <motion.div
      dir="ltr"
      className="flex justify-center gap-3"
      animate={invalid ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          aria-label={`الرقم ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (text) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, length - 1)]?.focus();
            }
          }}
          className={cn(
            "size-16 rounded-2xl border-2 bg-white text-center font-display text-3xl font-bold text-green-dark outline-none transition md:size-18",
            d ? "border-green-dark shadow-[0_8px_20px_-10px_rgba(0,89,79,.6)]" : "border-gold/60",
            invalid && "border-maroon text-maroon",
            "focus:border-green-light focus:ring-4 focus:ring-green-light/20",
          )}
        />
      ))}
    </motion.div>
  );
}

/** Floating helper so testers can try every scenario from the operating document */
export function DemoPanel({ onPick, mode = "id" }: { onPick: (s: (typeof DEMO_SCENARIOS)[number]) => void; mode?: "id" | "book" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-dashed border-gold-dark/60 bg-gold/15 p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-right">
        <span className="flex items-center gap-2 font-bold text-maroon">
          <FlaskConical className="size-4" /> بيانات تجريبية جاهزة
        </span>
        <span className="text-xs text-ink-soft">{open ? "إخفاء" : "عرض السيناريوهات"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {DEMO_SCENARIOS.filter((s) => mode === "id" || s.book).map((s) => (
              <li key={s.id} className="pt-2">
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  className="w-full rounded-2xl bg-white p-3 text-right transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold text-green-dark">{s.title}</span>
                    <span className="font-mono text-xs text-hint" dir="ltr">{mode === "book" ? s.book : s.id}</span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink-soft">{s.note}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sequential "talking to the civil registry" checklist */
export function ProgressChecklist({ steps, onDone, interval = 900 }: { steps: string[]; onDone?: () => void; interval?: number }) {
  const [done, setDone] = useState(0);
  const finished = useRef(false);
  useEffect(() => {
    if (done >= steps.length) {
      if (!finished.current) {
        finished.current = true;
        const t = setTimeout(() => onDone?.(), 350);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => setDone((d) => d + 1), interval);
    return () => clearTimeout(t);
  }, [done, steps.length, interval, onDone]);

  return (
    <ul className="space-y-3">
      {steps.map((s, i) => {
        const state = i < done ? "done" : i === done ? "active" : "idle";
        return (
          <motion.li
            key={s}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: state === "idle" ? 0.4 : 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full transition",
                state === "done" ? "bg-green-light text-white" : state === "active" ? "bg-gold/40 text-green-dark" : "bg-sand text-hint",
              )}
            >
              {state === "done" ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="size-5" />
                </motion.span>
              ) : state === "active" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <span className="text-sm font-bold">{i + 1}</span>
              )}
            </span>
            <span className={cn("font-semibold", state === "done" ? "text-green-dark" : "text-ink-soft")}>{s}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | false;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 font-bold text-ink">
        {label}
        {optional && <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-medium text-hint">اختياري</span>}
      </span>
      {children}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.span key="e" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 block text-sm font-semibold text-maroon">
            {error}
          </motion.span>
        ) : hint ? (
          <motion.span key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1.5 block text-sm text-hint">
            {hint}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </label>
  );
}

export const inputClass =
  "h-14 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 text-lg text-ink outline-none transition placeholder:text-hint focus:border-green-light focus:ring-4 focus:ring-green-light/15";
