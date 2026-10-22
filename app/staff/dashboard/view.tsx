"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Bus, CheckCircle2, Circle, ClipboardCheck, Dices, FileStack, HeartPulse, ListTodo, PencilLine, RadioTower, ScrollText, Settings2, Sun, UserRoundPlus } from "lucide-react";
import { filedBy } from "@/app/administrator/_lib/coordinator";
import { outcomeOf, stageAt, trackOf } from "@/lib/journey";
import { usePublishedDraw } from "@/lib/lottery";
import { medicalDocsFor, medicalKey } from "@/lib/registration/post";
import { ageOf, fullName } from "@/lib/registry";
import { useRegistrationDesk } from "../hajj/desk";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DAILY_REGISTRATIONS, EXEC, LOTTERY, REG_STATS } from "@/lib/data/staff-seed";
import { groupName } from "@/lib/groups";
import { drawTotals } from "@/lib/lottery";
import { CURRENT_SEASON, FILE_TYPES, fileState, gapsOf, useEmployees, useOpFiles } from "@/lib/ops";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { can, type StaffUser } from "@/lib/staff";
import { useStore } from "@/lib/store";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn, countOf, formatNumber } from "@/lib/utils";
import { useAdminsDesk } from "../admins/desk";
import { useContentSummary } from "../content/_components/summary";
import { useEmployeesDesk } from "../employees/desk";
import { useExamDesk } from "../exam/_components/desk";
import { useFlightsDesk } from "../flights/desk";
import { useSystemsUnseen } from "../_components/system";
import { useAllEvents, useReviewQueue, useTicketQueue } from "../_components/data";
import { ago, BarList, Columns, Donut, fmtDateTime, hasDeskWork, Legend, PageHeader, Panel, useNow, useStaffHome, useStaffUser } from "../_components/kit";

type Todo = { id: string; text: string; href?: string; done?: boolean; tone?: "maroon" | "gold" | "green" };

function greeting(hour: number) {
  if (hour < 12) return "صباح الخير";
  if (hour < 18) return "مساء الخير";
  return "مساء النور";
}

/**
 * «لوحتي» gathers the work of an employee's permissions. Whoever holds none has no use for it: the owner of
 * a system has that system's summary, a hall supervisor his hall — he is sent there.
 *
 * It is a page of numbers: each permission's figures under the name of the page where its work is done, and
 * the day's tasks, each a link. Nothing is edited here — and the management pages carry no numbers, so the
 * figures they once showed are gathered here.
 */
export function DashboardView() {
  const user = useStaffUser()!;
  const router = useRouter();
  const home = useStaffHome(user);
  // A management file has its own summary: «لوحتي» gathers the other systems' work
  const has = hasDeskWork(user);
  useEffect(() => {
    if (!has) router.replace(home);
  }, [has, home, router]);
  return has ? <Dashboard /> : null;
}

