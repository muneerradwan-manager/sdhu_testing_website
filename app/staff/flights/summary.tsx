"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CalendarRange, Gauge, Megaphone, PlaneLanding, PlaneTakeoff, Users, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { fmtClock, fmtGregShort, fmtHijriShort, routeLabel } from "@/lib/flights";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn, formatNumber } from "@/lib/utils";
import { fmtDate, Kpi, PageHeader, Panel, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { Escalate, Raised, Todo } from "../_components/system";
import { useFlightsDesk } from "./desk";
import { SeatBar, StatusChip } from "./shared";

/**
 * The dashboard of whoever holds «إدارة الطيران», in place of a general «لوحتي»: the season in numbers, what
 * waits for him — each item one click from the tab or the flight it is done on — then, in the order the work
 * is done, the airports and who stands at each, the flights coming next, and how far each cluster is seated.
 * The records stay in the management tabs.
 */
export function FlightsSummary() {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().flights.find((h) => h.staffId === user.id);
  const desk = useFlightsDesk();
  const [escalating, setEscalating] = useState(false);
  const { data } = desk;
  const pct = desk.seats ? Math.round((desk.seated / desk.seats) * 100) : 0;
  const next = data.flights.filter((f) => !["arrived", "cancelled"].includes(f.status)).sort((a, b) => a.departAt - b.departAt).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`صلاحيتك: ${SYSTEMS.flights.label}${grant?.by ? ` — منحتك إياها ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
        title={SYSTEMS.flights.summary.label}
        icon={<Gauge />}
        description="حال رحلات الموسم الآن، وما ينتظرك فيها. العمل نفسه وسجلّ كل جزء في «إدارة الطيران». ولا يصل إلى مديرة الموسم إلا ما يعطّل سفر أحد، ونشر الرحلات وتغيير مواعيدها وإلغاؤها، والإقلاع والهبوط، وما ترفعه إليها."
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="رحلات الموسم" value={desk.live.length} icon={<CalendarRange />} hint={`${desk.live.filter((f) => f.direction === "outbound").length} ذهاب · ${desk.live.filter((f) => f.direction === "return").length} عودة · ${desk.drafts.length} مسودة`} />
        <Kpi label="مقاعد الحجاج المسندة" value={desk.seated} icon={<Users />} tone="teal" delay={0.05} hint={`من ${formatNumber(desk.seats)} مقعداً — ${pct}%`} />
        <Kpi label="بلا رحلة ذهاب" value={desk.travellers - desk.withOut} icon={<PlaneTakeoff />} tone="maroon" delay={0.1} pulse={desk.needsFlight.length > 0} hint={`من ${formatNumber(desk.travellers)} حاجاً وإدارياً في المجموعات`} />
        <Kpi label="أقلعت" value={desk.done.length} icon={<PlaneLanding />} tone="gold" delay={0.15} hint={desk.inAir.length ? `في الجو الآن ${desk.inAir.length}` : "لا رحلة في الجو الآن"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Todo alerts={desk.alerts} empty="كل مجموعة على رحلتيها، ولا أحد فقد مقعده، ولكل مطار مندوبه." />
        <Raised system="flights" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — رحلة ألغاها الناقل ولا بديل، أو مقاعد لا تكفي، أو قرار خارج النظام — ارفعه إلى مديرة الموسم، فيظهر عندها طلبَ تدخّل." />
      </div>

      {/* In the order the work is done: the airports and who stands at each, the flights, who goes on them */}
      <Panel icon={<Building2 />} title="المطارات ومندوبوها" action={<Link href="/staff/flights/manage" className="text-sm font-bold text-gold hover:underline">إدارتها</Link>}>
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
                    <Link href={`/staff/flights/manage/flights?f=${f.id}`} className="font-mono font-bold text-gold hover:underline" dir="ltr">
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

      <Panel icon={<UsersRound />} title="التكتلات على رحلاتها" action={<Link href="/staff/flights/manage/dispatch" className="text-sm font-bold text-gold hover:underline">التفويج</Link>} bodyClass="-mx-5 md:-mx-6">
        <div className="overflow-x-auto px-5 md:px-6">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-xs text-gold">
                {["التكتل", "المجموعات", "المسافرون", "ذهاب", "عودة"].map((h) => (
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
                  <td className="py-2.5 tabular-nums">{c.groups}</td>
                  <td className="py-2.5 tabular-nums">{formatNumber(c.total)}</td>
                  <td className={cn("py-2.5 tabular-nums", c.out < c.total ? "text-gold" : "text-green-light")}>{formatNumber(c.out)}</td>
                  <td className={cn("py-2.5 tabular-nums", c.back < c.total ? "text-gold" : "text-green-light")}>{formatNumber(c.back)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Escalate system="flights" open={escalating} onClose={() => setEscalating(false)} example="مثال: ألغت الخطوط السعودية الرحلة SV 3427، ولا مقاعد بديلة لـ 290 مسافراً قبل 5 أيار." />
    </div>
  );
}
