"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Dices,
  FileClock,
  GraduationCap,
  HeartPulse,
  ListTodo,
  RadioTower,
  ScrollText,
  Siren,
  Sun,
  UserCog,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DAILY_REGISTRATIONS, EXEC, REG_STATS } from "@/lib/data/staff-seed";
import { useSeason } from "@/lib/season-live";
import { can, PERMISSION_LABELS, STAFF, type StaffUser } from "@/lib/staff";
import { useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { useAdminRows, useAllEvents, useReviewQueue, useTicketQueue } from "../_components/data";
import { ago, BarList, Columns, Donut, fmtDateTime, Kpi, Legend, PageHeader, Panel, useNow, useStaffUser } from "../_components/kit";

type Todo = { id: string; text: string; href?: string; done?: boolean; tone?: "maroon" | "gold" | "green" };

function greeting(hour: number) {
  if (hour < 12) return "صباح الخير";
  if (hour < 18) return "مساء الخير";
  return "مساء النور";
}

export function DashboardView() {
  const user = useStaffUser()!;
  const now = useNow(30_000);
  const season = useSeason();
  const reviews = useReviewQueue();
  const tickets = useTicketQueue();
  const admins = useAdminRows();
  const events = useAllEvents();
  const applications = useStore((s) => s.applications);
  const lottery = useStore((s) => s.lottery);

  const pendingReviews = reviews.filter((r) => !r.review).length;
  const openTickets = tickets.filter((t) => t.status !== "resolved");
  const critical = openTickets.filter((t) => t.severity === "critical").length;
  const awaitingOral = admins.filter((a) => a.profile.exam?.score !== undefined && !a.profile.oral).length;
  const groupRequests = admins.filter((a) => a.profile.group && !a.profile.group.approvedAt).length;
  const realApps = Object.values(applications);
  const mine = useMemo(() => events.filter((e) => e.actor === user.name).slice(0, 6), [events, user.name]);

  const todos = useMemo<Todo[]>(() => {
    const list: Todo[] = [];
    if (can(user, "registration.review")) list.push({ id: "rev", text: `مراجعة ${pendingReviews} طلبات تحتاج قراراً بشرياً`, href: "/staff/reviews", tone: "gold", done: pendingReviews === 0 });
    if (can(user, "lottery.import")) list.push({ id: "imp", text: lottery.importedAt ? "تم رفع ملف نتائج القرعة" : "رفع ملف نتائج القرعة المعتمد من اللجنة", href: "/staff/lottery", done: !!lottery.importedAt });
    if (can(user, "lottery.approve")) list.push({ id: "pub", text: lottery.publishedAt ? "نُشرت نتائج القرعة" : lottery.importedAt ? "اعتماد ونشر نتائج القرعة" : "بانتظار رفع ملف القرعة من إدارة التسجيل", href: "/staff/lottery", done: !!lottery.publishedAt, tone: "maroon" });
    if (can(user, "season.settings")) list.push({ id: "season", text: "مراجعة إعدادات الموسم قبل فتح حملة الاستدراك", href: "/staff/season" });
    if (can(user, "administrators.manage")) list.push({ id: "oral", text: `إدخال نتائج الشفهي (${awaitingOral} متقدمين)`, href: "/staff/administrators", done: awaitingOral === 0, tone: "gold" });
    if (can(user, "groups.approve")) list.push({ id: "groups", text: `اعتماد طلبات تشكيل المجموعات (${groupRequests})`, href: "/staff/administrators", done: groupRequests === 0, tone: "maroon" });
    if (can(user, "operations.room")) {
      list.push({ id: "crit", text: `متابعة ${critical} بلاغات حرجة حتى الإغلاق`, href: "/staff/operations", tone: "maroon", done: critical === 0 });
      list.push({ id: "bus", text: "مراجعة اقتراح الحافلة التاسعة لمزدلفة", href: "/staff/operations" });
    }
    if (can(user, "medical")) list.push({ id: "heat", text: "جولة على خيام كبار السن قبل ذروة الحر (15:00)" });
    if (can(user, "transport")) list.push({ id: "drivers", text: "تأكيد حضور السائقين 13 من 14" });
    if (can(user, "audit.read")) list.push({ id: "obj", text: "الرد على اعتراض الطلب 51877 مع الدليل", href: "/staff/audit", tone: "gold" });
    if (can(user, "staff.create")) list.push({ id: "nader", text: "إرسال كلمة مرور مؤقتة لموظف جديد (نادر قاسم)" });
    return list;
  }, [user, pendingReviews, lottery, awaitingOral, groupRequests, critical]);

  const hour = new Date(now).getHours();

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
        description="هذه لوحتك اليوم. تظهر فيها المؤشرات التي تخص صلاحياتك فقط."
      />

      {/* KPI strip — adapts per role */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {can(user, "registration.review") && (
          <>
            <Kpi dark label="المتقدمون" value={REG_STATS.applications + realApps.length} icon={<UsersRound />} hint={`منهم ${realApps.length} طلبات حقيقية من العرض`} />
            <Kpi dark label="بانتظار مراجعتك" value={pendingReviews} icon={<ClipboardCheck />} tone="gold" delay={0.05} pulse={pendingReviews > 0} hint="تكرار، بيانات غير مؤكدة، شروط" />
          </>
        )}
        {can(user, "season.settings") && (
          <>
            <Kpi dark label="الحصة الإجمالية" value={season.quota} icon={<Dices />} tone="teal" delay={0.1} hint={`مباشر ${formatNumber(season.directSeats)} · قرعة ${formatNumber(season.lotterySeats)}`} />
            <Kpi dark label="رسوم التسجيل المحصّلة" value={REG_STATS.persons * season.fees.registrationPerPerson} suffix=" $" icon={<Wallet />} tone="maroon" delay={0.15} />
          </>
        )}
        {can(user, "lottery.import") && !can(user, "season.settings") && (
          <>
            <Kpi dark label="المؤهلون" value={REG_STATS.eligible} icon={<CheckCircle2 />} tone="teal" delay={0.1} />
            <Kpi dark label="مرفوضون بسبب واضح" value={REG_STATS.rejected} icon={<FileClock />} tone="maroon" delay={0.15} />
          </>
        )}
        {(can(user, "administrators.manage") || can(user, "groups.approve")) && (
          <>
            <Kpi dark label="المتقدمون للعمل" value={1_380} icon={<GraduationCap />} hint="الإداريون الموسميون" />
            <Kpi dark label="بانتظار الشفهي" value={awaitingOral} icon={<UserCog />} tone="gold" delay={0.05} />
            <Kpi dark label="طلبات تشكيل مجموعات" value={groupRequests} icon={<UsersRound />} tone="maroon" delay={0.1} pulse={groupRequests > 0} />
            <Kpi dark label="ناجحون حتى الآن" value={admins.filter((a) => (a.profile.finalScore ?? 0) >= 70).length + 1_094} icon={<CheckCircle2 />} tone="teal" delay={0.15} />
          </>
        )}
        {can(user, "operations.room") && (
          <>
            <Kpi dark label="بلاغات مفتوحة" value={openTickets.length} icon={<Siren />} tone="maroon" pulse={critical > 0} hint={`منها حرجة: ${critical}`} />
            <Kpi dark label="في عرفة الآن" value={601} icon={<Activity />} hint="من 604 حجاج في التكتل" delay={0.05} />
            <Kpi dark label="الحافلات الجاهزة" value={14} icon={<RadioTower />} tone="teal" delay={0.1} hint="السائقون أكدوا 13 من 14" />
            <Kpi dark label="درجة الحرارة" value={41} suffix="°" icon={<HeartPulse />} tone="gold" delay={0.15} hint="مؤشر الإجهاد الحراري: مرتفع" />
          </>
        )}
        {can(user, "audit.read") && !can(user, "season.settings") && (
          <>
            <Kpi dark label="أحداث في السجل" value={events.length} icon={<ScrollText />} />
            <Kpi dark label="أحداث جلسة العرض" value={events.filter((e) => e.live).length} icon={<Activity />} tone="teal" delay={0.05} />
            <Kpi dark label="اعتراضات مفتوحة" value={1} icon={<FileClock />} tone="maroon" delay={0.1} />
            <Kpi dark label="تعديلات بقيم قبل/بعد" value={events.filter((e) => e.before !== undefined).length} icon={<ListTodo />} tone="gold" delay={0.15} />
          </>
        )}
        {can(user, "staff.create") && (
          <>
            <Kpi dark label="الموظفون الدائمون" value={STAFF.length} icon={<UsersRound />} />
            <Kpi dark label="المسافرون مع البعثة" value={210} icon={<Activity />} tone="teal" delay={0.05} />
            <Kpi dark label="حسابات جديدة هذا الشهر" value={4} icon={<UserPlus />} tone="gold" delay={0.1} />
            <Kpi dark label="صلاحيات ممنوحة" value={STAFF.reduce((a, s) => a + s.permissions.length, 0)} icon={<UserCog />} tone="maroon" delay={0.15} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <div className="space-y-6">
          {(can(user, "registration.review") || can(user, "lottery.import")) && (
            <Panel dark title="التسجيل اليومي — 22 يوماً" icon={<Activity />} delay={0.1} action={<span className="text-xs text-white/70">الذروة في الأيام الأخيرة قبل الإغلاق</span>}>
              <Columns dark values={DAILY_REGISTRATIONS} height={140} highlight={DAILY_REGISTRATIONS.length - 1} labels={["9 ج2", "15", "20", "25", "1 رجب"]} />
            </Panel>
          )}
          {can(user, "season.settings") && (
            <Panel dark title="توزيع الحصة" icon={<Dices />} delay={0.15}>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Donut
                  size={170}
                  thickness={22}
                  track="rgba(255,255,255,.08)"
                  segments={[
                    { value: season.directSeats, color: "#AD9E6E", label: "direct" },
                    { value: season.lotterySeats, color: "#289E92", label: "lottery" },
                  ]}
                >
                  <div>
                    <p className="font-display text-2xl font-bold text-white">{formatNumber(season.quota)}</p>
                    <p className="text-xs text-white/70">مقعداً</p>
                  </div>
                </Donut>
                <div className="w-full flex-1">
                  <Legend
                    dark
                    items={[
                      { label: `قبول مباشر ${Math.round(season.directShare * 100)}% (${season.acceptedDirectAge}+ عاماً)`, color: "#AD9E6E", value: formatNumber(season.directSeats) },
                      { label: `القرعة ${100 - Math.round(season.directShare * 100)}%`, color: "#289E92", value: formatNumber(season.lotterySeats) },
                      { label: "الاحتياط", color: "#E4DDD3", value: formatNumber(3_000) },
                    ]}
                  />
                  <Link href="/staff/season" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
                    تعديل الإعدادات <ArrowLeft className="size-4" />
                  </Link>
                </div>
              </div>
            </Panel>
          )}
          {can(user, "registration.review") && (
            <Panel dark title="أسباب عدم الأهلية" icon={<FileClock />} delay={0.2}>
              <BarList dark items={REG_STATS.rejectionReasons.map((r) => ({ label: r.label, value: r.value, key: r.label }))} color="bg-gold" />
            </Panel>
          )}
          {can(user, "operations.room") && (
            <Panel dark title="أحدث البلاغات" icon={<Siren />} delay={0.1} action={<Link href="/staff/operations" className="text-sm font-bold text-gold hover:underline">افتح غرفة العمليات</Link>}>
              <ul className="divide-y divide-white/10">
                {openTickets.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span className={cn("size-2.5 shrink-0 rounded-full", t.severity === "critical" ? "animate-pulse bg-maroon" : t.severity === "high" ? "bg-maroon-light" : "bg-gold-dark")} />
                    <span className="min-w-0 flex-1 truncate text-sm">{t.name} — {t.location}</span>
                    <span className="shrink-0 text-xs text-white/70">{ago(t.at, now)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {(can(user, "administrators.manage") || can(user, "groups.approve")) && (
            <Panel dark title="نتائج التأهيل — توزيع الدرجات النهائية" icon={<GraduationCap />} delay={0.1}>
              <Columns dark values={[18, 34, 62, 118, 196, 262, 241, 188, 124, 67]} labels={["50", "60", "70", "80", "90", "100"]} highlight={2} height={130} />
              <p className="mt-3 text-xs text-white/70">الحد الأدنى للنجاح 70 — الكتابي 60% والشفهي 40%.</p>
            </Panel>
          )}
          {can(user, "staff.create") && (
            <Panel dark title="حسابات الموظفين والصلاحيات" icon={<UserCog />} delay={0.1}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="text-right text-xs text-white/70">
                      <th className="pb-2 font-bold">الموظف</th>
                      <th className="pb-2 font-bold">الصلاحيات الفردية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {STAFF.map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 align-top">
                          <p className="font-bold text-gold">{s.name}</p>
                          <p className="text-xs text-white/70">{s.title}</p>
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {s.permissions.map((p) => (
                              <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80 ring-1 ring-white/15">
                                {PERMISSION_LABELS[p]}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          {can(user, "audit.read") && !can(user, "season.settings") && (
            <Panel dark title="رضا الحجاج — مقارنة سريعة" icon={<Activity />} delay={0.1}>
              <BarList dark items={EXEC.stages.slice(0, 6).map((s) => ({ label: s.stage, value: s.y1448, key: s.stage }))} max={5} format={(v) => v.toFixed(1)} color="bg-green-light" />
            </Panel>
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
                    <p className="text-sm font-bold text-white">{e.action}{e.target ? ` — ${e.target}` : ""}</p>
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
                <button
                  onClick={() => !t.done && setChecked((c) => ({ ...c, [t.id]: !c[t.id] }))}
                  aria-label={done ? "منجزة" : "علّمها منجزة"}
                  className={cn("shrink-0", done ? "text-green-light" : "text-gold hover:text-white")}
                >
                  {done ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                </button>
                <span className={cn("min-w-0 flex-1 text-sm", done ? "text-white/70 line-through" : "font-semibold text-white")}>{t.text}</span>
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
      <p className="mt-4 text-xs leading-5 text-white/70">
        {user.travels ? "أنت ضمن البعثة المسافرة — تظهر مهامك الميدانية بحسب ملفك التشغيلي." : "تُولَّد المهام من صلاحياتك ومن حالة الموسم الآن."}
      </p>
    </Panel>
  );
}
