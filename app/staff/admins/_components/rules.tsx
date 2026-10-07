"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarRange, Check, ClipboardList, Landmark, Languages, ListChecks, Pencil, Plus, RotateCcw, ScrollText, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { APPLIED_ROLES, COMMITMENTS, FIXED_CRITERIA, criteriaCatalog, criterionLabel, type RoleRequirements } from "@/app/administrator/_lib/admin";
import { useStructure } from "@/app/administrator/_lib/structure";
import { SEASON_VALIDITY, useAdminCalendar, useDocTypes, useEvaluationStages, useLanguages, useRoleRequirements, useRoles, useSkills } from "@/app/administrator/_lib/admin-rules";
import { Panel, Tabs, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip } from "../../_components/ops-ui";
import { SystemRecords } from "../../_components/system";
import { OperationsPanel } from "../../_components/operations";
import { RolePermissionsPanel } from "./role-permissions";
import { EXAM_KEYS, logAdmins, useAdminsDesk } from "../desk";

type Section = "roles" | "catalog" | "requirements" | "stages" | "calendar";

/**
 * What the season asks of its administrators, before anyone applies: which roles are open and what each
 * commits to, the lists an administrator's file is built from, what each role requires of that file, the
 * stages he is evaluated through and the calendar he sees. The platform ships defaults and the holder of
 * «إدارة الإداريين» edits them here; the administrator portal reads the result the same season. The
 * season's numbers (fees, seniority, the clusters' count, the classification's shares) stay with the
 * director in «إعدادات الموسم», and the exam and its bank are «إدارة الامتحانات»'s.
 */
