"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ChevronLeft, ChevronRight, LockOpen, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { DEMO_START, dateOf, dayHijri, dayLabel, dayTimeLabel, shiftDay, statusLabel, useAllOpen, useClockTime, useOperations, useToday, type OperationKey, type OperationState } from "@/lib/operations";
import { hijriDateIn } from "@/components/site/en-format";
import { useLang, type Lang } from "@/lib/i18n";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** The portals, where operations open and close by the date; the public pages keep their own calendar */
const PORTALS = ["/portal", "/administrator", "/staff", "/register", "/login"];

const TONE: Record<OperationState["status"], string> = {
  open: "bg-green-light/15 text-green",
  on: "bg-green-light/15 text-green",
  always: "bg-ink/5 text-ink-soft",
  upcoming: "bg-gold/30 text-maroon",
  closed: "bg-ink/5 text-hint",
  off: "bg-maroon/10 text-maroon",
  all: "bg-gold/40 text-maroon",
};

const MODES = [
  { all: false, label: { ar: "حسب التاريخ", en: "By date" }, hint: { ar: "كل عملية تُفتح وتُغلق بتواريخها", en: "Each operation opens and closes on its dates" } },
  { all: true, label: { ar: "كل شيء مفتوح", en: "Everything open" }, hint: { ar: "كل العمليات مفتوحة معاً، أياً كان التاريخ", en: "All operations open together, whatever the date" } },
];

/**
 * The bar in English, on the public pages that show it (sign-in and registration): the operations' names, and
 * their dates written as lib/operations writes them in Arabic.
 */
const OP_EN: Record<OperationKey, string> = {
  "hajj-direct": "Hajj registration — direct acceptance",
  "hajj-lottery": "Hajj registration — lottery pre-registration",
  "admin-registration": "Registering as an administrator",
  "admin-exams": "Exams",
  "group-formation": "Forming groups",
  "group-joining": "Pilgrims joining groups",
  "cluster-formation": "Forming clusters",
  "cluster-approval": "Reviewing and approving cluster requests",
  "group-management": "Group management",
  "cluster-management": "Cluster management",
  "pilgrim-evaluation": "Pilgrims' evaluation after the return",
  "self-evaluation": "Administrators' self-evaluation",
  "peer-evaluation": "Staff evaluating the administrators, groups and clusters",
  "evaluation-objection": "Objecting to the evaluation",
};

/** «20 January», with the year when asked, and «, 09:00» when it has an hour */
const dayEn = (day: string | undefined, time?: string, withYear = false) => {
  if (!day) return "";
  const d = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: withYear ? "numeric" : undefined }).format(dateOf(day));
  return time ? `${d}, ${time}` : d;
};

const statusEn = (s: OperationState) => {
  switch (s.status) {
    case "open":
      return s.end ? `Open until ${dayEn(s.end, s.endTime)}` : "Open";
    case "upcoming":
      return `Opens ${dayEn(s.start, s.startTime)}`;
    case "closed":
      return `Closed ${dayEn(s.end, s.endTime)}`;
    case "on":
      return "Opened by the Administration";
    case "off":
      return "Stopped by the Administration";
    case "all":
      return "Open — trying everything together";
    default:
      return "Permanent";
  }
};

/** The words of the bar in the page's language */
function words(lang: Lang) {
  const en = lang === "en";
  return {
    t: (ar: string, english: string) => (en ? english : ar),
    op: (o: OperationState) => (en ? OP_EN[o.key] : o.label),
    status: (o: OperationState) => (en ? statusEn(o) : statusLabel(o)),
    day: (day: string, withYear = false) => (en ? dayEn(day, undefined, withYear) : dayLabel(day, withYear)),
    dayTime: (day: string | undefined, time?: string, withYear = false) => (en ? dayEn(day, time, withYear) : dayTimeLabel(day, time, withYear)),
    hijri: (day: string) => (en ? hijriDateIn("en", dateOf(day)) : dayHijri(day)),
  };
}

