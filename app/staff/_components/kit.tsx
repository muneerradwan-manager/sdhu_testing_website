"use client";

import { AnimatePresence, motion } from "motion/react";
import { Lock, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Counter } from "@/components/ui/motion";
import { actions, useStore, type AuditEvent } from "@/lib/store";
import { can, getStaff, PERMISSION_LABELS, type Permission, type StaffUser } from "@/lib/staff";
import { cn, formatNumber } from "@/lib/utils";

// ───────────────────────── Hooks & helpers ─────────────────────────

export function useStaffUser(): StaffUser | null {
  const id = useStore((s) => s.staffSessionId);
  return getStaff(id);
}

/** Ticking clock; only used below the hydration guard */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function canAny(user: StaffUser | null, perms: Permission[]) {
  return perms.length === 0 || perms.some((p) => can(user, p));
}

/** Every mutating staff action goes through here so the audit trail always names the person */
export function logAs(user: StaffUser, e: Omit<AuditEvent, "id" | "at" | "actor" | "role">) {
  actions.logEvent({ actor: user.name, role: user.title, ...e });
}

export function fmtDateTime(ts: number) {
  return new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(ts);
}

export function fmtDate(ts: number) {
  return new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(ts);
}

export function fmtTime(ts: number, seconds = false) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined, hour12: false }).format(ts);
}

