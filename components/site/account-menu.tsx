"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, ChevronDown, LogIn, UserRound, UserRoundPlus, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { dateOf, dayLabel, useAnyOperation, useOperation, type OperationState } from "@/lib/operations";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The public pages' ways into the platform (the staff have their own address). The account is one for everyone and
 * created at one page, at any time; it has two doors to sign in by — the account's own, and the administrators',
 * which opens the same account on its administrative file.
 */
export const ACCOUNT_MENUS = {
  register: {
    label: { ar: "إنشاء حساب", en: "Create account" },
    icon: UserRoundPlus,
    items: [{ href: "/register", icon: UserRound, label: { ar: "إنشاء حساب في المنصة", en: "Create an account" } }],
  },
  login: {
    label: { ar: "تسجيل الدخول", en: "Sign in" },
    icon: LogIn,
    items: [{ href: "/login", icon: UserRound, label: { ar: "الدخول إلى حسابي", en: "Sign in to my account" } }],
  },
} as const;

/**
 * Which registrations are open now, each on its own dates: the Hajj (direct acceptance, then the lottery) and the
 * administrative roles. The demo's date lives in this browser, so before it is read nothing is open.
 */
export function useOpenRegistrations() {
  const hydrated = useHydrated();
  const hajj = useAnyOperation(["hajj-direct", "hajj-lottery"]).open;
  const admin = useOperation("admin-registration").open;
  return { hajj: hydrated && hajj, admin: hydrated && admin };
}

/**
 * A button that opens its two choices, as a pilgrim or as an administrator. `bar`: in the top bar of the public
 * pages; `hero`: the large button on the home page's opening.
 */
