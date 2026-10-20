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
import { cn } from "@/lib/utils";
import { actions, getState, seasonNow, useStore } from "@/lib/store";

/** The members of the demo: accounts that chose nothing this season — new, a pilgrim before, an administrator before */
const MEMBERS = [
  { id: "09099912345", title: "عضو جديد", note: "لم يشارك في أي موسم: يتعلّم في الأكاديمية، ويختار الحج أو صفة إدارية متى شاء." },
  { id: "06055500711", title: "حجّ في موسم 1445", note: "يُذكَّر بموسمه حاجاً، ويُسأل: يكمل كحاج هذا الموسم، أو يفتح ملفاً إدارياً جديداً." },
  { id: "01033300899", title: "رئيس مجموعة في موسم 1447", note: "يُذكَّر بصفته وتقييمه 4.4، ويُسأل: يكمل كإداري بملفه الدائم، أو يفتح ملف حاج لهذا الموسم." },
];
import { nowMs } from "@/lib/utils";

/** The demo pilgrims in English: the situation after the name (the name stays as it is) */
const SCENARIOS_EN: Record<string, { title: string; note: string }> = {
  "01012345412": { title: "The full example", note: "Head of a family (58): his wife, his son عمر, and his mother خديجة (78), who is not in his family book. Adding خديجة moves the application to her name, as she is the eldest." },
  "01099900440": { title: "Direct acceptance", note: "Aged 69, with his wife هيام: within direct acceptance (born in 1958 or earlier), so he pays the registration fee and the first instalment." },
  "01077700351": { title: "Application in the father's name", note: "A young man (35) signs up and adds his father عادل (64) by national ID, so the father becomes the applicant automatically." },
  "02088800410": { title: "Living in Türkiye", note: "From Aleppo (50), with his wife ديما. He chooses “In Türkiye — Gaziantep”, so he comes under the Gaziantep office (Türkiye has two: Istanbul and Gaziantep) and travels with his group." },
  "12099900520": { title: "Living in Jordan", note: "A woman (48) who does not need a mahram (male guardian): a single application through the Jordan office." },
  "01066600620": { title: "Below the direct-acceptance age", note: "Aged 60, with his wife. If he chooses direct acceptance (born in 1958 or earlier), he is warned at the eligibility stage before any payment, and moves his application to the lottery in one click. Born in April 1966, so he is not accepted in the lottery: 1966 was not drawn." },
  "01055500730": { title: "Accepted directly", note: "Aged 71, with her son فراس: she paid the fee and the first instalment when she registered. She starts with her personal photo, then agrees with a group and signs its contract at the office, where a staff member adds her to it; then the second instalment, the passport and the medical file." },
  "01058100960": { title: "Applies for direct acceptance", note: "No application yet, and every condition makes him accepted directly: born in 1958 (68), with his wife منى from the family booklet. He opens on «Apply for Hajj» within the direct-acceptance window (12 – 25 August), applies from the start, and is accepted." },
  "01080300980": { title: "Applies for the lottery", note: "No application yet, below the direct-acceptance age (46), and every condition makes him accepted in the lottery: born in 1980, a year drawn in full. With his wife رنا from the family booklet. He opens on «Apply for Hajj» within the lottery window (26 August – 10 September), applies from the start, and is accepted." },
  "01058200970": { title: "Not accepted directly, nor in the lottery", note: "Born in 1958, with his wife هدى: not accepted directly (the seats were filled at 69 and he is 68), then registered for the lottery, where his birth year was not drawn. He opens on «My application» to see the season's final result." },
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
      actions.register({ nationalId, phone: `0944${nationalId.slice(-6)}`, password: "hajj1448", createdAt: nowMs(), emergencyName: "سارة", emergencyPhone: "0933000412" });
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
    if (!accounts[nationalId]) actions.register({ nationalId, phone: `0944${nationalId.slice(-6)}`, password: "hajj1448", createdAt: nowMs() });
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
