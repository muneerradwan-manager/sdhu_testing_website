"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Info, LoaderCircle, RotateCcw, ShieldCheck, Stethoscope } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLang, useT } from "@/lib/i18n";
import { precheck } from "@/lib/rules";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { cn, digitsOnly } from "@/lib/utils";

type Result = ReturnType<typeof precheck>;

/** The rules engine (lib/rules) writes its notes in Arabic; the English page shows them in English */
function noteEn(text: string) {
  let m = text.match(/^صاحب الطلب من مواليد (\d+) فما قبل$/);
  if (m) return `The main applicant must be born in ${m[1]} or earlier`;
  m = text.match(/^المرافق من مواليد (\d+) فما قبل$/);
  if (m) return `A companion must be born in ${m[1]} or earlier`;
  m = text.match(/^تحتاجين إلى محرم في الطلب نفسه \(مواليد (\d+) فما بعد\)$/);
  if (m) return `You need a mahram in the same application (born ${m[1]} or later)`;
  m = text.match(/^يلزم وجود مرافق في الطلب \(مواليد (\d+) فما قبل\)$/);
  if (m) return `A companion must be named in the application (born ${m[1]} or earlier)`;
  const fixed: Record<string, string> = {
    "أدّى الحج سابقاً — يُقبل فقط محرماً لأمه أو زوجته": "Has performed Hajj before — accepted only as a mahram for his mother or wife",
    "لم يؤدِّ الحج سابقاً": "Has not performed Hajj before",
    "غير مصاب بمرض عضال": "No terminal illness",
  };
  return fixed[text] ?? text;
}

