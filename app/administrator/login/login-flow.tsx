"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { AuthShell, DemoAccounts, FormError, NationalIdField, OtpStep, PasswordField, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { getPerson, isValidNationalId } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [otpStage, setOtpStage] = useState(false);

  const sendCode = () => setTimeout(() => toast({ title: "رمز دخول الإداري", body: `رمز التحقق: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 700);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidNationalId(id)) return setError({ text: "الرقم الوطني يتكون من 11 رقماً." });
    const admin = admins[id];
    if (!admin) {
      if (accounts[id]) return setError({ text: "هذا الرقم مسجّل كحساب حاج، لا كحساب إداري.", link: { href: "/login", label: "دخول الحجاج" } });
      return setError({ text: "لا يوجد حساب إداري بهذا الرقم.", link: { href: "/administrator/register", label: "أنشئ حساباً إدارياً" } });
    }
    // Profiles opened before administrators had passwords sign in with the code alone
    if (admin.password && admin.password !== password) return setError({ text: "كلمة المرور غير صحيحة." });
    setOtpStage(true);
    sendCode();
  };

  const enter = () => {
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
    <AuthShell
      portal="admin"
      page="login"
      title="دخول الإداريين"
      subtitle="لرؤساء المجموعات ومعاونيهم والموجّهين الدينيين والمنسقين التقنيين. الدخول بالرقم الوطني وكلمة المرور، ثم رمز تحقق يصل إلى هاتفك."
      steps={["الرقم الوطني وكلمة المرور", "رمز التحقق", "ملفي كإداري"]}
      step={otpStage ? 1 : 0}
      tabs={!otpStage}
      note="لكل شخص نوع حساب واحد في المنصة: حاج، أو إداري، أو موظف."
      below={
        <DemoAccounts
          hint="لكل صفة إداريان: الأول أنهى رحلته فترى كل ما يظهر له، والثاني لم يبدأ بعد. اضغط على بطاقة للدخول مباشرة، دون كلمة مرور ولا رمز تحقق."
          groups={POSITIONS.filter((pos) => DEMO_ADMINS.some((d) => d.position === pos.key)).map((pos) => ({
            label: pos.label,
            items: DEMO_ADMINS.filter((d) => d.position === pos.key).map((d) => ({
              key: d.id,
              title: d.title,
              note: d.note,
              code: d.id,
              initial: d.title[0],
              badge: d.mode === "done" ? { text: "أنهى رحلته", tone: "green" as const } : { text: "لم يبدأ بعد", tone: "maroon" as const },
              onPick: () => quick(d.id, d.mode),
            })),
          }))}
          footer="يُنشأ الملف الإداري تلقائياً إن لم يكن موجوداً."
        />
      }
    >
      <AnimatePresence mode="wait">
        {!otpStage ? (
          <motion.form key="form" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} onSubmit={submit} className="space-y-6">
            <NationalIdField value={id} onChange={setId} placeholder="01033300871" />
            <PasswordField value={password} onChange={setPassword} />
            <FormError text={error?.text} link={error?.link} />
            <Button type="submit" size="lg" className="w-full">
              متابعة <ArrowLeft className="size-5" />
            </Button>
            <SwitchLine text="ليس لديك حساب إداري؟" href="/administrator/register" label="أنشئ حساباً" />
          </motion.form>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <OtpStep phone={admins[id]?.phone} confirm="دخول" onSuccess={enter} onResend={sendCode} back={{ label: "تغيير الرقم الوطني", onClick: () => setOtpStage(false) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
