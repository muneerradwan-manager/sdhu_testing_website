"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  AlertOctagon,
  BadgeCheck,
  BedDouble,
  BookOpen,
  Building2,
  Bus,
  CheckCircle2,
  Clock,
  FileSignature,
  Landmark,
  Lock,
  MapPinned,
  MessageCircle,
  Phone,
  Plane,
  RotateCcw,
  Siren,
  Stamp,
  Tent,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, MapEmbed, Modal, StarRating, useToast } from "@/components/ui/widgets";
import { PLACES, assign, drawLine, outcomeOf, stageAt, trackOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { itineraryOf, passCardOf, useFlightsData } from "@/lib/flights";
import { ageOf, relationLabel } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type Application, type PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BoardingPass } from "./cards";
import { groupInfo } from "@/lib/assignment";
import { groupName } from "@/lib/groups";
import { DocumentVault, type VaultDoc } from "./documents";
import { forFamily, useGroupPosts } from "@/lib/group-channel";
import { PostChecklist } from "./post/checklist";
import { EMPTY_POST, RESET_POST, clearJoinDecisions, costLines, stepsDone, useRoomCost } from "./post/model";
import { usePinnedVersion } from "@/lib/registration/client";
import { postStepsOf } from "@/lib/registration/engine";
import { ReviewBanner } from "./review-banner";
import { StageChecking, StageDirect, StageEligible, StageIcon, StageLottery, StageNotAccepted, StageSubmitted } from "./stages";
import { PilgrimLocked, PilgrimShell } from "../../_components/pilgrim-shell";

const NOTIFY: Record<string, { title: string; body: (n: string) => string; icon: string; tone: "success" | "info" | "gold" }> = {
  checking: { title: "بدأ تدقيق طلبك", body: (n) => `طلبك رقم ${n} قيد التحقق من الأهلية.`, icon: "🔎", tone: "info" },
  eligible: { title: "طلبك مؤهل", body: (n) => `طلبك رقم ${n} مؤهل، وينتظر نتيجة التسجيل الذي قدّمته فيه.`, icon: "✅", tone: "success" },
  direct: { title: "اعتُمدت قوائم القبول المباشر", body: () => `طلبك ضمن الأعمار المقبولة: ${SEASON.acceptedDirectAge} عاماً فأكثر.`, icon: "📢", tone: "info" },
  lottery: { title: "القرعة تبدأ الآن", body: () => "تابع البث المباشر: تُسحب سنوات الميلاد وأشهرها.", icon: "📺", tone: "gold" },
  accepted: { title: "مبارك! تم قبول طلبك", body: (n) => `قُبل طلبك رقم ${n} لأداء فريضة الحج لموسم 1448هـ.`, icon: "🕋", tone: "success" },
  notAccepted: { title: "لم يُقبل طلبك مباشرة", body: () => `يمكنك التسجيل الأولي على القرعة (${SEASON.windows.lottery.hijri}) بالأفراد أنفسهم بضغطة واحدة، دون إعادة الخطوات.`, icon: "📋", tone: "gold" },
  notDrawn: { title: "نُشرت نتائج القرعة", body: () => "لم تُسحب سنة ميلاد صاحب طلبك وشهره هذا الموسم.", icon: "📋", tone: "info" },
};

type Unlock = "always" | "group" | "trip";

const LOCK_HINT: Record<Exclude<Unlock, "always">, string> = {
  group: "يُفتح بعد إلحاقكم بمجموعة في المكتب (الخطوة 3)",
  trip: "يُفتح بعد صدور التأشيرة (الخطوة 7)",
};

