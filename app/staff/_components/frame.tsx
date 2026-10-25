"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Menu,
  Search,
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
  X,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { useToast } from "@/components/ui/widgets";
import { useEmployees } from "@/lib/ops";
import { can, type StaffUser } from "@/lib/staff";
import { hasStats, statsKey, viewKeys, PERM_SYSTEM } from "@/lib/permissions";
import { actions, useHydrated, useStore } from "@/lib/store";
import { useMyCirculars } from "@/lib/circulars";
import { useEvaluatees } from "../evaluate/view";
import { useIsCommittee } from "../committee/view";
import { SYSTEMS, SYSTEM_FAMILIES, SYSTEM_KEYS, type SystemKey } from "@/lib/systems";
import { cn, hijriDate, samePath } from "@/lib/utils";
import { useHalls } from "@/app/administrator/_lib/halls";
import { useAirportReps, useFlightsData } from "@/lib/flights";
import { useAdminsDesk } from "../admins/desk";
import { useEmployeesDesk } from "../employees/desk";
import { useExamDesk } from "../exam/_components/desk";
import { useFlightsDesk } from "../flights/desk";
import { useRegistrationDesk } from "../hajj/desk";
import { NavBranchProvider, useOpenBranch } from "./branch";
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
  /** The system this entry belongs to in the menu: the line it hangs from */
  group: string;
  /** What it does, for the menu's search */
  desc?: string;
  /** The other pages that are tabs of this entry: they light it and are reached from the tab bar above them */
  also?: string[];
  /** The desk's parts that count what waits in this entry (one per tab) */
  areas?: string[];
  /** A desk's own page permissions, apart from its statistics': an employee with only the statistics opens the entry on them */
  own?: string[];
  icon: ReactNode;
  perms: string[];
  badge?: "reviews" | "tickets" | "hall" | "airport" | "systems" | SystemKey;
  desk?: string;
  /** Shown to whoever was posted in a tower or a camp that clusters lived in: he rates their administrators after the season */
  evaluate?: true;
  /** Shown to whoever sits on the evaluation committee: assigned to its file */
  committee?: true;
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

/** Every operation path of every file: one that another continues is lit on its own path only */
const OPERATION_HREFS = SYSTEM_KEYS.flatMap((k) => SYSTEMS[k].operations.map((o) => o.href));
const continued = (href: string) => OPERATION_HREFS.some((h) => h !== href && h.startsWith(`${href}/`));

/** A management file in the menu: its summary, then its pages — each matter one entry, its related pages its tabs */
function systemEntries(key: SystemKey): NavItem[] {
  const s = SYSTEMS[key];
  const ops = s.operations.filter((o) => !o.sub);
  const families = SYSTEM_FAMILIES[key] ?? [];
  const familyOf = (href: string) => families.find((f) => f.hrefs.includes(href));
  // The work first, its numbers and record last: a file's pages are for working in, not for reading about
  return [
    ...ops
      .filter((o) => (familyOf(o.href)?.hrefs[0] ?? o.href) === o.href)
      .map((o): NavItem => {
        const f = familyOf(o.href);
        const members = f ? f.hrefs.map((h) => ops.find((x) => x.href === h)!) : [o];
        return {
          href: o.href,
          label: f?.label ?? o.label,
          group: key,
          desc: members.map((m) => `${m.label} ${m.desc}`).join(" "),
          icon: OPERATION_ICONS[o.href] ?? <ScrollText />,
          perms: [...new Set(members.flatMap((m) => m.perms))],
          system: key,
          area: o.area,
          areas: members.map((m) => m.area),
          ...(f && f.hrefs.length > 1 && { also: f.hrefs.slice(1) }),
          ...(continued(o.href) && { exact: true as const }),
        };
      }),
    { href: s.summary.href, label: s.summary.label, group: key, icon: <Gauge />, perms: [`${key}.summary.GET`], system: key, badge: key, exact: true },
  ];
}

