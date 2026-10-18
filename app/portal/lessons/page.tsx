"use client";

import { motion } from "motion/react";
import { BookOpenText, CalendarClock, CheckCircle2, Clock, HandHelping, MapPin, UserRound, XCircle } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { SpeakButton, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { AUDIENCE_LABEL, ROLE_LABEL, STAGE_LABEL, attended, fits, lessonsActions, lessonsOfGroups, stateOf, useLessons, type GroupLesson } from "@/lib/lessons";
import { fullName } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PilgrimShell } from "../_components/pilgrim-shell";

const fmtWhen = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long" }).format(ts);
const fmtHijri = (ts: number) => new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long" }).format(ts);
const fmtTime = (ts: number) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Damascus" }).format(ts);

/**
 * «الدروس الدينية»: the lessons the guides of the family's group give to its members — a guide's to its men or to
 * all of it, the female guide's to its women — each for the members it is meant for. The family says who will
 * come; once the lesson is given, it sees who of them was there, as its guide recorded it.
 */
export default function LessonsPage() {
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const post = useStore((s) => s.post[sid]);
  const all = useLessons();
  const [now] = useState(() => Date.now());

  if (!app || !post?.groupApprovedAt || post.groupNumber === undefined) {
    return (
      <PilgrimShell title="الدروس الدينية" subtitle="دروس موجّه مجموعتكم وموجّهة التكتل.">
        <Card className="text-center">
          <p className="text-5xl">📖</p>
          <p className="mt-3 font-display text-2xl font-bold text-green-dark">تظهر الدروس بعد إلحاقكم بمجموعة</p>
          <p className="mt-2 text-lg text-ink-soft">حين يلحقكم المكتب بمجموعة، تظهر هنا دروس موجّهها وموجّهة تكتلها: موعد كل درس ومكانه، ومن يُدعى إليه من عائلتك.</p>
          <ButtonLink href="/portal/application#steps" size="xl" className="mt-6">طلبي وخطواته</ButtonLink>
        </Card>
      </PilgrimShell>
    );
  }

  const members = app.members.map((m) => m.person);
  const invited = (l: GroupLesson) => members.filter((m) => fits(l.audience, m.gender));
  const lessons = lessonsOfGroups(all, [post.groupNumber], post.clusterId).filter((l) => invited(l).length > 0);
  const coming = lessons.filter((l) => !l.closedAt && !l.cancelledAt && stateOf(l, now) !== "unrecorded");
  const past = lessons.filter((l) => l.closedAt || l.cancelledAt || stateOf(l, now) === "unrecorded").reverse();
  const given = lessons.filter((l) => l.closedAt);
  const came = given.filter((l) => invited(l).some((m) => attended(l, m.id))).length;

  return (
    <PilgrimShell title="الدروس الدينية" subtitle={`دروس ${groupName(post.groupNumber)}: موجّه المجموعة لرجالها أو لها كلها، وموجّهة التكتل للحاجّات. قل لنا من سيحضر من عائلتك.`} image="/images/quba-quran.jpg">
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { k: "دروس قادمة لعائلتك", v: coming.length },
          { k: "دروس أُعطيت", v: given.length },
          { k: "حضرتم منها", v: came },
        ].map((x) => (
          <div key={x.k} className="rounded-[1.75rem] border border-gold/40 bg-white p-5 text-center">
            <p className="font-display text-4xl font-bold text-green-dark">{x.v}</p>
            <p className="mt-1 text-ink-soft">{x.k}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 flex items-center gap-3 font-display text-3xl font-bold text-green-dark">
        <span className="grid size-12 place-items-center rounded-2xl bg-green-dark text-gold"><BookOpenText className="size-6" /></span>
        الدروس القادمة
      </h2>
      {coming.length === 0 ? (
        <p className="mb-8 rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-lg text-ink-soft">لا دروس قادمة الآن. يصلك كل درس جديد هنا حين يضيفه موجّه مجموعتك أو موجّهة التكتل.</p>
      ) : (
        <div className="mb-10 grid gap-4 lg:grid-cols-2">
          {coming.map((l, i) => <Upcoming key={l.id} l={l} invited={invited(l)} i={i} target={`طلب ${app.number}`} by={fullName(app.members.find((m) => m.relation === "self")?.person ?? members[0])} />)}
        </div>
      )}

      {given.length > 0 && (
        <section id="record" className="mb-10">
          <h2 className="mb-1 font-display text-2xl font-bold text-green-dark">سجل حضور العائلة</h2>
          <p className="mb-4 text-ink-soft">كل درس أُعطي ومن حضره من عائلتك، كما سجّله الموجّه في الدرس.</p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((m) => {
              const mine = given.filter((l) => fits(l.audience, m.gender));
              const n = mine.filter((l) => attended(l, m.id)).length;
              return (
                <div key={m.id} className="rounded-[1.5rem] border border-gold/30 bg-white p-4">
                  <p className="font-bold text-ink">{m.firstName}</p>
                  <p className="mt-1 font-display text-3xl font-bold text-green-dark">{n}<span className="text-base font-normal text-hint"> / {mine.length}</span></p>
                  <p className="text-sm text-ink-soft">{mine.length ? `حضر ${Math.round((n / mine.length) * 100)}% من دروسه` : "لا دروس له بعد"}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gold-light"><div className="h-full rounded-full bg-green-light" style={{ width: `${mine.length ? (n / mine.length) * 100 : 0}%` }} /></div>
                </div>
              );
            })}
          </div>
          <div className="overflow-x-auto rounded-[1.5rem] border border-gold/30 bg-white">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-sand text-right text-xs text-hint">
                <tr>
                  <th className="p-3">الدرس</th>
                  {members.map((m) => <th key={m.id} className="p-3 text-center">{m.firstName}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...given].reverse().map((l) => (
                  <tr key={l.id} className="border-t border-gold/15">
                    <td className="p-3"><span className="font-bold text-ink">{l.title}</span><span className="block text-xs text-hint">{fmtWhen(l.at)} — {l.byName} — {AUDIENCE_LABEL[l.audience]}</span></td>
                    {members.map((m) => (
                      <td key={m.id} className="p-3 text-center">
                        {!fits(l.audience, m.gender) ? <span className="text-hint">—</span> : attended(l, m.id) ? <span className="inline-flex items-center gap-1 font-bold text-green"><CheckCircle2 className="size-4" /> حضر</span> : <span className="inline-flex items-center gap-1 font-bold text-maroon"><XCircle className="size-4" /> لم يحضر</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-hint">«—»: الدرس لغيره (درس للنساء أو للرجال).</p>
        </section>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-2xl font-bold text-green-dark">الدروس السابقة</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {past.map((l) => {
              const inv = invited(l);
              const there = inv.filter((m) => attended(l, m.id));
              return (
                <div key={l.id} className="rounded-[1.5rem] border border-gold/30 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gold-dark">{fmtWhen(l.at)} ({fmtHijri(l.at)})</span>
                    <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-green-dark">{AUDIENCE_LABEL[l.audience]}</span>
                  </div>
                  <p className="mt-1 font-display text-lg font-bold text-green-dark">{l.title}</p>
                  <p className="text-sm text-ink-soft">{l.byName} — {ROLE_LABEL[l.byRole]}</p>
                  {l.cancelledAt ? (
                    <p className="mt-3 flex items-center gap-2 rounded-2xl bg-maroon/10 p-3 text-maroon"><XCircle className="size-5" /> أُلغي الدرس: {l.cancelReason}</p>
                  ) : l.closedAt ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {inv.map((m) => (
                        <li key={m.id} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold", there.includes(m) ? "bg-green-light/15 text-green" : "bg-sand text-ink-soft")}>
                          {there.includes(m) ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />} {m.firstName}: {there.includes(m) ? "حضر" : "لم يحضر"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-hint">لم يُسجَّل حضوره بعد.</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </PilgrimShell>
  );
}

function Upcoming({ l, invited, i, target, by }: { l: GroupLesson; invited: { id: string; firstName: string; gender: "M" | "F" }[]; i: number; target: string; by: string }) {
  const toast = useToast();
  const ids = invited.map((m) => m.id);
  const on = ids.every((id) => l.interested.includes(id));
  const toggle = () => {
    lessonsActions.setInterest(l.id, ids, !on, { name: by, target });
    toast(on ? { title: "ألغينا تسجيل حضوركم", body: l.title, icon: "↩️" } : { title: "سجّلنا أنكم ستحضرون", body: `${l.title} — يراه ${l.byName}. يُسجَّل الحضور في الدرس.`, icon: "📖", tone: "success" });
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={cn("flex flex-col overflow-hidden rounded-[1.75rem] border-2 bg-white", on ? "border-green-light/60" : "border-gold/40")}>
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-gold/30 px-3 py-1 text-sm font-bold text-maroon">{AUDIENCE_LABEL[l.audience]}</span>
          <span className="text-sm text-hint">{STAGE_LABEL[l.stage]} — {l.topic}</span>
        </div>
        <p className="mt-2 font-display text-2xl font-bold leading-9 text-green-dark">{l.title}</p>
        <dl className="mt-3 grid gap-2 text-[15px]">
          <p className="flex items-center gap-2"><CalendarClock className="size-5 text-gold-dark" /> <b>{fmtWhen(l.at)}</b> ({fmtHijri(l.at)}) — الساعة {fmtTime(l.at)}</p>
          <p className="flex items-center gap-2"><Clock className="size-5 text-gold-dark" /> {l.minutes} دقيقة</p>
          <p className="flex items-center gap-2"><MapPin className="size-5 text-gold-dark" /> {l.place}</p>
          <p className="flex items-center gap-2"><UserRound className="size-5 text-gold-dark" /> {l.byName} — {ROLE_LABEL[l.byRole]}</p>
        </dl>
        {l.summary && <p className="mt-3 rounded-2xl bg-sand p-3 leading-7">{l.summary}</p>}
        <p className="mt-3 text-sm text-ink-soft">المدعوون من عائلتك: <b>{invited.map((m) => m.firstName).join("، ")}</b></p>
        <SpeakButton text={`${l.title}. ${fmtWhen(l.at)} الساعة ${fmtTime(l.at)}. ${l.place}. ${l.byName}.`} className="mt-3 w-fit" />
      </div>
      <button type="button" onClick={toggle} className={cn("flex w-full items-center justify-center gap-2 py-4 text-lg font-bold transition", on ? "bg-green-light/10 text-green hover:bg-maroon/5 hover:text-maroon" : "bg-green-dark text-white hover:bg-green")}>
        {on ? <><CheckCircle2 className="size-5" /> سنحضر — اضغط للإلغاء</> : <><HandHelping className="size-5" /> سنحضر ({invited.length} من العائلة)</>}
      </button>
    </motion.div>
  );
}
