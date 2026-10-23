"use client";

import { Briefcase, CalendarCheck, Gauge, IdCard, KeyRound, Megaphone, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CURRENT_SEASON } from "@/lib/ops";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { BarList, fmtDate, Kpi, PageHeader, Panel, useStaffUser } from "../_components/kit";
import { Escalate, Raised, Todo } from "../_components/system";
import { Box, HowItWorks } from "../_components/wp";
import { useEmployeesDesk } from "./desk";

/**
 * The dashboard of whoever holds «إدارة الموظفين»: numbers only — the register, the accounts tied to it and
 * the season's participants, in the order the work is done — how the work goes in four steps, and what
 * waits for him, each one click from where it is done. Nothing is edited here: the work and each part's
 * records are in the operations of the menu.
 */
/** `embedded`: inside «لوحة الإدارة العليا», which has its own heading: the figures only, without this page's heading and «كيف تعمل» */
export function EmployeesSummary({ embedded = false }: { embedded?: boolean } = {}) {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().staff.find((h) => h.staffId === user.id);
  const desk = useEmployeesDesk();
  const [escalating, setEscalating] = useState(false);
  const field = desk.accounts.filter((r) => r.halls.length + r.airports.length > 0);

  return (
    <div className="space-y-6">
      {!embedded && (
        <>
        <PageHeader
          eyebrow={`${SYSTEMS.staff.label}${grant?.by ? ` — منحك عرض لوحته ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
          title={SYSTEMS.staff.summary.label}
          icon={<Gauge />}
          description="أرقام موظفي البعثة الآن. للعمل استعمل القائمة الجانبية."
          actions={
            <Button size="sm" variant="glass" onClick={() => setEscalating(true)}>
              <Megaphone className="size-4" /> رفع أمر إلى المدير
            </Button>
          }
        />

        <HowItWorks
          steps={[
            { title: "السجل", text: "أضف الموظفين الدائمين والمنتدبين، وأكمل ما ينقص سجلاتهم.", href: "/staff/employees/manage", link: "سجل الموظفين" },
            { title: "الحسابات", text: "اربط كل حساب في البوابة بسجل صاحبه، فإليه تصل كلمة المرور.", href: "/staff/employees/manage/accounts", link: "حسابات البوابة" },
            { title: "الموسم", text: `سجّل في موسم ${CURRENT_SEASON} من سيسافر مع البعثة.`, href: "/staff/employees/manage/season", link: "المشاركون في الموسم" },
            { title: "الإسناد", text: "يسند صاحب «الملفات التشغيلية» المشاركين إلى مواقعهم. تابع من بقي بلا موقع.", href: "/staff/employees/manage/season?f=free", link: "المتاحون للإسناد" },
          ]}
        />
        </>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="سجل الموظفين" value={desk.employees.length} icon={<UsersRound />} hint={`${desk.permanent} دائمون · ${desk.external} منتدبون`} />
        <Kpi label="حسابات مربوطة بسجلاتها" value={desk.linked.length} icon={<KeyRound />} tone="teal" delay={0.05} hint={`من ${desk.accounts.length} حساباً${desk.unlinked.length ? ` — ${desk.unlinked.length} بلا سجل` : ""}`} />
        <Kpi label={`مشاركون في موسم ${CURRENT_SEASON}`} value={desk.participants.length} icon={<CalendarCheck />} tone="maroon" delay={0.1} hint={desk.suspendedIn.length ? `${desk.suspendedIn.length} موقوفون منهم` : "يسافرون مع البعثة هذا الموسم"} />
        <Kpi label="مُسندون في الملفات" value={desk.posted.length} icon={<Briefcase />} tone="gold" delay={0.15} pulse={desk.high.length > 0} hint={`${desk.free.length} متاحون للإسناد`} />
      </div>

      <Todo alerts={desk.alerts} empty="كل سجل مكتمل، وكل حساب مربوط بسجل صاحبه، وكل مشارك في الموسم له موقعه." />

      {/* In the order the work is done: the register, the accounts tied to it, the season's participants */}
      <Panel icon={<IdCard />} title="تركيب السجل">
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
        <Figures
          items={[
            { k: "على رأس العمل", v: desk.employees.length - desk.suspended.length },
            { k: "موقوفون", v: desk.suspended.length, alert: true },
            { k: "سجلات ناقصة", v: desk.incomplete.length, alert: true },
            { k: "بلا حساب بوابة", v: desk.withoutAccount.length },
          ]}
        />
      </Panel>

      <Panel icon={<KeyRound />} title="حسابات البوابة">
        <Figures
          items={[
            { k: "الحسابات", v: desk.accounts.length },
            { k: "مربوطة بسجل", v: desk.linked.length },
            { k: "بلا سجل موظف", v: desk.unlinked.length, alert: true },
            { k: "بصلاحية إدارة ملف", v: desk.accounts.filter((r) => r.managed.length).length },
            { k: "بموقع ميداني", v: field.length },
          ]}
        />
      </Panel>

      <Panel icon={<CalendarCheck />} title={`المشاركة في موسم ${CURRENT_SEASON} حسب البعثة`} bodyClass="-mx-5 md:-mx-6">
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

      <Box title="ما رفعته إلى المدير" open={false}>
        <Raised system="staff" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — جهة لم ترسل منتدبيها، أو موقع لا بديل لمن أُوقف فيه، أو حساب يحتاج صلاحية — ارفعه إلى مدير الموسم، فيظهر عنده طلبَ تدخّل." />
        <p className="text-xs leading-5 text-white/55">يصل إلى مدير الموسم وحده: إيقاف موظف مُسند إلى موقع أو إعادته إلى العمل، وإلغاء مشاركة أحد في الموسم، وما ترفعه إليها.</p>
      </Box>

      <Escalate system="staff" open={escalating} onClose={() => setEscalating(false)} example={`مثال: لم ترسل وزارة الصحة بعد أسماء الأطباء المنتدبين لموسم ${CURRENT_SEASON}، ومخيمات منى تنتظرهم.`} />
    </div>
  );
}

/** A row of small figures under a chart */
function Figures({ items }: { items: { k: string; v: number; alert?: boolean }[] }) {
  return (
    <dl className={cn("mt-4 grid grid-cols-2 gap-2 text-center", items.length > 4 ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
      {items.map((x) => (
        <div key={x.k} className="rounded-xl bg-black/15 p-2">
          <dt className="text-[11px] text-white/60">{x.k}</dt>
          <dd className={cn("font-display text-xl font-bold tabular-nums", x.alert && x.v ? "text-[#ffb4c8]" : "text-white")}>{x.v}</dd>
        </div>
      ))}
    </dl>
  );
}
