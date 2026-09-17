"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  CircleCheck,
  Dices,
  EyeOff,
  Hourglass,
  LoaderCircle,
  Lock,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Shuffle,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { searchResult, type SearchResult, RESULTS_SUMMARY } from "@/lib/data/public-results";
import { isValidNationalId } from "@/lib/registry";
import { useHydrated } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { CaptchaImage, makeCaptcha } from "./captcha";

const MAX_SEARCHES = 5;
const WINDOW_MS = 60_000;

/** Per-tab random seed — computed only in the browser, never during prerender */
const SESSION_SEED = typeof window === "undefined" ? "server" : Math.random().toString(36).slice(2);

const DEMO_IDS = [
  { id: "01012345412", label: "محمد الخطيب" },
  { id: "01011100208", label: "ياسين العمر" },
  { id: "01012340078", label: "خديجة الخطيب" },
];

const STEPS = ["التحقق من رمز التحقق", "البحث في القوائم المعتمدة والمنشورة", "تجهيز النتيجة المسموح بعرضها"];

type Phase = "idle" | "searching" | "done";
type FieldError = { field: "id" | "captcha" | "limit"; msg: string; key: number };

export function ResultSearch() {
  const hydrated = useHydrated();
  const [nationalId, setNationalId] = useState("");
  const [answer, setAnswer] = useState("");
  const [nonce, setNonce] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchedId, setSearchedId] = useState("");
  const [error, setError] = useState<FieldError | null>(null);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [now, setNow] = useState(0);
  const [spin, setSpin] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  const captcha = useMemo(() => makeCaptcha(`${SESSION_SEED}-${nonce}`), [nonce]);

  // Clear pending timers on unmount
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // Tick while there are attempts inside the rate-limit window
  const hasAttempts = attempts.length > 0;
  useEffect(() => {
    if (!hasAttempts) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      setAttempts((a) => {
        const kept = a.filter((x) => n - x < WINDOW_MS);
        return kept.length === a.length ? a : kept;
      });
    }, 500);
    return () => clearInterval(t);
  }, [hasAttempts]);

  const recent = attempts.filter((t) => now - t < WINDOW_MS);
  const remaining = Math.max(0, MAX_SEARCHES - recent.length);
  const cooldown = remaining === 0 && recent.length ? Math.max(0, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)) : 0;
  const locked = cooldown > 0;

  function refreshCaptcha() {
    setNonce((n) => n + 1);
    setAnswer("");
    setSpin((s) => s + 1);
  }

  async function celebrate() {
    const confetti = (await import("canvas-confetti")).default;
    const rect = stageRef.current?.getBoundingClientRect();
    const origin = rect
      ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: Math.min(0.9, Math.max(0.1, (rect.top + rect.height * 0.3) / window.innerHeight)) }
      : { x: 0.5, y: 0.5 };
    const colors = ["#D9C89E", "#AD9E6E", "#E4DDD3", "#FFF6DC", "#289E92"];
    const base = { colors, disableForReducedMotion: true, ticks: 220, scalar: 0.85, gravity: 0.9 };
    confetti({ ...base, particleCount: 70, spread: 80, startVelocity: 30, origin });
    setTimeout(() => confetti({ ...base, particleCount: 35, angle: 60, spread: 50, startVelocity: 38, origin: { x: origin.x - 0.12, y: origin.y + 0.1 } }), 220);
    setTimeout(() => confetti({ ...base, particleCount: 35, angle: 120, spread: 50, startVelocity: 38, origin: { x: origin.x + 0.12, y: origin.y + 0.1 } }), 380);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (phase === "searching") return;
    const n = Date.now();
    const inWindow = attempts.filter((t) => n - t < WINDOW_MS);
    setNow(n);

    if (inWindow.length >= MAX_SEARCHES) {
      setError({ field: "limit", msg: "بلغت الحد الأقصى لمحاولات البحث. انتظر قليلاً ثم أعد المحاولة.", key: n });
      return;
    }
    if (!isValidNationalId(nationalId)) {
      setError({ field: "id", msg: "أدخل الرقم الوطني كاملاً: 11 رقماً دون فراغات.", key: n });
      return;
    }
    if (!answer.trim()) {
      setError({ field: "captcha", msg: "اكتب الحروف والأرقام الظاهرة في الصورة.", key: n });
      return;
    }

    // Every real attempt counts toward the limit, including a wrong captcha
    setAttempts([...inWindow, n]);

    if (answer.trim().toUpperCase() !== captcha.text) {
      setError({ field: "captcha", msg: "رمز التحقق غير صحيح. أنشأنا لك رمزاً جديداً.", key: n });
      refreshCaptcha();
      return;
    }

    setError(null);
    setSearchedId(nationalId);
    setResult(null);
    setStep(0);
    setPhase("searching");
    const res = searchResult(nationalId);
    timers.current.push(
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => {
        setResult(res);
        setPhase("done");
        refreshCaptcha();
        if (res.found && res.outcome !== "reserve") void celebrate();
      }, 2400),
    );
  }

  function reset() {
    setPhase("idle");
    setResult(null);
    setNationalId("");
  }

  return (
    <div className="grid overflow-hidden rounded-[2rem] border border-gold/40 bg-white shadow-[0_40px_80px_-50px_rgba(0,89,79,.6)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ── Form ── */}
      <form onSubmit={submit} noValidate className="relative overflow-hidden bg-green-dark p-6 text-white sm:p-8 md:p-10">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="absolute -bottom-24 -right-24 size-72 rounded-full bg-green-light/30 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold">
            <Lock className="size-3.5" /> بحث آمن دون تسجيل دخول
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">ابحث عن نتيجتك</h2>
          <p className="mt-2 text-sm leading-7 text-white/70">أدخل الرقم الوطني كاملاً، ثم اكتب رمز التحقق. لا تظهر إلا المعلومات المسموح بنشرها.</p>

          {/* National id */}
          <label htmlFor="nid" className="mt-7 block text-sm font-semibold text-white/90">
            الرقم الوطني
          </label>
          <motion.div
            key={error?.field === "id" ? error.key : "id"}
            animate={error?.field === "id" ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
            transition={{ duration: 0.45 }}
          >
            <input
              id="nid"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              maxLength={11}
              value={nationalId}
              onChange={(e) => {
                setNationalId(e.target.value.replace(/\D/g, "").slice(0, 11));
                if (error?.field === "id") setError(null);
              }}
              placeholder="01012345412"
              aria-invalid={error?.field === "id"}
              aria-describedby="nid-help"
              className={cn(
                "mt-2 h-14 w-full rounded-2xl border bg-white/10 px-4 text-center font-mono text-2xl tracking-[.3em] text-white placeholder:text-white/25 outline-none transition focus:bg-white/15 focus:ring-4",
                error?.field === "id" ? "border-red-300 ring-red-300/30" : "border-white/20 focus:border-gold focus:ring-gold/25",
              )}
            />
          </motion.div>
          <div id="nid-help" className="mt-2 flex items-center gap-1" dir="ltr" aria-hidden>
            {Array.from({ length: 11 }, (_, i) => (
              <motion.span
                key={i}
                className="h-1 flex-1 rounded-full"
                animate={{ backgroundColor: i < nationalId.length ? "#D9C89E" : "rgba(255,255,255,.15)", scaleY: i === nationalId.length - 1 ? 1.8 : 1 }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/55">أرقام تجريبية:</span>
            {DEMO_IDS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setNationalId(d.id)}
                className="rounded-full bg-white/10 px-2.5 py-1 transition hover:bg-gold hover:text-ink"
              >
                {d.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setNationalId(`0${Math.floor(Math.random() * 1e10).toString().padStart(10, "0")}`)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 transition hover:bg-gold hover:text-ink"
            >
              <Shuffle className="size-3" /> رقم عشوائي
            </button>
          </div>

          {/* Captcha */}
          <label htmlFor="captcha" className="mt-7 block text-sm font-semibold text-white/90">
            رمز التحقق
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="relative h-16 w-44 shrink-0 overflow-hidden rounded-2xl ring-2 ring-gold/40 sm:w-48">
              {hydrated ? (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={nonce}
                    className="absolute inset-0"
                    initial={{ opacity: 0, filter: "blur(8px)", scale: 1.1 }}
                    animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                    exit={{ opacity: 0, filter: "blur(8px)", scale: 0.9 }}
                    transition={{ duration: 0.35 }}
                  >
                    <CaptchaImage captcha={captcha} />
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="skeleton size-full" />
              )}
            </div>
            <motion.button
              type="button"
              onClick={refreshCaptcha}
              aria-label="رمز تحقق جديد"
              className="flex w-12 items-center justify-center rounded-2xl bg-white/10 transition hover:bg-white/20"
              whileTap={{ scale: 0.9 }}
            >
              <motion.span animate={{ rotate: spin * 360 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
                <RefreshCw className="size-5 text-gold" />
              </motion.span>
            </motion.button>
            <motion.div
              className="min-w-0 flex-1"
              key={error?.field === "captcha" ? error.key : "cap"}
              animate={error?.field === "captcha" ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
              transition={{ duration: 0.45 }}
            >
              <input
                id="captcha"
                dir="ltr"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={5}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5));
                  if (error?.field === "captcha") setError(null);
                }}
                placeholder="•••••"
                aria-invalid={error?.field === "captcha"}
                className={cn(
                  "h-16 w-full rounded-2xl border bg-white/10 px-3 text-center font-mono text-xl tracking-[.25em] uppercase text-white placeholder:text-white/30 outline-none transition focus:bg-white/15 focus:ring-4",
                  error?.field === "captcha" ? "border-red-300 ring-red-300/30" : "border-white/20 focus:border-gold focus:ring-gold/25",
                )}
              />
            </motion.div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                key={error.key}
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <span className="mt-4 flex items-start gap-2 rounded-xl bg-maroon/60 px-3 py-2 text-sm leading-6 ring-1 ring-white/10">
                  <span className="mt-1 size-1.5 shrink-0 rotate-45 bg-gold" />
                  {error.msg}
                </span>
              </motion.p>
            )}
          </AnimatePresence>

          {/* Rate limit */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/25 px-4 py-3 text-xs ring-1 ring-white/10">
            <div className="flex items-center gap-2">
              <span className="text-white/70">محاولات البحث المتبقية هذه الدقيقة:</span>
              <span className="flex gap-1" aria-label={`${remaining} من ${MAX_SEARCHES}`}>
                {Array.from({ length: MAX_SEARCHES }, (_, i) => (
                  <motion.span
                    key={i}
                    className="size-2.5 rounded-full"
                    animate={{ backgroundColor: i < remaining ? "#D9C89E" : "rgba(255,255,255,.18)", scale: i < remaining ? 1 : 0.75 }}
                  />
                ))}
              </span>
              <span className="font-bold tabular-nums text-gold">{remaining}</span>
            </div>
            <AnimatePresence>
              {locked && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 rounded-full bg-maroon px-3 py-1 font-bold"
                >
                  <CooldownRing seconds={cooldown} />
                  انتظر {cooldown} ثانية
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="submit"
            disabled={phase === "searching" || locked}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.97 }}
            className="group relative mt-6 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gold text-lg font-bold text-ink shadow-[0_16px_40px_-18px_rgba(217,200,158,.9)] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/60 to-transparent transition duration-700 group-hover:translate-x-full" />
            {phase === "searching" ? <LoaderCircle className="size-5 animate-spin" /> : locked ? <Timer className="size-5" /> : <Search className="size-5" />}
            <span className="relative">{phase === "searching" ? "جارٍ البحث…" : locked ? "البحث متوقف مؤقتاً" : "اعرض النتيجة"}</span>
          </motion.button>
          <p className="mt-3 text-center text-[11px] text-white/50">حماية من البحث الآلي: رمز تحقق + {MAX_SEARCHES} محاولات في الدقيقة كحد أقصى</p>
        </div>
      </form>

      {/* ── Stage ── */}
      <div ref={stageRef} className="bg-pattern-dark relative flex min-h-[520px] items-center justify-center bg-sand/60 p-6 sm:p-10" aria-live="polite">
        <AnimatePresence mode="wait">
          {phase === "idle" && <IdleStage key="idle" />}
          {phase === "searching" && <SearchingStage key="searching" step={step} id={searchedId} />}
          {phase === "done" && result && (result.found ? <ResultCard key="found" result={result} onReset={reset} /> : <NotFound key="none" onReset={reset} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CooldownRing({ seconds }: { seconds: number }) {
  const C = 2 * Math.PI * 8;
  return (
    <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5" />
      <motion.circle
        cx="10"
        cy="10"
        r="8"
        fill="none"
        stroke="#D9C89E"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={C}
        animate={{ strokeDashoffset: C * (1 - seconds / 60) }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
}

const fade = {
  initial: { opacity: 0, y: 20, scale: 0.97, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -16, scale: 0.97, filter: "blur(6px)" },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

function IdleStage() {
  return (
    <motion.div {...fade} className="w-full max-w-md text-center">
      <div className="relative mx-auto flex size-28 items-center justify-center">
        <span className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-gold-dark/40" />
        <span className="absolute inset-3 rounded-full bg-white shadow-lg" />
        <ShieldCheck className="relative size-12 animate-float text-green-dark" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-bold text-green-dark">نتيجتك تظهر هنا</h3>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        النتائج معتمدة ومنشورة منذ {RESULTS_SUMMARY.lastUpdate}. نحترم خصوصيتك، فلا نعرض إلا ما يسمح به النظام.
      </p>
      <div className="mt-6 grid gap-3 text-start sm:grid-cols-2">
        <div className="rounded-2xl border border-green-light/25 bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-green">
            <CircleCheck className="size-4" /> ما يظهر
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {["الاسم", "النتيجة", "ترتيب الاحتياط", "الحملة", "المحافظة"].map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-maroon/15 bg-white p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-maroon">
            <EyeOff className="size-4" /> لا يظهر أبداً
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {["الهاتف", "العنوان", "العمر", "سبب عدم القبول", "أفراد العائلة"].map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

function SearchingStage({ step, id }: { step: number; id: string }) {
  return (
    <motion.div {...fade} className="flex w-full max-w-sm flex-col items-center text-center">
      <div className="relative flex size-52 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-green-light/50"
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.66, ease: "easeOut" }}
          />
        ))}
        <span className="absolute inset-6 rounded-full border border-gold-dark/30" />
        <span className="absolute inset-14 rounded-full border border-gold-dark/30" />
        <motion.span
          className="absolute inset-2 rounded-full"
          style={{ background: "conic-gradient(from 0deg, rgba(40,158,146,.55), transparent 30%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
        {[
          [18, 30],
          [70, 22],
          [64, 74],
          [26, 68],
        ].map(([x, y], i) => (
          <motion.span
            key={i}
            className="absolute size-2 rounded-full bg-gold-dark"
            style={{ left: `${x}%`, top: `${y}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.4, 0.5] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}
        <span className="relative flex size-20 items-center justify-center rounded-full bg-green-dark text-white shadow-2xl">
          <Search className="size-9" />
        </span>
      </div>
      <p className="mt-6 font-mono text-2xl tracking-widest text-green-dark" dir="ltr">
        {maskNationalId(id)}
      </p>
      <ul className="mt-6 w-full space-y-2 text-start">
        {STEPS.map((s, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: i <= step ? 1 : 0.35, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn("flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm shadow-sm", active && "ring-1 ring-green-light/40")}
            >
              <span className="flex size-6 items-center justify-center">
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <CircleCheck className="size-5 text-green-light" />
                  </motion.span>
                ) : active ? (
                  <LoaderCircle className="size-5 animate-spin text-gold-dark" />
                ) : (
                  <span className="size-2 rounded-full bg-gold" />
                )}
              </span>
              <span className={cn("font-medium", done ? "text-green" : "text-ink")}>{s}</span>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function ResultCard({ result, onReset }: { result: Extract<SearchResult, { found: true }>; onReset: () => void }) {
  const accepted = result.outcome !== "reserve";
  const Icon = result.outcome === "direct" ? BadgeCheck : result.outcome === "lottery" ? Dices : Hourglass;
  const rows = [
    { k: "النتيجة", v: result.label },
    ...(result.rank ? [{ k: "ترتيب الاحتياط", v: result.rank.toLocaleString("en-US") }] : []),
    { k: "الحملة", v: result.campaign },
    { k: "المحافظة", v: result.governorate },
  ];

  return (
    <motion.div {...fade} className="w-full max-w-md">
      <div className={cn("relative overflow-hidden rounded-3xl bg-white shadow-[0_30px_60px_-30px_rgba(0,89,79,.55)] ring-1", accepted ? "ring-green-light/30" : "ring-gold-dark/40")}>
        <div className={cn("relative overflow-hidden px-6 pb-14 pt-7 text-white", accepted ? "bg-gradient-to-br from-green-dark to-green" : "bg-gradient-to-br from-maroon-dark to-maroon")}>
          <div className="bg-pattern absolute inset-0 opacity-20" />
          <motion.div
            className="absolute -left-10 top-0 h-full w-24 rotate-12 bg-white/15 blur-xl"
            initial={{ x: -120 }}
            animate={{ x: 520 }}
            transition={{ duration: 1.6, delay: 0.4, ease: "easeInOut" }}
          />
          <p className="relative text-sm font-semibold text-gold">{accepted ? "مبارك! تقبّل الله منكم" : "أنت ضمن قائمة الاحتياط"}</p>
          <p className="relative mt-1 font-display text-3xl font-bold leading-tight">{result.name}</p>
        </div>
        <motion.div
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.25 }}
          className={cn(
            "absolute left-6 top-[6.2rem] flex size-20 items-center justify-center rounded-full border-4 border-white shadow-xl",
            accepted ? "bg-gold text-green-dark" : "bg-gold-light text-maroon",
          )}
        >
          <Icon className="size-9" />
        </motion.div>

        <dl className="space-y-1 px-6 pb-6 pt-8">
          {rows.map((r, i) => (
            <motion.div
              key={r.k}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center justify-between gap-4 border-b border-dashed border-gold/60 py-3 last:border-0"
            >
              <dt className="text-sm text-ink-soft">{r.k}</dt>
              <dd className={cn("text-end font-bold", r.k === "النتيجة" ? (accepted ? "text-green" : "text-maroon") : "text-ink")}>{r.v}</dd>
            </motion.div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-sand px-6 py-3 text-xs text-ink-soft">
          <span>آخر تحديث: {RESULTS_SUMMARY.lastUpdate}</span>
          <button onClick={onReset} className="font-bold text-green-dark hover:underline">
            بحث جديد
          </button>
        </div>
      </div>
      <p className="mt-4 text-center text-xs leading-6 text-ink-soft">
        {accepted
          ? "الخطوات المطلوبة ومهل التأكيد تظهر في حسابك بعد تسجيل الدخول."
          : "ستُبلَّغ عند توفر مقعد أو عند إعلان أعمار جديدة مقبولة."}
      </p>
    </motion.div>
  );
}

function NotFound({ onReset }: { onReset: () => void }) {
  return (
    <motion.div {...fade} className="w-full max-w-md text-center">
      <motion.div
        initial={{ rotate: -10, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
        className="mx-auto flex size-24 items-center justify-center rounded-full bg-white text-ink-soft shadow-lg ring-1 ring-gold/50"
      >
        <SearchX className="size-10" />
      </motion.div>
      <p className="mt-6 rounded-3xl bg-white px-6 py-6 font-display text-xl leading-9 font-bold text-ink shadow-sm ring-1 ring-gold/40">
        لم يرد هذا الرقم ضمن المقبولين أو الاحتياط
      </p>
      <button onClick={onReset} className="mt-5 text-sm font-bold text-green-dark hover:underline">
        بحث جديد
      </button>
    </motion.div>
  );
}
