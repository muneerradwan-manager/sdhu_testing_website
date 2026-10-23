"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Bus, CheckCircle2, Circle, ClipboardCheck, Dices, FileStack, HeartPulse, ListTodo, PencilLine, RadioTower, ScrollText, Settings2, UserRoundPlus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { filedBy } from "@/app/administrator/_lib/coordinator";
import { outcomeOf, stageAt, trackOf } from "@/lib/journey";
import { drawTotals, usePublishedDraw } from "@/lib/lottery";
import { medicalDocsFor, medicalKey } from "@/lib/registration/post";
import { ageOf, fullName } from "@/lib/registry";
import { DAILY_REGISTRATIONS, EXEC, LOTTERY, REG_STATS } from "@/lib/data/staff-seed";
import { groupName } from "@/lib/groups";
import { CURRENT_SEASON, FILE_TYPES, fileState, gapsOf, useEmployees, useOpFiles } from "@/lib/ops";
import { STATS_SYSTEMS, statsKey, type StatsSystem } from "@/lib/permissions";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { can, type StaffUser } from "@/lib/staff";
import { useStore } from "@/lib/store";
import { cn, countOf, formatNumber } from "@/lib/utils";
import { useContentSummary } from "../content/_components/summary";
import { useAllEvents, useReviewQueue, useTicketQueue } from "../_components/data";
import { ago, BarList, Columns, Donut, fmtDateTime, Legend, Panel, useNow } from "../_components/kit";

/**
 * Each system's statistics: its figures, and what waits in it. They were «لوحتي», one page gathering the figures
 * of every permission an employee held; now each system's figures are a permission of their own
 * (`<system>.stats.GET`, lib/permissions.ts), on a page of their own (/staff/stats/<system>), and «لوحة الإدارة
 * العليا» gathers them all. Nothing is edited here: the figures link to the page where the work is done.
 */

type Todo = { id: string; text: string; href?: string; done?: boolean; tone?: "maroon" | "gold" | "green" };

/** Each system's statistics page: its name in the menu and on the page, and where its work is done */
export const STATS_META: Record<StatsSystem, { title: string; icon: ReactNode; href: string; link: string }> = {
  office: { title: "التسجيل في المكتب", icon: <UserRoundPlus />, href: "/staff/registration", link: "تسجيل حاج جديد" },
  reviews: { title: "مراجعة الطلبات", icon: <ClipboardCheck />, href: "/staff/reviews", link: "افتح المراجعة" },
  lottery: { title: "القبول والقرعة", icon: <Dices />, href: "/staff/lottery", link: "افتح الخطوات" },
  season: { title: "إعدادات الموسم", icon: <Settings2 />, href: "/staff/season", link: "تعديل الإعدادات" },
  operations: { title: "غرفة العمليات", icon: <RadioTower />, href: "/staff/operations", link: "افتح غرفة العمليات" },
  medical: { title: "الفريق الطبي", icon: <HeartPulse />, href: "/staff/medical", link: "افتح عمل الفريق" },
  transport: { title: "المواصلات", icon: <Bus />, href: "/staff/transport", link: "افتح عمل الفريق" },
  opfiles: { title: "الملفات التشغيلية", icon: <FileStack />, href: "/staff/operational-files", link: "افتح الملفات" },
  content: { title: "محتوى الموقع", icon: <PencilLine />, href: "/staff/content", link: "افتح المحتوى" },
  audit: { title: "سجل الأحداث", icon: <ScrollText />, href: "/staff/audit", link: "افتح السجل" },
};

export const statsHref = (sys: StatsSystem) => `/staff/stats/${sys}`;

/** The systems whose statistics this employee may see, in the menu's order */
export const statsOf = (user: StaffUser | null) => STATS_SYSTEMS.filter((s) => can(user, statsKey(s)));

const POOL = drawTotals([]);

