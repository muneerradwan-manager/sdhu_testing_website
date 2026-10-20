"use client";

import { motion } from "motion/react";
import { CalendarCheck, CalendarClock, CircleX, MapPin, Mic, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { dayTimeLabel, rangeLabel, useOperation } from "@/lib/operations";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SimButton } from "@/app/administrator/_components/ui";
import { positionLabelOf, useAdmin } from "@/app/administrator/_lib/admin";
import { EXAM_CENTERS, useMyHall } from "@/app/administrator/_lib/halls";
import { ORAL_TOPICS, oralActions, oralRoleOf, oralSlots, slotAt, slotLabel, slotLoad, slotOf, type OralSlot } from "@/app/administrator/_lib/oral";

/**
 * The oral exam, after the written one is passed: the days the administration opened for his role, each with its
 * times in his centre and the seats left; the time he booked, its committee and what it asks; then its result.
 * Qualified only once he passed it. The demo simulates the committee's result.
 */
export function OralStage() {
  const admin = useAdmin()!;
  const toast = useToast();
  const p = admin.profile!;
  const admins = useStore((s) => s.admins);
  const op = useOperation("admin-orals");
  const hall = useMyHall(admin.id, p);
  const role = oralRoleOf(p);
  const center = hall.center ?? EXAM_CENTERS[0];
  const oral = p.oral;
  const booked = slotOf(oral?.slotId);
  const [changing, setChanging] = useState(false);
  const slots = oralSlots().filter((s) => s.role === role && s.centerId === center.id);
  const days = [...new Set(slots.map((s) => s.day))];
  const head = p.positions[0] === "group-head";
  const formation = useOperation("group-formation");
  const clusters = useOperation("cluster-formation");

  const book = (s: OralSlot) => {
    oralActions.book(admin.id, s.id);
    setChanging(false);
    toast({ title: "حُجز موعد امتحانك الشفهي", body: `${slotLabel(s)} — ${center.name}`, tone: "success", icon: "🎙️" });
  };
  const simulate = (passed: boolean) => {
    oralActions.record(admin.id, passed ? "passed" : "failed", `${booked?.committee[0] ?? "لجنة الامتحان الشفهي"} (محاكاة)`, passed ? 86 : 54, passed ? "تلاوة وحفظ جيدان، وإجابات واضحة عن أسئلة الحجاج." : "يحتاج مراجعة أحكام المناسك والإجابة عن أسئلة الحجاج بوضوح.");
    toast(passed ? { title: "نجحت في الامتحان الشفهي", body: "تأهّلت لهذا الموسم.", tone: "success", icon: "🏆" } : { title: "لم تجتز الامتحان الشفهي", body: "يبقى سجلك مرجعاً في أي تأهيل لاحق.", tone: "info" });
  };

  // ── its result
  if (oral && oral.status !== "booked") {
    const passed = oral.status === "passed";
    const next = head ? { href: "/portal/group", label: "التالي: تشكيل مجموعتك في المكتب", when: rangeLabel(formation.start, formation.end) } : { href: "/portal/cluster", label: "التالي: مكانك في تكتل", when: rangeLabel(clusters.start, clusters.end) };
    return (
      <Card className={cn("md:p-8", passed ? "ring-2 ring-green-light/40" : "ring-2 ring-maroon/20")}>
        <div className="flex flex-wrap items-start gap-4">
          <span className={cn("grid size-14 place-items-center rounded-2xl text-white", passed ? "bg-green-dark" : "bg-maroon")}>{passed ? <Trophy className="size-7" /> : <CircleX className="size-7" />}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gold-dark">نتيجة الامتحان الشفهي</p>
            <p className="font-display text-2xl font-bold text-green-dark">{passed ? "نجحت في الامتحان الشفهي" : oral.status === "absent" ? "غبت عن موعد الامتحان الشفهي" : "لم تجتز الامتحان الشفهي هذا الموسم"}</p>
            <p className="mt-1 text-ink-soft">{oral.score !== undefined ? `${oral.score}% — ` : ""}{booked ? `${slotLabel(booked)} — ` : ""}اللجنة: {oral.by}</p>
            {oral.note && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm leading-7">ملاحظة اللجنة: {oral.note}</p>}
            {passed && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ButtonLink href={next.href} size="lg"><CalendarCheck className="size-5" /> {next.label}</ButtonLink>
                <span className="text-sm text-hint">{next.when}</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-center">
          <SimButton onClick={() => oralActions.cancel(admin.id)}>إعادة التجربة: الامتحان الشفهي من بدايته</SimButton>
        </div>
      </Card>
    );
  }

  // ── the time he booked
  if (booked && !changing) {
    return (
      <Card className="md:p-8">
        <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Mic className="size-6 text-gold-dark" /> موعد امتحانك الشفهي</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <p className="flex items-center gap-2 rounded-2xl bg-sand p-3"><CalendarClock className="size-5 text-gold-dark" /> <b>{slotLabel(booked)}</b></p>
          <p className="flex items-center gap-2 rounded-2xl bg-sand p-3"><MapPin className="size-5 text-gold-dark" /> {center.name} — {center.hall}</p>
          <p className="flex items-center gap-2 rounded-2xl bg-sand p-3 md:col-span-2"><UsersRound className="size-5 text-gold-dark" /> اللجنة: {booked.committee.join("، ")}</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-ink-soft">تسألك اللجنة في: {ORAL_TOPICS[role ?? ""] ?? "مهام صفتك"}. احضر قبل موعدك بربع ساعة ومعك هويتك الشخصية.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setChanging(true)}>تغيير الموعد</Button>
          <Button variant="ghost" className="text-maroon" onClick={() => { oralActions.cancel(admin.id); toast({ title: "أُلغي حجزك", body: "اختر موعداً آخر.", tone: "info" }); }}>إلغاء الحجز</Button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <SimButton onClick={() => simulate(true)}>محاكاة: أدّيت الامتحان الشفهي فنجحت</SimButton>
          <SimButton onClick={() => simulate(false)}>محاكاة: أدّيت الامتحان الشفهي فلم أجتزه</SimButton>
        </div>
      </Card>
    );
  }

  // ── the times to choose from, once the oral days are open
  return (
    <Card className="md:p-8">
      <p className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark"><Mic className="size-6 text-gold-dark" /> اختر موعد امتحانك الشفهي</p>
      <p className="mt-1 leading-8 text-ink-soft">
        امتحان شفهي أمام لجنة صفة «{positionLabelOf(p.positions[0] ?? "")}» في {center.name}: {ORAL_TOPICS[role ?? ""] ?? "مهام صفتك"}. مواعيده {rangeLabel(op.start, op.end)}.
      </p>
      {!op.open ? (
        <div className="mt-4 rounded-2xl bg-sand p-4">
          <p className="font-bold text-ink">{op.status === "upcoming" ? `تُفتح مواعيد الامتحانات الشفهية ${dayTimeLabel(op.start)}` : "أُغلقت مواعيد الامتحانات الشفهية"}</p>
          {op.status === "upcoming" && op.start && (
            <Button size="sm" variant="outline" className="mt-3 bg-white" onClick={() => actions.setToday(op.start!)}>
              <CalendarClock className="size-4" /> جرّبها الآن: انقل تاريخ التجربة إلى {dayTimeLabel(op.start)}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {days.map((day) => (
            <div key={day}>
              <p className="mb-2 font-bold text-green-dark">{new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00+03:00`))}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {slots.filter((s) => s.day === day).map((s, i) => {
                  const { left } = slotLoad(s, admins);
                  const mine = s.id === oral?.slotId;
                  return (
                    <motion.button key={s.id} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} disabled={left === 0 && !mine} onClick={() => book(s)} className={cn("rounded-2xl border-2 p-3 text-right transition", mine ? "border-green bg-green/5" : left === 0 ? "cursor-not-allowed border-gold/20 opacity-50" : "border-gold/40 hover:border-green hover:bg-sand/60")}>
                      <span className="block font-display text-xl font-bold text-green-dark">{s.time}</span>
                      <span className="block text-xs text-ink-soft">{mine ? "موعدك" : left === 0 ? "مكتمل" : `${left} مقاعد باقية من ${s.seats}`}</span>
                      {slotAt(s) < Date.now() && <Badge tone="ink" className="mt-1 text-[10px]">مضى وقته على ساعتك</Badge>}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
          {changing && <Button variant="outline" onClick={() => setChanging(false)}>رجوع إلى موعدي</Button>}
        </div>
      )}
    </Card>
  );
}
