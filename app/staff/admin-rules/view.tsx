"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarRange, Check, ClipboardList, Languages, ListChecks, Pencil, Plus, RotateCcw, ScrollText, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore, type AdminRules } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES, COMMITMENTS, FIXED_CRITERIA, POSITIONS, criteriaCatalog, criterionLabel, type RoleRequirements } from "@/app/administrator/_lib/admin";
import { SEASON_VALIDITY, useAdminCalendar, useCommitments, useDocTypes, useEvaluationStages, useLanguages, useRoleRequirements, useRoles, useSkills } from "@/app/administrator/_lib/admin-rules";
import { can } from "@/lib/staff";
import { Gate, Kpi, PageHeader, Panel, Tabs, canAny, logAs, smallInputClass, textareaClass, useStaffUser } from "../_components/kit";

type Tab = "roles" | "requirements" | "catalog" | "stages" | "calendar";

/** The rules that belong to «إدارة الامتحان»: this page neither counts nor resets them */
const EXAM_KEYS: readonly (keyof AdminRules)[] = ["exam", "blueprints", "questionsAdded", "questionsOff", "questionEdits", "questionRoles"];

const CHIP = {
  green: "bg-green-light/25 text-white ring-green-light/40",
  gold: "bg-gold/20 text-gold ring-gold/40",
  maroon: "bg-maroon/40 text-white ring-maroon/60",
} as const;

