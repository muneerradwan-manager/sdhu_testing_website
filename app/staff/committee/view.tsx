"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, CheckCircle2, Gavel, MessageSquareWarning, Scale, UserRoundSearch, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { DemoJump } from "@/components/app/operation-closed";
import { rangeLabel, useOperation } from "@/lib/operations";
import { CURRENT_SEASON, useEmployees, useOpFiles } from "@/lib/ops";
import type { StaffUser } from "@/lib/staff";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { adminName } from "@/app/administrator/_lib/admin";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { evaluationOf, inCommittee, raterKey, useEvaluationOf, useEvaluationState, type StageResult } from "@/app/administrator/_lib/evaluation";
import { EvidenceView } from "@/app/administrator/_components/evidence";
import { can, Empty, Gate, PageHeader, logAs, useStaffUser } from "../_components/kit";
import { SimulateEvaluation } from "../_components/simulate-evaluation";
import { Box, EditHeader, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";

/** Whether this staff member sits on the evaluation committee: he is assigned to its file (the sidebar shows the page to them only) */
export function useIsCommittee(user: StaffUser | null) {
  const employee = useEmployees().find((e) => e.staffId === user?.id);
  const files = useOpFiles();
  return inCommittee(employee?.id, files, CURRENT_SEASON);
}

/** Viewing needs `evaluate.committee.GET`, deciding `.PUT` while the committee's window is open — and a place in the committee's file */
export function CommitteeView() {
  return (
    <Gate perms={["evaluate.committee.GET"]}>
      <Committee />
    </Gate>
  );
}

const BASE = "/staff/committee";

function Committee() {
  const user = useStaffUser()!;
  const member = useIsCommittee(user);
  const id = useSearchParams().get("id");
  if (!member) return <Empty icon={<UserX />} title="لست من أعضاء لجنة التقييم" text="يُسند أعضاء اللجنة على ملفها في «الملفات التشغيلية». تقرأ اللجنة اعتراضات الإداريين على التقييم، وتعدّل الإيجابيات والسلبيات، وتعتمد النتيجة النهائية." />;
  return id ? <Case id={id} user={user} /> : <Cases />;
}

/** Everyone with something before the committee — an objection, or positives and negatives — those waiting first */
function Cases() {
  const op = useOperation("evaluation-committee");
  const stages = useEvaluationStages();
  const state = useEvaluationState();
  const rows = useMemo(() => {
    const ids = new Set([...Object.keys(state.evaluationObjections), ...Object.entries(state.evaluationPoints).filter(([, l]) => l.length).map(([id]) => id)]);
    return [...ids]
      .map((id) => ({ id, r: evaluationOf(id, stages, state) }))
      .sort((a, b) => Number(a.r.finalized) - Number(b.r.finalized) || b.r.pending + b.r.pendingPoints - (a.r.pending + a.r.pendingPoints));
  }, [state, stages]);
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="لجنة التقييم"
        icon={<Scale />}
        title="التقييم: الاعتراضات والإيجابيات والسلبيات"
        description="تقرأ اللجنة أدلة الإداري وأدلة من قيّمه، وتعرف من هم لتصل إليهم إن استدعتهم. تقرّر في الاعتراضات (درجة الإداري أو الموظفين أو ثالثة منها)، وتعدّل قيمة الإيجابيات والسلبيات صعوداً أو نزولاً، ثم تعتمد النتيجة النهائية."
      />
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1", op.open ? "bg-green-light/15 ring-green-light/40" : "bg-white/[.06] ring-white/10")}>
        <p className="text-sm text-white/85">
          <b className="text-gold">{op.label}</b> — {rangeLabel(op.start, op.end)}: {op.open ? "مفتوحة الآن." : op.status === "upcoming" ? "لم تُفتح بعد." : "أُغلقت."}
        </p>
        {!op.open && <DemoJump state={op} />}
      </div>
      <SimulateEvaluation />
      <ListTable head={["الإداري", "اعتراضه", "النقاط", "النتيجة", "الحال"]}>
        {rows.length === 0 && <EmptyRow cols={5}>لا شيء أمام اللجنة بعد. يظهر هنا من اعترض، ومن أضاف له الموظفون إيجابيات أو سلبيات.</EmptyRow>}
        {rows.map(({ id, r }) => {
          const href = `${BASE}?id=${id}`;
          const left = r.pending + r.pendingPoints;
          const neg = r.points.filter((x) => x.objected).length;
          return (
            <tr key={id}>
              <td className="p-3 align-top">
                <Link href={href} className="font-bold text-white hover:text-gold">
                  {adminName(id)}
                </Link>
                <RowActions>
                  <RowLink href={href}>{r.finalized ? "عرض النتيجة" : "النظر"}</RowLink>
                </RowActions>
              </td>
              <td className="p-3 align-top text-white/80">{r.objection ? [r.objection.stages.length ? `${r.objection.stages.length} مراحل` : "", neg ? `${neg} سلبيات` : ""].filter(Boolean).join(" + ") : "—"}</td>
              <td className="p-3 align-top tabular-nums text-white/85">{r.points.length ? `${r.net >= 0 ? "+" : "−"}${Math.abs(r.net)} (${r.points.length})` : "—"}</td>
              <td className="p-3 align-top font-bold tabular-nums text-gold">{r.final100 ?? r.base100 ?? "—"}</td>
              <td className="p-3 align-top">{r.finalized ? <Tag tone="green">نهائية</Tag> : left ? <Tag tone="gold">تنتظر قراراً ({left})</Tag> : <Tag tone="gold">جاهزة للاعتماد</Tag>}</td>
            </tr>
          );
        })}
      </ListTable>
    </div>
  );
}

