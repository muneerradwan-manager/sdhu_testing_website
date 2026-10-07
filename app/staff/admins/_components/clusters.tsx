"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Archive, ArchiveRestore, BadgeCheck, Building2, CalendarClock, Check, CircleDashed, Download, ExternalLink, Eye, Inbox, PencilRuler, Plus, Printer, RotateCcw, Send, ShieldCheck, UserMinus, UserPlus, UsersRound, X } from "lucide-react";
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
import { Drawer, Empty, Panel, fmtDateTime, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";

/** The shared input without its full width, for an input given its own */
const sizedInput = smallInputClass.replace("w-full", "");
import { Chip } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { logAdmins, useAdminsDesk, type AdminsDesk, type OutsideGroup } from "../desk";

/**
 * The clusters, as the administration's platform runs them. Whoever holds a role that leads a cluster files
 * a request in its dates — alongside the pilgrims joining the groups — fills it in its order and sends it
 * once complete. The holder opens its review («جاري المراجعة»), then approves it or sends it back with notes
 * its head fixes and sends again before the final deadline; an approved one can be opened again for its head.
 * Outside the rules he edits a request himself («تعديل استثنائي»), always with its reason — that is how a
 * group left outside every cluster is added to one. Then each head writes his cluster's programme, which
 * reaches the pilgrims only once the holder approves it.
 */
export function ClustersTab() {
  const desk = useAdminsDesk();
  const [open, setOpen] = useState<string | null>(null);
  const sheet = desk.requests.find((x) => x.cluster.id === open);

  return (
    <div className="space-y-6">
      <WindowPanel desk={desk} />
      <Requests desk={desk} onOpen={setOpen} />
      <Outside desk={desk} />
      <Programmes desk={desk} />
      <SystemRecords system="admins" area="clusters" title="سجل التكتلات" />
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet?.cluster.name ?? ""} width="max-w-3xl">
        {sheet && <RequestSheet x={sheet} />}
      </Drawer>
    </div>
  );
}

// ───────────────────────── The window ─────────────────────────

