"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Briefcase, Building2, Eye, EyeOff, FlaskConical, IdCard, KeyRound, Mail, Phone, ShieldAlert, ShieldCheck, UserRound, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { fullName, type Person } from "@/lib/registry";
import { cn, digitsOnly, maskNationalId } from "@/lib/utils";
import { DEMO_OTP, Field, OtpInput, inputClass } from "./bits";
import { Card, PortalShell } from "./shell";

/**
 * One design for every way in: the pilgrims', the administrators' and the staff's sign-in pages, and the
 * pilgrims' and administrators' account creation. Same band, same card, same fields, same steps on the
 * side; each portal keeps its own photograph, its own words, and the fields its accounts need.
 */

export type AuthPortal = "pilgrim" | "admin" | "staff";

const PORTALS: Record<AuthPortal, { label: string; icon: LucideIcon; image: string; home?: { href: string; label: string }; login: string; register?: string }> = {
  pilgrim: { label: "حاج", icon: UserRound, image: "/images/haram-2022.jpg", login: "/login", register: "/register" },
  admin: { label: "إداري", icon: Briefcase, image: "/images/umayyad.jpg", home: { href: "/administrator", label: "بوابة الإداريين" }, login: "/administrator/login", register: "/administrator/register" },
  staff: { label: "موظف", icon: Building2, image: "/images/clock-tower.jpg", home: { href: "/staff", label: "بوابة الموظفين" }, login: "/staff/login" },
};

export function AuthShell({
  portal,
  page,
  title,
  subtitle,
  steps,
  step,
  note,
  tabs = true,
  below,
  children,
}: {
  portal: AuthPortal;
  page: "login" | "register";
  title: string;
  subtitle: ReactNode;
  /** The way through, on the side: where the visitor is now */
  steps: string[];
  step: number;
  note: ReactNode;
  /** The account types at the top of the card (on the first step only) */
  tabs?: boolean;
  /** Under the card, full width: the demo accounts */
  below?: ReactNode;
  children: ReactNode;
}) {
  const P = PORTALS[portal];
  return (
    <PortalShell
      image={P.image}
      eyebrow={
        <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-sm text-white/70">
          <Link href="/" className="transition hover:text-gold">الرئيسية</Link>
          {P.home && (
            <>
              <span aria-hidden>/</span>
              <Link href={P.home.href} className="transition hover:text-gold">{P.home.label}</Link>
            </>
          )}
          <span aria-hidden>/</span>
          <span className="text-gold">{page === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</span>
        </nav>
      }
      title={title}
      subtitle={subtitle}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden">
          {tabs && <AccountTabs portal={portal} page={page} />}
          {children}
        </Card>
        <aside className="space-y-4 lg:sticky lg:top-28">
          <ol className="space-y-1 rounded-3xl border border-gold/30 bg-white p-5">
            {steps.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-3 rounded-xl p-2 text-sm transition", i === step && "bg-green-dark/6")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition", i < step ? "bg-green-light text-white" : i === step ? "bg-green-dark text-gold" : "bg-sand text-hint")}>
                  {i < step ? "✓" : i + 1}
                </span>
                <span className={cn("font-semibold", i === step ? "text-green-dark" : i < step ? "text-ink" : "text-hint")}>{s}</span>
              </li>
            ))}
          </ol>
          <div className="flex items-start gap-2 rounded-3xl bg-green-dark/6 p-4 text-sm leading-6 text-green-dark">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            <div>{note}</div>
          </div>
        </aside>
      </div>
      {below && <div className="mt-8">{below}</div>}
    </PortalShell>
  );
}

