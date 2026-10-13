"use client";

import { ArrowRight, Building2, CheckCircle2, MapPin, Star, UserRound, UsersRound, UserX } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { DemoJump } from "@/components/app/operation-closed";
import { groupName } from "@/lib/groups";
import { rangeLabel, useOperation } from "@/lib/operations";
import { CURRENT_SEASON, useEmployees, useOpFiles, usePlaces } from "@/lib/ops";
import type { StaffUser } from "@/lib/staff";
import { actions, useStore, type StageScores } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { acceptedGroups } from "@/app/administrator/_lib/cluster";
import { avgOf, cadreMembers, round1, staffPlacesOf } from "@/app/administrator/_lib/evaluation";
import { useClusterRequests } from "@/app/administrator/_lib/formation";
import { StageScoresForm, cleanScores, scoresReady } from "@/app/administrator/_components/stage-scores";
import { Empty, PageHeader, logAs, stamp, useStaffUser } from "../_components/kit";

/**
 * Something a staff member rates after the season: a cluster as a whole («c-<cluster>»), one of its groups
 * («g-<group>»), or one of its administrators (his id) — with where the staff member saw it
 */
export type Evaluatee = { key: string; kind: "cluster" | "group" | "admin"; title: string; subtitle: string; clusterId: string; clusterName: string; place: string };

/**
 * What a staff member rates after the season: every cluster that lived in the tower or the camp he was posted to
 * (a sector's or a centre's people: all of its towers' or camps'), each of its groups, and each of its
 * administrators — from the season's operational files and the clusters' approved requests.
 */
export function useEvaluatees(user: StaffUser | null) {
  const employee = useEmployees().find((e) => e.staffId === user?.id);
  const files = useOpFiles();
  const places = usePlaces();
  const requests = useClusterRequests();
  return useMemo(() => {
    if (!employee) return { places: [], items: [] as Evaluatee[] };
    const mine = staffPlacesOf(employee.id, files, places, CURRENT_SEASON);
    const items: Evaluatee[] = [];
    const seen = new Set<string>();
    const add = (x: Evaluatee) => {
      if (seen.has(x.key)) return;
      seen.add(x.key);
      items.push(x);
    };
    for (const pl of mine)
      for (const cid of pl.clusters) {
        const r = requests.find((x) => x.cluster.id === cid && x.status === "approved");
        if (!r) continue;
        const base = { clusterId: cid, clusterName: r.cluster.name, place: pl.place };
        const groups = acceptedGroups(r.cluster);
        add({ ...base, key: `c-${cid}`, kind: "cluster", title: r.cluster.name, subtitle: `التكتل كاملاً — رئيسه ${r.headName}، ${groups.length} مجموعات` });
        for (const g of groups) add({ ...base, key: `g-${g.number}`, kind: "group", title: groupName(g.number), subtitle: `رئيسها ${g.name}` });
        for (const m of cadreMembers(r.headId, r.headName, r.cluster)) add({ ...base, key: m.id, kind: "admin", title: m.name, subtitle: `${m.posts.join("، ")}${m.groups.length ? ` — ${m.groups.map(groupName).join("، ")}` : ""}` });
      }
    return { places: mine, items };
  }, [employee, files, places, requests]);
}

const KINDS: { kind: Evaluatee["kind"]; title: string; icon: ReactNode }[] = [
  { kind: "cluster", title: "التكتل", icon: <Building2 className="size-4" /> },
  { kind: "group", title: "مجموعاته", icon: <UsersRound className="size-4" /> },
  { kind: "admin", title: "إداريوه", icon: <UserRound className="size-4" /> },
];

