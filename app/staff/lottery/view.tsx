"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { BadgeCheck, CheckCircle2, Dices, Download, Loader2, Lock, Megaphone, Pencil, Plus, RotateCcw, Send, X } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
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
import { fmtDateTime, Gate, logAs, PageHeader, useStaffUser } from "../_components/kit";
import { Box, EditHeader, EditLayout, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { viewKeys } from "@/lib/permissions";

const A = {
  issue: "إصدار الأعمار المقبولة",
  approveAges: "اعتماد الأعمار المقبولة",
  export: "تصدير إحصاء التسجيل الأولي على القرعة",
  enter: "إدخال نتائج القرعة",
  send: "إرسال نتائج القرعة للاعتماد",
  publish: "اعتماد ونشر نتائج القرعة",
  reset: "إعادة تجربة القرعة (بيئة العرض)",
};

const BASE = "/staff/lottery";

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

type Step = "ages" | "pool" | "entry" | "publish";
const STEPS: Step[] = ["ages", "pool", "entry", "publish"];

export function LotteryView() {
  return (
    <Gate perms={viewKeys("lottery")}>
      <Lottery />
    </Gate>
  );
}

/** Where the season's lottery stands: what each step is, whether it is done, and by whom */
function useLotteryState() {
  const lottery = useStore((s) => s.lottery);
  const events = useStore((s) => s.events);
  const published = usePublishedDraw();
  // The demo opens after the 1448 results were published; «إعادة التجربة» walks every step again
  const seeded = !lottery.cleared && !lottery.published && !lottery.entry;
  const resetAt = lastEvent(events, (e) => e.action === A.reset)?.at ?? 0;
  const since = (action: string) => lastEvent(events, (e) => e.action === action && e.at > resetAt);
  return { lottery, published, seeded, issued: since(A.issue), agesApproved: since(A.approveAges), exported: since(A.export) };
}

/**
 * The lottery as four steps, done in order and each on its own screen (`?step=`): the list says where each
 * stands and opens it; the screen shows what the step is about in the middle and its decision on the side.
 * Its numbers are on its statistics page (/staff/stats/lottery).
 */
function Lottery() {
  const params = useSearchParams();
  const step = params.get("step") as Step | null;
  if (step && STEPS.includes(step)) return <StepScreen key={step} step={step} />;
  return <StepsList />;
}

function StepsList() {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const st = useLotteryState();
  const { lottery, published, seeded, issued, agesApproved, exported } = st;
  const canIssue = can(user, "lottery.ages.issue");
  const canApproveAges = can(user, "lottery.ages.approve");
  const canExport = can(user, "lottery.pool.export");
  const canEnter = can(user, "lottery.draw.POST");
  const canPublish = can(user, "lottery.draw.publish") && lottery.entry?.by !== user.name;

  const resetDemo = () => {
    actions.setLottery({ entry: undefined, sent: undefined, published: undefined, cleared: true });
    logAs(user, { action: A.reset, target: "القبول والقرعة", detail: "إعادة الخطوات لتجربة العرض من جديد" });
    toast({ title: "أُعيدت خطوات القرعة", body: "سُحبت النتائج المنشورة من العرض: لا يرى الحجاج نتيجة حتى تُنشر من جديد.", tone: "info", icon: "↩️" });
  };

  const sentEvent = lottery.sent ? { actor: lottery.sent.by, at: lottery.sent.at } : undefined;
  const rows: { step: Step; title: string; text: string; status: ReactNode; last?: { actor: string; at: number }; who: string; action: string }[] = [
    {
      step: "ages",
      title: "١. القبول المباشر: الأعمار المقبولة",
      text: `تُرتَّب طلبات التسجيل المباشر من الأكبر سناً حتى ${Math.round(season.directShare * 100)}% من الحصة، وتُعلن الأعمار المقبولة.`,
      status: seeded || agesApproved ? <Tag tone="green">أُعلنت</Tag> : issued ? <Tag tone="gold">بانتظار الاعتماد</Tag> : <Tag>لم تبدأ</Tag>,
      last: agesApproved ?? issued,
      who: "ترسلها إدارة التسجيل، وتعتمدها لجنة الاعتماد",
      action: canApproveAges && issued && !agesApproved ? "اعتماد وإعلان" : canIssue && !issued && !seeded ? "إرسال للاعتماد" : "فتح",
    },
    {
      step: "pool",
      title: "٢. إحصاء التسجيل الأولي على القرعة",
      text: "المسجّلون بحسب سنة ميلاد صاحب الطلب وشهره، يُصدَّر للجنة تنظيم القرعة.",
      status: seeded || exported ? <Tag tone="green">صُدِّر</Tag> : <Tag>لم يُصدَّر</Tag>,
      last: exported,
      who: "إدارة التسجيل",
      action: canExport && !exported && !seeded ? "تصدير" : "فتح",
    },
    {
      step: "entry",
      title: "٣. إدخال نتائج البث",
      text: "ما سُحب في البث المباشر: سنوات الميلاد، ولبعضها أشهر.",
      status: published && !lottery.sent ? <Tag tone="green">أُدخلت ونُشرت</Tag> : lottery.sent ? <Tag tone="gold">أُرسلت للاعتماد</Tag> : <Tag>لم تُدخل</Tag>,
      last: sentEvent,
      who: "صاحب صلاحية «إضافة — نتائج البث»",
      action: canEnter && !lottery.sent && !published ? "إدخال النتائج" : "فتح",
    },
    {
      step: "publish",
      title: "٤. الاعتماد والنشر",
      text: "بعد النشر يعرف كل مسجّل نتيجته، ويبدأ المقبولون تثبيت تسجيلهم.",
      status: published ? <Tag tone="green">نُشرت</Tag> : lottery.sent ? <Tag tone="maroon">بانتظار الاعتماد</Tag> : <Tag>بانتظار الإدخال</Tag>,
      last: published?.at ? { actor: published.by, at: published.at } : undefined,
      who: "صاحب صلاحية «اعتماد النتائج ونشرها»",
      action: canPublish && lottery.sent && !published ? "اعتماد ونشر" : "فتح",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="القبول المباشر والقرعة"
        icon={<Dices />}
        description="أربع خطوات بالترتيب: افتح الخطوة لتنجزها أو ترى ما جرى فيها."
        actions={
          (!lottery.cleared || lottery.entry || issued || exported) && (
            <Button variant="glass" size="sm" onClick={resetDemo}>
              <RotateCcw className="size-4" /> إعادة التجربة
            </Button>
          )
        }
      />

      <ListTable head={["الخطوة", "الحالة", "آخر إجراء", "من يقوم بها"]}>
        {rows.map((r) => (
          <tr key={r.step} className="align-top">
            <td className="p-3">
              <RowLink href={`${BASE}?step=${r.step}`}>
                <span className="font-bold text-white hover:text-gold">{r.title}</span>
              </RowLink>
              <p className="text-xs leading-5 text-white/60">{r.text}</p>
              <RowActions>
                <RowLink href={`${BASE}?step=${r.step}`}>{r.action}</RowLink>
              </RowActions>
            </td>
            <td className="p-3">{r.status}</td>
            <td className="p-3 text-xs text-white/70">{r.last ? `${r.last.actor} — ${fmtDateTime(r.last.at)}` : seeded ? "بث 1448" : "—"}</td>
            <td className="p-3 text-xs text-white/70">{r.who}</td>
          </tr>
        ))}
      </ListTable>

      <Box title="كيف تعمل؟" open={false}>
        <p>القبول المباشر والقرعة تسجيلان منفصلان، لكلٍّ منهما طلب مستقل.</p>
        <p>
          <b className="text-gold">القبول المباشر:</b> تُرتَّب طلبات التسجيل المباشر ({W.direct.hijri}) من الأكبر سناً حتى {Math.round(season.directShare * 100)}% من الحصة، وتُعلن الأعمار المقبولة في {W.direct.announce}.
        </p>
        <p>
          <b className="text-gold">القرعة:</b> يُفتح بعد الإعلان التسجيل الأولي عليها ({W.lottery.hijri}) بطلب جديد. تُجرى القرعة خارج المنصة ({W.lottery.draw}) ببث مباشر على التلفاز بإشراف لجنة تنظيم قرعة الحج، تُسحب فيه سنوات ميلاد، ولبعضها أشهر، حتى تكتمل المقاعد. لا تُسحب أسماء، ولا يستطيع أحد تغيير أي طلب في المنصة أثناء البث.
        </p>
        <p>بعد البث يُدخل صاحب صلاحية «إضافة — نتائج البث» ما سُحب سنةً سنة، ثم يعتمده صاحب صلاحية «اعتماد النتائج ونشرها»، فيُقبل كل طلب وُلد صاحبه في سنة وشهر مسحوبين. فصل الإدخال عن الاعتماد يمنع أن ينفرد شخص واحد بالنتيجة.</p>
      </Box>
    </div>
  );
}

const TITLES: Record<Step, string> = {
  ages: "القبول المباشر: الأعمار المقبولة",
  pool: "إحصاء التسجيل الأولي على القرعة",
  entry: "إدخال نتائج البث",
  publish: "اعتماد ونشر نتائج القرعة",
};

function StepScreen({ step }: { step: Step }) {
  return (
    <div>
      <EditHeader back={BASE} backLabel="كل الخطوات" title={TITLES[step]} />
      {step === "ages" && <AgesStep />}
      {step === "pool" && <PoolStep />}
      {step === "entry" && <EntryStep />}
      {step === "publish" && <PublishStep />}
    </div>
  );
}

function StepLine({ done, label, event }: { done: boolean; label: string; event?: AuditEvent }) {
  return (
    <li className="flex items-start gap-2">
      {done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-light" /> : <span className="mt-1 size-3 shrink-0 rounded-full border-2 border-gold" />}
      <span>
        <span className={cn(done ? "font-semibold text-white" : "text-white/85")}>{label}</span>
        {event && (
          <span className="block text-xs text-white/60">
            {event.actor} — {fmtDateTime(event.at)}
          </span>
        )}
      </span>
    </li>
  );
}

// ───────────────────────── 1. Ages ─────────────────────────

function AgesStep() {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const { issued, agesApproved } = useLotteryState();
  const canImport = can(user, "lottery.ages.issue");
  const canApprove = can(user, "lottery.ages.approve");
  const cut = useMemo(() => cutAge(season.directSeats), [season.directSeats]);
  const rows = AGE_BUCKETS.reduce<{ b: (typeof AGE_BUCKETS)[number]; cum: number }[]>((acc, b) => [...acc, { b, cum: (acc.at(-1)?.cum ?? 0) + b.seats }], []);

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

  return (
    <EditLayout
      main={
        <>
          <div className="rounded-2xl bg-white/[.06] p-5 text-center ring-1 ring-gold/40">
            <p className="text-sm text-white/85">كل من بلغ</p>
            <p className="font-display text-6xl font-bold text-gold">{cut.age}</p>
            <p className="text-sm text-white/85">عاماً فأكثر — مقبول مباشرة</p>
            <p className="mt-2 text-xs text-white/65">
              تكتمل {formatNumber(season.directSeats)} مقعداً عند {formatNumber(cut.seats)} — الإعلان في {W.direct.announce}. من لم يُقبل مباشرة يسجّل على القرعة بطلب جديد: {W.lottery.hijri}.
            </p>
          </div>
          <p className="text-sm text-white/70">
            الطلبات المؤهلة من التسجيل على القبول المباشر ({W.direct.hijri}) مرتّبة من الأكبر سناً بعمر صاحب الطلب، مع أفراد الطلب العائلي معاً:
          </p>
          <ListTable head={["العمر", "المقاعد", "من الأكبر سناً حتى هنا", ""]} minWidth="28rem">
            {rows.map(({ b, cum }) => {
              const inside = b.minAge >= cut.age;
              return (
                <tr key={b.label} className={cn(inside && "bg-gold/[.07]")}>
                  <td className="p-3 font-bold tabular-nums" dir="ltr">
                    {b.label}
                  </td>
                  <td className="p-3 tabular-nums text-white/80">{formatNumber(b.seats)}</td>
                  <td className="p-3 tabular-nums text-white/80">{formatNumber(cum)}</td>
                  <td className="p-3">{inside ? <Tag tone="gold">مقبول مباشرة</Tag> : <Tag>إلى القرعة</Tag>}</td>
                </tr>
              );
            })}
          </ListTable>
        </>
      }
      side={
        <Box title="الإعلان">
          <ol className="space-y-2">
            <StepLine done={!!issued} label="إدارة التسجيل تراجع القائمة وترسلها للاعتماد" event={issued} />
            <StepLine done={!!agesApproved} label="لجنة الاعتماد تعتمد وتعلن" event={agesApproved} />
          </ol>
          {canImport && (
            <Button size="sm" variant="glass" className="w-full" onClick={issueAges} disabled={!!issued}>
              <Send className="size-4" /> إرسال للاعتماد
            </Button>
          )}
          {canApprove && (
            <Button size="sm" variant="gold" className="w-full" onClick={approveAges} disabled={!!agesApproved || !issued}>
              <Megaphone className="size-4" /> اعتماد وإعلان الأعمار
            </Button>
          )}
          {canApprove && !issued && <p className="text-xs text-white/60">بانتظار إرسال القائمة من صاحب صلاحية «إرسال الأعمار للاعتماد».</p>}
          {!canApprove && issued && !agesApproved && <p className="text-xs text-white/60">أُرسلت — الاعتماد من صلاحية «اعتماد الأعمار وإعلانها».</p>}
        </Box>
      }
    />
  );
}

// ───────────────────────── 2. The pool ─────────────────────────

function PoolStep() {
  const user = useStaffUser()!;
  const toast = useToast();
  const { exported } = useLotteryState();
  const canImport = can(user, "lottery.pool.export");
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const exportPool = async () => {
    setExporting(true);
    await sleep(1600);
    setExporting(false);
    logAs(user, { action: A.export, target: `${formatNumber(POOL.poolApps)} طلباً — ${formatNumber(POOL.poolSeats)} شخصاً`, detail: `التسجيل الأولي على القرعة (${W.lottery.hijri}) بعد إغلاقه، بحسب سنة ميلاد صاحب الطلب وشهره — للجنة تنظيم القرعة` });
    toast({ title: "صُدّر إحصاء التسجيل الأولي", body: "إحصاء-التسجيل-الأولي-على-القرعة-1448.xlsx — سُجّل التصدير باسمك ووقته.", tone: "success", icon: "📥" });
  };

  return (
    <EditLayout
      main={
        <>
          <p className="text-sm leading-6 text-white/70">
            بعد إغلاق التسجيل الأولي ({W.lottery.hijri}): {formatNumber(POOL.poolApps)} طلباً تضم {formatNumber(POOL.poolSeats)} شخصاً، بحسب سنة ميلاد صاحب الطلب وشهره. فتعرف اللجنة كم مقعداً تشغل كل سنة وكل شهر، وتتوقف عن السحب حين تكتمل المقاعد.
          </p>
          <ListTable head={["سنة الميلاد", "الأشخاص", "الطلبات"]} minWidth="24rem">
            {YEARS.map((y) => (
              <Fragment key={y.year}>
                <tr>
                  <td className="p-3">
                    <span className="font-bold tabular-nums text-white">{y.year}</span>
                    <RowActions>
                      <RowLink onClick={() => setOpen((o) => (o === y.year ? null : y.year))}>{open === y.year ? "إخفاء الأشهر" : "الأشهر"}</RowLink>
                    </RowActions>
                  </td>
                  <td className="p-3 tabular-nums text-white/80">{formatNumber(y.seats)}</td>
                  <td className="p-3 tabular-nums text-white/80">{formatNumber(y.apps)}</td>
                </tr>
                {open === y.year && (
                  <tr className="bg-black/15">
                    <td colSpan={3} className="p-3">
                      <ul className="grid grid-cols-3 gap-1.5 text-xs sm:grid-cols-4 lg:grid-cols-6">
                        {y.cells.map((c) => (
                          <li key={c.month} className="rounded-lg bg-white/[.06] px-2 py-1.5 text-white/90">
                            <span className="block font-semibold">{MONTHS[c.month - 1]}</span>
                            <span className="tabular-nums text-white/70">{formatNumber(c.seats)} شخصاً</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </ListTable>
        </>
      }
      side={
        <Box title="التصدير">
          {exported ? (
            <p className="flex items-start gap-2 text-white">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" /> صُدّر بواسطة {exported.actor} — {fmtDateTime(exported.at)}
            </p>
          ) : (
            <>
              <Button variant="gold" className="w-full" onClick={exportPool} disabled={!canImport || exporting}>
                {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {exporting ? "جارٍ تجهيز الملف..." : "تصدير الإحصاء للجنة تنظيم القرعة"}
              </Button>
              {!canImport && <p className="text-xs text-white/60">التصدير من صلاحية «تصدير الإحصاء».</p>}
            </>
          )}
        </Box>
      }
    />
  );
}

// ───────────────────────── 3. Entry ─────────────────────────

/** The drawn lines with the seats each one accepts */
function DrawLines({ picks, onRemove }: { picks: DrawPick[]; onRemove?: (year: number) => void }) {
  return (
    <ListTable head={["السنة", "ما سُحب", "الأشخاص", ...(onRemove ? [""] : [])]} minWidth="24rem">
      {sortPicks(picks).map((p) => (
        <tr key={p.year}>
          <td className="w-20 p-3 font-display text-lg font-bold tabular-nums text-gold">{p.year}</td>
          <td className={cn("p-3 font-semibold", p.months === "all" ? "text-white" : "text-gold-light")}>{describePick(p)}</td>
          <td className="p-3 text-xs tabular-nums text-white/75">{formatNumber(pickSeats(p))}</td>
          {onRemove && (
            <td className="w-12 p-3">
              <button type="button" onClick={() => onRemove(p.year)} aria-label={`حذف ${p.year}`} className="grid size-7 place-items-center rounded-lg bg-white/10 text-white/80 transition hover:bg-maroon hover:text-white">
                <X className="size-4" />
              </button>
            </td>
          )}
        </tr>
      ))}
      {picks.length === 0 && (
        <tr>
          <td colSpan={onRemove ? 4 : 3} className="p-6 text-center text-white/60">
            لم يُدخل شيء بعد.
          </td>
        </tr>
      )}
    </ListTable>
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
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div className={cn("h-full rounded-full", diff > 0 ? "bg-gold" : "bg-gradient-to-l from-gold to-green-light")} animate={{ width: `${Math.min(100, (t.seats / season.lotterySeats) * 100)}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

function EntryStep() {
  const user = useStaffUser()!;
  const toast = useToast();
  const { lottery, published, seeded } = useLotteryState();
  const canImport = can(user, "lottery.draw.POST");
  // Saving sends for approval; taking back what was sent is a change of its own
  const canSubmit = can(user, "lottery.draw.submit");
  const canWithdraw = can(user, "lottery.draw.PUT");
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
    logAs(user, { action: "سحب نتائج القرعة للتعديل قبل الاعتماد", target: `${lottery.entry?.picks.length ?? 0} سنوات ميلاد` });
    toast({ title: "أُعيدت النتائج للتعديل", tone: "info", icon: "✏️" });
  };

  // Already published, or sent and waiting: what was entered, read only
  if (locked || !canImport) {
    const shown = published && !lottery.sent ? published.picks : (lottery.entry?.picks ?? []);
    return (
      <EditLayout
        main={
          <>
            <DrawLines picks={shown} />
            <SeatsBar picks={shown} />
          </>
        }
        side={
          <Box title="الحالة">
            {published && !lottery.sent ? (
              <p>{seeded ? `أُدخلت نتائج بث ${W.lottery.draw} واعتُمدت ونُشرت.` : "أُدخلت النتائج واعتُمدت ونُشرت."} لتجربة الخطوات من البداية: «إعادة التجربة» في صفحة الخطوات.</p>
            ) : lottery.sent ? (
              <>
                <p className="flex items-start gap-2 text-white">
                  <Send className="mt-0.5 size-4 shrink-0 text-gold" /> أُرسلت للاعتماد: {lottery.sent.by} — {fmtDateTime(lottery.sent.at)}
                </p>
                {canWithdraw && !published && (
                  <Button variant="glass" size="sm" className="w-full" onClick={unsend}>
                    <Pencil className="size-4" /> تعديل قبل الاعتماد
                  </Button>
                )}
              </>
            ) : (
              <p className="flex items-start gap-2">
                <Lock className="mt-0.5 size-4 shrink-0" /> بانتظار إدخال نتائج البث من صاحب صلاحية «إضافة — نتائج البث».
              </p>
            )}
          </Box>
        }
      />
    );
  }

  return (
    <EditLayout
      main={
        <>
          <p className="text-sm text-white/70">أدخل ما أُعلن في البث سطراً سطراً: السنة، ثم «جميع الأشهر» أو الأشهر التي سُحبت منها.</p>
          <DrawLines picks={picks} onRemove={(y) => setPicks((ps) => ps.filter((p) => p.year !== y))} />
          <SeatsBar picks={picks} />
        </>
      }
      side={
        <>
          <Box title="إضافة سطر">
            <label className="block">
              <span className="mb-1 block font-bold text-white">سنة الميلاد</span>
              <select value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} className="h-11 w-full rounded-xl border-2 border-white/15 bg-white/10 px-3 text-base text-white outline-none focus:border-gold [&>option]:text-ink">
                <option value="">اختر السنة</option>
                {free.map((y) => (
                  <option key={y.year} value={y.year}>
                    {y.year} — {formatNumber(y.seats)} شخصاً
                  </option>
                ))}
              </select>
            </label>
            <div role="radiogroup" aria-label="الأشهر" className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/20 p-1">
              {(["all", "months"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn("rounded-lg py-2 text-sm font-bold transition", mode === m ? "bg-gold text-ink" : "text-white/80 hover:text-white")}>
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
                      className={cn("rounded-lg px-1 py-1.5 text-xs font-semibold ring-1 transition", on ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/90 ring-white/10 hover:bg-white/15")}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
            <Button variant="glass" className="w-full" onClick={add} disabled={!ready}>
              <Plus className="size-4" /> إضافة السطر
            </Button>
            <button type="button" onClick={() => setPicks(OFFICIAL_DRAW)} className="w-full text-center text-xs font-semibold text-gold underline-offset-4 hover:underline">
              في بيئة العرض: تعبئة ما أُعلن في بث 1448
            </button>
          </Box>
          <Box title="الإرسال">
            <p className="text-xs text-white/60">لا يرى الحجاج شيئاً قبل الاعتماد والنشر.</p>
            <Button variant="gold" className="w-full" onClick={send} disabled={!picks.length || !canSubmit} title={canSubmit ? undefined : "الإرسال للاعتماد يحتاج صلاحية «إرسال النتائج للاعتماد»"}>
              <Send className="size-4" /> حفظ وإرسال للاعتماد
            </Button>
          </Box>
        </>
      }
    />
  );
}

// ───────────────────────── 4. Publish ─────────────────────────

function PublishStep() {
  const user = useStaffUser()!;
  const toast = useToast();
  const { lottery, published } = useLotteryState();
  // Whoever entered the results does not approve them, even holding both permissions
  const canApprove = can(user, "lottery.draw.publish") && lottery.entry?.by !== user.name;
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

  const shown = published && !lottery.sent ? published.picks : (entry?.picks ?? []);

  return (
    <>
      <EditLayout
        main={
          <>
            <p className="text-sm leading-6 text-white/70">لا تظهر أي نتيجة للحجاج قبل النشر. بعده يعرف كل مسجّل نتيجته في حسابه، ويظهر جدول السنوات والأشهر على صفحة النتائج، ويبدأ المقبولون تثبيت تسجيلهم ({W.lottery.confirm}).</p>
            {shown.length > 0 ? (
              <>
                <DrawLines picks={shown} />
                <SeatsBar picks={shown} />
              </>
            ) : (
              <p className="rounded-2xl bg-white/[.06] p-6 text-center text-sm text-white/60 ring-1 ring-white/10">بانتظار إدخال نتائج البث وإرسالها للاعتماد.</p>
            )}
          </>
        }
        side={
          <Box title="الاعتماد والنشر">
            {published ? (
              <div className="space-y-1 text-white">
                <p className="flex items-center gap-2 font-bold">
                  <BadgeCheck className="size-5 text-gold" /> نُشرت نتائج القرعة
                </p>
                <p className="text-xs text-white/70">
                  اعتمدها ونشرها: {published.by} — {published.at ? fmtDateTime(published.at) : published.label}
                </p>
                <p className="text-xs text-white/70">
                  {published.picks.length} سنوات ميلاد — يُقبل بها {formatNumber(drawTotals(published.picks).apps)} طلباً تضم {formatNumber(drawTotals(published.picks).seats)} شخصاً.
                </p>
              </div>
            ) : (
              <>
                {!lottery.sent && <p className="font-bold text-gold">بانتظار إدخال نتائج البث وإرسالها للاعتماد.</p>}
                {lottery.sent && entry && t && (
                  <p className="font-bold text-gold">
                    وصلت للاعتماد: {entry.picks.length} سنوات ميلاد، {formatNumber(t.seats)} مقعداً — أدخلها {entry.by}.
                  </p>
                )}
                <Button variant="gold" className="w-full" disabled={!canApprove || !lottery.sent} onClick={() => setConfirm(true)}>
                  <Megaphone className="size-4" /> اعتماد ونشر النتائج
                </Button>
                {!canApprove && (
                  <p className="flex items-start gap-2 text-xs text-white/70">
                    <Lock className="mt-0.5 size-3.5 shrink-0" /> يتطلب صلاحية «اعتماد النتائج ونشرها»، ولا يعتمدها من أدخلها. فصل الإدخال عن الاعتماد يمنع أن ينفرد شخص واحد بالنتيجة.
                  </p>
                )}
              </>
            )}
          </Box>
        }
      />

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
