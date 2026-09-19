"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Camera,
  Eye,
  EyeOff,
  IdCard,
  Lock,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PortalShell, Card } from "@/components/portal/shell";
import { DEMO_OTP, DemoPanel, Field, OtpInput, ProgressChecklist, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { SpeakButton, StarRating, useToast } from "@/components/ui/widgets";
import { ageOf, fullName, getPerson, isValidNationalId, type Person } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";

/** Step 0 (account type) was removed: this page creates a pilgrim account directly */
const STEPS = ["البيانات الأساسية", "رمز التحقق", "الشؤون المدنية", "معلومات إضافية", "تم"];

export function RegisterFlow() {
  const router = useRouter();
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ nationalId: "", phone: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(60);
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
  const strength = Math.min(4, [/.{8,}/, /\d/, /[A-Za-z]/, /[^A-Za-z0-9]/].filter((r) => r.test(form.password)).length);

  useEffect(() => {
    if (step !== 2 || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  const sendOtp = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || exists || isAdmin) return;
    setOtp("");
    setResendIn(60);
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
    if (otp !== DEMO_OTP) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 600);
      return;
    }
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
          body: "تم إنشاء حسابك في منصة الحج الوطنية. التسجيل لموسم 1448هـ مفتوح حتى 1 رجب، ومعك حتى ثلاثة مرافقين.",
          icon: "🕋",
          tone: "success",
        }),
      700,
    );
  };

  return (
    <PortalShell
      title="إنشاء حساب حاج"
      subtitle="حساب الحاج لتقديم طلب الحج لك ولعائلتك ومتابعته. لا نطلب منك إلا أربعة حقول، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة."
      aside={
        <>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <ol className="space-y-1">
              {STEPS.map((s, idx) => {
                const i = idx + 1;
                return (
                <li key={s} className={cn("flex items-center gap-3 rounded-xl p-2 text-sm transition", i === step && "bg-green-dark/6")}>
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition",
                      i < step ? "bg-green-light text-white" : i === step ? "bg-green-dark text-gold" : "bg-sand text-hint",
                    )}
                  >
                    {i < step ? "✓" : idx + 1}
                  </span>
                  <span className={cn("font-semibold", i === step ? "text-green-dark" : i < step ? "text-ink" : "text-hint")}>{s}</span>
                </li>
                );
              })}
            </ol>
          </div>
          {step === 1 && (
            <DemoPanel
              onPick={(s) =>
                setForm((f) => ({ ...f, nationalId: s.id, phone: f.phone || `0944${s.id.slice(-6)}`, password: f.password || "hajj1448" }))
              }
            />
          )}
          <p className="flex items-start gap-2 rounded-3xl bg-green-dark/6 p-4 text-sm leading-6 text-green-dark">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            نسخة تجريبية: لا تُرسل أي رسالة حقيقية ولا تُحفظ البيانات إلا في متصفحك.
          </p>
        </>
      }
    >
      <Card className="overflow-hidden">
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">البيانات الأساسية</h2>
                  <SpeakButton text="أدخل الرقم الوطني ورقم الهاتف والبريد الإلكتروني إن رغبت، ثم كلمة المرور." />
                </div>
                <Field
                  label="الرقم الوطني"
                  hint="مفتاحك في المنصة كلها — تجده على البطاقة الشخصية"
                  error={touched && (errors.nationalId || (exists ? "هذا الرقم لديه حساب بالفعل، سجّل الدخول بدلاً من ذلك" : isAdmin ? "هذا الرقم مسجّل بحساب «إداري». لكل شخص نوع حساب واحد فقط في المنصة" : false))}
                >
                  <div className="relative">
                    <IdCard className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={11}
                      placeholder="01012345412"
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, "") })}
                      className={cn(inputClass, "pr-12 text-left font-mono tracking-[.2em]")}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-hint">{form.nationalId.length}/11</span>
                  </div>
                </Field>
                <Field label="رقم الهاتف" hint="سيصلك عليه رمز تحقق برسالة نصية" error={touched && errors.phone}>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input
                      inputMode="tel"
                      dir="ltr"
                      maxLength={10}
                      placeholder="09xxxxxxxx"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                      className={cn(inputClass, "pr-12 text-left font-mono tracking-widest")}
                    />
                  </div>
                </Field>
                <Field label="البريد الإلكتروني" optional hint="للإشعارات والإيصالات إن رغبت" error={touched && errors.email}>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={cn(inputClass, "pr-12 text-left")}
                    />
                  </div>
                </Field>
                <Field label="كلمة المرور" error={touched && errors.password}>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input
                      type={showPw ? "text" : "password"}
                      dir="ltr"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className={cn(inputClass, "px-12 text-left")}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute left-4 top-1/2 -translate-y-1/2 text-hint hover:text-ink" aria-label="إظهار كلمة المرور">
                      {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                        <motion.span
                          className={cn("block h-full", strength <= 1 ? "bg-maroon" : strength === 2 ? "bg-gold-dark" : "bg-green-light")}
                          animate={{ width: i < strength ? "100%" : "0%" }}
                        />
                      </span>
                    ))}
                  </div>
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p className="text-ink-soft">
                    لديك حساب؟{" "}
                    <Link href="/login" className="font-bold text-green-dark underline-offset-4 hover:underline">
                      سجّل الدخول
                    </Link>
                  </p>
                  <Button type="submit" size="lg">
                    إرسال رمز التحقق <ArrowLeft className="size-5" />
                  </Button>
                </div>

                {/* Administrators register elsewhere — kept quiet so the page stays focused on pilgrims */}
                <div className="mt-2 space-y-3 border-t border-gold-light pt-5">
                  <Link
                    href="/administrator/register"
                    className="group flex items-center gap-3 rounded-2xl bg-sand p-4 transition hover:bg-gold-light/60"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-maroon">
                      <Briefcase className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">تعمل مع الحجاج في الموسم؟</span>
                      <span className="block text-sm text-ink-soft">رئيس مجموعة، معاون، موجّه، منسق تقني — أنشئ حساب إداري موسمي.</span>
                    </span>
                    <ArrowLeft className="size-5 shrink-0 text-gold-dark transition group-hover:-translate-x-1" />
                  </Link>
                  <p className="text-xs leading-6 text-hint">
                    حساب الموظف لا يُنشأ ذاتياً؛ تنشئه الإدارة وتمنح صلاحياته واحدة واحدة. ولكل شخص نوع حساب واحد فقط في المنصة.
                  </p>
                </div>
              </form>
            )}

            {step === 2 && (
              <div className="text-center">
                <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/30 text-4xl">
                  📱
                </motion.div>
                <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">أدخل رمز التحقق</h2>
                <p className="mt-2 text-ink-soft">
                  أرسلنا رمزاً من 4 أرقام إلى الهاتف <span dir="ltr" className="font-mono font-bold text-ink">{form.phone.slice(0, 4)} ••• {form.phone.slice(-3)}</span>
                </p>
                <div className="mt-8">
                  <OtpInput value={otp} onChange={setOtp} invalid={otpError} />
                </div>
                <p className="mt-4 text-sm text-hint">
                  رمز النسخة التجريبية: <button onClick={() => setOtp(DEMO_OTP)} className="font-mono font-bold text-green-dark underline">{DEMO_OTP}</button>
                </p>
                <div className="mt-8 flex flex-col items-center gap-4">
                  <Button size="lg" onClick={verifyOtp} disabled={otp.length < 4} className="min-w-60">
                    تحقق <BadgeCheck className="size-5" />
                  </Button>
                  <button
                    disabled={resendIn > 0}
                    onClick={() => {
                      setResendIn(60);
                      toast({ title: "أُعيد إرسال الرمز", body: `الرمز: ${DEMO_OTP}`, icon: "💬", tone: "gold" });
                    }}
                    className="text-sm font-semibold text-green-dark disabled:text-hint"
                  >
                    {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : "إعادة إرسال الرمز"}
                  </button>
                  <button onClick={() => go(1)} className="text-sm text-hint hover:text-ink">تعديل رقم الهاتف</button>
                </div>
              </div>
            )}

            {step === 3 && person && (
              <div>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">
                  {fetched ? "هذه بياناتك كما وردت من الشؤون المدنية" : "نجلب بياناتك الرسمية..."}
                </h2>
                <p className="mt-2 text-ink-soft">{fetched ? "راجعها وأكّدها فقط — لا حاجة لإعادة إدخال أي شيء." : "يستغرق ذلك ثوانيَ قليلة."}</p>
                <div className="mt-8">
                  {!fetched ? (
                    <ProgressChecklist
                      onDone={onFetched}
                      steps={["الاتصال الآمن بالشؤون المدنية", "التحقق من الرقم الوطني", "جلب القيد والبيانات الشخصية", "مطابقة رقم الهاتف"]}
                    />
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-dark to-green p-6 text-white">
                        <div className="bg-pattern absolute inset-0 opacity-15" />
                        <div className="relative flex items-center gap-4">
                          <span className="grid size-16 place-items-center rounded-2xl bg-gold font-display text-3xl font-bold text-ink">{person.firstName[0]}</span>
                          <div>
                            <p className="font-display text-2xl font-bold">{fullName(person)}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-gold">
                              <BadgeCheck className="size-4" /> مؤكدة من الشؤون المدنية — {maskNationalId(person.id)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
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
                        ].map(([k, v], i) => (
                          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="rounded-2xl bg-sand p-4">
                            <dt className="text-xs text-hint">{k}</dt>
                            <dd className="mt-0.5 font-bold text-ink">{v}</dd>
                          </motion.div>
                        ))}
                      </dl>
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
                <div>
                  <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">معلومات لا تملكها الشؤون المدنية</h2>
                  <p className="mt-2 text-ink-soft">كلها اختيارية ويمكنك إضافتها لاحقاً من ملفك.</p>
                </div>
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
                    <input dir="ltr" inputMode="tel" className={cn(inputClass, "text-left")} value={extra.altPhone} onChange={(e) => setExtra({ ...extra, altPhone: e.target.value.replace(/\D/g, "") })} />
                  </Field>
                  <div />
                  <Field label="جهة اتصال للطوارئ" optional hint="شخص يبقى في سوريا ونبلغه بمحطات رحلتك">
                    <input className={inputClass} placeholder="مثال: سارة (ابنتي)" value={extra.emergencyName} onChange={(e) => setExtra({ ...extra, emergencyName: e.target.value })} />
                  </Field>
                  <Field label="هاتف جهة الطوارئ" optional>
                    <input dir="ltr" inputMode="tel" className={cn(inputClass, "text-left")} value={extra.emergencyPhone} onChange={(e) => setExtra({ ...extra, emergencyPhone: e.target.value.replace(/\D/g, "") })} />
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
      </Card>
    </PortalShell>
  );
}
