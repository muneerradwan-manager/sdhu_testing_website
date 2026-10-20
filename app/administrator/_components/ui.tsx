"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  BellRing,
  Bus,
  Eye,
  ClipboardList,
  BookMarked,
  BookOpenText,
  CalendarClock,
  Megaphone,
  Siren,

  FileSignature,
  FlaskConical,
  FolderOpen,
  Globe,
  Images,
  GraduationCap,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Mails,
  MapPinned,
  MessagesSquare,
  ScrollText,
  Stamp,
  Star,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { PortalShell } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { useOperations, type OperationKey, type OperationState } from "@/lib/operations";
import { actions, getState, useHydrated, useStore, type AdminProfile } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { isClusterRole, isTechCoordinator, servedBefore, useAdmin } from "../_lib/admin";
import { useClusterChannel } from "../_lib/channel";
import { AccountSidebar } from "@/app/portal/_components/account-sidebar";
import { groupPagesOf, myGroupNumbers, pageWriterOf } from "../_lib/directory";
import { scopeOf } from "../_lib/scope";
import { permissionRole, useRolePermissions, type AdminPermission } from "../_lib/permissions";

// ───────────────────────── Guard ─────────────────────────

export function AdminGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  // The account's one session; his administrative file is what opens these pages
  const sessionId = useStore((s) => s.sessionId);
  const hasProfile = useStore((s) => !!(s.sessionId && s.admins[s.sessionId]));
  // An account the administration stopped or deleted («الكادر الإداري») opens nothing
  const stopped = useStore((s) => (s.sessionId ? s.cadre.status[s.sessionId] : undefined));
  const router = useRouter();
  const pathname = usePathname();
  const ok = !!sessionId && hasProfile;

  useEffect(() => {
    if (!hydrated || ok) return;
    // Signed in without an administrative file: he opens it from his account, choosing the administrators' way this season
    router.replace(sessionId ? "/portal?choose=admin" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, ok, sessionId, router, pathname]);

  // While his portal is open he is «متصل الآن» on the staff's roster, and his last moment stays «آخر ظهور»
  useEffect(() => {
    if (!ok || !sessionId || stopped) return;
    const beat = () => actions.seen(sessionId, Date.now());
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, [ok, sessionId, stopped]);

  if (hydrated && ok && stopped) {
    return (
      <div className="grid min-h-[calc(80vh/var(--zoom))] place-items-center bg-maroon-dark px-4 py-32">
        <div className="max-w-lg rounded-[2rem] border border-gold/40 bg-white p-8 text-center">
          <Lock className="mx-auto size-12 text-maroon" />
          <h1 className="mt-4 font-display text-2xl font-bold text-green-dark">{stopped.state === "disabled" ? "حسابك موقوف من الإدارة" : "حسابك محذوف من الكادر"}</h1>
          <p className="mt-3 leading-8 text-ink-soft">السبب: {stopped.reason}. راجع فرعك أو قسم شؤون المجموعات والتكتلات ليُفعَّل.</p>
          <button type="button" onClick={() => actions.adminLogout()} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-green-dark px-5 py-3 font-bold text-white">
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  if (!hydrated || !ok) {
    return (
      <div className="grid min-h-[calc(80vh/var(--zoom))] place-items-center bg-maroon-dark">
        <div className="flex flex-col items-center gap-4 text-gold">
          <Emblem className="size-20 animate-pulse" animated />
          <span className="text-sm">نتحقق من جلسة الإداري...</span>
        </div>
      </div>
    );
  }
  return children;
}

// ───────────────────────── Shell & navigation ─────────────────────────

/**
 * The administrator's sidebar, like the staff portal's: each entry is one operation of its own — registering
 * pilgrims on the Hajj, registering as an administrator, the exams, forming groups, forming clusters, managing
 * them — shown to whoever it belongs to. They are not stages of one chain: each opens and closes by its own
 * dates, or by the staff who control it (lib/operations.ts), and a closed one stays in the menu with when it
 * opens. Stages exist only inside an operation that has several steps.
 */
type NavCtx = { p: AdminProfile | undefined; head: boolean; tech: boolean; cluster: boolean; /** Follows the operations only: the cluster's head, its assistant, its accountant */ viewer: boolean; /** A guide or a female guide: the religious lessons and activities only */ guide: boolean; inGroup: boolean; role: boolean; register: boolean; served: boolean; /** Works in a cluster: its channel opens */ inChannel: boolean; /** Signed a group's or a cluster's contract */ contracts: boolean };

type NavItem = {
  href: string;
  label: string | ((c: NavCtx) => string);
  icon: LucideIcon;
  ops?: OperationKey[];
  show?: (c: NavCtx) => boolean;
};

const serving = (c: NavCtx) => c.inGroup || c.cluster;
/** The operations: everyone placed but the guides, who have the religious lessons and activities only */
const operating = (c: NavCtx) => serving(c) && !c.guide;
/**
 * A group head has one group, and so has a guide or an assistant in its seat: the plural is only for whoever
 * serves several (a coordinator or a female guide, distributed on groups). A cluster assistant works for the whole cluster.
 */
const groupsTab = (c: NavCtx) =>
  c.p?.servesIn?.role === "cluster-assistant" ? "مجموعات التكتل" : (c.p?.coordinatorIn?.groups.length ?? c.p?.servesIn?.groups.length ?? 1) > 1 ? "إدارة المجموعات" : "إدارة المجموعة";
/** A cluster's head opens its groups — each with its team and pilgrims — inside «إدارة التكتل» */
const ownGroups = (c: NavCtx) => c.inGroup && !c.cluster && !c.guide;

const NAV: NavItem[] = [
  { href: "/portal", label: "ملفي", icon: LayoutDashboard },
  // The permanent file of whoever served before: his documents, languages and skills between seasons
  { href: "/portal/files", label: "وثائقي ومهاراتي", icon: FolderOpen, show: (c) => c.served },
  // His own: what reached him, and what he did — each a tab, not a card inside «ملفي»
  { href: "/portal/notifications", label: "الإشعارات", icon: BellRing },
  { href: "/portal/activity", label: "سجل نشاطي", icon: ScrollText },
  // His letters to the administration and its replies
  { href: "/portal/letters", label: "المراسلات", icon: Mails },
  // Registering a pilgrim on the Hajj never puts him in a group
  { href: "/portal/pilgrims", label: "التسجيل على الحج", icon: UserRoundPlus, ops: ["hajj-direct", "hajj-lottery"], show: (c) => c.register },
  { href: "/portal/role", label: "التسجيل كإداري", icon: ClipboardList, ops: ["admin-registration"] },
  { href: "/portal/exam", label: "الاختبار المؤتمت والشفهي", icon: GraduationCap, ops: ["admin-exams", "admin-orals"] },
  { href: "/portal/groups", label: groupsTab, icon: UsersRound, ops: ["group-management"], show: ownGroups },
  { href: "/portal/clusters", label: "إدارة التكتل", icon: Landmark, ops: ["cluster-management"], show: (c) => c.cluster },
  // The groups and the clusters are formed at the office, each with its paper contract that everyone in it signs
  { href: "/portal/my-contracts", label: "العقود", icon: FileSignature, show: (c) => c.contracts },
  // Everyone in a cluster reads its channel; who writes is by role, as its head sets it
  { href: "/portal/channel", label: "قناة التكتل", icon: MessagesSquare, show: (c) => c.inChannel },
  // What the pilgrims read of the cluster: its team writes it once it is approved, the administration approves it
  { href: "/portal/cluster-page", label: "صفحة التكتل العامة", icon: Globe, show: (c) => !!pageWriterOf(c.p) },
  // The groups' own: their pictures, words and galleries — the cluster's head all its groups', a group's head or assistant his
  { href: "/portal/group-page", label: (c) => ((groupPagesOf(c.p)?.groups.length ?? 0) > 1 ? "صفحات المجموعات العامة" : "صفحة المجموعة العامة"), icon: Images, show: (c) => !!groupPagesOf(c.p) },
  { href: "/portal/requests", label: (c) => (c.head ? "حجاج المجموعة" : "حجاج مجموعاتي"), icon: HeartHandshake, ops: ["group-joining"], show: ownGroups },
  // The visas the Saudi foreign ministry emails to the group's head, added by him to each of his pilgrims
  { href: "/portal/visas", label: "التأشيرات", icon: Stamp, show: operating },
  // The flights out and back, then before each rite who goes and on which of the buses the Hajj and Umrah staff
  // gave — the coordinator's; a group's head and assistant see their group's, the cluster's head follows
  { href: "/portal/lists", label: "القوائم", icon: Bus, show: operating },
  // The group's records after each rite, visit and leg of the journey: its coordinator and its head record them
  { href: "/portal/field", label: "الميدان", icon: MapPinned, show: operating },
  // The group's day, which every administrator who works in it uses: its channel, a report to the operations room, his day
  { href: "/portal/group-channel", label: "قناة المجموعة", icon: Megaphone, show: serving },
  { href: "/portal/report", label: "بلاغ لغرفة العمليات", icon: Siren, show: serving },
  { href: "/portal/my-day", label: "يومي", icon: CalendarClock, show: serving },
  // The guides' lessons to their groups' pilgrims, with who came; the heads follow them
  { href: "/portal/guide-lessons", label: "الدروس الدينية", icon: BookOpenText, show: serving },
  // What they follow pilgrim by pilgrim: memorising the Quran and hadith, the supplications, a shared reading
  { href: "/portal/activities", label: "النشاطات الدينية", icon: BookMarked, show: serving },
  // After the season: his self-evaluation, his cadre's if he heads a cluster, and his result
  { href: "/portal/evaluation", label: "التقييم بعد الموسم", icon: Star, ops: ["self-evaluation", "peer-evaluation"], show: serving },
];

function navCtx(id: string | undefined, p: AdminProfile | undefined, table: Record<AdminPermission, string[]>, inChannel: boolean): NavCtx {
  const role = p?.positions[0];
  const cluster = isClusterRole(p);
  const head = role === "group-head";
  const tech = isTechCoordinator(p);
  // A head's group counts once it is approved; a guide, an assistant or a coordinator works in the groups assigned to him
  const inGroup = head ? !!p?.group?.approvedAt : !!p?.servesIn || !!p?.coordinatorIn;
  const contracts = inChannel || inGroup || (!!id && myGroupNumbers(id, p, getState().admins).length > 0);
  const kind = scopeOf(p).kind;
  return { p, head, tech, cluster, viewer: kind === "cluster", guide: kind === "guide", inGroup, role: !!role, register: !!role && table["pilgrims.register"].includes(permissionRole(p)), served: !!id && servedBefore(id), inChannel, contracts };
}

export type AdminNavEntry = { href: string; label: string; icon: LucideIcon; open: boolean; shown?: OperationState; /** Unread, beside the label */ badge?: number };

/** The operations this administrator sees, each with its state now: the open one, else the next to open, else the last closed */
export function useAdminNav(): AdminNavEntry[] {
  const admin = useAdmin();
  const ops = useOperations();
  const table = useRolePermissions();
  const channel = useClusterChannel(admin?.id, admin?.profile);
  const ctx = navCtx(admin?.id, admin?.profile, table, !!channel);
  return NAV.filter((n) => !n.show || n.show(ctx)).map((n) => {
    const states = n.ops ? ops.filter((o) => n.ops!.includes(o.key)) : [];
    return {
      href: n.href,
      label: typeof n.label === "function" ? n.label(ctx) : n.label,
      icon: n.icon,
      open: !states.length || states.some((o) => o.open),
      shown: states.find((o) => o.open) ?? states.find((o) => o.status === "upcoming") ?? states.at(-1),
      badge: n.href === "/portal/channel" ? channel?.unread : undefined,
    };
  });
}

export function AdminShell({
  title,
  subtitle,
  image = "/images/umayyad-courtyard.jpg",
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string;
  children: ReactNode;
}) {
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
        <AccountSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </PortalShell>
  );
}

// ───────────────────────── Bits ─────────────────────────

/** A screen this administrator now finds elsewhere (an old link, a notification): he is taken there */
export function MovedTo({ href, title }: { href: string; title: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <AdminShell title={title}>
      <p className="rounded-2xl bg-sand p-5 text-center text-ink-soft">ننقلك إلى «{title}»…</p>
    </AdminShell>
  );
}

export function LockedCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] border border-gold/30 bg-white p-8 text-center shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-14">
      <div className="bg-pattern-dark absolute inset-0" />
      <div className="relative">
        <motion.span initial={{ rotate: -20, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-20 place-items-center rounded-3xl bg-sand text-gold-dark">
          <Lock className="size-9" />
        </motion.span>
        <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl leading-8 text-ink-soft">{text}</p>
        <ButtonLink href={href} size="lg" className="mt-7">
          {cta}
        </ButtonLink>
      </div>
    </motion.div>
  );
}

/** Over a page its reader follows without acting: the cluster's head, its assistant and its accountant */
export function ViewOnlyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 flex items-start gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm leading-7 text-ink-soft">
      <Eye className="mt-1 size-4 shrink-0 text-gold-dark" /> <span>{children}</span>
    </p>
  );
}