export function ago(ts: number, now: number) {
  const m = Math.max(0, Math.floor((now - ts) / 60000));
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س ${m % 60 ? `${m % 60} د` : ""}`.trim();
  return `منذ ${Math.floor(h / 24)} يوم`;
}

export const tones = {
  green: { text: "text-green-dark", bg: "bg-green-dark", soft: "bg-green-light/12", ring: "ring-green-light/25", hex: "#00594F" },
  teal: { text: "text-green-light", bg: "bg-green-light", soft: "bg-green-light/12", ring: "ring-green-light/25", hex: "#289E92" },
  gold: { text: "text-gold-dark", bg: "bg-gold-dark", soft: "bg-gold/30", ring: "ring-gold-dark/25", hex: "#AD9E6E" },
  maroon: { text: "text-maroon", bg: "bg-maroon", soft: "bg-maroon/10", ring: "ring-maroon/20", hex: "#672146" },
} as const;
export type Tone = keyof typeof tones;

// ───────────────────────── Layout pieces ─────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  actions: side,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4 text-white"
    >
      <div className="flex min-w-0 items-start gap-4">
        {icon && (
          <span className="hidden size-14 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-white/10 text-gold shadow-inner sm:grid [&_svg]:size-7">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wide text-gold">
              <span className="size-1.5 rotate-45 bg-gold" /> {eyebrow}
            </p>
          )}
          <h1 className="font-display text-2xl font-bold text-balance md:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-7 text-white/70 md:text-base">{description}</p>}
        </div>
      </div>
      {side && <div className="flex flex-wrap items-center gap-2">{side}</div>}
    </motion.header>
  );
}

export function Panel({
  title,
  icon,
  action,
  children,
  className,
  dark = false,
  delay = 0,
  bodyClass,
}: {
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  delay?: number;
  bodyClass?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5 md:p-6",
        dark
          ? "border-white/10 bg-white/[.06] text-white backdrop-blur-sm"
          : "border-gold/30 bg-white text-ink shadow-[0_24px_60px_-36px_rgba(2,21,38,.55)]",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && (
            <h2 className={cn("flex items-center gap-2 font-display text-lg font-bold", dark ? "text-white" : "text-green-dark")}>
              {icon && <span className={cn("[&_svg]:size-5", dark ? "text-gold" : "text-gold-dark")}>{icon}</span>}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </motion.section>
  );
}

export function Kpi({
  label,
  value,
  suffix,
  icon,
  tone = "green",
  hint,
  dark = false,
  delay = 0,
  pulse = false,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon?: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  dark?: boolean;
  delay?: number;
  pulse?: boolean;
}) {
  const t = tones[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border p-4 md:p-5",
        dark ? "border-white/10 bg-white/[.07] text-white" : "border-gold/30 bg-white shadow-[0_18px_40px_-30px_rgba(2,21,38,.5)]",
      )}
    >
      <span className={cn("absolute -left-6 -top-6 size-20 rounded-full opacity-40 blur-2xl transition group-hover:opacity-70", t.bg)} />
      <div className="relative flex items-start justify-between gap-2">
        <p className={cn("text-xs font-bold md:text-sm", dark ? "text-white/65" : "text-ink-soft")}>{label}</p>
        {icon && (
          <span className={cn("relative grid size-9 place-items-center rounded-xl [&_svg]:size-4.5", dark ? "bg-white/10 text-gold" : cn(t.soft, t.text))}>
            {pulse && <span className={cn("absolute inset-0 animate-ping rounded-xl opacity-40", t.bg)} />}
            {icon}
          </span>
        )}
      </div>
      <p className={cn("relative mt-2 font-display text-2xl font-bold md:text-3xl", dark ? "text-white" : t.text)}>
        <Counter to={value} duration={1.6} suffix={suffix} />
      </p>
      {hint && <div className={cn("relative mt-1 text-xs", dark ? "text-white/55" : "text-hint")}>{hint}</div>}
    </motion.div>
  );
}

/** Blocks a page for staff who lack every listed permission */
export function Gate({ perms, children }: { perms: Permission[]; children: ReactNode }) {
  const user = useStaffUser();
  if (canAny(user, perms)) return children;
  return (
    <div className="grid min-h-[calc(50vh/var(--zoom))] place-items-center">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md rounded-3xl border border-gold/30 bg-white p-8 text-center shadow-2xl">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/10 text-maroon">
          <Lock className="size-8" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-green-dark">خارج صلاحياتك</h1>
        <p className="mt-2 leading-7 text-ink-soft">
          هذه الصفحة تحتاج صلاحية: {perms.map((p) => PERMISSION_LABELS[p]).join(" أو ")}. تُمنح الصلاحيات من الموارد البشرية واحدة واحدة، ويُسجَّل منحها في سجل الأحداث.
        </p>
      </motion.div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  id,
  dark = false,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
  dark?: boolean;
}) {
  return (
    <div role="tablist" className={cn("scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1", dark ? "bg-white/10" : "bg-sand ring-1 ring-gold/30")}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition",
              active ? (dark ? "text-ink" : "text-white") : dark ? "text-white/70 hover:text-white" : "text-ink-soft hover:text-green-dark",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                className={cn("absolute inset-0 rounded-xl", dark ? "bg-gold" : "bg-green-dark")}
                transition={{ type: "spring", damping: 30, stiffness: 380 }}
              />
            )}
            <span className="relative">{t.label}</span>
            {t.count !== undefined && (
              <span className={cn("relative rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-white/25" : dark ? "bg-white/10" : "bg-white")}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Side sheet that slides in from the left edge (the sidebar lives on the right in RTL) */
export function Drawer({ open, onClose, title, children, width = "max-w-2xl" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
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
        <motion.div className="fixed inset-0 z-[70] bg-ink/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            role="dialog"
            aria-modal
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={cn("absolute inset-y-0 left-0 flex w-full flex-col bg-sand shadow-2xl", width)}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gold/30 bg-green-dark px-5 py-4 text-white">
              <div className="min-w-0 font-display text-lg font-bold">{title}</div>
              <button onClick={onClose} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────────────────────── Charts (pure SVG / CSS) ─────────────────────────

export function Donut({
  segments,
  size = 160,
  thickness = 18,
  children,
  track = "#F7F4EF",
}: {
  segments: { value: number; color: string; label?: string }[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
  track?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const arcs = segments.reduce<{ color: string; len: number; offset: number; label?: string }[]>((acc, s) => {
    const prev = acc.at(-1);
    const offset = prev ? prev.offset + prev.len : 0;
    acc.push({ color: s.color, len: (s.value / total) * c, offset, label: s.label });
    return acc;
  }, []);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        {arcs.map((a, i) => (
          <motion.circle
            key={`${a.label ?? i}`}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${c}`, strokeDashoffset: -a.offset }}
            animate={{ strokeDasharray: `${Math.max(0, a.len - 1.5)} ${c}`, strokeDashoffset: -a.offset }}
            transition={{ duration: 1, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Legend({ items, dark = false }: { items: { label: string; color: string; value?: ReactNode }[]; dark?: boolean }) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center justify-between gap-3">
          <span className={cn("flex items-center gap-2", dark ? "text-white/80" : "text-ink-soft")}>
            <span className="size-2.5 rounded-full" style={{ background: i.color }} />
            {i.label}
          </span>
          {i.value !== undefined && <span className={cn("font-bold tabular-nums", dark ? "text-white" : "text-ink")}>{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export function BarList({
  items,
  max,
  format = formatNumber,
  color = "bg-green-dark",
  dark = false,
}: {
  items: { label: ReactNode; value: number; color?: string; key?: string }[];
  max?: number;
  format?: (v: number) => string;
  color?: string;
  dark?: boolean;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i, idx) => (
        <li key={i.key ?? idx}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className={cn("truncate", dark ? "text-white/80" : "text-ink-soft")}>{i.label}</span>
            <span className={cn("font-bold tabular-nums", dark ? "text-white" : "text-ink")}>{format(i.value)}</span>
          </div>
          <div className={cn("h-2.5 overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-sand")}>
            <motion.div
              className={cn("h-full rounded-full", i.color ?? color)}
              initial={{ width: 0 }}
              animate={{ width: `${(i.value / top) * 100}%` }}
              transition={{ duration: 0.9, delay: 0.05 * idx, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical columns; the last column is highlighted */
export function Columns({ values, labels, height = 120, highlight, color = "#00594F", dark = false }: { values: number[]; labels?: string[]; height?: number; highlight?: number; color?: string; dark?: boolean }) {
  const top = Math.max(1, ...values);
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }} dir="ltr">
        {values.map((v, i) => (
          <motion.div
            key={i}
            title={formatNumber(v)}
            className="flex-1 rounded-t-md"
            style={{ background: i === highlight ? "#AD9E6E" : color, opacity: i === highlight ? 1 : 0.35 + (v / top) * 0.65 }}
            initial={{ height: 0 }}
            animate={{ height: `${(v / top) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.025, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      {labels && (
        <div className={cn("mt-2 flex justify-between text-[11px]", dark ? "text-white/50" : "text-hint")} dir="ltr">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = "#AD9E6E", width = 120, height = 36 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const top = Math.max(...values);
  const low = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - low) / (top - low || 1)) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ direction: "ltr" }}>
      <motion.polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
    </svg>
  );
}

export function Meter({ value, max = 100, tone = "green", className }: { value: number; max?: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-sand", className)}>
      <motion.div className={cn("h-full rounded-full", tones[tone].bg)} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (value / max) * 100)}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
    </div>
  );
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-gold/50 bg-sand/60 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-gold-dark shadow-sm [&_svg]:size-6">{icon}</span>
      <p className="mt-3 font-bold text-green-dark">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
    </div>
  );
}

export const textareaClass =
  "w-full rounded-2xl border-2 border-gold/50 bg-white p-3 text-base text-ink outline-none transition placeholder:text-hint focus:border-green-light focus:ring-4 focus:ring-green-light/15";
export const smallInputClass =
  "h-11 w-full rounded-xl border-2 border-gold/50 bg-white px-3 text-base text-ink outline-none transition placeholder:text-hint focus:border-green-light focus:ring-4 focus:ring-green-light/15";

/** Current timestamp for event handlers */
export function stamp() {
  return Date.now();
}
