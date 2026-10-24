"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Gavel, MessageSquareWarning, Scale, UserRoundSearch, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { DemoJump } from "@/components/app/operation-closed";
import { rangeLabel, useOperation } from "@/lib/operations";
import { CURRENT_SEASON, useEmployees, useOpFiles } from "@/lib/ops";
import type { StaffUser } from "@/lib/staff";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { adminName } from "@/app/administrator/_lib/admin";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { inCommittee, useEvaluationOf, type StageResult } from "@/app/administrator/_lib/evaluation";
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
  if (!member) return <Empty icon={<UserX />} title="لست من أعضاء لجنة التقييم" text="يُسند أعضاء اللجنة على ملفها في «الملفات التشغيلية». تقرأ اللجنة اعتراضات الإداريين على تقييم الموظفين وتقرّر فيها." />;
  return id ? <Case id={id} user={user} /> : <Cases />;
}

/** The objections, those waiting first */
function Cases() {
  const op = useOperation("evaluation-committee");
  const stages = useEvaluationStages();
  const objections = useStore((s) => s.evaluationObjections);
  const decisions = useStore((s) => s.evaluationDecisions);
  const rows = Object.entries(objections)
    .map(([id, o]) => ({ id, o, left: o.stages.filter((k) => !decisions[id]?.stages[k]).length }))
    .sort((a, b) => Number(b.left > 0) - Number(a.left > 0) || b.o.at - a.o.at);
  const label = (k: string) => stages.find((x) => x.key === k)?.label ?? k;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="لجنة التقييم" icon={<Scale />} title="اعتراضات الإداريين على التقييم" description="تقرأ اللجنة أدلة الإداري وأدلة من قيّمه، وتعرف من هم لتصل إليهم إن استدعتهم، ثم تقرّر لكل مرحلة معترض عليها: درجة الإداري، أو درجة الموظفين، أو درجة ثالثة منها." />
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1", op.open ? "bg-green-light/15 ring-green-light/40" : "bg-white/[.06] ring-white/10")}>
        <p className="text-sm text-white/85">
          <b className="text-gold">{op.label}</b> — {rangeLabel(op.start, op.end)}: {op.open ? "مفتوحة الآن." : op.status === "upcoming" ? "لم تُفتح بعد." : "أُغلقت."}
        </p>
        {!op.open && <DemoJump state={op} />}
      </div>
      <SimulateEvaluation />
      <ListTable head={["الإداري", "المراحل المعترض عليها", "ردود المقيّمين", "الحال"]}>
        {rows.length === 0 && <EmptyRow cols={4}>لا اعتراضات بعد. تظهر هنا حين يعترض إداري على تقييم الموظفين له.</EmptyRow>}
        {rows.map(({ id, o, left }) => {
          const href = `${BASE}?id=${id}`;
          return (
            <tr key={id}>
              <td className="p-3 align-top">
                <Link href={href} className="font-bold text-white hover:text-gold">
                  {adminName(id)}
                </Link>
                <RowActions>
                  <RowLink href={href}>{left ? "النظر في الاعتراض" : "عرض القرار"}</RowLink>
                </RowActions>
              </td>
              <td className="p-3 align-top text-white/80">{o.stages.map(label).join("، ")}</td>
              <td className="p-3 align-top tabular-nums text-white/85">{Object.keys(o.replies ?? {}).length}</td>
              <td className="p-3 align-top">{left ? <Tag tone="gold">تنتظر قراراً ({left})</Tag> : <Tag tone="green">قُرّر</Tag>}</td>
            </tr>
          );
        })}
      </ListTable>
    </div>
  );
}

type Pick = "self" | "staff" | "own";

/**
 * One objection: the administrator's reason and evidence, then each stage he objected to — what he gave himself, what each rater gave
 * (named: the committee alone may know), each rater's answer with his evidence — and the committee's decision on it.
 */
