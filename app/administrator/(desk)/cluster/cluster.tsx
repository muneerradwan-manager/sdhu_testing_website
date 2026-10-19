"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Calculator, ClipboardList, FileSignature, Search, Send, Shuffle, UserCheck, UserMinus, UsersRound, X, type LucideIcon } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { groupName } from "@/lib/groups";
import { useStore, type ClusterInvite, type GroupInvite, type Seat } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";
import { ContractView, seedContract } from "../../_components/contract-view";
import { logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { acceptedGroups, clusterViewOf } from "../../_lib/cluster";
import { coordinatorsLabel } from "../../_lib/coordinators";
import { distribute, fits, loadOf } from "../../_lib/distribution";
import {
  ACCOUNTANT_TITLE,
  cadreOf,
  fitSeats,
  invite,
  placedIn,
  roleOfPerson,
  useClusterRequests,
  useGroupPool,
  usePicks,
  writeCluster,
  type Cluster,
  type ClusterRequest,
  type PickPerson,
} from "../../_lib/formation";
import { categoryOfId, roleName, roleOf, seatsLabel, seatsOf, useCadre, useStructure } from "../../_lib/structure";
import { StandingCard } from "../../_components/standing";
import { AdminShell, LockedCard, SectionTitle } from "../../_components/ui";
import { AdminRequests } from "../requests/requests";
import { PlanStep } from "./plan";

/**
 * A cluster is formed at the office, not here: its head and everyone in it come in person, the employee enters
 * it — its groups with their heads, guides and assistants, the coordinators, female guides, assistant and
 * accountant its head chose, their distribution on the groups — takes its fee, and uploads the paper contract they
 * all signed (app/staff/admins/_components/clusters.tsx). It is approved as it is formed, and its head finds it in
 * «إدارة التكتل» at once: its groups, its team, its contract and its operational plan, in tabs (RequestDesk).
 */
export function AdminCluster({ part }: { part: "formation" | "manage" }) {
  const admin = useAdmin()!;
  const p = admin.profile;
  const requests = useClusterRequests();
  const view = clusterViewOf(p, admin.name);
  const theirs = view ? requests.find((r) => r.cluster.id === view.id) : undefined;

  if (part === "formation") {
    return (
      <AdminShell title="تشكيل التكتلات" subtitle="يُشكَّل التكتل في المكتب بحضور رئيسه وكل من فيه.">
        <LockedCard title="يُشكَّل التكتل في المكتب" text="لا يُشكَّل التكتل على المنصة: يحضر رئيس التكتل ورؤساء مجموعاته وكادره إلى المكتب، فيُدخله الموظف بمجموعاته وأماكن كادره، ويُدفع رسمه هناك، ويوقّع الجميع عقده الورقي. ويظهر لرئيسه في «إدارة التكتل» فور إنشائه." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }
  if (!view?.isHead || !theirs || theirs.status !== "approved") {
    return (
      <AdminShell title="إدارة التكتل" subtitle="التكتل كما شُكّل في المكتب: مجموعاته وحجاجها، وكادره، وعقده، وخطته التشغيلية — لرئيسه.">
        <LockedCard title="لا تكتل تديره بعد" text="يُشكَّل التكتل في المكتب بحضور رئيسه وكل من فيه، ويظهر هنا لرئيسه فور إنشائه." href="/administrator/dashboard" cta="ملفي" />
      </AdminShell>
    );
  }
  return (
    <AdminShell title={theirs.cluster.name} subtitle="تكتلك كما شُكّل في المكتب: مجموعاته وحجاجها، وكادره وتوزيعه على المجموعات، وعقده الموقّع، وخطته التشغيلية.">
      <ManageCluster req={theirs} />
    </AdminShell>
  );
}

type DeskTab = "groups" | "team" | "contract" | "plan";

function RequestDesk({ req, header }: { req: ClusterRequest; header: ReactNode }) {
  // «?tab=plan» opens the operational plan (the desk renders on the client only, behind the administrator's gate)
  const [tab, setTab] = useState<DeskTab>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "plan" ? "plan" : "groups"));
  const [opened, setOpened] = useState<number | null>(null);
  const tabs: { key: DeskTab; label: string; icon: LucideIcon; badge?: string }[] = [
    { key: "groups", label: "المجموعات", icon: UsersRound, badge: String(req.groups.length) },
    { key: "team", label: "كادر التكتل", icon: UserCheck, badge: String(req.cadre) },
    { key: "contract", label: "العقد", icon: FileSignature },
    { key: "plan", label: "الخطة التشغيلية", icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      {header}
      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-2xl border border-gold/30 bg-white p-1" role="tablist" aria-label={req.cluster.name}>
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} type="button" onClick={() => { setTab(t.key); setOpened(null); }} className={cn("relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", tab === t.key ? "text-white" : "text-ink-soft hover:text-ink")}>
              {tab === t.key && <motion.span layoutId="cluster-tab" className="absolute inset-0 rounded-xl bg-green-dark" transition={{ type: "spring", damping: 28, stiffness: 320 }} />}
              <t.icon className="relative size-4" />
              <span className="relative">{t.label}</span>
              {t.badge && <span className={cn("relative rounded-full px-1.5 text-[11px] tabular-nums", tab === t.key ? "bg-white/20" : "bg-sand")}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${tab}-${opened ?? ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
          {tab === "groups" &&
            (opened !== null && req.groups.some((g) => g.number === opened) ? <GroupDesk req={req} number={opened} onBack={() => setOpened(null)} /> : <GroupsStep req={req} editable={false} onOpen={setOpened} />)}
          {tab === "team" && (
            <div className="space-y-6">
              <StaffStep req={req} editable={false} sortable />
              <AccountantStep req={req} editable={false} />
            </div>
          )}
          {tab === "contract" && <div className="max-w-md"><ContractCard c={req.cluster} people={req.cadre} /></div>}
          {tab === "plan" && <PlanStep req={req} editable />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The paper contract everyone in the cluster signed at the office: every member sees it (here, and in «العقود») */
export function ContractCard({ c, people }: { c: Cluster; people?: number }) {
  return (
    <ContractView
      kind="cluster"
      title={`عقد ${c.name}`}
      contract={c.contract ?? (c.status === "approved" ? seedContract("cluster", `عقد ${c.name}`) : undefined)}
      signers={`رئيس التكتل وكل من فيه${people ? ` (${people} شخصاً)` : ""}`}
      empty="لم يُرفع العقد بعد. يوقّعه في المكتب رئيس التكتل وكل من فيه، ويرفع الموظف صورته فتظهر هنا."
    />
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

/** One person in his place: his name and role (placed at the office, so nothing to answer) */
function InviteRow({ x, note, editable, onRemove }: { req?: ClusterRequest; x: ClusterInvite; note?: string; editable: boolean; onRemove?: () => void }) {
  const admins = useStore((s) => s.admins);
  const cadre = useCadre();
  const s = useStructure();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{x.name}</span>
        <span className="block text-[11px] text-hint">{note ?? roleName(roleOfPerson(x.id, admins, cadre), s)}</span>
      </span>
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
    write({ ...c, groups, seats, sorting }, `سحب ${groupName(num)} من ${c.name}`);
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-bold", weightOk ? "border-green-light/40 bg-green-light/10 text-green" : "border-maroon/40 bg-maroon/5 text-maroon")}>
        <span>مجموع الفئات الحالي: {req.weight}</span>
        <span>
          المطلوب بين {n.min} و{n.max}
        </span>
      </div>
      {!onOpen && <StepNote title="المجموعات" desc="هنا تدعو المجموعات وحدها: كل مجموعة تدخل برئيسها وحجاجها، ويقبل رئيسها الدعوة أو يعتذر. فئتها فئة رئيسها كما حددتها الإدارة، ومنها عدد حجاجها ومقاعد فريقها في مستوى تكتلك. أما فريقها وبقية الإداريين — موجّهو المجموعات ومعاونوها، ومعاون التكتل، والمنسقون والموجّهات — فتدعوهم في الخطوة التالية «الإداريون»." />}
      {list.length === 0 && <p className="rounded-2xl bg-sand p-4 text-sm text-hint">لا مجموعات بعد.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((g) => (
          <GroupCard key={g.number} req={req} g={g} own={g.id === req.headId} editable={editable} seatsHere={!!onOpen} onWithdraw={() => withdraw(g.number)} onOpen={onOpen && req.groups.some((x) => x.number === g.number) ? () => onOpen(g.number) : undefined} />
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
            {found.slice(0, 12).map((g) => {
              // A group with more pilgrims than its category takes under this tier cannot come in
              const cap = c.tier && g.category ? seatsOf(s, c.tier, g.category).pilgrims : undefined;
              const big = cap !== undefined && g.pilgrims > cap;
              return (
              <li key={g.number} className="flex items-center gap-3 rounded-xl bg-sand/70 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{groupName(g.number)}</span>
                  <span className="block text-xs text-ink-soft">
                    {g.headName} — {g.branch} — {categoryOfId(s, g.category)?.name ?? "لا فئة لرئيسها بعد"} — {g.pilgrims} حاجاً {g.takenBy && <b className="text-maroon">— في {g.takenBy}</b>}
                    {big && <b className="text-maroon"> — أكبر من سعة فئتها في هذا المستوى ({cap})</b>}
                  </span>
                </span>
                <Button size="sm" variant="outline" disabled={!!g.takenBy || !g.category || g.headId === admin.id || big} onClick={() => add(g)}>
                  <Send className="size-3.5" /> ادعُ
                </Button>
              </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

/**
 * A group in its cluster: its head, its category and pilgrims, and its team. While the request is filled its
 * seats are only summed up here (`seatsHere` false) — they are filled in «الإداريون» with the rest of the team.
 */
function GroupCard({ req, g, own, editable, onWithdraw, onOpen, seatsHere = true }: { req: ClusterRequest; g: GroupInvite; own: boolean; editable: boolean; onWithdraw: () => void; onOpen?: () => void; seatsHere?: boolean }) {
  const s = useStructure();
  const c = req.cluster;
  const cat = categoryOfId(s, g.category);
  const n = seatsOf(s, c.tier, g.category);
  const seats = c.seats[g.number] ?? [];
  const filled = seats.filter((x) => x.who?.status === "accepted").length;

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
        {seatsHere ? (
          <GroupSeats req={req} g={g} editable={editable} />
        ) : (
          <p className="rounded-xl bg-sand/70 px-3 py-2 text-xs leading-6 text-ink-soft">
            <span className="font-bold">مقاعد فريقها: {seatsLabel(n)}</span>
            {seats.length > 0 && <span> — {filled} من {seats.length} قبلوا</span>}
            <span className="block text-hint">{g.status === "accepted" ? "تدعو أصحابها في خطوة «الإداريون»." : "تُملأ في خطوة «الإداريون» بعد أن يقبل رئيسها."}</span>
          </p>
        )}
        {g.status === "accepted" && <SharedTeam c={c} number={g.number} />}
      </div>
    </Card>
  );
}

/** A group's seats — its guides and its assistants, by its category under the tier — each filled by an invitation */
function GroupSeats({ req, g, editable }: { req: ClusterRequest; g: GroupInvite; editable: boolean }) {
  const s = useStructure();
  const toast = useToast();
  const write = useWrite(req);
  const picks = usePicks(req);
  const c = req.cluster;
  const n = seatsOf(s, c.tier, g.category);
  const seats = c.seats[g.number] ?? [];
  const exclude = new Set([...placedIn(c), req.headId]);
  const setSeat = (i: number, seat: Seat, action: string, who?: string) => write({ ...c, seats: { ...c.seats, [g.number]: seats.map((x, j) => (j === i ? seat : x)) } }, action, who, groupName(g.number));
  return (
    <>
        <p className="text-xs font-bold text-hint">مقاعد فريقها: {seatsLabel(n)}</p>
        {g.status !== "accepted" ? (
          <p className="rounded-xl bg-sand/70 px-3 py-2 text-xs text-hint">تُملأ مقاعدها بعد أن يقبل رئيسها.</p>
        ) : (
          seats.map((seat, i) => (
            <div key={i} className="rounded-xl border border-gold/25 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-ink-soft">{seat.free ? `مقعد حر — ${seat.kind === "guide" ? "موجّه المجموعة" : "معاون المجموعة"}` : seat.kind === "guide" ? "موجّه المجموعة (موجّه أو مرشد)" : "معاون المجموعة"}</span>
                {seat.free && !seat.who && editable && (
                  <span className="flex gap-1">
                    {(["guide", "assistant"] as const).map((k) => (
                      <button key={k} type="button" onClick={() => setSeat(i, { ...seat, kind: k }, `مقعد حر في ${groupName(g.number)}: ${k === "guide" ? "موجّه" : "معاون"}`)} className={cn("rounded-lg px-2 py-1 font-bold", seat.kind === k ? "bg-green-dark text-white" : "bg-sand")}>
                        {k === "guide" ? "موجّه" : "معاون"}
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
                  placeholder={seat.kind === "guide" ? "ادعُ موجّهاً للمجموعة (موجّه أو مرشد)" : "ادعُ معاوناً للمجموعة"}
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
    </>
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
      <AdminRequests fixed={number} embedded />
    </div>
  );
}

/**
 * Who of the cluster's shared team works in a group: they are not its seats — they are picked once for the
 * whole cluster in «الإداريون» and distributed there — so a group's card only shows them
 */
function SharedTeam({ c, number }: { c: Cluster; number: number }) {
  const coordinator = c.coordinators.find((x) => x.status === "accepted" && x.id === c.sorting[number]);
  const guide = c.femaleGuides.find((x) => x.status === "accepted" && x.id === c.guideSorting?.[number]);
  return (
    <p className="rounded-xl bg-green-dark/5 px-3 py-2 text-xs leading-6 text-ink-soft">
      <span className="font-bold text-green-dark">من فريق التكتل المشترك: </span>
      منسقها <b className="text-ink">{coordinator?.name ?? "لم يوزَّع بعد"}</b>
      {(c.femaleGuides.length > 0 || guide) && (
        <>
          {"، "}وموجّهتها <b className="text-ink">{guide?.name ?? "لم توزَّع بعد"}</b>
        </>
      )}
      <span className="block text-hint">يُختاران ويوزَّعان في خطوة «الإداريون».</span>
    </p>
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
      <SectionTitle icon={UserCheck} action={<Badge tone={req.checks.find((x) => x.key === "assistants")?.ok ? "green" : "gold"}>{c.assistants.filter((x) => x.status === "accepted" && !multiplier(x.id)).length} من {req.needs.assistants}</Badge>}>
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
  const guides = c.femaleGuides.filter((x) => x.status === "accepted");
  const groups = Object.values(c.groups).sort((a, b) => Number(b.id === req.headId) - Number(a.id === req.headId));
  return (
    <div className="space-y-6">
      {editable && (
        <StepNote
          title="الإداريون: فريق التكتل كله"
          desc={`بعد المجموعات برؤسائها تدعو هنا بقية الإداريين، كلاً إلى مكانه، ويقبل كلٌّ دعوته أو يعتذر من حسابه: موجّه كل مجموعة ومعاونها في مقاعد فئتها (يعمل كلٌّ في مجموعته وحدها)، ثم معاون التكتل، ثم المنسقون التقنيون والموجّهات والمرشدات — فريق مشترك تختاره مرة للتكتل كله وتوزّعه على المجموعات: منسق لكل ${n.perCoordinator} وحدات، وموجّهة أو مرشدة لكل ${n.perGuide}، بمجموع الفئات (${req.weight}).`}
        />
      )}
      <Card className="md:p-6">
        <SectionTitle icon={UsersRound}>موجّهو المجموعات ومعاونوها</SectionTitle>
        <p className="mt-1 text-sm leading-7 text-ink-soft">لكل مجموعة مقاعد فريقها بفئتها في هذا المستوى: «موجّه المجموعة» من الموجّهين أو المرشدين، و«معاون المجموعة» من المعاونين، والمقعد الحر لأحدهما.</p>
        {groups.length === 0 ? (
          <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm text-hint">ادعُ المجموعات أولاً في خطوة «المجموعات».</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {groups.map((g) => (
              <div key={g.number} className="space-y-2 rounded-2xl border border-gold/30 p-3">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold text-green-dark">{groupName(g.number)}</span>
                  <span className="text-xs text-ink-soft">رئيسها {g.id === req.headId ? `${g.name} (مجموعتك)` : g.name} — {categoryOfId(s, g.category)?.name ?? "—"}</span>
                </p>
                <GroupSeats req={req} g={g} editable={editable} />
              </div>
            ))}
          </div>
        )}
      </Card>
      <AssistantsStep req={req} editable={editable} />
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
            <InviteRow key={x.id} req={req} x={x} editable={editable} onRemove={() => write({ ...c, femaleGuides: c.femaleGuides.filter((m) => m.id !== x.id), guideSorting: Object.fromEntries(Object.entries(c.guideSorting ?? {}).filter(([, who]) => who !== x.id)) }, `سحب دعوة ${x.name}`, x.name)} />
          ))}
          {editable && <PersonPicker people={picks("guidePool")} exclude={exclude} placeholder="ادعُ موجّهة أو مرشدة" full={live(c.femaleGuides) >= n.femaleGuides ? (n.femaleGuides ? `اكتمل العدد المسموح (${n.femaleGuides}).` : "لا موجّهات في هذا المستوى لهذا المجموع.") : undefined} onPick={(x) => write({ ...c, femaleGuides: [...c.femaleGuides, invite(x.id, x.name)] }, "دعوة موجّهة للتكتل", x.name)} />}
        </Card>
      </div>
      <Distribution req={req} sortable={sortable} people={coords} field="sorting" quota={n.perCoordinator} title="توزيع المنسقين على المجموعات" one="منسق" note="يعمل كل منسق في المجموعات التي وُزّع عليها وحدها: يرى حجاجها حين يلحقهم المكتب بعقودهم، ويأخذ ملفاتهم الصحية." />
      {(n.femaleGuides > 0 || c.femaleGuides.length > 0) && (
        <Distribution req={req} sortable={sortable} people={guides} field="guideSorting" quota={n.perGuide} title="توزيع الموجّهات والمرشدات على المجموعات" one="موجّهة" note="توجّه كل موجّهة أو مرشدة حاجّات المجموعات التي وُزّعت عليها، وتراهنّ في «حجاج مجموعاتي»." />
      )}
    </div>
  );
}

/**
 * Distributing the coordinators, or the female guides and murshidas, on the cluster's groups: each group one of
 * them, each of them groups up to his quota of units (a group weighs its category: الأولى 1 … الرابعة 4) and no
 * more. A choice that would take someone over his quota is not offered; «توزيع تلقائي» spreads them within it.
 * The cluster's head changes it himself, no request: every change asks him first — who leaves the group, who
 * takes it, and where each stands against his quota — and goes to his activity log, from whom to whom.
 */
function Distribution({ req, sortable, people, field, quota, title, one, note }: { req: ClusterRequest; sortable: boolean; people: ClusterInvite[]; field: "sorting" | "guideSorting"; quota: number; title: string; one: string; note: string }) {
  const write = useWrite(req);
  const c = req.cluster;
  const map = c[field] ?? {};
  const units = req.groups.map((g) => ({ number: g.number, units: g.units }));
  const mine = (num: number) => people.find((x) => x.id === map[num]);
  const toast = useToast();
  const [ask, setAsk] = useState<{ num: number; id: string } | "auto" | null>(null);
  const nameOf = (id?: string) => people.find((x) => x.id === id)?.name;
  const set = (num: number, id: string) => {
    const from = nameOf(map[num]) ?? `دون ${one}`;
    const to = nameOf(id) ?? `دون ${one}`;
    const next = { ...map };
    if (id) next[num] = id;
    else delete next[num];
    write({ ...c, [field]: next }, `تغيير ${one} ${groupName(num)}`, groupName(num), `من ${from} إلى ${to}`);
    toast({ title: `${groupName(num)}: ${to}`, body: `كان ${from}. سُجّل التغيير في «سجل نشاطي».`, tone: "success", icon: "🔁" });
  };
  const auto = () => {
    const { map: next, left } = distribute(units, people.map((x) => x.id), quota);
    const changed = req.groups.filter((g) => next[g.number] !== map[g.number]).map((g) => `${groupName(g.number)}: من ${nameOf(map[g.number]) ?? `دون ${one}`} إلى ${nameOf(next[g.number]) ?? `دون ${one}`}`);
    write({ ...c, [field]: next }, `${title}: توزيع تلقائي ضمن حدود الوحدات`, undefined, [changed.join(" — ") || "لم يتغير شيء", left.length ? `بقيت ${left.length} بلا ${one}: لا تتسع لها الحدود` : ""].filter(Boolean).join(". "));
    toast({ title: "وُزّعوا تلقائياً ضمن الحدود", body: `${changed.length} ${changed.length === 1 ? "مجموعة تغيّرت" : "مجموعات تغيّرت"}. سُجّل التوزيع في «سجل نشاطي».`, tone: "success", icon: "🔁" });
  };
  // What the confirmation says: the group, who leaves it, who takes it, and each one's load against the quota
  const pending = ask && ask !== "auto" ? { g: req.groups.find((x) => x.number === ask.num)!, from: map[ask.num], to: ask.id } : null;
  const loadAfter = (id: string) => {
    const next = { ...map };
    if (pending?.to) next[pending.g.number] = pending.to;
    else if (pending) delete next[pending.g.number];
    return loadOf(units, next, id);
  };
  const over = people.filter((x) => loadOf(units, map, x.id) > quota);
  const bare = req.groups.filter((g) => !mine(g.number));
  return (
    <Card className="md:p-6">
      <SectionTitle
        icon={Shuffle}
        action={
          sortable && people.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setAsk("auto")}>
              <Shuffle className="size-3.5" /> توزيع تلقائي ضمن الحدود
            </Button>
          ) : undefined
        }
      >
        {title}
      </SectionTitle>
      <p className="mt-1 text-sm leading-7 text-ink-soft">
        {note} حدّ كلٍّ {quota} وحدات في هذا المستوى، والوحدة فئة المجموعة: الأولى 1، الثانية 2، الثالثة 3، الرابعة 4.
      </p>
      {people.length === 0 ? (
        <p className="mt-3 rounded-xl bg-sand px-3 py-2 text-sm text-hint">يُوزَّعون على المجموعات بعد أن يقبلوا دعواتهم.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {people.map((x) => {
            const load = loadOf(units, map, x.id);
            return (
              <span key={x.id} className={cn("rounded-full px-3 py-1 text-xs font-bold", load > quota ? "bg-maroon text-white" : load === quota ? "bg-green-dark text-white" : "bg-sand text-ink")}>
                {x.name}: {load} من {quota} وحدات
              </span>
            );
          })}
        </div>
      )}
      {over.length > 0 && <p className="mt-2 rounded-xl bg-maroon/5 px-3 py-2 text-xs font-bold text-maroon">يتجاوز حدّه: {over.map((x) => x.name).join("، ")}. انقل عنه مجموعة إلى غيره.</p>}
      {people.length > 0 && bare.length > 0 && <p className="mt-2 rounded-xl bg-gold/15 px-3 py-2 text-xs font-bold text-ink">بلا {one}: {bare.map((g) => groupName(g.number)).join("، ")}.</p>}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {req.groups.map((g) => {
          const unit = { number: g.number, units: g.units };
          return (
            <li key={g.number} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{groupName(g.number)}</span>
                <span className="block text-xs text-hint">
                  {g.categoryName}: {g.units} {g.units === 1 ? "وحدة" : g.units === 2 ? "وحدتان" : "وحدات"}
                </span>
              </span>
              <select value={mine(g.number)?.id ?? ""} disabled={!sortable} onChange={(e) => e.target.value !== (map[g.number] ?? "") && setAsk({ num: g.number, id: e.target.value })} aria-label={`${one} ${groupName(g.number)}`} className="h-9 max-w-[55%] rounded-lg border-2 border-gold/40 bg-white px-2 text-xs font-bold disabled:opacity-80">
                <option value="">— دون {one} —</option>
                {people.map((x) => {
                  const ok = fits(units, map, x.id, unit, quota);
                  return (
                    <option key={x.id} value={x.id} disabled={!ok}>
                      {x.name} ({loadOf(units, map, x.id)} من {quota}){ok ? "" : " — يتجاوز حدّه"}
                    </option>
                  );
                })}
              </select>
            </li>
          );
        })}
      </ul>
      <Modal open={!!ask} onClose={() => setAsk(null)} className="max-w-md">
        {ask === "auto" ? (
          <div>
            <p className="font-display text-2xl font-bold text-green-dark">إعادة التوزيع تلقائياً؟</p>
            <p className="mt-2 leading-7 text-ink-soft">هل تريد فعلاً أن توزّع المنصة {people.length} {one === "منسق" ? "منسقين" : "موجّهات"} على مجموعات التكتل كلها ضمن حدّ كلٍّ ({quota} وحدات)؟ يتغيّر التوزيع الحالي، ويُسجَّل في «سجل نشاطي».</p>
          </div>
        ) : pending ? (
          <div>
            <p className="font-display text-2xl font-bold text-green-dark">تأكيد تغيير {one === "منسق" ? "المنسق" : "الموجّهة"}</p>
            <p className="mt-2 leading-7 text-ink-soft">
              هل تريد فعلاً {pending.to ? <>أن {one === "منسق" ? "يكون" : "تكون"} <b className="text-ink">{nameOf(pending.to)}</b> {one === "منسق" ? "منسق" : "موجّهة"} <b className="text-ink">{groupName(pending.g.number)}</b></> : <>ترك <b className="text-ink">{groupName(pending.g.number)}</b> دون {one}</>}
              {pending.from ? <> بدل <b className="text-ink">{nameOf(pending.from)}</b></> : null}؟
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[pending.to, pending.from].filter((x): x is string => !!x).map((id) => (
                <li key={id} className="flex items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <span className="font-bold">{nameOf(id)}</span>
                  <span className="tabular-nums text-ink-soft">
                    {loadOf(units, map, id)} ← {loadAfter(id)} من {quota} وحدات
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-hint">يُسجَّل التغيير في «سجل نشاطي» بمن كان ومن صار، وتتابعه الإدارة.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (ask === "auto") auto();
              else if (ask) set(ask.num, ask.id);
              setAsk(null);
            }}
          >
            موافق
          </Button>
          <Button variant="outline" onClick={() => setAsk(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

// ───────────────────────── The accountant ─────────────────────────

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
      <p className="text-sm leading-7 text-ink-soft">صفة ثانوية يعطيها رئيس التكتل في المكتب لأحد كوادر المجموعات أو التكتل (عدا الموجّهات والمرشدات). يسجّل مصروفات التكتل المالية.</p>
      {c.accountant && <InviteRow req={req} x={c.accountant} editable={editable} onRemove={() => write({ ...c, accountant: undefined }, `سحب دعوة ${c.accountant!.name} ${ACCOUNTANT_TITLE}`, c.accountant!.name)} />}
      {editable && (!c.accountant || c.accountant.status === "declined") && (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {people.length === 0 && <li className="text-xs text-hint">يظهر هنا كادر التكتل بعد أن يقبلوا.</li>}
          {people.map((id) => (
            <li key={id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-sand">
              <span className="min-w-0 flex-1 truncate">
                {names.get(id)} <span className="text-xs text-hint">— {roleName(roleOfPerson(id, admins, cadre), s)}</span>
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

// ───────────────────────── The approved cluster ─────────────────────────

function ManageCluster({ req }: { req: ClusterRequest }) {
  const s = useStructure();
  const c = req.cluster;
  const header = (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-gold/30 bg-white px-4 py-3 text-sm">
        <Badge tone="green">
          <BadgeCheck className="size-3.5" /> شُكّل في المكتب — {c.decision?.by}
        </Badge>
        <span>{s.tiers.find((t) => t.id === c.tier)?.name}</span>
        <span className="text-ink-soft">
          <b className="font-display text-lg text-green-dark">{req.groups.length}</b> مجموعات — <b className="font-display text-lg text-green-dark">{formatNumber(req.pilgrims)}</b> حاجاً بفئاتها
        </span>
        {c.feePaidAt && <span className="text-ink-soft">رسم التكتل مدفوع في المكتب</span>}
      </div>
      <p className="rounded-2xl bg-sand px-4 py-2 text-xs leading-6 text-ink-soft">أي تعديل على مجموعات التكتل أو كادره يكون في المكتب: يُدخله الموظف بحضورك. أما توزيع المنسقين والموجّهات على المجموعات فتغيّره أنت في «كادر التكتل»، ضمن حدّ كلٍّ منهم، بعد تأكيدك، ويُسجَّل كل تغيير في «سجل نشاطي».</p>
      <StandingCard scope="cluster" name={c.name} />
    </>
  );
  return <RequestDesk req={req} header={header} />;
}

export { acceptedGroups };
