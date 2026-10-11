"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Lock, RotateCcw, Save, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { SEASON } from "@/lib/season";
import { mergeSeason, type LiveSeason } from "@/lib/season-live";
import { actions, useStore, type SeasonOverrides } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { useAllEvents } from "../_components/data";
import { ago, fmtDateTime, Gate, logAs, PageHeader, smallInputClass, useNow, useStaffUser } from "../_components/kit";
import { OperationsPanel } from "../_components/operations";
import { Box, SettingsRow, SettingsSection, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";

type Key = keyof Required<SeasonOverrides>;

type FieldDef = { key: Key; label: string; unit?: string; min: number; max: number; step?: number; hint?: (v: number) => string; note?: string };

const REF = SEASON.referenceYear;

/** The season's values, section by section — one form, saved once */
const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "الحصة والقبول",
    fields: [
      { key: "quota", label: "الحصة الإجمالية", unit: "حاج", min: 1000, max: 60000, step: 100 },
      { key: "acceptedDirectAge", label: "الأعمار المقبولة مباشرة", unit: "عاماً فأكثر", min: 40, max: 90, note: "تُحدَّد قبل فتح التسجيل، وتتحقق منها المنصة عند التسجيل على القبول المباشر قبل أي دفع." },
    ],
  },
  {
    title: "شروط تُضبط بسنة الميلاد",
    fields: [
      { key: "applicantMaxBirthYear", label: "صاحب الطلب من مواليد ... فما قبل", min: 1940, max: 2008, hint: (v) => `${REF - v} عاماً فأكثر` },
      { key: "companionMaxBirthYear", label: "المرافق من مواليد ... فما قبل", min: 1940, max: 2012, hint: (v) => `${REF - v} عاماً فأكثر` },
      { key: "womanNeedsMahramMinBirthYear", label: "المرأة من مواليد ... فما بعد تحتاج محرماً", min: 1950, max: 2010, hint: (v) => `دون ${REF - v} عاماً` },
      { key: "elderlyNeedsCompanionMaxBirthYear", label: "من مواليد ... فما قبل يحتاج مرافقاً", min: 1930, max: 1975, hint: (v) => `${REF - v} عاماً فأكثر` },
    ],
  },
  {
    title: "حدود الطلب",
    fields: [
      { key: "maxCompanions", label: "عدد المرافقين المسموح", unit: "أشخاص", min: 0, max: 8 },
      { key: "maxCompanionsFamily", label: "لرجل مع زوجته وأولاده", unit: "أشخاص", min: 0, max: 10 },
    ],
  },
  {
    title: "الرسوم والتكاليف",
    fields: [
      { key: "registrationPerPerson", label: "رسم التسجيل للفرد", unit: "$", min: 0, max: 200 },
      { key: "hajjCost", label: "تكلفة الحج للفرد (كاملة)", unit: "$", min: 1000, max: 15000, step: 50, note: "تُحفظ مع كل طلب لحظة تقديمه. عدد الدفعات ومبالغها ومواعيدها وطرق الدفع في «إدارة التسجيل على الحج» ← «الدفعات والمسارات»." },
      { key: "hady", label: "الهدي", unit: "$", min: 0, max: 1000, step: 5 },
    ],
  },
  {
    title: "رسوم الإداريين",
    fields: [
      { key: "administratorRegistration", label: "رسم التسجيل الموسمي للإداري", unit: "$", min: 0, max: 500, step: 5 },
      { key: "groupFormation", label: "رسم تشكيل المجموعة", unit: "$", min: 0, max: 2000, step: 10 },
      { key: "clusterFormation", label: "رسم إنشاء التكتل (يدفعه الرئيس المنتخب)", unit: "$", min: 0, max: 5000, step: 10 },
    ],
  },
  {
    title: "صلاحية وثائق الإداري",
    fields: [
      { key: "firstAidValidSeasons", label: "شهادة الإسعافات الأولية: تبقى سارية", unit: "مواسم", min: 1, max: 6, note: "الشهادة الجامعية لا تنتهي، ولا تُطلب من جديد في أي موسم." },
      { key: "recordValidSeasons", label: "وثيقة «لا حكم عليه»: تبقى سارية", unit: "مواسم", min: 1, max: 6, hint: (v: number) => (v === 1 ? "تُجدَّد كل موسم" : `تُجدَّد كل ${v} مواسم`) },
      { key: "recommendationValidSeasons", label: "تزكية رئيس تكتل سابق: تبقى سارية", unit: "مواسم", min: 1, max: 6 },
    ],
  },
  {
    title: "الإداريون — تجديد الصفة كل موسم",
    fields: [{ key: "keepRoleMinRating", label: "الاستمرار في الصفة نفسها", unit: "من 5", min: 0, max: 5, step: 0.1, note: "أدنى تقييم للموسم السابق، ومعه إعفاء من الاختبار." }],
  },
  {
    title: "تصنيف المجموعات والتكتلات — نهاية الموسم",
    fields: [
      { key: "promoteShare", label: "نسبة الترقية من كل فئة (الأعلى تقييماً)", unit: "%", min: 0, max: 60, hint: (v: number) => `في فئة فيها 126 مجموعة: ${Math.round((126 * v) / 100)} مجموعة تُرقّى فئةً واحدة` },
      { key: "demoteShare", label: "نسبة التخفيض من كل فئة (الأدنى تقييماً)", unit: "%", min: 0, max: 60, hint: (v: number) => `في فئة فيها 126 مجموعة: ${Math.round((126 * v) / 100)} مجموعة تُخفَّض فئةً واحدة` },
      { key: "honorTop", label: "عدد المكرَّمين في كل فئة", unit: "الأوائل", min: 0, max: 10, note: "يُكرَّمون في ختام الموسم — الترتيب داخل الفئة على مستوى كل المكاتب." },
    ],
  },
];

