"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Briefcase,
  CalendarClock,
  FileSignature,
  FlaskConical,
  FolderLock,
  GraduationCap,
  IdCard,
  Mail,
  PencilLine,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { DEMO_OTP, Field, OtpInput, ProgressChecklist, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { ageOf, fullName, getPerson, isValidNationalId, type Person } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { DEMO_ADMINS, logAdmin, seasonHistory } from "../_lib/admin";

const STEPS = ["البيانات الأساسية", "رمز التحقق", "الشؤون المدنية", "الملف الإداري"];

const FILE_PARTS = [
  { icon: UserRound, label: "البيانات الشخصية" },
  { icon: GraduationCap, label: "التأهيل ونتائج الامتحانات" },
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
  const [form, setForm] = useState({ nationalId: "", phone: "", email: "" });
  const [touched, setTouched] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [resendIn, setResendIn] = useState(60);
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
  };

  useEffect(() => {
    if (step !== 1 || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  const sendOtp = () => {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || pilgrimConflict || adminExists) return;
    setOtp("");
    setResendIn(60);
    go(1);
    setTimeout(() => toast({ title: "رسالة نصية جديدة", body: `منصة الحج الوطنية — حساب إداري: رمز التحقق ${DEMO_OTP}. لا تشاركه مع أحد.`, icon: "💬", tone: "gold" }), 900);
  };

  const verifyOtp = () => {
    if (otp !== DEMO_OTP) {
      setOtpError(true);
      setTimeout(() => setOtpError(false), 600);
      return;
    }
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
    actions.upsertAdmin(person.id, { createdAt: Date.now(), phone: form.phone });
    actions.adminLogin(person.id);
    logAdmin(person.id, "إنشاء حساب إداري", `الإداري ${maskNationalId(person.id)}`, "مؤكد من الشؤون المدنية — ملف إداري لا ملف حاج");
    go(3);
    confetti({ particleCount: 150, spread: 85, origin: { y: 0.4 }, colors: ["#D9C89E", "#672146", "#00594F", "#AD9E6E"] });
    setTimeout(
      () => toast({ title: `أهلاً ${person.firstName}`, body: "فُتح لك ملف إداري. باب طلبات المشاركة لموسم 1448 مفتوح من 10 ربيع الأول.", icon: "🧭", tone: "success" }),
      700,
    );
  };

  const history = person ? seasonHistory(person.id) : [];

  return (
    <PortalShell
      image="/images/umayyad.jpg"
      title="إنشاء حساب إداري"
      subtitle="الخطوات نفسها التي يمر بها الحاج. والفرق أن المنصة تفتح لك ملفاً إدارياً دائماً يرافقك عبر المواسم."
      aside={
        <>
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <ol className="space-y-1">
              {STEPS.map((s, i) => (
                <li key={s} className={cn("flex items-center gap-3 rounded-xl p-2 text-sm transition", i === step && "bg-maroon/6")}>
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition", i < step ? "bg-green-light text-white" : i === step ? "bg-maroon text-gold" : "bg-sand text-hint")}>
                    {i < step ? "✓" : i + 1}
                  </span>
                  <span className={cn("font-semibold", i === step ? "text-maroon" : i < step ? "text-ink" : "text-hint")}>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          {step === 0 && (
            <div className="rounded-3xl border border-dashed border-gold-dark/60 bg-gold/15 p-4">
              <p className="flex items-center gap-2 font-bold text-maroon">
                <FlaskConical className="size-4" /> إداريون تجريبيون
              </p>
              <ul className="mt-2 space-y-2">
                {DEMO_ADMINS.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setForm((f) => ({ ...f, nationalId: d.id, phone: d.phone }))} className="w-full rounded-2xl bg-white p-3 text-right transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold text-green-dark">{d.title}</span>
                        <span className="font-mono text-xs text-hint" dir="ltr">{d.id}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink-soft">{d.note}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="flex items-start gap-2 rounded-3xl bg-green-dark/6 p-4 text-sm leading-6 text-green-dark">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            لكل شخص نوع حساب واحد: حاج، أو إداري، أو موظف. حساب الموظف لا يُنشأ ذاتياً.
          </p>
        </>
      }
    >
      <Card className="overflow-hidden">
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
                <div className="flex items-center gap-4">
                  <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-maroon to-maroon-dark text-gold">
                    <Briefcase className="size-7" />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">البيانات الأساسية</h2>
                    <p className="text-sm text-hint">نوع الحساب: إداري موسمي</p>
                  </div>
                </div>

                <Field label="الرقم الوطني" hint="بياناتك الرسمية تصل من الشؤون المدنية مباشرة" error={touched && errors.nationalId}>
                  <div className="relative">
                    <IdCard className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input
                      inputMode="numeric"
                      dir="ltr"
                      maxLength={11}
                      placeholder="01033300871"
                      value={form.nationalId}
                      onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, "") })}
                      className={cn(inputClass, "pr-12 text-left font-mono tracking-[.2em]")}
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-hint">{form.nationalId.length}/11</span>
                  </div>
                </Field>

                <AnimatePresence>
                  {(pilgrimConflict || adminExists) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="flex gap-3 rounded-2xl border border-maroon/30 bg-maroon/6 p-4" role="alert">
                        <ShieldAlert className="mt-0.5 size-6 shrink-0 text-maroon" />
                        <div className="text-sm leading-7">
                          {pilgrimConflict ? (
                            <>
                              <p className="font-bold text-maroon">هذا الرقم الوطني لديه حساب حاج</p>
                              <p className="text-ink-soft">
                                لا يُسمح بأكثر من نوع حساب واحد للشخص نفسه. لا يمكن أن يكون الشخص حاجاً وإدارياً في الموسم نفسه.{" "}
                                <Link href="/login" className="font-bold text-green-dark underline">الدخول إلى حساب الحاج</Link>
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-maroon">لديك حساب إداري بالفعل</p>
                              <p className="text-ink-soft">
                                <Link href="/administrator/login" className="font-bold text-green-dark underline">سجّل الدخول</Link> بدلاً من إنشاء حساب جديد.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field label="رقم الهاتف" hint="سيصلك عليه رمز تحقق برسالة نصية" error={touched && errors.phone}>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input inputMode="tel" dir="ltr" maxLength={10} placeholder="09xxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} className={cn(inputClass, "pr-12 text-left font-mono tracking-widest")} />
                  </div>
                </Field>
                <Field label="البريد الإلكتروني" optional hint="للإيصالات والعقود" error={touched && errors.email}>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
                    <input type="email" dir="ltr" placeholder="name@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={cn(inputClass, "pr-12 text-left")} />
                  </div>
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Link href="/administrator" className="flex items-center gap-1 text-sm font-semibold text-hint hover:text-ink">
                    <ArrowRight className="size-4" /> عن الإداري الموسمي
                  </Link>
                  <Button type="submit" size="lg" variant="maroon">
                    إرسال رمز التحقق <ArrowLeft className="size-5" />
                  </Button>
                </div>
                <p className="text-center text-ink-soft">
                  لديك حساب إداري؟ <Link href="/administrator/login" className="font-bold text-green-dark underline-offset-4 hover:underline">سجّل الدخول</Link>
                </p>
              </form>
            )}

            {step === 1 && (
              <div className="text-center">
                <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto grid size-20 place-items-center rounded-3xl bg-gold/30 text-4xl">📱</motion.div>
                <h2 className="mt-5 font-display text-2xl font-bold text-green-dark md:text-3xl">أدخل رمز التحقق</h2>
                <p className="mt-2 text-ink-soft">
                  أرسلنا رمزاً من 4 أرقام إلى <span dir="ltr" className="font-mono font-bold text-ink">{form.phone.slice(0, 4)} ••• {form.phone.slice(-3)}</span>
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
                  <button onClick={() => go(0)} className="text-sm text-hint hover:text-ink">تعديل البيانات</button>
                </div>
              </div>
            )}

            {step === 2 && person && (
              <div>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{fetched ? "بياناتك كما وردت من الشؤون المدنية" : "نجلب بياناتك الرسمية..."}</h2>
                <p className="mt-2 text-ink-soft">{fetched ? "راجعها وأكّدها — ونجلب معها سجلك الموسمي من المنصة." : "يستغرق ذلك ثوانيَ قليلة."}</p>
                <div className="mt-8">
                  {!fetched ? (
                    <ProgressChecklist onDone={onFetched} steps={["الاتصال الآمن بالشؤون المدنية", "التحقق من الرقم الوطني", "التأكد من عدم وجود حساب آخر للشخص نفسه", "جلب السجل الموسمي من المنصة"]} />
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-maroon-dark via-maroon to-green-dark p-6 text-white">
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
                          ["اسم الأم", person.motherName],
                          ["تاريخ الميلاد", `${person.birthDate} (${ageOf(person)} عاماً)`],
                          ["مكان الولادة", person.birthPlace],
                          ["المحافظة", person.governorate],
                          ["مكان القيد", person.registry],
                          ["الحالة المدنية", person.maritalStatus],
                        ].map(([k, v], i) => (
                          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="rounded-2xl bg-sand p-4">
                            <dt className="text-xs text-hint">{k}</dt>
                            <dd className="mt-0.5 font-bold text-ink">{v}</dd>
                          </motion.div>
                        ))}
                      </dl>
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
                        <Button size="lg" variant="maroon" onClick={create}>
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
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-ink shadow-2xl shadow-gold/40">
                  <Award className="size-12" />
                </motion.div>
                <h2 className="mt-6 font-display text-3xl font-bold text-green-dark md:text-4xl">ملفك الإداري جاهز يا {person.firstName}</h2>
                <p className="mx-auto mt-3 max-w-lg leading-8 text-ink-soft">ملف دائم يبقى معك عبر المواسم، وفيه:</p>
                <ul className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                  {FILE_PARTS.map((f, i) => (
                    <motion.li key={f.label} initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex flex-col items-center gap-2 rounded-2xl bg-sand p-4 text-sm font-bold text-ink">
                      <f.icon className="size-6 text-maroon" /> {f.label}
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
      </Card>
    </PortalShell>
  );
}
