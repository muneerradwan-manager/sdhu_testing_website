"use client";

import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  CircleX,
  FileCheck2,
  FolderLock,
  Loader2,
  Lock,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/portal/shell";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, StarRating, useToast } from "@/components/ui/widgets";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, type AdminRecord } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import {
  POSITIONS,
  adminReceipt,
  applicantOf,
  docState,
  logAdmin,
  nowMs,
  recordOf,
  previousRating,
  positionLabelOf,
  requirementChecks,
  roleOptions,
  useAdmin,
  type RequirementCheck,
  type RoleOption,
} from "../../_lib/admin";
import { AdminShell, ReceiptCard } from "../../_components/ui";
import { OperationClosed } from "@/components/app/operation-closed";
import { rangeLabel, useOperation } from "@/lib/operations";
import { useCommitments, useDocTypes, useRoleRequirements, useRoles } from "../../_lib/admin-rules";
import { useMyHall } from "../../_lib/halls";
import { DocumentsStep, SkillsStep, attachedDocs, useDemand, useRecord } from "./record";

/**
 * The documents and certificates come first, because they are what opens a role: every role asks for
 * its own certificates in the season's table (set by the administration), some shared with other roles.
 * A role opens only when his file holds everything it requires and it fits who he is (age, gender,
 * experience). Eligibility is then checked against that role BEFORE he pays, so nobody pays a fee for a
 * role he cannot hold.
 */
const STEPS = ["وثائقي وشهاداتي", "لغاتي ومهاراتي", "الصفة", "الالتزامات", "التحقق من الأهلية", "رسم التسجيل"];
const CHECK = 4;
const FEE = 5;