export function RulesTab() {
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useAdminsDesk();
  const roles = useRoles();
  const stages = useEvaluationStages();
  const calendar = useAdminCalendar();
  const [section, setSection] = useState<Section>("roles");

  return (
    <div className="space-y-6">
      <OperationsPanel keys={["admin-registration", "admin-exams", "group-formation", "cluster-formation", "group-management", "cluster-management"]} system="admins" area="rules" title="عمليات الإداريين: حالتها ومواعيدها" />
      <SeasonNumbers />
      <RolePermissionsPanel />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          id="admin-rules"
          value={section}
          onChange={setSection}
          tabs={[
            { value: "roles", label: "الصفات والالتزامات", count: roles.length },
            { value: "catalog", label: "الشهادات والمهارات واللغات" },
            { value: "requirements", label: "شروط الصفات" },
            { value: "stages", label: "مراحل التقييم", count: stages.length },
            { value: "calendar", label: "الرزنامة", count: calendar.length },
          ]}
        />
        {desk.rulesEdited > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="border-white/25 text-white hover:bg-white/10"
            onClick={() => {
              actions.resetAdminRules(EXAM_KEYS);
              logAdmins(user, "rules", { action: "إعادة قواعد الإداريين إلى الأصل", target: "موسم 1448", detail: "الصفات والالتزامات، وقوائم الملف، وشروط الصفات، ومراحل التقييم، والرزنامة", important: true });
              toast({ title: "أُعيدت القواعد الافتراضية", body: "كما تطلقها المنصة. الامتحان وبنك أسئلته باقيان كما تركتهما «إدارة الامتحانات».", tone: "info", icon: "↩️" });
            }}
          >
            <RotateCcw className="size-4" /> إعادة القواعد إلى الأصل
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-4">
          {section === "roles" && <RolesAndCommitments />}
          {section === "catalog" && <Catalog />}
          {section === "requirements" && <Requirements />}
          {section === "stages" && <Stages />}
          {section === "calendar" && <Calendar />}
        </motion.div>
      </AnimatePresence>

      <SystemRecords system="admins" area="rules" title="سجل القواعد" />
    </div>
  );
}

/** The administrators' numbers the director sets for the season, read here as they stand */
export function SeasonNumbers() {
  const season = useSeason();
  const A = season.administrators;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const items: [string, string][] = [
    ["رسم تسجيل الإداري", formatUSD(season.fees.administratorRegistration)],
    ["رسم تشكيل المجموعة", formatUSD(season.fees.groupFormation)],
    ["رسم التكتل", formatUSD(season.fees.clusterFormation)],
    ["أدنى تقييم للتجديد في الصفة نفسها", String(A.keepRoleMinRating)],
    ["طلب تشكيل تكتل", "لمن تمنحه الإدارة صفة «رئيس تكتل»"],
    ["التصنيف", `ترقية ${pct(season.grading.promoteShare)} · تخفيض ${pct(season.grading.demoteShare)} · يُكرَّم ${season.grading.honorTop}`],
  ];
  return (
    <Panel icon={<Landmark />} title="أرقام الإداريين هذا الموسم" action={<Chip>من «إعدادات الموسم»</Chip>}>
      <ul className="flex flex-wrap gap-2">
        {items.map(([k, v]) => (
          <li key={k} className="rounded-2xl bg-white/[.06] px-3 py-2 text-sm ring-1 ring-white/10">
            <span className="text-white/65">{k}: </span>
            <b className="text-gold">{v}</b>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-6 text-white/55">تضبطها مديرة الموسم في «إعدادات الموسم»، وتعمل بها بوابة الإداريين وعمليات هذا الملف كما هي. ما سواها من قواعد الإداريين تعدّله هنا.</p>
    </Panel>
  );
}

// ───────────────────────── Roles and commitments ─────────────────────────

function RolesAndCommitments() {
  const user = useStaffUser()!;
  const toast = useToast();
  const st = useStructure();
  const cOff = useStore((s) => s.adminRules.commitmentsOff) ?? [];
  const cEdits = useStore((s) => s.adminRules.commitmentEdits) ?? {};
  const [cEditing, setCEditing] = useState<string | null>(null);
  const [cDraft, setCDraft] = useState({ label: "", detail: "" });
  const applied = st.roles.filter((r) => r.applied);

  return (
    <div className="space-y-4">
      <Panel icon={<UsersRound />} title="الصفات المتاحة للتقدم" action={<Link href="/staff/admins/manage/reference" className="text-sm font-bold text-gold hover:underline">تعديلها في «القوائم المرجعية»</Link>}>
        <p className="text-sm leading-7 text-white/70">
          الصفات وسلوكها في التكتل (المقاعد، والمرشّحون، والشارات) قائمة مرجعية تُضاف وتُعدَّل وتُعطَّل وتُحذف من «القوائم المرجعية». «رئيس تكتل» لا يُتقدَّم إليها: تمنحها الإدارة صفةً موسمية، ونائب رئيس التكتل ومحاسبه صفتان ثانويتان يعطيهما الطلب.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {applied.map((r) => (
            <li key={r.key}>
              <Chip tone={r.active ? "green" : "maroon"}>
                {r.name}
                {!r.active ? " — معطّلة" : ""}
              </Chip>
            </li>
          ))}
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
                          logAdmins(user, "rules", { action: "تعديل التزام على الإداريين", target: cDraft.label.trim().slice(0, 60) });
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
                          logAdmins(user, "rules", { action: on ? "إعادة التزام إلى الطلب" : "إسقاط التزام من الطلب", target: label });
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
    logAdmins(user, "rules", { action, target });
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
    logAdmins(user, "rules", { action, target });
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
  const st = useStructure();
  const off = st.roles.filter((r) => !r.active).map((r) => r.key);
  const [adding, setAdding] = useState("");
  const [cert, setCert] = useState<CertDraft | null>(null);
  const saveCertificate = useSaveCertificate();
  const label = (id: string) => criterionLabel(id, types);
  const free = criteriaCatalog(types, skills, languages).map((g) => ({ ...g, ids: g.ids.filter((id) => !table.rows.includes(id)) })).filter((g) => g.ids.length);

  /** A certificate the platform's list does not have, added here as a row of the table — whether a role asks for it yet or not */
  const addCertificate = () => {
    if (cert && saveCertificate(cert, true)) setCert(null);
  };

  const write = (next: RoleRequirements, e: { action: string; target?: string; before?: string; after?: string; ref?: string }) => {
    actions.setAdminRules({ requirements: next });
    logAdmins(user, "rules", e);
  };

  const setCell = (role: { key: string; label: string }, id: string, value: Cell) => {
    const col = { ...(table.cells[role.key] ?? {}) };
    const before = cellText(id, col[id]);
    if (value === undefined || value === false || value === "") delete col[id];
    else col[id] = value;
    if (before === cellText(id, value)) return;
    write({ rows: table.rows, cells: { ...table.cells, [role.key]: col } }, { action: "تعديل شرط في جدول شروط الصفات", target: `${role.label} — ${label(id)}`, before, after: cellText(id, value), ref: role.key });
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
                logAdmins(user, "rules", { action: "إعادة جدول شروط الصفات إلى الأصل", target: "موسم 1448", important: true });
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
                  {off.includes(r.key) && <span className="mt-1 block text-[11px] font-normal text-white/50">معطّلة هذا الموسم</span>}
                  {st.roles.some((x) => x.examAs === r.key && x.applied) && <span className="mt-1 block text-[11px] font-normal text-white/50">ومعها: {st.roles.filter((x) => x.examAs === r.key && x.applied).map((x) => x.name).join("، ")}</span>}
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
        <div className="mt-4">
          <CertificateForm draft={cert} onChange={setCert} onSave={addCertificate} onCancel={() => setCert(null)} saveLabel="إضافة إلى الجدول" />
        </div>
      ) : (
        <button type="button" onClick={() => setCert(blankCert())} className="mt-3 flex items-center gap-2 text-sm font-semibold text-gold underline">
          <Plus className="size-4" /> شهادة جديدة لا توجد في القائمة
        </button>
      )}
      <p className="mt-4 text-xs leading-6 text-white/55">
        صفتا رئيس التكتل ونائبه خارج الجدول: الأولى بطلب تشكيل تكتل بشروطه في إعدادات الموسم، والثانية بدعوة من رئيس التكتل. أدنى تقييم للاستمرار في الصفة نفسها من إعدادات الموسم أيضاً.
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
 * stays valid), the skills and the languages. They are what the administrator sees in his application,
 * and the only rows «شروط الصفات» can ask for. An entry a role still asks for cannot be set aside or
 * deleted until it is taken out of that table.
 */
function Catalog() {
  const user = useStaffUser()!;
  const toast = useToast();
  const table = useRoleRequirements();
  const { all: docs } = useDocTypes();
  const { all: skills } = useSkills();
  const { all: langs } = useLanguages();
  const rules = useStore((s) => s.adminRules);
  const [docDraft, setDocDraft] = useState<CertDraft | null>(null);
  const saveCertificate = useSaveCertificate();
  /** What each role asks of a document now, for its form */
  const rolesOf = (key: string) =>
    Object.fromEntries(
      APPLIED_ROLES.flatMap((r) => {
        const v = table.rows.includes(`doc:${key}`) ? table.cells[r.key]?.[`doc:${key}`] : undefined;
        return v === "required" || v === "preferred" ? [[r.key, v]] : [];
      }),
    ) as CertDraft["roles"];
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
    logAdmins(user, "rules", { action: on ? "إعادة عنصر إلى قوائم ملف الإداري" : "إيقاف عنصر من قوائم ملف الإداري هذا الموسم", target: label });
    toast({ title: on ? `أُعيدت: ${label}` : `أُوقفت هذا الموسم: ${label}`, body: on ? "تظهر في طلب المشاركة." : "لا تظهر في طلب المشاركة هذا الموسم.", tone: on ? "success" : "info", icon: on ? "✅" : "⏸️" });
  };

  const saveDoc = () => {
    if (docDraft && saveCertificate(docDraft)) setDocDraft(null);
  };

  const removeDoc = (key: string, label: string) => {
    if (!free(`doc:${key}`, label)) return;
    actions.setAdminRules({
      docTypes: (rules.docTypes ?? []).filter((d) => d.key !== key),
      ...(table.rows.includes(`doc:${key}`) && rules.requirements ? { requirements: { ...rules.requirements, rows: rules.requirements.rows.filter((r) => r !== `doc:${key}`) } } : {}),
    });
    logAdmins(user, "rules", { action: "حذف شهادة من قوائم ملف الإداري", target: label });
    toast({ title: "حُذفت الشهادة", body: label, tone: "info", icon: "🗑️" });
  };

  const addSkill = () => {
    const label = skill.label.trim();
    if (!label) return;
    if (skills.some((k) => k.key === label || k.label === label)) return toast({ title: "المهارة موجودة", body: label, tone: "info", icon: "ℹ️" });
    actions.setAdminRules({ skillsAdded: [...(rules.skillsAdded ?? []), { key: label, label, emoji: skill.emoji.trim() || "✨" }] });
    logAdmins(user, "rules", { action: "إضافة مهارة إلى قوائم ملف الإداري", target: label });
    toast({ title: "أُضيفت المهارة", body: `${label} — يُسأل عنها كل متقدم.`, tone: "success", icon: "✨" });
    setSkill({ label: "", emoji: "" });
  };
  const removeSkill = (key: string, label: string) => {
    if (!free(`skill:${key}`, label)) return;
    actions.setAdminRules({ skillsAdded: (rules.skillsAdded ?? []).filter((k) => k.key !== key) });
    logAdmins(user, "rules", { action: "حذف مهارة من قوائم ملف الإداري", target: label });
    toast({ title: "حُذفت المهارة", body: label, tone: "info", icon: "🗑️" });
  };

  const addLang = () => {
    const name = lang.trim();
    if (!name) return;
    if (langs.some((l) => l.name === name)) return toast({ title: "اللغة موجودة", body: name, tone: "info", icon: "ℹ️" });
    actions.setAdminRules({ languagesAdded: [...(rules.languagesAdded ?? []), name] });
    logAdmins(user, "rules", { action: "إضافة لغة إلى قوائم ملف الإداري", target: name });
    toast({ title: "أُضيفت اللغة", body: name, tone: "success", icon: "🗣️" });
    setLang("");
  };
  const removeLang = (name: string) => {
    if (!free(`lang:${name}`, name)) return;
    actions.setAdminRules({ languagesAdded: (rules.languagesAdded ?? []).filter((l) => l !== name) });
    logAdmins(user, "rules", { action: "حذف لغة من قوائم ملف الإداري", target: name });
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
          <Button size="sm" variant="gold" onClick={() => setDocDraft(blankCert())}>
            <Plus className="size-4" /> شهادة جديدة
          </Button>
        }
      >
        <p className="text-sm leading-7 text-white/70">
          كل ما يمكن أن يُطلب من الإداري في ملفه، ومدة صلاحية كل نوع بالمواسم. ما يُضاف هنا يصير سطراً يمكن طلبه في «شروط الصفات»، ومنها يعرف الإداري أي صفة تفتحها شهادته. صلاحية «الإسعافات الأولية» و«لا حكم عليه» و«التزكية» هي نفسها في إعدادات الموسم.
        </p>
        <ul className="mt-4 space-y-2">
          {docDraft && !docDraft.key && (
            <li>
              <CertificateForm draft={docDraft} onChange={setDocDraft} onSave={saveDoc} onCancel={() => setDocDraft(null)} />
            </li>
          )}
          {docs.map((d) =>
            docDraft?.key === d.key ? (
              <li key={d.key}>
                <CertificateForm draft={docDraft} fixedValidity={d.key in SEASON_VALIDITY} onChange={setDocDraft} onSave={saveDoc} onCancel={() => setDocDraft(null)} />
              </li>
            ) : (
              <li key={d.key} className={cn("flex flex-wrap items-start justify-between gap-3 rounded-2xl p-3 ring-1", d.off ? "bg-maroon/15 ring-maroon/30" : "bg-white/[.06] ring-white/10")}>
                <div className="min-w-0 flex-1">
                  <p className={cn("flex flex-wrap items-center gap-2 font-bold", d.off ? "text-white/50 line-through" : "text-white")}>
                    {d.label}
                    <Chip tone={d.custom ? "green" : "gold"}>{d.custom ? "أضافتها الإدارة" : "من المنصة"}</Chip>
                    <Chip tone="gold">{VALIDITY_TEXT(d.validSeasons)}</Chip>
                    {d.off && <Chip tone="maroon">موقوفة هذا الموسم</Chip>}
                  </p>
                  <p className="text-xs text-white/60">{d.hint}</p>
                  {usedByLine(`doc:${d.key}`)}
                </div>
                {actionsFor({ label: d.label, off: d.off, custom: d.custom, onEdit: () => setDocDraft({ key: d.key, label: d.label, hint: d.hint, valid: String(d.validSeasons), roles: rolesOf(d.key) }), onToggle: () => toggle("docsOff", d.key, d.label, "doc"), onRemove: () => removeDoc(d.key, d.label) })}
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
                    {l.name === "العربية" && <Chip tone="gold">ثابتة</Chip>}
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
/** A certificate as its form edits it: what the applicant reads, how long it stays valid, and what each role asks of it */
type CertDraft = { key: string | null; label: string; hint: string; valid: string; roles: Record<string, "required" | "preferred"> };

const blankCert = (): CertDraft => ({ key: null, label: "", hint: "", valid: "0", roles: {} });

const LEVEL_TEXT = { required: "مطلوبة", preferred: "تقوّي الطلب", none: "لا تطلبها" } as const;

const LEVELS: { v?: "required" | "preferred"; label: string; on: string }[] = [
  { v: "required", label: LEVEL_TEXT.required, on: "bg-gold text-ink ring-gold" },
  { v: "preferred", label: LEVEL_TEXT.preferred, on: "bg-green-light/30 text-white ring-green-light/60" },
  { label: LEVEL_TEXT.none, on: "bg-white/15 text-white ring-white/30" },
];

const VALIDITY_MODES = [
  { key: "never", label: "لا تنتهي" },
  { key: "season", label: "تُجدَّد كل موسم" },
  { key: "seasons", label: "سارية عدة مواسم" },
] as const;

/** The roles with a column in «شروط الصفات» (the active ones), each with the roles that share its column */
function useCertRoles() {
  const st = useStructure();
  return APPLIED_ROLES.filter((r) => st.roles.find((x) => x.key === r.key)?.active !== false).map((r) => ({
    key: r.key,
    label: r.label,
    with: st.roles.filter((x) => x.active && x.examAs === r.key).map((x) => x.name),
  }));
}

/**
 * Saves a certificate whole, from either form: its entry in the lists (one the administration added, or
 * the platform's own reworded — its validity kept in the season settings where the season holds it) and
 * its row in «شروط الصفات», where each role's choice is written. `row` keeps the row in the table even
 * while no role asks for it (added from the table itself).
 */
function useSaveCertificate() {
  const user = useStaffUser()!;
  const toast = useToast();
  const table = useRoleRequirements();
  const rules = useStore((s) => s.adminRules);
  const roles = useCertRoles();
  return (d: CertDraft, row = false) => {
    const label = d.label.trim();
    if (!label) return false;
    const hint = d.hint.trim() || "صورة واضحة أو PDF";
    const field = d.key ? SEASON_VALIDITY[d.key as keyof typeof SEASON_VALIDITY] : undefined;
    const valid = Math.max(field ? 1 : 0, Math.min(9, Math.round(Number(d.valid) || 0)));
    const added = rules.docTypes ?? [];
    const key = d.key ?? `cert-${Date.now()}`;
    const id = `doc:${key}`;
    const cells = { ...table.cells };
    const changes: string[] = [];
    for (const r of roles) {
      const was = cells[r.key]?.[id];
      const before = was === "required" || was === "preferred" ? was : undefined;
      const after = d.roles[r.key];
      if (before === after) continue;
      const col = { ...(cells[r.key] ?? {}) };
      if (after) col[id] = after;
      else delete col[id];
      cells[r.key] = col;
      changes.push(`${r.label}: ${LEVEL_TEXT[after ?? "none"]}`);
    }
    const asks = roles.filter((r) => d.roles[r.key]).map((r) => `${r.label} (${LEVEL_TEXT[d.roles[r.key]]})`);
    const rows = table.rows.includes(id) || !(asks.length || row) ? table.rows : [...table.rows, id];
    const requirements = changes.length || rows !== table.rows ? { requirements: { rows, cells } } : {};
    if (!d.key) actions.setAdminRules({ docTypes: [...added, { key, label, hint, validSeasons: valid }], ...requirements });
    else if (added.some((x) => x.key === key)) actions.setAdminRules({ docTypes: added.map((x) => (x.key === key ? { ...x, label, hint, validSeasons: valid } : x)), ...requirements });
    else {
      // The platform's own documents: the wording here, the validity where the season keeps it
      actions.setAdminRules({ docEdits: { ...rules.docEdits, [key]: { label, hint, ...(field ? {} : { validSeasons: valid }) } }, ...requirements });
      if (field) actions.setSeason({ [field]: valid });
    }
    const who = asks.length ? `تطلبها: ${asks.join("، ")}` : "لا تطلبها صفة بعد";
    logAdmins(user, "rules", {
      action: d.key ? "تعديل شهادة في قوائم ملف الإداري" : "إضافة شهادة إلى قوائم ملف الإداري",
      target: label,
      detail: [VALIDITY_TEXT(valid), who, ...(d.key && changes.length ? [`تغيّر: ${changes.join("، ")}`] : [])].join(" — "),
    });
    toast({ title: d.key ? "حُفظت الشهادة" : "أُضيفت الشهادة", body: `${label} — ${VALIDITY_TEXT(valid)} — ${who}`, tone: "success", icon: d.key ? "💾" : "🏅" });
    return true;
  };
}

/**
 * A certificate whole, new or edited: its name and the note the applicant reads, how long it stays valid,
 * and for every role whether it is required, strengthens the application, or is not asked — the same
 * choice as a cell of «شروط الصفات», written there.
 */
function CertificateForm({
  draft,
  fixedValidity,
  onChange,
  onSave,
  onCancel,
  saveLabel = "حفظ",
}: {
  draft: CertDraft;
  fixedValidity?: boolean;
  onChange: (d: CertDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const roles = useCertRoles();
  const n = Math.round(Number(draft.valid) || 0);
  const mode = n <= 0 ? "never" : n === 1 ? "season" : "seasons";
  const set = (patch: Partial<CertDraft>) => onChange({ ...draft, ...patch });
  const level = (role: string, v?: "required" | "preferred") => {
    const next = { ...draft.roles };
    if (v) next[role] = v;
    else delete next[role];
    set({ roles: next });
  };
  return (
    <div className="space-y-4 rounded-2xl bg-white/[.08] p-4 ring-1 ring-gold/40">
      <p className="font-bold text-white">{draft.key ? "تعديل الشهادة" : "شهادة جديدة"}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs font-bold text-white/80">
          اسم الشهادة أو الوثيقة
          <input value={draft.label} onChange={(e) => set({ label: e.target.value })} placeholder="مثل: شهادة تجويد القرآن الكريم" className={smallInputClass} />
        </label>
        <label className="space-y-1 text-xs font-bold text-white/80">
          ملاحظة يقرؤها المتقدم تحت اسمها
          <input value={draft.hint} onChange={(e) => set({ hint: e.target.value })} placeholder="مثل: صادرة خلال آخر سنتين (اختيارية)" className={smallInputClass} />
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-bold text-white/80">مدة صلاحيتها</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {VALIDITY_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={mode === m.key}
              disabled={fixedValidity && m.key === "never"}
              onClick={() => set({ valid: m.key === "never" ? "0" : m.key === "season" ? "1" : String(Math.max(2, n)) })}
              className={cn("rounded-xl px-3 py-1.5 text-sm font-bold ring-1 transition disabled:opacity-40", mode === m.key ? "bg-gold text-ink ring-gold" : "bg-white/5 text-white/80 ring-white/15 hover:bg-white/10")}
            >
              {m.label}
            </button>
          ))}
          {mode === "seasons" && (
            <span className="flex items-center gap-2 text-sm text-white/80">
              <span className="w-16 shrink-0">
                <input inputMode="numeric" value={draft.valid} onChange={(e) => set({ valid: e.target.value })} className={cn(smallInputClass, "px-1 text-center")} aria-label="عدد المواسم" />
              </span>
              مواسم
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-white/50">{fixedValidity ? "صلاحيتها رقم في إعدادات الموسم أيضاً، وتُحفظ هناك: موسم واحد على الأقل." : "حين تنقضي مواسمها تُطلب من الإداري من جديد."}</p>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-bold text-white/80">الصفات التي تطلبها</legend>
        <p className="mt-1 text-xs leading-6 text-white/50">«مطلوبة»: لا يُقدَّم الطلب دونها. «تقوّي الطلب»: تظهر للمتقدم ولا تمنعه. يُكتب الاختيار في «شروط الصفات» نفسه.</p>
        <ul className="mt-2 divide-y divide-white/10 rounded-xl bg-white/[.04] ring-1 ring-white/10">
          {roles.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm font-bold text-white">
                {r.label}
                {r.with.length > 0 && <span className="block text-[11px] font-normal text-white/50">ومعها: {r.with.join("، ")}</span>}
              </span>
              <span className="flex flex-wrap gap-1" role="group" aria-label={`ما تطلبه صفة ${r.label}`}>
                {LEVELS.map((l) => {
                  const on = draft.roles[r.key] === l.v;
                  return (
                    <button key={l.label} type="button" aria-pressed={on} onClick={() => level(r.key, l.v)} className={cn("rounded-lg px-2.5 py-1 text-xs font-bold ring-1 transition", on ? l.on : "text-white/60 ring-white/15 hover:bg-white/10")}>
                      {l.label}
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex gap-2">
        <Button size="sm" variant="gold" disabled={!draft.label.trim()} onClick={onSave}>
          <Check className="size-4" /> {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" className="text-white" onClick={onCancel}>
          <X className="size-4" /> إلغاء
        </Button>
      </div>
    </div>
  );
}
