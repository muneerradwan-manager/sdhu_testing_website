"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertOctagon,
  BedDouble,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileSignature,
  Home,
  Landmark,
  Lock,
  MapPinned,
  MessageCircle,
  Moon,
  Phone,
  Plane,
  Receipt,
  RotateCcw,
  Siren,
  Sparkles,
  Star,
  Sun,
  Tent,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, MapEmbed, Modal, StarRating, useToast } from "@/components/ui/widgets";
import { FLIGHTS, ITINERARY, PLACES, assign, directAccepted, stageAt, trackOf, trackSteps } from "@/lib/journey";
import { ageOf, relationLabel } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { BoardingPass, HajjCard } from "./_components/cards";
import { groupInfo } from "@/lib/assignment";
import { PostChecklist } from "./_components/post/checklist";
import { EMPTY_POST, RESET_POST, clearJoinDecisions, costLines, paidAt } from "./_components/post/model";
import { ReviewBanner } from "./_components/review-banner";
import { StageChecking, StageDirect, StageEligible, StageIcon, StageLottery, StageNotAccepted, StageSubmitted } from "./_components/stages";

const NOTIFY: Record<string, { title: string; body: (n: string) => string; icon: string; tone: "success" | "info" | "gold" }> = {
  checking: { title: "بدأ تدقيق طلبك", body: (n) => `طلبك رقم ${n} قيد التحقق من الأهلية.`, icon: "🔎", tone: "info" },
  eligible: { title: "طلبك مؤهل", body: (n) => `طلبك رقم ${n} مؤهل، وينتظر نتيجة التسجيل الذي قدّمته فيه.`, icon: "✅", tone: "success" },
  direct: { title: "اعتُمدت قوائم القبول المباشر", body: () => `طلبك ضمن الأعمار المقبولة: ${SEASON.acceptedDirectAge} عاماً فأكثر.`, icon: "📢", tone: "info" },
  lottery: { title: "القرعة تبدأ الآن", body: () => "تابع البث المباشر للقرعة الإلكترونية.", icon: "📺", tone: "gold" },
  accepted: { title: "مبارك! تم قبول طلبك", body: (n) => `تم اختيار طلبك رقم ${n} لأداء فريضة الحج لموسم 1448هـ.`, icon: "🕋", tone: "success" },
  notAccepted: { title: "لم يُقبل طلبك مباشرة", body: () => `يمكنك التسجيل على القرعة (${SEASON.windows.lottery.hijri}) بالأفراد أنفسهم بضغطة واحدة، دون إعادة الخطوات.`, icon: "📋", tone: "gold" },
};

type Unlock = "always" | "group" | "payments" | "trip";

const SECTIONS: { id: string; label: string; unlock: Unlock }[] = [
  { id: "steps", label: "الخطوات", unlock: "always" },
  { id: "cards", label: "البطاقات", unlock: "trip" },
  { id: "flights", label: "الرحلات", unlock: "trip" },
  { id: "makkah", label: "فندق مكة", unlock: "trip" },
  { id: "madinah", label: "فندق المدينة", unlock: "trip" },
  { id: "mashaer", label: "المشاعر", unlock: "trip" },
  { id: "itinerary", label: "البرنامج", unlock: "trip" },
  { id: "group", label: "المجموعة", unlock: "group" },
  { id: "payments", label: "الإيصالات", unlock: "payments" },
];

const LOCK_HINT: Record<Exclude<Unlock, "always">, string> = {
  group: "يُفتح بعد تسجيلكم في مجموعة عند منسقها (الخطوة 3)",
  payments: "يُفتح بعد اكتمال التسديد (الخطوة 4)",
  trip: "يُفتح بعد صدور التأشيرة (الخطوة 6)",
};