/** A row of figures inside a section */
function Figures({ items }: { items: { k: string; v: ReactNode; hint?: ReactNode; tone?: "gold" | "maroon" }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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

/** One permission's figures, under the page its work is done in */
function Section({ title, icon, href, link, children }: { title: string; icon: ReactNode; href: string; link: string; children: ReactNode }) {
  return (
    <Panel
      dark
      title={title}
      icon={icon}
      action={
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          {link} <ArrowLeft className="size-4" />
        </Link>
      }
      bodyClass="space-y-5"
    >
      {children}
    </Panel>
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

const POOL = drawTotals([]);

/** The groups of the cluster on the day of Arafat, as the room's last reports gave them */
const GROUP_REPORTS = [
  { group: 27, cluster: "النور", inArafat: 48, of: 48, report: "13:00", leader: "أحمد الحمصي" },
  { group: 14, cluster: "النور", inArafat: 49, of: 50, report: "13:40", leader: "محمود الشامي" },
  { group: 31, cluster: "النور", inArafat: 50, of: 50, report: "12:55", leader: "بسام درويش" },
  { group: 19, cluster: "اليقين", inArafat: 44, of: 45, report: "13:20", leader: "عمر الزين" },
  { group: 8, cluster: "الشهباء", inArafat: 44, of: 45, report: "14:05", leader: "لؤي حمدان" },
];

function Dashboard() {
  const user = useStaffUser()!;
  const now = useNow(30_000);
  const season = useSeason();
  const reviews = useReviewQueue();
  const tickets = useTicketQueue();
  const events = useAllEvents();
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const lottery = useStore((s) => s.lottery);
  const content = useContentSummary();
  const contentDrafts = content.drafts;
  const employees = useEmployees();
  const seasonFiles = useOpFiles().filter((f) => f.season === CURRENT_SEASON);
  const opsGaps = seasonFiles.reduce((a, f) => a + gapsOf(f).length, 0);
  const opsMissing = FILE_TYPES.length - seasonFiles.length;
  const opsActive = seasonFiles.filter((f) => fileState(f) === "active").length;
  const me = employees.find((e) => e.staffId === user.id);
  const myPosts = me ? seasonFiles.reduce((a, f) => a + [...f.members, ...f.nodes.flatMap((o) => [...o.members, ...o.children.flatMap((c) => c.members)])].filter((m) => m.employeeId === me.id).length, 0) : 0;

  const pendingReviews = reviews.filter((r) => !r.review).length;
  const pendingContracts = Object.values(post).filter((p) => p.contract?.status === "pending").length;
  const openTickets = tickets.filter((t) => t.status !== "resolved");
  const critical = openTickets.filter((t) => t.severity === "critical").length;
  const health = openTickets.filter((t) => t.kind === "health").length;
  const missing = openTickets.filter((t) => t.kind === "missing").length;
  const groupReports = GROUP_REPORTS.map((r) => ({ ...r, open: openTickets.filter((t) => t.name.includes(groupName(r.group))).length }));
  const busAccepted = events.some((e) => e.action === "اعتماد حافلة إضافية");
  // The exam is a system: its owner follows it in its summary; here the director sees what reaches him
  const staffDesk = useEmployeesDesk();
  const adminsDesk = useAdminsDesk();
  const examDesk = useExamDesk();
  const flightsDesk = useFlightsDesk();
  const unseen = useSystemsUnseen();
  const holders = useHolders();
  const realApps = Object.values(applications);
  const realPersons = realApps.reduce((a, x) => a + x.members.length, 0);
  const realPaid = realApps.reduce((a, x) => a + (x.paid || 0), 0);
  const mine = useMemo(() => events.filter((e) => e.actor === user.name).slice(0, 6), [events, user.name]);
  const regDesk = useRegistrationDesk();
  const draw = usePublishedDraw();

  // Data entry: what this employee registered, each application where it stands now
  const filed = filedBy(user.id, applications).map((a) => {
    const out = outcomeOf(a, draw, a.policy?.acceptedDirectAge ?? season.acceptedDirectAge);
    const { stage } = stageAt(out.steps, (now - a.submittedAt) / 1000);
    return { a, stage, applicant: a.members.find((m) => m.relation === "self") ?? a.members[0] };
  });
  const startOfDay = new Date(now).setHours(0, 0, 0, 0);
  const filedToday = filed.filter((f) => f.a.submittedAt >= startOfDay).length;
  const filedAccepted = filed.filter((f) => f.stage.key === "accepted").length;

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
  const transportOpen = openTickets.filter((t) => t.kind === "transport").length;

  // The day's tasks, from the permissions and the season's state now (the compiler memoizes them)
  const todos: Todo[] = [];
  {
    const list = todos;
    if (myPosts > 0) list.push({ id: "my-files", text: `مواقعك في الملفات التشغيلية لموسم ${CURRENT_SEASON} (${myPosts}): البرج والمخيمات وفريقك`, href: "/staff/my-files", tone: "gold" });
    if (can(user, "reviews.applications.GET")) {
      list.push({ id: "rev", text: `مراجعة ${pendingReviews} طلبات تحتاج قراراً بشرياً`, href: "/staff/reviews", tone: "gold", done: pendingReviews === 0 });
      if (pendingContracts) list.push({ id: "contracts", text: `البتّ في ${pendingContracts} عقود رفعتها المجموعات`, href: "/staff/reviews?view=groups", tone: "gold" });
    }
    // The demo opens after the 1448 results were published, until «إعادة التجربة» on the lottery page
    const published = !!lottery.published || (!lottery.cleared && !lottery.entry);
    const entered = published || !!lottery.sent;
    if (can(user, "lottery.draw.POST")) list.push({ id: "imp", text: entered ? "أُدخلت نتائج بث القرعة وأُرسلت للاعتماد" : "إدخال نتائج بث القرعة: سنوات الميلاد وأشهرها", href: "/staff/lottery?step=entry", done: entered });
    if (can(user, "lottery.draw.publish")) list.push({ id: "pub", text: published ? "نُشرت نتائج القرعة" : entered ? "اعتماد ونشر نتائج القرعة" : "بانتظار إدخال نتائج البث من إدارة التسجيل", href: "/staff/lottery?step=publish", done: published, tone: "maroon" });
    if (can(user, "season.values.GET")) list.push({ id: "season", text: "مراجعة إعدادات الموسم قبل فتح حملة الاستدراك", href: "/staff/season" });
    if (can(user, "access.important-events.GET")) {
      for (const [k, high] of [["staff", staffDesk.high.length], ["registration", regDesk.high.length], ["admins", adminsDesk.high.length], ["exams", examDesk.high.length], ["flights", flightsDesk.high.length]] as const) {
        const who = holders[k].map((h) => h.staff.name).join(" و") || "صاحب صلاحيتها";
        if (high) list.push({ id: `sys-high-${k}`, text: `${SYSTEMS[k].label} تحتاج متابعة (${high}) — يعالجها ${who}`, href: "/staff/access", tone: "maroon" });
      }
      list.push({ id: "sys-new", text: unseen ? `أحداث مهمة جديدة في ملفات الإدارة (${unseen})` : "لا أحداث مهمة جديدة في ملفات الإدارة", href: "/staff/access", done: !unseen, tone: "gold" });
    }
    if (can(user, "operations.tickets.GET")) {
      list.push({ id: "crit", text: critical ? `متابعة ${countOf(critical, { zero: "", one: "بلاغ حرج", two: "بلاغين حرجين", few: "بلاغات حرجة", many: "بلاغاً حرجاً" })} حتى الإغلاق` : "لا بلاغات حرجة مفتوحة", href: "/staff/operations", tone: "maroon", done: critical === 0 });
      list.push({ id: "bus", text: busAccepted ? "اعتُمدت الحافلة التاسعة لمزدلفة" : "مراجعة اقتراح الحافلة التاسعة لمزدلفة", href: "/staff/operations", done: busAccepted });
    }
    if (can(user, "content.pages.GET") && contentDrafts) list.push({ id: "drafts", text: `نشر المسودات أو تجاهلها في محتوى الموقع (${contentDrafts})`, href: "/staff/content", tone: "gold" });
    if (can(user, "office.applications.POST")) list.push({ id: "register", text: "تسجيل مواطن يراجع المكتب على الحج", href: "/staff/registration", tone: "gold" });
    if (can(user, "medical.documents.GET")) {
      list.push({ id: "docs", text: docsWaiting ? `مراجعة ${countOf(docsWaiting, { zero: "", one: "وثيقة طبية واحدة", two: "وثيقتين طبيتين", few: "وثائق طبية", many: "وثيقة طبية" })} رفعها الحجاج` : "لا وثائق طبية تنتظر المراجعة", href: "/staff/medical", tone: "gold", done: !docsWaiting });
      list.push({ id: "health", text: health ? `متابعة ${countOf(health, { zero: "", one: "بلاغ صحي مفتوح", two: "بلاغين صحيين مفتوحين", few: "بلاغات صحية مفتوحة", many: "بلاغاً صحياً مفتوحاً" })}` : "لا بلاغات صحية مفتوحة", href: "/staff/medical?view=reports", tone: "maroon", done: !health });
    }
    if (can(user, "transport.tickets.GET")) {
      list.push({ id: "transport", text: transportOpen ? `متابعة ${countOf(transportOpen, { zero: "", one: "بلاغ نقل مفتوح", two: "بلاغَي نقل مفتوحين", few: "بلاغات نقل مفتوحة", many: "بلاغاً مفتوحاً للنقل" })}` : "لا بلاغات نقل مفتوحة", href: "/staff/transport", tone: "maroon", done: !transportOpen });
      // «bus-ready», not «bus»: one account may hold the operations room and transport both
      list.push({ id: "bus-ready", text: busAccepted ? "اعتُمدت الحافلة التاسعة لمزدلفة: تجهيزها" : "حافلات مزدلفة المبكرة أقل من المسجّلين: بانتظار غرفة العمليات", href: "/staff/transport?view=buses", done: busAccepted });
    }
    if (can(user, "audit.events.GET")) list.push({ id: "obj", text: "الرد على اعتراض الطلب 51877 مع الدليل", href: "/staff/audit", tone: "gold" });
    if (can(user, "opfiles.files.GET")) {
      if (opsMissing > 0) list.push({ id: "create", text: `إنشاء الملفات التشغيلية الناقصة لموسم ${CURRENT_SEASON} (${opsMissing})`, href: "/staff/operational-files", tone: "gold" });
      list.push({ id: "gaps", text: `إسناد المناصب الإلزامية الشاغرة في الملفات التشغيلية (${opsGaps})`, href: "/staff/operational-files", tone: "maroon", done: opsGaps === 0 });
      list.push({ id: "activate", text: `تفعيل الملفات التشغيلية بعد إدخال أرقام القرارات (${opsActive} من ${FILE_TYPES.length} مفعّلة)`, href: "/staff/operational-files", tone: "gold", done: opsActive === FILE_TYPES.length });
    }
  }

  const hour = new Date(now).getHours();
  const review = can(user, "reviews.applications.GET");
  const lotteryPerm = can(user, "lottery.draw.POST") || can(user, "lottery.draw.publish");

  return (
    <div>
      <PageHeader
        eyebrow={user.title}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {greeting(hour)}، {user.name.split(" ")[0] === "د." ? user.name : user.name.split(" ")[0]}
            <motion.span initial={{ rotate: -30, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring" }} className="inline-flex text-gold">
              <Sun className="size-7" />
            </motion.span>
          </span>
        }
        description="أرقام عملك ومهامك اليوم. كل رقم تحت اسم الصفحة التي يُدار منها."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {can(user, "office.applications.POST") && (
            <Section title="ما سجّلته" icon={<UserRoundPlus />} href="/staff/registration" link="تسجيل حاج جديد">
              <Figures
                items={[
                  { k: "طلبات سجّلتها", v: filed.length },
                  { k: "حجاج في طلباتي", v: filed.reduce((n, f) => n + f.a.members.length, 0) },
                  { k: "سجّلتها اليوم", v: filedToday, tone: "gold" },
                  { k: "قُبلت", v: filedAccepted },
                ]}
              />
              {filed.length === 0 ? (
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
                      {filed.map((f) => (
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
            </Section>
          )}

          {can(user, "medical.documents.GET") && (
            <Section title="الفريق الطبي" icon={<HeartPulse />} href="/staff/medical" link="افتح عمل الفريق">
              <Figures
                items={[
                  { k: "وثائق تنتظر المراجعة", v: docsWaiting, tone: docsWaiting ? "maroon" : undefined },
                  { k: "حجاج لهم حالات صحية", v: conditions, hint: "من ملفات المنسقين" },
                  { k: "بلاغات صحية مفتوحة", v: health, tone: health ? "maroon" : undefined },
                  { k: "بلاغات حرجة", v: openTickets.filter((t) => t.kind === "health" && t.severity === "critical").length },
                ]}
              />
            </Section>
          )}

          {can(user, "transport.tickets.GET") && (
            <Section title="المواصلات" icon={<Bus />} href="/staff/transport" link="افتح عمل الفريق">
              <Figures
                items={[
                  { k: "بلاغات نقل مفتوحة", v: transportOpen, tone: transportOpen ? "maroon" : undefined },
                  { k: "حجاج يحتاجون حافلة مجهّزة", v: equipped, hint: "كرسي، صعوبة مشي، أكسجين، أو 75+" },
                  { k: "حافلات مزدلفة المبكرة", v: busAccepted ? 9 : 8, hint: `${busAccepted ? "450 مقعداً" : "400 مقعد"} لـ430 مسجّلاً` },
                  { k: "حافلة إضافية", v: busAccepted ? "اعتُمدت" : "بانتظار القرار", tone: busAccepted ? undefined : "gold" },
                ]}
              />
            </Section>
          )}

          {can(user, "opfiles.files.GET") && (
            <Section title="الملفات التشغيلية" icon={<FileStack />} href="/staff/operational-files" link="افتح الملفات">
              <Figures
                items={[
                  { k: `ملفات موسم ${CURRENT_SEASON}`, v: `${seasonFiles.length} من ${FILE_TYPES.length}`, hint: opsMissing ? `${opsMissing} لم تُنشأ بعد` : "كلها منشأة" },
                  { k: "مفعّلة", v: opsActive, tone: opsActive === FILE_TYPES.length ? undefined : "gold" },
                  { k: "مناصب إلزامية شاغرة", v: opsGaps, tone: opsGaps ? "maroon" : undefined },
                  { k: "موظفون مشاركون", v: employees.filter((e) => e.seasons.includes(CURRENT_SEASON)).length },
                ]}
              />
            </Section>
          )}

          {review && (
            <Section title="مراجعة الطلبات" icon={<ClipboardCheck />} href="/staff/reviews" link="افتح المراجعة">
              <Figures
                items={[
                  { k: "الطلبات المقدّمة", v: formatNumber(REG_STATS.applications + realApps.length), hint: realApps.length ? `+${realApps.length} من جلسة العرض` : "التسجيل على القبول المباشر 1448" },
                  { k: "الأفراد في الطلبات", v: formatNumber(REG_STATS.persons + realPersons) },
                  { k: "رسوم التسجيل المحصّلة", v: `${formatNumber(REG_STATS.persons * season.fees.registrationPerPerson + realPaid)} $`, hint: `${season.fees.registrationPerPerson} $ للفرد` },
                  { k: "بانتظار مراجعتك", v: pendingReviews, tone: pendingReviews ? "maroon" : undefined, hint: `من أصل ${formatNumber(REG_STATS.needsReview)} حالة في الموسم${pendingContracts ? ` · ${pendingContracts} عقود بانتظارك` : ""}` },
                ]}
              />
              <Sub title="التسجيل اليومي على القبول المباشر — 14 يوماً (12 – 25 آب)">
                <Columns dark values={DAILY_REGISTRATIONS} height={120} highlight={DAILY_REGISTRATIONS.length - 1} labels={["12 آب", "16", "20", "25 آب"]} />
              </Sub>
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
            </Section>
          )}

          {lotteryPerm && (
            <Section title="القبول والقرعة" icon={<Dices />} href="/staff/lottery" link="افتح الخطوات">
              <Figures
                items={[
                  { k: "طلبات القبول المباشر المؤهلة", v: formatNumber(LOTTERY.directEligible), hint: `التسجيل: ${SEASON.windows.direct.hijri}` },
                  { k: "مقاعد القبول المباشر", v: formatNumber(season.directSeats), tone: "gold", hint: `${Math.round(season.directShare * 100)}% من ${formatNumber(season.quota)}` },
                  { k: "طلبات التسجيل الأولي على القرعة", v: formatNumber(POOL.poolApps), hint: `${formatNumber(POOL.poolSeats)} شخصاً — ${SEASON.windows.lottery.hijri}` },
                  { k: "مقاعد القرعة", v: formatNumber(season.lotterySeats), hint: "تُملأ بسنوات الميلاد وأشهرها المسحوبة" },
                ]}
              />
              <p className="text-xs text-white/60">
                من طلبات القبول المباشر: مؤهلون {formatNumber(REG_STATS.eligible)} · مرفوضون بسبب واضح {formatNumber(REG_STATS.rejected)}
              </p>
              {!review && (
                <Sub title="التسجيل اليومي على القبول المباشر — 14 يوماً (12 – 25 آب)">
                  <Columns dark values={DAILY_REGISTRATIONS} height={120} highlight={DAILY_REGISTRATIONS.length - 1} labels={["12 آب", "16", "20", "25 آب"]} />
                </Sub>
              )}
            </Section>
          )}

          {can(user, "season.values.GET") && (
            <Section title="إعدادات الموسم" icon={<Settings2 />} href="/staff/season" link="تعديل الإعدادات">
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
            </Section>
          )}

          {can(user, "operations.tickets.GET") && (
            <Section title="غرفة العمليات — يوم عرفة" icon={<RadioTower />} href="/staff/operations" link="افتح غرفة العمليات">
              <Figures
                items={[
                  { k: "بلاغات مفتوحة", v: openTickets.length, tone: critical ? "maroon" : undefined, hint: `حرجة ${critical} · صحية ${health} · مفقودون ${missing}` },
                  { k: "الحجاج في عرفة", v: 601, hint: "من 604 — 3 في العيادة الميدانية" },
                  { k: "حافلات مزدلفة", v: busAccepted ? 15 : 14, hint: busAccepted ? "أُضيفت الحافلة التاسعة للمبكرة" : "السائقون أكدوا 13 من 14" },
                  { k: "الحرارة في عرفة", v: "41°", tone: "gold", hint: "ذروة 15:00 — رشّ رذاذ الماء" },
                ]}
              />
              <p className="text-xs text-white/60">
                حافلات مزدلفة المبكرة (كبار السن): 430 مسجّلاً، والسعة {busAccepted ? "450 بتسع حافلات" : "400 بثماني حافلات — اقتراح بحافلة تاسعة ينتظر القرار"}.
              </p>
              <Sub title="أحدث البلاغات">
                <ul className="divide-y divide-white/10">
                  {openTickets.slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2">
                      <span className={cn("size-2.5 shrink-0 rounded-full", t.severity === "critical" ? "animate-pulse bg-maroon" : t.severity === "high" ? "bg-maroon-light" : "bg-gold-dark")} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {t.name} — {t.location}
                      </span>
                      <span className="shrink-0 text-xs text-white/70">{ago(t.at, now)}</span>
                    </li>
                  ))}
                  {openTickets.length === 0 && <li className="py-2 text-sm text-white/60">لا بلاغات مفتوحة.</li>}
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
                      {groupReports.map((r) => {
                        const c = r.open;
                        return (
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
                            <td className="py-2">{c ? <span className="rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white">{c}</span> : <span className="text-white/65">0</span>}</td>
                            <td className="py-2 tabular-nums text-white/85">{r.report}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Sub>
            </Section>
          )}

          {can(user, "content.pages.GET") && (
            <Section title="محتوى الموقع" icon={<PencilLine />} href="/staff/content" link="افتح المحتوى">
              <Figures
                items={[
                  { k: "صفحات منشورة", v: content.published, hint: "يراها الزوار الآن" },
                  { k: "مسودات غير منشورة", v: content.drafts, tone: content.drafts ? "gold" : undefined, hint: "صفحات ومجموعات بانتظار النشر" },
                  { k: "عناصر معدّلة", v: content.edited, hint: "حقول وأقسام ومقالات" },
                  { k: "في الأرشيف", v: content.archived, hint: "قابلة للاستعادة" },
                ]}
              />
            </Section>
          )}

          {can(user, "audit.events.GET") && (
            <Section title="سجل الأحداث" icon={<ScrollText />} href="/staff/audit" link="افتح السجل">
              <Figures
                items={[
                  { k: "إجمالي الأحداث", v: formatNumber(events.length) },
                  { k: "من جلسة العرض", v: formatNumber(events.filter((e) => e.live).length) },
                  { k: "الموظفون في السجل", v: new Set(events.map((e) => e.actor)).size },
                  { k: "تعديلات بقيمة قبل/بعد", v: formatNumber(events.filter((e) => e.before !== undefined).length), hint: "اعتراضات مفتوحة: 1" },
                ]}
              />
              {!can(user, "season.values.GET") && (
                <Sub title="رضا الحجاج — مقارنة سريعة">
                  <BarList dark items={EXEC.stages.slice(0, 6).map((s) => ({ label: s.stage, value: s.y1448, key: s.stage }))} max={5} format={(v) => v.toFixed(1)} color="bg-green-light" />
                </Sub>
              )}
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <TodayTasks todos={todos} user={user} />
          <Panel dark title="آخر إجراءاتي" icon={<ScrollText />} delay={0.2}>
            {mine.length === 0 ? (
              <p className="text-sm text-white/70">لا توجد إجراءات مسجّلة باسمك بعد.</p>
            ) : (
              <ol className="relative space-y-3 border-r-2 border-gold/30 pr-4">
                {mine.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -right-[23px] top-1.5 size-3 rounded-full border-2 border-green-dark bg-gold" />
                    <p className="text-sm font-bold text-white">
                      {e.action}
                      {e.target ? ` — ${e.target}` : ""}
                    </p>
                    <p className="text-xs text-white/70">{e.live ? ago(e.at, now) : fmtDateTime(e.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TodayTasks({ todos, user }: { todos: Todo[]; user: StaffUser }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const doneCount = todos.filter((t) => t.done || checked[t.id]).length;
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 100;
  return (
    <Panel
      dark
      title="مهامي اليوم"
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
                {t.href && (
                  <Link href={t.href} className="shrink-0 rounded-lg p-1 text-gold opacity-60 transition group-hover:opacity-100" aria-label="فتح">
                    <ArrowLeft className="size-4" />
                  </Link>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-5 text-white/70">{user.travels ? "أنت ضمن البعثة المسافرة — تظهر مهامك الميدانية بحسب ملفك التشغيلي." : "تُولَّد المهام من صلاحياتك ومن حالة الموسم الآن."}</p>
    </Panel>
  );
}
