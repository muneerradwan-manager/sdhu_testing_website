"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, PencilLine, ShieldQuestion, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { AuthShell, CivilRecordCard, EmailField, FirstNameField, FormError, NationalIdField, OtpStep, PasswordField, PhoneField, StepTitle, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP, Field, ProgressChecklist, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { useLang, useT } from "@/lib/i18n";
import { FIRST_NAME_TRIES, ageOf, firstNameMatches, getPerson, isValidNationalId, type Person } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
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
  /** Step 0 (account type) was removed: this page creates a pilgrim account directly */
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

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const errors = {
    nationalId: !isValidNationalId(form.nationalId) && t("الرقم الوطني يتكون من 11 رقماً", "The national ID has 11 digits"),
    firstName: !form.firstName.trim() && t("اكتب اسمك الأول كما في البطاقة الشخصية", "Type your first name as on your ID card"),
    phone: !/^09\d{8}$/.test(form.phone) && t("رقم الهاتف يبدأ بـ 09 ويتكون من 10 أرقام", "The phone number starts with 09 and has 10 digits"),
    email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) && t("صيغة البريد غير صحيحة", "This email address is not valid"),
    password: form.password.length < 6 && t("كلمة المرور 6 أحرف على الأقل", "The password needs at least 6 characters"),
  };
  // Nothing about a national number — not even that it has an account — until its first name matches
  const owner = isValidNationalId(form.nationalId) && firstNameMatches(form.nationalId, form.firstName);
  const exists = touched && owner && accounts[form.nationalId];
  /** One account type per person: an administrator cannot also hold a pilgrim account */
  const isAdmin = touched && owner && !!admins[form.nationalId];
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
    go(5);
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E"] });
    setTimeout(
      () =>
        toast({
          title: t(`أهلاً ${person?.firstName}`, `Welcome, ${person?.firstName}`),
          body: t(
            "تم إنشاء حسابك في منصة الحج الوطنية. التسجيل على القبول المباشر لموسم 1448هـ من 12 إلى 25 آب، والتسجيل الأولي على القرعة بطلب مستقل من 26 آب إلى 10 أيلول، ومعك حتى ثلاثة مرافقين.",
            "Your account on the National Hajj Platform has been created. Registration for direct acceptance for the 1448 AH season runs from 12 to 25 August, and lottery pre-registration, a separate application, from 26 August to 10 September. You can bring up to three companions.",
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
      title={t("إنشاء حساب حاج", "Create a pilgrim account")}
      subtitle={t("حساب الحاج لتقديم طلب الحج لك ولعائلتك ومتابعته. لا نطلب منك إلا خمسة حقول، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة.", "A pilgrim account lets you apply for Hajj for yourself and your family, and follow the application. We ask for just five fields; your official details come straight from the Civil Registry.")}
      steps={STEPS}
      step={step - 1}
      tabs={step === 1}
      note={t("لكل شخص نوع حساب واحد في المنصة: حاج، أو إداري، أو موظف. وحساب الموظف لا يُنشأ ذاتياً؛ تنشئه الإدارة.", "Each person holds one type of account on the platform: pilgrim, administrator or staff. Staff accounts cannot be self-created; the Administration creates them.")}
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
                        ? t("هذا الرقم لديه حساب حاج بالفعل.", "This number already has a pilgrim account.")
                        : isAdmin
                          ? t("هذا الرقم مسجّل بحساب إداري، ولكل شخص نوع حساب واحد في المنصة.", "This number belongs to an administrator account, and each person holds one type of account on the platform.")
                          : null
                }
                link={locked || mismatch ? undefined : exists ? { href: "/login", label: t("سجّل الدخول", "Sign in") } : isAdmin ? { href: "/administrator/login", label: t("دخول الإداريين", "Administrator sign-in") } : undefined}
              />
              <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={touched && errors.phone} />
              <EmailField value={form.email} onChange={(v) => setForm({ ...form, email: v })} hint={t("للإشعارات والإيصالات إن رغبت", "For notifications and receipts, if you like")} error={touched && errors.email} />
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={touched && errors.password} strength autoComplete="new-password" />
              <Button type="submit" size="lg" className="w-full" disabled={locked}>
                {t("إرسال رمز التحقق", "Send verification code")} <ArrowLeft className="size-5" />
              </Button>
              <SwitchLine text={t("لديك حساب؟", "Already have an account?")} href="/login" label={t("سجّل الدخول", "Sign in")} />
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
                {t("تم إنشاء ملف الحاج الخاص بك، وهو ملف دائم يبقى معك عبر المواسم. التسجيل لموسم 1448هـ مفتوح الآن.", "Your pilgrim profile has been created. It is permanent and stays with you from one season to the next. Registration for the 1448 AH season is now open.")}
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
                <Button size="xl" variant="gold" onClick={() => router.push("/portal/apply")}>
                  {t("تقديم طلب حج الآن", "Apply for Hajj now")} <ArrowLeft className="size-6" />
                </Button>
                <Button size="xl" variant="outline" onClick={() => router.push("/portal")}>
                  <UserRound className="size-6" /> {t("ملفي", "My profile")}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
