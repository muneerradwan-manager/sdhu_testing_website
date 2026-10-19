"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Eye, EyeOff, FlaskConical, IdCard, KeyRound, Mail, ShieldAlert, ShieldCheck, UserRound, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLang, useT } from "@/lib/i18n";
import { fullName, type Person } from "@/lib/registry";
import { maskPhone } from "@/lib/phone";
import { CountryPhoneInput } from "@/components/ui/phone-input";
import { cn, digitsOnly, maskNationalId } from "@/lib/utils";
import { DEMO_OTP, Field, OtpInput, inputClass } from "./bits";
import { Card, PortalShell } from "./shell";

/**
 * One design for every way in: the pilgrims', the administrators' and the staff's sign-in pages, and the
 * pilgrims' and administrators' account creation. Same band, same card, same fields, same steps on the
 * side; each portal keeps its own photograph, its own words, and the fields its accounts need.
 * Each portal is its own platform at its own address: its sign-in and account pages lead only within it.
 */

export type AuthPortal = "pilgrim" | "admin" | "staff";

const PORTALS: Record<AuthPortal, { image: string; home?: { href: string; label: string } }> = {
  pilgrim: { image: "/images/haram-2022.jpg" },
  admin: { image: "/images/umayyad.jpg", home: { href: "/administrator", label: "بوابة الإداريين" } },
  staff: { image: "/images/clock-tower.jpg", home: { href: "/staff", label: "بوابة الموظفين" } },
};

export function AuthShell({
  portal,
  page,
  title,
  subtitle,
  steps,
  step,
  note,
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
  /** Under the card, full width: the demo accounts */
  below?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const P = PORTALS[portal];
  return (
    <PortalShell
      image={P.image}
      eyebrow={
        <nav aria-label={t("مسار التنقل", "Breadcrumb")} className="flex flex-wrap items-center gap-1.5 text-sm text-white/70">
          <Link href="/" className="transition hover:text-gold">{t("الرئيسية", "Home")}</Link>
          {P.home && (
            <>
              <span aria-hidden>/</span>
              <Link href={P.home.href} className="transition hover:text-gold">{P.home.label}</Link>
            </>
          )}
          <span aria-hidden>/</span>
          <span className="text-gold">{page === "login" ? t("تسجيل الدخول", "Sign in") : t("إنشاء حساب", "Create account")}</span>
        </nav>
      }
      title={title}
      subtitle={subtitle}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="overflow-hidden">{children}</Card>
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

const icon = "absolute start-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark";

/**
 * The inputs are written left to right in both languages (digits, e-mail), so their padding cannot follow
 * the page's direction by itself: the icon sits on the right in Arabic and on the left in English.
 */
function useAr() {
  return useLang() === "ar";
}

export function NationalIdField({ value, onChange, error, hint, placeholder }: { value: string; onChange: (v: string) => void; error?: string | false; hint?: ReactNode; placeholder?: string }) {
  const t = useT();
  const ar = useAr();
  return (
    <Field label={t("الرقم الوطني", "National ID")} hint={hint} error={error}>
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
          className={cn(inputClass, ar ? "pl-16 pr-12" : "pl-12 pr-16", "text-left font-mono tracking-[.2em]")}
        />
        <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs text-hint">{value.length}/11</span>
      </div>
    </Field>
  );
}

export function UsernameField({ value, onChange, error, placeholder }: { value: string; onChange: (v: string) => void; error?: string | false; placeholder?: string }) {
  const t = useT();
  const ar = useAr();
  return (
    <Field label={t("اسم المستخدم", "Username")} error={error}>
      <div className="relative">
        <UserRound className={icon} />
        <input dir="ltr" autoComplete="username" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, ar ? "pr-12" : "pl-12", "text-left")} />
      </div>
    </Field>
  );
}

/** `label` and `hint` change when the number typed is someone else's (a citizen at a registration desk) */
/**
 * The first name on the ID card, typed after the national number: the civil registry confirms the two belong
 * together before anything of the record is shown. `demoName`: the demo's «fill it» button (its registry is made up).
 */
export function FirstNameField({ value, onChange, error, hint, demoName }: { value: string; onChange: (v: string) => void; error?: string | false; hint?: ReactNode; demoName?: string }) {
  const t = useT();
  const ar = useAr();
  return (
    <Field label={t("الاسم الأول", "First name")} hint={hint ?? t("كما في البطاقة الشخصية — به نتأكد أن الرقم الوطني رقمك", "As on your ID card: it confirms the national ID is yours")} error={error}>
      <div className="relative">
        <UserRound className={icon} />
        <input autoComplete="given-name" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, ar ? "pr-12" : "pl-12")} />
      </div>
      {demoName && !value && (
        <button type="button" onClick={() => onChange(demoName)} className="mt-2 rounded-full border border-dashed border-gold-dark bg-gold/15 px-3 py-1 text-xs font-semibold text-maroon">
          {t(`تجريبي: الاسم الأول لهذا الرقم «${demoName}»`, `Demo: this number's first name is «${demoName}»`)}
        </button>
      )}
    </Field>
  );
}

