"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Flag, ListChecks, Paperclip, Star, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { matches } from "@/lib/ops";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { roleLabel, type AdminRow } from "../../_components/data";
import { Drawer, Empty, fmtDateTime, Meter, Panel, stamp, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip, SearchBox } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { logAdmins, useAdminsDesk, type AdminsDesk } from "../desk";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Everyone who works this season is evaluated stage by stage through it, not once at the end: his work
 * in the airports is not his work in the camps. The stages are the rules' («القواعد»); each stage is
 * scored when it has passed, so an evaluation adds to what earlier stages left rather than replacing it.
 * The scores feed the groups' and the clusters' classification.
 */
export function EvaluationTab() {
  const desk = useAdminsDesk();
  const evaluations = useStore((s) => s.evaluations);
  const stages = useEvaluationStages();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = desk.toEvaluate.filter((r) => matches(q, [r.name, r.id, roleLabel(r)]));
  const row = desk.toEvaluate.find((r) => r.id === open);

  return (
    <div className="space-y-6">
      <Panel icon={<ListChecks />} title="التقييم مرحلةً مرحلة" action={<Chip tone="gold">{desk.evaluated.length} من {desk.toEvaluate.length} قُيّموا</Chip>}>
        <StageCoverage coverage={desk.coverage} />
        <p className="mt-3 text-xs leading-6 text-white/55">يُقيَّم من تأهّل للعمل هذا الموسم. المرحلة التي قُيّم فيها أحد تُعدّ قد حلّت، فيظهر في «ما ينتظرك» من بقي فيها دون تقييم.</p>
      </Panel>

      <Panel icon={<UsersRound />} title="الإداريون" bodyClass="space-y-3">
        <SearchBox className="md:w-80" value={q} onChange={setQ} label="بحث في الإداريين" placeholder="اسم، أو آخر أرقام الرقم الوطني، أو صفة..." />
        {shown.length === 0 ? (
          <Empty icon={<UsersRound />} title="لا أحد هنا" text={desk.toEvaluate.length ? "غيّر البحث أو امسحه." : "يظهر هنا من تأهّل للعمل هذا الموسم."} />
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {shown.map((r) => {
              const ev = evaluations[r.id];
              const done = stages.filter((st) => ev?.stages[st.key]).length;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r.id)} className="flex w-full flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 text-right ring-1 ring-white/10 transition hover:ring-gold/50">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 font-display font-bold text-gold ring-1 ring-gold/40">{r.name.replace("الشيخ ", "")[0]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-white">{r.name}</span>
                      <span className="block truncate text-xs text-white/65">{roleLabel(r)}</span>
                    </span>
                    <Chip tone={done === stages.length ? "green" : done ? "gold" : "muted"}>
                      {done} من {stages.length} مراحل
                    </Chip>
                    {ev && <Chip tone="gold">{ev.avg} من 5</Chip>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <SystemRecords system="admins" area="evaluation" title="سجل التقييم" />

      <Drawer open={!!row} onClose={() => setOpen(null)} title={row ? `تقييم ${row.name}` : ""} width="max-w-3xl">
        {row && <EvaluationForm key={row.id} row={row} />}
      </Drawer>
    </div>
  );
}

/** How far each stage's evaluation has gone, among those who work this season */
export function StageCoverage({ coverage }: { coverage: AdminsDesk["coverage"] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {coverage.map((c, i) => (
        <li key={c.stage.key} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-bold text-white">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/10 text-xs text-gold">{i + 1}</span>
              <span className="truncate">{c.stage.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-white/70">
              {c.done} من {c.total}
            </span>
          </p>
          <Meter value={c.done} max={c.total || 1} tone={c.total && c.done === c.total ? "teal" : "gold"} className="mt-2" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Every stage takes a score out of five, a note that becomes mandatory under three, and a piece of
 * evidence when the staff hold one — a photo or a document from that stage. Saving adds the stages
 * scored now to the ones already scored, and the average is taken over them all. The administrator sees
 * the average, never who scored him.
 */
function EvaluationForm({ row }: { row: AdminRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const stages = useEvaluationStages();
  const saved = useStore((s) => s.evaluations[row.id]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);

  const scored = stages.filter((st) => scores[st.key]);
  const missingNotes = stages.filter((st) => scores[st.key] && scores[st.key] < 3 && !(notes[st.key] ?? "").trim());
  // The stages scored now over the ones already saved; the average over every stage of the season scored so far
  const merged = { ...saved?.stages, ...Object.fromEntries(scored.map((st) => [st.key, { score: scores[st.key], note: notes[st.key]?.trim() || undefined, file: files[st.key] }])) };
  const values = stages.flatMap((st) => (merged[st.key] ? [merged[st.key].score] : []));
  const avg = values.length ? round1(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const now = scored.map((st) => scores[st.key]);
  const extreme = scored.length > 1 && (now.every((v) => v === 5) || now.every((v) => v === 1)) && !scored.some((st) => notes[st.key]?.trim());

  const submit = () => {
    setTried(true);
    if (!scored.length || missingNotes.length) return;
    const detail = scored.map((st) => `${st.label}: ${scores[st.key]}${notes[st.key]?.trim() ? ` (${notes[st.key].trim()})` : ""}${files[st.key] ? ` [دليل: ${files[st.key]}]` : ""}`).join(" · ");
    actions.setEvaluation(row.id, { avg, at: stamp(), by: user.name, stages: merged });
    logAdmins(user, "evaluation", {
      action: "تقييم إداري",
      target: row.name,
      before: saved ? `${saved.avg} من 5` : undefined,
      after: `${avg} من 5 — ${values.length} من ${stages.length} مراحل`,
      detail: detail + (extreme ? " — مُعلَّم للمراجعة: درجات متطرفة دون ملاحظة" : ""),
      ref: row.id,
    });
    toast({ title: "حُفظ التقييم", body: `${row.name}: ${avg} من 5 في ${values.length} مراحل${extreme ? " — عُلّم للمراجعة" : ""}. يرى الإداري المتوسط فقط لا اسم المقيّم.`, tone: extreme ? "gold" : "success", icon: "⭐" });
    setScores({});
    setNotes({});
    setFiles({});
    setTried(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/75">{roleLabel(row)}</p>
        <span className="flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/40">
          <Star className="size-4" /> المتوسط
          <motion.span key={avg} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="font-display text-lg">
            {avg || "—"}
          </motion.span>
        </span>
      </div>
      <p className="text-sm leading-7 text-white/85">درجة من 5 لكل مرحلة، والملاحظة إلزامية إذا كانت الدرجة أقل من 3. وإذا كان معك دليل من تلك المرحلة — صورة أو وثيقة — أرفقه معها. قيّم ما مرّ من مراحل واترك الباقي إلى حينه: ما حُفظ من قبل يبقى، وتعديل مرحلة يحلّ محلّ درجتها السابقة.</p>
      <ul className="space-y-3">
        {stages.map((st) => {
          const v = scores[st.key] ?? 0;
          const needNote = v > 0 && v < 3;
          const prev = saved?.stages[st.key];
          return (
            <li key={st.key} className={cn("rounded-2xl p-3 ring-1 transition", tried && needNote && !(notes[st.key] ?? "").trim() ? "bg-maroon/40 ring-gold/50" : "bg-white/[.06] ring-white/10")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    {st.label}
                    {prev && <Chip tone={prev.score < 3 ? "maroon" : "green"}>محفوظة: {prev.score}</Chip>}
                  </span>
                  <span className="block text-xs text-white/60">{prev?.note ?? st.hint}</span>
                </span>
                <div className="flex gap-1" role="radiogroup" aria-label={st.label}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <motion.button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={v === n}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setScores((x) => ({ ...x, [st.key]: n }))}
                      className={cn(
                        "grid size-9 place-items-center rounded-xl text-sm font-bold transition",
                        v === n ? (n < 3 ? "bg-maroon text-white ring-2 ring-gold/60" : n === 3 ? "bg-gold text-ink" : "bg-green-light text-white") : v > n ? "bg-gold/30 text-white" : "bg-white/10 text-white/90 ring-1 ring-white/15 hover:ring-gold/60",
                      )}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
              </div>
              <AnimatePresence>
                {v > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <textarea
                      rows={2}
                      value={notes[st.key] ?? ""}
                      onChange={(e) => setNotes((x) => ({ ...x, [st.key]: e.target.value }))}
                      placeholder={needNote ? "ملاحظة إلزامية: ما الذي حدث في هذه المرحلة؟" : "ملاحظة (اختيارية)"}
                      aria-label={`ملاحظة ${st.label}`}
                      className={cn(textareaClass, "mt-2 text-sm", tried && needNote && !(notes[st.key] ?? "").trim() && "border-gold")}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {files[st.key] ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-light/20 px-3 py-1 text-xs font-bold text-white ring-1 ring-green-light/40">
                            <Paperclip className="size-3.5" /> {files[st.key]}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFiles((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== st.key)))}
                            className="text-xs font-bold text-white/60 hover:text-white"
                            aria-label={`إزالة دليل ${st.label}`}
                          >
                            إزالة
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFiles((x) => ({ ...x, [st.key]: `${st.key}-${row.id.slice(-4)}.jpg` }))}
                          aria-label={`إرفاق دليل ${st.label}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 ring-1 ring-white/15 transition hover:ring-gold/60"
                        >
                          <Paperclip className="size-3.5" /> إرفاق دليل — صورة أو وثيقة
                        </button>
                      )}
                      {needNote && !files[st.key] && <span className="text-xs text-gold">درجة منخفضة: الدليل يقوّي الملاحظة.</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      {extreme && (
        <p className="flex items-center gap-2 rounded-2xl bg-gold/20 p-3 text-sm font-bold text-gold ring-1 ring-gold/40">
          <Flag className="size-4" /> درجات متطرفة في كل ما قيّمته الآن دون ملاحظة — سيُعلَّم التقييم للمراجعة.
        </p>
      )}
      {tried && (!scored.length || missingNotes.length > 0) && <p className="text-sm font-bold text-gold">{!scored.length ? "قيّم مرحلة واحدة على الأقل." : "اكتب ملاحظة لكل درجة أقل من 3."}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="gold" onClick={submit}>
          <CheckCircle2 className="size-4" /> حفظ التقييم
        </Button>
        {saved && (
          <span className="text-xs text-white/60">
            آخر حفظ: {saved.by} — {fmtDateTime(saved.at)}
          </span>
        )}
      </div>
      <RecordHistory system="admins" refId={row.id} />
    </div>
  );
}
