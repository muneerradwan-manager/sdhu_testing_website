"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2, FastForward, Lock, MapPinned, Plane } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { FLIGHTS, GROUP } from "@/lib/journey";
import { actions, useStore, type Application, type PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DOCS, LEADER_ID, STEPS, docKey, docRequirement, stepsDone, type CostLine, type StepKey } from "./model";
import { Pill, StepDone, StepRating, logPilgrim } from "./shared";
import { StepConfirm } from "./step-confirm";
import { StepDocuments } from "./step-documents";
import { MyGroup, StepGroup } from "./step-group";
import { SignatureChain, StepPayment } from "./step-payment";
import { StepVisa } from "./step-visa";

/** Demo fallback: without a decision from /administrator/requests, the leader "approves" after this */
const AUTO_APPROVE_MS = 10_000;

const fmt = (at?: number) => (at ? new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(at) : "");

export function PostChecklist({ app, post, sessionId, lines }: { app: Application; post: PostAcceptance; sessionId: string; lines: CostLine[] }) {
  const toast = useToast();
  const [view, setView] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<StepKey[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);

  const admins = useStore((s) => s.admins);
  const approvedRef = useRef(post.groupApprovedAt);
  const joinRejected = useMemo(() => Object.values(admins).some((a) => a.joinDecisions?.[sessionId] === "rejected"), [admins, sessionId]);

  // Demo fallback — lives here (not in the step) so it keeps running while the pilgrim browses other steps
  useEffect(() => {
    if (!post.groupRequestedAt || post.groupApprovedAt || joinRejected) return;
    const t = setTimeout(() => {
      actions.setPost(sessionId, { groupApprovedAt: Date.now() });
      // Keep the administrator portal's roster in step — only if Ahmed already has a profile there
      const leader = admins[LEADER_ID];
      if (leader) actions.upsertAdmin(LEADER_ID, { joinDecisions: { ...leader.joinDecisions, [sessionId]: "accepted" } });
      actions.logEvent({
        actor: "أحمد سليمان الحمصي (محاكاة)",
        role: "رئيس مجموعة",
        action: "قبول طلب انتساب",
        target: `المجموعة ${post.groupNumber ?? GROUP.number}`,
        detail: `طلب ${app.number} — ${app.members.length} أفراد`,
      });
    }, Math.max(0, post.groupRequestedAt + AUTO_APPROVE_MS - Date.now()));
    return () => clearTimeout(t);
  }, [post.groupRequestedAt, post.groupApprovedAt, post.groupNumber, joinRejected, sessionId, app.number, app.members.length, admins]);

  // Approval notice — whether it came from the administrator portal or from the fallback
  useEffect(() => {
    if (post.groupApprovedAt && !approvedRef.current && post.groupRequestedAt) {
      toast({
        title: `تمت الموافقة على انتسابكم إلى المجموعة ${post.groupNumber ?? GROUP.number}`,
        body: "رئيس مجموعتكم: أحمد سليمان. سدّدوا التكاليف ووقّعوا العقد من 1 إلى 15 رمضان.",
        icon: "🤝",
        tone: "success",
      });
    }
    approvedRef.current = post.groupApprovedAt;
  }, [post.groupApprovedAt, post.groupRequestedAt, post.groupNumber, toast]);

  const done = stepsDone(post, app, lines);
  const firstOpen = STEPS.findIndex((s) => !done[s.key]);
  const auto = STEPS.findIndex((s) => !done[s.key] || (post.ratings[s.key] === undefined && !dismissed.includes(s.key)));
  const shown = view ?? (auto === -1 ? STEPS.length - 1 : auto);
  const step = STEPS[shown];
  const reachable = (i: number) => firstOpen === -1 || i <= firstOpen;
  const doneCount = STEPS.filter((s) => done[s.key]).length;
  const props = { app, post, sessionId, lines };

  const next = () => {
    setDismissed((d) => (d.includes(step.key) ? d : [...d, step.key]));
    setView(null);
  };

  const runDemo = () => {
    setDemoRunning(true);
    setView(null);
    setDismissed(STEPS.slice(0, -1).map((s) => s.key));
    const base = Date.now();
    const documents = Object.fromEntries(app.members.flatMap((m) => DOCS.filter((d) => docRequirement(m, d.key) !== "none").map((d) => [docKey(m, d.key), "approved" as const])));
    const plan: [number, Partial<PostAcceptance>][] = [
      [0, { confirmedAt: post.confirmedAt ?? base }],
      [700, { documents }],
      [1400, { clusterId: "al-nour", groupNumber: GROUP.number, groupRequestedAt: post.groupRequestedAt ?? base + 1400, groupApprovedAt: base + 1400 }],
      [2100, { payments: Object.fromEntries(lines.map((l) => [l.key, base + 2100])) }],
      [2800, { contractSignedAt: base + 2800 }],
      [3500, { visaAt: base + 3500 }],
    ];
    plan.forEach(([at, patch]) => setTimeout(() => actions.setPost(sessionId, patch), at));
    setTimeout(() => {
      setDemoRunning(false);
      logPilgrim(app, "إكمال خطوات ما بعد القبول تلقائياً (عرض تجريبي)");
      toast({ title: "اكتملت كل الخطوات", body: "فُتحت الرحلات والفنادق والمخيمات والبطاقات.", icon: "✨", tone: "gold" });
    }, 3700);
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-gold/30 bg-white shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)]">
      {/* Header */}
      <div className="relative bg-green-dark px-5 py-6 text-white md:px-10">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-gold">الخطوات المطلوبة الآن</p>
            <p className="font-display text-2xl font-bold md:text-3xl">
              أكملت {doneCount} من {STEPS.length} خطوات
            </p>
            <p className="mt-1 text-sm text-white/70">التأكيد والأوراق والمجموعة حتى 25 شعبان — التسديد من 1 إلى 15 رمضان</p>
          </div>
          {firstOpen !== -1 && (
            <button
              type="button"
              disabled={demoRunning}
              onClick={runDemo}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
            >
              <FastForward className={cn("size-4", demoRunning && "animate-pulse")} /> إكمال كل الخطوات تلقائياً (للعرض)
            </button>
          )}
        </div>

        {/* Stepper */}
        <ol className="relative mt-6 grid grid-cols-5 gap-1">
          <div className="absolute right-[10%] left-[10%] top-6 h-1 rounded-full bg-white/15" />
          <motion.div className="absolute right-[10%] top-6 h-1 rounded-full bg-gold" animate={{ width: `${(Math.max(0, (firstOpen === -1 ? STEPS.length - 1 : firstOpen)) / (STEPS.length - 1)) * 80}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
          {STEPS.map((s, i) => {
            const ok = done[s.key];
            const current = i === shown;
            const canOpen = reachable(i);
            return (
              <li key={s.key} className="relative flex flex-col items-center text-center">
                <button
                  type="button"
                  disabled={!canOpen}
                  onClick={() => setView(i)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "relative z-10 grid size-12 place-items-center rounded-full border-4 text-xl transition-all duration-500 disabled:cursor-not-allowed md:size-13",
                    ok ? "border-green-dark bg-green-light text-white" : current ? "border-green-dark bg-gold text-ink" : "border-green-dark bg-white/15 text-white/60",
                    current && "scale-110 ring-4 ring-gold/40",
                  )}
                >
                  {ok ? <CheckCircle2 className="size-6" /> : canOpen ? s.emoji : <Lock className="size-4" />}
                  {current && !ok && <span className="absolute inset-0 animate-ping rounded-full bg-gold/40" />}
                </button>
                <span className={cn("mt-2 text-[11px] font-bold leading-4 md:text-sm", ok || current ? "text-white" : "text-white/50")}>{s.title}</span>
                <span className="mt-0.5 hidden text-xs text-white/50 md:block">{s.short}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Panel */}
      <div className="p-5 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div key={`${step.key}-${done[step.key]}`} initial={{ opacity: 0, y: 20, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
            {done[step.key] ? (
              <DoneScreen stepKey={step.key} {...props} onNext={shown < STEPS.length - 1 ? next : undefined} />
            ) : step.key === "confirm" ? (
              <StepConfirm {...props} />
            ) : step.key === "documents" ? (
              <StepDocuments {...props} />
            ) : step.key === "group" ? (
              <StepGroup {...props} />
            ) : step.key === "payment" ? (
              <StepPayment {...props} />
            ) : (
              <StepVisa {...props} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DoneScreen({ stepKey, app, post, sessionId, onNext }: { stepKey: StepKey; app: Application; post: PostAcceptance; sessionId: string; lines: CostLine[]; onNext?: () => void }) {
  const idx = STEPS.findIndex((s) => s.key === stepKey);
  const s = STEPS[idx];
  const nextStep = STEPS[idx + 1];
  const rating = <StepRating stepKey={stepKey} question={s.question} post={post} sessionId={sessionId} app={app} />;

  switch (stepKey) {
    case "confirm":
      return (
        <StepDone title="تم تأكيد قبولك" body={`حالة الطلب: مؤكَّد. وقّعت على التعليمات الرسمية الساعة ${fmt(post.confirmedAt)}.`} rating={rating} next={nextStep?.title} onNext={onNext} />
      );
    case "documents":
      return (
        <StepDone title="الأوراق مكتملة" body="اعتمدت إدارة التسجيل والفريق الطبي وثائق جميع الأفراد." rating={rating} next={nextStep?.title} onNext={onNext}>
          <div className="flex flex-wrap justify-center gap-2">
            {app.members.map((m) => (
              <Pill key={m.person.id} className="text-base">
                ✓ {m.person.firstName}
              </Pill>
            ))}
          </div>
        </StepDone>
      );
    case "group":
      return (
        <StepDone title={`أنتم الآن في المجموعة ${post.groupNumber ?? GROUP.number}`} body="وافق رئيس المجموعة أحمد سليمان على انتسابكم. التالي: التسديد وتوقيع العقد." rating={rating} next={nextStep?.title} onNext={onNext}>
          <MyGroup app={app} groupNumber={post.groupNumber ?? GROUP.number} clusterId={post.clusterId} />
        </StepDone>
      );
    case "payment":
      return (
        <StepDone title="مسدَّد وموقّع العقد" body="صدرت 3 إيصالات مستقلة، والعقد في خزنة الوثائق." rating={rating} next={nextStep?.title} onNext={onNext}>
          <SignatureChain app={app} post={post} />
        </StepDone>
      );
    case "visa":
      return (
        <StepDone title="صدرت التأشيرات — رحلتكم جاهزة" body={`الذهاب: ${FLIGHTS.outbound.hijri} الساعة ${FLIGHTS.outbound.departure} — الرحلة ${FLIGHTS.outbound.code}. فُتحت الآن كل تفاصيل الرحلة في الأسفل.`} rating={rating}>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-4 rounded-3xl bg-sand p-5">
              <Plane className="size-10 shrink-0 text-green-dark" />
              <div>
                <p className="font-display text-xl font-bold text-green-dark">
                  {FLIGHTS.outbound.from.city} ← {FLIGHTS.outbound.to.city} — {FLIGHTS.outbound.departure}
                </p>
                <p className="text-ink-soft">الحضور إلى المطار {FLIGHTS.outbound.airportAt} — {FLIGHTS.outbound.gathering}</p>
              </div>
            </div>
            <ButtonLink href="/portal/season" size="xl" variant="gold" className="shadow-xl">
              <MapPinned className="size-6" /> افتح «حالتي الآن» <ArrowLeft className="size-6" />
            </ButtonLink>
          </div>
        </StepDone>
      );
  }
}
