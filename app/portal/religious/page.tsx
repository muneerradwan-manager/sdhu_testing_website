"use client";

import { motion } from "motion/react";
import { BookMarked, CheckCircle2, MapPin, Plus, UserRound } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { AUDIENCE_LABEL, ROLE_LABEL, fits } from "@/lib/lessons";
import { GRADE_LABEL, KIND_HINT, KIND_LABEL, activitiesActions, activitiesOfGroups, isIn, progressOf, standing, unitLabel, useActivities, type Activity } from "@/lib/religious";
import { fullName, type Person } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PilgrimShell } from "../_components/pilgrim-shell";

const fmtDay = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long" }).format(ts);

/**
 * «النشاطات الدينية»: the activities of the family's group meant for its members — memorising the Quran or hadith,
 * the supplications of Hajj, a shared reading — and where each member is in them, as his guide records it at
 * each sitting: the last page, surah and part he recited, the next one, his grade. A member joins from here.
 */
export default function ReligiousPage() {
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const post = useStore((s) => s.post[sid]);
  const all = useActivities();

  if (!app || !post?.groupApprovedAt || post.groupNumber === undefined) {
    return (
      <PilgrimShell title="النشاطات الدينية" subtitle="حلقات التحفيظ والختمة مع موجّه مجموعتكم وموجّهة التكتل.">
        <Card className="text-center">
          <p className="text-5xl">📗</p>
          <p className="mt-3 font-display text-2xl font-bold text-green-dark">تظهر النشاطات بعد إلحاقكم بمجموعة</p>
          <p className="mt-2 text-lg text-ink-soft">حين يلحقكم المكتب بمجموعة، تظهر هنا حلقات تحفيظ القرآن والحديث والأدعية والختمة، وما حفظه كل فرد من عائلتك.</p>
          <ButtonLink href="/portal/application#steps" size="xl" className="mt-6">طلبي وخطواته</ButtonLink>
        </Card>
      </PilgrimShell>
    );
  }

  const members = app.members.map((m) => m.person);
  const self = app.members.find((m) => m.relation === "self")?.person ?? members[0];
  const activities = activitiesOfGroups(all, [post.groupNumber], post.clusterId).filter((a) => !a.closedAt && members.some((m) => fits(a.audience, m.gender)));

  return (
    <PilgrimShell title="النشاطات الدينية" subtitle={`حلقات ${groupName(post.groupNumber)} في تحفيظ القرآن والحديث وأدعية الحج، والختمة الجماعية. ينضم إليها من شاء من عائلتك، ويسجّل الموجّه ما يسمّعه كل واحد.`} image="/images/quba-quran.jpg">
      {activities.length === 0 ? (
        <Card className="text-center text-lg text-ink-soft">لا نشاطات لمجموعتكم الآن. يظهر هنا كل نشاط يبدؤه موجّه مجموعتك أو موجّهة التكتل.</Card>
      ) : (
        <div className="space-y-5">
          {activities.map((a, i) => <ActivityCard key={a.id} a={a} i={i} members={members.filter((m) => fits(a.audience, m.gender))} by={fullName(self)} target={`طلب ${app.number}`} />)}
        </div>
      )}
    </PilgrimShell>
  );
}

function ActivityCard({ a, i, members, by, target }: { a: Activity; i: number; members: Person[]; by: string; target: string }) {
  const toast = useToast();
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-[1.75rem] border-2 border-gold/40 bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-gold-dark"><BookMarked className="size-4" /> {KIND_LABEL[a.kind]} — {AUDIENCE_LABEL[a.audience]}</p>
          <p className="mt-1 font-display text-2xl font-bold text-green-dark">{a.title}</p>
          <p className="text-ink-soft">{a.goal}. {KIND_HINT[a.kind]}.</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
        <p className="flex items-center gap-2"><MapPin className="size-5 text-gold-dark" /> {a.schedule} — {a.place}</p>
        <p className="flex items-center gap-2"><UserRound className="size-5 text-gold-dark" /> {a.byName} — {ROLE_LABEL[a.byRole]}</p>
      </dl>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {members.map((m) => {
          const inIt = isIn(a, m.id);
          const st = standing(a, m.id);
          const pct = st.total ? Math.round((st.count / st.total) * 100) : 0;
          return (
            <li key={m.id} className={cn("rounded-2xl border p-4", inIt ? "border-green-light/50 bg-green-light/5" : "border-gold/30 bg-sand/40")}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-ink">{m.firstName}</p>
                {inIt ? <span className="flex items-center gap-1 text-sm font-bold text-green"><CheckCircle2 className="size-4" /> مشارك</span> : null}
              </div>
              {inIt ? (
                a.kind === "khatma" ? (
                  <p className="mt-2 text-sm">{st.count ? `قرأ: ${Object.keys(progressOf(a, m.id)).map((u) => unitLabel(a.kind, u)).join("، ")}` : "لم يُسجَّل له جزء بعد."}</p>
                ) : (
                  <>
                    <div className="mt-2 flex items-center justify-between text-sm"><span>حفظ {st.count} من {st.total}</span><span className="font-bold text-green">{pct}%</span></div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gold-light"><div className="h-full rounded-full bg-green-light" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-2 text-sm text-ink-soft">{st.last ? <>آخر ما سمّعه: <b>{unitLabel(a.kind, st.last.unit)}</b> — {GRADE_LABEL[st.last.grade]} ({fmtDay(st.last.at)})</> : "لم يسمّع بعد."}</p>
                    {st.next ? <p className="text-sm text-ink-soft">التالي: {unitLabel(a.kind, st.next)}</p> : <p className="text-sm font-bold text-green">أتمّ الحفظ، بارك الله فيه.</p>}
                  </>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    activitiesActions.setIn(a.id, [m.id], true, { name: by, role: "حاج", target });
                    toast({ title: `انضم ${m.firstName} إلى ${a.title}`, body: `يراه ${a.byName} في حلقته، ويسجّل ما يسمّعه.`, icon: "📗", tone: "success" });
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-green-dark py-3 text-lg font-bold text-white hover:bg-green"
                >
                  <Plus className="size-5" /> انضمام {m.firstName}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
