"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Building, Layers, Pencil, Plus, RotateCcw, Tags, Trash2, UserCog, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber, nowMs } from "@/lib/utils";
import { DEMO_ADMINS } from "@/app/administrator/_lib/admin";
import { useClusterRequests } from "@/app/administrator/_lib/formation";
import { HEADS_POOL, ROSTER } from "@/app/administrator/_lib/people";
import {
  BEHAVIORS,
  DEFAULT_BRANCHES,
  DEFAULT_COMPOSITION,
  DEFAULT_LABELS,
  DEFAULT_ROLES,
  DEFAULT_TIERS,
  LEVEL_LABEL,
  branchOf,
  branchesOf,
  categoryOf,
  roleName,
  seasonalOf,
  seasonalText,
  seatsOf,
  useCadre,
  useStructure,
  type Behavior,
  type Branch,
  type Category,
  type CategoryRule,
  type Composition,
  type RoleDef,
  type RoleLabel,
  type RoleLevel,
  type Structure,
  type Tier,
} from "@/app/administrator/_lib/structure";
import { useAdminRows } from "../../_components/data";
import { Drawer, Panel, Tabs, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";

/** The shared input without its full width, for an input given its own */
const sizedInput = smallInputClass.replace("w-full", "");
import { Chip, FilterSelect, SearchBox } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { logAdmins } from "../desk";

type Section = "roles" | "categories" | "branches" | "labels" | "people";

/**
 * The administration's reference lists («القوائم المرجعية» of قسم شؤون المجموعات والتكتلات), in the order
 * they are set up: the roles and what each does in a cluster, the tiers with their categories' numbers and
 * their composition, the branches, the ready seasonal labels — then each person's seasonal role, category
 * and branches. Everything here is added, edited, deactivated and deleted by the holder of «إدارة
 * الإداريين»; a list in use cannot lose what is in use. Every change is in the tab's record.
 */
export function ReferenceTab() {
  const s = useStructure();
  const [section, setSection] = useState<Section>("roles");
  return (
    <div className="space-y-6">
      <Tabs
        id="admin-reference"
        value={section}
        onChange={setSection}
        tabs={[
          { value: "roles", label: "الصفات", count: s.roles.length },
          { value: "categories", label: "الفئات والأعداد", count: s.tiers.length },
          { value: "branches", label: "الفروع", count: s.branches.length },
          { value: "labels", label: "التسميات الموسمية", count: s.labels.length },
          { value: "people", label: "صفات الأشخاص وفئاتهم" },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
          {section === "roles" && <Roles />}
          {section === "categories" && <Categories />}
          {section === "branches" && <Branches />}
          {section === "labels" && <Labels />}
          {section === "people" && <People />}
        </motion.div>
      </AnimatePresence>
      <SystemRecords system="admins" area="reference" title="سجل القوائم المرجعية" />
    </div>
  );
}

/** Who holds a role now: an application, the season's records, or a seasonal grant */
function useRoleUse() {
  const admins = useStore((s) => s.admins);
  const cadre = useCadre();
  return useMemo(() => {
    const count = new Map<string, number>();
    const add = (k?: string) => k && count.set(k, (count.get(k) ?? 0) + 1);
    for (const a of Object.values(admins)) add(a.positions[0]);
    for (const c of ROSTER) if (!admins[c.id]) add(c.roleKey);
    count.set("group-head", (count.get("group-head") ?? 0) + HEADS_POOL.length);
    const ids = new Set([...Object.keys(admins), ...ROSTER.map((c) => c.id), ...HEADS_POOL.map((h) => h.id), ...Object.keys(cadre.seasonal)]);
    for (const id of ids) add(seasonalOf(id, cadre)?.role);
    return count;
  }, [admins, cadre]);
}

const Btn = ({ onClick, label, children, disabled, danger }: { onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; danger?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-white/70 disabled:opacity-30", danger ? "hover:bg-maroon/40" : "hover:bg-white/10")}>
    {children}
  </button>
);

// ───────────────────────── Roles ─────────────────────────

function Roles() {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const edited = useStore((x) => x.adminRules.roles) !== undefined;
  const use = useRoleUse();
  const [editing, setEditing] = useState<RoleDef | "new" | null>(null);
  const save = (roles: RoleDef[], action: string, target: string, detail?: string) => {
    actions.setAdminRules({ roles });
    logAdmins(user, "reference", { action, target, detail, important: true, ref: "roles" });
  };
  const move = (i: number, d: number) => {
    const next = [...s.roles];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next, "إعادة ترتيب الصفات", next[i + d].name);
  };
  const remove = (r: RoleDef) => {
    if (use.get(r.key)) return toast({ title: `لا تُحذف صفة «${r.name}»`, body: `يحملها ${use.get(r.key)} الآن (صفة أساسية أو موسمية). عطّلها بدلاً من ذلك.`, tone: "info", icon: "🔒" });
    if (s.roles.some((x) => x.examAs === r.key)) return toast({ title: `لا تُحذف صفة «${r.name}»`, body: "صفات أخرى تُعامل كـها في الامتحان والشروط.", tone: "info", icon: "🔒" });
    save(
      s.roles.filter((x) => x.key !== r.key),
      "حذف صفة",
      r.name,
    );
    toast({ title: `حُذفت صفة «${r.name}»`, tone: "info", icon: "🗑️" });
  };
  return (
    <Panel
      icon={<UsersRound />}
      title="الصفات"
      action={
        <span className="flex flex-wrap gap-2">
          {edited && (
            <Button size="sm" variant="ghost" className="text-white" onClick={() => { actions.setAdminRules({ roles: undefined }); logAdmins(user, "reference", { action: "إعادة الصفات إلى الأصل", target: `${DEFAULT_ROLES.length} صفات`, important: true, ref: "roles" }); }}>
              <RotateCcw className="size-4" /> إلى الأصل
            </Button>
          )}
          <Button size="sm" variant="gold" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> صفة جديدة
          </Button>
        </span>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">
        كل صفة بمستواها (تكتل، مجموعة، مشترك) وسلوكها في التكتل: أي مقعد تشغل، ومن أي قائمة مرشّحين تُختار، وهل تقود تكتلاً أو مجموعة، وهل تمنح شارة الإرشاد، وهل لصاحبها فئة. السلوكيات مستقلة، فتُضبط بحرية. لا تُحذف صفة يحملها أحد: تُعطَّل، فلا تُعرض لتعيين جديد وتبقى صالحة لمن يحملها.
      </p>
      <ol className="space-y-2">
        {s.roles.map((r, i) => (
          <li key={r.key} className={cn("rounded-2xl p-3 ring-1", r.active ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/30")}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                  {r.name}
                  <Chip>{LEVEL_LABEL[r.level].split(" ")[0]}</Chip>
                  {r.core && <Chip tone="gold">أساسية أصلية</Chip>}
                  {!r.active && <Chip tone="maroon">معطّلة</Chip>}
                  {!r.applied && <Chip tone="gold">تمنحها الإدارة — لا يُتقدَّم إليها</Chip>}
                  {r.examAs && <Chip>تُعامل كـ{roleName(r.examAs, s)} في الامتحان والشروط</Chip>}
                  {r.multiplier ? <Chip tone="green">مضاعف حجاج ×{r.multiplier}</Chip> : null}
                  <span className="text-xs font-normal text-white/55">يحملها {formatNumber(use.get(r.key) ?? 0)}</span>
                </p>
                <p className="mt-1 text-xs leading-6 text-white/65">{r.desc}</p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {BEHAVIORS.filter((b) => r[b.key]).map((b) => (
                    <Chip key={b.key} tone="green">
                      {b.label}
                    </Chip>
                  ))}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                <Btn onClick={() => move(i, -1)} disabled={i === 0} label="إلى الأعلى">
                  <ArrowUp className="size-4" />
                </Btn>
                <Btn onClick={() => move(i, 1)} disabled={i === s.roles.length - 1} label="إلى الأسفل">
                  <ArrowDown className="size-4" />
                </Btn>
                <Btn onClick={() => setEditing(r)} label={`تعديل ${r.name}`}>
                  <Pencil className="size-4" />
                </Btn>
                <Button size="sm" variant={r.active ? "ghost" : "primary"} className={r.active ? "text-white hover:bg-maroon/40" : ""} onClick={() => save(s.roles.map((x) => (x.key === r.key ? { ...x, active: !x.active } : x)), r.active ? "تعطيل صفة" : "تفعيل صفة", r.name)}>
                  {r.active ? "تعطيل" : "تفعيل"}
                </Button>
                <Btn onClick={() => remove(r)} label={`حذف ${r.name}`} danger>
                  <Trash2 className="size-4" />
                </Btn>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "صفة جديدة" : editing ? `تعديل «${editing.name}»` : ""}>
        {editing && (
          <RoleForm
            role={editing === "new" ? undefined : editing}
            s={s}
            onSave={(r) => {
              const exists = s.roles.some((x) => x.key === r.key);
              save(exists ? s.roles.map((x) => (x.key === r.key ? r : x)) : [...s.roles, r], exists ? "تعديل صفة" : "إضافة صفة", r.name, BEHAVIORS.filter((b) => r[b.key]).map((b) => b.label).join("، "));
              toast({ title: exists ? `حُفظت «${r.name}»` : `أُضيفت صفة «${r.name}»`, tone: "success", icon: "💾" });
              setEditing(null);
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </Drawer>
    </Panel>
  );
}

function RoleForm({ role, s, onSave, onClose }: { role?: RoleDef; s: Structure; onSave: (r: RoleDef) => void; onClose: () => void }) {
  const [r, setR] = useState<RoleDef>(role ?? { key: "", name: "", level: "shared", desc: "", active: true, applied: true });
  const set = (patch: Partial<RoleDef>) => setR({ ...r, ...patch });
  const taken = s.roles.some((x) => x.key !== r.key && x.name.trim() === r.name.trim());
  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">اسم الصفة</span>
        <input value={r.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثال: مسؤول إعاشة" className={smallInputClass} />
        {taken && <span className="mt-1 block text-xs font-bold text-gold">صفة بهذا الاسم موجودة.</span>}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">المستوى</span>
          <select value={r.level} onChange={(e) => set({ level: e.target.value as RoleLevel })} className={cn(smallInputClass, "[&>option]:text-ink")}>
            {(Object.keys(LEVEL_LABEL) as RoleLevel[]).map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">مضاعف عدد الحجاج لكل فرد (اختياري)</span>
          <input type="number" min={0} value={r.multiplier ?? ""} onChange={(e) => set({ multiplier: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} placeholder="بلا مضاعف" className={smallInputClass} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">للذكور أو الإناث</span>
          <select value={r.gender ?? ""} onChange={(e) => set({ gender: (e.target.value || undefined) as RoleDef["gender"] })} className={cn(smallInputClass, "[&>option]:text-ink")}>
            <option value="">للجميع</option>
            <option value="M">للذكور</option>
            <option value="F">للإناث</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">تُعامل في الامتحان والشروط والصلاحيات كـ</span>
          <select value={r.examAs ?? ""} onChange={(e) => set({ examAs: e.target.value || undefined })} className={cn(smallInputClass, "[&>option]:text-ink")}>
            <option value="">— نفسها —</option>
            {s.roles
              .filter((x) => x.key !== r.key && !x.examAs && x.applied)
              .map((x) => (
                <option key={x.key} value={x.key}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">وصفها</span>
        <textarea rows={2} value={r.desc} onChange={(e) => set({ desc: e.target.value })} className={textareaClass} />
      </label>
      <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        {[
          { key: "applied", label: "يُتقدَّم إليها في «التسجيل كإداري»", hint: "وإلا تمنحها الإدارة صفةً موسمية (مثل رئيس تكتل)" },
          ...BEHAVIORS,
          { key: "active", label: "نشطة", hint: "المعطّلة لا تُعرض لتعيين جديد، وتبقى صالحة لمن يحملها" },
        ].map((b) => (
          <label key={b.key} className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={!!r[b.key as Behavior | "applied" | "active"]} onChange={(e) => set({ [b.key]: e.target.checked } as Partial<RoleDef>)} className="mt-1 size-4 accent-[#D9C89E]" />
            <span>
              <span className="block font-bold text-white">{b.label}</span>
              <span className="block text-xs text-white/55">{b.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 border-t border-white/10 pt-4">
        <Button variant="gold" disabled={!r.name.trim() || taken} onClick={() => onSave({ ...r, key: r.key || `role-${nowMs().toString(36)}`, name: r.name.trim(), desc: r.desc.trim() })}>
          حفظ الصفة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── Tiers, categories and their numbers ─────────────────────────

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/60">{label}</span>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))} className={cn(smallInputClass, "text-center font-display text-lg")} dir="ltr" />
    </label>
  );
}

function Categories() {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const requests = useClusterRequests();
  const [tierId, setTierId] = useState(s.tiers[0]?.id ?? "");
  const tier = s.tiers.find((t) => t.id === tierId) ?? s.tiers[0];
  const comp = s.composition[tier?.id ?? ""] ?? DEFAULT_COMPOSITION.eco;
  const [compDraft, setCompDraft] = useState<Composition>(comp);
  const [rows, setRows] = useState<Record<string, CategoryRule>>(() => s.categoryRules[tier?.id ?? ""] ?? {});
  const [newTier, setNewTier] = useState("");
  const [newCat, setNewCat] = useState({ name: "", weight: 1 });
  const switchTier = (id: string) => {
    setTierId(id);
    setCompDraft(s.composition[id] ?? DEFAULT_COMPOSITION.eco);
    setRows(s.categoryRules[id] ?? {});
  };
  const edited = useStore((x) => x.adminRules.categoryRules !== undefined || x.adminRules.composition !== undefined || x.adminRules.tiers !== undefined || x.adminRules.categories !== undefined);
  const log = (action: string, target: string, detail?: string) => logAdmins(user, "reference", { action, target, detail, important: true, ref: "categories" });
  const rowOf = (catId: string): CategoryRule => rows[catId] ?? { guides: 0, assistants: 0, free: 0, pilgrims: 0, active: true };
  const tierUsed = (id: string) => requests.some((r) => r.cluster.tier === id);
  const catUsed = (id: string) => [...ROSTER.map((x) => x.id), ...HEADS_POOL.map((h) => h.id), ...Object.keys(cadre.category)].some((pid) => categoryOf(pid, cadre) === id);

  if (!tier) return null;
  return (
    <>
      <Panel
        icon={<Layers />}
        title="المستوى المعروض"
        action={
          edited && (
            <Button size="sm" variant="ghost" className="text-white" onClick={() => { actions.setAdminRules({ tiers: undefined, categories: undefined, categoryRules: undefined, composition: undefined }); log("إعادة المستويات والفئات وأعدادها إلى الأصل", "الفئات والأعداد"); switchTier(DEFAULT_TIERS[0].id); }}>
              <RotateCcw className="size-4" /> إلى الأصل
            </Button>
          )
        }
      >
        <p className="mb-3 text-sm leading-7 text-white/70">لكل مستوى تكتل تركيبته وأرقام فئاته المستقلة. اختر المستوى، فيتغيّر القسمان تحته تبعاً له.</p>
        <div className="flex flex-wrap items-center gap-2">
          {s.tiers.map((t) => (
            <span key={t.id} className="flex items-center">
              <button type="button" onClick={() => switchTier(t.id)} className={cn("rounded-full px-4 py-2 text-sm font-bold ring-1", t.id === tier.id ? "bg-gold text-green-dark ring-gold" : "bg-white/5 text-white ring-white/15")}>
                {t.name}
              </button>
              {t.id === tier.id && s.tiers.length > 1 && (
                <Btn
                  danger
                  label={`حذف مستوى ${t.name}`}
                  onClick={() => {
                    if (tierUsed(t.id)) return toast({ title: `لا يُحذف مستوى «${t.name}»`, body: "طلب تكتل في هذا المستوى.", tone: "info", icon: "🔒" });
                    const categoryRules = Object.fromEntries(Object.entries(s.categoryRules).filter(([k]) => k !== t.id));
                    const composition = Object.fromEntries(Object.entries(s.composition).filter(([k]) => k !== t.id));
                    actions.setAdminRules({ tiers: s.tiers.filter((x) => x.id !== t.id), categoryRules, composition });
                    log("حذف مستوى تكتل", t.name);
                    switchTier(s.tiers.find((x) => x.id !== t.id)!.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </Btn>
              )}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <input value={newTier} onChange={(e) => setNewTier(e.target.value)} placeholder="مستوى جديد" className={cn(sizedInput, "h-9 w-36")} />
            <Btn
              label="إضافة مستوى"
              disabled={!newTier.trim() || s.tiers.some((t) => t.name === newTier.trim())}
              onClick={() => {
                const t: Tier = { id: `tier-${nowMs().toString(36)}`, name: newTier.trim() };
                actions.setAdminRules({ tiers: [...s.tiers, t], categoryRules: { ...s.categoryRules, [t.id]: { ...s.categoryRules[tier.id] } }, composition: { ...s.composition, [t.id]: { ...comp } } });
                log("إضافة مستوى تكتل", t.name, `بأرقام ${tier.name} مبدئياً`);
                setNewTier("");
              }}
            >
              <Plus className="size-4" />
            </Btn>
          </span>
        </div>
      </Panel>

      <Panel icon={<Building />} title={`تركيبة التكتل — ${tier.name}`}>
        <p className="mb-3 text-sm leading-7 text-white/70">مجموع الفئات (لكل فئة وزنها) لمجموعات التكتل يجب أن يقع بين الحدين لهذا المستوى. كل عدد من الوحدات المحدد أدناه يقابله منسق واحد أو موجّهة/مرشدة واحدة، ومعاون التكتل عدد ثابت.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <NumberField label="الحد الأدنى لمجموع الفئات" value={compDraft.min} onChange={(n) => setCompDraft({ ...compDraft, min: n })} />
          <NumberField label="الحد الأعلى لمجموع الفئات" value={compDraft.max} onChange={(n) => setCompDraft({ ...compDraft, max: n })} />
          <NumberField label="معاون التكتل (عدد ثابت)" value={compDraft.assistants} onChange={(n) => setCompDraft({ ...compDraft, assistants: n })} />
          <NumberField label="وحدات الفئات لكل منسق" value={compDraft.perCoordinator} onChange={(n) => setCompDraft({ ...compDraft, perCoordinator: n })} />
          <NumberField label="وحدات الفئات لكل موجّهة" value={compDraft.perGuide} onChange={(n) => setCompDraft({ ...compDraft, perGuide: n })} />
        </div>
        <Button
          size="sm"
          variant="gold"
          className="mt-3"
          disabled={compDraft.min > compDraft.max || JSON.stringify(compDraft) === JSON.stringify(comp)}
          onClick={() => {
            actions.setAdminRules({ composition: { ...s.composition, [tier.id]: compDraft } });
            log(`تعديل تركيبة التكتل (${tier.name})`, tier.name, `مجموع الفئات ${compDraft.min}–${compDraft.max} · معاون ${compDraft.assistants} · منسق لكل ${compDraft.perCoordinator} · موجّهة لكل ${compDraft.perGuide}`);
            toast({ title: `حُفظت تركيبة التكتل (${tier.name})`, tone: "success", icon: "💾" });
          }}
        >
          حفظ تركيبة التكتل
        </Button>
      </Panel>

      <Panel icon={<Layers />} title={`فئات المجموعات — ${tier.name}`}>
        <ol className="space-y-3">
          {s.categories.map((c) => {
            const row = rowOf(c.id);
            const n = seatsOf(s, tier.id, c.id);
            const set = (patch: Partial<CategoryRule>) => setRows({ ...rows, [c.id]: { ...row, ...patch } });
            const changed = JSON.stringify(row) !== JSON.stringify(s.categoryRules[tier.id]?.[c.id] ?? rowOf("__none"));
            return (
              <li key={c.id} className={cn("rounded-2xl p-4 ring-1", row.active ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/30")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-white">
                    {c.name} <span className="text-xs font-normal text-white/55">— وزنها {c.weight}</span>
                  </p>
                  <span className="text-xs text-white/60">إجمالي أعضاء المجموعة (مع الرئيس): {1 + row.guides + row.assistants + row.free}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <NumberField label="عدد الموجّهين/المرشدين" value={row.guides} onChange={(v) => set({ guides: v })} />
                  <NumberField label="عدد المعاونين" value={row.assistants} onChange={(v) => set({ assistants: v })} />
                  <NumberField label="أعضاء بدور حر" value={row.free} onChange={(v) => set({ free: v })} />
                  <NumberField label="عدد الحجاج لهذه الفئة" value={row.pilgrims} onChange={(v) => set({ pilgrims: v })} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    disabled={!changed}
                    onClick={() => {
                      actions.setAdminRules({ categoryRules: { ...s.categoryRules, [tier.id]: { ...(s.categoryRules[tier.id] ?? {}), [c.id]: row } } });
                      log(`تعديل ${c.name} (${tier.name})`, c.name, `${row.pilgrims} حاجاً — ${row.guides} موجّه، ${row.assistants} معاون، ${row.free} حر`);
                      toast({ title: `حُفظت ${c.name} (${tier.name})`, tone: "success", icon: "💾" });
                    }}
                  >
                    حفظ هذه الفئة
                  </Button>
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input type="checkbox" checked={row.active} onChange={(e) => set({ active: e.target.checked })} className="size-4 accent-[#D9C89E]" /> نشطة
                  </label>
                  <span className="text-xs text-white/50">الآن: {n.pilgrims} حاجاً</span>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel icon={<Tags />} title="الفئات نفسها">
        <p className="mb-3 text-sm leading-7 text-white/70">اسم كل فئة ووزنها في مجموع فئات التكتل. لا تُحذف فئة لرئيس مجموعة يحملها.</p>
        <ul className="space-y-2">
          {s.categories.map((c) => (
            <CategoryRow
              key={c.id}
              c={c}
              onSave={(next) => {
                actions.setAdminRules({ categories: s.categories.map((x) => (x.id === c.id ? next : x)) });
                log("تعديل فئة", next.name, `وزنها ${next.weight}`);
              }}
              onRemove={() => {
                if (catUsed(c.id)) return toast({ title: `لا تُحذف «${c.name}»`, body: "رؤساء مجموعات يحملونها.", tone: "info", icon: "🔒" });
                actions.setAdminRules({ categories: s.categories.filter((x) => x.id !== c.id) });
                log("حذف فئة", c.name);
              }}
            />
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="فئة جديدة" className={cn(sizedInput, "w-44")} />
          <input type="number" min={1} value={newCat.weight} onChange={(e) => setNewCat({ ...newCat, weight: Math.max(1, Number(e.target.value) || 1) })} className={cn(sizedInput, "w-20 text-center")} dir="ltr" aria-label="وزن الفئة" />
          <Button
            size="sm"
            variant="glass"
            disabled={!newCat.name.trim() || s.categories.some((c) => c.name === newCat.name.trim())}
            onClick={() => {
              const c: Category = { id: `cat-${nowMs().toString(36)}`, name: newCat.name.trim(), weight: newCat.weight };
              actions.setAdminRules({ categories: [...s.categories, c] });
              log("إضافة فئة", c.name, `وزنها ${c.weight}`);
              setNewCat({ name: "", weight: 1 });
            }}
          >
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      </Panel>
    </>
  );
}

function CategoryRow({ c, onSave, onRemove }: { c: Category; onSave: (c: Category) => void; onRemove: () => void }) {
  const [d, setD] = useState(c);
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[.06] p-2 ring-1 ring-white/10">
      <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} aria-label="اسم الفئة" className={cn(sizedInput, "h-9 w-44")} />
      <input type="number" min={1} value={d.weight} onChange={(e) => setD({ ...d, weight: Math.max(1, Number(e.target.value) || 1) })} aria-label="وزن الفئة" className={cn(sizedInput, "h-9 w-20 text-center")} dir="ltr" />
      <Button size="sm" variant="glass" disabled={!d.name.trim() || (d.name === c.name && d.weight === c.weight)} onClick={() => onSave({ ...d, name: d.name.trim() })}>
        حفظ
      </Button>
      <Btn danger label={`حذف ${c.name}`} onClick={onRemove}>
        <Trash2 className="size-4" />
      </Btn>
    </li>
  );
}

// ───────────────────────── Branches ─────────────────────────

function Branches() {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const rows = useAdminRows();
  const [name, setName] = useState("");
  const branchesEdited = useStore((x) => x.adminRules.branches !== undefined);
  const people = useMemo(() => [...new Set([...rows.map((r) => r.id), ...ROSTER.map((x) => x.id), ...HEADS_POOL.map((h) => h.id)])], [rows]);
  const linked = (b: Branch) => people.filter((id) => branchesOf(id, cadre).includes(b.name)).length;
  const save = (branches: Branch[], action: string, target: string) => {
    actions.setAdminRules({ branches });
    logAdmins(user, "reference", { action, target, important: true, ref: "branches" });
  };
  return (
    <Panel
      icon={<Building />}
      title="الفروع / المكاتب"
      action={
        branchesEdited ? (
          <Button size="sm" variant="ghost" className="text-white" onClick={() => save(DEFAULT_BRANCHES, "إعادة الفروع إلى الأصل", `${DEFAULT_BRANCHES.length} فروع`)}>
            <RotateCcw className="size-4" /> إلى الأصل
          </Button>
        ) : undefined
      }
    >
      <p className="mb-3 text-sm leading-7 text-white/70">تُستخدم لتصفية الأسماء عند تعبئة طلب التكتل: يختار رئيس التكتل مجموعاته وكادره من فرعه وفروعه الإضافية. لا يُحذف فرع مرتبط بإداريين: انقلهم إلى فرع آخر أولاً.</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {s.branches.map((b) => (
          <li key={b.id} className={cn("flex items-center gap-2 rounded-2xl p-2 ring-1", b.active ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/30")}>
            <span className="min-w-0 flex-1 px-2">
              <span className="block font-bold text-white">{b.name}</span>
              <span className="block text-xs text-white/55">{linked(b)} إداري مرتبط</span>
            </span>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => save(s.branches.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)), b.active ? "تعطيل فرع" : "تفعيل فرع", b.name)}>
              {b.active ? "تعطيل" : "تفعيل"}
            </Button>
            <Btn
              danger
              label={`حذف ${b.name}`}
              onClick={() => {
                const n = linked(b);
                if (n) return toast({ title: `لا يُحذف فرع «${b.name}»`, body: `مرتبط الآن بـ ${n} من الإداريين. انقلهم من «صفات الأشخاص وفئاتهم» أولاً.`, tone: "info", icon: "🔒" });
                save(
                  s.branches.filter((x) => x.id !== b.id),
                  "حذف فرع",
                  b.name,
                );
              }}
            >
              <Trash2 className="size-4" />
            </Btn>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم فرع جديد..." className={cn(sizedInput, "w-56")} />
        <Button
          size="sm"
          variant="glass"
          disabled={!name.trim() || s.branches.some((b) => b.name === name.trim())}
          onClick={() => {
            save([...s.branches, { id: name.trim(), name: name.trim(), active: true }], "إضافة فرع", name.trim());
            setName("");
          }}
        >
          <Plus className="size-4" /> إضافة
        </Button>
      </div>
    </Panel>
  );
}

// ───────────────────────── Seasonal labels ─────────────────────────

function Labels() {
  const user = useStaffUser()!;
  const s = useStructure();
  const [draft, setDraft] = useState<RoleLabel>({ id: "", label: "", base: s.roles[0]?.key ?? "", active: true });
  const labelsEdited = useStore((x) => x.adminRules.roleLabels !== undefined);
  const save = (labels: RoleLabel[], action: string, target: string) => {
    actions.setAdminRules({ roleLabels: labels });
    logAdmins(user, "reference", { action, target, ref: "labels" });
  };
  return (
    <Panel
      icon={<Tags />}
      title="التسميات الموسمية الجاهزة"
      action={
        labelsEdited ? (
          <Button size="sm" variant="ghost" className="text-white" onClick={() => save(DEFAULT_LABELS, "إعادة التسميات إلى الأصل", `${DEFAULT_LABELS.length} تسميات`)}>
            <RotateCcw className="size-4" /> إلى الأصل
          </Button>
        ) : undefined
      }
    >
      <p className="mb-3 text-sm leading-7 text-white/70">اقتراحات جاهزة لاسم يُعرض مع الصفة الموسمية حين تُمنح لشخص (من «صفات الأشخاص وفئاتهم»). كل تسمية تُقترح لإحدى الصفات، ولا ترتبط بأحد بنفسها.</p>
      <ul className="space-y-2">
        {s.labels.map((l) => (
          <li key={l.id} className={cn("flex flex-wrap items-center gap-2 rounded-2xl p-3 ring-1", l.active ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/30")}>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-white">{l.label}</span>
              <span className="block text-xs text-white/55">تُقترح لـ: {roleName(l.base, s)}</span>
            </span>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => save(s.labels.map((x) => (x.id === l.id ? { ...x, active: !x.active } : x)), l.active ? "تعطيل تسمية" : "تفعيل تسمية", l.label)}>
              {l.active ? "تعطيل" : "تفعيل"}
            </Button>
            <Btn danger label={`حذف ${l.label}`} onClick={() => save(s.labels.filter((x) => x.id !== l.id), "حذف تسمية موسمية", l.label)}>
              <Trash2 className="size-4" />
            </Btn>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="مثال: معاون - مكتب سياحي" className={cn(sizedInput, "w-60")} />
        <select value={draft.base} onChange={(e) => setDraft({ ...draft, base: e.target.value })} aria-label="تُقترح لـ" className={cn(sizedInput, "w-48 [&>option]:text-ink")}>
          {s.roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="glass"
          disabled={!draft.label.trim() || s.labels.some((l) => l.label === draft.label.trim())}
          onClick={() => {
            save([...s.labels, { ...draft, id: `l-${nowMs().toString(36)}`, label: draft.label.trim() }], "إضافة تسمية موسمية", draft.label.trim());
            setDraft({ ...draft, label: "" });
          }}
        >
          <Plus className="size-4" /> تسمية جديدة
        </Button>
      </div>
    </Panel>
  );
}

// ───────────────────────── People: seasonal role, category, branches ─────────────────────────

type Person = { id: string; name: string; applied?: string };

/** Everyone the season knows: the administrators on this device and in the staff's records, the qualified roster, the groups' heads */
function usePeople(): Person[] {
  const rows = useAdminRows();
  const s = useStructure();
  return useMemo(() => {
    const key = (pos?: string) => (pos ? (s.roles.find((r) => r.key === pos || r.name === pos)?.key ?? pos) : undefined);
    const map = new Map<string, Person>();
    for (const r of rows) map.set(r.id, { id: r.id, name: r.name, applied: key(r.profile.positions[0] ?? r.position) });
    // The demo accounts not signed in on this device yet, with the role of their story
    for (const d of DEMO_ADMINS) if (!map.has(d.id)) map.set(d.id, { id: d.id, name: d.title.split(" — ")[0], applied: d.position });
    for (const c of ROSTER) if (!map.has(c.id)) map.set(c.id, { id: c.id, name: c.name, applied: c.roleKey });
    for (const h of HEADS_POOL) if (!map.has(h.id)) map.set(h.id, { id: h.id, name: h.name, applied: "group-head" });
    return [...map.values()];
  }, [rows, s.roles]);
}

function People() {
  const s = useStructure();
  const cadre = useCadre();
  const people = usePeople();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [open, setOpen] = useState<Person | null>(null);
  const [shown, setShown] = useState(40);
  const roleNow = (p: Person) => seasonalOf(p.id, cadre)?.role ?? p.applied ?? "";
  const found = people
    .filter((p) => (!role || roleNow(p) === role || p.applied === role) && (!branch || branchesOf(p.id, cadre).includes(branch)))
    .filter((p) => !q.trim() || [p.name, roleName(p.applied ?? "", s), branchOf(p.id, cadre)].some((t) => t.includes(q.trim())));
  const granted = people.filter((p) => seasonalOf(p.id, cadre));
  return (
    <>
      <Panel icon={<UserCog />} title="الصفات الموسمية الممنوحة" action={<Chip tone="gold">{granted.length}</Chip>}>
        <p className="mb-3 text-sm leading-7 text-white/70">صفة تمنحها الإدارة لشخص لهذا الموسم فوق صفته التي تقدّم بها، بسببها: «رئيس تكتل» لمن يرأس تكتلاً، و«معاون» لرئيس مجموعة اتحدت مجموعته مع أخرى (ويحتفظ بصفته للمواسم القادمة).</p>
        <ul className="space-y-2">
          {granted.map((p) => {
            const g = seasonalOf(p.id, cadre)!;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p)} className="flex w-full flex-wrap items-center gap-2 rounded-2xl bg-white/[.06] p-3 text-right ring-1 ring-white/10 hover:ring-gold/40">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-white">
                      {p.name} — {seasonalText(g, s)}
                    </span>
                    <span className="block text-xs text-white/60">
                      صفته الأساسية {roleName(p.applied ?? "", s)} · {g.reason} · منحها {g.by}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel icon={<UsersRound />} title="الأشخاص" action={<Chip>{people.length}</Chip>}>
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
          <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو الصفة أو الفرع" label="بحث في الأشخاص" />
          <FilterSelect label="الصفة" all={`كل الصفات (${people.length})`} value={role} onChange={setRole} options={s.roles.map((r) => ({ value: r.key, label: `${r.name} (${people.filter((p) => roleNow(p) === r.key).length})` }))} />
          <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {found.slice(0, shown).map((p) => {
            const g = seasonalOf(p.id, cadre);
            const cat = categoryOf(p.id, cadre);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p)} className="w-full rounded-2xl bg-white/[.06] p-3 text-right ring-1 ring-white/10 hover:ring-gold/40">
                  <span className="block font-bold text-white">{p.name}</span>
                  <span className="block text-xs text-white/60">
                    {roleName(p.applied ?? "", s)}
                    {g ? ` ← ${seasonalText(g, s)}` : ""} · {branchesOf(p.id, cadre).join("، ")}
                    {cat ? ` · ${s.categories.find((c) => c.id === cat)?.name}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {found.length > shown && (
          <Button size="sm" variant="glass" className="mt-3" onClick={() => setShown(shown + 60)}>
            عرض المزيد ({found.length - shown})
          </Button>
        )}
      </Panel>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""}>
        {open && <PersonCadre id={open.id} name={open.name} applied={open.applied} />}
      </Drawer>
    </>
  );
}

/**
 * One person's season as the administration sets it: a seasonal role (with a ready label and its reason) or
 * none, his category when he leads a group, his branch and extra branches. Each change asks its reason and is
 * written to his record.
 */
export function PersonCadre({ id, name, applied, history = true }: { id: string; name: string; applied?: string; history?: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const current = seasonalOf(id, cadre);
  const [role, setRole] = useState(current?.role ?? "");
  const [label, setLabel] = useState(current?.label ?? "");
  const [category, setCategory] = useState(categoryOf(id, cadre) ?? "");
  const [branch, setBranch] = useState(branchOf(id, cadre));
  const [extra, setExtra] = useState<string[]>(branchesOf(id, cadre).slice(1));
  const [reason, setReason] = useState("");
  const log = (action: string, before: string, after: string) => logAdmins(user, "applicants", { action, target: name, before, after, detail: reason.trim(), ref: id, important: true });
  const ready = reason.trim().length >= 3;
  const effective = role || applied;
  const leads = !!s.roles.find((r) => r.key === effective)?.category || !!s.roles.find((r) => r.key === applied)?.category || !!categoryOf(id, cadre);

  const saveRole = () => {
    const before = current ? seasonalText(current, s) : "لا صفة موسمية";
    if (!role) {
      actions.setCadre("seasonal", id, null);
      log("سحب صفة موسمية", before, `صفته الأساسية: ${roleName(applied ?? "", s)}`);
    } else {
      const g = { role, label: label || undefined, reason: reason.trim(), by: user.name, at: nowMs() };
      actions.setCadre("seasonal", id, g);
      log("منح صفة موسمية", before, seasonalText(g, s));
    }
    toast({ title: "حُفظت الصفة الموسمية", body: name, tone: "success", icon: "🏷️" });
    setReason("");
  };
  const saveCategory = () => {
    actions.setCadre("category", id, category || undefined);
    log("تعديل فئة", s.categories.find((c) => c.id === categoryOf(id, cadre))?.name ?? "—", s.categories.find((c) => c.id === category)?.name ?? "—");
    toast({ title: "حُفظت الفئة", body: name, tone: "success", icon: "🏷️" });
    setReason("");
  };
  const saveBranches = () => {
    actions.setCadre("branches", id, { branch, extra: extra.filter((b) => b !== branch) });
    log("تعديل الفروع", branchesOf(id, cadre).join("، "), [branch, ...extra.filter((b) => b !== branch)].join("، "));
    toast({ title: "حُفظت الفروع", body: name, tone: "success", icon: "🏢" });
    setReason("");
  };

  return (
    <div className="space-y-5 text-sm">
      <p className="rounded-2xl bg-white/5 p-3 text-white/80 ring-1 ring-white/10">
        صفته الأساسية: <b className="text-gold">{roleName(applied ?? "", s) || "—"}</b>
        {current && (
          <>
            {" "}
            · الموسمية: <b className="text-gold">{seasonalText(current, s)}</b> — {current.reason}
          </>
        )}
      </p>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">السبب (إلزامي لكل تعديل، ويُكتب في سجله)</span>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="مثال: اتحاد مع مجموعة أخرى — بناءً على كتاب تشكيل التكتلات" />
      </label>

      <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="font-bold text-white">الصفة الموسمية</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={role} onChange={(e) => { setRole(e.target.value); setLabel(""); }} aria-label="الصفة الموسمية" className={cn(smallInputClass, "[&>option]:text-ink")}>
            <option value="">— لا صفة موسمية —</option>
            {s.roles
              .filter((r) => r.active || r.key === role)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
          </select>
          <select value={label} onChange={(e) => setLabel(e.target.value)} disabled={!role} aria-label="التسمية المعروضة" className={cn(smallInputClass, "[&>option]:text-ink")}>
            <option value="">— بلا تسمية —</option>
            {s.labels
              .filter((l) => l.active && l.base === role)
              .map((l) => (
                <option key={l.id} value={l.label}>
                  {l.label}
                </option>
              ))}
          </select>
        </div>
        <Button size="sm" variant="gold" disabled={!ready || (role === (current?.role ?? "") && label === (current?.label ?? ""))} onClick={saveRole}>
          حفظ الصفة الموسمية
        </Button>
      </div>

      {leads && (
        <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <p className="font-bold text-white">الفئة (فئة مجموعته)</p>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="الفئة" className={cn(smallInputClass, "[&>option]:text-ink")}>
            <option value="">— لا فئة —</option>
            {s.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="gold" disabled={!ready || category === (categoryOf(id, cadre) ?? "")} onClick={saveCategory}>
            حفظ الفئة
          </Button>
        </div>
      )}

      <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="font-bold text-white">الفرع والفروع الإضافية</p>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="الفرع" className={cn(smallInputClass, "[&>option]:text-ink")}>
          {s.branches
            .filter((b) => b.active || b.name === branch)
            .map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {s.branches
            .filter((b) => b.active && b.name !== branch)
            .map((b) => (
              <label key={b.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1", extra.includes(b.name) ? "bg-gold/20 text-gold ring-gold/40" : "bg-white/5 text-white/70 ring-white/15")}>
                <input type="checkbox" checked={extra.includes(b.name)} onChange={(e) => setExtra(e.target.checked ? [...extra, b.name] : extra.filter((x) => x !== b.name))} className="size-3.5 accent-[#D9C89E]" /> {b.name}
              </label>
            ))}
        </div>
        <Button size="sm" variant="gold" disabled={!ready || [branch, ...extra].join() === branchesOf(id, cadre).join()} onClick={saveBranches}>
          حفظ الفروع
        </Button>
      </div>

      {history && <RecordHistory system="admins" refId={id} />}
    </div>
  );
}

