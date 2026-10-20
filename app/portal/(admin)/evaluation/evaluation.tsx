"use client";

import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardCheck, Lock, MessageSquareWarning, Save, Send, Star, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { DemoJump, OperationClosed } from "@/components/app/operation-closed";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { rangeLabel, useOperation, type OperationState } from "@/lib/operations";
import { actions, useStore, type StageScores } from "@/lib/store";
import { cn } from "@/lib/utils";
import { effectiveRole, logAdmin, positionKeyOf, positionLabelOf, useAdmin } from "@/app/administrator/_lib/admin";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { SELF_ROLE_LABEL, avgOf, round1, sectionScores, selfRoleOf, selfSections, useEvaluationOf } from "@/app/administrator/_lib/evaluation";
import { examRoleOf } from "@/app/administrator/_lib/structure";
import { AdminShell } from "@/app/administrator/_components/ui";
import { StageScoresForm, cleanScores, scoresReady } from "@/app/administrator/_components/stage-scores";

type Tab = "self" | "result";

/**
 * «التقييم بعد الموسم»: once the pilgrims are home, a group's head, a cluster's head and the religious guides rate
 * themselves, stage by stage, and send it — the only rating an administrator gives: administrators do not rate one
 * another. The coordinators and the assistants have no self-evaluation: the staff rate them, as everyone. Then the staff posted where his
 * cluster lived rate him; he sees both side by side and may object to the staff's (../../_lib/evaluation).
 */
export function AdminEvaluation() {
  const admin = useAdmin()!;
  const [tab, setTab] = useState<Tab>("self");
  const tabs: { key: Tab; label: string; icon: typeof Star }[] = [
    { key: "self", label: "تقييمي الذاتي", icon: UserRoundCheck },
    { key: "result", label: "نتيجتي", icon: Star },
  ];
  return (
    <AdminShell title="التقييم بعد الموسم" subtitle="بعد عودة الحجاج: تقيّم نفسك، ثم يقيّمك موظفو البعثة الذين كانوا مع تكتلك. ترى التقييمين جنباً إلى جنب، ولك أن تعترض على تقييم الموظفين.">
      <Windows />
      <div className="scrollbar-none -mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-2xl border border-gold/30 bg-white p-1" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => setTab(t.key)} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === t.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === t.key && <motion.span layoutId="eval-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      {tab === "self" && <SelfEvaluation />}
      {tab === "result" && <EvaluationResultView id={admin.id} />}
    </AdminShell>
  );
}