/** The groups of the cluster on the day of Arafat, as the room's last reports gave them */
const GROUP_REPORTS = [
  { group: 27, cluster: "النور", inArafat: 48, of: 48, report: "13:00", leader: "أحمد الحمصي" },
  { group: 14, cluster: "النور", inArafat: 49, of: 50, report: "13:40", leader: "محمود الشامي" },
  { group: 31, cluster: "النور", inArafat: 50, of: 50, report: "12:55", leader: "بسام درويش" },
  { group: 19, cluster: "اليقين", inArafat: 44, of: 45, report: "13:20", leader: "عمر الزين" },
  { group: 8, cluster: "الشهباء", inArafat: 44, of: 45, report: "14:05", leader: "لؤي حمدان" },
];

/** Everything the statistics read, once: each system takes its part */
function useStatsData(user: StaffUser) {
  const now = useNow(30_000);
  const season = useSeason();
  const reviews = useReviewQueue();
  const tickets = useTicketQueue();
  const events = useAllEvents();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const lottery = useStore((s) => s.lottery);
  const content = useContentSummary();
  const employees = useEmployees();
  const allFiles = useOpFiles();
  const draw = usePublishedDraw();

  return useMemo(() => {
    const seasonFiles = allFiles.filter((f) => f.season === CURRENT_SEASON);
    const realApps = Object.values(applications);
    const openTickets = tickets.filter((t) => t.status !== "resolved");

    // The office: what this employee registered, each application where it stands now, and the whole office's count
    const filed = filedBy(user.id, applications).map((a) => {
      const out = outcomeOf(a, draw, a.policy?.acceptedDirectAge ?? season.acceptedDirectAge);
      const { stage } = stageAt(out.steps, (now - a.submittedAt) / 1000);
      return { a, stage, applicant: a.members.find((m) => m.relation === "self") ?? a.members[0] };
    });
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);

    // The medical team: documents waiting, recorded conditions; transport: who needs an equipped bus
    let docsWaiting = 0;
    let conditions = 0;
    let equipped = 0;
    for (const a of realApps) {
      const p = post[a.applicantId];
      for (const m of a.members) {
        const rec = p?.health?.members[m.person.id];
        if (p?.medical) docsWaiting += medicalDocsFor(m, p.health).filter((d) => p.medical?.[medicalKey(m, d)] === "uploaded").length;
        if (rec && (rec.conditions.length || rec.needs.length || rec.medications.trim())) conditions++;
        if ((rec?.needs ?? []).some((n) => ["كرسي متحرك", "صعوبة في المشي", "أكسجين ليلي"].includes(n)) || ageOf(m.person) >= 75) equipped++;
      }
    }

    // The demo opens after the 1448 results were published, until «إعادة التجربة» on the lottery page
    const published = !!lottery.published || (!lottery.cleared && !lottery.entry);
    return {
      now,
      season,
      events,
      content,
      realApps,
      realPersons: realApps.reduce((a, x) => a + x.members.length, 0),
      realPaid: realApps.reduce((a, x) => a + (x.paid || 0), 0),
      officeFiled: realApps.filter((a) => a.submittedBy).length,
      filed,
      filedToday: filed.filter((f) => f.a.submittedAt >= startOfDay).length,
      filedAccepted: filed.filter((f) => f.stage.key === "accepted").length,
      pendingReviews: reviews.filter((r) => !r.review).length,
      pendingContracts: Object.values(post).filter((p) => p.contract?.status === "pending").length,
      openTickets,
      critical: openTickets.filter((t) => t.severity === "critical").length,
      health: openTickets.filter((t) => t.kind === "health").length,
      missing: openTickets.filter((t) => t.kind === "missing").length,
      transportOpen: openTickets.filter((t) => t.kind === "transport").length,
      groupReports: GROUP_REPORTS.map((r) => ({ ...r, open: openTickets.filter((t) => t.name.includes(groupName(r.group))).length })),
      busAccepted: events.some((e) => e.action === "اعتماد حافلة إضافية"),
      docsWaiting,
      conditions,
      equipped,
      seasonFiles,
      opsGaps: seasonFiles.reduce((a, f) => a + gapsOf(f).length, 0),
      opsMissing: FILE_TYPES.length - seasonFiles.length,
      opsActive: seasonFiles.filter((f) => fileState(f) === "active").length,
      participants: employees.filter((e) => e.seasons.includes(CURRENT_SEASON)).length,
      published,
      entered: published || !!lottery.sent,
    };
  }, [user.id, now, season, reviews, tickets, events, applications, post, lottery, content, employees, allFiles, draw]);
}
type Data = ReturnType<typeof useStatsData>;

