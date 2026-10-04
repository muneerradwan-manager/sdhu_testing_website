"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { AuthShell, DemoAccounts, FormError, NationalIdField, OtpStep, PasswordField, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { seedPilgrimScenario } from "@/lib/demo-scenarios";
import { DEMO_SCENARIOS, getPerson, isValidNationalId } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { nowMs } from "@/lib/utils";

export function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/portal";
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const applications = useStore((s) => s.applications);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [otpStage, setOtpStage] = useState(false);

  const sendCode = () => setTimeout(() => toast({ title: "رمز الدخول", body: `رمز التحقق: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 700);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidNationalId(id)) return setError({ text: "الرقم الوطني يتكون من 11 رقماً." });
    const acc = accounts[id];
    if (!acc) {
      if (admins[id]) return setError({ text: "هذا الرقم مسجّل كحساب إداري، لا كحساب حاج.", link: { href: "/administrator/login", label: "دخول الإداريين" } });
      return setError({ text: "لا يوجد حساب حاج بهذا الرقم.", link: { href: "/register", label: "أنشئ حساباً" } });
    }
    if (acc.password !== password) return setError({ text: "كلمة المرور غير صحيحة." });
    setOtpStage(true);
    sendCode();
  };

  const quickLogin = (nationalId: string) => {
    if (!accounts[nationalId]) {
      actions.register({ nationalId, phone: `0944${nationalId.slice(-6)}`, password: "hajj1448", createdAt: nowMs(), emergencyName: "سارة", emergencyPhone: "0933000412" });
    } else {
      actions.login(nationalId);
    }
    seedPilgrimScenario(nationalId, { applications }, nowMs());
    const p = getPerson(nationalId);
    const seed = DEMO_SCENARIOS.find((s) => s.id === nationalId)?.seed;
    toast({ title: `مرحباً ${p?.firstName}`, body: seed ? "دخول تجريبي — طلبك جاهز في «متابعة الطلب»" : "دخول تجريبي سريع", icon: "⚡", tone: "success" });
    router.push(seed === "accepted" || seed === "lotteryAccepted" ? "/portal/application" : seed === "notAccepted" ? "/portal/apply" : next);
  };

  const enter = () => {
    actions.login(id);
    toast({ title: `مرحباً بعودتك ${getPerson(id)?.firstName}`, icon: "👋", tone: "success" });
    router.push(next);
  };

  return (
    <AuthShell
      portal="pilgrim"
      page="login"
      title="دخول الحجاج"
      subtitle="تابع طلبك، واطلع على مجموعتك وفندقك ورحلتك. الدخول بالرقم الوطني وكلمة المرور، ثم رمز تحقق يصل إلى هاتفك."
      steps={["الرقم الوطني وكلمة المرور", "رمز التحقق", "ملفي"]}
      step={otpStage ? 1 : 0}
      tabs={!otpStage}
      note="نسخة تجريبية: لا تُرسل أي رسالة حقيقية ولا تُحفظ البيانات إلا في متصفحك."
      below={
        <DemoAccounts
          hint="حاج لكل حالة: عائلة كاملة، مقبول مباشرة، مقبول بالقرعة، امرأة تحتاج محرماً... اضغط على بطاقة للدخول مباشرة، دون كلمة مرور ولا رمز تحقق."
          groups={[{ items: DEMO_SCENARIOS.map((s) => ({ key: s.id, title: s.title, note: s.note, code: s.id, initial: s.title[0], onPick: () => quickLogin(s.id) })) }]}
        />
      }
    >
      <AnimatePresence mode="wait">
        {!otpStage ? (
          <motion.form key="form" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} onSubmit={submit} className="space-y-6">
            <NationalIdField value={id} onChange={setId} />
            <PasswordField value={password} onChange={setPassword} />
            <FormError text={error?.text} link={error?.link} />
            <Button type="submit" size="lg" className="w-full">
              متابعة <ArrowLeft className="size-5" />
            </Button>
            <SwitchLine text="ليس لديك حساب؟" href="/register" label="أنشئ حساباً" />
          </motion.form>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <OtpStep phone={accounts[id]?.phone} confirm="دخول" onSuccess={enter} onResend={sendCode} back={{ label: "تغيير الرقم الوطني", onClick: () => setOtpStage(false) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
