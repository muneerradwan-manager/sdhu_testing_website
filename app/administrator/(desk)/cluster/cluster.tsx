"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CircleDashed, Crown, FileSignature, Globe, Inbox, Lock, Search, Send, Shuffle, UserCheck, UserMinus, UsersRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { OperationClosed } from "@/components/app/operation-closed";
import { PayMethods, payMethodLabel, type PayMethod } from "@/components/payment/methods";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { dayLabel, rangeLabel, useOperation } from "@/lib/operations";
import { useSeason } from "@/lib/season-live";
import { useStore, type ClusterInvite, type TeamPool } from "@/lib/store";
import { cn, formatNumber, formatUSD } from "@/lib/utils";
import { DEMO_ADMINS, adminName, candidacy, deputyEligible, isClusterRole, logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { HEADS_POOL, acceptedGroups, clusterViewOf } from "../../_lib/cluster";
import { coordinatorsLabel } from "../../_lib/coordinators";
import {
  DEPUTY_TITLE,
  POOLS,
  POOL_ORDER,
  answerInvitation,
  invitationsFor,
  newCluster,
  saveCluster,
  useClusterRequests,
  useGroupPool,
  useMyInvitations,
  type Cluster,
  type ClusterRequest,
  type Inbound,
} from "../../_lib/formation";
import { ROSTER, skillLabel } from "../../_lib/roster";
import { StandingCard } from "../../_components/standing";
import { AdminShell, LockedCard, SectionTitle, SimButton } from "../../_components/ui";
import { AdminRequests } from "../requests/requests";
import { ClusterPublicProfile } from "./public-profile";

/**
 * Two operations of their own. «تشكيل التكتلات» runs in its dates, alongside the pilgrims joining the
 * groups: nobody is elected — a group head who meets the season's conditions files a request and is its
 * head from then on. He invites the groups he wants (each with the pilgrims it has), his deputy, and the
 * cluster's people — religious guides, technical coordinators, assistants — for the cluster, not group by
 * group, then assigns them to the groups as he sees fit. Everyone answers his own invitation. At the
 * deadline the administration approves a complete request and excludes an incomplete one.
 * «إدارة التكتل» is the approved cluster, for its head and his deputy — one cluster, in tabs (ClusterDesk).
 */
export function AdminCluster({ part }: { part: "formation" | "manage" }) {
  const admin = useAdmin()!;
  const p = admin.profile;
  const requests = useClusterRequests();
  const mine = requests.find((r) => r.headId === admin.id);
  const view = clusterViewOf(p, admin.name);
  const theirs = view ? requests.find((r) => r.cluster.id === view.id) : undefined;

  if (!p?.positions?.length) {
    return (
      <AdminShell title={part === "manage" ? "إدارة التكتل" : "تشكيل التكتلات"} subtitle="يشكّل التكتلَ رئيسُ مجموعة يستوفي شروط الموسم، ويدعو إليه المجموعات وفريقه.">
        <LockedCard title="بعد تسجيلك كإداري" text="سجّل لموسم 1448 في صفة واحدة. رئيس المجموعة يشكّل مجموعته وحده، ثم يُدعى إلى تكتل أو يقدّم طلب تشكيل تكتل إن استوفى الشروط؛ والموجّه والمنسق والمعاون يدعوهم رؤساء التكتلات." href="/administrator/apply" cta="التسجيل كإداري" />
      </AdminShell>
    );
  }

  if (part === "manage") {
    if (!view || !theirs || theirs.decision?.status !== "approved") {
      return (
        <AdminShell title="إدارة التكتل" subtitle="التكتل المعتمد: مجموعاته وحجاجها، وفريقه وإسناده، وصفحته العامة — لرئيسه ونائبه.">
          <LockedCard title="لا تكتل معتمد تديره" text="يُدار التكتل هنا بعد أن تعتمده الإدارة عند انتهاء مدة الطلبات. الطلب نفسه عملية مستقلة في «تشكيل التكتلات»." href="/administrator/cluster" cta="تشكيل التكتلات" />
        </AdminShell>
      );
    }
    return (
      <AdminShell title={theirs.cluster.name} subtitle={view.isHead ? "تكتلك المعتمد: تدير مجموعاته كلها، وتسند فريقه إليها، وتضيف إليه من تحتاج." : `تكتلك الذي دعاك رئيسه ${view.headName} نائباً له. تتابع مجموعاته وفريقه وتنوب عنه.`}>
        {view.isHead ? <ManageCluster req={theirs} /> : <DeputyCluster req={theirs} />}
      </AdminShell>
    );
  }

  return (
    <AdminShell title="تشكيل التكتلات" subtitle="لا انتخاب: يقدّم طلبَ تشكيل التكتل رئيسُ مجموعة يستوفي شروط الموسم، فيدعو المجموعات وفريقه ويسندهم إليها، ويُحسم الطلب عند الموعد النهائي.">
      {mine ? <MyRequest req={mine} /> : p.positions[0] === "group-head" && !isClusterRole(p) ? <GroupHeadFormation /> : <Invitations />}
    </AdminShell>
  );
}

// ───────────────────────── A group head: file a request, or answer the invitations to his group ─────────────────────────

function GroupHeadFormation() {
  const admin = useAdmin()!;
  const p = admin.profile!;
  const toast = useToast();
  const season = useSeason();
  const rules = season.administrators;
  const op = useOperation("cluster-formation");
  const admins = useStore((s) => s.admins);
  const c = candidacy(admin.id, rules);
  const [name, setName] = useState(`تكتل ${admin.person.firstName} لخدمة الحجاج`);
  const g = p.group;
  const inbox = useMyInvitations(admin.id);
  const joined = inbox.find((x) => x.kind === "group" && x.invite.status === "accepted");

  const file = () => {
    const at = nowMs();
    const id = `cluster-${admin.id.slice(-4)}`;
    const own = { id: admin.id, name: admin.name, at, status: "accepted" as const, number: g!.number, office: "مكتب دمشق", capacity: g!.capacity, pilgrims: 0 };
    saveCluster({ id: admin.id, name: admin.name, group: g!.number }, newCluster(id, name.trim(), at, own), admins);
    logAdmin(admin.id, `طلب تشكيل ${name.trim()}`, groupName(g!.number), `${c.reason} — طلب أولي حتى ${dayLabel(op.end, true)}`, { area: "clusters", ref: id });
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ["#D9C89E", "#00594F"] });
    toast({ title: `قدّمت طلب ${name.trim()}`, body: "أنت رئيسه من الآن. ادعُ المجموعات ونائبك وفريقك، ثم أسندهم إلى المجموعات.", icon: "🏛️", tone: "success" });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <Card>
          <SectionTitle icon={Crown}>طلب تشكيل تكتل</SectionTitle>
          <ul className="mt-4 space-y-2 text-sm">
            {[
              `شرط الطلب: ${rules.clusterHeadSeasons} مواسم متتالية رئيساً لمجموعة بتقييم ${rules.clusterHeadMinRating} فأكثر`,
              `يُعتمد التكتل المكتمل عند الموعد النهائي (${dayLabel(op.end, true)}): ${rules.clusterMinGroups} مجموعات على الأقل، و${DEPUTY_TITLE}، ولكل مجموعة موجّه ومنسق ومعاون`,
              "الناقص يُقصى، وتوزّع الإدارة مجموعاته على التكتلات المعتمدة",
              `رسم التكتل ${formatUSD(season.fees.clusterFormation)} بعد اعتماده`,
            ].map((t) => (
              <li key={t} className="flex gap-2 rounded-xl bg-sand px-3 py-2">
                <Check className="mt-0.5 size-4 shrink-0 text-green-light" /> {t}
              </li>
            ))}
          </ul>
          {!op.open ? (
            <div className="mt-5">
              <OperationClosed state={op} />
            </div>
          ) : !c.ok ? (
            <p className="mt-5 rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">
              <Lock className="mb-0.5 inline size-4" /> لا تستوفي شرط الطلب: {c.reason}. تدعوك التكتلات إليها، فتقبل دعوة لمجموعتك.
            </p>
          ) : !g?.approvedAt ? (
            <p className="mt-5 rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">تستوفي الشرط ({c.reason})، لكن مجموعتك لم تُعتمد بعد: يدخل التكتلَ رئيسُ مجموعة معتمدة بمجموعته.</p>
          ) : joined ? (
            <p className="mt-5 rounded-2xl bg-green-light/10 p-4 text-sm font-semibold text-green">قبلتَ دعوة {joined.req.cluster.name} لمجموعتك، فلا تقدّم طلباً آخر.</p>
          ) : (
            <div className="mt-5 space-y-3">
              <p className="rounded-2xl bg-green-light/10 p-3 text-sm font-semibold text-green">تستوفي شرط الطلب: {c.reason}.</p>
              <label className="block">
                <span className="mb-2 block font-bold">اسم التكتل</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-14 w-full rounded-2xl border-2 border-gold/50 px-4 outline-none focus:border-green-light" />
              </label>
              <Button size="lg" disabled={!name.trim()} onClick={file}>
                <FileSignature className="size-5" /> أقدّم طلب تشكيل التكتل
              </Button>
              <p className="text-xs text-hint">مجموعتك ({groupName(g.number)}) فيه من البداية، وأنت رئيسه من لحظة الطلب. يبقى أولياً حتى الموعد النهائي.</p>
            </div>
          )}
        </Card>
      </div>
      <Invitations compact />
    </div>
  );
}