/** What waits in each system now, as a list of links: the tasks «لوحتي» used to gather */
function todosOf(sys: StatsSystem, d: Data, user: StaffUser): Todo[] {
  switch (sys) {
    case "office":
      return can(user, "office.applications.POST") ? [{ id: "register", text: "تسجيل مواطن يراجع المكتب على الحج", href: "/staff/registration", tone: "gold" }] : [];
    case "reviews":
      return [
        { id: "rev", text: `مراجعة ${d.pendingReviews} طلبات تحتاج قراراً بشرياً`, href: "/staff/reviews", tone: "gold", done: d.pendingReviews === 0 },
        ...(d.pendingContracts ? [{ id: "contracts", text: `البتّ في ${d.pendingContracts} عقود رفعتها المجموعات`, href: "/staff/reviews?view=groups", tone: "gold" as const }] : []),
      ];
    case "lottery":
      return [
        ...(can(user, "lottery.draw.POST") ? [{ id: "imp", text: d.entered ? "أُدخلت نتائج بث القرعة وأُرسلت للاعتماد" : "إدخال نتائج بث القرعة: سنوات الميلاد وأشهرها", href: "/staff/lottery?step=entry", done: d.entered }] : []),
        ...(can(user, "lottery.draw.publish")
          ? [{ id: "pub", text: d.published ? "نُشرت نتائج القرعة" : d.entered ? "اعتماد ونشر نتائج القرعة" : "بانتظار إدخال نتائج البث من إدارة التسجيل", href: "/staff/lottery?step=publish", done: d.published, tone: "maroon" as const }]
          : []),
      ];
    case "season":
      return [{ id: "season", text: "مراجعة إعدادات الموسم قبل فتح حملة الاستدراك", href: "/staff/season" }];
    case "operations":
      return [
        { id: "crit", text: d.critical ? `متابعة ${countOf(d.critical, { zero: "", one: "بلاغ حرج", two: "بلاغين حرجين", few: "بلاغات حرجة", many: "بلاغاً حرجاً" })} حتى الإغلاق` : "لا بلاغات حرجة مفتوحة", href: "/staff/operations", tone: "maroon", done: d.critical === 0 },
        { id: "bus", text: d.busAccepted ? "اعتُمدت الحافلة التاسعة لمزدلفة" : "مراجعة اقتراح الحافلة التاسعة لمزدلفة", href: "/staff/operations", done: d.busAccepted },
      ];
    case "medical":
      return [
        { id: "docs", text: d.docsWaiting ? `مراجعة ${countOf(d.docsWaiting, { zero: "", one: "وثيقة طبية واحدة", two: "وثيقتين طبيتين", few: "وثائق طبية", many: "وثيقة طبية" })} رفعها الحجاج` : "لا وثائق طبية تنتظر المراجعة", href: "/staff/medical", tone: "gold", done: !d.docsWaiting },
        { id: "health", text: d.health ? `متابعة ${countOf(d.health, { zero: "", one: "بلاغ صحي مفتوح", two: "بلاغين صحيين مفتوحين", few: "بلاغات صحية مفتوحة", many: "بلاغاً صحياً مفتوحاً" })}` : "لا بلاغات صحية مفتوحة", href: "/staff/medical?view=reports", tone: "maroon", done: !d.health },
      ];
    case "transport":
      return [
        { id: "transport", text: d.transportOpen ? `متابعة ${countOf(d.transportOpen, { zero: "", one: "بلاغ نقل مفتوح", two: "بلاغَي نقل مفتوحين", few: "بلاغات نقل مفتوحة", many: "بلاغاً مفتوحاً للنقل" })}` : "لا بلاغات نقل مفتوحة", href: "/staff/transport", tone: "maroon", done: !d.transportOpen },
        { id: "bus-ready", text: d.busAccepted ? "اعتُمدت الحافلة التاسعة لمزدلفة: تجهيزها" : "حافلات مزدلفة المبكرة أقل من المسجّلين: بانتظار غرفة العمليات", href: "/staff/transport?view=buses", done: d.busAccepted },
      ];
    case "opfiles":
      return [
        ...(d.opsMissing > 0 ? [{ id: "create", text: `إنشاء الملفات التشغيلية الناقصة لموسم ${CURRENT_SEASON} (${d.opsMissing})`, href: "/staff/operational-files", tone: "gold" as const }] : []),
        { id: "gaps", text: `إسناد المناصب الإلزامية الشاغرة في الملفات التشغيلية (${d.opsGaps})`, href: "/staff/operational-files", tone: "maroon", done: d.opsGaps === 0 },
        { id: "activate", text: `تفعيل الملفات التشغيلية بعد إدخال أرقام القرارات (${d.opsActive} من ${FILE_TYPES.length} مفعّلة)`, href: "/staff/operational-files", tone: "gold", done: d.opsActive === FILE_TYPES.length },
      ];
    case "content":
      return d.content.drafts ? [{ id: "drafts", text: `نشر المسودات أو تجاهلها في محتوى الموقع (${d.content.drafts})`, href: "/staff/content", tone: "gold" }] : [];
    case "audit":
      return [{ id: "obj", text: "الرد على اعتراض الطلب 51877 مع الدليل", href: "/staff/audit", tone: "gold" }];
  }
}

