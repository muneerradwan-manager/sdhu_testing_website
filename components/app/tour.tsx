"use client";

import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Compass, Landmark, Loader2, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SpeakButton } from "@/components/ui/widgets";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn, samePath } from "@/lib/utils";

/**
 * Guided tour (جولة تعريفية) — an onboarding walkthrough, not a page of its own.
 * Each step opens a page, spotlights one real element and anchors the card beside it;
 * on small or short screens the card becomes a bottom sheet. The last step offers the demo journeys.
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
const PAD = 10; // breathing room around the spotlight
const GAP = 16; // distance between spotlight and card
const CARD_W = 380;
const EDGE = 12;

type Box = { top: number; left: number; width: number; height: number };
type Place = { mode: "sheet" } | { mode: "anchor"; top: number; left: number };

/**
 * The display-size control zooms the whole page. Rects and the viewport come back in screen pixels,
 * while fixed-position styles are laid out in zoomed pixels — divide by the zoom to line them up.
 */
const zoom = () => parseFloat(document.documentElement.style.zoom) || 1;
const headerHeight = () => (document.querySelector("header")?.getBoundingClientRect().height ?? 84 * zoom()) / zoom();

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const tourSeen = useStore((s) => s.tourSeen);
  const accounts = useStore((s) => s.accounts);
  const [index, setIndex] = useState<number | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [place, setPlace] = useState<Place>({ mode: "sheet" });
  const [settled, setSettled] = useState(false);
  const [shortScreen, setShortScreen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = index === null ? null : STEPS[index];
  const onRoute = !!step && samePath(pathname, step.route);

  // First-visit nudge on the home page
  useEffect(() => {
    if (!hydrated || tourSeen || !samePath(pathname, "/")) return;
    const t = setTimeout(() => setNudge(true), 4500);
    return () => clearTimeout(t);
  }, [hydrated, tourSeen, pathname]);

  /** Spotlight the step's target and put the card wherever there is room for it */
  const measure = useCallback(() => {
    const z = zoom();
    const vw = window.innerWidth / z;
    const vh = window.innerHeight / z;
    const header = headerHeight();
    const cardH = (cardRef.current?.getBoundingClientRect().height ?? 240 * z) / z;
    const smallScreen = vw < 760 || vh < 460;
    setShortScreen(vh < 520);

    const host = step?.selector ? document.querySelector(step.selector) : null;
    const el = host?.querySelector("[data-tour-target]") ?? host;
    if (!el) {
      setBox(null);
      setPlace({ mode: "sheet" });
      return;
    }

    const raw = el.getBoundingClientRect();
    const r = { top: raw.top / z, bottom: raw.bottom / z, left: raw.left / z, right: raw.right / z };
    const spot = {
      top: Math.max(r.top - PAD, header + 4),
      bottom: Math.min(r.bottom + PAD, vh - EDGE),
      left: Math.max(r.left - PAD, EDGE),
      right: Math.min(r.right + PAD, vw - EDGE),
    };
    if (spot.bottom - spot.top < 48 || spot.right - spot.left < 48) {
      setBox(null);
      setPlace({ mode: "sheet" });
      return;
    }

    // Where does the card fit? below → above → beside → bottom sheet
    let next: Place = { mode: "sheet" };
    if (!smallScreen) {
      const centred = Math.min(Math.max(spot.left + (spot.right - spot.left) / 2 - CARD_W / 2, EDGE), vw - CARD_W - EDGE);
      if (vh - spot.bottom >= cardH + GAP + EDGE) next = { mode: "anchor", top: spot.bottom + GAP, left: centred };
      else if (spot.top - header >= cardH + GAP + EDGE) next = { mode: "anchor", top: spot.top - cardH - GAP, left: centred };
      else {
        const middle = Math.min(Math.max(spot.top + (spot.bottom - spot.top) / 2 - cardH / 2, header + EDGE), vh - cardH - EDGE);
        if (vw - spot.right >= CARD_W + GAP + EDGE) next = { mode: "anchor", top: middle, left: spot.right + GAP };
        else if (spot.left >= CARD_W + GAP + EDGE) next = { mode: "anchor", top: middle, left: spot.left - CARD_W - GAP };
      }
    }

    // A bottom sheet covers the lower part of the screen, so keep the spotlight above it
    const bottom = next.mode === "sheet" ? Math.min(spot.bottom, vh - cardH - GAP - EDGE) : spot.bottom;
    if (bottom - spot.top < 48) {
      setBox(null);
      setPlace({ mode: "sheet" });
      return;
    }
    setBox({ top: spot.top, left: spot.left, width: spot.right - spot.left, height: bottom - spot.top });
    setPlace(next);
  }, [step]);

  // Open the step's page (one navigation), then bring the target into view
  useEffect(() => {
    if (!step) return;
    if (!onRoute) {
      router.push(step.route, { scroll: false });
      return;
    }
    const scrollToTarget = () => {
      const header = headerHeight();
      const host = step.selector ? document.querySelector(step.selector) : null;
      const el = host?.querySelector("[data-tour-target]") ?? host;
      if (!el) {
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      const r = el.getBoundingClientRect();
      const room = window.innerHeight - header;
      // Centre the target when it fits, otherwise align it just under the header
      const offset = r.height < room * 0.8 ? header + (room - r.height) / 2 : header + 16;
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - offset), behavior: "instant" });
    };
    const t1 = setTimeout(scrollToTarget, 350);
    const t2 = setTimeout(() => {
      scrollToTarget();
      measure();
      setSettled(true);
    }, 750);
    const t3 = setTimeout(measure, 1150); // once the card has its real height
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [step, onRoute, router, measure]);

  useLayoutEffect(() => {
    if (!step || !settled) return;
    // Re-measure once the card is in the DOM (its real height decides the placement)
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
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
  const anchored = place.mode === "anchor";

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
          {/* Spotlight: dims only around the highlighted element, no blur */}
          <AnimatePresence>
            {settled && box ? (
              <motion.div
                key="spot"
                className="absolute rounded-3xl ring-4 ring-gold"
                initial={{ opacity: 0, ...box }}
                animate={{ opacity: 1, ...box }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }}
                style={{ boxShadow: "0 0 0 9999px rgba(2,21,38,.5)" }}
              />
            ) : settled ? (
              <motion.div key="dim" className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            ) : null}
          </AnimatePresence>

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

          {/* Card: anchored beside the spotlight on roomy screens, a bottom sheet otherwise */}
          <AnimatePresence mode="wait">
            {settled && (
              <motion.div
                key={index}
                ref={cardRef}
                role="dialog"
                data-tour-card
                aria-label={step.title}
                initial={{ opacity: 0, y: anchored ? 12 : 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", damping: 26, stiffness: 300 }}
                style={anchored ? { top: place.top, left: place.left, width: CARD_W } : shortScreen ? { maxHeight: "46vh" } : undefined}
                className={cn(
                  "pointer-events-auto absolute overflow-y-auto overscroll-contain rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-gold/40",
                  anchored ? "max-h-[70vh]" : "inset-x-3 bottom-3 mx-auto max-h-[60vh] max-w-lg sm:max-h-[70vh]",
                )}
              >
                <div className="sticky top-0 h-1.5 bg-sand">
                  <motion.div className="h-full bg-gradient-to-l from-green-light to-green-dark" initial={false} animate={{ width: `${((index! + 1) / STEPS.length) * 100}%` }} />
                </div>
                <div className="p-3.5 sm:p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-bold text-gold-dark">
                      جولة تعريفية — {index! + 1} من {STEPS.length}
                    </p>
                    <button onClick={close} className="rounded-full p-1 text-hint hover:bg-sand hover:text-ink" aria-label="إنهاء الجولة">
                      <X className="size-5" />
                    </button>
                  </div>
                  <h2 className="mt-1 font-display text-lg font-bold text-green-dark sm:text-xl md:text-2xl">{step.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-ink-soft sm:text-base sm:leading-8">{step.text}</p>

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

                  <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-2 bg-white pt-2">
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
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
