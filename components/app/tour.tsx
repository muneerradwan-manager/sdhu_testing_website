"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Compass, Landmark, Loader2, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SpeakButton } from "@/components/ui/widgets";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn, samePath } from "@/lib/utils";

/**
 * Guided tour (جولة تعريفية) — an onboarding walkthrough, not a page of its own.
 * Each step opens a page and spotlights one real element on it; the last step offers the three demo journeys.
 */
type Step = { route: string; selector?: string; title: string; text: string };

const STEPS: Step[] = [
  { route: "/", title: "أهلاً بك في المنصة الوطنية للحج", text: "جولة سريعة لا تتجاوز دقيقة، نفتح فيها أهم صفحات المنصة ونشير إلى ما يميّز كل صفحة. كل البيانات هنا وهمية لأغراض العرض." },
  { route: "/", selector: "#services", title: "البوابة العامة — دون تسجيل دخول", text: "الأخبار والأكاديمية ومواقيت الصلاة ونتائج القبول متاحة للجميع. لا نطلب الحساب إلا عند تقديم الطلب." },
  { route: "/academy", selector: "#search", title: "أكاديمية الدروس الدينية", text: "ابحث في كل الدروس، واستمع إلى الشرح المسموع بصوت سوري، مع فيديو حقيقي من الحرم واختبارات وشهادة إتمام." },
  { route: "/guide", selector: "#counter", title: "دليل المناسك — عدّاد الطواف والسعي", text: "دليل يوماً بيوم من التروية حتى أيام التشريق، وهنا عدّاد تفاعلي يساعد الحاج على عدّ أشواط الطواف والسعي." },
  { route: "/prayer-times", selector: 'section[aria-label="الصلاة القادمة واتجاه القبلة"]', title: "مواقيت الصلاة واتجاه القبلة", text: "الصلاة القادمة مع عدّ تنازلي، وبوصلة القبلة لمدينتك، مع جدول شهري لكل المدن السورية ومكة والمدينة." },
  { route: "/conditions", selector: "#precheck", title: "فحص الأهلية المبدئي", text: "أدخل سنة الميلاد وأجب عن أسئلة قليلة لتعرف إن كنت مستوفياً لشروط موسم 1448 — دون حفظ أي بيانات." },
  { route: "/results", selector: "#search", title: "نتائج القبول العامة", text: "البحث عن النتيجة بالرقم الوطني ورمز التحقق، دون كشف أي معلومة شخصية." },
  { route: "/", title: "اختر رحلتك التجريبية", text: "جرّب المنصة من وجهة نظر أحد أطرافها الثلاثة." },
];

const DEMO_PILGRIM = "01012345412";
const HEADER = 84; // fixed header height once collapsed
const PAD = 10;
const CARD_HEIGHT = 250; // estimate before the card has rendered


