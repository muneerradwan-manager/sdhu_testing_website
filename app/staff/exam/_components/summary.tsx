"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, FileQuestion, Gauge, GraduationCap, Landmark, Megaphone, RadioTower, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EXAM_KINDS } from "@/lib/data/admin-exam";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import { useHalls } from "@/app/administrator/_lib/halls";
import { fmtDate, Kpi, PageHeader, Panel, useStaffUser } from "../../_components/kit";
import { Escalate, Raised, Todo } from "../../_components/system";
import { useExamDesk, useExamProgress } from "./desk";
import { Chip } from "./ui";

/**
 * The dashboard of whoever holds «إدارة الامتحانات», in place of a general «لوحتي»: the numbers, what waits
 * for him now — each item one click from the tab it is done in — and, in the order the work is done, where
 * every centre and every exam stands.
 * The records of each part are kept in its tab of the management page, not here.
 */
export function ExamSummary() {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().exams.find((h) => h.staffId === user.id);
  const desk = useExamDesk();
  const halls = useHalls();
  const bank = useExamBank();
  const [escalating, setEscalating] = useState(false);
  const centers = new Set(desk.expected.map((a) => a.center?.id)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`صلاحيتك: ${SYSTEMS.exams.label}${grant?.by ? ` — منحتك إياها ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
        title={SYSTEMS.exams.summary.label}
        icon={<Gauge />}
        description="حال الامتحان الآن، وما ينتظرك فيه. العمل نفسه وسجلّ كل جزء في «إدارة الامتحانات». ولا يصل إلى مديرة الموسم إلا ما يعطّل امتحاناً، وما يغيّر قاعدة أو موعداً، وإعلان النتائج، وما ترفعه إليها."
        actions={
          <>
            <Button size="sm" variant="glass" onClick={() => setEscalating(true)}>
              <Megaphone className="size-4" /> رفع أمر إلى المدير
            </Button>
            <ButtonLink href={SYSTEMS.exams.manage.href} size="sm" variant="gold">
              {SYSTEMS.exams.manage.label} <ArrowLeft className="size-4" />
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="أسئلة في البنك" value={bank.length} icon={<FileQuestion />} tone="maroon" hint={`لـ ${halls.exams.filter((e) => !e.off).length} امتحانات مفعّلة`} />
        <Kpi label="ينتظرون امتحانهم" value={desk.expected.length} delay={0.05} icon={<UsersRound />} hint={`في ${centers} مراكز من ${halls.live.length}`} />
        <Kpi label="جلسات جارية الآن" value={desk.live.length} icon={<RadioTower />} tone="teal" delay={0.1} pulse={desk.live.length > 0} hint={desk.live.length ? "قاعات مفتوحة أو امتحان جارٍ" : "لا قاعة مفتوحة"} />
        <Kpi label="نتائج معلنة" value={desk.count("published")} icon={<GraduationCap />} tone="gold" delay={0.15} hint={`الناجحون ${desk.passed}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Todo alerts={desk.alerts} empty="المراكز لها مشرفوها، وكل متقدم له مركزه وامتحانه، ولا إجابة أو نتيجة معلّقة." />
        <Raised system="exams" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — قاعة لم تُتح، موعد يتعارض، قرار خارج النظام — ارفعه إلى مديرة الموسم، فيظهر عندها طلبَ تدخّل." />
      </div>

      {/* In the order the work is done: the centres, then the exams sat in them */}
      <CentersTable />
      <ExamsTable />
      <Escalate system="exams" open={escalating} onClose={() => setEscalating(false)} example="مثال: مديرية أوقاف حمص لا تتيح القاعة يوم 16 ربيع الآخر، ونحتاج قاعة بديلة لـ 40 متقدماً." />
    </div>
  );
}

function ExamsTable() {
  const halls = useHalls();
  const progress = useExamProgress();
  return (
    <Panel icon={<CalendarClock />} title="الامتحانات" action={<Link href="/staff/exam/manage/exams" className="text-sm font-bold text-gold hover:underline">إدارتها</Link>} bodyClass="-mx-5 md:-mx-6">
      <div className="overflow-x-auto px-5 md:px-6">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-right text-xs text-gold">
              {["الامتحان", "الموعد", "الحال", "ينتظرونه", "حضروا", "غابوا", "سلّموا", "نجحوا"].map((h) => (
                <th key={h} className="pb-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {halls.exams.map((e) => {
              const p = progress(e);
              return (
                <tr key={e.id} className="text-white">
                  <td className="py-2.5 font-bold">
                    {e.name} {e.kind === "makeup" && <Chip tone="gold">{EXAM_KINDS.makeup}</Chip>}
                  </td>
                  <td className="py-2.5 text-white/75">
                    {e.date || "لم يُحدَّد"} {e.date && <span dir="ltr">{e.time}</span>}
                  </td>
                  <td className="py-2.5">
                    <Chip tone={p.tone}>{p.label}</Chip>
                  </td>
                  <td className="py-2.5 tabular-nums">{p.expected}</td>
                  <td className="py-2.5 tabular-nums">{p.present}</td>
                  <td className="py-2.5 tabular-nums">{p.absent}</td>
                  <td className="py-2.5 tabular-nums">{p.sat}</td>
                  <td className="py-2.5 tabular-nums">{p.passed}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function CentersTable() {
  const halls = useHalls();
  const desk = useExamDesk();
  return (
    <Panel icon={<Landmark />} title="المراكز" action={<Link href="/staff/exam/manage" className="text-sm font-bold text-gold hover:underline">إدارتها</Link>} bodyClass="-mx-5 md:-mx-6">
      <div className="overflow-x-auto px-5 md:px-6">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-right text-xs text-gold">
              {["المركز", "مشرف القاعة", "المقاعد", "ينتظرون", "حضروا", "غابوا"].map((h) => (
                <th key={h} className="pb-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {halls.centers.map((c) => {
              const runs = Object.entries(halls.runs).filter(([k]) => k.endsWith(`@${c.id}`));
              const sup = halls.supervisorOf(c.id);
              const waiting = desk.expected.filter((a) => a.center?.id === c.id).length;
              return (
                <tr key={c.id} className={c.off ? "text-white/45" : "text-white"}>
                  <td className="py-2.5 font-bold">
                    {c.name} {c.off && <Chip tone="muted">معطّل</Chip>}
                  </td>
                  <td className="py-2.5">{sup ? sup.name : <span className={cn("font-bold", waiting ? "text-gold" : "text-white/50")}>بلا مشرف</span>}</td>
                  <td className="py-2.5 tabular-nums">{c.capacity ?? "—"}</td>
                  <td className="py-2.5 tabular-nums">{waiting}</td>
                  <td className="py-2.5 tabular-nums">{runs.reduce((a, [, r]) => a + Object.keys(r.present).length, 0)}</td>
                  <td className="py-2.5 tabular-nums">{desk.rows.filter((r) => desk.standings.get(r.id) === "absent" && halls.centerOf(r.id)?.id === c.id).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