/**
 * A phone number from anywhere in the world: the country from a list of every country (its flag and dialling
 * code, its name in the visitor's language), then the number as dialled there. Syria first. The value is the
 * number in its international form (+963944123456).
 */
export function PhoneField({
  value,
  onChange,
  error,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | false;
  label?: string;
  hint?: string;
}) {
  const t = useT();
  return (
    <Field label={label ?? t("رقم الهاتف", "Phone number")} hint={hint ?? t("اختر دولتك من القائمة، ثم اكتب رقمك. سيصلك عليه رمز تحقق برسالة نصية.", "Choose your country from the list, then type your number. We will text a verification code to it.")} error={error}>
      <CountryPhoneInput value={value} onChange={onChange} ariaLabel={t("رقم الهاتف", "Phone number")} invalid={!!error} className={cn(inputClass, "focus-within:border-green-light focus-within:ring-4 focus-within:ring-green-light/15", error && "border-maroon/60")} inputClassName="text-lg" />
    </Field>
  );
}

export function EmailField({ value, onChange, error, hint }: { value: string; onChange: (v: string) => void; error?: string | false; hint?: ReactNode }) {
  const t = useT();
  const ar = useAr();
  return (
    <Field label={t("البريد الإلكتروني", "Email")} optional hint={hint} error={error}>
      <div className="relative">
        <Mail className={icon} />
        <input type="email" dir="ltr" placeholder="name@example.com" autoComplete="email" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, ar ? "pr-12" : "pl-12", "text-left")} />
      </div>
    </Field>
  );
}

/** With a show/hide eye; at account creation, a strength bar under it */
export function PasswordField({ value, onChange, error, strength, autoComplete = "current-password" }: { value: string; onChange: (v: string) => void; error?: string | false; strength?: boolean; autoComplete?: string }) {
  const t = useT();
  const [show, setShow] = useState(false);
  const level = Math.min(4, [/.{8,}/, /\d/, /[A-Za-z]/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length);
  return (
    <Field label={t("كلمة المرور", "Password")} error={error}>
      <div className="relative">
        <KeyRound className={icon} />
        <input type={show ? "text" : "password"} dir="ltr" autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "px-12 text-left")} />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute end-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-hint hover:text-green-dark" aria-label={show ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")}>
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

/** A refusal under the fields, with the way out when there is one (sign in instead, create an account) */
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
  const t = useT();
  const [otp, setOtp] = useState("");
  const [bad, setBad] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
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
      <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">{t("أدخل رمز التحقق", "Enter the verification code")}</h2>
      <p className="mt-2 text-ink-soft">
        {t("أرسلنا رمزاً من 4 أرقام إلى", "We sent a 4-digit code to")}{" "}
        {phone ? (
          <>
            {t("الهاتف", "the phone")} <span dir="ltr" className="font-mono font-bold text-ink">{maskPhone(phone)}</span>
          </>
        ) : (
          t("هاتفك المسجّل", "your registered phone")
        )}
      </p>
      <div className="mt-8">
        <OtpInput value={otp} onChange={setOtp} invalid={bad} />
      </div>
      <p className="mt-4 text-sm text-hint">
        {t("رمز النسخة التجريبية:", "Demo code:")}{" "}
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
          {resendIn > 0 ? t(`إعادة الإرسال بعد ${resendIn} ثانية`, `Resend in ${resendIn} seconds`) : t("إعادة إرسال الرمز", "Resend the code")}
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
  const t = useT();
  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark to-green p-6 text-white">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-gold font-display text-3xl font-bold text-ink">{person.firstName[0]}</span>
          <div>
            <p className="font-display text-2xl font-bold">{fullName(person)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gold">
              <BadgeCheck className="size-4" /> {t("مؤكدة من الشؤون المدنية", "Confirmed by the Civil Registry")} — {maskNationalId(person.id)}
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

/**
 * For the demo only: every portal's ready-made accounts in the same box, under the sign-in card — or, on the sign-up
 * pages (`heading`, `action`), the ready-made data that fills the form.
 */
export function DemoAccounts({ hint, groups, footer, heading, action }: { hint: ReactNode; groups: { label?: string; items: DemoAccount[] }[]; footer?: ReactNode; heading?: string; action?: string }) {
  const t = useT();
  return (
    <section aria-labelledby="demo-accounts" className="rounded-[2rem] border-2 border-dashed border-gold-dark/50 bg-gold/10 p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="demo-accounts" className="flex items-center gap-2 font-display text-xl font-bold text-maroon">
          <FlaskConical className="size-5" /> {heading ?? t("حسابات تجريبية", "Demo accounts")}
        </h2>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-soft">{t("للنسخة التجريبية فقط", "For the demo only")}</span>
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
                  className="group flex h-full w-full flex-col rounded-2xl bg-white p-4 text-start shadow-sm ring-1 ring-gold/30 transition hover:shadow-md hover:ring-green-dark/40"
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
                    <Zap className="size-3.5 transition group-hover:scale-125" /> {action ?? t("دخول فوري", "Instant sign-in")}
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