export function AdminApply() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const [showReceipt, setShowReceipt] = useState(false);
  const op = useOperation("admin-registration");

  // A new application waits for the operation to open; one already paid stays to be seen
  const view = !p?.feePaidAt ? (op.open ? "wizard" : "closed") : showReceipt ? "receipt" : "eligible";

  return (
    <AdminShell
      title="التسجيل كإداري في موسم 1448"
      subtitle={`يُفتح باب التسجيل ${rangeLabel(op.start, op.end)}. تحدد الإدارة شروط كل صفة في جدول كل موسم، فتتقدم للصفة التي تناسبك، ويُتحقق من أهليتك قبل الدفع.`}
    >
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
          {view === "closed" && <OperationClosed state={op} text="حسابك الإداري دائم؛ ما يُفتح ويُغلق هو طلب المشاركة في الموسم." />}
          {view === "wizard" && <Wizard onPaid={() => setShowReceipt(true)} />}
          {view === "receipt" && <PaidReceipt onContinue={() => setShowReceipt(false)} />}
          {view === "eligible" && <EligibleSummary />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}

// ───────────────────────── Wizard ─────────────────────────

function Wizard({ onPaid }: { onPaid: () => void }) {
  const admin = useAdmin()!;
  const p = admin.profile;
  const toast = useToast();
  const season = useSeason();
  const fee = season.fees.administratorRegistration;
  // Found eligible in an earlier visit but has not paid yet: straight back to the fee
  const [step, setStep] = useState(p?.eligibleAt ? FEE : 0);
  const roles = useRoles();
  const commitments = useCommitments();
  const table = useRoleRequirements();
  const options = roleOptions(admin.id, season.administrators, roles.map((r) => r.key));
  const [positions, setPositions] = useState<string[]>(p?.positions.length ? [p.positions[0]] : []);
  const [renewal, setRenewal] = useState<"keep" | "change" | "first">(p?.renewal ?? (options.last ? "change" : "first"));
  const [commit, setCommit] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [paying, setPaying] = useState(false);

  // Whoever served before arrives with his documents, languages and skills already in his file
  const { rec } = useRecord();
  const { types, validity } = useDocTypes();
  const attached = attachedDocs(rec, validity);
  const allCommitted = commitments.every((c) => commit[c.key]);
  const applicant = applicantOf(admin.id, admin.person, rec, validity, types);
  const fit = (key: string) => requirementChecks(table, key, applicant);
  const chosen = renewal === "keep" ? options.keep : options.others.find((o) => o.key === positions[0]);
  // A role opens when it fits who he is and his file holds everything it requires
  const opens = (key: string) => fit(key).every((c) => c.ok || c.level === "preferred");
  const { universal } = useDemand();
  const docsReady = universal.every((k) => attached.some((d) => d.key === k));
  const eligible = !!p?.eligibleAt;
  const canNext = [docsReady, rec.languages.length > 0, !!chosen?.ok && opens(chosen.key), allCommitted, eligible, false][step];
  const label = POSITIONS.find((x) => x.key === positions[0])?.label;

  /** The check passed: the application is recorded as eligible, and only the fee is left */
  const onEligible = () => {
    const exempt = renewal === "keep" && !!options.keep?.examExempt;
    actions.upsertAdmin(admin.id, {
      positions,
      renewal,
      examExempt: exempt,
      documents: attached.map((d) => d.key),
      languages: rec.languages,
      skills: rec.skills,
      commitmentsAt: nowMs(),
      eligibleAt: nowMs(),
    });
    logAdmin(admin.id, "اكتمل التحقق من الأهلية قبل الدفع (آلياً)", `الإداري ${admin.id.slice(-3)}`, `الصفة: ${label} (${renewal === "keep" ? `تجديد الصفة نفسها${exempt ? " — معفى من الامتحانين" : ""}` : renewal === "change" ? "صفة جديدة" : "أول موسم"}) — مستوفٍ لشروطها في جدول موسم 1448 — ${attached.length} وثائق سارية من ملفه الدائم (${attached.filter((d) => d.issuedSeason === SEASON.hijriYear).length} محدّثة هذا الموسم) — الموافقة على الالتزامات`, { area: "applicants" });
    toast({ title: `أنت مؤهل لصفة ${label}`, body: `بقي رسم التسجيل (${formatUSD(fee)}) ليُقدَّم طلبك.`, icon: "✅", tone: "success" });
  };

  /** Going back before the check means the application may change: it has to be checked again */
  const back = () => {
    const to = step === FEE ? CHECK - 1 : step - 1;
    if (to < CHECK && p?.eligibleAt) actions.upsertAdmin(admin.id, { eligibleAt: undefined });
    setStep(to);
  };

  const pay = (m: PayMethod) => {
    setMethod(m);
    setPaying(true);
    setTimeout(() => {
      onPaid();
      const receipt = adminReceipt(admin.id, "A");
      actions.upsertAdmin(admin.id, { feePaidAt: Date.now(), receipt });
      logAdmin(admin.id, "التسجيل الموسمي — موسم 1448", `الإداري ${admin.id.slice(-3)}`, `الصفة: ${label} — قُدّم الطلب بعد ثبوت الأهلية`, { area: "applicants" });
      logAdmin(admin.id, "تسديد رسم تسجيل الإداري", receipt, `${formatUSD(fee)} — ${payMethodLabel(m)}`, { area: "applicants" });
      toast({ title: "تم استلام طلبك لموسم 1448", body: `ورسم التسجيل (الإيصال ${receipt}).`, icon: "📨", tone: "success" });
      setPaying(false);
    }, 2300);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_18rem]">
      <Card className="overflow-hidden">
        {/* progress */}
        <div className="mb-8 flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                <motion.div className="h-full bg-maroon" animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
              </div>
              <p className={cn("mt-2 hidden text-xs font-semibold sm:block", i === step ? "text-maroon" : "text-hint")}>{s}</p>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }}>
            {step === 0 && <DocumentsStep />}

            {step === 1 && <SkillsStep />}

            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">صفتك لموسم 1448</h2>
                <p className="mt-2 leading-8 text-ink-soft">
                  صفة واحدة فقط في الموسم. تُفتح لك الصفات بحسب وثائقك وشهاداتك ومهاراتك، وبحسب شروط كل صفة في جدول الإدارة لهذا الموسم (العمر، الجنس، الخبرة): الصفة المقفلة يظهر تحتها ما ينقصك لها. {options.last ? "يمكنك الاستمرار في صفتك السابقة أو التقدم لصفة أخرى." : "هذا أول موسم لك، فتخضع للامتحانين."}
                </p>

                {options.last && (
                  <div className="mt-5 rounded-2xl bg-sand p-4 text-sm">
                    <p className="flex items-center gap-2 font-bold text-green-dark"><ShieldCheck className="size-4" /> آخر موسم شاركت فيه (من سجل المنصة)</p>
                    <p className="mt-1">
                      موسم {options.last.season} — <b>{options.last.role}</b>
                      {options.last.group && ` — ${options.last.group}`}
                      {options.last.rating !== null && <span className="mr-2 rounded-full bg-gold/30 px-2 py-0.5 text-xs font-bold text-maroon">★ {options.last.rating} من 5</span>}
                    </p>
                  </div>
                )}

                {options.keep && (
                  <>
                    <p className="mt-6 text-sm font-bold text-ink">الاستمرار في الصفة نفسها</p>
                    <RoleCard option={options.keep} checks={fit(options.keep.key)} selected={positions[0] === options.keep.key && renewal === "keep"} onSelect={() => { setPositions([options.keep!.key]); setRenewal("keep"); }} exemptBadge />
                  </>
                )}

                <p className="mt-6 text-sm font-bold text-ink">{options.last ? "أو التقدم لصفة أخرى" : "الصفات المتاحة لموسم 1448"}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {options.others.map((o) => (
                    <RoleCard key={o.key} option={o} checks={fit(o.key)} selected={positions[0] === o.key && renewal !== "keep"} onSelect={() => { setPositions([o.key]); setRenewal(options.last ? "change" : "first"); }} />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-hint">
                  الشروط من جدول شروط الصفات لموسم 1448 ومن إعدادات الموسم (أدنى تقييم للاستمرار في الصفة {season.administrators.keepRoleMinRating} من 5). ينقصك شيء لصفة تريدها؟ عد إلى «وثائقي وشهاداتي» أو «لغاتي ومهاراتي» وأكمل ملفك.
                </p>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">التزامات الإداري</h2>
                <p className="mt-2 text-ink-soft">اقرأ كل التزام ووافق عليه. تُحفظ موافقتك مع تاريخها في استمارة التسجيل الموقّعة إلكترونياً.</p>
                <ul className="mt-6 space-y-3">
                  {commitments.map((c, i) => {
                    const on = !!commit[c.key];
                    return (
                      <motion.li key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <label className={cn("flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition", on ? "border-green-dark bg-green-dark/5" : "border-gold/40 bg-white hover:border-gold-dark")}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => setCommit({ ...commit, [c.key]: !on })} />
                          <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold-dark")}>
                            <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-4" /></motion.span>}</AnimatePresence>
                          </span>
                          <span>
                            <span className="block font-bold text-ink">{c.label}</span>
                            <span className="block text-sm leading-6 text-ink-soft">{c.detail}</span>
                          </span>
                        </label>
                      </motion.li>
                    );
                  })}
                </ul>
                <button type="button" onClick={() => setCommit(Object.fromEntries(commitments.map((c) => [c.key, true])))} className="mt-4 text-sm font-semibold text-maroon underline">
                  أوافق على جميع الالتزامات
                </button>
              </div>
            )}

            {step === CHECK && <Eligibility roleKey={positions[0]} renewal={renewal} rec={rec} onEligible={onEligible} />}

            {step === FEE && (
              <div>
                {paying ? (
                  <div className="grid min-h-80 place-items-center text-center">
                    <div>
                      <div className="relative mx-auto size-28">
                        <motion.span className="absolute inset-0 rounded-full border-4 border-gold-light border-t-maroon" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} />
                        <span className="absolute inset-0 grid place-items-center text-maroon"><Lock className="size-10" /></span>
                      </div>
                      <p className="mt-6 font-display text-2xl font-bold text-green-dark">{method === "bank" ? "نطابق إشعار الدفع مع كشف المصرف..." : "نتحقق من العملية في شام كاش..."}</p>
                      <p className="mt-1 text-hint">لا تغلق الصفحة</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Badge tone="green"><BadgeCheck className="size-4" /> مؤهل لصفة {label}</Badge>
                    <h2 className="mt-3 font-display text-2xl font-bold text-green-dark md:text-3xl">رسم تسجيل الإداري: {formatUSD(fee)}</h2>
                    <p className="mt-2 text-ink-soft">ثبتت أهليتك للصفة التي اخترتها، فبقي الرسم ليُقدَّم طلبك. يصدر لك إيصال رقمي، وتظهر استمارة التسجيل موقّعة إلكترونياً في خزنة وثائقك.</p>
                    <div className="my-6 rounded-2xl bg-sand p-5 text-sm">
                      <div className="flex justify-between py-1"><span className="text-ink-soft">رسم تسجيل الإداري — موسم 1448</span><span className="font-bold">{formatUSD(fee)}</span></div>
                      <div className="flex justify-between border-t border-gold-light py-1 pt-2"><span className="font-bold">الإجمالي</span><span className="font-display text-xl font-bold text-maroon">{formatUSD(fee)}</span></div>
                    </div>
                    <PayMethods amount={fee} reference={adminReceipt(admin.id, "A")} bankReference={adminReceipt(admin.id, "A").replace("A", "BANK")} cta="ادفع وقدّم الطلب —" onConfirm={pay} />
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {!paying && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gold-light pt-6">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowRight className="size-4" /> {step === FEE ? "تعديل الطلب" : "السابق"}
            </Button>
            {step < FEE ? (
              <Button size="lg" onClick={() => setStep(step + 1)} disabled={!canNext}>
                {step === CHECK - 1 ? "تحقق من أهليتي" : step === CHECK ? "إلى رسم التسجيل" : "التالي"} <ArrowLeft className="size-5" />
              </Button>
            ) : (
              <span className="text-sm text-hint">اختر طريقة الدفع في الأعلى</span>
            )}
          </div>
        )}
      </Card>

      <aside className="space-y-4 lg:sticky lg:top-28">
        <div className="rounded-3xl border border-gold/30 bg-white p-5">
          <p className="text-sm font-bold text-green-dark">ملخص طلبك</p>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-hint">وثائق ملفك</dt>
              <dd className="font-bold">
                {attached.length} سارية
                {rec.documents.length > attached.length && <span className="mr-1 font-normal text-maroon">— {rec.documents.length - attached.length} تحتاج تحديثاً</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-hint">الصفة لموسم 1448</dt>
              <dd className="mt-1 flex flex-wrap gap-1">{positions[0] ? <Badge tone="maroon">{label}{renewal === "keep" ? " — تجديد" : ""}</Badge> : <span className="text-sm text-hint">لم تُحدَّد</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-hint">الالتزامات</dt>
              <dd className="font-bold">{eligible ? commitments.length : commitments.filter((c) => commit[c.key]).length} من {commitments.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-hint">الأهلية</dt>
              <dd className={cn("font-bold", eligible ? "text-green" : "text-hint")}>{eligible ? "مؤهل — بقي الرسم" : "تُفحص قبل الدفع"}</dd>
            </div>
          </dl>
        </div>
        <p className="rounded-3xl bg-green-dark/6 p-4 text-sm leading-6 text-green-dark">
          لا تدفع رسماً عن صفة لا تستوفي شروطها: تتحقق المنصة من أهليتك قبل الدفع. من يجدد الصفة نفسها بتقييم مستوفٍ يُعفى من الامتحانين؛ ومن يتقدم لصفة جديدة أو لأول مرة يخضع للامتحانين الكتابي والشفهي.
        </p>
      </aside>
    </div>
  );
}

// ───────────────────────── After payment ─────────────────────────

function PaidReceipt({ onContinue }: { onContinue: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const [stars, setStars] = useState(0);
  const p = admin.profile!;
  return (
    <Card className="text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }} className="mx-auto grid size-20 place-items-center rounded-full bg-green-light text-white shadow-xl shadow-green-light/30">
        <BadgeCheck className="size-10" />
      </motion.div>
      <h2 className="mt-5 font-display text-3xl font-bold text-green-dark">تم استلام طلب مشاركتك</h2>
      <p className="mx-auto mt-2 max-w-lg leading-8 text-ink-soft">قُدّم طلبك لصفة {positionLabelOf(p.positions[0] ?? "")} بعد ثبوت أهليتك لها. نسخة من استمارة التسجيل الموقّعة إلكترونياً في خزنة وثائقك.</p>
      <div className="mt-8">
        <ReceiptCard receipt={p.receipt!} item="رسم تسجيل الإداري — موسم 1448" amount={season.fees.administratorRegistration} lines={[["الاسم", admin.name]]} />
      </div>
      <div className="mx-auto mt-8 max-w-md rounded-3xl border border-gold/40 bg-sand p-5">
        <p className="font-bold">كيف تقيّم سهولة تقديم طلب المشاركة ودفع الرسم؟</p>
        <div className="mt-3 flex justify-center">
          <StarRating
            value={stars}
            size="lg"
            onChange={(v) => {
              setStars(v);
              logAdmin(admin.id, "تقييم مرحلة طلب المشاركة", "تجربة الإداري", `${v} من 5`);
              toast({ title: "شكراً لتقييمك", icon: "⭐", tone: "gold" });
            }}
          />
        </div>
      </div>
      <Button size="xl" variant="gold" className="mt-8" onClick={onContinue}>
        متابعة <ArrowLeft className="size-6" />
      </Button>
    </Card>
  );
}

/**
 * The eligibility lines for one role: whether the role is open to him (renewal, rating, gap), then the
 * role's column in the season's requirements table applied to his file, then the general conditions.
 * `open` limits the roles to those open for application now (left out once he has paid).
 */
function useEligibilityRows(roleKey: string | undefined, renewal: "keep" | "change" | "first" | undefined, rec: AdminRecord, open?: string[]) {
  const admin = useAdmin()!;
  const season = useSeason();
  const table = useRoleRequirements();
  const options = roleOptions(admin.id, season.administrators, open);
  const option = renewal === "keep" ? options.keep : options.others.find((o) => o.key === roleKey);
  const prev = previousRating(admin.id);
  const min = season.administrators.keepRoleMinRating;
  const { types, validity } = useDocTypes();
  const checks = requirementChecks(table, roleKey ?? "", applicantOf(admin.id, admin.person, rec, validity, types));
  const rows: { k: string; v: string; ok: boolean; plus?: boolean }[] = [
    { k: `الصفة لموسم 1448: ${option?.label ?? positionLabelOf(roleKey ?? "")} — ${renewal === "keep" ? "تجديد الصفة نفسها" : renewal === "first" ? "أول موسم" : "صفة جديدة"}`, v: option?.reason ?? "الصفة مغلقة هذا الموسم", ok: !!option?.ok },
    ...checks.filter((c) => c.level !== "preferred").map((c) => ({ k: c.k, v: c.v, ok: c.ok })),
    ...(renewal === "keep" ? [{ k: `تقييم الموسم السابق لا يقل عن ${min}`, v: `${prev ?? "—"}`, ok: prev !== null && prev >= min }] : []),
    { k: "لم يُستبعد تأديبياً سابقاً", v: "لا", ok: true },
    // What only strengthens the application is shown, never held against him
    ...checks.filter((c) => c.level === "preferred").map((c) => ({ k: `يقوّي الطلب: ${c.k}`, v: c.ok ? "في ملفك" : "ليست في ملفك — لا تمنع الطلب", ok: c.ok, plus: true })),
  ];
  return rows;
}

/** The check itself, run inside the application before the fee: one line after another, then the verdict */
function Eligibility({ roleKey, renewal, rec, onEligible }: { roleKey: string | undefined; renewal: "keep" | "change" | "first"; rec: AdminRecord; onEligible: () => void }) {
  const admin = useAdmin()!;
  const roles = useRoles();
  const rows = useEligibilityRows(roleKey, renewal, rec, roles.map((r) => r.key));
  const [checked, setChecked] = useState(0);
  const wrote = useRef(false);
  const allOk = rows.every((r) => r.ok || r.plus);
  const failing = rows.filter((r) => !r.ok && !r.plus).map((r) => r.k).join(" — ");
  const finished = checked >= rows.length;
  const eligible = !!admin.profile?.eligibleAt;

  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setChecked((c) => c + 1), 650);
    return () => clearTimeout(t);
  }, [checked, finished]);

  // Once per check: record the verdict (no timer here, so a re-render cannot cancel it)
  useEffect(() => {
    if (!finished || wrote.current) return;
    wrote.current = true;
    if (!allOk) {
      logAdmin(admin.id, "التحقق من الأهلية قبل الدفع — لم يستوفِ", `الإداري ${admin.id.slice(-3)}`, failing, { area: "applicants" });
      return;
    }
    onEligible();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 }, colors: ["#D9C89E", "#672146", "#00594F"] });
  }, [finished, allOk, failing, admin.id, onEligible]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{finished ? (allOk ? "مستوفٍ لجميع الشروط" : "لم تستوفِ بعض الشروط") : "نطبّق شروط الصفة على ملفك..."}</h2>
          <p className="mt-1 text-ink-soft">قبل الدفع: شروط صفتك ووثائقها من جدول شروط الصفات لموسم 1448، وشروط الموسم العامة. ما يقوّي الطلب يظهر بنجمة ولا يمنع التقديم.</p>
        </div>
        {!finished && <Loader2 className="size-8 animate-spin text-maroon" />}
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-gold/40">
        <table className="w-full text-right text-sm">
          <thead className="bg-green-dark text-white">
            <tr>
              <th className="p-4 font-bold">الشرط</th>
              <th className="p-4 font-bold">حالتك</th>
              <th className="w-20 p-4 text-center font-bold">النتيجة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const state = i < checked ? "done" : i === checked ? "active" : "idle";
              return (
                <motion.tr key={r.k} animate={{ opacity: state === "idle" ? 0.35 : 1, backgroundColor: state === "active" ? "rgba(217,200,158,.25)" : "rgba(255,255,255,1)" }} className="border-t border-gold-light">
                  <td className="p-4 font-semibold text-ink">{r.k}</td>
                  <td className="p-4 text-ink-soft">{state === "idle" ? <span className="skeleton inline-block h-3 w-24 rounded" /> : r.v}</td>
                  <td className="p-4 text-center">
                    {state === "done" ? (
                      <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} className="inline-flex">
                        {r.plus ? r.ok ? <Star className="size-7 fill-gold text-gold-dark" /> : <span className="text-lg text-hint">—</span> : r.ok ? <CircleCheck className="size-7 text-green-light" /> : <CircleX className="size-7 text-maroon" />}
                      </motion.span>
                    ) : state === "active" ? (
                      <Loader2 className="mx-auto size-6 animate-spin text-gold-dark" />
                    ) : null}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AnimatePresence>
        {finished && !allOk && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-start gap-3 rounded-2xl bg-maroon/8 p-5 text-maroon">
            <X className="mt-0.5 size-5 shrink-0" />
            <p className="leading-7">لا يُطلب منك أي رسم. ارجع وأكمل ملفك أو اختر صفة تستوفي شروطها، ثم أعد التحقق.</p>
          </motion.div>
        )}
        {finished && allOk && eligible && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex items-start gap-3 rounded-2xl bg-green-light/10 p-5 text-green-dark">
            <BadgeCheck className="mt-0.5 size-5 shrink-0" />
            <p className="leading-7">ثبتت أهليتك. تابع إلى رسم التسجيل ليُقدَّم طلبك.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EligibleSummary() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const rows = useEligibilityRows(p.positions[0], p.renewal, recordOf(p, admin.id));
  const hall = useMyHall(admin.id, p);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="relative overflow-hidden">
        <div className="bg-pattern-dark absolute inset-0" />
        <div className="relative">
          <Badge tone="green" className="text-sm"><BadgeCheck className="size-4" /> {p.examExempt ? "جُدّدت صفتك — معفى من الامتحانين" : "مؤهل للامتحان الكتابي"}</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold text-green-dark md:text-4xl">{p.examExempt ? `جُدّدت صفتك يا ${admin.person.firstName}` : `طلبك مقدَّم يا ${admin.person.firstName}`}</h2>
          <p className="mt-3 max-w-xl leading-8 text-ink-soft">
            {p.examExempt
              ? `الصفة نفسها التي شغلتها الموسم الماضي بتقييم مستوفٍ، فلا امتحان هذا الموسم وفق شروط الإدارة. رسم الموسم مسدد، وتنتقل مباشرة إلى ${positionLabelOf(p.positions[0]) === "رئيس مجموعة" ? "طلب تشكيل المجموعة (برسمه)" : "التعيين في مجموعتك"}.`
              : <>أنت مؤهل لصفة <b>{positionLabelOf(p.positions[0] ?? "")}</b> والرسم مسدد. امتحانك الكتابي: <b>{hall.session?.date}، الساعة {hall.session?.time}</b>، في <b>{hall.center ? `${hall.center.name} — ${hall.center.hall}` : "المركز الامتحاني الذي تُسندك إليه إدارة الامتحانات"}</b>، جماعياً مع كل المتقدمين لصفتك. احضر بهويتك، وتفتح حسابك في القاعة بإشراف مشرفها.</>}
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {rows.filter((r) => r.ok).map((r) => (
              <li key={r.k} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
                {r.plus ? <Star className="size-5 shrink-0 fill-gold text-gold-dark" /> : <CircleCheck className="size-5 shrink-0 text-green-light" />} <span className="truncate">{r.k}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
              <CircleCheck className="size-5 shrink-0 text-green-light" /> <span className="truncate">رسم موسم 1448 مسدد — {p.receipt}</span>
            </li>
          </ul>
          <ButtonLink href={p.examExempt ? "/administrator/group" : "/administrator/exam"} size="xl" variant="gold" className="mt-8">
            {p.examExempt ? "متابعة إلى مجموعتي" : "قاعتي وموعد امتحاني"} <ArrowLeft className="size-6" />
          </ButtonLink>
        </div>
      </Card>
      <Card className="md:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark"><FolderLock className="size-5 text-gold-dark" /> خزنة الوثائق</h3>
        <ul className="mt-4 space-y-2 text-sm">
          {[
            { t: "استمارة التسجيل — موقّعة إلكترونياً", s: "مؤرشفة" },
            { t: `إيصال ${p.receipt}`, s: "مسدد" },
            ...recordOf(p, admin.id).documents.filter((d) => docState(d).ok).map((d) => ({ t: d.label, s: "مقبولة" })),
          ].map((d) => (
            <li key={d.t} className="flex items-center justify-between gap-2 rounded-xl border border-gold/30 px-3 py-2.5">
              <span className="flex items-center gap-2"><FileCheck2 className="size-4 text-green" /> {d.t}</span>
              <Badge tone="green">{d.s}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-hint">الصفة لموسم 1448: {positionLabelOf(p.positions[0] ?? "")}{p.renewal === "keep" ? " — تجديد" : ""}</p>
      </Card>
    </div>
  );
}

/**
 * One role with the administration's verdict on it. It opens only when it fits who he is (age, gender,
 * experience, renewal rules) and his file holds everything it requires; otherwise it is locked with what
 * he misses and where to add it. What only strengthens the application is shown, never held against him.
 */
function RoleCard({ option, checks, selected, onSelect, exemptBadge }: { option: RoleOption; checks: RequirementCheck[]; selected: boolean; onSelect: () => void; exemptBadge?: boolean }) {
  const pos = useRoles().find((x) => x.key === option.key) ?? POSITIONS.find((x) => x.key === option.key);
  const missing = checks.filter((c) => c.level !== "preferred" && !c.ok);
  const met = checks.filter((c) => c.level !== "preferred" && c.ok);
  const preferred = checks.filter((c) => c.level === "preferred");
  const fits = option.ok && missing.length === 0;
  const badge = !option.ok ? "غير متاح" : missing.length ? "مقفلة" : exemptBadge && option.examExempt ? "معفى من الامتحانين" : "بالامتحانين";
  return (
    <button
      type="button"
      disabled={!fits}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "mt-2 flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-right transition disabled:cursor-not-allowed",
        selected ? "border-maroon bg-maroon/5 shadow-lg" : fits ? "border-gold/40 bg-white hover:border-gold-dark" : "border-dashed border-maroon/30 bg-sand/50",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", selected ? "bg-maroon text-gold" : fits ? "bg-sand text-green-dark" : "bg-maroon/10 text-maroon")}>
        {fits ? <Check className="size-5" /> : <Lock className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("font-bold", fits ? "text-ink" : "text-ink-soft")}>{option.label}</span>
          <Badge tone={!fits ? "maroon" : option.examExempt && exemptBadge ? "green" : "gold"}>{badge}</Badge>
        </span>
        {pos && <span className="block text-xs text-ink-soft">{pos.desc}</span>}
        {!option.ok ? (
          <span className="mt-1 block text-xs leading-5 text-maroon">{option.reason}</span>
        ) : missing.length ? (
          <span className="mt-1.5 block space-y-1">
            {missing.map((c) => (
              <span key={c.id} className="flex items-start gap-1.5 text-xs leading-5 text-maroon">
                <CircleX className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <b>{c.k}</b> — {c.v}
                  {c.fix && <span className="text-ink-soft"> ({c.fix})</span>}
                </span>
              </span>
            ))}
          </span>
        ) : (
          <span className="mt-1 block space-y-0.5 text-xs leading-5">
            <span className="block text-green">
              {option.reason}
              {met.length > 0 && ` — تستوفي: ${met.map((c) => c.k).join("، ")}`}
            </span>
            {preferred.length > 0 && (
              <span className="block text-ink-soft">
                <b className="text-ink">تقوّي الطلب:</b> {preferred.map((c) => `${c.ok ? "✓ " : ""}${c.k}`).join("، ")}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}