type Box = { top: number; left: number; width: number; height: number };

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const tourSeen = useStore((s) => s.tourSeen);
  const accounts = useStore((s) => s.accounts);
  const [index, setIndex] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [settled, setSettled] = useState(false);
  const [nudge, setNudge] = useState(false);

  const step = index === null ? null : STEPS[index];
  const onRoute = !!step && samePath(pathname, step.route);

  // First-visit nudge on the home page
  useEffect(() => {
    if (!hydrated || tourSeen || !samePath(pathname, "/")) return;
    const t = setTimeout(() => setNudge(true), 4500);
    return () => clearTimeout(t);
  }, [hydrated, tourSeen, pathname]);

  /** Spotlight = target clipped to the visible area between the header and the bottom of the screen */
  const measure = useCallback(() => {
    if (!step?.selector) {
      setBox(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    // Keep the highlight above the tour card so the card never covers it
    const cardHeight = document.querySelector("[data-tour-card]")?.getBoundingClientRect().height ?? CARD_HEIGHT;
    const top = Math.max(r.top - PAD, HEADER);
    const bottom = Math.min(r.bottom + PAD, window.innerHeight - cardHeight - 28);
    const left = Math.max(r.left - PAD, 8);
    const right = Math.min(r.right + PAD, window.innerWidth - 8);
    setBox(bottom - top > 40 ? { top, left, width: right - left, height: bottom - top } : null);
  }, [step]);

  // Open the step's page (one navigation), then bring its target into view and spotlight it
  useEffect(() => {
    if (!step) return;
    if (!onRoute) {
      router.push(step.route, { scroll: false });
      return;
    }
    const el = step.selector ? document.querySelector(step.selector) : null;
    const place = () => {
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - HEADER - 16;
        window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    };
    // Let the page finish its entrance animation before measuring
    const t1 = setTimeout(place, 350);
    const t2 = setTimeout(() => {
      place();
      measure();
      setSettled(true);
    }, 750);
    const t3 = setTimeout(measure, 1150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [step, onRoute, router, measure]);

  useEffect(() => {
    if (!step || !settled) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step, settled, measure]);

  const go = (i: number | null) => {
    setSettled(false);
    setBox(null);
    setIndex(i);
  };
  const start = () => {
    setNudge(false);
    go(0);
  };
  const close = () => {
    go(null);
    setNudge(false);
    actions.markTourSeen();
  };

  const startPilgrim = () => {
    if (!accounts[DEMO_PILGRIM]) {
      actions.register({ nationalId: DEMO_PILGRIM, phone: "0944345412", password: "hajj1448", createdAt: Date.now(), emergencyName: "سارة (ابنتي)", emergencyPhone: "0933000412" });
    } else {
      actions.login(DEMO_PILGRIM);
    }
    close();
    router.push("/portal/apply");
  };

  if (!hydrated) return null;
  const last = index === STEPS.length - 1;
  const hideLauncher = pathname.startsWith("/staff") || pathname.startsWith("/portal/application") || pathname.startsWith("/portal/season");

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {index === null && !hideLauncher && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed bottom-5 right-5 z-[60] flex items-center gap-2">
            <AnimatePresence>
              {nudge && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={start}
                  className="hidden rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-green-dark shadow-xl ring-1 ring-gold/40 sm:block"
                >
                  جديد هنا؟ خذ جولة تعريفية سريعة ✨
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={start}
              aria-label="جولة تعريفية"
              title="جولة تعريفية في المنصة"
              className={cn("grid size-13 place-items-center rounded-full bg-gold text-ink shadow-xl shadow-gold-dark/30 transition hover:scale-105", nudge && "animate-pulse-ring")}
            >
              <Compass className="size-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {step && (
        <div className="pointer-events-none fixed inset-0 z-[85]" aria-live="polite">
          {/* Spotlight: dims only around the highlighted element, no blur — the page stays readable */}
          <AnimatePresence>
            {settled && box ? (
              <motion.div
                key="spot"
                className="absolute rounded-3xl ring-4 ring-gold"
                initial={{ opacity: 0, ...box }}
                animate={{ opacity: 1, ...box }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }}
                style={{ boxShadow: "0 0 0 9999px rgba(2,21,38,.45)" }}
              />
            ) : settled && !step.selector ? (
              <motion.div key="dim" className="absolute inset-0 bg-ink/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            ) : null}
          </AnimatePresence>

          {/* While the page opens */}
          <AnimatePresence>
            {!settled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-green-dark shadow-xl ring-1 ring-gold/40"
              >
                <Loader2 className="size-4 animate-spin" /> نفتح الصفحة...
              </motion.div>
            )}
          </AnimatePresence>

          {/* Card — bottom-left on desktop so it never sits on the highlighted content */}
          <AnimatePresence mode="wait">
            {settled && (
              <div
                key={index}
                className={cn(
                  "absolute inset-x-3 bottom-3 mx-auto max-w-lg",
                  step.selector ? "md:inset-x-auto md:bottom-6 md:left-6 md:mx-0 md:w-[26rem]" : "md:inset-0 md:flex md:max-w-none md:items-center md:justify-center",
                )}
              >
              <motion.div
                role="dialog"
                data-tour-card
                aria-label={step.title}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: "spring", damping: 26, stiffness: 280 }}
                className="pointer-events-auto w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-gold/40 md:w-[26rem]"
              >
                <div className="h-1.5 bg-sand">
                  <motion.div className="h-full bg-gradient-to-l from-green-light to-green-dark" initial={false} animate={{ width: `${((index! + 1) / STEPS.length) * 100}%` }} />
                </div>
                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-gold-dark">
                      جولة تعريفية — {index! + 1} من {STEPS.length}
                    </p>
                    <button onClick={close} className="rounded-full p-1 text-hint hover:bg-sand hover:text-ink" aria-label="إنهاء الجولة">
                      <X className="size-5" />
                    </button>
                  </div>
                  <h2 className="mt-1 font-display text-xl font-bold text-green-dark md:text-2xl">{step.title}</h2>
                  <p className="mt-2 leading-7 text-ink-soft">{step.text}</p>

                  {last && (
                    <div className="mt-4 grid gap-2">
                      <button onClick={startPilgrim} className="flex items-center gap-3 rounded-2xl bg-green-dark p-3.5 text-right text-white transition hover:bg-green">
                        <UserRound className="size-6 shrink-0 text-gold" />
                        <span>
                          <span className="block font-bold">الحاج: عائلة محمد الخطيب</span>
                          <span className="text-sm text-white/70">من التقديم حتى القبول والرحلة</span>
                        </span>
                      </button>
                      <button onClick={() => { close(); router.push("/administrator"); }} className="flex items-center gap-3 rounded-2xl bg-maroon p-3.5 text-right text-white transition hover:bg-maroon-dark">
                        <Briefcase className="size-6 shrink-0 text-gold" />
                        <span>
                          <span className="block font-bold">الإداري: أحمد سليمان الحمصي</span>
                          <span className="text-sm text-white/70">الامتحان، تشكيل المجموعة، طلبات الانتساب</span>
                        </span>
                      </button>
                      <button onClick={() => { close(); router.push("/staff"); }} className="flex items-center gap-3 rounded-2xl bg-ink p-3.5 text-right text-white transition hover:bg-ink/90">
                        <Landmark className="size-6 shrink-0 text-gold" />
                        <span>
                          <span className="block font-bold">الموظف: غرفة العمليات والتسجيل</span>
                          <span className="text-sm text-white/70">المراجعة، القرعة، إعدادات الموسم، سجل الأحداث</span>
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <SpeakButton text={`${step.title}. ${step.text}`} />
                    <div className="flex gap-2">
                      {index! > 0 && (
                        <button onClick={() => go(index! - 1)} className="flex items-center gap-1 rounded-2xl px-3 py-2.5 font-bold text-green-dark hover:bg-sand">
                          <ArrowRight className="size-4" /> السابق
                        </button>
                      )}
                      {!last ? (
                        <button onClick={() => go(index! + 1)} className="flex items-center gap-1 rounded-2xl bg-green-dark px-5 py-2.5 font-bold text-white hover:bg-green">
                          التالي <ArrowLeft className="size-4" />
                        </button>
                      ) : (
                        <button onClick={close} className="rounded-2xl px-4 py-2.5 font-bold text-ink-soft hover:bg-sand">
                          إنهاء
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