function Section({ id, title, icon, children, ready, eyebrow, lockedHint }: { id: string; title: string; icon: ReactNode; children: ReactNode; ready: boolean; eyebrow?: string; lockedHint?: string }) {
  return (
    <section id={id} className="scroll-mt-40">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold shadow-lg">{icon}</span>
        <div>
          {eyebrow && <p className="text-xs font-bold text-gold-dark">{eyebrow}</p>}
          <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{title}</h2>
        </div>
      </div>
      <AnimatePresence mode="wait">
        {ready ? (
          <motion.div key="content" initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
            {children}
          </motion.div>
        ) : (
          <motion.div key="loading" exit={{ opacity: 0, scale: 0.98 }} className="rounded-[2rem] border border-dashed border-gold-dark/50 bg-white/60 p-8">
            <div className="flex flex-wrap items-center gap-3 text-gold-dark">
              <span className="grid size-9 place-items-center rounded-full bg-gold/25">
                <Lock className="size-4" />
              </span>
              <span className="text-lg font-bold">لم يُحدَّد بعد</span>
              {lockedHint && <span className="text-sm text-ink-soft">— {lockedHint}</span>}
            </div>
            <div className="mt-4 space-y-3">
              <div className="skeleton h-5 w-3/4 rounded-full" />
              <div className="skeleton h-5 w-1/2 rounded-full" />
              <div className="skeleton h-24 rounded-2xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Info({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-sand p-3.5", className)}>
      <p className="text-xs text-hint">{label}</p>
      <p className="mt-0.5 font-bold leading-6">{value}</p>
    </div>
  );
}

