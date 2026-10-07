"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, Building, Layers, Pencil, Plus, RotateCcw, Tags, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { cn, formatNumber, nowMs } from "@/lib/utils";
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
  branchesOf,
  categoryOf,
  roleName,
  seasonalOf,
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
import { Chip } from "../../_components/ops-ui";
import { SystemRecords } from "../../_components/system";
import { logAdmins } from "../desk";

type Section = "roles" | "categories" | "branches" | "labels";

/**
 * The administration's reference lists («القوائم المرجعية» of قسم شؤون المجموعات والتكتلات), in the order
 * they are set up: the roles and what each does in a cluster, the tiers with their categories' numbers and
 * their composition, the branches, the ready seasonal labels. Each person's base and seasonal role, category
 * and branches are set in «الكادر الإداري». Everything here is added, edited, deactivated and deleted by the
 * holder of «إدارة الإداريين»; a list in use cannot lose what is in use. Every change is in the tab's record.
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
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
          {section === "roles" && <Roles />}
          {section === "categories" && <Categories />}
          {section === "branches" && <Branches />}
          {section === "labels" && <Labels />}
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
    if (s.roles.some((x) => x.examAs === r.key || x.exams?.includes(r.key))) return toast({ title: `لا تُحذف صفة «${r.name}»`, body: "صفات أخرى تُعامل كـها في الامتحان والشروط، أو تمتحن امتحانها.", tone: "info", icon: "🔒" });
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
        كل صفة بمستواها (تكتل، مجموعة، مشترك) وسلوكها في التكتل: أي مقعد تشغل، ومن أي قائمة مرشّحين تُختار، وهل تقود تكتلاً أو مجموعة، وهل تمنح شارة التميّز في التوجيه الديني، وهل لصاحبها فئة أو عمر مثبَّت يُحتسب به في متوسط أعمار التكتل. السلوكيات مستقلة، فتُضبط بحرية. لا تُحذف صفة يحملها أحد: تُعطَّل، فلا تُعرض لتعيين جديد وتبقى صالحة لمن يحملها.
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
                  {r.exams && r.exams.length > 1 ? (
                    <Chip tone="gold">تمتحن امتحانَي {r.exams.map((x) => roleName(x, s)).join(" و")} ويلزمها اجتيازهما</Chip>
                  ) : (
                    r.examAs && <Chip>{s.roles.find((x) => x.key === r.examAs)?.examName ? `تمتحن امتحان ${s.roles.find((x) => x.key === r.examAs)!.examName} وتُعامل بشروطه` : `تُعامل كـ${roleName(r.examAs, s)} في الامتحان والشروط`}</Chip>
                  )}
                  {r.multiplier ? <Chip tone="green">مضاعف حجاج ×{r.multiplier}</Chip> : null}
                  {r.fixedAge ? <Chip tone="green">عمر مثبَّت عند {r.fixedAge}</Chip> : null}
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
          <span className="mb-1 block text-xs text-white/60">عمر مثبَّت في متوسط أعمار التكتل (اختياري)</span>
          <input type="number" min={18} max={90} value={r.fixedAge ?? ""} onChange={(e) => set({ fixedAge: e.target.value ? Math.max(18, Number(e.target.value)) : undefined })} placeholder="بعمره الحقيقي" className={smallInputClass} dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">اسم امتحانها حين تمتحنه صفات أخرى (اختياري)</span>
          <input value={r.examName ?? ""} onChange={(e) => set({ examName: e.target.value || undefined })} placeholder="مثال: الموجّه الديني" className={smallInputClass} />
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
      {r.applied && (
        <fieldset>
          <legend className="mb-1 text-xs text-white/60">الامتحانات التي تمتحنها — إن اخترت أكثر من امتحان يلزمها اجتيازها كلها، كلٌّ في يومه</legend>
          <div className="flex flex-wrap gap-2">
            {s.roles
              .filter((x) => !x.examAs && x.applied && !x.exams?.length)
              .map((x) => {
                const current = r.exams?.length ? r.exams : [r.examAs ?? r.key];
                const on = current.includes(x.key);
                return (
                  <button
                    key={x.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const next = on ? current.filter((k) => k !== x.key) : [...current, x.key];
                      // One exam is kept as an empty list, so the platform's default does not come back
                      set({ exams: next.length > 1 ? next : [] });
                    }}
                    className={cn("rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition", on ? "bg-gold text-ink ring-gold" : "text-white/70 ring-white/15 hover:bg-white/10")}
                  >
                    امتحان {x.name}
                  </button>
                );
              })}
          </div>
        </fieldset>
      )}
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
                if (n) return toast({ title: `لا يُحذف فرع «${b.name}»`, body: `مرتبط الآن بـ ${n} من الإداريين. انقلهم من «الكادر الإداري» أولاً.`, tone: "info", icon: "🔒" });
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
      <p className="mb-3 text-sm leading-7 text-white/70">اقتراحات جاهزة لاسم يُعرض مع الصفة الموسمية حين تُمنح لشخص (من ملفه في «الكادر الإداري»). كل تسمية تُقترح لإحدى الصفات، ولا ترتبط بأحد بنفسها.</p>
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
