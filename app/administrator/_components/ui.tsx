"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  ClipboardList,
  FileSignature,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPinned,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { PortalShell } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn, formatUSD, samePath } from "@/lib/utils";
import { isTechCoordinator, logAdmin, useAdmin } from "../_lib/admin";

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

type NavItem = { href: string; label: string; icon: LucideIcon; techOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/administrator/dashboard", label: "ملفي", icon: LayoutDashboard },
  { href: "/administrator/apply", label: "طلب المشاركة", icon: ClipboardList },
  { href: "/administrator/exam", label: "الامتحان والنتيجة", icon: GraduationCap },
  { href: "/administrator/group", label: "مجموعتي", icon: FileSignature },
  // تسجيل المواطنين من اختصاص المنسق التقني وحده
  { href: "/administrator/pilgrims", label: "تسجيل الحجاج", icon: UserRoundPlus, techOnly: true },
  { href: "/administrator/requests", label: "حجاج المجموعة", icon: UsersRound },
  { href: "/administrator/field", label: "الميدان", icon: MapPinned },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAdmin();
  const items = NAV.filter((n) => !n.techOnly || isTechCoordinator(admin?.profile));
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="أقسام حساب الإداري" className="scrollbar-none -mx-4 flex max-w-full gap-1 overflow-x-auto px-4 md:mx-0 md:rounded-2xl md:border md:border-white/15 md:bg-white/8 md:p-1 md:px-1 md:backdrop-blur-md">
        {items.map((n) => {
          const active = samePath(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition",
                active ? "text-ink" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              {active && <motion.span layoutId="admin-nav-pill" className="absolute inset-0 rounded-xl bg-gold shadow-lg" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <n.icon className="relative size-4" />
              <span className="relative">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      {admin && (
        <div className="flex items-center gap-2 text-sm text-white/80">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold-dark font-display font-bold text-ink">{admin.person.firstName[0]}</span>
          <span className="hidden sm:inline">{admin.name}</span>
          <button
            onClick={() => {
              logAdmin(admin.id, "تسجيل خروج الإداري");
              actions.adminLogout();
              router.push("/administrator");
            }}
            className="grid size-9 place-items-center rounded-xl border border-white/15 hover:bg-white/10"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </div>
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
    <PortalShell wide image={image}>
      <AdminNav />
      <div className="mb-8 text-white">
        <h1 className="font-display text-3xl font-bold md:text-5xl">{title}</h1>
        {subtitle && <div className="mt-3 max-w-3xl text-lg leading-8 text-white/75">{subtitle}</div>}
      </div>
      {children}
    </PortalShell>
  );
}

// ───────────────────────── Bits ─────────────────────────

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