// ───────────────────────── The invitations an administrator received ─────────────────────────

function Invitations({ compact = false }: { compact?: boolean }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const op = useOperation("cluster-formation");
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  const inbox = useMemo(() => invitationsFor(admin.id, requests), [admin.id, requests]);
  const answer = (x: Inbound, status: "accepted" | "declined") => {
    answerInvitation({ id: admin.id, name: admin.name }, x, status, admins, requests, status === "declined" ? "اعتذر من حسابه" : undefined);
    toast(status === "accepted" ? { title: `قبلتَ دعوة ${x.req.cluster.name}`, body: x.kind === "group" ? "مجموعتك وحجاجها في طلب التكتل، ويُحسم عند الموعد النهائي." : "يسند إليك رئيسه مجموعاتك.", icon: "🤝", tone: "success" } : { title: "اعتذرتَ عن الدعوة", body: x.req.cluster.name, icon: "📩", tone: "info" });
  };
  const what = (x: Inbound) => (x.kind === "group" ? `${groupName(x.number!)} وحجاجها` : x.kind === "deputy" ? DEPUTY_TITLE : POOLS[x.kind].one);

  return (
    <Card className={compact ? "md:p-6" : undefined}>
      <SectionTitle icon={Inbox} action={<Badge tone="gold">{inbox.filter((x) => x.invite.status === "pending").length} بانتظار ردك</Badge>}>
        دعواتي
      </SectionTitle>
      <p className="mt-2 text-sm leading-7 text-ink-soft">{compact ? "رؤساء التكتلات يدعون المجموعات إليها. تقبل دعوة واحدة لمجموعتك، فتدخل بحجاجها." : "رؤساء التكتلات يختارون موجّهيهم ومنسقيهم ومعاونيهم للتكتل كله، ثم يسندون كل واحد إلى ما يرونه من مجموعاته. تقبل دعوة واحدة."}</p>
      {!op.open && <p className="mt-3 rounded-2xl bg-sand p-3 text-sm text-ink-soft">مدة تشكيل التكتلات {rangeLabel(op.start, op.end)}. الرد على الدعوات في مدتها.</p>}
      <ul className="mt-4 space-y-2">
        {inbox.length === 0 && <li className="rounded-2xl bg-sand p-4 text-sm text-hint">لا دعوات بعد.</li>}
        {inbox.map((x) => (
          <li key={`${x.req.cluster.id}-${x.kind}`} className={cn("rounded-2xl border-2 p-3", x.invite.status === "accepted" ? "border-green-light/50 bg-green-light/5" : x.invite.status === "declined" ? "border-ink/10 bg-sand/50" : "border-gold-dark/50")}>
            <p className="font-bold">{x.req.cluster.name}</p>
            <p className="text-xs text-ink-soft">
              رئيسه {x.req.headName} — يدعو {what(x)}
            </p>
            {x.invite.status === "pending" ? (
              op.open && (
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

function useAutoAnswers(c: Cluster, write: (next: Cluster) => void) {
  const admins = useStore((s) => s.admins);
  useEffect(() => {
    const off = (x: ClusterInvite) => x.status === "pending" && !admins[x.id];
    const any = Object.values(c.groups).some(off) || (c.deputy && off(c.deputy)) || POOL_ORDER.some((k) => c.team[k].some(off));
    if (!any) return;
    const t = window.setTimeout(() => {
      const reply = <T extends ClusterInvite>(x: T): T => (off(x) ? { ...x, at: nowMs(), status: DECLINES[x.id] ? "declined" : "accepted", reason: DECLINES[x.id] } : x);
      write({
        ...c,
        groups: Object.fromEntries(Object.entries(c.groups).map(([n, g]) => [n, reply(g)])),
        deputy: c.deputy && reply(c.deputy),
        team: { guide: c.team.guide.map(reply), tech: c.team.tech.map(reply), assistant: c.team.assistant.map(reply) },
      });
    }, 2500);
    return () => window.clearTimeout(t);
  }, [c, admins, write]);
}

function MyRequest({ req }: { req: ClusterRequest }) {
  const op = useOperation("cluster-formation");
  const editable = op.open && !req.decision;
  const c = req.cluster;
  if (req.decision?.status === "approved") {
    return <LockedCard title={`اعتُمد ${c.name}`} text={`اكتمل عند الموعد النهائي فاعتمدته الإدارة (${req.decision.by}). يُدار من الآن في «إدارة التكتل».`} href="/administrator/clusters" cta="إدارة التكتل" />;
  }
  const header = (
    <div className="space-y-6">
      <RequestHeader req={req} />
      {req.decision?.status === "excluded" ? (
        <Card className="border-2 border-maroon/30">
          <p className="font-display text-xl font-bold text-maroon">أُقصي طلب {c.name}</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">لم يكتمل عند الموعد النهائي: {req.decision.reason ?? req.checks.filter((x) => !x.ok).map((x) => x.label).join("، ")}. وزّعت الإدارة مجموعاته على التكتلات المعتمدة، ومجموعتك منها.</p>
        </Card>
      ) : !editable ? (
        <p className="rounded-2xl bg-gold/20 p-4 text-sm font-semibold text-maroon">{op.status === "closed" ? `انتهت مدة الطلبات ${dayLabel(op.end, true)}. طلبك عند الإدارة: تعتمده إن اكتمل، أو تقصيه.` : "مدة تشكيل التكتلات ليست مفتوحة الآن، فلا دعوة ولا تعديل."}</p>
      ) : null}
    </div>
  );
  return <ClusterDesk req={req} editable={editable} head header={header} />;
}

function RequestHeader({ req }: { req: ClusterRequest }) {
  const op = useOperation("cluster-formation");
  const c = req.cluster;
  const groups = acceptedGroups(c);
  const pilgrims = groups.reduce((n, g) => n + g.pilgrims, 0);
  return (
    <Card className="md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge tone={req.decision ? (req.decision.status === "approved" ? "green" : "maroon") : "gold"}>
            {req.decision ? (req.decision.status === "approved" ? "معتمد" : "مُقصى") : `طلب أولي — يُحسم بعد ${dayLabel(op.end)}`}
          </Badge>
          <h2 className="mt-2 font-display text-3xl font-bold text-green-dark">{c.name}</h2>
          <p className="text-sm text-ink-soft">
            رئيسه أنت — {groups.length} مجموعات، و{formatNumber(pilgrims)} حاجاً فيها حتى الآن
          </p>
        </div>
        <Badge tone={req.complete ? "green" : "maroon"} className="text-sm">
          {req.complete ? "مكتمل" : `ناقص: ${req.checks.filter((x) => !x.ok).length}`}
        </Badge>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {req.checks.map((x) => (
          <li key={x.key} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm", x.ok ? "bg-green-light/10 text-green" : "bg-maroon/5 text-maroon")}>
            {x.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <CircleDashed className="mt-0.5 size-4 shrink-0" />} {x.label}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Groups, deputy, the cluster's people, and who serves which group */
type DeskTab = "groups" | "team" | "assign" | "page";

/**
 * One cluster in tabs, in the order the work is done — like the field's tools, not one long page: its
 * groups (each opens on its own page in an approved cluster), its people (the deputy and the guides,
 * coordinators and assistants), who serves which group, and its public page. What is not a tab — the
 * request's checks, or the approved cluster's approval, fee and standing — is a short header above them,
 * never a tab of its own that repeats the others. The head edits; the deputy sees the same tabs read-only.
 */
function ClusterDesk({ req, editable, head, header, publicPage = false }: { req: ClusterRequest; editable: boolean; head: boolean; header: ReactNode; publicPage?: boolean }) {
  const admin = useAdmin()!;
  const admins = useStore((s) => s.admins);
  const write = useMemo(() => (next: Cluster) => saveCluster({ id: admin.id, name: admin.name, group: admin.profile?.group?.number }, next, admins), [admin, admins]);
  const [tab, setTab] = useState<DeskTab>("groups");
  // The group opened from the groups tab; a group of an approved cluster opens on its own page here
  const [opened, setOpened] = useState<number | null>(null);
  const openable = req.decision?.status === "approved";
  const c = req.cluster;

  const people = [c.deputy, ...POOL_ORDER.flatMap((pool) => c.team[pool])].filter((x): x is ClusterInvite => !!x);
  const team = people.filter((x) => x.status === "accepted").length;
  const waiting = people.filter((x) => x.status === "pending").length;
  const missing = req.groups.reduce((n, g) => n + POOL_ORDER.filter((pool) => !c.team[pool].some((x) => x.status === "accepted" && x.id === c.posts[pool][g.number])).length, 0);

  const tabs: { key: DeskTab; label: string; icon: LucideIcon; badge?: string; urgent?: boolean }[] = [
    { key: "groups", label: "المجموعات", icon: UsersRound, badge: String(req.groups.length) },
    { key: "team", label: "الفريق", icon: UserCheck, badge: String(team), urgent: waiting > 0 },
    { key: "assign", label: "الإسناد", icon: Shuffle, badge: missing ? String(missing) : undefined, urgent: missing > 0 },
    ...(publicPage ? [{ key: "page" as const, label: "الصفحة العامة", icon: Globe }] : []),
  ];

  return (
    <div className="space-y-6">
      {head && <AutoAnswers c={c} write={write} />}
      {header}
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-2xl border border-gold/30 bg-white p-1" role="tablist" aria-label={c.name}>
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => { setOpened(null); setTab(t.key); }} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === t.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === t.key && <motion.span layoutId="cluster-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
              {t.badge && <span className={cn("relative rounded-full px-1.5 text-[11px] tabular-nums", t.urgent ? "bg-maroon text-white" : tab === t.key ? "bg-white/20" : "bg-sand")}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${tab}-${opened ?? ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
          {tab === "groups" &&
            (opened !== null && req.groups.some((g) => g.number === opened) ? (
              <GroupDesk req={req} number={opened} editable={editable} write={write} onBack={() => setOpened(null)} />
            ) : (
              <GroupsPanel req={req} editable={editable} write={write} onOpen={openable ? setOpened : undefined} />
            ))}
          {tab === "team" && (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <DeputyPanel req={req} editable={editable} write={write} />
              {POOL_ORDER.map((pool) => (
                <PoolPanel key={pool} req={req} pool={pool} editable={editable} write={write} />
              ))}
            </div>
          )}
          {tab === "assign" && <AssignmentPanel req={req} editable={editable} write={write} />}
          {tab === "page" && <ClusterPublicProfile />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The simulated invitees answer on their own, whichever tab is open — only for the head, who owns the request */
function AutoAnswers({ c, write }: { c: Cluster; write: (next: Cluster) => void }) {
  useAutoAnswers(c, write);
  return null;
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
function SimAnswer({ req, kind, id }: { req: ClusterRequest; kind: Inbound["kind"]; id: string }) {
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  if (!admins[id]) return null;
  const inbound = invitationsFor(id, requests).find((x) => x.req.cluster.id === req.cluster.id && x.kind === kind);
  if (!inbound || inbound.invite.status !== "pending") return null;
  return (
    <SimButton className="px-3 py-1.5 text-xs" onClick={() => answerInvitation({ id, name: adminName(id) }, inbound, "accepted", admins, requests)}>
      محاكاة: قبِل من حسابه
    </SimButton>
  );
}

type Write = (next: Cluster) => void;

function GroupsPanel({ req, editable, write, onOpen }: { req: ClusterRequest; editable: boolean; write: Write; onOpen?: (n: number) => void }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const c = req.cluster;
  const pool = useGroupPool(admin.id);
  const [q, setQ] = useState("");
  const invited = new Set(Object.values(c.groups).map((g) => g.number));
  const found = pool.filter((g) => !invited.has(g.number) && (!q.trim() || groupName(g.number).includes(q.trim()) || g.headName.includes(q.trim()) || g.office.includes(q.trim())));
  // An approved cluster's groups are the ones it has now (with those the distribution gave it), then its open invitations
  const list = (onOpen ? [...req.groups, ...Object.values(c.groups).filter((g) => g.status !== "accepted" && !req.groups.some((x) => x.number === g.number))] : Object.values(c.groups)).sort(
    (a, b) => Number(b.id === admin.id) - Number(a.id === admin.id),
  );

  const invite = (g: (typeof pool)[number]) => {
    write({ ...c, groups: { ...c.groups, [g.number]: { id: g.headId, name: g.headName, at: nowMs(), status: "pending", number: g.number, office: g.office, capacity: g.capacity, pilgrims: g.pilgrims } } });
    logAdmin(admin.id, `دعوة ${groupName(g.number)} إلى ${c.name}`, g.headName, `${g.pilgrims} حاجاً من ${g.capacity}`, { area: "clusters", ref: c.id });
    toast({ title: `دُعيت ${groupName(g.number)}`, body: `يرد عليها رئيسها ${g.headName}.`, icon: "✉️", tone: "info" });
  };
  const withdraw = (n: number) => {
    const rest = { ...c.groups };
    delete rest[n];
    const posts = Object.fromEntries(POOL_ORDER.map((k) => [k, Object.fromEntries(Object.entries(c.posts[k]).filter(([m]) => Number(m) !== n))])) as Cluster["posts"];
    write({ ...c, groups: rest, posts });
    logAdmin(admin.id, `سحب ${groupName(n)} من ${c.name}`, undefined, undefined, { area: "clusters", ref: c.id });
  };

  return (
    <Card>
      <SectionTitle icon={UsersRound} action={<Badge tone="gold">{acceptedGroups(c).length} في التكتل</Badge>}>
        المجموعات
      </SectionTitle>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        {onOpen ? "اضغط على مجموعة لتفتحها: تفاصيلها، وفريقها، وحجاجها وعقودهم." : "كل مجموعة تدخل بحجاجها الذين انضموا إليها حتى الآن، ويبقى رئيسها رئيسها. ويستمر إلحاق الحجاج بها بعد ذلك على يد رئيسها ومن تسنده إليها."}
      </p>
      <ul className="mt-4 space-y-2">
        {list.map((g) => {
          const opens = !!onOpen && req.groups.some((x) => x.number === g.number);
          return (
          <li key={g.number} className={cn("relative flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold/30 p-3", opens && "transition hover:border-gold-dark hover:shadow-md")}>
            {opens && <button type="button" onClick={() => onOpen!(g.number)} className="absolute inset-0 rounded-2xl" aria-label={`فتح ${groupName(g.number)}`} />}
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sand text-green-dark">
              <UsersRound className="size-5" />
            </span>
            <span className="pointer-events-none min-w-0 flex-1 text-sm">
              <span className="block font-bold">
                {groupName(g.number)} — {g.id === admin.id ? `${admin.name} (مجموعتك)` : g.name}
              </span>
              <span className="block text-xs text-ink-soft">
                {g.office} — {g.pilgrims} حاجاً من {g.capacity}
              </span>
            </span>
            {g.id !== admin.id && !opens && <Status x={g} />}
            {g.id !== admin.id && !opens && <SimAnswer req={req} kind="group" id={g.id} />}
            {opens && <ArrowLeft className="size-5 text-gold-dark" />}
            {editable && g.id !== admin.id && !opens && (
              <button type="button" onClick={() => withdraw(g.number)} aria-label={`سحب ${groupName(g.number)}`} className="grid size-9 place-items-center rounded-xl text-hint hover:bg-maroon/10 hover:text-maroon">
                <X className="size-4" />
              </button>
            )}
          </li>
          );
        })}
      </ul>
      {editable && (
        <div className="mt-5">
          <label className="flex items-center gap-2 rounded-2xl border-2 border-gold/40 px-3">
            <Search className="size-4 text-hint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ادعُ مجموعة: باسمها أو برئيسها أو بمكتبها" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
            {found.slice(0, 12).map((g) => (
              <li key={g.number} className="flex items-center gap-3 rounded-xl bg-sand/70 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{groupName(g.number)}</span>
                  <span className="block text-xs text-ink-soft">
                    {g.headName} — {g.office} — {g.pilgrims}/{g.capacity} {g.takenBy && <b className="text-maroon">— في {g.takenBy}</b>}
                  </span>
                </span>
                <Button size="sm" variant="outline" disabled={!!g.takenBy} onClick={() => invite(g)}>
                  <Send className="size-3.5" /> ادعُ
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/**
 * One group of the cluster, opened from its groups: who heads it and where, its seats, who serves in it (the
 * head assigns them here as in «الإسناد»), and its pilgrims — the families its contracts attached, their
 * welcome and health files, and new contracts. Everything a group's own tabs held, inside the cluster.
 */
function GroupDesk({ req, number, editable, write, onBack }: { req: ClusterRequest; number: number; editable: boolean; write: Write; onBack: () => void }) {
  const admin = useAdmin()!;
  const c = req.cluster;
  const g = req.groups.find((x) => x.number === number)!;
  const own = g.id === admin.id;
  const people = (pool: TeamPool) => c.team[pool].filter((x) => x.status === "accepted");
  const set = (pool: TeamPool, id: string) => {
    const next = { ...c.posts[pool] };
    if (id) next[number] = id;
    else delete next[number];
    write({ ...c, posts: { ...c.posts, [pool]: next } });
    logAdmin(admin.id, `إسناد ${POOLS[pool].title} في ${groupName(number)}`, people(pool).find((x) => x.id === id)?.name ?? "دون إسناد", c.name, { area: "clusters", ref: c.id });
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold text-green-dark hover:bg-sand">
        <ArrowRight className="size-4" /> كل مجموعات {c.name}
      </button>
      <Card className="md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone={g.distributed ? "gold" : "green"}>{g.distributed ? "أُلحقت بالتكتل بتوزيع الإدارة" : own ? "مجموعتك" : "قبل رئيسها دعوة التكتل"}</Badge>
            <h2 className="mt-2 font-display text-3xl font-bold text-green-dark">{groupName(number)}</h2>
            <p className="text-sm text-ink-soft">
              رئيسها المباشر: <b>{own ? `${admin.name} (أنت)` : g.name}</b> — {g.office}
            </p>
          </div>
          <p className="text-sm text-ink-soft">
            سعتها <b className="font-display text-xl text-green-dark">{g.capacity}</b> حاجاً
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {POOL_ORDER.map((pool) => {
            const who = c.posts[pool][number];
            return (
              <label key={pool} className="block rounded-2xl bg-sand p-3">
                <span className="text-xs text-hint">{POOLS[pool].one}</span>
                {editable ? (
                  <select value={who ?? ""} onChange={(e) => set(pool, e.target.value)} aria-label={`${POOLS[pool].one} ${groupName(number)}`} className="mt-1 h-10 w-full rounded-xl border-2 border-gold/40 bg-white px-2 text-sm font-bold outline-none focus:border-green-light">
                    <option value="">— لم يُسند —</option>
                    {people(pool).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={cn("mt-1 block font-bold", !who && "text-maroon")}>{c.team[pool].find((x) => x.id === who)?.name ?? "لم يُسند"}</span>
                )}
              </label>
            );
          })}
        </div>
      </Card>
      <AdminRequests fixed={number} embedded />
    </div>
  );
}

function DeputyPanel({ req, editable, write }: { req: ClusterRequest; editable: boolean; write: Write }) {
  const admin = useAdmin()!;
  const rules = useSeason().administrators;
  const admins = useStore((s) => s.admins);
  const requests = useClusterRequests();
  const c = req.cluster;
  const takenBy = (id: string) => requests.find((r) => r.cluster.id !== c.id && r.cluster.deputy?.id === id && r.cluster.deputy.status === "accepted")?.cluster.name;
  const pool = useMemo(() => {
    const live = Object.values(admins)
      .filter((a) => a.nationalId !== admin.id && a.positions[0] === "group-head")
      .map((a) => ({ id: a.nationalId, name: adminName(a.nationalId), ...deputyEligible(a.nationalId, rules) }));
    const demo = DEMO_ADMINS.filter((d) => d.position === "group-head" && d.id !== admin.id && !admins[d.id]).map((d) => ({ id: d.id, name: adminName(d.id), ...deputyEligible(d.id, rules) }));
    const seeds = HEADS_POOL.map((h) => ({ id: h.id, name: h.name, ok: h.seasons >= rules.deputySeasons, seasons: h.seasons }));
    return [...live, ...demo, ...seeds].filter((x) => x.ok);
  }, [admins, admin.id, rules]);

  const invite = (x: { id: string; name: string }) => {
    write({ ...c, deputy: { id: x.id, name: x.name, at: nowMs(), status: "pending" } });
    logAdmin(admin.id, `دعوة ${x.name} ${DEPUTY_TITLE} في ${c.name}`, x.name, undefined, { area: "clusters", ref: c.id });
  };

  return (
    <Card className="md:p-6">
      <SectionTitle icon={UserCheck}>{DEPUTY_TITLE}</SectionTitle>
      <p className="mt-1 text-xs text-hint">رئيس مجموعة سابق ({rules.deputySeasons} {rules.deputySeasons === 1 ? "موسم" : "مواسم"} فأكثر). واحد للتكتل.</p>
      {c.deputy && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-sand p-3">
          <span className="min-w-0 flex-1 font-bold">{c.deputy.name}</span>
          <Status x={c.deputy} />
          <SimAnswer req={req} kind="deputy" id={c.deputy.id} />
          {editable && (
            <button type="button" onClick={() => write({ ...c, deputy: undefined })} className="text-xs font-bold text-maroon">
              سحب
            </button>
          )}
        </div>
      )}
      {editable && (!c.deputy || c.deputy.status === "declined") && (
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {pool.map((x) => (
            <li key={x.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-sand">
              <span className="min-w-0 flex-1 truncate">
                {x.name} <span className="text-xs text-hint">— {x.seasons} مواسم رئيساً</span>
              </span>
              {takenBy(x.id) ? (
                <span className="text-xs text-maroon">نائب في {takenBy(x.id)}</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => invite(x)}>
                  ادعُ
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** One of the cluster's pools: invited one by one, for the cluster and not for a group */
function PoolPanel({ req, pool, editable, write }: { req: ClusterRequest; pool: TeamPool; editable: boolean; write: Write }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const requests = useClusterRequests();
  const c = req.cluster;
  const def = POOLS[pool];
  const [q, setQ] = useState("");
  const members = c.team[pool];
  const accepted = members.filter((x) => x.status === "accepted").length;
  const limited = pool === "tech";
  const full = limited && members.filter((x) => x.status !== "declined").length >= req.allowed;
  const takenBy = (id: string) => requests.find((r) => r.cluster.id !== c.id && POOL_ORDER.some((k) => r.cluster.team[k].some((x) => x.id === id && x.status === "accepted")))?.cluster.name;
  const found = ROSTER.filter((x) => x.roleKey === def.roster && !members.some((m) => m.id === x.id) && (!q.trim() || x.name.includes(q.trim()) || x.area.includes(q.trim()) || x.office.includes(q.trim()) || x.skills.some((s) => skillLabel(s).includes(q.trim())))).sort((a, b) => b.score - a.score);

  const invite = (x: (typeof ROSTER)[number]) => {
    write({ ...c, team: { ...c.team, [pool]: [...members, { id: x.id, name: x.name, at: nowMs(), status: "pending" }] } });
    logAdmin(admin.id, `دعوة ${def.one} إلى ${c.name}`, x.name, `${x.office} — نتيجة التأهيل ${x.score}`, { area: "clusters", ref: c.id });
    toast({ title: `أُرسلت الدعوة إلى ${x.name}`, body: "تصله وحده، ويقبل أو يعتذر من حسابه.", icon: "✉️", tone: "info" });
  };
  const remove = (id: string) => {
    const posts = { ...c.posts, [pool]: Object.fromEntries(Object.entries(c.posts[pool]).filter(([, who]) => who !== id)) };
    write({ ...c, team: { ...c.team, [pool]: members.filter((m) => m.id !== id) }, posts });
  };

  return (
    <Card className="md:p-6">
      <SectionTitle icon={UsersRound} action={<Badge tone="gold">{limited ? `${accepted} من ${coordinatorsLabel(req.allowed)}` : `${accepted} قبِلوا`}</Badge>}>
        {def.label}
      </SectionTitle>
      <p className="mt-1 text-xs text-hint">
        {def.note}. {limited ? "عددهم بحسب فئة التكتل عند إدارة الإداريين." : "تختارهم للتكتل، ثم تسند كل واحد إلى مجموعة أو أكثر."}
      </p>
      <ul className="mt-3 space-y-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 font-bold">{m.name}</span>
            <Status x={m} />
            <SimAnswer req={req} kind={pool} id={m.id} />
            {editable && (
              <button type="button" onClick={() => remove(m.id)} aria-label={`إخراج ${m.name}`} className="grid size-8 place-items-center rounded-lg text-hint hover:bg-maroon/10 hover:text-maroon">
                <UserMinus className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && !full && (
        <div className="mt-3">
          <label className="flex items-center gap-2 rounded-xl border-2 border-gold/40 px-3">
            <Search className="size-4 text-hint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو المنطقة أو المهارة" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
            {found.slice(0, 8).map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-sand">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{x.name}</span>
                  <span className="block text-[11px] text-hint">
                    {x.office} — {x.area} — نتيجة التأهيل {x.score}
                  </span>
                </span>
                {takenBy(x.id) ? (
                  <span className="text-[11px] text-maroon">في {takenBy(x.id)}</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => invite(x)}>
                    ادعُ
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Who serves each group: one guide, one coordinator and one assistant each, any of them for several groups */
function AssignmentPanel({ req, editable, write }: { req: ClusterRequest; editable: boolean; write: Write }) {
  const admin = useAdmin()!;
  const c = req.cluster;
  const groups = req.groups;
  const people = (pool: TeamPool) => c.team[pool].filter((x) => x.status === "accepted");
  const set = (pool: TeamPool, n: number, id: string) => {
    const next = { ...c.posts[pool] };
    if (id) next[n] = id;
    else delete next[n];
    write({ ...c, posts: { ...c.posts, [pool]: next } });
    logAdmin(admin.id, `إسناد ${POOLS[pool].title} في ${groupName(n)}`, people(pool).find((x) => x.id === id)?.name ?? "دون إسناد", c.name, { area: "clusters", ref: c.id });
  };
  /** Even shares in the groups' order: three people and six groups give two each */
  const spread = (pool: TeamPool) => {
    const ps = people(pool);
    if (!ps.length) return;
    const per = Math.ceil(groups.length / ps.length);
    write({ ...c, posts: { ...c.posts, [pool]: Object.fromEntries(groups.map((g, i) => [g.number, ps[Math.min(ps.length - 1, Math.floor(i / per))].id])) } });
  };

  return (
    <Card>
      <SectionTitle icon={Shuffle}>الإسناد إلى المجموعات</SectionTitle>
      <p className="mt-2 text-sm leading-7 text-ink-soft">تسند من قبِل دعوتك إلى ما تراه من المجموعات: لكل مجموعة موجّه ومنسق ومعاون، وللواحد منهم مجموعة أو أكثر.</p>
      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          {POOL_ORDER.map((pool) => (
            <Button key={pool} size="sm" variant="outline" disabled={!people(pool).length} onClick={() => spread(pool)}>
              <Shuffle className="size-3.5" /> توزيع {POOLS[pool].label} بالتساوي
            </Button>
          ))}
        </div>
      )}
      {groups.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-sand p-4 text-sm text-hint">لا مجموعة قبلت بعد.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-right text-xs text-hint">
                <th className="p-2">المجموعة</th>
                {POOL_ORDER.map((pool) => (
                  <th key={pool} className="p-2">
                    {POOLS[pool].title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.number} className="border-t border-gold/20">
                  <td className="p-2">
                    <span className="font-bold">{groupName(g.number)}</span> <span className="text-xs text-ink-soft">{g.name}</span>
                    {g.distributed && <span className="block text-[11px] text-gold-dark">وزّعتها الإدارة</span>}
                  </td>
                  {POOL_ORDER.map((pool) => {
                    const who = c.posts[pool][g.number];
                    const ok = people(pool).some((x) => x.id === who);
                    return (
                      <td key={pool} className="p-2">
                        <select
                          value={ok ? who : ""}
                          disabled={!editable}
                          onChange={(e) => set(pool, g.number, e.target.value)}
                          aria-label={`${POOLS[pool].title} في ${groupName(g.number)}`}
                          className={cn("h-10 w-full rounded-xl border-2 bg-white px-2 text-xs font-semibold outline-none disabled:opacity-80", ok ? "border-gold/50" : "border-maroon/50 text-maroon")}
                        >
                          <option value="">— دون إسناد —</option>
                          {people(pool).map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ───────────────────────── The approved cluster ─────────────────────────

function ManageCluster({ req }: { req: ClusterRequest }) {
  const admin = useAdmin()!;
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const fee = useSeason().fees.clusterFormation;
  const [paying, setPaying] = useState(false);
  const c = req.cluster;
  const pilgrims = req.groups.reduce((n, g) => n + g.pilgrims, 0);
  const pay = (m: PayMethod) => {
    setPaying(true);
    setTimeout(() => {
      const at = nowMs();
      saveCluster({ id: admin.id, name: admin.name, group: admin.profile?.group?.number }, { ...c, feePaidAt: at }, admins);
      logAdmin(admin.id, `تسديد رسم ${c.name}`, formatUSD(fee), payMethodLabel(m), { area: "clusters", ref: c.id });
      toast({ title: "سُدّد رسم التكتل", body: "يصدر به إيصال رقمي.", icon: "🧾", tone: "success" });
      setPaying(false);
    }, 1500);
  };
  const header = (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-gold/30 bg-white px-4 py-3 text-sm">
        <Badge tone="green">
          <BadgeCheck className="size-3.5" /> معتمد — {req.decision?.by}
        </Badge>
        <span>
          {DEPUTY_TITLE}: <b>{c.deputy?.status === "accepted" ? c.deputy.name : "—"}</b>
        </span>
        <span className="text-ink-soft">
          <b className="font-display text-lg text-green-dark">{req.groups.length}</b> مجموعات — <b className="font-display text-lg text-green-dark">{formatNumber(pilgrims)}</b> حاجاً
        </span>
      </div>
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
  return <ClusterDesk req={req} editable head header={header} publicPage />;
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
      <span className="text-ink-soft">تتابع مجموعاته كلها وتنوب عنه{admin.profile?.group ? `، ومجموعتك (${groupName(admin.profile.group.number)}) إحداها` : ""}. الدعوة والإسناد لرئيس التكتل وحده.</span>
    </div>
  );
  return <ClusterDesk req={req} editable={false} head={false} header={header} />;
}
