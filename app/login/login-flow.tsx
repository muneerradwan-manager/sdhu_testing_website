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
import { enterDemoCase } from "@/lib/demo-cases";
import { useOperation } from "@/lib/operations";
import { DEMO_SCENARIOS, getPerson, isValidNationalId } from "@/lib/registry";
import { DEMO_ADMINS, DEMO_GROUPS, DEMO_LISTED, demoAdminLogin } from "@/app/administrator/_lib/admin";
import { cn, nowMs } from "@/lib/utils";
import { actions, getState, seasonNow, useStore } from "@/lib/store";
import { withNames } from "@/lib/demo-text";
import DEFAULTS from "@/testdata/demo/defaults.json";
import LOGIN_MEMBERS from "@/testdata/demo/login-members.json";
import SCENARIOS_EN_DATA from "@/testdata/demo/scenarios-en.json";

/** The members of the demo: accounts that chose nothing this season — new, a pilgrim before, an administrator before (testdata/demo/login-members.json) */
const MEMBERS: { id: string; title: string; note: string }[] = LOGIN_MEMBERS;

/** The demo pilgrims in English: the situation after the name (the name stays as it is); testdata/demo/scenarios-en.json, its people by national number */
const SCENARIOS_EN: Record<string, { title: string; note: string }> = Object.fromEntries(Object.entries(SCENARIOS_EN_DATA).map(([id, s]) => [id, { title: s.title, note: withNames(s.note) }]));

/** A demo account opened by its card: the demo's password, and its emergency contact for a pilgrim */
const { accountPassword, emergencyContact } = DEFAULTS;