/** A system that is not a management file: one entry, its own page, with its statistics as the other tab when it has them */
function deskEntries(item: Omit<NavItem, "group"> & { system?: undefined }, sys: string): NavItem[] {
  if (!hasStats(sys)) return [{ ...item, group: sys, desk: sys }];
  return [{ ...item, group: sys, desk: sys, also: [statsHref(sys)], own: item.perms, perms: [...item.perms, statsKey(sys)] }];
}

export const STAFF_NAV: NavItem[] = [
  // Every system's numbers in one place: at the top for whoever holds it
  { href: "/staff/executive", label: "لوحة الإدارة العليا", group: "executive", icon: <BarChart3 />, perms: viewKeys("executive") },
  { href: "/staff/access", label: "صلاحيات الموظفين", group: "access", icon: <KeyRound />, perms: viewKeys("access"), badge: "systems" },
  // The management files, in the season's order: each file's summary and its operations
  ...SYSTEM_KEYS.flatMap(systemEntries),
  // The field posts: granted for a hall, an airport
  { href: "/staff/hall", label: "قاعتي الامتحانية", group: "hall", icon: <DoorOpen />, perms: ["hall.sittings.GET"], badge: "hall" },
  { href: "/staff/airport", label: "رحلات مطاري", group: "airport", icon: <TowerControl />, perms: ["airport.flights.GET"], badge: "airport" },
  { href: "/staff/evaluate", label: "تقييم الإداريين", group: "evaluate", icon: <Star />, perms: ["evaluate.evaluations.GET"], evaluate: true },
  { href: "/staff/committee", label: "لجنة التقييم", group: "committee", icon: <Scale />, perms: ["evaluate.committee.GET"], committee: true },
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
const MY_FILES: NavItem = { href: "/staff/my-files", label: "ملفاتي التشغيلية", group: "my-files", icon: <BriefcaseBusiness />, perms: [] };

/** Beside it, every employee's decisions and circulars (lib/circulars.ts): what the administration issued to him */
const CIRCULARS: NavItem = { href: "/staff/circulars", label: "القرارات والتعميمات", group: "circulars", icon: <Mails />, perms: [] };

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
      <NavBranchProvider>
        <div className="mx-auto grid max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-6 px-4 pb-20 md:px-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
          <Suspense fallback={<aside className="min-w-0" />}>
            <Sidebar user={user} />
          </Suspense>
          <div className="min-w-0">
            <FamilyTabs user={user} />
            {children}
          </div>
        </div>
      </NavBranchProvider>
    </div>
  );
}

/**
 * The tab bar above a merged entry's pages: the other pages about the same matter, one click apart, each with what waits in it.
 * It shows on the tabs themselves, not on the screens they open (an item being edited), and only when he may open two or more.
 */
function FamilyTabs({ user }: { user: StaffUser }) {
  const pathname = usePathname().replace(/\/+$/, "");
  const family = STAFF_NAV.find((n) => n.also && [n.href, ...n.also].includes(pathname));
  if (!family) return null;
  const hrefs = [family.href, ...(family.also ?? [])];
  const tabs = hrefs
    .map((href) => {
      if (family.system) {
        const op = SYSTEMS[family.system].operations.find((o) => o.href === href);
        return op && { href, label: op.label, perms: op.perms, area: op.area };
      }
      return href.startsWith("/staff/stats/") ? { href, label: "الإحصائيات", perms: [statsKey(family.desk!)], area: undefined } : { href, label: PAGE_LABEL[family.desk ?? ""] ?? family.label, perms: family.own ?? family.perms, area: undefined };
    })
    .filter((t): t is NonNullable<typeof t> => !!t && canAny(user, t.perms));
  if (tabs.length < 2) return null;
  return (
    <nav aria-label={family.label} className="scrollbar-none mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-black/20 p-1 ring-1 ring-white/10">
      {tabs.map((t) => {
        const on = t.href === pathname;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn("relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition", on ? "on-light bg-gradient-to-l from-gold to-gold-light text-ink shadow-md" : "text-white/75 hover:bg-white/[.07] hover:text-white")}
          >
            {t.label}
            {family.system && t.area && <OperationCount system={family.system} areas={[t.area]} active={on} />}
          </Link>
        );
      })}
    </nav>
  );
}