/**
 * The demo's date. The season runs on dated operations, so the tester moves "today" to try each one as it
 * opens and closes — or opens everything at once to try it all together. Nothing here is part of the real
 * platform, which runs on the real date.
 */
export function DemoClock() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const today = useToday();
  const time = useClockTime();
  const timeSet = useStore((s) => !!s.clock.time);
  const ops = useOperations();
  const allOpen = useAllOpen();
  const [open, setOpen] = useState(false);
  const lang = useLang();
  const w = words(lang);
  const t = w.t;
  if (!hydrated || !PORTALS.some((p) => pathname.startsWith(p))) return null;
  const live = ops.filter((o) => o.open && o.status !== "always");

  return (
    <div data-demo-clock className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 print:hidden">
      <div className="pointer-events-auto relative">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="absolute bottom-full left-1/2 mb-3 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-gold/40 bg-white text-ink shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 bg-maroon-dark p-4 text-white">
                <div>
                  <p className="font-display text-lg font-bold">{t("تاريخ المحاكاة", "Demo date")}</p>
                  <p className="text-xs leading-5 text-white/70">
                    {t(
                      "جرّب حسب الوقت: يبدأ باليوم الفعلي، وكل عملية تُفتح وتُغلق وحدها بتواريخها. أو افتح كل شيء لتجرب العمليات كلها معاً.",
                      "Try it by time: it starts on today's real date, and each operation opens and closes by itself on its dates. Or open everything to try all the operations together.",
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label={t("إغلاق", "Close")} className="grid size-9 shrink-0 place-items-center rounded-xl hover:bg-white/10">
                  <X className="size-5" />
                </button>
              </div>
              <div role="radiogroup" aria-label={t("طريقة التجربة", "How to try it")} className="grid grid-cols-2 gap-1 border-b border-gold/30 bg-sand/60 p-2">
                {MODES.map((m) => (
                  <button
                    key={m.label.ar}
                    type="button"
                    role="radio"
                    aria-checked={allOpen === m.all}
                    onClick={() => actions.setAllOpen(m.all)}
                    className={cn("rounded-2xl px-3 py-2 text-start transition", allOpen === m.all ? "bg-white shadow ring-2 ring-gold-dark" : "hover:bg-white/60")}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      {m.all ? <LockOpen className="size-4 text-gold-dark" /> : <CalendarClock className="size-4 text-green-dark" />} {m.label[lang]}
                    </span>
                    <span className="block text-[11px] leading-4 text-hint">{m.hint[lang]}</span>
                  </button>
                ))}
              </div>
              {allOpen && <p className="bg-gold/20 px-4 py-2 text-xs leading-5 text-maroon">
                  {t(
                    "كل العمليات مفتوحة الآن مهما كان التاريخ. ما أوقفته الإدارة بيدها يبقى موقوفاً، وما بعد الموعد النهائي (اعتماد التكتلات) متاح معاً.",
                    "All operations are open now, whatever the date. What the Administration stopped by hand stays stopped, and what follows the deadline (approving clusters) is available at the same time.",
                  )}
                </p>}
              <div className={cn("flex items-center gap-2 border-b border-gold/30 p-4", allOpen && "opacity-50")}>
                <button type="button" onClick={() => actions.setToday(shiftDay(today, -1))} aria-label={t("اليوم السابق", "Previous day")} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand hover:bg-gold/30">
                  <ChevronRight className="size-5" />
                </button>
                <input
                  type="date"
                  value={today}
                  onChange={(e) => e.target.value && actions.setToday(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border-2 border-gold/40 px-3 text-center font-bold outline-none focus:border-green-light"
                  aria-label={t("اليوم", "Day")}
                />
                <button type="button" onClick={() => actions.setToday(shiftDay(today, 1))} aria-label={t("اليوم التالي", "Next day")} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand hover:bg-gold/30">
                  <ChevronLeft className="size-5" />
                </button>
              </div>
              <div className={cn("flex items-center gap-2 px-4 pt-3 text-xs text-hint", allOpen && "opacity-50")}>
                <span className="min-w-0 flex-1">{w.hijri(today)}</span>
                <label className="flex items-center gap-1.5">
                  {t("الساعة", "Time")}
                  <input type="time" value={time} onChange={(e) => actions.setClockTime(e.target.value || undefined)} className="h-8 rounded-lg border border-gold/40 px-2 font-bold text-ink outline-none focus:border-green-light" aria-label={t("الساعة", "Time")} dir="ltr" />
                </label>
                {timeSet && (
                  <button type="button" onClick={() => actions.setClockTime(undefined)} className="font-bold text-green-dark underline">
                    {t("الساعة الفعلية", "Real time")}
                  </button>
                )}
              </div>
              <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto p-4 pt-2">
                {ops.map((o) => (
                  <li key={o.key} className="flex items-center gap-2 rounded-2xl bg-sand/60 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {w.op(o)} {o.estimate && <span className="text-[11px] font-normal text-hint">{t("(موعد تقديري)", "(estimated date)")}</span>}
                      </p>
                      <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[o.status])}>{w.status(o)}</span>
                    </div>
                    {o.start && (
                      <button type="button" onClick={() => actions.setToday(o.start, o.startTime)} className="shrink-0 rounded-xl border border-gold/50 px-2.5 py-1.5 text-xs font-bold text-green-dark hover:bg-gold/20">
                        {t(`انتقل إلى ${dayTimeLabel(o.start, o.startTime)}`, `Go to ${w.dayTime(o.start, o.startTime)}`)}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-center gap-2 border-t border-gold/30 p-3 text-center">
                <button type="button" onClick={() => actions.setToday(undefined)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-sand">
                  <RotateCcw className="size-3.5" /> {t("اليوم الفعلي", "Today's real date")}
                </button>
                <button type="button" onClick={() => actions.setToday(DEMO_START)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-ink-soft hover:bg-sand">
                  {t(`أول الموسم (${dayLabel(DEMO_START, true)})`, `Start of the season (${w.day(DEMO_START, true)})`)}
                </button>
              </div>
              <p className="px-4 pb-3 text-center text-[11px] leading-5 text-hint">
                {t(
                  "مواعيد موسم 1448 كما أعلنتها إدارة الحج والعمرة. ما لم تعلنه بعد موعد تقديري على نمط الموسم الماضي.",
                  "The 1448 season dates as announced by the Hajj and Umrah Administration. Dates it has not announced yet are estimates following last season's pattern.",
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border border-gold/50 bg-maroon-dark/95 py-2 pe-4 ps-2 text-sm font-bold text-white shadow-2xl backdrop-blur"
        >
          <span className="grid size-8 place-items-center rounded-full bg-gold text-ink">{allOpen ? <LockOpen className="size-4" /> : <CalendarClock className="size-4" />}</span>
          <span>{allOpen ? t("كل شيء مفتوح", "Everything open") : timeSet ? w.dayTime(today, time, true) : w.day(today, true)}</span>
          <span className="hidden max-w-[26rem] truncate text-xs font-normal text-white/70 sm:inline">— {allOpen
              ? t("تجربة العمليات كلها معاً، أياً كان التاريخ", "Trying all operations together, whatever the date")
              : live.length
                ? t(`مفتوح الآن: ${live.map((o) => o.label.replace("التسجيل على الحج — ", "")).join("، ")}`, `Open now: ${live.map((o) => OP_EN[o.key].replace("Hajj registration — ", "")).join(", ")}`)
                : t("لا عملية موسمية مفتوحة اليوم", "No seasonal operation is open today")}</span>
        </button>
      </div>
    </div>
  );
}