/** The three windows, in their order, each with its dates and state */
function Windows() {
  const ops = [useOperation("self-evaluation"), useOperation("peer-evaluation"), useOperation("evaluation-objection")];
  const label = (o: OperationState) => (o.open ? "مفتوحة الآن" : o.status === "upcoming" ? "لم تُفتح بعد" : o.status === "off" ? "موقوفة" : "أُغلقت");
  return (
    <ol className="mb-6 grid gap-3 md:grid-cols-3">
      {ops.map((o, i) => (
        <li key={o.key} className={cn("rounded-3xl border p-4", o.open ? "border-green-light bg-green-light/10" : "border-gold/30 bg-white")}>
          <p className="flex items-center justify-between gap-2 text-xs font-bold text-hint">
            <span>المرحلة {i + 1}</span>
            <Badge tone={o.open ? "green" : o.status === "upcoming" ? "gold" : "ink"}>{label(o)}</Badge>
          </p>
          <p className="mt-1 font-bold text-green-dark">{o.label}</p>
          <p className="text-xs text-ink-soft">{rangeLabel(o.start, o.end)}</p>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────── His own ─────────────────────────

/** The sections of his self-evaluation, for his role (none for a coordinator or an assistant) */
function useSelfSections() {
  const admin = useAdmin()!;
  const p = admin.profile;
  const stages = useEvaluationStages();
  const role = selfRoleOf(examRoleOf(positionKeyOf(p?.positions[0]) || "group-head"), !!p?.cluster);
  return { role, sections: role ? selfSections(stages, role) : [] };
}

/**
 * «تقييمي الذاتي» in its sections, one at a time with the list of sections beside it: each scored section must be
 * scored whole (a note under every score below 3), the summary is written, then everything is reviewed and sent once.
 */
function SelfEvaluation() {
  const admin = useAdmin()!;
  const toast = useToast();
  const op = useOperation("self-evaluation");
  const { role, sections } = useSelfSections();
  const saved = useStore((s) => s.selfEvaluations[admin.id]);
  const sent = !!saved?.submittedAt;
  const [scores, setScores] = useState<Record<string, StageScores>>(() => Object.fromEntries(sections.filter((x) => x.items).map((x) => [x.key, sectionScores(saved, x.key)])));
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {});
  const [at, setAt] = useState(0);
  const [tried, setTried] = useState(false);
  const post = positionLabelOf(effectiveRole(admin.profile));
  const review = at === sections.length;
  const current = sections[at];

  if (!role) {
    return (
      <Card className="md:p-8">
        <p className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
          <ClipboardCheck className="size-6 text-gold-dark" /> لا تقييم ذاتي لصفتك
        </p>
        <p className="mt-2 max-w-3xl leading-8 text-ink-soft">
          يقيّم نفسه رئيس المجموعة، ورئيس التكتل، والموجّهون الدينيون والموجّهات الدينيات. أما صفتك «{post}» فيقيّمك فيها موظفو البعثة الذين كانوا مع تكتلك، مرحلة مرحلة، وترى تقييمهم في «نتيجتي» ولك أن تعترض عليه.
        </p>
      </Card>
    );
  }
  if (!op.open && !sent) return <OperationClosed state={op} text="تقييمك الذاتي يُفتح بعد هبوط آخر رحلات العودة في دمشق، لأسبوع، ثم يقيّمك الموظفون." />;

  const value = (key: string) => (sent ? sectionScores(saved, key) : (scores[key] ?? {}));
  const stateOf = (i: number) => {
    const sec = sections[i];
    if (sec.questions) {
      const n = sec.questions.filter((q) => (sent ? saved?.answers?.[q.key] : answers[q.key])?.trim()).length;
      return { done: n > 0, label: `${n} من ${sec.questions.length}` };
    }
    const r = scoresReady(sec.items!, value(sec.key), true);
    return { done: r.ok, label: `${r.scored} من ${sec.items!.length}` };
  };
  const allDone = sections.every((_, i) => stateOf(i).done);
  // Each stage's questions, and the stage's score their average (shown beside the staff's)
  const stageSections = sections.filter((x) => x.items);
  const payload = () => ({
    stages: Object.fromEntries(
      stageSections.flatMap((x) => {
        const avg = round1(avgOf(cleanScores(scores[x.key] ?? {})));
        return avg === null ? [] : [[x.key, { score: avg }]];
      }),
    ),
    sections: Object.fromEntries(stageSections.map((x) => [x.key, cleanScores(scores[x.key] ?? {})])),
    answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)),
  });

  const save = (submit: boolean) => {
    setTried(submit);
    if (submit && !allDone) return;
    const data = payload();
    actions.saveSelfEvaluation(admin.id, data, { submit });
    const avg = round1(avgOf(Object.assign({}, ...Object.values(data.sections))));
    logAdmin(admin.id, submit ? "إرسال التقييم الذاتي" : "حفظ مسودة التقييم الذاتي", `${post} — موسم 1448`, `${sections.filter((_, i) => stateOf(i).done).length} من ${sections.length} أقسام${avg !== null ? ` — المتوسط ${avg}` : ""}`);
    toast(submit ? { title: "أُرسل تقييمك الذاتي", body: "لا يتغيّر بعد إرساله. يُعرض بجانب ما يعطيك الموظفون، ولا يدخل في نتيجتك.", icon: "✅", tone: "success" } : { title: "حُفظت المسودة", body: "تكمل متى شئت قبل نهاية المدة.", icon: "💾", tone: "info" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className="md:p-5">
        <p className="flex items-center gap-2 font-bold text-green-dark">
          <ClipboardCheck className="size-5 text-gold-dark" /> تقييمي الذاتي — {SELF_ROLE_LABEL[role]}
        </p>
        <ol className="mt-4 space-y-1.5" aria-label="أقسام التقييم الذاتي">
          {[...sections.map((x, i) => ({ title: x.title, i, st: stateOf(i) })), { title: "المراجعة والإرسال", i: sections.length, st: { done: sent, label: sent ? "أُرسل" : "" } }].map((x) => (
            <li key={x.i}>
              <button type="button" onClick={() => setAt(x.i)} aria-current={at === x.i ? "step" : undefined} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm transition", at === x.i ? "bg-green-dark text-white" : "hover:bg-sand")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", x.st.done ? "bg-green-light text-white" : at === x.i ? "bg-white/20 text-white" : "bg-sand text-gold-dark")}>{x.st.done ? <Check className="size-4" /> : x.i + 1}</span>
                <span className="min-w-0 flex-1 font-bold">{x.title}</span>
                {x.st.label && <span className={cn("shrink-0 text-xs", at === x.i ? "text-white/70" : "text-hint")}>{x.st.label}</span>}
              </button>
            </li>
          ))}
        </ol>
        {sent ? (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-green-light/10 p-3 text-xs font-bold text-green">
            <Lock className="size-4" /> أُرسل {new Date(saved!.submittedAt!).toLocaleDateString("ar-SY-u-nu-latn", { day: "numeric", month: "long" })} — لا يتغيّر بعد إرساله.
          </p>
        ) : (
          <>
            <Button variant="outline" className="mt-4 w-full" onClick={() => save(false)} disabled={!op.open}>
              <Save className="size-4" /> حفظ مسودة
            </Button>
            <p className="mt-2 text-xs leading-6 text-hint">المدة {rangeLabel(op.start, op.end)}. بعدها يُفتح تقييم الموظفين.</p>
          </>
        )}
      </Card>

      <Card className="md:p-7">
        {review ? (
          <div>
            <h2 className="font-display text-2xl font-bold text-green-dark">المراجعة والإرسال</h2>
            <p className="mt-1 leading-7 text-ink-soft">تقييمك الذاتي يُعرض بجانب ما يعطيك الموظفون، ولا يدخل في نتيجتك. تُرسله مرة واحدة.</p>
            <ul className="mt-5 space-y-2">
              {sections.map((x, i) => {
                const st = stateOf(i);
                const avg = x.items ? round1(avgOf(value(x.key))) : null;
                return (
                  <li key={x.key} className={cn("flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3", st.done ? "bg-green-light/10" : "bg-maroon/5")}>
                    <span className="font-bold text-ink">{x.title}</span>
                    <span className="flex items-center gap-2 text-sm">
                      {avg !== null && <span className="font-display text-lg font-bold text-green-dark">{avg}</span>}
                      <Badge tone={st.done ? "green" : "maroon"}>{st.done ? "مكتمل" : `ناقص — ${st.label}`}</Badge>
                      {!st.done && !sent && (
                        <button type="button" onClick={() => setAt(i)} className="text-xs font-bold text-maroon underline">
                          أكمله
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {!sent && (
              <>
                {tried && !allDone && <p className="mt-3 text-sm font-bold text-maroon">أكمل كل الأقسام قبل الإرسال: كل بند بدرجة، وملاحظة تحت 3، وجواب واحد على الأقل في «خلاصة موسمك».</p>}
                <Button size="lg" className="mt-5" onClick={() => save(true)} disabled={!op.open}>
                  <Send className="size-5" /> إرسال التقييم الذاتي
                </Button>
              </>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm font-bold text-gold-dark">
              القسم {at + 1} من {sections.length}
            </p>
            <h2 className="font-display text-2xl font-bold text-green-dark">{current.title}</h2>
            <p className="mt-1 leading-7 text-ink-soft">{current.intro}</p>
            <div className="mt-5">
              {current.items ? (
                <StageScoresForm stages={current.items} value={value(current.key)} onChange={(v) => setScores((x) => ({ ...x, [current.key]: v }))} readOnly={sent} tried={tried} />
              ) : (
                <div className="space-y-4">
                  {current.questions!.map((q) => (
                    <label key={q.key} className="block">
                      <span className="block font-bold">{q.label}</span>
                      <span className="mb-1 block text-xs text-hint">{q.hint}</span>
                      <textarea rows={3} value={sent ? (saved?.answers?.[q.key] ?? "") : (answers[q.key] ?? "")} readOnly={sent} onChange={(e) => setAnswers((x) => ({ ...x, [q.key]: e.target.value }))} aria-label={q.label} className="w-full rounded-2xl border-2 border-gold/40 p-3 leading-7 outline-none focus:border-green-light" />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={() => setAt((x) => Math.max(0, x - 1))} disabled={at === 0}>
                <ArrowRight className="size-4" /> السابق
              </Button>
              <Button onClick={() => setAt((x) => x + 1)}>
                {at === sections.length - 1 ? "المراجعة والإرسال" : `التالي: ${sections[at + 1].title}`} <ArrowLeft className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── His result ─────────────────────────

/**
 * «نتيجتي»: the two parts of his evaluation that are adopted, side by side — what he gave himself and what the
 * staff gave him — never mixed into one number; then each stage with the gaps pointed out, and his objection to
 * the staff's evaluation (in its window) with the administration's decision. He sees averages, never who scored him.
 */
export function EvaluationResultView({ id }: { id: string }) {
  const peer = useOperation("peer-evaluation");
  const r = useEvaluationOf(id);
  if (!r) return null;
  const gaps = r.stages.filter((x) => x.gap);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { k: "تقييمي لنفسي", v: r.selfAvg, hint: r.self?.submittedAt ? "متوسط كل ما قيّمت به نفسك في أقسام التقييم الذاتي" : "لم ترسل تقييمك الذاتي بعد" },
          { k: "تقييم الموظفين لي", v: r.staffAvg, hint: r.staffCount ? `متوسط ${r.staffCount === 1 ? "مقيّم واحد" : r.staffCount === 2 ? "مقيّمَين" : `${r.staffCount} مقيّمين`}: إدارة الإداريين وموظفو البعثة الذين كانوا مع تكتلك` : `يُفتح تقييم الموظفين ${rangeLabel(peer.start, peer.end)}` },
        ].map((x, i) => (
          <Card key={x.k} className={cn("text-center md:p-7", i === 1 && "border-green-light/40 bg-green-light/5")}>
            <p className="text-sm font-bold text-hint">{x.k}</p>
            <p className="mt-2 font-display text-6xl font-bold text-green-dark">{x.v ?? "—"}</p>
            <p className="text-sm text-hint">من 5</p>
            <p className="mt-3 text-xs leading-6 text-ink-soft">{x.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="md:p-7">
        <h3 className="font-display text-xl font-bold text-green-dark">مرحلة مرحلة</h3>
        <p className="mt-1 text-sm text-ink-soft">تقييمك لنفسك في كل مرحلة بجانب متوسط ما أعطاك الموظفون. يُشار إلى كل مرحلة بينها فرق نقطة أو أكثر.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-xs text-hint">
                <th className="p-2 text-start font-semibold">المرحلة</th>
                <th className="p-2 font-semibold">تقييمي</th>
                <th className="p-2 font-semibold">الموظفون</th>
              </tr>
            </thead>
            <tbody>
              {r.stages.map((x) => (
                <tr key={x.key} className={cn("border-t border-gold/20", x.gap && "bg-gold/15")}>
                  <td className="p-2 font-semibold text-ink">
                    {x.label}
                    {x.gap && <AlertTriangle className="ms-1 inline size-4 text-maroon" aria-label="فرق نقطة أو أكثر" />}
                  </td>
                  <td className="p-2 text-center tabular-nums">{x.self ?? "—"}</td>
                  <td className="p-2 text-center font-bold tabular-nums text-green-dark">{x.staff ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {gaps.length > 0 && <p className="mt-3 text-xs font-bold text-maroon">في {gaps.length} {gaps.length === 1 ? "مرحلة" : "مراحل"} فرق نقطة أو أكثر بين تقييمك وتقييم الموظفين: {gaps.map((g) => g.label).join("، ")}.</p>}
      </Card>

      <Objection id={id} />
    </div>
  );
}

/** His objection to the staff's evaluation: in its window, once the staff have rated him; then its decision */
function Objection({ id }: { id: string }) {
  const toast = useToast();
  const op = useOperation("evaluation-objection");
  const r = useEvaluationOf(id)!;
  const [stages, setStages] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const o = r.objection;
  const label = (k: string) => r.stages.find((x) => x.key === k)?.label ?? k;

  if (o) {
    return (
      <Card className={cn("md:p-7", o.status === "accepted" ? "border-green-light/40" : o.status === "rejected" ? "border-maroon/30" : "border-gold/50")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
            <MessageSquareWarning className="size-5 text-gold-dark" /> اعتراضي على تقييم الموظفين
          </h3>
          <Badge tone={o.status === "accepted" ? "green" : o.status === "rejected" ? "maroon" : "gold"}>{o.status === "accepted" ? "قُبل — يُعاد التقييم" : o.status === "rejected" ? "رُفض" : "عند إدارة الإداريين"}</Badge>
        </div>
        <p className="mt-3 text-sm text-ink-soft">المراحل: {o.stages.map(label).join("، ")}</p>
        <p className="mt-2 rounded-2xl bg-sand p-3 leading-7">{o.reason}</p>
        {o.reply && (
          <p className="mt-3 rounded-2xl bg-green-light/10 p-3 text-sm leading-7">
            <b>رد الإدارة ({o.decidedBy}):</b> {o.reply}
          </p>
        )}
      </Card>
    );
  }
  if (!r.staffCount) return null;
  if (!op.open) {
    return (
      <Card className="md:p-6">
        <p className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <span>
            <b className="text-green-dark">{op.label}</b> — {rangeLabel(op.start, op.end)}: {op.status === "upcoming" ? "لك أن تعترض على تقييم الموظفين حين تُفتح." : "أُغلقت مدة الاعتراض."}
          </span>
          {op.status === "upcoming" && <DemoJump state={op} />}
        </p>
      </Card>
    );
  }
  const send = () => {
    setTried(true);
    if (!stages.length || reason.trim().length < 10) return;
    actions.objectToEvaluation(id, { stages, reason: reason.trim() });
    logAdmin(id, "اعتراض على تقييم الموظفين", stages.map(label).join("، "), reason.trim());
    toast({ title: "أُرسل اعتراضك", body: "تنظر فيه إدارة الإداريين، ويصلك قرارها هنا.", icon: "📨", tone: "info" });
  };
  return (
    <Card className="md:p-7">
      <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
        <MessageSquareWarning className="size-5 text-gold-dark" /> الاعتراض على تقييم الموظفين
      </h3>
      <p className="mt-1 text-sm leading-7 text-ink-soft">إن رأيت أن تقييم الموظفين لك في مرحلة لم يكن منصفاً، اخترها واكتب سببك. تنظر فيه إدارة الإداريين: تقبله وتعيد التقييم، أو ترفضه بردّها. تعترض مرة واحدة، حتى {rangeLabel(op.end, op.end)}.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {r.stages.filter((x) => x.staff !== null).map((x) => (
          <button key={x.key} type="button" aria-pressed={stages.includes(x.key)} onClick={() => setStages((s) => (s.includes(x.key) ? s.filter((k) => k !== x.key) : [...s, x.key]))} className={cn("rounded-full border-2 px-3 py-1.5 text-sm font-bold transition", stages.includes(x.key) ? "border-green-dark bg-green-dark text-white" : "border-gold/50 text-ink-soft hover:border-green-dark/40")}>
            {x.label} — {x.staff}
          </button>
        ))}
      </div>
      <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب الاعتراض" placeholder="ما الذي حدث فعلاً في هذه المراحل؟ ومن يشهد عليه؟" className="mt-4 w-full rounded-2xl border-2 border-gold/40 p-3 leading-7 outline-none focus:border-green-light" />
      {tried && (!stages.length || reason.trim().length < 10) && <p className="mt-2 text-sm font-bold text-maroon">{!stages.length ? "اختر مرحلة واحدة على الأقل." : "اكتب سبب اعتراضك (10 أحرف على الأقل)."}</p>}
      <Button className="mt-4" onClick={send}>
        <Send className="size-4" /> إرسال الاعتراض
      </Button>
    </Card>
  );
}
