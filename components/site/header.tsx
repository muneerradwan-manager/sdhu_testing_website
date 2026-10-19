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
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BRAND, Logo } from "@/components/brand/logo";
import { actions, useHydrated, useStore } from "@/lib/store";
import { CITIES, nextPrayer } from "@/lib/prayer";
import { getPerson } from "@/lib/registry";
import { useScrollLock } from "@/lib/scroll-lock";
import { setTheme, useTheme } from "@/lib/theme";
import { isArabicOnly, setLang, useChosenLang, useLang, useT } from "@/lib/i18n";
import { getStaff } from "@/lib/staff";
import { useNav } from "@/lib/cms/site";
import { cn } from "@/lib/utils";
import { PRAYER_EN, hijriDateIn } from "./en-format";
import { ACCOUNT_MENUS, AccountMenu, VisitorMenu, useOpenRegistrations } from "./account-menu";

type Area = "pilgrim" | "admin" | "staff";
type Identity = { initial: string; name: string; role: string; href: string; area: Area };

/** Which part of the platform a path belongs to — the header shows that role's account there */
function areaOf(pathname: string): Area | null {
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/administrator")) return "admin";
  if (pathname.startsWith("/portal") || pathname.startsWith("/login") || pathname.startsWith("/register")) return "pilgrim";
  return null; // shared public pages
}

/** Sign-in links for each area when nobody from that role is signed in */
/** `enShort`: the English on a phone, where the longer words push the menu button off the bar */
type Label = { ar: string; en: string; enShort?: string };
const SIGN_IN: Record<Area, { login: { href: string; label: Label }; join?: { href: string; label: Label } }> = {
  pilgrim: { login: { href: "/login", label: { ar: "دخول", en: "Sign in" } }, join: { href: "/register", label: { ar: "إنشاء حساب", en: "Create account", enShort: "Sign up" } } },
  admin: {
    login: { href: "/administrator/login", label: { ar: "دخول الإداري", en: "Administrator sign-in" } },
    join: { href: "/administrator/register", label: { ar: "تسجيل إداري", en: "Register as administrator" } },
  },
  staff: { login: { href: "/staff/login", label: { ar: "دخول الموظفين", en: "Staff sign-in" } } },
};

function SoonBadge() {
  const t = useT();
  return (
    <span className="whitespace-nowrap rounded-full bg-gold/35 px-2 py-0.5 text-[11px] font-bold text-maroon">
      {t("قريباً", "Soon")}
    </span>
  );
}

function TopBar() {
  const t = useT();
  const lang = useLang();
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
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
          <span className="font-bold text-gold">{t("نسخة تجريبية", "Demo version")}</span>
          <span className="hidden sm:inline">
            {t("— جميع الأسماء والأرقام والبيانات وهمية لأغراض العرض", "— all names, numbers and data are fictitious, for demonstration only")}
          </span>
        </p>
        <div className="flex items-center gap-4">
          {hydrated && (
            <>
              <span className="hidden md:inline">
                {hijriDateIn(lang, now, true)}
              </span>
              {next && (
                <Link
                  href="/prayer-times"
                  className="hidden items-center gap-1.5 hover:text-gold lg:flex"
                >
                  <span className="text-white/60">{t("دمشق:", "Damascus:")}</span> {t(`${next.name} بعد`, `${PRAYER_EN[next.key]} in`)}
                  <span className="font-bold text-gold tabular-nums">
                    {mins >= 60
                      ? t(`${Math.floor(mins / 60)} س ${mins % 60} د`, `${Math.floor(mins / 60)} h ${mins % 60} min`)
                      : t(`${mins} د`, `${mins} min`)}
                  </span>
                </Link>
              )}
            </>
          )}
          <LangToggle />
          <ThemeToggle />
          <div
            className="flex items-center gap-1 rounded-full bg-white/10 p-0.5"
            aria-label={t("حجم العرض", "Display size")}
            title={t("حجم العرض — صغّر على الشاشات الكبيرة، وكبّر لقراءة أوضح", "Display size — make it smaller on large screens, larger for easier reading")}
          >
            <button
              onClick={() => actions.setDisplayScale(scale - 0.1)}
              className="grid size-6 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
              aria-label={t("تصغير حجم العرض", "Decrease display size")}
              disabled={scale <= 0.7}
            >
              <Minus className="size-3" />
            </button>
            <button
              onClick={() => actions.setDisplayScale(1)}
              className="min-w-10 rounded-full px-1 font-bold tabular-nums hover:bg-white/15"
              aria-label={t("إعادة حجم العرض إلى الوضع الطبيعي", "Reset display size")}
            >
              {scale === 1 ? t("أ", "A") : `${Math.round(scale * 100)}%`}
            </button>
            <button
              onClick={() => actions.setDisplayScale(scale + 0.1)}
              className="grid size-6 place-items-center rounded-full hover:bg-white/15 disabled:opacity-40"
              aria-label={t("تكبير حجم العرض", "Increase display size")}
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

/**
 * العربية or English, in the top bar beside the theme: it names the other language, in that language. The
 * portals are in Arabic only for now, so it does not show there.
 */
function LangToggle() {
  const path = usePathname();
  const lang = useChosenLang();
  if (isArabicOnly(path)) return null;
  const to = lang === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      onClick={() => setLang(to)}
      lang={to}
      className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold hover:bg-white/20"
      aria-label={to === "en" ? "English" : "العربية"}
      title={to === "en" ? "Switch to English" : "التحويل إلى العربية"}
    >
      {to === "en" ? "English" : "العربية"}
    </button>
  );
}

