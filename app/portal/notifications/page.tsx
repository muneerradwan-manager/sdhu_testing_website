"use client";

import { motion } from "motion/react";
import { BellRing, Flag, Megaphone, MessagesSquare, ScrollText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/portal/shell";
import { useArticles } from "@/lib/cms/content";
import { forFamily, useGroupPosts } from "@/lib/group-channel";
import { doneWhen, useGroupRites } from "@/lib/musters";
import { getPerson } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { PilgrimShell } from "../_components/pilgrim-shell";
import { NoticesFeed } from "../season/_components/notices";
import { useSeasonCtx } from "../season/_components/season-shell";

const when = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/**
 * «الإشعارات»: what reaches the pilgrim, in one page of its own — in the season, the day's notices (his group's, his
 * zone's, his own); then what was done on his application by the office, his group and its team, the medical team;
 * and the administration's announcements. What he did himself stays in «سجل نشاطي».
 */
export default function NotificationsPage() {
  const sid = useStore((s) => s.sessionId) ?? "";
  const app = useStore((s) => s.applications[sid]);
  const events = useStore((s) => s.events);
  const person = getPerson(sid);
  const ctx = useSeasonCtx();
  const groupNumber = useStore((s) => s.post[sid]?.groupNumber);
  // The rites the group's team recorded after they were done: the latest reach the family here
  const ids = app?.members.map((m) => m.person.id) ?? [];
  const musters = useGroupRites(groupNumber).filter((m) => ids.some((id) => m.present.includes(id) || m.detail?.[id] || m.absent?.[id])).slice(0, 3);
  // What the group's team posted to its channel, as far as it concerns this family
  const posts = useGroupPosts(groupNumber).filter((p) => !app || forFamily(p, app.members)).slice(0, 5);
  // The administration's announcements: the news its content team publishes, newest first
  const news = useArticles().slice(0, 5);
  const done = useMemo(() => {
    if (!app) return [];
    const target = `طلب ${app.number}`;
    return events.filter((e) => e.target?.startsWith(target) && e.role !== "حاج").sort((a, b) => b.at - a.at).slice(0, 20);
  }, [events, app]);
  const announcements = [
    ...news.map((n) => ({ t: n.title, when: `${n.hijri} — الأخبار`, href: `/news/${n.slug}` })),
    app && { t: `تم استلام طلبك رقم ${app.number} لـ ${app.members.length} أفراد، وتم تسديد رسم التسجيل (الإيصال ${app.receipt}).`, when: "طلبك" },
    { t: `أهلاً ${person?.firstName ?? ""}، تم إنشاء حسابك في منصة الحج الوطنية.`, when: "ترحيب" },
  ].filter((x): x is { t: string; when: string; href?: string } => !!x);

  return (
    <PilgrimShell title="الإشعارات" subtitle="ما يصلك: ما سُجّل من مناسكك، وإشعارات يومك في الموسم، وقناة مجموعتك، وما جرى على طلبك، وإعلانات الإدارة.">
      <div className="space-y-6">
        {musters.length > 0 && (
          <Card className="md:p-7">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
              <Flag className="size-6 text-gold-dark" /> سُجّل في أداء المناسك
            </h2>
            <ul className="mt-4 space-y-2">
              {musters.map((m) => (
                <li key={m.id}>
                  <Link href="/portal/season/rites" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-green-light/8 px-4 py-3 ring-1 ring-green-light/30 transition hover:bg-green-light/15">
                    <span>
                      <span className="block font-bold text-green-dark">{m.title}</span>
                      <span className="text-xs text-hint">أُدّي {doneWhen(m.doneAt ?? m.at)} — سجّله {m.by}</span>
                    </span>
                    <span className="text-sm font-bold text-green-dark">من أدّاه من عائلتك ←</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {ctx && <NoticesFeed ctx={ctx} />}
        {posts.length > 0 && (
          <Card className="md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                <MessagesSquare className="size-6 text-gold-dark" /> من قناة مجموعتك
              </h2>
              <Link href="/portal/application/group" className="text-sm font-bold text-green-dark hover:underline">
                القناة كاملة في «مجموعتي»
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl bg-sand p-3">
                  <p className="text-xs font-bold text-green">
                    {p.by} <span className="font-normal text-hint">— {when(p.at)}</span>
                  </p>
                  <p className="mt-1 leading-7">{p.text}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card className="md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
              <BellRing className="size-6 text-gold-dark" /> ما جرى على طلبك
            </h2>
            <Link href="/portal/activity" className="flex items-center gap-1.5 text-sm font-bold text-green-dark hover:underline">
              <ScrollText className="size-4" /> السجل كاملاً في «سجل نشاطي»
            </Link>
          </div>
          {done.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-sand p-4 text-ink-soft">لا جديد على طلبك بعد. يصلك هنا كل ما يقوم به المكتب ومجموعتك وفريقها على طلبك.</p>
          ) : (
            <ol className="mt-4 divide-y divide-gold-light">
              {done.map((e, i) => (
                <motion.li key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="flex gap-3 py-3">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-green-light" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-7">{e.action}{e.detail ? `: ${e.detail}` : ""}</p>
                    <p className="text-xs text-hint">
                      {e.actor} — {e.role} — {when(e.at)}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="md:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
            <Megaphone className="size-6 text-gold-dark" /> إعلانات الإدارة
          </h2>
          <ul className="mt-4 divide-y divide-gold-light">
            {announcements.map((n, i) => (
              <li key={i} className="flex gap-3 py-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-gold-dark" />
                <div>
                  {n.href ? (
                    <Link href={n.href} className="font-semibold leading-7 text-green-dark hover:underline">
                      {n.t}
                    </Link>
                  ) : (
                    <p className="leading-7">{n.t}</p>
                  )}
                  <p className="text-xs text-hint">{n.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PilgrimShell>
  );
}
