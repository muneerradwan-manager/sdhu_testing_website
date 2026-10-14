"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Info, Mars, Venus } from "lucide-react";
import { useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { MONTHS, usePublishedDraw, type DrawPick } from "@/lib/lottery";
import { DEMO_START, dayLabel, useOperation, useToday, type OperationState } from "@/lib/operations";
import { SEASON } from "@/lib/season";
import { cn } from "@/lib/utils";
import { dateEn } from "../_lib/en";

const MIN = 1930;
const MAX = 2012;
const R = SEASON.rules;
const pct = (y: number) => ((y - MIN) / (MAX - MIN)) * 100;
/** Born this year or earlier: accepted directly, oldest first */
const DIRECT_MAX = SEASON.referenceYear - SEASON.acceptedDirectAge;
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ZONES = [
  { from: MIN, to: R.elderlyNeedsCompanionMaxBirthYear + 0.5, label: "يحتاج مرافقاً", en: "Needs a companion", color: "bg-maroon" },
  { from: R.elderlyNeedsCompanionMaxBirthYear + 0.5, to: R.applicantMaxBirthYear + 0.5, label: "صاحب طلب أو مرافق", en: "Applicant or companion", color: "bg-green-dark" },
  { from: R.applicantMaxBirthYear + 0.5, to: R.companionMaxBirthYear + 0.5, label: "مرافق فقط", en: "Companion only", color: "bg-gold-dark" },
  { from: R.companionMaxBirthYear + 0.5, to: MAX, label: "غير مسموح", en: "Not allowed", color: "bg-ink/25" },
];

const PRESETS: { year: number; gender: "M" | "F"; label: string; en: string }[] = [
  { year: 1990, gender: "F", label: "مواليد 1990 · امرأة", en: "Born 1990 · woman" },
  { year: 1950, gender: "M", label: "مواليد 1950", en: "Born 1950" },
  { year: 2010, gender: "M", label: "مواليد 2010", en: "Born 2010" },
  { year: 1968, gender: "M", label: "مواليد 1968 · رجل", en: "Born 1968 · man" },
  { year: 2002, gender: "F", label: "مواليد 2002 · امرأة", en: "Born 2002 · woman" },
];

type Rule = { key: string; state: "ok" | "no" | "need"; text: string };

function evaluate(year: number, gender: "M" | "F"): { verdict: string; tone: "green" | "gold" | "maroon"; rules: Rule[] } {
  const f = gender === "F";
  const rules: Rule[] = [
    year <= R.applicantMaxBirthYear
      ? { key: "applicant", state: "ok", text: `${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون صاحبة" : "يكون صاحب"} طلب` }
      : { key: "applicant", state: "no", text: `لا ${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون صاحبة" : "يكون صاحب"} طلب — صاحب الطلب من مواليد ${R.applicantMaxBirthYear} فما قبل` },
    year <= R.companionMaxBirthYear
      ? { key: "companion", state: "ok", text: `${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون مرافقة" : "يكون مرافقاً"} في طلب` }
      : { key: "companion", state: "no", text: `لا ${f ? "يمكنها" : "يمكنه"} أن ${f ? "تكون مرافقة" : "يكون مرافقاً"} — المرافق من مواليد ${R.companionMaxBirthYear} فما قبل` },
  ];
  if (f && year >= R.womanNeedsMahramMinBirthYear) {
    rules.push({ key: "mahram", state: "need", text: `تحتاج محرماً في الطلب نفسه (مواليد ${R.womanNeedsMahramMinBirthYear} فما بعد)` });
  }
  if (year <= R.elderlyNeedsCompanionMaxBirthYear) {
    rules.push({ key: "elderly", state: "need", text: `${f ? "تحتاج" : "يحتاج"} مرافقاً حصراً مسمّى في الطلب (مواليد ${R.elderlyNeedsCompanionMaxBirthYear} فما قبل)` });
  }

  let verdict: string;
  let tone: "green" | "gold" | "maroon" = "green";
  if (year > R.companionMaxBirthYear) {
    verdict = `لا ${f ? "يمكنها" : "يمكن"} أن ${f ? "تكون مرافقة" : "يكون مرافقاً"}`;
    tone = "maroon";
  } else if (year <= R.elderlyNeedsCompanionMaxBirthYear) {
    verdict = `${f ? "تحتاج" : "يحتاج"} مرافقاً حصراً`;
    tone = "gold";
  } else if (f && year >= R.womanNeedsMahramMinBirthYear) {
    verdict = year > R.applicantMaxBirthYear ? "مرافقة فقط، وتحتاج محرماً" : "تحتاج محرماً";
    tone = "gold";
  } else if (year > R.applicantMaxBirthYear) {
    verdict = "يمكن أن يكون مرافقاً فقط";
    tone = "gold";
  } else {
    verdict = f ? "تستوفي شروط العمر كاملة" : "يستوفي شروط العمر كاملة";
  }
  return { verdict, tone, rules };
}

/** The same verdict and rules in English (English has no grammatical gender to follow here) */
function evaluateEn(year: number, gender: "M" | "F"): { verdict: string; tone: "green" | "gold" | "maroon"; rules: Rule[] } {
  const f = gender === "F";
  const rules: Rule[] = [
    year <= R.applicantMaxBirthYear
      ? { key: "applicant", state: "ok", text: "Can be the main applicant" }
      : { key: "applicant", state: "no", text: `Cannot be the main applicant — the main applicant must be born in ${R.applicantMaxBirthYear} or earlier` },
    year <= R.companionMaxBirthYear
      ? { key: "companion", state: "ok", text: "Can be a companion in an application" }
      : { key: "companion", state: "no", text: `Cannot be a companion — a companion must be born in ${R.companionMaxBirthYear} or earlier` },
  ];
  if (f && year >= R.womanNeedsMahramMinBirthYear) {
    rules.push({ key: "mahram", state: "need", text: `Needs a mahram in the same application (born ${R.womanNeedsMahramMinBirthYear} or later)` });
  }
  if (year <= R.elderlyNeedsCompanionMaxBirthYear) {
    rules.push({ key: "elderly", state: "need", text: `Must have a companion named in the application (born ${R.elderlyNeedsCompanionMaxBirthYear} or earlier)` });
  }
  const { tone } = evaluate(year, gender);
  let verdict: string;
  if (year > R.companionMaxBirthYear) verdict = "Cannot be a companion";
  else if (year <= R.elderlyNeedsCompanionMaxBirthYear) verdict = "Must have a companion";
  else if (f && year >= R.womanNeedsMahramMinBirthYear) verdict = year > R.applicantMaxBirthYear ? "Companion only, and needs a mahram" : "Needs a mahram";
  else if (year > R.applicantMaxBirthYear) verdict = "Can only be a companion";
  else verdict = "Meets all the age rules";
  return { verdict, tone, rules };
}

type Route = "direct" | "lottery";

/**
 * Where this person stands in the registration route shown: direct acceptance (by age), or the lottery —
 * before the draw who may enter it, after it whether the main applicant's birth year (and month) was drawn.
 */
function routeRule(route: Route, year: number, month: number, gender: "M" | "F", picks: DrawPick[] | null, en: boolean): Rule | null {
  if (year > R.companionMaxBirthYear) return null;
  const f = gender === "F";
  const key = `route-${route}`;
  if (route === "direct") {
    if (year <= DIRECT_MAX)
      return { key, state: "ok", text: en ? `Accepted directly, without the lottery (born ${DIRECT_MAX} or earlier)` : `${f ? "تُقبل" : "يُقبل"} في القبول المباشر دون قرعة (مواليد ${DIRECT_MAX} فما قبل)` };
    const lottery = year <= R.applicantMaxBirthYear;
    return {
      key,
      state: "need",
      text: en
        ? `Not of the direct-acceptance ages (born ${DIRECT_MAX} or earlier): only as a companion of an applicant of those ages${lottery ? ", or register for the lottery" : ""}`
        : `ليس من أعمار القبول المباشر (مواليد ${DIRECT_MAX} فما قبل): ${f ? "تدخله مرافقةً" : "يدخله مرافقاً"} لصاحب طلب منها فقط${lottery ? `، أو ${f ? "تسجّل" : "يسجّل"} على القرعة` : ""}`,
    };
  }
  if (year <= DIRECT_MAX)
    return { key, state: "need", text: en ? `Born ${DIRECT_MAX} or earlier: accepted directly, so the lottery is not needed` : `من مواليد ${DIRECT_MAX} فما قبل: ${f ? "تُقبل" : "يُقبل"} في القبول المباشر، فلا ${f ? "تحتاج" : "يحتاج"} إلى القرعة` };
  if (year > R.applicantMaxBirthYear)
    return {
      key,
      state: "need",
      text: en
        ? "Enters the lottery as a companion only: the application is accepted if its main applicant's birth year is drawn"
        : `${f ? "تدخل القرعة مرافقةً" : "يدخل القرعة مرافقاً"} فقط: يُقبل الطلب إن سُحبت سنة ميلاد صاحبه، لا سنة ميلاد${f ? "ها" : "ه"}`,
    };
  if (!picks)
    return {
      key,
      state: "ok",
      text: en
        ? "Can register for the lottery as the main applicant; the application is accepted if the birth year is drawn"
        : `${f ? "يمكنها" : "يمكنه"} التسجيل على القرعة ${f ? "صاحبةَ" : "صاحبَ"} طلب، ويُقبل الطلب إن سُحبت سنة ميلاد${f ? "ها" : "ه"}`,
    };
  const pick = picks.find((p) => p.year === year);
  if (!pick)
    return { key: `${key}-out`, state: "no", text: en ? `${year} was not drawn: an application with this person as main applicant is not accepted` : `لم تُسحب سنة ${year} في القرعة، فلا يُقبل طلبٌ ${f ? "هي صاحبته" : "هو صاحبه"}` };
  if (pick.months === "all")
    return { key: `${key}-in`, state: "ok", text: en ? `${year} was drawn in full: the application is accepted with everyone in it` : `سُحبت سنة ${year} بكل أشهرها: يُقبل الطلب بكل من فيه` };
  const list = en ? pick.months.map((m) => MONTHS_EN[m - 1]).join(", ") : pick.months.map((m) => MONTHS[m - 1]).join("، ");
  const name = en ? MONTHS_EN[month - 1] : MONTHS[month - 1];
  return pick.months.includes(month)
    ? { key: `${key}-in`, state: "ok", text: en ? `${year} was drawn for ${list} only, and ${name} is one of them: the application is accepted` : `سُحبت سنة ${year} لمواليد ${list}، و${name} منها: يُقبل الطلب بكل من فيه` }
    : { key: `${key}-out`, state: "no", text: en ? `${year} was drawn for ${list} only, not ${name}: the application is not accepted` : `سُحبت سنة ${year} لمواليد ${list} فقط، وليس ${name} منها: لا يُقبل الطلب` };
}

/** «مفتوح الآن»، «يفتح 26 آب»، «انتهى» — the state of one registration, on the route's tab */
function routeBadge(s: OperationState, drawOut: boolean, en: boolean) {
  if (s.open) return en ? "Open now" : "مفتوح الآن";
  if (s.status === "upcoming") return en ? `Opens ${dateEn(dayLabel(s.start))}` : `يفتح ${dayLabel(s.start)}`;
  if (drawOut) return en ? "Results out" : "النتائج منشورة";
  if (s.status === "off") return en ? "Stopped" : "أوقفته الإدارة";
  return en ? "Ended" : "انتهى";
}

export function AgeRuler() {
  const [year, setYear] = useState(1990);
  const [gender, setGender] = useState<"M" | "F">("F");
  const t = useT();
  const en = useLang() === "en";
  const age = SEASON.referenceYear - year;
  const { verdict, tone, rules: ageRules } = en ? evaluateEn(year, gender) : evaluate(year, gender);

  // Registering on the Hajj: direct acceptance opens first, then the lottery; the switch shows from the first
  // opening until the accepted have confirmed, and follows whichever is open unless the visitor picks the other
  const today = useToday();
  const direct = useOperation("hajj-direct");
  const lottery = useOperation("hajj-lottery");
  const draw = usePublishedDraw();
  const [picked, setPicked] = useState<Route | null>(null);
  const [month, setMonth] = useState(1);
  const registering = direct.open || lottery.open || (today >= (direct.start ?? DEMO_START) && today <= SEASON.windows.lottery.confirmTo);
  const route: Route | null = registering ? (picked ?? (direct.open ? "direct" : lottery.open || today > (direct.end ?? "") ? "lottery" : "direct")) : null;
  // The drawn years are shown once the lottery's registration is over (or when the demo opens everything)
  const drawOut = !!draw && (lottery.status === "closed" || lottery.status === "off" || lottery.status === "all");
  const picks = route === "lottery" && drawOut && draw ? draw.picks : null;
  const byMonths = picks?.find((p) => p.year === year && p.months !== "all");
  const extra = route ? routeRule(route, year, month, gender, picks, en) : null;
  const rules = extra ? [extra, ...ageRules] : ageRules;
  const toneCls = { green: "from-green-dark to-green", gold: "from-gold-dark to-[#8f8156]", maroon: "from-maroon-dark to-maroon" }[tone];

  return (
    <div className="overflow-hidden rounded-[2rem] border border-gold/40 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.6)]">
      {/* Verdict banner */}
      <motion.div layout className={cn("relative overflow-hidden bg-gradient-to-l ltr:bg-gradient-to-r p-6 text-white transition-colors duration-500 md:p-8", toneCls)}>
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/75">{t("المسطرة التفاعلية — حرّك المؤشر واختر الجنس", "Interactive ruler — move the slider and choose the sex")}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-display text-2xl font-bold md:text-3xl">
              <span>
                {t("مواليد", "Born")} <span className="tabular-nums">{year}</span> · {gender === "F" ? t("امرأة", "woman") : t("رجل", "man")}
              </span>
              <span className="text-gold">{en ? "→" : "←"}</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={verdict}
                  initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                  transition={{ duration: 0.25 }}
                  className="text-gold"
                >
                  {verdict}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
          <div className="relative flex rounded-2xl bg-white/10 p-1" role="radiogroup" aria-label={t("الجنس", "Sex")}>
            {(
              [
                ["M", t("رجل", "Man"), Mars],
                ["F", t("امرأة", "Woman"), Venus],
              ] as const
            ).map(([g, label, Icon]) => (
              <button
                key={g}
                role="radio"
                aria-checked={gender === g}
                onClick={() => setGender(g)}
                className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition", gender === g ? "on-light text-ink" : "text-white/80 hover:text-white")}
              >
                {gender === g && <motion.span layoutId="gender-pill" className="absolute inset-0 rounded-xl bg-gold" transition={{ type: "spring", damping: 24, stiffness: 320 }} />}
                <Icon className="relative size-4" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {route && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gold/30 px-6 py-4 md:px-8">
          <div className="flex rounded-2xl bg-sand p-1" role="radiogroup" aria-label={t("طريقة القبول", "Route of acceptance")}>
            {(
              [
                ["direct", t("القبول المباشر", "Direct acceptance"), direct],
                ["lottery", t("القرعة", "Lottery"), lottery],
              ] as const
            ).map(([r, label, op]) => (
              <button
                key={r}
                role="radio"
                aria-checked={route === r}
                onClick={() => setPicked(r)}
                className={cn("relative flex flex-col items-start rounded-xl px-4 py-1.5 text-start transition", route === r ? "text-white" : "text-green-dark hover:bg-white/60")}
              >
                {route === r && <motion.span layoutId="route-pill" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 24, stiffness: 320 }} />}
                <span className="relative text-sm font-bold">{label}</span>
                <span className={cn("relative text-[11px]", route === r ? "text-gold" : op.open ? "font-semibold text-green" : "text-ink-soft")}>
                  {routeBadge(op, r === "lottery" && drawOut, en)}
                </span>
              </button>
            ))}
          </div>
          <p className="min-w-0 flex-1 text-xs leading-6 text-ink-soft">
            {route === "direct"
              ? t(`القبول المباشر: مواليد ${DIRECT_MAX} فما قبل ومرافقوهم، الأكبر سناً أولاً.`, `Direct acceptance: born ${DIRECT_MAX} or earlier and their companions, oldest first.`)
              : picks
                ? t("نتائج القرعة منشورة: يُقبل الطلب إن سُحبت سنة ميلاد صاحبه، ولبعض السنوات أشهر محددة.", "The lottery results are out: an application is accepted if its main applicant's birth year was drawn, for some years only certain months.")
                : t(
                    `القرعة: طلب مستقل لأصحاب الطلبات من مواليد ${DIRECT_MAX + 1}–${R.applicantMaxBirthYear}، تُسحب فيه سنوات ميلاد ولبعضها أشهر.`,
                    `The lottery: a separate application for main applicants born ${DIRECT_MAX + 1}–${R.applicantMaxBirthYear}; birth years are drawn, some by months.`,
                  )}
          </p>
        </div>
      )}

      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Ruler */}
        <div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-ink-soft">{t(`العمر في سنة الموسم (${SEASON.referenceYear})`, `Age in the season year (${SEASON.referenceYear})`)}</p>
              <p className="font-display text-5xl font-bold text-green-dark tabular-nums">
                {age}
                <span className="ms-2 text-lg text-ink-soft">{t("عاماً", "years")}</span>
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setYear((y) => Math.max(MIN, y - 1))}
                className="size-10 rounded-xl bg-sand text-lg font-bold text-green-dark transition hover:bg-gold-light active:scale-90"
                aria-label={t("سنة أقدم", "Earlier year")}
              >
                −
              </button>
              <button
                onClick={() => setYear((y) => Math.min(MAX, y + 1))}
                className="size-10 rounded-xl bg-sand text-lg font-bold text-green-dark transition hover:bg-gold-light active:scale-90"
                aria-label={t("سنة أحدث", "Later year")}
              >
                +
              </button>
            </div>
          </div>

          <div className="relative mt-16 select-none" dir="ltr">
            {/* Woman-needs-mahram band */}
            <AnimatePresence>
              {gender === "F" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute -top-7 flex h-5 items-center justify-center rounded-md border border-dashed border-maroon/50 bg-[repeating-linear-gradient(45deg,rgba(103,33,70,.12)_0_6px,transparent_6px_12px)] text-[10px] font-bold text-maroon"
                  style={{ left: `${pct(R.womanNeedsMahramMinBirthYear - 0.5)}%`, right: 0 }}
                  dir={en ? undefined : "rtl"}
                >
                  {t("تحتاج محرماً", "Needs a mahram")}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zones — the bar is what comes into view: a zone still at scale 0 on its clipped edge never would */}
            <motion.div className="relative flex h-5 overflow-hidden rounded-full" initial="hidden" whileInView="shown" viewport={{ once: true }}>
              {ZONES.map((z, i) => (
                <motion.div
                  key={z.label}
                  className={cn("h-full", z.color)}
                  style={{ width: `${pct(z.to) - pct(z.from)}%`, originX: 0 }}
                  variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { duration: 0.6, delay: i * 0.15 } } }}
                />
              ))}
              {/* Drawn years: solid when drawn in full, faded when only some of their months were */}
              {picks?.map((p) => (
                <span
                  key={p.year}
                  className={cn("absolute inset-y-0 bg-white", p.months === "all" ? "opacity-90" : "opacity-50")}
                  style={{ left: `${pct(p.year - 0.5)}%`, width: `${100 / (MAX - MIN)}%` }}
                />
              ))}
            </motion.div>

            {/* Thumb bubble */}
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label={t("سنة الميلاد", "Year of birth")}
              aria-valuetext={t(`مواليد ${year}، العمر ${age} عاماً`, `Born ${year}, aged ${age}`)}
              className="peer absolute inset-x-0 -top-4 z-20 h-12 w-full cursor-grab opacity-0 active:cursor-grabbing"
            />
            <motion.div
              className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 peer-focus-visible:[&>span]:ring-4"
              animate={{ left: `${pct(year)}%` }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              style={{ left: `${pct(year)}%` }}
            >
              <span className="block size-8 rounded-full border-4 border-white bg-gold shadow-[0_6px_18px_rgba(0,0,0,.25)] ring-green-light/40" />
              <span className="absolute -top-11 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs font-bold text-white tabular-nums">
                {year}
                <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-ink" />
              </span>
            </motion.div>

            {/* Ticks */}
            <div className="relative mt-3 h-10 text-[10px] text-ink-soft">
              {[1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010].map((y) => (
                <span key={y} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${pct(y)}%` }}>
                  <span className="mx-auto mb-0.5 block h-1.5 w-px bg-ink/30" />
                  {y}
                </span>
              ))}
              {[R.elderlyNeedsCompanionMaxBirthYear, R.womanNeedsMahramMinBirthYear, R.applicantMaxBirthYear, R.companionMaxBirthYear].map((y) => (
                <span key={`t${y}`} className="absolute top-5 -translate-x-1/2 font-bold text-maroon tabular-nums" style={{ left: `${pct(y)}%` }}>
                  ▲{y}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-soft">
            {ZONES.map((z) => (
              <span key={z.label} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded", z.color)} /> {t(z.label, z.en)}
              </span>
            ))}
            {picks && (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded bg-green-dark ring-2 ring-inset ring-white/90" /> {t("سنة مسحوبة في القرعة (الباهتة: بعض أشهرها)", "Year drawn in the lottery (faded: some of its months)")}
              </span>
            )}
          </div>

          {byMonths && byMonths.months !== "all" && (
            <div className="mt-5 rounded-2xl border border-gold/40 bg-sand/50 p-4">
              <p className="text-xs font-bold text-green-dark">
                {t(`سُحبت سنة ${year} بأشهر محددة — اختر شهر الميلاد`, `${year} was drawn by months — choose the month of birth`)}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("شهر الميلاد", "Month of birth")}>
                {MONTHS.map((m, i) => {
                  const drawn = (byMonths.months as number[]).includes(i + 1);
                  return (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={month === i + 1}
                      onClick={() => setMonth(i + 1)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                        month === i + 1 ? "border-green-dark bg-green-dark text-white" : drawn ? "border-green-light bg-green-light/10 text-green" : "border-gold/50 bg-white text-ink-soft hover:border-green-light",
                      )}
                    >
                      {t(m, MONTHS_EN[i])}
                      {drawn && <span className="ms-1">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = p.year === year && p.gender === gender;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setYear(p.year);
                    setGender(p.gender);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    active ? "border-green-dark bg-green-dark text-white" : "border-gold/60 bg-white text-ink hover:border-green-light",
                  )}
                >
                  {t(p.label, p.en)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-3xl bg-sand/70 p-5">
          <p className="font-bold text-green-dark">{t("ما ينطبق على هذا الشخص", "What applies to this person")}</p>
          <motion.ul layout className="mt-4 space-y-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {rules.map((r) => (
                <motion.li
                  layout
                  key={`${r.key}-${r.state}`}
                  initial={{ opacity: 0, x: 30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl bg-white p-3.5 text-sm leading-6 shadow-sm ring-1",
                    r.state === "ok" ? "ring-green-light/25" : r.state === "no" ? "ring-maroon/25" : "ring-gold-dark/40",
                  )}
                >
                  {r.state === "ok" ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-green-light" />
                  ) : r.state === "no" ? (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-maroon" />
                  ) : (
                    <Info className="mt-0.5 size-5 shrink-0 text-gold-dark" />
                  )}
                  <span className="text-ink">{r.text}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          <p className="mt-4 text-xs leading-6 text-ink-soft">
            {picks
              ? t("تُحسب شروط العمر بسنة الميلاد، والقرعة بسنة ميلاد صاحب الطلب وشهره للسنوات المسحوبة بأشهر.", "The age rules go by year of birth; the lottery by the main applicant's birth year, and month for the years drawn by months.")
              : t("تُحسب الشروط بسنة الميلاد فقط، وتضبطها الإدارة لكل موسم.", "The rules go by year of birth only, and the Administration sets them for each season.")}
          </p>
        </div>
      </div>
    </div>
  );
}
