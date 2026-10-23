"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  BarChart3,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  ClipboardCheck,
  Contact,
  Database,
  Dices,
  FilePlus2,
  History,
  DoorOpen,
  FileQuestion,
  FileStack,
  Gauge,
  GraduationCap,
  CalendarRange,
  ChartColumn,
  Radio,
  IdCard,
  KeyRound,
  Landmark,
  Layers,
  ListTree,
  LogOut,
  Mails,
  Network,
  PencilLine,
  Plane,
  RadioTower,
  Route,
  Scale,
  ScrollText,
  Star,
  Ticket,
  TowerControl,
  Settings2,
  ShieldCheck,
  UserPlus,
  UserRoundPlus,
  Bus,
  HeartPulse,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { useToast } from "@/components/ui/widgets";
import type { StaffUser } from "@/lib/staff";
import { hasStats, statsKey, viewKeys, PERM_SYSTEM } from "@/lib/permissions";
import { actions, useHydrated, useStore } from "@/lib/store";
import { useEvaluatees } from "../evaluate/view";
import { SYSTEMS, SYSTEM_KEYS, type SystemKey } from "@/lib/systems";
import { cn, hijriDate, samePath } from "@/lib/utils";
import { useHalls } from "@/app/administrator/_lib/halls";
import { useAirportReps, useFlightsData } from "@/lib/flights";
import { useAdminsDesk } from "../admins/desk";
import { useEmployeesDesk } from "../employees/desk";
import { useExamDesk } from "../exam/_components/desk";
import { useFlightsDesk } from "../flights/desk";
import { useRegistrationDesk } from "../hajj/desk";
import { useSystemsUnseen } from "./system";
import { useCivilClaims, useReviewQueue, useTicketQueue } from "./data";
import { canAny, fmtTime, logAs, useGrantSummary, useNow, useStaffUser } from "./kit";
import { statsHref } from "../stats/sections";

/**
 * Every entry shows to whoever holds one of its `perms` — viewing something it holds (lib/permissions.ts);
 * an empty list is everyone's. There is no page gathering an employee's work: every system's numbers are a
 * permission of their own, and «لوحة الإدارة العليا» gathers them all, first in the menu for whoever holds it.
 * `system`: a management file: its summary (the dashboard for it) and then every one of its operations as an
 * entry of its own (`area`: the part of the file's desk that counts what waits there), under the file's name,
 * each shown to whoever may view what it holds. `exact`: lit on its own path only.
 * `desk`: another system, whose statistics (`<system>.stats.GET`) are an entry of their own beside it: the two
 * sit under the system's name when he holds both.
 * `evaluate`: also needs a posting with clusters to rate.
 */
type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  perms: string[];
  badge?: "reviews" | "tickets" | "hall" | "airport" | "systems" | SystemKey;
  desk?: string;
  /** Shown to whoever was posted in a tower or a camp that clusters lived in: he rates their administrators after the season */
  evaluate?: true;
  system?: SystemKey;
  area?: string;
  exact?: true;
};

