"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarRange, Coins, FileCheck2, Layers, History, Lock, RotateCcw, Save, Scale, Settings2, Sparkles, UsersRound, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { SEASON } from "@/lib/season";
import { mergeSeason, type LiveSeason } from "@/lib/season-live";
import { actions, useStore, type SeasonOverrides } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { useAllEvents } from "../_components/data";
import { ago, Donut, fmtDateTime, Gate, logAs, PageHeader, Panel, smallInputClass, useNow, useStaffUser } from "../_components/kit";

type Key = keyof Required<SeasonOverrides>;

type FieldDef = { key: Key; label: string; unit?: string; min: number; max: number; step?: number; hint?: (v: number) => string };

const REF = SEASON.referenceYear;

/** Chips tuned for the dark staff cards (the shared Badge is written for white surfaces) */
const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
} as const;

function Chip({ tone, children, className }: { tone: keyof typeof CHIP; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone], className)}>{children}</span>;
}

const GROUPS: { title: string; icon: React.ReactNode; fields: FieldDef[] }[] = [
  {
    title: "الحصة والقبول",
    icon: <Scale />,
    fields: [
      { key: "quota", label: "الحصة الإجمالية", unit: "حاج", min: 1000, max: 60000, step: 100 },
      { key: "acceptedDirectAge", label: "الأعمار المقبولة مباشرة", unit: "عاماً فأكثر", min: 40, max: 90, hint: () => "تُحدَّد قبل فتح التسجيل، وتتحقق منها المنصة عند التسجيل على القبول المباشر قبل أي دفع" },
    ],
  },
  {
    title: "شروط تُضبط بسنة الميلاد",
    icon: <CalendarRange />,
    fields: [
      { key: "applicantMaxBirthYear", label: "صاحب الطلب من مواليد ... فما قبل", min: 1940, max: 2008, hint: (v) => `${REF - v} عاماً فأكثر` },
      { key: "companionMaxBirthYear", label: "المرافق من مواليد ... فما قبل", min: 1940, max: 2012, hint: (v) => `${REF - v} عاماً فأكثر` },
      { key: "womanNeedsMahramMinBirthYear", label: "المرأة من مواليد ... فما بعد تحتاج محرماً", min: 1950, max: 2010, hint: (v) => `دون ${REF - v} عاماً` },
      { key: "elderlyNeedsCompanionMaxBirthYear", label: "من مواليد ... فما قبل يحتاج مرافقاً", min: 1930, max: 1975, hint: (v) => `${REF - v} عاماً فأكثر` },
    ],
  },
  {
    title: "حدود الطلب",
    icon: <UsersRound />,
    fields: [
      { key: "maxCompanions", label: "عدد المرافقين المسموح", unit: "أشخاص", min: 0, max: 8 },
      { key: "maxCompanionsFamily", label: "لرجل مع زوجته وأولاده", unit: "أشخاص", min: 0, max: 10 },
    ],
  },
  {
    title: "الرسوم والتكاليف",
    icon: <Coins />,
    fields: [
      { key: "registrationPerPerson", label: "رسم التسجيل للفرد", unit: "$", min: 0, max: 200 },
      { key: "hajjCost", label: "تكلفة الحج للفرد (كاملة)", unit: "$", min: 1000, max: 15000, step: 50 },
      { key: "installmentCount", label: "تسديد تكلفة الحج: 1 = دفعة واحدة كاملة، 2 = دفعتان", unit: "دفعات", min: 1, max: 2 },
      { key: "firstInstallment", label: "الدفعة الأولى للفرد (مع التسجيل المباشر أو عند القرعة)", unit: "$", min: 0, max: 15000, step: 50 },
      { key: "hady", label: "الهدي", unit: "$", min: 0, max: 1000, step: 5 },
    ],
  },
  {
    title: "رسوم الإداريين",
    icon: <Coins />,
    fields: [
      { key: "administratorRegistration", label: "رسم التسجيل الموسمي للإداري", unit: "$", min: 0, max: 500, step: 5 },
      { key: "groupFormation", label: "رسم تشكيل المجموعة", unit: "$", min: 0, max: 2000, step: 10 },
      { key: "clusterFormation", label: "رسم إنشاء التكتل (يدفعه الرئيس المنتخب)", unit: "$", min: 0, max: 5000, step: 10 },
    ],
  },
  {
    title: "صلاحية وثائق الإداري",
    icon: <FileCheck2 />,
    fields: [
      { key: "firstAidValidSeasons", label: "شهادة الإسعافات الأولية: تبقى سارية", unit: "مواسم", min: 1, max: 6, hint: () => "الشهادة الجامعية لا تنتهي، ولا تُطلب من جديد في أي موسم" },
      { key: "recordValidSeasons", label: "وثيقة «لا حكم عليه»: تبقى سارية", unit: "مواسم", min: 1, max: 6, hint: (v: number) => (v === 1 ? "تُجدَّد كل موسم" : `تُجدَّد كل ${v} مواسم`) },
      { key: "recommendationValidSeasons", label: "تزكية رئيس تكتل سابق: تبقى سارية", unit: "مواسم", min: 1, max: 6 },
    ],
  },
  {
    title: "الإداريون — تجديد الصفة كل موسم",
    icon: <Coins />,
    fields: [
      { key: "keepRoleMinRating", label: "الاستمرار في الصفة نفسها: أدنى تقييم للموسم السابق (ومعه إعفاء من الامتحانين)", unit: "من 5", min: 0, max: 5, step: 0.1 },
      { key: "clusterCount", label: "عدد التكتلات هذا الموسم (يُنتخب رؤساؤها من رؤساء المجموعات)", unit: "تكتلات", min: 1, max: 30 },
      { key: "clusterHeadSeasons", label: "الترشح لرئاسة تكتل: مواسم متتالية رئيساً لمجموعة", unit: "مواسم", min: 0, max: 6 },
      { key: "clusterHeadMinRating", label: "الترشح لرئاسة تكتل: أدنى تقييم في كل موسم منها", unit: "من 5", min: 0, max: 5, step: 0.1 },
      { key: "deputySeasons", label: "معاون رئيس التكتل (يختاره الرئيس): مواسم سابقة رئيساً لمجموعة", unit: "مواسم", min: 0, max: 5 },
    ],
  },
];

