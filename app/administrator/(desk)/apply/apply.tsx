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
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/portal/shell";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, StarRating, useToast } from "@/components/ui/widgets";
import { ageOf } from "@/lib/registry";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import {
  COMMITMENTS,
  POSITIONS,
  adminReceipt,
  docState,
  logAdmin,
  recordOf,
  previousRating,
  positionLabelOf,
  roleOptions,
  seasonHistory,
  useAdmin,
  type RoleOption,
} from "../../_lib/admin";
import { AdminShell, ReceiptCard } from "../../_components/ui";
import { DocumentsStep, REQUIRED_DOCS, SkillsStep, attachedDocs, useRecord } from "./record";

const STEPS = ["الصفة", "وثائقي", "لغاتي ومهاراتي", "الالتزامات", "رسم التسجيل"];

export function AdminApply() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const [showReceipt, setShowReceipt] = useState(false);

  const view = p?.eligibleAt ? "eligible" : p?.feePaidAt && !showReceipt ? "checking" : p?.feePaidAt ? "receipt" : "wizard";

  return (
    <AdminShell
      title="طلب المشاركة في موسم 1448"
      subtitle="يُفتح باب التقدم من 10 ربيع الأول حتى 1 ربيع الآخر. تدير الإدارة قائمة الصفات والشروط، وتُطبَّق آلياً على طلبك."
    >
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
          {view === "wizard" && <Wizard onPaid={() => setShowReceipt(true)} />}
          {view === "receipt" && <PaidReceipt onContinue={() => setShowReceipt(false)} />}
          {view === "checking" && <Eligibility />}
          {view === "eligible" && <EligibleSummary />}
        </motion.div>
      </AnimatePresence>
    </AdminShell>
  );
}

// ───────────────────────── Wizard ─────────────────────────

