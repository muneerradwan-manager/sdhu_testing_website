"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, BadgeCheck, Camera, PencilLine, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { AuthShell, CivilRecordCard, EmailField, FormError, NationalIdField, OtpStep, PasswordField, PhoneField, StepTitle, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP, Field, ProgressChecklist, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { ageOf, getPerson, isValidNationalId, type Person } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn, digitsOnly } from "@/lib/utils";

/** Step 0 (account type) was removed: this page creates a pilgrim account directly */
const STEPS = ["البيانات الأساسية", "رمز التحقق", "الشؤون المدنية", "معلومات إضافية", "الحساب جاهز"];

export function RegisterFlow() {
  const router = useRouter();
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ nationalId: "", phone: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [fetched, setFetched] = useState(false);
  const [extra, setExtra] = useState({ altPhone: "", emergencyName: "", emergencyPhone: "", photo: "" });
  const [rating, setRating] = useState(0);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const errors = {
    nationalId: !isValidNationalId(form.nationalId) && "الرقم الوطني يتكون من 11 رقماً",
    phone: !/^09\d{8}$/.test(form.phone) && "رقم الهاتف يبدأ بـ 09 ويتكون من 10 أرقام",
    email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) && "صيغة البريد غير صحيحة",
    password: form.password.length < 6 && "كلمة المرور 6 أحرف على الأقل",
  };
  const exists = isValidNationalId(form.nationalId) && accounts[form.nationalId];
  /** One account type per person: an administrator cannot also hold a pilgrim account */
  const isAdmin = isValidNationalId(form.nationalId) && !!admins[form.nationalId];

  const sendOtp = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || exists || isAdmin) return;
    go(2);
    setTimeout(
      () =>
        toast({
          title: "رسالة نصية جديدة",
          body: `منصة الحج الوطنية: رمز التحقق الخاص بك هو ${DEMO_OTP}. لا تشاركه مع أحد.`,
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
    });
    go(5);
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E"] });
    setTimeout(
      () =>
        toast({
          title: `أهلاً ${person?.firstName}`,
          body: "تم إنشاء حسابك في منصة الحج الوطنية. التسجيل على القبول المباشر لموسم 1448هـ مفتوح حتى 1 رجب، والتسجيل على القرعة بطلب مستقل من 16 إلى 25 رجب، ومعك حتى ثلاثة مرافقين.",
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
      title="إنشاء حساب حاج"
      subtitle="حساب الحاج لتقديم طلب الحج لك ولعائلتك ومتابعته. لا نطلب منك إلا أربعة حقول، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة."
      steps={STEPS}
      step={step - 1}
      tabs={step === 1}
      note="لكل شخص نوع حساب واحد في المنصة: حاج، أو إداري، أو موظف. وحساب الموظف لا يُنشأ ذاتياً؛ تنشئه الإدارة."
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
              <StepTitle action={<SpeakButton text="أدخل الرقم الوطني ورقم الهاتف والبريد الإلكتروني إن رغبت، ثم كلمة المرور." />}>البيانات الأساسية</StepTitle>
              <NationalIdField value={form.nationalId} onChange={(v) => setForm({ ...form, nationalId: v })} placeholder="01012345412" hint="مفتاحك في المنصة كلها — تجده على البطاقة الشخصية" error={touched && errors.nationalId} />
              <FormError
                text={exists ? "هذا الرقم لديه حساب حاج بالفعل." : isAdmin ? "هذا الرقم مسجّل بحساب إداري، ولكل شخص نوع حساب واحد في المنصة." : null}
                link={exists ? { href: "/login", label: "سجّل الدخول" } : isAdmin ? { href: "/administrator/login", label: "دخول الإداريين" } : undefined}
              />
              <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={touched && errors.phone} />
              <EmailField value={form.email} onChange={(v) => setForm({ ...form, email: v })} hint="للإشعارات والإيصالات إن رغبت" error={touched && errors.email} />
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={touched && errors.password} strength autoComplete="new-password" />
              <Button type="submit" size="lg" className="w-full">
                إرسال رمز التحقق <ArrowLeft className="size-5" />
              </Button>
              <SwitchLine text="لديك حساب؟" href="/login" label="سجّل الدخول" />
            </form>
          )}

          {step === 2 && (
            <OtpStep
              phone={form.phone}
              confirm="تحقق"
              onSuccess={verifyOtp}
              onResend={() => toast({ title: "أُعيد إرسال الرمز", body: `الرمز: ${DEMO_OTP}`, icon: "💬", tone: "gold" })}
              back={{ label: "تعديل رقم الهاتف", onClick: () => go(1) }}
            />
          )}

          {step === 3 && person && (
            <div>
              <StepTitle sub={fetched ? "راجعها وأكّدها فقط — لا حاجة لإعادة إدخال أي شيء." : "يستغرق ذلك ثوانيَ قليلة."}>
                {fetched ? "هذه بياناتك كما وردت من الشؤون المدنية" : "نجلب بياناتك الرسمية..."}
              </StepTitle>
              <div className="mt-8">
                {!fetched ? (
                  <ProgressChecklist
                    onDone={onFetched}
                    steps={["الاتصال الآمن بالشؤون المدنية", "التحقق من الرقم الوطني", "جلب القيد والبيانات الشخصية", "مطابقة رقم الهاتف"]}
                  />
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <CivilRecordCard
                      person={person}
                      rows={[
                        ["الاسم الكامل", `${person.firstName} ${person.fatherName} ${person.lastName}`],
                        ["اسم الأب", person.fatherName],
                        ["اسم الأم", person.motherName],
                        ["تاريخ الميلاد", `${person.birthDate} (${ageOf(person)} عاماً)`],
                        ["الجنس", person.gender === "M" ? "ذكر" : "أنثى"],
                        ["مكان الولادة", person.birthPlace],
                        ["المحافظة", person.governorate],
                        ["مكان القيد", person.registry],
                        ["الحالة المدنية", person.maritalStatus],
                        ["رقم دفتر العائلة", person.familyBookNo],
                      ]}
                    />
                    <div className="mt-8 flex flex-wrap justify-between gap-3">
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast({
                            title: "سيتم التحقق يدوياً",
                            body: "في المنصة الفعلية تُدخل بياناتك بنفسك وترفع وثيقة تثبتها، وتُعلَّم «غير مؤكدة» حتى يراجعها موظف التسجيل.",
                            tone: "info",
                            icon: "📝",
                          })
                        }
                      >
                        <PencilLine className="size-4" /> البيانات غير صحيحة
                      </Button>
                      <Button size="lg" onClick={() => go(4)}>
                        نعم، بياناتي صحيحة <ArrowLeft className="size-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {step === 4 && person && (
            <div className="space-y-6">
              <StepTitle sub="كلها اختيارية ويمكنك إضافتها لاحقاً من ملفك.">معلومات لا تملكها الشؤون المدنية</StepTitle>
              <div className="flex items-center gap-5 rounded-3xl bg-sand p-5">
                <label className="group relative grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-gold-dark bg-white">
                  {extra.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={extra.photo} alt="الصورة الشخصية" className="size-full object-cover" />
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
                  <p className="font-bold">الصورة الشخصية</p>
                  <p className="text-sm leading-6 text-ink-soft">خلفية بيضاء وحديثة. تُستخدم في بطاقة الحاج الرقمية.</p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="رقم هاتف بديل" optional>
                  <input dir="ltr" inputMode="tel" className={cn(inputClass, "text-left")} value={extra.altPhone} onChange={(e) => setExtra({ ...extra, altPhone: digitsOnly(e.target.value) })} />
                </Field>
                <div />
                <Field label="جهة اتصال للطوارئ" optional hint="شخص يبقى في سوريا ونبلغه بمحطات رحلتك">
                  <input className={inputClass} placeholder="مثال: سارة (ابنتي)" value={extra.emergencyName} onChange={(e) => setExtra({ ...extra, emergencyName: e.target.value })} />
                </Field>
                <Field label="هاتف جهة الطوارئ" optional>
                  <input dir="ltr" inputMode="tel" className={cn(inputClass, "text-left")} value={extra.emergencyPhone} onChange={(e) => setExtra({ ...extra, emergencyPhone: digitsOnly(e.target.value) })} />
                </Field>
              </div>
              <div className="flex flex-wrap justify-between gap-3 pt-2">
                <Button variant="ghost" onClick={() => go(3)}>
                  <ArrowRight className="size-4" /> رجوع
                </Button>
                <Button size="lg" onClick={finish}>
                  إنشاء الحساب <BadgeCheck className="size-5" />
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
              <h2 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">أهلاً {person.firstName}، حسابك جاهز</h2>
              <p className="mx-auto mt-3 max-w-lg leading-8 text-ink-soft">
                تم إنشاء ملف الحاج الخاص بك، وهو ملف دائم يبقى معك عبر المواسم. التسجيل لموسم 1448هـ مفتوح الآن.
              </p>
              <div className="mx-auto mt-8 max-w-md rounded-3xl border border-gold/40 bg-sand p-6">
                <p className="font-bold">كيف كانت تجربة إنشاء الحساب؟</p>
                <div className="mt-3 flex justify-center">
                  <StarRating
                    value={rating}
                    size="lg"
                    onChange={(v) => {
                      setRating(v);
                      actions.updateAccount(person.id, { rating: v });
                      toast({ title: "شكراً لتقييمك", body: "تُجمع التقييمات في لوحة جودة الخدمة تحت بند «التسجيل».", icon: "⭐", tone: "gold" });
                    }}
                  />
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="xl" variant="gold" onClick={() => router.push("/portal/apply")}>
                  تقديم طلب حج الآن <ArrowLeft className="size-6" />
                </Button>
                <Button size="xl" variant="outline" onClick={() => router.push("/portal")}>
                  <UserRound className="size-6" /> ملفي
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
