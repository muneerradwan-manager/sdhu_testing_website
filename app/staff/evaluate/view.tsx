"use client";

import { ArrowRight, CheckCircle2, EyeOff, MapPin, MessageSquareWarning, Star, UserRound, UserX, UsersRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { DemoJump } from "@/components/app/operation-closed";
import { rangeLabel, useOperation } from "@/lib/operations";
import { CURRENT_SEASON, useEmployees, useOpFiles, usePlaces } from "@/lib/ops";
import type { StaffUser } from "@/lib/staff";
import { actions, useStore, type Evidence, type StageScores } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { SELF_ROLE_LABEL, avgOf, evaluateesOfCluster, raterKey, round1, selfSections, staffPlacesOf, type Evaluatee } from "@/app/administrator/_lib/evaluation";
import { useClusterRequests } from "@/app/administrator/_lib/formation";
import { EvidencePicker, EvidenceView } from "@/app/administrator/_components/evidence";
import { StageScoresForm, cleanScores, scoresReady } from "@/app/administrator/_components/stage-scores";
import { can, Empty, Gate, PageHeader, stamp, useStaffUser } from "../_components/kit";
import { SimulateEvaluation } from "../_components/simulate-evaluation";

/**
 * What a staff member rates after the season: the cluster heads (each rated as his cluster), the groups' heads (each as
 * his group) and the guides of every cluster that lived where he was posted — a tower, a camp, a hotel in Madinah — or,
 * for the flights' supervisors, of every cluster. And the stages he saw: the Makkah hotel's staff rate «مكة المكرمة»,
 * Madinah's «المدينة المنورة», the camps' «المشاعر», the flights' «المطار» and «السفر».
 */
export function useEvaluatees(user: StaffUser | null) {
  const employee = useEmployees().find((e) => e.staffId === user?.id);
  const files = useOpFiles();
  const places = usePlaces();
  const requests = useClusterRequests();
  return useMemo(() => {
    if (!employee) return { places: [], items: [] as Evaluatee[] };
    const approved = requests.filter((r) => r.status === "approved" && !r.archived);
    const mine = staffPlacesOf(employee.id, files, places, CURRENT_SEASON, approved.map((r) => r.cluster.id));
    const byId = new Map<string, Evaluatee>();
    for (const pl of mine)
      for (const cid of pl.clusters) {
        const r = approved.find((x) => x.cluster.id === cid);
        if (!r) continue;
        for (const x of evaluateesOfCluster(cid, r.cluster.name, r.headId, r.headName, r.cluster)) {
          const had = byId.get(x.id);
          byId.set(x.id, had ? { ...had, stages: [...new Set([...had.stages, ...pl.stages])], place: had.place.includes(pl.place) ? had.place : `${had.place}، ${pl.place}` } : { ...x, place: pl.place, stages: [...pl.stages] });
        }
      }
    return { places: mine, items: [...byId.values()] };
  }, [employee, files, places, requests]);
}

const KINDS: { roles: Evaluatee["role"][]; title: string; icon: ReactNode }[] = [
  { roles: ["cluster-head"], title: "رئيس التكتل — تقييمه تقييم للتكتل", icon: <UserRound className="size-4" /> },
  { roles: ["group-head"], title: "رؤساء المجموعات — تقييم كل منهم تقييم لمجموعته", icon: <UsersRound className="size-4" /> },
  { roles: ["guide-m", "guide-f"], title: "الموجّهون والموجّهات", icon: <Star className="size-4" /> },
];

/** Viewing needs `evaluate.evaluations.GET`; rating, `.PUT` while the operation is open */
export function EvaluateView() {
  return (
    <Gate perms={["evaluate.evaluations.GET"]}>
      <Evaluate />
    </Gate>
  );
}

/** What a rater has of an evaluatee: his own rating, found by the key only he can compute */
const useMine = (id: string, user: StaffUser) => useStore((s) => s.peerEvaluations[id]?.[raterKey(user.id)]);

function Evaluate() {
  const user = useStaffUser()!;
  const op = useOperation("peer-evaluation");
  const { places, items } = useEvaluatees(user);
  const peers = useStore((s) => s.peerEvaluations);
  const [open, setOpen] = useState<string | null>(null);
  const me = raterKey(user.id);
  const one = items.find((x) => x.id === open);
  const done = items.filter((x) => peers[x.id]?.[me]).length;

  if (one) return <EvaluateOne who={one} onBack={() => setOpen(null)} editable={op.open && can(user, "evaluate.evaluations.PUT")} />;
  const clusters = [...new Set(items.map((x) => x.clusterId))];

  return (
    <div>
      <PageHeader
        eyebrow={user.title}
        icon={<Star />}
        title="تقييم الإداريين"
        description="بالتوازي مع تقييمهم لأنفسهم: تقيّم من كنت معهم في ملفك التشغيلي — رئيس التكتل، ورؤساء المجموعات، والموجّهين — بالأسئلة نفسها التي يجيبون هم عنها لصفاتهم، في المراحل التي رأيتها."
      />
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-gold/10 p-4 text-sm leading-7 text-white/85 ring-1 ring-gold/30">
        <EyeOff className="mt-1 size-4 shrink-0 text-gold" /> هويتك سرّية عن الإداري وعن الإدارة: لا يعرفان من قيّم. وتعرفها لجنة التقييم وحدها، لتصل إليك إن استدعتك.
      </p>
      <div className={cn("mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1", op.open ? "bg-green-light/15 ring-green-light/40" : "bg-white/[.06] ring-white/10")}>
        <p className="text-sm text-white/85">
          <b className="text-gold">{op.label}</b> — {rangeLabel(op.start, op.end)}: {op.open ? "مفتوحة الآن." : op.status === "upcoming" ? "لم تُفتح بعد." : "أُغلقت."}
        </p>
        {!op.open && <DemoJump state={op} />}
      </div>
      <SimulateEvaluation className="mb-5" />
      {places.length === 0 ? (
        <Empty icon={<UserX />} title="لا إداريين في مواقعك" text="تقيّم من سكنت معه تكتلات في فندق أو مخيم فُرزت عليه، أو كل التكتلات إن كنت من مشرفي الطيران. مواقعك في «ملفاتي التشغيلية»." />
      ) : (
        <div className="space-y-6">
          <p className="flex flex-wrap gap-2 text-sm text-white/75">
            <MapPin className="size-4 text-gold" />
            {[...new Set(places.map((p) => p.place))].join("، ")} — قيّمت {done} من {items.length}
          </p>
          {clusters.map((cid) => {
            const list = items.filter((x) => x.clusterId === cid);
            return (
              <section key={cid} className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
                <h2 className="font-display text-xl font-bold text-gold">{list[0].clusterName}</h2>
                {KINDS.map((k) => {
                  const of = list.filter((x) => k.roles.includes(x.role));
                  if (!of.length) return null;
                  return (
                    <div key={k.title} className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white/80">
                        {k.icon} {k.title} ({of.length})
                      </p>
                      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {of.map((x) => {
                          const mine = peers[x.id]?.[me];
                          return (
                            <li key={x.id}>
                              <button type="button" onClick={() => setOpen(x.id)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl p-3 text-start ring-1 transition", mine ? "bg-green-light/15 ring-green-light/40" : "bg-white/[.06] ring-white/10 hover:ring-gold/50")}>
                                <span className="min-w-0">
                                  <span className="block truncate font-bold text-white">{x.name}</span>
                                  <span className="block truncate text-xs text-white/60">{x.title}</span>
                                </span>
                                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", mine ? "bg-green-light text-white" : "bg-white/10 text-white/70")}>{mine ? round1(avgOf(mine.stages)) : "لم يُقيَّم"}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * One administrator, rated with the questions of his role in each stage the rater saw — the same he answers about himself —
 * and, once he objects, the objection and the rater's answer to it.
 */
function EvaluateOne({ who, onBack, editable }: { who: Evaluatee; onBack: () => void; editable: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const stages = useEvaluationStages();
  const saved = useMine(who.id, user);
  const sections = useMemo(() => selfSections(stages, who.role).filter((x) => x.items && who.stages.includes(x.key)), [stages, who.role, who.stages]);
  const [scores, setScores] = useState<Record<string, StageScores>>(() => Object.fromEntries(sections.map((x) => [x.key, saved?.sections?.[x.key] ?? {}])));
  const [note, setNote] = useState(saved?.note ?? "");
  const [tried, setTried] = useState(false);
  // A stage started must be finished: every question scored, and a note under every score below 3
  const states = sections.map((x) => ({ x, v: scores[x.key] ?? {}, r: scoresReady(x.items!, scores[x.key] ?? {}, true), started: Object.values(scores[x.key] ?? {}).some((q) => q.score > 0) }));
  const started = states.filter((s) => s.started);
  const ready = started.length > 0 && started.every((s) => s.r.ok);
  const what = who.role === "cluster-head" ? "التكتل" : who.role === "group-head" ? "المجموعة" : who.role === "guide-f" ? "الموجّهة" : "الموجّه";

  const save = () => {
    setTried(true);
    if (!editable || !ready) return;
    const data = started.map((s) => ({ key: s.x.key, answers: cleanScores(s.v) }));
    const stageScores: StageScores = Object.fromEntries(data.flatMap((d) => (avgOf(d.answers) === null ? [] : [[d.key, { score: round1(avgOf(d.answers))! }]])));
    actions.setPeerEvaluation(who.id, raterKey(user.id), { by: { id: user.id, name: user.name, title: user.title, place: who.place }, stages: stageScores, sections: Object.fromEntries(data.map((d) => [d.key, d.answers])), note: note.trim() || undefined, at: stamp() });
    // The audit trail says a rating was made and of whom, never by whom: the committee alone reads who rated, on its own screen
    actions.logEvent({ actor: "مقيِّم", role: "هويته سرّية", action: `تقييم ${what} بعد الموسم`, target: `${who.name} — ${who.clusterName}`, after: `${round1(avgOf(stageScores))} من 5 — ${data.length} مراحل`, system: "admins", area: "evaluation", ref: who.id });
    toast({ title: `حُفظ تقييم ${who.name}`, body: `يدخل تقييماً ${what === "التكتل" || what === "المجموعة" ? `لـ${what}` : "له"}. لا يعرف الإداري ولا الإدارة أنك أنت من قيّم.`, icon: "⭐", tone: "success" });
    onBack();
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-bold text-gold hover:underline">
        <ArrowRight className="size-4" /> تقييم الإداريين
      </button>
      <PageHeader
        eyebrow={`${who.clusterName} — ${who.place}`}
        icon={<Star />}
        title={`تقييم ${who.name}`}
        description={`${who.title} — ${SELF_ROLE_LABEL[who.role]}. ${who.role === "cluster-head" || who.role === "group-head" ? `تقييمه تقييم لـ${what}. ` : ""}الأسئلة نفسها التي يجيب عنها لصفته، في المراحل التي رأيتها فقط.`}
      />
      <div className="space-y-6">
        {sections.map((x) => (
          <section key={x.key} className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
            <h2 className="font-display text-lg font-bold text-gold">{x.title}</h2>
            <p className="mb-3 text-xs leading-6 text-white/60">{x.intro}</p>
            <StageScoresForm stages={x.items!} value={scores[x.key] ?? {}} onChange={(v) => setScores((s) => ({ ...s, [x.key]: v }))} readOnly={!editable} tried={tried} tone="dark" />
          </section>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block font-bold text-white">ملاحظة عامة (اختيارية)</span>
        <textarea rows={2} value={note} readOnly={!editable} onChange={(e) => setNote(e.target.value)} aria-label="ملاحظة عامة" className="w-full rounded-xl border-2 border-white/15 bg-white/5 p-3 text-white outline-none focus:border-gold" />
      </label>
      {tried && !ready && <p className="mt-3 text-sm font-bold text-gold">{started.length ? "أكمل كل بنود كل مرحلة بدأتها، واكتب ملاحظة لكل درجة أقل من 3." : "قيّم مرحلة واحدة على الأقل."}</p>}
      {editable && (
        <Button variant="gold" className="mt-4" onClick={save}>
          <CheckCircle2 className="size-4" /> حفظ التقييم
        </Button>
      )}
      <Objection who={who} />
    </div>
  );
}

/**
 * His objection to the staff's evaluation, if he made one over a stage this rater scored: the reason and his evidence,
 * and this rater's answer with his own — in the objection window. The administrator is known to him; he is not known to the administrator.
 */
function Objection({ who }: { who: Evaluatee }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const win = useOperation("evaluation-objection");
  const stages = useEvaluationStages();
  const objection = useStore((s) => s.evaluationObjections[who.id]);
  const mine = useMine(who.id, user);
  const key = raterKey(user.id);
  const reply = objection?.replies?.[key];
  const [text, setText] = useState(reply?.text ?? "");
  const [evidence, setEvidence] = useState<Evidence[]>(reply?.evidence ?? []);
  const [tried, setTried] = useState(false);
  // Only the stages he objected to that this rater also scored concern him
  const concerned = (objection?.stages ?? []).filter((k) => mine?.stages[k]);
  if (!objection || !mine || concerned.length === 0) return null;
  const label = (k: string) => stages.find((x) => x.key === k)?.label ?? k;
  const editable = win.open && can(user, "evaluate.evaluations.PUT");
  const send = () => {
    setTried(true);
    if (text.trim().length < 10) return;
    actions.replyToObjection(who.id, key, { by: { id: user.id, name: user.name, title: user.title, place: who.place }, text: text.trim(), evidence: evidence.length ? evidence : undefined, at: stamp() });
    actions.logEvent({ actor: "مقيِّم", role: "هويته سرّية", action: "ردّ على اعتراض على التقييم", target: `${who.name} — ${who.clusterName}`, system: "admins", area: "evaluation", ref: who.id });
    toast({ title: "أُرسل ردّك إلى لجنة التقييم", body: "تقرؤه اللجنة مع أدلتك.", icon: "📨", tone: "info" });
  };
  return (
    <section className="mt-8 rounded-2xl bg-maroon/25 p-4 ring-1 ring-gold/40">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gold">
        <MessageSquareWarning className="size-5" /> اعترض {who.name} على تقييمك
      </h2>
      <p className="mt-1 text-sm text-white/75">المراحل: {concerned.map(label).join("، ")}</p>
      <p className="mt-3 rounded-xl bg-black/20 p-3 leading-7 text-white">{objection.reason}</p>
      <EvidenceView items={objection.evidence} tone="dark" />
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="font-bold text-white">ردّك</p>
        <p className="mb-2 text-xs text-white/60">{win.open ? `تردّ بكلماتك وأدلتك في مدة الاعتراض: ${rangeLabel(win.start, win.end)}. تقرأ اللجنة الطرفين وتقرّر، وهويتك سرّية عن الإداري.` : win.status === "upcoming" ? "تردّ حين تُفتح مدة الاعتراض." : "أُغلقت مدة الردّ."}</p>
        <textarea rows={3} value={text} readOnly={!editable} onChange={(e) => setText(e.target.value)} aria-label="ردّك على الاعتراض" placeholder="ما الذي رأيته فعلاً؟ ومن يشهد عليه؟" className={cn("w-full rounded-xl border-2 bg-white/5 p-3 text-white outline-none focus:border-gold", tried && text.trim().length < 10 ? "border-gold" : "border-white/15")} />
        <div className="mt-3">{editable ? <EvidencePicker value={evidence} onChange={setEvidence} tone="dark" /> : <EvidenceView items={evidence} tone="dark" />}</div>
        {tried && text.trim().length < 10 && <p className="mt-2 text-sm font-bold text-gold">اكتب ردّك (10 أحرف على الأقل).</p>}
        {editable && (
          <Button variant="gold" className="mt-3" onClick={send}>
            {reply ? "تحديث ردّي" : "إرسال ردّي"}
          </Button>
        )}
      </div>
    </section>
  );
}
