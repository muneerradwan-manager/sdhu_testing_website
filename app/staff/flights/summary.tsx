"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CalendarRange, Gauge, Megaphone, PlaneLanding, PlaneTakeoff, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { fmtClock, fmtGregShort, fmtHijriShort, isActive, routeLabel } from "@/lib/flights";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn, formatNumber } from "@/lib/utils";
import { fmtDate, Kpi, PageHeader, Panel, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { Escalate, Raised, Todo } from "../_components/system";
import { Box, HowItWorks } from "../_components/wp";
import { useFlightsDesk } from "./desk";
import { flightHref } from "./flight-screen";
import { SeatBar, StatusChip } from "./shared";

/**
 * The file's dashboard: numbers only — the season's flights, seats and travellers, the airports and who stands
 * at each, the flights coming next, how far each cluster is seated — with how the work goes and what waits,
 * each one click from where it is done. Nothing is edited here; the records stay with each operation.
 */
/** `embedded`: inside «لوحة الإدارة العليا», which has its own heading: the figures only, without this page's heading and «كيف تعمل» */
export function FlightsSummary({ embedded = false }: { embedded?: boolean } = {}) {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().flights.find((h) => h.staffId === user.id);
  const desk = useFlightsDesk();
  const [escalating, setEscalating] = useState(false);
  const { data } = desk;
  const pct = desk.seats ? Math.round((desk.seated / desk.seats) * 100) : 0;
  const assignments = data.assignments.filter(isActive).length;
  const next = data.flights.filter((f) => !["arrived", "cancelled"].includes(f.status)).sort((a, b) => a.departAt - b.departAt).slice(0, 8);

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
        <PageHeader
          eyebrow={`${SYSTEMS.flights.label}${grant?.by ? ` — منحك عرض إحصائياته ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
          title={SYSTEMS.flights.summary.label}
          icon={<Gauge />}
          description="أرقام رحلات الموسم الآن، وما ينتظرك. العمل نفسه من القائمة الجانبية."
          actions={
            <>
              <Button size="sm" variant="glass" onClick={() => setEscalating(true)}>
                <Megaphone className="size-4" /> رفع أمر إلى المدير
              </Button>
              <ButtonLink href={SYSTEMS.flights.manage.href} size="sm" variant="gold">
                {SYSTEMS.flights.manage.label} <ArrowLeft className="size-4" />
              </ButtonLink>
            </>
          }
        />

        </>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="رحلات الموسم" value={desk.live.length} icon={<CalendarRange />} hint={`${desk.live.filter((f) => f.direction === "outbound").length} ذهاب · ${desk.live.filter((f) => f.direction === "return").length} عودة · ${desk.drafts.length} مسودة`} />
        <Kpi label="مقاعد الحجاج المسندة" value={desk.seated} icon={<Users />} tone="teal" delay={0.05} hint={`من ${formatNumber(desk.seats)} مقعداً — ${pct}% · ${formatNumber(assignments)} إسناداً نشطاً`} />
        <Kpi label="بلا رحلة ذهاب" value={desk.travellers - desk.withOut} icon={<PlaneTakeoff />} tone="maroon" delay={0.1} pulse={desk.needsFlight.length > 0} hint={`من ${formatNumber(desk.travellers)} حاجاً وإدارياً في المجموعات · على العودة ${formatNumber(desk.withBack)}`} />
        <Kpi label="أقلعت" value={desk.done.length} icon={<PlaneLanding />} tone="gold" delay={0.15} hint={desk.inAir.length ? `في الجو الآن ${desk.inAir.length}` : "لا رحلة في الجو الآن"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Todo alerts={desk.alerts} empty="كل مجموعة على رحلتيها، ولا أحد فقد مقعده، ولكل مطار مندوبه." />
        <Raised system="flights" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — رحلة ألغاها الناقل ولا بديل، أو مقاعد لا تكفي — ارفعه إلى مدير الموسم." />
      </div>

      {/* In the order the work is done: the airports and who stands at each, the flights, who goes on them */}
      <Panel icon={<Building2 />} title="المطارات ومندوبوها" action={<Link href="/staff/flights/manage" className="text-sm font-bold text-gold hover:underline">المطارات</Link>}>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {desk.airports.map((x) => (
            <li key={x.a.id} className={cn("flex flex-wrap items-center gap-2 rounded-2xl p-3 ring-1", x.rep ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-white">
                  {x.a.city} <span className="font-mono text-xs text-gold" dir="ltr">{x.a.code}</span>
                </span>
                <span className="block text-xs text-white/60">
                  {x.departures} مغادرة · {x.arrivals} وصول
                </span>
              </span>
              {x.rep ? <Chip tone="green">{x.rep.name}</Chip> : <Chip tone="maroon">بلا مندوب</Chip>}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel icon={<CalendarRange />} title="الرحلات القادمة" action={<Link href="/staff/flights/manage/flights" className="text-sm font-bold text-gold hover:underline">كل الرحلات</Link>} bodyClass="-mx-5 md:-mx-6">
        <div className="overflow-x-auto px-5 md:px-6">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-xs text-gold">
                {["الرحلة", "المسار", "الموعد", "الإشغال", "الحال"].map((h) => (
                  <th key={h} className="pb-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {next.map((f) => (
                <tr key={f.id} className="text-white">
                  <td className="py-2.5">
                    <Link href={flightHref(f.id)} className="font-mono font-bold text-gold hover:underline" dir="ltr">
                      {f.flightNo}
                    </Link>
                    {f.audience === "staff" && <span className="mr-1 text-xs text-white/60">موظفون</span>}
                  </td>
                  <td className="py-2.5">{routeLabel(data, f)}</td>
                  <td className="py-2.5 text-white/80">
                    {fmtHijriShort(f.departAt)} <span className="text-xs text-white/55">({fmtGregShort(f.departAt)} — {fmtClock(f.departAt)})</span>
                  </td>
                  <td className="py-2.5">
                    <SeatBar f={f} assignments={data.assignments} compact />
                  </td>
                  <td className="py-2.5">
                    <StatusChip f={f} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel icon={<UsersRound />} title="التكتلات على رحلاتها" action={<Link href="/staff/flights/manage/allotments" className="text-sm font-bold text-gold hover:underline">أيام التكتلات</Link>} bodyClass="-mx-5 md:-mx-6">
        <div className="overflow-x-auto px-5 md:px-6">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-xs text-gold">
                {["التكتل", "أيامه", "المجموعات", "المسافرون", "ذهاب", "عودة"].map((h) => (
                  <th key={h} className="pb-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {desk.clusterTotals.map((c) => (
                <tr key={c.cluster} className="text-white">
                  <td className="py-2.5 font-bold">{c.name}</td>
                  <td className={cn("py-2.5 tabular-nums", c.days.length ? "" : "text-maroon-light")}>{c.days.length || "—"}</td>
                  <td className="py-2.5 tabular-nums">{c.groups}</td>
                  <td className="py-2.5 tabular-nums">{formatNumber(c.total)}</td>
                  <td className={cn("py-2.5 tabular-nums", c.out < c.total ? "text-gold" : "text-green-light")}>{formatNumber(c.out)}</td>
                  <td className={cn("py-2.5 tabular-nums", c.back < c.total ? "text-gold" : "text-green-light")}>{formatNumber(c.back)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20 font-bold text-white">
                <td className="py-2.5">المجموع</td>
                <td className="py-2.5 tabular-nums">{desk.data.allotments.length}</td>
                <td className="py-2.5 tabular-nums">{desk.groups.length}</td>
                <td className="py-2.5 tabular-nums">{formatNumber(desk.travellers)}</td>
                <td className="py-2.5 tabular-nums">{formatNumber(desk.withOut)}</td>
                <td className="py-2.5 tabular-nums">{formatNumber(desk.withBack)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <Box title="ما يصل إلى مدير الموسم" open={false}>
        <p>لا يصلها من عملك إلا ما يعطّل سفر أحد، ونشر الرحلات وتغيير مواعيدها وإلغاؤها، والإقلاع والهبوط، وما ترفعه إليها بزر «رفع أمر إلى المدير». وسجلّ كل جزء مع عمليته في «إدارة الطيران».</p>
      </Box>

      <Escalate system="flights" open={escalating} onClose={() => setEscalating(false)} example="مثال: ألغت الخطوط السعودية الرحلة SV 3427، ولا مقاعد بديلة لـ 290 مسافراً قبل 5 أيار." />
      {!embedded && (
          <HowItWorks
            steps={[
              { title: "جهّز", text: "المطارات والناقلون، ومندوب لكل مطار يسجّل الإقلاع منه والهبوط فيه.", href: "/staff/flights/manage", link: "المطارات" },
              { title: "أنشئ وانشر", text: "رحلة ذهاب وعودة معاً تُحفظ مسودة، ثم تُنشر من صفحتها.", href: "/staff/flights/manage/flights", link: "الرحلات" },
              { title: "أعطِ التكتلات أيامها", text: "لكل تكتل رحلاته ذهاباً وعودة ومقاعده عليها، فيضع منسقوه مجموعاتهم عليها. والموظفون ومن فقد مقعده من التفويج.", href: "/staff/flights/manage/allotments", link: "أيام التكتلات" },
              { title: "أقفل وسافر", text: "إقفال الرحلة يصدر كشف ركابها، ثم يسجّل مندوب المطار إقلاعها وهبوطها.", href: "/staff/flights/manage/flights", link: "الرحلات" },
            ]}
          />
      )}
    </div>
  );
}
