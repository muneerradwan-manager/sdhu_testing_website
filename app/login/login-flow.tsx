"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, IdCard, Lock, LogIn, Zap } from "lucide-react";
import { useState } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { DEMO_OTP, DemoPanel, Field, OtpInput, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { seedPilgrimScenario } from "@/lib/demo-scenarios";
import { DEMO_SCENARIOS, getPerson, isValidNationalId } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/portal";
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const applications = useStore((s) => s.applications);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidNationalId(id)) return setError("الرقم الوطني يتكون من 11 رقماً");
    const acc = accounts[id];
    if (!acc) return setError("لا يوجد حساب بهذا الرقم. أنشئ حساباً جديداً أو استخدم الدخول التجريبي السريع.");
    if (acc.password !== password) return setError("كلمة المرور غير صحيحة");
    setOtpStage(true);
    setTimeout(() => toast({ title: "رمز الدخول", body: `رمز التحقق: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 700);
  };

  const quickLogin = (nationalId: string) => {
    if (!accounts[nationalId]) {
      actions.register({ nationalId, phone: `0944${nationalId.slice(-6)}`, password: "hajj1448", createdAt: Date.now(), emergencyName: "سارة", emergencyPhone: "0933000412" });
    } else {
      actions.login(nationalId);
    }
    seedPilgrimScenario(nationalId, { applications }, Date.now());
    const p = getPerson(nationalId);
    const seed = DEMO_SCENARIOS.find((s) => s.id === nationalId)?.seed;
    toast({ title: `مرحباً ${p?.firstName}`, body: seed ? "دخول تجريبي — طلبك جاهز في «متابعة الطلب»" : "دخول تجريبي سريع", icon: "⚡", tone: "success" });
    router.push(seed === "accepted" || seed === "lotteryAccepted" ? "/portal/application" : seed === "notAccepted" ? "/portal/apply" : next);
  };

  const verify = () => {
    if (otp !== DEMO_OTP) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 600);
      return;
    }
    actions.login(id);
    toast({ title: `مرحباً بعودتك ${getPerson(id)?.firstName}`, icon: "👋", tone: "success" });
    router.push(next);
  };

  return (
    <PortalShell
      title="تسجيل الدخول"
      subtitle="تابع طلبك، واطلع على مجموعتك وفندقك ورحلتك."
      aside={
        <>
          <div className="rounded-3xl border border-gold/30 bg-white p-5 text-sm leading-7 text-ink-soft">
            <p className="flex items-center gap-2 font-bold text-green-dark">
              <Zap className="size-4 text-gold-dark" /> الدخول التجريبي السريع
            </p>
            اختر أي سيناريو أعلاه للدخول مباشرة دون كلمة مرور، مع إنشاء حساب تلقائي إن لم يكن موجوداً.
          </div>
        </>
      }
    >
      <Card>
        <AnimatePresence mode="wait">
          {!otpStage ? (
            <motion.form key="form" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} onSubmit={submit} className="space-y-6">
              <DemoPanel defaultOpen hint="دخول مباشر بحساب تجريبي — دون رمز تحقق." onPick={(s) => quickLogin(s.id)} />
              <Field label="الرقم الوطني">
                <div className="relative">
                  <IdCard className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={11}
                    value={id}
                    onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
                    className={cn(inputClass, "pr-12 text-left font-mono tracking-[.2em]")}
                  />
                </div>
              </Field>
              <Field label="كلمة المرور">
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                  <input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={cn(inputClass, "pr-12 text-left")} />
                </div>
              </Field>
              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl bg-maroon/8 p-4 font-semibold text-maroon">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button type="submit" size="lg" className="w-full">
                <LogIn className="size-5" /> دخول
              </Button>
              <p className="text-center text-ink-soft">
                ليس لديك حساب؟{" "}
                <Link href="/register" className="font-bold text-green-dark hover:underline">
                  أنشئ حساباً
                </Link>
              </p>
            </motion.form>
          ) : (
            <motion.div key="otp" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="text-center">
              <h2 className="font-display text-2xl font-bold text-green-dark">رمز التحقق</h2>
              <p className="mt-2 text-ink-soft">أرسلنا رمزاً إلى هاتفك المسجّل</p>
              <div className="mt-8">
                <OtpInput value={otp} onChange={setOtp} invalid={otpError} />
              </div>
              <button onClick={() => setOtp(DEMO_OTP)} className="mt-4 text-sm text-hint">
                رمز النسخة التجريبية: <span className="font-mono font-bold text-green-dark underline">{DEMO_OTP}</span>
              </button>
              <Button size="lg" onClick={verify} disabled={otp.length < 4} className="mt-8 min-w-60">
                متابعة <ArrowLeft className="size-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </PortalShell>
  );
}