export function AccountMenu({ kind, variant }: { kind: keyof typeof ACCOUNT_MENUS; variant: "bar" | "hero" }) {
  const t = useT();
  const lang = useLang();
  const { open, setOpen, ref } = useDropdown();
  const menu = ACCOUNT_MENUS[kind];
  const hero = variant === "hero";
  const buttonClass = cn(
    "flex items-center gap-1.5 whitespace-nowrap font-bold transition",
    hero
      ? "h-14 rounded-2xl bg-gold px-7 text-lg text-ink shadow-2xl hover:bg-gold-dark hover:text-white"
      : "rounded-2xl bg-gold px-3 py-2 text-[13px] text-ink shadow-lg shadow-gold-dark/20 hover:bg-gold-dark hover:text-white sm:px-4 sm:py-2.5 sm:text-sm",
  );
  // One way only (one account, one sign-in, one sign-up): the button goes there, with no menu to open
  if (menu.items.length === 1)
    return (
      <Link href={menu.items[0].href} className={buttonClass}>
        <menu.icon className={hero ? "size-5" : "size-4"} /> {t(menu.label.ar, menu.label.en)}
      </Link>
    );
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-1.5 whitespace-nowrap font-bold transition",
          hero
            ? "h-14 rounded-2xl bg-gold px-7 text-lg text-ink shadow-2xl hover:bg-gold-dark hover:text-white"
            : "rounded-2xl bg-gold px-3 py-2 text-[13px] text-ink shadow-lg shadow-gold-dark/20 hover:bg-gold-dark hover:text-white sm:px-4 sm:py-2.5 sm:text-sm",
        )}
      >
        <menu.icon className={hero ? "size-5" : "size-4"} /> {t(menu.label.ar, menu.label.en)}
        <ChevronDown className={cn(hero ? "size-4" : "size-3.5", "transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <MenuPanel align={hero ? "start-0" : "end-0"}>
            {menu.items.map((m) => (
              <MenuLink key={m.href} href={m.href} icon={m.icon} label={m.label[lang]} onClick={() => setOpen(false)} />
            ))}
          </MenuPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The top bar's chip for someone browsing without an account, where a signed-in user sees his name: on the home page
 * while no registration is open, so its opening holds «تسجيل الدخول». It does not repeat the sign-in: it says where
 * creating each account stands — over for this season, or the day it opens. `solid`: the bar has its white
 * background (scrolled, or the phone menu open), else it lies over the opening.
 */
export function VisitorMenu({ solid }: { solid: boolean }) {
  const t = useT();
  const lang = useLang();
  const { open, setOpen, ref } = useDropdown();
  const hajj = phaseOf(useAnyOperation(["hajj-direct", "hajj-lottery"]).states);
  const admin = phaseOf([useOperation("admin-registration")]);
  const day = (d: string) => (lang === "en" ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(dateOf(d)) : dayLabel(d));
  const said = (p: Phase) =>
    p.kind === "upcoming"
      ? t(`يُفتح ${day(p.day)}`, `Opens ${day(p.day)}`)
      : p.kind === "closed"
        ? t(`انتهى لهذا الموسم في ${day(p.day)}`, `Closed for this season on ${day(p.day)}`)
        : t("متوقف حالياً", "Paused for now");
  const rows = [
    { icon: UserRound, label: t("التسجيل على الحج", "Hajj registration"), phase: hajj },
    { icon: Briefcase, label: t("التسجيل على الصفات الإدارية", "Administrative roles"), phase: admin },
  ];
  const allOver = hajj.kind === "closed" && admin.kind === "closed";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t("تتصفح زائراً", "Browsing as a visitor")}
        className={cn(
          "flex items-center gap-2 rounded-2xl py-1.5 pe-1.5 ps-1.5 text-sm font-bold transition sm:pe-3",
          solid ? "bg-green-dark/8 text-green-dark hover:bg-green-dark/12" : "bg-white/15 text-white backdrop-blur hover:bg-white/25",
        )}
      >
        <span className={cn("grid size-8 place-items-center rounded-xl", solid ? "bg-white text-gold-dark" : "bg-white/20 text-gold-light")}>
          <UserRound className="size-[18px]" />
        </span>
        <span className="hidden flex-col text-start leading-tight sm:flex">
          {t("زائر", "Visitor")}
          <span className="text-[10px] font-medium opacity-70">{t("تصفّح دون حساب", "Browsing, no account")}</span>
        </span>
        <ChevronDown className={cn("hidden size-3.5 transition sm:block", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <MenuPanel align="end-0" role="dialog" wide>
            <div className="px-3 pb-3 pt-2">
              <p className="font-bold text-green-dark">{t("أنت تتصفح المنصة زائراً", "You are browsing as a visitor")}</p>
              <p className="mt-1 text-xs leading-relaxed text-hint">
                {t("صفحات المنصة كلها مفتوحة لك دون حساب. وإنشاء الحساب متاح دائماً: به تتعلّم في الأكاديمية، وتسجّل على الحج أو على صفة إدارية في مواعيدهما:", "Every page is open to you without an account. Creating one is always open: with it you learn in the Academy, and register for Hajj or an administrative role on their dates:")}
              </p>
              <Link href="/register" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1.5 text-xs font-bold text-ink hover:bg-gold-dark hover:text-white">
                <UserRoundPlus className="size-3.5" /> {t("إنشاء حساب في المنصة", "Create an account")}
              </Link>
            </div>
            <ul className="grid gap-1">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center gap-3 rounded-xl bg-sand/60 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-gold-dark">
                    <r.icon className="size-[18px]" />
                  </span>
                  <span className="leading-snug">
                    <span className="block text-sm font-bold text-green-dark">{r.label}</span>
                    <span className={cn("text-xs font-semibold", r.phase.kind === "upcoming" ? "text-green" : "text-maroon")}>{said(r.phase)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="px-3 pb-1 pt-3 text-xs leading-relaxed text-ink-soft">
              {allOver
                ? t("انتهى التسجيل لهذا الموسم. ننتظرك في الموسم القادم بإذن الله، وتعلن الإدارة مواعيده في الأخبار.", "Registration is over for this season. We look forward to seeing you next season; its dates are announced in the news.")
                : t("تعلن الإدارة كل موعد في الأخبار قبل حلوله.", "The administration announces every date in the news beforehand.")}
            </p>
            <Link href="/news" onClick={() => setOpen(false)} className="mx-3 mb-1 mt-1 inline-flex text-xs font-bold text-gold-dark hover:underline">
              {t("تابع الأخبار", "Follow the news")}
            </Link>
          </MenuPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

type Phase = { kind: "upcoming" | "closed"; day: string } | { kind: "off" };

/**
 * Where a registration stands while it is not open, from its operations (the Hajj's are two, back to back): it opens
 * on the earliest day still to come, else it ended on the last one's end, else the administration stopped it.
 */
function phaseOf(states: OperationState[]): Phase {
  const next = states.filter((s) => s.status === "upcoming" && s.start).sort((a, b) => a.start!.localeCompare(b.start!))[0];
  if (next) return { kind: "upcoming", day: next.start! };
  const last = states.filter((s) => s.status === "closed" && s.end).sort((a, b) => b.end!.localeCompare(a.end!))[0];
  if (last) return { kind: "closed", day: last.end! };
  return { kind: "off" };
}

/** A menu's open state, closed by a press outside it or by Escape */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function MenuPanel({ align, role = "menu", wide, children }: { align: "start-0" | "end-0"; role?: "menu" | "dialog"; wide?: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      role={role}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      className={cn("absolute top-full z-20 pt-2", wide ? "w-80 max-w-[calc(100vw-2rem)]" : "w-64", align)}
    >
      <div className="overflow-hidden rounded-2xl border border-gold/30 bg-white p-2 shadow-2xl">{children}</div>
    </motion.div>
  );
}

function MenuLink({ href, icon: Icon, label, onClick }: { href: string; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="flex items-center gap-3 rounded-xl p-3 font-bold text-green-dark hover:bg-sand">
      <span className="grid size-9 place-items-center rounded-xl bg-green-dark/8 text-gold-dark">
        <Icon className="size-[18px]" />
      </span>
      {label}
    </Link>
  );
}
