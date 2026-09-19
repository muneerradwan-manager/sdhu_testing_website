"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  Dices,
  Download,
  FileSpreadsheet,
  Loader2,
  Lock,
  Megaphone,
  RotateCcw,
  ShieldCheck,
  Tv,
  UploadCloud,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { AGE_BUCKETS, DUPLICATE_ROWS, LOTTERY, UNMATCHED_ROWS } from "@/lib/data/staff-seed";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { can } from "@/lib/staff";
import { actions, useStore, type AuditEvent } from "@/lib/store";
import { cn, formatNumber, maskNationalId, sleep } from "@/lib/utils";
import { lastEvent } from "../_components/data";
import { Donut, fmtDateTime, Gate, Kpi, Legend, logAs, PageHeader, Panel, smallInputClass, useStaffUser } from "../_components/kit";

const A = {
  issue: "إصدار الأعمار المقبولة",
  approveAges: "اعتماد الأعمار المقبولة",
  export: "تصدير قائمة طلبات القرعة المؤهلة",
  import: "استيراد نتائج القرعة",
  correct: "تصحيح صف غير مطابق",
  publish: "اعتماد ونشر نتائج القرعة",
  reset: "إعادة تجربة القرعة (بيئة العرض)",
};

function cutAge(directSeats: number) {
  let cum = 0;
  for (const b of AGE_BUCKETS) {
    cum += b.seats;
    if (cum >= directSeats) return { age: b.minAge, seats: cum };
  }
  return { age: AGE_BUCKETS[AGE_BUCKETS.length - 1].minAge, seats: cum };
}

/** The two separate registration windows (direct acceptance, then the lottery as its own application) */
const W = SEASON.windows;

export function LotteryView() {
  return (
    <Gate perms={["lottery.import", "lottery.approve"]}>
      <Lottery />
    </Gate>
  );
}