type Pick = "self" | "staff" | "own";
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n)}`;

/**
 * One administrator before the committee: his objection (if he objected) with each stage he objected to — what he gave himself,
 * what each rater gave (named: the committee alone knows), each rater's answer with his evidence — then all the positives and
 * negatives, each with its rater, reason and evidence, whose value the committee may raise or lower; then the final result,
 * which the committee adopts last.
 */
function Case({ id, user }: { id: string; user: StaffUser }) {
  const toast = useToast();
  const op = useOperation("evaluation-committee");
  const r = useEvaluationOf(id);
  const state = useEvaluationState();
  const peers = state.peerEvaluations[id];
  const stages = useEvaluationStages();
  const objection = r?.objection;
  const editable = op.open && can(user, "evaluate.committee.PUT") && !r?.finalized;
  const objected = (r?.stages ?? []).filter((x) => x.objected);
  const [draft, setDraft] = useState<Record<string, { pick: Pick; own: string; note: string }>>(() => Object.fromEntries(objected.map((x) => [x.key, { pick: (x.decision?.pick ?? "staff") as Pick, own: String(x.decision?.pick === "own" ? x.decision.score : ""), note: x.decision?.note ?? "" }])));
  const [pts, setPts] = useState<Record<string, { value: string; note: string }>>(() => Object.fromEntries((r?.points ?? []).map((x) => [x.point.id, { value: String(x.value), note: x.decided?.note ?? "" }])));
  const raters = useMemo(() => Object.entries(peers ?? {}), [peers]);
  if (!r || (!objection && r.points.length === 0)) return <Empty icon={<MessageSquareWarning />} title="لا شيء أمام اللجنة لهذا الإداري" text="لم يعترض، ولم يضف الموظفون له إيجابيات أو سلبيات." />;

  const scoreOf = (x: StageResult, d: { pick: Pick; own: string }) => (d.pick === "self" ? x.self : d.pick === "staff" ? x.staff : d.own ? Number(d.own) : null);
  const stagesReady = objected.every((x) => {
    const d = draft[x.key];
    const sc = d && scoreOf(x, d);
    return !!d && sc !== null && sc >= 1 && sc <= 5 && (d.pick !== "own" || d.note.trim().length >= 5);
  });
  const valueOf = (id2: string) => Number(pts[id2]?.value);
  const pointsReady = r.points.every((x) => {
    const v = valueOf(x.point.id);
    const changed = v !== x.point.points;
    return Number.isInteger(v) && v >= -100 && v <= 100 && (!changed || (pts[x.point.id]?.note ?? "").trim().length >= 5);
  });
  const ready = stagesReady && pointsReady;
  // What the final result would be with the values as they stand in the form
  const draftNet = r.points.reduce((a, x) => a + (Number.isFinite(valueOf(x.point.id)) ? valueOf(x.point.id) : x.value), 0);
  const draftFinal = r.base100 === null ? null : Math.round(Math.min(100, Math.max(0, r.base100 + draftNet)) * 10) / 10;

  const decide = () => {
    if (!editable || !ready) return;
    const stageOut = Object.fromEntries(objected.map((x) => [x.key, { pick: draft[x.key].pick, score: scoreOf(x, draft[x.key])!, ...(draft[x.key].note.trim() ? { note: draft[x.key].note.trim() } : {}) }]));
    // A value is recorded when the committee changed it or the administrator objected to it
    const pointOut = Object.fromEntries(r.points.filter((x) => x.objected || valueOf(x.point.id) !== x.point.points).map((x) => [x.point.id, { points: valueOf(x.point.id), ...(pts[x.point.id]?.note.trim() ? { note: pts[x.point.id].note.trim() } : {}) }]));
    actions.decideEvaluation(id, { stages: stageOut, points: pointOut });
    logAs(user, { action: "قرار لجنة التقييم", target: adminName(id), detail: [...objected.map((x) => `${x.label}: ${stageOut[x.key].score}`), ...Object.values(pointOut).map((p) => `نقطة: ${signed(p.points)}`)].join(" · ") || "بلا تعديل", system: "admins", area: "evaluation", ref: id });
    toast({ title: "سُجّلت قرارات اللجنة", body: `${adminName(id)}: بعد حفظ كل ما تقرّر تعتمد اللجنة النتيجة النهائية.`, icon: "⚖️", tone: "success" });
  };
  const finalize = () => {
    if (!editable || r.pending + r.pendingPoints > 0) return;
    actions.finalizeEvaluation(id);
    logAs(user, { action: "اعتماد النتيجة النهائية للتقييم", target: adminName(id), after: `${r.final100 ?? draftFinal ?? r.base100} من 100`, system: "admins", area: "evaluation", ref: id });
    toast({ title: "اعتُمدت النتيجة النهائية", body: `${adminName(id)}: يراها الآن، وتدخل في تصنيف مجموعته أو تكتله.`, icon: "✅", tone: "success" });
  };
  const label = (k: string) => stages.find((x) => x.key === k)?.label ?? k;
  const left = r.pending + r.pendingPoints;

  return (
    <div>
      <EditHeader back={BASE} backLabel="كل ما أمام اللجنة" title={`تقييم ${adminName(id)}`}>
        {r.finalized ? "النتيجة نهائية" : left ? `ينتظر ${left} قراراً` : "جاهز للاعتماد"} — {rangeLabel(op.start, op.end)}
      </EditHeader>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          {objection && (
            <section className="rounded-2xl bg-maroon/25 p-4 ring-1 ring-gold/40">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gold">
                <MessageSquareWarning className="size-5" /> ما قاله الإداري في اعتراضه
              </h2>
              <p className="mt-2 leading-7 text-white">{objection.reason}</p>
              <EvidenceView items={objection.evidence} tone="dark" />
            </section>
          )}

          {objected.map((x) => {
            const d = draft[x.key];
            const mine = raters.filter(([, p]) => p.stages[x.key]);
            return (
              <section key={x.key} className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
                <h2 className="font-display text-xl font-bold text-gold">{x.label}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <p className="rounded-xl bg-white/[.06] p-3">
                    <span className="block text-[11px] text-white/60">تقييمه لنفسه</span>
                    <span className="font-display text-3xl font-bold text-white">{x.self ?? "—"}</span>
                  </p>
                  <p className="rounded-xl bg-green-light/15 p-3 ring-1 ring-green-light/30">
                    <span className="block text-[11px] text-white/60">متوسط الموظفين ({mine.length})</span>
                    <span className="font-display text-3xl font-bold text-gold">{x.staff ?? "—"}</span>
                  </p>
                </div>

                <h3 className="mt-4 flex items-center gap-1.5 text-sm font-bold text-white/80">
                  <UserRoundSearch className="size-4 text-gold" /> من قيّم في هذه المرحلة، وما قدّمه
                </h3>
                <ul className="mt-2 space-y-3">
                  {mine.map(([k, p]) => {
                    const reply = objection?.replies?.[k];
                    const notes = Object.values(p.sections?.[x.key] ?? {}).map((q) => q.note).filter(Boolean);
                    return (
                      <li key={k} className="rounded-xl bg-white/[.06] p-3 ring-1 ring-white/10">
                        <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-bold text-white">
                            {p.by.name} <span className="font-normal text-white/60">— {p.by.title} — {p.by.place}</span>
                          </span>
                          <span className="font-display text-xl font-bold text-gold">{p.stages[x.key].score}</span>
                        </p>
                        {notes.length > 0 && <p className="mt-1 text-xs leading-6 text-white/70">ملاحظاته: {notes.join(" · ")}</p>}
                        {reply ? (
                          <div className="mt-2 rounded-lg bg-black/20 p-2.5">
                            <p className="text-xs font-bold text-gold">ردّه على الاعتراض</p>
                            <p className="mt-1 text-sm leading-7 text-white">{reply.text}</p>
                            <EvidenceView items={reply.evidence} tone="dark" />
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-white/50">لم يردّ على الاعتراض.</p>
                        )}
                      </li>
                    );
                  })}
                  {mine.length === 0 && <li className="text-sm text-white/55">لا مقيّمين في هذه المرحلة.</li>}
                </ul>

                <fieldset disabled={!editable} className="mt-5 border-t border-white/10 pt-4">
                  <legend className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
                    <Gavel className="size-4 text-gold" /> قرار اللجنة في «{x.label}»
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`قرار ${x.label}`}>
                    {([
                      ["self", `درجة الإداري${x.self !== null ? ` (${x.self})` : ""}`, x.self === null],
                      ["staff", `درجة الموظفين${x.staff !== null ? ` (${x.staff})` : ""}`, x.staff === null],
                      ["own", "درجة ثالثة من اللجنة", false],
                    ] as [Pick, string, boolean][]).map(([k, text, off]) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={d?.pick === k}
                        disabled={off}
                        onClick={() => setDraft((s) => ({ ...s, [x.key]: { ...s[x.key], pick: k } }))}
                        className={cn("rounded-xl px-3 py-2.5 text-sm font-bold ring-1 transition disabled:opacity-40", d?.pick === k ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white ring-white/15 hover:ring-gold/50")}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                  {d?.pick === "own" && (
                    <label className="mt-3 block text-sm text-white/80">
                      الدرجة (من 1 إلى 5)
                      <select value={d.own} onChange={(e) => setDraft((s) => ({ ...s, [x.key]: { ...s[x.key], own: e.target.value } }))} aria-label={`درجة اللجنة في ${x.label}`} className="mt-1 block h-11 w-32 rounded-xl border-2 border-white/15 bg-white/5 px-3 text-white outline-none focus:border-gold [&>option]:text-ink">
                        <option value="">— اختر —</option>
                        {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <textarea rows={2} value={d?.note ?? ""} onChange={(e) => setDraft((s) => ({ ...s, [x.key]: { ...s[x.key], note: e.target.value } }))} aria-label={`تعليل قرار ${x.label}`} placeholder={d?.pick === "own" ? "تعليل الدرجة الثالثة (إلزامي)" : "تعليل القرار (اختياري)"} className="mt-3 w-full rounded-xl border-2 border-white/15 bg-white/5 p-3 text-sm text-white outline-none focus:border-gold" />
                </fieldset>
              </section>
            );
          })}

          {r.points.length > 0 && (
            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <h2 className="font-display text-xl font-bold text-gold">الإيجابيات والسلبيات</h2>
              <p className="mb-3 mt-1 text-xs leading-6 text-white/60">لكل نقطة من أضافها وسببها ودليلها. قيمة اللجنة تبدأ بما وضعه الموظف، وتعدّلها صعوداً أو نزولاً (حتى 100)، وتعلّل كل تعديل. المعترض عليها من السلبيات لا بدّ من قرار فيها.</p>
              <ul className="space-y-3">
                {r.points.map((x) => {
                  const by = x.point.by;
                  const reply = objection?.replies?.[raterKey(by.id)];
                  const f = pts[x.point.id];
                  const changed = valueOf(x.point.id) !== x.point.points;
                  return (
                    <li key={x.point.id} className={cn("rounded-xl p-3 ring-1", x.point.points >= 0 ? "bg-green-light/10 ring-green-light/30" : "bg-maroon/20 ring-maroon/40")}>
                      <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-bold text-white">
                          {by.name} <span className="font-normal text-white/60">— {by.title} — {by.place}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          {x.objected && <Tag tone="gold">اعترض عليها</Tag>}
                          <span className="font-display text-xl font-bold tabular-nums text-white">{signed(x.point.points)}</span>
                        </span>
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/90">{x.point.reason}</p>
                      <EvidenceView items={x.point.evidence} tone="dark" />
                      {reply && x.objected && (
                        <div className="mt-2 rounded-lg bg-black/20 p-2.5">
                          <p className="text-xs font-bold text-gold">ردّ صاحبها على الاعتراض</p>
                          <p className="mt-1 text-sm leading-7 text-white">{reply.text}</p>
                          <EvidenceView items={reply.evidence} tone="dark" />
                        </div>
                      )}
                      <fieldset disabled={!editable} className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
                        <label className="flex items-center gap-2 text-sm text-white/80">
                          قيمة اللجنة
                          <input type="number" min={-100} max={100} value={f?.value ?? ""} onChange={(e) => setPts((s) => ({ ...s, [x.point.id]: { ...s[x.point.id], value: e.target.value } }))} aria-label={`قيمة اللجنة لنقطة ${signed(x.point.points)}`} dir="ltr" className="h-10 w-24 rounded-xl border-2 border-white/15 bg-white/5 px-3 text-center text-white outline-none focus:border-gold" />
                        </label>
                        <input value={f?.note ?? ""} onChange={(e) => setPts((s) => ({ ...s, [x.point.id]: { ...s[x.point.id], note: e.target.value } }))} aria-label={`تعليل نقطة ${signed(x.point.points)}`} placeholder={changed ? "تعليل التعديل (إلزامي)" : "تعليل (اختياري)"} className={cn("h-10 min-w-0 flex-1 rounded-xl border-2 bg-white/5 px-3 text-sm text-white outline-none focus:border-gold", changed && (f?.note ?? "").trim().length < 5 ? "border-gold" : "border-white/15")} />
                      </fieldset>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-gold/30">
            <h2 className="font-display text-lg font-bold text-gold">النتيجة النهائية</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { k: "الأولية (المراحل)", v: r.base100 ?? "—" },
                { k: "صافي النقاط بقراراتك", v: r.points.length ? signed(draftNet) : "0" },
                { k: r.finalized ? "النهائية (معتمدة)" : "النهائية المتوقعة", v: r.finalized ? r.final100 : draftFinal ?? "—" },
              ].map((x, i) => (
                <p key={x.k} className={cn("rounded-xl p-3", i === 2 ? "bg-gold text-ink" : "bg-white/[.06]")}>
                  <span className={cn("block text-[11px]", i === 2 ? "text-ink/70" : "text-white/60")}>{x.k}</span>
                  <span className="font-display text-3xl font-bold">{x.v}</span>
                </p>
              ))}
            </div>
            <p className="mt-2 text-xs leading-6 text-white/60">النهائية = الأولية + الصافي، بين 0 و100. تُحفظ القرارات أولاً، ثم تُعتمد النتيجة فيراها الإداري وتدخل في التصنيف.</p>
            {r.finalized ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-bold text-green-light">
                <BadgeCheck className="size-5" /> اعتُمدت النتيجة النهائية.
              </p>
            ) : (
              editable && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="gold" disabled={!ready} onClick={decide}>
                    <CheckCircle2 className="size-4" /> حفظ قرارات اللجنة
                  </Button>
                  <Button variant="glass" disabled={left > 0} onClick={finalize} title={left > 0 ? "احفظ القرارات في كل ما اعترض عليه الإداري أولاً" : undefined}>
                    <BadgeCheck className="size-4" /> اعتماد النتيجة النهائية
                  </Button>
                </div>
              )
            )}
            {!editable && !r.finalized && <p className="mt-3 text-sm text-white/60">{op.open ? "القرار للجنة بصلاحية «قرارات لجنة التقييم — تعديل»." : "تُسجَّل القرارات حين تُفتح مدة اللجنة."}</p>}
          </section>
        </div>

        <div className="space-y-4">
          <Box title="كل من قيّمه">
            <ul className="space-y-2 text-xs text-white/80">
              {raters.map(([k, p]) => (
                <li key={k} className="rounded-lg bg-white/[.06] p-2">
                  <b className="block text-white">{p.by.name}</b>
                  {p.by.title} — {p.by.place}
                  <span className="mt-0.5 block text-white/55">قيّم {Object.keys(p.stages).map(label).join("، ")}</span>
                </li>
              ))}
              {raters.length === 0 && <li className="text-white/55">لم يقيّم أحد المراحل.</li>}
            </ul>
            <p className="text-[11px] leading-5 text-white/50">هويات المقيّمين للجنة وحدها، ليصلوا إلى من يستدعونه. لا يراها الإداري ولا الإدارة.</p>
          </Box>
        </div>
      </div>
    </div>
  );
}