const FIXED = ["مسلم", "سوري الجنسية", "لم يؤدِّ فريضة الحج سابقاً (إلا محرماً لأمه أو زوجته)", "غير مصاب بمرض عضال"];

const LABELS: Record<Key, string> = {
  quota: "الحصة الإجمالية",
  directShare: "نسبة القبول المباشر",
  acceptedDirectAge: "الأعمار المقبولة مباشرة",
  applicantMaxBirthYear: "مواليد صاحب الطلب",
  companionMaxBirthYear: "مواليد المرافق",
  womanNeedsMahramMinBirthYear: "مواليد المرأة التي تحتاج محرماً",
  elderlyNeedsCompanionMaxBirthYear: "مواليد من يحتاج مرافقاً",
  maxCompanions: "حد المرافقين",
  maxCompanionsFamily: "حد المرافقين للأسرة",
  registrationPerPerson: "رسم التسجيل",
  hajjCost: "تكلفة الحج",
  firstInstallment: "الدفعة الأولى",
  installmentCount: "عدد دفعات تكلفة الحج",
  administratorRegistration: "رسم تسجيل الإداري",
  groupFormation: "رسم تشكيل المجموعة",
  clusterFormation: "رسم إنشاء التكتل",
  firstAidValidSeasons: "صلاحية شهادة الإسعافات",
  recordValidSeasons: "صلاحية وثيقة لا حكم عليه",
  recommendationValidSeasons: "صلاحية التزكية",
  keepRoleMinRating: "أدنى تقييم للاستمرار في الصفة",
  promoteShare: "نسبة الترقية من كل فئة",
  demoteShare: "نسبة التخفيض من كل فئة",
  honorTop: "المكرَّمون في كل فئة",
  hady: "الهدي",
};

type Values = Record<Key, number>;

function valuesOf(s: LiveSeason): Values {
  return {
    quota: s.quota,
    directShare: Math.round(s.directShare * 100),
    acceptedDirectAge: s.acceptedDirectAge,
    ...s.rules,
    registrationPerPerson: s.fees.registrationPerPerson,
    hajjCost: s.fees.hajjCost,
    firstInstallment: s.fees.firstInstallment,
    installmentCount: s.fees.installmentCount,
    keepRoleMinRating: s.administrators.keepRoleMinRating,
    promoteShare: Math.round(s.grading.promoteShare * 100),
    demoteShare: Math.round(s.grading.demoteShare * 100),
    honorTop: s.grading.honorTop,
    hady: s.fees.hady,
    administratorRegistration: s.fees.administratorRegistration,
    groupFormation: s.fees.groupFormation,
    clusterFormation: s.fees.clusterFormation,
    firstAidValidSeasons: s.documents["first-aid"],
    recordValidSeasons: s.documents.record,
    recommendationValidSeasons: s.documents.recommendation,
  };
}