const GRADING_GROUP: { title: string; icon: React.ReactNode; fields: FieldDef[] } = {
  title: "تصنيف المجموعات والتكتلات — نهاية الموسم",
  icon: <Layers />,
  fields: [
    { key: "promoteShare" as Key, label: "نسبة الترقية من كل فئة (الأعلى تقييماً)", unit: "%", min: 0, max: 60, hint: (v: number) => `في فئة فيها 126 مجموعة: ${Math.round(126 * v / 100)} مجموعة تُرقّى فئةً واحدة` },
    { key: "demoteShare" as Key, label: "نسبة التخفيض من كل فئة (الأدنى تقييماً)", unit: "%", min: 0, max: 60, hint: (v: number) => `في فئة فيها 126 مجموعة: ${Math.round(126 * v / 100)} مجموعة تُخفَّض فئةً واحدة` },
    { key: "honorTop" as Key, label: "عدد المكرَّمين في كل فئة", unit: "الأوائل", min: 0, max: 10, hint: () => "يُكرَّمون في ختام الموسم — الترتيب داخل الفئة على مستوى كل المكاتب" },
  ],
};

GROUPS.push(GRADING_GROUP);

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
  clusterCount: "عدد التكتلات",
  clusterHeadSeasons: "مواسم الترشح لرئاسة تكتل",
  clusterHeadMinRating: "أدنى تقييم للترشح",
  deputySeasons: "مواسم معاون رئيس التكتل",
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
    clusterCount: s.administrators.clusterCount,
    clusterHeadSeasons: s.administrators.clusterHeadSeasons,
    clusterHeadMinRating: s.administrators.clusterHeadMinRating,
    deputySeasons: s.administrators.deputySeasons,
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
  if (key === "keepRoleMinRating" || key === "clusterHeadMinRating") return `${v} من 5`;
  if (key === "registrationPerPerson" || key === "hajjCost" || key === "firstInstallment" || key === "hady") return `${formatNumber(v)} $`;
  if (key.endsWith("BirthYear")) return String(v);
  return formatNumber(v);
}