/** A row of figures inside a section */
type FigureItem = { k: string; v: ReactNode; hint?: ReactNode; tone?: "gold" | "maroon" };

/** `pairs`: two a row, for a section that has half the page (the executive dashboard sets them side by side) */
function Figures({ items, pairs }: { items: FigureItem[]; pairs?: boolean }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-2", !pairs && "lg:grid-cols-4")}>
      {items.map((s) => (
        <div key={s.k} className={cn("rounded-2xl p-3", s.tone === "maroon" ? "bg-maroon/30 ring-1 ring-maroon/50" : "bg-black/15")}>
          <dt className="text-xs text-white/65">{s.k}</dt>
          <dd className={cn("font-display text-2xl font-bold tabular-nums", s.tone === "gold" ? "text-gold" : "text-white")}>{s.v}</dd>
          {s.hint && <dd className="text-[11px] leading-4 text-white/55">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold text-white/85">{title}</p>
      {children}
    </div>
  );
}

const Daily = () => (
  <Sub title="التسجيل اليومي على القبول المباشر — 14 يوماً (12 – 25 آب)">
    <Columns dark values={DAILY_REGISTRATIONS} height={120} highlight={DAILY_REGISTRATIONS.length - 1} labels={["12 آب", "16", "20", "25 آب"]} />
  </Sub>
);

/** One system's figures. `together`: the systems shown on the same page, so a chart is not drawn twice */
/**
 * Each system's row of figures, once: its statistics page shows them with its charts and lists, and «لوحة الإدارة
 * العليا» shows them alone, side by side. The season's figures are its settings, not the seats and fees the
 * lottery and the reviews already count.
 */
function itemsOf(sys: StatsSystem, d: Data): FigureItem[] {
  const { season } = d;
  switch (sys) {
    case "office":
      return [
              { k: "طلبات سجّلتها", v: d.filed.length },
              { k: "حجاج في طلباتي", v: d.filed.reduce((n, f) => n + f.a.members.length, 0) },
              { k: "سجّلتها اليوم", v: d.filedToday, tone: "gold" },
              { k: "سجّلها المكتب كله", v: d.officeFiled, hint: `قُبل مما سجّلته ${d.filedAccepted}` },
            ];
    case "reviews":
      return [
              { k: "الطلبات المقدّمة", v: formatNumber(REG_STATS.applications + d.realApps.length), hint: d.realApps.length ? `+${d.realApps.length} من جلسة العرض` : "التسجيل على القبول المباشر 1448" },
              { k: "الأفراد في الطلبات", v: formatNumber(REG_STATS.persons + d.realPersons) },
              { k: "رسوم التسجيل المحصّلة", v: `${formatNumber(REG_STATS.persons * season.fees.registrationPerPerson + d.realPaid)} $`, hint: `${season.fees.registrationPerPerson} $ للفرد` },
              { k: "بانتظار المراجعة", v: d.pendingReviews, tone: d.pendingReviews ? "maroon" : undefined, hint: `من أصل ${formatNumber(REG_STATS.needsReview)} حالة في الموسم${d.pendingContracts ? ` · ${d.pendingContracts} عقود بانتظار المكتب` : ""}` },
            ];
    case "lottery":
      return [
              { k: "طلبات القبول المباشر المؤهلة", v: formatNumber(LOTTERY.directEligible), hint: `التسجيل: ${SEASON.windows.direct.hijri}` },
              { k: "مقاعد القبول المباشر", v: formatNumber(season.directSeats), tone: "gold", hint: `${Math.round(season.directShare * 100)}% من ${formatNumber(season.quota)}` },
              { k: "طلبات التسجيل الأولي على القرعة", v: formatNumber(POOL.poolApps), hint: `${formatNumber(POOL.poolSeats)} شخصاً — ${SEASON.windows.lottery.hijri}` },
              { k: "مقاعد القرعة", v: formatNumber(season.lotterySeats), hint: "تُملأ بسنوات الميلاد وأشهرها المسحوبة" },
            ];
    case "operations":
      return [
              { k: "بلاغات مفتوحة", v: d.openTickets.length, tone: d.critical ? "maroon" : undefined, hint: `حرجة ${d.critical} · صحية ${d.health} · مفقودون ${d.missing}` },
              { k: "الحجاج في عرفة", v: 601, hint: "من 604 — 3 في العيادة الميدانية" },
              { k: "حافلات مزدلفة", v: d.busAccepted ? 15 : 14, hint: d.busAccepted ? "أُضيفت الحافلة التاسعة للمبكرة" : "السائقون أكدوا 13 من 14" },
              { k: "الحرارة في عرفة", v: "41°", tone: "gold", hint: "ذروة 15:00 — رشّ رذاذ الماء" },
            ];
    case "medical":
      return [
            { k: "وثائق تنتظر المراجعة", v: d.docsWaiting, tone: d.docsWaiting ? "maroon" : undefined },
            { k: "حجاج لهم حالات صحية", v: d.conditions, hint: "من ملفات المنسقين" },
            { k: "بلاغات صحية مفتوحة", v: d.health, tone: d.health ? "maroon" : undefined },
            { k: "بلاغات حرجة", v: d.openTickets.filter((t) => t.kind === "health" && t.severity === "critical").length },
          ];
    case "transport":
      return [
            { k: "بلاغات نقل مفتوحة", v: d.transportOpen, tone: d.transportOpen ? "maroon" : undefined },
            { k: "حجاج يحتاجون حافلة مجهّزة", v: d.equipped, hint: "كرسي، صعوبة مشي، أكسجين، أو 75+" },
            { k: "حافلات مزدلفة المبكرة", v: d.busAccepted ? 9 : 8, hint: `${d.busAccepted ? "450 مقعداً" : "400 مقعد"} لـ430 مسجّلاً` },
            { k: "حافلة إضافية", v: d.busAccepted ? "اعتُمدت" : "بانتظار القرار", tone: d.busAccepted ? undefined : "gold" },
          ];
    case "opfiles":
      return [
            { k: `ملفات موسم ${CURRENT_SEASON}`, v: `${d.seasonFiles.length} من ${FILE_TYPES.length}`, hint: d.opsMissing ? `${d.opsMissing} لم تُنشأ بعد` : "كلها منشأة" },
            { k: "مفعّلة", v: d.opsActive, tone: d.opsActive === FILE_TYPES.length ? undefined : "gold" },
            { k: "مناصب إلزامية شاغرة", v: d.opsGaps, tone: d.opsGaps ? "maroon" : undefined },
            { k: "موظفون مشاركون", v: d.participants },
          ];
    case "content":
      return [
            { k: "صفحات منشورة", v: d.content.published, hint: "يراها الزوار الآن" },
            { k: "مسودات غير منشورة", v: d.content.drafts, tone: d.content.drafts ? "gold" : undefined, hint: "صفحات ومجموعات بانتظار النشر" },
            { k: "عناصر معدّلة", v: d.content.edited, hint: "حقول وأقسام ومقالات" },
            { k: "في الأرشيف", v: d.content.archived, hint: "قابلة للاستعادة" },
          ];
    case "audit":
      return [
              { k: "إجمالي الأحداث", v: formatNumber(d.events.length) },
              { k: "من جلسة العرض", v: formatNumber(d.events.filter((e) => e.live).length) },
              { k: "الموظفون في السجل", v: new Set(d.events.map((e) => e.actor)).size },
              { k: "تعديلات بقيمة قبل/بعد", v: formatNumber(d.events.filter((e) => e.before !== undefined).length), hint: "اعتراضات مفتوحة: 1" },
            ];
    case "season":
      return [
        { k: "حصة الموسم", v: formatNumber(season.quota), hint: `${Math.round(season.directShare * 100)}% قبول مباشر` },
        { k: "عمر القبول المباشر", v: `${season.acceptedDirectAge}+`, tone: "gold", hint: "عاماً فأكثر" },
        { k: "تكلفة الحج للفرد", v: `${formatNumber(season.fees.hajjCost)} $`, hint: `الدفعة الأولى ${formatNumber(season.fees.firstInstallment)} $` },
        { k: "رسم التسجيل للفرد", v: `${season.fees.registrationPerPerson} $` },
      ];
  }
}

function SystemFigures({ sys, d, together, compact }: { sys: StatsSystem; d: Data; together: StatsSystem[]; compact?: boolean }) {
  const { season } = d;
  if (compact) return <Figures items={itemsOf(sys, d)} pairs />;
  switch (sys) {
    case "office":
      return (
        <>
          <Figures
            items={itemsOf("office", d)}
          />
          {d.filed.length === 0 ? (
            <p className="text-sm text-white/65">لم تسجّل طلباً بعد. ما تسجّله يظهر هنا وتتابع ما حدث له.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-black/25 text-white/70">
                  <tr>
                    <th className="p-2.5 text-right">الطلب</th>
                    <th className="p-2.5 text-right">الأفراد</th>
                    <th className="p-2.5 text-right">التسجيل</th>
                    <th className="p-2.5 text-right">أين وصل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white">
                  {d.filed.map((f) => (
                    <tr key={f.a.applicantId}>
                      <td className="p-2.5">
                        <b>{fullName(f.applicant.person)}</b>
                        <span className="block text-xs text-white/55">
                          طلب {f.a.number} — {fmtDateTime(f.a.submittedAt)}
                        </span>
                      </td>
                      <td className="p-2.5 tabular-nums">{f.a.members.length}</td>
                      <td className="p-2.5 text-white/80">{trackOf(f.a) === "lottery" ? "القرعة" : "القبول المباشر"}</td>
                      <td className="p-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", f.stage.key === "accepted" ? "bg-green-light/30 text-white" : f.stage.key === "notAccepted" ? "bg-maroon text-white" : "bg-gold/20 text-gold")}>{f.stage.title}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    case "medical":
      return (
        <Figures
          items={itemsOf("medical", d)}
        />
      );
    case "transport":
      return (
        <Figures
          items={itemsOf("transport", d)}
        />
      );
    case "opfiles":
      return (
        <Figures
          items={itemsOf("opfiles", d)}
        />
      );
    case "reviews":
      return (
        <>
          <Figures
            items={itemsOf("reviews", d)}
          />
          <Daily />
          <div className="grid gap-6 md:grid-cols-2">
            <Sub title="نتيجة التدقيق الآلي">
              <div className="flex items-center gap-4">
                <Donut
                  size={120}
                  thickness={16}
                  segments={[
                    { value: REG_STATS.autoApproved, color: "#289E92", label: "auto" },
                    { value: REG_STATS.needsReview, color: "#AD9E6E", label: "review" },
                    { value: REG_STATS.rejected, color: "#672146", label: "rejected" },
                  ]}
                >
                  <p className="font-display text-lg font-bold text-white">85%</p>
                </Donut>
                <div className="min-w-0 flex-1">
                  <Legend
                    items={[
                      { label: "مؤهل تلقائياً", color: "#289E92", value: formatNumber(REG_STATS.autoApproved) },
                      { label: "يحتاج مراجعة", color: "#AD9E6E", value: formatNumber(REG_STATS.needsReview) },
                      { label: "غير مؤهل بسبب واضح", color: "#672146", value: formatNumber(REG_STATS.rejected) },
                    ]}
                  />
                </div>
              </div>
            </Sub>
            <Sub title="أسباب عدم الأهلية">
              <BarList dark items={REG_STATS.rejectionReasons.map((r) => ({ label: r.label, value: r.value, key: r.label }))} color="bg-gold" />
            </Sub>
          </div>
          <Sub title="الطلبات حسب المحافظة">
            <BarList dark items={REG_STATS.byGovernorate.map((g) => ({ label: g.name, value: g.value, key: g.name }))} max={REG_STATS.byGovernorate[0].value} color="bg-green-light" />
          </Sub>
        </>
      );
    case "lottery":
      return (
        <>
          <Figures
            items={itemsOf("lottery", d)}
          />
          <p className="text-xs text-white/60">
            من طلبات القبول المباشر: مؤهلون {formatNumber(REG_STATS.eligible)} · مرفوضون بسبب واضح {formatNumber(REG_STATS.rejected)}
          </p>
          {!together.includes("reviews") && <Daily />}
        </>
      );
    case "season":
      return (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Donut
            size={150}
            thickness={20}
            segments={[
              { value: season.directSeats, color: "#AD9E6E", label: "direct" },
              { value: season.lotterySeats, color: "#289E92", label: "lottery" },
            ]}
          >
            <div>
              <p className="font-display text-xl font-bold text-white">{formatNumber(season.quota)}</p>
              <p className="text-xs text-white/70">مقعداً</p>
            </div>
          </Donut>
          <div className="w-full flex-1 space-y-4">
            <Legend
              dark
              items={[
                { label: `قبول مباشر ${Math.round(season.directShare * 100)}% (${season.acceptedDirectAge}+ عاماً)`, color: "#AD9E6E", value: formatNumber(season.directSeats) },
                { label: `القرعة ${100 - Math.round(season.directShare * 100)}%`, color: "#289E92", value: formatNumber(season.lotterySeats) },
              ]}
            />
            <p className="text-sm text-white/75">
              رسوم التسجيل المحصّلة: <b className="text-gold">{formatNumber(REG_STATS.persons * season.fees.registrationPerPerson)} $</b>
            </p>
          </div>
        </div>
      );
    case "operations":
      return (
        <>
          <Figures
            items={itemsOf("operations", d)}
          />
          <p className="text-xs text-white/60">
            حافلات مزدلفة المبكرة (كبار السن): 430 مسجّلاً، والسعة {d.busAccepted ? "450 بتسع حافلات" : "400 بثماني حافلات — اقتراح بحافلة تاسعة ينتظر القرار"}.
          </p>
          <Sub title="أحدث البلاغات">
            <ul className="divide-y divide-white/10">
              {d.openTickets.slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", t.severity === "critical" ? "animate-pulse bg-maroon" : t.severity === "high" ? "bg-maroon-light" : "bg-gold-dark")} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {t.name} — {t.location}
                  </span>
                  <span className="shrink-0 text-xs text-white/70">{ago(t.at, d.now)}</span>
                </li>
              ))}
              {d.openTickets.length === 0 && <li className="py-2 text-sm text-white/60">لا بلاغات مفتوحة.</li>}
            </ul>
          </Sub>
          <Sub title="حسب المجموعة">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-right text-xs text-gold">
                    <th className="pb-2 font-bold">المجموعة</th>
                    <th className="pb-2 font-bold">في عرفة</th>
                    <th className="pb-2 font-bold">بلاغات</th>
                    <th className="pb-2 font-bold">آخر تقرير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {d.groupReports.map((r) => (
                    <tr key={r.group}>
                      <td className="py-2">
                        <p className="font-bold text-white">
                          {groupName(r.group)} — تكتل {r.cluster}
                        </p>
                        <p className="text-xs text-white/65">{r.leader}</p>
                      </td>
                      <td className="py-2">
                        <span className={cn("font-bold tabular-nums", r.inArafat === r.of ? "text-white" : "text-gold")}>{r.inArafat}</span>
                        <span className="text-white/65"> / {r.of}</span>
                      </td>
                      <td className="py-2">{r.open ? <span className="rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white">{r.open}</span> : <span className="text-white/65">0</span>}</td>
                      <td className="py-2 tabular-nums text-white/85">{r.report}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sub>
        </>
      );
    case "content":
      return (
        <Figures
          items={itemsOf("content", d)}
        />
      );
    case "audit":
      return (
        <>
          <Figures
            items={itemsOf("audit", d)}
          />
          <Sub title="رضا الحجاج — مقارنة سريعة">
            <BarList dark items={EXEC.stages.slice(0, 6).map((s) => ({ label: s.stage, value: s.y1448, key: s.stage }))} max={5} format={(v) => v.toFixed(1)} color="bg-green-light" />
          </Sub>
        </>
      );
  }
}

/** One system's section: its figures under its name, with a link to where its work is done */
function Section({ sys, d, together, compact }: { sys: StatsSystem; d: Data; together: StatsSystem[]; compact?: boolean }) {
  const m = STATS_META[sys];
  return (
    <Panel
      dark
      title={m.title}
      icon={m.icon}
      action={
        <Link href={m.href} className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          {m.link} <ArrowLeft className="size-4" />
        </Link>
      }
      bodyClass="space-y-5"
    >
      <SystemFigures sys={sys} d={d} together={together} compact={compact} />
    </Panel>
  );
}

/** One system's statistics page: its figures, and beside them what waits in it */
export function SystemStats({ sys, user }: { sys: StatsSystem; user: StaffUser }) {
  const d = useStatsData(user);
  const todos = todosOf(sys, d, user);
  return (
    <div className={cn("grid gap-6", todos.length > 0 && "xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]")}>
      <Section sys={sys} d={d} together={[sys]} />
      {todos.length > 0 && <Waiting todos={todos} />}
    </div>
  );
}

/** Several systems' figures on one page, each once, without the charts: «لوحة الإدارة العليا» shows them all */
export function AllStats({ systems, user }: { systems: readonly StatsSystem[]; user: StaffUser }) {
  const d = useStatsData(user);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {systems.map((s) => (
        <Section key={s} sys={s} d={d} together={[...systems]} compact />
      ))}
    </div>
  );
}

function Waiting({ todos }: { todos: Todo[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const doneCount = todos.filter((t) => t.done || checked[t.id]).length;
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 100;
  return (
    <Panel
      dark
      title="ما ينتظر هنا"
      icon={<ListTodo />}
      delay={0.15}
      action={
        <span className="flex items-center gap-2 text-xs font-bold text-gold">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
            <motion.span className="block h-full rounded-full bg-green-light" animate={{ width: `${pct}%` }} />
          </span>
          {doneCount}/{todos.length}
        </span>
      }
    >
      <ul className="space-y-2">
        {todos.map((t, i) => {
          const done = t.done || checked[t.id];
          return (
            <motion.li key={t.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <div className={cn("group flex items-center gap-3 rounded-2xl p-3 ring-1 transition", done ? "bg-green-light/8 ring-green-light/20" : "bg-white/5 ring-white/10 hover:ring-gold/40")}>
                <button onClick={() => !t.done && setChecked((c) => ({ ...c, [t.id]: !c[t.id] }))} aria-label={done ? "منجزة" : "علّمها منجزة"} className={cn("shrink-0", done ? "text-green-light" : "text-gold hover:text-white")}>
                  {done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                </button>
                {t.href ? (
                  <Link href={t.href} className={cn("min-w-0 flex-1 text-sm hover:underline", done ? "text-white/70 line-through" : "font-semibold text-white")}>
                    {t.text}
                  </Link>
                ) : (
                  <span className={cn("min-w-0 flex-1 text-sm", done ? "text-white/70 line-through" : "font-semibold text-white")}>{t.text}</span>
                )}
                {t.tone && !done && <span className={cn("size-2 shrink-0 rounded-full", t.tone === "maroon" ? "bg-maroon" : t.tone === "gold" ? "bg-gold-dark" : "bg-green-light")} />}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </Panel>
  );
}