/** One part of the pilgrim's file in the portal's card, like every other page of his account */
function Section({ id, title, icon, children, ready, eyebrow, lockedHint }: { id: string; title: string; icon: ReactNode; children: ReactNode; ready: boolean; eyebrow?: string; lockedHint?: string }) {
  return (
    <section id={id} className="scroll-mt-40 rounded-[2rem] border border-gold/30 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-8">
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

/** Which page of the pilgrim's account this is: the application and its steps, or what a step opens */
export type ApplicationPart = "status" | "group" | "hotels" | "trip" | "documents";

const PART_TITLE: Record<Exclude<ApplicationPart, "status">, string> = {
  group: "مجموعتي",
  hotels: "الفنادق والسكن",
  trip: "الطيران والمشاعر",
  documents: "خزنة الوثائق",
};

/**
 * The pilgrim's application, one page of his account at a time: its status and steps («طلبي وخطواته»), or what
 * a step opens — his group and his contract, his hotels and rooms, his trip, the vault of his documents. Each is its
 * own entry in the sidebar; a part whose step has not come yet says what opens it.
 */
export function ApplicationView({ view = "status" }: { view?: ApplicationPart }) {
  const toast = useToast();
  const sessionId = useStore((s) => s.sessionId)!;
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const account = useStore((s) => s.accounts[s.sessionId ?? ""]);
  const post = useStore((s) => s.post[s.sessionId ?? ""]) ?? EMPTY_POST;
  const review = useStore((s) => s.reviews[s.sessionId ?? ""]);
  const admins = useStore((s) => s.admins);
  const { fees, acceptedDirectAge, meals } = useSeason();
  const draw = usePublishedDraw();
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
  const steps = app ? outcomeOf(app, draw, acceptedDirectAge).steps : [];
  // No application yet: no stages, and the page shows how to file one (below)
  const { stage, index: stageIdx } = stageAt(steps, elapsed);
  const stageKey = stage?.key;
  const accepted = stageKey === "accepted";
  const applicant = app?.members.find((m) => m.relation === "self") ?? app?.members[0];

  const assignments = useMemo(
    () => (app ? assign(app.members, (m) => (m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender))) : []),
    [app],
  );
  const room = useRoomCost(app, post);
  const lines = useMemo(() => (app ? costLines(app, fees, room) : []), [app, fees, room]);
  // The group channel's posts that concern this family
  const allPosts = useGroupPosts(post.groupNumber);
  const channel = useMemo(() => (app ? allPosts.filter((p) => forFamily(p, app.members)) : []), [allPosts, app]);
  // the family's seats as the cluster head assigned them (one itinerary: the family travels together)
  const flightsData = useFlightsData();
  const myTrip = useMemo(() => {
    if (!applicant) return null;
    const it = itineraryOf(applicant.person.id, flightsData);
    const of = (id?: string) => flightsData.flights.find((f) => f.id === id);
    return {
      outbound: of(it.outbound?.flightId),
      inbound: of(it.return?.flightId),
      seatOf: (memberId: string, dir: "outbound" | "return") => flightsData.assignments.find((x) => x.travelerId === memberId && x.flightId === (dir === "outbound" ? it.outbound?.flightId : it.return?.flightId))?.seat,
    };
  }, [applicant, flightsData]);

  // Notifications + celebration on live transitions
  useEffect(() => {
    if (!app || !stageKey) return;
    if (lastStage.current && lastStage.current !== stageKey) {
      const n = NOTIFY[stageKey === "notAccepted" && !direct ? "notDrawn" : stageKey];
      if (n) toast({ title: n.title, body: n.body(app.number), icon: n.icon, tone: n.tone });
    }
    if (stageKey === "accepted" && !celebrated.current && lastStage.current !== null && lastStage.current !== "accepted") {
      celebrated.current = true;
      const end = Date.now() + 1800;
      const colors = ["#D9C89E", "#00594F", "#289E92", "#AD9E6E", "#ffffff"];
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
    lastStage.current = stageKey;
  }, [stageKey, app, toast, direct]);

  if (!app || !applicant) {
    return (
      <PilgrimShell title={view === "status" ? "متابعة الطلب" : PART_TITLE[view]}>
        <Card className="text-center">
          <p className="font-display text-2xl font-bold text-green-dark">لم تقدّم طلباً بعد</p>
          <p className="mt-2 text-ink-soft">قدّم طلب حج لموسم 1448هـ ثم تابعه من هنا لحظة بلحظة.</p>
          <ButtonLink href="/portal/apply" size="lg" className="mt-6">
            تقديم طلب
          </ButtonLink>
        </Card>
      </PilgrimShell>
    );
  }

  const unlocked: Record<Unlock, boolean> = { always: true, group: !!post.groupApprovedAt, trip: !!post.visaAt };
  const myGroup = groupInfo(post.clusterId, post.groupNumber);
  const rejected = review?.status === "rejected";
  const total = lines.reduce((a, l) => a + l.amount, 0);
  const emergency = account?.emergencyName ? `${account.emergencyName} ${account.emergencyPhone ?? ""}` : "غرفة العمليات 920-1448";
  const acceptedBy = direct ? "قبول مباشر وفق الأكبر سناً" : `بالقرعة: ${drawLine(app, draw) ?? ""}`;
  const registration = app.members.length * fees.registrationPerPerson;
  // The two flight tickets as documents of the vault, drawn as on «الطيران والمشاعر»
  const flightDocs: VaultDoc[] = (["outbound", "return"] as const).map((dir) => {
    const f = dir === "outbound" ? myTrip?.outbound : myTrip?.inbound;
    const card = f ? passCardOf(f, flightsData) : null;
    const label = dir === "outbound" ? "رحلة الذهاب" : "رحلة العودة";
    return {
      id: `flight-${dir}`,
      tone: dir === "outbound" ? "green" : "maroon",
      kind: `بطاقة ${label}`,
      icon: Plane,
      title: card ? `${card.from.city} ← ${card.to.city}` : label,
      sub: card ? `${card.hijri} — ${card.departure}` : "يضعكم عليها رئيس التكتل",
      code: card?.code,
      ready: !!card && !!post.visaAt,
      status: card && post.visaAt ? { label: "مؤكدة", tone: "green" } : { label: "لم تُحدد بعد", tone: "ink" },
      view: () =>
        card && (
          <BoardingPass f={card} label={label} tone={dir === "outbound" ? "green" : "maroon"} seats={assignments.map((a) => ({ name: a.person.firstName, seat: myTrip?.seatOf(a.person.id, dir) ?? (dir === "outbound" ? a.seat : a.returnSeat) }))} />
        ),
      wide: true,
    };
  });
  const women = assignments.filter((a) => a.person.gender === "F");
  const men = assignments.filter((a) => a.person.gender === "M");
  const place = PLACES[mashaer];
  const daysToTravel = Math.max(0, Math.ceil((new Date("2027-05-01T06:00:00+03:00").getTime() - now) / 86_400_000));

  return (
    <PilgrimShell
      image={accepted ? "/images/kaaba-hajj.jpg" : "/images/haram-2022.jpg"}
      title={
        <span className="flex flex-wrap items-center gap-3">
          {view === "status" ? `طلبي رقم ${app.number}` : PART_TITLE[view]}
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
      {view === "status" && (
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
          {direct ? `التسجيل على القبول المباشر (${SEASON.windows.direct.hijri})` : `التسجيل الأولي على القرعة (${SEASON.windows.lottery.hijri})`}
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
              {stage.key === "direct" && <StageDirect age={ageOf(applicant.person)} cut={app.announcedDirectAge ?? acceptedDirectAge} />}
              {stage.key === "lottery" && <StageLottery app={app} draw={draw} elapsed={elapsed} />}
              {stage.key === "notAccepted" && <StageNotAccepted age={ageOf(applicant.person)} app={app} draw={draw} />}
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
                      <p className="text-gold">{direct ? "مقبول مباشرة وفق الأكبر سناً" : `مقبول بالقرعة: ${drawLine(app, draw) ?? ""}`}</p>
                      <p className="mt-1 font-display text-3xl font-bold md:text-5xl">مبارك! تم قبول طلبك</p>
                      <p className="mt-3 max-w-2xl leading-8 text-white/80">
                        طلب عائلي رقم {app.number} ({app.members.length} أفراد) لأداء فريضة الحج لموسم 1448هـ. أكملوا الخطوات أدناه، فتُفتح تفاصيل رحلتكم خطوة بخطوة.
                      </p>
                      {post.confirmedAt && (
                        <Link href="/portal/application/documents" className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 text-sm font-bold text-ink transition hover:bg-gold-light">
                          <BadgeCheck className="size-4" /> إشعار القبول في «خزنة الوثائق»
                        </Link>
                      )}
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
      )}

      {view !== "status" && !(accepted && !rejected) && <PilgrimLocked title={`${PART_TITLE[view]}: بعد قبول طلبك`} text="تُفتح هذه الصفحة بعد قبول طلبك وتأكيده، وتكتمل خطوة بعد خطوة. تابع طلبك وخطواته." />}

      {/* ── Dossier ── */}
      {accepted && !rejected && (
        <div className={view === "status" ? "mt-8" : undefined}>
          <div className={view === "status" ? "space-y-16" : "space-y-6"}>
            {view === "status" && (
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
            )}

            {view === "documents" && <DocumentVault app={app} post={post} lines={lines} total={total} registration={registration} acceptedBy={acceptedBy} assignments={assignments} emergency={emergency} flights={flightDocs} visa={<VisaPanel app={app} post={post} lines={lines} />} />}

            {view === "hotels" && post.groupApprovedAt && (
              <p className="flex items-start gap-2 rounded-2xl bg-white p-4 text-sm leading-7 text-ink-soft ring-1 ring-gold/30">
                <BedDouble className="mt-1 size-4 shrink-0 text-gold-dark" />
                الفندق والغرف كما أسندها إليكم رئيس {groupName(myGroup.number)} ({myGroup.leader}) في {myGroup.clusterName}، بحسب السكن الذي اخترتموه.
              </p>
            )}

            {view === "trip" && (
            <Section id="flights" title="رحلة الذهاب والعودة" icon={<Plane className="size-6" />} ready={unlocked.trip} lockedHint={LOCK_HINT.trip} eyebrow="التأشيرة صادرة لجميع أفراد الطلب">
              <div className="grid gap-6 xl:grid-cols-2">
                {myTrip?.outbound ? (
                  <BoardingPass f={passCardOf(myTrip.outbound, flightsData)} label="رحلة الذهاب" seats={assignments.map((a) => ({ name: a.person.firstName, seat: myTrip.seatOf(a.person.id, "outbound") ?? a.seat }))} />
                ) : (
                  <NoFlightYet label="رحلة الذهاب" />
                )}
                {myTrip?.inbound ? (
                  <BoardingPass f={passCardOf(myTrip.inbound, flightsData)} label="رحلة العودة" tone="maroon" seats={assignments.map((a) => ({ name: a.person.firstName, seat: myTrip.seatOf(a.person.id, "return") ?? a.returnSeat }))} />
                ) : (
                  <NoFlightYet label="رحلة العودة" />
                )}
              </div>
              {assignments.some((a) => a.needs.includes("كرسي متحرك")) && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-4 font-semibold text-green">
                  ♿ طلب مساعدة الكرسي المتحرك مسجّل مع الناقل من المطار حتى باب الطائرة، والحافلة 32 مهيأة.
                </p>
              )}
            </Section>

            )}

            {view === "hotels" && (
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
                    {[{ name: "الفطور", time: meals.makkah.breakfast }, { name: "الغداء", time: meals.makkah.lunch }].map((m) => (
                      <div key={m.name} className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gold/30">
                        <UtensilsCrossed className="size-5 text-gold-dark" />
                        <div><p className="text-sm font-bold">{m.name}</p><p dir="ltr" className="text-right font-mono text-xs text-hint">{m.time}</p></div>
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

            )}

            {view === "hotels" && (
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
                    {[{ name: "الفطور", time: meals.madinah.breakfast }, { name: "الغداء", time: meals.madinah.lunch }].map((m) => (
                      <div key={m.name} className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-gold/30">
                        <UtensilsCrossed className="size-5 text-gold-dark" />
                        <div><p className="text-sm font-bold">{m.name}</p><p dir="ltr" className="text-right font-mono text-xs text-hint">{m.time}</p></div>
                      </div>
                    ))}
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {PLACES.madinahHotel.features.map((f) => <Badge key={f}>{f}</Badge>)}
                  </ul>
                </div>
              </div>
            </Section>

            )}

            {view === "trip" && (
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

            )}

            {view === "group" && (
            <Section id="group" title={`${groupName(myGroup.number)} — ${myGroup.clusterName}`} icon={<UsersRound className="size-6" />} ready={unlocked.group} lockedHint={LOCK_HINT.group} eyebrow={`${myGroup.office} — مستوى الخدمة: ${myGroup.level}`}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {myGroup.team.map((p, i) => (
                  // One shape for every member of the team: the cards of a row share their height, and the number and
                  // the buttons sit together at the foot, level across the row whatever the length of the note above
                  <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex h-full flex-col rounded-3xl bg-white p-5 ring-1 ring-gold/30">
                    <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark font-display text-2xl font-bold text-ink">{p.name.replace("الشيخ ", "")[0]}</span>
                    <p className="mt-3 truncate text-xs font-bold text-gold-dark">{p.role === "المنسق التقني" ? "منسق التكتل المفروز للمجموعة" : p.role}</p>
                    <p className="truncate font-display text-lg font-bold text-green-dark">{p.name}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">{p.note}</p>
                    <div className="mt-auto pt-4">
                    <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-sm hover:bg-gold-light/60">
                      <span className="text-xs text-hint">الهاتف</span>
                      <span dir="ltr" className="font-mono font-bold tabular-nums text-ink">{p.phone}</span>
                    </a>
                    <div className="mt-2 flex gap-2">
                      <a href={`tel:${p.phone.replace(/\s/g, "")}`} onClick={(e) => { e.preventDefault(); toast({ title: `اتصال بـ ${p.name}`, body: p.phone, icon: "📞" }); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-dark py-2 text-sm font-bold text-white hover:bg-green">
                        <Phone className="size-4" /> اتصال
                      </a>
                      <a href="#" onClick={(e) => { e.preventDefault(); toast({ title: "قناة المجموعة", body: "الرسائل الخاصة متاحة في تطبيق الجوال.", icon: "💬" }); }} className="grid size-9 place-items-center rounded-xl bg-sand text-green-dark hover:bg-gold-light" aria-label="رسالة">
                        <MessageCircle className="size-4" />
                      </a>
                    </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-gold/30">
                <p className="font-display text-lg font-bold text-green-dark">قناة المجموعة</p>
                {/* What the group's team posts from «الميدان», to the whole group or the part of it this family is in */}
                <div className="mt-4 space-y-3">
                  {channel.length === 0 && <p className="rounded-2xl bg-sand p-4 text-sm text-ink-soft">لا رسائل بعد. يصلك هنا كل ما ينشره فريق مجموعتك في قناتها: المواعيد والتجمّعات والتنبيهات.</p>}
                  {channel.map((m, i) => (
                    <motion.div key={m.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 6) * 0.08 }} className="max-w-2xl rounded-3xl rounded-tr-md bg-sand p-4">
                      <p className="text-xs font-bold text-green">
                        {m.by} <span className="font-normal text-hint">— {new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(m.at)}{m.audience !== "المجموعة كاملة" ? ` — ${m.audience}` : ""}</span>
                      </p>
                      <p className="mt-1 leading-7">{m.text}</p>
                    </motion.div>
                  ))}
                </div>
                <Link href="/academy" className="mt-4 inline-flex items-center gap-2 font-bold text-green-dark hover:underline">
                  <BookOpen className="size-4" /> الدروس الدينية قبل السفر في الأكاديمية
                </Link>
              </div>
              <Link href="/portal/application/documents" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-green-dark hover:underline">
                <FileSignature className="size-4" /> عقدكم مع {groupName(myGroup.number)} في «خزنة الوثائق»
              </Link>
            </Section>

            )}

            {/* Rating */}
            {view === "status" && (
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
            )}
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
    </PilgrimShell>
  );
}

/**
 * The visa in «خزنة الوثائق»: once issued, one for every member of the application (each member's below it);
 * until then, the steps it waits for — the passport (after the second payment) and the medical file among them.
 */
function VisaPanel({ app, post, lines }: { app: Application; post: PostAcceptance; lines: ReturnType<typeof costLines> }) {
  // The steps before the visa, as the application's version sets them
  const steps = postStepsOf(usePinnedVersion(app.configVersion, app.season).config);
  const done = stepsDone(post, app, lines, steps);
  const before = steps.filter((st) => st.system !== "visa");
  return (
    <>
      {post.visaAt ? (
        <Card className="flex flex-wrap items-center gap-4 md:p-8">
          <span className="grid size-14 place-items-center rounded-2xl bg-green-dark text-gold">
            <Stamp className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold text-green-dark">صدرت التأشيرة لأفراد طلبكم كلهم</p>
            <p className="text-ink-soft">تأشيرة حج لموسم 1448هـ — {new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(post.visaAt)}. تجدها مع جواز كل فرد وصورته في وثائقه أدناه.</p>
          </div>
        </Card>
      ) : (
        <Card className="md:p-8">
          <p className="font-display text-2xl font-bold text-green-dark">لم تصدر التأشيرة بعد</p>
          <p className="mt-2 leading-8 text-ink-soft">بعد اكتمال هذه الخطوات تصدر تأشيرة كل فرد من وزارة الخارجية السعودية وتصل بالبريد إلى رئيس مجموعتكم، فيضيفها إليكم وتظهر هنا.</p>
          <ul className="mt-5 grid gap-2 md:grid-cols-2">
            {before.map((st) => (
              <li key={st.id} className={cn("flex items-center gap-3 rounded-2xl p-3 text-sm font-bold", done[st.id] ? "bg-green-light/10 text-green" : "bg-sand text-ink-soft")}>
                <span className="text-lg">{done[st.id] ? "✓" : st.emoji}</span> {st.title}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

/** Shown until the cluster head seats the family: the pilgrim never picks a flight himself */
function NoFlightYet({ label }: { label: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-[2rem] border-2 border-dashed border-gold/50 bg-white/60 p-6 text-center">
      <div>
        <p className="font-display text-xl font-bold text-green-dark">{label}: لم تُحدد بعد</p>
        <p className="mt-1 text-sm text-ink-soft">تُحدد رحلتكم حين يضع رئيس التكتل مجموعتكم على إحدى رحلات تكتلكم، فتظهر بطاقتها هنا ويصلك إشعار. المجموعة كلها، ومعها أسرتك، على الرحلة نفسها.</p>
      </div>
    </div>
  );
}