/** Each operation's icon in the menu */
const OPERATION_ICONS: Record<string, ReactNode> = {
  "/staff/employees/manage": <IdCard />,
  "/staff/employees/manage/edit": <UserPlus />,
  "/staff/employees/manage/accounts": <KeyRound />,
  "/staff/employees/manage/season": <CalendarCheck />,
  "/staff/hajj/manage": <ListTree />,
  "/staff/hajj/manage/edit": <FilePlus2 />,
  "/staff/hajj/manage/steps": <Route />,
  "/staff/hajj/manage/rules": <Scale />,
  "/staff/hajj/manage/payments": <CircleDollarSign />,
  "/staff/hajj/manage/applications": <ClipboardList />,
  "/staff/hajj/manage/history": <History />,
  "/staff/admins/manage": <ScrollText />,
  "/staff/admins/manage/reference": <ListTree />,
  "/staff/admins/manage/references": <BookOpenText />,
  "/staff/admins/manage/cadre": <Contact />,
  "/staff/admins/manage/applicants": <UsersRound />,
  "/staff/admins/manage/groups": <BadgeCheck />,
  "/staff/admins/manage/clusters": <Building2 />,
  "/staff/admins/manage/directory": <Network />,
  "/staff/admins/manage/letters": <Mails />,
  "/staff/admins/manage/evaluation": <Star />,
  "/staff/admins/manage/grading": <Layers />,
  "/staff/exam/manage": <Landmark />,
  "/staff/exam/manage/edit": <FilePlus2 />,
  "/staff/exam/manage/exams": <CalendarClock />,
  "/staff/exam/manage/bank": <FileQuestion />,
  "/staff/exam/manage/people": <UsersRound />,
  "/staff/exam/manage/results": <GraduationCap />,
  "/staff/exam/manage/sittings": <CalendarRange />,
  "/staff/exam/manage/live": <Radio />,
  "/staff/exam/manage/review": <ClipboardCheck />,
  "/staff/exam/manage/stats": <ChartColumn />,
  "/staff/flights/manage": <Building2 />,
  "/staff/flights/manage/carriers": <Ticket />,
  "/staff/flights/manage/flights": <Plane />,
  "/staff/flights/manage/dispatch": <Route />,
};

/** A management file in the menu: its summary, then each of its operations, under the file's name */
function systemEntries(key: SystemKey): NavItem[] {
  const s = SYSTEMS[key];
  return [
    { href: s.summary.href, label: s.summary.label, icon: <Gauge />, perms: [`${key}.summary.GET`], system: key, badge: key, exact: true },
    // The first operation is the file's own path, which the others continue: lit on its own path only
    ...s.operations.map((o, i): NavItem => ({ href: o.href, label: o.label, icon: OPERATION_ICONS[o.href] ?? <ScrollText />, perms: o.perms, system: key, area: o.area, ...(i === 0 && { exact: true as const }) })),
  ];
}

/** A system that is not a management file: its statistics, when it has them, then its own page */
function deskEntries(item: NavItem & { system?: undefined }, sys: string): NavItem[] {
  return [...(hasStats(sys) ? [{ href: statsHref(sys), label: "الإحصائيات", icon: <ChartColumn />, perms: [statsKey(sys)], desk: sys, exact: true as const }] : []), { ...item, desk: sys }];
}

export const STAFF_NAV: NavItem[] = [
  // Every system's numbers in one place: at the top for whoever holds it
  { href: "/staff/executive", label: "لوحة الإدارة العليا", icon: <BarChart3 />, perms: viewKeys("executive") },
  { href: "/staff/access", label: "صلاحيات الموظفين", icon: <KeyRound />, perms: viewKeys("access"), badge: "systems" },
  // The management files, in the season's order: each file's summary and its operations
  ...SYSTEM_KEYS.flatMap(systemEntries),
  // The field posts: granted for a hall, an airport
  { href: "/staff/hall", label: "قاعتي الامتحانية", icon: <DoorOpen />, perms: ["hall.sittings.GET"], badge: "hall" },
  { href: "/staff/airport", label: "رحلات مطاري", icon: <TowerControl />, perms: ["airport.flights.GET"], badge: "airport" },
  { href: "/staff/evaluate", label: "تقييم الإداريين", icon: <Star />, perms: ["evaluate.evaluations.GET"], evaluate: true },
  // The other systems in the order the season is worked: set up first, then run, then looked back on
  ...deskEntries({ href: "/staff/season", label: "إعدادات الموسم", icon: <Settings2 />, perms: viewKeys("season") }, "season"),
  ...deskEntries({ href: "/staff/reference", label: "البيانات المرجعية", icon: <Database />, perms: viewKeys("reference") }, "reference"),
  ...deskEntries({ href: "/staff/operational-files", label: "الملفات التشغيلية", icon: <FileStack />, perms: viewKeys("opfiles") }, "opfiles"),
  ...deskEntries({ href: "/staff/content", label: "محتوى الموقع", icon: <PencilLine />, perms: viewKeys("content") }, "content"),
  ...deskEntries({ href: "/staff/registration", label: "التسجيل على الحج", icon: <UserRoundPlus />, perms: viewKeys("office") }, "office"),
  ...deskEntries({ href: "/staff/reviews", label: "مراجعة الطلبات", icon: <ClipboardCheck />, perms: viewKeys("reviews"), badge: "reviews" }, "reviews"),
  ...deskEntries({ href: "/staff/lottery", label: "القبول والقرعة", icon: <Dices />, perms: viewKeys("lottery") }, "lottery"),
  ...deskEntries({ href: "/staff/operations", label: "غرفة العمليات", icon: <RadioTower />, perms: viewKeys("operations"), badge: "tickets" }, "operations"),
  ...deskEntries({ href: "/staff/medical", label: "الفريق الطبي", icon: <HeartPulse />, perms: viewKeys("medical") }, "medical"),
  ...deskEntries({ href: "/staff/transport", label: "المواصلات", icon: <Bus />, perms: viewKeys("transport") }, "transport"),
  ...deskEntries({ href: "/staff/audit", label: "سجل الأحداث", icon: <ScrollText />, perms: viewKeys("audit") }, "audit"),
];