/** Clearly-labelled simulation control, so nobody mistakes it for the real flow */
export function SimButton({ children, onClick, disabled, className }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-maroon/40 bg-maroon/5 px-4 py-2.5 text-sm font-bold text-maroon transition hover:border-maroon hover:bg-maroon/10 disabled:opacity-50",
        className,
      )}
    >
      <FlaskConical className="size-4" /> {children}
    </button>
  );
}

export function ReceiptCard({
  receipt,
  item,
  amount,
  lines = [],
  className,
}: {
  receipt: string;
  item: string;
  amount: number;
  lines?: [string, string][];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ rotateX: 70, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 16 }}
      className={cn("mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-gold/50 bg-white shadow-2xl [transform-origin:top]", className)}
    >
      <div className="relative bg-gradient-to-l from-maroon-dark to-maroon p-5 text-white">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <p className="relative text-sm text-gold">إيصال رقمي — المنصة الوطنية للحج</p>
        <p className="relative font-mono text-2xl font-bold" dir="ltr">{receipt}</p>
      </div>
      <div className="perforated h-5 bg-white" />
      <div className="flex items-center gap-5 p-5">
        <div className="shrink-0 rounded-xl border border-gold/40 p-2">
          <QRCodeSVG value={`https://hajj-demo.sy/verify/${receipt}`} size={92} fgColor="#672146" />
        </div>
        <dl className="min-w-0 space-y-1.5 text-sm">
          <div><dt className="inline text-hint">البند: </dt><dd className="inline font-bold">{item}</dd></div>
          <div><dt className="inline text-hint">المبلغ: </dt><dd className="inline font-bold text-green-dark">{formatUSD(amount)}</dd></div>
          {lines.map(([k, v]) => (
            <div key={k}><dt className="inline text-hint">{k}: </dt><dd className="inline font-bold">{v}</dd></div>
          ))}
          <div><dt className="inline text-hint">الحالة: </dt><dd className="inline font-bold text-green">مسدد ✓</dd></div>
        </dl>
      </div>
    </motion.div>
  );
}

export function SectionTitle({ icon: Icon, children, action }: { icon: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark md:text-2xl">
        <Icon className="size-6 text-gold-dark" /> {children}
      </h2>
      {action}
    </div>
  );
}
