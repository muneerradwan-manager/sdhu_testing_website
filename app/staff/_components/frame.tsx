"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  Dices,
  Layers,
  LayoutDashboard,
  LogOut,
  PencilLine,
  Plane,
  RadioTower,
  ScrollText,
  Settings2,
  ShieldCheck,
  UsersRound,
  Vote,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { useToast } from "@/components/ui/widgets";
import { PERMISSION_LABELS, type Permission, type StaffUser } from "@/lib/staff";
import { actions, useHydrated } from "@/lib/store";
import { cn, hijriDate, samePath } from "@/lib/utils";
import { useReviewQueue, useTicketQueue } from "./data";
import { canAny, fmtTime, logAs, useNow, useStaffUser } from "./kit";

type NavItem = { href: string; label: string; icon: ReactNode; perms: Permission[]; badge?: "reviews" | "tickets" };

export const STAFF_NAV: NavItem[] = [
  { href: "/staff/dashboard", label: "لوحتي", icon: <LayoutDashboard />, perms: [] },
  { href: "/staff/reviews", label: "مراجعة الطلبات", icon: <ClipboardCheck />, perms: ["registration.review"], badge: "reviews" },
  { href: "/staff/season", label: "إعدادات الموسم", icon: <Settings2 />, perms: ["season.settings"] },
  { href: "/staff/lottery", label: "القبول والقرعة", icon: <Dices />, perms: ["lottery.import", "lottery.approve"] },
  { href: "/staff/administrators", label: "الإداريون والمجموعات", icon: <UsersRound />, perms: ["administrators.manage", "groups.approve"] },
  { href: "/staff/content", label: "محتوى الموقع", icon: <PencilLine />, perms: ["content.manage"] },
  { href: "/staff/operations", label: "غرفة العمليات", icon: <RadioTower />, perms: ["operations.room"], badge: "tickets" },
  { href: "/staff/election", label: "انتخاب رؤساء التكتلات", icon: <Vote />, perms: ["season.settings", "groups.approve"] },
  { href: "/staff/grading", label: "التصنيف والترقية", icon: <Layers />, perms: ["season.settings", "audit.read"] },
  { href: "/staff/audit", label: "سجل الأحداث", icon: <ScrollText />, perms: ["audit.read"] },
  { href: "/staff/executive", label: "لوحة الإدارة العليا", icon: <BarChart3 />, perms: ["season.settings", "audit.read"] },
];

export function StaffFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useStaffUser();
  const isLogin = samePath(pathname, "/staff");

  useEffect(() => {
    if (hydrated && !user && !isLogin) router.replace("/staff");
  }, [hydrated, user, isLogin, router]);

  if (isLogin) return children;
  if (!hydrated || !user) {
    return (
      <div data-dark-page className="grid min-h-[calc(100dvh/var(--zoom))] place-items-center bg-green-dark">
        <Emblem className="size-20 animate-pulse" animated />
      </div>
    );
  }
  return <Shell user={user}>{children}</Shell>;
}

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#003d36]">
      <Image src="/images/haram-2022.jpg" alt="" fill sizes="100vw" quality={70} className="object-cover opacity-[.07]" />
      <div className="bg-pattern absolute inset-0 opacity-[.07]" />
      <div className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-green-light/20 blur-3xl" />
      <div className="absolute -left-32 top-1/3 size-[28rem] rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#002a25] to-transparent" />
    </div>
  );
}

function Shell({ user, children }: { user: StaffUser; children: ReactNode }) {
  return (
    <div data-dark-page className="relative isolate min-h-[calc(100dvh/var(--zoom))] pt-28 text-white">
      <Backdrop />
      <div className="mx-auto grid max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-20 md:px-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <Sidebar user={user} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function LiveClock() {
  const now = useNow(1000);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3 ring-1 ring-white/10">
      <div>
        <p className="font-display text-2xl font-bold tabular-nums tracking-wider text-white" dir="ltr">
          {fmtTime(now, true)}
        </p>
        <p className="text-[11px] text-white/55">{hijriDate(new Date(now), { weekday: "long" })}</p>
      </div>
      <div className="text-left text-[11px] leading-5 text-white/55">
        <p className="flex items-center justify-end gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-green-light" />
            <span className="relative size-2 rounded-full bg-green-light" />
          </span>
          متصل
        </p>
        <p>دمشق · مكة +3</p>
      </div>
    </div>
  );
}

