"use client";

import { uploadMedia, useMediaUrl } from "@/lib/cms/media";
import { seedContract } from "@/app/administrator/_components/contract-view";
import { useSeason } from "@/lib/season-live";
import { distribute, fits, loadOf } from "@/app/administrator/_lib/distribution";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, BadgeCheck, Check, CircleDashed, Download, ExternalLink, Plus, Printer, UserMinus, X, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { diffFields, fieldsOf } from "@/lib/cluster-profile";
import { useHotels } from "@/lib/ops";
import { diffGroupFields, groupSeed } from "@/lib/group-profile";
import { CmsImage } from "@/components/cms/image";
import { groupName } from "@/lib/groups";
import { downloadCsv } from "@/lib/csv";
import { dayLabel, dayTimeLabel } from "@/lib/operations";
import { actions, getState, useStore, type ClusterInvite, type GroupInvite, type Seat, type SignedContract } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { ClusterPrint, ClusterReport, requestLine } from "@/app/administrator/_components/cluster-report";
import { logCadre, nameOf, placesOf } from "@/app/administrator/_lib/cadre";
import { HEADS_POOL } from "@/app/administrator/_lib/cluster";
import { ACCOUNTANT_TITLE, STATUS, exceptionalEdit, fitSeats, newCluster, roleOfPerson, useFormingSeason, useGroupPool, usePicks, writeCluster, type Cluster, type ClusterRequest, placedIn, cadreOf, refit } from "@/app/administrator/_lib/formation";
import { categoryOf, categoryOfId, does, roleName, seatsLabel, seatsOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { useCadreRows } from "./cadre";
import { Drawer, fmtDateTime, smallInputClass, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { RecordHistory } from "../../_components/system";
import { AddButton, Box, EditHeader, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, Locked, NotFound, SaveLine, TitleCell, Views, needs, useHrefWith, useOpenId, useView } from "./ui";
import { logAdmins, useAdminsDesk, type AdminsDesk, type OutsideGroup } from "../desk";

/** The shared input without its full width, for an input given its own */
const sizedInput = smallInputClass.replace("w-full", "");
const CLUSTERS = "/staff/admins/manage/clusters";

const VIEWS = ["requests", "outside", "programmes", "group-pages", "archived"] as const;

/**
 * «التكتلات» — the clusters formed at the office as a site's list, each opening on its own screen (`?id=`): its
 * report, its checks and the exceptional edits in the middle; the decision, printing and the archive on the side.
 * The page's other views (`?v=`) are the approved groups left outside every cluster, the clusters' programmes
 * waiting for approval, and the archive. The requests' dates wait closed at the end of the page.
 */
export function ClustersTab() {
  const desk = useAdminsDesk();
  const id = useOpenId();
  const view = useView("v", VIEWS);
  const may = useCan();
  // Each view is its own resource: the clusters, their programmes, the groups' pages
  const sees = (v: (typeof VIEWS)[number]) => may(v === "programmes" ? "admins.programmes.GET" : v === "group-pages" ? "admins.group-pages.GET" : "admins.clusters.GET");
  if (id) return may("admins.clusters.GET") ? <RequestScreen id={id} desk={desk} /> : <Locked perm="admins.clusters.GET" />;
  const items = [
    { key: "requests" as const, label: "التكتلات", count: desk.live.length },
    { key: "outside" as const, label: "مجموعات خارج التكتلات", count: desk.outside.length },
    { key: "programmes" as const, label: "برامج التكتلات", count: desk.pendingProgrammes.length },
    { key: "group-pages" as const, label: "صفحات المجموعات", count: desk.pendingGroupPages.length },
    { key: "archived" as const, label: "المؤرشفة", count: desk.archivedClusters.length },
  ].filter((v) => sees(v.key));
  return (
    <div className="space-y-5">
      <Views param="v" value={view} label="التكتلات" items={items} />
      {!sees(view) && <Locked perm={view === "programmes" ? "admins.programmes.GET" : view === "group-pages" ? "admins.group-pages.GET" : "admins.clusters.GET"} />}
      {sees(view) && (view === "requests" || view === "archived") && <Requests key={view} desk={desk} shelf={view === "archived" ? "archived" : "live"} />}
      {sees(view) && view === "outside" && <Outside desk={desk} />}
      {sees(view) && view === "programmes" && <Programmes desk={desk} />}
      {sees(view) && view === "group-pages" && <GroupPages desk={desk} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {may("admins.clusters.GET") && <WindowBox desk={desk} />}
        <Help>
          <p>لا انتخاب ولا طلب على المنصة: يحضر من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية ومعه رؤساء المجموعات وكادره إلى المكتب. تُدخل التكتل بالترتيب — المستوى، المجموعات بفرقها، كادر التكتل (المنسقون والموجّهات ومعاونه) وتوزيعه، المحاسب — ثم رسمه وعقده الموقّع، فيُنشأ معتمداً.</p>
          <p>يُنشأ التكتل معتمداً حين تكمل في المكتب رسمه وعقده الموقّع، ولا مراجعة بعده. وما يتغير فيه بعد إنشائه تعدّله أنت في المكتب «تعديلاً استثنائياً» بسبب يُكتب في سجله وسجل الشخص.</p>
          <p>ثم يكتب كل رئيس برنامج تكتله، ويكتب رئيس كل مجموعة صفحتها (صورتها ونبذتها ومعرض صورها)، ولا يصل شيء منها إلى الحجاج قبل أن تعتمده.</p>
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
    logAdmins(user, "clusters", { action: "تعديل الموعد الأول لتشكيل التكتلات", target: "شارة الالتزام بالمواعيد", before: dayTimeLabel(s.earlyDeadline, s.earlyTime, true), after: dayTimeLabel(early, earlyTime, true), important: true });
    toast({ title: "حُفظ الموعد الأول", body: `ما يُشكَّل حتى ${dayTimeLabel(early, earlyTime, true)} ينال شارة الالتزام بالمواعيد.`, tone: "success", icon: "💾" });
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
        البدء والنهائي من عملية «تشكيل التكتلات» في <Link href="/staff/admins/manage" className="font-bold text-gold hover:underline">«قواعد الإداريين»</Link>. والموعد الأول هنا: التكتل الذي يُشكَّل في المكتب حتى ساعته ينال «شارة الالتزام بالمواعيد».
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
      <SaveLine dirty={early !== s.earlyDeadline || earlyTime !== s.earlyTime} onSave={save} label="حفظ الموعد الأول" perm="admins.clusters.PUT" />
    </Box>
  );
}

// ───────────────────────── The requests ─────────────────────────

const FILTERS: { key: "all" | Cluster["status"]; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "approved", label: "شُكّل في المكتب" },
  { key: "draft", label: "قيد التشكيل" },
];

const TONE: Record<Cluster["status"], "green" | "gold" | "maroon" | "muted"> = { draft: "muted", pending: "gold", reviewing: "gold", approved: "green", rejected: "maroon" };

function Requests({ desk, shelf }: { desk: AdminsDesk; shelf: "live" | "archived" }) {
  const s = useStructure();
  const router = useRouter();
  const hrefWith = useHrefWith();
  // «ما ينتظرك» opens the clusters still forming at the office (`?f=draft`)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("f") === "draft" ? "draft" : "all"));
  const [tier, setTier] = useState("");
  const [creating, setCreating] = useState(false);
  const pool = shelf === "live" ? desk.live : desk.archivedClusters;
  const inTier = pool.filter((r) => !tier || r.cluster.tier === tier);
  const list = inTier.filter((r) => filter === "all" || r.status === filter);
  const may = useCan();
  return (
    <div className="space-y-4">
      <Title action={shelf === "live" && may("admins.clusters.POST") && <AddButton onClick={() => setCreating(true)}>تشكيل تكتل في المكتب</AddButton>}>{shelf === "live" ? "التكتلات" : "التشكيلات المؤرشفة"}</Title>
      <Lead>{shelf === "live" ? "يُشكَّل التكتل في المكتب بحضور رئيسه وكل من فيه: «تشكيل تكتل في المكتب»، ثم أدخل مجموعاته وكادره وتوزيعه، وخذ رسمه، وارفع عقده الموقّع، وأنشئه." : "تشكيلات أُرشفت واحداً واحداً، أو كلها عند «بدء موسم جديد» في «التكتلات والمجموعات»."}</Lead>
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
        {list.length === 0 && <EmptyRow cols={6}>{shelf === "archived" ? "لا تشكيلات مؤرشفة." : "لا تكتلات بعد. يُشكَّل كل تكتل في المكتب بحضور من يحمل صفة «رئيس تكتل» وكل من فيه."}</EmptyRow>}
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
                    {(r.badges.timeliness || r.badges.guidance || r.badges.age) && (
                      <span className="block text-white/45">{[r.badges.timeliness && "⏱️ ملتزم بالمواعيد", r.badges.guidance && "🧭 التميّز في التوجيه", r.badges.age && "🌟 العمر"].filter(Boolean).join(" · ")}</span>
                    )}
                  </>
                }
                actions={
                  <RowActions>
                    <RowLink href={href}>{r.status === "draft" ? "متابعة التشكيل" : "فتح"}</RowLink>
                    {may("admins.clusters.export") && <RowLink onClick={() => exportCluster(r)}>Excel</RowLink>}
                  </RowActions>
                }
              />
              <td className="p-3 align-top">
                {r.headName}
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
 * «تشكيل تكتل في المكتب»: the holder of the cluster-head role comes to the office with everyone in his cluster.
 * The employee starts it with its head, name and tier — his own group in it from the start, with the seats the
 * office filled when it formed it — then enters its groups and people on its screen (OfficeDesk) and creates it.
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
  const busy = new Set(desk.live.map((r) => r.headId));
  const leaders = rows.filter((r) => !r.status && does(s, r.seasonal?.role ?? r.primary, "clusterLeader") && !busy.has(r.id));
  const leader = leaders.find((r) => r.id === who);
  const create = () => {
    if (!leader) return;
    const at = nowMs();
    const id = `cluster-adm-${at.toString(36)}`;
    // His own group comes in with him: his group on this device (with the team the office seated), or the season's records of it
    const live = admins[leader.id]?.group?.approvedAt ? admins[leader.id]!.group : undefined;
    const seed = HEADS_POOL.find((h) => h.id === leader.id);
    const number = live?.number ?? seed?.group;
    const category = categoryOf(leader.id, cadre);
    const own: GroupInvite | undefined = number !== undefined && category ? { id: leader.id, name: leader.name, at, status: "accepted", number, branch: leader.branch, category, pilgrims: seed?.pilgrims ?? 0 } : undefined;
    const base = newCluster(id, name.trim(), at, own, season);
    const cluster: Cluster = {
      ...base,
      tier,
      seats: own ? { [own.number]: fitSeats(s, tier, own.category, live?.seats) } : {},
      assistants: live?.countAssistant ? [live.countAssistant] : [],
      byAdministration: { by: user.name, reason: "شُكّل في المكتب", at },
    };
    if (admins[leader.id]) writeCluster({ headId: leader.id, headName: leader.name, headGroup: number, seed: false }, cluster, admins);
    else actions.setFormation((f) => ({ ...f, created: [...f.created, { headId: leader.id, headName: leader.name, headGroup: number, cluster }] }));
    logAdmins(user, "clusters", { action: "بدء تشكيل تكتل في المكتب", target: cluster.name, detail: `${leader.name} — ${s.tiers.find((t) => t.id === tier)?.name}`, ref: id, important: true });
    toast({ title: `بدأ تشكيل ${cluster.name}`, body: `أدخل مجموعاته وكادره وتوزيعه بحضور ${leader.name}، ثم ارفع العقد الموقّع وأنشئه.`, tone: "success", icon: "🏛️" });
    onClose();
    onCreated(id);
    setWho("");
    setName("");
  };
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="تشكيل تكتل في المكتب"
      width="max-w-lg"
      footer={
        <Button variant="gold" disabled={!leader || name.trim().length < 3} onClick={create}>
          بدء التشكيل
        </Button>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">يحضر من يحمل صفة «رئيس تكتل» أساسيةً أو موسمية ومعه رؤساء المجموعات وكادره. ابدأ التكتل باسمه ومستواه، وتدخل مجموعته معه بفريقها.</p>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">رئيس التكتل ({leaders.length})</span>
          <select
            value={who}
            onChange={(e) => {
              setWho(e.target.value);
              const l = leaders.find((x) => x.id === e.target.value);
              if (l && !name) setName(`تكتل ${l.name.split(" ")[0] === "الشيخ" ? l.name.split(" ")[1] : l.name.split(" ")[0]}`);
            }}
            className={cn(smallInputClass, "[&>option]:text-ink")}
          >
            <option value="">— اختر رئيس التكتل الحاضر —</option>
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
      </div>
    </Drawer>
  );
}

// ───────────────────────── Forming it at the office ─────────────────────────

/**
 * A cluster being formed at the office, its head and everyone in it there: the employee enters, as its head
 * chooses, its groups — each with its head and the seats the office filled when it formed it — the cluster's
 * assistants, coordinators and female guides, its accountant, and their distribution on the groups. Everyone
 * placed is present, so each place is taken at once. The conditions say what is still missing.
 */
function OfficeDesk({ x }: { x: ClusterRequest }) {
  const user = useStaffUser()!;
  const s = useStructure();
  const admins = useStore((v) => v.admins);
  const picks = usePicks(x);
  const c = x.cluster;
  const placed = placedIn(c);
  const pool = useGroupPool(x).filter((g) => !g.takenBy && !c.groups[g.number] && !!g.category);
  const [group, setGroup] = useState("");
  const write = (next: Cluster, action: string, detail?: string) => {
    writeCluster(x, next, admins);
    logAdmins(user, "clusters", { action, target: c.name, detail, ref: c.id });
  };
  const here = (id: string, name: string): ClusterInvite => ({ id, name, at: nowMs(), status: "accepted" });
  const options = (b: "guideSeat" | "assistantSeat" | "assistantPool" | "coordinatorPool" | "guidePool") => picks(b).filter((p) => !p.takenBy && !placed.has(p.id));
  const units = x.groups.map((g) => ({ number: g.number, units: g.units }));
  const coords = c.coordinators.filter((v) => v.status === "accepted");
  const guides = c.femaleGuides.filter((v) => v.status === "accepted");
  const members = cadreOf(x.headId, c)
    .filter((id) => !c.femaleGuides.some((v) => v.id === id))
    .map((id) => ({ id, name: id === x.headId ? x.headName : (Object.values(c.groups).find((g) => g.id === id)?.name ?? Object.values(c.seats).flat().find((v) => v.who?.id === id)?.who?.name ?? [...c.assistants, ...c.coordinators].find((v) => v.id === id)?.name ?? id) }));

  const addGroup = () => {
    const g = pool.find((y) => String(y.number) === group);
    if (!g?.category) return;
    const owner = admins[g.headId]?.group;
    const inv: GroupInvite = { ...here(g.headId, g.headName), number: g.number, branch: g.branch, category: g.category, pilgrims: g.pilgrims };
    write(
      { ...c, groups: { ...c.groups, [g.number]: inv }, seats: { ...c.seats, [g.number]: fitSeats(s, c.tier, g.category, g.seats) }, assistants: owner?.countAssistant ? [...c.assistants, owner.countAssistant] : c.assistants },
      "إدخال مجموعة إلى التكتل في المكتب",
      `${groupName(g.number)} — رئيسها ${g.headName}`,
    );
    setGroup("");
  };
  const removeGroup = (n: number) => {
    const g = c.groups[n];
    const seats = { ...c.seats };
    delete seats[n];
    const groups = { ...c.groups };
    delete groups[n];
    const sorting = { ...c.sorting };
    delete sorting[n];
    const guideSorting = { ...(c.guideSorting ?? {}) };
    delete guideSorting[n];
    write({ ...c, groups, seats, sorting, guideSorting }, "إخراج مجموعة من التكتل في المكتب", `${groupName(n)} — ${g?.name}`);
  };
  const seat = (n: number, i: number, id: string) => {
    const p = [...picks("guideSeat"), ...picks("assistantSeat")].find((y) => y.id === id);
    write({ ...c, seats: { ...c.seats, [n]: (c.seats[n] ?? []).map((v, j) => (j === i ? { ...v, who: p ? here(p.id, p.name) : undefined } : v)) } }, p ? "شغل مقعد في مجموعة" : "إخلاء مقعد في مجموعة", `${groupName(n)}${p ? ` — ${p.name}` : ""}`);
  };
  const addTo = (list: "assistants" | "coordinators" | "femaleGuides", id: string) => {
    const behavior = list === "assistants" ? "assistantPool" : list === "coordinators" ? "coordinatorPool" : "guidePool";
    const p = picks(behavior).find((y) => y.id === id);
    if (!p) return;
    write({ ...c, [list]: [...c[list], here(p.id, p.name)] }, list === "assistants" ? "إضافة معاون التكتل" : list === "coordinators" ? "إضافة منسق تقني" : "إضافة موجّهة دينية", p.name);
  };
  const dropFrom = (list: "assistants" | "coordinators" | "femaleGuides", id: string) => {
    const map = list === "coordinators" ? Object.fromEntries(Object.entries(c.sorting).filter(([, w]) => w !== id)) : c.sorting;
    const gmap = list === "femaleGuides" ? Object.fromEntries(Object.entries(c.guideSorting ?? {}).filter(([, w]) => w !== id)) : c.guideSorting;
    write({ ...c, [list]: c[list].filter((v) => v.id !== id), sorting: map, guideSorting: gmap }, "إزالة من كادر التكتل", c[list].find((v) => v.id === id)?.name);
  };
  const sortOne = (field: "sorting" | "guideSorting", n: number, id: string) => {
    const map = { ...(c[field] ?? {}) };
    if (id) map[n] = id;
    else delete map[n];
    write({ ...c, [field]: map }, field === "sorting" ? "توزيع منسق على مجموعة" : "توزيع موجّهة على مجموعة", `${groupName(n)}`);
  };
  const auto = () => {
    const a = distribute(units, coords.map((v) => v.id), x.needs.perCoordinator).map;
    const b = distribute(units, guides.map((v) => v.id), x.needs.perGuide).map;
    write({ ...c, sorting: a, guideSorting: b }, "توزيع المنسقين والموجّهات تلقائياً");
  };

  const select = "h-9 w-full rounded-lg bg-white/10 px-2 text-xs text-white outline-none ring-1 ring-white/15 focus:ring-gold/50 [&>option]:text-ink";
  // A box per list of the cluster's team (a function, not a component: it is drawn inside this one)
  const listBox = (list: "assistants" | "coordinators" | "femaleGuides", title: string, behavior: "assistantPool" | "coordinatorPool" | "guidePool") => (
    <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <p className="mb-2 text-xs font-bold text-gold">{title} ({c[list].filter((v) => v.status === "accepted").length})</p>
      <ul className="space-y-1">
        {c[list].filter((v) => v.status === "accepted").map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2 py-1 text-xs text-white">
            {v.name}
            <button type="button" onClick={() => dropFrom(list, v.id)} aria-label={`إزالة ${v.name}`} className="text-white/50 hover:text-maroon">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <select value="" onChange={(e) => e.target.value && addTo(list, e.target.value)} aria-label={`إضافة: ${title}`} className={cn(select, "mt-2")}>
        <option value="">+ إضافة من الحاضرين المؤهلين...</option>
        {options(behavior).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {roleName(p.role, s)} — {p.branch}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-5">
      <Box title="١. الاسم والمستوى">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs text-white/60">
            اسم التكتل
            <input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== c.name && write({ ...c, name: e.target.value.trim() }, "تسمية التكتل", e.target.value.trim())} className={cn(smallInputClass, "mt-1")} />
          </label>
          <label className="block text-xs text-white/60">
            المستوى
            <select value={c.tier ?? ""} onChange={(e) => write(refit(s, { ...c, tier: e.target.value }), "تغيير مستوى التكتل", s.tiers.find((t) => t.id === e.target.value)?.name)} className={cn(smallInputClass, "mt-1 [&>option]:text-ink")}>
              {s.tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Box>

      <Box title={`٢. المجموعات (${x.groups.length}) — مجموع الفئات ${x.weight}، المطلوب بين ${x.needs.min} و${x.needs.max}`}>
        <ul className="space-y-2">
          {x.groups.map((g) => (
            <li key={g.number} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-white">
                  {groupName(g.number)} <span className="text-xs font-normal text-white/60">— رئيسها {g.head} — {g.categoryName}</span>
                </p>
                {g.number !== x.headGroup && (
                  <button type="button" onClick={() => removeGroup(g.number)} className="text-xs font-bold text-white/60 hover:text-maroon">
                    إخراجها
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(c.seats[g.number] ?? []).map((v, i) => {
                  const kind = v.free ? "مقعد حر" : v.kind === "guide" ? "الموجّه" : "المعاون";
                  const list = v.free ? [...options("guideSeat"), ...options("assistantSeat")] : options(v.kind === "guide" ? "guideSeat" : "assistantSeat");
                  return (
                    <label key={i} className="block text-[11px] text-white/60">
                      {kind}
                      <select value={v.who?.status === "accepted" ? v.who.id : ""} onChange={(e) => seat(g.number, i, e.target.value)} className={cn(select, "mt-1")}>
                        <option value="">— شاغر —</option>
                        {v.who?.status === "accepted" && <option value={v.who.id}>{v.who.name}</option>}
                        {list
                          .filter((p, k, all) => all.findIndex((y) => y.id === p.id) === k)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {roleName(p.role, s)}
                            </option>
                          ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="مجموعة تدخل التكتل" className={cn(select, "flex-1")}>
            <option value="">— اختر مجموعة مشكّلة حضر رئيسها ({pool.length}) —</option>
            {pool.map((g) => (
              <option key={g.number} value={g.number}>
                {groupName(g.number)} — {g.headName} — {categoryOfId(s, g.category)?.name} — {g.branch}
              </option>
            ))}
          </select>
          <Button size="sm" variant="gold" disabled={!group} onClick={addGroup}>
            <Plus className="size-4" /> إدخالها
          </Button>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-white/50">تدخل كل مجموعة برئيسها وبالموجّه والمعاون اللذين أجلسهما المكتب فيها عند تشكيلها.</p>
      </Box>

      <Box title="٣. كادر التكتل — يختاره رئيسه">
        <div className="grid gap-3 lg:grid-cols-3">
          {listBox("coordinators", `المنسقون التقنيون (المطلوب ${x.needs.coordinators})`, "coordinatorPool")}
          {listBox("femaleGuides", `الموجّهات الدينيات (المطلوب ${x.needs.femaleGuides})`, "guidePool")}
          {listBox("assistants", `معاونو التكتل (المطلوب ${x.needs.assistants})`, "assistantPool")}
        </div>
        <label className="mt-3 block text-xs text-white/60">
          {ACCOUNTANT_TITLE} — من أعضاء التكتل
          <select
            value={c.accountant?.status === "accepted" ? c.accountant.id : ""}
            onChange={(e) => {
              const m = members.find((v) => v.id === e.target.value);
              write({ ...c, accountant: m ? here(m.id, m.name) : undefined }, m ? "تحديد محاسب التكتل" : "إلغاء محاسب التكتل", m?.name);
            }}
            className={cn(select, "mt-1")}
          >
            <option value="">— لم يُحدَّد —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </Box>

      <Box title="٤. توزيع المنسقين والموجّهات على المجموعات">
        <div className="mb-2 flex justify-end">
          <Button size="sm" variant="glass" disabled={!coords.length && !guides.length} onClick={auto}>
            توزيع تلقائي ضمن الحدود
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-xs text-white">
            <thead>
              <tr className="text-white/50">
                <th className="p-2 text-start">المجموعة</th>
                <th className="p-2 text-start">المنسق التقني (حتى {x.needs.perCoordinator} وحدات)</th>
                <th className="p-2 text-start">الموجّهة (حتى {x.needs.perGuide} وحدات)</th>
              </tr>
            </thead>
            <tbody>
              {x.groups.map((g) => (
                <tr key={g.number} className="border-t border-white/10">
                  <td className="p-2 font-bold">
                    {groupName(g.number)} <span className="font-normal text-white/50">({g.units})</span>
                  </td>
                  <td className="p-2">
                    <select value={c.sorting[g.number] ?? ""} onChange={(e) => sortOne("sorting", g.number, e.target.value)} className={select}>
                      <option value="">—</option>
                      {coords.map((v) => (
                        <option key={v.id} value={v.id} disabled={!fits(units, c.sorting, v.id, { number: g.number, units: g.units }, x.needs.perCoordinator)}>
                          {v.name} ({loadOf(units, c.sorting, v.id)} من {x.needs.perCoordinator})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select value={c.guideSorting?.[g.number] ?? ""} onChange={(e) => sortOne("guideSorting", g.number, e.target.value)} className={select}>
                      <option value="">—</option>
                      {guides.map((v) => (
                        <option key={v.id} value={v.id} disabled={!fits(units, c.guideSorting ?? {}, v.id, { number: g.number, units: g.units }, x.needs.perGuide)}>
                          {v.name} ({loadOf(units, c.guideSorting ?? {}, v.id)} من {x.needs.perGuide})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>
    </div>
  );
}

/**
 * Creating it: once its conditions pass, the fee is paid at the office and the paper contract everyone in it signed
 * is uploaded — then it is formed, approved as it is created, and its head and everyone in it find it at once.
 */
function OfficeFinish({ x, onCancel }: { x: ClusterRequest; onCancel: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const admins = useStore((v) => v.admins);
  const fee = useSeason().fees.clusterFormation;
  const c = x.cluster;
  const [paid, setPaid] = useState(false);
  const [signed, setSigned] = useState(false);
  const [contract, setContract] = useState<SignedContract | null>(c.contract ?? null);
  const [uploading, setUploading] = useState(false);
  const may = useCan();
  const ready = x.complete && paid && signed && !!contract;
  const upload = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const { ref } = await uploadMedia(f, user.name, { documents: true });
      setContract({ ref, name: f.name, type: f.type || "application/octet-stream", at: nowMs(), by: user.name });
    } catch (e) {
      toast({ title: "لم يُرفع العقد", body: (e as Error).message, tone: "warning", icon: "⚠️" });
    }
    setUploading(false);
  };
  const create = () => {
    if (!ready || !contract) return;
    const at = nowMs();
    writeCluster(x, { ...c, status: "approved", sentAt: at, firstSentAt: c.firstSentAt ?? at, feePaidAt: at, contract, decision: { status: "approved", at, by: user.name } }, admins);
    logAdmins(user, "clusters", { action: "إنشاء تكتل في المكتب", target: c.name, detail: `${requestLine(x)} — رسم ${fee} $ — العقد موقّع من ${x.cadre} شخصاً ومرفوع`, ref: c.id, important: true });
    toast({ title: `أُنشئ ${c.name}`, body: `يراه ${x.headName} الآن في «إدارة التكتل»، ويرى كل من فيه مكانه وعقده.`, tone: "success", icon: "🏛️" });
  };
  return (
    <Box title="إنشاء التكتل">
      <ul className="space-y-1 text-xs">
        {x.checks.filter((k) => !k.warn).map((k) => (
          <li key={k.key} className={cn("flex items-start gap-1.5", k.ok ? "text-green-light" : "text-gold")}>
            {k.ok ? <Check className="mt-0.5 size-3.5 shrink-0" /> : <CircleDashed className="mt-0.5 size-3.5 shrink-0" />} {k.label}
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm text-white/85">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-[#D9C89E]" />
        سدّد رسم التكتل {fee} $ في المكتب
      </label>
      <div className="space-y-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="text-xs leading-6 text-white/70">عقد التكتل الورقي: يوقّعه رئيسه وكل من فيه. صوّره أو امسحه وارفعه، فيراه كل أعضاء التكتل في «العقود».</p>
        {may("admins.contracts.PUT") ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
            <Upload className="size-4" /> {uploading ? "جارٍ الرفع…" : contract ? "استبدال العقد" : "رفع صورة العقد الموقّع"}
            <input type="file" accept="image/*,application/pdf" hidden aria-label="عقد التكتل" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
          </label>
        ) : (
          <Locked perm="admins.contracts.PUT">رفع العقد لغيرك.</Locked>
        )}
        {contract && <p className="text-xs text-green-light">رُفع: {contract.name}</p>}
        <label className="flex items-center gap-2 text-sm text-white/85">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} className="size-4 accent-[#D9C89E]" />
          وقّع العقدَ كلُّ من في التكتل ({x.cadre} شخصاً)
        </label>
      </div>
      <Button variant="gold" className="w-full" disabled={!ready || !may("admins.clusters.create")} title={may("admins.clusters.create") ? undefined : needs("admins.clusters.create")} onClick={create}>
        <BadgeCheck className="size-4" /> إنشاء التكتل
      </Button>
      {!x.complete && <p className="text-xs text-gold">أكمل الشروط أعلاه أولاً.</p>}
      {may("admins.clusters.DELETE") && (
        <button type="button" onClick={onCancel} className="w-full text-center text-xs font-bold text-white/50 hover:text-maroon">
          إلغاء هذا التشكيل
        </button>
      )}
    </Box>
  );
}

/** A cluster's contract on its screen: open it, or replace it with a new scan */
function ContractBox({ x }: { x: ClusterRequest }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const admins = useStore((v) => v.admins);
  const c = x.cluster;
  // a cluster formed before the demo began carries the contract uploaded then, as its members see it
  const shown = c.contract ?? (c.status === "approved" ? seedContract("cluster", `عقد ${c.name}`) : undefined);
  const url = useMediaUrl(shown?.ref);
  const may = useCan();
  const replace = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    try {
      const { ref } = await uploadMedia(f, user.name, { documents: true });
      writeCluster(x, { ...c, contract: { ref, name: f.name, type: f.type || "application/octet-stream", at: nowMs(), by: user.name } }, admins);
      logAdmins(user, "clusters", { action: "رفع عقد التكتل", target: c.name, detail: f.name, ref: c.id, important: true });
    } catch (e) {
      toast({ title: "لم يُرفع العقد", body: (e as Error).message, tone: "warning", icon: "⚠️" });
    }
  };
  return (
    <Box title="عقد التكتل">
      {!may("admins.contracts.GET") ? (
        <Locked perm="admins.contracts.GET">العقد الموقّع مخفي.</Locked>
      ) : shown ? (
        <>
          {shown.type.startsWith("image/") ? (
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white/5">
              <CmsImage src={shown.ref} alt={`عقد ${c.name}`} fill sizes="320px" className="object-contain" />
            </div>
          ) : (
            <p className="text-xs text-white/70">{shown.name}</p>
          )}
          <p className="text-xs text-white/60">
            رفعه {shown.by} — {fmtDateTime(shown.at)}
          </p>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" download={shown.name} className="text-xs font-bold text-gold hover:underline">
              فتح العقد
            </a>
          )}
        </>
      ) : (
        <p className="text-xs text-gold">لم يُرفع عقده بعد.</p>
      )}
      {may("admins.contracts.PUT") && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
          <Upload className="size-4" /> {c.contract ? "استبدال العقد" : "رفع العقد الموقّع"}
          <input type="file" accept="image/*,application/pdf" hidden aria-label="عقد التكتل" onChange={(e) => { void replace(e.target.files); e.target.value = ""; }} />
        </label>
      )}
    </Box>
  );
}

// ───────────────────────── One request ─────────────────────────

/** One cluster on its own screen: being formed, the office's desk; formed, its report, its contract, its exceptional edits, printing and the archive */
function RequestScreen({ id, desk }: { id: string; desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const router = useRouter();
  const hrefWith = useHrefWith();
  const admins = useStore((s) => s.admins);
  const x = desk.requests.find((r) => r.cluster.id === id);
  const back = hrefWith({ id: null });
  const may = useCan();
  if (!x) return <NotFound back={back} backLabel="التكتلات" what="هذا التكتل" />;
  const c = x.cluster;
  const forming = c.status !== "approved";
  // Cancelled before it was created: everyone placed leaves it, and the cluster goes
  const cancel = () => {
    writeCluster(x, { ...c, groups: {}, seats: {}, assistants: [], coordinators: [], femaleGuides: [], accountant: undefined, sorting: {}, guideSorting: {} }, admins);
    if (admins[x.headId]?.cluster?.id === c.id) actions.upsertAdmin(x.headId, { cluster: undefined });
    actions.setFormation((f) => ({ ...f, created: f.created.filter((v) => v.cluster.id !== c.id) }));
    logAdmins(user, "clusters", { action: "إلغاء تشكيل تكتل قبل إنشائه", target: c.name, ref: c.id, important: true });
    toast({ title: `أُلغي تشكيل ${c.name}`, tone: "info", icon: "✖️" });
    router.push(back);
  };
  const archive = (on: boolean) => {
    actions.setFormation((f) => {
      const archived = { ...f.archived };
      if (on) archived[c.id] = { season: x.season, at: nowMs(), by: user.name };
      else delete archived[c.id];
      return { ...f, archived };
    });
    logAdmins(user, "clusters", { action: on ? "أرشفة تكتل" : "استعادة تكتل من الأرشيف", target: c.name, detail: `موسم ${x.season}`, ref: c.id, important: true });
    toast({ title: on ? `أُرشف ${c.name}` : `استُعيد ${c.name}`, body: on ? "يبقى في «التكتلات والمجموعات» بموسمه، ويخرج من عمل الموسم." : "عاد إلى التكتلات النشطة.", tone: "info", icon: on ? "🗄️" : "↩️" });
  };

  return (
    <div>
      <EditHeader back={back} backLabel="التكتلات" title={c.name}>
        رئيسه {x.headName} — موسم {x.season} — {requestLine(x)}
      </EditHeader>
      <EditLayout
        main={
          forming ? (
            // The draft's desk: everything in it is changing the draft
            <fieldset disabled={!may("admins.clusters.PUT")} className="min-w-0 space-y-4">
              <Locked perm="admins.clusters.PUT" />
              <OfficeDesk x={x} />
            </fieldset>
          ) : (
            <>
              <ClusterReport req={x} dark />
              <PrintSheet>
                <ClusterPrint req={x} />
              </PrintSheet>
              {may("admins.clusters.exceptional-edit") && (
                <Box title="تعديل استثنائي (بعد إنشائه)" open={false}>
                  <Exceptional x={x} />
                </Box>
              )}
            </>
          )
        }
        side={
          forming ? (
            <OfficeFinish x={x} onCancel={cancel} />
          ) : (
            <>
              <Box title="حاله">
                <p className="flex flex-wrap gap-1">
                  <Tag tone="green">{STATUS.approved.label}</Tag>
                  {x.archived && <Tag>مؤرشف — موسم {x.archived.season}</Tag>}
                </p>
                <ul className="space-y-0.5 text-xs text-white/60">
                  {c.decision && (
                    <li>
                      أنشأه {c.decision.by} — {fmtDateTime(c.decision.at)}
                    </li>
                  )}
                  <li>{c.feePaidAt ? "رسم التكتل مدفوع في المكتب" : "رسم التكتل لم يُسجَّل"}</li>
                </ul>
              </Box>
              <ContractBox x={x} />
              <Box title="طباعة وتصدير">
                <RowActions>
                  {may("admins.clusters.print") && (
                    <RowLink onClick={() => window.print()}>
                      <Printer className="me-1 inline size-3.5" /> طباعة التقرير
                    </RowLink>
                  )}
                  {may("admins.clusters.export") && (
                    <RowLink onClick={() => exportCluster(x)}>
                      <Download className="me-1 inline size-3.5" /> Excel
                    </RowLink>
                  )}
                </RowActions>
                <Locked perm="admins.clusters.export" />
              </Box>
              <Box title="الأرشيف" open={!!x.archived}>
                <p className="text-xs leading-6 text-white/60">المؤرشف يبقى في «التكتلات والمجموعات» بموسمه، ويخرج من عمل الموسم.</p>
                {!may("admins.clusters.archive") ? (
                  <Locked perm="admins.clusters.archive" />
                ) : x.archived ? (
                  <Button size="sm" variant="glass" onClick={() => archive(false)}>
                    <ArchiveRestore className="size-4" /> استعادته من الأرشيف
                  </Button>
                ) : (
                  <Button size="sm" variant="glass" onClick={() => archive(true)}>
                    <Archive className="size-4" /> أرشفة
                  </Button>
                )}
              </Box>
              <Box title="سجلّه" open={false}>
                <RecordHistory system="admins" refId={c.id} bare />
              </Box>
            </>
          )
        }
      />
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
  const mayAdd = useCan()("admins.clusters.add-outside-group");

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
      <Lead>{desk.deadlinePassed ? "لم تدخل تكتلاً حين شُكّلت التكتلات في المكتب: أضف كلاً منها إلى تكتل بتعديل استثنائي بسببه." : `ما دام تشكيل التكتلات مفتوحاً تدخل تكتلاً حين يُشكَّل في المكتب؛ وبعد الموعد النهائي ${dayLabel(desk.formationWindow.op.end, true)} تُضاف بتعديل استثنائي.`}</Lead>
      <ListTable head={["المجموعة", "الفرع", "الفئة", "الحجاج", "كانت في"]}>
        {desk.outside.length === 0 && <EmptyRow cols={5}>كل مجموعة مشكّلة في تكتل.</EmptyRow>}
        {desk.outside.map((g) => {
          const cat = categoryOfId(s, g.category);
          const can = mayAdd && desk.deadlinePassed && !!g.category && targets.length > 0;
          return (
            <tr key={g.number}>
              <TitleCell
                title={groupName(g.number)}
                sub={g.headName}
                actions={<RowActions>{can ? <RowLink onClick={() => setAdding(g)}>أضفها إلى تكتل</RowLink> : <span className="font-normal text-white/45">{!mayAdd ? "للاطلاع" : !g.category ? "بلا فئة بعد" : !desk.deadlinePassed ? "بعد الموعد النهائي" : "لا تكتل يقبلها"}</span>}</RowActions>}
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
  const hotels = useHotels();
  const user = useStaffUser()!;
  const toast = useToast();
  const [filter, setFilter] = useState<"pending" | "published">(desk.pendingProgrammes.length || !desk.programmes.some((x) => x.state?.approved) ? "pending" : "published");
  const [open, setOpen] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const published = desk.programmes.filter((x) => x.state?.approved);
  const list = filter === "pending" ? desk.pendingProgrammes : published;
  const sheet = desk.programmes.find((x) => x.cluster.slug === open);
  const may = useCan();

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
          const live = state?.approved ? { ...fieldsOf(c, hotels), ...state.approved.fields } : fieldsOf(c, hotels);
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
              <td className="p-3 align-top text-white/80">{pending ? `${diffFields(live, state!.pending!.fields, hotels).length} حقلاً` : state?.approved?.by}</td>
            </tr>
          );
        })}
      </ListTable>

      <Drawer
        open={!!sheet}
        onClose={() => setOpen(null)}
        title={sheet ? `برنامج ${sheet.cluster.name}` : ""}
        footer={
          sheet?.state?.pending && (may("admins.programmes.approve") || may("admins.programmes.return")) && (
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" disabled={!may("admins.programmes.approve")} onClick={() => decide(sheet.cluster.slug, sheet.cluster.name, "approved")}>
                <BadgeCheck className="size-4" /> اعتماد ونشر
              </Button>
              <Button variant="glass" disabled={!may("admins.programmes.return")} onClick={() => setRejecting(sheet.cluster.slug)}>
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
                  {diffFields(sheet.state.approved ? { ...fieldsOf(sheet.cluster, hotels), ...sheet.state.approved.fields } : fieldsOf(sheet.cluster, hotels), sheet.state.pending.fields, hotels).map((ch) => (
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

// ───────────────────────── The groups' public pages ─────────────────────────

const GROUP_REASONS = ["صورة لا تخص المجموعة أو موسمها", "صورة تظهر فيها وجوه حجاج دون إذنهم", "نبذة دعائية لا تصف المجموعة", "نص أو صورة غير لائقة"];

/**
 * A group's public page — its picture, its word and its gallery, written by its head or his assistant — carries
 * the administration's approval as the cluster's does: the holder sees what changed, the pictures themselves, and
 * approves it onto the group's card and window or sends it back with a reason.
 */
function GroupPages({ desk }: { desk: AdminsDesk }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [filter, setFilter] = useState<"pending" | "published">(desk.pendingGroupPages.length || !desk.groupPages.some((x) => x.state.approved) ? "pending" : "published");
  const [open, setOpen] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState(GROUP_REASONS[0]);
  const published = desk.groupPages.filter((x) => x.state.approved);
  const list = filter === "pending" ? desk.pendingGroupPages : published;
  const sheet = desk.groupPages.find((x) => x.no === open);
  const shown = sheet ? (sheet.state.pending?.fields ?? sheet.state.approved?.fields) : undefined;
  const may = useCan();

  const decide = (no: number, decision: "approved" | "rejected", why?: string) => {
    actions.decideGroupProfile(no, decision, user.name, why);
    logAdmins(user, "clusters", { action: decision === "approved" ? "اعتماد صفحة مجموعة ونشرها للحجاج" : "إعادة صفحة مجموعة إلى رئيسها", target: groupName(no), detail: why, ref: desk.groupPages.find((x) => x.no === no)?.clusterId });
    toast(decision === "approved" ? { title: "اعتُمدت الصفحة ونُشرت", body: `${groupName(no)} — يراها الحجاج الآن في «التكتلات والمجموعات».`, tone: "success", icon: "✅" } : { title: "أُعيدت إلى رئيس المجموعة", body: why, tone: "info", icon: "↩️" });
    setRejecting(null);
    setOpen(null);
  };

  return (
    <div className="space-y-4">
      <Title>صفحات المجموعات</Title>
      <Lead>حين يعدّل رئيس مجموعة أو معاونها صورتها أو نبذتها أو معرض صورها يصل التعديل هنا قبل أن يراه أحد.</Lead>
      <Filters
        label="صفحات المجموعات"
        value={filter}
        onChange={setFilter}
        items={[
          { key: "pending", label: "تنتظر اعتمادك", count: desk.pendingGroupPages.length },
          { key: "published", label: "المنشورة", count: published.length },
        ]}
      />
      <ListTable head={["المجموعة", "التكتل", filter === "pending" ? "أرسلها" : "اعتمدها", "التاريخ"]}>
        {list.length === 0 && <EmptyRow cols={4}>{filter === "pending" ? "لا تعديلات معلّقة." : "لا صفحات منشورة بعد."}</EmptyRow>}
        {list.map(({ no, clusterName, state }) => {
          const pending = filter === "pending" && state.pending;
          return (
            <tr key={no}>
              <TitleCell
                title={groupName(no)}
                onOpen={() => setOpen(no)}
                sub={pending && state.pending!.note ? `ملاحظته: ${state.pending!.note}` : undefined}
                actions={
                  <RowActions>
                    <RowLink onClick={() => setOpen(no)}>{pending ? "مراجعة" : "فتح"}</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top text-white/80">{clusterName || "—"}</td>
              <td className="p-3 align-top text-white/80">{pending ? state.pending!.by : state.approved?.approvedBy}</td>
              <td className="whitespace-nowrap p-3 align-top text-xs text-white/60">{fmtDateTime(pending ? state.pending!.at : (state.approved?.approvedAt ?? 0))}</td>
            </tr>
          );
        })}
      </ListTable>

      <Drawer
        open={!!sheet}
        onClose={() => setOpen(null)}
        title={sheet ? `صفحة ${groupName(sheet.no)}` : ""}
        footer={
          sheet?.state.pending && (may("admins.group-pages.approve") || may("admins.group-pages.return")) && (
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" disabled={!may("admins.group-pages.approve")} onClick={() => decide(sheet.no, "approved")}>
                <BadgeCheck className="size-4" /> اعتماد ونشر
              </Button>
              <Button variant="glass" disabled={!may("admins.group-pages.return")} onClick={() => setRejecting(sheet.no)}>
                <X className="size-4" /> إعادة مع السبب
              </Button>
            </div>
          )
        }
      >
        {sheet && shown && (
          <div className="space-y-4 text-sm">
            {sheet.clusterId && (
              <Link href={`/clusters/${sheet.clusterId}`} target="_blank" className="inline-flex items-center gap-1.5 font-bold text-gold hover:underline">
                <ExternalLink className="size-3.5" /> صفحة {sheet.clusterName} كما يراها الحاج
              </Link>
            )}
            {sheet.state.pending ? (
              <>
                <p className="text-xs text-white/65">
                  أرسلها {sheet.state.pending.by} — {fmtDateTime(sheet.state.pending.at)}
                </p>
                {sheet.state.pending.note && <p className="text-gold">ملاحظته: {sheet.state.pending.note}</p>}
                <ul className="space-y-2">
                  {diffGroupFields(sheet.state.approved?.fields ?? groupSeed(sheet.no), sheet.state.pending.fields).map((ch) => (
                    <li key={ch.key} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                      <p className="font-bold text-gold">{ch.label}</p>
                      <p className="mt-1 text-white/50 line-through">{ch.before || "—"}</p>
                      <p className="font-semibold text-white">{ch.after || "—"}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              sheet.state.approved && (
                <p className="text-white/75">
                  اعتمدها {sheet.state.approved.approvedBy} — {fmtDateTime(sheet.state.approved.approvedAt)}. كتبها {sheet.state.approved.by}.
                </p>
              )
            )}
            {/* The pictures themselves, as they would be published */}
            {shown.cover && (
              <div>
                <p className="mb-1 text-xs font-bold text-gold">صورة المجموعة</p>
                <div className="relative aspect-[16/7] overflow-hidden rounded-xl">
                  <CmsImage src={shown.cover} alt="" fill sizes="480px" className="object-cover" />
                </div>
              </div>
            )}
            {shown.about && <p className="leading-7 text-white/80">{shown.about}</p>}
            {shown.gallery.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-bold text-gold">معرض الصور ({shown.gallery.length})</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {shown.gallery.map((src, i) => (
                    <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden rounded-lg">
                      <CmsImage src={src} alt="" fill sizes="160px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal open={rejecting !== null} onClose={() => setRejecting(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {rejecting !== null && (
          <div>
            <p className="text-xs font-bold text-gold">إعادة الصفحة إلى رئيس المجموعة</p>
            <h3 className="mt-1 font-display text-xl font-bold">{groupName(rejecting)}</h3>
            <p className="mt-1 text-sm leading-7 text-white/70">يصل السبب إليه ليعدّل ويعيد الإرسال. الصفحة تبقى على نسختها المعتمدة.</p>
            <div className="mt-4 space-y-2">
              {GROUP_REASONS.map((r) => (
                <label key={r} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl p-3 text-sm font-semibold ring-1", reason === r ? "bg-gold/15 ring-gold/50" : "bg-white/5 ring-white/15")}>
                  <input type="radio" name="group-why" checked={reason === r} onChange={() => setReason(r)} className="accent-[#D9C89E]" /> {r}
                </label>
              ))}
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="سبب الإعادة" className={textareaClass} />
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="gold" disabled={reason.trim().length < 5} onClick={() => decide(rejecting, "rejected", reason.trim())}>
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