export default function ApplicationPage() {
  const toast = useToast();
  const sessionId = useStore((s) => s.sessionId)!;
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const account = useStore((s) => s.accounts[s.sessionId ?? ""]);
  const post = useStore((s) => s.post[s.sessionId ?? ""]) ?? EMPTY_POST;
  const review = useStore((s) => s.reviews[s.sessionId ?? ""]);
  const admins = useStore((s) => s.admins);
  const { fees } = useSeason();
  const [now, setNow] = useState(() => Date.now());
  const [mashaer, setMashaer] = useState<"mina" | "arafat" | "muzdalifah" | "jamarat">("mina");
  const [sos, setSos] = useState<null | "pick" | "sent">(null);
  const [sosType, setSosType] = useState("");
  const lastStage = useRef<string | null>(null);
  const celebrated = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const elapsed = app ? Math.max(0, (now - app.submittedAt) / 1000) : 0;
  const track = app ? trackOf(app) : "direct";
  const direct = track === "direct";
  const steps = trackSteps(track, app ? directAccepted(app) : false);
  const { stage, index: stageIdx } = stageAt(steps, elapsed);
  const accepted = stage.key === "accepted";
  const applicant = app?.members.find((m) => m.relation === "self") ?? app?.members[0];

  const assignments = useMemo(
    () => (app ? assign(app.members, (m) => (m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender))) : []),
    [app],
  );
  const lines = useMemo(() => (app ? costLines(app, fees) : []), [app, fees]);

  // Notifications + celebration on live transitions
  useEffect(() => {
    if (!app) return;
    if (lastStage.current && lastStage.current !== stage.key) {
      const n = NOTIFY[stage.key];
      if (n) toast({ title: n.title, body: n.body(app.number), icon: n.icon, tone: n.tone });
    }
    if (stage.key === "accepted" && !celebrated.current && lastStage.current !== null && lastStage.current !== "accepted") {
      celebrated.current = true;
      const end = Date.now() + 1800;
      const colors = ["#D9C89E", "#00594F", "#289E92", "#AD9E6E", "#ffffff"];
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    lastStage.current = stage.key;
  }, [stage.key, app, toast]);

  if (!app || !applicant) {
    return (
      <PortalShell title="متابعة الطلب">
        <Card className="text-center">
          <p className="font-display text-2xl font-bold text-green-dark">لم تقدّم طلباً بعد</p>
          <p className="mt-2 text-ink-soft">قدّم طلب حج لموسم 1448هـ ثم تابعه من هنا لحظة بلحظة.</p>
          <ButtonLink href="/portal/apply" size="lg" className="mt-6">
            تقديم طلب
          </ButtonLink>
        </Card>
      </PortalShell>
    );
  }

  const unlocked: Record<Unlock, boolean> = { always: true, group: !!post.groupApprovedAt, payments: lines.every((l) => !!paidAt(l, app, post)), trip: !!post.visaAt };
  const myGroup = groupInfo(post.clusterId, post.groupNumber);
  const rejected = review?.status === "rejected";
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const emergency = account?.emergencyName ? `${account.emergencyName} ${account.emergencyPhone ?? ""}` : "غرفة العمليات 920-1448";
  const women = assignments.filter((a) => a.person.gender === "F");
  const men = assignments.filter((a) => a.person.gender === "M");
  const place = PLACES[mashaer];
  const daysToTravel = Math.max(0, Math.ceil((new Date("2027-05-01T06:00:00+03:00").getTime() - now) / 86_400_000));

  return (
    <PortalShell
      wide
      image={accepted ? "/images/kaaba-hajj.jpg" : "/images/haram-2022.jpg"}
      title={
        <span className="flex flex-wrap items-center gap-3">
          طلبي رقم {app.number}
          <span className="rounded-full bg-white/15 px-3 py-1 text-base font-normal backdrop-blur">{app.members.length} أفراد</span>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-3">
          <span className="flex -space-x-2 space-x-reverse">
            {app.members.map((m) => (
              <span key={m.person.id} title={m.person.firstName} className={cn("grid size-9 place-items-center rounded-full border-2 border-green-dark text-sm font-bold", m.person.gender === "F" ? "bg-gold text-maroon" : "bg-gold-light text-green-dark")}>
                {m.person.firstName[0]}
              </span>
            ))}
          </span>
          {app.members.map((m) => m.person.firstName).join(" • ")}
        </span>
      }
    >
      {review && <ReviewBanner app={app} review={review} sessionId={sessionId} />}

      {/* ── Status tracker ── */}
      <Card className="relative overflow-hidden md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone="gold">
              <Clock className="size-3.5" /> محاكاة زمنية: كل مرحلة تستغرق ثوانيَ بدلاً من أسابيع
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              actions.restartTracking(sessionId);
              actions.setPost(sessionId, RESET_POST);
              clearJoinDecisions(sessionId, admins, app);
              actions.setInSeason(sessionId, { day: 0, ratings: {}, lostReports: 0 });
              celebrated.current = false;
              lastStage.current = "submitted";
            }}
          >
            <RotateCcw className="size-4" /> إعادة المحاكاة
          </Button>
        </div>

        {/* Stepper */}
        <p className="mt-4 text-sm font-bold text-gold-dark">
          {direct ? `التسجيل على القبول المباشر (${SEASON.windows.direct.hijri})` : `التسجيل على القرعة (${SEASON.windows.lottery.hijri})`}
          {app.previous && <span className="font-normal text-hint"> — سبقه طلب قبول مباشر رقم {app.previous.number} لم يُقبل</span>}
        </p>
        <ol className="relative mt-6 grid grid-cols-5 gap-1">
          <div className="absolute right-[10%] left-[10%] top-5 h-1 rounded-full bg-gold-light" />
          <motion.div
            className="absolute right-[10%] top-5 h-1 rounded-full bg-gradient-to-l from-green-light to-green-dark"
            animate={{ width: `${(Math.min(stageIdx, steps.length - 1) / (steps.length - 1)) * 80}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          {steps.map((t, i) => {
            const final = t.key === "accepted" || t.key === "notAccepted";
            const done = i < stageIdx || (final && i === stageIdx);
            const current = i === stageIdx && !final;
            const missed = t.key === "notAccepted" && i === stageIdx;
            return (
              <li key={t.key} className="relative flex flex-col items-center text-center">
                <motion.span
                  animate={current ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={current ? { repeat: Infinity, duration: 1.6 } : undefined}
                  className={cn(
                    "relative z-10 grid size-11 place-items-center rounded-full border-4 border-white shadow transition-colors duration-500",
                    missed ? "bg-maroon text-white" : done ? "bg-green-light text-white" : current ? "bg-gold text-ink" : "bg-sand text-hint",
                  )}
                >
                  {current && <span className="absolute inset-0 animate-ping rounded-full bg-gold/40" />}
                  <StageIcon k={t.key} />
                </motion.span>
                <span className={cn("mt-2 text-[11px] font-bold leading-4 md:text-sm", done || current ? "text-green-dark" : "text-hint")}>
                  {t.title}
                </span>
                <span className="mt-0.5 hidden text-xs text-hint md:block">{t.text}</span>
              </li>
            );
          })}
        </ol>

        {/* Stage panel */}
        <div className="mt-10 rounded-[1.75rem] border border-gold/30 bg-sand/60 p-5 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={stage.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45 }}>
              {stage.key === "submitted" && <StageSubmitted app={app} />}
              {stage.key === "checking" && <StageChecking members={app.members} />}
              {stage.key === "eligible" && <StageEligible app={app} />}
              {stage.key === "direct" && <StageDirect age={ageOf(applicant.person)} />}
              {stage.key === "lottery" && <StageLottery number={app.number} elapsed={elapsed} />}
              {stage.key === "notAccepted" && <StageNotAccepted age={ageOf(applicant.person)} />}
              {accepted && rejected && (
                <div className="flex items-center gap-4 rounded-3xl bg-white p-6 ring-1 ring-maroon/20">
                  <AlertOctagon className="size-12 shrink-0 text-maroon" />
                  <div>
                    <p className="font-display text-2xl font-bold text-maroon">النتيجة معلّقة بقرار المراجعة</p>
                    <p className="mt-1 text-lg text-ink-soft">راجع سبب القرار في الأعلى، ويمكنك تقديم اعتراض.</p>
                  </div>
                </div>
              )}
              {accepted && !rejected && (
                <div className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-white md:p-10">
                  <div className="bg-pattern absolute inset-0 opacity-20" />
                  <motion.div className="absolute -left-24 -top-24 size-72 rounded-full bg-gold/30 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 4 }} />
                  <div className="relative grid items-center gap-6 md:grid-cols-[auto_1fr_auto]">
                    <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 10 }} className="grid size-24 place-items-center rounded-full bg-gold text-5xl shadow-2xl">
                      🕋
                    </motion.div>
                    <div>
                      <p className="text-gold">{direct ? "مقبول مباشرة وفق الأكبر سناً" : "تم اختيارك بالقرعة الإلكترونية"}</p>
                      <p className="mt-1 font-display text-3xl font-bold md:text-5xl">مبارك! تم قبول طلبك</p>
                      <p className="mt-3 max-w-2xl leading-8 text-white/80">
                        طلب عائلي رقم {app.number} ({app.members.length} أفراد) لأداء فريضة الحج لموسم 1448هـ. أكملوا الخطوات أدناه، فتُفتح تفاصيل رحلتكم خطوة بخطوة.
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/10 p-5 text-center backdrop-blur">
                      <p className="font-display text-5xl font-bold text-gold">{daysToTravel}</p>
                      <p className="text-sm text-white/70">يوماً حتى السفر</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      {/* ── Dossier ── */}
      {accepted && !rejected && (
        <div className="mt-8">
          {/* Sticky section nav */}
          <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="scrollbar-none sticky top-20 z-30 -mx-4 mb-8 overflow-x-auto px-4 py-2">
            <div className="flex w-max gap-1.5 rounded-2xl border border-gold/40 bg-white/90 p-1.5 shadow-lg backdrop-blur">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={cn("flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-bold transition hover:bg-green-dark hover:text-white", unlocked[s.unlock] ? "text-ink-soft" : "text-hint")}>
                  {!unlocked[s.unlock] && <Lock className="size-3" />}
                  {s.label}
                </a>
              ))}
              {post.visaAt && (
                <Link href="/portal/season" className="flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-gold-dark hover:text-white">
                  <MapPinned className="size-4" /> حالتي الآن
                </Link>
              )}
            </div>
          </motion.nav>

          <div className="space-y-16">
            <section id="steps" className="scroll-mt-40">
              <PostChecklist app={app} post={post} sessionId={sessionId} lines={lines} />
              <AnimatePresence>
                {post.visaAt && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-l from-gold-dark via-gold to-gold-light p-6 md:p-8">
                    <div className="bg-pattern-dark absolute inset-0" />
                    <div className="relative flex flex-wrap items-center justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="grid size-16 place-items-center rounded-2xl bg-green-dark text-gold shadow-xl">
                          <MapPinned className="size-8" />
                        </motion.span>
                        <div>
                          <p className="font-display text-2xl font-bold text-green-dark md:text-3xl">«حالتي الآن» — رفيقك في الموسم</p>
                          <p className="text-lg text-ink">أين أنت، وجبتك، حافلتك، الطوارئ، الشكاوى، والمفقودات — يوماً بيوم.</p>
                        </div>
                      </div>
                      <ButtonLink href="/portal/season" size="xl">
                        افتح حالتي الآن
                      </ButtonLink>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <Section id="cards" title="بطاقات الحجاج الرقمية" icon={<Sparkles className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip} eyebrow="تُطبع أيضاً على سوار المعصم">
              <div className="scrollbar-none -mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-6 pt-2">
                {assignments.map((a, i) => (
                  <HajjCard key={a.person.id} a={a} emergency={emergency} index={i} />
                ))}
              </div>
              <p className="text-sm text-hint">عند مسح الرمز يرى الموظف أو الإداري المخوّل ما تسمح به صلاحيته فقط؛ والاحتياجات الطبية للفريق الطبي وحده.</p>
            </Section>

            <Section id="flights" title="رحلة الذهاب والعودة" icon={<Plane className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip} eyebrow="التأشيرة صادرة لجميع أفراد الطلب">
              <div className="grid gap-6 xl:grid-cols-2">
                <BoardingPass f={FLIGHTS.outbound} label="رحلة الذهاب" seats={assignments.map((a) => ({ name: a.person.firstName, seat: a.seat }))} />
                <BoardingPass f={FLIGHTS.inbound} label="رحلة العودة" tone="maroon" seats={assignments.map((a) => ({ name: a.person.firstName, seat: a.returnSeat }))} />
              </div>
              {assignments.some((a) => a.needs.includes("كرسي متحرك")) && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 font-semibold text-green">
                  ♿ طلب مساعدة الكرسي المتحرك مسجّل مع الناقل من المطار حتى باب الطائرة، والحافلة 32 مهيأة.
                </p>
              )}
            </Section>

            <Section id="makkah" title={PLACES.makkahHotel.name} icon={<Building2 className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip} eyebrow="السكن في مكة المكرمة">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="الموقع" value={PLACES.makkahHotel.area} className="col-span-2" />
                    <Info label="البرج والطابق" value={`${PLACES.makkahHotel.tower} — الطابق ${PLACES.makkahHotel.floor}`} />
                    <Info label="المسافة" value={PLACES.makkahHotel.distance} />
                    <Info label="مدة الإقامة" value={PLACES.makkahHotel.stay} className="col-span-2" />
                  </div>
                  <div className="rounded-3xl border border-gold/40 bg-white p-5">
                    <p className="flex items-center gap-2 font-bold text-green-dark"><BedDouble className="size-5" /> توزيع الغرف</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {[{ list: men, label: "رجال" }, { list: women, label: "سيدات" }].filter((g) => g.list.length).map((g) => (
                        <div key={g.label} className="rounded-2xl bg-sand p-3">
                          <p className="font-mono text-2xl font-bold text-green-dark">{g.list[0].room}</p>
                          <p className="text-xs text-hint">غرفة {g.label} — {g.list.length === 1 ? "مع حجاج من المجموعة" : "ثلاثية"}</p>
                          <p className="mt-1 text-sm font-semibold">{g.list.map((a) => a.person.firstName).join("، ")}</p>
                        </div>
                      ))}
                    </div>
                    {assignments.some((a) => a.needs.length) && <p className="mt-3 text-sm text-maroon">أقرب غرفة إلى المصعد وحمام مهيأ بمقبض — مراعاةً للاحتياجات الخاصة.</p>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {PLACES.makkahHotel.meals.map((m) => (
                      <div key={m.name} className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gold/30">
                        <UtensilsCrossed className="size-5 text-gold-dark" />
                        <div><p className="text-sm font-bold">{m.name}</p><p className="font-mono text-xs text-hint">{m.time}</p></div>
                      </div>
                    ))}
                  </div>
                  <p className="flex items-start gap-2 rounded-2xl bg-green-dark/6 p-4 text-sm font-semibold text-green-dark">
                    <Bus className="mt-0.5 size-5 shrink-0" /> {PLACES.makkahHotel.bus}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {PLACES.makkahHotel.features.map((f) => <Badge key={f}>{f}</Badge>)}
                  </ul>
                </div>
                <MapEmbed lat={PLACES.makkahHotel.lat} lng={PLACES.makkahHotel.lng} label={PLACES.makkahHotel.name} zoom={0.02} className="h-full min-h-96" />
              </div>
            </Section>

            <Section id="madinah" title={PLACES.madinahHotel.name} icon={<Landmark className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip} eyebrow="السكن في المدينة المنورة">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                <MapEmbed lat={PLACES.madinahHotel.lat} lng={PLACES.madinahHotel.lng} label={PLACES.madinahHotel.name} zoom={0.008} className="order-last h-full min-h-96 lg:order-first" />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Info label="الموقع" value={PLACES.madinahHotel.area} className="col-span-2" />
                    <Info label="المسافة" value={PLACES.madinahHotel.distance} />
                    <Info label="مدة الإقامة" value={`${PLACES.madinahHotel.stay} (${PLACES.madinahHotel.nights} ليالٍ)`} />
                    <Info label="الغرف" value={[...new Set(assignments.map((a) => a.madinahRoom))].map((r) => `${r} (${assignments.filter((a) => a.madinahRoom === r).map((a) => a.person.firstName).join("، ")})`).join(" — ")} className="col-span-2" />
                    <Info label="موعد الروضة الشريفة" value={PLACES.madinahHotel.rawdah} className="col-span-2" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {PLACES.madinahHotel.meals.map((m) => (
                      <div key={m.name} className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gold/30">
                        <UtensilsCrossed className="size-5 text-gold-dark" />
                        <div><p className="text-sm font-bold">{m.name}</p><p className="font-mono text-xs text-hint">{m.time}</p></div>
                      </div>
                    ))}
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {PLACES.madinahHotel.features.map((f) => <Badge key={f}>{f}</Badge>)}
                  </ul>
                </div>
              </div>
            </Section>

            <Section id="mashaer" title="المشاعر المقدسة: المخيمات والمواقع" icon={<Tent className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip} eyebrow="8 – 13 ذو الحجة">
              <div className="mb-4 flex flex-wrap gap-2">
                {([
                  ["mina", "منى — مخيم 42"],
                  ["arafat", "عرفات"],
                  ["muzdalifah", "مزدلفة"],
                  ["jamarat", "الجمرات"],
                ] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setMashaer(k)} className={cn("relative rounded-2xl px-5 py-2.5 font-bold transition", mashaer === k ? "text-white" : "bg-white text-ink-soft ring-1 ring-gold/40 hover:text-green-dark")}>
                    {mashaer === k && <motion.span layoutId="mashaer-tab" className="absolute inset-0 -z-10 rounded-2xl bg-green-dark" />}
                    {l}
                  </button>
                ))}
              </div>
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <AnimatePresence mode="wait">
                  <motion.div key={mashaer} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                    <div className="rounded-3xl bg-green-dark p-6 text-white">
                      <p className="text-sm text-gold">{place.area}</p>
                      <p className="mt-1 font-display text-2xl font-bold">{place.name}</p>
                      {"tents" in place && (
                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white/10 p-4 text-center">
                            <p className="font-display text-4xl font-bold text-gold">{place.tents.men}</p>
                            <p className="text-sm text-white/75">خيمة الرجال</p>
                            <p className="mt-1 text-xs">{men.map((a) => a.person.firstName).join("، ") || "—"}</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-4 text-center">
                            <p className="font-display text-4xl font-bold text-gold">{place.tents.women}</p>
                            <p className="text-sm text-white/75">خيمة السيدات</p>
                            <p className="mt-1 text-xs">{women.map((a) => a.person.firstName).join("، ") || "—"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {place.notes.map((n) => (
                        <li key={n} className="flex items-start gap-2 rounded-2xl bg-white p-3.5 ring-1 ring-gold/30">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-light" /> {n}
                        </li>
                      ))}
                    </ul>
                    {mashaer === "mina" && (
                      <p className="flex items-center gap-2 rounded-2xl bg-gold/20 p-3.5 text-sm font-semibold text-maroon">
                        <Bus className="size-4" /> الحافلة 7 للرجال والحافلة 8 للسيدات — الانطلاق 8 ذو الحجة 07:00 من البوابة الجنوبية
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
                <MapEmbed key={mashaer} lat={place.lat} lng={place.lng} label={place.name} zoom={0.01} className="h-full min-h-96" />
              </div>
            </Section>

            <Section id="itinerary" title="برنامج الرحلة يوماً بيوم" icon={<CalendarDays className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip}>
              <ol className="relative space-y-4 border-r-2 border-gold-light pr-8">
                {ITINERARY.map((d, i) => {
                  const Icon = { plane: Plane, hotel: Building2, tent: Tent, sun: Sun, moon: Moon, star: Star, kaaba: Landmark, mosque: Landmark, home: Home }[d.icon];
                  return (
                    <motion.li key={d.title} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="relative">
                      <span className="absolute -right-[49px] top-3 grid size-8 place-items-center rounded-full bg-green-dark text-gold ring-4 ring-sand">
                        <Icon className="size-4" />
                      </span>
                      <div className="rounded-3xl bg-white p-5 ring-1 ring-gold/30 transition hover:shadow-lg">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-display text-lg font-bold text-green-dark">{d.title}</p>
                          <Badge tone="gold">{d.hijri}</Badge>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gold-dark">{d.place}</p>
                        <p className="mt-1 leading-7 text-ink-soft">{d.detail}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </Section>

            <Section id="group" title={`المجموعة ${myGroup.number} — ${myGroup.clusterName}`} icon={<UsersRound className="size-6" />} ready={unlocked.group} lockedHint={LOCK_HINT.group} eyebrow={`${myGroup.office} — مستوى الخدمة: ${myGroup.level}`}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {myGroup.team.map((p, i) => (
                  <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-3xl bg-white p-5 ring-1 ring-gold/30">
                    <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark font-display text-2xl font-bold text-ink">{p.name.replace("الشيخ ", "")[0]}</span>
                    <p className="mt-3 text-xs font-bold text-gold-dark">{p.role}</p>
                    <p className="font-display text-lg font-bold text-green-dark">{p.name}</p>
                    <p className="mt-1 text-sm text-ink-soft">{p.note}</p>
                    <div className="mt-4 flex gap-2">
                      <a href="#" onClick={(e) => { e.preventDefault(); toast({ title: `اتصال بـ ${p.name}`, body: p.phone, icon: "📞" }); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-dark py-2 text-sm font-bold text-white hover:bg-green">
                        <Phone className="size-4" /> اتصال
                      </a>
                      <a href="#" onClick={(e) => { e.preventDefault(); toast({ title: "قناة المجموعة", body: "الرسائل الخاصة متاحة في تطبيق الجوال.", icon: "💬" }); }} className="grid size-9 place-items-center rounded-xl bg-sand text-green-dark hover:bg-gold-light" aria-label="رسالة">
                        <MessageCircle className="size-4" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-gold/30">
                <p className="font-display text-lg font-bold text-green-dark">قناة المجموعة</p>
                <div className="mt-4 space-y-3">
                  {[
                    { who: myGroup.team[0].name, t: `أهلاً بكم في المجموعة ${myGroup.number}. اللقاء التعريفي يوم 10 ذو القعدة الساعة 17:00 في قاعة المزة. يرجى تأكيد الحضور.`, when: "10 ذو القعدة" },
                    { who: (myGroup.team[2] ?? myGroup.team[0]).name, t: "الدرس الثالث قبل السفر: أحكام الإحرام ومحظوراته. راجعوا مسار «فقه الحج» في الأكاديمية قبل الدرس.", when: "20 شوال" },
                    { who: myGroup.team[1].name, t: "حافلة التجمّع من ساحة المزة إلى المطار تنطلق 01:30. لا تنسوا الجواز والأدوية والسوار.", when: "23 ذو القعدة" },
                  ].map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="max-w-2xl rounded-3xl rounded-tr-md bg-sand p-4">
                      <p className="text-xs font-bold text-green">{m.who} <span className="font-normal text-hint">— {m.when}</span></p>
                      <p className="mt-1 leading-7">{m.t}</p>
                    </motion.div>
                  ))}
                </div>
                <Link href="/academy" className="mt-4 inline-flex items-center gap-2 font-bold text-green-dark hover:underline">
                  <BookOpen className="size-4" /> الدروس الدينية قبل السفر في الأكاديمية
                </Link>
              </div>
            </Section>

            <Section id="payments" title="التكاليف والإيصالات والعقد" icon={<Receipt className="size-6" />} ready={unlocked.payments} lockedHint={LOCK_HINT.payments} eyebrow="لكل تكلفة إيصال مستقل قابل للتحقق">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { t: "رسم التسجيل", n: app.receipt, v: app.members.length * fees.registrationPerPerson },
                  ...lines.map((l) => ({ t: `${l.title} (${l.detail})`, n: l.receipt, v: l.amount })),
                ].map((r, i) => (
                  <motion.div key={r.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="overflow-hidden rounded-3xl bg-white ring-1 ring-gold/40">
                    <div className="flex items-center justify-between bg-green-dark px-4 py-3 text-white">
                      <span className="text-sm font-bold">{r.t}</span>
                      <CheckCircle2 className="size-5 text-green-light" />
                    </div>
                    <div className="flex items-center gap-3 p-4">
                      <QRCodeSVG value={`https://hajj-demo.sy/verify/${r.n}`} size={64} fgColor="#00594F" />
                      <div>
                        <p className="font-display text-2xl font-bold text-green-dark">{formatUSD(r.v)}</p>
                        <p className="font-mono text-xs text-hint" dir="ltr">{r.n}</p>
                        <p className="text-xs font-bold text-green">مسدَّد ✓</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 ring-1 ring-gold/40">
                <div className="flex items-center gap-3">
                  <FileSignature className="size-10 text-gold-dark" />
                  <div>
                    <p className="font-bold">عقد الحاج مع المجموعة {myGroup.number}</p>
                    <p className="text-sm text-ink-soft">وقّعه الحاج مع منسق المجموعة {post.enrolledBy?.name ?? ""} عند التسجيل فيها، وصادقت عليه الإدارة — تكلفة الحج والهدي {formatUSD(total)}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => toast({ title: "العقد", body: "يُحفظ العقد في خزنة الوثائق في التطبيق.", icon: "📄" })}>عرض العقد</Button>
              </div>
            </Section>

            {/* Rating */}
            <Card className="text-center">
              <p className="font-display text-2xl font-bold text-green-dark">كيف تقيّم وضوح طريقتي القبول وشفافية القرعة؟</p>
              <p className="mt-1 text-ink-soft">تقييمك يظهر في تقرير الموسم لمقارنته بالمواسم السابقة.</p>
              <div className="mt-5 flex justify-center">
                <StarRating
                  size="lg"
                  value={app.ratings.acceptance ?? 0}
                  onChange={(v) => {
                    actions.rate(sessionId, "acceptance", v);
                    toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
                  }}
                />
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Emergency */}
      {accepted && !rejected && post.visaAt && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring" }}
          onClick={() => setSos("pick")}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-maroon px-5 py-4 font-bold text-white shadow-2xl shadow-maroon/40 animate-pulse-ring"
        >
          <Siren className="size-6" /> طوارئ
        </motion.button>
      )}
      <Modal open={sos !== null} onClose={() => setSos(null)}>
        {sos === "pick" ? (
          <div>
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-maroon">
              <AlertOctagon className="size-7" /> بلاغ طوارئ
            </p>
            <p className="mt-1 text-ink-soft">اختر نوع الحالة، ويصل البلاغ فوراً إلى الجهات المختصة بحسب موقعك.</p>
            <div className="mt-5 grid gap-2">
              {[
                ["حالة صحية", "الفريق الطبي + رئيس المجموعة + غرفة العمليات — خلال 10 دقائق"],
                ["حاج مفقود", "غرفة العمليات مباشرة — فوري"],
                ["نقل أو تأخر حافلة", "فريق المواصلات — خلال 30 دقيقة"],
                ["شكوى وجبة أو غرفة", "مشرف البرج — خلال ساعتين"],
              ].map(([t, d]) => (
                <button key={t} onClick={() => { setSosType(t); setSos("sent"); }} className="rounded-2xl border-2 border-maroon/15 p-4 text-right transition hover:border-maroon hover:bg-maroon/5">
                  <p className="font-bold">{t}</p>
                  <p className="text-sm text-ink-soft">{d}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mx-auto grid size-20 place-items-center rounded-full bg-green-light text-white">
              <CheckCircle2 className="size-10" />
            </motion.div>
            <p className="mt-4 font-display text-2xl font-bold text-green-dark">تم إرسال البلاغ</p>
            <p className="mt-1 text-ink-soft">{sosType} — تذكرة رقم {48217 + app.number.length}</p>
            <p className="mt-3 rounded-2xl bg-sand p-3 text-sm">هذه محاكاة. في التطبيق الفعلي يُرسل موقعك (الفندق والغرفة) تلقائياً ويتابع البلاغ حتى الإغلاق.</p>
          </div>
        )}
      </Modal>
    </PortalShell>
  );
}
