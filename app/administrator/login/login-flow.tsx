"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, BadgeCheck, FlaskConical, IdCard, LogIn, Zap } from "lucide-react";
import { useState } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { DEMO_OTP, Field, OtpInput, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { getPerson, isValidNationalId } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DEMO_ADMINS, POSITIONS, demoAdminLogin, logAdmin, type DemoAdminMode } from "../_lib/admin";

export function AdminLoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next");
  const next = raw && raw.startsWith("/administrator/") ? raw : "/administrator/dashboard";
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const [id, setId] = useState("");
  const [error, setError] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidNationalId(id)) return setError({ text: "الرقم الوطني يتكون من 11 رقماً" });
    if (!admins[id]) {
      if (accounts[id]) return setError({ text: "هذا الرقم مسجّل كحساب حاج، لا كحساب إداري.", link: { href: "/login", label: "دخول الحجاج" } });
      return setError({ text: "لا يوجد حساب إداري بهذا الرقم.", link: { href: "/administrator/register", label: "إنشاء حساب إداري" } });
    }
    setOtpStage(true);
    setTimeout(() => toast({ title: "رمز دخول الإداري", body: `رمز التحقق: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 700);
  };

  const verify = () => {
    if (otp !== DEMO_OTP) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 600);
      return;
    }
    actions.adminLogin(id);
    logAdmin(id, "تسجيل دخول الإداري");
    toast({ title: `مرحباً بعودتك ${getPerson(id)?.firstName}`, icon: "👋", tone: "success" });
    router.push(next);
  };

  const quick = (nationalId: string, mode: DemoAdminMode = "start") => {
    const err = demoAdminLogin({ accounts, admins }, nationalId, mode);
    if (err) return setError({ text: err });
    toast({ title: `مرحباً ${getPerson(nationalId)?.firstName}`, body: "دخول تجريبي سريع", icon: "⚡", tone: "success" });
    router.push(next);
  };

  return (
    <PortalShell image="/images/umayyad.jpg" title="دخول الإداري" subtitle="بالرقم الوطني ورمز تحقق يصل إلى هاتفك المسجّل.">
      <div className="mx-auto max-w-5xl space-y-6">
        <Card className="mx-auto max-w-xl overflow-hidden">
          <AnimatePresence mode="wait">
            {!otpStage ? (
              <motion.form key="id" onSubmit={submit} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="space-y-6">
                <Field label="الرقم الوطني" error={error?.text}>
                  <div className="relative">
                    <IdCard className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input inputMode="numeric" dir="ltr" maxLength={11} placeholder="01033300871" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ""))} className={cn(inputClass, "pr-12 text-left font-mono tracking-[.2em]")} />
                  </div>
                </Field>
                {error?.link && (
                  <Link href={error.link.href} className="-mt-3 inline-flex items-center gap-1 text-sm font-bold text-green-dark underline">
                    {error.link.label} <ArrowLeft className="size-4" />
                  </Link>
                )}
                <Button type="submit" size="lg" variant="maroon" className="w-full">
                  <LogIn className="size-5" /> متابعة
                </Button>
                <p className="text-center text-ink-soft">
                  ليس لديك حساب إداري؟ <Link href="/administrator/register" className="font-bold text-green-dark hover:underline">أنشئ حساباً</Link>
                </p>
              </motion.form>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="text-center">
                <h2 className="font-display text-2xl font-bold text-green-dark">أدخل رمز التحقق</h2>
                <p className="mt-2 text-sm text-ink-soft">إلى الهاتف المنتهي بـ <span dir="ltr" className="font-mono font-bold">{admins[id]?.phone.slice(-3)}</span></p>
                <div className="mt-6">
                  <OtpInput value={otp} onChange={setOtp} invalid={otpError} />
                </div>
                <p className="mt-4 text-sm text-hint">
                  الرمز التجريبي: <button onClick={() => setOtp(DEMO_OTP)} className="font-mono font-bold text-green-dark underline">{DEMO_OTP}</button>
                </p>
                <Button size="lg" onClick={verify} disabled={otp.length < 4} className="mt-6 w-full">
                  دخول <BadgeCheck className="size-5" />
                </Button>
                <button onClick={() => setOtpStage(false)} className="mt-4 text-sm text-hint hover:text-ink">تغيير الرقم الوطني</button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="rounded-[2rem] border-2 border-dashed border-gold-dark/60 bg-gold/15 p-5">
          <p className="flex items-center gap-2 font-bold text-maroon">
            <FlaskConical className="size-4" /> دخول تجريبي سريع
          </p>
          <p className="mt-1 text-xs text-ink-soft">لكل صفة إداريان متجاوران: الأول أنهى رحلته فترى كل ما يظهر له، والثاني لم يبدأ بعد.</p>
          <div className="mt-4 space-y-4">
            {POSITIONS.filter((pos) => DEMO_ADMINS.some((d) => d.position === pos.key)).map((pos) => (
              <div key={pos.key}>
                <p className="mb-2 text-sm font-bold text-maroon">{pos.label}</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {DEMO_ADMINS.filter((d) => d.position === pos.key).map((d) => (
                    <li key={d.id}>
                      <motion.button
                        whileHover={{ y: -2 }}
                        type="button"
                        onClick={() => quick(d.id, d.mode)}
                        className={cn("group h-full w-full rounded-2xl p-4 text-right shadow-sm hover:shadow-md", d.mode === "done" ? "bg-green-dark text-white" : "bg-white")}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("font-bold", d.mode === "done" ? "text-gold" : "text-green-dark")}>{d.title}</span>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", d.mode === "done" ? "bg-gold text-ink" : "bg-maroon/10 text-maroon")}>
                            {d.mode === "done" ? "أنهى رحلته" : "لم يبدأ بعد"}
                          </span>
                        </span>
                        <span className={cn("mt-1 block text-xs leading-5", d.mode === "done" ? "text-white/75" : "text-ink-soft")}>{d.note}</span>
                        <span className={cn("mt-2 inline-flex items-center gap-1 text-xs font-bold", d.mode === "done" ? "text-gold" : "text-green-dark")}>
                          <Zap className="size-3.5 transition group-hover:scale-125" /> دخول فوري
                        </span>
                      </motion.button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-ink-soft">
            يُنشأ الملف الإداري تلقائياً إن لم يكن موجوداً. ولقفزة مباشرة إلى الميدان استخدم لوحة التجربة في <Link href="/administrator" className="font-bold underline">صفحة الإداري</Link>.
          </p>
        </div>
      </div>
    </PortalShell>
  );
}
