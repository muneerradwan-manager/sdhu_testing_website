"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CheckCircle2, FastForward, Lock, MapPinned, Plane } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { FLIGHTS, GROUP } from "@/lib/journey";
import { actions, type Application, type PostAcceptance } from "@/lib/store";
import { cn } from "@/lib/utils";
import { coordinatorOf, enrollFamily, groupInfo } from "@/lib/assignment";
import { COORDINATOR_ID, DOCS, STEPS, demoHealth, docKey, medicalDocsFor, medicalKey, recordHealth, stepsDone, type CostLine, type StepKey } from "./model";
import { Pill, StepDone, StepRating, logPilgrim } from "./shared";
import { StepConfirm } from "./step-confirm";
import { StepDocuments } from "./step-documents";
import { MyGroup, StepGroup } from "./step-group";
import { StepMedical } from "./step-medical";
import { SignatureChain, StepPayment } from "./step-payment";
import { StepVisa } from "./step-visa";

const fmt = (at?: number) => (at ? new Intl.DateTimeFormat("ar-SY-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(at) : "");

export function PostChecklist({ app, post, sessionId, lines }: { app: Application; post: PostAcceptance; sessionId: string; lines: CostLine[] }) {
  const toast = useToast();
  const [view, setView] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<StepKey[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);

  const approvedRef = useRef(post.groupApprovedAt);
  const groupRef = useRef(post.groupNumber);

  // Enrollment notice — whether the coordinator enrolled the family from the administrator portal or from the demo button
  useEffect(() => {
    if (post.groupApprovedAt && (!approvedRef.current || groupRef.current !== post.groupNumber)) {
      const info = groupInfo(post.clusterId, post.groupNumber);
      toast({
        title: `أنتم الآن في المجموعة ${info.number}`,
        body: `${info.clusterName}. سجّلكم ${post.enrolledBy?.name ?? coordinatorOf(info).name} ووقّعتم العقد. التالي: الدفعة الثانية.`,
        icon: "🤝",
        tone: "success",
      });
    }
    approvedRef.current = post.groupApprovedAt;
    groupRef.current = post.groupNumber;
  }, [post.groupApprovedAt, post.groupNumber, post.clusterId, post.enrolledBy?.name, toast]);
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
    const documents = Object.fromEntries(app.members.flatMap((m) => DOCS.map((d) => [docKey(m, d.key), "approved" as const])));
    // Demo: the family joins group 27 of Al-Nour through its coordinator سامر نجار
    const info = groupInfo("al-nour", GROUP.number);
    const coordinator = { id: COORDINATOR_ID, name: coordinatorOf(info).name };
    const health = demoHealth(app.members, { id: COORDINATOR_ID, name: `${coordinator.name} (محاكاة)` }, base);
    const payable = lines.filter((l) => l.key !== "i1");
    // Later writes must build on the paid application, or they would drop the first installment again
    const paidApp = app.firstPaid ? app : { ...app, plan: app.plan ?? 2, firstPaid: { amount: lines[0].amount, at: base, receipt: lines[0].receipt } };
    const plan: [number, () => void][] = [
      [0, () => actions.setPost(sessionId, { confirmedAt: post.confirmedAt ?? base })],
      [0, () => paidApp !== app && actions.saveApplication(paidApp)],
      [700, () => actions.setPost(sessionId, { documents })],
      [1400, () => enrollFamily({ sessionId, app: paidApp, post, group: { clusterId: info.clusterId, number: info.number }, coordinator, at: base + 1400 })],
      [2100, () => actions.setPost(sessionId, { payments: Object.fromEntries(payable.map((l) => [l.key, base + 2100])) })],
      [2800, () => recordHealth(sessionId, paidApp, { ...health, confirmedAt: base + 2800 })],
      [3200, () => actions.setPost(sessionId, { medical: Object.fromEntries(app.members.flatMap((m) => medicalDocsFor(m, health).map((d) => [medicalKey(m, d), "approved" as const]))) })],
      [4200, () => actions.setPost(sessionId, { visaAt: base + 4200 })],
    ];    plan.forEach(([at, run]) => setTimeout(run, at));
    setTimeout(() => {
      setDemoRunning(false);
      logPilgrim(app, "إكمال خطوات ما بعد القبول تلقائياً (عرض تجريبي)");
      toast({ title: "اكتملت كل الخطوات", body: "فُتحت الرحلات والفنادق والمخيمات والبطاقات.", icon: "✨", tone: "gold" });
    }, 4400);
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
            <p className="mt-1 text-sm text-white/70">التأكيد والوثائق والتفويج حتى 25 شعبان — الدفعة الثانية عند الانضمام — ثم الملف الطبي</p>
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
        <ol className="relative mt-6 grid grid-cols-6 gap-1">
          <div className="absolute right-[8%] left-[8%] top-6 h-1 rounded-full bg-white/15" />
          <motion.div className="absolute right-[8%] top-6 h-1 rounded-full bg-gold" animate={{ width: `${(Math.max(0, (firstOpen === -1 ? STEPS.length - 1 : firstOpen)) / (STEPS.length - 1)) * 84}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
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
            ) : step.key === "medical" ? (
              <StepMedical {...props} />
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

function DoneScreen({ stepKey, app, post, sessionId, lines, onNext }: { stepKey: StepKey; app: Application; post: PostAcceptance; sessionId: string; lines: CostLine[]; onNext?: () => void }) {
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
        <StepDone title="الصورة والجواز مكتملان" body="اعتمدت إدارة التسجيل الصورة الشخصية والجواز لجميع الأفراد. التالي: مرحلة التفويج — ولا وثائق طبية قبلها." rating={rating} next={nextStep?.title} onNext={onNext}>
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
        <StepDone
          title={`أنتم الآن في المجموعة ${post.groupNumber ?? GROUP.number}`}
          body={`سجّلكم ${post.enrolledBy?.name ?? "منسق المجموعة"} فيها ووقّعتم عقد الحاج مع المجموعة. التالي: الدفعة الثانية.`}
          rating={rating}
          next={nextStep?.title}
          onNext={onNext}
        >
          <SignatureChain app={app} post={post} />
          <MyGroup app={app} post={post} sessionId={sessionId} lines={[]} />
        </StepDone>
      );
    case "payment":
      return (
        <StepDone title="اكتمل دفع المبلغ كاملاً" body="لكل دفعة إيصال مستقل في خزنة الوثائق. التالي: الملف الطبي." rating={rating} next={nextStep?.title} onNext={onNext}>
          <div className="flex flex-wrap justify-center gap-2">
            {lines.map((l) => (
              <Pill key={l.key} className="text-base">
                ✓ {l.title}
              </Pill>
            ))}
          </div>
        </StepDone>
      );
    case "medical":
      return (
        <StepDone title="الملف الطبي مكتمل" body={`سجّل ${post.health?.by.name.replace(" (محاكاة)", "") ?? "منسق المجموعة"} المعلومات الصحية وأكّدتموها، واعتمد الفريق الطبي الوثائق.`} rating={rating} next={nextStep?.title} onNext={onNext}>
          <div className="flex flex-wrap justify-center gap-2">
            {app.members.map((m) => (
              <Pill key={m.person.id} className="text-base">
                ✓ {m.person.firstName}
                {m.needs.length ? ` — ${m.needs.join("، ")}` : ""}
              </Pill>
            ))}
          </div>
        </StepDone>
      );    case "visa":
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
