"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  BedDouble,
  BellRing,
  BookMarked,
  BookOpenText,
  Briefcase,
  ClipboardList,
  Flag,
  FolderLock,
  GraduationCap,
  History,
  LayoutDashboard,
  Lock,
  LogOut,
  Luggage,
  MapPinned,
  Plane,
  Route,
  ScrollText,
  Ticket,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { effectiveRole, logAdmin, positionLabelOf, resultOf } from "@/app/administrator/_lib/admin";
import { useAdminNav } from "@/app/administrator/_components/ui";
import { useAccount } from "@/lib/account";
import { outcomeOf, stageAt } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { statusLabel, type OperationState } from "@/lib/operations";
import { getPerson } from "@/lib/registry";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type AdminProfile } from "@/lib/store";
import { cn } from "@/lib/utils";

export type NavEntry = {
  section: string;
  href: string;
  label: string;
  icon: LucideIcon;
  open: boolean;
  /** What opens a locked page */
  hint?: string;
  /** The operation it belongs to, with its dates (the administrators' pages) */
  shown?: OperationState;
  badge?: number;
};

/** The clock the acceptance is read against: the demo's tracking moves with time */
function useNow(ms = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** The signed-in account's application, and whether it was accepted (directly, or in the lottery) */
export function usePilgrimAcceptance() {
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const post = useStore((s) => s.post[sid]);
  const draw = usePublishedDraw();
  const { acceptedDirectAge } = useSeason();
  const now = useNow();
  if (!app) return { app, accepted: false };
  const steps = outcomeOf(app, draw, acceptedDirectAge).steps;
  const stage = stageAt(steps, (now - app.submittedAt) / 1000).stage;
  return { app, accepted: stage?.key === "accepted" || !!post?.confirmedAt };
}

/**
 * Qualified for the season's role: passed the written and oral exams, or renewed his role exempt from them — or
 * already holds a place (a group formed, a seat, a post in a cluster, a role the administration granted)
 */
export function adminQualified(p: AdminProfile | undefined) {
  return !!p && (resultOf(p).passed || !!p.group?.approvedAt || !!p.cluster || !!p.servesIn || !!p.coordinatorIn);
}

/**
 * The account's menu, one for everyone, whatever he is this season. Always: his file, his notifications, his
 * activity, his seasons and the Academy. Then what the season gives him, by how far he got:
 * - nothing chosen — the two ways in (the Hajj, an administrative role);
 * - applied for the Hajj — his application to follow, and nothing else until it is accepted; then all the pilgrim's pages;
 * - applied for a role — his application and his exams, until he qualifies; then his role's pages and operations.
 */
export function useAccountNav(): NavEntry[] {
  const acc = useAccount();
  const sid = useStore((s) => s.sessionId) ?? "";
  const post = useStore((s) => s.post[sid]);
  const { app, accepted } = usePilgrimAcceptance();
  const adminNav = useAdminNav();
  const path = acc?.path;

  const top: NavEntry[] = [
    { section: "حسابي", href: "/portal", label: "ملفي", icon: LayoutDashboard, open: true },
    { section: "حسابي", href: "/portal/notifications", label: "الإشعارات", icon: BellRing, open: true, badge: adminNav.find((n) => n.href === "/portal/notifications")?.badge },
    { section: "حسابي", href: "/portal/activity", label: "سجل نشاطي", icon: ScrollText, open: true },
    { section: "حسابي", href: "/portal/history", label: "سجل المواسم", icon: History, open: true },
  ];
  const learn: NavEntry[] = [
    { section: "التعلّم", href: "/portal/academy", label: "الأكاديمية", icon: GraduationCap, open: true },
    // The cadre's references (job descriptions, the system, decisions, contracts, plans): for whoever is on the administrators' way
    ...(acc?.path === "admin" ? [{ section: "التعلّم", href: "/administrator/job-descriptions", label: "مراجع الكادر", icon: BookOpenText, open: true }] : []),
  ];

  let season: NavEntry[] = [];
  if (path === "admin") {
    // His own pages are the account's (above); the role's pages are what the administrators' menu gives him
    const own = new Set(["/portal", "/portal/notifications", "/portal/activity", "/portal/academy"]);
    const entries = adminNav.filter((n) => !own.has(n.href));
    const qualified = adminQualified(acc?.admin);
    const shownEntries = qualified ? entries : entries.filter((n) => n.href === "/portal/role" || n.href === "/portal/exam");
    season = shownEntries.map((n) => ({ section: qualified ? "عملي في الموسم" : "طلبي الإداري", href: n.href, label: n.label, icon: n.icon, open: n.open, shown: n.shown, badge: n.badge }));
  } else if (path === "pilgrim" || app) {
    if (!accepted) {
      season = [app ? { section: "طلبي", href: "/portal/application", label: "طلبي ومتابعته", icon: ClipboardList, open: true } : { section: "طلبي", href: "/portal/apply", label: "تقديم طلب حج", icon: ClipboardList, open: true }];
    } else {
      const confirmed = !!post?.confirmedAt;
      const grouped = !!post?.groupApprovedAt;
      const inSeason = !!post?.visaAt;
      const after = "في الموسم، بعد التأشيرة";
      season = [
        { section: "طلبي", href: "/portal/application", label: "طلبي وخطواته", icon: ClipboardList, open: true },
        { section: "طلبي", href: "/portal/application/documents", label: "خزنة الوثائق", icon: FolderLock, open: confirmed, hint: "بعد تأكيد القبول" },
        { section: "طلبي", href: "/portal/application/group", label: "مجموعتي", icon: UsersRound, open: grouped, hint: "بعد إلحاقك بمجموعة" },
        { section: "رحلتي", href: "/portal/application/trip", label: "الطيران والمشاعر", icon: Plane, open: inSeason, hint: "بعد صدور التأشيرة" },
        { section: "رحلتي", href: "/portal/application/hotels", label: "الفنادق والسكن", icon: BedDouble, open: inSeason, hint: "بعد صدور التأشيرة" },
        { section: "رحلتي", href: "/portal/journey", label: "برنامج الرحلة", icon: Route, open: true },
        { section: "في الموسم", href: "/portal/season", label: "حالتي الآن", icon: MapPinned, open: inSeason, hint: after },
        { section: "في الموسم", href: "/portal/season/rites", label: "أداء المناسك", icon: Flag, open: inSeason, hint: after },
        { section: "في الموسم", href: "/portal/season/meals", label: "الوجبات", icon: UtensilsCrossed, open: inSeason, hint: after },
        { section: "في الموسم", href: "/portal/season/reports", label: "بلاغاتي", icon: Ticket, open: inSeason, hint: after },
        { section: "في الموسم", href: "/portal/season/lost", label: "المفقودات", icon: Luggage, open: inSeason, hint: after },
        { section: "الدين", href: "/portal/lessons", label: "دروس المجموعة الدينية", icon: BookOpenText, open: grouped, hint: "بعد إلحاقك بمجموعة" },
        { section: "الدين", href: "/portal/religious", label: "النشاطات الدينية", icon: BookMarked, open: grouped, hint: "بعد إلحاقك بمجموعة" },
      ];
    }
  } else {
    season = [
      { section: "هذا الموسم", href: "/portal/apply", label: "التسجيل على الحج", icon: ClipboardList, open: true },
      { section: "هذا الموسم", href: "/portal?choose=admin", label: "التقدّم لصفة إدارية", icon: Briefcase, open: true },
    ];
  }
  return [...top, ...season, ...learn];
}

/** Under his name: what he is this season */
function useStatusLine() {
  const acc = useAccount();
  const { app, accepted } = usePilgrimAcceptance();
  if (!acc) return "";
  if (acc.path === "admin") {
    const role = acc.admin ? effectiveRole(acc.admin) : "";
    const qualified = adminQualified(acc.admin);
    return role ? `${positionLabelOf(role)}${qualified ? "" : " — قيد التأهيل"} — موسم ${acc.season}` : `المسار الإداري — موسم ${acc.season}`;
  }
  if (app) return `طلب حج رقم ${app.number}${accepted ? " — مقبول" : ""}`;
  if (acc.path === "pilgrim") return `التسجيل على الحج — موسم ${acc.season}`;
  return "عضو في المنصة";
}

export function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const sid = useStore((s) => s.sessionId) ?? "";
  const hasFile = useStore((s) => !!s.admins[s.sessionId ?? ""]);
  const person = getPerson(sid);
  const items = useAccountNav();
  const status = useStatusLine();
  const logout = () => {
    if (hasFile) logAdmin(sid, "تسجيل الخروج");
    actions.logout();
    router.push("/");
  };
  // The longest href that matches is the page: «طلبي وخطواته» is not lit on its own sub-pages
  const active = items.filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <aside className="min-w-0 self-start lg:sticky lg:top-28">
      <div className="overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
        <div className="flex items-center gap-3 bg-gradient-to-l from-green-dark to-[#00352f] p-4 text-white">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold font-display text-xl font-bold text-ink">{person?.firstName[0] ?? "ح"}</span>
          <div className="min-w-0">
            <p className="truncate font-bold">{person ? `${person.firstName} ${person.lastName}` : "حسابي"}</p>
            <p className="truncate text-xs text-white/65">{status}</p>
          </div>
          <button type="button" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="mr-auto grid size-10 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-maroon/40 hover:text-white lg:hidden">
            <LogOut className="size-5" />
          </button>
        </div>
        <nav aria-label="أقسام حسابي" className="scrollbar-none flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1 lg:overflow-visible">
          {items.map((n, i) => {
            const on = active === n.href;
            const first = i === 0 || items[i - 1].section !== n.section;
            const sub = !n.open ? n.hint : n.shown && n.shown.status !== "always" ? statusLabel(n.shown) : undefined;
            return (
              <Fragment key={n.href}>
                {first && <p className={cn("hidden px-3 pb-1 text-[11px] font-bold tracking-wide text-gold-dark lg:block", i > 0 && "mt-3 border-t border-gold/20 pt-3")}>{n.section}</p>}
                <Link
                  href={n.href}
                  aria-current={on ? "page" : undefined}
                  className={cn("relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition", on ? "on-light text-ink" : n.open ? "text-ink-soft hover:bg-sand" : "text-hint hover:bg-sand")}
                >
                  {on && <motion.span layoutId="account-nav" className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light" transition={{ type: "spring", damping: 30, stiffness: 350 }} />}
                  <span className={cn("relative", on ? "text-green-dark" : n.open ? "text-gold-dark" : "text-hint")}>{n.open ? <n.icon className="size-[18px]" /> : <Lock className="size-[18px]" />}</span>
                  <span className="relative min-w-0">
                    <span className="block whitespace-nowrap">{n.label}</span>
                    {sub && <span className={cn("hidden whitespace-nowrap text-[11px] font-semibold lg:block", on ? "text-green-dark/80" : n.shown?.open ? "text-green" : "text-hint")}>{sub}</span>}
                  </span>
                  {!!n.badge && (
                    <span className="relative mr-auto grid min-w-5 place-items-center rounded-full bg-maroon px-1.5 text-[11px] font-bold leading-5 text-white" aria-label={`${n.badge} غير مقروءة`}>
                      {n.badge}
                    </span>
                  )}
                </Link>
              </Fragment>
            );
          })}
        </nav>
        <div className="hidden border-t border-gold/30 p-2 lg:block">
          <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-ink-soft transition hover:bg-maroon/10 hover:text-maroon">
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>
  );
}
