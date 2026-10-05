"use client";

import Link from "next/link";
import { ArrowLeft, Briefcase, CalendarCheck, Gauge, IdCard, KeyRound, Megaphone, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { CURRENT_SEASON } from "@/lib/ops";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { BarList, fmtDate, Kpi, PageHeader, Panel, useStaffUser } from "../_components/kit";
import { Chip } from "../_components/ops-ui";
import { Escalate, Raised, Todo } from "../_components/system";
import { useEmployeesDesk } from "./desk";

/**
 * The dashboard of whoever holds «إدارة الموظفين», in place of a general «لوحتي»: the file in numbers, what
 * waits for him — each item one click from the tab or the sheet it is done in — then, in the order the work
 * is done, what the register is made of, whose accounts are tied to their records, and how the season's
 * participants stand. The records stay in the management tabs.
 */
export function EmployeesSummary() {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().staff.find((h) => h.staffId === user.id);
  const desk = useEmployeesDesk();
  const [escalating, setEscalating] = useState(false);
  const field = desk.accounts.filter((r) => r.halls.length + r.airports.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`صلاحيتك: ${SYSTEMS.staff.label}${grant?.by ? ` — منحتك إياها ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
        title={SYSTEMS.staff.summary.label}
        icon={<Gauge />}
        description="حال موظفي البعثة الآن، وما ينتظرك فيهم. العمل نفسه وسجلّ كل جزء في «إدارة الموظفين». ولا يصل إلى مديرة الموسم إلا إيقاف موظف مُسند إلى موقع أو إعادته إلى العمل، وإلغاء مشاركة أحد في الموسم، وما ترفعه إليها."
        actions={
          <>
            <Button size="sm" variant="glass" onClick={() => setEscalating(true)}>
              <Megaphone className="size-4" /> رفع أمر إلى المدير
            </Button>
            <ButtonLink href={SYSTEMS.staff.manage.href} size="sm" variant="gold">
              {SYSTEMS.staff.manage.label} <ArrowLeft className="size-4" />
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="سجل الموظفين" value={desk.employees.length} icon={<UsersRound />} hint={`${desk.permanent} دائمون · ${desk.external} منتدبون`} />
        <Kpi label="حسابات مربوطة بسجلاتها" value={desk.linked.length} icon={<KeyRound />} tone="teal" delay={0.05} hint={`من ${desk.accounts.length} حساباً${desk.unlinked.length ? ` — ${desk.unlinked.length} بلا سجل` : ""}`} />
        <Kpi label={`مشاركون في موسم ${CURRENT_SEASON}`} value={desk.participants.length} icon={<CalendarCheck />} tone="maroon" delay={0.1} hint={desk.suspendedIn.length ? `${desk.suspendedIn.length} موقوفون منهم` : "يسافرون مع البعثة هذا الموسم"} />
        <Kpi label="مُسندون في الملفات" value={desk.posted.length} icon={<Briefcase />} tone="gold" delay={0.15} pulse={desk.high.length > 0} hint={`${desk.free.length} متاحون للإسناد`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Todo alerts={desk.alerts} empty="كل سجل مكتمل، وكل حساب مربوط بسجل صاحبه، وكل مشارك في الموسم له موقعه." />
        <Raised system="staff" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — جهة لم ترسل منتدبيها، أو موقع لا بديل لمن أُوقف فيه، أو حساب يحتاج صلاحية — ارفعه إلى مديرة الموسم، فيظهر عندها طلبَ تدخّل." />
      </div>

      {/* In the order the work is done: the register, the accounts tied to it, the season's participants */}
      <Panel icon={<IdCard />} title="تركيب السجل" action={<Link href="/staff/employees/manage" className="text-sm font-bold text-gold hover:underline">السجل</Link>}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-bold text-white/85">حسب البعثة</p>
            <BarList items={desk.missions.map((m) => ({ key: m.mission, label: m.external ? `${m.mission} — منهم ${m.external} منتدبون` : m.mission, value: m.total }))} />
          </div>
          <div>
            <p className="mb-3 text-sm font-bold text-white/85">أكثر المسميات الوظيفية</p>
            <BarList color="bg-gold-dark" items={desk.titles.slice(0, 5).map((t) => ({ key: t.title, label: t.title, value: t.n }))} />
          </div>
        </div>
        <p className="mt-4 flex flex-wrap gap-1.5">
          <Chip tone={desk.suspended.length ? "maroon" : "muted"}>{desk.suspended.length} موقوفون</Chip>
          <Chip tone={desk.incomplete.length ? "maroon" : "muted"}>{desk.incomplete.length} سجلات ناقصة</Chip>
        </p>
      </Panel>

      <Panel icon={<KeyRound />} title="حسابات البوابة" action={<Link href="/staff/employees/manage/accounts" className="text-sm font-bold text-gold hover:underline">الحسابات</Link>}>
        <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            { k: "الحسابات", v: desk.accounts.length },
            { k: "مربوطة بسجل", v: desk.linked.length },
            { k: "بصلاحية إدارة ملف", v: desk.accounts.filter((r) => r.managed.length).length },
            { k: "بموقع ميداني", v: field.length },
          ].map((x) => (
            <div key={x.k} className="rounded-xl bg-black/15 p-2">
              <dt className="text-[11px] text-white/60">{x.k}</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-white">{x.v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-7 text-white/75">
          {desk.unlinked.length ? (
            <>
              بلا سجل موظف:{" "}
              {desk.unlinked.map((r) => (
                <Link key={r.account.id} href={`/staff/employees/manage/accounts?a=${r.account.id}`} className="ml-1.5 inline-block">
                  <Chip tone="maroon">{r.account.name}</Chip>
                </Link>
              ))}
            </>
          ) : (
            "كل حساب مربوط بسجل صاحبه."
          )}
        </p>
      </Panel>

      <Panel icon={<CalendarCheck />} title={`المشاركة في موسم ${CURRENT_SEASON}`} action={<Link href="/staff/employees/manage/season" className="text-sm font-bold text-gold hover:underline">المشاركون في الموسم</Link>} bodyClass="-mx-5 md:-mx-6">
        <div className="overflow-x-auto px-5 md:px-6">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-xs text-gold">
                {["البعثة", "المشاركون", "مُسندون", "متاحون للإسناد", "بلا رحلة ذهاب", "موقوفون"].map((h) => (
                  <th key={h} className="pb-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {desk.missions.map((m) => (
                <tr key={m.mission} className="text-white">
                  <td className="py-2.5 font-bold">{m.mission}</td>
                  <td className="py-2.5 tabular-nums">{m.participants}</td>
                  <td className="py-2.5 tabular-nums text-gold">{m.posted}</td>
                  <td className={cn("py-2.5 tabular-nums", m.free ? "text-green-light" : "text-white/50")}>{m.free}</td>
                  <td className={cn("py-2.5 tabular-nums", m.noOutbound ? "text-gold" : "text-white/50")}>{m.noOutbound}</td>
                  <td className={cn("py-2.5 tabular-nums", m.suspended ? "text-[#ffb4c8]" : "text-white/50")}>{m.suspended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Escalate system="staff" open={escalating} onClose={() => setEscalating(false)} example={`مثال: لم ترسل وزارة الصحة بعد أسماء الأطباء المنتدبين لموسم ${CURRENT_SEASON}، ومخيمات منى تنتظرهم.`} />
    </div>
  );
}
