"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Emblem } from "@/components/brand/logo";
import { dayTimeLabel } from "@/lib/operations";
import { useScrollLock } from "@/lib/scroll-lock";
import { useHydrated, type AdminProfile, type Attempt, type HallRun } from "@/lib/store";
import { asset, cn } from "@/lib/utils";
import { useAdminRows } from "@/app/staff/_components/data";
import { STAGE_LABEL, isOpen, openWindow, runKey, scheduledAt, stageOf, statusOf, targets, useDemoNow, useHalls, type ExamCenter, type ExamDef, type Halls, type HallStage } from "@/app/administrator/_lib/halls";

/**
 * A hall's display screen (the platform's «/d/N»), on the projector or the screen at the front of the hall. Before
 * the test it shows the entry link's QR large — the applicants scan it and type their national id — and while the
 * test runs the QR goes small in a corner, the test's instructions take the screen with the time left and how many
 * are present, answering and done. Every size follows the screen itself (container units), so the same screen
 * fills a projector and fits a card on the page of every hall's screen.
 */

/** A sitting that ended stays on its hall's screen this long */
const ENDED_FOR = 30 * 60_000;

const noSubscribe = () => () => {};
function useOrigin() {
  return useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
}

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** «09:41» — hours only when there are some */
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return h ? `${h}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

const hhmm = (ts: number) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(ts);

type Shown = { exam: ExamDef; key: string; run: HallRun | undefined; stage: HallStage };

/** What a hall's screen shows: the sitting under way (running before open), else one that just ended, else today's next one */
function onScreen(halls: Halls, center: ExamCenter, demoNow: number, now: number): { shown?: Shown; next?: ExamDef } {
  const all = halls.exams
    .filter((e) => targets(e, center.id))
    .map((exam) => {
      const key = runKey(exam.id, center.id);
      const run = halls.runs[key];
      return { exam, key, run, stage: stageOf(run) };
    });
  const live = all.find((s) => s.stage === "running") ?? all.find((s) => s.stage === "open");
  const ended = all
    .filter((s) => s.stage === "closed" && now - (s.run?.closedAt ?? s.run?.endedAt ?? 0) < ENDED_FOR)
    .sort((a, b) => (b.run?.closedAt ?? 0) - (a.run?.closedAt ?? 0))[0];
  const waiting = all.filter((s) => s.stage === "idle" && isOpen(s.exam)).sort((a, b) => (scheduledAt(a.exam) ?? Number.MAX_SAFE_INTEGER) - (scheduledAt(b.exam) ?? Number.MAX_SAFE_INTEGER));
  const today = waiting.find((s) => ["today", "now"].includes(openWindow(scheduledAt(s.exam), demoNow)));
  const next = waiting.find((s) => openWindow(scheduledAt(s.exam), demoNow) === "upcoming")?.exam;
  return { shown: live ?? ended ?? today, next };
}

/** Every attempt sat in a sitting (the administrators as the staff see them, the season's seeded ones too) */
function attemptsAt(profiles: AdminProfile[], key: string) {
  return profiles.flatMap((p) => [p.exam, ...Object.values(p.exams ?? {})].filter((a): a is Attempt => a?.hall === key));
}

/** The alarm when the time is up: three tones */
function ring(ctx: AudioContext, times = 3) {
  const t0 = ctx.currentTime;
  for (let i = 0; i < times; i++) {
    const at = t0 + i * 0.6;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.5);
  }
}

/** One hall's screen, filling its box: the projector's whole screen, or a card */
function Screen({ n, full = false, armed = false, onTimeUp, onFull }: { n: number; full?: boolean; armed?: boolean; onTimeUp?: (key: string) => void; onFull?: () => void }) {
  const halls = useHalls();
  const rows = useAdminRows();
  const demoNow = useDemoNow();
  const now = useTick(1000);
  const origin = useOrigin();
  const center = halls.centerByDisplay(n);
  const { shown, next } = center ? onScreen(halls, center, demoNow, now) : {};
  const entry = `${origin}${asset("/administrator/exam")}`;
  const run = shown?.run;
  const attempts = shown ? attemptsAt(rows.map((r) => r.profile), shown.key) : [];
  const counts = {
    present: Object.keys(run?.present ?? {}).length,
    testing: attempts.filter((a) => statusOf(a) === "active").length,
    done: attempts.filter((a) => a.submittedAt && statusOf(a) !== "voided").length,
  };
  const left = shown?.stage === "running" && run?.startedAt ? run.startedAt + shown.exam.minutes * 60_000 - now : undefined;
  const timeUp = left !== undefined && left <= 0 ? `${shown!.key}:${run!.startedAt}` : "";

  useEffect(() => {
    if (timeUp) onTimeUp?.(timeUp);
  });

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#002a25] text-white [container-type:size]" dir="rtl">
      <div className="bg-pattern pointer-events-none absolute inset-0 opacity-[.06]" aria-hidden />
      <div className="pointer-events-none absolute -right-[20cqmin] -top-[20cqmin] size-[70cqmin] rounded-full bg-green-light/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-[25cqmin] -left-[15cqmin] size-[60cqmin] rounded-full bg-gold/10 blur-3xl" aria-hidden />

      <header className="relative flex items-center gap-[2.4cqmin] border-b border-gold/25 px-[4cqmin] py-[2.4cqmin]">
        <Emblem className="size-[8cqmin] shrink-0" gradientId={`display-emblem-${n}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[2.2cqmin] font-bold text-gold">المنصة الوطنية للحج — شاشة القاعة {n}</p>
          <p className="truncate font-display text-[3.6cqmin] font-bold leading-tight">{center ? `${center.name} — ${center.hall}` : "قاعة غير معروفة"}</p>
        </div>
        <p className="font-mono text-[4.4cqmin] font-bold tabular-nums text-white/90" dir="ltr">
          {hhmm(now)}
        </p>
        {full && onFull && (
          <button type="button" onClick={onFull} className="grid size-[6.4cqmin] shrink-0 place-items-center rounded-[1.4cqmin] bg-white/10 text-[3.6cqmin] leading-none text-white/80 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white" aria-label="ملء الشاشة" title="ملء الشاشة">
            ⛶
          </button>
        )}
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col px-[4cqmin] py-[3cqmin]">
        {!center ? (
          <Centered>
            <p className="font-display text-[6cqmin] font-bold">لا توجد قاعة برقم الشاشة {n}.</p>
            <p className="mt-[2cqmin] text-[2.8cqmin] text-white/70">رقم شاشة كل قاعة في «القاعات والمحافظات».</p>
          </Centered>
        ) : !shown ? (
          <Centered>
            <p className="font-display text-[6cqmin] font-bold leading-snug text-balance">لا يوجد اختبار مجدول حالياً في هذه القاعة.</p>
            {next && (
              <p className="mt-[3cqmin] text-[3cqmin] text-white/75">
                الجلسة القادمة: {next.name} — {dayTimeLabel(next.day, next.time) || `${next.date} ${next.time}`}
              </p>
            )}
          </Centered>
        ) : shown.stage === "closed" ? (
          <Centered>
            <Pill tone="muted">{STAGE_LABEL.closed}</Pill>
            <p className="mt-[2cqmin] font-display text-[4.4cqmin] font-bold">{shown.exam.name}</p>
            <p className="mt-[2cqmin] font-display text-[9cqmin] font-bold text-gold">انتهى الاختبار</p>
            <p className="mt-[2cqmin] text-[3cqmin] text-white/80">سلّم {counts.done} — لا يغادر أحد قبل أن يؤكّد المشرف تسليمه.</p>
          </Centered>
        ) : shown.stage === "running" ? (
          <div className="grid min-h-0 flex-1 grid-cols-[1.1fr_1fr] gap-[4cqmin]">
            <div className="flex min-h-0 flex-col">
              <div className="flex flex-wrap items-center gap-[1.6cqmin]">
                <Pill tone="green">{STAGE_LABEL.running}</Pill>
                <span className="text-[2.6cqmin] text-white/70">
                  المدة {shown.exam.minutes} دقيقة — بدأ {run?.startedAt ? hhmm(run.startedAt) : ""}
                </span>
              </div>
              <p className="mt-[1.6cqmin] font-display text-[4.6cqmin] font-bold leading-tight">{shown.exam.name}</p>
              <div className={cn("mt-[3cqmin] rounded-[3cqmin] px-[3cqmin] py-[2cqmin] text-center ring-1", left !== undefined && left <= 0 ? "animate-pulse bg-maroon/70 ring-maroon-light" : left !== undefined && left < 5 * 60_000 ? "bg-maroon/40 ring-maroon-light/60" : "bg-black/25 ring-white/10")}>
                <p className="text-[2.6cqmin] font-bold text-white/75">الوقت المتبقي</p>
                {left !== undefined && left > 0 ? (
                  <p className="font-mono text-[17cqmin] font-bold leading-none tabular-nums text-gold" dir="ltr" role="timer">
                    {clock(left)}
                  </p>
                ) : (
                  <p className="font-display text-[10cqmin] font-bold leading-tight">انتهى الوقت</p>
                )}
                <p className="mt-[1cqmin] text-[2cqmin] text-white/60">من بدء الاختبار — ومن دخل متأخراً يُحتسب وقته من دخوله</p>
              </div>
              <div className="mt-[3cqmin] grid grid-cols-3 gap-[2cqmin]">
                <Count label="حاضرون" value={counts.present} />
                <Count label="يختبرون" value={counts.testing} />
                <Count label="سلّموا" value={counts.done} />
              </div>
            </div>
            <div className="flex min-h-0 flex-col">
              <p className="font-display text-[3.4cqmin] font-bold text-gold">التعليمات</p>
              <ol className="mt-[1.6cqmin] min-h-0 flex-1 space-y-[1.4cqmin] overflow-hidden">
                {shown.exam.instructions
                  .filter((l) => l.trim())
                  .map((line, i) => (
                    <li key={i} className="flex gap-[1.4cqmin] text-[2.8cqmin] leading-snug">
                      <span className="grid size-[4.4cqmin] shrink-0 place-items-center rounded-full bg-gold/20 text-[2.4cqmin] font-bold text-gold ring-1 ring-gold/40">{i + 1}</span>
                      <span>{line}</span>
                    </li>
                  ))}
              </ol>
              <div className="mt-[2cqmin] flex items-end gap-[1.6cqmin] self-end">
                <p className="max-w-[22cqmin] text-[1.9cqmin] leading-snug text-white/70">للدخول: امسح الرمز وادخل رقمك الوطني</p>
                <div className="size-[15cqmin] rounded-[1.6cqmin] bg-white p-[1cqmin]">
                  <QRCodeSVG value={entry || "/administrator/exam"} size={256} level="M" marginSize={0} className="h-full w-full" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto] items-center gap-[5cqmin]">
            <div className="min-w-0">
              <Pill tone={shown.stage === "open" ? "gold" : "muted"}>{STAGE_LABEL[shown.stage]}</Pill>
              <p className="mt-[2cqmin] font-display text-[6cqmin] font-bold leading-tight text-balance">{shown.exam.name}</p>
              <p className="mt-[1.6cqmin] text-[3cqmin] text-white/80">
                {dayTimeLabel(shown.exam.day, shown.exam.time) || `${shown.exam.date} — ${shown.exam.time}`} · المدة {shown.exam.minutes} دقيقة
              </p>
              <ol className="mt-[3cqmin] space-y-[1.4cqmin] text-[2.8cqmin] leading-snug text-white/90">
                <Step n={1}>سجّل حضورك لدى مشرف القاعة بالباركود أو الرقم الوطني.</Step>
                <Step n={2}>امسح الرمز بجهازك وادخل رقمك الوطني.</Step>
                <Step n={3}>ابقَ في مقعدك حتى يطابق المشرف رمز الاقتران الظاهر على شاشتك.</Step>
              </ol>
              {shown.stage === "open" && <p className="mt-[3cqmin] text-[3cqmin] font-bold text-gold">حاضرون: {counts.present}</p>}
            </div>
            <div className="flex flex-col items-center">
              <div className="size-[50cqmin] rounded-[3cqmin] bg-white p-[2.4cqmin] shadow-2xl">
                <QRCodeSVG value={entry || "/administrator/exam"} size={512} level="M" marginSize={0} className="h-full w-full" />
              </div>
              <p className="mt-[2cqmin] font-display text-[3.6cqmin] font-bold">امسح الرمز وادخل رقمك الوطني</p>
              <p className="mt-[0.6cqmin] text-[1.9cqmin] text-white/60" dir="ltr">
                {entry}
              </p>
            </div>
          </div>
        )}
      </main>

      {full && shown && shown.stage !== "closed" && (
        <p className="relative pb-[2cqmin] text-center text-[2.2cqmin] text-white/65">{armed ? "🔔 تنبيه انتهاء الوقت مفعّل" : "🔔 انقر في أي مكان لتفعيل تنبيه انتهاء الوقت"}</p>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="m-auto max-w-[90cqmin] text-center">{children}</div>;
}

function Pill({ tone, children }: { tone: "green" | "gold" | "muted"; children: ReactNode }) {
  const tones = { green: "bg-green-light/30 ring-green-light/60", gold: "bg-gold/25 text-gold ring-gold/50", muted: "bg-white/10 text-white/80 ring-white/20" };
  return <span className={cn("inline-flex items-center rounded-full px-[2cqmin] py-[0.6cqmin] text-[2.4cqmin] font-bold ring-1", tones[tone])}>{children}</span>;
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[2cqmin] bg-white/[.07] px-[2cqmin] py-[1.6cqmin] text-center ring-1 ring-white/10">
      <p className="font-display text-[7cqmin] font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-[0.8cqmin] text-[2.4cqmin] text-white/75">{label}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-[1.4cqmin]">
      <span className="grid size-[4.4cqmin] shrink-0 place-items-center rounded-full bg-gold/20 text-[2.4cqmin] font-bold text-gold ring-1 ring-gold/40">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/** Above the site: the screen alone, the way a projector shows it (rendered on <body>, past the page's entrance animation) */
function Overlay({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const hydrated = useHydrated();
  useScrollLock(hydrated);
  if (!hydrated) return <div className="min-h-[calc(100dvh/var(--zoom))] bg-[#002a25]" />;
  return createPortal(
    <div className={cn("fixed inset-0 z-[65] bg-[#002a25] text-white", className)} onClick={onClick}>
      {children}
    </div>,
    document.body,
  );
}

/** «/exam-display/N»: one hall's screen, full screen, with the end-of-time alarm once a tap has allowed sound */
export function HallDisplay({ n }: { n: number }) {
  const [armed, setArmed] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const rung = useRef("");

  // Browsers let a page play sound only after a tap on it
  const arm = () => {
    if (audio.current) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audio.current = new AC();
    void audio.current.resume();
    ring(audio.current, 1);
    setArmed(true);
  };
  const timeUp = (key: string) => {
    if (!audio.current || rung.current === key) return;
    rung.current = key;
    ring(audio.current);
  };
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <Overlay onClick={arm}>
      <Screen n={n} full armed={armed} onTimeUp={timeUp} onFull={toggleFull} />
    </Overlay>
  );
}

/** «/exam-display»: every hall's screen on one page, each a card that opens it */
export function AllDisplays() {
  const halls = useHalls();
  const screens = halls.live.map((c) => ({ n: halls.displayOf(c), c })).sort((a, b) => a.n - b.n);
  return (
    <Overlay className="overflow-y-auto overscroll-contain bg-[#001f1b]">
      <div className="mx-auto max-w-[110rem] px-4 py-6 md:px-8 md:py-8">
        <header className="mb-6 flex flex-wrap items-center gap-4">
          <Emblem className="size-14 shrink-0" gradientId="displays-emblem" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gold">الاختبار المؤتمت — شاشات القاعات</p>
            <h1 className="font-display text-2xl font-bold md:text-3xl">كل شاشات العرض في صفحة واحدة</h1>
            <p className="mt-1 text-sm text-white/70">شاشة كل قاعة كما تعرضها الآن. انقر شاشة لتفتحها وحدها على جهاز عرض قاعتها.</p>
          </div>
        </header>
        {!screens.length && <p className="rounded-2xl bg-white/5 p-6 text-center text-white/70">لا قاعات فعّالة.</p>}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {screens.map(({ n, c }) => (
            <Link key={c.id} href={`/exam-display/${n}`} className="group block">
              <p className="mb-2 flex items-center justify-between gap-2 text-sm font-bold">
                <span className="truncate">{c.name}</span>
                <span className="shrink-0 rounded-full bg-gold/20 px-2.5 py-0.5 text-xs text-gold ring-1 ring-gold/40">الشاشة {n}</span>
              </p>
              <div className="aspect-video overflow-hidden rounded-2xl ring-1 ring-gold/25 transition group-hover:ring-2 group-hover:ring-gold">
                <Screen n={n} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Overlay>
  );
}
