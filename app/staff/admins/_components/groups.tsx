"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, CheckCircle2, ClipboardList, CornerDownLeft, Layers, Receipt, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { groupName, groupShort } from "@/lib/groups";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { adminReceipt } from "@/app/administrator/_lib/admin";
import { HEADS_POOL } from "@/app/administrator/_lib/cluster";
import { STATUS, useClusterRequests } from "@/app/administrator/_lib/formation";
import { DEFAULT_TIER, branchOf, categoryOf, categoryOfId, seatsLabel, seatsOf, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { patchAdmin } from "../../_components/data";
import { Drawer, Empty, fmtDateTime, Panel, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";

/** The shared input without its full width, for an input given its own */
const sizedInput = smallInputClass.replace("w-full", "");
import { Chip, FilterSelect, InfoGrid, SearchBox } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { GROUP_STATE, logAdmins, useAdminsDesk, type AdminsDesk, type GroupRow } from "../desk";

/** The cluster a group is in: a request filed this season, or one of the season's directory */
function useClusterName() {
  const directory = useClusters();
  const requests = useClusterRequests();
  return (id?: string) => (id ? (requests.find((r) => r.cluster.id === id)?.cluster.name ?? directory.find((c) => c.slug === id)?.name ?? id) : undefined);
}

/**
 * The groups, from the head's request to the approved group in its cluster. A group head asks for his group
 * and pays its fee; its number is the next of the season. The request comes here with its conditions
 * checked, and the holder decides once: he approves it with its head's category (the group's: its pilgrims
 * and its seats under the cluster's tier, «القوائم المرجعية»), or sends it back to its head with what to fix.
 * The group has no team of its own: the head of the cluster it enters fills its seats.
 */
export function GroupsTab() {
  const desk = useAdminsDesk();
  const clusterName = useClusterName();
  const [open, setOpen] = useState<number | null>(null);
  const [returning, setReturning] = useState<GroupRow | null>(null);
  const decide = useDecision();
  const sheet = desk.groups.find((x) => x.g.number === open);
  const pending = desk.groups.filter((x) => x.state === "unpaid" || x.state === "returned");

  return (
    <div className="space-y-6">
      <CategoriesPanel />

      <Panel icon={<ClipboardList />} title="طلبات تنتظر قرارك" action={<Chip tone={desk.waiting.length ? "gold" : "green"}>{desk.waiting.length}</Chip>}>
        {desk.waiting.length === 0 ? (
          <Empty icon={<CheckCircle2 />} title="لا طلب ينتظر قرارك" text="يصل الطلب إلى هنا حين يسدد رئيس المجموعة رسم التشكيل، ومعه شروطه محسوبة." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {desk.waiting.map((x, i) => (
              <RequestCard key={x.g.number} x={x} delay={i * 0.05} onApprove={(cat) => decide.approve(x, cat)} onReturn={() => setReturning(x)} onOpen={() => setOpen(x.g.number)} />
            ))}
          </div>
        )}
      </Panel>

      {pending.length > 0 && (
        <Panel icon={<Send />} title="عند رؤسائها" action={<Chip>{pending.length}</Chip>}>
          <ul className="space-y-2">
            {pending.map((x) => (
              <li key={x.g.number}>
                <button type="button" onClick={() => setOpen(x.g.number)} className="flex w-full flex-wrap items-center gap-3 rounded-2xl bg-white/[.06] p-3 text-right ring-1 ring-white/10 transition hover:ring-gold/50">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white">
                      {groupName(x.g.number)} — {x.row.name}
                    </span>
                    <span className="block text-xs leading-5 text-white/65">{x.g.returned ? `أعادها ${x.g.returned.by}: ${x.g.returned.note}` : `قُدّم ${fmtDateTime(x.g.requestedAt)} — لم يُسدَّد رسم التشكيل بعد`}</span>
                  </span>
                  <Chip tone={GROUP_STATE[x.state].tone}>{GROUP_STATE[x.state].label}</Chip>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <SeasonGroups desk={desk} onOpen={setOpen} />

      <SystemRecords system="admins" area="groups" title="سجل المجموعات" />

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
 * Every approved group of the season — those approved here and those the season already had — with its head,
 * branch, category, pilgrims (by its category under its cluster's tier) and its cluster, filtered by category,
 * branch and whether a cluster holds it. A group approved here opens its sheet.
 */
function SeasonGroups({ desk, onOpen }: { desk: AdminsDesk; onOpen: (n: number) => void }) {
  const s = useStructure();
  const cadre = useCadre();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [branch, setBranch] = useState("");
  const [held, setHeld] = useState("");
  const [shown, setShown] = useState(40);
  const rows = useMemo(() => {
    const inCluster = new Map(desk.requests.flatMap((r) => r.groups.map((g) => [g.number, r] as const)));
    const live = desk.approved.map((x) => ({ number: x.g.number, head: x.row.name, branch: branchOf(x.row.id, cadre), category: x.category, pilgrims: 0, device: true, by: x.g.approvedBy }));
    const seeded = HEADS_POOL.filter((h) => !live.some((l) => l.number === h.group)).map((h) => ({ number: h.group, head: h.name, branch: branchOf(h.id, cadre), category: categoryOf(h.id, cadre), pilgrims: h.pilgrims, device: false, by: undefined as string | undefined }));
    return [...live, ...seeded].map((g) => {
      const r = inCluster.get(g.number);
      return { ...g, cluster: r, capacity: seatsOf(s, r?.cluster.tier ?? DEFAULT_TIER, g.category).pilgrims, pilgrims: r?.groups.find((x) => x.number === g.number)?.pilgrims ?? g.pilgrims };
    });
  }, [desk.approved, desk.requests, cadre, s]);
  const list = rows
    .filter((g) => (!category || g.category === category) && (!branch || g.branch === branch) && (!held || (held === "in" ? !!g.cluster : !g.cluster)))
    .filter((g) => !q.trim() || [groupShort(g.number), g.head, g.cluster?.cluster.name ?? ""].some((x) => x.includes(q.trim())));
  const byCategory = s.categories.map((c) => ({ c, n: rows.filter((g) => g.category === c.id).length }));
  return (
    <div id="approved" className="scroll-mt-24">
      <Panel
        icon={<BadgeCheck />}
        title="مجموعات الموسم المعتمدة"
        action={
          <span className="flex flex-wrap gap-2">
            <Chip tone="green">{rows.length}</Chip>
            {byCategory.map(({ c, n }) => (
              <Chip key={c.id}>
                {c.name}: {n}
              </Chip>
            ))}
            {desk.outside.length > 0 && <Chip tone="gold">{desk.outside.length} خارج التكتلات</Chip>}
          </span>
        }
        bodyClass="-mx-5 md:-mx-6"
      >
        <div className="grid gap-2 px-5 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
          <SearchBox value={q} onChange={setQ} placeholder="المجموعة أو رئيسها أو تكتلها" label="بحث في المجموعات" />
          <FilterSelect label="الفئة" all="كل الفئات" value={category} onChange={setCategory} options={s.categories.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
          <FilterSelect label="التكتل" all="في تكتل وخارجه" value={held} onChange={setHeld} options={[{ value: "in", label: "في طلب تكتل" }, { value: "out", label: "خارج التكتلات" }]} />
        </div>
        <div className="mt-3 overflow-x-auto px-5 md:px-6">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-right text-xs text-gold">
                {["المجموعة", "رئيسها", "الفرع", "الفئة", "حجاجها", "التكتل", "اعتمدها"].map((h) => (
                  <th key={h} className="pb-2 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {list.slice(0, shown).map((g) => (
                <tr key={g.number} className="text-white">
                  <td className="py-2.5">
                    {g.device ? (
                      <button type="button" onClick={() => onOpen(g.number)} className="font-bold text-gold hover:underline">
                        {groupShort(g.number)}
                      </button>
                    ) : (
                      <span className="font-bold">{groupShort(g.number)}</span>
                    )}
                  </td>
                  <td className="py-2.5">{g.head}</td>
                  <td className="py-2.5 text-white/80">{g.branch}</td>
                  <td className="py-2.5">{categoryOfId(s, g.category)?.name ?? <span className="text-gold">—</span>}</td>
                  <td className="py-2.5 tabular-nums">
                    {g.pilgrims} <span className="text-xs text-white/55">/ {g.capacity}</span>
                  </td>
                  <td className="py-2.5">{g.cluster ? <span>{g.cluster.cluster.name} <span className="text-xs text-white/55">({STATUS[g.cluster.status].label})</span></span> : <span className="font-bold text-gold">خارج التكتلات</span>}</td>
                  <td className="py-2.5 text-xs text-white/60">{g.by ?? "سجل الموسم"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="py-6 text-center text-sm text-white/60">لا مجموعة بهذا البحث.</p>}
          {list.length > shown && (
            <Button size="sm" variant="glass" className="mt-3" onClick={() => setShown(shown + 60)}>
              عرض المزيد ({list.length - shown})
            </Button>
          )}
        </div>
        <p className="mt-3 px-5 text-xs leading-6 text-white/55 md:px-6">تدخل المجموعة التكتلَ بدعوة يقبلها رئيسها في مدة تشكيل التكتلات. وما بقي خارجها بعد الموعد النهائي تضيفه إلى تكتل بتعديل استثنائي من «طلبات التكتلات».</p>
      </Panel>
    </div>
  );
}

// ───────────────────────── Categories ─────────────────────────

/** The category's name, as the structure has it */
function useCategoryName() {
  const s = useStructure();
  return (id?: string) => categoryOfId(s, id)?.name;
}

/**
 * The groups' categories under the default tier, as «القوائم المرجعية» left them: a head's category is the
 * administration's, given on approval, and gives his group its pilgrims and its seats in the cluster's tier
 */
function CategoriesPanel() {
  const s = useStructure();
  const tier = s.tiers.find((x) => x.id === DEFAULT_TIER) ?? s.tiers[0];
  return (
    <Panel icon={<Layers />} title="فئات المجموعات" action={<Link href="/staff/admins/manage/reference" className="text-sm font-bold text-gold hover:underline">تعديلها في «القوائم المرجعية»</Link>}>
      <p className="mb-3 text-sm leading-7 text-white/70">
        لا يختار رئيس المجموعة سعتها: فئته (الأولى… الرابعة) تحددها الإدارة وتثبّتها عند اعتماد مجموعته، وهي فئة المجموعة. منها عدد حجاجها ومقاعد فريقها في مستوى التكتل الذي تدخله — هنا في المستوى {tier?.name}. ومجموع فئات مجموعات التكتل يحدد عدد منسقيه وموجّهاته.
      </p>
      <ol className="grid gap-2 md:grid-cols-4">
        {s.categories.map((c) => {
          const n = seatsOf(s, tier?.id, c.id);
          return (
            <li key={c.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <span className="block font-bold text-white">{c.name}</span>
              <span className="block text-xs text-white/60">وزنها {c.weight} — {seatsLabel(n)}</span>
              <span className="mt-1 block font-display text-2xl font-bold tabular-nums text-gold">
                {n.pilgrims} <span className="text-xs font-normal text-white/60">حاجاً</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

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
      toast({ title: `اعتُمدت ${groupName(x.g.number)} — ${name}`, body: "تُلحق بها الحجاج بعقودهم، وتدخل تكتلاً بدعوة يقبلها رئيسها، ومقاعد فريقها يملؤها رئيس التكتل.", tone: "success", icon: "🏅" });
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
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-white/70">
        فئة رئيسها
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={`فئة رئيس ${groupName(x.g.number)}`} className={cn(sizedInput, "h-9 w-36 [&>option]:text-ink")}>
          {s.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <Button size="sm" variant="gold" disabled={!x.complete || !category} onClick={() => onApprove(category)}>
        <BadgeCheck className="size-4" /> اعتماد المجموعة
      </Button>
      <Button size="sm" variant="glass" onClick={onReturn}>
        <CornerDownLeft className="size-4" /> إعادة إلى رئيسها
      </Button>
      {!x.complete && <span className="text-xs font-bold text-gold">لا تُعتمد قبل اكتمال شروطها: أعدها إلى رئيسها بما ينقصها.</span>}
    </div>
  );
}

function RequestCard({ x, delay, onApprove, onReturn, onOpen }: { x: GroupRow; delay: number; onApprove: (category: string) => void; onReturn: () => void; onOpen: () => void }) {
  const categoryName = useCategoryName();
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="space-y-4 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold text-white">{groupName(x.g.number)}</h3>
          <p className="text-sm text-white/85">
            رئيسها: {x.row.name}
            {x.category && <> · {categoryName(x.category)}</>}
          </p>
        </div>
        <Chip tone={x.complete ? "green" : "gold"}>{x.complete ? "مكتملة الشروط" : "ناقصة"}</Chip>
      </div>
      <Checks x={x} />
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
        <span>قُدّم {fmtDateTime(x.g.requestedAt)}</span>
        {x.g.feePaidAt && (
          <span className="flex items-center gap-1">
            <Receipt className="size-3" /> {adminReceipt(x.row.id, "G", x.g.number)}
          </span>
        )}
        <button type="button" onClick={onOpen} className="font-bold text-gold hover:underline">
          ورقتها وسجلّها
        </button>
      </p>
      <Decision x={x} onApprove={onApprove} onReturn={onReturn} />
    </motion.div>
  );
}

/** One group whole: its request, its conditions, its team, the decision on it and its history */
function GroupSheet({ x, clusterName, onApprove, onReturn }: { x: GroupRow; clusterName?: string; onApprove: (category: string) => void; onReturn: () => void }) {
  const g = x.g;
  const s = useStructure();
  const n = seatsOf(s, DEFAULT_TIER, x.category);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={GROUP_STATE[x.state].tone}>{GROUP_STATE[x.state].label}</Chip>
        {clusterName && <Chip tone="green">{clusterName}</Chip>}
      </div>
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
      {x.state === "waiting" && <Decision x={x} onApprove={onApprove} onReturn={onReturn} />}
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
