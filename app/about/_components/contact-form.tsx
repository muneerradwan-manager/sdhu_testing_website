"use client";

import { AnimatePresence, motion, useAnimate } from "motion/react";
import { Check, Copy, LoaderCircle, Send, Ticket } from "lucide-react";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { BRANCHES, CONTACT_SUBJECTS } from "@/lib/data/about";
import { useToast } from "@/components/ui/widgets";
import { Button } from "@/components/ui/button";
import { cn, sleep } from "@/lib/utils";

type Values = { name: string; phone: string; email: string; subject: string; branch: string; message: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = { name: "", phone: "", email: "", subject: "", branch: BRANCHES[0].slug, message: "" };

function validate(v: Values): Errors {
  const e: Errors = {};
  if (v.name.trim().split(/\s+/).filter(Boolean).length < 2) e.name = "اكتب اسمك الثنائي على الأقل.";
  if (!/^09\d{8}$/.test(v.phone.replace(/[\s-]/g, ""))) e.phone = "رقم الجوال يبدأ بـ 09 ويتكون من 10 أرقام.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "البريد الإلكتروني غير صحيح.";
  if (!v.subject) e.subject = "اختر موضوع الرسالة.";
  if (v.message.trim().length < 20) e.message = "اكتب رسالتك بعشرين حرفاً على الأقل.";
  return e;
}

function Field({ label, error, optional, children, id, hint }: { label: string; error?: string; optional?: boolean; children: ReactNode; id: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
        <span>
          {label} {!optional && <span className="text-maroon">*</span>}
        </span>
        {optional && <span className="text-xs font-normal text-hint">اختياري</span>}
        {hint && <span className="text-xs font-normal text-hint">{hint}</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-xs font-semibold text-maroon"
            role="alert"
          >
            <span className="block pt-1.5">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = (err?: string) =>
  cn(
    "w-full rounded-2xl border bg-sand/50 px-4 text-[15px] outline-none transition placeholder:text-hint focus:bg-white focus:ring-4",
    err ? "border-maroon/50 focus:border-maroon focus:ring-maroon/10" : "border-gold/40 focus:border-green-light focus:ring-green-light/15",
  );

export function ContactForm() {
  const uid = useId();
  const toast = useToast();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    const next = { ...values, [k]: e.target.value };
    setValues(next);
    if (touched) setErrors(validate(next));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      animate(scope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.45 });
      const first = Object.keys(errs)[0];
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    setLoading(true);
    await sleep(1600);
    const n = `SDH-1448-${String(Math.floor(10000 + Math.random() * 89999))}`;
    setTicket(n);
    setLoading(false);
    toast({ title: "وصلت رسالتك", body: `رقم التذكرة ${n}. سنرد عليك خلال يومي عمل.`, tone: "success", icon: "✅" });
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setTouched(false);
    setTicket(null);
  };

  const copyTicket = async () => {
    if (!ticket) return;
    try {
      await navigator.clipboard.writeText(ticket);
    } catch {
      /* ignore */
    }
    toast({ title: "تم نسخ رقم التذكرة", tone: "gold", icon: "🎫" });
  };

  const id = (k: keyof Values) => `${uid}-${k}`;
  const aria = (k: keyof Values) => ({ id: id(k), "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${id(k)}-error` : undefined });

  return (
    <div ref={scope} className="relative overflow-hidden rounded-3xl border border-gold/35 bg-white p-5 shadow-[0_30px_70px_-50px_rgba(2,21,38,.6)] md:p-8">
      <AnimatePresence mode="wait" initial={false}>
        {ticket ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[28rem] flex-col items-center justify-center text-center"
          >
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="animate-pulse-ring grid size-20 place-items-center rounded-full bg-green-dark text-gold"
            >
              <Check className="size-10" strokeWidth={3} />
            </motion.span>
            <p className="mt-6 font-display text-2xl font-bold text-green-dark">شكراً لتواصلك معنا</p>
            <p className="mt-2 max-w-sm text-sm leading-7 text-ink-soft">استلمنا رسالتك، وسيتواصل معك موظف من {BRANCHES.find((b) => b.slug === values.branch)?.name} خلال يومي عمل.</p>
            <div className="perforated mt-6 flex items-center gap-3 rounded-2xl bg-gold/30 px-8 py-4">
              <Ticket className="size-6 text-maroon" />
              <div className="text-start">
                <p className="text-xs text-ink-soft">رقم التذكرة</p>
                <p dir="ltr" className="font-display text-xl font-bold tracking-wider text-ink">
                  {ticket}
                </p>
              </div>
              <button type="button" onClick={copyTicket} className="grid size-9 place-items-center rounded-xl bg-white text-green-dark transition hover:bg-green-dark hover:text-white" aria-label="نسخ رقم التذكرة">
                <Copy className="size-4" />
              </button>
            </div>
            <Button variant="outline" className="mt-6" onClick={reset}>
              إرسال رسالة أخرى
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <Field label="الاسم الكامل" id={id("name")} error={errors.name}>
              <input {...aria("name")} value={values.name} onChange={set("name")} autoComplete="name" placeholder="مثال: محمد أحمد العلي" className={cn(inputCls(errors.name), "h-12")} />
            </Field>
            <Field label="رقم الجوال" id={id("phone")} error={errors.phone}>
              <input
                {...aria("phone")}
                value={values.phone}
                onChange={set("phone")}
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="09xx xxx xxx"
                className={cn(inputCls(errors.phone), "h-12 text-end")}
              />
            </Field>
            <Field label="البريد الإلكتروني" id={id("email")} error={errors.email} optional>
              <input
                {...aria("email")}
                type="email"
                value={values.email}
                onChange={set("email")}
                autoComplete="email"
                dir="ltr"
                placeholder="name@example.com"
                className={cn(inputCls(errors.email), "h-12 text-end")}
              />
            </Field>
            <Field label="الفرع الأقرب إليك" id={id("branch")}>
              <select {...aria("branch")} value={values.branch} onChange={set("branch")} className={cn(inputCls(), "h-12")}>
                {BRANCHES.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="موضوع الرسالة" id={id("subject")} error={errors.subject}>
                <div role="radiogroup" aria-label="موضوع الرسالة" className="flex flex-wrap gap-2 rounded-2xl outline-none" id={id("subject")} tabIndex={-1}>
                  {CONTACT_SUBJECTS.map((s) => {
                    const on = values.subject === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set("subject")({ target: { value: s } })}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                          on ? "border-green-dark bg-green-dark text-white shadow-md" : "border-gold/40 bg-sand/50 text-ink-soft hover:border-green-dark/40",
                          s === "الإبلاغ عن جهة وهمية" && !on && "border-maroon/30 text-maroon",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="نص الرسالة" id={id("message")} error={errors.message} hint={`${values.message.trim().length} / 500`}>
                <textarea
                  {...aria("message")}
                  value={values.message}
                  onChange={set("message")}
                  maxLength={500}
                  rows={5}
                  placeholder="اكتب استفسارك بوضوح، ويُفضَّل ذكر رقم الطلب إن وُجد."
                  className={cn(inputCls(errors.message), "resize-none py-3 leading-7")}
                />
              </Field>
            </div>
            <div className="flex flex-col-reverse items-center justify-between gap-4 sm:col-span-2 sm:flex-row">
              <p className="text-xs leading-6 text-hint">لا تكتب كلمة المرور أو رمز التحقق في الرسالة أبداً.</p>
              <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <LoaderCircle className="size-5 animate-spin" /> جارٍ الإرسال...
                  </>
                ) : (
                  <>
                    إرسال الرسالة <Send className="size-5 -scale-x-100 transition-transform group-hover/btn:-translate-x-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