export function EvaluateView() {
  const user = useStaffUser()!;
  const op = useOperation("peer-evaluation");
  const { places, items } = useEvaluatees(user);
  const peers = useStore((s) => s.peerEvaluations);
  const [open, setOpen] = useState<string | null>(null);
  const mineKey = `staff:${user.id}`;
  const one = items.find((x) => x.key === open);
  const done = items.filter((x) => peers[x.key]?.[mineKey]).length;

  if (one) return <EvaluateOne who={one} onBack={() => setOpen(null)} editable={op.open} />;
  const clusters = [...new Set(items.map((x) => x.clusterId))];

  return (
    <div>
      <PageHeader
        eyebrow={user.title}
        icon={<Star />}
        title="تقييم الإداريين"
        description="بعد انتهاء التقييم الذاتي: تقيّم التكتلات التي سكنت في البرج أو المخيم الذي فُرزت عليه — كل تكتل كاملاً، وكل مجموعة منه، وكل إداري فيه — مرحلةً مرحلة، كما رأيت عملهم."
      />
      <div className={cn("mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ring-1", op.open ? "bg-green-light/15 ring-green-light/40" : "bg-white/[.06] ring-white/10")}>
        <p className="text-sm text-white/85">
          <b className="text-gold">{op.label}</b> — {rangeLabel(op.start, op.end)}: {op.open ? "مفتوحة الآن." : op.status === "upcoming" ? "لم تُفتح بعد." : "أُغلقت."}
        </p>
        {!op.open && <DemoJump state={op} />}
      </div>
      {places.length === 0 ? (
        <Empty icon={<UserX />} title="لا تكتلات في مواقعك" text="يقيّم الإداريين من فُرز على برج أو مخيم سكنت فيه تكتلات. مواقعك في «ملفاتي التشغيلية»." />
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
                <p className="text-xs text-white/60">في {list[0].place}</p>
                {KINDS.map((k) => {
                  const of = list.filter((x) => x.kind === k.kind);
                  if (!of.length) return null;
                  return (
                    <div key={k.kind} className="mt-4">
                      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white/80">
                        {k.icon} {k.title} ({of.length})
                      </p>
                      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {of.map((x) => {
                          const mine = peers[x.key]?.[mineKey];
                          return (
                            <li key={x.key}>
                              <button type="button" onClick={() => setOpen(x.key)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl p-3 text-start ring-1 transition", mine ? "bg-green-light/15 ring-green-light/40" : "bg-white/[.06] ring-white/10 hover:ring-gold/50")}>
                                <span className="min-w-0">
                                  <span className="block truncate font-bold text-white">{x.title}</span>
                                  <span className="block truncate text-xs text-white/60">{x.subtitle}</span>
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

function EvaluateOne({ who, onBack, editable }: { who: Evaluatee; onBack: () => void; editable: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const stages = useEvaluationStages();
  const mineKey = `staff:${user.id}`;
  const saved = useStore((s) => s.peerEvaluations[who.key]?.[mineKey]);
  const [draft, setDraft] = useState<StageScores>(saved?.stages ?? {});
  const [note, setNote] = useState(saved?.note ?? "");
  const [tried, setTried] = useState(false);
  const ready = scoresReady(stages, draft);
  const what = who.kind === "cluster" ? "التكتل" : who.kind === "group" ? "المجموعة" : "الإداري";

  const save = () => {
    setTried(true);
    if (!ready.ok) return;
    const now = cleanScores(draft);
    actions.setPeerEvaluation(who.key, mineKey, { kind: "staff", by: user.name, role: user.title, place: who.place, stages: now, note: note.trim() || undefined, at: stamp() });
    logAs(user, { action: `تقييم ${what} بعد الموسم`, target: `${who.title} — ${who.clusterName}`, after: `${round1(avgOf(now))} من 5 — ${Object.keys(now).length} مراحل`, detail: `${who.subtitle} — ${who.place}`, system: "admins", area: "evaluation", ref: who.key });
    toast({ title: `حُفظ تقييم ${who.title}`, body: who.kind === "admin" ? "يدخل في «تقييم الموظفين» من نتيجته. يرى الإداري المتوسط فقط، لا اسمك." : `يدخل في «تقييم الموظفين» من درجة ${what} في التصنيف.`, icon: "⭐", tone: "success" });
    onBack();
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-bold text-gold hover:underline">
        <ArrowRight className="size-4" /> تقييم الإداريين
      </button>
      <PageHeader eyebrow={`${who.clusterName} — ${who.place}`} icon={<Star />} title={`تقييم ${who.title}`} description={`${who.subtitle}. قيّم المراحل التي رأيت فيها عمل ${what}، واترك ما لم تره.`} />
      <StageScoresForm stages={stages} value={draft} onChange={setDraft} readOnly={!editable} tried={tried} tone="dark" />
      <label className="mt-4 block">
        <span className="mb-1 block font-bold text-white">ملاحظة عامة (اختيارية)</span>
        <textarea rows={2} value={note} readOnly={!editable} onChange={(e) => setNote(e.target.value)} aria-label="ملاحظة عامة" className="w-full rounded-xl border-2 border-white/15 bg-white/5 p-3 text-white outline-none focus:border-gold" />
      </label>
      {tried && !ready.ok && <p className="mt-3 text-sm font-bold text-gold">{ready.scored ? "اكتب ملاحظة لكل درجة أقل من 3." : "قيّم مرحلة واحدة على الأقل."}</p>}
      {editable && (
        <Button variant="gold" className="mt-4" onClick={save}>
          <CheckCircle2 className="size-4" /> حفظ التقييم
        </Button>
      )}
    </div>
  );
}