function Wizard({ onPaid }: { onPaid: () => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const season = useSeason();
  const fee = season.fees.administratorRegistration;
  const [step, setStep] = useState(0);
  const options = roleOptions(admin.id, season.administrators);
  const [positions, setPositions] = useState<string[]>(admin.profile?.positions.length ? [admin.profile.positions[0]] : []);
  const [renewal, setRenewal] = useState<"keep" | "change" | "first">(admin.profile?.renewal ?? (options.last ? "change" : "first"));
  const [commit, setCommit] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [paying, setPaying] = useState(false);

  // Whoever served before arrives with his documents, languages and skills already in his file
  const { rec } = useRecord();
  const attached = attachedDocs(rec);
  const docsReady = REQUIRED_DOCS.every((k) => attached.some((d) => d.key === k));
  const allCommitted = COMMITMENTS.every((c) => commit[c.key]);
  const chosen = renewal === "keep" ? options.keep : options.others.find((o) => o.key === positions[0]);
  const canNext = [!!chosen?.ok, docsReady, rec.languages.length > 0, allCommitted, false][step];

  const pay = (m: PayMethod) => {
    setMethod(m);
    setPaying(true);
    setTimeout(() => {
      onPaid();
      const now = Date.now();
      const receipt = adminReceipt(admin.id, "A");
      const documents = attached.map((d) => d.key);
      const exempt = renewal === "keep" && !!options.keep?.examExempt;
      actions.upsertAdmin(admin.id, {
        positions,
        renewal,
        examExempt: exempt,
        documents,
        languages: rec.languages,
        skills: rec.skills,
        commitmentsAt: now,
        feePaidAt: now,
        receipt,
      });
      const label = POSITIONS.find((x) => x.key === positions[0])?.label;
      logAdmin(admin.id, "التسجيل الموسمي — موسم 1448", `الإداري ${admin.id.slice(-3)}`, `الصفة: ${label} (${renewal === "keep" ? `تجديد الصفة نفسها${exempt ? " — معفى من الامتحانين" : ""}` : renewal === "change" ? "صفة جديدة" : "أول موسم"}) — ${documents.length} وثائق من ملفه الدائم (${attached.filter((d) => d.issuedSeason === SEASON.hijriYear).length} محدّثة هذا الموسم) — الموافقة على الالتزامات`);
      logAdmin(admin.id, "تسديد رسم تسجيل الإداري", receipt, `${formatUSD(fee)} — ${payMethodLabel(m)}`);
      toast({ title: "تم استلام تسجيلك لموسم 1448", body: `ورسم التسجيل (الإيصال ${receipt}). سيتم التحقق من الأهلية حتى 10 ربيع الآخر.`, icon: "📨", tone: "success" });
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
            {step === 0 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">صفتك لموسم 1448</h2>
                <p className="mt-2 leading-8 text-ink-soft">
                  التسجيل يتجدد كل موسم برسمه، وصفة واحدة فقط في الموسم. {options.last ? "يمكنك الاستمرار في صفتك السابقة أو التقدم لصفة أخرى، وكلاهما بشروط تحددها الإدارة." : "هذا أول موسم لك، فتختار صفة واحدة وتخضع للامتحانين."}
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
                    <RoleCard option={options.keep} selected={positions[0] === options.keep.key && renewal === "keep"} onSelect={() => { setPositions([options.keep!.key]); setRenewal("keep"); }} badge={options.keep.ok ? (options.keep.examExempt ? "معفى من الامتحانين" : "بالامتحانين") : "غير متاح"} />
                  </>
                )}

                <p className="mt-6 text-sm font-bold text-ink">{options.last ? "أو التقدم لصفة أخرى" : "الصفات المتاحة لموسم 1448"}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {options.others.map((o) => (
                    <RoleCard key={o.key} option={o} selected={positions[0] === o.key && renewal !== "keep"} onSelect={() => { setPositions([o.key]); setRenewal(options.last ? "change" : "first"); }} badge={o.ok ? "بالامتحانين" : "غير متاح"} />
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-hint">الشروط من إعدادات الموسم: أدنى تقييم للاستمرار في الصفة {season.administrators.keepRoleMinRating} من 5، ورئاسة التكتل تشترط {season.administrators.clusterHeadSeasons} مواسم رئيساً أو معاوناً.</p>
              </div>
            )}
            {step === 1 && <DocumentsStep />}

            {step === 2 && <SkillsStep />}

            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">التزامات الإداري</h2>
                <p className="mt-2 text-ink-soft">اقرأ كل التزام ووافق عليه. تُحفظ موافقتك مع تاريخها في استمارة التسجيل الموقّعة إلكترونياً.</p>
                <ul className="mt-6 space-y-3">
                  {COMMITMENTS.map((c, i) => {
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
                <button type="button" onClick={() => setCommit(Object.fromEntries(COMMITMENTS.map((c) => [c.key, true])))} className="mt-4 text-sm font-semibold text-maroon underline">
                  أوافق على جميع الالتزامات
                </button>
              </div>
            )}

            {step === 4 && (
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
                    <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">رسم تسجيل الإداري: {formatUSD(fee)}</h2>
                    <p className="mt-2 text-ink-soft">يصدر لك إيصال رقمي، وتظهر استمارة التسجيل موقّعة إلكترونياً في خزنة وثائقك.</p>
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
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              <ArrowRight className="size-4" /> السابق
            </Button>
            {step < 4 ? (
              <Button size="lg" onClick={() => setStep(step + 1)} disabled={!canNext}>
                التالي <ArrowLeft className="size-5" />
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
              <dt className="text-xs text-hint">الصفة لموسم 1448</dt>
              <dd className="mt-1 flex flex-wrap gap-1">{positions[0] ? <Badge tone="maroon">{POSITIONS.find((x) => x.key === positions[0])?.label}{renewal === "keep" ? " — تجديد" : ""}</Badge> : <span className="text-sm text-hint">لم تُحدَّد</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-hint">وثائق ملفك</dt>
              <dd className="font-bold">
                {attached.length} سارية
                {rec.documents.length > attached.length && <span className="mr-1 font-normal text-maroon">— {rec.documents.length - attached.length} تحتاج تحديثاً</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-hint">الالتزامات</dt>
              <dd className="font-bold">{COMMITMENTS.filter((c) => commit[c.key]).length} من {COMMITMENTS.length}</dd>
            </div>
          </dl>
        </div>
        <p className="rounded-3xl bg-green-dark/6 p-4 text-sm leading-6 text-green-dark">
          من يجدد الصفة نفسها بتقييم مستوفٍ يُعفى من الامتحانين؛ ومن يتقدم لصفة جديدة أو لأول مرة يخضع للامتحانين الكتابي والشفهي.
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
      <p className="mx-auto mt-2 max-w-lg leading-8 text-ink-soft">سيتم التحقق من الأهلية حتى 10 ربيع الآخر. نسخة من استمارة التسجيل الموقّعة إلكترونياً في خزنة وثائقك.</p>
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
        متابعة التحقق من الأهلية <ArrowLeft className="size-6" />
      </Button>
    </Card>
  );
}

function useConditions() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const age = ageOf(admin.person);
  const season = useSeason();
  const prev = previousRating(admin.id);
  const docs = p.documents ?? [];
  const served = seasonHistory(admin.id).filter((h) => h.roleKey);
  const options = roleOptions(admin.id, season.administrators);
  const role = p.renewal === "keep" ? options.keep : options.others.find((o) => o.key === p.positions[0]);
  return [
    { k: "العمر بين 25 و60", v: `${age}`, ok: age >= 25 && age <= 60 },
    { k: "شهادة جامعية أو خبرة موسمين", v: docs.includes("degree") ? `شهادة${served.length ? ` + ${served.length} مواسم` : ""}` : served.length >= 2 ? `${served.length} مواسم خبرة` : "لا توجد شهادة مرفوعة", ok: docs.includes("degree") || served.length >= 2 },
    { k: "لا حكم عليه", v: docs.includes("record") ? "وثيقة مرفوعة — تحقق ماهر" : "غير مرفوعة", ok: docs.includes("record") },
    { k: `الصفة لموسم 1448: ${role?.label ?? positionLabelOf(p.positions[0] ?? "")} — ${p.renewal === "keep" ? "تجديد الصفة نفسها" : p.renewal === "first" ? "أول موسم" : "صفة جديدة"}`, v: role?.reason ?? "—", ok: !!role?.ok },
    { k: `تقييم الموسم السابق لا يقل عن ${season.administrators.keepRoleMinRating}`, v: prev !== null ? `${prev}` : "لا يوجد موسم سابق — لا ينطبق", ok: prev === null || prev >= season.administrators.keepRoleMinRating || p.renewal !== "keep" },
    { k: "لم يُستبعد تأديبياً سابقاً", v: "لا", ok: true },
    { k: "رسم موسم 1448 مسدد", v: `إيصال ${p.receipt}`, ok: !!p.feePaidAt },
  ];
}

function Eligibility() {
  const admin = useAdmin()!;
  const toast = useToast();
  const rows = useConditions();
  const [checked, setChecked] = useState(0);
  const wrote = useRef(false);
  const allOk = rows.every((r) => r.ok);
  const finished = checked >= rows.length;
  const exempt = !!admin.profile?.examExempt;

  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setChecked((c) => c + 1), 750);
    return () => clearTimeout(t);
  }, [checked, finished]);

  useEffect(() => {
    if (!finished || !allOk || wrote.current) return;
    wrote.current = true;
    const t = setTimeout(() => {
      actions.upsertAdmin(admin.id, { eligibleAt: Date.now() });
      logAdmin(admin.id, "اكتمل التحقق من الأهلية (آلياً)", `الإداري ${admin.id.slice(-3)}`, exempt ? "مستوفٍ للشروط — تجديد الصفة نفسها، معفى من الامتحانين" : "مستوفٍ للشروط — يخضع للامتحانين الكتابي والشفهي");
      toast(exempt ? { title: "جُدّدت صفتك لموسم 1448", body: "معفى من الامتحانين. يمكنك المتابعة إلى تشكيل المجموعة أو التعيين.", icon: "🎓", tone: "success" } : { title: "أنت مؤهل للامتحان الكتابي", body: "الموعد: 15 ربيع الآخر، الساعة 09:00، على المنصة.", icon: "🎓", tone: "success" });
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 }, colors: ["#D9C89E", "#672146", "#00594F"] });
    }, 1400);
    return () => clearTimeout(t);
  }, [finished, allOk, exempt, admin.id, toast]);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">{finished ? (allOk ? "مستوفٍ لجميع الشروط" : "لم تستوفِ بعض الشروط") : "نطبّق شروط الموسم على ملفك..."}</h2>
          <p className="mt-1 text-ink-soft">الشروط من إعدادات الموسم، وتُراجع الوثائق من شؤون الإداريين.</p>
        </div>
        {!finished && <Loader2 className="size-8 animate-spin text-maroon" />}
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-gold/40">
        <table className="w-full text-right text-sm">
          <thead className="bg-green-dark text-white">
            <tr>
              <th className="p-4 font-bold">الشرط (من إعدادات الموسم)</th>
              <th className="p-4 font-bold">حالتك</th>
              <th className="w-24 p-4 text-center font-bold">النتيجة</th>
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
                        {r.ok ? <CircleCheck className="size-7 text-green-light" /> : <CircleX className="size-7 text-maroon" />}
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
            <p className="leading-7">لم يكتمل التحقق. يمكنك التواصل مع شؤون الإداريين لاستكمال ما ينقص قبل 10 ربيع الآخر.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function EligibleSummary() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const rows = useConditions();
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="relative overflow-hidden">
        <div className="bg-pattern-dark absolute inset-0" />
        <div className="relative">
          <Badge tone="green" className="text-sm"><BadgeCheck className="size-4" /> {p.examExempt ? "جُدّدت صفتك — معفى من الامتحانين" : "مؤهل للامتحان الكتابي"}</Badge>
          <h2 className="mt-4 font-display text-3xl font-bold text-green-dark md:text-4xl">{p.examExempt ? `جُدّدت صفتك يا ${admin.person.firstName}` : `أنت مؤهل يا ${admin.person.firstName}`}</h2>
          <p className="mt-3 max-w-xl leading-8 text-ink-soft">
            {p.examExempt
              ? `الصفة نفسها التي شغلتها الموسم الماضي بتقييم مستوفٍ، فلا امتحان هذا الموسم وفق شروط الإدارة. رسم الموسم مسدد، وتنتقل مباشرة إلى ${positionLabelOf(p.positions[0]) === "رئيس مجموعة" ? "طلب تشكيل المجموعة (برسمه)" : "التعيين في مجموعتك"}.`
              : <>الموعد: <b>15 ربيع الآخر، الساعة 09:00</b>، على المنصة — من منزلك أو من قاعة مراقبة إذا قررت الإدارة ذلك. مجموعة التواصل الخاصة بصفتك متاحة في قناة الإداريين.</>}
          </p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.k} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
                <CircleCheck className="size-5 shrink-0 text-green-light" /> <span className="truncate">{r.k}</span>
              </li>
            ))}
          </ul>
          <ButtonLink href={p.examExempt ? "/administrator/group" : "/administrator/exam"} size="xl" variant="gold" className="mt-8">
            {p.examExempt ? "متابعة إلى مجموعتي" : "الدخول إلى الامتحان الكتابي"} <ArrowLeft className="size-6" />
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

/** One role option with the administration's verdict on it */
function RoleCard({ option, selected, onSelect, badge }: { option: RoleOption; selected: boolean; onSelect: () => void; badge: string }) {
  const pos = POSITIONS.find((x) => x.key === option.key);
  return (
    <button
      type="button"
      disabled={!option.ok}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "mt-2 flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-maroon bg-maroon/5 shadow-lg" : option.ok ? "border-gold/40 bg-white hover:border-gold-dark" : "border-dashed border-maroon/30 bg-sand/50",
      )}
    >
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", selected ? "bg-maroon text-gold" : "bg-sand text-green-dark")}>
        {option.ok ? <Check className="size-5" /> : <Lock className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink">{option.label}</span>
          <Badge tone={!option.ok ? "maroon" : option.examExempt ? "green" : "gold"}>{badge}</Badge>
        </span>
        {pos && <span className="block text-xs text-ink-soft">{pos.desc}</span>}
        <span className={cn("mt-1 block text-xs leading-5", option.ok ? "text-green" : "text-maroon")}>{option.reason}</span>
      </span>
    </button>
  );
}