/** The requests' dates — the opening, the early deadline that earns the timeliness badge, the final one — and where they stand */
function WindowPanel({ desk }: { desk: AdminsDesk }) {
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
    <Panel icon={<CalendarClock />} title="مواعيد الاستقبال" action={<Chip tone={w.state === "closed" ? "gold" : w.state === "before" ? "muted" : "green"}>{w.state === "before" ? `تفتح ${dayTimeLabel(w.op.start, w.op.startTime)}` : w.state === "closed" ? `انتهت ${dayTimeLabel(w.op.end, w.op.endTime)}` : `مفتوحة حتى ${dayTimeLabel(w.op.end, w.op.endTime)}`}</Chip>}>
      <p className="text-sm leading-7 text-white/75">
        لا انتخاب: يقدّم الطلب من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية، ويملؤه بالترتيب — المستوى، المجموعات ومقاعدها، معاون التكتل، المنسقون والموجّهات، النائب، المحاسب — ويرسله بعد اكتماله. لا يُرسل شيء قبل ساعة البدء ولا بعد ساعة الموعد النهائي، وما يُرسل حتى الموعد الأول ينال «شارة الالتزام بالمواعيد». البدء والنهائي من عملية «تشكيل التكتلات» في «قواعد الإداريين»؛ والموعد الأول هنا.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {[
          ["الطلبات", desk.live.length],
          ["مسودات", desk.drafts.length],
          ["قيد المراجعة", desk.sent.length + desk.reviewing.length],
          ["معتمدة", desk.approvedClusters.length],
          ["أُعيدت بملاحظات", desk.rejected.length],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-xs text-white/60">{k}</p>
            <p className="font-display text-2xl font-bold text-gold">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        {[
          ["البدء", dayTimeLabel(w.op.start, w.op.startTime ?? "00:00", true)],
          ["الموعد الأول (شارة الالتزام)", dayTimeLabel(s.earlyDeadline, s.earlyTime, true)],
          ["الموعد النهائي", dayTimeLabel(w.op.end, w.op.endTime ?? "23:59", true)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-black/20 px-3 py-2">
            <p className="text-white/55">{k}</p>
            <p className="font-bold text-white">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الموعد الأول: اليوم</span>
          <input type="date" value={early} onChange={(e) => setEarly(e.target.value)} className={cn(sizedInput, "w-44 [color-scheme:dark]")} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">والساعة</span>
          <input type="time" value={earlyTime} onChange={(e) => setEarlyTime(e.target.value || "23:59")} className={cn(sizedInput, "w-28 [color-scheme:dark]")} dir="ltr" />
        </label>
        <Button size="sm" variant="glass" disabled={early === s.earlyDeadline && earlyTime === s.earlyTime} onClick={save}>
          حفظ
        </Button>
      </div>
    </Panel>
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

function Requests({ desk, onOpen }: { desk: AdminsDesk; onOpen: (id: string) => void }) {
  const s = useStructure();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [shelf, setShelf] = useState<"live" | "archived">("live");
  const [tier, setTier] = useState("");
  const [creating, setCreating] = useState(false);
  const pool = shelf === "live" ? desk.live : desk.archivedClusters;
  const inTier = pool.filter((r) => !tier || r.cluster.tier === tier);
  const list = inTier.filter((r) => filter === "all" || r.status === filter);
  return (
    <div id="requests" className="scroll-mt-24">
      <Panel
        icon={<Building2 />}
        title="التكتلات المُرسلة"
        action={
          <span className="flex flex-wrap items-center gap-2">
            <Chip tone="gold">{desk.live.length}</Chip>
            <Button size="sm" variant="gold" onClick={() => setCreating(true)}>
              <UserPlus className="size-4" /> إنشاء تشكيل نيابة عن قائد
            </Button>
          </span>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-black/20 p-1" role="group" aria-label="النشطة والمؤرشفة">
            {(
              [
                ["live", `النشطة (${desk.live.length})`],
                ["archived", `المؤرشفة (${desk.archivedClusters.length})`],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={shelf === k} onClick={() => setShelf(k)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", shelf === k ? "bg-gold text-ink" : "text-white/75 hover:text-white")}>
                {l}
              </button>
            ))}
          </div>
          <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="المستوى" className={cn(sizedInput, "h-9 w-44 text-sm [&>option]:text-ink")}>
            <option value="">كل المستويات</option>
            {s.tiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({pool.filter((r) => r.cluster.tier === t.id).length})
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", filter === f.key ? "bg-gold text-green-dark ring-gold" : "bg-white/5 text-white/80 ring-white/15")}>
              {f.label} ({f.key === "all" ? inTier.length : inTier.filter((r) => r.status === f.key).length})
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <Empty icon={<Inbox />} title={shelf === "archived" ? "لا تشكيلات مؤرشفة" : "لا طلبات"} text={shelf === "archived" ? "تُؤرشف التشكيلات المعتمدة واحداً واحداً من الطلب نفسه، أو كلها معاً عند «بدء موسم جديد» في «التكتلات والمجموعات»." : "يقدّمها من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية في مدة تشكيل التكتلات، أو تنشئها الإدارة نيابة عنه."} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((r) => (
              <li key={r.cluster.id}>
                <button type="button" onClick={() => onOpen(r.cluster.id)} className={cn("w-full rounded-2xl p-4 text-right ring-1 transition hover:ring-gold/50", r.status === "rejected" ? "bg-maroon/15 ring-maroon/40" : "bg-white/5 ring-white/10")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold text-gold">{r.cluster.name}</p>
                    <span className="flex flex-wrap justify-end gap-1">
                      <Chip tone={TONE[r.status]}>{STATUS[r.status].label}</Chip>
                      {r.archived && <Chip>مؤرشف — {r.archived.season}</Chip>}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/85">
                    الرئيس: {r.headName} — {s.tiers.find((t) => t.id === r.cluster.tier)?.name ?? "بلا مستوى"} — {r.branches.join("، ")} — موسم {r.season}
                  </p>
                  <p className="text-sm text-white/85">
                    {DEPUTY_TITLE}: {r.cluster.deputy?.status === "accepted" ? r.cluster.deputy.name : <b className="text-gold">لم يقبل أحد بعد</b>}
                  </p>
                  <p className="mt-2 text-xs text-white/60">{requestLine(r)}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {r.complete ? <Chip tone="green">مكتمل الشروط</Chip> : <Chip tone="gold">ناقص: {r.checks.filter((c) => !c.ok && !c.warn).length}</Chip>}
                    {r.cluster.byAdministration && <Chip tone="gold">🛠️ أُنشئ من الإدارة</Chip>}
                    {r.badges.timeliness && <Chip>⏱️ ملتزم بالمواعيد</Chip>}
                    {r.badges.guidance && <Chip>🧭 التميّز في التوجيه</Chip>}
                    {r.badges.age && <Chip>🌟 العمر</Chip>}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <OnBehalf open={creating} onClose={() => setCreating(false)} desk={desk} onCreated={onOpen} />
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
    <Modal open={open} onClose={onClose} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      <p className="text-xs font-bold text-gold">إنشاء تشكيل نيابة عن قائد</p>
      <h3 className="mt-1 font-display text-xl font-bold">طلب تكتل باسم رئيسه</h3>
      <p className="mt-1 text-sm leading-7 text-white/70">لمن يحمل صفة «رئيس تكتل» أساسيةً أو موسمية ولم يقدّم طلباً. يبدأ مسودة فيها مجموعته، وتحمل شارة «أُنشئ من الإدارة».</p>
      <div className="mt-4 space-y-3 text-sm">
        <select value={who} onChange={(e) => { setWho(e.target.value); const l = leaders.find((x) => x.id === e.target.value); if (l && !name) setName(`تكتل ${l.name.split(" ")[0] === "الشيخ" ? l.name.split(" ")[1] : l.name.split(" ")[0]}`); }} aria-label="القائد" className={cn(smallInputClass, "[&>option]:text-ink")}>
          <option value="">— اختر القائد ({leaders.length}) —</option>
          {leaders.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.seasonal ? `${roleName(l.seasonal.role, s)} موسمية` : roleName(l.primary, s)} — {l.branch}
            </option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التكتل" aria-label="اسم التكتل" className={smallInputClass} />
        <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="المستوى" className={cn(smallInputClass, "[&>option]:text-ink")}>
          {s.tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="السبب (إلزامي) — مثال: القائد خارج البلاد، وفوّض الإدارة بكتاب" aria-label="السبب" />
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={!leader || name.trim().length < 3 || reason.trim().length < 3} onClick={create}>
          إنشاء المسودة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}

/** One request whole: the review's step, its report, its checks, the exceptional edits, and its history */
function RequestSheet({ x }: { x: ClusterRequest }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const admins = useStore((s) => s.admins);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={TONE[c.status]}>{STATUS[c.status].label}</Chip>
        {x.archived && <Chip>مؤرشف — موسم {x.archived.season}</Chip>}
        {c.byAdministration && <Chip tone="gold">🛠️ أُنشئ من الإدارة: {c.byAdministration.reason}</Chip>}
        {c.sentAt && <span className="text-xs text-white/60">أُرسل {fmtDateTime(c.sentAt)}</span>}
        {c.review && c.status !== "pending" && <span className="text-xs text-white/60">راجعه {c.review.by}</span>}
        {c.decision && <span className="text-xs text-white/60">{c.decision.status === "approved" ? "اعتمده" : "أعاده"} {c.decision.by} — {fmtDateTime(c.decision.at)}</span>}
      </div>
      {c.decision?.note && <p className="rounded-2xl bg-maroon/25 p-3 text-sm leading-7 text-white ring-1 ring-maroon/50">ملاحظات الإعادة: {c.decision.note}</p>}

      <div className="flex flex-wrap gap-2">
        {c.status === "pending" && (
          <Button size="sm" variant="gold" onClick={() => act("review")}>
            <Eye className="size-4" /> بدء المراجعة
          </Button>
        )}
        {c.status === "reviewing" && (
          <>
            <Button size="sm" variant="gold" disabled={!x.complete} onClick={() => act("approve")}>
              <BadgeCheck className="size-4" /> اعتماد
            </Button>
            <Button size="sm" variant="glass" onClick={() => setRejecting(true)}>
              <X className="size-4" /> رفض مع ملاحظات
            </Button>
          </>
        )}
        {c.status === "approved" && (
          <Button size="sm" variant="glass" onClick={() => act("reopen")}>
            <RotateCcw className="size-4" /> إعادة فتحه لرئيسه للتعديل
          </Button>
        )}
        {c.status === "draft" && c.byAdministration && (
          <Button size="sm" variant="gold" disabled={!x.complete} onClick={sendForHim}>
            <Send className="size-4" /> إرساله للمراجعة نيابة عنه
          </Button>
        )}
        <Button size="sm" variant="glass" onClick={() => window.print()}>
          <Printer className="size-4" /> طباعة التقرير
        </Button>
        <Button size="sm" variant="glass" onClick={() => exportCluster(x)}>
          <Download className="size-4" /> Excel
        </Button>
        {c.status === "approved" &&
          (x.archived ? (
            <Button size="sm" variant="glass" onClick={() => archive(false)}>
              <ArchiveRestore className="size-4" /> استعادته من الأرشيف
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-white" onClick={() => archive(true)}>
              <Archive className="size-4" /> أرشفة
            </Button>
          ))}
        {(c.status === "draft" || c.status === "rejected") && !c.byAdministration && <span className="text-xs text-white/60">عند رئيسه: {c.status === "draft" ? "لم يرسله بعد" : "يصلحه ويعيد إرساله"}.</span>}
        {c.status === "draft" && c.byAdministration && !x.complete && <span className="self-center text-xs text-gold">أنشأته الإدارة: املأ أماكنه بالتعديل الاستثنائي أدناه حتى يكتمل، ثم أرسله.</span>}
        {c.status === "reviewing" && !x.complete && <span className="self-center text-xs text-gold">لا يُعتمد ناقصاً: أعده بملاحظات، أو أكمله بتعديل استثنائي.</span>}
      </div>

      <ul className="space-y-1.5 text-sm">
        {x.checks.map((k) => (
          <li key={k.key} className={cn("flex items-start gap-2 rounded-xl px-3 py-2 ring-1", k.ok ? "bg-green-light/10 text-white ring-green-light/30" : k.warn ? "bg-gold/15 text-white ring-gold/40" : "bg-maroon/20 text-white ring-maroon/40")}>
            {k.ok ? <Check className="mt-0.5 size-4 shrink-0 text-green-light" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-gold" />} {k.label}
          </li>
        ))}
      </ul>

      <ClusterReport req={x} dark />
      <PrintSheet>
        <ClusterPrint req={x} />
      </PrintSheet>
      <Exceptional x={x} />
      <RecordHistory system="admins" refId={c.id} />

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
          label: `${groupName(g.number)} — ${seat.kind === "guide" ? "موجّه أو مرشد" : "معاون"}${seat.free ? " (حر)" : ""}`,
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
    <div className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-gold/25">
      <p className="flex items-center gap-2 font-bold text-gold">
        <PencilRuler className="size-4" /> تعديل استثنائي
      </p>
      <p className="mt-1 text-xs leading-6 text-white/60">خارج الضوابط المعتادة، بسبب يُكتب في سجل التكتل وسجل الشخص. المُضاف يُعدّ قابلاً دون دعوة.</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
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
        <div className="mt-4 space-y-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
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
    <div id="outside" className="scroll-mt-24">
      <Panel icon={<UsersRound />} title="مجموعات معتمدة خارج كل تكتل" action={<Chip tone={desk.outside.length ? "gold" : "green"}>{desk.outside.length ? `${desk.outside.length} خارجها` : "كلها في تكتلات"}</Chip>}>
        {desk.outside.length === 0 ? (
          <p className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">كل مجموعة معتمدة في طلب تكتل.</p>
        ) : (
          <ul className="space-y-2">
            {desk.outside.map((g) => {
              const cat = categoryOfId(s, g.category);
              return (
                <li key={g.number} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-bold text-white">
                      {groupName(g.number)} <span className="font-normal text-white/70">— {g.headName}</span>
                    </span>
                    <span className="block text-xs text-white/60">
                      {g.branch} — {cat?.name ?? "بلا فئة"} ({seatsLabel(seatsOf(s, undefined, g.category))}) — {g.pilgrims} حاجاً {g.from ? `— كانت في ${g.from}` : "— لم يأخذها طلب"}
                    </span>
                  </span>
                  <Button size="sm" variant="glass" disabled={!desk.deadlinePassed || !g.category || !targets.length} onClick={() => setAdding(g)}>
                    <Plus className="size-4" /> أضفها إلى تكتل
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {!desk.deadlinePassed && desk.outside.length > 0 && <p className="mt-3 text-xs text-white/55">ما دامت الطلبات مفتوحة قد يدعوها رئيس تكتل؛ تُضاف بتعديل استثنائي بعد الموعد النهائي {dayLabel(desk.formationWindow.op.end, true)}.</p>}
      </Panel>
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
