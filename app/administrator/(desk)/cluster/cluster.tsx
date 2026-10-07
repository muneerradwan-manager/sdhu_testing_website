"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Calculator, Check, CircleDashed, Crown, FileSignature, Globe, Inbox, Layers, Printer, Search, Send, Shuffle, UserCheck, UserMinus, UsersRound, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { OperationClosed } from "@/components/app/operation-closed";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { dayLabel, rangeLabel } from "@/lib/operations";
import { useSeason } from "@/lib/season-live";
import { useStore, type ClusterInvite, type GroupInvite, type Seat } from "@/lib/store";
import { cn, formatNumber, formatUSD } from "@/lib/utils";
import { adminName, logAdmin, nowMs, resultOf, useAdmin } from "../../_lib/admin";
import { useExamRules } from "../../_lib/admin-rules";
import { acceptedGroups, clusterViewOf } from "../../_lib/cluster";
import { coordinatorsLabel } from "../../_lib/coordinators";
import {
  ACCOUNTANT_TITLE,
  DEPUTY_TITLE,
  STATUS,
  STEPS,
  answerInvitation,
  cadreOf,
  editableBy,
  fitSeats,
  invitationsFor,
  invite,
  inviteWhat,
  mapInvites,
  newCluster,
  placedIn,
  refit,
  roleOfPerson,
  sendCluster,
  useClusterRequests,
  useFormationWindow,
  useGroupPool,
  useMyInvitations,
  usePicks,
  writeCluster,
  type Cluster,
  type ClusterRequest,
  type Inbound,
  type PickPerson,
  type Step,
  type Window,
} from "../../_lib/formation";
import { categoryOf, categoryOfId, does, roleName, roleOf, seasonalOf, seatsLabel, seatsOf, useCadre, useStructure } from "../../_lib/structure";
import { ClusterReport } from "../../_components/cluster-report";
import { StandingCard } from "../../_components/standing";
import { AdminShell, LockedCard, SectionTitle, SimButton } from "../../_components/ui";
import { AdminRequests } from "../requests/requests";
import { ClusterPublicProfile } from "./public-profile";

/**
 * Two operations of their own. «تشكيل التكتلات» runs in its dates, alongside the pilgrims joining the
 * groups. Nobody is elected: whoever the administration gave a role that leads a cluster this season files
 * the request and is its head from then on. He fills it in the administration's order — the tier, the
 * groups and their seats, the cluster's assistant, its coordinators and female guides, his deputy and its
 * accountant — everyone answering his own invitation, and sends it once complete. The administration reviews
 * it: it approves it, or sends it back with notes to fix before the final deadline.
 * «إدارة التكتل» is the approved cluster, for its head and his deputy — one cluster, in tabs (RequestDesk).
 */
export function AdminCluster({ part }: { part: "formation" | "manage" }) {
  const admin = useAdmin()!;
  const p = admin.profile;
  const requests = useClusterRequests();
  const s = useStructure();
  const cadre = useCadre();
  const mine = requests.find((r) => r.headId === admin.id);
  const view = clusterViewOf(p, admin.name);
  const theirs = view ? requests.find((r) => r.cluster.id === view.id) : undefined;
  const leads = does(s, roleOfPerson(admin.id, p ? { [admin.id]: p } : {}, cadre), "clusterLeader");

  if (!p?.positions?.length) {
    return (
      <AdminShell title={part === "manage" ? "إدارة التكتل" : "تشكيل التكتلات"} subtitle="يشكّل التكتلَ من منحته الإدارة صفة «رئيس تكتل»، ويدعو إليه المجموعات وكادره.">
        <LockedCard title="بعد تسجيلك كإداري" text="سجّل لموسم 1448 في صفة واحدة. رئيس المجموعة يشكّل مجموعته وحده ثم تُدعى إلى تكتل؛ والموجّه والمعاون والمنسق والموجّهة يدعوهم رؤساء التكتلات؛ ومن تمنحه الإدارة صفة «رئيس تكتل» يقدّم طلب التشكيل." href="/administrator/apply" cta="التسجيل كإداري" />
      </AdminShell>
    );
  }

  if (part === "manage") {
    if (!view || !theirs || theirs.status !== "approved") {
      return (
        <AdminShell title="إدارة التكتل" subtitle="التكتل المعتمد: مجموعاته وحجاجها، وكادره، وتقريره، وصفحته العامة — لرئيسه ونائبه.">
          <LockedCard title="لا تكتل معتمد تديره" text="يُدار التكتل هنا بعد أن تعتمد الإدارة طلبه. الطلب نفسه عملية مستقلة في «تشكيل التكتلات»." href="/administrator/cluster" cta="تشكيل التكتلات" />
        </AdminShell>
      );
    }
    return (
      <AdminShell title={theirs.cluster.name} subtitle={view.isHead ? "تكتلك المعتمد: مجموعاته وحجاجها، وكادره، وتوزيع مجموعاته على منسقيه." : `تكتلك الذي دعاك رئيسه ${view.headName} نائباً له. تتابع مجموعاته وكادره وتنوب عنه.`}>
        {view.isHead ? <ManageCluster req={theirs} /> : <DeputyCluster req={theirs} />}
      </AdminShell>
    );
  }

  return (
    <AdminShell title="تشكيل التكتلات" subtitle="لا انتخاب: يقدّم طلبَ تشكيل التكتل من منحته الإدارة صفة «رئيس تكتل»، ويملؤه بترتيبها، ويرسله فتراجعه.">
      {mine ? <MyRequest req={mine} /> : leads ? <FileRequest /> : <Invitations />}
    </AdminShell>
  );
}

// ───────────────────────── Filing a request ─────────────────────────

function WindowNote({ w }: { w: Window }) {
  const text =
    w.state === "before"
      ? `تفتح طلبات التشكيل ${dayLabel(w.op.start, true)}.`
      : w.state === "early"
        ? `مفتوحة حتى ${dayLabel(w.op.end, true)}. ما يُرسَل حتى ${dayLabel(w.early, true)} ينال «شارة الالتزام بالمواعيد».`
        : w.state === "open"
          ? `مفتوحة حتى ${dayLabel(w.op.end, true)} — مضى الموعد الأول (${dayLabel(w.early)})، فلا شارة التزام لما يُرسَل الآن.`
          : `انتهى الموعد النهائي ${dayLabel(w.op.end, true)}: لا إرسال ولا تعديل بعده.`;
  return <p className={cn("rounded-2xl p-3 text-sm font-semibold", w.state === "closed" || w.state === "before" ? "bg-gold/20 text-maroon" : "bg-green-light/10 text-green")}>{text}</p>;
}