function Chip({ tone = "gold", children }: { tone?: keyof typeof CHIP; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1", CHIP[tone])}>{children}</span>;
}

/**
 * Everything about the administrators that is not a number in the season settings: which roles are
 * open and what each asks, what the applicant commits to, the evaluation stages and the calendar. The
 * exam and its question bank have their own page (/staff/exam). The platform ships defaults and the
 * administration edits them here; the administrator portal reads the result.
 */
export function AdminRulesView() {
  return (
    <Gate perms={["season.settings", "administrators.manage", "administrators.catalog"]}>
      <AdminRules />
    </Gate>
  );
}

function AdminRules() {
  const user = useStaffUser()!;
  const toast = useToast();
  // The rules belong to the season and the administrators' affairs; the lists of the administrator's file
  // (certificates, skills, languages) to whoever holds «قوائم ملف الإداري» — each sees the tabs he may edit
  const rulesAllowed = canAny(user, ["season.settings", "administrators.manage"]);
  const listsAllowed = can(user, "administrators.catalog");
  const [tab, setTab] = useState<Tab>(rulesAllowed ? "roles" : "catalog");
  const rules = useStore((s) => s.adminRules);
  const roles = useRoles();
  const commitments = useCommitments();
  const stages = useEvaluationStages();
  const calendar = useAdminCalendar();
  // A rule set back to its default is stored as undefined, so it does not count as edited. The exam's
  // rules and bank live on their own page, which resets them on its own
  const edited = Object.entries(rules).filter(([k, v]) => v !== undefined && !EXAM_KEYS.includes(k as keyof AdminRules)).length;

  return (
    <div>
      <PageHeader
        eyebrow="الجزء الثاني — الإداريون الموسميون"
        icon={<ScrollText />}
        title="قواعد الإداريين"
        description="ما يراه الإداري في بوابته يبدأ من هنا: الصفات المفتوحة هذا الموسم وجدول شروط كل صفة، والالتزامات التي يوقّع عليها، ومراحل تقييمه ورزنامتها. تُعدَّل هنا فتظهر عنده في الموسم نفسه. أما الامتحان وبنك أسئلته ففي «إدارة الامتحان»."
        actions={
          rulesAllowed && edited > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              onClick={() => {
                actions.resetAdminRules(EXAM_KEYS);
                logAs(user, { action: "إعادة قواعد الإداريين إلى الأصل", target: "موسم 1448" });
                toast({ title: "أُعيدت القواعد الافتراضية", tone: "info", icon: "↩️" });
              }}
            >
              <RotateCcw className="size-4" /> إعادة الكل إلى الأصل
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="الصفات المفتوحة" value={roles.length} icon={<UsersRound />} tone="teal" hint={`من ${POSITIONS.length} صفة`} />
        <Kpi label="الالتزامات" value={commitments.length} icon={<ClipboardList />} tone="maroon" delay={0.05} hint="يوقّع عليها كل متقدم" />
        <Kpi label="مراحل التقييم" value={stages.length} icon={<ListChecks />} delay={0.1} hint="يُقيَّم فيها الإداري خلال الموسم" />
        <Kpi label="مواعيد الرزنامة" value={calendar.length} icon={<CalendarRange />} tone="gold" delay={0.15} hint="يراها الإداري في بوابته" />
      </div>

      <div className="mt-6">
        <Tabs
          id="admin-rules"
          value={tab}
          onChange={setTab}
          tabs={[
            ...(rulesAllowed
              ? ([
                  { value: "roles", label: "الصفات والالتزامات" },
                  { value: "requirements", label: "شروط الصفات" },
                ] as const)
              : []),
            ...(listsAllowed ? ([{ value: "catalog", label: "الشهادات والمهارات واللغات" }] as const) : []),
            ...(rulesAllowed
              ? ([
                  { value: "stages", label: "مراحل التقييم" },
                  { value: "calendar", label: "رزنامة الإداريين" },
                ] as const)
              : []),
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="mt-4 space-y-4">
          {tab === "roles" && <RolesAndCommitments />}
          {tab === "requirements" && <Requirements />}
          {tab === "catalog" && <Catalog />}
          {tab === "stages" && <Stages />}
          {tab === "calendar" && <Calendar />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Roles and commitments ─────────────────────────

function RolesAndCommitments() {
  const user = useStaffUser()!;
  const toast = useToast();
  const off = useStore((s) => s.adminRules.rolesOff) ?? [];
  const desc = useStore((s) => s.adminRules.roleDesc) ?? {};
  const cOff = useStore((s) => s.adminRules.commitmentsOff) ?? [];
  const cEdits = useStore((s) => s.adminRules.commitmentEdits) ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [cEditing, setCEditing] = useState<string | null>(null);
  const [cDraft, setCDraft] = useState({ label: "", detail: "" });

  const toggleRole = (key: string, label: string) => {
    const on = off.includes(key);
    actions.setAdminRules({ rolesOff: on ? off.filter((x) => x !== key) : [...off, key] });
    logAs(user, { action: on ? "فتح صفة للتقدم هذا الموسم" : "إغلاق صفة عن التقدم هذا الموسم", target: label });
    toast({ title: on ? `فُتحت صفة ${label}` : `أُغلقت صفة ${label}`, body: on ? "تظهر في طلب المشاركة." : "لا تظهر في طلب المشاركة هذا الموسم.", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
  };

  return (
    <div className="space-y-4">
      <Panel icon={<UsersRound />} title="الصفات المتاحة للتقدم" action={<Chip tone={off.length ? "maroon" : "green"}>{POSITIONS.length - off.length} من {POSITIONS.length}</Chip>}>
        <p className="text-sm leading-7 text-white/70">
          رئاسة التكتل ومعاونها لا يُتقدَّم إليهما أصلاً: الأولى بالانتخاب والثانية باختيار الرئيس المنتخب، فتبقيان خارج قائمة التقدم مهما فُتحتا.
        </p>
        <ul className="mt-4 space-y-2">
          {POSITIONS.map((p) => {
            const disabled = off.includes(p.key);
            return (
              <li key={p.key} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                      {p.label}
                      {p.elected && <Chip tone="gold">بالانتخاب — لا يُتقدَّم إليها</Chip>}
                      {desc[p.key] && <Chip>وصف معدَّل</Chip>}
                    </p>
                    {editing === p.key ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(smallInputClass, "min-w-0 flex-1")} aria-label={`وصف ${p.label}`} />
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => {
                            actions.setAdminRules({ roleDesc: { ...desc, [p.key]: draft.trim() || p.desc } });
                            logAs(user, { action: "تعديل وصف صفة", target: p.label, after: draft.trim().slice(0, 60) });
                            setEditing(null);
                            toast({ title: "حُفظ الوصف", tone: "success", icon: "✍️" });
                          }}
                        >
                          حفظ
                        </Button>
                        <Button size="sm" variant="ghost" className="text-white" onClick={() => setEditing(null)}>
                          إلغاء
                        </Button>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs leading-6 text-white/65">{desc[p.key] ?? p.desc}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                      onClick={() => {
                        setEditing(p.key);
                        setDraft(desc[p.key] ?? p.desc);
                      }}
                    >
                      الوصف
                    </Button>
                    <Button size="sm" variant={disabled ? "primary" : "ghost"} className={disabled ? "" : "text-white hover:bg-maroon/40"} onClick={() => toggleRole(p.key, p.label)}>
                      {disabled ? "فتح" : "إغلاق"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel icon={<ClipboardList />} title="التزامات الإداري" action={<Chip tone={cOff.length ? "maroon" : "green"}>{COMMITMENTS.length - cOff.length} التزاماً</Chip>}>
        <p className="text-sm leading-7 text-white/70">يوقّع عليها كل متقدم إلكترونياً مع تاريخها، وتُحفظ في استمارة تسجيله.</p>
        <ul className="mt-4 space-y-2">
          {COMMITMENTS.map((c) => {
            const disabled = cOff.includes(c.key);
            const label = cEdits[c.key]?.label ?? c.label;
            const detail = cEdits[c.key]?.detail ?? c.detail;
            return (
              <li key={c.key} className={cn("rounded-2xl p-3 ring-1", disabled ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                {cEditing === c.key ? (
                  <div className="space-y-2">
                    <input value={cDraft.label} onChange={(e) => setCDraft({ ...cDraft, label: e.target.value })} className={smallInputClass} aria-label="نص الالتزام" />
                    <textarea rows={2} value={cDraft.detail} onChange={(e) => setCDraft({ ...cDraft, detail: e.target.value })} className={textareaClass} aria-label="تفصيل الالتزام" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={() => {
                          actions.setAdminRules({ commitmentEdits: { ...cEdits, [c.key]: { label: cDraft.label.trim() || c.label, detail: cDraft.detail.trim() || c.detail } } });
                          logAs(user, { action: "تعديل التزام على الإداريين", target: cDraft.label.trim().slice(0, 60) });
                          setCEditing(null);
                          toast({ title: "حُفظ الالتزام", tone: "success", icon: "✍️" });
                        }}
                      >
                        حفظ
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white" onClick={() => setCEditing(null)}>
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-bold", disabled ? "text-white/50 line-through" : "text-white")}>{label}</p>
                      <p className="text-xs leading-6 text-white/65">{detail}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                        onClick={() => {
                          setCEditing(c.key);
                          setCDraft({ label, detail });
                        }}
                      >
                        تعديل
                      </Button>
                      <Button
                        size="sm"
                        variant={disabled ? "primary" : "ghost"}
                        className={disabled ? "" : "text-white hover:bg-maroon/40"}
                        onClick={() => {
                          const on = cOff.includes(c.key);
                          actions.setAdminRules({ commitmentsOff: on ? cOff.filter((x) => x !== c.key) : [...cOff, c.key] });
                          logAs(user, { action: on ? "إعادة التزام إلى الطلب" : "إسقاط التزام من الطلب", target: label });
                          toast({ title: on ? "أُعيد الالتزام" : "أُسقط الالتزام", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
                        }}
                      >
                        {disabled ? "إعادة" : "إسقاط"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

// ───────────────────────── Calendar ─────────────────────────

function Calendar() {
  const user = useStaffUser()!;
  const toast = useToast();
  const rows = useAdminCalendar();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ hijri: "", title: "", detail: "" });

  const write = (next: { hijri: string; title: string; detail: string }[], action: string, target?: string) => {
    actions.setAdminRules({ calendar: next });
    logAs(user, { action, target });
  };

  return (
    <Panel
      icon={<CalendarRange />}
      title="رزنامة الإداريين"
      action={
        <Button
          size="sm"
          variant="gold"
          onClick={() => {
            write([...rows, { hijri: "تاريخ جديد", title: "مرحلة جديدة", detail: "" }], "إضافة مرحلة إلى رزنامة الإداريين");
            toast({ title: "أُضيفت مرحلة", body: "عدّل تاريخها وعنوانها.", tone: "success", icon: "🗓️" });
          }}
        >
          <Plus className="size-4" /> مرحلة
        </Button>
      }
    >
      <p className="text-sm leading-7 text-white/70">هذه المواعيد يراها الإداري في بوابته. ما تكتبه هنا هو ما يظهر عنده.</p>
      <ul className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <li key={`${r.title}-${i}`} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            {editing === i ? (
              <div className="space-y-2">
                <input value={draft.hijri} onChange={(e) => setDraft({ ...draft, hijri: e.target.value })} className={smallInputClass} aria-label="التاريخ الهجري" />
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={smallInputClass} aria-label="عنوان المرحلة" />
                <textarea rows={2} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} className={textareaClass} aria-label="تفصيل المرحلة" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      write(rows.map((x, j) => (j === i ? { ...draft } : x)), "تعديل مرحلة في رزنامة الإداريين", draft.title);
                      setEditing(null);
                      toast({ title: "حُفظت المرحلة", tone: "success", icon: "🗓️" });
                    }}
                  >
                    حفظ
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={() => setEditing(null)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gold">{r.hijri}</p>
                  <p className="font-bold text-white">{r.title}</p>
                  {r.detail && <p className="text-xs leading-6 text-white/65">{r.detail}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      setEditing(i);
                      setDraft({ hijri: r.hijri, title: r.title, detail: r.detail });
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-maroon/40"
                    aria-label={`حذف ${r.title}`}
                    onClick={() => {
                      write(rows.filter((_, j) => j !== i), "حذف مرحلة من رزنامة الإداريين", r.title);
                      toast({ title: "حُذفت المرحلة", tone: "info", icon: "🗑️" });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ───────────────────────── Evaluation stages ─────────────────────────

/**
 * An administrator is scored stage by stage, so the administration decides what the stages are.
 * The evaluation screen renders exactly this list.
 */
function Stages() {
  const user = useStaffUser()!;
  const toast = useToast();
  const stages = useEvaluationStages();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ label: "", hint: "" });

  const write = (next: { key: string; label: string; hint: string }[], action: string, target?: string) => {
    actions.setAdminRules({ stages: next });
    logAs(user, { action, target });
  };

  return (
    <Panel
      icon={<ClipboardList />}
      title="مراحل تقييم الإداري"
      action={
        <Button
          size="sm"
          variant="gold"
          onClick={() => {
            write([...stages, { key: `stage-${Date.now()}`, label: "مرحلة جديدة", hint: "" }], "إضافة مرحلة إلى تقييم الإداريين");
            toast({ title: "أُضيفت مرحلة", body: "عدّل اسمها ووصفها.", tone: "success", icon: "➕" });
          }}
        >
          <Plus className="size-4" /> مرحلة
        </Button>
      }
    >
      <p className="text-sm leading-7 text-white/70">
        الإداري يُقيَّم في كل مرحلة على حدة بدرجة من 5 وملاحظة ودليل، لأن عمله في المطارات غير عمله في المشاعر. هذه القائمة هي ما يظهر في شاشة التقييم.
      </p>
      <ul className="mt-4 space-y-2">
        {stages.map((st, i) => (
          <li key={st.key} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            {editing === i ? (
              <div className="space-y-2">
                <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={smallInputClass} aria-label="اسم المرحلة" />
                <input value={draft.hint} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} className={smallInputClass} aria-label="وصف المرحلة" />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gold"
                    onClick={() => {
                      write(stages.map((x, j) => (j === i ? { ...x, label: draft.label.trim() || x.label, hint: draft.hint.trim() } : x)), "تعديل مرحلة في تقييم الإداريين", draft.label);
                      setEditing(null);
                      toast({ title: "حُفظت المرحلة", tone: "success", icon: "✍️" });
                    }}
                  >
                    حفظ
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white" onClick={() => setEditing(null)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-bold text-white">
                    <span className="grid size-6 place-items-center rounded-lg bg-white/10 text-xs text-gold">{i + 1}</span>
                    {st.label}
                  </p>
                  {st.hint && <p className="mt-0.5 text-xs leading-6 text-white/65">{st.hint}</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      setEditing(i);
                      setDraft({ label: st.label, hint: st.hint });
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-maroon/40"
                    aria-label={`حذف ${st.label}`}
                    onClick={() => {
                      write(stages.filter((_, j) => j !== i), "حذف مرحلة من تقييم الإداريين", st.label);
                      toast({ title: "حُذفت المرحلة", tone: "info", icon: "🗑️" });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// ───────────────────────── Role requirements ─────────────────────────

type Cell = number | string | boolean | undefined;

function cellText(id: string, v: Cell) {
  if (v === undefined || v === false || v === "") return "—";
  if (id === "gender") return v === "M" ? "ذكور" : "إناث";
  if (v === "required") return "مطلوبة";
  if (v === "preferred") return "تقوّي الطلب";
  return String(v);
}

/** A file row cycles: not asked → required → strengthens the application → not asked */
const NEXT_LEVEL: Record<string, Cell> = { none: "required", required: "preferred", preferred: undefined };

/**
 * What each role asks of the administrator this season, as one table: a column per role, a row per
 * condition. Each role has its own documents and certificates, some shared with other roles; for each
 * role a document is required, strengthens the application, or is not asked. The administration sets
 * the table again every season and may add certificates of its own. The administrator portal applies
 * it: a role that does not fit him is locked, and eligibility is checked before he pays.
 */
function Requirements() {
  const user = useStaffUser()!;
  const toast = useToast();
  const table = useRoleRequirements();
  const { types } = useDocTypes();
  const { skills } = useSkills();
  const { languages } = useLanguages();
  const stored = useStore((s) => s.adminRules.requirements);
  const added = useStore((s) => s.adminRules.docTypes) ?? [];
  const off = useStore((s) => s.adminRules.rolesOff) ?? [];
  const [adding, setAdding] = useState("");
  const [cert, setCert] = useState<{ label: string; hint: string; valid: string } | null>(null);
  const label = (id: string) => criterionLabel(id, types);
  const free = criteriaCatalog(types, skills, languages).map((g) => ({ ...g, ids: g.ids.filter((id) => !table.rows.includes(id)) })).filter((g) => g.ids.length);

  /** A certificate the platform's list does not have: named by the administration, with its validity, and added as a row */
  const addCertificate = () => {
    if (!cert?.label.trim()) return;
    const valid = Math.max(0, Math.min(9, Math.round(Number(cert.valid) || 0)));
    const key = `cert-${Date.now()}`;
    actions.setAdminRules({
      docTypes: [...added, { key, label: cert.label.trim(), hint: cert.hint.trim() || "صورة واضحة أو PDF", validSeasons: valid }],
      requirements: { rows: [...table.rows, `doc:${key}`], cells: table.cells },
    });
    logAs(user, { action: "إضافة شهادة جديدة إلى جدول شروط الصفات", target: cert.label.trim(), detail: valid ? `سارية ${valid} مواسم` : "لا تنتهي" });
    toast({ title: "أُضيفت الشهادة", body: `${cert.label.trim()} — حدّد لكل صفة: مطلوبة أو تقوّي الطلب.`, tone: "success", icon: "🏅" });
    setCert(null);
  };

  const write = (next: RoleRequirements, e: { action: string; target?: string; before?: string; after?: string }) => {
    actions.setAdminRules({ requirements: next });
    logAs(user, e);
  };

  const setCell = (role: { key: string; label: string }, id: string, value: Cell) => {
    const col = { ...(table.cells[role.key] ?? {}) };
    const before = cellText(id, col[id]);
    if (value === undefined || value === false || value === "") delete col[id];
    else col[id] = value;
    if (before === cellText(id, value)) return;
    write({ rows: table.rows, cells: { ...table.cells, [role.key]: col } }, { action: "تعديل شرط في جدول شروط الصفات", target: `${role.label} — ${label(id)}`, before, after: cellText(id, value) });
    toast({ title: `حُفظ: ${role.label}`, body: `${label(id)}: ${cellText(id, value)}`, tone: "success", icon: "💾" });
  };

  const addRow = (id: string) => {
    write({ rows: [...table.rows, id], cells: table.cells }, { action: "إضافة شرط إلى جدول شروط الصفات", target: label(id) });
    setAdding("");
    toast({ title: "أُضيف الشرط", body: `${label(id)} — حدّد لكل صفة: مطلوبة أو تقوّي الطلب.`, tone: "success", icon: "➕" });
  };

  const removeRow = (id: string) => {
    const cells = Object.fromEntries(Object.entries(table.cells).map(([k, col]) => [k, Object.fromEntries(Object.entries(col).filter(([c]) => c !== id))]));
    write({ rows: table.rows.filter((r) => r !== id), cells }, { action: "حذف شرط من جدول شروط الصفات", target: label(id) });
    toast({ title: "حُذف الشرط", body: label(id), tone: "info", icon: "🗑️" });
  };

  return (
    <Panel
      icon={<ListChecks />}
      title="شروط الصفات — موسم 1448"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={stored ? "green" : "gold"}>{stored ? "معدَّل هذا الموسم" : "القيم الافتراضية"}</Chip>
          {stored && (
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => {
                actions.setAdminRules({ requirements: undefined });
                logAs(user, { action: "إعادة جدول شروط الصفات إلى الأصل", target: "موسم 1448" });
                toast({ title: "أُعيد الجدول إلى الأصل", tone: "info", icon: "↩️" });
              }}
            >
              <RotateCcw className="size-4" /> الأصل
            </Button>
          )}
        </div>
      }
    >
      <p className="text-sm leading-7 text-white/70">
        لكل صفة عمود، ولكل شرط سطر. لكل صفة وثائقها وشهاداتها، وبعضها مشترك: اضغط الخانة لتنتقل بين «مطلوبة» (لا يُقدَّم الطلب دونها) و«تقوّي الطلب» (تظهر للمتقدم ولا تمنعه) و«—» (لا تطلبها الصفة). تطبّق بوابة الإداريين الجدول على كل متقدم: تُقفل الصفة التي لا يناسبها عمره أو جنسه أو خبرته، ولا يدفع الرسم قبل أن يستوفي كل ما هو «مطلوب» لصفته. يُضبط الجدول لكل موسم من جديد.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-white/10">
        <table className="w-full min-w-[760px] text-right text-sm">
          <thead className="bg-white/[.08] text-white">
            <tr>
              <th className="p-3 font-bold">الشرط</th>
              {APPLIED_ROLES.map((r) => (
                <th key={r.key} className="p-3 text-center font-bold">
                  {r.label}
                  {off.includes(r.key) && <span className="mt-1 block text-[11px] font-normal text-white/50">مغلقة هذا الموسم</span>}
                </th>
              ))}
              <th className="w-12 p-3" aria-label="حذف" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((id) => {
              const fixed = (FIXED_CRITERIA as readonly string[]).includes(id);
              const kind = id.startsWith("doc:") ? "وثيقة" : id.startsWith("skill:") ? "مهارة" : id.startsWith("lang:") ? "لغة" : null;
              return (
                <tr key={id} className="border-t border-white/10">
                  <td className="p-3">
                    <span className="font-bold text-white">{label(id)}</span>
                    {kind && <span className="mr-2 text-[11px] text-gold">{kind}</span>}
                  </td>
                  {APPLIED_ROLES.map((r) => {
                    const v = table.cells[r.key]?.[id];
                    return (
                      <td key={r.key} className={cn("p-2 text-center", off.includes(r.key) && "opacity-50")}>
                        {id === "gender" ? (
                          <select
                            value={typeof v === "string" ? v : ""}
                            onChange={(e) => setCell(r, id, e.target.value || undefined)}
                            className={cn(smallInputClass, "h-9 px-2 text-sm [&>option]:text-ink")}
                            aria-label={`${label(id)} — ${r.label}`}
                          >
                            <option value="">الكل</option>
                            <option value="M">ذكور</option>
                            <option value="F">إناث</option>
                          </select>
                        ) : fixed ? (
                          <NumCell key={`${id}-${String(v)}`} value={typeof v === "number" ? v : undefined} label={`${label(id)} — ${r.label}`} onCommit={(n) => setCell(r, id, n)} />
                        ) : (
                          <button
                            type="button"
                            aria-label={`${label(id)} — ${r.label}: ${cellText(id, v)}`}
                            onClick={() => setCell(r, id, NEXT_LEVEL[v === "required" || v === "preferred" ? v : "none"])}
                            className={cn(
                              "inline-flex h-9 min-w-24 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition",
                              v === "required" ? "bg-green-light text-white" : v === "preferred" ? "bg-gold/25 text-gold ring-1 ring-gold/50" : "bg-white/[.06] text-white/40 ring-1 ring-white/15 hover:bg-white/10",
                            )}
                          >
                            {v === "required" && <Check className="size-3.5" />}
                            {cellText(id, v)}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-2 text-center">
                    {!fixed && (
                      <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" aria-label={`حذف ${label(id)}`} onClick={() => removeRow(id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {free.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select value={adding} onChange={(e) => setAdding(e.target.value)} className={cn(smallInputClass, "w-auto min-w-64 flex-1 sm:flex-none [&_option]:text-ink")} aria-label="شرط جديد">
            <option value="">اختر شرطاً من ملف الإداري...</option>
            {free.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.ids.map((id) => (
                  <option key={id} value={id}>
                    {label(id)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Button size="sm" variant="gold" disabled={!adding} onClick={() => addRow(adding)}>
            <Plus className="size-4" /> إضافة شرط
          </Button>
        </div>
      )}
      {cert ? (
        <div className="mt-4 space-y-2 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
          <p className="font-bold text-white">شهادة جديدة لا توجد في القائمة</p>
          <input value={cert.label} onChange={(e) => setCert({ ...cert, label: e.target.value })} placeholder="اسم الشهادة، مثل: شهادة تجويد القرآن الكريم" className={smallInputClass} aria-label="اسم الشهادة" />
          <input value={cert.hint} onChange={(e) => setCert({ ...cert, hint: e.target.value })} placeholder="ملاحظة للمتقدم (اختيارية)" className={smallInputClass} aria-label="ملاحظة للمتقدم" />
          <label className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            تبقى سارية
            <span className="w-20 shrink-0"><input inputMode="numeric" value={cert.valid} onChange={(e) => setCert({ ...cert, valid: e.target.value })} className={cn(smallInputClass, "px-1 text-center")} aria-label="مدة الصلاحية بالمواسم" /></span>
            مواسم (0 = لا تنتهي)
          </label>
          <div className="flex gap-2">
            <Button size="sm" variant="gold" disabled={!cert.label.trim()} onClick={addCertificate}>
              <Plus className="size-4" /> إضافة إلى الجدول
            </Button>
            <Button size="sm" variant="ghost" className="text-white" onClick={() => setCert(null)}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setCert({ label: "", hint: "", valid: "0" })} className="mt-3 flex items-center gap-2 text-sm font-semibold text-gold underline">
          <Plus className="size-4" /> شهادة جديدة لا توجد في القائمة
        </button>
      )}
      <p className="mt-4 text-xs leading-6 text-white/55">
        صفتا رئيس التكتل ومعاونه خارج الجدول: الأولى بالانتخاب بشروط الترشح في إعدادات الموسم، والثانية باختيار الرئيس المنتخب. أدنى تقييم للاستمرار في الصفة نفسها من إعدادات الموسم أيضاً.
      </p>
    </Panel>
  );
}

/** A number in the table, saved when the field is left (not on every keystroke); empty = no condition */
function NumCell({ value, label, onCommit }: { value: number | undefined; label: string; onCommit: (n: number | undefined) => void }) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const commit = () => {
    const t = draft.trim();
    const n = Number(t);
    if (t === "") onCommit(undefined);
    else if (Number.isFinite(n) && n >= 0 && n <= 99) onCommit(Math.round(n));
    else setDraft(value === undefined ? "" : String(value));
  };
  return (
    <input
      inputMode="numeric"
      value={draft}
      placeholder="—"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn(smallInputClass, "mx-auto h-9 w-16 px-1 text-center font-display")}
      aria-label={label}
    />
  );
}

// ───────────────────────── The lists of the administrator's file ─────────────────────────

const VALIDITY_TEXT = (n: number) => (n === 0 ? "لا تنتهي" : n === 1 ? "تُجدَّد كل موسم" : `سارية ${n} مواسم`);

/**
 * What an administrator can be asked for this season: the certificates and documents (and how long each
 * stays valid), the skills and the languages. Whoever holds «قوائم ملف الإداري» keeps them. They are what
 * the administrator sees in his application, and the only rows «شروط الصفات» can ask for. An entry a role
 * still asks for cannot be set aside or deleted until it is taken out of that table.
 */
function Catalog() {
  const user = useStaffUser()!;
  const toast = useToast();
  const table = useRoleRequirements();
  const { all: docs } = useDocTypes();
  const { all: skills } = useSkills();
  const { all: langs } = useLanguages();
  const rules = useStore((s) => s.adminRules);
  const [docDraft, setDocDraft] = useState<{ key: string | null; label: string; hint: string; valid: string } | null>(null);
  const [skill, setSkill] = useState({ label: "", emoji: "" });
  const [lang, setLang] = useState("");

  const usedBy = (id: string) =>
    APPLIED_ROLES.flatMap((r) => {
      const v = table.rows.includes(id) ? table.cells[r.key]?.[id] : undefined;
      return v === "required" || v === "preferred" ? [`${r.label} (${v === "required" ? "مطلوبة" : "تقوّي"})`] : [];
    });
  /** Nothing a role still asks for may disappear from the application */
  const free = (id: string, label: string) => {
    const by = usedBy(id);
    if (!by.length) return true;
    toast({ title: "تطلبها صفات في «شروط الصفات»", body: `${label}: ${by.join("، ")}. احذفها من الجدول أولاً.`, tone: "warning", icon: "⛔" });
    return false;
  };
  const toggle = (field: "docsOff" | "skillsOff" | "languagesOff", key: string, label: string, kind: string) => {
    const off = rules[field] ?? [];
    const on = off.includes(key);
    if (!on && !free(`${kind}:${key}`, label)) return;
    actions.setAdminRules({ [field]: on ? off.filter((x) => x !== key) : [...off, key] });
    logAs(user, { action: on ? "إعادة عنصر إلى قوائم ملف الإداري" : "إيقاف عنصر من قوائم ملف الإداري هذا الموسم", target: label });
    toast({ title: on ? `أُعيدت: ${label}` : `أُوقفت هذا الموسم: ${label}`, body: on ? "تظهر في طلب المشاركة." : "لا تظهر في طلب المشاركة هذا الموسم.", tone: on ? "success" : "info", icon: on ? "✅" : "⏸️" });
  };

  const saveDoc = () => {
    if (!docDraft?.label.trim()) return;
    const label = docDraft.label.trim();
    const hint = docDraft.hint.trim() || "صورة واضحة أو PDF";
    const valid = Math.max(0, Math.min(9, Math.round(Number(docDraft.valid) || 0)));
    const key = docDraft.key;
    const added = rules.docTypes ?? [];
    if (!key) {
      actions.setAdminRules({ docTypes: [...added, { key: `cert-${Date.now()}`, label, hint, validSeasons: valid }] });
      logAs(user, { action: "إضافة شهادة إلى قوائم ملف الإداري", target: label, detail: VALIDITY_TEXT(valid) });
      toast({ title: "أُضيفت الشهادة", body: `${label} — حدّد في «شروط الصفات» الصفات التي تطلبها.`, tone: "success", icon: "🏅" });
    } else if (added.some((d) => d.key === key)) {
      actions.setAdminRules({ docTypes: added.map((d) => (d.key === key ? { ...d, label, hint, validSeasons: valid } : d)) });
      logAs(user, { action: "تعديل شهادة في قوائم ملف الإداري", target: label, detail: VALIDITY_TEXT(valid) });
      toast({ title: "حُفظت الشهادة", body: label, tone: "success", icon: "💾" });
    } else {
      // The platform's own documents: the wording here, the validity where the season keeps it
      const field = SEASON_VALIDITY[key as keyof typeof SEASON_VALIDITY];
      actions.setAdminRules({ docEdits: { ...rules.docEdits, [key]: { label, hint, ...(field ? {} : { validSeasons: valid }) } } });
      if (field) actions.setSeason({ [field]: Math.max(1, valid) });
      logAs(user, { action: "تعديل وثيقة في قوائم ملف الإداري", target: label, detail: VALIDITY_TEXT(field ? Math.max(1, valid) : valid) });
      toast({ title: "حُفظت الوثيقة", body: label, tone: "success", icon: "💾" });
    }
    setDocDraft(null);
  };

  const removeDoc = (key: string, label: string) => {
    if (!free(`doc:${key}`, label)) return;
    actions.setAdminRules({
      docTypes: (rules.docTypes ?? []).filter((d) => d.key !== key),
      ...(table.rows.includes(`doc:${key}`) && rules.requirements ? { requirements: { ...rules.requirements, rows: rules.requirements.rows.filter((r) => r !== `doc:${key}`) } } : {}),
    });
    logAs(user, { action: "حذف شهادة من قوائم ملف الإداري", target: label });
    toast({ title: "حُذفت الشهادة", body: label, tone: "info", icon: "🗑️" });
  };

  const addSkill = () => {
    const label = skill.label.trim();
    if (!label) return;
    if (skills.some((k) => k.key === label || k.label === label)) return toast({ title: "المهارة موجودة", body: label, tone: "info", icon: "ℹ️" });
    actions.setAdminRules({ skillsAdded: [...(rules.skillsAdded ?? []), { key: label, label, emoji: skill.emoji.trim() || "✨" }] });
    logAs(user, { action: "إضافة مهارة إلى قوائم ملف الإداري", target: label });
    toast({ title: "أُضيفت المهارة", body: `${label} — يُسأل عنها كل متقدم.`, tone: "success", icon: "✨" });
    setSkill({ label: "", emoji: "" });
  };
  const removeSkill = (key: string, label: string) => {
    if (!free(`skill:${key}`, label)) return;
    actions.setAdminRules({ skillsAdded: (rules.skillsAdded ?? []).filter((k) => k.key !== key) });
    logAs(user, { action: "حذف مهارة من قوائم ملف الإداري", target: label });
    toast({ title: "حُذفت المهارة", body: label, tone: "info", icon: "🗑️" });
  };

  const addLang = () => {
    const name = lang.trim();
    if (!name) return;
    if (langs.some((l) => l.name === name)) return toast({ title: "اللغة موجودة", body: name, tone: "info", icon: "ℹ️" });
    actions.setAdminRules({ languagesAdded: [...(rules.languagesAdded ?? []), name] });
    logAs(user, { action: "إضافة لغة إلى قوائم ملف الإداري", target: name });
    toast({ title: "أُضيفت اللغة", body: name, tone: "success", icon: "🗣️" });
    setLang("");
  };
  const removeLang = (name: string) => {
    if (!free(`lang:${name}`, name)) return;
    actions.setAdminRules({ languagesAdded: (rules.languagesAdded ?? []).filter((l) => l !== name) });
    logAs(user, { action: "حذف لغة من قوائم ملف الإداري", target: name });
    toast({ title: "حُذفت اللغة", body: name, tone: "info", icon: "🗑️" });
  };

  const usedByLine = (id: string) => {
    const by = usedBy(id);
    return <p className={cn("text-xs", by.length ? "text-gold" : "text-white/50")}>{by.length ? `تطلبها: ${by.join("، ")}` : "لا تطلبها صفة بعد"}</p>;
  };
  const actionsFor = ({ off, custom, onToggle, onRemove, onEdit, label }: { off?: boolean; custom?: boolean; onToggle: () => void; onRemove: () => void; onEdit?: () => void; label: string }) => (
    <div className="flex shrink-0 gap-1.5">
      {onEdit && (
        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onEdit} aria-label={`تعديل ${label}`}>
          <Pencil className="size-4" />
        </Button>
      )}
      {custom ? (
        <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={onRemove} aria-label={`حذف ${label}`}>
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <Button size="sm" variant={off ? "primary" : "ghost"} className={off ? "" : "text-white hover:bg-maroon/40"} onClick={onToggle}>
          {off ? "إعادة" : "إيقاف"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Panel
        icon={<ScrollText />}
        title="الشهادات والوثائق"
        action={
          <Button size="sm" variant="gold" onClick={() => setDocDraft({ key: null, label: "", hint: "", valid: "0" })}>
            <Plus className="size-4" /> شهادة جديدة
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          كل ما يمكن أن يُطلب من الإداري في ملفه، ومدة صلاحية كل نوع بالمواسم. ما يُضاف هنا يصير سطراً يمكن طلبه في «شروط الصفات»، ومنها يعرف الإداري أي صفة تفتحها شهادته. صلاحية «الإسعافات الأولية» و«لا حكم عليه» و«التزكية» هي نفسها في إعدادات الموسم.
        </p>
        <ul className="mt-4 space-y-2">
          {docDraft && !docDraft.key && <DocForm draft={docDraft} onChange={setDocDraft} onSave={saveDoc} onCancel={() => setDocDraft(null)} />}
          {docs.map((d) =>
            docDraft?.key === d.key ? (
              <DocForm key={d.key} draft={docDraft} fixedValidity={d.key in SEASON_VALIDITY} onChange={setDocDraft} onSave={saveDoc} onCancel={() => setDocDraft(null)} />
            ) : (
              <li key={d.key} className={cn("flex flex-wrap items-start justify-between gap-3 rounded-2xl p-3 ring-1", d.off ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("flex flex-wrap items-center gap-2 font-bold", d.off ? "text-white/50 line-through" : "text-white")}>
                    {d.label}
                    <Chip tone={d.custom ? "green" : "gold"}>{d.custom ? "أضافتها الإدارة" : "من المنصة"}</Chip>
                    <Chip>{VALIDITY_TEXT(d.validSeasons)}</Chip>
                    {d.off && <Chip tone="maroon">موقوفة هذا الموسم</Chip>}
                  </p>
                  <p className="text-xs text-white/60">{d.hint}</p>
                  {usedByLine(`doc:${d.key}`)}
                </div>
                {actionsFor({ label: d.label, off: d.off, custom: d.custom, onEdit: () => setDocDraft({ key: d.key, label: d.label, hint: d.hint, valid: String(d.validSeasons) }), onToggle: () => toggle("docsOff", d.key, d.label, "doc"), onRemove: () => removeDoc(d.key, d.label) })}
              </li>
            ),
          )}
        </ul>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={<Sparkles />} title="المهارات" action={<Chip tone="green">{skills.filter((k) => !k.off).length} مهارة</Chip>}>
          <p className="text-sm leading-7 text-white/70">يُسأل كل متقدم عن كل مهارة هنا بنعم أو لا، وتحفظ إجابته في ملفه الدائم.</p>
          <ul className="mt-4 space-y-2">
            {skills.map((k) => (
              <li key={k.key} className={cn("flex items-start justify-between gap-3 rounded-2xl p-3 ring-1", k.off ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("flex flex-wrap items-center gap-2 font-bold", k.off ? "text-white/50 line-through" : "text-white")}>
                    <span className="text-xl">{k.emoji}</span> {k.label}
                    {k.custom && <Chip tone="green">أضافتها الإدارة</Chip>}
                  </p>
                  {usedByLine(`skill:${k.key}`)}
                </div>
                {actionsFor({ label: k.label, off: k.off, custom: k.custom, onToggle: () => toggle("skillsOff", k.key, k.label, "skill"), onRemove: () => removeSkill(k.key, k.label) })}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="w-16 shrink-0"><input value={skill.emoji} onChange={(e) => setSkill({ ...skill, emoji: e.target.value })} placeholder="✨" className={cn(smallInputClass, "px-1 text-center")} aria-label="رمز المهارة" /></span>
            <input value={skill.label} onChange={(e) => setSkill({ ...skill, label: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="مهارة جديدة، مثل: الطبخ للمجموعات" className={cn(smallInputClass, "min-w-0 flex-1")} aria-label="مهارة جديدة" />
            <Button size="sm" variant="gold" disabled={!skill.label.trim()} onClick={addSkill}>
              <Plus className="size-4" /> إضافة
            </Button>
          </div>
        </Panel>

        <Panel icon={<Languages />} title="اللغات" action={<Chip tone="green">{langs.filter((l) => !l.off).length} لغات</Chip>}>
          <p className="text-sm leading-7 text-white/70">اللغات التي يختار منها المتقدم ما يتحدثه. العربية ثابتة.</p>
          <ul className="mt-4 space-y-2">
            {langs.map((l) => (
              <li key={l.name} className={cn("flex items-start justify-between gap-3 rounded-2xl p-3 ring-1", l.off ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("flex flex-wrap items-center gap-2 font-bold", l.off ? "text-white/50 line-through" : "text-white")}>
                    {l.name}
                    {l.custom && <Chip tone="green">أضافتها الإدارة</Chip>}
                    {l.name === "العربية" && <Chip>ثابتة</Chip>}
                  </p>
                  {l.name !== "العربية" && usedByLine(`lang:${l.name}`)}
                </div>
                {l.name !== "العربية" && actionsFor({ label: l.name, off: l.off, custom: l.custom, onToggle: () => toggle("languagesOff", l.name, l.name, "lang"), onRemove: () => removeLang(l.name) })}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={lang} onChange={(e) => setLang(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLang()} placeholder="لغة جديدة، مثل: الإندونيسية" className={cn(smallInputClass, "min-w-0 flex-1")} aria-label="لغة جديدة" />
            <Button size="sm" variant="gold" disabled={!lang.trim()} onClick={addLang}>
              <Plus className="size-4" /> إضافة
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Adding or editing one certificate: its name, a word to the applicant, and how many seasons it stays valid */
function DocForm({
  draft,
  fixedValidity,
  onChange,
  onSave,
  onCancel,
}: {
  draft: { key: string | null; label: string; hint: string; valid: string };
  fixedValidity?: boolean;
  onChange: (d: { key: string | null; label: string; hint: string; valid: string }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <li className="space-y-2 rounded-2xl bg-white/[.08] p-4 ring-1 ring-gold/40">
      <p className="font-bold text-white">{draft.key ? "تعديل الشهادة" : "شهادة جديدة"}</p>
      <input value={draft.label} onChange={(e) => onChange({ ...draft, label: e.target.value })} placeholder="اسم الشهادة، مثل: شهادة تجويد القرآن الكريم" className={smallInputClass} aria-label="اسم الشهادة" />
      <input value={draft.hint} onChange={(e) => onChange({ ...draft, hint: e.target.value })} placeholder="ملاحظة للمتقدم (اختيارية)" className={smallInputClass} aria-label="ملاحظة للمتقدم" />
      <label className="flex flex-wrap items-center gap-2 text-sm text-white/80">
        تبقى سارية
        <span className="w-20 shrink-0"><input inputMode="numeric" value={draft.valid} onChange={(e) => onChange({ ...draft, valid: e.target.value })} className={cn(smallInputClass, "px-1 text-center")} aria-label="مدة الصلاحية بالمواسم" /></span>
        {fixedValidity ? "مواسم (من 1؛ تُحفظ في إعدادات الموسم)" : "مواسم (0 = لا تنتهي)"}
      </label>
      <div className="flex gap-2">
        <Button size="sm" variant="gold" disabled={!draft.label.trim()} onClick={onSave}>
          <Check className="size-4" /> حفظ
        </Button>
        <Button size="sm" variant="ghost" className="text-white" onClick={onCancel}>
          <X className="size-4" /> إلغاء
        </Button>
      </div>
    </li>
  );
}