function LiveClock() {
  const now = useNow(1000);
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-2 ring-1 ring-white/10">
      <div>
        <p className="font-display text-xl font-bold tabular-nums tracking-wider text-white" dir="ltr">
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

/**
 * The menu is a tree of three levels, the way the WordPress admin keeps hundreds of pages in a short list:
 * sections of the work (الإدارة العليا، تجهيز الموسم، الحجاج…), each holding systems, each system one line that opens
 * onto its own pages only while it is the one he is in. Whoever holds every permission sees five section headings;
 * whoever holds one system sees that system alone. A search finds any page, sub-pages included, by its name or by what
 * it does.
 */
const SECTIONS: { key: string; label: string; groups: string[] }[] = [
  { key: "top", label: "الإدارة العليا", groups: ["executive", "access", "audit"] },
  { key: "prepare", label: "تجهيز الموسم", groups: ["season", "reference", "opfiles", "content", "staff"] },
  { key: "pilgrims", label: "الحجاج", groups: ["registration", "office", "reviews", "lottery"] },
  { key: "admins", label: "الإداريون والامتحانات", groups: ["admins", "exams", "hall", "evaluate", "committee"] },
  { key: "field", label: "الميدان والعمليات", groups: ["operations", "flights", "airport", "transport", "medical"] },
];

const GROUP_ICON: Record<string, ReactNode> = {
  executive: <BarChart3 />,
  access: <KeyRound />,
  audit: <ScrollText />,
  staff: <IdCard />,
  registration: <ListTree />,
  admins: <BadgeCheck />,
  exams: <Landmark />,
  flights: <Plane />,
  season: <Settings2 />,
  reference: <Database />,
  opfiles: <FileStack />,
  content: <PencilLine />,
  office: <UserRoundPlus />,
  reviews: <ClipboardCheck />,
  lottery: <Dices />,
  operations: <RadioTower />,
  medical: <HeartPulse />,
  transport: <Bus />,
  hall: <DoorOpen />,
  airport: <TowerControl />,
  evaluate: <Star />,
  committee: <Scale />,
};

/** What a system's own page is called under its name, beside its statistics */
const PAGE_LABEL: Record<string, string> = {
  season: "الإعدادات",
  reference: "القوائم",
  opfiles: "الملفات",
  content: "الصفحات",
  office: "التسجيل",
  reviews: "الطلبات",
  lottery: "القرعة",
  operations: "البلاغات",
  medical: "العمل الطبي",
  transport: "النقل",
  audit: "السجل",
};

/** How a system or a section unfolds and folds in the menu: its height and its lines, eased */
const UNFOLD = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1, transition: { height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.2, delay: 0.05 } } },
  exit: { height: 0, opacity: 0, transition: { height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.12 } } },
} as const;

type NavGroup = { key: string; label: string; icon: ReactNode; items: NavItem[]; main: NavItem };

const isStats = (n: NavItem) => !!n.desk && n.href.startsWith("/staff/stats/");

/** The entries he may see, gathered by the system they belong to */
function groupsOf(items: NavItem[]): NavGroup[] {
  const by = new Map<string, NavItem[]>();
  for (const n of items) by.set(n.group, [...(by.get(n.group) ?? []), n]);
  return [...by].map(([key, list]) => {
    const page = list.find((n) => !isStats(n));
    const main = list.find((n) => n.system && n.area) ?? list.find((n) => n.system) ?? page ?? list[0];
    const label = main.system ? SYSTEMS[main.system].label : page?.label ?? PERM_SYSTEM[key]?.label ?? main.label;
    return { key, label, icon: GROUP_ICON[key] ?? main.icon, items: list, main };
  });
}

