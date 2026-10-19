"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Award, GraduationCap, PlayCircle } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { useTracks } from "@/lib/cms/content";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PilgrimShell } from "../_components/pilgrim-shell";

/**
 * «الأكاديمية» in the pilgrim's account: the recorded lessons he studies on his own and how far he got in each track
 * — kept apart from «دروس المجموعة الدينية», the lessons his group's guide gives in person before travel, in Makkah,
 * at the holy sites and after the return. Each track opens on its next lesson; a finished one gives its certificate.
 */
export default function PortalAcademy() {
  const tracks = useTracks();
  const academy = useStore((s) => s.academy);
  const rows = tracks.map((t) => {
    const lessons = t.levels.flatMap((l) => l.lessons);
    const done = lessons.filter((l) => academy[`${t.slug}/${l.slug}`]).length;
    const next = lessons.find((l) => !academy[`${t.slug}/${l.slug}`]);
    return { t, total: lessons.length, done, next };
  });
  const total = rows.reduce((n, r) => n + r.total, 0);
  const done = rows.reduce((n, r) => n + r.done, 0);
  return (
    <PilgrimShell title="الأكاديمية" subtitle="دروس مسجّلة تتعلّمها بنفسك متى شئت، وتقدّمك في كل مسار. أما دروس موجّه مجموعتك فهي في «دروس المجموعة الدينية».">
      <div className="space-y-6">
        <Card className="flex flex-wrap items-center justify-between gap-4 md:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold"><GraduationCap className="size-6" /></span>
            <div>
              <p className="font-display text-2xl font-bold text-green-dark">تقدّمك في الأكاديمية</p>
              <p className="text-sm text-ink-soft">أتممت {done} من {total} درساً في {rows.length} مسارات.</p>
            </div>
          </div>
          <Link href="/academy" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-green-dark px-5 font-bold text-white hover:bg-green">
            فتح الأكاديمية <ArrowLeft className="size-4" />
          </Link>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ t, total: n, done: d, next }, i) => {
            const pct = n ? Math.round((d / n) * 100) : 0;
            const finished = n > 0 && d === n;
            return (
              <motion.div key={t.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-col rounded-3xl border border-gold/30 bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl font-bold text-green-dark">{t.title}</p>
                    <p className="text-sm text-ink-soft">{t.short}</p>
                  </div>
                  {finished && <Award className="size-6 shrink-0 text-gold-dark" />}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                    <div className={cn("h-full", finished ? "bg-gold-dark" : "bg-green")} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums text-ink-soft">{d}/{n}</span>
                </div>
                <Link href={next ? `/academy/${t.slug}/${next.slug}` : `/academy/${t.slug}`} className="mt-4 inline-flex items-center gap-2 self-start text-sm font-bold text-green-dark hover:underline">
                  <PlayCircle className="size-4" /> {finished ? "المسار كاملاً وشهادته" : d ? `تابع: ${next?.title}` : `ابدأ: ${next?.title}`}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PilgrimShell>
  );
}