/** Light or dark, in the top bar beside the display size */
function ThemeToggle() {
  const t = useT();
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-7 place-items-center rounded-full bg-white/10 hover:bg-white/20"
      aria-label={dark ? t("الوضع الفاتح", "Light mode") : t("الوضع الداكن", "Dark mode")}
      aria-pressed={dark}
      title={dark ? t("الوضع الفاتح", "Light mode") : t("الوضع الداكن", "Dark mode")}
    >
      {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </button>
  );
}

export function Header() {
  const t = useT();
  const lang = useLang();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.sessionId);
  const staffId = useStore((s) => s.staffSessionId);
  const adminId = useStore((s) => s.adminSessionId);
  // The home page's opening holds «تسجيل الدخول» while both registrations are closed: the bar does not repeat it
  const regs = useOpenRegistrations();
  const heroLogin = pathname === "/" && !regs.hajj && !regs.admin;

  // Each role has its own identity: the pilgrim never shows up inside the staff or administrator areas, and
  // vice versa. Shared public pages show whoever is signed in (pilgrim first), else the pilgrim sign-in.
  const identities: Partial<Record<Area, Identity>> = {};
  if (hydrated) {
    const pilgrim = sessionId ? getPerson(sessionId) : null;
    if (pilgrim) identities.pilgrim = { initial: pilgrim.firstName[0], name: pilgrim.firstName, role: t("حاج", "Pilgrim"), href: "/portal", area: "pilgrim" };
    const admin = adminId ? getPerson(adminId) : null;
    if (admin) identities.admin = { initial: admin.firstName[0], name: admin.firstName, role: t("إداري", "Administrator"), href: "/administrator/dashboard", area: "admin" };
    const staff = getStaff(staffId);
    if (staff) identities.staff = { initial: staff.initials, name: staff.name.split(" ")[0], role: t(staff.title, "Staff"), href: "/staff/dashboard", area: "staff" };
  }
  const area = areaOf(pathname);
  const who = area ? identities[area] : (identities.pilgrim ?? identities.admin ?? identities.staff);
  const signIn = SIGN_IN[area ?? "pilgrim"];
  const here = (href: string) => pathname.replace(/\/$/, "") === href;
  const navItems = useNav();

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
  const { nav: NAV, more: MORE } = navItems;
  // The open phone menu owns the swipe: the page behind it stays still, and the menu scrolls to its last item
  useScrollLock(open);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Dims the page under the open phone menu, and a tap on it closes the menu. It sits outside the bar:
          the bar's backdrop blur makes it the box of anything fixed inside it, which would dim the menu itself */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label={t("إغلاق القائمة", "Close the menu")}
            tabIndex={-1}
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 cursor-default bg-ink/40 xl:hidden"
          />
        )}
      </AnimatePresence>
      {/* Collapses with a CSS grid-rows transition, not motion's height: "auto". Animating to "auto" makes motion
          measure the page and then call window.scrollTo to restore the position — which cancels any smooth scroll
          in progress, so «اكتشف المزيد» and every in-page link stopped ~100px down on the first click. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          // Folded while the phone menu is open too, so the menu starts right under the bar and gets the rest of the screen
          solid ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <TopBar />
        </div>
      </div>
      <div
        className={cn(
          "transition-all duration-500 ease-out-expo",
          solid
            ? cn(
                "border-b border-gold/30 shadow-[0_10px_40px_-20px_rgba(2,21,38,.35)] backdrop-blur-xl",
                // The open phone menu is read on its own, so the page must not show through it
                open ? "bg-white xl:bg-white/90" : "bg-white/90",
              )
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:h-20 sm:gap-4 md:px-8">
          <Link href="/" className="min-w-0" aria-label={t("الصفحة الرئيسية", "Home page")}>
            <Logo light={!solid} name={t(BRAND.name, "Hajj and Umrah Administration")} authority={t(BRAND.country, "Syria")} />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative whitespace-nowrap rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors ltr:px-2.5",
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
                  "flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-semibold ltr:px-2.5",
                  solid ? "text-ink-soft" : "text-white/85",
                )}
              >
                {t("المزيد", "More")}{" "}
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
                    className="absolute end-0 top-full w-72 pt-2"
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

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {who ? (
              <Link
                href={who.href}
                title={`${who.name} — ${who.role}`}
                className={cn(
                  "flex items-center gap-2 rounded-2xl py-1.5 pe-4 ps-1.5 text-sm font-bold transition",
                  solid
                    ? "bg-green-dark text-white hover:bg-green"
                    : "bg-white/15 text-white backdrop-blur hover:bg-white/25",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl font-display",
                    who.area === "pilgrim" ? "bg-gold text-ink" : who.area === "admin" ? "bg-maroon text-gold" : "bg-gold-light text-green-dark",
                  )}
                >
                  {who.initial}
                </span>
                <span className="hidden flex-col leading-tight sm:flex">
                  {who.name}
                  <span className="text-[10px] font-medium opacity-70">{who.role}</span>
                </span>
              </Link>
            ) : !area ? (
              // The public pages: signing in, asking as whom (each platform has its own address) — but for the home
              // page while its opening holds the same button: there the bar says he is a visitor
              heroLogin ? <VisitorMenu solid={solid} /> : <AccountMenu kind="login" variant="bar" />
            ) : (
              <>
                {!here(signIn.login.href) && (
                  <Link
                    href={signIn.login.href}
                    className={cn(
                      "items-center gap-1.5 whitespace-nowrap rounded-2xl text-sm font-bold",
                      signIn.join
                        ? cn("hidden px-4 py-2.5 sm:flex", solid ? "text-green-dark hover:bg-green-dark/5" : "text-white hover:bg-white/10")
                        : "flex bg-gold px-3 py-2 text-[13px] text-ink shadow-lg shadow-gold-dark/20 transition hover:bg-gold-dark hover:text-white sm:px-4 sm:py-2.5 sm:text-sm",
                    )}
                  >
                    <LogIn className="size-4" /> {signIn.login.label[lang]}
                  </Link>
                )}
                {signIn.join && !here(signIn.join.href) && (
                  <Link
                    href={signIn.join.href}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-2xl bg-gold px-3 py-2 text-[13px] font-bold text-ink sm:px-4 sm:py-2.5 sm:text-sm shadow-lg shadow-gold-dark/20 transition hover:bg-gold-dark hover:text-white"
                  >
                    <UserRound className="size-4" />{" "}
                    {lang === "en" && signIn.join.label.enShort ? (
                      <>
                        <span className="sm:hidden">{signIn.join.label.enShort}</span>
                        <span className="hidden sm:inline">{signIn.join.label.en}</span>
                      </>
                    ) : (
                      signIn.join.label[lang]
                    )}
                  </Link>
                )}
              </>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "grid size-10 place-items-center rounded-2xl sm:size-11 xl:hidden",
                solid
                  ? "text-green-dark hover:bg-green-dark/5"
                  : "text-white hover:bg-white/10",
              )}
              aria-label={t("القائمة", "Menu")}
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
              {/* The bar is 4rem (5rem from sm); the list takes the rest of the screen and scrolls inside it. The
                  bottom room lets the last item scroll clear of the floating guide button in the corner */}
              <div className="mx-auto grid max-h-[calc(100dvh/var(--zoom)_-_4rem)] max-w-7xl gap-1 overflow-y-auto overscroll-contain px-4 pb-24 sm:max-h-[calc(100dvh/var(--zoom)_-_5rem)]">
                {[...NAV.map((n) => ({ ...n, soon: false })), ...MORE].map(
                  (item, i) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: lang === "en" ? -20 : 20 }}
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
                {!who && !area && (
                  <div className="mt-2 grid gap-2">
                    {ACCOUNT_MENUS.login.items.map((m) => (
                      <Link key={m.href} href={m.href} className="flex items-center justify-center gap-2 rounded-2xl border-2 border-green-dark/15 px-4 py-3.5 text-lg font-bold text-green-dark">
                        <m.icon className="size-5 text-gold-dark" /> {m.label[lang]}
                      </Link>
                    ))}
                  </div>
                )}
                {!who && area && !here(signIn.login.href) && (
                  <Link
                    href={signIn.login.href}
                    className="mt-2 rounded-2xl border-2 border-green-dark/15 px-4 py-3.5 text-center text-lg font-bold text-green-dark"
                  >
                    {area === "staff" ? t("دخول الموظفين", "Staff sign-in") : area === "admin" ? t("دخول الإداري", "Administrator sign-in") : t("تسجيل الدخول", "Sign in")}
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
