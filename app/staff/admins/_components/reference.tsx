"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
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
import { Drawer, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { AddButton, Box, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, SettingsRow, SettingsSection, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, Order, SaveLine, TitleCell, Views, useView } from "./ui";
import { logAdmins } from "../desk";

const SECTIONS = [
  { key: "roles", label: "الصفات" },
  { key: "categories", label: "الفئات والأعداد" },
  { key: "branches", label: "الفروع" },
  { key: "labels", label: "التسميات الموسمية" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

/**
 * The administration's reference lists («القوائم المرجعية» of قسم شؤون المجموعات والتكتلات), one at a time from
 * the row at the top (`?s=`): the roles and what each does in a cluster, the tiers with their categories'
 * numbers and their composition, the branches, the ready seasonal labels. Each list is a table with its actions
 * under each name; adding is beside the list or in a side sheet. A list in use cannot lose what is in use.
 */
export function ReferenceTab() {
  const s = useStructure();
  const section = useView<Section>("s", SECTIONS.map((x) => x.key));
  const counts: Record<Section, number> = { roles: s.roles.length, categories: s.tiers.length, branches: s.branches.length, labels: s.labels.length };
  return (
    <div className="space-y-6">
      <Views param="s" value={section} items={SECTIONS.map((x) => ({ ...x, count: counts[x.key] }))} tabs label="القوائم المرجعية" />
      {section === "roles" && <Roles />}
      {section === "categories" && <Categories />}
      {section === "branches" && <Branches />}
      {section === "labels" && <Labels />}
      <RecordsBox system="admins" area="reference" title="سجل القوائم المرجعية" />
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

// ───────────────────────── Roles ─────────────────────────

function Roles() {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const edited = useStore((x) => x.adminRules.roles) !== undefined;
  const use = useRoleUse();
  const [editing, setEditing] = useState<RoleDef | "new" | null>(null);
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");
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
    if (s.roles.some((x) => x.examAs === r.key || x.exams?.includes(r.key))) return toast({ title: `لا تُحذف صفة «${r.name}»`, body: "صفات أخرى تُعامل كـها في الاختبار والشروط، أو تؤدي اختبارها.", tone: "info", icon: "🔒" });
    save(
      s.roles.filter((x) => x.key !== r.key),
      "حذف صفة",
      r.name,
    );
    toast({ title: `حُذفت صفة «${r.name}»`, tone: "info", icon: "🗑️" });
  };
  const shown = s.roles.map((r, i) => ({ r, i })).filter(({ r }) => filter === "all" || (filter === "on" ? r.active : !r.active));
  const exam = (r: RoleDef) =>
    r.exams && r.exams.length > 1
      ? `تؤدي اختبارَي ${r.exams.map((x) => roleName(x, s)).join(" و")} ويلزمها اجتيازهما`
      : r.examAs
        ? s.roles.find((x) => x.key === r.examAs)?.examName
          ? `تؤدي اختبار ${s.roles.find((x) => x.key === r.examAs)!.examName} وتُعامل بشروطه`
          : `تُعامل كـ${roleName(r.examAs, s)} في الاختبار والشروط`
        : undefined;

  return (
    <div className="space-y-4">
      <Title action={<AddButton onClick={() => setEditing("new")}>إضافة صفة</AddButton>}>الصفات</Title>
      <Lead>كل صفة بمستواها وسلوكها في التكتل. افتح الصفة لتعديلها. لا تُحذف صفة يحملها أحد: تُعطَّل.</Lead>
      <Filters
        label="تصفية الصفات"
        value={filter}
        onChange={setFilter}
        items={[
          { key: "all", label: "الكل", count: s.roles.length },
          { key: "on", label: "النشطة", count: s.roles.filter((r) => r.active).length },
          { key: "off", label: "المعطّلة", count: s.roles.filter((r) => !r.active).length },
        ]}
      />
      <ListTable head={["الصفة", "المستوى", "يحملها", "الحالة", "الترتيب"]} minWidth="48rem">
        {shown.length === 0 && <EmptyRow cols={5}>لا صفات هنا.</EmptyRow>}
        {shown.map(({ r, i }) => (
          <tr key={r.key} className={cn(!r.active && "opacity-60")}>
            <TitleCell
              title={r.name}
              onOpen={() => setEditing(r)}
              sub={
                <>
                  {r.desc}
                  {(BEHAVIORS.some((b) => r[b.key]) || exam(r) || r.multiplier || r.fixedAge) && (
                    <span className="mt-1 block text-white/45">
                      {[...BEHAVIORS.filter((b) => r[b.key]).map((b) => b.label), exam(r), r.multiplier ? `مضاعف حجاج ×${r.multiplier}` : undefined, r.fixedAge ? `عمر مثبَّت عند ${r.fixedAge}` : undefined].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </>
              }
              actions={
                <RowActions>
                  <RowLink onClick={() => setEditing(r)}>تعديل</RowLink>
                  <RowLink danger={r.active} onClick={() => save(s.roles.map((x) => (x.key === r.key ? { ...x, active: !x.active } : x)), r.active ? "تعطيل صفة" : "تفعيل صفة", r.name)}>
                    {r.active ? "تعطيل" : "تفعيل"}
                  </RowLink>
                  <RowLink danger onClick={() => remove(r)}>
                    حذف
                  </RowLink>
                </RowActions>
              }
            />
            <td className="p-3 align-top text-white/80">{LEVEL_LABEL[r.level].split(" ")[0]}</td>
            <td className="p-3 align-top tabular-nums text-white/80">{formatNumber(use.get(r.key) ?? 0)}</td>
            <td className="p-3 align-top">
              <span className="flex flex-wrap gap-1">
                {r.active ? <Tag tone="green">نشطة</Tag> : <Tag tone="maroon">معطّلة</Tag>}
                {!r.applied && <Tag tone="gold">تمنحها الإدارة</Tag>}
                {r.core && <Tag>أصلية</Tag>}
              </span>
            </td>
            <td className="p-3 align-top">{filter === "all" && <Order name={r.name} first={i === 0} last={i === s.roles.length - 1} onUp={() => move(i, -1)} onDown={() => move(i, 1)} />}</td>
          </tr>
        ))}
      </ListTable>

      <div className="grid gap-4 lg:grid-cols-2">
        <Help>
          <p>كل صفة بمستواها (تكتل، مجموعة، مشترك) وسلوكها في التكتل: أي مقعد تشغل، ومن أي قائمة مرشّحين تُختار، وهل تقود تكتلاً أو مجموعة، وهل تمنح شارة التميّز في التوجيه الديني، وهل لصاحبها فئة أو عمر مثبَّت يُحتسب به في متوسط أعمار التكتل. السلوكيات مستقلة، فتُضبط بحرية.</p>
          <p>«رئيس تكتل» لا يُتقدَّم إليها: تمنحها الإدارة صفةً موسمية. والمعطّلة لا تُعرض لتعيين جديد، وتبقى صالحة لمن يحملها.</p>
        </Help>
        {edited && (
          <Box title="خيارات متقدمة" open={false}>
            <Button
              size="sm"
              variant="glass"
              onClick={() => {
                actions.setAdminRules({ roles: undefined });
                logAdmins(user, "reference", { action: "إعادة الصفات إلى الأصل", target: `${DEFAULT_ROLES.length} صفات`, important: true, ref: "roles" });
              }}
            >
              <RotateCcw className="size-4" /> إعادة الصفات إلى الأصل
            </Button>
          </Box>
        )}
      </div>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "إضافة صفة" : editing ? `تعديل «${editing.name}»` : ""}>
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
    </div>
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
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">وصفها</span>
        <textarea rows={2} value={r.desc} onChange={(e) => set({ desc: e.target.value })} className={textareaClass} />
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
          <span className="mb-1 block text-xs text-white/60">للذكور أو الإناث</span>
          <select value={r.gender ?? ""} onChange={(e) => set({ gender: (e.target.value || undefined) as RoleDef["gender"] })} className={cn(smallInputClass, "[&>option]:text-ink")}>
            <option value="">للجميع</option>
            <option value="M">للذكور</option>
            <option value="F">للإناث</option>
          </select>
        </label>
      </div>
      <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="text-xs font-bold text-gold">سلوكها</p>
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
      <Box title="الاختبار والأعداد (متقدم)" open={!!(r.examAs || r.exams?.length || r.multiplier || r.fixedAge || r.examName)}>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">تُعامل في الاختبار والشروط والصلاحيات كـ</span>
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
        {r.applied && (
          <fieldset>
            <legend className="mb-1 text-xs text-white/60">الاختبارات التي تؤديها — إن اخترت أكثر من اختبار يلزمها اجتيازها كلها، كلٌّ في جلسته</legend>
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
                      اختبار {x.name}
                    </button>
                  );
                })}
            </div>
          </fieldset>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">اسم اختبارها حين تؤديه صفات أخرى (اختياري)</span>
          <input value={r.examName ?? ""} onChange={(e) => set({ examName: e.target.value || undefined })} placeholder="مثال: الموجّه الديني" className={smallInputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">مضاعف عدد الحجاج لكل فرد</span>
            <input type="number" min={0} value={r.multiplier ?? ""} onChange={(e) => set({ multiplier: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} placeholder="بلا مضاعف" className={smallInputClass} dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">عمر مثبَّت في متوسط أعمار التكتل</span>
            <input type="number" min={18} max={90} value={r.fixedAge ?? ""} onChange={(e) => set({ fixedAge: e.target.value ? Math.max(18, Number(e.target.value)) : undefined })} placeholder="بعمره الحقيقي" className={smallInputClass} dir="ltr" />
          </label>
        </div>
      </Box>
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
  return <input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))} aria-label={label} className={cn(smallInputClass, "h-10 w-24 text-center font-display text-lg")} dir="ltr" />;
}

function Categories() {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const requests = useClusterRequests();
  const [tierId, setTierId] = useState(s.tiers[0]?.id ?? "");
  const tier = s.tiers.find((t) => t.id === tierId) ?? s.tiers[0];
  const [newTier, setNewTier] = useState("");
  const [newCat, setNewCat] = useState({ name: "", weight: 1 });
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const edited = useStore((x) => x.adminRules.categoryRules !== undefined || x.adminRules.composition !== undefined || x.adminRules.tiers !== undefined || x.adminRules.categories !== undefined);
  const log = (action: string, target: string, detail?: string) => logAdmins(user, "reference", { action, target, detail, important: true, ref: "categories" });
  const tierUsed = (id: string) => requests.some((r) => r.cluster.tier === id);
  const catUsed = (id: string) => [...ROSTER.map((x) => x.id), ...HEADS_POOL.map((h) => h.id), ...Object.keys(cadre.category)].some((pid) => categoryOf(pid, cadre) === id);

  if (!tier) return null;
  const comp = s.composition[tier.id] ?? DEFAULT_COMPOSITION.eco;
  return (
    <div className="space-y-6">
      <div>
        <Title>الفئات والأعداد</Title>
        <Lead>لكل مستوى تكتل تركيبته وأعداد فئاته. اختر المستوى، عدّل أرقامه، ثم احفظ مرة واحدة.</Lead>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-white/70">المستوى:</span>
          <Filters label="المستوى المعروض" value={tier.id} onChange={setTierId} items={s.tiers.map((t) => ({ key: t.id, label: t.name }))} />
        </div>
      </div>

      <TierForm key={`${tier.id}-${JSON.stringify([comp, s.categoryRules[tier.id], s.categories])}`} s={s} tier={tier} comp={comp} log={log} />

      <EditLayout
        main={
          <div>
            <Title>الفئات نفسها</Title>
            <Lead>اسم كل فئة ووزنها في مجموع فئات التكتل. لا تُحذف فئة لرئيس مجموعة يحملها.</Lead>
            <ListTable head={["الفئة", "الوزن", `حجاجها في ${tier.name}`]} minWidth="30rem">
              {s.categories.map((c) => (
                <tr key={c.id}>
                  <TitleCell
                    title={c.name}
                    onOpen={() => setEditingCat(c)}
                    actions={
                      <RowActions>
                        <RowLink onClick={() => setEditingCat(c)}>تعديل</RowLink>
                        <RowLink
                          danger
                          onClick={() => {
                            if (catUsed(c.id)) return toast({ title: `لا تُحذف «${c.name}»`, body: "رؤساء مجموعات يحملونها.", tone: "info", icon: "🔒" });
                            actions.setAdminRules({ categories: s.categories.filter((x) => x.id !== c.id) });
                            log("حذف فئة", c.name);
                          }}
                        >
                          حذف
                        </RowLink>
                      </RowActions>
                    }
                  />
                  <td className="p-3 align-top tabular-nums">{c.weight}</td>
                  <td className="p-3 align-top tabular-nums text-white/80">{seatsOf(s, tier.id, c.id).pilgrims}</td>
                </tr>
              ))}
            </ListTable>
          </div>
        }
        side={
          <>
            <Box title="إضافة فئة">
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">اسمها</span>
                <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="مثل: الخامسة" className={smallInputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">وزنها</span>
                <input type="number" min={1} value={newCat.weight} onChange={(e) => setNewCat({ ...newCat, weight: Math.max(1, Number(e.target.value) || 1) })} className={cn(smallInputClass, "text-center")} dir="ltr" aria-label="وزن الفئة" />
              </label>
              <Button
                size="sm"
                variant="gold"
                disabled={!newCat.name.trim() || s.categories.some((c) => c.name === newCat.name.trim())}
                onClick={() => {
                  const c: Category = { id: `cat-${nowMs().toString(36)}`, name: newCat.name.trim(), weight: newCat.weight };
                  actions.setAdminRules({ categories: [...s.categories, c] });
                  log("إضافة فئة", c.name, `وزنها ${c.weight}`);
                  setNewCat({ name: "", weight: 1 });
                }}
              >
                <Plus className="size-4" /> إضافة الفئة
              </Button>
            </Box>
            <Box title="إضافة مستوى تكتل">
              <input value={newTier} onChange={(e) => setNewTier(e.target.value)} placeholder="مثل: المميز" className={smallInputClass} aria-label="اسم المستوى" />
              <p className="text-xs text-white/55">يبدأ بأرقام المستوى المعروض الآن ({tier.name})، ثم تعدّلها.</p>
              <Button
                size="sm"
                variant="gold"
                disabled={!newTier.trim() || s.tiers.some((t) => t.name === newTier.trim())}
                onClick={() => {
                  const t: Tier = { id: `tier-${nowMs().toString(36)}`, name: newTier.trim() };
                  actions.setAdminRules({ tiers: [...s.tiers, t], categoryRules: { ...s.categoryRules, [t.id]: { ...s.categoryRules[tier.id] } }, composition: { ...s.composition, [t.id]: { ...comp } } });
                  log("إضافة مستوى تكتل", t.name, `بأرقام ${tier.name} مبدئياً`);
                  setNewTier("");
                  setTierId(t.id);
                }}
              >
                <Plus className="size-4" /> إضافة المستوى
              </Button>
            </Box>
            <Box title="خيارات متقدمة" open={false}>
              {s.tiers.length > 1 && (
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    if (tierUsed(tier.id)) return toast({ title: `لا يُحذف مستوى «${tier.name}»`, body: "طلب تكتل في هذا المستوى.", tone: "info", icon: "🔒" });
                    const categoryRules = Object.fromEntries(Object.entries(s.categoryRules).filter(([k]) => k !== tier.id));
                    const composition = Object.fromEntries(Object.entries(s.composition).filter(([k]) => k !== tier.id));
                    actions.setAdminRules({ tiers: s.tiers.filter((x) => x.id !== tier.id), categoryRules, composition });
                    log("حذف مستوى تكتل", tier.name);
                    setTierId(s.tiers.find((x) => x.id !== tier.id)!.id);
                  }}
                >
                  <Trash2 className="size-4" /> حذف مستوى «{tier.name}»
                </Button>
              )}
              {edited && (
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    actions.setAdminRules({ tiers: undefined, categories: undefined, categoryRules: undefined, composition: undefined });
                    log("إعادة المستويات والفئات وأعدادها إلى الأصل", "الفئات والأعداد");
                    setTierId(DEFAULT_TIERS[0].id);
                  }}
                >
                  <RotateCcw className="size-4" /> إعادة المستويات والفئات إلى الأصل
                </Button>
              )}
              {s.tiers.length <= 1 && !edited && <p className="text-xs text-white/55">لا خيارات أخرى الآن.</p>}
            </Box>
          </>
        }
      />

      <Drawer
        open={!!editingCat}
        onClose={() => setEditingCat(null)}
        title={editingCat ? `تعديل «${editingCat.name}»` : ""}
        width="max-w-md"
      >
        {editingCat && (
          <CategoryForm
            c={editingCat}
            onSave={(next) => {
              actions.setAdminRules({ categories: s.categories.map((x) => (x.id === editingCat.id ? next : x)) });
              log("تعديل فئة", next.name, `وزنها ${next.weight}`);
              setEditingCat(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

/** One tier's numbers, saved once: the cluster's composition and every category's seats and pilgrims */
function TierForm({ s, tier, comp, log }: { s: Structure; tier: Tier; comp: Composition; log: (action: string, target: string, detail?: string) => void }) {
  const toast = useToast();
  const stored = s.categoryRules[tier.id] ?? {};
  const [compDraft, setCompDraft] = useState<Composition>(comp);
  const [rows, setRows] = useState<Record<string, CategoryRule>>(stored);
  const blank: CategoryRule = { guides: 0, assistants: 0, free: 0, pilgrims: 0, active: true };
  const rowOf = (catId: string): CategoryRule => rows[catId] ?? blank;
  const compChanged = JSON.stringify(compDraft) !== JSON.stringify(comp);
  const changedCats = s.categories.filter((c) => JSON.stringify(rowOf(c.id)) !== JSON.stringify(stored[c.id] ?? blank));
  const dirty = compChanged || changedCats.length > 0;

  const save = () => {
    actions.setAdminRules({
      ...(compChanged ? { composition: { ...s.composition, [tier.id]: compDraft } } : {}),
      ...(changedCats.length ? { categoryRules: { ...s.categoryRules, [tier.id]: { ...stored, ...Object.fromEntries(changedCats.map((c) => [c.id, rowOf(c.id)])) } } } : {}),
    });
    if (compChanged) log(`تعديل تركيبة التكتل (${tier.name})`, tier.name, `مجموع الفئات ${compDraft.min}–${compDraft.max} · معاون ${compDraft.assistants} · منسق لكل ${compDraft.perCoordinator} · موجّهة لكل ${compDraft.perGuide}`);
    for (const c of changedCats) {
      const row = rowOf(c.id);
      log(`تعديل ${c.name} (${tier.name})`, c.name, `${row.pilgrims} حاجاً — ${row.guides} موجّه، ${row.assistants} معاون، ${row.free} حر`);
    }
    toast({ title: `حُفظت أرقام المستوى ${tier.name}`, tone: "success", icon: "💾" });
  };

  return (
    <div className="space-y-4">
      <SettingsSection title={`تركيبة التكتل — ${tier.name}`}>
        <SettingsRow label="مجموع الفئات" hint="مجموع فئات مجموعات التكتل (لكل فئة وزنها) يقع بين الحدين.">
          <span className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            من <NumberField label="الحد الأدنى لمجموع الفئات" value={compDraft.min} onChange={(n) => setCompDraft({ ...compDraft, min: n })} /> إلى <NumberField label="الحد الأعلى لمجموع الفئات" value={compDraft.max} onChange={(n) => setCompDraft({ ...compDraft, max: n })} />
          </span>
          {compDraft.min > compDraft.max && <span className="mt-1 block text-xs font-bold text-gold">الحد الأدنى أكبر من الأعلى.</span>}
        </SettingsRow>
        <SettingsRow label="معاون التكتل" hint="عدد ثابت.">
          <NumberField label="معاون التكتل (عدد ثابت)" value={compDraft.assistants} onChange={(n) => setCompDraft({ ...compDraft, assistants: n })} />
        </SettingsRow>
        <SettingsRow label="منسق واحد لكل" hint="وحدات من مجموع الفئات.">
          <NumberField label="وحدات الفئات لكل منسق" value={compDraft.perCoordinator} onChange={(n) => setCompDraft({ ...compDraft, perCoordinator: n })} />
        </SettingsRow>
        <SettingsRow label="موجّهة واحدة لكل" hint="وحدات من مجموع الفئات.">
          <NumberField label="وحدات الفئات لكل موجّهة" value={compDraft.perGuide} onChange={(n) => setCompDraft({ ...compDraft, perGuide: n })} />
        </SettingsRow>
      </SettingsSection>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-gold">فئات المجموعات — {tier.name}</h2>
        <ListTable head={["الفئة", "الموجّهون", "المعاونون", "بدور حر", "الحجاج", "أعضاؤها مع الرئيس", "نشطة"]} minWidth="44rem">
          {s.categories.map((c) => {
            const row = rowOf(c.id);
            const set = (patch: Partial<CategoryRule>) => setRows({ ...rows, [c.id]: { ...row, ...patch } });
            return (
              <tr key={c.id} className={cn(!row.active && "opacity-60")}>
                <td className="p-3 align-middle font-bold">
                  {c.name} <span className="text-xs font-normal text-white/50">— وزنها {c.weight}</span>
                </td>
                <td className="p-2">
                  <NumberField label={`عدد الموجّهين — ${c.name}`} value={row.guides} onChange={(v) => set({ guides: v })} />
                </td>
                <td className="p-2">
                  <NumberField label={`عدد المعاونين — ${c.name}`} value={row.assistants} onChange={(v) => set({ assistants: v })} />
                </td>
                <td className="p-2">
                  <NumberField label={`أعضاء بدور حر — ${c.name}`} value={row.free} onChange={(v) => set({ free: v })} />
                </td>
                <td className="p-2">
                  <NumberField label={`عدد الحجاج — ${c.name}`} value={row.pilgrims} onChange={(v) => set({ pilgrims: v })} />
                </td>
                <td className="p-3 align-middle tabular-nums text-white/70">{1 + row.guides + row.assistants + row.free}</td>
                <td className="p-3 align-middle">
                  <input type="checkbox" checked={row.active} onChange={(e) => set({ active: e.target.checked })} aria-label={`${c.name} نشطة`} className="size-4 accent-[#D9C89E]" />
                </td>
              </tr>
            );
          })}
        </ListTable>
      </section>

      <SaveLine dirty={dirty} disabled={compDraft.min > compDraft.max} onSave={save} label={`حفظ أرقام ${tier.name}`} />
    </div>
  );
}

function CategoryForm({ c, onSave }: { c: Category; onSave: (c: Category) => void }) {
  const [d, setD] = useState(c);
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">اسم الفئة</span>
        <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className={smallInputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">وزنها في مجموع فئات التكتل</span>
        <input type="number" min={1} value={d.weight} onChange={(e) => setD({ ...d, weight: Math.max(1, Number(e.target.value) || 1) })} className={cn(smallInputClass, "text-center")} dir="ltr" />
      </label>
      <Button variant="gold" disabled={!d.name.trim() || (d.name === c.name && d.weight === c.weight)} onClick={() => onSave({ ...d, name: d.name.trim() })}>
        حفظ
      </Button>
    </div>
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
    <EditLayout
      main={
        <div>
          <Title>الفروع والمكاتب</Title>
          <Lead>بها يصفّي رئيس التكتل الأسماء حين يختار مجموعاته وكادره من فرعه وفروعه الإضافية.</Lead>
          <ListTable head={["الفرع", "المرتبطون", "الحالة"]} minWidth="30rem">
            {s.branches.map((b) => (
              <tr key={b.id} className={cn(!b.active && "opacity-60")}>
                <TitleCell
                  title={b.name}
                  actions={
                    <RowActions>
                      <RowLink danger={b.active} onClick={() => save(s.branches.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)), b.active ? "تعطيل فرع" : "تفعيل فرع", b.name)}>
                        {b.active ? "تعطيل" : "تفعيل"}
                      </RowLink>
                      <RowLink
                        danger
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
                        حذف
                      </RowLink>
                    </RowActions>
                  }
                />
                <td className="p-3 align-top tabular-nums text-white/80">{linked(b)} إداري</td>
                <td className="p-3 align-top">{b.active ? <Tag tone="green">نشط</Tag> : <Tag tone="maroon">معطّل</Tag>}</td>
              </tr>
            ))}
          </ListTable>
          <p className="mt-3 text-xs text-white/55">لا يُحذف فرع مرتبط بإداريين: انقلهم إلى فرع آخر من «الكادر الإداري» أولاً.</p>
        </div>
      }
      side={
        <>
          <Box title="إضافة فرع">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الفرع" className={smallInputClass} aria-label="اسم فرع جديد" />
            <Button
              size="sm"
              variant="gold"
              disabled={!name.trim() || s.branches.some((b) => b.name === name.trim())}
              onClick={() => {
                save([...s.branches, { id: name.trim(), name: name.trim(), active: true }], "إضافة فرع", name.trim());
                setName("");
              }}
            >
              <Plus className="size-4" /> إضافة الفرع
            </Button>
          </Box>
          {branchesEdited && (
            <Box title="خيارات متقدمة" open={false}>
              <Button size="sm" variant="glass" onClick={() => save(DEFAULT_BRANCHES, "إعادة الفروع إلى الأصل", `${DEFAULT_BRANCHES.length} فروع`)}>
                <RotateCcw className="size-4" /> إعادة الفروع إلى الأصل
              </Button>
            </Box>
          )}
        </>
      }
    />
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
    <EditLayout
      main={
        <div>
          <Title>التسميات الموسمية الجاهزة</Title>
          <Lead>اقتراحات لاسم يُعرض مع الصفة الموسمية حين تُمنح لشخص من ملفه في «الكادر الإداري».</Lead>
          <ListTable head={["التسمية", "تُقترح لـ", "الحالة"]} minWidth="30rem">
            {s.labels.length === 0 && <EmptyRow cols={3}>لا تسميات بعد.</EmptyRow>}
            {s.labels.map((l) => (
              <tr key={l.id} className={cn(!l.active && "opacity-60")}>
                <TitleCell
                  title={l.label}
                  actions={
                    <RowActions>
                      <RowLink danger={l.active} onClick={() => save(s.labels.map((x) => (x.id === l.id ? { ...x, active: !x.active } : x)), l.active ? "تعطيل تسمية" : "تفعيل تسمية", l.label)}>
                        {l.active ? "تعطيل" : "تفعيل"}
                      </RowLink>
                      <RowLink danger onClick={() => save(s.labels.filter((x) => x.id !== l.id), "حذف تسمية موسمية", l.label)}>
                        حذف
                      </RowLink>
                    </RowActions>
                  }
                />
                <td className="p-3 align-top text-white/80">{roleName(l.base, s)}</td>
                <td className="p-3 align-top">{l.active ? <Tag tone="green">نشطة</Tag> : <Tag tone="maroon">معطّلة</Tag>}</td>
              </tr>
            ))}
          </ListTable>
        </div>
      }
      side={
        <>
          <Box title="إضافة تسمية">
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">التسمية</span>
              <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="مثال: معاون - مكتب سياحي" className={smallInputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">تُقترح لصفة</span>
              <select value={draft.base} onChange={(e) => setDraft({ ...draft, base: e.target.value })} aria-label="تُقترح لـ" className={cn(smallInputClass, "[&>option]:text-ink")}>
                {s.roles.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              size="sm"
              variant="gold"
              disabled={!draft.label.trim() || s.labels.some((l) => l.label === draft.label.trim())}
              onClick={() => {
                save([...s.labels, { ...draft, id: `l-${nowMs().toString(36)}`, label: draft.label.trim() }], "إضافة تسمية موسمية", draft.label.trim());
                setDraft({ ...draft, label: "" });
              }}
            >
              <Plus className="size-4" /> إضافة التسمية
            </Button>
          </Box>
          {labelsEdited && (
            <Box title="خيارات متقدمة" open={false}>
              <Button size="sm" variant="glass" onClick={() => save(DEFAULT_LABELS, "إعادة التسميات إلى الأصل", `${DEFAULT_LABELS.length} تسميات`)}>
                <RotateCcw className="size-4" /> إعادة التسميات إلى الأصل
              </Button>
            </Box>
          )}
        </>
      }
    />
  );
}