function Sidebar({ user }: { user: StaffUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [showPerms, setShowPerms] = useState(false);
  const reviews = useReviewQueue();
  const tickets = useTicketQueue();
  const counts = useMemo(
    () => ({
      reviews: reviews.filter((r) => !r.review).length,
      tickets: tickets.filter((t) => t.status !== "resolved").length,
    }),
    [reviews, tickets],
  );
  const items = STAFF_NAV.filter((n) => canAny(user, n.perms));

  const logout = () => {
    logAs(user, { action: "تسجيل خروج", target: "بوابة الموظفين" });
    actions.staffLogout();
    toast({ title: "تم تسجيل الخروج", body: `إلى اللقاء يا ${user.name.split(" ")[0]}`, tone: "info", icon: "👋" });
    router.push("/staff");
  };

  return (
    <aside className="min-w-0 self-start lg:sticky lg:top-24">
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-b from-green-dark/90 to-[#00352f]/95 shadow-[0_30px_80px_-30px_rgba(0,0,0,.6)] backdrop-blur"
      >
        {/* No emblem or platform name here: the site header already carries the brand, and repeating it
            inside the panel made the page read as a second site nested in the first. The panel opens on
            the identity instead — who is signed in — and on phones it sits above the page, so the logout
            moves onto the user card. */}
        <div className="space-y-3 p-3 lg:p-4">
          {/* User card */}
          <div className="relative overflow-hidden rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark font-display text-2xl font-bold text-ink shadow-lg">
                {user.initials}
                <span className="absolute -bottom-0.5 -left-0.5 size-3.5 rounded-full border-2 border-green-dark bg-green-light" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-xs text-white/60">{user.title}</p>
              </div>
              <button
                onClick={logout}
                className="mr-auto grid size-10 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-maroon/40 hover:text-white lg:hidden"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <LogOut className="size-5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/75">حساب دائم</span>
              {user.travels && (
                <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-gold">
                  <Plane className="size-3" /> مسافر مع البعثة
                </span>
              )}
              <button
                onClick={() => setShowPerms((v) => !v)}
                className="mr-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-expanded={showPerms}
              >
                <ShieldCheck className="size-3" /> {user.permissions.length} صلاحيات
                <ChevronDown className={cn("size-3 transition", showPerms && "rotate-180")} />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showPerms && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden">
                  {user.permissions.map((p, i) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.04 * i }}
                      className="mt-2 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] text-gold"
                    >
                      {PERMISSION_LABELS[p]}
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden lg:block">
            <LiveClock />
          </div>
        </div>

        {/* Navigation — vertical on desktop, a swipeable strip on phones */}
        <nav aria-label="أقسام بوابة الموظفين" className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
          {items.map((n) => {
            const active = pathname.startsWith(n.href);
            const count = n.badge ? counts[n.badge] : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition [&_svg]:size-[18px]",
                  active ? "text-ink" : "text-white/75 hover:bg-white/[.06] hover:text-white",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="staff-nav"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light shadow-[0_10px_30px_-12px_rgba(217,200,158,.8)]"
                    transition={{ type: "spring", damping: 30, stiffness: 350 }}
                  />
                )}
                <span className={cn("relative", active ? "text-green-dark" : "text-gold/80")}>{n.icon}</span>
                <span className="relative whitespace-nowrap">{n.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "relative mr-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] tabular-nums",
                      n.badge === "tickets" ? "bg-maroon text-white" : active ? "bg-green-dark text-white" : "bg-white/15 text-white",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-white/10 p-3 lg:block">
          <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-maroon/40 hover:text-white">
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </motion.div>
      <p className="mt-3 hidden px-2 text-center text-[11px] leading-5 text-white/40 lg:block">
        كل إجراء تقوم به يُسجَّل باسمك في سجل الأحداث، ولا يمكن حذفه أو تعديله.
      </p>
    </aside>
  );
}
