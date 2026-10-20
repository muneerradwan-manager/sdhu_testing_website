"use client";

import { enterDemoCase, caseCta } from "@/lib/demo-cases";
import { isPhone, toInternational } from "@/lib/phone";
import { useOperation } from "@/lib/operations";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, BadgeCheck, Briefcase, CalendarClock, Camera, GraduationCap, PencilLine, ShieldQuestion, UserRound } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AuthShell, CivilRecordCard, DemoAccounts, EmailField, FirstNameField, FormError, NationalIdField, OtpStep, PasswordField, PhoneField, StepTitle, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP, Field, ProgressChecklist, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { Badge, SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { useLang, useT } from "@/lib/i18n";
import { DEMO_SCENARIOS, FIRST_NAME_TRIES, ageOf, firstNameMatches, getPerson, isValidNationalId, type Person } from "@/lib/registry";
import { adminSignups, memberSignups, pilgrimSignups, type SignupDemo } from "@/lib/demo-signup";
import { participations } from "@/lib/account";
import { actions, getState, seasonNow, useStore } from "@/lib/store";
import { cn, digitsOnly } from "@/lib/utils";
import { CivilCorrection, type CivilDraft } from "./civil-correction";

/** The civil registry's words in English: cities by their usual names; a neighbourhood (a name) stays as it is */
const PLACES_EN: Record<string, string> = { دمشق: "Damascus", "ريف دمشق": "Rural Damascus", حلب: "Aleppo", حمص: "Homs", حماة: "Hama", اللاذقية: "Latakia", درعا: "Daraa", دوما: "Douma" };
const MARITAL_EN: Record<string, string> = { متزوج: "Married", متزوجة: "Married", عازب: "Single", عزباء: "Single", أرملة: "Widowed", أرمل: "Widowed", مطلقة: "Divorced", مطلق: "Divorced" };
const placeEn = (v: string) => PLACES_EN[v] ?? v;
/** "دمشق 5412": the city in English, the register's number as it is */
const registryEn = (v: string) => {
  const city = Object.keys(PLACES_EN).find((c) => v === c || v.startsWith(`${c} `));
  return city ? PLACES_EN[city] + v.slice(city.length) : v;
};

export function RegisterFlow() {
  const t = useT();
  const en = useLang() === "en";
  /**
   * One account for everyone on the platform, with no type: it is not asked what it is for. Its holder may only learn
   * in the Academy; each season he chooses the Hajj or an administrative role (lib/account.ts)
   */
  const STEPS = [t("البيانات الأساسية", "Basic details"), t("رمز التحقق", "Verification code"), t("الشؤون المدنية", "Civil Registry"), t("معلومات إضافية", "Extra details"), t("الحساب جاهز", "Account ready")];
  const router = useRouter();
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ nationalId: "", firstName: "", phone: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);
  /** Wrong first names typed so far, and whether the last one was wrong */
  const [tries, setTries] = useState(0);
  const [mismatch, setMismatch] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [fetched, setFetched] = useState(false);
  // «البيانات غير صحيحة»: the correction being written, then the one sent with the account for review
  const [correcting, setCorrecting] = useState(false);
  const [claim, setClaim] = useState<CivilDraft | null>(null);
  const [extra, setExtra] = useState({ altPhone: "", emergencyName: "", emergencyPhone: "", photo: "" });
  const [rating, setRating] = useState(0);
  // The demo data, filtered as on the sign-in page: the pilgrims' people, or the administrators'
  const [demoTab, setDemoTab] = useState<"pilgrims" | "admins" | "members">("pilgrims");

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The demo's ready-made people, each with no account on this device yet
  const signups = useMemo(() => pilgrimSignups((x) => !!accounts[x] || !!admins[x]), [accounts, admins]);
  const adminPeople = useMemo(() => adminSignups((x) => !!accounts[x] || !!admins[x]), [accounts, admins]);
  const memberPeople = useMemo(() => memberSignups((x) => !!accounts[x] || !!admins[x]), [accounts, admins]);
  const fillDemo = (d: SignupDemo) => {
    setForm({ ...form, nationalId: d.person.id, firstName: d.person.firstName, phone: toInternational(d.phone), password: d.password });
    setTouched(false);
    setMismatch(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // The six cases of the demo, whose account is created here like any pilgrim's; one tried before on this device
  // is forgotten first, so its account is created afresh
  const directOp = useOperation("hajj-direct");
  // What he came for, from the home page's buttons: «ابدأ طلب الحج» (?for=hajj) or «التسجيل بصفة إداري» (?for=admin).
  // The account is created as always, then he goes straight on to that form instead of the «حسابك جاهز» choices
  const wants = useSearchParams().get("for");
  const intent = wants === "hajj" || wants === "admin" ? wants : null;
  const lotteryOp = useOperation("hajj-lottery");
  const cases = DEMO_SCENARIOS.filter((s) => s.outcome).sort((a, b) => a.outcome! - b.outcome!);
  const pickCase = (id: string) => {
    if (accounts[id]) {
      actions.forgetPilgrim(id);
      toast({ title: t("بدأت الحالة من جديد", "The case starts afresh"), body: t("كان لها حساب على هذا الجهاز من تجربة سابقة، فحُذف لتنشئه الآن.", "It had an account on this device from an earlier try, removed so you create it now."), icon: "🔄", tone: "info" });
    }
    const p = getPerson(id)!;
    fillDemo({ key: id, title: "", note: "", person: p, phone: `0944${id.slice(-6)}`, password: "Hajj@1448" });
  };
  const caseLink = person ? caseCta(person.id) : null;
  const goToCase = () => {
    if (!person) return;
    router.push(enterDemoCase(person.id, { direct: directOp, lottery: lotteryOp }) ?? "/portal");
  };

  const errors = {
    nationalId: !isValidNationalId(form.nationalId) && t("الرقم الوطني يتكون من 11 رقماً", "The national ID has 11 digits"),
    firstName: !form.firstName.trim() && t("اكتب اسمك الأول كما في البطاقة الشخصية", "Type your first name as on your ID card"),
    phone: !isPhone(form.phone) && t("اكتب رقم هاتف صحيحاً للدولة التي اخترتها", "Type a valid phone number for the country you chose"),
    email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) && t("صيغة البريد غير صحيحة", "This email address is not valid"),
    password: form.password.length < 6 && t("كلمة المرور 6 أحرف على الأقل", "The password needs at least 6 characters"),
  };
  // Nothing about a national number — not even that it has an account — until its first name matches
  const owner = isValidNationalId(form.nationalId) && firstNameMatches(form.nationalId, form.firstName);
  const exists = touched && owner && (!!accounts[form.nationalId] || !!admins[form.nationalId]);
  const locked = tries >= FIRST_NAME_TRIES;

  const sendOtp = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || locked) return;
    if (!owner) {
      setTries(tries + 1);
      setMismatch(true);
      return;
    }
    if (accounts[form.nationalId] || admins[form.nationalId]) return;
    go(2);
    setTimeout(
      () =>
        toast({
          title: t("رسالة نصية جديدة", "New text message"),
          body: t(`منصة الحج الوطنية: رمز التحقق الخاص بك هو ${DEMO_OTP}. لا تشاركه مع أحد.`, `National Hajj Platform: your verification code is ${DEMO_OTP}. Do not share it with anyone.`),
          icon: "💬",
          tone: "gold",
        }),
      900,
    );
  };

  const verifyOtp = () => {
    setPerson(getPerson(form.nationalId));
    setFetched(false);
    go(3);
  };

  const onFetched = useCallback(() => setFetched(true), []);

  /** The administrators' way for this season: his administrative file opens on the account, then «التسجيل كإداري» */
  const toAdmin = () => {
    if (!person) return;
    actions.chooseSeasonPath(person.id, seasonNow(getState()), "admin");
    router.push("/portal/role");
  };
  // Whoever took part in an earlier season (the Hajj or a role) finds his record with his account
  const past = person ? participations(getState(), person.id).filter((r) => !r.current && r.kind !== "none") : [];

  const finish = () => {
    actions.register({
      nationalId: form.nationalId,
      phone: form.phone,
      email: form.email || undefined,
      password: form.password,
      createdAt: Date.now(),
      altPhone: extra.altPhone || undefined,
      emergencyName: extra.emergencyName || undefined,
      emergencyPhone: extra.emergencyPhone || undefined,
      civil: claim ? { ...claim, at: Date.now(), status: "pending" } : undefined,
    });
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E"] });
    if (intent) {
      // Straight on to what he came for: the Hajj application (or his demo case's own way), or «التسجيل كإداري»
      toast({
        title: t(`أهلاً ${person?.firstName}، حسابك جاهز`, `Welcome, ${person?.firstName}. Your account is ready`),
        body: intent === "admin" ? t("ننقلك الآن إلى التسجيل بصفة إداري.", "Taking you to registering as an administrator now.") : t("ننقلك الآن إلى طلب الحج.", "Taking you to the Hajj application now."),
        icon: "🕋",
        tone: "success",
      });
      if (intent === "admin") toAdmin();
      else if (caseLink) goToCase();
      else router.push("/portal/apply");
      return;
    }
    go(5);
    setTimeout(
      () =>
        toast({
          title: t(`أهلاً ${person?.firstName}`, `Welcome, ${person?.firstName}`),
          body: t(
            "تم إنشاء حسابك في منصة الحج الوطنية. به تتعلّم في الأكاديمية متى شئت، وتختار في كل موسم: التسجيل على الحج، أو التقدّم لصفة إدارية.",
            "Your account on the National Hajj Platform has been created. With it you learn in the Academy whenever you like, and each season you choose: register for Hajj, or apply for an administrative role.",
          ),
          icon: "🕋",
          tone: "success",
        }),
      700,
    );
  };

  return (
    <AuthShell
      portal="pilgrim"
      page="register"
      title={t("إنشاء حساب في المنصة", "Create an account on the platform")}
      subtitle={
        intent
          ? intent === "admin"
            ? t("أنشئ حسابك في المنصة أولاً، وننقلك بعده مباشرة إلى التسجيل بصفة إداري. حساب واحد لك في المنصة كلها، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة.", "Create your account on the platform first, and we take you straight on to registering as an administrator. One account for the whole platform; your official details come straight from the Civil Registry.")
            : t("أنشئ حسابك في المنصة أولاً، وننقلك بعده مباشرة إلى طلب الحج. حساب واحد لك في المنصة كلها، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة.", "Create your account on the platform first, and we take you straight on to the Hajj application. One account for the whole platform; your official details come straight from the Civil Registry.")
          : t("حساب واحد لك في المنصة كلها: تتعلّم به في الأكاديمية، وتختار به في كل موسم أن تسجّل على الحج أو تتقدّم لصفة إدارية. لا نطلب منك إلا خمسة حقول، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة.", "One account for the whole platform: learn in the Academy, and each season choose to register for Hajj or apply for an administrative role. We ask for just five fields; your official details come straight from the Civil Registry.")
      }
      steps={STEPS}
      step={step - 1}
      note={t("حساب واحد لكل شخص، لا نوع له: إنشاؤه متاح دائماً، وفي كل موسم تختار به الحج أو صفة إدارية، ولا تجمع بينهما في موسم واحد. وسجلّ مواسمك وتقدّمك في الأكاديمية يبقيان معك. وحساب الموظف لا يُنشأ ذاتياً؛ تنشئه الإدارة.", "One account per person, with no type: you can create it at any time, and each season you choose the Hajj or an administrative role with it, never both in one season. Your record of seasons and your Academy progress stay with you. Staff accounts are created by the Administration.")}
      below={
        step === 1 && (
          <div className="space-y-4">
            <div role="tablist" aria-label={t("البيانات التجريبية", "Demo data")} className="flex flex-wrap gap-2">
              {(
                [
                  ["pilgrims", t("حجاج", "Pilgrims")],
                  ["admins", t("إداريون", "Administrators")],
                  ["members", t("أشخاص لن يسجّلوا على شيء", "People registering for nothing")],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={demoTab === k} onClick={() => setDemoTab(k)} className={cn("rounded-2xl px-4 py-2 text-sm font-bold transition", demoTab === k ? "bg-green-dark text-white" : "bg-white text-green-dark ring-1 ring-gold/40 hover:bg-sand")}>
                  {l}
                </button>
              ))}
            </div>
            {demoTab === "pilgrims" ? (
            <DemoAccounts
              heading={t("بيانات تجريبية لإنشاء حساب", "Demo data to create an account")}
              action={t("املأ النموذج", "Fill the form")}
              hint={t(
                "اضغط على بطاقة فتُملأ الحقول بها، ثم أكمل: رمز التحقق 1448، ثم بياناتك من الشؤون المدنية. وبعد إنشاء الحساب يأخذك زر الحالة إلى ما بعدها: تقديم الطلب، أو متابعته، أو الموسم؛ أو تختار ما تفعله هذا الموسم: الحج، أو صفة إدارية.",
                "A person from the demo Civil Registry for each situation, with no account yet. Click a card to fill the fields, then go on: the verification code 1448, then your details from the Civil Registry. Once the account is created, choose what you do this season: the Hajj, or an administrative role.",
              )}
              groups={[
                {
                  label: t("الحالات الست: أنشئ حسابها، ثم تكمل منه حالتها", "The six cases: create the account, then carry on with its case"),
                  items: cases.map((s) => ({
                    key: s.id,
                    title: s.title,
                    subtitle: t(`الحالة ${s.outcome} من 6`, `Case ${s.outcome} of 6`),
                    note: s.note,
                    code: s.id,
                    initial: String(s.outcome),
                    onPick: () => pickCase(s.id),
                  })),
                },
                {
                  label: t("أشخاص لتجربة إنشاء الحساب والطلب من أوله", "People for trying the account and the application from the start"),
                  items: signups.map((d) => ({
                    key: d.key,
                    title: `${d.person.firstName} ${d.person.lastName} — ${d.title}`,
                    note: `${d.note} ${t(`مواليد ${d.person.birthDate.slice(0, 4)}.`, `Born ${d.person.birthDate.slice(0, 4)}.`)}`,
                    code: d.person.id,
                    initial: d.person.firstName[0],
                    onPick: () => fillDemo(d),
                  })),
                },
              ]}
            />
            ) : demoTab === "admins" ? (
            <DemoAccounts
              heading={t("بيانات تجريبية لإنشاء حساب", "Demo data to create an account")}
              action={t("املأ النموذج", "Fill the form")}
              hint={t(
                "اضغط على بطاقة فتُملأ الحقول بها، ثم أكمل: رمز التحقق 1448، ثم بياناتك من الشؤون المدنية. وبعد إنشاء الحساب يأخذك زر الحالة إلى ما بعدها: تقديم الطلب، أو متابعته، أو الموسم؛ أو تختار ما تفعله هذا الموسم: الحج، أو صفة إدارية.",
                "A person from the demo Civil Registry for each situation, with no account yet. Click a card to fill the fields, then go on: the verification code 1448, then your details from the Civil Registry. Once the account is created, choose what you do this season: the Hajj, or an administrative role.",
              )}
              groups={[
                {
                  label: t("أشخاص لتجربة التقدّم لصفة إدارية: أنشئ الحساب، ثم اختر المسار الإداري لهذا الموسم", "People for trying an administrative role: create the account, then choose the administrators' way this season"),
                  items: adminPeople.map((d) => ({
                    key: `admin-${d.key}`,
                    title: `${d.person.firstName} ${d.person.lastName} — ${d.title}`,
                    note: `${d.note} ${t(`مواليد ${d.person.birthDate.slice(0, 4)}.`, `Born ${d.person.birthDate.slice(0, 4)}.`)}`,
                    code: d.person.id,
                    initial: d.person.firstName[0],
                    onPick: () => fillDemo(d),
                  })),
                },
              ]}
            />
            ) : (
              <DemoAccounts
                heading={t("أشخاص لن يسجّلوا على شيء هذا الموسم", "People registering for nothing this season")}
                action={t("املأ النموذج", "Fill the form")}
                hint={t(
                  "اضغط على بطاقة فتُملأ الحقول بها، ثم أكمل إنشاء الحساب. بعده اضغط «ملفي»: تكون عضواً في المنصة، تتعلّم في الأكاديمية وتعلّق على الأخبار، وتختار الحج أو صفة إدارية متى شئت.",
                  "Click a card to fill the fields, then create the account. Then press «My profile»: you are a member of the platform, learning in the Academy and commenting on the news, choosing the Hajj or a role whenever you like.",
                )}
                groups={[
                  {
                    items: memberPeople.map((d) => ({
                      key: `member-${d.key}`,
                      title: `${d.person.firstName} ${d.person.lastName} — ${d.title}`,
                      note: `${d.note} ${t(`مواليد ${d.person.birthDate.slice(0, 4)}.`, `Born ${d.person.birthDate.slice(0, 4)}.`)}`,
                      code: d.person.id,
                      initial: d.person.firstName[0],
                      onPick: () => fillDemo(d),
                    })),
                  },
                ]}
              />
            )}
          </div>
        )
      }
    >
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * 40 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
              className="space-y-6"
            >
              {/* The read-aloud voice speaks Arabic only, so the button is for the Arabic page */}
              <StepTitle action={en ? undefined : <SpeakButton text="أدخل الرقم الوطني واسمك الأول كما في البطاقة الشخصية، ثم رقم الهاتف، والبريد الإلكتروني إن رغبت، ثم كلمة المرور." />}>{t("البيانات الأساسية", "Basic details")}</StepTitle>
              <NationalIdField
                value={form.nationalId}
                onChange={(v) => {
                  setForm({ ...form, nationalId: v });
                  setMismatch(false);
                }}
                placeholder="01012345412"
                hint={t("مفتاحك في المنصة كلها — تجده على البطاقة الشخصية", "Your key to the whole platform: you will find it on your ID card")}
                error={touched && errors.nationalId}
              />
              <FirstNameField
                value={form.firstName}
                onChange={(v) => {
                  setForm({ ...form, firstName: v });
                  setMismatch(false);
                }}
                error={touched && errors.firstName}
                demoName={isValidNationalId(form.nationalId) ? getPerson(form.nationalId)?.firstName : undefined}
              />
              <FormError
                text={
                  locked
                    ? t(
                        `أُدخل اسم أول لا يطابق الرقم الوطني ${FIRST_NAME_TRIES} مرات، فأُوقف إنشاء الحساب. إن كان الرقم رقمك فراجع مكتب التسجيل في محافظتك ومعك بطاقتك الشخصية.`,
                        `A first name that does not match the national ID was typed ${FIRST_NAME_TRIES} times, so creating the account has stopped. If the number is yours, visit the registration office in your governorate with your ID card.`,
                      )
                    : mismatch
                      ? t(
                          `الاسم الأول لا يطابق الرقم الوطني في سجل الشؤون المدنية. اكتبه كما في بطاقتك الشخصية (بقي ${FIRST_NAME_TRIES - tries} محاولات).`,
                          `The first name does not match the national ID in the Civil Registry. Type it as on your ID card (${FIRST_NAME_TRIES - tries} tries left).`,
                        )
                      : exists
                        ? t("لهذا الرقم حساب في المنصة بالفعل، حاجاً كان صاحبه أو إدارياً.", "This number already has an account on the platform, as a pilgrim or an administrator.")
                        : null
                }
                link={locked || mismatch ? undefined : exists ? { href: "/login", label: t("سجّل الدخول", "Sign in") } : undefined}
              />
              <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={touched && errors.phone} />
              <EmailField value={form.email} onChange={(v) => setForm({ ...form, email: v })} hint={t("للإشعارات والإيصالات إن رغبت", "For notifications and receipts, if you like")} error={touched && errors.email} />
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={touched && errors.password} strength autoComplete="new-password" />
              <Button type="submit" size="lg" className="w-full" disabled={locked}>
                {t("إرسال رمز التحقق", "Send verification code")} <ArrowLeft className="size-5" />
              </Button>
              <SwitchLine text={t("لديك حساب؟", "Already have an account?")} href={intent === "admin" ? "/login?next=%2Fportal%3Fchoose%3Dadmin" : intent === "hajj" ? "/login?next=%2Fportal%2Fapply" : "/login"} label={t("سجّل الدخول", "Sign in")} />
            </form>
          )}

          {step === 2 && (
            <OtpStep
              phone={form.phone}
              confirm={t("تحقق", "Verify")}
              onSuccess={verifyOtp}
              onResend={() => toast({ title: t("أُعيد إرسال الرمز", "Code sent again"), body: t(`الرمز: ${DEMO_OTP}`, `Code: ${DEMO_OTP}`), icon: "💬", tone: "gold" })}
              back={{ label: t("تعديل رقم الهاتف", "Change phone number"), onClick: () => go(1) }}
            />
          )}

          {step === 3 && person && correcting && (
            <div>
              <StepTitle sub={t("اكتب الصحيح بنفسك وارفع ما يثبته.", "Type the correct details yourself and upload what proves them.")}>{t("تصحيح بياناتك المدنية", "Correcting your civil details")}</StepTitle>
              <div className="mt-8">
                <CivilCorrection
                  person={person}
                  onCancel={() => setCorrecting(false)}
                  onSubmit={(d) => {
                    setClaim(d);
                    setCorrecting(false);
                    go(4);
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && person && !correcting && (
            <div>
              <StepTitle sub={fetched ? t("راجعها وأكّدها فقط — لا حاجة لإعادة إدخال أي شيء.", "Just check and confirm them; there is nothing to type again.") : t("يستغرق ذلك ثوانيَ قليلة.", "This takes a few seconds.")}>
                {fetched ? t("هذه بياناتك كما وردت من الشؤون المدنية", "Your details as received from the Civil Registry") : t("نجلب بياناتك الرسمية...", "Fetching your official details…")}
              </StepTitle>
              <div className="mt-8">
                {!fetched ? (
                  <ProgressChecklist
                    onDone={onFetched}
                    steps={[t("الاتصال الآمن بالشؤون المدنية", "Secure connection to the Civil Registry"), t("مطابقة الرقم الوطني والاسم الأول", "Matching the national ID and first name"), t("جلب القيد والبيانات الشخصية", "Fetching the civil record and personal details"), t("مطابقة رقم الهاتف", "Matching the phone number")]}
                  />
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <CivilRecordCard
                      person={person}
                      rows={[
                        [t("الاسم الكامل", "Full name"), `${person.firstName} ${person.fatherName} ${person.lastName}`],
                        [t("اسم الأب", "Father's name"), person.fatherName],
                        [t("اسم الأم", "Mother's name"), person.motherName],
                        [t("تاريخ الميلاد", "Date of birth"), t(`${person.birthDate} (${ageOf(person)} عاماً)`, `${person.birthDate} (aged ${ageOf(person)})`)],
                        [t("الجنس", "Sex"), person.gender === "M" ? t("ذكر", "Male") : t("أنثى", "Female")],
                        [t("مكان الولادة", "Place of birth"), en ? placeEn(person.birthPlace) : person.birthPlace],
                        [t("المحافظة", "Governorate"), en ? placeEn(person.governorate) : person.governorate],
                        [t("مكان القيد", "Place of registration"), en ? registryEn(person.registry) : person.registry],
                        [t("الحالة المدنية", "Marital status"), en ? (MARITAL_EN[person.maritalStatus] ?? person.maritalStatus) : person.maritalStatus],
                        [t("رقم دفتر العائلة", "Family book number"), person.familyBookNo],
                      ]}
                    />
                    {past.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-gold/40 p-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-green-dark">
                          <CalendarClock className="size-4 text-gold-dark" /> {t("سجلك الموسمي (يُجلب تلقائياً)", "Your record of seasons (fetched automatically)")}
                        </p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {past.map((h) => (
                            <li key={h.season}>
                              <Badge tone={h.kind === "admin" ? "maroon" : "green"}>
                                {h.season} — {h.kind === "admin" ? t("إداري", "Administrator") : t("حاج", "Pilgrim")}: {h.label}
                                {h.detail && ` — ${h.detail}`}
                                {h.rating ? ` — ${t("تقييم", "rated")} ${h.rating}` : ""}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs leading-5 text-hint">{t("يبقى سجلك معك في حسابك، وتختار في كل موسم ما تفعله.", "Your record stays with your account, and each season you choose what you do.")}</p>
                      </div>
                    )}
                    <div className="mt-8 flex flex-wrap justify-between gap-3">
                      <Button variant="outline" onClick={() => setCorrecting(true)}>
                        <PencilLine className="size-4" /> {t("البيانات غير صحيحة", "These details are wrong")}
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          setClaim(null);
                          go(4);
                        }}
                      >
                        {t("نعم، بياناتي صحيحة", "Yes, my details are correct")} <ArrowLeft className="size-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {step === 4 && person && (
            <div className="space-y-6">
              <StepTitle sub={t("كلها اختيارية ويمكنك إضافتها لاحقاً من ملفك.", "All optional; you can add them later from your profile.")}>{t("معلومات لا تملكها الشؤون المدنية", "Details the Civil Registry does not hold")}</StepTitle>
              <div className="flex items-center gap-5 rounded-3xl bg-sand p-5">
                <label className="group relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-gold-dark bg-white">
                  {extra.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={extra.photo} alt={t("الصورة الشخصية", "Personal photo")} className="size-full object-cover" />
                  ) : (
                    <Camera className="size-8 text-gold-dark transition group-hover:scale-110" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setExtra({ ...extra, photo: URL.createObjectURL(file) });
                    }}
                  />
                </label>
                <div>
                  <p className="font-bold">{t("الصورة الشخصية", "Personal photo")}</p>
                  <p className="text-sm leading-6 text-ink-soft">{t("خلفية بيضاء وحديثة. تُستخدم في بطاقة الحاج الرقمية.", "Recent, on a white background. Used on your digital pilgrim card.")}</p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label={t("رقم هاتف بديل", "Alternative phone number")} optional>
                  <input dir="ltr" inputMode="tel" className={cn(inputClass, "text-left")} value={extra.altPhone} onChange={(e) => setExtra({ ...extra, altPhone: digitsOnly(e.target.value) })} />
                </Field>
                <div />
                <Field label={t("جهة اتصال للطوارئ", "Emergency contact")} optional hint={t("شخص يبقى في سوريا ونبلغه بمحطات رحلتك", "Someone staying in Syria whom we keep informed at each stage of your journey")}>
                  <input className={inputClass} placeholder={t("مثال: سارة (ابنتي)", "e.g. سارة (my daughter)")} value={extra.emergencyName} onChange={(e) => setExtra({ ...extra, emergencyName: e.target.value })} />
                </Field>
                <Field label={t("هاتف جهة الطوارئ", "Emergency contact phone")} optional>
                  <input dir="ltr" inputMode="tel" className={cn(inputClass, "text-left")} value={extra.emergencyPhone} onChange={(e) => setExtra({ ...extra, emergencyPhone: digitsOnly(e.target.value) })} />
                </Field>
              </div>
              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <Button variant="ghost" onClick={() => go(3)}>
                  <ArrowRight className="size-4" /> {t("رجوع", "Back")}
                </Button>
                <Button size="lg" onClick={finish}>
                  {t("إنشاء الحساب", "Create account")} <BadgeCheck className="size-5" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && person && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 12 }}
                className="mx-auto grid size-24 place-items-center rounded-full bg-green-light text-white shadow-2xl shadow-green-light/40"
              >
                <BadgeCheck className="size-12" />
              </motion.div>
              <h2 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">{t(`أهلاً ${person.firstName}، حسابك جاهز`, `Welcome, ${person.firstName}. Your account is ready`)}</h2>
              <p className="mx-auto mt-3 max-w-lg leading-8 text-ink-soft">
                {t(
                  "حسابك دائم يبقى معك عبر المواسم. تعلّم في الأكاديمية متى شئت، واختر ما تفعله في موسم 1448هـ: التسجيل على الحج، أو التقدّم لصفة إدارية. وفي الموسم التالي تختار من جديد.",
                  "Your account is permanent and stays with you from one season to the next. Learn in the Academy whenever you like, and choose what you do in the 1448 AH season: register for Hajj, or apply for an administrative role. Next season you choose again.",
                )}
              </p>
              {claim && (
                <div className="mx-auto mt-6 flex max-w-lg items-start gap-3 rounded-2xl bg-gold/15 p-4 text-start text-sm leading-7 text-ink">
                  <ShieldQuestion className="mt-1 size-5 shrink-0 text-gold-dark" />
                  <p>
                    {t(
                      `بياناتك المدنية «غير مؤكدة»: ${claim.fields.map((f) => f.label).join("، ")}. يراجعها موظف التسجيل مع الوثيقة التي رفعتها، وتجد قراره في ملفك.`,
                      `Your civil details are “unconfirmed”: ${claim.fields.length} field(s). A registration officer reviews them with the document you uploaded, and you will find the decision in your profile.`,
                    )}
                  </p>
                </div>
              )}
              <div className="mx-auto mt-8 max-w-md rounded-3xl border border-gold/40 bg-sand p-6">
                <p className="font-bold">{t("كيف كانت تجربة إنشاء الحساب؟", "How was creating your account?")}</p>
                <div className="mt-3 flex justify-center">
                  <StarRating
                    value={rating}
                    size="lg"
                    onChange={(v) => {
                      setRating(v);
                      actions.updateAccount(person.id, { rating: v });
                      toast({ title: t("شكراً لتقييمك", "Thank you for your rating"), body: t("تُجمع التقييمات في لوحة جودة الخدمة تحت بند «التسجيل».", "Ratings are collected on the service-quality dashboard under “Registration”."), icon: "⭐", tone: "gold" });
                    }}
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {caseLink ? (
                  <Button size="xl" variant="gold" onClick={goToCase}>
                    {caseLink} <ArrowLeft className="size-6" />
                  </Button>
                ) : (
                  <>
                    <Button size="xl" variant="gold" onClick={() => router.push("/portal/apply")}>
                      {t("تقديم طلب حج", "Apply for Hajj")} <ArrowLeft className="size-6" />
                    </Button>
                    <Button size="xl" variant="maroon" onClick={toAdmin}>
                      <Briefcase className="size-6" /> {t("التقدّم لصفة إدارية", "Apply for an administrative role")}
                    </Button>
                  </>
                )}
                <Button size="xl" variant="outline" onClick={() => router.push("/portal")}>
                  <UserRound className="size-6" /> {t("ملفي", "My profile")}
                </Button>
              </div>
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" onClick={() => router.push("/academy")}>
                  <GraduationCap className="size-5" /> {t("أو ابدأ بالأكاديمية الآن", "Or start with the Academy now")}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
