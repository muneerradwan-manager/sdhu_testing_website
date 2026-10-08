"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { ArrowLeft, Award, Briefcase, CalendarClock, FileSignature, FolderLock, GraduationCap, PencilLine, Star, UserRound } from "lucide-react";
import { useCallback, useState } from "react";
import { AuthShell, CivilRecordCard, EmailField, FormError, NationalIdField, OtpStep, PasswordField, PhoneField, StepTitle, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP, ProgressChecklist } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { Badge, SpeakButton, useToast } from "@/components/ui/widgets";
import { ageOf, getPerson, isValidNationalId, type Person } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { maskNationalId } from "@/lib/utils";
import { logAdmin, seasonHistory } from "../_lib/admin";

const STEPS = ["البيانات الأساسية", "رمز التحقق", "الشؤون المدنية", "الملف الإداري جاهز"];

const FILE_PARTS = [
  { icon: UserRound, label: "البيانات الشخصية" },
  { icon: GraduationCap, label: "التأهيل ونتيجة الاختبار" },
  { icon: Briefcase, label: "المناصب الموسمية" },
  { icon: Star, label: "التقييمات" },
  { icon: FolderLock, label: "خزنة الوثائق" },
  { icon: FileSignature, label: "العقود" },
];

export function AdminRegisterFlow() {
  const router = useRouter();
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState({ nationalId: "", phone: "", email: "", password: "" });
  const [touched, setTouched] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);
  const [fetched, setFetched] = useState(false);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validId = isValidNationalId(form.nationalId);
  const pilgrimConflict = validId && !!accounts[form.nationalId];
  const adminExists = validId && !!admins[form.nationalId];
  const errors = {
    nationalId: !validId && "الرقم الوطني يتكون من 11 رقماً",
    phone: !/^09\d{8}$/.test(form.phone) && "رقم الهاتف يبدأ بـ 09 ويتكون من 10 أرقام",
    email: form.email && !/^\S+@\S+\.\S+$/.test(form.email) && "صيغة البريد غير صحيحة",
    password: form.password.length < 6 && "كلمة المرور 6 أحرف على الأقل",
  };

  const sendOtp = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || pilgrimConflict || adminExists) return;
    go(1);
    setTimeout(() => toast({ title: "رسالة نصية جديدة", body: `منصة الحج الوطنية — حساب إداري: رمز التحقق ${DEMO_OTP}. لا تشاركه مع أحد.`, icon: "💬", tone: "gold" }), 900);
  };

  const verifyOtp = () => {
    setPerson(getPerson(form.nationalId));
    setFetched(false);
    go(2);
  };

  const onFetched = useCallback(() => setFetched(true), []);

  const create = () => {
    if (!person) return;
    if (accounts[person.id]) {
      toast({ title: "لا يمكن إنشاء الحساب", body: "هذا الرقم الوطني لديه حساب حاج. لكل شخص نوع حساب واحد.", tone: "warning", icon: "⛔" });
      return;
    }
    actions.upsertAdmin(person.id, { createdAt: Date.now(), phone: form.phone, email: form.email || undefined, password: form.password });
    actions.adminLogin(person.id);
    logAdmin(person.id, "إنشاء حساب إداري", `الإداري ${maskNationalId(person.id)}`, "مؤكد من الشؤون المدنية — ملف إداري لا ملف حاج");
    go(3);
    confetti({ particleCount: 150, spread: 85, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F", "#289E92", "#AD9E6E"] });
    setTimeout(
      () => toast({ title: `أهلاً ${person.firstName}`, body: "فُتح لك ملف إداري. التسجيل كإداري لموسم 1448 من 20 إلى 24 أيلول.", icon: "🧭", tone: "success" }),
      700,
    );
  };

  const history = person ? seasonHistory(person.id) : [];

  return (
    <AuthShell
      portal="admin"
      page="register"
      title="إنشاء حساب إداري"
      subtitle="للعمل مع الحجاج في الموسم: رئيس مجموعة، معاون، موجّه ديني، منسق تقني. الحقول نفسها التي يملؤها الحاج، وبياناتك الرسمية تصل من الشؤون المدنية مباشرة، ثم يُفتح لك ملف إداري دائم يرافقك عبر المواسم."
      steps={STEPS}
      step={step}
      tabs={step === 0}
      note="لكل شخص نوع حساب واحد في المنصة: حاج، أو إداري، أو موظف. وحساب الموظف لا يُنشأ ذاتياً؛ تنشئه الإدارة."
    >
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} initial={{ opacity: 0, x: dir * -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * 40 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          {step === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendOtp();
              }}
              className="space-y-6"
            >
              <StepTitle action={<SpeakButton text="أدخل الرقم الوطني ورقم الهاتف والبريد الإلكتروني إن رغبت، ثم كلمة المرور." />}>البيانات الأساسية</StepTitle>
              <NationalIdField value={form.nationalId} onChange={(v) => setForm({ ...form, nationalId: v })} placeholder="01033300871" hint="مفتاحك في المنصة كلها — تجده على البطاقة الشخصية" error={touched && errors.nationalId} />
              <FormError
                text={pilgrimConflict ? "هذا الرقم الوطني لديه حساب حاج، ولكل شخص نوع حساب واحد: لا يكون حاجاً وإدارياً في الموسم نفسه." : adminExists ? "لديك حساب إداري بالفعل." : null}
                link={pilgrimConflict ? { href: "/login", label: "الدخول إلى حساب الحاج" } : adminExists ? { href: "/administrator/login", label: "سجّل الدخول" } : undefined}
              />
              <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={touched && errors.phone} />
              <EmailField value={form.email} onChange={(v) => setForm({ ...form, email: v })} hint="للإيصالات والعقود إن رغبت" error={touched && errors.email} />
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} error={touched && errors.password} strength autoComplete="new-password" />
              <Button type="submit" size="lg" className="w-full">
                إرسال رمز التحقق <ArrowLeft className="size-5" />
              </Button>
              <SwitchLine text="لديك حساب إداري؟" href="/administrator/login" label="سجّل الدخول" />
            </form>
          )}

          {step === 1 && (
            <OtpStep
              phone={form.phone}
              confirm="تحقق"
              onSuccess={verifyOtp}
              onResend={() => toast({ title: "أُعيد إرسال الرمز", body: `الرمز: ${DEMO_OTP}`, icon: "💬", tone: "gold" })}
              back={{ label: "تعديل البيانات", onClick: () => go(0) }}
            />
          )}

          {step === 2 && person && (
            <div>
              <StepTitle sub={fetched ? "راجعها وأكّدها — ونجلب معها سجلك الموسمي من المنصة." : "يستغرق ذلك ثوانيَ قليلة."}>{fetched ? "بياناتك كما وردت من الشؤون المدنية" : "نجلب بياناتك الرسمية..."}</StepTitle>
              <div className="mt-8">
                {!fetched ? (
                  <ProgressChecklist onDone={onFetched} steps={["الاتصال الآمن بالشؤون المدنية", "التحقق من الرقم الوطني", "التأكد من عدم وجود حساب آخر للشخص نفسه", "جلب السجل الموسمي من المنصة"]} />
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <CivilRecordCard
                      person={person}
                      rows={[
                        ["اسم الأم", person.motherName],
                        ["تاريخ الميلاد", `${person.birthDate} (${ageOf(person)} عاماً)`],
                        ["مكان الولادة", person.birthPlace],
                        ["المحافظة", person.governorate],
                        ["مكان القيد", person.registry],
                        ["الحالة المدنية", person.maritalStatus],
                      ]}
                    />
                    <div className="mt-4 rounded-2xl border border-gold/40 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-green-dark">
                        <CalendarClock className="size-4 text-gold-dark" /> السجل الموسمي (يُجلب تلقائياً)
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {history.map((h) => (
                          <li key={h.season}>
                            <Badge tone={h.rating ? "green" : "ink"}>
                              {h.season} — {h.role}
                              {h.group && ` — ${h.group}`}
                              {h.rating && ` — تقييم ${h.rating}`}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-8 flex flex-wrap justify-between gap-3">
                      <Button
                        variant="outline"
                        onClick={() => toast({ title: "سيتم التحقق يدوياً", body: "ترفع وثيقة تثبت البيانات الصحيحة، ويراجعها ماهر عيسى من شؤون الإداريين.", tone: "info", icon: "📝" })}
                      >
                        <PencilLine className="size-4" /> البيانات غير صحيحة
                      </Button>
                      <Button size="lg" onClick={create}>
                        نعم، أنشئ ملفي الإداري <ArrowLeft className="size-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {step === 3 && person && (
            <div className="text-center">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-24 place-items-center rounded-full bg-green-light text-white shadow-2xl shadow-green-light/40">
                <Award className="size-12" />
              </motion.div>
              <h2 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">ملفك الإداري جاهز يا {person.firstName}</h2>
              <p className="mx-auto mt-3 max-w-lg leading-8 text-ink-soft">ملف دائم يبقى معك عبر المواسم، وفيه:</p>
              <ul className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                {FILE_PARTS.map((f, i) => (
                  <motion.li key={f.label} initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex flex-col items-center gap-2 rounded-2xl bg-sand p-4 text-sm font-bold text-ink">
                    <f.icon className="size-6 text-green-dark" /> {f.label}
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button size="xl" variant="gold" onClick={() => router.push("/administrator/apply")}>
                  تقديم طلب المشاركة <ArrowLeft className="size-6" />
                </Button>
                <Button size="xl" variant="outline" onClick={() => router.push("/administrator/dashboard")}>
                  <UserRound className="size-6" /> ملفي كإداري
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
