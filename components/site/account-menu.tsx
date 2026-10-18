"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, ChevronDown, LogIn, UserRound, UserRoundPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { useAnyOperation, useOperation } from "@/lib/operations";
import { useHydrated } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * The public pages' ways into the two platforms a visitor has an account on (the staff have their own address):
 * signing in, in the top bar and on the home page's opening when no registration is open; and creating the
 * account. Each asks first as whom, since each platform has its own address.
 */
export const ACCOUNT_MENUS = {
  register: {
    label: { ar: "إنشاء حساب", en: "Create account" },
    icon: UserRoundPlus,
    items: [
      { href: "/register", icon: UserRound, label: { ar: "إنشاء حساب كحاج", en: "Create a pilgrim account" } },
      { href: "/administrator/register", icon: Briefcase, label: { ar: "إنشاء حساب كإداري", en: "Create an administrator account" } },
    ],
  },
  login: {
    label: { ar: "تسجيل الدخول", en: "Sign in" },
    icon: LogIn,
    items: [
      { href: "/login", icon: UserRound, label: { ar: "الدخول كحاج", en: "Sign in as a pilgrim" } },
      { href: "/administrator/login", icon: Briefcase, label: { ar: "الدخول كإداري", en: "Sign in as an administrator" } },
    ],
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
  const menu = ACCOUNT_MENUS[kind];
  const hero = variant === "hero";
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
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            className={cn("absolute top-full z-20 w-64 pt-2", hero ? "start-0" : "end-0")}
          >
            <div className="overflow-hidden rounded-2xl border border-gold/30 bg-white p-2 shadow-2xl">
              {menu.items.map((m) => (
                <Link key={m.href} href={m.href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 font-bold text-green-dark hover:bg-sand">
                  <span className="grid size-9 place-items-center rounded-xl bg-green-dark/8 text-gold-dark">
                    <m.icon className="size-[18px]" />
                  </span>
                  {m.label[lang]}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
