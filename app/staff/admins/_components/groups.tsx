"use client";

import Link from "next/link";
import { AlertTriangle, BadgeCheck, CheckCircle2, CornerDownLeft, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { groupName, groupNameTaken, groupShort, suggestedGroupName } from "@/lib/groups";
import { useOperation, rangeLabel } from "@/lib/operations";
import { useSeason } from "@/lib/season-live";
import { actions, useStore, type ClusterInvite, type Seat, type SignedContract } from "@/lib/store";
import { uploadMedia } from "@/lib/cms/media";
import { cn, nowMs } from "@/lib/utils";
import { adminReceipt } from "@/app/administrator/_lib/admin";
import { nextGroupNumber } from "@/app/administrator/_lib/capacity";
import { DemoJump } from "@/components/app/operation-closed";
import { HEADS_POOL } from "@/app/administrator/_lib/cluster";
import { STATUS, fitSeats, useClusterRequests, usePicks, type ClusterRequest } from "@/app/administrator/_lib/formation";
import { DEFAULT_TIER, branchOf, categoryOf, categoryOfId, roleName, roleOf, seatsLabel, seatsOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { patchAdmin } from "../../_components/data";
import { Drawer, fmtDateTime, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { FilterSelect, InfoGrid, SearchBox } from "../../_components/ops-ui";
import { RecordHistory } from "../../_components/system";
import { AddButton, Box, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { GROUP_STATE, logAdmins, useAdminsDesk, type AdminsDesk, type GroupRow, type GroupState } from "../desk";
import { Filters, Help, Lead, TitleCell } from "./ui";

/** The shared input without its full width, for an input given its own */
const sizedInput = smallInputClass.replace("w-full", "");

/** The cluster a group is in: a request filed this season, or one of the season's directory */
function useClusterName() {
  const directory = useClusters();
  const requests = useClusterRequests();
  return (id?: string) => (id ? (requests.find((r) => r.cluster.id === id)?.cluster.name ?? directory.find((c) => c.slug === id)?.name ?? id) : undefined);
}

/** One line of the season's groups: a group on this device (with its request), or one of the season's records */
type Line = { key: string; number: number; head: string; branch: string; category?: string; pilgrims: number; capacity: number; cluster?: ClusterRequest; state: GroupState; x?: GroupRow; by?: string };
type View = "all" | "waiting" | "heads" | "approved" | "outside";

/**
 * «تشكيل المجموعات» — the season's groups as one list: those waiting for a decision, those back with their heads,
 * and every approved group with its head, branch, category, pilgrims and cluster. «تشكيل مجموعة» beside the
 * title forms a qualified head's group at the office (in the formation's dates); a group on this device opens in
 * a side sheet with its conditions, its decision and its history. The group has no team of its own: the head of
 * the cluster it enters fills its seats.
 */
export function GroupsTab() {
  const desk = useAdminsDesk();
  const clusterName = useClusterName();
  const [open, setOpen] = useState<number | null>(null);
  const [returning, setReturning] = useState<GroupRow | null>(null);
  const [forming, setForming] = useState(false);
  const decide = useDecision();
  const sheet = desk.groups.find((x) => x.g.number === open);

  return (
    <div className="space-y-5">
      <Title action={<AddButton onClick={() => setForming(true)}>تشكيل مجموعة</AddButton>}>مجموعات الموسم</Title>
      <Lead>يأتي رئيس المجموعة المؤهل إلى المكتب باسم مجموعته ويسدد رسمها، فتشكّلها بفئته. افتح أي مجموعة لترى شروطها وسجلّها.</Lead>
      <GroupsList desk={desk} onOpen={setOpen} onReturn={setReturning} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoriesBox />
        <Help>
          <p>لا يختار رئيس المجموعة سعتها: فئته تحددها الإدارة وتثبّتها عند تشكيل مجموعته أو اعتمادها، وهي فئة المجموعة. منها عدد حجاجها ومقاعد فريقها في مستوى التكتل الذي تدخله.</p>
          <p>تُشكَّل المجموعة في المكتب بحضور رئيسها وفريقها: اسمها وفئتها، وموجّهها ومعاونها، ورسمها، وعقدها الموقّع. وتدخل التكتل حين يُشكَّل في المكتب، وما بقي خارجه بعد الموعد النهائي تضيفه إلى تكتل بتعديل استثنائي من «التكتلات».</p>
          <p>طلب تشكيل قديم قُدّم على المنصة من قبل ينتظر قرارك هنا: اعتمده بفئة رئيسه، أو أعده إليه بما ينقصه.</p>
        </Help>
      </div>
      <RecordsBox system="admins" area="groups" title="سجل المجموعات" />

      <Drawer open={forming} onClose={() => setForming(false)} title="تشكيل مجموعة في المكتب" width="max-w-xl">
        <FormAtOffice desk={desk} onDone={() => setForming(false)} />
      </Drawer>
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet ? groupName(sheet.g.number) : ""}>
        {sheet && <GroupSheet x={sheet} clusterName={clusterName(sheet.g.clusterId)} onApprove={(cat) => decide.approve(sheet, cat)} onReturn={() => setReturning(sheet)} />}
      </Drawer>
      <Modal open={!!returning} onClose={() => setReturning(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {returning && (
          <ReturnForm
            key={returning.g.number}
            x={returning}
            onClose={() => setReturning(null)}
            onSend={(note) => {
              decide.send(returning, note);
              setReturning(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

// ───────────────────────── The season's groups ─────────────────────────

/**
 * Every group of the season in one table — waiting, back with its head, approved here or already in the
 * season's records — filtered by its state (with its count), category and branch.
 */
function GroupsList({ desk, onOpen, onReturn }: { desk: AdminsDesk; onOpen: (n: number) => void; onReturn: (x: GroupRow) => void }) {
  const s = useStructure();
  const cadre = useCadre();
  const [view, setView] = useState<View>(desk.waiting.length ? "waiting" : "all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  const [shown, setShown] = useState(40);
  const lines = useMemo<Line[]>(() => {
    const inCluster = new Map(desk.requests.flatMap((r) => r.groups.map((g) => [g.number, r] as const)));
    const device = desk.groups.map((x) => ({ key: `d-${x.g.number}`, number: x.g.number, head: x.row.name, branch: branchOf(x.row.id, cadre), category: x.category, pilgrims: 0, state: x.state, x, by: x.g.approvedBy }));
    const seeded = HEADS_POOL.filter((h) => !desk.approved.some((l) => l.g.number === h.group)).map((h) => ({ key: `s-${h.group}`, number: h.group, head: h.name, branch: branchOf(h.id, cadre), category: categoryOf(h.id, cadre), pilgrims: h.pilgrims, state: "approved" as GroupState, x: undefined, by: undefined }));
    return [...device, ...seeded]
      .map((g) => {
        const r = g.state === "approved" ? inCluster.get(g.number) : undefined;
        return { ...g, cluster: r, capacity: seatsOf(s, r?.cluster.tier ?? DEFAULT_TIER, g.category).pilgrims, pilgrims: r?.groups.find((y) => y.number === g.number)?.pilgrims ?? g.pilgrims };
      })
      .sort((a, b) => a.number - b.number);
  }, [desk.groups, desk.approved, desk.requests, cadre, s]);

  const inView = (g: Line, v: View) => (v === "all" ? true : v === "waiting" ? g.state === "waiting" : v === "heads" ? g.state === "unpaid" || g.state === "returned" : v === "approved" ? g.state === "approved" : g.state === "approved" && !g.cluster);
  const list = lines
    .filter((g) => (!category || g.category === category) && (!branch || g.branch === branch))
    .filter((g) => !q.trim() || [groupShort(g.number), g.head, g.cluster?.cluster.name ?? ""].some((t) => t.includes(q.trim())))
    .filter((g) => inView(g, view));
  const count = (v: View) => lines.filter((g) => inView(g, v)).length;

  return (
    <div className="space-y-4">
      <Filters
        label="حال المجموعات"
        value={view}
        onChange={setView}
        items={[
          { key: "all", label: "الكل", count: count("all") },
          { key: "waiting", label: "تنتظر قرارك", count: count("waiting") },
          { key: "heads", label: "عند رؤسائها", count: count("heads") },
          { key: "approved", label: "معتمدة", count: count("approved") },
          { key: "outside", label: "خارج التكتلات", count: count("outside") },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="المجموعة أو رئيسها أو تكتلها" label="بحث في المجموعات" />
        <FilterSelect label="الفئة" all="كل الفئات" value={category} onChange={setCategory} options={s.categories.map((c) => ({ value: c.id, label: `${c.name} (${lines.filter((g) => g.category === c.id).length})` }))} />
        <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
      </div>
      <ListTable head={["المجموعة", "رئيسها", "الفرع", "الفئة", "حجاجها", "التكتل", "الحالة"]} minWidth="52rem">
        {list.length === 0 && <EmptyRow cols={7}>لا مجموعة هنا.</EmptyRow>}
        {list.slice(0, shown).map((g) => (
          <tr key={g.key}>
            <TitleCell
              title={groupShort(g.number)}
              onOpen={g.x ? () => onOpen(g.number) : undefined}
              sub={
                g.x
                  ? g.state === "returned" && g.x.g.returned
                    ? `أعادها ${g.x.g.returned.by}: ${g.x.g.returned.note}`
                    : g.state === "unpaid"
                      ? `قُدّم ${fmtDateTime(g.x.g.requestedAt)} — لم يُسدَّد رسم التشكيل`
                      : g.by
                        ? `اعتمدها ${g.by}`
                        : undefined
                  : "من سجل الموسم"
              }
              actions={
                g.x && (
                  <RowActions>
                    <RowLink onClick={() => onOpen(g.number)}>{g.state === "waiting" ? "مراجعة واعتماد" : "فتح"}</RowLink>
                    {g.state === "waiting" && (
                      <RowLink danger onClick={() => onReturn(g.x!)}>
                        إعادة إلى رئيسها
                      </RowLink>
                    )}
                  </RowActions>
                )
              }
            />
            <td className="p-3 align-top">{g.head}</td>
            <td className="p-3 align-top text-white/80">{g.branch}</td>
            <td className="p-3 align-top">{categoryOfId(s, g.category)?.name ?? <span className="text-gold">—</span>}</td>
            <td className="p-3 align-top tabular-nums">
              {g.pilgrims} <span className="text-xs text-white/55">/ {g.capacity}</span>
            </td>
            <td className="p-3 align-top">
              {g.state !== "approved" ? (
                <span className="text-white/40">—</span>
              ) : g.cluster ? (
                <span>
                  {g.cluster.cluster.name} <span className="text-xs text-white/55">({STATUS[g.cluster.status].label})</span>
                </span>
              ) : (
                <span className="font-bold text-gold">خارج التكتلات</span>
              )}
            </td>
            <td className="p-3 align-top">
              <span className="flex flex-wrap gap-1">
                <Tag tone={GROUP_STATE[g.state].tone}>{GROUP_STATE[g.state].label}</Tag>
                {g.x && g.state === "waiting" && <Tag tone={g.x.complete ? "green" : "gold"}>{g.x.complete ? "مكتملة الشروط" : "ناقصة"}</Tag>}
              </span>
            </td>
          </tr>
        ))}
      </ListTable>
      {list.length > shown && (
        <Button size="sm" variant="glass" onClick={() => setShown(shown + 60)}>
          عرض المزيد ({list.length - shown})
        </Button>
      )}
    </div>
  );
}

// ───────────────────────── Forming a group at the office ─────────────────────────

/**
 * A qualified group head at the office, with his team: the holder picks him, writes the name he chose (one no
 * other group holds this season), confirms his category, seats the guide and the assistant its category gives (or,
 * with no assistant seat, a «معاون بعدد» if they bring one), takes the fee, and uploads the paper contract the head
 * and his team signed — and forms the group, approved at once, its number the next of the season. Its seats come
 * with it into the cluster it is formed in. Only in the formation's dates.
 */
function FormAtOffice({ desk, onDone }: { desk: AdminsDesk; onDone: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useSeason();
  const s = useStructure();
  const cadre = useCadre();
  const admins = useStore((x) => x.admins);
  const op = useOperation("group-formation");
  const [headId, setHeadId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [paid, setPaid] = useState(false);
  const [seated, setSeated] = useState<Record<number, string>>({});
  const [counted, setCounted] = useState("");
  const [contract, setContract] = useState<SignedContract | null>(null);
  const [signed, setSigned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const picks = usePicks(undefined);
  const head = desk.toForm.find((r) => r.id === headId);
  const number = head ? (head.profile.group?.number ?? nextGroupNumber(admins, head.id)) : 0;
  const bare = name.trim().replace(/^مجموعة\s+/, "");
  const problem = !bare ? "اكتب اسم المجموعة كما اختاره رئيسها" : bare.split(/\s+/).length > 2 ? "كلمة أو كلمتان" : groupNameTaken(bare, number) ? "تحمله مجموعة أخرى هذا الموسم" : null;
  const cat = category || (head ? categoryOf(head.id, cadre) : "") || "";
  // The seats its category gives, and who may sit in each: nobody already seated in another group, nor twice here
  const seats = cat ? fitSeats(s, DEFAULT_TIER, cat) : [];
  const elsewhere = new Set(Object.values(admins).flatMap((a) => [...(a.group?.seats ?? []).map((x) => x.who?.id), a.group?.countAssistant?.id]).filter((x): x is string => !!x));
  const free = (id: string, i?: number) => !elsewhere.has(id) && id !== headId && !Object.entries(seated).some(([j, v]) => v === id && Number(j) !== i) && counted !== id;
  const optionsFor = (seat: Seat, i: number) => {
    const list = seat.free ? [...picks("guideSeat"), ...picks("assistantSeat")] : picks(seat.kind === "guide" ? "guideSeat" : "assistantSeat");
    return list.filter((x, k, all) => !x.takenBy && all.findIndex((y) => y.id === x.id) === k && free(x.id, i));
  };
  const countable = picks("assistantPool").filter((x) => !x.takenBy && !!roleOf(s, x.role)?.multiplier && free(x.id));
  const seatsFull = seats.every((_, i) => !!seated[i]);
  const ready = !!head && !problem && !!cat && paid && seatsFull && !!contract && signed;

  const pick = (id: string) => {
    setHeadId(id);
    const r = desk.toForm.find((x) => x.id === id);
    const n = r ? (r.profile.group?.number ?? nextGroupNumber(admins, r.id)) : 0;
    setName(r ? (r.profile.group?.name ?? suggestedGroupName(n)) : "");
    setCategory(r ? (categoryOf(r.id, cadre) ?? "") : "");
    setPaid(false);
    setSeated({});
    setCounted("");
    setContract(null);
    setSigned(false);
  };

  // The signed contract, photographed or scanned, into the media library
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

  const form = () => {
    if (!head || !ready || !contract) return;
    const at = nowMs();
    if (categoryOf(head.id, cadre) !== cat) actions.setCadre("category", head.id, cat);
    const label = categoryOfId(s, cat)?.name ?? "";
    const n = seatsOf(s, DEFAULT_TIER, cat);
    const person = (id: string): ClusterInvite => {
      const x = [...picks("guideSeat"), ...picks("assistantSeat"), ...picks("assistantPool")].find((y) => y.id === id)!;
      return { id, name: x.name, at, status: "accepted" };
    };
    const team = seats.map((x, i) => ({ ...x, who: person(seated[i]) }));
    patchAdmin(
      head,
      { group: { number, name: bare, capacity: n.pilgrims, capacityTier: label, requestedAt: head.profile.group?.requestedAt ?? at, feePaidAt: at, approvedAt: at, approvedBy: user.name, seats: team, countAssistant: counted ? person(counted) : undefined, contract } },
      actions.upsertAdmin,
    );
    logAdmins(user, "groups", { action: "تشكيل مجموعة في المكتب", target: groupName(number), detail: `رئيسها ${head.name} — ${label}: ${n.pilgrims} حاجاً في الاقتصادي — فريقها: ${team.map((x) => x.who.name).join("، ") || "—"}${counted ? ` ومعاون بعدد ${person(counted).name}` : ""} — رسم ${season.fees.groupFormation} $ بإيصال ${adminReceipt(head.id, "G", number)} — العقد موقّع ومرفوع`, ref: String(number), important: true });
    toast({ title: `شُكّلت مجموعة ${bare}`, body: `${head.name} — ${label}: ${n.pilgrims} حاجاً في الاقتصادي. يراها في بوابة الإداريين الآن.`, tone: "success", icon: "🏛️" });
    setHeadId("");
    setName("");
    setCategory("");
    setPaid(false);
    setSeated({});
    setCounted("");
    setContract(null);
    setSigned(false);
    onDone();
  };

  return (
    <div className="space-y-4 text-sm">
      <p className="leading-7 text-white/70">في مدة تشكيل المجموعات ({rangeLabel(op.start, op.end)}). لا طلب له على المنصة: يرى مجموعته في بوابته فور تشكيلها، ثم حجاجها حين يلحقهم المكتب بها.</p>
      {!op.open ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 text-white/80 ring-1 ring-white/10">
          <span>تُشكَّل المجموعات في مدتها وحدها.</span>
          <DemoJump state={op} />
        </div>
      ) : desk.toForm.length === 0 ? (
        <p className="rounded-2xl bg-white/[.06] p-4 text-white/75 ring-1 ring-white/10">لا رئيس مجموعة ينتظر: كل رئيس مجموعة مؤهل له مجموعة. يظهر هنا من ينجح أو يجدد صفته.</p>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-white/80">رئيس المجموعة ({desk.toForm.length} بلا مجموعة)</span>
            <select value={headId} onChange={(e) => pick(e.target.value)} className={cn(smallInputClass, "[&_option]:text-ink")}>
              <option value="">اختر رئيس المجموعة الذي راجع المكتب...</option>
              {desk.toForm.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {branchOf(r.id, cadre)}
                  {categoryOf(r.id, cadre) ? ` — ${categoryOfId(s, categoryOf(r.id, cadre))?.name}` : ""}
                </option>
              ))}
            </select>
          </label>
          {head && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-white/80">اسم المجموعة كما اختاره رئيسها</span>
                <span className="flex items-center gap-2">
                  <span className="text-white/70">مجموعة</span>
                  <input value={bare} onChange={(e) => setName(e.target.value)} className={cn(sizedInput, "min-w-0 flex-1")} aria-label="اسم المجموعة" />
                </span>
                <span className={cn("mt-1 block text-xs", problem ? "text-gold" : "text-green-light")}>{problem ?? "متاح هذا الموسم"}</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-white/80">فئته (فئة المجموعة)</span>
                <select value={cat} onChange={(e) => setCategory(e.target.value)} className={cn(smallInputClass, "[&_option]:text-ink")}>
                  <option value="">اختر الفئة...</option>
                  {s.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {seatsOf(s, DEFAULT_TIER, c.id).pilgrims} حاجاً في الاقتصادي
                    </option>
                  ))}
                </select>
              </label>
              {cat && (
                <fieldset className="space-y-2 rounded-2xl bg-white/[.04] p-3 ring-1 ring-white/10">
                  <legend className="px-1 text-xs font-bold text-white/80">فريق المجموعة — {seatsLabel(seatsOf(s, DEFAULT_TIER, cat))}</legend>
                  {seats.length === 0 && <p className="text-xs text-white/60">لا مقاعد لهذه الفئة في الاقتصادي.</p>}
                  {seats.map((seat, i) => (
                    <label key={i} className="block">
                      <span className="mb-1 block text-xs text-white/70">{seat.free ? "مقعد حر (موجّه أو معاون)" : seat.kind === "guide" ? "الموجّه الديني" : "المعاون"}</span>
                      <select value={seated[i] ?? ""} onChange={(e) => setSeated((x) => ({ ...x, [i]: e.target.value }))} aria-label={seat.kind === "guide" ? "الموجّه الديني" : "المعاون"} className={cn(smallInputClass, "[&_option]:text-ink")}>
                        <option value="">اختر من المؤهلين الحاضرين...</option>
                        {[...(seated[i] ? optionsFor(seat, i).concat([...picks("guideSeat"), ...picks("assistantSeat")].filter((y) => y.id === seated[i]).slice(0, 1)) : optionsFor(seat, i))]
                          .filter((x, k, all) => all.findIndex((y) => y.id === x.id) === k)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} — {roleName(x.role, s)} — {x.branch}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                  {seatsOf(s, DEFAULT_TIER, cat).assistants === 0 && (
                    <label className="block">
                      <span className="mb-1 block text-xs text-white/70">معاون بعدد (اختياري) — يضيف حجاجاً إلى تكتلها</span>
                      <select value={counted} onChange={(e) => setCounted(e.target.value)} aria-label="معاون بعدد" className={cn(smallInputClass, "[&_option]:text-ink")}>
                        <option value="">بلا معاون بعدد</option>
                        {[...countable, ...(counted ? picks("assistantPool").filter((y) => y.id === counted) : [])]
                          .filter((x, k, all) => all.findIndex((y) => y.id === x.id) === k)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name} — {x.branch}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </fieldset>
              )}
              <label className="flex items-center gap-2 text-white/85">
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-4 accent-[#D9C89E]" />
                سدّد رسم التشكيل {season.fees.groupFormation} $ في المكتب — الإيصال {adminReceipt(head.id, "G", number)}
              </label>
              <div className="space-y-2 rounded-2xl bg-white/[.04] p-3 ring-1 ring-white/10">
                <p className="text-xs font-bold text-white/80">عقد المجموعة</p>
                <p className="text-xs leading-6 text-white/60">يوقّعه رئيس المجموعة وكل فريقها ورقياً في المكتب. صوّره أو امسحه وارفعه هنا: يراه كل من في المجموعة في «العقود».</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
                  <Upload className="size-4" /> {uploading ? "جارٍ الرفع…" : contract ? "استبدال العقد" : "رفع صورة العقد الموقّع"}
                  <input type="file" accept="image/*,application/pdf" hidden aria-label="عقد المجموعة" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
                </label>
                {contract && <p className="text-xs text-green-light">رُفع: {contract.name}</p>}
                <label className="flex items-center gap-2 text-white/85">
                  <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} className="size-4 accent-[#D9C89E]" />
                  وقّع العقدَ رئيسُ المجموعة وكلُّ فريقها
                </label>
              </div>
              {!ready && (
                <p className="text-xs text-gold">
                  {!seatsFull ? "اختر من يشغل كل مقعد. " : ""}
                  {!paid ? "سدّد الرسم. " : ""}
                  {!contract ? "ارفع العقد. " : ""}
                  {!signed ? "أكّد توقيع الجميع." : ""}
                </p>
              )}
              <Button variant="gold" disabled={!ready} onClick={form}>
                <BadgeCheck className="size-4" /> تشكيل مجموعة {bare || "…"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────── Categories ─────────────────────────

/** The groups' categories under the default tier, as «القوائم المرجعية» left them — for reference, closed */
function CategoriesBox() {
  const s = useStructure();
  const tier = s.tiers.find((x) => x.id === DEFAULT_TIER) ?? s.tiers[0];
  return (
    <Box title={`فئات المجموعات وأعدادها (${tier?.name ?? ""})`} open={false}>
      <ul className="space-y-1.5">
        {s.categories.map((c) => {
          const n = seatsOf(s, tier?.id, c.id);
          return (
            <li key={c.id} className="flex flex-wrap justify-between gap-2">
              <span>
                <b className="text-white">{c.name}</b>{" "}
                <span className="text-xs text-white/55">
                  — وزنها {c.weight} — {seatsLabel(n)}
                </span>
              </span>
              <b className="tabular-nums text-gold">{n.pilgrims} حاجاً</b>
            </li>
          );
        })}
      </ul>
      <Link href="/staff/admins/manage/reference?s=categories" className="text-sm font-bold text-gold hover:underline">
        تعديلها في «القوائم المرجعية» ←
      </Link>
    </Box>
  );
}

// ───────────────────────── One group ─────────────────────────

/** The holder's one decision on a request: approve it, or send it back to its head with what to fix */
function useDecision() {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  return {
    /** Approval confirms the head's category, the group's, and reads its pilgrims in the default tier */
    approve(x: GroupRow, category: string) {
      const name = categoryOfId(s, category)?.name ?? category;
      const n = seatsOf(s, DEFAULT_TIER, category);
      if (category !== x.category) {
        actions.setCadre("category", x.row.id, category);
        logAdmins(user, "applicants", { action: "تحديد فئة رئيس مجموعة", target: x.row.name, before: categoryOfId(s, x.category)?.name ?? "—", after: name, detail: `عند اعتماد ${groupName(x.g.number)}`, ref: x.row.id });
      }
      patchAdmin(x.row, { group: { ...x.g, capacity: n.pilgrims, capacityTier: name, approvedAt: Date.now(), approvedBy: user.name, returned: undefined } }, actions.upsertAdmin);
      logAdmins(user, "groups", { action: "اعتماد مجموعة", target: groupName(x.g.number), after: `رئيسها ${x.row.name}`, detail: `${name}: ${n.pilgrims} حاجاً في الاقتصادي — ${seatsLabel(n)}`, ref: String(x.g.number) });
      toast({ title: `اعتُمدت ${groupName(x.g.number)} — ${name}`, body: "تُلحق بها الحجاج بعقودهم، وتدخل تكتلاً حين يُشكَّل في المكتب، ومقاعد فريقها تُجلسها في المكتب.", tone: "success", icon: "🏅" });
    },
    send(x: GroupRow, note: string) {
      patchAdmin(x.row, { group: { ...x.g, returned: { at: Date.now(), by: user.name, note } } }, actions.upsertAdmin);
      logAdmins(user, "groups", { action: "إعادة طلب تشكيل مجموعة إلى رئيسه", target: `${groupName(x.g.number)} — ${x.row.name}`, detail: note, ref: String(x.g.number) });
      toast({ title: `أُعيد طلب ${groupName(x.g.number)}`, body: "تصل الملاحظة إلى رئيسها في بوابته، فيصلح ويعيد الإرسال.", tone: "info", icon: "↩️" });
    },
  };
}

function Checks({ x }: { x: GroupRow }) {
  return (
    <ul className="grid gap-1.5 text-sm">
      {x.checks.map((c) => (
        <li key={c.label} className="flex items-center gap-2">
          {c.ok ? <CheckCircle2 className="size-4 shrink-0 text-green-light" /> : <AlertTriangle className="size-4 shrink-0 text-gold" />}
          <span className={c.ok ? "text-white/90" : "font-bold text-gold"}>{c.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Decision({ x, onApprove, onReturn }: { x: GroupRow; onApprove: (category: string) => void; onReturn: () => void }) {
  const s = useStructure();
  const [category, setCategory] = useState(x.category ?? s.categories[0]?.id ?? "");
  return (
    <div className="space-y-3 rounded-2xl bg-white/[.06] p-4 ring-1 ring-gold/30">
      <p className="font-bold text-gold">القرار</p>
      <label className="flex flex-wrap items-center gap-2 text-sm text-white/80">
        فئة رئيسها
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={`فئة رئيس ${groupName(x.g.number)}`} className={cn(sizedInput, "h-9 w-40 [&>option]:text-ink")}>
          {s.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="gold" disabled={!x.complete || !category} onClick={() => onApprove(category)}>
          <BadgeCheck className="size-4" /> اعتماد المجموعة
        </Button>
        <Button size="sm" variant="glass" onClick={onReturn}>
          <CornerDownLeft className="size-4" /> إعادة إلى رئيسها
        </Button>
      </div>
      {!x.complete && <p className="text-xs font-bold text-gold">لا تُعتمد قبل اكتمال شروطها: أعدها إلى رئيسها بما ينقصها.</p>}
    </div>
  );
}

/** One group whole: its request, its conditions, the decision on it and its history */
function GroupSheet({ x, clusterName, onApprove, onReturn }: { x: GroupRow; clusterName?: string; onApprove: (category: string) => void; onReturn: () => void }) {
  const g = x.g;
  const s = useStructure();
  const n = seatsOf(s, DEFAULT_TIER, x.category);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={GROUP_STATE[x.state].tone}>{GROUP_STATE[x.state].label}</Tag>
        {clusterName && <Tag tone="green">{clusterName}</Tag>}
      </div>
      {x.state === "waiting" && <Decision x={x} onApprove={onApprove} onReturn={onReturn} />}
      <InfoGrid
        rows={[
          ["رئيسها", x.row.name],
          ["الفئة", x.category ? `${categoryOfId(s, x.category)?.name} — ${n.pilgrims} حاجاً في الاقتصادي، ${seatsLabel(n)}` : "تحددها عند الاعتماد"],
          ["قُدّم الطلب", fmtDateTime(g.requestedAt)],
          ["رسم التشكيل", g.feePaidAt ? `${fmtDateTime(g.feePaidAt)} — ${adminReceipt(x.row.id, "G", g.number)}` : "لم يُسدَّد"],
          ["الاعتماد", g.approvedAt ? `${g.approvedBy} — ${fmtDateTime(g.approvedAt)}` : ""],
        ]}
      />
      <Checks x={x} />
      {g.returned && (
        <p className="rounded-2xl bg-maroon/25 p-3 text-sm leading-7 text-white ring-1 ring-maroon/50">
          أعادها {g.returned.by} — {fmtDateTime(g.returned.at)}: {g.returned.note}
        </p>
      )}
      <RecordHistory system="admins" refId={String(g.number)} />
    </div>
  );
}

/** What the head has to fix, in words he can act on: it reaches him in his portal */
function ReturnForm({ x, onClose, onSend }: { x: GroupRow; onClose: () => void; onSend: (note: string) => void }) {
  const missing = x.checks.filter((c) => !c.ok).map((c) => c.label);
  const [note, setNote] = useState(missing.length ? `ينقص الطلب: ${missing.join("، ")}.` : "");
  return (
    <div>
      <p className="text-xs font-bold text-gold">إعادة الطلب إلى رئيسه</p>
      <h3 className="mt-1 font-display text-xl font-bold">
        {groupName(x.g.number)} — {x.row.name}
      </h3>
      <p className="mt-1 text-sm leading-7 text-white/70">يرى ملاحظتك في بوابته، فيصلح الطلب ويعيد إرساله، ويعود إليك. لا يُعاد إليه الرسم المسدَّد.</p>
      <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder="ما الذي يصلحه؟" aria-label="ملاحظة الإعادة" />
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={note.trim().length < 5} onClick={() => onSend(note.trim())}>
          <CornerDownLeft className="size-4" /> إعادة مع الملاحظة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