function FileRequest() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const toast = useToast();
  const w = useFormationWindow();
  const s = useStructure();
  const cadre = useCadre();
  const exam = useExamRules();
  const admins = useStore((x) => x.admins);
  const grant = seasonalOf(admin.id, cadre);
  const qualified = resultOf(p, exam).passed;
  const g = p.group?.approvedAt ? p.group : undefined;
  const category = categoryOf(admin.id, cadre);
  const [name, setName] = useState(`تكتل ${admin.person.firstName}`);
  const inbox = useMyInvitations(admin.id);
  const joined = inbox.find((x) => x.kind === "group" && x.invite.status === "accepted");
  const open = w.state === "early" || w.state === "open";

  const file = () => {
    const at = nowMs();
    const id = `cluster-${admin.id.slice(-4)}`;
    const own: GroupInvite | undefined = g && category ? { id: admin.id, name: admin.name, at, status: "accepted", number: g.number, branch: "دمشق", category, pilgrims: 0 } : undefined;
    const c = newCluster(id, name.trim(), at, own);
    writeCluster({ headId: admin.id, headName: admin.name, headGroup: g?.number, seed: false }, own ? { ...c, seats: { [own.number]: fitSeats(s, undefined, own.category) } } : c, admins);
    logAdmin(admin.id, `بدء طلب تشكيل ${name.trim()}`, g ? groupName(g.number) : undefined, grant ? `بصفة «${roleName(grant.role, s)}» الموسمية — ${grant.reason}` : undefined, { area: "clusters", ref: id });
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F"] });
    toast({ title: `بدأتَ طلب ${name.trim()}`, body: "اختر مستواه أولاً، ثم مجموعاته ومقاعدها، ثم كادر التكتل.", icon: "🏛️", tone: "success" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <SectionTitle icon={Crown}>طلب تشكيل تكتل</SectionTitle>
        <p className="mt-3 rounded-2xl bg-sand p-3 text-sm leading-7">
          {grant ? (
            <>
              منحتك الإدارة صفة <b>«{roleName(grant.role, s)}»</b> لهذا الموسم{grant.label ? ` (${grant.label})` : ""}: {grant.reason}. منحها {grant.by}.
            </>
          ) : (
            <>صفتك هذا الموسم «{roleName(roleOfPerson(admin.id, admins, cadre), s)}» تتيح لك رئاسة تكتل.</>
          )}
        </p>
        <ol className="mt-4 space-y-2 text-sm">
          {STEPS.map((st, i) => (
            <li key={st.key} className="flex gap-2 rounded-xl bg-sand/60 px-3 py-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-green-dark text-xs font-bold text-white">{i + 1}</span> {st.label}
            </li>
          ))}
        </ol>
        <div className="mt-5 space-y-3">
          {w.state === "before" || w.state === "closed" ? (
            <OperationClosed state={w.op} />
          ) : !qualified ? (
            <p className="rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">تقدّم الطلب بعد أن تتأهل لموسم 1448: سجّل كإداري، ثم اجتز الامتحانين أو جدّد صفتك بتقييمك.</p>
          ) : joined ? (
            <p className="rounded-2xl bg-green-light/10 p-4 text-sm font-semibold text-green">قبلتَ دعوة {joined.req.cluster.name} لمجموعتك، فلا تقدّم طلباً آخر.</p>
          ) : (
            <>
              <WindowNote w={w} />
              <label className="block">
                <span className="mb-2 block font-bold">اسم التكتل</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
              </label>
              <p className="text-xs leading-6 text-hint">من كلمة أو كلمتين، لا يشبه اسم تكتل أو مجموعة أخرى، ولا يفيد حصرية الحج (النظام الإداري).</p>
              <Button size="lg" disabled={!name.trim() || !open} onClick={file}>
                <FileSignature className="size-5" /> أبدأ طلب تشكيل التكتل
              </Button>
              {g && <p className="text-xs text-hint">مجموعتك ({groupName(g.number)}{category ? ` — ${categoryOfId(s, category)?.name}` : ""}) فيه من البداية، وأنت رئيسه من لحظة الطلب.</p>}
            </>
          )}
        </div>
      </Card>
      <Invitations compact />
    </div>
  );
}

// ───────────────────────── The invitations an administrator received ─────────────────────────

function Invitations({ compact = false }: { compact?: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const w = useFormationWindow();
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  const inbox = useMemo(() => invitationsFor(admin.id, requests), [admin.id, requests]);
  const open = w.state === "early" || w.state === "open";
  const answer = (x: Inbound, status: "accepted" | "declined") => {
    answerInvitation({ id: admin.id, name: admin.name }, x, status, admins, requests, status === "declined" ? "اعتذر من حسابه" : undefined);
    toast(status === "accepted" ? { title: `قبلتَ: ${inviteWhat(x)}`, body: x.req.cluster.name, icon: "🤝", tone: "success" } : { title: "اعتذرتَ عن الدعوة", body: x.req.cluster.name, icon: "📩", tone: "info" });
  };

  return (
    <Card className={compact ? "md:p-6" : undefined}>
      <SectionTitle icon={Inbox} action={<Badge tone="gold">{inbox.filter((x) => x.invite.status === "pending").length} بانتظار ردك</Badge>}>
        دعواتي
      </SectionTitle>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        {compact ? "رؤساء التكتلات يدعون المجموعات إليها. تقبل دعوة واحدة لمجموعتك، فتدخل بحجاجها، وقد يدعوك رئيسها نائباً له أو محاسباً." : "رؤساء التكتلات يدعون كل واحد إلى مكانه: مقعد موجّه أو معاون في إحدى مجموعاتهم، أو من منسقي التكتل أو موجّهاته أو معاونيه. لكل شخص مكان واحد في الموسم."}
      </p>
      {!open && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm text-ink-soft">مدة تشكيل التكتلات {rangeLabel(w.op.start, w.op.end)}. الرد على الدعوات في مدتها.</p>}
      <ul className="mt-4 space-y-2">
        {inbox.length === 0 && <li className="rounded-2xl bg-sand p-4 text-sm text-hint">لا دعوات بعد.</li>}
        {inbox.map((x) => (
          <li key={`${x.req.cluster.id}-${x.kind}-${x.number ?? ""}-${x.seat ?? ""}`} className={cn("rounded-2xl border-2 p-3", x.invite.status === "accepted" ? "border-green-light/50 bg-green-light/5" : x.invite.status === "declined" ? "border-ink/10 bg-sand/50" : "border-gold-dark/50")}>
            <p className="font-bold">{x.req.cluster.name}</p>
            <p className="text-xs text-ink-soft">
              رئيسه {x.req.headName} — يدعوك: {inviteWhat(x)}
            </p>
            {x.invite.status === "pending" ? (
              open && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => answer(x, "accepted")}>
                    <Check className="size-4" /> أقبل
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => answer(x, "declined")}>
                    <X className="size-4" /> أعتذر
                  </Button>
                </div>
              )
            ) : (
              <Badge tone={x.invite.status === "accepted" ? "green" : "ink"} className="mt-2">
                {x.invite.status === "accepted" ? "قبلتَها" : `اعتذرت${x.invite.reason ? ` — ${x.invite.reason}` : ""}`}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ───────────────────────── The head's request ─────────────────────────

/** The off-device people answer by themselves a moment after they are invited: the demo's other administrators */
const DECLINES: Record<string, string> = { "seed-12": "ارتبطت المجموعة بتكتل آخر", "01033300942": "ظرف صحي في العائلة" };

function AutoAnswers({ req }: { req: ClusterRequest }) {
  const admins = useStore((s) => s.admins);
  const c = req.cluster;
  useEffect(() => {
    const off = (x: ClusterInvite) => x.status === "pending" && !admins[x.id];
    let any = false;
    mapInvites(c, (x) => {
      if (off(x)) any = true;
      return x;
    });
    if (!any) return;
    const t = window.setTimeout(() => {
      writeCluster(req, mapInvites(c, (x) => (off(x) ? { ...x, at: nowMs(), status: DECLINES[x.id] ? "declined" : "accepted", reason: DECLINES[x.id] } : x)), admins);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [c, admins, req]);
  return null;
}

function MyRequest({ req }: { req: ClusterRequest }) {
  const w = useFormationWindow();
  if (req.status === "approved") {
    return <LockedCard title={`اعتُمد ${req.cluster.name}`} text={`راجعته الإدارة فاعتمدته (${req.cluster.decision?.by ?? ""}). يُدار من الآن في «إدارة التكتل».`} href="/administrator/clusters" cta="إدارة التكتل" />;
  }
  return <RequestDesk req={req} mode="request" editable={editableBy(req.status, w)} header={<RequestHeader req={req} w={w} />} />;
}

function RequestHeader({ req, w }: { req: ClusterRequest; w: Window }) {
  const c = req.cluster;
  const s = useStructure();
  return (
    <Card className="md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
          <h2 className="mt-2 font-display text-3xl font-bold text-green-dark">{c.name}</h2>
          <p className="text-sm text-ink-soft">
            رئيسه أنت — {s.tiers.find((t) => t.id === c.tier)?.name ?? "لم يُختر مستواه"} — {req.groups.length} مجموعات، مجموع فئاتها {req.weight}
          </p>
        </div>
        <Badge tone={req.complete ? "green" : "maroon"} className="text-sm">
          {req.complete ? "مكتمل — جاهز للإرسال" : `ناقص: ${req.checks.filter((x) => !x.ok && !x.warn).length}`}
        </Badge>
      </div>
      <div className="mt-4">
        <WindowNote w={w} />
      </div>
      {c.status === "rejected" && c.decision?.note && (
        <p className="mt-3 rounded-2xl border-2 border-maroon/30 bg-maroon/5 p-4 text-sm leading-7 text-maroon">
          <b>أعاده {c.decision.by} بملاحظات:</b> {c.decision.note} — أصلحه ثم أرسله ثانية من «التقرير».
        </p>
      )}
      {c.status === "reviewing" && <p className="mt-3 rounded-2xl bg-gold/20 p-3 text-sm font-semibold text-maroon">يراجعه الآن {c.review?.by}: لا تعديل حتى يعتمده أو يعيده إليك.</p>}
      {c.status === "pending" && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm text-ink-soft">أُرسل للمراجعة. ما زلت تستطيع تعديله قبل أن تبدأ مراجعته، ثم تحدّثه من «التقرير».</p>}
      {c.reopened && c.status !== "approved" && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm text-ink-soft">أعاد {c.reopened.by} فتحه للتعديل بعد اعتماده، محتفظاً بكل بياناته: عدّل ثم أرسله ليُعتمد من جديد.</p>}
    </Card>
  );
}

type DeskTab = Step | "team" | "page";

/**
 * One request in tabs, in the administration's order. The head fills it while it is his to edit; once approved
 * the same cluster opens in «إدارة التكتل» with its groups (each opens with its pilgrims), its people, its
 * report and its public page. The deputy sees the same tabs read-only.
 */
function RequestDesk({ req, mode, editable, header }: { req: ClusterRequest; mode: "request" | "manage" | "deputy"; editable: boolean; header: ReactNode }) {
  const [tab, setTab] = useState<DeskTab>(mode === "request" ? "tier" : "groups");
  const [opened, setOpened] = useState<number | null>(null);
  const c = req.cluster;
  const pending = (xs: (ClusterInvite | undefined)[]) => xs.filter((x) => x?.status === "pending").length;

  const tabs: { key: DeskTab; label: string; icon: LucideIcon; done?: boolean; badge?: string }[] =
    mode === "request"
      ? STEPS.map((st, i) => ({ key: st.key, label: `${i + 1}. ${st.label}`, icon: [Layers, UsersRound, UserCheck, Shuffle, Crown, Calculator, Printer][i], done: req.stepOk[st.key] }))
      : [
          { key: "groups", label: "المجموعات", icon: UsersRound, badge: String(req.groups.length) },
          { key: "team", label: "كادر التكتل", icon: UserCheck, badge: String(req.cadre) },
          { key: "report", label: "التقرير", icon: Printer },
          ...(mode === "manage" ? [{ key: "page" as const, label: "الصفحة العامة", icon: Globe }] : []),
        ];
  const waiting = pending([...Object.values(c.groups), ...Object.values(c.seats).flat().map((x) => x.who), ...c.assistants, ...c.coordinators, ...c.femaleGuides, c.deputy, c.accountant]);

  return (
    <div className="space-y-6">
      {mode === "request" && <AutoAnswers req={req} />}
      {header}
      {waiting > 0 && mode === "request" && <p className="rounded-2xl bg-sand px-4 py-2 text-sm text-ink-soft">{waiting} دعوات بانتظار ردود أصحابها.</p>}
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-2xl border border-gold/30 bg-white p-1" role="tablist" aria-label={c.name}>
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => { setOpened(null); setTab(t.key); }} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === t.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === t.key && <motion.span layoutId="cluster-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
              {t.done !== undefined && (t.done ? <Check className={cn("relative size-4", tab === t.key ? "text-gold" : "text-green-light")} /> : <CircleDashed className={cn("relative size-3.5", tab === t.key ? "text-white/70" : "text-maroon/60")} />)}
              {t.badge && <span className={cn("relative rounded-full px-1.5 text-[11px] tabular-nums", tab === t.key ? "bg-white/20" : "bg-sand")}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${tab}-${opened ?? ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
          {tab === "tier" && <TierStep req={req} editable={editable} onNext={() => setTab("groups")} />}
          {tab === "groups" &&
            (mode !== "request" && opened !== null && req.groups.some((g) => g.number === opened) ? (
              <GroupDesk req={req} number={opened} onBack={() => setOpened(null)} />
            ) : (
              <GroupsStep req={req} editable={editable && mode === "request"} onOpen={mode !== "request" ? setOpened : undefined} />
            ))}
          {tab === "assistants" && <AssistantsStep req={req} editable={editable} />}
          {tab === "staff" && <StaffStep req={req} editable={editable} sortable={editable || mode === "manage"} />}
          {tab === "deputy" && <DeputyStep req={req} editable={editable} />}
          {tab === "accountant" && <AccountantStep req={req} editable={editable} />}
          {tab === "team" && (
            <div className="space-y-6">
              <AssistantsStep req={req} editable={false} />
              <StaffStep req={req} editable={false} sortable={mode === "manage"} />
              <div className="grid gap-6 lg:grid-cols-2">
                <DeputyStep req={req} editable={false} />
                <AccountantStep req={req} editable={false} />
              </div>
            </div>
          )}
          {tab === "report" && <ReportStep req={req} editable={editable && mode === "request"} />}
          {tab === "page" && <ClusterPublicProfile />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Writes the request and logs what was done to it */
function useWrite(req: ClusterRequest) {
  const admins = useStore((s) => s.admins);
  return useCallback(
    (next: Cluster, action?: string, target?: string, detail?: string) => {
      writeCluster(req, next, admins);
      if (action) logAdmin(req.headId, action, target, detail, { area: "clusters", ref: next.id });
    },
    [req, admins],
  );
}

function Status({ x }: { x: ClusterInvite }) {
  return x.status === "accepted" ? (
    <Badge tone="green">
      <BadgeCheck className="size-3.5" /> قبِل
    </Badge>
  ) : x.status === "declined" ? (
    <Badge tone="maroon">اعتذر{x.reason ? ` — ${x.reason}` : ""}</Badge>
  ) : (
    <Badge tone="gold">
      <CircleDashed className="size-3.5 animate-spin" /> بانتظار رده
    </Badge>
  );
}

/** Lets the tester answer for an invitee whose account is on this device, as he would from his own */
function SimAnswer({ req, id }: { req: ClusterRequest; id: string }) {
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  if (!admins[id]) return null;
  const inbound = invitationsFor(id, requests).find((x) => x.req.cluster.id === req.cluster.id && x.invite.status === "pending");
  if (!inbound) return null;
  return (
    <SimButton className="px-3 py-1.5 text-xs" onClick={() => answerInvitation({ id, name: adminName(id) }, inbound, "accepted", admins, requests)}>
      محاكاة: قبِل من حسابه
    </SimButton>
  );
}

/** One invited person: his role, his answer, and the head's withdrawal */
function InviteRow({ req, x, note, editable, onRemove }: { req: ClusterRequest; x: ClusterInvite; note?: string; editable: boolean; onRemove?: () => void }) {
  const admins = useStore((s) => s.admins);
  const cadre = useCadre();
  const s = useStructure();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{x.name}</span>
        <span className="block text-[11px] text-hint">{note ?? roleName(roleOfPerson(x.id, admins, cadre), s)}</span>
      </span>
      <Status x={x} />
      <SimAnswer req={req} id={x.id} />
      {editable && onRemove && (
        <button type="button" onClick={onRemove} aria-label={`سحب دعوة ${x.name}`} className="grid size-8 place-items-center rounded-lg text-hint hover:bg-maroon/10 hover:text-maroon">
          <UserMinus className="size-4" />
        </button>
      )}
    </div>
  );
}

/** The season's qualified people for one place, searched by name, branch, role or area */
function PersonPicker({ people, onPick, exclude, placeholder, full }: { people: PickPerson[]; onPick: (x: PickPerson) => void; exclude: Set<string>; placeholder: string; full?: string }) {
  const s = useStructure();
  const [q, setQ] = useState("");
  if (full) return <p className="mt-2 rounded-xl bg-sand/70 px-3 py-2 text-xs text-hint">{full}</p>;
  const found = people.filter((x) => !exclude.has(x.id) && (!q.trim() || [x.name, x.branch, x.note, roleName(x.role, s)].some((t) => t.includes(q.trim()))));
  return (
    <div className="mt-2">
      <label className="flex items-center gap-2 rounded-xl border-2 border-gold/40 px-3">
        <Search className="size-4 text-hint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>
      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
        {found.length === 0 && <li className="px-2 py-1.5 text-xs text-hint">لا أحد متاح بهذه الصفة في فروعك.</li>}
        {found.slice(0, 8).map((x) => (
          <li key={x.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-sand">
            <span className="min-w-0 flex-1">
              <span className="block truncate">
                {x.name} <span className="text-xs text-gold-dark">— {roleName(x.role, s)}</span>
              </span>
              <span className="block text-[11px] text-hint">
                {x.branch}
                {x.age ? ` — ${x.age} سنة` : ""} — {x.note}
              </span>
            </span>
            {x.takenBy ? (
              <span className="text-[11px] text-maroon">في {x.takenBy}</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => onPick(x)}>
                ادعُ
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepNote({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h3 className="font-display text-xl font-bold text-green-dark">{title}</h3>
      <p className="mt-1 text-sm leading-7 text-ink-soft">{desc}</p>
    </div>
  );
}

// ───────────────────────── 1. The tier ─────────────────────────

function TierStep({ req, editable, onNext }: { req: ClusterRequest; editable: boolean; onNext: () => void }) {
  const s = useStructure();
  const write = useWrite(req);
  const c = req.cluster;
  const [name, setName] = useState(c.name);
  const saveName = () => name.trim() && name.trim() !== c.name && write({ ...c, name: name.trim() }, `تسمية التكتل «${name.trim()}»`);
  return (
    <Card className="space-y-5">
      <StepNote title="اسم التكتل ومستواه" desc="اختر اسم التكتل ومستواه أولاً: يحدد المستوى عدد حجاج كل فئة من المجموعات ومقاعد فريقها، وحدود مجموع الفئات وعدد المنسقين والموجّهات." />
      <label className="block">
        <span className="mb-2 block font-bold">اسم التكتل</span>
        <input value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} onBlur={saveName} className="h-12 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light disabled:bg-sand" />
      </label>
      <div className="grid gap-3 lg:grid-cols-3">
        {s.tiers.map((t) => {
          const comp = s.composition[t.id];
          const picked = c.tier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={!editable}
              onClick={() => !picked && write(refit(s, { ...c, tier: t.id }), `اختيار مستوى ${t.name} لـ${c.name}`)}
              className={cn("rounded-2xl border-2 p-4 text-right transition", picked ? "border-green-light bg-green-light/5" : "border-gold/30 hover:border-gold-dark", !editable && "cursor-default")}
            >
              <p className="flex items-center justify-between font-display text-lg font-bold text-green-dark">
                {t.name} {picked && <Check className="size-5 text-green-light" />}
              </p>
              {comp && (
                <p className="mt-1 text-xs leading-6 text-ink-soft">
                  مجموع الفئات {comp.min} – {comp.max} · معاون التكتل {comp.assistants} · منسق لكل {comp.perCoordinator} وحدات · موجّهة لكل {comp.perGuide}
                </p>
              )}
              <ul className="mt-2 space-y-1 text-xs">
                {s.categories.map((cat) => {
                  const n = seatsOf(s, t.id, cat.id);
                  return (
                    <li key={cat.id} className="flex justify-between gap-2 rounded-lg bg-white/70 px-2 py-1">
                      <span className="font-bold">{cat.name}</span>
                      <span className="text-ink-soft">
                        {n.pilgrims} حاجاً — {seatsLabel(n)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </button>
          );
        })}
      </div>
      <Button variant="outline" onClick={onNext} disabled={!req.stepOk.tier}>
        التالي: المجموعات <ArrowLeft className="size-4" />
      </Button>
    </Card>
  );
}

// ───────────────────────── 2. The groups and their seats ─────────────────────────

function GroupsStep({ req, editable, onOpen }: { req: ClusterRequest; editable: boolean; onOpen?: (n: number) => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const s = useStructure();
  const write = useWrite(req);
  const c = req.cluster;
  const pool = useGroupPool(req);
  const [q, setQ] = useState("");
  const invited = new Set(Object.values(c.groups).map((g) => g.number));
  const found = pool.filter((g) => !invited.has(g.number) && (!q.trim() || groupName(g.number).includes(q.trim()) || g.headName.includes(q.trim()) || g.branch.includes(q.trim())));
  const list = (onOpen ? req.groups.map((g) => c.groups[g.number]) : Object.values(c.groups)).sort((a, b) => Number(b.id === req.headId) - Number(a.id === req.headId));
  const n = req.needs;
  const weightOk = req.weight >= n.min && req.weight <= n.max;

  const add = (g: (typeof pool)[number]) => {
    if (!g.category) return;
    write(
      { ...c, groups: { ...c.groups, [g.number]: { id: g.headId, name: g.headName, at: nowMs(), status: "pending", number: g.number, branch: g.branch, category: g.category, pilgrims: g.pilgrims } }, seats: { ...c.seats, [g.number]: fitSeats(s, c.tier, g.category) } },
      `دعوة ${groupName(g.number)} إلى ${c.name}`,
      g.headName,
      `${categoryOfId(s, g.category)?.name} — ${g.pilgrims} حاجاً`,
    );
    toast({ title: `دُعيت ${groupName(g.number)}`, body: `يرد عليها رئيسها ${g.headName}.`, icon: "✉️", tone: "info" });
  };
  const withdraw = (num: number) => {
    const groups = { ...c.groups };
    const seats = { ...c.seats };
    const sorting = { ...c.sorting };
    delete groups[num];
    delete seats[num];
    delete sorting[num];
    write({ ...c, groups, seats, sorting, deputy: c.deputy?.id === c.groups[num]?.id ? undefined : c.deputy }, `سحب ${groupName(num)} من ${c.name}`);
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-bold", weightOk ? "border-green-light/40 bg-green-light/10 text-green" : "border-maroon/40 bg-maroon/5 text-maroon")}>
        <span>مجموع الفئات الحالي: {req.weight}</span>
        <span>
          المطلوب بين {n.min} و{n.max}
        </span>
      </div>
      {!onOpen && <StepNote title="مجموعات التكتل" desc="أضف المجموعات أولاً: لكل مجموعة رئيسها، وفئتها فئته كما حددتها الإدارة، ومنها عدد حجاجها ومقاعد فريقها في مستوى تكتلك. املأ كل مقعد بدعوة يقبلها صاحبها: الموجّه من الموجّهين أو المرشدين، والمعاون من المعاونين. المقعد الحر تختار له موجّهاً أو معاوناً." />}
      {list.length === 0 && <p className="rounded-2xl bg-sand p-4 text-sm text-hint">لا مجموعات بعد.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((g) => (
          <GroupCard key={g.number} req={req} g={g} own={g.id === req.headId} editable={editable} onWithdraw={() => withdraw(g.number)} onOpen={onOpen && req.groups.some((x) => x.number === g.number) ? () => onOpen(g.number) : undefined} />
        ))}
      </div>
      {editable && (
        <Card className="md:p-6">
          <SectionTitle icon={UsersRound}>إضافة مجموعة</SectionTitle>
          <p className="mt-1 text-xs text-hint">المجموعات المعتمدة في فروعك ({req.branches.join("، ")}). مجموعة في طلب آخر لا تُدعى.</p>
          <label className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-gold/40 px-3">
            <Search className="size-4 text-hint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ادعُ مجموعة: باسمها أو برئيسها أو بفرعها" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
            {found.slice(0, 12).map((g) => (
              <li key={g.number} className="flex items-center gap-3 rounded-xl bg-sand/70 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{groupName(g.number)}</span>
                  <span className="block text-xs text-ink-soft">
                    {g.headName} — {g.branch} — {categoryOfId(s, g.category)?.name ?? "لا فئة لرئيسها بعد"} — {g.pilgrims} حاجاً {g.takenBy && <b className="text-maroon">— في {g.takenBy}</b>}
                  </span>
                </span>
                <Button size="sm" variant="outline" disabled={!!g.takenBy || !g.category || g.headId === admin.id} onClick={() => add(g)}>
                  <Send className="size-3.5" /> ادعُ
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function GroupCard({ req, g, own, editable, onWithdraw, onOpen }: { req: ClusterRequest; g: GroupInvite; own: boolean; editable: boolean; onWithdraw: () => void; onOpen?: () => void }) {
  const s = useStructure();
  const toast = useToast();
  const write = useWrite(req);
  const picks = usePicks(req);
  const c = req.cluster;
  const cat = categoryOfId(s, g.category);
  const n = seatsOf(s, c.tier, g.category);
  const seats = c.seats[g.number] ?? [];
  const exclude = new Set([...placedIn(c), req.headId]);
  const setSeat = (i: number, seat: Seat, action: string, who?: string) => write({ ...c, seats: { ...c.seats, [g.number]: seats.map((x, j) => (j === i ? seat : x)) } }, action, who, groupName(g.number));

  return (
    <Card className={cn("md:p-5", onOpen && "transition hover:border-gold-dark hover:shadow-md")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-green-dark">{groupName(g.number)}</p>
          <p className="text-xs text-ink-soft">
            رئيسها {own ? `${g.name} (مجموعتك)` : g.name} — {g.branch}
          </p>
          <p className="mt-1 text-xs">
            <Badge tone="gold">
              {cat?.name ?? "—"} — وزنها {cat?.weight ?? 0}
            </Badge>{" "}
            <span className="text-ink-soft">
              {n.pilgrims} حاجاً في هذا المستوى — فيها الآن {g.pilgrims}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!own && <Status x={g} />}
          {!own && <SimAnswer req={req} id={g.id} />}
          {editable && !own && (
            <button type="button" onClick={onWithdraw} aria-label={`سحب ${groupName(g.number)}`} className="grid size-9 place-items-center rounded-xl text-hint hover:bg-maroon/10 hover:text-maroon">
              <X className="size-4" />
            </button>
          )}
          {onOpen && (
            <Button size="sm" variant="outline" onClick={onOpen}>
              افتحها <ArrowLeft className="size-4" />
            </Button>
          )}
        </div>
      </div>
      {g.byAdministration && <p className="mt-2 rounded-xl bg-gold/15 px-3 py-1.5 text-xs text-maroon">أضافتها الإدارة ({g.byAdministration.by}): {g.byAdministration.reason}</p>}
      <div className="mt-3 space-y-2">
        <p className="text-xs font-bold text-hint">مقاعدها: {seatsLabel(n)}</p>
        {g.status !== "accepted" ? (
          <p className="rounded-xl bg-sand/70 px-3 py-2 text-xs text-hint">تُملأ مقاعدها بعد أن يقبل رئيسها.</p>
        ) : (
          seats.map((seat, i) => (
            <div key={i} className="rounded-xl border border-gold/25 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-ink-soft">{seat.free ? `مقعد حر — ${seat.kind === "guide" ? "موجّه أو مرشد" : "معاون"}` : seat.kind === "guide" ? "موجّه أو مرشد" : "معاون"}</span>
                {seat.free && !seat.who && editable && (
                  <span className="flex gap-1">
                    {(["guide", "assistant"] as const).map((k) => (
                      <button key={k} type="button" onClick={() => setSeat(i, { ...seat, kind: k }, `مقعد حر في ${groupName(g.number)}: ${k === "guide" ? "موجّه" : "معاون"}`)} className={cn("rounded-lg px-2 py-1 font-bold", seat.kind === k ? "bg-green-dark text-white" : "bg-sand")}>
                        {k === "guide" ? "موجّه أو مرشد" : "معاون"}
                      </button>
                    ))}
                  </span>
                )}
              </div>
              {seat.who ? (
                <div className="mt-1">
                  <InviteRow req={req} x={seat.who} editable={editable} onRemove={() => setSeat(i, { ...seat, who: undefined }, `سحب دعوة ${seat.who!.name}`, seat.who!.name)} />
                </div>
              ) : editable ? (
                <PersonPicker
                  people={picks(seat.kind === "guide" ? "guideSeat" : "assistantSeat")}
                  exclude={exclude}
                  placeholder={seat.kind === "guide" ? "ادعُ موجّهاً أو مرشداً" : "ادعُ معاوناً"}
                  onPick={(x) => {
                    setSeat(i, { ...seat, who: invite(x.id, x.name) }, `دعوة ${x.name} إلى مقعد ${seat.kind === "guide" ? "الموجّه" : "المعاون"}`, x.name);
                    toast({ title: `أُرسلت الدعوة إلى ${x.name}`, body: "تصله وحده، ويقبل أو يعتذر من حسابه.", icon: "✉️", tone: "info" });
                  }}
                />
              ) : (
                <p className="mt-1 text-xs font-bold text-maroon">شاغر</p>
              )}
            </div>
          ))
        )}
        {g.status === "accepted" && seats.length === 0 && <p className="rounded-xl bg-sand/70 px-3 py-2 text-xs text-hint">لا مقاعد لفئتها في هذا المستوى: رئيسها وحده.</p>}
      </div>
    </Card>
  );
}

/** One group of an approved cluster, opened from its groups: its head, its seats, its coordinator, and its pilgrims */
function GroupDesk({ req, number, onBack }: { req: ClusterRequest; number: number; onBack: () => void }) {
  const c = req.cluster;
  const g = c.groups[number];
  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-green-dark hover:bg-sand">
        <ArrowRight className="size-4" /> كل مجموعات {c.name}
      </button>
      <GroupCard req={req} g={g} own={g.id === req.headId} editable={false} onWithdraw={() => undefined} />
      <p className="rounded-2xl bg-sand p-3 text-sm text-ink-soft">
        منسقها: <b>{c.coordinators.find((x) => x.status === "accepted" && x.id === c.sorting[number])?.name ?? "لم يوزَّع عليها منسق"}</b>
      </p>
      <AdminRequests fixed={number} embedded />
    </div>
  );
}

// ───────────────────────── 3. The cluster's assistant ─────────────────────────

function AssistantsStep({ req, editable }: { req: ClusterRequest; editable: boolean }) {
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const write = useWrite(req);
  const picks = usePicks(req);
  const c = req.cluster;
  const multiplier = (id: string) => roleOf(s, roleOfPerson(id, admins, cadre))?.multiplier;
  const counted = c.assistants.filter((x) => x.status !== "declined" && !multiplier(x.id)).length;
  const full = counted >= req.needs.assistants;
  const exclude = new Set([...placedIn(c), req.headId]);
  const people = picks("assistantPool").filter((x) => !full || roleOf(s, x.role)?.multiplier);
  return (
    <Card className="space-y-3 md:p-6">
      <SectionTitle icon={UserCheck} action={<Badge tone={req.stepOk.assistants ? "green" : "gold"}>{c.assistants.filter((x) => x.status === "accepted" && !multiplier(x.id)).length} من {req.needs.assistants}</Badge>}>
        معاون التكتل
      </SectionTitle>
      <p className="text-sm leading-7 text-ink-soft">
        {req.needs.assistants === 0 ? "لا معاون تكتل في هذا المستوى." : `عدد ثابت في هذا المستوى: ${req.needs.assistants}، من قائمة المعاونين.`} ومن صفته «{roleName("assistant-count", s)}» يُختار بلا حد أقصى — يضيف كل واحد 20 حاجاً إلى عدد حجاج التكتل.
      </p>
      {c.assistants.map((x) => (
        <InviteRow key={x.id} req={req} x={x} editable={editable} note={`${roleName(roleOfPerson(x.id, admins, cadre), s)}${multiplier(x.id) ? ` — يضيف ${multiplier(x.id)} حاجاً` : ""}`} onRemove={() => write({ ...c, assistants: c.assistants.filter((m) => m.id !== x.id) }, `سحب دعوة ${x.name} معاوناً للتكتل`, x.name)} />
      ))}
      {editable && <PersonPicker people={people} exclude={exclude} placeholder="ادعُ معاوناً للتكتل" onPick={(x) => write({ ...c, assistants: [...c.assistants, invite(x.id, x.name)] }, "دعوة معاون للتكتل", x.name)} />}
    </Card>
  );
}

// ───────────────────────── 4. Coordinators and female guides ─────────────────────────

function StaffStep({ req, editable, sortable }: { req: ClusterRequest; editable: boolean; sortable: boolean }) {
  const s = useStructure();
  const write = useWrite(req);
  const picks = usePicks(req);
  const c = req.cluster;
  const n = req.needs;
  const exclude = new Set([...placedIn(c), req.headId]);
  const live = (xs: ClusterInvite[]) => xs.filter((x) => x.status !== "declined").length;
  const combo = req.checks.find((x) => x.key === "combo");
  const coords = c.coordinators.filter((x) => x.status === "accepted");
  const setSort = (num: number, id: string) => {
    const sorting = { ...c.sorting };
    if (id) sorting[num] = id;
    else delete sorting[num];
    write({ ...c, sorting }, `توزيع ${groupName(num)} على منسق`, coords.find((x) => x.id === id)?.name ?? "دون منسق");
  };
  const spread = () => {
    if (!coords.length) return;
    const per = Math.ceil(req.groups.length / coords.length);
    write({ ...c, sorting: Object.fromEntries(req.groups.map((g, i) => [g.number, coords[Math.min(coords.length - 1, Math.floor(i / per))].id])) }, "توزيع المجموعات على المنسقين بالتساوي");
  };
  return (
    <div className="space-y-6">
      {editable && <StepNote title="المنسقون والموجّهات والمرشدات الدينيات" desc={`العدد محسوب من مجموع الفئات (${req.weight}): منسق لكل ${n.perCoordinator} وحدات، وموجّهة أو مرشدة لكل ${n.perGuide}.`} />}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="space-y-3 md:p-6">
          <SectionTitle icon={Building2} action={<Badge tone={coords.length === n.coordinators ? "green" : "gold"}>{coords.length} من {coordinatorsLabel(n.coordinators)}</Badge>}>
            المنسقون
          </SectionTitle>
          {combo && !combo.ok && n.coordinators > 0 && <p className="rounded-xl bg-maroon/5 px-3 py-2 text-xs font-bold text-maroon">يجب أن يكون أحد المنسقين بصفة «{roleName("assistant-tech", s)}».</p>}
          {c.coordinators.map((x) => (
            <InviteRow key={x.id} req={req} x={x} editable={editable} onRemove={() => write({ ...c, coordinators: c.coordinators.filter((m) => m.id !== x.id), sorting: Object.fromEntries(Object.entries(c.sorting).filter(([, who]) => who !== x.id)) }, `سحب دعوة ${x.name} منسقاً`, x.name)} />
          ))}
          {editable && <PersonPicker people={picks("coordinatorPool")} exclude={exclude} placeholder="ادعُ منسقاً" full={live(c.coordinators) >= n.coordinators ? `اكتمل العدد المسموح (${coordinatorsLabel(n.coordinators)}).` : undefined} onPick={(x) => write({ ...c, coordinators: [...c.coordinators, invite(x.id, x.name)] }, "دعوة منسق تقني", x.name)} />}
        </Card>
        <Card className="space-y-3 md:p-6">
          <SectionTitle icon={UsersRound} action={<Badge tone={c.femaleGuides.filter((x) => x.status === "accepted").length === n.femaleGuides ? "green" : "gold"}>{c.femaleGuides.filter((x) => x.status === "accepted").length} من {n.femaleGuides}</Badge>}>
            الموجّهات والمرشدات
          </SectionTitle>
          {c.femaleGuides.map((x) => (
            <InviteRow key={x.id} req={req} x={x} editable={editable} onRemove={() => write({ ...c, femaleGuides: c.femaleGuides.filter((m) => m.id !== x.id) }, `سحب دعوة ${x.name}`, x.name)} />
          ))}
          {editable && <PersonPicker people={picks("guidePool")} exclude={exclude} placeholder="ادعُ موجّهة أو مرشدة" full={live(c.femaleGuides) >= n.femaleGuides ? (n.femaleGuides ? `اكتمل العدد المسموح (${n.femaleGuides}).` : "لا موجّهات في هذا المستوى لهذا المجموع.") : undefined} onPick={(x) => write({ ...c, femaleGuides: [...c.femaleGuides, invite(x.id, x.name)] }, "دعوة موجّهة للتكتل", x.name)} />}
        </Card>
      </div>
      <Card className="md:p-6">
        <SectionTitle icon={Shuffle}>توزيع المجموعات على المنسقين</SectionTitle>
        <p className="mt-1 text-sm leading-7 text-ink-soft">يعمل كل منسق في المجموعات الموزَّعة عليه وحدها: يلحق بها الحجاج بعقودهم ويأخذ ملفاتهم الصحية (النظام الإداري: يوزّع رئيس التكتل المجموعات على منسقيه).</p>
        {sortable && coords.length > 0 && (
          <Button size="sm" variant="outline" className="mt-2" onClick={spread}>
            <Shuffle className="size-3.5" /> بالتساوي
          </Button>
        )}
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {req.groups.map((g) => (
            <li key={g.number} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-bold">{groupName(g.number)}</span>
              <select value={coords.some((x) => x.id === c.sorting[g.number]) ? c.sorting[g.number] : ""} disabled={!sortable} onChange={(e) => setSort(g.number, e.target.value)} aria-label={`منسق ${groupName(g.number)}`} className="h-9 rounded-lg border-2 border-gold/40 bg-white px-2 text-xs font-bold disabled:opacity-80">
                <option value="">— دون منسق —</option>
                {coords.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ───────────────────────── 5. The deputy, 6. the accountant ─────────────────────────

function DeputyStep({ req, editable }: { req: ClusterRequest; editable: boolean }) {
  const write = useWrite(req);
  const c = req.cluster;
  const heads = req.groups.filter((g) => g.headId !== req.headId);
  return (
    <Card className="space-y-3 md:p-6">
      <SectionTitle icon={Crown}>{DEPUTY_TITLE}</SectionTitle>
      <p className="text-sm leading-7 text-ink-soft">صفة ثانوية تُضاف لأحد رؤساء مجموعات التكتل الذين قبلوا. ينوب عن رئيس التكتل إن غاب لضرورة.</p>
      {c.deputy && <InviteRow req={req} x={c.deputy} note={`رئيس ${groupName(req.groups.find((g) => g.headId === c.deputy!.id)?.number ?? 0)}`} editable={editable} onRemove={() => write({ ...c, deputy: undefined }, `سحب دعوة ${c.deputy!.name} ${DEPUTY_TITLE}`, c.deputy!.name)} />}
      {editable && (!c.deputy || c.deputy.status === "declined") && (
        <ul className="space-y-1">
          {heads.length === 0 && <li className="text-xs text-hint">تظهر هنا رؤساء المجموعات بعد أن يقبلوا دعوة التكتل.</li>}
          {heads.map((g) => (
            <li key={g.number} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-sand">
              <span className="min-w-0 flex-1 truncate">
                {g.head} <span className="text-xs text-hint">— رئيس {groupName(g.number)}</span>
              </span>
              <Button size="sm" variant="outline" onClick={() => write({ ...c, deputy: invite(g.headId, g.head) }, `دعوة ${g.head} ${DEPUTY_TITLE}`, g.head)}>
                ادعُ
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AccountantStep({ req, editable }: { req: ClusterRequest; editable: boolean }) {
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const write = useWrite(req);
  const c = req.cluster;
  const names = new Map<string, string>();
  for (const g of req.groups) names.set(g.headId, g.head);
  for (const x of [...Object.values(c.seats).flat().map((y) => y.who), ...c.assistants, ...c.coordinators]) if (x?.status === "accepted") names.set(x.id, x.name);
  const people = cadreOf(req.headId, c).filter((id) => id !== req.headId && names.has(id) && !c.femaleGuides.some((x) => x.id === id));
  return (
    <Card className="space-y-3 md:p-6">
      <SectionTitle icon={Calculator}>{ACCOUNTANT_TITLE}</SectionTitle>
      <p className="text-sm leading-7 text-ink-soft">صفة ثانوية لأحد كوادر المجموعات أو التكتل الذين قبلوا (عدا الموجّهات والمرشدات). يجوز أن يكون نائب رئيس التكتل نفسه. يسجّل مصروفات التكتل المالية.</p>
      {c.accountant && <InviteRow req={req} x={c.accountant} editable={editable} onRemove={() => write({ ...c, accountant: undefined }, `سحب دعوة ${c.accountant!.name} ${ACCOUNTANT_TITLE}`, c.accountant!.name)} />}
      {editable && (!c.accountant || c.accountant.status === "declined") && (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {people.length === 0 && <li className="text-xs text-hint">يظهر هنا كادر التكتل بعد أن يقبلوا.</li>}
          {people.map((id) => (
            <li key={id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-sand">
              <span className="min-w-0 flex-1 truncate">
                {names.get(id)} <span className="text-xs text-hint">— {roleName(roleOfPerson(id, admins, cadre), s)}{c.deputy?.id === id ? ` — ${DEPUTY_TITLE}` : ""}</span>
              </span>
              <Button size="sm" variant="outline" onClick={() => write({ ...c, accountant: invite(id, names.get(id)!) }, `دعوة ${names.get(id)} ${ACCOUNTANT_TITLE}`, names.get(id))}>
                ادعُ
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ───────────────────────── 7. The report ─────────────────────────

function ReportStep({ req, editable }: { req: ClusterRequest; editable: boolean }) {
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const w = useFormationWindow();
  const c = req.cluster;
  const send = () => {
    sendCluster(req, admins);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 }, colors: ["#D9C89E", "#00594F"] });
    toast({ title: c.status === "rejected" ? "أُعيد إرسال الطلب" : c.status === "pending" ? "حُدّث الطلب المُرسَل" : "أُرسل الطلب للمراجعة", body: "يراجعه موظف إدارة الإداريين، فيعتمده أو يعيده إليك بملاحظات.", icon: "📨", tone: "success" });
  };
  const cta = c.status === "rejected" ? "إعادة الإرسال بعد التعديل" : c.status === "pending" ? "تحديث الطلب المُرسَل" : "اعتماد التقرير وإرسال الطلب";
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
      <Card className="md:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <SectionTitle icon={Printer}>التقرير النهائي</SectionTitle>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة
          </Button>
        </div>
        <ClusterReport req={req} signatures />
      </Card>
      <Card className="space-y-3 md:p-6">
        <SectionTitle icon={Send}>{editable ? "قبل الإرسال" : "شروط الطلب"}</SectionTitle>
        <ul className="space-y-1.5 text-sm">
          {req.checks.map((x) => (
            <li key={x.key} className={cn("flex items-start gap-2 rounded-xl px-3 py-2", x.ok ? "bg-green-light/10 text-green" : x.warn ? "bg-gold/20 text-maroon" : "bg-maroon/5 text-maroon")}>
              {x.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <CircleDashed className="mt-0.5 size-4 shrink-0" />} {x.label}
            </li>
          ))}
        </ul>
        {editable && (
          <>
            {w.state === "early" && !c.firstSentAt && <p className="text-xs text-green">أرسله حتى {dayLabel(w.early, true)} فينال التكتل «شارة الالتزام بالمواعيد».</p>}
            <Button size="lg" className="w-full" disabled={!req.complete} onClick={send}>
              <Send className="size-5" /> {cta}
            </Button>
            {!req.complete && <p className="text-xs text-maroon">يُرسل بعد أن تكتمل الشروط كلها.</p>}
          </>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── The approved cluster ─────────────────────────

function ManageCluster({ req }: { req: ClusterRequest }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const fee = useSeason().fees.clusterFormation;
  const s = useStructure();
  const [paying, setPaying] = useState(false);
  const c = req.cluster;
  const pay = (m: PayMethod) => {
    setPaying(true);
    setTimeout(() => {
      writeCluster(req, { ...c, feePaidAt: nowMs() }, admins);
      logAdmin(admin.id, `تسديد رسم ${c.name}`, formatUSD(fee), payMethodLabel(m), { area: "clusters", ref: c.id });
      toast({ title: "سُدّد رسم التكتل", body: "يصدر به إيصال رقمي.", icon: "🧾", tone: "success" });
      setPaying(false);
    }, 1500);
  };
  const header = (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-gold/30 bg-white px-4 py-3 text-sm">
        <Badge tone="green">
          <BadgeCheck className="size-3.5" /> معتمد — {c.decision?.by}
        </Badge>
        <span>{s.tiers.find((t) => t.id === c.tier)?.name}</span>
        <span>
          {DEPUTY_TITLE}: <b>{c.deputy?.status === "accepted" ? c.deputy.name : "—"}</b>
        </span>
        <span className="text-ink-soft">
          <b className="font-display text-lg text-green-dark">{req.groups.length}</b> مجموعات — <b className="font-display text-lg text-green-dark">{formatNumber(req.pilgrims)}</b> حاجاً بفئاتها
        </span>
      </div>
      <p className="rounded-2xl bg-sand px-4 py-2 text-xs leading-6 text-ink-soft">تعديل مجموعات التكتل وكادره بعد اعتماده للإدارة: تعيد فتح الطلب لك، أو تعدّله تعديلاً استثنائياً بسبب يُسجَّل. توزيع المجموعات على المنسقين لك متى شئت.</p>
      {!c.feePaidAt && (
        <div className="rounded-2xl border-2 border-gold/40 bg-sand p-4">
          <p className="font-bold">
            رسم التكتل <span className="font-display text-xl text-maroon">{formatUSD(fee)}</span> — يُدفع بعد الاعتماد
          </p>
          {paying ? <p className="mt-3 font-bold text-green-dark">نتحقق من الدفع...</p> : <PayMethods amount={fee} reference={`1448-C-${admin.id.slice(-4)}`} bankReference={`1448-BANK-C${admin.id.slice(-4)}`} cta="ادفع رسم التكتل —" onConfirm={pay} />}
        </div>
      )}
      <StandingCard scope="cluster" name={c.name} />
    </>
  );
  return <RequestDesk req={req} mode="manage" editable={false} header={header} />;
}

function DeputyCluster({ req }: { req: ClusterRequest }) {
  const admin = useAdmin()!;
  const header = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-gold/30 bg-white px-4 py-3 text-sm">
      <Badge tone="gold">
        <UserCheck className="size-3.5" /> {DEPUTY_TITLE}
      </Badge>
      <span>
        رئيسه: <b>{req.headName}</b>
      </span>
      <span className="text-ink-soft">تتابع مجموعاته كلها وتنوب عنه{admin.profile?.group ? `، ومجموعتك (${groupName(admin.profile.group.number)}) إحداها` : ""}. الدعوة والتوزيع لرئيس التكتل وحده.</span>
    </div>
  );
  return <RequestDesk req={req} mode="deputy" editable={false} header={header} />;
}

export { acceptedGroups };
