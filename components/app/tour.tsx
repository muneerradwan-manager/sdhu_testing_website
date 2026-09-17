"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Compass, Landmark, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { SpeakButton } from "@/components/ui/widgets";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Step = { route: string; selector?: string; title: string; text: string };

const STEPS: Step[] = [
  { route: "/", title: "أهلاً بك في المنصة الوطنية للحج", text: "جولة سريعة لا تتجاوز دقيقة، نمرّ فيها على أهم ما في المنصة. كل البيانات هنا وهمية لأغراض العرض." },
  { route: "/", selector: "#services", title: "البوابة العامة — دون تسجيل دخول", text: "الأخبار والأكاديمية ومواقيت الصلاة ونتائج القبول متاحة للجميع. لا نطلب الحساب إلا عند تقديم الطلب." },
  { route: "/academy", title: "أكاديمية الدروس الدينية", text: "ستة مسارات وأكثر من أربعين درساً، مع فيديو حقيقي من الحرم وشرح مسموع بصوت سوري، واختبارات وشهادة إتمام." },
  { route: "/guide", title: "دليل المناسك يوماً بيوم", text: "من يوم التروية حتى أيام التشريق، مع الخرائط والأدعية وعدّاد تفاعلي للطواف والسعي." },
  { route: "/prayer-times", title: "مواقيت الصلاة واتجاه القبلة", text: "مواقيت محسوبة فلكياً لكل المدن السورية ومكة والمدينة، مع بوصلة القبلة وجدول شهري." },
  { route: "/conditions", title: "الشروط وفحص الأهلية المبدئي", text: "كل شروط موسم 1448 مع حاسبة التكاليف، وفحص أهلية سريع لا يحفظ أي بيانات." },
  { route: "/results", title: "نتائج القبول العامة", text: "القوائم العامة والبحث بالرقم الوطني، دون كشف أي معلومة شخصية." },
  { route: "/", title: "اختر رحلتك التجريبية", text: "جرّب المنصة من وجهة نظر أحد أطرافها الثلاثة." },
];

const DEMO_PILGRIM = "01012345412";

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const tourSeen = useStore((s) => s.tourSeen);
  const accounts = useStore((s) => s.accounts);
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [nudge, setNudge] = useState(false);

  const step = index === null ? null : STEPS[index];
  const onRoute = !!step && pathname === step.route;

  // First-visit nudge on the home page
  useEffect(() => {
    if (!hydrated || tourSeen || pathname !== "/") return;
    const t = setTimeout(() => setNudge(true), 4500);
    return () => clearTimeout(t);
  }, [hydrated, tourSeen, pathname]);

  const measure = useCallback(() => {
    if (!step?.selector) return setRect(null);
    const el = document.querySelector(step.selector);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Navigate to the step's page, then spotlight its target
  useEffect(() => {
    if (!step) return;
    if (!onRoute) {
      router.push(step.route);
      return;
    }
    const el = step.selector ? document.querySelector(step.selector) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    // The header collapses while scrolling, which can cancel smooth scroll — correct instantly if needed
    const fix = setTimeout(() => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.4) el.scrollIntoView({ behavior: "instant", block: "start" });
    }, 700);
    const t = setTimeout(measure, 900);
    return () => {
      clearTimeout(fix);
      clearTimeout(t);
    };
  }, [step, onRoute, router, measure]);

  useLayoutEffect(() => {
    if (!step?.selector) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step, measure]);

  const start = () => {
    setNudge(false);
    setRect(null);
    setIndex(0);
  };
  const close = () => {
    setIndex(null);
    setRect(null);
    setNudge(false);
    actions.markTourSeen();
  };
  const go = (i: number) => {
    setRect(null);
    setIndex(i);
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
  const pad = 10;

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {index === null && !pathname.startsWith("/staff") && (
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
                  جديد هنا؟ خذ جولة سريعة ✨
                </motion.button>
              )}
            </AnimatePresence>
            <button
              onClick={start}
              aria-label="جولة تعريفية"
              className={cn("grid size-13 place-items-center rounded-full bg-gold text-ink shadow-xl shadow-gold-dark/30 transition hover:scale-105", nudge && "animate-pulse-ring")}
            >
              <Compass className="size-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step && (
          <motion.div key="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85]" aria-live="polite">
            {/* Dim + spotlight */}
            {rect && onRoute ? (
              <motion.div
                className="pointer-events-none absolute rounded-3xl ring-4 ring-gold"
                initial={false}
                animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: Math.min(rect.height + pad * 2, window.innerHeight * 0.7) }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                style={{ boxShadow: "0 0 0 9999px rgba(2,21,38,.62)" }}
              />
            ) : (
              <div className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]" />
            )}

            {/* Card */}
            <motion.div
              key={index}
              role="dialog"
              aria-label={step.title}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="absolute inset-x-3 bottom-4 mx-auto max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-gold/40 md:bottom-8"
            >
              <div className="h-1.5 bg-sand">
                <motion.div className="h-full bg-gradient-to-l from-green-light to-green-dark" animate={{ width: `${((index! + 1) / STEPS.length) * 100}%` }} />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold text-gold-dark">
                    {index! + 1} من {STEPS.length}
                  </p>
                  <button onClick={close} className="rounded-full p-1 text-hint hover:bg-sand hover:text-ink" aria-label="إنهاء الجولة">
                    <X className="size-5" />
                  </button>
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-green-dark">{step.title}</h2>
                <p className="mt-2 leading-8 text-ink-soft">{step.text}</p>

                {last ? (
                  <div className="mt-5 grid gap-2">
                    <button onClick={startPilgrim} className="flex items-center gap-3 rounded-2xl bg-green-dark p-4 text-right text-white transition hover:bg-green">
                      <UserRound className="size-6 text-gold" />
                      <span>
                        <span className="block font-bold">الحاج: عائلة محمد الخطيب</span>
                        <span className="text-sm text-white/70">من التقديم حتى القبول والرحلة</span>
                      </span>
                    </button>
                    <button onClick={() => { close(); router.push("/administrator"); }} className="flex items-center gap-3 rounded-2xl bg-maroon p-4 text-right text-white transition hover:bg-maroon-dark">
                      <Briefcase className="size-6 text-gold" />
                      <span>
                        <span className="block font-bold">الإداري: أحمد سليمان الحمصي</span>
                        <span className="text-sm text-white/70">الامتحان، تشكيل المجموعة، طلبات الانتساب</span>
                      </span>
                    </button>
                    <button onClick={() => { close(); router.push("/staff"); }} className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-right text-white transition hover:bg-ink/90">
                      <Landmark className="size-6 text-gold" />
                      <span>
                        <span className="block font-bold">الموظف: غرفة العمليات والتسجيل</span>
                        <span className="text-sm text-white/70">المراجعة، القرعة، إعدادات الموسم، سجل الأحداث</span>
                      </span>
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <SpeakButton text={`${step.title}. ${step.text}`} />
                  <div className="flex gap-2">
                    {index! > 0 && (
                      <button onClick={() => go(index! - 1)} className="flex items-center gap-1 rounded-2xl px-4 py-2.5 font-bold text-green-dark hover:bg-sand">
                        <ArrowRight className="size-4" /> السابق
                      </button>
                    )}
                    {!last && (
                      <button onClick={() => go(index! + 1)} className="flex items-center gap-1 rounded-2xl bg-green-dark px-5 py-2.5 font-bold text-white hover:bg-green">
                        التالي <ArrowLeft className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
