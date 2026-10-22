"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Flag, Paperclip, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { matches } from "@/lib/ops";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { REFLECTION, avgOf, round1 as r1, useEvaluationOf } from "@/app/administrator/_lib/evaluation";

/** The scored sections of a self-evaluation beside its stages */
const SELF_LABELS: Record<string, string> = { stages: "مراحل الموسم", axes: "محاور الأداء", role: "مهام صفته", support: "ما قدّمته له الإدارة والبعثة" };
import { roleLabel, type AdminRow } from "../../_components/data";
import { fmtDateTime, Meter, stamp, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { Chip, SearchBox } from "../../_components/ops-ui";
import { RecordHistory } from "../../_components/system";
import { Box, EditHeader, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, Locked, NotFound, TitleCell, needs, useHrefWith, useOpenId } from "./ui";
import { logAdmins, useAdminsDesk, type AdminsDesk } from "../desk";

const round1 = (n: number) => Math.round(n * 10) / 10;

type Filter = "all" | "none" | "partial" | "done";

/**
 * «التقييم» — everyone who works this season, as a site's list: how many of the season's stages each was scored
 * in and his average, each opening on his own screen (`?id=`) to score the stages that have passed. The stages
 * are the rules' («قواعد الإداريين»); an evaluation adds to what earlier stages left rather than replacing it.
 * How far each stage has gone is on the file's summary (`StageCoverage` below).
 */
export function EvaluationTab() {
  const desk = useAdminsDesk();
  const id = useOpenId();
  const hrefWith = useHrefWith();
  const evaluations = useStore((s) => s.evaluations);
  const objections = useStore((s) => s.evaluationObjections);
  const stages = useEvaluationStages();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  if (id) return <EvaluationScreen id={id} desk={desk} />;
  const doneOf = (r: AdminRow) => stages.filter((st) => evaluations[r.id]?.stages[st.key]).length;
  const stateOf = (r: AdminRow): Exclude<Filter, "all"> => (doneOf(r) === 0 ? "none" : doneOf(r) >= stages.length ? "done" : "partial");
  const shown = desk.toEvaluate.filter((r) => filter === "all" || stateOf(r) === filter).filter((r) => matches(q, [r.name, r.id, roleLabel(r)]));

  return (
    <div className="space-y-4">
      <Title>تقييم الإداريين</Title>
      <Lead>من تأهّل للعمل هذا الموسم، يُقيَّم مرحلةً مرحلة. افتح الإداري لتقيّم ما مرّ من مراحل.</Lead>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filters
          label="حال التقييم"
          value={filter}
          onChange={setFilter}
          items={[
            { key: "all", label: "الكل", count: desk.toEvaluate.length },
            { key: "none", label: "لم يُقيَّم", count: desk.toEvaluate.filter((r) => stateOf(r) === "none").length },
            { key: "partial", label: "قُيّم في بعض المراحل", count: desk.toEvaluate.filter((r) => stateOf(r) === "partial").length },
            { key: "done", label: "في كل المراحل", count: desk.toEvaluate.filter((r) => stateOf(r) === "done").length },
          ]}
        />
        <SearchBox className="md:w-80" value={q} onChange={setQ} label="بحث في الإداريين" placeholder="اسم، أو آخر أرقام الرقم الوطني، أو صفة..." />
      </div>
      <ListTable head={["الإداري", "الصفة", "المراحل", "المتوسط", "آخر تقييم"]}>
        {shown.length === 0 && <EmptyRow cols={5}>{desk.toEvaluate.length ? "لا أحد هنا. غيّر البحث أو التصفية." : "يظهر هنا من تأهّل للعمل هذا الموسم."}</EmptyRow>}
        {shown.map((r) => {
          const ev = evaluations[r.id];
          const done = doneOf(r);
          const href = hrefWith({ id: r.id });
          return (
            <tr key={r.id}>
              <TitleCell
                title={r.name}
                href={href}
                actions={
                  <RowActions>
                    <RowLink href={href}>تقييم</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top text-white/80">
                {roleLabel(r)}
                {objections[r.id]?.status === "pending" && (
                  <span className="ms-2">
                    <Tag tone="gold">اعتراض ينتظر قرارك</Tag>
                  </span>
                )}
              </td>
              <td className="p-3 align-top">
                <Tag tone={done >= stages.length ? "green" : done ? "gold" : "muted"}>
                  {done} من {stages.length}
                </Tag>
              </td>
              <td className="p-3 align-top font-bold tabular-nums text-gold">{ev ? `${ev.avg} من 5` : <span className="font-normal text-white/40">—</span>}</td>
              <td className="p-3 align-top text-xs text-white/60">{ev ? `${ev.by} — ${fmtDateTime(ev.at)}` : "—"}</td>
            </tr>
          );
        })}
      </ListTable>
      <Help>
        <p>يُقيَّم الإداري في كل مرحلة على حدة لأن عمله في المطارات غير عمله في المشاعر. المرحلة التي قُيّم فيها أحد تُعدّ قد حلّت، فيظهر في «ما ينتظرك» من بقي فيها دون تقييم.</p>
        <p>المراحل نفسها تُضبط في «قواعد الإداريين» ← مراحل التقييم. وتدخل الدرجات في تصنيف المجموعات والتكتلات.</p>
      </Help>
      <RecordsBox system="admins" area="evaluation" title="سجل التقييم" />
    </div>
  );
}

/** One administrator's evaluation on its own screen */
function EvaluationScreen({ id, desk }: { id: string; desk: AdminsDesk }) {
  const hrefWith = useHrefWith();
  const row = desk.toEvaluate.find((r) => r.id === id);
  const back = hrefWith({ id: null });
  if (!row) return <NotFound back={back} backLabel="تقييم الإداريين" what="هذا الإداري" />;
  return (
    <div>
      <EditHeader back={back} backLabel="تقييم الإداريين" title={`تقييم ${row.name}`}>
        {roleLabel(row)}
      </EditHeader>
      <EvaluationForm key={row.id} row={row} />
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
  const mayRate = useCan()("admins.evaluation.PUT");
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
    <EditLayout
      main={
        <>
          <p className="text-sm leading-7 text-white/75">درجة من 5 لكل مرحلة، والملاحظة إلزامية إذا كانت الدرجة أقل من 3. قيّم ما مرّ من مراحل واترك الباقي إلى حينه: ما حُفظ من قبل يبقى، وتعديل مرحلة يحلّ محلّ درجتها السابقة.</p>
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
        </>
      }
      side={
        <>
          <Box title="الحفظ">
            <p className="flex items-center justify-between gap-2 font-bold text-gold">
              <span className="flex items-center gap-1.5">
                <Star className="size-4" /> المتوسط
              </span>
              <motion.span key={avg} initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="font-display text-2xl">
                {avg || "—"}
              </motion.span>
            </p>
            {extreme && (
              <p className="flex items-center gap-2 rounded-xl bg-gold/20 p-2 text-xs font-bold text-gold ring-1 ring-gold/40">
                <Flag className="size-4 shrink-0" /> درجات متطرفة دون ملاحظة — سيُعلَّم التقييم للمراجعة.
              </p>
            )}
            {tried && (!scored.length || missingNotes.length > 0) && <p className="text-xs font-bold text-gold">{!scored.length ? "قيّم مرحلة واحدة على الأقل." : "اكتب ملاحظة لكل درجة أقل من 3."}</p>}
            <Button variant="gold" className="w-full" disabled={!mayRate} title={mayRate ? undefined : needs("admins.evaluation.PUT")} onClick={submit}>
              <CheckCircle2 className="size-4" /> حفظ التقييم
            </Button>
            <Locked perm="admins.evaluation.PUT" />
            <p className="text-xs text-white/55">{saved ? `آخر حفظ: ${saved.by} — ${fmtDateTime(saved.at)}` : "لم يُقيَّم بعد."} يرى الإداري المتوسط فقط، لا اسم المقيّم.</p>
          </Box>
          <OthersBox id={row.id} name={row.name} />
          <Box title="سجلّه" open={false}>
            <RecordHistory system="admins" refId={row.id} bare />
          </Box>
        </>
      }
    />
  );
}

/**
 * Beside the administration's own scores: the two parts of his season's evaluation, side by side (never one
 * number) — his self-evaluation with its sections and his written summary, and the staff's with every rater by
 * name — the stages where they are a point or more apart, and his objection to the staff's, which the
 * administration decides here.
 */
function OthersBox({ id, name }: { id: string; name: string }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const r = useEvaluationOf(id);
  const [reply, setReply] = useState("");
  const mayDecide = useCan()("admins.evaluation.decide-objection");
  if (!r) return null;
  const gaps = r.stages.filter((x) => x.gap);
  const o = r.objection;
  const label = (k: string) => r.stages.find((x) => x.key === k)?.label ?? k;
  const decide = (status: "accepted" | "rejected") => {
    if (reply.trim().length < 5) return;
    actions.decideObjection(id, { status, reply: reply.trim(), decidedBy: user.name });
    logAdmins(user, "evaluation", { action: status === "accepted" ? "قبول اعتراض على التقييم" : "رفض اعتراض على التقييم", target: name, detail: `${o!.stages.map(label).join("، ")} — ${reply.trim()}`, ref: id });
    toast({ title: status === "accepted" ? "قُبل الاعتراض" : "رُفض الاعتراض", body: status === "accepted" ? "عدّل درجات المراحل المعترض عليها في النموذج ثم احفظ." : "يصله ردّك في «التقييم بعد الموسم».", icon: status === "accepted" ? "✅" : "📨", tone: status === "accepted" ? "success" : "info" });
    setReply("");
  };
  return (
    <Box title="التقييم بعد الموسم">
      <div className="grid grid-cols-2 gap-2 text-center">
        <p className="rounded-xl bg-white/[.06] p-2">
          <span className="block text-[11px] text-white/60">تقييمه لنفسه</span>
          <span className="font-display text-2xl font-bold text-white">{r.selfAvg ?? "—"}</span>
        </p>
        <p className="rounded-xl bg-green-light/15 p-2 ring-1 ring-green-light/30">
          <span className="block text-[11px] text-white/60">تقييم الموظفين</span>
          <span className="font-display text-2xl font-bold text-gold">{r.staffAvg ?? "—"}</span>
        </p>
      </div>
      {r.raters.length > 0 && (
        <ul className="space-y-1 text-xs text-white/70">
          {r.raters.map((x, i) => (
            <li key={i}>
              {x.by} — {x.role}
              {x.place ? ` — ${x.place}` : ""}: <b className="text-white">{x.avg ?? "—"}</b>
            </li>
          ))}
        </ul>
      )}
      {r.self?.submittedAt ? (
        <div className="space-y-1.5 border-t border-white/10 pt-2 text-xs text-white/80">
          <p className="font-bold text-gold">تقييمه الذاتي بالأقسام</p>
          {Object.entries(SELF_LABELS).map(([k, l]) => (
            <p key={k} className="flex justify-between gap-2">
              <span>{l}</span>
              <b className="text-white">{r1(avgOf(k === "stages" ? r.self!.stages : r.self!.sections?.[k])) ?? "—"}</b>
            </p>
          ))}
          {REFLECTION.filter((q) => r.self!.answers?.[q.key]).map((q) => (
            <p key={q.key} className="rounded-lg bg-white/[.06] p-2 leading-6">
              <b className="block text-white">{q.label}</b>
              {r.self!.answers![q.key]}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/55">لم يرسل تقييمه الذاتي بعد.</p>
      )}
      {gaps.length > 0 && <p className="rounded-xl bg-gold/20 p-2 text-xs font-bold text-gold ring-1 ring-gold/40">فرق نقطة أو أكثر بين تقييمه لنفسه وتقييم الموظفين في: {gaps.map((g) => g.label).join("، ")}.</p>}
      {o && (
        <div className="space-y-2 rounded-xl bg-maroon/30 p-3 text-xs text-white ring-1 ring-gold/40">
          <p className="flex items-center justify-between gap-2 font-bold text-gold">
            <span>اعتراضه على تقييم الموظفين</span>
            <span>{o.status === "pending" ? "ينتظر قرارك" : o.status === "accepted" ? "قُبل" : "رُفض"}</span>
          </p>
          <p>المراحل: {o.stages.map(label).join("، ")}</p>
          <p className="leading-6 text-white/85">{o.reason}</p>
          {o.status === "pending" && !mayDecide ? (
            <Locked perm="admins.evaluation.decide-objection">القرار في الاعتراض لغيرك.</Locked>
          ) : o.status === "pending" ? (
            <>
              <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="ردّك على الاعتراض" placeholder="ردّك، يصله مع القرار" className={cn(textareaClass, "text-xs")} />
              <div className="flex gap-2">
                <Button size="sm" variant="gold" disabled={reply.trim().length < 5} onClick={() => decide("accepted")}>
                  قبول وإعادة التقييم
                </Button>
                <Button size="sm" variant="outline" disabled={reply.trim().length < 5} onClick={() => decide("rejected")}>
                  رفض
                </Button>
              </div>
            </>
          ) : (
            o.reply && <p className="text-white/75">ردّ {o.decidedBy}: {o.reply}</p>
          )}
        </div>
      )}
    </Box>
  );
}