function Lottery() {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const lottery = useStore((s) => s.lottery);
  const events = useStore((s) => s.events);

  const canImport = can(user, "lottery.import");
  const canApprove = can(user, "lottery.approve");

  // Since the last demo reset, what has happened? Derived from the append-only log.
  const resetAt = lastEvent(events, (e) => e.action === A.reset)?.at ?? 0;
  const since = (action: string) => lastEvent(events, (e) => e.action === action && e.at > resetAt);
  const issued = since(A.issue);
  const agesApproved = since(A.approveAges);
  const exported = since(A.export);

  const cut = useMemo(() => cutAge(season.directSeats), [season.directSeats]);
  const [exporting, setExporting] = useState(false);

  const steps = [
    { label: "القبول المباشر: الأعمار المقبولة", done: !!agesApproved },
    { label: "قائمة طلبات القرعة", done: !!exported },
    { label: "القرعة واستيراد النتائج", done: !!lottery.importedAt },
    { label: "الاعتماد والنشر", done: !!lottery.publishedAt },
  ];
  const progress = steps.filter((s) => s.done).length;

  const issueAges = () => {
    logAs(user, { action: A.issue, target: "القبول المباشر", after: `${cut.age} عاماً فأكثر — ${formatNumber(season.directSeats)} مقعداً`, detail: `ترتيب ${formatNumber(LOTTERY.directEligible)} طلباً مؤهلاً من التسجيل على القبول المباشر، من الأكبر سناً` });
    toast({ title: "أُرسلت الأعمار المقبولة للاعتماد", body: `${cut.age} عاماً فأكثر — بانتظار اعتماد مديرة الموسم`, tone: "gold", icon: "📤" });
  };

  const approveAges = () => {
    if (season.acceptedDirectAge !== cut.age) {
      actions.setSeason({ acceptedDirectAge: cut.age });
      logAs(user, { action: "تعديل إعدادات الموسم", target: "الأعمار المقبولة مباشرة", before: String(season.acceptedDirectAge), after: String(cut.age) });
    }
    logAs(user, { action: A.approveAges, target: "القبول المباشر", after: `${cut.age} عاماً فأكثر` });
    toast({ title: "أُعلنت الأعمار المقبولة", body: `كل من بلغ ${cut.age} عاماً فأكثر مقبول مباشرة — وصل إشعار لكل مقبول. التسجيل على القرعة طلب مستقل: ${W.lottery.hijri}.`, tone: "success", icon: "📣" });
  };

  const exportList = async () => {
    setExporting(true);
    await sleep(1600);
    setExporting(false);
    logAs(user, { action: A.export, target: `${formatNumber(LOTTERY.lotteryEligible)} طلباً`, detail: `طلبات التسجيل على القرعة (${W.lottery.hijri}) بعد إغلاقه — منها ${formatNumber(LOTTERY.familyInList)} طلب عائلي — بإشراف لجنة تنظيم القرعة` });
    toast({ title: "صُدّرت قائمة طلبات القرعة المؤهلة", body: "قائمة-طلبات-القرعة-1448.xlsx — سُجّل التصدير باسمك ووقته.", tone: "success", icon: "📥" });
  };

  const resetDemo = () => {
    actions.setLottery({ importedAt: undefined, importedBy: undefined, publishedAt: undefined, publishedBy: undefined });
    logAs(user, { action: A.reset, target: "القبول والقرعة", detail: "إعادة الخطوات لتجربة العرض من جديد" });
    toast({ title: "أُعيدت خطوات القرعة", tone: "info", icon: "↩️" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="المرحلة 4 — تسجيلان منفصلان"
        title="القبول المباشر والقرعة"
        icon={<Dices />}
        description={`القبول المباشر والقرعة تسجيلان منفصلان، لكلٍّ منهما طلب مستقل. القبول المباشر: تُرتَّب طلبات التسجيل المباشر (${W.direct.hijri}) من الأكبر سناً حتى ${Math.round(season.directShare * 100)}% من الحصة، وتُعلن الأعمار المقبولة في ${W.direct.announce}. القرعة: يفتح التسجيل عليها بعد الإعلان (${W.lottery.hijri})، ويسجّل فيها كل مؤهل بطلب جديد، ومنهم من لم يُقبل مباشرة، ولا تنقل المنصة إليها أي طلب. تُجرى القرعة خارج المنصة، والمنصة تستقبل نتائجها وتعتمدها وتنشرها.`}
        actions={
          (lottery.importedAt || issued || exported) && (
            <Button variant="glass" size="sm" onClick={resetDemo}>
              <RotateCcw className="size-4" /> إعادة التجربة
            </Button>
          )
        }
      />

      {/* Stepper */}
      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[.06] p-4">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-l from-gold to-green-light" animate={{ width: `${(progress / steps.length) * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
        <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.label} className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5", s.done ? "text-gold" : "text-white/80")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", s.done ? "bg-gold text-ink" : "bg-white/10")}>
                {s.done ? <CheckCircle2 className="size-4" /> : i + 1}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="طلبات القبول المباشر المؤهلة" value={LOTTERY.directEligible} icon={<Users />} hint={`التسجيل: ${W.direct.hijri}`} />
        <Kpi label="مقاعد القبول المباشر" value={season.directSeats} icon={<BadgeCheck />} tone="gold" delay={0.05} hint={`${Math.round(season.directShare * 100)}% من ${formatNumber(season.quota)}`} />
        <Kpi label="طلبات القرعة المؤهلة" value={LOTTERY.lotteryEligible} icon={<Users />} tone="maroon" delay={0.1} hint={`التسجيل: ${W.lottery.hijri}`} />
        <Kpi label="مقاعد القرعة" value={season.lotterySeats} icon={<Dices />} tone="teal" delay={0.15} hint={`+ ${formatNumber(LOTTERY.reserve)} احتياط`} />
      </div>

      {/* 1. Direct acceptance */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="1. القبول المباشر: ترتيب طلبات التسجيل المباشر بالعمر" icon={<BadgeCheck />} delay={0.1}>
          <p className="mb-4 text-sm leading-6 text-white/90">
            تُرتَّب الطلبات المؤهلة من التسجيل على القبول المباشر ({W.direct.hijri}) من الأكبر سناً إلى الأصغر بعمر صاحب الطلب، مع احتساب أفراد الطلب العائلي معاً، حتى تكتمل مقاعد القبول المباشر.
          </p>
          <ul className="space-y-1.5">
            {AGE_BUCKETS.reduce<{ b: (typeof AGE_BUCKETS)[number]; cum: number }[]>((acc, b) => [...acc, { b, cum: (acc.at(-1)?.cum ?? 0) + b.seats }], []).map(({ b, cum }, i) => {
              const inside = b.minAge >= cut.age;
              return (
                <li key={b.label} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-2 text-xs">
                  <span className={cn("font-bold tabular-nums", inside ? "text-gold" : "text-white/75")} dir="ltr">
                    {b.label}
                  </span>
                  <div className="h-4 overflow-hidden rounded-md bg-white/10">
                    <motion.div
                      className={cn("h-full rounded-md", inside ? "bg-gradient-to-l from-gold to-gold-dark" : "bg-green-light/70")}
                      initial={{ width: 0 }}
                      animate={{ width: `${(b.seats / 19_800) * 100}%` }}
                      transition={{ duration: 0.7, delay: i * 0.03 }}
                    />
                  </div>
                  <span className={cn("text-left tabular-nums", inside ? "font-bold text-white" : "text-white/75")}>{formatNumber(cum)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-white/75">الرقم على اليسار: المقاعد التراكمية من الأكبر سناً.</p>
        </Panel>

        <Panel title="إعلان الأعمار المقبولة" icon={<Megaphone />} delay={0.15}>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green to-[#00352f] p-6 text-center text-white ring-1 ring-gold/40">
            <div className="bg-pattern absolute inset-0 opacity-10" />
            <p className="relative text-sm text-white/90">كل من بلغ</p>
            <motion.p key={cut.age} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="relative font-display text-7xl font-bold text-gold">
              {cut.age}
            </motion.p>
            <p className="relative text-sm text-white/90">عاماً فأكثر — مقبول مباشرة</p>
            <p className="relative mt-3 text-xs text-white/80">
              تكتمل {formatNumber(season.directSeats)} مقعداً عند {formatNumber(cut.seats)} — الإعلان في {W.direct.announce}
            </p>
            <p className="relative mt-1 text-xs text-white/80">من لم يُقبل مباشرة يسجّل على القرعة بطلب جديد: {W.lottery.hijri}</p>
          </div>
          <ol className="mt-4 space-y-2 text-sm">
            <StepLine done={!!issued} label="رنا تراجع القائمة وترسلها للاعتماد" event={issued} />
            <StepLine done={!!agesApproved} label="سهى تعتمد وتعلن" event={agesApproved} />
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            {canImport && (
              <Button size="sm" variant="glass" onClick={issueAges} disabled={!!issued}>
                إرسال للاعتماد
              </Button>
            )}
            {canApprove && (
              <Button size="sm" variant="gold" onClick={approveAges} disabled={!!agesApproved || !issued}>
                <Megaphone className="size-4" /> اعتماد وإعلان الأعمار
              </Button>
            )}
          </div>
          {canApprove && !issued && <p className="mt-2 text-xs text-white/75">بانتظار إرسال القائمة من إدارة التسجيل (رنا).</p>}
          {!canApprove && issued && !agesApproved && <p className="mt-2 text-xs text-white/75">أُرسلت — الاعتماد من صلاحية مديرة الموسم.</p>}
        </Panel>
      </div>

      {/* 2. Export + committee */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="2. قائمة طلبات القرعة المؤهلة" icon={<Download />} delay={0.1}>
          <p className="mb-4 text-sm leading-6 text-white/90">
            بعد إغلاق التسجيل على القرعة ({W.lottery.hijri}) تُصدَّر الطلبات المؤهلة التي سُجّلت في هذه الفترة. كل طلب فيها قدّمه صاحبه بنفسه على القرعة، ولا يُنقل إليها أي طلب من التسجيل على القبول المباشر.
          </p>
          <div className="flex items-center gap-5">
            <Donut size={120} thickness={16} segments={[{ value: LOTTERY.familyInList, color: "#D9C89E", label: "fam" }, { value: LOTTERY.lotteryEligible - LOTTERY.familyInList, color: "#289E92", label: "ind" }]}>
              <p className="font-display text-lg font-bold text-white">{Math.round((LOTTERY.lotteryEligible / 1000) * 10) / 10}K</p>
            </Donut>
            <div className="flex-1">
              <Legend items={[{ label: "طلبات عائلية", color: "#D9C89E", value: formatNumber(LOTTERY.familyInList) }, { label: "طلبات فردية", color: "#289E92", value: formatNumber(LOTTERY.lotteryEligible - LOTTERY.familyInList) }]} />
            </div>
          </div>
          {exported ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/20 p-3 text-sm text-white ring-1 ring-green-light/40">
              <CheckCircle2 className="size-4 shrink-0 text-gold" /> صُدّرت بواسطة {exported.actor} — {fmtDateTime(exported.at)}
            </p>
          ) : (
            <Button variant="gold" className="mt-4 w-full" onClick={exportList} disabled={!canImport || exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? "جارٍ تجهيز الملف..." : "تصدير قائمة طلبات القرعة المؤهلة"}
            </Button>
          )}
          {!canImport && !exported && <p className="mt-2 text-xs text-white/75">التصدير من صلاحية إدارة التسجيل.</p>}
        </Panel>

        <Panel title="القرعة تجري خارج المنصة" icon={<Tv />} delay={0.15} className="!from-maroon-dark/95 !via-maroon-dark/90 !to-maroon/80">
          <div className="flex items-start gap-4">
            <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
              <Tv className="size-7 text-gold" />
              <span className="absolute -left-1 -top-1 flex items-center gap-1 rounded-full bg-maroon px-1.5 py-0.5 text-[9px] font-bold">
                <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </span>
            </span>
            <div className="text-sm leading-7 text-white/90">
              <p>
                <b className="text-gold">1 شعبان — 20:00</b> بث مباشر على التلفاز بإشراف <b>لجنة تنظيم قرعة الحج</b>.
              </p>
              <p>لا يستطيع أحد تغيير أي شيء في المنصة أثناء البث. بعد القرعة تستلم إدارة التسجيل الملف المعتمد من اللجنة وترفعه هنا.</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* 3. Import */}
      <ImportResults canImport={canImport} />

      {/* 4. Publish */}
      <PublishPanel canApprove={canApprove} />
    </div>
  );
}

function StepLine({ done, label, event }: { done: boolean; label: string; event?: AuditEvent }) {
  return (
    <li className={cn("flex items-start gap-2 rounded-xl p-2", done ? "bg-green-light/15 ring-1 ring-green-light/35" : "bg-white/[.06] ring-1 ring-white/10")}>
      {done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-light" /> : <span className="mt-1 size-3 shrink-0 rounded-full border-2 border-gold" />}
      <span>
        <span className={cn(done ? "font-semibold text-white" : "text-white/90")}>{label}</span>
        {event && <span className="block text-xs text-white/75">{event.actor} — {fmtDateTime(event.at)}</span>}
      </span>
    </li>
  );
}

type Phase = "idle" | "parsing" | "review";
type Fix = { value: string; reason: string; done?: boolean };

function ImportResults({ canImport }: { canImport: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const lottery = useStore((s) => s.lottery);
  const [phase, setPhase] = useState<Phase>("idle");
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState(LOTTERY.file);
  const [fixes, setFixes] = useState<Record<number, Fix>>({});

  const fixedCount = UNMATCHED_ROWS.filter((r) => fixes[r.row]?.done).length;

  const start = (name?: string) => {
    if (!canImport) return;
    setFileName(name && name.endsWith(".xlsx") ? name : LOTTERY.file);
    setPhase("parsing");
  };

  const correct = (r: (typeof UNMATCHED_ROWS)[number]) => {
    const f = fixes[r.row];
    if (!f || !/^\d{11}$/.test(f.value) || f.reason.trim().length < 5) {
      toast({ title: "أكمل التصحيح", body: "رقم وطني من 11 خانة وسبب واضح للتصحيح.", tone: "warning", icon: "✍️" });
      return;
    }
    setFixes((x) => ({ ...x, [r.row]: { ...f, done: true } }));
    logAs(user, {
      action: A.correct,
      target: `الطلب ${r.application}`,
      before: maskNationalId(r.fileId),
      after: maskNationalId(f.value),
      detail: `الصف ${formatNumber(r.row)}: ${f.reason.trim()}`,
    });
  };

  const commit = () => {
    actions.setLottery({ importedAt: Date.now(), importedBy: user.name, publishedAt: undefined, publishedBy: undefined });
    logAs(user, {
      action: A.import,
      target: fileName,
      detail: `${formatNumber(LOTTERY.accepted)} مقبولاً، ${formatNumber(LOTTERY.reserve)} احتياط — ${UNMATCHED_ROWS.length} صفوف غير مطابقة صُححت، ${DUPLICATE_ROWS.length} مكررة تم تجاهلها`,
    });
    toast({ title: "حُفظ استيراد النتائج", body: "النتائج مخفية عن الحجاج حتى اعتمادها ونشرها من مديرة الموسم.", tone: "success", icon: "📊" });
    setPhase("idle");
  };

  if (lottery.importedAt && phase === "idle") {
    return (
      <Panel title="3. استيراد ملف النتائج" icon={<FileSpreadsheet />} className="mt-6" delay={0.1}>
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-green-light/20 text-gold ring-1 ring-green-light/35">
            <FileSpreadsheet className="size-8" />
          </span>
          <div>
            <p className="font-bold text-white">{LOTTERY.file}</p>
            <p className="text-sm text-white/90">
              رُفع بواسطة: {lottery.importedBy} — {fmtDateTime(lottery.importedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip tone="green">مقبول بالقرعة {formatNumber(LOTTERY.accepted)} (منهم {formatNumber(LOTTERY.acceptedFamily)} عائلياً)</Chip>
              <Chip tone="gold">احتياط {formatNumber(LOTTERY.reserve)}</Chip>
              <Chip tone="ink">غير مقبول {formatNumber(LOTTERY.notAccepted)}</Chip>
              <Chip tone="maroon">7 صفوف صُححت بأسباب مسجلة · 2 مكررة تم تجاهلها</Chip>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="3. استيراد ملف النتائج المعتمد من اللجنة" icon={<FileSpreadsheet />} className="mt-6" delay={0.1}>
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (canImport) setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                start(e.dataTransfer.files[0]?.name);
              }}
              className={cn(
                "relative grid place-items-center overflow-hidden rounded-3xl border-2 border-dashed p-8 text-center transition md:p-12",
                !canImport ? "border-white/25 bg-white/[.04]" : drag ? "scale-[1.01] border-gold bg-gold/15" : "border-white/25 bg-white/[.06]",
              )}
            >
              <motion.span animate={canImport ? { y: [0, -8, 0] } : undefined} transition={{ repeat: Infinity, duration: 2.4 }} className="grid size-16 place-items-center rounded-2xl bg-white/10 text-gold shadow-lg ring-1 ring-gold/40">
                {canImport ? <UploadCloud className="size-8" /> : <Lock className="size-8 text-white/75" />}
              </motion.span>
              <p className="mt-4 font-display text-lg font-bold text-white">{canImport ? "اسحب ملف النتائج وأفلته هنا" : "الاستيراد من صلاحية إدارة التسجيل"}</p>
              <p className="mt-1 text-sm text-white/90">
                {canImport ? "تطابق المنصة كل سطر مع طلب موجود بالرقم الوطني أو رقم الطلب." : "بعد أن ترفع رنا حداد الملف وتصحح الأخطاء، يظهر هنا ملخصه للاعتماد."}
              </p>
              {canImport && (
                <button onClick={() => start()} className="mt-5 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-gold/50 hover:bg-white/15 hover:shadow-md">
                  <FileSpreadsheet className="size-5 text-gold" />
                  <span className="font-bold text-white">{LOTTERY.file}</span>
                  <span className="text-xs text-white/75">2.4 MB — استخدم الملف التجريبي</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {phase === "parsing" && (
          <motion.div key="parsing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div className="text-center">
              <div className="relative mx-auto size-40">
                <motion.div className="absolute inset-0 rounded-full border-4 border-white/15 border-t-gold" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} />
                <div className="absolute inset-3 grid place-items-center rounded-full bg-white/10 ring-1 ring-white/10">
                  <FileSpreadsheet className="size-12 text-gold" />
                </div>
              </div>
              <p className="mt-3 font-bold text-white">{fileName}</p>
              <p className="text-xs text-white/75">{formatNumber(LOTTERY.rows)} صفاً</p>
            </div>
            <DarkChecklist
              interval={750}
              steps={["قراءة الملف والتحقق من توقيع اللجنة", `مطابقة ${formatNumber(LOTTERY.rows)} صفاً بالرقم الوطني ورقم الطلب`, "كشف الصفوف المكررة", "تجهيز شاشة المراجعة قبل الاعتماد"]}
              onDone={() => setPhase("review")}
            />
          </motion.div>
        )}

        {phase === "review" && (
          <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniStat label="مقبول بالقرعة" value={formatNumber(LOTTERY.accepted)} tone="green" />
              <MiniStat label="احتياط" value={formatNumber(LOTTERY.reserve)} tone="gold" />
              <MiniStat label="غير مطابق" value={`${UNMATCHED_ROWS.length - fixedCount} / ${UNMATCHED_ROWS.length}`} tone="maroon" />
              <MiniStat label="مكرر (يُتجاهل)" value={String(DUPLICATE_ROWS.length)} tone="ink" />
            </div>

            <h3 className="mb-2 mt-6 flex items-center gap-2 font-display font-bold text-gold">
              <AlertTriangle className="size-5" /> صفوف لم تُطابق — صحّح كل صف واكتب السبب
            </h3>
            <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="bg-white/10 text-xs text-white/75">
                  <tr className="text-right">
                    <th className="p-3">الصف</th>
                    <th className="p-3">الطلب</th>
                    <th className="p-3">الرقم في الملف</th>
                    <th className="p-3">الرقم المصحح</th>
                    <th className="p-3">سبب التصحيح</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {UNMATCHED_ROWS.map((r) => {
                    const f = fixes[r.row] ?? { value: "", reason: "" };
                    return (
                      <motion.tr key={r.row} layout className={cn("transition", f.done ? "bg-green-light/15" : "bg-white/[.04]")}>
                        <td className="p-3 font-mono text-xs tabular-nums text-white/90">{formatNumber(r.row)}</td>
                        <td className="p-3 font-bold text-white">{r.application}</td>
                        <td className="p-3">
                          <span className="rounded-md bg-maroon/75 px-1.5 py-0.5 font-mono text-xs text-white" dir="ltr">{r.fileId}</span>
                          <span className="mt-1 block text-xs text-white/75">{r.issue}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <input
                              value={f.value}
                              disabled={f.done}
                              onChange={(e) => setFixes((x) => ({ ...x, [r.row]: { ...f, value: e.target.value.replace(/\D/g, "").slice(0, 11) } }))}
                              className={cn(smallInputClass, "h-9 w-36 font-mono text-sm")}
                              dir="ltr"
                              inputMode="numeric"
                              aria-label={`الرقم المصحح للصف ${r.row}`}
                            />
                            {!f.done && (
                              <button
                                onClick={() => setFixes((x) => ({ ...x, [r.row]: { ...f, value: r.suggestion, reason: f.reason || "خطأ كتابي مؤكد من تصويب اللجنة" } }))}
                                className="rounded-lg p-1.5 text-gold hover:bg-gold/20"
                                title="اقتراح المنصة (أقرب رقم مطابق)"
                                aria-label="تعبئة الاقتراح"
                              >
                                <Wand2 className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            value={f.reason}
                            disabled={f.done}
                            onChange={(e) => setFixes((x) => ({ ...x, [r.row]: { ...f, reason: e.target.value } }))}
                            placeholder="مثال: تصويب اللجنة المرفق"
                            className={cn(smallInputClass, "h-9 text-sm")}
                            aria-label={`سبب تصحيح الصف ${r.row}`}
                          />
                        </td>
                        <td className="p-3">
                          {f.done ? (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-xs font-bold text-white">
                              <CheckCircle2 className="size-4 text-gold" /> صُحح
                            </motion.span>
                          ) : (
                            <Button size="sm" variant="glass" onClick={() => correct(r)}>
                              تصحيح
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-2xl bg-white/[.06] p-3 text-sm ring-1 ring-white/10">
              <p className="flex items-center gap-2 font-bold text-white">
                <Copy className="size-4 text-gold" /> صفوف مكررة — تم تجاهلها تلقائياً
              </p>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-white/90">
                {DUPLICATE_ROWS.map((d) => (
                  <li key={d.row} className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                    الصف {formatNumber(d.row)} = الصف {formatNumber(d.duplicateOf)} (الطلب {d.application})
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/90">
                صُحح {fixedCount} من {UNMATCHED_ROWS.length}. يُحفظ الاستيراد بعد تصحيح كل الصفوف.
              </p>
              <div className="flex gap-2">
                <Button variant="glass" onClick={() => setPhase("idle")}>
                  إلغاء
                </Button>
                <Button variant="gold" onClick={commit} disabled={fixedCount < UNMATCHED_ROWS.length}>
                  <CheckCircle2 className="size-4" /> حفظ الاستيراد
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

function Chip({ children, tone }: { children: ReactNode; tone: "green" | "gold" | "maroon" | "ink" }) {
  const cls = {
    green: "bg-green-light/25 text-white ring-green-light/45",
    gold: "bg-gold/20 text-gold ring-gold/45",
    maroon: "bg-maroon/75 text-white ring-maroon-light/50",
    ink: "bg-white/10 text-white/90 ring-white/15",
  }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", cls)}>{children}</span>;
}

/** Dark-card version of the sequential "reading the file" checklist */
function DarkChecklist({ steps, onDone, interval = 900 }: { steps: string[]; onDone?: () => void; interval?: number }) {
  const [done, setDone] = useState(0);
  const finished = useRef(false);
  useEffect(() => {
    if (done >= steps.length) {
      if (!finished.current) {
        finished.current = true;
        const t = setTimeout(() => onDone?.(), 350);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => setDone((d) => d + 1), interval);
    return () => clearTimeout(t);
  }, [done, steps.length, interval, onDone]);

  return (
    <ul className="space-y-3">
      {steps.map((s, i) => {
        const state = i < done ? "done" : i === done ? "active" : "idle";
        return (
          <motion.li
            key={s}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: state === "idle" ? 0.6 : 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn("flex items-center gap-3 rounded-2xl p-4 ring-1", state === "active" ? "bg-gold/15 ring-gold/50" : "bg-white/[.06] ring-white/10")}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full transition",
                state === "done" ? "bg-green-light text-white" : state === "active" ? "bg-gold text-ink" : "bg-white/10 text-white/80",
              )}
            >
              {state === "done" ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="size-5" />
                </motion.span>
              ) : state === "active" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <span className="text-sm font-bold">{i + 1}</span>
              )}
            </span>
            <span className={cn("font-semibold", state === "idle" ? "text-white/90" : "text-white")}>{s}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "green" | "gold" | "maroon" | "ink" }) {
  const cls = { green: "bg-green-light/20 text-white ring-green-light/35", gold: "bg-gold/20 text-gold ring-gold/40", maroon: "bg-maroon/75 text-white ring-maroon-light/50", ink: "bg-white/10 text-white ring-white/10" }[tone];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn("rounded-2xl p-3 ring-1", cls)}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
    </motion.div>
  );
}

function PublishPanel({ canApprove }: { canApprove: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const lottery = useStore((s) => s.lottery);
  const [confirm, setConfirm] = useState(false);

  const publish = async () => {
    actions.setLottery({ publishedAt: Date.now(), publishedBy: user.name });
    logAs(user, { action: A.publish, target: `${formatNumber(LOTTERY.accepted)} مقبولاً — ${formatNumber(LOTTERY.reserve)} احتياط`, detail: `نتائج القرعة والاحتياط — القبول المباشر أُعلن مستقلاً في ${W.direct.announce}` });
    setConfirm(false);
    toast({ title: "نُشرت النتائج", body: "وصلت الإشعارات إلى الحجاج وظهرت القوائم على البوابة العامة.", tone: "success", icon: "🎉" });
    const confetti = (await import("canvas-confetti")).default;
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 }, colors: ["#00594F", "#D9C89E", "#AD9E6E", "#672146"] });
  };

  return (
    <>
      <Panel title="4. الاعتماد والنشر" icon={<ShieldCheck />} className="mt-6" delay={0.15}>
        {lottery.publishedAt ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-l from-green to-green-light/80 p-5 text-white ring-1 ring-gold/40">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
              <BadgeCheck className="size-8 text-gold" />
            </span>
            <div>
              <p className="font-display text-xl font-bold">نُشرت النتائج</p>
              <p className="text-sm text-white/90">
                اعتمدها ونشرها: {lottery.publishedBy} — {fmtDateTime(lottery.publishedAt)}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="text-sm leading-7 text-white/90">
              <p>لا تظهر أي نتيجة للحجاج قبل هذه اللحظة. بعد الاعتماد تصل الإشعارات خلال دقيقة، وتُنشر القوائم العامة بأرقام وطنية مقنّعة.</p>
              {!lottery.importedAt && <p className="font-bold text-gold">بانتظار استيراد ملف النتائج أولاً.</p>}
              {!canApprove && (
                <p className="mt-2 flex items-start gap-2 rounded-2xl bg-maroon/75 p-3 text-white ring-1 ring-maroon-light/50">
                  <Lock className="mt-1 size-4 shrink-0" />
                  <span>
                    هذا الزر يتطلب صلاحية <b>اعتماد ونشر النتائج</b>، وهي لمديرة الموسم فقط. فصل الاستيراد عن الاعتماد يمنع أن ينفرد شخص واحد بالنتيجة.
                  </span>
                </p>
              )}
            </div>
            <Button size="lg" variant="gold" disabled={!canApprove || !lottery.importedAt} onClick={() => setConfirm(true)}>
              <Megaphone className="size-5" /> اعتماد ونشر النتائج
            </Button>
          </div>
        )}
      </Panel>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <h3 className="font-display text-xl font-bold text-green-dark">اعتماد ونشر نتائج القرعة؟</h3>
        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
          <li>مقبول بالقرعة: {formatNumber(LOTTERY.accepted)} — الاحتياط: {formatNumber(LOTTERY.reserve)}</li>
          <li>غير مقبول في القرعة: {formatNumber(LOTTERY.notAccepted)} من {formatNumber(LOTTERY.lotteryEligible)} طلباً</li>
          <li>الملف: {LOTTERY.file} — رفعه: {lottery.importedBy}</li>
          <li>القبول المباشر ({formatNumber(LOTTERY.directSeats)}) أُعلن في {W.direct.announce} ولا يتغير بهذا النشر.</li>
        </ul>
        <p className="mt-3 rounded-2xl bg-gold/20 p-3 text-sm text-maroon">لا يمكن التراجع عن النشر. سيُسجَّل الاعتماد باسمك ووقته.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="gold" onClick={publish}>
            <CheckCircle2 className="size-4" /> اعتماد ونشر
          </Button>
          <Button variant="outline" onClick={() => setConfirm(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </>
  );
}
