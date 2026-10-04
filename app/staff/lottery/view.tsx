"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, CalendarRange, CheckCircle2, Dices, Download, Keyboard, Loader2, Lock, Megaphone, Pencil, Plus, RotateCcw, Send, ShieldCheck, Tv, Users, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { AGE_BUCKETS, LOTTERY } from "@/lib/data/staff-seed";
import { MONTHS, OFFICIAL_DRAW, POOL_YEARS, describePick, drawTotals, pickSeats, poolYear, sortPicks, usePublishedDraw, type DrawPick } from "@/lib/lottery";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { can } from "@/lib/staff";
import { actions, useStore, type AuditEvent } from "@/lib/store";
import { cn, formatNumber, nowMs, sleep } from "@/lib/utils";
import { lastEvent } from "../_components/data";
import { fmtDateTime, Gate, Kpi, logAs, PageHeader, Panel, useStaffUser } from "../_components/kit";

const A = {
  issue: "إصدار الأعمار المقبولة",
  approveAges: "اعتماد الأعمار المقبولة",
  export: "تصدير إحصاء التسجيل الأولي على القرعة",
  enter: "إدخال نتائج القرعة",
  send: "إرسال نتائج القرعة للاعتماد",
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

/** The two separate registration windows (direct acceptance, then the preliminary lottery registration) */
const W = SEASON.windows;
const POOL = drawTotals([]);
const YEARS = Array.from({ length: POOL_YEARS.to - POOL_YEARS.from + 1 }, (_, i) => poolYear(POOL_YEARS.from + i));

/** "1961، 1965 (كانون الثاني)، 1972 (كانون الثاني – نيسان)" for the record */
function pickList(picks: DrawPick[]) {
  return sortPicks(picks)
    .map((p) => (p.months === "all" ? String(p.year) : `${p.year} (${p.months.map((m) => MONTHS[m - 1]).join("، ")})`))
    .join("، ");
}

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
  const published = usePublishedDraw();

  const canImport = can(user, "lottery.import");
  const canApprove = can(user, "lottery.approve");

  // The demo opens after the 1448 results were published; «إعادة التجربة» walks every step again
  const seeded = !lottery.cleared && !lottery.published && !lottery.entry;
  const resetAt = lastEvent(events, (e) => e.action === A.reset)?.at ?? 0;
  const since = (action: string) => lastEvent(events, (e) => e.action === action && e.at > resetAt);
  const issued = since(A.issue);
  const agesApproved = since(A.approveAges);
  const exported = since(A.export);

  const cut = useMemo(() => cutAge(season.directSeats), [season.directSeats]);
  const [exporting, setExporting] = useState(false);

  const steps = [
    { label: "القبول المباشر: الأعمار المقبولة", done: seeded || !!agesApproved },
    { label: "إحصاء التسجيل الأولي على القرعة", done: seeded || !!exported },
    { label: "إدخال نتائج البث", done: seeded || !!lottery.sent },
    { label: "الاعتماد والنشر", done: !!published },
  ];
  const progress = steps.filter((s) => s.done).length;

  const issueAges = () => {
    logAs(user, { action: A.issue, target: "القبول المباشر", after: `${cut.age} عاماً فأكثر — ${formatNumber(season.directSeats)} مقعداً`, detail: `ترتيب ${formatNumber(LOTTERY.directEligible)} طلباً مؤهلاً من التسجيل على القبول المباشر، من الأكبر سناً` });
    toast({ title: "أُرسلت الأعمار المقبولة للاعتماد", body: `${cut.age} عاماً فأكثر — بانتظار صاحب صلاحية الاعتماد`, tone: "gold", icon: "📤" });
  };

  const approveAges = () => {
    if (season.acceptedDirectAge !== cut.age) {
      actions.setSeason({ acceptedDirectAge: cut.age });
      logAs(user, { action: "تعديل إعدادات الموسم", target: "الأعمار المقبولة مباشرة", before: String(season.acceptedDirectAge), after: String(cut.age) });
    }
    logAs(user, { action: A.approveAges, target: "القبول المباشر", after: `${cut.age} عاماً فأكثر` });
    toast({ title: "أُعلنت الأعمار المقبولة", body: `كل من بلغ ${cut.age} عاماً فأكثر مقبول مباشرة — وصل إشعار لكل مقبول. التسجيل الأولي على القرعة طلب مستقل: ${W.lottery.hijri}.`, tone: "success", icon: "📣" });
  };

  const exportPool = async () => {
    setExporting(true);
    await sleep(1600);
    setExporting(false);
    logAs(user, { action: A.export, target: `${formatNumber(POOL.poolApps)} طلباً — ${formatNumber(POOL.poolSeats)} شخصاً`, detail: `التسجيل الأولي على القرعة (${W.lottery.hijri}) بعد إغلاقه، بحسب سنة ميلاد صاحب الطلب وشهره — للجنة تنظيم القرعة` });
    toast({ title: "صُدّر إحصاء التسجيل الأولي", body: "إحصاء-التسجيل-الأولي-على-القرعة-1448.xlsx — سُجّل التصدير باسمك ووقته.", tone: "success", icon: "📥" });
  };

  const resetDemo = () => {
    actions.setLottery({ entry: undefined, sent: undefined, published: undefined, cleared: true });
    logAs(user, { action: A.reset, target: "القبول والقرعة", detail: "إعادة الخطوات لتجربة العرض من جديد" });
    toast({ title: "أُعيدت خطوات القرعة", body: "سُحبت النتائج المنشورة من العرض: لا يرى الحجاج نتيجة حتى تُنشر من جديد.", tone: "info", icon: "↩️" });
  };

  return (
    <div>
      <PageHeader
        eyebrow="المرحلة 4 — تسجيلان منفصلان"
        title="القبول المباشر والقرعة"
        icon={<Dices />}
        description={`القبول المباشر والقرعة تسجيلان منفصلان، لكلٍّ منهما طلب مستقل. القبول المباشر: تُرتَّب طلبات التسجيل المباشر (${W.direct.hijri}) من الأكبر سناً حتى ${Math.round(season.directShare * 100)}% من الحصة، وتُعلن الأعمار المقبولة في ${W.direct.announce}. القرعة: يُفتح بعد الإعلان التسجيل الأولي عليها (${W.lottery.hijri}) بطلب جديد. تُجرى القرعة خارج المنصة ببث مباشر تُسحب فيه سنوات ميلاد، ولبعضها أشهر؛ والمنصة تُدخل ما سُحب وتعتمده وتنشره، فيُقبل كل طلب وُلد صاحبه في سنة وشهر مسحوبين.`}
        actions={
          (!lottery.cleared || lottery.entry || issued || exported) && (
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
        <Kpi label="طلبات التسجيل الأولي على القرعة" value={POOL.poolApps} icon={<Users />} tone="maroon" delay={0.1} hint={`${formatNumber(POOL.poolSeats)} شخصاً — ${W.lottery.hijri}`} />
        <Kpi label="مقاعد القرعة" value={season.lotterySeats} icon={<Dices />} tone="teal" delay={0.15} hint="تُملأ بسنوات الميلاد وأشهرها المسحوبة" />
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
            <p className="relative mt-1 text-xs text-white/80">من لم يُقبل مباشرة يسجّل تسجيلاً أولياً على القرعة بطلب جديد: {W.lottery.hijri}</p>
          </div>
          <ol className="mt-4 space-y-2 text-sm">
            <StepLine done={!!issued} label="إدارة التسجيل تراجع القائمة وترسلها للاعتماد" event={issued} />
            <StepLine done={!!agesApproved} label="لجنة الاعتماد تعتمد وتعلن" event={agesApproved} />
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
          {canApprove && !issued && <p className="mt-2 text-xs text-white/75">بانتظار إرسال القائمة من صاحب صلاحية «إدخال نتائج القرعة».</p>}
          {!canApprove && issued && !agesApproved && <p className="mt-2 text-xs text-white/75">أُرسلت — الاعتماد من صلاحية «اعتماد ونشر النتائج».</p>}
        </Panel>
      </div>

      {/* 2. The pool by birth year and month + the broadcast */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <PoolPanel>
          {exported ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/20 p-3 text-sm text-white ring-1 ring-green-light/40">
              <CheckCircle2 className="size-4 shrink-0 text-gold" /> صُدّر بواسطة {exported.actor} — {fmtDateTime(exported.at)}
            </p>
          ) : (
            <Button variant="gold" className="mt-4 w-full" onClick={exportPool} disabled={!canImport || exporting}>
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? "جارٍ تجهيز الملف..." : "تصدير الإحصاء للجنة تنظيم القرعة"}
            </Button>
          )}
          {!canImport && !exported && <p className="mt-2 text-xs text-white/75">التصدير من صلاحية «إدخال نتائج القرعة».</p>}
        </PoolPanel>

        <Panel title="القرعة تجري خارج المنصة" icon={<Tv />} delay={0.15} className="!from-maroon-dark/95 !via-maroon-dark/90 !to-maroon/80">
          <div className="flex items-start gap-4">
            <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
              <Tv className="size-7 text-gold" />
              <span className="absolute -left-1 -top-1 flex items-center gap-1 rounded-full bg-maroon px-1.5 py-0.5 text-[9px] font-bold">
                <span className="size-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </span>
            </span>
            <div className="space-y-2 text-sm leading-7 text-white/90">
              <p>
                <b className="text-gold">{W.lottery.draw}</b> بث مباشر على التلفاز بإشراف <b>لجنة تنظيم قرعة الحج</b>.
              </p>
              <p>تُسحب سنوات ميلاد، ولبعضها أشهر محددة، حتى تكتمل مقاعد القرعة. لا تُسحب أسماء، ولا يستطيع أحد تغيير أي طلب في المنصة أثناء البث.</p>
              <p>بعد البث يُدخل صاحب صلاحية «إدخال نتائج القرعة» ما سُحب هنا سنةً سنة، ثم يعتمده صاحب صلاحية «اعتماد ونشر النتائج».</p>
            </div>
          </div>
        </Panel>
      </div>

      {/* 3. Entry */}
      <EntryPanel canImport={canImport} seeded={seeded} />

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

/** Who registered, by the main applicant's birth year — open a year to see its months */
function PoolPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<number | null>(null);
  const max = Math.max(...YEARS.map((y) => y.seats));
  const year = YEARS.find((y) => y.year === open);
  return (
    <Panel title="2. إحصاء التسجيل الأولي على القرعة" icon={<CalendarRange />} delay={0.1}>
      <p className="mb-4 text-sm leading-6 text-white/90">
        بعد إغلاق التسجيل الأولي ({W.lottery.hijri}) تُحصي المنصة المسجّلين بحسب سنة ميلاد صاحب الطلب وشهره: {formatNumber(POOL.poolApps)} طلباً تضم {formatNumber(POOL.poolSeats)} شخصاً. فتعرف اللجنة كم مقعداً تشغل كل سنة وكل شهر، وتتوقف عن السحب حين تكتمل المقاعد. اضغط سنة لترى أشهرها.
      </p>
      <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
        {YEARS.map((y) => (
          <li key={y.year}>
            <button
              type="button"
              onClick={() => setOpen((o) => (o === y.year ? null : y.year))}
              aria-pressed={open === y.year}
              className={cn("relative w-full overflow-hidden rounded-lg px-1 py-1.5 text-center ring-1 transition", open === y.year ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white ring-white/10 hover:bg-white/15")}
            >
              <span className={cn("absolute inset-x-0 bottom-0 bg-green-light/35", open === y.year && "bg-ink/10")} style={{ height: `${(y.seats / max) * 100}%` }} aria-hidden />
              <span className="relative block text-xs font-bold tabular-nums">{y.year}</span>
              <span className="relative block text-[10px] tabular-nums opacity-80">{formatNumber(y.seats)}</span>
            </button>
          </li>
        ))}
      </ul>
      <AnimatePresence>
        {year && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="mb-2 text-sm font-bold text-gold">
                مواليد {year.year}: {formatNumber(year.seats)} شخصاً في {formatNumber(year.apps)} طلباً
              </p>
              <ul className="grid grid-cols-3 gap-1.5 text-xs sm:grid-cols-4 lg:grid-cols-6">
                {year.cells.map((c) => (
                  <li key={c.month} className="rounded-lg bg-white/[.06] px-2 py-1.5 text-white/90">
                    <span className="block font-semibold">{MONTHS[c.month - 1]}</span>
                    <span className="tabular-nums text-white/75">{formatNumber(c.seats)} شخصاً</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </Panel>
  );
}

/** The drawn lines with the seats each one accepts */
function DrawLines({ picks, onRemove }: { picks: DrawPick[]; onRemove?: (year: number) => void }) {
  return (
    <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[.06] ring-1 ring-white/10">
      {sortPicks(picks).map((p) => (
        <motion.li key={p.year} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-14 font-display text-xl font-bold tabular-nums text-gold">{p.year}</span>
          <span className={cn("flex-1 text-sm font-semibold", p.months === "all" ? "text-white" : "text-gold-light")}>{describePick(p)}</span>
          <span className="text-xs tabular-nums text-white/75">{formatNumber(pickSeats(p))} شخصاً</span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(p.year)} aria-label={`حذف ${p.year}`} className="grid size-7 place-items-center rounded-lg bg-white/10 text-white/80 transition hover:bg-maroon hover:text-white">
              <X className="size-4" />
            </button>
          )}
        </motion.li>
      ))}
      {picks.length === 0 && <li className="px-4 py-6 text-center text-sm text-white/75">لم يُدخل شيء بعد.</li>}
    </ul>
  );
}

/** Seats the lines accept against the lottery's seats */
function SeatsBar({ picks }: { picks: DrawPick[] }) {
  const season = useSeason();
  const t = drawTotals(picks);
  const diff = t.seats - season.lotterySeats;
  return (
    <div className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-white/90">
          المقاعد المغطاة: <b className="font-display text-lg tabular-nums text-white">{formatNumber(t.seats)}</b> من {formatNumber(season.lotterySeats)} — {formatNumber(t.apps)} طلباً
        </span>
        <span className={cn("text-xs font-bold", diff === 0 ? "text-green-light" : diff > 0 ? "text-gold" : "text-white/75")}>
          {diff === 0 ? "اكتملت مقاعد القرعة" : diff > 0 ? `تزيد ${formatNumber(diff)} مقعداً — راجع ما أُدخل` : `بقي ${formatNumber(-diff)} مقعداً`}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
        <motion.div className={cn("h-full rounded-full", diff > 0 ? "bg-gold" : "bg-gradient-to-l from-gold to-green-light")} animate={{ width: `${Math.min(100, (t.seats / season.lotterySeats) * 100)}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

function EntryPanel({ canImport, seeded }: { canImport: boolean; seeded: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const lottery = useStore((s) => s.lottery);
  const published = usePublishedDraw();
  const [picks, setPicks] = useState<DrawPick[]>(() => lottery.entry?.picks ?? []);
  const [year, setYear] = useState<number | "">("");
  const [mode, setMode] = useState<"all" | "months">("all");
  const [months, setMonths] = useState<number[]>([]);

  const locked = !!lottery.sent || !!published;
  const free = YEARS.filter((y) => !picks.some((p) => p.year === y.year));
  const ready = year !== "" && (mode === "all" || months.length > 0);

  const add = () => {
    if (year === "" || !ready) return;
    setPicks((ps) => [...ps, { year, months: mode === "all" ? "all" : [...months].sort((a, b) => a - b) }]);
    setYear("");
    setMode("all");
    setMonths([]);
  };

  const send = () => {
    const at = nowMs();
    actions.setLottery({ entry: { picks, by: user.name, at }, sent: { by: user.name, at } });
    const t = drawTotals(picks);
    logAs(user, { action: A.enter, target: `${picks.length} سنوات ميلاد — ${formatNumber(t.seats)} مقعداً`, detail: `كما سُحبت في البث: ${pickList(picks)}` });
    logAs(user, { action: A.send, target: `${picks.length} سنوات ميلاد — ${formatNumber(t.seats)} مقعداً` });
    toast({ title: "أُرسلت نتائج القرعة للاعتماد", body: "لا يرى الحجاج شيئاً قبل الاعتماد والنشر.", tone: "gold", icon: "📤" });
  };

  const unsend = () => {
    actions.setLottery({ sent: undefined });
    toast({ title: "أُعيدت النتائج للتعديل", tone: "info", icon: "✏️" });
  };

  return (
    <Panel title="3. إدخال نتائج البث" icon={<Keyboard />} className="mt-6" delay={0.1}>
      {published && !lottery.sent ? (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-white/90">
            {seeded ? `أُدخلت نتائج بث ${W.lottery.draw} واعتُمدت ونُشرت.` : "أُدخلت النتائج واعتُمدت ونُشرت."} لتجربة الخطوات من البداية اضغط «إعادة التجربة» في أعلى الصفحة.
          </p>
          <DrawLines picks={published.picks} />
          <SeatsBar picks={published.picks} />
        </div>
      ) : locked ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 rounded-2xl bg-gold/15 p-3 text-sm text-white ring-1 ring-gold/40">
            <Send className="size-4 shrink-0 text-gold" /> أُرسلت للاعتماد: {lottery.sent?.by} — {lottery.sent ? fmtDateTime(lottery.sent.at) : ""}
          </p>
          <DrawLines picks={lottery.entry?.picks ?? []} />
          <SeatsBar picks={lottery.entry?.picks ?? []} />
          {canImport && !published && (
            <Button variant="glass" size="sm" onClick={unsend}>
              <Pencil className="size-4" /> تعديل قبل الاعتماد
            </Button>
          )}
        </div>
      ) : !canImport ? (
        <p className="flex items-start gap-2 rounded-2xl bg-white/[.06] p-4 text-sm text-white/90 ring-1 ring-white/10">
          <Lock className="mt-0.5 size-4 shrink-0" /> بانتظار إدخال نتائج البث من صاحب صلاحية «إدخال نتائج القرعة».
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <p className="text-sm leading-6 text-white/90">أدخل ما أُعلن في البث سطراً سطراً: السنة، ثم «جميع الأشهر» أو الأشهر التي سُحبت منها.</p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-white">سنة الميلاد</span>
              <select value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} className="h-11 w-full rounded-xl border-2 border-white/15 bg-white/10 px-3 text-base text-white outline-none focus:border-gold [&>option]:text-ink">
                <option value="">اختر السنة</option>
                {free.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.year} — {formatNumber(y.seats)} شخصاً
                  </option>
                ))}
              </select>
            </label>
            <div role="radiogroup" aria-label="الأشهر" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-white/[.06] p-1.5">
              {(["all", "months"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("rounded-xl py-2 text-sm font-bold transition", mode === m ? "bg-gold text-ink" : "text-white/80 hover:text-white")}>
                  {m === "all" ? "جميع الأشهر" : "أشهر محددة"}
                </button>
              ))}
            </div>
            {mode === "months" && (
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((name, i) => {
                  const on = months.includes(i + 1);
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMonths((ms) => (on ? ms.filter((x) => x !== i + 1) : [...ms, i + 1]))}
                      className={cn("rounded-lg px-2 py-1.5 text-xs font-semibold ring-1 transition", on ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/90 ring-white/10 hover:bg-white/15")}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
            <Button variant="gold" className="w-full" onClick={add} disabled={!ready}>
              <Plus className="size-4" /> إضافة السطر
            </Button>
            <button type="button" onClick={() => setPicks(OFFICIAL_DRAW)} className="w-full text-center text-xs font-semibold text-gold underline-offset-4 hover:underline">
              في بيئة العرض: تعبئة ما أُعلن في بث 1448
            </button>
          </div>
          <div className="space-y-3">
            <DrawLines picks={picks} onRemove={(y) => setPicks((ps) => ps.filter((p) => p.year !== y))} />
            <SeatsBar picks={picks} />
            <Button variant="gold" className="w-full" onClick={send} disabled={!picks.length}>
              <Send className="size-4" /> حفظ وإرسال للاعتماد
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function PublishPanel({ canApprove }: { canApprove: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const lottery = useStore((s) => s.lottery);
  const published = usePublishedDraw();
  const [confirm, setConfirm] = useState(false);
  const entry = lottery.entry;
  const t = entry ? drawTotals(entry.picks) : null;

  const publish = async () => {
    if (!entry || !t) return;
    actions.setLottery({ published: { picks: entry.picks, by: user.name, at: nowMs() }, sent: undefined, cleared: false });
    logAs(user, { action: A.publish, target: `${formatNumber(t.seats)} مقعداً — ${formatNumber(t.apps)} طلباً`, detail: `جدول سنوات الميلاد وأشهرها كما أُعلن في البث: ${pickList(entry.picks)}` });
    setConfirm(false);
    toast({ title: "نُشرت نتائج القرعة", body: "عرف كل مسجّل نتيجته في حسابه، وظهر جدول السنوات والأشهر على صفحة النتائج.", tone: "success", icon: "🎉" });
    const confetti = (await import("canvas-confetti")).default;
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.7 }, colors: ["#00594F", "#D9C89E", "#AD9E6E", "#672146"] });
  };

  return (
    <>
      <Panel title="4. الاعتماد والنشر" icon={<ShieldCheck />} className="mt-6" delay={0.15}>
        {published ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap items-center gap-4 rounded-3xl bg-gradient-to-l from-green to-green-light/80 p-5 text-white ring-1 ring-gold/40">
            <span className="grid size-14 place-items-center rounded-2xl bg-white/15">
              <BadgeCheck className="size-8 text-gold" />
            </span>
            <div>
              <p className="font-display text-xl font-bold">نُشرت نتائج القرعة</p>
              <p className="text-sm text-white/90">
                اعتمدها ونشرها: {published.by} — {published.at ? fmtDateTime(published.at) : published.label}
              </p>
              <p className="text-sm text-white/90">
                {published.picks.length} سنوات ميلاد — يُقبل بها {formatNumber(drawTotals(published.picks).apps)} طلباً تضم {formatNumber(drawTotals(published.picks).seats)} شخصاً.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="text-sm leading-7 text-white/90">
              <p>لا تظهر أي نتيجة للحجاج قبل هذه اللحظة. بعد النشر يعرف كل مسجّل نتيجته في حسابه، ويظهر جدول السنوات والأشهر على صفحة النتائج، ويبدأ المقبولون تثبيت تسجيلهم ({W.lottery.confirm}).</p>
              {!lottery.sent && <p className="font-bold text-gold">بانتظار إدخال نتائج البث وإرسالها للاعتماد.</p>}
              {lottery.sent && entry && t && (
                <p className="font-bold text-gold">
                  وصلت للاعتماد: {entry.picks.length} سنوات ميلاد، {formatNumber(t.seats)} مقعداً — أدخلها {entry.by}.
                </p>
              )}
              {!canApprove && (
                <p className="mt-2 flex items-start gap-2 rounded-2xl bg-maroon/75 p-3 text-white ring-1 ring-maroon-light/50">
                  <Lock className="mt-1 size-4 shrink-0" />
                  <span>
                    هذا الزر يتطلب صلاحية <b>اعتماد ونشر النتائج</b>. فصل الإدخال عن الاعتماد يمنع أن ينفرد شخص واحد بالنتيجة.
                  </span>
                </p>
              )}
            </div>
            <Button size="lg" variant="gold" disabled={!canApprove || !lottery.sent} onClick={() => setConfirm(true)}>
              <Megaphone className="size-5" /> اعتماد ونشر النتائج
            </Button>
          </div>
        )}
      </Panel>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <h3 className="font-display text-xl font-bold text-green-dark">اعتماد ونشر نتائج القرعة؟</h3>
        {entry && t && (
          <>
            <ul className="mt-3 divide-y divide-gold/30 rounded-2xl border border-gold/40 text-sm">
              {sortPicks(entry.picks).map((p) => (
                <li key={p.year} className="flex items-center gap-3 px-3 py-1.5">
                  <b className="w-12 tabular-nums text-green-dark">{p.year}</b>
                  <span className="flex-1 text-ink">{describePick(p)}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              <li>
                يُقبل بها {formatNumber(t.apps)} طلباً تضم {formatNumber(t.seats)} شخصاً، من {formatNumber(t.poolApps)} طلباً
              </li>
              <li>
                أدخلها: {entry.by} — {fmtDateTime(entry.at)}
              </li>
              <li>القبول المباشر أُعلن في {W.direct.announce} ولا يتغير بهذا النشر.</li>
            </ul>
          </>
        )}
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
