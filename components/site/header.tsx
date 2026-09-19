"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import {
  ChevronDown,
  LogIn,
  Menu,
  Minus,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { actions, useHydrated, useStore } from "@/lib/store";
import { CITIES, nextPrayer } from "@/lib/prayer";
import { getPerson } from "@/lib/registry";
import { MORE, NAV } from "@/lib/nav";
import { cn, hijriDate } from "@/lib/utils";

function SoonBadge() {
  return (
    <span className="rounded-full bg-gold/35 px-2 py-0.5 text-[11px] font-bold text-maroon">
      قريباً
    </span>
  );
}

function TopBar() {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const damascus = CITIES[0];
  const next = hydrated ? nextPrayer(damascus, now) : null;
  const mins = next
    ? Math.max(0, Math.round((next.time.getTime() - now.getTime()) / 60000))
    : 0;
  const scale = useStore((s) => s.displayScale);

  return (
    <div className="bg-maroon-dark text-[12px] text-white/85">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
        <p className="flex items-center gap-2 truncate">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-gold" />
            <span className="relative size-2 rounded-full bg-gold" />
          </span>
          <span className="font-bold text-gold">نسخة تجريبية</span>
          <span className="hidden sm:inline">
            — جميع الأسماء والأرقام والبيانات وهمية لأغراض العرض
          </span>
        </p>
        <div className="flex items-center gap-4">
          {hydrated && (
            <>
              <span className="hidden md:inline">
                {hijriDate(now, { weekday: "long" })}
              </span>
              {next && (
                <Link
                  href="/prayer-times"
                  className="hidden items-center gap-1.5 hover:text-gold lg:flex"
                >
                  <span className="text-white/60">دمشق:</span> {next.name} بعد
                  <span className="font-bold text-gold tabular-nums">
                    {mins >= 60
                      ? `${Math.floor(mins / 60)} س ${mins % 60} د`
                      : `${mins} د`}
                  </span>
                </Link>
              )}
            </>
          )}
          <div
            className="flex items-center gap-1 rounded-full bg-white/10 p-0.5"
            aria-label="حجم العرض"
            title="حجم العرض — صغّر على الشاشات الكبيرة، وكبّر لقراءة أوضح"
          >
            <button
              onClick={() => actions.setDisplayScale(scale - 0.1)}
              className="grid size-6 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
              aria-label="تصغير حجم العرض"
              disabled={scale <= 0.7}
            >
              <Minus className="size-3" />
            </button>
            <button
              onClick={() => actions.setDisplayScale(1)}
              className="min-w-10 rounded-full px-1 font-bold tabular-nums hover:bg-white/15"
              aria-label="إعادة حجم العرض إلى الوضع الطبيعي"
            >
              {scale === 1 ? "أ" : `${Math.round(scale * 100)}%`}
            </button>
            <button
              onClick={() => actions.setDisplayScale(scale + 0.1)}
              className="grid size-6 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
              aria-label="تكبير حجم العرض"
              disabled={scale >= 1.4}
            >
              <Plus className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.sessionId);
  const person = hydrated && sessionId ? getPerson(sessionId) : null;

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 40));
  // Close menus on navigation (adjusting state during render, per React docs)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setMore(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const solid = scrolled || open;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        animate={{ height: scrolled ? 0 : "auto", opacity: scrolled ? 0 : 1 }}
        className="overflow-hidden"
      >
        <TopBar />
      </motion.div>
      <div
        className={cn(
          "transition-all duration-500 ease-out-expo",
          solid
            ? "border-b border-gold/30 bg-white/90 shadow-[0_10px_40px_-20px_rgba(2,21,38,.35)] backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/" aria-label="الصفحة الرئيسية">
            <Logo light={!solid} />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors",
                  solid
                    ? "text-ink-soft hover:text-green-dark"
                    : "text-white/85 hover:text-white",
                  isActive(item.href) &&
                    (solid ? "text-green-dark" : "text-white"),
                )}
              >
                {isActive(item.href) && (
                  <motion.span
                    layoutId="nav-pill"
                    className={cn(
                      "absolute inset-0 -z-10 rounded-full",
                      solid ? "bg-green-dark/8" : "bg-white/15",
                    )}
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                  />
                )}
                {item.label}
              </Link>
            ))}
            <div
              className="relative"
              onMouseEnter={() => setMore(true)}
              onMouseLeave={() => setMore(false)}
            >
              <button
                onClick={() => setMore((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold",
                  solid ? "text-ink-soft" : "text-white/85",
                )}
              >
                المزيد{" "}
                <ChevronDown
                  className={cn("size-4 transition", more && "rotate-180")}
                />
              </button>
              <AnimatePresence>
                {more && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute left-0 top-full w-72 pt-2"
                  >
                    <div className="overflow-hidden rounded-2xl border border-gold/30 bg-white p-2 shadow-2xl">
                      {MORE.map((m) => (
                        <Link
                          key={m.href}
                          href={m.href}
                          className="block rounded-xl p-3 hover:bg-sand"
                        >
                          <span className="flex items-center gap-2 font-bold text-green-dark">
                            {m.label}
                            {m.soon && <SoonBadge />}
                          </span>
                          <span className="text-xs text-hint">{m.note}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {person ? (
              <Link
                href="/portal"
                className={cn(
                  "flex items-center gap-2 rounded-2xl py-1.5 pl-4 pr-1.5 text-sm font-bold transition",
                  solid
                    ? "bg-green-dark text-white hover:bg-green"
                    : "bg-white/15 text-white backdrop-blur hover:bg-white/25",
                )}
              >
                <span className="grid size-8 place-items-center rounded-xl bg-gold font-display text-ink">
                  {person.firstName[0]}
                </span>
                <span className="hidden sm:inline">{person.firstName}</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={cn(
                    "hidden items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold sm:flex",
                    solid
                      ? "text-green-dark hover:bg-green-dark/5"
                      : "text-white hover:bg-white/10",
                  )}
                >
                  <LogIn className="size-4" /> دخول
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 rounded-2xl bg-gold px-4 py-2.5 text-sm font-bold text-ink shadow-lg shadow-gold-dark/20 transition hover:bg-gold-dark hover:text-white"
                >
                  <UserRound className="size-4" /> إنشاء حساب
                </Link>
              </>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "grid size-11 place-items-center rounded-2xl xl:hidden",
                solid
                  ? "text-green-dark hover:bg-green-dark/5"
                  : "text-white hover:bg-white/10",
              )}
              aria-label="القائمة"
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden xl:hidden"
            >
              <div className="mx-auto grid max-w-7xl gap-1 px-4 pb-6">
                {[...NAV.map((n) => ({ ...n, soon: false })), ...MORE].map(
                  (item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-4 py-3.5 text-lg font-semibold",
                          isActive(item.href)
                            ? "bg-green-dark text-white"
                            : "text-ink hover:bg-sand",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.soon && <SoonBadge />}
                        </span>
                      </Link>
                    </motion.div>
                  ),
                )}
                {!person && (
                  <Link
                    href="/login"
                    className="mt-2 rounded-2xl border-2 border-green-dark/15 px-4 py-3.5 text-center text-lg font-bold text-green-dark"
                  >
                    تسجيل الدخول
                  </Link>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