export function SeasonView() {
  const overrides = useStore((s) => s.season);
  return (
    <Gate perms={["season.settings"]}>
      <SeasonForm key={JSON.stringify(overrides)} overrides={overrides} />
    </Gate>
  );
}

function SeasonForm({ overrides }: { overrides: SeasonOverrides }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const now = useNow(30_000);
  const saved = useMemo(() => valuesOf(mergeSeason(overrides)), [overrides]);
  const [draft, setDraft] = useState<Values>(saved);
  const [decision, setDecision] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const events = useAllEvents();
  const history = useMemo(() => events.filter((e) => e.action.includes("إعدادات الموسم")).slice(0, 8), [events]);

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
    setConfirmReset(false);
    toast({ title: "أُعيدت الإعدادات الافتراضية", tone: "info", icon: "↩️" });
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="المرحلة 0 — الموظفون يفتحون الموسم"
        title="إعدادات موسم 1448"
        icon={<Settings2 />}
        description="الشروط والحدود والرسوم كلها تُدخل من هنا، ولا شيء منها ثابت في البرمجة — ما عدا أربعة شروط ثابتة في كل موسم."
        actions={
          <Button variant="glass" size="sm" onClick={() => setConfirmReset(true)} disabled={Object.keys(overrides).length === 0}>
            <RotateCcw className="size-4" /> القيم الافتراضية
          </Button>
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-gold/40 bg-gradient-to-l from-gold/25 to-gold/5 p-4 text-white">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gold text-ink">
          <Zap className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-sm leading-6">
          <b className="text-gold">يُطبَّق فوراً:</b> معالج طلب الحج يقرأ هذه القيم مباشرة. أي تعديل تحفظه يظهر للحاج في الطلب التالي دون تحديث البرمجة.
        </p>
        <Link href="/portal/apply" className="flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          افتح معالج الطلب <ArrowLeft className="size-4" />
        </Link>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Direct share slider */}
          <Panel title="نوعا الطلب: تسجيلان منفصلان للقبول المباشر والقرعة" icon={<Sparkles />}>
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <Donut
                size={180}
                thickness={24}
                segments={[
                  { value: directSeats, color: "#AD9E6E", label: "direct" },
                  { value: lotterySeats, color: "#289E92", label: "lottery" },
                ]}
              >
                <div>
                  <motion.p key={draft.directShare} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-3xl font-bold text-white">
                    {draft.directShare}/{100 - draft.directShare}
                  </motion.p>
                  <p className="text-xs text-white/75">مباشر / قرعة</p>
                </div>
              </Donut>
              <div className="w-full flex-1">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-gold">مباشر {formatNumber(directSeats)} مقعداً</span>
                  <span className="text-white">قرعة {formatNumber(lotterySeats)} مقعداً</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={draft.directShare}
                  onChange={(e) => set("directShare", Number(e.target.value))}
                  aria-label="نسبة القبول المباشر"
                  className="mt-3 w-full accent-[#D9C89E]"
                  style={{ direction: "ltr" }}
                />
                <div className="mt-1 flex justify-between text-[11px] text-white/75" dir="ltr">
                  <span>10%</span>
                  <span>35%</span>
                  <span>60%</span>
                </div>
                {draft.directShare !== DEFAULTS.directShare && <Chip tone="gold" className="mt-2">القيمة في الوثيقة: {DEFAULTS.directShare}%</Chip>}
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                <p className="font-bold text-gold">1. التسجيل على القبول المباشر</p>
                <p className="mt-1 text-xs leading-6 text-white/85">
                  {SEASON.windows.direct.hijri} — يُقبل الأكبر سناً حتى تكتمل المقاعد، وتُعلن الأعمار المقبولة في {SEASON.windows.direct.announce}.
                </p>
              </div>
              <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                <p className="font-bold text-white">2. التسجيل على القرعة — طلب مستقل</p>
                <p className="mt-1 text-xs leading-6 text-white/85">
                  {SEASON.windows.lottery.hijri} — يسجّل فيه كل مؤهل بطلب جديد، ومنهم من لم يُقبل مباشرة. القرعة: {SEASON.windows.lottery.draw}.
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/75">لا ينتقل أي طلب من التسجيل المباشر إلى القرعة من تلقاء نفسه.</p>
          </Panel>

          {GROUPS.map((g, gi) => (
            <Panel key={g.title} title={g.title} icon={g.icon} delay={0.05 * (gi + 1)}>
              <div className="grid gap-4 sm:grid-cols-2">
                {g.fields.map((f) => {
                  const changed = draft[f.key] !== saved[f.key];
                  const custom = saved[f.key] !== DEFAULTS[f.key];
                  const out = draft[f.key] < f.min || draft[f.key] > f.max;
                  return (
                    <label key={f.key} className={cn("block rounded-2xl p-3 ring-1 transition", changed ? "bg-gold/15 ring-gold/50" : "bg-white/[.06] ring-white/10 hover:ring-gold/40")}>
                      <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-bold text-white">
                        {f.label}
                        {changed ? <Chip tone="gold">غير محفوظ</Chip> : custom ? <Chip tone="green">معدّل</Chip> : null}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={f.min}
                          max={f.max}
                          step={f.step ?? 1}
                          value={draft[f.key]}
                          onChange={(e) => set(f.key, Number(e.target.value))}
                          className={cn(smallInputClass, "pl-24 font-display text-lg font-bold tabular-nums", out && "border-gold! bg-maroon/40!")}
                          dir="ltr"
                        />
                        {f.unit && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/75">{f.unit}</span>}
                      </div>
                      <span className="mt-1 block text-xs text-white/75">
                        {out ? <span className="font-bold text-gold">خارج النطاق المسموح ({f.min} – {f.max})</span> : f.hint?.(draft[f.key]) ?? `القيمة في الوثيقة: ${show(f.key, DEFAULTS[f.key])}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Panel>
          ))}
        </div>

        <div className="space-y-6">
          <Panel title="شروط ثابتة لا تتغير" icon={<Lock />} delay={0.1}>
            <ul className="space-y-2">
              {["مسلم", "سوري الجنسية", "لم يؤدِّ فريضة الحج سابقاً (إلا محرماً لأمه أو زوجته)", "غير مصاب بمرض عضال"].map((r, i) => (
                <motion.li key={r} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }} className="flex items-center gap-3 rounded-2xl bg-white/[.06] p-3 text-sm ring-1 ring-white/10">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                    <Lock className="size-4" />
                  </span>
                  <span className="font-semibold text-white">{r}</span>
                </motion.li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-white/75">هذه الشروط محمية في البرمجة ولا تظهر كحقول قابلة للتعديل لأي موظف.</p>
          </Panel>

          <Panel title="سجل تعديلات الإعدادات" icon={<History />} delay={0.15}>
            <ol className="space-y-3">
              <AnimatePresence initial={false}>
                {history.map((e) => (
                  <motion.li key={e.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-2 text-xs text-white/75">
                      <span className="font-bold text-white">{e.actor}</span>
                      <span>{e.live ? ago(e.at, now) : fmtDateTime(e.at)}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-gold">{e.target}</p>
                    {e.before !== undefined && (
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-maroon/70 px-1.5 py-0.5 text-white line-through decoration-white/70">{e.before}</span>
                        <ArrowLeft className="size-3 text-white/70" />
                        <span className="rounded-md bg-green-light/25 px-1.5 py-0.5 font-bold text-white">{e.after}</span>
                      </p>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </Panel>
        </div>
      </div>

      {/* Sticky save bar */}
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
              <input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="مرجع قرار اللجنة (اختياري)" className="h-10 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm outline-none placeholder:text-white/50 focus:border-gold sm:w-56" />
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
        onClose={() => setConfirmReset(false)}
        className="border border-gold/30 bg-gradient-to-b from-[#004a42] to-[#00352f] text-white [&>button:first-child]:text-white/75 [&>button:first-child]:hover:bg-white/10 [&>button:first-child]:hover:text-white"
      >
        <h3 className="font-display text-xl font-bold text-white">إعادة القيم الافتراضية؟</h3>
        <p className="mt-2 leading-7 text-white/90">ستعود جميع الإعدادات إلى القيم المعتمدة في الوثيقة التشغيلية، ويُسجَّل ذلك باسمك في سجل الأحداث.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="maroon" onClick={reset}>
            <RotateCcw className="size-4" /> نعم، أعد الضبط
          </Button>
          <Button variant="glass" onClick={() => setConfirmReset(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}