function Case({ id, user }: { id: string; user: StaffUser }) {
  const toast = useToast();
  const op = useOperation("evaluation-committee");
  const r = useEvaluationOf(id);
  const peers = useStore((s) => s.peerEvaluations[id]);
  const stages = useEvaluationStages();
  const objection = r?.objection;
  const editable = op.open && can(user, "evaluate.committee.PUT");
  const objected = (r?.stages ?? []).filter((x) => x.objected);
  const [draft, setDraft] = useState<Record<string, { pick: Pick; own: string; note: string }>>(() => Object.fromEntries(objected.map((x) => [x.key, { pick: (x.decision?.pick ?? "staff") as Pick, own: String(x.decision?.pick === "own" ? x.decision.score : ""), note: x.decision?.note ?? "" }])));
  const raters = useMemo(() => Object.entries(peers ?? {}), [peers]);
  if (!r || !objection) return <Empty icon={<MessageSquareWarning />} title="لا اعتراض لهذا الإداري" text="لم يعترض على تقييم الموظفين له." />;

  const scoreOf = (x: StageResult, d: { pick: Pick; own: string }) => (d.pick === "self" ? x.self : d.pick === "staff" ? x.staff : d.own ? Number(d.own) : null);
  const ready = objected.every((x) => {
    const d = draft[x.key];
    const sc = d && scoreOf(x, d);
    return !!d && sc !== null && sc >= 1 && sc <= 5 && (d.pick !== "own" || d.note.trim().length >= 5);
  });
  const decide = () => {
    if (!editable || !ready) return;
    const out = Object.fromEntries(objected.map((x) => [x.key, { pick: draft[x.key].pick, score: scoreOf(x, draft[x.key])!, ...(draft[x.key].note.trim() ? { note: draft[x.key].note.trim() } : {}) }]));
    actions.decideEvaluation(id, out);
    logAs(user, { action: "قرار لجنة التقييم في اعتراض", target: adminName(id), detail: objected.map((x) => `${x.label}: ${out[x.key].score}`).join(" · "), system: "admins", area: "evaluation", ref: id });
    toast({ title: "سُجّل قرار اللجنة", body: `${adminName(id)}: تُعتمد الدرجات المقرَّرة في نتيجته.`, icon: "⚖️", tone: "success" });
  };
  const label = (k: string) => stages.find((x) => x.key === k)?.label ?? k;

  return (
    <div>
      <EditHeader back={BASE} backLabel="كل الاعتراضات" title={`اعتراض ${adminName(id)}`}>
        {objected.some((x) => x.pending) ? "ينتظر قرار اللجنة" : "قرّرت اللجنة"} — {rangeLabel(op.start, op.end)}
      </EditHeader>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl bg-maroon/25 p-4 ring-1 ring-gold/40">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gold">
              <MessageSquareWarning className="size-5" /> ما قاله الإداري
            </h2>
            <p className="mt-2 leading-7 text-white">{objection.reason}</p>
            <EvidenceView items={objection.evidence} tone="dark" />
          </section>

          {objected.map((x) => {
            const d = draft[x.key];
            const mine = raters.filter(([, p]) => p.stages[x.key]);
            const answers = mine.map(([k]) => objection.replies?.[k]).filter(Boolean);
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
                    const reply = objection.replies?.[k];
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
                {answers.length === 0 && mine.length > 0 && <p className="mt-2 text-xs text-white/55">لم يردّ أحد منهم. لك أن تستدعيهم قبل أن تقرّري.</p>}

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
          {editable && (
            <Button variant="gold" disabled={!ready} onClick={decide}>
              <CheckCircle2 className="size-4" /> اعتماد قرار اللجنة
            </Button>
          )}
          {!editable && <p className="text-sm text-white/60">{op.open ? "القرار للجنة بصلاحية «قرارات لجنة التقييم — تعديل»." : "تُسجَّل القرارات حين تُفتح مدة اللجنة."}</p>}
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
            </ul>
            <p className="text-[11px] leading-5 text-white/50">هويات المقيّمين للجنة وحدها، ليصلوا إلى من يستدعونه. لا يراها الإداري ولا الإدارة.</p>
          </Box>
        </div>
      </div>
    </div>
  );
}
