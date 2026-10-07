"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BadgeCheck, Building2, Check, CircleDashed, ExternalLink, Gavel, Inbox, Lock, ShieldCheck, Shuffle, Timer, UserCheck, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { diffFields, fieldsOf } from "@/lib/cluster-profile";
import { groupName } from "@/lib/groups";
import { dayLabel, useOperation } from "@/lib/operations";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { DEPUTY_TITLE, POOLS, POOL_ORDER, decideCluster, distributeGroups, type ClusterRequest } from "@/app/administrator/_lib/formation";
import { CoordinatorTiersPanel } from "./coordinator-tiers";
import { Drawer, Empty, Panel, fmtDateTime, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip, InfoGrid } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { logAdmins, useAdminsDesk, type AdminsDesk } from "../desk";

/**
 * The clusters. Nobody is elected: any group head who meets the season's conditions files a request to form
 * a cluster in its dates — alongside the pilgrims joining the groups — and is its head from then on. He
 * invites the groups he wants, with their pilgrims, his deputy, and the cluster's guides, coordinators and
 * assistants, and assigns them to the groups. Once the deadline passes the holder decides: a complete
 * request is approved, an incomplete one excluded; then he distributes the groups left outside among the
 * approved clusters. After that, each head writes his cluster's programme, which reaches the pilgrims only
 * once the holder approves it.
 */
export function ClustersTab() {
  const desk = useAdminsDesk();
  const [open, setOpen] = useState<string | null>(null);
  const sheet = desk.requests.find((x) => x.cluster.id === open);

  return (
    <div className="space-y-6">
      <Deadline desk={desk} />
      <CoordinatorTiersPanel />
      <Requests desk={desk} onOpen={setOpen} />
      {(desk.approvedClusters.length > 0 || desk.excluded.length > 0) && <Distribution desk={desk} />}
      <Programmes desk={desk} />
      <SystemRecords system="admins" area="clusters" title="سجل التكتلات" />
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet?.cluster.name ?? ""}>
        {sheet && <RequestSheet x={sheet} />}
      </Drawer>
    </div>
  );
}

// ───────────────────────── The deadline ─────────────────────────

