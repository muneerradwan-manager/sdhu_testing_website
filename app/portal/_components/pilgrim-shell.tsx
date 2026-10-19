"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { BedDouble, BellRing, BookMarked, BookOpenText, ClipboardList, Flag, FolderLock, GraduationCap, LayoutDashboard, Lock, LogOut, Luggage, MapPinned, Plane, Route, ScrollText, Ticket, UsersRound, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/shell";
import { getPerson } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; open: boolean; hint?: string; section: string };

/**
 * The pilgrim's own pages, as the administrators and the staff have theirs, in five sections: his account (his file,
 * his notifications, everything he did), his application (its steps, the vault of all its documents, his group),
 * his trip (the flights, the hotels, the season's programme), the season — each part of «حالتي الآن» a short page of
 * its own: the gatherings (the trips and visits among them), the meals, his reports, the lost items — and faith and learning (his group's
 * religious lessons and activities, kept apart from the Academy's recorded lessons).
 * A page whose step has not come yet stays in the list, locked, saying what opens it.
 */
function usePilgrimNav(): Item[] {
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const post = useStore((s) => s.post[sid]);
  const confirmed = !!post?.confirmedAt;
  const grouped = !!post?.groupApprovedAt;
  const season = !!post?.visaAt;
  const inSeason = "في الموسم، بعد التأشيرة";
  return [
    { section: "حسابي", href: "/portal", label: "ملفي", icon: LayoutDashboard, open: true },
    { section: "حسابي", href: "/portal/notifications", label: "الإشعارات", icon: BellRing, open: true },
    { section: "حسابي", href: "/portal/activity", label: "سجل نشاطي", icon: ScrollText, open: true },
    app
      ? { section: "طلبي", href: "/portal/application", label: "طلبي وخطواته", icon: ClipboardList, open: true }
      : { section: "طلبي", href: "/portal/apply", label: "تقديم طلب حج", icon: ClipboardList, open: true },
    { section: "طلبي", href: "/portal/application/documents", label: "خزنة الوثائق", icon: FolderLock, open: confirmed, hint: "بعد تأكيد القبول" },
    { section: "طلبي", href: "/portal/application/group", label: "مجموعتي", icon: UsersRound, open: grouped, hint: "بعد إلحاقك بمجموعة" },
    { section: "رحلتي", href: "/portal/application/trip", label: "الطيران والمشاعر", icon: Plane, open: season, hint: "بعد صدور التأشيرة" },
    { section: "رحلتي", href: "/portal/application/hotels", label: "الفنادق والسكن", icon: BedDouble, open: season, hint: "بعد صدور التأشيرة" },
    { section: "رحلتي", href: "/portal/journey", label: "برنامج الرحلة", icon: Route, open: true },
    { section: "في الموسم", href: "/portal/season", label: "حالتي الآن", icon: MapPinned, open: season, hint: inSeason },
    { section: "في الموسم", href: "/portal/season/gatherings", label: "التجمّعات", icon: Flag, open: season, hint: inSeason },
    { section: "في الموسم", href: "/portal/season/meals", label: "الوجبات", icon: UtensilsCrossed, open: season, hint: inSeason },
    { section: "في الموسم", href: "/portal/season/reports", label: "بلاغاتي", icon: Ticket, open: season, hint: inSeason },
    { section: "في الموسم", href: "/portal/season/lost", label: "المفقودات", icon: Luggage, open: season, hint: inSeason },
    { section: "الدين والتعلّم", href: "/portal/lessons", label: "دروس المجموعة الدينية", icon: BookOpenText, open: grouped, hint: "بعد إلحاقك بمجموعة" },
    { section: "الدين والتعلّم", href: "/portal/religious", label: "النشاطات الدينية", icon: BookMarked, open: grouped, hint: "بعد إلحاقك بمجموعة" },
    { section: "الدين والتعلّم", href: "/portal/academy", label: "الأكاديمية", icon: GraduationCap, open: true },
  ];
}

export function PilgrimSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const person = getPerson(sid);
  const items = usePilgrimNav();
  const logout = () => {
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
            <p className="truncate text-xs text-white/65">{app ? `طلب حج رقم ${app.number} — موسم 1448` : "لم يقدّم طلب حج بعد"}</p>
          </div>
          <button type="button" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="mr-auto grid size-10 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-maroon/40 hover:text-white lg:hidden">
            <LogOut className="size-5" />
          </button>
        </div>
        <nav aria-label="أقسام حساب الحاج" className="scrollbar-none flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1 lg:overflow-visible">
          {items.map((n, i) => {
            const on = active === n.href;
            const first = i === 0 || items[i - 1].section !== n.section;
            return (
              <Fragment key={n.href}>
              {/* The sections, on a wide screen: what a page belongs to — the account, the application, the trip, the season, faith and learning */}
              {first && <p className={cn("hidden px-3 pb-1 text-[11px] font-bold tracking-wide text-gold-dark lg:block", i > 0 && "mt-3 border-t border-gold/20 pt-3")}>{n.section}</p>}
              <Link
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={cn("relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition", on ? "on-light text-ink" : n.open ? "text-ink-soft hover:bg-sand" : "text-hint hover:bg-sand")}
              >
                {on && <motion.span layoutId="pilgrim-nav" className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light" transition={{ type: "spring", damping: 30, stiffness: 350 }} />}
                <span className={cn("relative", on ? "text-green-dark" : n.open ? "text-gold-dark" : "text-hint")}>{n.open ? <n.icon className="size-[18px]" /> : <Lock className="size-[18px]" />}</span>
                <span className="relative min-w-0">
                  <span className="block whitespace-nowrap">{n.label}</span>
                  {!n.open && n.hint && <span className="hidden whitespace-nowrap text-[11px] font-semibold text-hint lg:block">{n.hint}</span>}
                </span>
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

/** A page of the pilgrim's account: its title over the band, and the sidebar beside its content */
export function PilgrimShell({ title, subtitle, image = "/images/haram-2022.jpg", children }: { title: ReactNode; subtitle?: ReactNode; image?: string; children: ReactNode }) {
  return (
    <PortalShell
      wide
      image={image}
      header={
        <div className="text-white">
          <h1 className="font-display text-3xl font-bold md:text-5xl">{title}</h1>
          {subtitle && <div className="mt-3 max-w-3xl text-lg leading-8 text-white/75">{subtitle}</div>}
        </div>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <PilgrimSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </PortalShell>
  );
}

/** A page whose step has not come yet: what opens it, and the way to the steps */
export function PilgrimLocked({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border-2 border-dashed border-gold/50 bg-white p-8 text-center md:p-12">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-sand text-gold-dark">
        <Lock className="size-8" />
      </span>
      <p className="mt-4 font-display text-2xl font-bold text-green-dark">{title}</p>
      <p className="mx-auto mt-2 max-w-xl leading-8 text-ink-soft">{text}</p>
      <Link href="/portal/application" className="mt-5 inline-flex rounded-2xl bg-green-dark px-5 py-2.5 font-bold text-white hover:bg-green">
        طلبي وخطواته
      </Link>
    </div>
  );
}