/** Every employee's own page, at the foot of the menu above «تسجيل الخروج»: where he is housed, his flights, his place in Mina and Arafat */
const MY_FILES: NavItem = { href: "/staff/my-files", label: "ملفاتي التشغيلية", icon: <BriefcaseBusiness />, perms: [] };

export function StaffFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const user = useStaffUser();
  // The front page and the sign-in page are open to anyone; every other page needs a signed-in employee
  const isPublic = samePath(pathname, "/staff") || samePath(pathname, "/staff/login");

  useEffect(() => {
    if (hydrated && !user && !isPublic) router.replace("/staff/login");
  }, [hydrated, user, isPublic, router]);

  if (isPublic) return children;
  if (!hydrated || !user) {
    return (
      <div data-dark-page className="grid min-h-[calc(100dvh/var(--zoom))] place-items-center bg-green-dark dark:bg-[#0b1614]">
        <Emblem className="size-20 animate-pulse" animated />
      </div>
    );
  }
  return <Shell user={user}>{children}</Shell>;
}

/** Deep green with the Haram behind it; in the dark theme the same, near black like the rest of the site */
function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#003d36] dark:bg-[#0b1614]">
      <Image src="/images/haram-2022.jpg" alt="" fill sizes="100vw" quality={70} className="object-cover opacity-[.07] dark:opacity-[.04]" />
      <div className="bg-pattern absolute inset-0 opacity-[.07] dark:opacity-[.04]" />
      <div className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-green-light/20 blur-3xl dark:bg-green-light/[.07]" />
      <div className="absolute -left-32 top-1/3 size-[28rem] rounded-full bg-gold/10 blur-3xl dark:bg-gold/[.04]" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#002a25] to-transparent dark:from-[#070f0d]" />
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
  const civil = useCivilClaims().filter((c) => c.claim.status === "pending").length;
  const contracts = useStore((s) => Object.values(s.post).filter((p) => p.contract?.status === "pending").length);
  const tickets = useTicketQueue();
  const halls = useHalls();
  const myCenters = halls.centersOf(user.id);
  const admins = useStore((s) => s.admins);
  const unseen = useSystemsUnseen();
  const flights = useFlightsData();
  const myAirports = useAirportReps().airportsOf(user.id);
  const evaluatees = useEvaluatees(user).items.length;
  const counts = useMemo(
    () => ({
      // Applications that need a decision, civil corrections waiting, and pilgrims' contracts with groups waiting for the office
      reviews: reviews.filter((r) => !r.review).length + civil + contracts,
      tickets: tickets.filter((t) => t.status !== "resolved").length,
      // In my halls' sittings that are open or running: devices asking to enter, and submissions waiting for my confirmation
      hall: Object.entries(halls.runs)
        .filter(([k, r]) => myCenters.some((c) => k.endsWith(`@${c.id}`)) && r.openedAt && !r.endedAt && !r.closedAt)
        .reduce(
          (n, [k, r]) =>
            n +
            Object.keys(r.requests ?? {}).length +
            Object.values(admins).reduce((m, p) => m + [p.exam, ...Object.values(p.exams ?? {})].filter((a) => a?.hall === k && a.status === "submitted").length, 0),
          0,
        ),
      // Flights leaving my airport waiting for their take-off, or in the air to it waiting for their landing
      airport: flights.flights.filter((f) => (myAirports.includes(f.fromId) && f.status === "locked") || (myAirports.includes(f.divertedToId ?? f.toId) && f.status === "departed")).length,
      // What the director has not read yet; what waits for a system's owner is counted by its own badge
      systems: unseen,
      staff: 0,
      registration: 0,
      admins: 0,
      exams: 0,
      flights: 0,
    }),
    [reviews, civil, contracts, tickets, halls.runs, myCenters, admins, flights.flights, myAirports, unseen],
  );
  const grants = useGrantSummary(user);
  const items = STAFF_NAV.filter((n) => canAny(user, n.perms) && (!n.evaluate || evaluatees > 0));
  // A system's statistics and its page sit under its name when both show; one alone needs no heading
  const deskShown = (sys: string) => items.filter((n) => n.desk === sys).length;

  const logout = () => {
    logAs(user, { action: "تسجيل خروج", target: "بوابة الموظفين" });
    actions.staffLogout();
    toast({ title: "تم تسجيل الخروج", body: `إلى اللقاء يا ${user.name.split(" ")[0]}`, tone: "info", icon: "👋" });
    router.push("/staff/login");
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
              {user.grants.length > 0 && (
                <button
                  onClick={() => setShowPerms((v) => !v)}
                  className="mr-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-expanded={showPerms}
                >
                  <ShieldCheck className="size-3" /> {user.grants.length} صلاحية
                  <ChevronDown className={cn("size-3 transition", showPerms && "rotate-180")} />
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {showPerms && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden">
                  {grants.map((p, i) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.04 * i }}
                      className="mt-2 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] text-gold"
                    >
                      {p}
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
          {[...items, MY_FILES].map((n, i, all) => {
            // «/reference» opens its own pages, not «/references»: a segment of the path, not any prefix
            const active = n.exact ? samePath(pathname, n.href) : samePath(pathname, n.href) || pathname.startsWith(`${n.href.replace(/\/$/, "")}/`);
            const count = n.badge ? counts[n.badge] : 0;
            // A management file's entries sit under its name, and a system's statistics and page under its name
            // when both show; what follows a group is set apart from it
            const groupOf = (x?: NavItem) => (x?.system ? x.system : x?.desk && deskShown(x.desk) > 1 ? x.desk : undefined);
            const g = groupOf(n);
            const prev = groupOf(all[i - 1]);
            const label = n.system ? SYSTEMS[n.system].label : g ? PERM_SYSTEM[g]?.label : undefined;
            const heading =
              g && g !== prev && label ? (
                <p key={`g-${g}`} className={cn("hidden px-3.5 pb-1 text-[11px] font-bold tracking-wide text-gold/70 lg:block", i > 0 && "mt-3 border-t border-white/10 pt-3")}>
                  {label}
                </p>
              ) : !g && prev && n !== MY_FILES ? (
                <hr key={`after-${prev}`} className="my-3 hidden border-white/10 lg:block" />
              ) : null;
            return [
              heading,
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition [&_svg]:size-[18px]",
                  active ? "on-light text-ink" : "text-white/75 hover:bg-white/[.06] hover:text-white",
                  n === MY_FILES && "lg:hidden",
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
                {n.badge === "staff" ? (
                  <EmployeesCount active={active} />
                ) : n.badge === "registration" ? (
                  <RegistrationCount active={active} />
                ) : n.badge === "admins" ? (
                  <AdminsCount active={active} />
                ) : n.badge === "exams" ? (
                  <ExamCount active={active} />
                ) : n.badge === "flights" ? (
                  <FlightsCount active={active} />
                ) : n.system && n.area ? (
                  <OperationCount system={n.system} area={n.area} active={active} />
                ) : (
                  <Count n={count} active={active} urgent={n.badge === "tickets" || n.badge === "systems"} />
                )}
              </Link>,
            ];
          })}
        </nav>

        {/* Always last: his own operational files, set apart from the systems above, then «تسجيل الخروج» */}
        <div className="hidden space-y-1 border-t border-white/10 p-3 lg:block">
          <MyFilesLink active={samePath(pathname, MY_FILES.href) || pathname.startsWith(`${MY_FILES.href}/`)} />
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

function MyFilesLink({ active }: { active: boolean }) {
  return (
    <Link
      href={MY_FILES.href}
      aria-current={active ? "page" : undefined}
      className={cn("relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition [&_svg]:size-[18px]", active ? "on-light text-ink" : "text-white/75 hover:bg-white/[.06] hover:text-white")}
    >
      {active && <span className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light shadow-[0_10px_30px_-12px_rgba(217,200,158,.8)]" />}
      <span className={cn("relative", active ? "text-green-dark" : "text-gold/80")}>{MY_FILES.icon}</span>
      <span className="relative whitespace-nowrap">{MY_FILES.label}</span>
    </Link>
  );
}

function Count({ n, active, urgent }: { n: number; active: boolean; urgent?: boolean }) {
  if (n <= 0) return null;
  return <span className={cn("relative mr-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] tabular-nums", urgent ? "bg-maroon text-white" : active ? "bg-green-dark text-white" : "bg-white/15 text-white")}>{n}</span>;
}

/** What waits for a file's holders: computed only where its entry is shown, for them */
function EmployeesCount({ active }: { active: boolean }) {
  const desk = useEmployeesDesk();
  return <Count n={desk.alerts.length} active={active} urgent={desk.high.length > 0} />;
}

function RegistrationCount({ active }: { active: boolean }) {
  const desk = useRegistrationDesk();
  return <Count n={desk.alerts.length} active={active} urgent={desk.high.length > 0} />;
}

function AdminsCount({ active }: { active: boolean }) {
  const desk = useAdminsDesk();
  return <Count n={desk.alerts.length} active={active} urgent={desk.high.length > 0} />;
}

function ExamCount({ active }: { active: boolean }) {
  const desk = useExamDesk();
  return <Count n={desk.alerts.length} active={active} urgent={desk.high.length > 0} />;
}

function FlightsCount({ active }: { active: boolean }) {
  const desk = useFlightsDesk();
  return <Count n={desk.alerts.length} active={active} urgent={desk.high.length > 0} />;
}

/** What waits in one operation of a file, by its desk's part: each file's desk is read only by its own entries */
function OperationCount({ system, area, active }: { system: SystemKey; area: string; active: boolean }) {
  if (system === "admins") return <AdminsArea area={area} active={active} />;
  if (system === "registration") return <RegistrationArea area={area} active={active} />;
  if (system === "exams") return <ExamArea area={area} active={active} />;
  if (system === "flights") return <FlightsArea area={area} active={active} />;
  return <EmployeesArea area={area} active={active} />;
}

function AdminsArea({ area, active }: { area: string; active: boolean }) {
  const desk = useAdminsDesk();
  return <Count n={(desk.badges as Record<string, number>)[area] ?? 0} active={active} />;
}

function RegistrationArea({ area, active }: { area: string; active: boolean }) {
  const desk = useRegistrationDesk();
  return <Count n={(desk.badges as Record<string, number>)[area] ?? 0} active={active} />;
}

function ExamArea({ area, active }: { area: string; active: boolean }) {
  const desk = useExamDesk();
  return <Count n={(desk.badges as Record<string, number>)[area] ?? 0} active={active} />;
}

function FlightsArea({ area, active }: { area: string; active: boolean }) {
  const desk = useFlightsDesk();
  return <Count n={(desk.badges as Record<string, number>)[area] ?? 0} active={active} />;
}

function EmployeesArea({ area, active }: { area: string; active: boolean }) {
  const desk = useEmployeesDesk();
  return <Count n={(desk.badges as Record<string, number>)[area] ?? 0} active={active} />;
}
