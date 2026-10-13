"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { AuthShell, DemoAccounts, FormError, NationalIdField, OtpStep, PasswordField, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { seedPilgrimScenario } from "@/lib/demo-scenarios";
import { DEMO_SCENARIOS, getPerson, isValidNationalId } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { nowMs } from "@/lib/utils";

/** The demo pilgrims in English: the situation after the name (the name stays as it is) */
const SCENARIOS_EN: Record<string, { title: string; note: string }> = {
  "01012345412": { title: "The full example", note: "Head of a family (58): his wife, his son عمر, and his mother خديجة (78), who is not in his family book. Adding خديجة moves the application to her name, as she is the eldest." },
  "01099900440": { title: "Direct acceptance", note: "Aged 69, with his wife هيام: within direct acceptance (born in 1958 or earlier), so he pays the registration fee and the first instalment." },
  "01077700351": { title: "Application in the father's name", note: "A young man (35) signs up and adds his father عادل (64) by national ID, so the father becomes the applicant automatically." },
  "02088800410": { title: "Living in Türkiye", note: "From Aleppo (50), with his wife ديما. He chooses “In Türkiye”, so he comes under the Türkiye office and travels with his group." },
  "12099900520": { title: "Living in Jordan", note: "A woman (48) who does not need a mahram (male guardian): a single application through the Jordan office." },
  "01066600620": { title: "Below the direct-acceptance age", note: "Aged 60, with his wife. If he chooses direct acceptance (born in 1958 or earlier), he is warned at the eligibility stage before any payment, and moves his application to the lottery in one click. Born in April 1966, so he is not accepted in the lottery: 1966 was not drawn." },
  "01055500730": { title: "Accepted directly", note: "Aged 71, with her son فراس: she paid the fee and the first instalment when she registered. She starts with her personal photo, then agrees with a group and signs its contract at the office, where a staff member adds her to it; then the second instalment, the passport and the medical file." },
  "01088800910": { title: "Accepted in the lottery", note: "Aged 46, with his wife: he paid only the lottery pre-registration fee, and everyone born in 1980 was drawn. He confirms his registration with the first instalment." },
  "06055500711": { title: "Has performed Hajj before", note: "Accepted only because he is the mahram (male guardian) of his mother نجاح (76) or of his wife." },
  "02033300552": { title: "Under 44", note: "Needs a mahram (male guardian): add her brother مازن or her father سامر." },
  "01011100208": { title: "Duplicate application", note: "Already in another application this season (one application per person)." },
};

export function LoginFlow() {
  const t = useT();
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

  const sendCode = () => setTimeout(() => toast({ title: t("رمز الدخول", "Sign-in code"), body: t(`رمز التحقق: ${DEMO_OTP}`, `Verification code: ${DEMO_OTP}`), icon: "💬", tone: "gold" }), 700);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidNationalId(id)) return setError({ text: t("الرقم الوطني يتكون من 11 رقماً.", "The national ID has 11 digits.") });
    const acc = accounts[id];
    if (!acc) {
      if (admins[id]) return setError({ text: t("هذا الرقم مسجّل كحساب إداري، لا كحساب حاج.", "This number belongs to an administrator account, not a pilgrim account."), link: { href: "/administrator/login", label: t("دخول الإداريين", "Administrator sign-in") } });
      return setError({ text: t("لا يوجد حساب حاج بهذا الرقم.", "There is no pilgrim account with this number."), link: { href: "/register", label: t("أنشئ حساباً", "Create an account") } });
    }
    if (acc.password !== password) return setError({ text: t("كلمة المرور غير صحيحة.", "The password is incorrect.") });
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
    toast({ title: t(`مرحباً ${p?.firstName}`, `Welcome, ${p?.firstName}`), body: seed ? t("دخول تجريبي — طلبك جاهز في «متابعة الطلب»", "Demo sign-in: your application is ready in “Track application”") : t("دخول تجريبي سريع", "Quick demo sign-in"), icon: "⚡", tone: "success" });
    // Every step done: straight into the season
    router.push(seed === "complete" ? "/portal/season" : seed === "accepted" || seed === "lotteryAccepted" ? "/portal/application" : seed === "notAccepted" ? "/portal/apply" : next);
  };

  const enter = () => {
    actions.login(id);
    toast({ title: t(`مرحباً بعودتك ${getPerson(id)?.firstName}`, `Welcome back, ${getPerson(id)?.firstName}`), icon: "👋", tone: "success" });
    router.push(next);
  };

  return (
    <AuthShell
      portal="pilgrim"
      page="login"
      title={t("دخول الحجاج", "Pilgrim sign-in")}
      subtitle={t("تابع طلبك، واطلع على مجموعتك وفندقك ورحلتك. الدخول بالرقم الوطني وكلمة المرور، ثم رمز تحقق يصل إلى هاتفك.", "Track your application and see your group, hotel and flight. Sign in with your national ID and password, then a verification code sent to your phone.")}
      steps={[t("الرقم الوطني وكلمة المرور", "National ID and password"), t("رمز التحقق", "Verification code"), t("ملفي", "My profile")]}
      step={otpStage ? 1 : 0}
      tabs={!otpStage}
      note={t("نسخة تجريبية: لا تُرسل أي رسالة حقيقية ولا تُحفظ البيانات إلا في متصفحك.", "Demo version: no real messages are sent, and your data is kept only in your browser.")}
      below={
        <DemoAccounts
          hint={t("حاج لكل حالة: عائلة كاملة، مقبول مباشرة، مقبول بالقرعة، امرأة تحتاج محرماً... اضغط على بطاقة للدخول مباشرة، دون كلمة مرور ولا رمز تحقق.", "A pilgrim for each situation: a whole family, accepted directly, accepted in the lottery, a woman who needs a mahram… Click a card to sign in straight away, with no password or verification code.")}
          groups={[
            {
              items: DEMO_SCENARIOS.map((s) => {
                const en = SCENARIOS_EN[s.id];
                return {
                  key: s.id,
                  title: en ? t(s.title, `${s.title.split(" — ")[0]} — ${en.title}`) : s.title,
                  note: en ? t(s.note, en.note) : s.note,
                  code: s.id,
                  initial: s.title[0],
                  onPick: () => quickLogin(s.id),
                };
              }),
            },
          ]}
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
              {t("متابعة", "Continue")} <ArrowLeft className="size-5" />
            </Button>
            <SwitchLine text={t("ليس لديك حساب؟", "No account yet?")} href="/register" label={t("أنشئ حساباً", "Create an account")} />
          </motion.form>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <OtpStep phone={accounts[id]?.phone} confirm={t("دخول", "Sign in")} onSuccess={enter} onResend={sendCode} back={{ label: t("تغيير الرقم الوطني", "Change national ID"), onClick: () => setOtpStage(false) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