/** An entry's name under its system: a lone entry takes the system's own name */
const shownLabel = (g: NavGroup, n: NavItem) => (g.items.length === 1 ? g.label : n.system || isStats(n) ? n.label : PAGE_LABEL[g.key] ?? n.label);

function ItemBadge({ n, active, counts }: { n: NavItem; active: boolean; counts: Record<string, number> }) {
  if (n.badge === "staff") return <EmployeesCount active={active} />;
  if (n.badge === "registration") return <RegistrationCount active={active} />;
  if (n.badge === "admins") return <AdminsCount active={active} />;
  if (n.badge === "exams") return <ExamCount active={active} />;
  if (n.badge === "flights") return <FlightsCount active={active} />;
  if (n.system && n.area) return <OperationCount system={n.system} areas={n.areas ?? [n.area]} active={active} />;
  return <Count n={n.badge ? counts[n.badge] ?? 0 : 0} active={active} urgent={n.badge === "tickets" || n.badge === "systems"} />;
}

function Sidebar({ user }: { user: StaffUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [showPerms, setShowPerms] = useState(false);
  const params = useSearchParams();
  // What he opened or closed by hand on this page; a new page forgets it and opens the system it belongs to
  const [manual, setManual] = useState<{ path: string; group?: string; open?: boolean; sections: Record<string, boolean>; menu?: boolean; query: string }>({ path: pathname, sections: {}, query: "" });
  const here = manual.path === pathname ? manual : { path: pathname, sections: {}, query: "" };
  const patch = (p: Partial<typeof manual>) => setManual({ ...here, ...p });
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
  const onCommittee = useIsCommittee(user);
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
    }),
    [reviews, civil, contracts, tickets, halls.runs, myCenters, admins, flights.flights, myAirports, unseen],
  ) as Record<string, number>;
  const grants = useGrantSummary(user);
  const unreadCirculars = useMyCirculars(user).filter((c) => !c.reads?.[user.id]).length;
  const items = STAFF_NAV.filter((n) => canAny(user, n.perms) && (!n.evaluate || evaluatees > 0) && (!n.committee || onCommittee)).map((n) =>
    // A desk he holds only the statistics of opens on them
    n.own && n.also && !canAny(user, n.own) ? { ...n, href: n.also[0], also: [n.href], exact: true as const } : n,
  );
  const groups = groupsOf(items);
  const sections = SECTIONS.map((s) => ({ ...s, groups: s.groups.map((k) => groups.find((g) => g.key === k)).filter((g): g is NavGroup => !!g) })).filter((s) => s.groups.length);
  // A system the sections do not list is never lost: it joins the last one
  const unlisted = groups.filter((g) => !SECTIONS.some((s) => s.groups.includes(g.key)));
  if (unlisted.length && sections.length) sections[sections.length - 1].groups.push(...unlisted);
  // The employee whose page is open: his record (?id=), his season or register line (?e=), or his account (?a=)
  const people = useEmployees();
  const picked = employeeOf(pathname, params, people);
  // «/reference» opens its own pages, not «/references»: a segment of the path, not any prefix
  // An entry is lit on its own page and on each of its tabs; a path another page continues is lit on itself only
  const matchLen = (n: NavItem) =>
    [n.href, ...(n.also ?? [])].reduce((best, h) => {
      const exact = h === n.href ? !!n.exact : continued(h) || h.startsWith("/staff/stats/");
      const on = samePath(pathname, h) || (!exact && pathname.startsWith(`${h.replace(/\/$/, "")}/`));
      return on ? Math.max(best, h.length) : best;
    }, -1);
  const isOn = (n: NavItem) => matchLen(n) >= 0;
  const activeItem = items.filter(isOn).sort((a, b) => matchLen(b) - matchLen(a))[0];
  // A sub-page («إضافة صفحة») is no entry of its own: it belongs to the system whose path it continues
  const inSystem = items.find((n) => n.system && (samePath(pathname, SYSTEMS[n.system].summary.href) || pathname.startsWith(`${SYSTEMS[n.system].summary.href}/`)));
  const activeGroup = activeItem?.group ?? inSystem?.group;
  const groupOpen = (k: string) => (here.group === k && here.open !== undefined ? here.open : k === activeGroup);
  // Few systems need no folding: everything shows. Many fold into sections, the one he is in open
  const fold = groups.length > 7;
  const sectionOpen = (s: { key: string; groups: NavGroup[] }) => here.sections[s.key] ?? (!fold || s.groups.some((g) => g.key === activeGroup));
  // The sub-page that is open hangs from its main page: the item whose path is the sub-page's list, else the nearest one above it.
  // An employee has a branch of his own (his pages), so his sub-page does not hang twice
  const branch = useOpenBranch();
  const anchorHref = branch
    ? items
        .flatMap((n) => [n.href, ...(n.also ?? [])].filter((h) => h === branch.anchor || branch.anchor.startsWith(`${h.replace(/\/$/, "")}/`)).map((h) => ({ n, h })))
        .sort((a, b) => Number(b.h === branch.anchor) - Number(a.h === branch.anchor) || b.h.length - a.h.length)[0]?.n.href
    : undefined;
  // The page he is on is brought into view inside the menu's own scroll, never moving the page itself
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !on) return;
    const n = nav.getBoundingClientRect();
    const r = on.getBoundingClientRect();
    if (r.top < n.top || r.bottom > n.bottom) nav.scrollTop += r.top - n.top - n.height / 3;
  }, [pathname, activeGroup]);
  const activeGroupDef = groups.find((g) => g.key === activeGroup);
  const query = here.query.trim();
  const found = query
    ? items.filter((n) => {
        const g = groups.find((x) => x.key === n.group)!;
        return [n.label, g.label, shownLabel(g, n), n.desc ?? ""].some((t) => t.includes(query));
      })
    : [];

  const logout = () => {
    logAs(user, { action: "تسجيل خروج", target: "بوابة الموظفين" });
    actions.staffLogout();
    toast({ title: "تم تسجيل الخروج", body: `إلى اللقاء يا ${user.name.split(" ")[0]}`, tone: "info", icon: "👋" });
    router.push("/staff/login");
  };

  /** One entry as a line: a system's own line, or one of its pages under it */
  const line = (g: NavGroup, n: NavItem, child: boolean, withGroup = false) => {
    // A page with its sub-page open is not the one he is on: the leaf under it is
    const hasLeaf = !!branch && n.href === anchorHref && groupOpen(g.key) && !(picked && n.system === "staff" && n.area === "register");
    const active = isOn(n) && n === activeItem && !hasLeaf;
    return [
      <Link
        key={n.href}
        href={n.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition [&_svg]:size-[18px]",
          child && "gap-2.5 rounded-xl px-3 py-2 text-[13px] [&_svg]:size-4",
          active ? "on-light text-ink" : hasLeaf ? "text-white hover:bg-white/[.06]" : "text-white/75 hover:bg-white/[.06] hover:text-white",
        )}
      >
        {active && (
          <motion.span
            layoutId={query ? undefined : "staff-nav"}
            className={cn("absolute inset-0 bg-gradient-to-l from-gold to-gold-light shadow-[0_10px_30px_-12px_rgba(217,200,158,.8)]", child ? "rounded-xl" : "rounded-2xl")}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          />
        )}
        <span className={cn("relative", active ? "text-green-dark" : "text-gold/80")}>{child || withGroup ? n.icon : g.icon}</span>
        <span className="relative min-w-0 flex-1 truncate">
          {shownLabel(g, n)}
          {withGroup && g.items.length > 1 && <span className={cn("me-1.5 text-[11px] font-normal", active ? "text-ink/60" : "text-white/45")}> · {g.label}</span>}
        </span>
        <ItemBadge n={n} active={active} counts={counts} />
      </Link>,
      // The register's own branch: the employee chosen there, and his pages
      !withGroup && n.system === "staff" && n.area === "register" && picked && groupOpen(g.key) ? <EmployeeBranch key="employee-branch" user={user} employee={picked} pathname={pathname} /> : null,
      !withGroup && hasLeaf ? <PageBranch key="page-branch" title={branch!.title} closeHref={branch!.closeHref ?? branch!.anchor} /> : null,
    ];
  };

  /** A system: its own line when it has nothing under it, else a heading that opens onto its pages */
  const groupBlock = (g: NavGroup) => {
    if (g.items.length === 1) return <div key={g.key}>{line(g, g.items[0], false)}</div>;
    const open = groupOpen(g.key);
    const inside = g.key === activeGroup;
    const badged = g.items.find((x) => x.badge);
    return (
      <div key={g.key}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            // Entering a system opens it on its first page; the one he is in folds and unfolds
            if (inside) patch({ group: g.key, open: !open });
            else router.push(g.main.href);
          }}
          className={cn("flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition [&_svg]:size-[18px]", inside ? "bg-white/[.09] text-white" : "text-white/75 hover:bg-white/[.06] hover:text-white")}
        >
          <span className="text-gold/80">{g.icon}</span>
          <span className="min-w-0 flex-1 truncate text-start">{g.label}</span>
          {!open && badged && <ItemBadge n={badged} active={false} counts={counts} />}
          <ChevronDown className={cn("size-3.5 shrink-0 text-white/50 transition-transform duration-300", !open && "rotate-90")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div key="pages" {...UNFOLD} className="overflow-hidden">
              <div className="mr-5 mt-1 space-y-0.5 border-r-2 border-white/10 pr-2">{g.items.map((n) => line(g, n, true))}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
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
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                  {grants.map((p, i) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(0.04 * i, 0.6) }}
                      className="mt-2 inline-block rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] text-gold"
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

          {/* On a phone the menu folds away behind its button, which names the page he is on */}
          <button
            type="button"
            onClick={() => patch({ menu: !here.menu })}
            aria-expanded={!!here.menu}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/[.07] px-4 py-3 text-sm font-bold ring-1 ring-white/10 lg:hidden"
          >
            <span className="flex items-center gap-2">
              <Menu className="size-5 text-gold" /> القائمة
            </span>
            <span className="truncate text-xs font-normal text-white/60">{activeItem && activeGroupDef ? shownLabel(activeGroupDef, activeItem) : ""}</span>
          </button>

          {items.length > 8 && (
            <label className={cn("relative lg:block", here.menu ? "block" : "hidden")}>
              <span className="sr-only">ابحث عن صفحة</span>
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/45" />
              <input
                value={here.query}
                onChange={(e) => patch({ query: e.target.value })}
                onKeyDown={(e) => e.key === "Escape" && patch({ query: "" })}
                placeholder="ابحث عن صفحة…"
                className="h-10 w-full rounded-xl bg-white/[.07] pr-9 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/40 focus:ring-gold/60"
              />
            </label>
          )}
        </div>

        {/* Navigation — sections of systems, the one he is in open; a search turns it into a list of what matches */}
        <nav ref={navRef} aria-label="أقسام بوابة الموظفين" className={cn("space-y-1 px-3 pb-3 [scrollbar-width:thin] lg:block lg:max-h-[calc(100dvh/var(--zoom)-31rem)] lg:min-h-[12rem] lg:overflow-y-auto", here.menu ? "block" : "hidden")}>
          {query ? (
            found.length ? (
              found.map((n) => <div key={n.href}>{line(groups.find((g) => g.key === n.group)!, n, false, true)}</div>)
            ) : (
              <p className="px-3 py-4 text-center text-xs text-white/55">لا صفحة بهذا الاسم بين ما تملكه.</p>
            )
          ) : sections.length > 1 && fold ? (
            sections.map((s) => {
              const open = sectionOpen(s);
              return (
                <div key={s.key} className="[&:not(:first-child)]:mt-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-white/10 [&:not(:first-child)]:pt-2">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => patch({ sections: { ...here.sections, [s.key]: !open } })}
                    className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-xs font-bold tracking-wide text-gold transition hover:bg-white/[.06]"
                  >
                    <span>
                      {s.label} <span className="font-normal text-white/40">({s.groups.length})</span>
                    </span>
                    <ChevronDown className={cn("size-3.5 transition-transform duration-300", !open && "rotate-90")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div key="systems" {...UNFOLD} className="overflow-hidden">
                        <div className="space-y-0.5 pb-1">{s.groups.map(groupBlock)}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            sections.flatMap((s) => s.groups).map(groupBlock)
          )}
          {/* On a phone his own files are the last line of the menu; on a desktop they sit at its foot */}
          <div className="space-y-1 lg:hidden">
            <FootLink item={CIRCULARS} active={samePath(pathname, CIRCULARS.href)} count={unreadCirculars} />
            <FootLink item={MY_FILES} active={samePath(pathname, MY_FILES.href) || pathname.startsWith(`${MY_FILES.href}/`)} />
          </div>
        </nav>

        {/* Always last: his own operational files, set apart from the systems above, then «تسجيل الخروج» */}
        <div className="hidden space-y-1 border-t border-white/10 p-3 lg:block">
          <FootLink item={CIRCULARS} active={samePath(pathname, CIRCULARS.href)} count={unreadCirculars} />
          <FootLink item={MY_FILES} active={samePath(pathname, MY_FILES.href) || pathname.startsWith(`${MY_FILES.href}/`)} />
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

/** The open sub-page under its main page, as a leaf of the tree: it is where he is, so it is lit; «×» closes it */
function PageBranch({ title, closeHref }: { title: string; closeHref: string }) {
  return (
    <div className="mr-5 border-r-2 border-gold/30 pr-2">
      <div className="on-light relative flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-ink">
        <span className="absolute inset-0 rounded-xl bg-gradient-to-l from-gold to-gold-light" />
        <span className="relative min-w-0 flex-1 truncate" title={title}>
          {title}
        </span>
        <Link href={closeHref} aria-label="إغلاق" title="إغلاق" className="relative grid size-6 shrink-0 place-items-center rounded-lg text-green-dark/70 hover:bg-black/10 hover:text-green-dark">
          <X className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

type Person = ReturnType<typeof useEmployees>[number];

/** The employee whose page is open, read from the address: his record (?id=), his lines (?e=) or his account (?a=) */
function employeeOf(pathname: string, params: URLSearchParams, people: Person[]): Person | undefined {
  if (!pathname.startsWith("/staff/employees/manage")) return undefined;
  const id = params.get("id") ?? params.get("e");
  const account = params.get("a");
  return (id ? people.find((e) => e.id === id) : undefined) ?? (account ? people.find((e) => e.staffId === account) : undefined);
}

/**
 * Under «سجل الموظفين», the employee chosen there: his name, and the pages that are his — his record, his account,
 * his place in the season. The register picks him; the pages read him from the address, so a link opens them too.
 * «✕» closes the branch, back to the register.
 */
function EmployeeBranch({ user, employee, pathname }: { user: StaffUser; employee: Person; pathname: string }) {
  const base = "/staff/employees/manage";
  const links = [
    { href: `${base}/edit?id=${employee.id}`, at: `${base}/edit`, label: "بياناته", icon: <IdCard />, show: can(user, "staff.employees.GET") },
    { href: `${base}/accounts?a=${employee.staffId}`, at: `${base}/accounts`, label: "حسابه", icon: <KeyRound />, show: !!employee.staffId && can(user, "staff.accounts.GET") },
    { href: `${base}/season?e=${employee.id}`, at: `${base}/season`, label: "مشاركته في الموسم", icon: <CalendarCheck />, show: can(user, "staff.season-participation.GET") },
  ].filter((l) => l.show);
  return (
    <div className="mr-5 space-y-1 border-r-2 border-gold/30 pr-2" aria-label={`صفحات ${employee.firstName} ${employee.surname}`}>
      <div className="flex items-center justify-between gap-2 px-3 pt-1 text-xs font-bold text-gold">
        <span className="truncate">
          {employee.firstName} {employee.surname}
        </span>
        <Link href={base} aria-label="إغلاق صفحات الموظف" title="إغلاق" className="grid size-6 shrink-0 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
          <X className="size-3.5" />
        </Link>
      </div>
      {links.map((l) => {
        const active = samePath(pathname, l.at);
        return (
          <Link
            key={l.at}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-bold transition [&_svg]:size-4", active ? "on-light text-ink" : "text-white/75 hover:bg-white/[.06] hover:text-white")}
          >
            {active && <span className="absolute inset-0 rounded-xl bg-gradient-to-l from-gold to-gold-light" />}
            <span className={cn("relative", active ? "text-green-dark" : "text-gold/80")}>{l.icon}</span>
            <span className="relative whitespace-nowrap">{l.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** One of every employee's own pages at the menu's foot: his decisions and circulars, his operational files */
function FootLink({ item, active, count = 0 }: { item: NavItem; active: boolean; count?: number }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition [&_svg]:size-[18px]", active ? "on-light text-ink" : "text-white/75 hover:bg-white/[.06] hover:text-white")}
    >
      {active && <span className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light shadow-[0_10px_30px_-12px_rgba(217,200,158,.8)]" />}
      <span className={cn("relative", active ? "text-green-dark" : "text-gold/80")}>{item.icon}</span>
      <span className="relative whitespace-nowrap">{item.label}</span>
      <Count n={count} active={active} urgent />
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

/** What waits in one entry of a file, by its desk's parts (one for each tab): each file's desk is read only by its own entries */
function OperationCount({ system, areas, active }: { system: SystemKey; areas: string[]; active: boolean }) {
  if (system === "admins") return <AdminsArea areas={areas} active={active} />;
  if (system === "registration") return <RegistrationArea areas={areas} active={active} />;
  if (system === "exams") return <ExamArea areas={areas} active={active} />;
  if (system === "flights") return <FlightsArea areas={areas} active={active} />;
  return <EmployeesArea areas={areas} active={active} />;
}

const sumOf = (badges: object, areas: string[]) => areas.reduce((n, a) => n + ((badges as Record<string, number>)[a] ?? 0), 0);

function AdminsArea({ areas, active }: { areas: string[]; active: boolean }) {
  const desk = useAdminsDesk();
  return <Count n={sumOf(desk.badges, areas)} active={active} />;
}

function RegistrationArea({ areas, active }: { areas: string[]; active: boolean }) {
  const desk = useRegistrationDesk();
  return <Count n={sumOf(desk.badges, areas)} active={active} />;
}

function ExamArea({ areas, active }: { areas: string[]; active: boolean }) {
  const desk = useExamDesk();
  return <Count n={sumOf(desk.badges, areas)} active={active} />;
}

function FlightsArea({ areas, active }: { areas: string[]; active: boolean }) {
  const desk = useFlightsDesk();
  return <Count n={sumOf(desk.badges, areas)} active={active} />;
}

function EmployeesArea({ areas, active }: { areas: string[]; active: boolean }) {
  const desk = useEmployeesDesk();
  return <Count n={sumOf(desk.badges, areas)} active={active} />;
}