/** Who is signing in (or opening an account): each choice is its own page */
function AccountTabs({ portal, page }: { portal: AuthPortal; page: "login" | "register" }) {
  const keys = (Object.keys(PORTALS) as AuthPortal[]).filter((k) => page === "login" || PORTALS[k].register);
  return (
    <nav aria-label="نوع الحساب" className="mb-8 border-b border-gold-light pb-8">
      <p className="mb-2 text-sm font-bold text-ink-soft">{page === "login" ? "الدخول بصفتك" : "نوع الحساب"}</p>
      <div className={cn("grid gap-1.5 rounded-2xl bg-sand p-1.5", keys.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {keys.map((k) => {
          const P = PORTALS[k];
          const on = k === portal;
          return (
            <Link
              key={k}
              href={page === "login" ? P.login : P.register!}
              aria-current={on ? "page" : undefined}
              className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition", on ? "bg-green-dark text-white shadow" : "text-ink-soft hover:bg-white hover:text-ink")}
            >
              <P.icon className={cn("size-4", on ? "text-gold" : "text-gold-dark")} /> {P.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** The heading of a step inside the card, with room for an action (read aloud) */
export function StepTitle({ children, action, sub }: { children: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{children}</h2>
        {sub && <p className="mt-1 text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ───────────────────────── Fields ─────────────────────────

const icon = "absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark";

export function NationalIdField({ value, onChange, error, hint, placeholder }: { value: string; onChange: (v: string) => void; error?: string | false; hint?: ReactNode; placeholder?: string }) {
  return (
    <Field label="الرقم الوطني" hint={hint} error={error}>
      <div className="relative">
        <IdCard className={icon} />
        <input
          inputMode="numeric"
          dir="ltr"
          maxLength={11}
          placeholder={placeholder}
          autoComplete="username"
          value={value}
          onChange={(e) => onChange(digitsOnly(e.target.value))}
          className={cn(inputClass, "pl-16 pr-12 text-left font-mono tracking-[.2em]")}
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-hint">{value.length}/11</span>
      </div>
    </Field>
  );
}

export function UsernameField({ value, onChange, error, placeholder }: { value: string; onChange: (v: string) => void; error?: string | false; placeholder?: string }) {
  return (
    <Field label="اسم المستخدم" error={error}>
      <div className="relative">
        <UserRound className={icon} />
        <input dir="ltr" autoComplete="username" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "pr-12 text-left")} />
      </div>
    </Field>
  );
}

/** `label` and `hint` change when the number typed is someone else's (a citizen at a registration desk) */
export function PhoneField({
  value,
  onChange,
  error,
  label = "رقم الهاتف",
  hint = "سيصلك عليه رمز تحقق برسالة نصية",
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | false;
  label?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="relative">
        <Phone className={icon} />
        <input inputMode="tel" dir="ltr" maxLength={10} placeholder="09xxxxxxxx" autoComplete="tel" value={value} onChange={(e) => onChange(digitsOnly(e.target.value))} className={cn(inputClass, "pr-12 text-left font-mono tracking-widest")} />
      </div>
    </Field>
  );
}

export function EmailField({ value, onChange, error, hint }: { value: string; onChange: (v: string) => void; error?: string | false; hint?: ReactNode }) {
  return (
    <Field label="البريد الإلكتروني" optional hint={hint} error={error}>
      <div className="relative">
        <Mail className={icon} />
        <input type="email" dir="ltr" placeholder="name@example.com" autoComplete="email" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "pr-12 text-left")} />
      </div>
    </Field>
  );
}

/** With a show/hide eye; at account creation, a strength bar under it */
export function PasswordField({ value, onChange, error, strength, autoComplete = "current-password" }: { value: string; onChange: (v: string) => void; error?: string | false; strength?: boolean; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  const level = Math.min(4, [/.{8,}/, /\d/, /[A-Za-z]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length);
  return (
    <Field label="كلمة المرور" error={error}>
      <div className="relative">
        <KeyRound className={icon} />
        <input type={show ? "text" : "password"} dir="ltr" autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "px-12 text-left")} />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-hint hover:text-green-dark" aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {strength && (
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
              <motion.span className={cn("block h-full", level <= 1 ? "bg-maroon" : level === 2 ? "bg-gold-dark" : "bg-green-light")} animate={{ width: i < level ? "100%" : "0%" }} />
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

/** A refusal under the fields, with the way out when there is one (sign in instead, the other portal) */
export function FormError({ text, link }: { text?: string | null; link?: { href: string; label: string } }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div role="alert" className="flex items-start gap-3 rounded-2xl bg-maroon/8 p-4 text-maroon">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" />
            <div className="font-semibold leading-7">
              {text}
              {link && (
                <>
                  {" "}
                  <Link href={link.href} className="font-bold text-green-dark underline underline-offset-4">
                    {link.label}
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** "Have an account? Sign in" and the like, under the main button */
export function SwitchLine({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <p className="text-center text-ink-soft">
      {text}{" "}
      <Link href={href} className="font-bold text-green-dark underline-offset-4 hover:underline">
        {label}
      </Link>
    </p>
  );
}

// ───────────────────────── Verification code ─────────────────────────

/** The code sent by text message: at account creation and at every sign-in */
export function OtpStep({ phone, confirm, onSuccess, onResend, back }: { phone?: string; confirm: string; onSuccess: () => void; onResend: () => void; back?: { label: string; onClick: () => void } }) {
  const [otp, setOtp] = useState("");
  const [bad, setBad] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);
  const verify = () => {
    if (otp !== DEMO_OTP) {
      setBad(true);
      setTimeout(() => setBad(false), 600);
      return;
    }
    onSuccess();
  };
  return (
    <div className="text-center">
      <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/30 text-4xl">
        📱
      </motion.div>
      <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">أدخل رمز التحقق</h2>
      <p className="mt-2 text-ink-soft">
        أرسلنا رمزاً من 4 أرقام إلى{" "}
        {phone ? (
          <>
            الهاتف <span dir="ltr" className="font-mono font-bold text-ink">{phone.slice(0, 4)} ••• {phone.slice(-3)}</span>
          </>
        ) : (
          "هاتفك المسجّل"
        )}
      </p>
      <div className="mt-8">
        <OtpInput value={otp} onChange={setOtp} invalid={bad} />
      </div>
      <p className="mt-4 text-sm text-hint">
        رمز النسخة التجريبية:{" "}
        <button type="button" onClick={() => setOtp(DEMO_OTP)} className="font-mono font-bold text-green-dark underline">
          {DEMO_OTP}
        </button>
      </p>
      <div className="mt-8 flex flex-col items-center gap-4">
        <Button size="lg" onClick={verify} disabled={otp.length < 4} className="min-w-60">
          {confirm} <BadgeCheck className="size-5" />
        </Button>
        <button
          type="button"
          disabled={resendIn > 0}
          onClick={() => {
            setResendIn(60);
            onResend();
          }}
          className="text-sm font-semibold text-green-dark disabled:text-hint"
        >
          {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : "إعادة إرسال الرمز"}
        </button>
        {back && (
          <button type="button" onClick={back.onClick} className="text-sm text-hint hover:text-ink">
            {back.label}
          </button>
        )}
      </div>
    </div>
  );
}

/** The person as the civil registry knows them, at account creation */
export function CivilRecordCard({ person, rows }: { person: Person; rows: [string, string][] }) {
  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark to-green p-6 text-white">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-gold font-display text-3xl font-bold text-ink">{person.firstName[0]}</span>
          <div>
            <p className="font-display text-2xl font-bold">{fullName(person)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gold">
              <BadgeCheck className="size-4" /> مؤكدة من الشؤون المدنية — {maskNationalId(person.id)}
            </p>
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map(([k, v], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="rounded-2xl bg-sand p-4">
            <dt className="text-xs text-hint">{k}</dt>
            <dd className="mt-0.5 font-bold text-ink">{v}</dd>
          </motion.div>
        ))}
      </dl>
    </>
  );
}

// ───────────────────────── Demo accounts ─────────────────────────

export type DemoAccount = {
  key: string;
  /** Shown as is: "name — situation" (the guides' capture scripts find the cards by it) */
  title: string;
  subtitle?: string;
  note?: string;
  /** The national ID or the username */
  code: string;
  initial: string;
  tags?: string[];
  badge?: { text: string; tone: "green" | "maroon" | "gold" };
  onPick: () => void;
};

/** For the demo only: every portal's ready-made accounts in the same box, under the sign-in card */
export function DemoAccounts({ hint, groups, footer }: { hint: ReactNode; groups: { label?: string; items: DemoAccount[] }[]; footer?: ReactNode }) {
  return (
    <section aria-labelledby="demo-accounts" className="rounded-[2rem] border-2 border-dashed border-gold-dark/50 bg-gold/10 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="demo-accounts" className="flex items-center gap-2 font-display text-xl font-bold text-maroon">
          <FlaskConical className="size-5" /> حسابات تجريبية
        </h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">للنسخة التجريبية فقط</span>
      </div>
      <p className="mt-1 text-sm leading-7 text-ink-soft">{hint}</p>
      {groups.map((g, gi) => (
        <div key={g.label ?? gi} className="mt-5">
          {g.label && <p className="mb-2 text-sm font-bold text-green-dark">{g.label}</p>}
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((a) => (
              <li key={a.key}>
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={a.onPick}
                  className="group flex h-full w-full flex-col rounded-2xl bg-white p-4 text-right shadow-sm ring-1 ring-gold/30 transition hover:shadow-md hover:ring-green-dark/40"
                >
                  <span className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold to-gold-dark font-display text-lg font-bold text-ink">{a.initial}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold leading-6 text-green-dark">{a.title}</span>
                      {a.subtitle && <span className="block text-xs font-semibold text-gold-dark">{a.subtitle}</span>}
                    </span>
                    <span className="shrink-0 pt-1 font-mono text-[11px] text-hint" dir="ltr">
                      {a.code}
                    </span>
                  </span>
                  {a.note && <span className="mt-2 block text-xs leading-5 text-ink-soft">{a.note}</span>}
                  {(a.badge || a.tags?.length) && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {a.badge && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", a.badge.tone === "green" ? "bg-green-light/15 text-green" : a.badge.tone === "maroon" ? "bg-maroon/10 text-maroon" : "bg-gold/30 text-ink")}>
                          {a.badge.text}
                        </span>
                      )}
                      {a.tags?.map((t) => (
                        <span key={t} className="rounded-full bg-sand px-2 py-0.5 text-[11px] text-ink-soft">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-green-dark">
                    <Zap className="size-3.5 transition group-hover:scale-125" /> دخول فوري
                  </span>
                </motion.button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {footer && <p className="mt-4 text-xs leading-6 text-ink-soft">{footer}</p>}
    </section>
  );
}