/** Where the requests stand against their dates, and the decision the deadline calls for */
function Deadline({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const op = useOperation("cluster-formation");
  const A = useSeason().administrators;
  const admins = useStore((s) => s.admins);
  const decisions = useStore((s) => s.formation.decisions);

  /** Every undecided request at once: the complete approved, the incomplete excluded with what it lacked */
  const decideAll = () => {
    let next = { ...decisions };
    for (const r of desk.undecided) {
      const status = r.complete ? "approved" : "excluded";
      const reason = r.complete ? undefined : r.checks.filter((c) => !c.ok).map((c) => c.label).join("، ");
      decideCluster(r, status, user.name, admins, next, reason);
      next = { ...next, [r.cluster.id]: { status, at: Date.now(), by: user.name, reason } };
      logAdmins(user, "clusters", { action: status === "approved" ? "اعتماد تكتل مكتمل" : "إقصاء تكتل ناقص", target: r.cluster.name, detail: reason ?? `${r.groups.length} مجموعات — رئيسه ${r.headName}`, ref: r.cluster.id, important: true });
    }
    toast({ title: "حُسمت طلبات التكتلات", body: `اعتُمد ${desk.undecided.filter((r) => r.complete).length}، وأُقصي ${desk.undecided.filter((r) => !r.complete).length}. وزّع مجموعات المُقصى.`, icon: "⚖️", tone: "gold" });
  };

  return (
    <Panel icon={<Timer />} title="طلبات تشكيل التكتلات وموعدها النهائي" action={<Chip tone={op.open ? "green" : desk.deadlinePassed ? "gold" : "muted"}>{op.open ? `مفتوحة حتى ${dayLabel(op.end)}` : desk.deadlinePassed ? `انتهت ${dayLabel(op.end)}` : `تفتح ${dayLabel(op.start)}`}</Chip>}>
      <p className="text-sm leading-7 text-white/75">
        لا انتخاب ولا عدد مسبق للتكتلات: يقدّم الطلبَ كل رئيس مجموعة رأس مجموعة {A.clusterHeadSeasons} مواسم متتالية بتقييم {A.clusterHeadMinRating} فأكثر. بعد الموعد النهائي يُعتمد كل طلب مكتمل ({A.clusterMinGroups} مجموعات على الأقل، و{DEPUTY_TITLE}، ولكل مجموعة موجّه ومنسق ومعاون)، ويُقصى الناقص وتوزَّع مجموعاته.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ["الطلبات", desk.requests.length],
          ["مكتملة الآن", desk.requests.filter((r) => r.complete).length],
          ["معتمدة", desk.approvedClusters.length],
          ["مُقصاة", desk.excluded.length],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-xs text-white/60">{k}</p>
            <p className="font-display text-2xl font-bold text-gold">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="gold" disabled={!desk.deadlinePassed || !desk.undecided.length} onClick={decideAll}>
          <Gavel className="size-4" /> اعتماد المكتمل وإقصاء الناقص ({desk.undecided.length})
        </Button>
        {!desk.deadlinePassed && <span className="text-xs text-white/60">يُتاح بعد الموعد النهائي {dayLabel(op.end, true)}: الطلبات أولية حتى ذلك اليوم.</span>}
      </div>
    </Panel>
  );
}

// ───────────────────────── The requests ─────────────────────────

function DecisionChip({ r }: { r: ClusterRequest }) {
  if (r.decision) return <Chip tone={r.decision.status === "approved" ? "green" : "maroon"}>{r.decision.status === "approved" ? "معتمد" : "مُقصى"}</Chip>;
  return <Chip tone={r.complete ? "green" : "gold"}>{r.complete ? "مكتمل — أولي" : `ناقص: ${r.checks.filter((c) => !c.ok).length}`}</Chip>;
}

function Requests({ desk, onOpen }: { desk: AdminsDesk; onOpen: (id: string) => void }) {
  return (
    <div id="requests" className="scroll-mt-24">
      <Panel icon={<Building2 />} title="الطلبات" action={<Chip tone="gold">{desk.requests.length}</Chip>}>
        {desk.requests.length === 0 ? (
          <Empty icon={<Inbox />} title="لا طلبات بعد" text="يقدّمها رؤساء المجموعات المستوفون في مدة تشكيل التكتلات." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {desk.requests.map((r) => {
              const pilgrims = r.groups.reduce((n, g) => n + g.pilgrims, 0);
              return (
                <li key={r.cluster.id}>
                  <button type="button" onClick={() => onOpen(r.cluster.id)} className={cn("w-full rounded-2xl p-4 text-right ring-1 transition hover:ring-gold/50", r.decision?.status === "excluded" ? "bg-maroon/15 ring-maroon/40" : "bg-white/5 ring-white/10")}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-xl font-bold text-gold">{r.cluster.name}</p>
                      <DecisionChip r={r} />
                    </div>
                    <p className="mt-1 text-sm text-white/85">الرئيس: {r.headName}{r.headGroup ? ` — ${groupName(r.headGroup)}` : ""}</p>
                    <p className="text-sm text-white/85">
                      <UserCheck className="mb-0.5 inline size-4 text-green-light" /> {DEPUTY_TITLE}: {r.cluster.deputy?.status === "accepted" ? r.cluster.deputy.name : <b className="text-gold">لم يقبل أحد بعد</b>}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <Chip tone="green">{r.groups.length} مجموعات</Chip>
                      <Chip>{formatNumber(pilgrims)} حاجاً</Chip>
                      {POOL_ORDER.map((k) => (
                        <span key={k}>
                          {POOLS[k].label}: {r.cluster.team[k].filter((x) => x.status === "accepted").length}
                        </span>
                      ))}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** One request whole: its checks, its groups with who serves each, its people, the decision, and its history */
function RequestSheet({ x }: { x: ClusterRequest }) {
  const user = useStaffUser()!;
  const desk = useAdminsDesk();
  const admins = useStore((s) => s.admins);
  const decisions = useStore((s) => s.formation.decisions);
  const c = x.cluster;
  const decide = (status: "approved" | "excluded") => {
    const reason = status === "excluded" ? x.checks.filter((k) => !k.ok).map((k) => k.label).join("، ") || "قرار الإدارة" : undefined;
    decideCluster(x, status, user.name, admins, decisions, reason);
    logAdmins(user, "clusters", { action: status === "approved" ? "اعتماد تكتل" : "إقصاء تكتل", target: c.name, detail: reason, ref: c.id, important: true });
  };
  return (
    <div className="space-y-5">
      <InfoGrid
        rows={[
          ["رئيس التكتل", `${x.headName}${x.headGroup ? ` — ${groupName(x.headGroup)}` : ""}`],
          [DEPUTY_TITLE, c.deputy ? `${c.deputy.name} — ${c.deputy.status === "accepted" ? "قبِل" : c.deputy.status === "declined" ? "اعتذر" : "لم يرد"}` : "لم يُدعَ"],
          ["المجموعات", `${x.groups.length} — ${formatNumber(x.groups.reduce((n, g) => n + g.pilgrims, 0))} حاجاً`],
          ["القرار", x.decision ? `${x.decision.status === "approved" ? "معتمد" : "مُقصى"} — ${x.decision.by}` : "أولي حتى الموعد النهائي"],
        ]}
      />
      <ul className="space-y-1.5 text-sm">
        {x.checks.map((k) => (
          <li key={k.key} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 ring-1", k.ok ? "bg-green-light/10 text-white ring-green-light/30" : "bg-maroon/20 text-white ring-maroon/40")}>
            {k.ok ? <Check className="mt-0.5 size-4 shrink-0 text-green-light" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-gold" />} {k.label}
          </li>
        ))}
      </ul>
      {!x.decision && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="gold" disabled={!desk.deadlinePassed || !x.complete} onClick={() => decide("approved")}>
            <BadgeCheck className="size-4" /> اعتماد
          </Button>
          <Button size="sm" variant="outline" className="border-white/25 text-white hover:bg-white/10" disabled={!desk.deadlinePassed} onClick={() => decide("excluded")}>
            <X className="size-4" /> إقصاء
          </Button>
          {!desk.deadlinePassed && <span className="self-center text-xs text-white/55">بعد الموعد النهائي</span>}
        </div>
      )}
      <ul className="space-y-2">
        {x.groups.map((g) => (
          <li key={g.number} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            <p className="flex flex-wrap items-center gap-2 font-bold text-white">
              <span className="grid size-9 place-items-center rounded-xl bg-gold/20 text-gold">
                <UsersRound className="size-4" />
              </span>
              <span>
                {groupName(g.number)} <span className="font-normal text-white/70">— {g.name}</span>
              </span>
              {g.distributed && <Chip tone="gold">وزّعتها الإدارة</Chip>}
              <span className="mr-auto text-sm tabular-nums text-white/75">
                {g.pilgrims} / {g.capacity}
              </span>
            </p>
            <p className="mt-1 text-xs text-white/60">{POOL_ORDER.map((k) => `${POOLS[k].one}: ${c.team[k].find((m) => m.status === "accepted" && m.id === c.posts[k][g.number])?.name ?? "—"}`).join(" · ")}</p>
          </li>
        ))}
      </ul>
      <RecordHistory system="admins" refId={c.id} />
    </div>
  );
}

// ───────────────────────── The distribution ─────────────────────────

/**
 * The groups left outside — from excluded requests, or that no request took — placed among the approved
 * clusters. The suggestion gives each group to the approved cluster with the fewest groups; the holder
 * changes any of them, then approves it once.
 */
function Distribution({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const formation = useStore((s) => s.formation);
  const suggestion = useMemo(() => {
    const load = new Map(desk.approvedClusters.map((r) => [r.cluster.id, r.groups.length]));
    return Object.fromEntries(
      desk.outside.map((g) => {
        const to = [...load.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
        if (to) load.set(to, (load.get(to) ?? 0) + 1);
        return [g.number, to ?? ""];
      }),
    ) as Record<number, string>;
  }, [desk.approvedClusters, desk.outside]);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const plan = { ...suggestion, ...picked };
  const ready = desk.outside.length > 0 && desk.outside.every((g) => plan[g.number]) && !desk.undecided.length;

  const approve = () => {
    const moves = Object.fromEntries(desk.outside.map((g) => [g.number, plan[g.number]]));
    distributeGroups(moves, desk.outside, user.name, admins, formation);
    logAdmins(user, "clusters", { action: "توزيع المجموعات على التكتلات المعتمدة", target: `${desk.outside.length} مجموعات`, detail: desk.outside.map((g) => `${groupName(g.number)} ← ${desk.approvedClusters.find((r) => r.cluster.id === plan[g.number])?.cluster.name}`).join("، "), important: true });
    toast({ title: "وُزّعت المجموعات", body: "يسند رئيس كل تكتل فريقه إلى مجموعاته الجديدة.", icon: "🔀", tone: "success" });
    setPicked({});
  };

  return (
    <div id="distribution" className="scroll-mt-24">
      <Panel icon={<Shuffle />} title="توزيع المجموعات خارج التكتلات" action={<Chip tone={desk.outside.length ? "gold" : "green"}>{desk.outside.length ? `${desk.outside.length} خارجها` : "كلها في تكتلات"}</Chip>}>
        {desk.undecided.length > 0 ? (
          <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">
            <Lock className="mb-0.5 inline size-4" /> يُوزَّع بعد حسم كل الطلبات.
          </p>
        ) : desk.outside.length === 0 ? (
          <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">{formation.distributedAt ? `وُزّعت بقرار ${formation.distributedBy}.` : "لا مجموعة خارج التكتلات المعتمدة."}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {desk.outside.map((g) => (
                <li key={g.number} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                    <UsersRound className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-bold text-white">
                      {groupName(g.number)} <span className="font-normal text-white/70">— {g.headName}</span>
                    </span>
                    <span className="block text-xs text-white/60">
                      {g.office} — {g.pilgrims}/{g.capacity} {g.from ? `— من ${g.from} المُقصى` : "— لم يأخذها طلب"}
                    </span>
                  </span>
                  <select
                    value={plan[g.number] ?? ""}
                    onChange={(e) => setPicked({ ...picked, [g.number]: e.target.value })}
                    aria-label={`تكتل ${groupName(g.number)}`}
                    className="h-10 min-w-44 rounded-xl border border-white/20 bg-green-dark px-2 text-sm text-white"
                  >
                    <option value="">— اختر تكتلاً —</option>
                    {desk.approvedClusters.map((r) => (
                      <option key={r.cluster.id} value={r.cluster.id}>
                        {r.cluster.name} ({r.groups.length})
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <Button className="mt-4" variant="gold" disabled={!ready} onClick={approve}>
              <Shuffle className="size-4" /> اعتماد التوزيع
            </Button>
          </>
        )}
      </Panel>
    </div>
  );
}

// ───────────────────────── The clusters' programmes ─────────────────────────

const REASONS = ["الوصف لا يطابق العقد الموقّع مع الفندق", "المسافة المذكورة غير دقيقة", "خدمة موصوفة دون تعاقد يثبتها", "صياغة دعائية لا تصف خدمة"];

/**
 * A cluster's public page carries the administration's approval, so the head writes his programme and
 * the holder decides: what changed, from what to what, and a decision with a reason. Nothing reaches the
 * pilgrims before it is approved.
 */
function Programmes({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const published = desk.programmes.filter((x) => x.state?.approved);

  const decide = (slug: string, name: string, decision: "approved" | "rejected", why?: string) => {
    actions.decideClusterProfile(slug, decision, user.name, why);
    logAdmins(user, "clusters", { action: decision === "approved" ? "اعتماد برنامج تكتل ونشره للحجاج" : "إعادة برنامج تكتل إلى رئيسه", target: name, detail: why, ref: slug });
    toast(
      decision === "approved"
        ? { title: "اعتُمد البرنامج ونُشر", body: `${name} — يراه الحجاج الآن في دليل الخدمات.`, tone: "success", icon: "✅" }
        : { title: "أُعيد إلى رئيس التكتل", body: why, tone: "info", icon: "↩️" },
    );
    setRejecting(null);
  };

  return (
    <div id="programmes" className="scroll-mt-24 space-y-6">
      <Panel icon={<Inbox />} title="برامج تنتظر اعتمادك" action={<Chip tone={desk.pendingProgrammes.length ? "gold" : "green"}>{desk.pendingProgrammes.length}</Chip>}>
        {desk.pendingProgrammes.length === 0 ? (
          <Empty icon={<ShieldCheck />} title="لا تعديلات معلّقة" text="حين يعدّل رئيس تكتل صفحته العامة في دليل الخدمات يصل التعديل هنا قبل أن يراه أحد." />
        ) : (
          <ul className="space-y-4">
            {desk.pendingProgrammes.map(({ cluster: c, state }, i) => {
              const live = state!.approved ? { ...fieldsOf(c), ...state!.approved.fields } : fieldsOf(c);
              const changes = diffFields(live, state!.pending!.fields);
              return (
                <motion.li key={c.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-bold text-white">{c.name}</p>
                      <p className="text-xs text-white/65">
                        أرسله {state!.pending!.by} — {fmtDateTime(state!.pending!.at)} — {changes.length} حقلاً
                      </p>
                      {state!.pending!.note && <p className="mt-1 text-sm text-gold">ملاحظته: {state!.pending!.note}</p>}
                    </div>
                    <Link href={`/verify/clusters/${c.slug}`} target="_blank" className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/20">
                      <ExternalLink className="size-3.5" /> الصفحة الحالية
                    </Link>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {changes.map((ch) => (
                      <li key={ch.key} className="rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10">
                        <p className="font-bold text-gold">{ch.label}</p>
                        <p className="mt-1 text-white/50 line-through">{ch.before || "—"}</p>
                        <p className="font-semibold text-white">{ch.after || "—"}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="gold" onClick={() => decide(c.slug, c.name, "approved")}>
                      <BadgeCheck className="size-4" /> اعتماد ونشر
                    </Button>
                    <Button size="sm" variant="glass" onClick={() => setRejecting(c.slug)}>
                      <X className="size-4" /> إعادة مع السبب
                    </Button>
                  </div>
                  <div className="mt-4">
                    <RecordHistory system="admins" refId={c.slug} />
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </Panel>

      {published.length > 0 && (
        <Panel icon={<BadgeCheck />} title="البرامج المنشورة" action={<Chip tone="green">{published.length}</Chip>}>
          <ul className="grid gap-3 md:grid-cols-2">
            {published.map(({ cluster: c, state }) => (
              <li key={c.slug} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="font-bold text-white">{c.name}</p>
                <p className="mt-1 text-xs text-white/65">
                  اعتمده {state!.approved!.approvedBy} — {fmtDateTime(state!.approved!.approvedAt)}
                </p>
                <p className="mt-1 text-xs text-white/50">كتبه {state!.approved!.by}</p>
                <Link href={`/verify/clusters/${c.slug}`} target="_blank" className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-gold">
                  <ExternalLink className="size-3.5" /> الصفحة كما يراها الحاج
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {rejecting && (
          <div>
            <p className="text-xs font-bold text-gold">إعادة البرنامج إلى رئيس التكتل</p>
            <h3 className="mt-1 font-display text-xl font-bold">{desk.programmes.find((x) => x.cluster.slug === rejecting)?.cluster.name}</h3>
            <p className="mt-1 text-sm leading-7 text-white/70">يصل السبب إليه ليعدّل ويعيد الإرسال. الصفحة تبقى على نسختها المعتمدة.</p>
            <div className="mt-4 space-y-2">
              {REASONS.map((r) => (
                <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-sm font-semibold ring-1", reason === r ? "bg-gold/15 ring-gold/50" : "bg-white/5 ring-white/15")}>
                  <input type="radio" name="why" checked={reason === r} onChange={() => setReason(r)} className="accent-[#D9C89E]" /> {r}
                </label>
              ))}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب الإعادة" className={textareaClass} />
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="gold" disabled={reason.trim().length < 5} onClick={() => decide(rejecting, desk.programmes.find((x) => x.cluster.slug === rejecting)?.cluster.name ?? "", "rejected", reason.trim())}>
                إعادة مع السبب
              </Button>
              <Button variant="glass" onClick={() => setRejecting(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
