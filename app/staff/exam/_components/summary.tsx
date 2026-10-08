"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, FileQuestion, Gauge, Landmark, ListChecks, Megaphone, RadioTower, UserX, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EXAM_KINDS, EXAM_STATUS } from "@/lib/data/admin-exam";
import { dayTimeLabel } from "@/lib/operations";
import { SYSTEMS, useHolders } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { useExamBank } from "@/app/administrator/_lib/admin-rules";
import { STAGE_LABEL, useHalls, type HallStage } from "@/app/administrator/_lib/halls";
import { fmtDate, Kpi, Meter, PageHeader, Panel, useStaffUser } from "../../_components/kit";
import { Escalate, Raised, Todo } from "../../_components/system";
import { useExamDesk, useExamProgress } from "./desk";
import { seatOf, useSittingRows } from "./sittings";
import { Chip, Figure, pct, share } from "./ui";

/**
 * The overview of whoever holds «إدارة الامتحانات», as the administration's platform opens: the applicants and the
 * tests, the sittings running now, the attempts by status and the sittings by status, the confirmed results — then
 * what waits for him, each item one click from the page it is done in, and where every hall and every test stands.
 * The records of each part are kept on its own page, not here.
 */
export function ExamSummary() {
  const user = useStaffUser()!;
  // His grant of the permission: by whom and since when
  const grant = useHolders().exams.find((h) => h.staffId === user.id);
  const desk = useExamDesk();
  const halls = useHalls();
  const bank = useExamBank();
  const sittings = useSittingRows(desk);
  const [escalating, setEscalating] = useState(false);

  const sitters = desk.rows.filter((r) => (r.profile.eligibleAt && r.profile.feePaidAt && !r.profile.examExempt) || desk.attempts.some((a) => a.row.id === r.id));
  const published = halls.exams.filter((e) => e.status === "published").length;
  const running = sittings.filter((s) => s.stage === "running").length;
  const confirmed = desk.attempts.filter((a) => a.status === "confirmed");
  const passed = confirmed.filter((a) => a.passed).length;
  const without = new Set([...desk.noCenter, ...desk.noSitting].map((a) => a.row.id)).size;

  const total = desk.attempts.length;
  const byStatus: { label: string; n: number; tone?: "gold" | "maroon" | "green"; href?: string }[] = [
    { label: "يختبرون الآن", n: desk.attempts.filter((a) => a.status === "active" || a.status === "ready").length, tone: "gold", href: "/staff/exam/manage/live" },
    { label: "بانتظار التأكيد", n: desk.attempts.filter((a) => a.status === "submitted" && !a.stale).length, tone: "gold", href: "/staff/exam/manage/live" },
    { label: "غير مؤكَّدة (تحتاج قراراً)", n: desk.decisions.length, tone: "maroon", href: "/staff/exam/manage/review" },
    { label: "مؤكَّدة", n: confirmed.length, tone: "green", href: "/staff/exam/manage/results" },
    { label: "ملغاة", n: desk.attempts.filter((a) => a.status === "voided").length },
  ];
  const stages: { stage: HallStage; label: string }[] = [
    { stage: "idle", label: "مجدولة" },
    { stage: "open", label: "مفتوحة" },
    { stage: "running", label: "جارية" },
    { stage: "closed", label: "منتهية" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`صلاحيتك: ${SYSTEMS.exams.label}${grant?.by ? ` — منحتك إياها ${grant.by}` : ""}${grant?.at ? ` في ${fmtDate(grant.at)}` : ""}`}
        title={SYSTEMS.exams.summary.label}
        icon={<Gauge />}
        description="حال الاختبار الآن، وما ينتظرك فيه. العمل نفسه وسجلّ كل جزء في صفحته من «إدارة الامتحانات». ولا يصل إلى مديرة الموسم إلا ما يعطّل اختباراً، ونشر الاختبارات وأرشفتها ومواعيدها، والقرارات الإدارية على المحاولات، وما ترفعه إليها."
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="المتقدمون" value={sitters.length} icon={<UsersRound />} hint={`ينتظر اختبارَه ${desk.expected.length}`} />
        <Kpi label="الاختبارات" value={halls.exams.length} icon={<CalendarClock />} delay={0.04} hint={`أسئلة البنك الفعّالة ${bank.length}`} />
        <Kpi label="اختبارات منشورة" value={published} icon={<FileQuestion />} tone="teal" delay={0.08} hint={`${EXAM_STATUS.draft} ${halls.exams.filter((e) => e.status === "draft").length} · ${EXAM_STATUS.archived} ${halls.exams.filter((e) => e.status === "archived").length}`} />
        <Kpi label="جلسات جارية الآن" value={running} icon={<RadioTower />} tone="teal" delay={0.12} pulse={running > 0} hint={desk.live.length > running ? `وقاعات مفتوحة لم تبدأ ${desk.live.length - running}` : "تابعها من «الجلسات الفعالة»"} />
        <Kpi label="نتائج مؤكَّدة" value={confirmed.length} icon={<CheckCircle2 />} tone="gold" delay={0.16} hint={`ناجحون ${passed}`} />
        <Kpi label="متقدمون بلا اختبار" value={without} icon={<UserX />} tone="maroon" delay={0.2} hint={without ? "بلا قاعة، أو غابوا ولا استدراكي لهم" : "لكل متقدم جلسته"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel icon={<ListChecks />} title="المحاولات حسب الحالة">
          <ul className="space-y-2.5">
            {byStatus.map((s) => (
              <li key={s.label}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  {s.href ? (
                    <Link href={s.href} className="font-bold text-white hover:text-gold">
                      {s.label}
                    </Link>
                  ) : (
                    <span className="font-bold text-white">{s.label}</span>
                  )}
                  <span className="tabular-nums text-white/80">
                    {s.n} <span className="text-xs text-white/50">({pct(share(s.n, total))})</span>
                  </span>
                </div>
                <Meter value={share(s.n, total)} tone={s.tone === "maroon" ? "maroon" : s.tone === "gold" ? "gold" : "teal"} className="mt-1" />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/55">من {total} محاولة في الموسم.</p>
        </Panel>

        <Panel icon={<Landmark />} title="الجلسات حسب الحالة" action={<Link href="/staff/exam/manage/sittings" className="text-sm font-bold text-gold hover:underline">الجلسات</Link>}>
          <div className="grid grid-cols-2 gap-2">
            {stages.map((s) => {
              const n = sittings.filter((x) => x.stage === s.stage).length;
              return <Figure key={s.stage} label={s.label} value={n} tone={n && s.stage === "running" ? "green" : n && s.stage === "open" ? "gold" : undefined} />;
            })}
          </div>
          <p className="mt-3 text-xs text-white/55">الجلسة = اختبار منشور أو مؤرشف في قاعة بموعده: {sittings.length} جلسة.</p>
        </Panel>

        <Panel icon={<CheckCircle2 />} title="النتائج المؤكَّدة" action={<Link href="/staff/exam/manage/results" className="text-sm font-bold text-gold hover:underline">النتائج</Link>}>
          <div className="grid grid-cols-2 gap-2">
            <Figure label="متوسط النسبة" value={pct(confirmed.length ? confirmed.reduce((a, x) => a + (x.attempt.score ?? 0), 0) / confirmed.length : undefined)} />
            <Figure label="نسبة النجاح" value={pct(confirmed.length ? share(passed, confirmed.length) : undefined)} tone="gold" />
          </div>
          <p className="mt-3 text-sm text-white">
            ناجحون <b className="tabular-nums">{passed}</b> · راسبون <b className="tabular-nums">{confirmed.length - passed}</b>
          </p>
          <p className="mt-1 text-xs text-white/55">الناجح من نجح في كل أقسام اختباره. المحاولات المؤكَّدة وحدها.</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Todo alerts={desk.alerts} empty="القاعات لها مشرفوها، ولكل متقدم قاعته واختباره، ولا محاولة تنتظر قراراً." />
        <Raised system="exams" onRaise={() => setEscalating(true)} hint="ما لا تحسمه وحدك — قاعة لم تُتح، موعد يتعارض، قرار خارج النظام — ارفعه إلى مديرة الموسم، فيظهر عندها طلبَ تدخّل." />
      </div>

      {/* In the order the work is done: the halls, then the tests sat in them */}
      <HallsTable />
      <ExamsTable />
      <Escalate system="exams" open={escalating} onClose={() => setEscalating(false)} example="مثال: مديرية أوقاف حمص لا تتيح القاعة يوم الاختبار، ونحتاج قاعة بديلة لـ 40 متقدماً." />
    </div>
  );
}

function ExamsTable() {
  const halls = useHalls();
  const progress = useExamProgress();
  return (
    <Panel icon={<CalendarClock />} title="الاختبارات" action={<Link href="/staff/exam/manage/exams" className="text-sm font-bold text-gold hover:underline">إدارتها</Link>} bodyClass="-mx-5 md:-mx-6">
      <div className="overflow-x-auto px-5 md:px-6">
        <table className="w-full min-w-[50rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-right text-xs text-gold">
              {["الاختبار", "الموعد", "الحالة", "ينتظرونه", "حضروا", "غابوا", "سلّموا", "مؤكَّدة", "نجحوا"].map((h) => (
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
                <tr key={e.id} className={e.status === "archived" ? "text-white/55" : "text-white"}>
                  <td className="py-2.5 font-bold">
                    {e.name} {e.kind === "makeup" && <Chip tone="gold">{EXAM_KINDS.makeup}</Chip>}
                  </td>
                  <td className="py-2.5 text-white/75">{dayTimeLabel(e.day, e.time) || "لم يُحدَّد"}</td>
                  <td className="py-2.5">
                    <Chip tone={p.tone}>{p.label}</Chip>
                  </td>
                  <td className="py-2.5 tabular-nums">{p.expected}</td>
                  <td className="py-2.5 tabular-nums">{p.present}</td>
                  <td className="py-2.5 tabular-nums">{p.absent}</td>
                  <td className="py-2.5 tabular-nums">{p.sat}</td>
                  <td className="py-2.5 tabular-nums">{p.confirmed}</td>
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

function HallsTable() {
  const halls = useHalls();
  const desk = useExamDesk();
  const sittings = useSittingRows(desk);
  return (
    <Panel icon={<Landmark />} title="القاعات" action={<Link href="/staff/exam/manage" className="text-sm font-bold text-gold hover:underline">إدارتها</Link>} bodyClass="-mx-5 md:-mx-6">
      <div className="overflow-x-auto px-5 md:px-6">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-right text-xs text-gold">
              {["القاعة", "الشاشة", "مشرف القاعة", "المقاعد", "ينتظرون", "الآن", "حضروا", "غابوا"].map((h) => (
                <th key={h} className="pb-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {halls.centers.map((c) => {
              const mine = sittings.filter((s) => s.center.id === c.id);
              const now = mine.find((s) => s.stage === "running" || s.stage === "open");
              const sup = halls.supervisorOf(c.id);
              const waiting = desk.expected.filter((a) => a.center?.id === c.id).length;
              return (
                <tr key={c.id} className={c.off ? "text-white/45" : "text-white"}>
                  <td className="py-2.5 font-bold">
                    {c.name} {c.off && <Chip tone="muted">معطّلة</Chip>}
                  </td>
                  <td className="py-2.5 tabular-nums">{halls.displayOf(c)}</td>
                  <td className="py-2.5">{sup ? sup.name : <span className={cn("font-bold", waiting ? "text-gold" : "text-white/50")}>بلا مشرف</span>}</td>
                  <td className="py-2.5 tabular-nums">{c.capacity ?? "—"}</td>
                  <td className="py-2.5 tabular-nums">{waiting}</td>
                  <td className="py-2.5">{now ? <Chip tone={now.stage === "running" ? "green" : "gold"}>{STAGE_LABEL[now.stage]}</Chip> : <span className="text-white/45">—</span>}</td>
                  <td className="py-2.5 tabular-nums">{mine.reduce((a, s) => a + Object.keys(s.run?.present ?? {}).length, 0)}</td>
                  <td className="py-2.5 tabular-nums">{mine.reduce((a, s) => a + s.listed.filter((r) => seatOf(s, r.id).absent).length, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