export function LoginFlow() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/portal";
  // «?demo=all» lists every demo administrator, beyond today's test (the guides' captures open it so)
  const allAdmins = params.get("demo") === "all";
  const [tab, setTab] = useState<"pilgrims" | "admins" | "members">(params.get("demo") === "admins" || allAdmins ? "admins" : "pilgrims");
  const admins = useStore((s) => s.admins);
  const cadre = useStore((s) => s.cadre);
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const applications = useStore((s) => s.applications);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [otpStage, setOtpStage] = useState(false);
  const directOp = useOperation("hajj-direct");
  const lotteryOp = useOperation("hajj-lottery");
  // The five outcomes first; the cases of the registration form itself folded under them
  const [more, setMore] = useState(false);
  const card = (s: (typeof DEMO_SCENARIOS)[number]) => {
    const en = SCENARIOS_EN[s.id];
    return {
      key: s.id,
      title: en ? t(s.title, `${s.title.split(" — ")[0]} — ${en.title}`) : s.title,
      subtitle: s.outcome ? t(`الحالة ${s.outcome} من 6 — ${s.fresh ? "يبدأ من الصفر" : s.seed === "complete" ? "في الموسم" : "طلبه مقدَّم"}`, `Case ${s.outcome} of 6 — ${s.fresh ? "starts from scratch" : s.seed === "complete" ? "in the season" : "applied"}`) : undefined,
      note: en ? t(s.note, en.note) : s.note,
      code: s.id,
      initial: s.outcome ? String(s.outcome) : s.title[0],
      onPick: () => quickLogin(s.id),
    };
  };

  const sendCode = () => setTimeout(() => toast({ title: t("رمز الدخول", "Sign-in code"), body: t(`رمز التحقق: ${DEMO_OTP}`, `Verification code: ${DEMO_OTP}`), icon: "💬", tone: "gold" }), 700);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidNationalId(id)) return setError({ text: t("الرقم الوطني يتكون من 11 رقماً.", "The national ID has 11 digits.") });
    // One account for everyone, pilgrim or administrator: this door and the administrators' open the same account
    const acc = accounts[id];
    if (!acc) return setError({ text: t("لا يوجد حساب في المنصة بهذا الرقم.", "There is no account on the platform with this number."), link: { href: "/register", label: t("أنشئ حساباً", "Create an account") } });
    if (acc.password !== password) return setError({ text: t("كلمة المرور غير صحيحة.", "The password is incorrect.") });
    setOtpStage(true);
    sendCode();
  };

  const quickLogin = (nationalId: string) => {
    if (!accounts[nationalId]) {
      actions.register({ nationalId, phone: `0944${nationalId.slice(-6)}`, password: accountPassword, createdAt: nowMs(), emergencyName: emergencyContact.name, emergencyPhone: emergencyContact.phone });
    } else {
      actions.login(nationalId);
    }
    // A demo pilgrim is a pilgrim this season: his card is his choice
    actions.chooseSeasonPath(nationalId, seasonNow(getState()), "pilgrim");
    const scenario = DEMO_SCENARIOS.find((s) => s.id === nationalId);
    const to = enterDemoCase(nationalId, { direct: directOp, lottery: lotteryOp });
    if (!to) seedPilgrimScenario(nationalId, { applications }, nowMs());
    const p = getPerson(nationalId);
    const seed = scenario?.seed;
    toast({ title: t(`مرحباً ${p?.firstName}`, `Welcome, ${p?.firstName}`), body: seed ? t("دخول تجريبي — طلبك جاهز في «متابعة الطلب»", "Demo sign-in: your application is ready in “Track application”") : t("دخول تجريبي سريع", "Quick demo sign-in"), icon: "⚡", tone: "success" });
    // Every step done: straight into the season
    router.push(to ?? next);
  };

  /** A demo administrator: his file as his card says (finished, at the start of his work, or not registered for the season) */
  const quickAdmin = (nationalId: string, mode: "start" | "ready" | "done") => {
    const st = cadre.status[nationalId];
    if (st) return setError({ text: `${st.state === "disabled" ? "حسابه موقوف من الإدارة" : "حسابه محذوف من الكادر"}: ${st.reason}.` });
    const err = demoAdminLogin({ accounts, admins }, nationalId, mode);
    if (err) return setError({ text: err });
    toast({ title: t(`مرحباً ${getPerson(nationalId)?.firstName}`, `Welcome, ${getPerson(nationalId)?.firstName}`), body: t("دخول تجريبي سريع", "Quick demo sign-in"), icon: "⚡", tone: "success" });
    router.push(next);
  };

  /** A member of the platform: an account that chose nothing this season, to try the season's question */
  const quickMember = (nationalId: string) => {
    if (!accounts[nationalId]) actions.register({ nationalId, phone: `0944${nationalId.slice(-6)}`, password: accountPassword, createdAt: nowMs() });
    else actions.login(nationalId);
    actions.chooseSeasonPath(nationalId, seasonNow(getState()), null);
    toast({ title: t(`مرحباً ${getPerson(nationalId)?.firstName}`, `Welcome, ${getPerson(nationalId)?.firstName}`), body: t("دخول تجريبي سريع", "Quick demo sign-in"), icon: "⚡", tone: "success" });
    router.push("/portal");
  };

  const listed = allAdmins || !DEMO_LISTED ? DEMO_ADMINS : DEMO_ADMINS.filter((d) => DEMO_LISTED!.includes(d.id));
  const adminGroups = DEMO_GROUPS.filter((g) => listed.some((d) => d.section === g)).map((g) => ({
    label: g,
    items: listed.filter((d) => d.section === g).map((d) => ({
      key: d.id,
      title: d.title,
      note: d.note,
      code: d.id,
      initial: d.title[0],
      badge: d.mode === "done" ? { text: "أنهى رحلته", tone: "green" as const } : d.mode === "ready" ? { text: "لم يبدأ بعد", tone: "maroon" as const } : { text: "لم يسجّل للموسم بعد", tone: "maroon" as const },
      onPick: () => quickAdmin(d.id, d.mode),
    })),
  }));
  const memberCards = MEMBERS.map((m) => {
    const p = getPerson(m.id)!;
    return { key: m.id, title: `${p.firstName} ${p.lastName} — ${m.title}`, note: m.note, code: m.id, initial: p.firstName[0], onPick: () => quickMember(m.id) };
  });

  const enter = () => {
    actions.login(id);
    toast({ title: t(`مرحباً بعودتك ${getPerson(id)?.firstName}`, `Welcome back, ${getPerson(id)?.firstName}`), icon: "👋", tone: "success" });
    router.push(next);
  };

  return (
    <AuthShell
      portal="pilgrim"
      page="login"
      title={t("تسجيل الدخول", "Sign in")}
      subtitle={t("ادخل إلى حسابك في المنصة: تابع طلب حجك ومجموعتك ورحلتك، أو اختر ما تفعله هذا الموسم، أو تابع تعلّمك في الأكاديمية. الدخول بالرقم الوطني وكلمة المرور، ثم رمز تحقق يصل إلى هاتفك.", "Sign in to your account on the platform: follow your Hajj application, group and trip, choose what you do this season, or carry on learning in the Academy. Sign in with your national ID and password, then a verification code sent to your phone.")}
      steps={[t("الرقم الوطني وكلمة المرور", "National ID and password"), t("رمز التحقق", "Verification code"), t("ملفي", "My profile")]}
      step={otpStage ? 1 : 0}
      note={t("نسخة تجريبية: لا تُرسل أي رسالة حقيقية ولا تُحفظ البيانات إلا في متصفحك.", "Demo version: no real messages are sent, and your data is kept only in your browser.")}
      below={
        <div className="space-y-4">
          <div role="tablist" aria-label={t("الحسابات التجريبية", "Demo accounts")} className="flex flex-wrap gap-2">
            {(
              [
                ["pilgrims", t("حجاج", "Pilgrims")],
                ["admins", t("إداريون", "Administrators")],
                ["members", t("أعضاء لم يسجّلوا على شيء", "Members with nothing yet")],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-2xl px-4 py-2 text-sm font-bold transition", tab === k ? "bg-green-dark text-white" : "bg-white text-green-dark ring-1 ring-gold/40 hover:bg-sand")}>
                {l}
              </button>
            ))}
          </div>
          {tab === "pilgrims" && (
            <DemoAccounts
              heading={t("جرّب المنصة: ست حالات", "Try the platform: six cases")}
              hint={t("حالتان تبدآن من الصفر فتقدّم الطلب بنفسك، وأربع طلباتها مقدَّمة بنتائجها. اضغط البطاقة فتدخل مباشرة، دون كلمة مرور ولا رمز تحقق، وتصل إلى الصفحة التي تخصها.", "Two cases start from scratch, so you apply yourself; four have applied, with their results. Click a card to sign in straight away, with no password or code, and land on its page.")}
              groups={[
                { items: DEMO_SCENARIOS.filter((s) => s.outcome).sort((a, b) => a.outcome! - b.outcome!).map(card) },
                ...(more ? [{ label: t("حالات لتجربة نموذج التسجيل نفسه", "Cases for trying the registration form itself"), items: DEMO_SCENARIOS.filter((s) => !s.outcome).map(card) }] : []),
              ]}
              footer={
                <button type="button" onClick={() => setMore((v) => !v)} className="mt-4 text-sm font-bold text-green-dark underline-offset-4 hover:underline">
                  {more ? t("إخفاء حالات التسجيل الأخرى", "Hide the other registration cases") : t("حالات أخرى لتجربة نموذج التسجيل", "Other cases for trying the registration form")}
                </button>
              }
            />
          )}
          {tab === "admins" && (
            <DemoAccounts
              heading={t("حسابات تجريبية للإداريين", "Demo administrators")}
              hint={t("لكل صفة حسابان: «أنهى رحلته» — سجّل للموسم وتأهّل ودخل تكتله، فيعمل الآن بصلاحيات صفته؛ و«لم يسجّل للموسم بعد» — يجرّب التقدّم للصفة من أوله حتى التأهل. ورئاسة التكتل ومحاسبته ومعاونه أماكن يعطيها التكتل حين يُشكَّل في المكتب: حسابها الثاني «في أول عمله». اضغط على بطاقة للدخول مباشرة.", "Each role has two accounts: one who finished and works with his role's permissions, and one not registered for the season yet. Click a card to sign in straight away.")}
              groups={adminGroups}
            />
          )}
          {tab === "members" && (
            <DemoAccounts
              heading={t("أعضاء لم يسجّلوا على شيء هذا الموسم", "Members with nothing chosen this season")}
              hint={t("حسابات لم تختر شيئاً في موسم 1448: تدخل فترى «ملفي» بسؤال الموسم. من شارك في موسم سابق يُذكَّر بما كان فيه ويُسأل: يكمل كما كان، أو يفتح ملفاً للشيء الجديد.", "Accounts that chose nothing in 1448: sign in and «My profile» asks what you do this season. Whoever took part before is reminded of it and asked how to go on.")}
              groups={[{ items: memberCards }]}
            />
          )}
        </div>
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
