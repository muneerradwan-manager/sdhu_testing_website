"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, BadgeCheck, Check, CircleDashed, Download, ExternalLink, Eye, Plus, Printer, RotateCcw, Send, UserMinus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { diffFields, fieldsOf } from "@/lib/cluster-profile";
import { groupName } from "@/lib/groups";
import { downloadCsv } from "@/lib/csv";
import { dayLabel, dayTimeLabel } from "@/lib/operations";
import { actions, getState, useStore, type ClusterInvite, type GroupInvite, type Seat } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { ClusterPrint, ClusterReport, requestLine } from "@/app/administrator/_components/cluster-report";
import { logCadre, nameOf, placesOf } from "@/app/administrator/_lib/cadre";
import { HEADS_POOL } from "@/app/administrator/_lib/cluster";
import { DEPUTY_TITLE, ACCOUNTANT_TITLE, STATUS, exceptionalEdit, fitSeats, newCluster, reviewCluster, roleOfPerson, useFormingSeason, useGroupPool, usePicks, writeCluster, type Cluster, type ClusterRequest } from "@/app/administrator/_lib/formation";
import { categoryOf, categoryOfId, does, roleName, seatsLabel, seatsOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { useCadreRows } from "./cadre";
import { Drawer, fmtDateTime, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { RecordHistory } from "../../_components/system";
import { AddButton, Box, EditHeader, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, NotFound, SaveLine, TitleCell, Views, useHrefWith, useOpenId, useView } from "./ui";
import { logAdmins, useAdminsDesk, type AdminsDesk, type OutsideGroup } from "../desk";

/** The shared input without its full width, for an input given its own */
const sizedInput = smallInputClass.replace("w-full", "");
const CLUSTERS = "/staff/admins/manage/clusters";

const VIEWS = ["requests", "outside", "programmes", "archived"] as const;

/**
 * «طلبات التكتلات» — the cluster requests as a site's list, each opening on its own review screen (`?id=`): its
 * report, its checks and the exceptional edits in the middle; the decision, printing and the archive on the side.
 * The page's other views (`?v=`) are the approved groups left outside every cluster, the clusters' programmes
 * waiting for approval, and the archive. The requests' dates wait closed at the end of the page.
 */
export function ClustersTab() {
  const desk = useAdminsDesk();
  const id = useOpenId();
  const view = useView("v", VIEWS);
  if (id) return <RequestScreen id={id} desk={desk} />;
  return (
    <div className="space-y-5">
      <Views
        param="v"
        value={view}
        label="طلبات التكتلات"
        items={[
          { key: "requests", label: "الطلبات", count: desk.live.length },
          { key: "outside", label: "مجموعات خارج التكتلات", count: desk.outside.length },
          { key: "programmes", label: "برامج التكتلات", count: desk.pendingProgrammes.length },
          { key: "archived", label: "المؤرشفة", count: desk.archivedClusters.length },
        ]}
      />
      {(view === "requests" || view === "archived") && <Requests key={view} desk={desk} shelf={view === "archived" ? "archived" : "live"} />}
      {view === "outside" && <Outside desk={desk} />}
      {view === "programmes" && <Programmes desk={desk} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <WindowBox desk={desk} />
        <Help>
          <p>لا انتخاب: يقدّم الطلب من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية، ويملؤه بالترتيب — المستوى، المجموعات برؤسائها، الإداريون (موجّهو المجموعات ومعاونوها، ومعاون التكتل، والمنسقون والموجّهات يوزَّعون على المجموعات)، النائب، المحاسب — ويرسله بعد اكتماله.</p>
          <p>تبدأ مراجعة الطلب، ثم تعتمده أو تعيده بملاحظات يصلحها رئيسه ويعيد إرساله قبل الموعد النهائي. وخارج الضوابط تعدّله بنفسك «تعديلاً استثنائياً» بسبب يُكتب في سجله وسجل الشخص.</p>
          <p>ثم يكتب كل رئيس برنامج تكتله، ولا يصل إلى الحجاج قبل أن تعتمده.</p>
        </Help>
      </div>
      <RecordsBox system="admins" area="clusters" title="سجل التكتلات" />
    </div>
  );
}

// ───────────────────────── The window ─────────────────────────

/** The requests' dates — the opening, the early deadline that earns the timeliness badge, the final one — and the early one set here */
function WindowBox({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const w = desk.formationWindow;
  const [early, setEarly] = useState(s.earlyDeadline);
  const [earlyTime, setEarlyTime] = useState(s.earlyTime);
  const save = () => {
    actions.setAdminRules({ earlyDeadline: early, earlyTime });
    logAdmins(user, "clusters", { action: "تعديل الموعد الأول لطلبات التكتلات", target: "شارة الالتزام بالمواعيد", before: dayTimeLabel(s.earlyDeadline, s.earlyTime, true), after: dayTimeLabel(early, earlyTime, true), important: true });
    toast({ title: "حُفظ الموعد الأول", body: `ما يُرسل حتى ${dayTimeLabel(early, earlyTime, true)} ينال شارة الالتزام بالمواعيد.`, tone: "success", icon: "💾" });
  };
  return (
    <Box title="مواعيد الاستقبال" open={false}>
      <p>
        <Tag tone={w.state === "closed" ? "gold" : w.state === "before" ? "muted" : "green"}>{w.state === "before" ? `تفتح ${dayTimeLabel(w.op.start, w.op.startTime)}` : w.state === "closed" ? `انتهت ${dayTimeLabel(w.op.end, w.op.endTime)}` : `مفتوحة حتى ${dayTimeLabel(w.op.end, w.op.endTime)}`}</Tag>
      </p>
      <ul className="space-y-1">
        {[
          ["البدء", dayTimeLabel(w.op.start, w.op.startTime ?? "00:00", true)],
          ["الموعد الأول (شارة الالتزام)", dayTimeLabel(s.earlyDeadline, s.earlyTime, true)],
          ["الموعد النهائي", dayTimeLabel(w.op.end, w.op.endTime ?? "23:59", true)],
        ].map(([k, v]) => (
          <li key={k} className="flex flex-wrap justify-between gap-2">
            <span className="text-white/60">{k}</span>
            <b className="text-white">{v}</b>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-6 text-white/55">
        البدء والنهائي من عملية «تشكيل التكتلات» في <Link href="/staff/admins/manage" className="font-bold text-gold hover:underline">«قواعد الإداريين»</Link>. والموعد الأول هنا: ما يُرسل حتى ساعته ينال «شارة الالتزام بالمواعيد».
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الموعد الأول: اليوم</span>
          <input type="date" value={early} onChange={(e) => setEarly(e.target.value)} className={cn(sizedInput, "w-40 [color-scheme:dark]")} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">والساعة</span>
          <input type="time" value={earlyTime} onChange={(e) => setEarlyTime(e.target.value || "23:59")} className={cn(sizedInput, "w-28 [color-scheme:dark]")} dir="ltr" />
        </label>
      </div>
      <SaveLine dirty={early !== s.earlyDeadline || earlyTime !== s.earlyTime} onSave={save} label="حفظ الموعد الأول" />
    </Box>
  );
}

// ───────────────────────── The requests ─────────────────────────

const FILTERS: { key: "all" | Cluster["status"]; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "reviewing", label: "جاري المراجعة" },
  { key: "approved", label: "معتمد" },
  { key: "rejected", label: "مرفوض بملاحظات" },
  { key: "draft", label: "مسودة" },
];

const TONE: Record<Cluster["status"], "green" | "gold" | "maroon" | "muted"> = { draft: "muted", pending: "gold", reviewing: "gold", approved: "green", rejected: "maroon" };

function Requests({ desk, shelf }: { desk: AdminsDesk; shelf: "live" | "archived" }) {
  const s = useStructure();
  const router = useRouter();
  const hrefWith = useHrefWith();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [tier, setTier] = useState("");
  const [creating, setCreating] = useState(false);
  const pool = shelf === "live" ? desk.live : desk.archivedClusters;
  const inTier = pool.filter((r) => !tier || r.cluster.tier === tier);
  const list = inTier.filter((r) => filter === "all" || r.status === filter);
  return (
    <div className="space-y-4">
      <Title action={shelf === "live" && <AddButton onClick={() => setCreating(true)}>إنشاء تشكيل نيابة عن قائد</AddButton>}>{shelf === "live" ? "طلبات تشكيل التكتلات" : "التشكيلات المؤرشفة"}</Title>
      <Lead>{shelf === "live" ? "افتح الطلب لمراجعته: ابدأ المراجعة، ثم اعتمده أو أعده إلى رئيسه بملاحظات." : "تشكيلات أُرشفت واحداً واحداً، أو كلها عند «بدء موسم جديد» في «التكتلات والمجموعات»."}</Lead>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters label="حال الطلبات" value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ ...f, count: f.key === "all" ? inTier.length : inTier.filter((r) => r.status === f.key).length }))} />
        <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="المستوى" className={cn(sizedInput, "h-9 w-44 text-sm [&>option]:text-ink")}>
          <option value="">كل المستويات</option>
          {s.tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({pool.filter((r) => r.cluster.tier === t.id).length})
            </option>
          ))}
        </select>
      </div>
      <ListTable head={["التكتل", "رئيسه", "المستوى", "الفروع", "الشروط", "الحالة"]} minWidth="52rem">
        {list.length === 0 && <EmptyRow cols={6}>{shelf === "archived" ? "لا تشكيلات مؤرشفة." : "لا طلبات هنا. يقدّمها من يحمل صفة «رئيس تكتل» في مدة تشكيل التكتلات، أو تنشئها الإدارة نيابة عنه."}</EmptyRow>}
        {list.map((r) => {
          const href = hrefWith({ id: r.cluster.id });
          return (
            <tr key={r.cluster.id} className={cn(r.status === "rejected" && "bg-maroon/10")}>
              <TitleCell
                title={r.cluster.name}
                href={href}
                sub={
                  <>
                    {requestLine(r)}
                    {(r.cluster.byAdministration || r.badges.timeliness || r.badges.guidance || r.badges.age) && (
                      <span className="block text-white/45">{[r.cluster.byAdministration && "🛠️ أُنشئ من الإدارة", r.badges.timeliness && "⏱️ ملتزم بالمواعيد", r.badges.guidance && "🧭 التميّز في التوجيه", r.badges.age && "🌟 العمر"].filter(Boolean).join(" · ")}</span>
                    )}
                  </>
                }
                actions={
                  <RowActions>
                    <RowLink href={href}>{r.status === "pending" || r.status === "reviewing" ? "مراجعة" : "فتح"}</RowLink>
                    <RowLink onClick={() => exportCluster(r)}>Excel</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top">
                {r.headName}
                <span className="block text-xs text-white/55">
                  {DEPUTY_TITLE}: {r.cluster.deputy?.status === "accepted" ? r.cluster.deputy.name : <b className="text-gold">لم يقبل أحد</b>}
                </span>
              </td>
              <td className="p-3 align-top text-white/80">{s.tiers.find((t) => t.id === r.cluster.tier)?.name ?? "بلا مستوى"}</td>
              <td className="p-3 align-top text-white/80">{r.branches.join("، ")}</td>
              <td className="p-3 align-top">{r.complete ? <Tag tone="green">مكتمل</Tag> : <Tag tone="gold">ناقص: {r.checks.filter((c) => !c.ok && !c.warn).length}</Tag>}</td>
              <td className="p-3 align-top">
                <span className="flex flex-wrap gap-1">
                  <Tag tone={TONE[r.status]}>{STATUS[r.status].label}</Tag>
                  {r.archived && <Tag>مؤرشف — {r.archived.season}</Tag>}
                </span>
              </td>
            </tr>
          );
        })}
      </ListTable>
      <OnBehalf open={creating} onClose={() => setCreating(false)} desk={desk} onCreated={(id) => router.push(`${CLUSTERS}?id=${id}`)} />
    </div>
  );
}

/**
 * «إنشاء تشكيل نيابة عن قائد»: the administration opens a request for a leader who has none — a cluster head by
 * his base or seasonal role — with its name, its tier and its reason. It starts as a draft holding his own group;
 * the holder fills its places by exceptional edits and sends it for review on his behalf.
 */
function OnBehalf({ open, onClose, desk, onCreated }: { open: boolean; onClose: () => void; desk: AdminsDesk; onCreated: (id: string) => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const season = useFormingSeason();
  const rows = useCadreRows();
  const [who, setWho] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState(s.tiers[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const busy = new Set(desk.live.map((r) => r.headId));
  const leaders = rows.filter((r) => !r.status && does(s, r.seasonal?.role ?? r.primary, "clusterLeader") && !busy.has(r.id));
  const leader = leaders.find((r) => r.id === who);
  const create = () => {
    if (!leader) return;
    const at = nowMs();
    const id = `cluster-adm-${at.toString(36)}`;
    // His own group comes in with him: his approved group on this device, or the season's records of it
    const live = admins[leader.id]?.group?.approvedAt ? admins[leader.id]!.group : undefined;
    const seed = HEADS_POOL.find((h) => h.id === leader.id);
    const number = live?.number ?? seed?.group;
    const category = categoryOf(leader.id, cadre);
    const own: GroupInvite | undefined = number !== undefined && category ? { id: leader.id, name: leader.name, at, status: "accepted", number, branch: leader.branch, category, pilgrims: seed?.pilgrims ?? 0 } : undefined;
    const base = newCluster(id, name.trim(), at, own, season);
    const cluster: Cluster = { ...base, tier, seats: own ? { [own.number]: fitSeats(s, tier, own.category) } : {}, byAdministration: { by: user.name, reason: reason.trim(), at } };
    if (admins[leader.id]) writeCluster({ headId: leader.id, headName: leader.name, headGroup: number, seed: false }, cluster, admins);
    else actions.setFormation((f) => ({ ...f, created: [...f.created, { headId: leader.id, headName: leader.name, headGroup: number, cluster }] }));
    logAdmins(user, "clusters", { action: "إنشاء تشكيل نيابة عن قائد", target: cluster.name, detail: `${leader.name} — ${s.tiers.find((t) => t.id === tier)?.name} — ${reason.trim()}`, ref: id, important: true });
    toast({ title: `أُنشئ ${cluster.name}`, body: `مسودة باسم ${leader.name}: املأ أماكنه بتعديل استثنائي ثم أرسله للمراجعة نيابة عنه.`, tone: "success", icon: "🛠️" });
    onClose();
    onCreated(id);
    setWho("");
    setName("");
    setReason("");
  };
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="إنشاء تشكيل نيابة عن قائد"
      width="max-w-lg"
      footer={
        <Button variant="gold" disabled={!leader || name.trim().length < 3 || reason.trim().length < 3} onClick={create}>
          إنشاء المسودة
        </Button>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">لمن يحمل صفة «رئيس تكتل» أساسيةً أو موسمية ولم يقدّم طلباً. يبدأ مسودة فيها مجموعته، ويحمل شارة «أُنشئ من الإدارة».</p>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">القائد ({leaders.length})</span>
          <select
            value={who}
            onChange={(e) => {
              setWho(e.target.value);
              const l = leaders.find((x) => x.id === e.target.value);
              if (l && !name) setName(`تكتل ${l.name.split(" ")[0] === "الشيخ" ? l.name.split(" ")[1] : l.name.split(" ")[0]}`);
            }}
            className={cn(smallInputClass, "[&>option]:text-ink")}
          >
            <option value="">— اختر القائد —</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.seasonal ? `${roleName(l.seasonal.role, s)} موسمية` : roleName(l.primary, s)} — {l.branch}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">اسم التكتل</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={smallInputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">المستوى</span>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className={cn(smallInputClass, "[&>option]:text-ink")}>
            {s.tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">السبب (إلزامي)</span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="مثال: القائد خارج البلاد، وفوّض الإدارة بكتاب" />
        </label>
      </div>
    </Drawer>
  );
}

// ───────────────────────── One request ─────────────────────────

/** One request on its own screen: its checks, its report and the exceptional edits; the decision, printing and archive on the side */
function RequestScreen({ id, desk }: { id: string; desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const hrefWith = useHrefWith();
  const admins = useStore((s) => s.admins);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const x = desk.requests.find((r) => r.cluster.id === id);
  const back = hrefWith({ id: null });
  if (!x) return <NotFound back={back} backLabel="طلبات التكتلات" what="هذا الطلب" />;
  const c = x.cluster;
  const act = (action: "review" | "approve" | "reject" | "reopen", why?: string) => {
    reviewCluster(x, action, user.name, admins, why);
    const words = { review: "بدء مراجعة طلب تكتل", approve: "اعتماد تكتل", reject: "إعادة طلب تكتل إلى رئيسه بملاحظات", reopen: "إعادة فتح تكتل معتمد لتعديله" } as const;
    logAdmins(user, "clusters", { action: words[action], target: c.name, detail: why ?? requestLine(x), ref: c.id, important: action !== "review" });
    toast({ title: words[action], body: c.name, tone: action === "reject" ? "info" : "success", icon: action === "approve" ? "✅" : action === "reject" ? "↩️" : "🗂️" });
    setRejecting(false);
    setNote("");
  };
  const sendForHim = () => {
    const at = nowMs();
    writeCluster(x, { ...c, status: "pending", sentAt: at, firstSentAt: c.firstSentAt ?? at, review: undefined, decision: undefined }, admins);
    logAdmins(user, "clusters", { action: "إرسال تشكيل للمراجعة نيابة عن قائده", target: c.name, detail: requestLine(x), ref: c.id, important: true });
    toast({ title: "أُرسل للمراجعة", body: `${c.name} — نيابة عن ${x.headName}`, tone: "success", icon: "📨" });
  };
  const archive = (on: boolean) => {
    actions.setFormation((f) => {
      const archived = { ...f.archived };
      if (on) archived[c.id] = { season: x.season, at: nowMs(), by: user.name };
      else delete archived[c.id];
      return { ...f, archived };
    });
    logAdmins(user, "clusters", { action: on ? "أرشفة تكتل معتمد" : "استعادة تكتل من الأرشيف", target: c.name, detail: `موسم ${x.season}`, ref: c.id, important: true });
    toast({ title: on ? `أُرشف ${c.name}` : `استُعيد ${c.name}`, body: on ? "يبقى في «التكتلات والمجموعات» بموسمه، ويخرج من عمل الموسم." : "عاد إلى التكتلات النشطة.", tone: "info", icon: on ? "🗄️" : "↩️" });
  };

  return (
    <div>
      <EditHeader back={back} backLabel="طلبات التكتلات" title={c.name}>
        رئيسه {x.headName} — موسم {x.season} — {requestLine(x)}
      </EditHeader>
      <EditLayout
        main={
          <>
            {c.decision?.note && <p className="rounded-2xl bg-maroon/25 p-3 text-sm leading-7 text-white ring-1 ring-maroon/50">ملاحظات الإعادة: {c.decision.note}</p>}
            <section className="space-y-2">
              <h2 className="font-display text-lg font-bold text-gold">الشروط</h2>
              <ul className="space-y-1.5 text-sm">
                {x.checks.map((k) => (
                  <li key={k.key} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 ring-1", k.ok ? "bg-green-light/10 text-white ring-green-light/30" : k.warn ? "bg-gold/15 text-white ring-gold/40" : "bg-maroon/20 text-white ring-maroon/40")}>
                    {k.ok ? <Check className="mt-0.5 size-4 shrink-0 text-green-light" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-gold" />} {k.label}
                  </li>
                ))}
              </ul>
            </section>
            <ClusterReport req={x} dark />
            <PrintSheet>
              <ClusterPrint req={x} />
            </PrintSheet>
            <Box title="تعديل استثنائي (خارج الضوابط المعتادة)" open={c.status === "draft" && !!c.byAdministration && !x.complete}>
              <Exceptional x={x} />
            </Box>
          </>
        }
        side={
          <>
            <Box title="القرار">
              <p className="flex flex-wrap gap-1">
                <Tag tone={TONE[c.status]}>{STATUS[c.status].label}</Tag>
                {x.archived && <Tag>مؤرشف — موسم {x.archived.season}</Tag>}
              </p>
              {c.byAdministration && <p className="text-xs text-gold">🛠️ أُنشئ من الإدارة: {c.byAdministration.reason}</p>}
              <ul className="space-y-0.5 text-xs text-white/60">
                {c.sentAt && <li>أُرسل {fmtDateTime(c.sentAt)}</li>}
                {c.review && c.status !== "pending" && <li>راجعه {c.review.by}</li>}
                {c.decision && (
                  <li>
                    {c.decision.status === "approved" ? "اعتمده" : "أعاده"} {c.decision.by} — {fmtDateTime(c.decision.at)}
                  </li>
                )}
              </ul>
              {c.status === "pending" && (
                <Button variant="gold" className="w-full" onClick={() => act("review")}>
                  <Eye className="size-4" /> بدء المراجعة
                </Button>
              )}
              {c.status === "reviewing" && (
                <div className="flex flex-col gap-2">
                  <Button variant="gold" disabled={!x.complete} onClick={() => act("approve")}>
                    <BadgeCheck className="size-4" /> اعتماد
                  </Button>
                  <Button variant="glass" onClick={() => setRejecting(true)}>
                    <X className="size-4" /> رفض مع ملاحظات
                  </Button>
                  {!x.complete && <p className="text-xs text-gold">لا يُعتمد ناقصاً: أعده بملاحظات، أو أكمله بتعديل استثنائي.</p>}
                </div>
              )}
              {c.status === "approved" && (
                <Button variant="glass" className="w-full" onClick={() => act("reopen")}>
                  <RotateCcw className="size-4" /> إعادة فتحه لرئيسه للتعديل
                </Button>
              )}
              {c.status === "draft" && c.byAdministration && (
                <>
                  <Button variant="gold" className="w-full" disabled={!x.complete} onClick={sendForHim}>
                    <Send className="size-4" /> إرساله للمراجعة نيابة عنه
                  </Button>
                  {!x.complete && <p className="text-xs text-gold">أنشأته الإدارة: املأ أماكنه بالتعديل الاستثنائي حتى يكتمل، ثم أرسله.</p>}
                </>
              )}
              {(c.status === "draft" || c.status === "rejected") && !c.byAdministration && <p className="text-xs text-white/60">عند رئيسه: {c.status === "draft" ? "لم يرسله بعد" : "يصلحه ويعيد إرساله"}.</p>}
            </Box>
            <Box title="طباعة وتصدير">
              <RowActions>
                <RowLink onClick={() => window.print()}>
                  <Printer className="me-1 inline size-3.5" /> طباعة التقرير
                </RowLink>
                <RowLink onClick={() => exportCluster(x)}>
                  <Download className="me-1 inline size-3.5" /> Excel
                </RowLink>
              </RowActions>
            </Box>
            {c.status === "approved" && (
              <Box title="الأرشيف" open={!!x.archived}>
                <p className="text-xs leading-6 text-white/60">المؤرشف يبقى في «التكتلات والمجموعات» بموسمه، ويخرج من عمل الموسم.</p>
                {x.archived ? (
                  <Button size="sm" variant="glass" onClick={() => archive(false)}>
                    <ArchiveRestore className="size-4" /> استعادته من الأرشيف
                  </Button>
                ) : (
                  <Button size="sm" variant="glass" onClick={() => archive(true)}>
                    <Archive className="size-4" /> أرشفة
                  </Button>
                )}
              </Box>
            )}
            <Box title="سجلّه" open={false}>
              <RecordHistory system="admins" refId={c.id} bare />
            </Box>
          </>
        }
      />

      <Modal open={rejecting} onClose={() => setRejecting(false)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="text-xs font-bold text-gold">رفض مع ملاحظات</p>
        <h3 className="mt-1 font-display text-xl font-bold">{c.name}</h3>
        <p className="mt-1 text-sm leading-7 text-white/70">تظهر ملاحظاتك لرئيس التكتل ليستكمل النواقص ويعيد الإرسال قبل الموعد النهائي.</p>
        <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder="مثال: أحد المنسقين بلا تفرّغ في مراحل العمل الأساسية — استبدله" aria-label="ملاحظات الرفض" />
        <div className="mt-4 flex gap-2">
          <Button variant="gold" disabled={note.trim().length < 5} onClick={() => act("reject", note.trim())}>
            رفض وإرسال الملاحظات
          </Button>
          <Button variant="glass" onClick={() => setRejecting(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** One cluster in a sheet: its line, its groups, then everyone in it with his post — as the administration's platform exports it */
function exportCluster(x: ClusterRequest) {
  const c = x.cluster;
  const places = placesOf(x, c);
  downloadCsv(`${c.name}-${x.season}.csv`, [
    ["التكتل", c.name, "الرئيس", x.headName, "الموسم", x.season, "الحالة", STATUS[x.status].label],
    ["مجموع الفئات", x.weight, "الحجاج", x.pilgrims, "الكادر", x.cadre, "الفروع", x.branches.join("، ")],
    [],
    ["المجموعة", "رئيسها", "الفئة", "الحجاج", "الفرع"],
    ...x.groups.map((g) => [groupName(g.number), g.head, g.categoryName, g.pilgrims, g.branch]),
    [],
    ["الاسم", "الصفة في التكتل", "المجموعة", "الصفة الأساسية"],
    ...[...places].map(([id, p]) => [nameOf(id, x), p.posts.join("، "), p.group !== undefined ? groupName(p.group) : "", roleName(roleOfPerson(id, getState().admins, getState().cadre))]),
  ]);
}

// ───────────────────────── Exceptional edits ─────────────────────────

type Place = { key: string; label: string; who?: ClusterInvite; remove: (c: Cluster) => Cluster; fill?: { behavior: Parameters<ReturnType<typeof usePicks>>[0]; put: (c: Cluster, x: ClusterInvite) => Cluster } };

/**
 * The administration edits a request outside the usual rules, always with its reason: it removes someone from
 * his place or puts someone in a vacant one (accepted at once), and the reason is written to the request's
 * record and to the person's.
 */
function Exceptional({ x }: { x: ClusterRequest }) {
  const user = useStaffUser()!;
  const s = useStructure();
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const picks = usePicks(x);
  const [place, setPlace] = useState<Place | null>(null);
  const [reason, setReason] = useState("");
  const [person, setPerson] = useState("");
  const c = x.cluster;
  const yes = (v?: ClusterInvite) => !!v && v.status !== "declined";
  const accepted = (id: string, name: string): ClusterInvite => ({ id, name, at: Date.now(), status: "accepted", reason: "بتعديل استثنائي من الإدارة" });

  const places: Place[] = [
    ...x.groups.flatMap((g) =>
      (c.seats[g.number] ?? []).map(
        (seat: Seat, i): Place => ({
          key: `seat-${g.number}-${i}`,
          label: `${groupName(g.number)} — ${seat.kind === "guide" ? "موجّه المجموعة" : "معاون المجموعة"}${seat.free ? " (حر)" : ""}`,
          who: yes(seat.who) ? seat.who : undefined,
          remove: (k) => ({ ...k, seats: { ...k.seats, [g.number]: (k.seats[g.number] ?? []).map((y, j) => (j === i ? { ...y, who: undefined } : y)) } }),
          fill: { behavior: seat.kind === "guide" ? "guideSeat" : "assistantSeat", put: (k, p) => ({ ...k, seats: { ...k.seats, [g.number]: (k.seats[g.number] ?? []).map((y, j) => (j === i ? { ...y, who: p } : y)) } }) },
        }),
      ),
    ),
    ...(["assistants", "coordinators", "femaleGuides"] as const).flatMap((list) => {
      const label = list === "assistants" ? "معاون التكتل" : list === "coordinators" ? "منسق التكتل" : "موجّهة التكتل";
      const behavior = list === "assistants" ? "assistantPool" : list === "coordinators" ? "coordinatorPool" : "guidePool";
      return [
        ...c[list].filter(yes).map((m): Place => ({ key: `${list}-${m.id}`, label, who: m, remove: (k) => ({ ...k, [list]: k[list].filter((y) => y.id !== m.id), sorting: list === "coordinators" ? Object.fromEntries(Object.entries(k.sorting).filter(([, w]) => w !== m.id)) : k.sorting }) })),
        { key: `${list}-new`, label: `${label} — إضافة`, remove: (k) => k, fill: { behavior, put: (k, p) => ({ ...k, [list]: [...k[list], p] }) } } as Place,
      ];
    }),
    ...(c.deputy && yes(c.deputy) ? [{ key: "deputy", label: DEPUTY_TITLE, who: c.deputy, remove: (k: Cluster) => ({ ...k, deputy: undefined }) }] : []),
    ...(c.accountant && yes(c.accountant) ? [{ key: "accountant", label: ACCOUNTANT_TITLE, who: c.accountant, remove: (k: Cluster) => ({ ...k, accountant: undefined }) }] : []),
  ];

  const pool = useGroupPool(x).filter((g) => !g.takenBy && !c.groups[g.number] && !!g.category);
  const [group, setGroup] = useState("");
  const addGroup = () => {
    const g = pool.find((y) => String(y.number) === group);
    if (!g?.category) return;
    const why = reason.trim();
    const inv: GroupInvite = { id: g.headId, name: g.headName, at: nowMs(), status: "accepted", number: g.number, branch: g.branch, category: g.category, pilgrims: g.pilgrims, byAdministration: { by: user.name, reason: why } };
    exceptionalEdit(x, { ...c, groups: { ...c.groups, [g.number]: inv }, seats: { ...c.seats, [g.number]: fitSeats(s, c.tier, g.category) } }, admins);
    const text = `أُضيفت استثنائياً إلى «${c.name}» — تجاوزاً للضوابط المعتادة. السبب: ${why}`;
    logAdmins(user, "clusters", { action: "تعديل استثنائي: إضافة مجموعة", target: c.name, detail: `${groupName(g.number)}: ${text}`, ref: c.id, important: true });
    logCadre(g.headId, g.headName, "exceptional", user.name, { change: `${groupName(g.number)} ← ${c.name}`, note: why, season: x.season });
    toast({ title: `أُضيفت ${groupName(g.number)}`, body: c.name, tone: "success", icon: "🛠️" });
    setPlace(null);
    setGroup("");
    setReason("");
  };

  const apply = () => {
    if (!place) return;
    const why = reason.trim();
    if (place.who) {
      exceptionalEdit(x, place.remove(c), admins);
      const text = `أُزيل استثنائياً من ${place.label} ضمن «${c.name}» — تجاوزاً للضوابط المعتادة. السبب: ${why}`;
      logAdmins(user, "clusters", { action: "تعديل استثنائي: إزالة", target: c.name, detail: `${place.who.name}: ${text}`, ref: c.id, important: true });
      logAdmins(user, "applicants", { action: "تعديل استثنائي", target: place.who.name, detail: text, ref: place.who.id });
      logCadre(place.who.id, place.who.name, "exceptional", user.name, { change: `أُزيل من ${place.label} — ${c.name}`, note: why, season: x.season });
      toast({ title: `أُزيل ${place.who.name}`, body: place.label, tone: "info", icon: "🛠️" });
    } else if (place.fill) {
      const p = picks(place.fill.behavior).find((y) => y.id === person);
      if (!p) return;
      exceptionalEdit(x, place.fill.put(c, accepted(p.id, p.name)), admins);
      const text = `أُضيف استثنائياً إلى ${place.label} ضمن «${c.name}» — تجاوزاً للضوابط المعتادة. السبب: ${why}`;
      logAdmins(user, "clusters", { action: "تعديل استثنائي: إضافة", target: c.name, detail: `${p.name}: ${text}`, ref: c.id, important: true });
      logAdmins(user, "applicants", { action: "تعديل استثنائي", target: p.name, detail: text, ref: p.id });
      logCadre(p.id, p.name, "exceptional", user.name, { change: `أُضيف إلى ${place.label} — ${c.name}`, note: why, season: x.season });
      toast({ title: `أُضيف ${p.name}`, body: place.label, tone: "success", icon: "🛠️" });
    }
    setPlace(null);
    setReason("");
    setPerson("");
  };

  const candidates = place?.fill && !place.who ? picks(place.fill.behavior).filter((y) => !y.takenBy) : [];
  return (
    <div className="space-y-3">
      <p className="text-xs leading-6 text-white/60">اختر مكاناً: الشاغل يُزال، والشاغر يُملأ. السبب يُكتب في سجل التكتل وسجل الشخص، والمُضاف يُعدّ قابلاً دون دعوة.</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        <li>
          <button type="button" onClick={() => setPlace({ key: "group-new", label: "مجموعة — إضافة", remove: (k) => k })} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-xs ring-1", place?.key === "group-new" ? "bg-gold/20 ring-gold/60" : "bg-white/5 ring-white/10 hover:ring-gold/40")}>
            <Plus className="size-3.5 shrink-0 text-green-light" />
            <span className="min-w-0 flex-1">
              <span className="block text-white/60">مجموعة معتمدة بحجاجها</span>
              <span className="block font-bold text-white">إضافة مجموعة ({pool.length} متاحة في فروعه)</span>
            </span>
          </button>
        </li>
        {places.map((pl) => (
          <li key={pl.key}>
            <button type="button" onClick={() => setPlace(pl)} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-xs ring-1", place?.key === pl.key ? "bg-gold/20 ring-gold/60" : "bg-white/5 ring-white/10 hover:ring-gold/40")}>
              {pl.who ? <UserMinus className="size-3.5 shrink-0 text-gold" /> : <Plus className="size-3.5 shrink-0 text-green-light" />}
              <span className="min-w-0 flex-1">
                <span className="block text-white/60">{pl.label}</span>
                <span className="block font-bold text-white">{pl.who?.name ?? "شاغر"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {place && (
        <div className="space-y-3 rounded-2xl bg-white/5 p-3 ring-1 ring-gold/30">
          <p className="text-sm font-bold text-white">{place.key === "group-new" ? "إضافة مجموعة معتمدة إلى التكتل" : place.who ? `إزالة ${place.who.name} من ${place.label}` : `إضافة إلى ${place.label}`}</p>
          {place.key === "group-new" && (
            <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="المجموعة" className={cn(smallInputClass, "[&>option]:text-ink")}>
              <option value="">— اختر من المجموعات المعتمدة في فروعه —</option>
              {pool.map((g) => (
                <option key={g.number} value={g.number}>
                  {groupName(g.number)} — {g.headName} — {categoryOfId(s, g.category)?.name} — {g.branch}
                </option>
              ))}
            </select>
          )}
          {!place.who && place.key !== "group-new" && (
            <select value={person} onChange={(e) => setPerson(e.target.value)} aria-label="من يُضاف" className={cn(smallInputClass, "[&>option]:text-ink")}>
              <option value="">— اختر من المؤهلين في فروعه —</option>
              {candidates.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} — {y.branch}
                </option>
              ))}
            </select>
          )}
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="السبب (إلزامي)" aria-label="سبب التعديل الاستثنائي" />
          <div className="flex gap-2">
            <Button size="sm" variant="gold" disabled={reason.trim().length < 3 || (place.key === "group-new" ? !group : !place.who && !person)} onClick={place.key === "group-new" ? addGroup : apply}>
              تنفيذ التعديل
            </Button>
            <Button size="sm" variant="glass" onClick={() => setPlace(null)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Groups outside every cluster ─────────────────────────

/**
 * The approved groups no request holds: none took them, or theirs was refused after the final deadline. The
 * holder adds each to a cluster by an exceptional edit with its reason; its seats follow its category under
 * that cluster's tier, for the cluster's head to fill.
 */
function Outside({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const admins = useStore((x) => x.admins);
  const targets = useMemo(() => desk.live.filter((r) => r.status !== "rejected" && r.status !== "draft"), [desk.live]);
  const [adding, setAdding] = useState<OutsideGroup | null>(null);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  const add = () => {
    const r = targets.find((x) => x.cluster.id === to);
    if (!adding || !r || !adding.category) return;
    const why = reason.trim();
    const g = { id: adding.headId, name: adding.headName, at: Date.now(), status: "accepted" as const, number: adding.number, branch: adding.branch, category: adding.category, pilgrims: adding.pilgrims, byAdministration: { by: user.name, reason: why } };
    exceptionalEdit(r, { ...r.cluster, groups: { ...r.cluster.groups, [adding.number]: g }, seats: { ...r.cluster.seats, [adding.number]: fitSeats(s, r.cluster.tier, adding.category) } }, admins);
    const text = `أُضيفت استثنائياً إلى «${r.cluster.name}» — تجاوزاً للضوابط المعتادة. السبب: ${why}`;
    logAdmins(user, "clusters", { action: "تعديل استثنائي: إضافة مجموعة", target: r.cluster.name, detail: `${groupName(adding.number)}: ${text}`, ref: r.cluster.id, important: true });
    logAdmins(user, "groups", { action: "تعديل استثنائي", target: groupName(adding.number), detail: text, ref: String(adding.number) });
    toast({ title: `أُضيفت ${groupName(adding.number)} إلى ${r.cluster.name}`, body: "يملأ رئيس التكتل مقاعدها بفئتها في مستواه.", icon: "🛠️", tone: "success" });
    setAdding(null);
    setTo("");
    setReason("");
  };

  return (
    <div className="space-y-4">
      <Title>مجموعات معتمدة خارج كل تكتل</Title>
      <Lead>{desk.deadlinePassed ? "لم يأخذها طلب، أو رُفض طلبها بعد الموعد النهائي: أضف كلاً منها إلى تكتل بتعديل استثنائي بسببه." : `ما دامت الطلبات مفتوحة قد يدعوها رئيس تكتل؛ تُضاف بتعديل استثنائي بعد الموعد النهائي ${dayLabel(desk.formationWindow.op.end, true)}.`}</Lead>
      <ListTable head={["المجموعة", "الفرع", "الفئة", "الحجاج", "كانت في"]}>
        {desk.outside.length === 0 && <EmptyRow cols={5}>كل مجموعة معتمدة في طلب تكتل.</EmptyRow>}
        {desk.outside.map((g) => {
          const cat = categoryOfId(s, g.category);
          const can = desk.deadlinePassed && !!g.category && targets.length > 0;
          return (
            <tr key={g.number}>
              <TitleCell
                title={groupName(g.number)}
                sub={g.headName}
                actions={<RowActions>{can ? <RowLink onClick={() => setAdding(g)}>أضفها إلى تكتل</RowLink> : <span className="font-normal text-white/45">{!g.category ? "بلا فئة بعد" : !desk.deadlinePassed ? "بعد الموعد النهائي" : "لا تكتل يقبلها"}</span>}</RowActions>}
              />
              <td className="p-3 align-top text-white/80">{g.branch}</td>
              <td className="p-3 align-top text-white/80">
                {cat?.name ?? "بلا فئة"} <span className="block text-xs text-white/50">{seatsLabel(seatsOf(s, undefined, g.category))}</span>
              </td>
              <td className="p-3 align-top tabular-nums">{g.pilgrims}</td>
              <td className="p-3 align-top text-white/70">{g.from ?? "لم يأخذها طلب"}</td>
            </tr>
          );
        })}
      </ListTable>
      <Modal open={!!adding} onClose={() => setAdding(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {adding && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gold">تعديل استثنائي</p>
            <h3 className="font-display text-xl font-bold">{groupName(adding.number)}</h3>
            <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="التكتل" className={cn(smallInputClass, "[&>option]:text-ink")}>
              <option value="">— اختر التكتل —</option>
              {targets.map((r) => (
                <option key={r.cluster.id} value={r.cluster.id}>
                  {r.cluster.name} — {STATUS[r.status].label} — مجموع الفئات {r.weight}
                </option>
              ))}
            </select>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="السبب (إلزامي)" aria-label="سبب الإضافة" />
            <div className="flex gap-2">
              <Button variant="gold" disabled={!to || reason.trim().length < 3} onClick={add}>
                أضفها
              </Button>
              <Button variant="glass" onClick={() => setAdding(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ───────────────────────── The clusters' programmes ─────────────────────────

const REASONS = ["الوصف لا يطابق العقد الموقّع مع الفندق", "المسافة المذكورة غير دقيقة", "خدمة موصوفة دون تعاقد يثبتها", "صياغة دعائية لا تصف خدمة"];

/**
 * A cluster's public page carries the administration's approval, so the head writes his programme and the holder
 * decides: what changed, from what to what, and a decision with a reason. Nothing reaches the pilgrims before it
 * is approved. Waiting programmes and published ones are the list's two filters; each opens in a side sheet.
 */
function Programmes({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [filter, setFilter] = useState<"pending" | "published">(desk.pendingProgrammes.length || !desk.programmes.some((x) => x.state?.approved) ? "pending" : "published");
  const [open, setOpen] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const published = desk.programmes.filter((x) => x.state?.approved);
  const list = filter === "pending" ? desk.pendingProgrammes : published;
  const sheet = desk.programmes.find((x) => x.cluster.slug === open);

  const decide = (slug: string, name: string, decision: "approved" | "rejected", why?: string) => {
    actions.decideClusterProfile(slug, decision, user.name, why);
    logAdmins(user, "clusters", { action: decision === "approved" ? "اعتماد برنامج تكتل ونشره للحجاج" : "إعادة برنامج تكتل إلى رئيسه", target: name, detail: why, ref: slug });
    toast(decision === "approved" ? { title: "اعتُمد البرنامج ونُشر", body: `${name} — يراه الحجاج الآن في «التكتلات والمجموعات».`, tone: "success", icon: "✅" } : { title: "أُعيد إلى رئيس التكتل", body: why, tone: "info", icon: "↩️" });
    setRejecting(null);
    setOpen(null);
  };

  return (
    <div className="space-y-4">
      <Title>برامج التكتلات</Title>
      <Lead>حين يعدّل رئيس تكتل صفحته العامة في «التكتلات والمجموعات» يصل التعديل هنا قبل أن يراه أحد.</Lead>
      <Filters
        label="البرامج"
        value={filter}
        onChange={setFilter}
        items={[
          { key: "pending", label: "تنتظر اعتمادك", count: desk.pendingProgrammes.length },
          { key: "published", label: "المنشورة", count: published.length },
        ]}
      />
      <ListTable head={["التكتل", filter === "pending" ? "أرسله" : "اعتمده", "التاريخ", filter === "pending" ? "الحقول المعدّلة" : "كتبه"]}>
        {list.length === 0 && <EmptyRow cols={4}>{filter === "pending" ? "لا تعديلات معلّقة." : "لا برامج منشورة بعد."}</EmptyRow>}
        {list.map(({ cluster: c, state }) => {
          const pending = filter === "pending" && state?.pending;
          const live = state?.approved ? { ...fieldsOf(c), ...state.approved.fields } : fieldsOf(c);
          return (
            <tr key={c.slug}>
              <TitleCell
                title={c.name}
                onOpen={() => setOpen(c.slug)}
                sub={pending && state!.pending!.note ? `ملاحظته: ${state!.pending!.note}` : undefined}
                actions={
                  <RowActions>
                    <RowLink onClick={() => setOpen(c.slug)}>{pending ? "مراجعة" : "فتح"}</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top text-white/80">{pending ? state!.pending!.by : state?.approved?.approvedBy}</td>
              <td className="whitespace-nowrap p-3 align-top text-xs text-white/60">{fmtDateTime(pending ? state!.pending!.at : (state?.approved?.approvedAt ?? 0))}</td>
              <td className="p-3 align-top text-white/80">{pending ? `${diffFields(live, state!.pending!.fields).length} حقلاً` : state?.approved?.by}</td>
            </tr>
          );
        })}
      </ListTable>

      <Drawer
        open={!!sheet}
        onClose={() => setOpen(null)}
        title={sheet ? `برنامج ${sheet.cluster.name}` : ""}
        footer={
          sheet?.state?.pending && (
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" onClick={() => decide(sheet.cluster.slug, sheet.cluster.name, "approved")}>
                <BadgeCheck className="size-4" /> اعتماد ونشر
              </Button>
              <Button variant="glass" onClick={() => setRejecting(sheet.cluster.slug)}>
                <X className="size-4" /> إعادة مع السبب
              </Button>
            </div>
          )
        }
      >
        {sheet && (
          <div className="space-y-4 text-sm">
            <Link href={`/clusters/${sheet.cluster.slug}`} target="_blank" className="inline-flex items-center gap-1.5 font-bold text-gold hover:underline">
              <ExternalLink className="size-3.5" /> الصفحة الحالية كما يراها الحاج
            </Link>
            {sheet.state?.pending ? (
              <>
                <p className="text-xs text-white/65">
                  أرسله {sheet.state.pending.by} — {fmtDateTime(sheet.state.pending.at)}
                </p>
                {sheet.state.pending.note && <p className="text-gold">ملاحظته: {sheet.state.pending.note}</p>}
                <ul className="space-y-2">
                  {diffFields(sheet.state.approved ? { ...fieldsOf(sheet.cluster), ...sheet.state.approved.fields } : fieldsOf(sheet.cluster), sheet.state.pending.fields).map((ch) => (
                    <li key={ch.key} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="font-bold text-gold">{ch.label}</p>
                      <p className="mt-1 text-white/50 line-through">{ch.before || "—"}</p>
                      <p className="font-semibold text-white">{ch.after || "—"}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              sheet.state?.approved && (
                <p className="text-white/75">
                  اعتمده {sheet.state.approved.approvedBy} — {fmtDateTime(sheet.state.approved.approvedAt)}. كتبه {sheet.state.approved.by}.
                </p>
              )
            )}
            <RecordHistory system="admins" refId={sheet.cluster.slug} />
          </div>
        )}
      </Drawer>

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
