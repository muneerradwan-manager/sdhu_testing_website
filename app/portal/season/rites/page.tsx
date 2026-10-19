"use client";

import { motion } from "motion/react";
import { CheckCircle2, CircleDashed, Clock, FlaskConical, MapPin, UserRound } from "lucide-react";
import { Badge, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { RITES, doneWhen, performed, performedText, useGroupRites, type GroupMuster } from "@/lib/musters";
import { actions, getState, useStore } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { LEADER_ID } from "../../application/_components/post/model";
import { SeasonHeading, SeasonPage } from "../_components/season-shell";
import type { SeasonCtx } from "../_components/ctx";

/**
 * «أداء المناسك»: what the family did of the rites, as the group's team recorded it after each was done — its date,
 * day and hour, where, and for each member what he did (Muzdalifah's night, the Jamarat thrown, Mina's nights) or
 * why he did not. Nothing is asked of the pilgrim before a rite: each record reaches him done.
 */
export default function RitesPage() {
  return <SeasonPage title="أداء المناسك">{({ ctx }) => <Rites ctx={ctx} />}</SeasonPage>;
}

function Rites({ ctx }: { ctx: SeasonCtx }) {
  const number = useStore((s) => s.post[ctx.sessionId]?.groupNumber);
  const records = useGroupRites(number);
  const toast = useToast();
  const members = ctx.app.members;
  const ids = members.map((m) => m.person.id);
  // Only the records that hold this family: made on its group's list
  const ours = records.filter((m) => ids.some((id) => m.present.includes(id) || m.detail?.[id] || m.absent?.[id]));

  // The demo has no team in the field: its coordinator records the Umrah of tamattu' the family made
  const simulate = () => {
    if (number === undefined) return;
    const at = nowMs();
    const head = getState().admins[LEADER_ID];
    const done = at - 3 * 3600_000;
    const first = !records.some((m) => m.kind === "umrah");
    const m = { id: `r-${at.toString(36)}`, title: first ? "عمرة التمتّع" : "العمرة الثانية", kind: "umrah", place: "المسجد الحرام", at, doneAt: done, closedAt: at, groupNumber: number, present: ids.slice(0, Math.max(1, ids.length - 1)), absent: ids.length > 1 ? { [ids[ids.length - 1]]: "وكّل غيره (كبار السن والمرضى)" } : {}, required: first };
    actions.upsertAdmin(LEADER_ID, { musters: [...(head?.musters ?? []), m] });
    toast({ title: `سُجّل أداء «${m.title}»`, body: "سجّله فريق مجموعتك بعد أدائها، فظهر هنا.", tone: "success", icon: "🕋" });
  };

  return (
    <div className="space-y-8">
      <section>
        <SeasonHeading icon={<CheckCircle2 className="size-6" />} title="مناسك حجّك" text="كل منسك يسجّله فريق مجموعتك بعد أدائه، فيظهر هنا: من أدّاه من عائلتك، ومتى." />
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RITES.map((r, i) => {
            const recs = ours.filter((m) => m.kind === r.key);
            const did = ids.filter((id) => recs.some((m) => performed(m, id))).length;
            return (
              <motion.li key={r.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={cn("flex items-center gap-3 rounded-2xl border p-3", did ? "border-green-light/50 bg-green-light/8" : "border-gold/30 bg-white")}>
                {did ? <CheckCircle2 className="size-6 shrink-0 text-green" /> : <CircleDashed className="size-6 shrink-0 text-hint" />}
                <span className="min-w-0">
                  <span className="block font-bold text-ink">{r.label}</span>
                  <span className="block text-xs text-hint">{recs.length ? `أدّاه ${did} من ${ids.length} من عائلتك` : "لم يُسجَّل بعد"}</span>
                </span>
              </motion.li>
            );
          })}
        </ol>
      </section>

      <section>
        <SeasonHeading icon={<Clock className="size-6" />} title={`سجل أداء المناسك — ${number !== undefined ? groupName(number) : "مجموعتك"}`} text="الأحدث أولاً، بتاريخه ويومه وساعته." />
        {ours.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-gold-dark/50 bg-white/70 p-6 text-ink-soft">
            <p>لم يُسجَّل منسك لعائلتك بعد. حين تؤدي مجموعتك منسكاً يسجّله منسقها أو رئيسها أو معاونه، فيظهر هنا بتاريخه.</p>
            <button type="button" onClick={simulate} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-gold-dark px-3 py-1 text-sm font-semibold text-maroon">
              <FlaskConical className="size-4" /> محاكاة: يسجّل فريق مجموعتك عمرة أدّيتموها
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {ours.map((m, i) => <Record key={m.id} m={m} i={i} ctx={ctx} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Record({ m, i, ctx }: { m: GroupMuster; i: number; ctx: SeasonCtx }) {
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }} className="rounded-[1.75rem] border border-gold/30 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl font-bold text-green-dark">{m.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="flex items-center gap-1"><Clock className="size-4 text-gold-dark" /> {doneWhen(m.doneAt ?? m.at)}</span>
            {m.place && <span className="flex items-center gap-1"><MapPin className="size-4 text-gold-dark" /> {m.place}</span>}
            <span className="flex items-center gap-1"><UserRound className="size-4 text-gold-dark" /> سجّله {m.by}</span>
          </p>
        </div>
        <Badge tone="green">أُدّي</Badge>
      </div>
      <ul className="mt-4 space-y-2">
        {ctx.app.members.map((x) => {
          const did = performed(m, x.person.id);
          const why = m.absent?.[x.person.id];
          return (
            <li key={x.person.id} className={cn("flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2", did ? "bg-green-light/8" : "bg-maroon/5")}>
              <span className="font-bold">{x.person.firstName} {x.person.lastName}</span>
              <span className={cn("text-sm font-semibold", did ? "text-green" : "text-maroon")}>
                {performedText(m, x.person.id)}
                {!did && why ? ` — ${why}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.article>
  );
}
