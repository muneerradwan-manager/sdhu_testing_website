"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  BellRing,
  Building2,
  ClipboardList,
  FileSignature,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPinned,
  Plane,
  ScrollText,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { PortalShell } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { statusLabel, useOperations, type OperationKey, type OperationState } from "@/lib/operations";
import { actions, useHydrated, useStore, type AdminProfile } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { effectiveRole, isClusterRole, isTechCoordinator, logAdmin, positionLabelOf, servedBefore, useAdmin } from "../_lib/admin";
import { permissionRole, useRolePermissions, type AdminPermission } from "../_lib/permissions";

// ───────────────────────── Guard ─────────────────────────

export function AdminGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.adminSessionId);
  const hasProfile = useStore((s) => !!(s.adminSessionId && s.admins[s.adminSessionId]));
  const router = useRouter();
  const pathname = usePathname();
  const ok = !!sessionId && hasProfile;

  useEffect(() => {
    if (hydrated && !ok) router.replace(`/administrator/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, ok, router, pathname]);

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
type NavCtx = { p: AdminProfile | undefined; head: boolean; tech: boolean; cluster: boolean; inGroup: boolean; role: boolean; register: boolean; served: boolean };

type NavItem = {
  href: string;
  label: string | ((c: NavCtx) => string);
  icon: LucideIcon;
  ops?: OperationKey[];
  show?: (c: NavCtx) => boolean;
};

const serving = (c: NavCtx) => c.inGroup || c.cluster;
/** A group head has one group, and so has a guide or an assistant in its seat: the plural is only for whoever serves several */
const groupsTab = (c: NavCtx) => ((c.p?.coordinatorIn?.groups.length ?? c.p?.servesIn?.groups.length ?? 1) > 1 ? "إدارة المجموعات" : "إدارة المجموعة");
/** A cluster's head and deputy open its groups — each with its team and pilgrims — inside «إدارة التكتل» */
const ownGroups = (c: NavCtx) => c.inGroup && !c.cluster;

const NAV: NavItem[] = [
  { href: "/administrator/dashboard", label: "ملفي", icon: LayoutDashboard },
  // The permanent file of whoever served before: his documents, languages and skills between seasons
  { href: "/administrator/files", label: "وثائقي ومهاراتي", icon: FolderOpen, show: (c) => c.served },
  // His own: what reached him, and what he did — each a tab, not a card inside «ملفي»
  { href: "/administrator/notifications", label: "الإشعارات", icon: BellRing },
  { href: "/administrator/activity", label: "سجل نشاطي", icon: ScrollText },
  // Registering a pilgrim on the Hajj never puts him in a group
  { href: "/administrator/pilgrims", label: "التسجيل على الحج", icon: UserRoundPlus, ops: ["hajj-direct", "hajj-lottery"], show: (c) => c.register },
  { href: "/administrator/apply", label: "التسجيل كإداري", icon: ClipboardList, ops: ["admin-registration"] },
  { href: "/administrator/exam", label: "الامتحانات", icon: GraduationCap, ops: ["admin-exams"] },
  { href: "/administrator/group", label: "تشكيل المجموعات", icon: FileSignature, ops: ["group-formation"], show: (c) => c.head },
  // A group head files a request or answers the invitations to his group; the others answer theirs
  { href: "/administrator/cluster", label: "تشكيل التكتلات", icon: Building2, ops: ["cluster-formation"], show: (c) => c.role },
  { href: "/administrator/groups", label: groupsTab, icon: UsersRound, ops: ["group-management"], show: ownGroups },
  { href: "/administrator/clusters", label: "إدارة التكتل", icon: Landmark, ops: ["cluster-management"], show: (c) => c.cluster },
  { href: "/administrator/requests", label: (c) => (c.head ? "حجاج المجموعة" : "حجاج مجموعاتي"), icon: HeartHandshake, ops: ["group-joining"], show: ownGroups },
  { href: "/administrator/flights", label: "الرحلات", icon: Plane, show: serving },
  { href: "/administrator/field", label: "الميدان", icon: MapPinned, show: serving },
];

function navCtx(id: string | undefined, p: AdminProfile | undefined, table: Record<AdminPermission, string[]>): NavCtx {
  const role = p?.positions[0];
  const cluster = isClusterRole(p);
  const head = role === "group-head";
  const tech = isTechCoordinator(p);
  // A head's group counts once it is approved; a guide, an assistant or a coordinator works in the groups assigned to him
  const inGroup = head ? !!p?.group?.approvedAt : !!p?.servesIn || !!p?.coordinatorIn;
  return { p, head, tech, cluster, inGroup, role: !!role, register: !!role && table["pilgrims.register"].includes(permissionRole(p)), served: !!id && servedBefore(id) };
}

export type AdminNavEntry = { href: string; label: string; icon: LucideIcon; open: boolean; shown?: OperationState };

/** The operations this administrator sees, each with its state now: the open one, else the next to open, else the last closed */
export function useAdminNav(): AdminNavEntry[] {
  const admin = useAdmin();
  const ops = useOperations();
  const table = useRolePermissions();
  const ctx = navCtx(admin?.id, admin?.profile, table);
  return NAV.filter((n) => !n.show || n.show(ctx)).map((n) => {
    const states = n.ops ? ops.filter((o) => n.ops!.includes(o.key)) : [];
    return {
      href: n.href,
      label: typeof n.label === "function" ? n.label(ctx) : n.label,
      icon: n.icon,
      open: !states.length || states.some((o) => o.open),
      shown: states.find((o) => o.open) ?? states.find((o) => o.status === "upcoming") ?? states.at(-1),
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
            const { open, shown, label } = n;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition",
                  active ? "text-ink" : open ? "text-ink-soft hover:bg-sand" : "text-hint hover:bg-sand",
                )}
              >
                {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-2xl bg-gradient-to-l from-gold to-gold-light" transition={{ type: "spring", damping: 30, stiffness: 350 }} />}
                <span className={cn("relative", active ? "text-green-dark" : open ? "text-gold-dark" : "text-hint")}>{open ? <n.icon className="size-[18px]" /> : <Lock className="size-[18px]" />}</span>
                <span className="relative min-w-0">
                  <span className="block whitespace-nowrap">{label}</span>
                  {shown && shown.status !== "always" && <span className={cn("hidden whitespace-nowrap text-[11px] font-semibold lg:block", active ? "text-green-dark/80" : shown.open ? "text-green" : "text-hint")}>{statusLabel(shown)}</span>}
                </span>
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