const DEFAULTS = valuesOf(mergeSeason({}));

function show(key: Key, v: number) {
  if (key === "directShare" || key === "promoteShare" || key === "demoteShare") return `${v}%`;
  if (key === "installmentCount") return v === 1 ? "دفعة واحدة كاملة" : "دفعتان";
  if (key === "keepRoleMinRating") return `${v} من 5`;
  if (key === "registrationPerPerson" || key === "hajjCost" || key === "firstInstallment" || key === "hady") return `${formatNumber(v)} $`;
  if (key.endsWith("BirthYear")) return String(v);
  return formatNumber(v);
}

type Section = "values" | "operations";

export function SeasonView() {
  return (
    <Gate perms={["season.settings"]}>
      <Season />
    </Gate>
  );
}

/**
 * The season's settings, as a site's settings: its values on one form saved once, and the dates of its
 * operations on a page of their own (each of those is saved as it is changed, by whoever controls it).
 */
function Season() {
  const overrides = useStore((s) => s.season);
  const params = useSearchParams();
  const router = useRouter();
  const section: Section = params.get("section") === "operations" ? "operations" : "values";
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        title="إعدادات موسم 1448"
        icon={<Settings2 />}
        description="شروط الموسم وحدوده ورسومه ومواعيد عملياته. ما تحفظه يُطبَّق على الطلبات التالية فوراً."
        actions={
          section === "values" && (
            <Button variant="glass" size="sm" onClick={() => setConfirmReset(true)} disabled={Object.keys(overrides).length === 0}>
              <RotateCcw className="size-4" /> القيم الافتراضية
            </Button>
          )
        }
      />

      <Segments
        value={section}
        onChange={(v) => router.replace(v === "operations" ? "/staff/season?section=operations" : "/staff/season", { scroll: false })}
        label="أقسام الإعدادات"
        items={[
          { value: "values", label: "الشروط والرسوم" },
          { value: "operations", label: "مواعيد العمليات" },
        ]}
      />

      {section === "operations" ? (
        <OperationsPanel title="مواعيد العمليات وتفعيلها" />
      ) : (
        <SeasonForm key={JSON.stringify(overrides)} overrides={overrides} confirmReset={confirmReset} onCloseReset={() => setConfirmReset(false)} />
      )}
    </div>
  );
}

