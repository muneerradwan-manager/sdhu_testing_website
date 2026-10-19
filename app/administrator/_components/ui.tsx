"use client";

import Link from "next/link";
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
import { statusLabel, useOperations, type OperationKey, type OperationState } from "@/lib/operations";
import { actions, getState, useHydrated, useStore, type AdminProfile } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { effectiveRole, isClusterRole, isTechCoordinator, logAdmin, positionLabelOf, servedBefore, useAdmin } from "../_lib/admin";
import { useClusterChannel } from "../_lib/channel";
import { groupPagesOf, myGroupNumbers, pageWriterOf } from "../_lib/directory";
import { scopeOf } from "../_lib/scope";
import { permissionRole, useRolePermissions, type AdminPermission } from "../_lib/permissions";

// ───────────────────────── Guard ─────────────────────────

export function AdminGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.adminSessionId);
  const hasProfile = useStore((s) => !!(s.adminSessionId && s.admins[s.adminSessionId]));
  // An account the administration stopped or deleted («الكادر الإداري») opens nothing
  const stopped = useStore((s) => (s.adminSessionId ? s.cadre.status[s.adminSessionId] : undefined));
  const router = useRouter();
  const pathname = usePathname();
  const ok = !!sessionId && hasProfile;

  useEffect(() => {
    if (hydrated && !ok) router.replace(`/administrator/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, ok, router, pathname]);

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
  { href: "/administrator/dashboard", label: "ملفي", icon: LayoutDashboard },
  // The permanent file of whoever served before: his documents, languages and skills between seasons
  { href: "/administrator/files", label: "وثائقي ومهاراتي", icon: FolderOpen, show: (c) => c.served },
  // His own: what reached him, and what he did — each a tab, not a card inside «ملفي»
  { href: "/administrator/notifications", label: "الإشعارات", icon: BellRing },
  { href: "/administrator/activity", label: "سجل نشاطي", icon: ScrollText },
  // His letters to the administration and its replies
  { href: "/administrator/letters", label: "المراسلات", icon: Mails },
  // Registering a pilgrim on the Hajj never puts him in a group
  { href: "/administrator/pilgrims", label: "التسجيل على الحج", icon: UserRoundPlus, ops: ["hajj-direct", "hajj-lottery"], show: (c) => c.register },
  { href: "/administrator/apply", label: "التسجيل كإداري", icon: ClipboardList, ops: ["admin-registration"] },
  { href: "/administrator/exam", label: "الاختبار المؤتمت والشفهي", icon: GraduationCap, ops: ["admin-exams", "admin-orals"] },
  { href: "/administrator/groups", label: groupsTab, icon: UsersRound, ops: ["group-management"], show: ownGroups },
  { href: "/administrator/clusters", label: "إدارة التكتل", icon: Landmark, ops: ["cluster-management"], show: (c) => c.cluster },
  // The groups and the clusters are formed at the office, each with its paper contract that everyone in it signs
  { href: "/administrator/my-contracts", label: "العقود", icon: FileSignature, show: (c) => c.contracts },
  // Everyone in a cluster reads its channel; who writes is by role, as its head sets it
  { href: "/administrator/channel", label: "قناة التكتل", icon: MessagesSquare, show: (c) => c.inChannel },
  // What the pilgrims read of the cluster: its team writes it once it is approved, the administration approves it
  { href: "/administrator/cluster-page", label: "صفحة التكتل العامة", icon: Globe, show: (c) => !!pageWriterOf(c.p) },
  // The groups' own: their pictures, words and galleries — the cluster's head all its groups', a group's head or assistant his
  { href: "/administrator/group-page", label: (c) => ((groupPagesOf(c.p)?.groups.length ?? 0) > 1 ? "صفحات المجموعات العامة" : "صفحة المجموعة العامة"), icon: Images, show: (c) => !!groupPagesOf(c.p) },
  { href: "/administrator/requests", label: (c) => (c.head ? "حجاج المجموعة" : "حجاج مجموعاتي"), icon: HeartHandshake, ops: ["group-joining"], show: ownGroups },
  // The visas the Saudi foreign ministry emails to the group's head, added by him to each of his pilgrims
  { href: "/administrator/visas", label: "التأشيرات", icon: Stamp, show: operating },
  // The flights out and back, then before each rite who goes and on which of the buses the Hajj and Umrah staff
  // gave — the coordinator's; a group's head and assistant see their group's, the cluster's head follows
  { href: "/administrator/lists", label: "القوائم", icon: Bus, show: operating },
  { href: "/administrator/field", label: "الميدان", icon: MapPinned, show: operating },
  // The guides' lessons to their groups' pilgrims, with who came; the heads follow them
  { href: "/administrator/lessons", label: "الدروس الدينية", icon: BookOpenText, show: serving },
  // What they follow pilgrim by pilgrim: memorising the Quran and hadith, the supplications, a shared reading
  { href: "/administrator/activities", label: "النشاطات الدينية", icon: BookMarked, show: serving },
  // After the season: his self-evaluation, his cadre's if he heads a cluster, and his result
  { href: "/administrator/evaluation", label: "التقييم بعد الموسم", icon: Star, ops: ["self-evaluation", "peer-evaluation"], show: serving },
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
      badge: n.href === "/administrator/channel" ? channel?.unread : undefined,
    };
  });
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAdmin();
  const role = effectiveRole(admin?.profile);
  const items = useAdminNav();
  // As in the staff portal: at the foot of the menu, and on phones (where the menu is a strip) on his card
  const logout = () => {
    if (admin) logAdmin(admin.id, "تسجيل خروج الإداري");
    actions.adminLogout();
    router.push("/administrator");
  };
  return (
    <aside className="min-w-0 self-start lg:sticky lg:top-28">
      <div className="overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
        <div className="flex items-center gap-3 bg-gradient-to-l from-green-dark to-[#00352f] p-4 text-white">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold font-display text-xl font-bold text-ink">{admin?.person.firstName[0]}</span>
          <div className="min-w-0">
            <p className="truncate font-bold">{admin?.name}</p>
            <p className="truncate text-xs text-white/65">{role ? `${positionLabelOf(role)} — موسم 1448` : "لم يتقدم لصفة هذا الموسم بعد"}</p>
          </div>
          <button type="button" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج" className="mr-auto grid size-10 shrink-0 place-items-center rounded-xl text-white/70 transition hover:bg-maroon/40 hover:text-white lg:hidden">
            <LogOut className="size-5" />
          </button>
        </div>
        <nav aria-label="أقسام حساب الإداري" className="scrollbar-none flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1 lg:overflow-visible">
          {items.map((n) => {
            const active = pathname.startsWith(n.href) && (n.href !== "/administrator/group" || !pathname.startsWith("/administrator/groups")) && (n.href !== "/administrator/cluster" || !pathname.startsWith("/administrator/clusters"));
            const { open, shown, label, badge } = n;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition",
                  active ? "on-light text-ink" : open ? "text-ink-soft hover:bg-sand" : "text-hint hover:bg-sand",
                )}
              >
                {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light" transition={{ type: "spring", damping: 30, stiffness: 350 }} />}
                <span className={cn("relative", active ? "text-green-dark" : open ? "text-gold-dark" : "text-hint")}>{open ? <n.icon className="size-[18px]" /> : <Lock className="size-[18px]" />}</span>
                <span className="relative min-w-0">
                  <span className="block whitespace-nowrap">{label}</span>
                  {shown && shown.status !== "always" && <span className={cn("hidden whitespace-nowrap text-[11px] font-semibold lg:block", active ? "text-green-dark/80" : shown.open ? "text-green" : "text-hint")}>{statusLabel(shown)}</span>}
                </span>
                {!!badge && (
                  <span className="relative mr-auto grid min-w-5 place-items-center rounded-full bg-maroon px-1.5 text-[11px] font-bold leading-5 text-white" aria-label={`${badge} غير مقروءة`}>
                    {badge}
                  </span>
                )}
              </Link>
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
        <AdminSidebar />
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