function Segmented<T extends string>({ value, onChange, options, name }: { value: T; onChange: (v: T) => void; options: [T, string][]; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="relative grid rounded-2xl bg-sand p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("relative h-10 rounded-xl text-sm font-bold transition", value === v ? "text-white" : "text-ink-soft hover:text-ink")}
        >
          {value === v && <motion.span layoutId={`seg-${name}`} className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 26, stiffness: 340 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      {children}
      {hint && <p className="mt-1 text-xs text-hint">{hint}</p>}
    </div>
  );
}

export function PrecheckForm() {
  const t = useT();
  const en = useLang() === "en";
  const season = useSeason();
  const [birthYear, setBirthYear] = useState("1948");
  const [gender, setGender] = useState<"M" | "F">("F");
  const [role, setRole] = useState<"applicant" | "companion">("applicant");
  const [hajjBefore, setHajjBefore] = useState<"no" | "yes">("no");
  const [escorting, setEscorting] = useState<"no" | "yes">("no");
  const [terminal, setTerminal] = useState<"no" | "yes">("no");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [yearError, setYearError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    const y = Number(birthYear);
    if (!/^\d{4}$/.test(birthYear) || y < 1900 || y > SEASON.referenceYear) {
      setYearError(true);
      return;
    }
    setYearError(false);
    setChecking(true);
    setResult(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult(
        precheck({
          birthYear: y,
          gender,
          role,
          hajjBefore: hajjBefore === "yes",
          escortingMotherOrWife: hajjBefore === "yes" && gender === "M" && escorting === "yes",
          terminal: terminal === "yes",
        }, season.rules),
      );
      setChecking(false);
    }, 900);
  }

  function reset() {
    setBirthYear("");
    setGender("M");
    setRole("applicant");
    setHajjBefore("no");
    setEscorting("no");
    setTerminal("no");
    setResult(null);
  }

  return (
    <div className="grid overflow-hidden rounded-[2rem] border border-gold/40 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.6)] lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-5 p-6 md:p-8">
        <div className="flex items-start gap-3 rounded-2xl bg-green-light/10 p-4 text-sm leading-6 text-green-dark ring-1 ring-green-light/25">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p>
            <span className="font-bold">{t("لا يتم حفظ أي بيانات.", "Nothing is saved.")}</span>{" "}
            {t(
              "الفحص يتم في متصفحك فقط، ولا يُرسل شيء إلى المنصة. النتيجة مبدئية، والقرار النهائي بعد تدقيق الطلب.",
              "The check runs only in your browser, and nothing is sent to the platform. The result is preliminary; the final decision comes after the application is reviewed.",
            )}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("سنة الميلاد", "Year of birth")} hint={t("مثال: 1948", "e.g. 1948")}>
            <motion.input
              key={yearError ? "err" : "ok"}
              animate={yearError ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
              inputMode="numeric"
              maxLength={4}
              dir="ltr"
              value={birthYear}
              onChange={(e) => setBirthYear(digitsOnly(e.target.value).slice(0, 4))}
              aria-invalid={yearError}
              className={cn(
                "h-12 w-full rounded-2xl border bg-white px-4 text-center font-display text-xl font-bold tabular-nums outline-none transition focus:ring-4",
                yearError ? "border-maroon ring-maroon/15" : "border-gold/60 focus:border-green-light focus:ring-green-light/15",
              )}
            />
          </Field>
          <Field label={t("الجنس", "Sex")}>
            <Segmented name="gender" value={gender} onChange={setGender} options={[["M", t("ذكر", "Male")], ["F", t("أنثى", "Female")]]} />
          </Field>
        </div>

        <Field label={t("الصفة في الطلب", "Role in the application")}>
          <Segmented name="role" value={role} onChange={setRole} options={[["applicant", t("صاحب الطلب", "Main applicant")], ["companion", t("مرافق", "Companion")]]} />
        </Field>

        <Field label={t("هل أدّى فريضة الحج سابقاً؟", "Has this person performed Hajj before?")}>
          <Segmented name="hajj" value={hajjBefore} onChange={setHajjBefore} options={[["no", t("لا", "No")], ["yes", t("نعم", "Yes")]]} />
        </Field>

        <AnimatePresence initial={false}>
          {hajjBefore === "yes" && gender === "M" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Field label={t("هل يرافق أمه أو زوجته محرماً لها في الطلب نفسه؟", "Is he accompanying his mother or wife as her mahram in the same application?")}>
                <Segmented name="escort" value={escorting} onChange={setEscorting} options={[["no", t("لا", "No")], ["yes", t("نعم", "Yes")]]} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label={t("هل هو مصاب بمرض عضال؟", "Does this person have a terminal illness?")}>
          <Segmented name="terminal" value={terminal} onChange={setTerminal} options={[["no", t("لا", "No")], ["yes", t("نعم", "Yes")]]} />
        </Field>

        <div className="flex gap-2 pt-1">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={checking}
            className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-green-dark py-3.5 font-bold text-white shadow-[0_12px_30px_-14px_rgba(0,89,79,.9)] transition hover:bg-green disabled:opacity-60"
          >
            {checking ? <LoaderCircle className="size-5 animate-spin" /> : <Stethoscope className="size-5" />}
            {t("افحص الأهلية", "Check eligibility")}
          </motion.button>
          <button type="button" onClick={reset} aria-label={t("مسح النموذج", "Clear the form")} className="flex w-13 items-center justify-center rounded-2xl bg-sand px-4 text-ink-soft transition hover:bg-gold-light">
            <RotateCcw className="size-5" />
          </button>
        </div>
      </form>

      <div className="bg-pattern-dark relative flex min-h-96 items-center justify-center bg-sand/70 p-6 md:p-8" aria-live="polite">
        <AnimatePresence mode="wait">
          {checking ? (
            <motion.div key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 text-green-dark">
              <div className="relative size-24">
                <motion.span className="absolute inset-0 rounded-full border-4 border-gold/40 border-t-green-dark" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                <Stethoscope className="absolute inset-0 m-auto size-9" />
              </div>
              <p className="font-semibold">{t("نطابق الإجابات مع شروط الموسم…", "Matching your answers against the season's conditions…")}</p>
            </motion.div>
          ) : result ? (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-md">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className={cn("flex items-center gap-4 rounded-3xl p-5 text-white", result.ok ? "bg-gradient-to-l from-green to-green-dark ltr:bg-gradient-to-r" : "bg-gradient-to-l from-maroon to-maroon-dark ltr:bg-gradient-to-r")}
              >
                <motion.span initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 14 }}>
                  {result.ok ? <CircleCheck className="size-12 text-gold" /> : <CircleX className="size-12 text-gold" />}
                </motion.span>
                <div>
                  <p className="font-display text-2xl font-bold">{result.ok ? t("مستوفٍ مبدئياً", "Eligible in principle") : t("غير مستوفٍ مبدئياً", "Not eligible in principle")}</p>
                  <p className="text-sm text-white/75">{result.ok ? t("يمكنك المتابعة إلى تقديم الطلب", "You can go on to apply") : t("راجع الشروط المعلّمة أدناه", "Check the conditions marked below")}</p>
                </div>
              </motion.div>
              <ul className="mt-4 space-y-2">
                {result.notes.map((n, i) => {
                  const info = n.ok && /تحتاج|يلزم/.test(n.text);
                  return (
                    <motion.li
                      key={n.text}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.09, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl bg-white p-3.5 text-sm leading-6 shadow-sm ring-1",
                        !n.ok ? "ring-maroon/25" : info ? "ring-gold-dark/40" : "ring-green-light/20",
                      )}
                    >
                      {!n.ok ? (
                        <CircleX className="mt-0.5 size-5 shrink-0 text-maroon" />
                      ) : info ? (
                        <Info className="mt-0.5 size-5 shrink-0 text-gold-dark" />
                      ) : (
                        <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-light" />
                      )}
                      <span className={cn(!n.ok ? "font-semibold text-maroon" : "text-ink")}>{t(n.text, noteEn(n.text))}</span>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xs text-center">
              <div className="mx-auto flex size-20 animate-float items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gold/50">
                <Stethoscope className="size-9 text-green-dark" />
              </div>
              <p className="mt-5 font-display text-xl font-bold text-green-dark">{en ? <>Example: the grandmother of <bdi>عمر</bdi></> : "مثال: جدة عمر"}</p>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                {en ? (
                  // The names stay in Arabic, each kept whole inside the English sentence
                  <>
                    <bdi>عمر</bdi> entered the year of birth of his grandmother <bdi>خديجة</bdi> (1948) and that she had not performed Hajj before, and
                    she came out as «eligible in principle». Now try it yourself.
                  </>
                ) : (
                  "أدخل عمر سنة ميلاد جدته خديجة (1948) وأنها لم تحج سابقاً، فظهرت «مستوفية مبدئياً». جرّب أنت الآن."
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