function SeasonForm({ overrides, confirmReset, onCloseReset }: { overrides: SeasonOverrides; confirmReset: boolean; onCloseReset: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const saved = useMemo(() => valuesOf(mergeSeason(overrides)), [overrides]);
  const [draft, setDraft] = useState<Values>(saved);
  const [decision, setDecision] = useState("");

  const changes = (Object.keys(draft) as Key[]).filter((k) => draft[k] !== saved[k]);
  const invalid = GROUPS.flatMap((g) => g.fields).filter((f) => draft[f.key] < f.min || draft[f.key] > f.max);
  const set = (k: Key, v: number) => setDraft((d) => ({ ...d, [k]: Number.isFinite(v) ? v : 0 }));

  const directSeats = Math.round(draft.quota * (draft.directShare / 100));
  const lotterySeats = draft.quota - directSeats;

  const save = () => {
    if (!changes.length || invalid.length) return;
    const patch: SeasonOverrides = {};
    for (const k of changes) patch[k] = k === "directShare" ? draft[k] / 100 : draft[k];
    actions.setSeason(patch);
    for (const k of changes) {
      logAs(user, {
        action: "تعديل إعدادات الموسم",
        target: LABELS[k],
        before: show(k, saved[k]),
        after: show(k, draft[k]),
        detail: decision.trim() ? `مرجع القرار: ${decision.trim()}` : undefined,
      });
    }
    toast({ title: `حُفظ ${changes.length} ${changes.length === 1 ? "تعديل" : "تعديلات"}`, body: "سُجّل كل تعديل باسمك مع القيمة قبل التعديل وبعده.", tone: "success", icon: "💾" });
  };

  const reset = () => {
    const overridden = Object.keys(overrides) as Key[];
    actions.resetSeason();
    logAs(user, {
      action: "إعادة إعدادات الموسم إلى القيم الافتراضية",
      target: "موسم 1448",
      before: overridden.map((k) => `${LABELS[k]}: ${show(k, saved[k])}`).join(" · ") || "لا تعديلات",
      after: "القيم المعتمدة في الوثيقة التشغيلية",
    });
    onCloseReset();
    toast({ title: "أُعيدت الإعدادات الافتراضية", tone: "info", icon: "↩️" });
  };

  return (
    <>
      <div className="space-y-6">
        {GROUPS.map((g, gi) => (
          <SettingsSection key={g.title} title={g.title}>
            {g.fields.map((f) => (
              <NumberRow key={f.key} f={f} value={draft[f.key]} saved={saved[f.key]} onChange={(v) => set(f.key, v)} />
            ))}
            {/* The split between the two registrations belongs with the quota */}
            {gi === 0 && (
              <SettingsRow label="نسبة القبول المباشر" hint="الباقي من الحصة للقرعة. لا ينتقل أي طلب من التسجيل المباشر إلى القرعة من تلقاء نفسه.">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
                  <span className="text-gold">
                    مباشر {draft.directShare}% — {formatNumber(directSeats)} مقعداً
                  </span>
                  <span className="text-white">
                    قرعة {100 - draft.directShare}% — {formatNumber(lotterySeats)} مقعداً
                  </span>
                </div>
                <input type="range" min={10} max={90} value={draft.directShare} onChange={(e) => set("directShare", Number(e.target.value))} aria-label="نسبة القبول المباشر" className="mt-3 w-full accent-[#D9C89E]" style={{ direction: "ltr" }} />
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                  {draft.directShare !== saved.directShare ? <Tag tone="gold">غير محفوظ</Tag> : saved.directShare !== DEFAULTS.directShare && <Tag tone="green">معدّل</Tag>}
                  القيمة في الوثيقة: {DEFAULTS.directShare}%
                </p>
              </SettingsRow>
            )}
          </SettingsSection>
        ))}

        <SettingsSection title="شروط ثابتة لا تتغير">
          <SettingsRow label="في كل موسم" hint="محمية في البرمجة، ولا تظهر حقولاً لأي موظف.">
            <ul className="space-y-1.5 pt-1">
              {FIXED.map((r) => (
                <li key={r} className="flex items-center gap-2 text-white">
                  <Lock className="size-3.5 shrink-0 text-gold" /> {r}
                </li>
              ))}
            </ul>
          </SettingsRow>
        </SettingsSection>

        <Box title="كيف تعمل؟" open={false}>
          <p>معالج طلب الحج يقرأ هذه القيم مباشرة: أي تعديل تحفظه يظهر للحاج في الطلب التالي دون تحديث البرمجة.</p>
          <p>
            <b className="text-gold">التسجيل على القبول المباشر</b> ({SEASON.windows.direct.hijri}): يُقبل الأكبر سناً حتى تكتمل المقاعد، وتُعلن الأعمار المقبولة في {SEASON.windows.direct.announce}.
          </p>
          <p>
            <b className="text-gold">التسجيل الأولي على القرعة</b> ({SEASON.windows.lottery.hijri}): طلب مستقل يسجّل فيه كل مؤهل، ومنهم من لم يُقبل مباشرة. القرعة: {SEASON.windows.lottery.draw}، تُسحب فيها سنوات ميلاد وأشهر.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/conditions#precheck" target="_blank" className="inline-flex items-center gap-1 font-bold text-gold hover:underline">
              جرّبها في فحص الأهلية <ArrowLeft className="size-4" />
            </Link>
            <Link href="/login?next=%2Fportal%2Fapply" target="_blank" className="text-white/70 hover:text-white hover:underline">
              أو افتح معالج الطلب بحساب حاج تجريبي
            </Link>
          </p>
        </Box>

        <History />
      </div>

      {/* The form's one save bar: it shows what changed, the committee's decision and the save */}
      <AnimatePresence>
        {changes.length > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-4xl rounded-3xl border border-gold/40 bg-ink/90 p-4 text-white shadow-2xl backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {changes.length} تعديلات غير محفوظة
                  {invalid.length > 0 && <span className="mr-2 text-xs font-normal text-gold">— صحّح القيم خارج النطاق أولاً</span>}
                </p>
                <p className="scrollbar-none mt-1 flex gap-2 overflow-x-auto text-xs text-white/85">
                  {changes.map((k) => (
                    <span key={k} className="shrink-0 rounded-full bg-white/10 px-2 py-0.5">
                      {LABELS[k]}: {show(k, saved[k])} ← {show(k, draft[k])}
                    </span>
                  ))}
                </p>
              </div>
              <input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="مرجع قرار اللجنة (اختياري)" aria-label="مرجع قرار اللجنة" className="h-10 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm outline-none placeholder:text-white/50 focus:border-gold sm:w-56" />
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setDraft(saved)}>
                تراجع
              </Button>
              <Button variant="gold" size="sm" onClick={save} disabled={invalid.length > 0} title={invalid.length ? `قيم خارج النطاق: ${invalid.map((f) => f.label).join("، ")}` : undefined}>
                <Save className="size-4" /> حفظ واعتماد
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={confirmReset}
        onClose={onCloseReset}
        className="border border-gold/30 bg-gradient-to-b from-[#004a42] to-[#00352f] text-white [&>button:first-child]:text-white/75 [&>button:first-child]:hover:bg-white/10 [&>button:first-child]:hover:text-white"
      >
        <h3 className="font-display text-xl font-bold text-white">إعادة القيم الافتراضية؟</h3>
        <p className="mt-2 leading-7 text-white/90">ستعود جميع الإعدادات إلى القيم المعتمدة في الوثيقة التشغيلية، ويُسجَّل ذلك باسمك في سجل الأحداث.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="maroon" onClick={reset}>
            <RotateCcw className="size-4" /> نعم، أعد الضبط
          </Button>
          <Button variant="glass" onClick={onCloseReset}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** One value of the form: the field, its unit, whether it is changed, and its range */
function NumberRow({ f, value, saved, onChange }: { f: FieldDef; value: number; saved: number; onChange: (v: number) => void }) {
  const changed = value !== saved;
  const custom = saved !== DEFAULTS[f.key];
  const out = value < f.min || value > f.max;
  return (
    <SettingsRow label={f.label} hint={f.note}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <input
            type="number"
            inputMode="numeric"
            min={f.min}
            max={f.max}
            step={f.step ?? 1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={f.label}
            className={cn(smallInputClass, "pl-24 font-display text-lg font-bold tabular-nums", out && "border-gold! bg-maroon/40!")}
            dir="ltr"
          />
          {f.unit && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/75">{f.unit}</span>}
        </div>
        {changed ? <Tag tone="gold">غير محفوظ</Tag> : custom ? <Tag tone="green">معدّل</Tag> : null}
      </div>
      <p className="mt-1 text-xs text-white/60">
        {out ? (
          <span className="font-bold text-gold">
            خارج النطاق المسموح ({f.min} – {f.max})
          </span>
        ) : (
          (f.hint?.(value) ?? `القيمة في الوثيقة: ${show(f.key, DEFAULTS[f.key])}`)
        )}
      </p>
    </SettingsRow>
  );
}

/** What was changed in the settings, by whom, closed at the end of the page */
function History() {
  const now = useNow(30_000);
  const events = useAllEvents();
  const history = useMemo(() => events.filter((e) => e.action.includes("إعدادات الموسم")).slice(0, 12), [events]);
  return (
    <Box title="سجل تعديلات الإعدادات" open={false}>
      {history.length === 0 ? (
        <p className="text-white/60">لا تعديلات مسجّلة بعد. كل تعديل تحفظه يُسجَّل باسمك مع القيمة قبله وبعده.</p>
      ) : (
        <ol className="space-y-2">
          {history.map((e) => (
            <li key={e.id} className="rounded-xl bg-white/[.05] px-3 py-2 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                <span className="font-bold text-white">{e.actor}</span>
                <span>{e.live ? ago(e.at, now) : fmtDateTime(e.at)}</span>
              </div>
              <p className="mt-0.5 font-bold text-gold">{e.target}</p>
              {e.before !== undefined && (
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-maroon/70 px-1.5 py-0.5 text-white line-through decoration-white/70">{e.before}</span>
                  <ArrowLeft className="size-3 text-white/70" />
                  <span className="rounded-md bg-green-light/25 px-1.5 py-0.5 font-bold text-white">{e.after}</span>
                </p>
              )}
              {e.detail && <p className="mt-1 text-xs text-white/60">{e.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </Box>
  );
}
