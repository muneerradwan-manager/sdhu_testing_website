"use client";

import { motion } from "motion/react";
import { Bus, Check, CheckCircle2, Clock, Flag, History, MapPin, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { replyToMuster, useGroupMusters, type GroupMuster } from "@/lib/musters";
import { actions, getState, useStore } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { LEADER_ID } from "../../application/_components/post/model";
import { DAYS, TRIPS, noticesFor } from "../_data";
import { SeasonHeading, SeasonPage } from "../_components/season-shell";
import type { SeasonCtx } from "../_components/ctx";

const clock = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

/** A gathering of the season's programme: its day, its time, and where — from the season's notices, its trips and visits */
type Planned = { day: number; time: string; text: string; trip?: boolean; required?: boolean };

function planned(members: number): Planned[] {
  const out: Planned[] = [];
  for (const d of DAYS) {
    for (const m of d.moments) if (m.title.includes("التجمّع")) out.push({ day: d.i, time: m.time, text: m.title });
    for (const n of noticesFor(d.i, members)) if (/تجمّع|التجمّع/.test(n.text)) out.push({ day: d.i, time: n.time, text: n.text });
  }
  for (const t of TRIPS) out.push({ day: t.days[0], time: t.when.split(" ").pop() ?? "", text: `${t.title} — نقطة التجمّع: ${t.gather}، والعودة ${t.back}`, trip: true, required: t.mandatory });
  return out.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
}

/**
 * «التجمّعات» (the trips and visits among them): the gatherings the group's team opened — its head, its coordinator,
 * any of them — each with who of the family will come, said here beforehand («سأحضر» / «لن أحضر», and why: optional,
 * required for a required gathering), and who was there once it closed; then the season's programme of gatherings,
 * trips and visits, day by day.
 */
export default function GatheringsPage() {
  return <SeasonPage title="التجمّعات">{({ ctx }) => <Gatherings ctx={ctx} />}</SeasonPage>;
}

function Gatherings({ ctx }: { ctx: SeasonCtx }) {
  const post = useStore((s) => s.post[ctx.sessionId]);
  const toast = useToast();
  const [past, setPast] = useState(false);
  const number = post?.groupNumber;
  const musters = useGroupMusters(number);
  const open = musters.filter((m) => !m.closedAt);
  const closed = musters.filter((m) => m.closedAt);
  const all = planned(ctx.app.members.length);
  const coming = all.filter((g) => g.day >= ctx.day.i);
  const gone = all.filter((g) => g.day < ctx.day.i);
  const dayLabel = (i: number) => `${DAYS[i].weekday} ${DAYS[i].hijri}`;

  // The demo has no team in the field: its head opens a gathering for the family to answer
  const simulate = () => {
    if (number === undefined) return;
    const at = nowMs();
    const head = getState().admins[LEADER_ID];
    const m = { id: `m-${at.toString(36)}`, title: "العمرة الثانية", kind: "umrah", place: "بهو الفندق في مكة", at: at + 2 * 3600_000, groupNumber: number, present: [] as string[], absent: {} };
    actions.upsertAdmin(LEADER_ID, { musters: [...(head?.musters ?? []), m] });
    toast({ title: "فتح رئيس مجموعتك تجمّعاً", body: "العمرة الثانية — بهو الفندق في مكة. قل من سيحضر من عائلتك.", tone: "info", icon: "🚩" });
  };

  const list = (items: Planned[]) => (
    <ol className="space-y-2">
      {items.map((g, i) => (
        <motion.li key={`${g.day}-${g.time}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className={cn("flex gap-3 rounded-2xl border p-3", g.day === ctx.day.i ? "border-green-light/50 bg-green-light/8" : "border-gold/30 bg-white")}>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand text-green-dark">{g.trip ? <Bus className="size-5" /> : <Flag className="size-5" />}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-hint">
              <span>{g.day === ctx.day.i ? "اليوم" : dayLabel(g.day)}</span>
              <span className="font-mono">{g.time}</span>
              {g.required ? <Badge tone="maroon" className="text-[10px]">إلزامي</Badge> : g.trip && <Badge tone="ink" className="text-[10px]">اختياري</Badge>}
            </span>
            <span className="mt-0.5 block font-semibold leading-7">{g.text}</span>
          </span>
        </motion.li>
      ))}
    </ol>
  );

  return (
    <div className="space-y-8">
      <section>
        <SeasonHeading icon={<Flag className="size-6" />} title={`تجمّعات ${number !== undefined ? groupName(number) : "مجموعتك"}`} text="ما يفتحه فريق مجموعتك من تجمّعات: قل من سيحضر من عائلتك، ومن لن يحضر فلماذا." />
        {open.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-ink-soft">
            <p>لا تجمّع مفتوحاً لمجموعتك الآن. يظهر هنا كل تجمّع يفتحه رئيس مجموعتك أو منسقها، بموعده ومكانه، ويصلك إشعار به.</p>
            <button type="button" onClick={simulate} className="mt-3 rounded-full border border-dashed border-gold-dark px-3 py-1 text-sm font-semibold text-maroon">
              محاكاة: يفتح رئيس مجموعتك تجمّعاً الآن
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {open.map((m) => (
              <OpenMuster key={m.id} m={m} ctx={ctx} />
            ))}
          </div>
        )}
        {closed.length > 0 && (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {closed.map((m) => {
              const ids = ctx.app.members.map((x) => x.person.id);
              const here = ids.filter((id) => m.present.includes(id)).length;
              return (
                <li key={m.id} className="rounded-3xl border border-gold/30 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-green-dark">{m.title}</p>
                    <Badge tone="ink">أُغلق</Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{clock(m.at)}{m.place ? ` — ${m.place}` : ""}</p>
                  <p className={cn("mt-2 flex items-center gap-1.5 text-sm font-bold", here === ids.length ? "text-green" : "text-gold-dark")}>
                    <CheckCircle2 className="size-4" /> حضر من عائلتك {here} من {ids.length}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SeasonHeading icon={<Clock className="size-6" />} title="برنامج التجمّعات والزيارات" text="مواعيد التجمّع في الموسم يوماً بيوم، ومعها الرحلات والزيارات: الإلزامي منها والاختياري." />
        {coming.length === 0 ? <p className="rounded-2xl bg-sand p-4 text-ink-soft">لا تجمّعات قادمة في برنامج الموسم.</p> : list(coming)}
        {gone.length > 0 && (
          <div className="mt-4">
            <button type="button" onClick={() => setPast((v) => !v)} aria-expanded={past} className="flex items-center gap-2 text-sm font-bold text-green-dark hover:underline">
              <History className="size-4" /> {past ? "إخفاء التجمّعات السابقة" : `التجمّعات السابقة (${gone.length})`}
            </button>
            {past && <div className="mt-3 opacity-70">{list(gone)}</div>}
          </div>
        )}
      </section>
    </div>
  );
}

/** An open gathering: when and where, who opened it, and each member's reply */
function OpenMuster({ m, ctx }: { m: GroupMuster; ctx: SeasonCtx }) {
  const toast = useToast();
  const replies = useStore((s) => s.post[ctx.sessionId]?.musterReplies?.[m.id]) ?? {};
  const [asking, setAsking] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const members = ctx.app.members;
  const going = (id: string) => {
    replyToMuster(ctx.sessionId, m.id, m.title, id, { going: true, at: nowMs() });
    toast({ title: "سُجّل حضورك", body: `${m.title} — يراه ${m.by}.`, tone: "success", icon: "✅" });
  };
  const decline = () => {
    if (!asking || (m.required && !reason.trim())) return;
    replyToMuster(ctx.sessionId, m.id, m.title, asking, { going: false, reason: reason.trim() || undefined, at: nowMs() });
    toast({ title: "وصل اعتذارك", body: `${m.title} — يراه ${m.by}.`, tone: "info", icon: "📩" });
    setAsking(null);
    setReason("");
  };
  const who = members.find((x) => x.person.id === asking);
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[1.75rem] border-2 border-green-light/40 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl font-bold text-green-dark">{m.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><Clock className="size-4 text-gold-dark" /> {clock(m.at)}</span>
            {m.place && <span className="flex items-center gap-1"><MapPin className="size-4 text-gold-dark" /> {m.place}</span>}
            <span className="flex items-center gap-1"><UserRound className="size-4 text-gold-dark" /> فتحه {m.by}</span>
          </p>
        </div>
        {m.required ? <Badge tone="maroon">إلزامي</Badge> : <Badge tone="green">مفتوح</Badge>}
      </div>
      <ul className="mt-4 space-y-2">
        {members.map((x) => {
          const r = replies[x.person.id];
          return (
            <li key={x.person.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-sand px-3 py-2">
              <span className="min-w-0 flex-1 font-bold">
                {x.person.firstName} {x.person.lastName}
                {r && <span className={cn("block text-xs font-semibold", r.going ? "text-green" : "text-maroon")}>{r.going ? "سيحضر" : `لن يحضر${r.reason ? ` — ${r.reason}` : ""}`}</span>}
              </span>
              <Button size="sm" variant={r?.going ? "primary" : "outline"} onClick={() => going(x.person.id)}>
                <Check className="size-4" /> سأحضر
              </Button>
              <Button size="sm" variant={r && !r.going ? "maroon" : "outline"} onClick={() => { setAsking(x.person.id); setReason(r?.reason ?? ""); }}>
                <X className="size-4" /> لن أحضر
              </Button>
            </li>
          );
        })}
      </ul>
      <Modal open={!!asking} onClose={() => setAsking(null)} className="max-w-md">
        <p className="font-display text-2xl font-bold text-green-dark">لن يحضر {who?.person.firstName}؟</p>
        <p className="mt-1 text-sm leading-7 text-ink-soft">
          {m.title} — {clock(m.at)}. {m.required ? "تجمّع إلزامي: اكتب سبب الغياب ليعرفه فريق المجموعة." : "اكتب السبب إن شئت، يساعد فريق المجموعة."}
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={m.required ? "سبب الغياب (إلزامي)" : "سبب الغياب (اختياري)"}
          className={cn("mt-3 w-full rounded-2xl border-2 px-3 py-2 text-sm outline-none focus:border-green-light", m.required && !reason.trim() ? "border-maroon/50" : "border-gold/40")}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="maroon" onClick={decline} disabled={m.required && !reason.trim()}>
            إرسال الاعتذار
          </Button>
          <Button variant="outline" onClick={() => setAsking(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </motion.article>
  );
}
