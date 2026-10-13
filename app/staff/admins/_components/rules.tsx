"use client";

import Link from "next/link";
import { Check, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useSeason } from "@/lib/season-live";
import { actions, useStore } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { APPLIED_ROLES, COMMITMENTS, FIXED_CRITERIA, criteriaCatalog, criterionLabel, type RoleRequirements } from "@/app/administrator/_lib/admin";
import { useStructure } from "@/app/administrator/_lib/structure";
import { SEASON_VALIDITY, useAdminCalendar, useDocTypes, useEvaluationStages, useLanguages, useRoleRequirements, useSkills } from "@/app/administrator/_lib/admin-rules";
import { Drawer, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { OperationsPanel } from "../../_components/operations";
import { AddButton, Box, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { RolePermissionsPanel } from "./role-permissions";
import { Help, Lead, SaveLine, TitleCell, Views, useView } from "./ui";
import { EXAM_KEYS, logAdmins, useAdminsDesk } from "../desk";

/**
 * «قواعد الإداريين» — what the season asks of its administrators, before anyone applies, as a site's settings
 * pages: one section at a time from the row of sections at the top (its address keeps it, `?s=`). Lists are
 * tables with their actions under each name and an «إضافة» box beside them; a table of choices (the roles'
 * permissions, the roles' requirements) is one form saved once. The season's numbers (fees, seniority,
 * shares) stay with the director in «إعدادات الموسم», and the exam and its bank are «إدارة الامتحانات»'s.
 */
const SECTIONS = [
  { key: "operations", label: "المواعيد" },
  { key: "permissions", label: "صلاحيات الصفات" },
  { key: "commitments", label: "الالتزامات" },
  { key: "documents", label: "الشهادات والوثائق" },
  { key: "skills", label: "المهارات" },
  { key: "languages", label: "اللغات" },
  { key: "requirements", label: "شروط الصفات" },
  { key: "stages", label: "مراحل التقييم" },
  { key: "calendar", label: "الرزنامة" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

export function RulesTab() {
  const section = useView<Section>("s", SECTIONS.map((x) => x.key));
  return (
    <div className="space-y-6">
      <Views param="s" value={section} items={[...SECTIONS]} tabs label="أقسام القواعد" />
      {section === "operations" && <OperationsPanel keys={["admin-registration", "admin-exams", "group-formation", "cluster-formation", "group-management", "cluster-management", "pilgrim-evaluation", "self-evaluation", "peer-evaluation", "evaluation-objection"]} system="admins" area="rules" title="عمليات الإداريين: حالتها ومواعيدها" />}
      {section === "permissions" && <RolePermissionsPanel />}
      {section === "commitments" && <Commitments />}
      {section === "documents" && <Documents />}
      {section === "skills" && <Skills />}
      {section === "languages" && <Languages />}
      {section === "requirements" && <Requirements />}
      {section === "stages" && <Stages />}
      {section === "calendar" && <Calendar />}

      <div className="grid gap-4 lg:grid-cols-2">
        <SeasonNumbers />
        <ResetAll />
      </div>
      <RecordsBox system="admins" area="rules" title="سجل القواعد" />
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
    <Box title="من «إعدادات الموسم» (للاطلاع)" open={false}>
      <ul className="space-y-1.5">
        {items.map(([k, v]) => (
          <li key={k} className="flex flex-wrap justify-between gap-2">
            <span className="text-white/65">{k}</span>
            <b className="text-gold">{v}</b>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-6 text-white/55">تضبطها مديرة الموسم في «إعدادات الموسم». ما سواها من قواعد الإداريين تعدّله هنا.</p>
    </Box>
  );
}

/** Every rule of this file back to the platform's defaults: rarely wanted, so it waits closed */
function ResetAll() {
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useAdminsDesk();
  return (
    <Box title="خيارات متقدمة" open={false}>
      <p className="text-xs leading-6 text-white/60">{desk.rulesEdited ? `عُدّل ${desk.rulesEdited} من قواعد الموسم.` : "القواعد كما تطلقها المنصة."} الإعادة تشمل الصفات والالتزامات وقوائم الملف وشروط الصفات ومراحل التقييم والرزنامة، لا الامتحان وبنك أسئلته.</p>
      <Button
        size="sm"
        variant="glass"
        disabled={desk.rulesEdited === 0}
        onClick={() => {
          actions.resetAdminRules(EXAM_KEYS);
          logAdmins(user, "rules", { action: "إعادة قواعد الإداريين إلى الأصل", target: "موسم 1448", detail: "الصفات والالتزامات، وقوائم الملف، وشروط الصفات، ومراحل التقييم، والرزنامة", important: true });
          toast({ title: "أُعيدت القواعد الافتراضية", body: "كما تطلقها المنصة. الامتحان وبنك أسئلته باقيان كما تركتهما «إدارة الامتحانات».", tone: "info", icon: "↩️" });
        }}
      >
        <RotateCcw className="size-4" /> إعادة كل القواعد إلى الأصل
      </Button>
    </Box>
  );
}

// ───────────────────────── Commitments ─────────────────────────

function Commitments() {
  const user = useStaffUser()!;
  const toast = useToast();
  const cOff = useStore((s) => s.adminRules.commitmentsOff) ?? [];
  const cEdits = useStore((s) => s.adminRules.commitmentEdits) ?? {};
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", detail: "" });
  const open = COMMITMENTS.find((c) => c.key === editing);
  const textOf = (c: (typeof COMMITMENTS)[number]) => ({ label: cEdits[c.key]?.label ?? c.label, detail: cEdits[c.key]?.detail ?? c.detail });
  const edit = (c: (typeof COMMITMENTS)[number]) => {
    setEditing(c.key);
    setDraft(textOf(c));
  };
  const toggle = (c: (typeof COMMITMENTS)[number]) => {
    const on = cOff.includes(c.key);
    actions.setAdminRules({ commitmentsOff: on ? cOff.filter((x) => x !== c.key) : [...cOff, c.key] });
    logAdmins(user, "rules", { action: on ? "إعادة التزام إلى الطلب" : "إسقاط التزام من الطلب", target: textOf(c).label });
    toast({ title: on ? "أُعيد الالتزام" : "أُسقط الالتزام", tone: on ? "success" : "info", icon: on ? "✅" : "🚫" });
  };
  const save = () => {
    if (!open) return;
    actions.setAdminRules({ commitmentEdits: { ...cEdits, [open.key]: { label: draft.label.trim() || open.label, detail: draft.detail.trim() || open.detail } } });
    logAdmins(user, "rules", { action: "تعديل التزام على الإداريين", target: draft.label.trim().slice(0, 60) });
    setEditing(null);
    toast({ title: "حُفظ الالتزام", tone: "success", icon: "✍️" });
  };

  return (
    <div className="space-y-4">
      <Title>التزامات الإداري</Title>
      <Lead>يوقّع عليها كل متقدم إلكترونياً مع تاريخها، وتُحفظ في استمارة تسجيله.</Lead>
      <ListTable head={["الالتزام", "الحالة"]}>
        {COMMITMENTS.map((c) => {
          const off = cOff.includes(c.key);
          const t = textOf(c);
          return (
            <tr key={c.key} className={cn(off && "opacity-60")}>
              <TitleCell
                title={t.label}
                onOpen={() => edit(c)}
                sub={t.detail}
                actions={
                  <RowActions>
                    <RowLink onClick={() => edit(c)}>تعديل</RowLink>
                    <RowLink danger={!off} onClick={() => toggle(c)}>
                      {off ? "إعادة إلى الطلب" : "إسقاط من الطلب"}
                    </RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top">{off ? <Tag tone="maroon">مُسقط</Tag> : <Tag tone="green">في الطلب</Tag>}</td>
            </tr>
          );
        })}
      </ListTable>
      <Drawer
        open={!!open}
        onClose={() => setEditing(null)}
        title="تعديل الالتزام"
        width="max-w-lg"
        footer={
          <Button variant="gold" onClick={save}>
            حفظ
          </Button>
        }
      >
        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">نص الالتزام</span>
            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={smallInputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">تفصيله</span>
            <textarea rows={3} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} className={textareaClass} />
          </label>
        </div>
      </Drawer>
    </div>
  );
}

// ───────────────────────── Calendar ─────────────────────────

type CalRow = { hijri: string; title: string; detail: string };

function Calendar() {
  const user = useStaffUser()!;
  const toast = useToast();
  const rows = useAdminCalendar();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<CalRow>({ hijri: "", title: "", detail: "" });
  const [adding, setAdding] = useState<CalRow>({ hijri: "", title: "", detail: "" });

  const write = (next: CalRow[], action: string, target?: string) => {
    actions.setAdminRules({ calendar: next });
    logAdmins(user, "rules", { action, target });
  };
  const add = () => {
    write([...rows, { hijri: adding.hijri.trim() || "تاريخ جديد", title: adding.title.trim(), detail: adding.detail.trim() }], "إضافة مرحلة إلى رزنامة الإداريين", adding.title.trim());
    toast({ title: "أُضيفت المرحلة", body: adding.title.trim(), tone: "success", icon: "🗓️" });
    setAdding({ hijri: "", title: "", detail: "" });
  };
  const save = () => {
    if (editing === null) return;
    write(rows.map((x, j) => (j === editing ? { ...draft } : x)), "تعديل مرحلة في رزنامة الإداريين", draft.title);
    setEditing(null);
    toast({ title: "حُفظت المرحلة", tone: "success", icon: "🗓️" });
  };

  return (
    <EditLayout
      main={
        <div>
          <Title>رزنامة الإداريين</Title>
          <Lead>المواعيد التي يراها الإداري في بوابته، كما تكتبها هنا.</Lead>
          <ListTable head={["المرحلة", "التاريخ"]} minWidth="30rem">
            {rows.length === 0 && <EmptyRow cols={2}>لا مراحل بعد. أضف أول مرحلة من المربع الجانبي.</EmptyRow>}
            {rows.map((r, i) => (
              <tr key={`${r.title}-${i}`}>
                <TitleCell
                  title={r.title}
                  onOpen={() => {
                    setEditing(i);
                    setDraft({ ...r });
                  }}
                  sub={r.detail}
                  actions={
                    <RowActions>
                      <RowLink
                        onClick={() => {
                          setEditing(i);
                          setDraft({ ...r });
                        }}
                      >
                        تعديل
                      </RowLink>
                      <RowLink
                        danger
                        onClick={() => {
                          write(rows.filter((_, j) => j !== i), "حذف مرحلة من رزنامة الإداريين", r.title);
                          toast({ title: "حُذفت المرحلة", tone: "info", icon: "🗑️" });
                        }}
                      >
                        حذف
                      </RowLink>
                    </RowActions>
                  }
                />
                <td className="p-3 align-top font-bold text-gold">{r.hijri}</td>
              </tr>
            ))}
          </ListTable>
          <CalendarDrawer open={editing !== null} onClose={() => setEditing(null)} draft={draft} setDraft={setDraft} onSave={save} />
        </div>
      }
      side={
        <Box title="إضافة مرحلة">
          <CalFields draft={adding} setDraft={setAdding} />
          <Button size="sm" variant="gold" disabled={!adding.title.trim()} onClick={add}>
            <Plus className="size-4" /> إضافة إلى الرزنامة
          </Button>
        </Box>
      }
    />
  );
}

function CalFields({ draft, setDraft }: { draft: CalRow; setDraft: (d: CalRow) => void }) {
  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">التاريخ الهجري</span>
        <input value={draft.hijri} onChange={(e) => setDraft({ ...draft, hijri: e.target.value })} placeholder="مثل: 1 ذو القعدة" className={smallInputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">عنوان المرحلة</span>
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={smallInputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">تفصيلها (اختياري)</span>
        <textarea rows={2} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} className={textareaClass} />
      </label>
    </>
  );
}

function CalendarDrawer({ open, onClose, draft, setDraft, onSave }: { open: boolean; onClose: () => void; draft: CalRow; setDraft: (d: CalRow) => void; onSave: () => void }) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="تعديل مرحلة في الرزنامة"
      width="max-w-lg"
      footer={
        <Button variant="gold" disabled={!draft.title.trim()} onClick={onSave}>
          حفظ
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        <CalFields draft={draft} setDraft={setDraft} />
      </div>
    </Drawer>
  );
}

// ───────────────────────── Evaluation stages ─────────────────────────

/** An administrator is scored stage by stage, so the administration decides what the stages are; the evaluation screen renders exactly this list */
function Stages() {
  const user = useStaffUser()!;
  const toast = useToast();
  const stages = useEvaluationStages();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ label: "", hint: "" });
  const [adding, setAdding] = useState({ label: "", hint: "" });

  const write = (next: { key: string; label: string; hint: string }[], action: string, target?: string) => {
    actions.setAdminRules({ stages: next });
    logAdmins(user, "rules", { action, target });
  };
  const open = (i: number) => {
    setEditing(i);
    setDraft({ label: stages[i].label, hint: stages[i].hint });
  };

  return (
    <EditLayout
      main={
        <div>
          <Title>مراحل تقييم الإداري</Title>
          <Lead>يُقيَّم الإداري في كل مرحلة على حدة بدرجة من 5. هذه القائمة هي ما يظهر في شاشة «التقييم».</Lead>
          <ListTable head={["", "المرحلة"]} minWidth="30rem">
            {stages.length === 0 && <EmptyRow cols={2}>لا مراحل بعد.</EmptyRow>}
            {stages.map((st, i) => (
              <tr key={st.key}>
                <td className="w-10 p-3 align-top font-display font-bold text-gold">{i + 1}</td>
                <TitleCell
                  title={st.label}
                  onOpen={() => open(i)}
                  sub={st.hint}
                  actions={
                    <RowActions>
                      <RowLink onClick={() => open(i)}>تعديل</RowLink>
                      <RowLink
                        danger
                        onClick={() => {
                          write(stages.filter((_, j) => j !== i), "حذف مرحلة من تقييم الإداريين", st.label);
                          toast({ title: "حُذفت المرحلة", tone: "info", icon: "🗑️" });
                        }}
                      >
                        حذف
                      </RowLink>
                    </RowActions>
                  }
                />
              </tr>
            ))}
          </ListTable>
          <Drawer
            open={editing !== null}
            onClose={() => setEditing(null)}
            title="تعديل مرحلة التقييم"
            width="max-w-lg"
            footer={
              <Button
                variant="gold"
                onClick={() => {
                  if (editing === null) return;
                  write(stages.map((x, j) => (j === editing ? { ...x, label: draft.label.trim() || x.label, hint: draft.hint.trim() } : x)), "تعديل مرحلة في تقييم الإداريين", draft.label);
                  setEditing(null);
                  toast({ title: "حُفظت المرحلة", tone: "success", icon: "✍️" });
                }}
              >
                حفظ
              </Button>
            }
          >
            <div className="space-y-3 text-sm">
              <StageFields draft={draft} setDraft={setDraft} />
            </div>
          </Drawer>
        </div>
      }
      side={
        <Box title="إضافة مرحلة">
          <StageFields draft={adding} setDraft={setAdding} />
          <Button
            size="sm"
            variant="gold"
            disabled={!adding.label.trim()}
            onClick={() => {
              write([...stages, { key: `stage-${Date.now()}`, label: adding.label.trim(), hint: adding.hint.trim() }], "إضافة مرحلة إلى تقييم الإداريين", adding.label.trim());
              toast({ title: "أُضيفت المرحلة", body: adding.label.trim(), tone: "success", icon: "➕" });
              setAdding({ label: "", hint: "" });
            }}
          >
            <Plus className="size-4" /> إضافة المرحلة
          </Button>
        </Box>
      }
    />
  );
}

function StageFields({ draft, setDraft }: { draft: { label: string; hint: string }; setDraft: (d: { label: string; hint: string }) => void }) {
  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">اسم المرحلة</span>
        <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="مثل: المطارات" className={smallInputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">وصفها (اختياري)</span>
        <input value={draft.hint} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} className={smallInputClass} />
      </label>
    </>
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
 * What each role asks of the administrator this season, as one table: a column per role, a row per condition.
 * The table is edited as a whole and saved once; every changed cell, added row and removed row is written to
 * the records as before. The administrator portal applies it: a role that does not fit him is locked, and
 * eligibility is checked before he pays.
 */
function Requirements() {
  const table = useRoleRequirements();
  // The form starts again from what is stored whenever it changes (a save, a certificate added, a reset)
  return <RequirementsForm key={JSON.stringify(table)} table={table} />;
}

function RequirementsForm({ table }: { table: RoleRequirements }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const { types } = useDocTypes();
  const { skills } = useSkills();
  const { languages } = useLanguages();
  const stored = useStore((s) => s.adminRules.requirements);
  const st = useStructure();
  const off = st.roles.filter((r) => !r.active).map((r) => r.key);
  const [draft, setDraft] = useState<RoleRequirements>(table);
  const [adding, setAdding] = useState("");
  const [cert, setCert] = useState<CertDraft | null>(null);
  const saveCertificate = useSaveCertificate();
  const label = (id: string) => criterionLabel(id, types);
  const free = criteriaCatalog(types, skills, languages)
    .map((g) => ({ ...g, ids: g.ids.filter((id) => !draft.rows.includes(id)) }))
    .filter((g) => g.ids.length);
  const dirty = JSON.stringify(draft) !== JSON.stringify(table);

  const setCell = (role: string, id: string, value: Cell) =>
    setDraft((d) => {
      const col = { ...(d.cells[role] ?? {}) };
      if (value === undefined || value === false || value === "") delete col[id];
      else col[id] = value;
      return { ...d, cells: { ...d.cells, [role]: col } };
    });
  const addRow = (id: string) => {
    setDraft((d) => ({ ...d, rows: [...d.rows, id] }));
    setAdding("");
  };
  const removeRow = (id: string) => setDraft((d) => ({ rows: d.rows.filter((r) => r !== id), cells: Object.fromEntries(Object.entries(d.cells).map(([k, col]) => [k, Object.fromEntries(Object.entries(col).filter(([c]) => c !== id))])) }));

  /** One save: the table as drafted, each change recorded on its own line as it always was */
  const save = () => {
    const added = draft.rows.filter((id) => !table.rows.includes(id));
    const removed = table.rows.filter((id) => !draft.rows.includes(id));
    const cells: { role: (typeof APPLIED_ROLES)[number]; id: string; before: string; after: string }[] = [];
    for (const id of draft.rows)
      for (const r of APPLIED_ROLES) {
        const before = cellText(id, table.rows.includes(id) ? table.cells[r.key]?.[id] : undefined);
        const after = cellText(id, draft.cells[r.key]?.[id]);
        if (before !== after) cells.push({ role: r, id, before, after });
      }
    actions.setAdminRules({ requirements: draft });
    for (const id of added) logAdmins(user, "rules", { action: "إضافة شرط إلى جدول شروط الصفات", target: label(id) });
    for (const id of removed) logAdmins(user, "rules", { action: "حذف شرط من جدول شروط الصفات", target: label(id) });
    for (const c of cells) logAdmins(user, "rules", { action: "تعديل شرط في جدول شروط الصفات", target: `${c.role.label} — ${label(c.id)}`, before: c.before, after: c.after, ref: c.role.key });
    toast({ title: "حُفظت شروط الصفات", body: `${added.length + removed.length + cells.length} تغييرات. تعمل بها بوابة الإداريين الآن.`, tone: "success", icon: "💾" });
  };

  return (
    <div className="space-y-4">
      <Title>
        شروط الصفات — موسم 1448 <Tag tone={stored ? "green" : "gold"}>{stored ? "معدَّل هذا الموسم" : "القيم الافتراضية"}</Tag>
      </Title>
      <Lead>لكل صفة عمود، ولكل شرط سطر. اضغط الخانة لتنتقل بين «مطلوبة» و«تقوّي الطلب» و«—»، ثم احفظ مرة واحدة.</Lead>
      <ListTable
        head={[
          "الشرط",
          ...APPLIED_ROLES.map((r) => (
            <span key={r.key} className="block text-center">
              {r.label}
              {off.includes(r.key) && <span className="mt-1 block text-[11px] font-normal text-white/50">معطّلة هذا الموسم</span>}
              {st.roles.some((x) => x.examAs === r.key && x.applied) && (
                <span className="mt-1 block text-[11px] font-normal text-white/50">
                  ومعها:{" "}
                  {st.roles
                    .filter((x) => x.examAs === r.key && x.applied)
                    .map((x) => x.name)
                    .join("، ")}
                </span>
              )}
            </span>
          )),
        ]}
        minWidth="760px"
      >
        {draft.rows.map((id) => {
          const fixed = (FIXED_CRITERIA as readonly string[]).includes(id);
          const kind = id.startsWith("doc:") ? "وثيقة" : id.startsWith("skill:") ? "مهارة" : id.startsWith("lang:") ? "لغة" : null;
          return (
            <tr key={id}>
              <TitleCell
                title={label(id)}
                sub={kind ?? "شرط ثابت"}
                actions={
                  !fixed && (
                    <RowActions>
                      <RowLink danger onClick={() => removeRow(id)}>
                        حذف من الجدول
                      </RowLink>
                    </RowActions>
                  )
                }
              />
              {APPLIED_ROLES.map((r) => {
                const v = draft.cells[r.key]?.[id];
                return (
                  <td key={r.key} className={cn("p-2 text-center align-top", off.includes(r.key) && "opacity-50")}>
                    {id === "gender" ? (
                      <select value={typeof v === "string" ? v : ""} onChange={(e) => setCell(r.key, id, e.target.value || undefined)} className={cn(smallInputClass, "h-9 px-2 text-sm [&>option]:text-ink")} aria-label={`${label(id)} — ${r.label}`}>
                        <option value="">الكل</option>
                        <option value="M">ذكور</option>
                        <option value="F">إناث</option>
                      </select>
                    ) : fixed ? (
                      <NumCell key={`${id}-${String(v)}`} value={typeof v === "number" ? v : undefined} label={`${label(id)} — ${r.label}`} onCommit={(n) => setCell(r.key, id, n)} />
                    ) : (
                      <button
                        type="button"
                        aria-label={`${label(id)} — ${r.label}: ${cellText(id, v)}`}
                        onClick={() => setCell(r.key, id, NEXT_LEVEL[v === "required" || v === "preferred" ? v : "none"])}
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
            </tr>
          );
        })}
      </ListTable>

      <div className="flex flex-wrap items-center gap-2">
        {free.length > 0 && (
          <>
            <select value={adding} onChange={(e) => setAdding(e.target.value)} className={cn(smallInputClass, "w-auto min-w-64 flex-1 sm:flex-none [&_option]:text-ink")} aria-label="شرط جديد">
              <option value="">أضف سطراً: اختر شرطاً من ملف الإداري...</option>
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
            <Button size="sm" variant="glass" disabled={!adding} onClick={() => addRow(adding)}>
              <Plus className="size-4" /> إضافة السطر
            </Button>
          </>
        )}
        <RowLink onClick={() => (dirty ? toast({ title: "احفظ تعديلاتك أولاً", body: "ثم أضف الشهادة الجديدة.", tone: "gold", icon: "💾" }) : setCert(blankCert()))}>+ شهادة جديدة لا توجد في القائمة</RowLink>
      </div>

      <SaveLine dirty={dirty} onSave={save} label="حفظ شروط الصفات" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Help>
          <p>«مطلوبة»: لا يُقدَّم الطلب دونها. «تقوّي الطلب»: تظهر للمتقدم ولا تمنعه. «—»: لا تطلبها الصفة.</p>
          <p>تطبّق بوابة الإداريين الجدول على كل متقدم: تُقفل الصفة التي لا يناسبها عمره أو جنسه أو خبرته، ولا يدفع الرسم قبل أن يستوفي كل ما هو «مطلوب» لصفته. يُضبط الجدول لكل موسم من جديد.</p>
          <p>صفتا رئيس التكتل ونائبه خارج الجدول: الأولى بطلب تشكيل تكتل بشروطه في إعدادات الموسم، والثانية بدعوة من رئيس التكتل. أدنى تقييم للاستمرار في الصفة نفسها من إعدادات الموسم أيضاً.</p>
        </Help>
        {stored && (
          <Box title="خيارات متقدمة" open={false}>
            <Button
              size="sm"
              variant="glass"
              onClick={() => {
                actions.setAdminRules({ requirements: undefined });
                logAdmins(user, "rules", { action: "إعادة جدول شروط الصفات إلى الأصل", target: "موسم 1448", important: true });
                toast({ title: "أُعيد الجدول إلى الأصل", tone: "info", icon: "↩️" });
              }}
            >
              <RotateCcw className="size-4" /> إعادة الجدول إلى القيم الافتراضية
            </Button>
          </Box>
        )}
      </div>

      <Drawer open={!!cert} onClose={() => setCert(null)} title="شهادة جديدة في الجدول">
        {cert && <CertificateForm draft={cert} onChange={setCert} onSave={() => saveCertificate(cert, true) && setCert(null)} onCancel={() => setCert(null)} saveLabel="إضافة إلى الجدول" />}
      </Drawer>
    </div>
  );
}

/** A number in the table, taken when the field is left (not on every keystroke); empty = no condition */
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
 * What a role still asks for cannot leave the application: the checks and the switch shared by the
 * certificates, the skills and the languages (an entry a role asks for is set aside or deleted only after it
 * is taken out of «شروط الصفات»).
 */
function useCatalog() {
  const user = useStaffUser()!;
  const toast = useToast();
  const table = useRoleRequirements();
  const rules = useStore((s) => s.adminRules);
  const usedBy = (id: string) =>
    APPLIED_ROLES.flatMap((r) => {
      const v = table.rows.includes(id) ? table.cells[r.key]?.[id] : undefined;
      return v === "required" || v === "preferred" ? [`${r.label} (${v === "required" ? "مطلوبة" : "تقوّي"})`] : [];
    });
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
  const usedByText = (id: string) => {
    const by = usedBy(id);
    return by.length ? <span className="text-gold">{by.join("، ")}</span> : <span className="text-white/45">لا تطلبها صفة بعد</span>;
  };
  return { user, toast, table, rules, free, toggle, usedByText };
}

/** The certificates and documents an administrator can be asked for, and how long each stays valid */
function Documents() {
  const { user, toast, table, rules, free, toggle, usedByText } = useCatalog();
  const { all: docs } = useDocTypes();
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
  const edit = (d: (typeof docs)[number]) => setDocDraft({ key: d.key, label: d.label, hint: d.hint, valid: String(d.validSeasons), roles: rolesOf(d.key) });
  const removeDoc = (key: string, label: string) => {
    if (!free(`doc:${key}`, label)) return;
    actions.setAdminRules({
      docTypes: (rules.docTypes ?? []).filter((d) => d.key !== key),
      ...(table.rows.includes(`doc:${key}`) && rules.requirements ? { requirements: { ...rules.requirements, rows: rules.requirements.rows.filter((r) => r !== `doc:${key}`) } } : {}),
    });
    logAdmins(user, "rules", { action: "حذف شهادة من قوائم ملف الإداري", target: label });
    toast({ title: "حُذفت الشهادة", body: label, tone: "info", icon: "🗑️" });
  };

  return (
    <div className="space-y-4">
      <Title action={<AddButton onClick={() => setDocDraft(blankCert())}>إضافة شهادة</AddButton>}>الشهادات والوثائق</Title>
      <Lead>كل ما يمكن أن يُطلب من الإداري في ملفه، ومدة صلاحيته. ما يُضاف هنا يصير سطراً في «شروط الصفات».</Lead>
      <ListTable head={["الشهادة أو الوثيقة", "الصلاحية", "تطلبها", "المصدر"]}>
        {docs.map((d) => (
          <tr key={d.key} className={cn(d.off && "opacity-60")}>
            <TitleCell
              title={d.label}
              onOpen={() => edit(d)}
              sub={d.hint}
              muted={d.off}
              actions={
                <RowActions>
                  <RowLink onClick={() => edit(d)}>تعديل</RowLink>
                  {d.custom ? (
                    <RowLink danger onClick={() => removeDoc(d.key, d.label)}>
                      حذف
                    </RowLink>
                  ) : (
                    <RowLink danger={!d.off} onClick={() => toggle("docsOff", d.key, d.label, "doc")}>
                      {d.off ? "إعادة" : "إيقاف هذا الموسم"}
                    </RowLink>
                  )}
                </RowActions>
              }
            />
            <td className="p-3 align-top">
              <Tag tone="gold">{VALIDITY_TEXT(d.validSeasons)}</Tag>
            </td>
            <td className="p-3 align-top text-xs leading-5">{usedByText(`doc:${d.key}`)}</td>
            <td className="p-3 align-top">
              {d.off ? <Tag tone="maroon">موقوفة هذا الموسم</Tag> : <Tag tone={d.custom ? "green" : "muted"}>{d.custom ? "أضافتها الإدارة" : "من المنصة"}</Tag>}
            </td>
          </tr>
        ))}
      </ListTable>
      <Help>
        <p>منها يعرف الإداري أي صفة تفتحها شهادته. صلاحية «الإسعافات الأولية» و«لا حكم عليه» و«التزكية» هي نفسها في إعدادات الموسم، وتُحفظ هناك.</p>
        <p>ما تطلبه صفة لا يُوقف ولا يُحذف حتى يُحذف من «شروط الصفات».</p>
      </Help>
      <Drawer open={!!docDraft} onClose={() => setDocDraft(null)} title={docDraft?.key ? "تعديل الشهادة" : "إضافة شهادة"}>
        {docDraft && <CertificateForm draft={docDraft} fixedValidity={!!docDraft.key && docDraft.key in SEASON_VALIDITY} onChange={setDocDraft} onSave={() => saveCertificate(docDraft) && setDocDraft(null)} onCancel={() => setDocDraft(null)} />}
      </Drawer>
    </div>
  );
}

/** The skills every applicant is asked about, yes or no */
function Skills() {
  const { user, toast, rules, free, toggle, usedByText } = useCatalog();
  const { all: skills } = useSkills();
  const [skill, setSkill] = useState({ label: "", emoji: "" });
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
  return (
    <EditLayout
      main={
        <div>
          <Title>المهارات</Title>
          <Lead>يُسأل كل متقدم عن كل مهارة هنا بنعم أو لا، وتُحفظ إجابته في ملفه الدائم.</Lead>
          <ListTable head={["المهارة", "تطلبها", "الحالة"]} minWidth="30rem">
            {skills.map((k) => (
              <tr key={k.key} className={cn(k.off && "opacity-60")}>
                <TitleCell
                  title={
                    <>
                      <span className="me-1">{k.emoji}</span> {k.label}
                    </>
                  }
                  muted={k.off}
                  actions={
                    <RowActions>
                      {k.custom ? (
                        <RowLink danger onClick={() => removeSkill(k.key, k.label)}>
                          حذف
                        </RowLink>
                      ) : (
                        <RowLink danger={!k.off} onClick={() => toggle("skillsOff", k.key, k.label, "skill")}>
                          {k.off ? "إعادة" : "إيقاف هذا الموسم"}
                        </RowLink>
                      )}
                    </RowActions>
                  }
                />
                <td className="p-3 align-top text-xs leading-5">{usedByText(`skill:${k.key}`)}</td>
                <td className="p-3 align-top">{k.off ? <Tag tone="maroon">موقوفة</Tag> : k.custom ? <Tag tone="green">أضافتها الإدارة</Tag> : <Tag>من المنصة</Tag>}</td>
              </tr>
            ))}
          </ListTable>
        </div>
      }
      side={
        <Box title="إضافة مهارة">
          <div className="flex gap-2">
            <span className="w-16 shrink-0">
              <input value={skill.emoji} onChange={(e) => setSkill({ ...skill, emoji: e.target.value })} placeholder="✨" className={cn(smallInputClass, "px-1 text-center")} aria-label="رمز المهارة" />
            </span>
            <input value={skill.label} onChange={(e) => setSkill({ ...skill, label: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addSkill()} placeholder="مثل: الطبخ للمجموعات" className={cn(smallInputClass, "min-w-0 flex-1")} aria-label="مهارة جديدة" />
          </div>
          <Button size="sm" variant="gold" disabled={!skill.label.trim()} onClick={addSkill}>
            <Plus className="size-4" /> إضافة المهارة
          </Button>
        </Box>
      }
    />
  );
}

/** The languages an applicant picks from; Arabic is fixed */
function Languages() {
  const { user, toast, rules, free, toggle, usedByText } = useCatalog();
  const { all: langs } = useLanguages();
  const [lang, setLang] = useState("");
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
  return (
    <EditLayout
      main={
        <div>
          <Title>اللغات</Title>
          <Lead>اللغات التي يختار منها المتقدم ما يتحدثه. العربية ثابتة.</Lead>
          <ListTable head={["اللغة", "تطلبها", "الحالة"]} minWidth="30rem">
            {langs.map((l) => {
              const fixed = l.name === "العربية";
              return (
                <tr key={l.name} className={cn(l.off && "opacity-60")}>
                  <TitleCell
                    title={l.name}
                    muted={l.off}
                    actions={
                      !fixed && (
                        <RowActions>
                          {l.custom ? (
                            <RowLink danger onClick={() => removeLang(l.name)}>
                              حذف
                            </RowLink>
                          ) : (
                            <RowLink danger={!l.off} onClick={() => toggle("languagesOff", l.name, l.name, "lang")}>
                              {l.off ? "إعادة" : "إيقاف هذا الموسم"}
                            </RowLink>
                          )}
                        </RowActions>
                      )
                    }
                  />
                  <td className="p-3 align-top text-xs leading-5">{fixed ? <span className="text-white/45">—</span> : usedByText(`lang:${l.name}`)}</td>
                  <td className="p-3 align-top">{fixed ? <Tag tone="gold">ثابتة</Tag> : l.off ? <Tag tone="maroon">موقوفة</Tag> : l.custom ? <Tag tone="green">أضافتها الإدارة</Tag> : <Tag>من المنصة</Tag>}</td>
                </tr>
              );
            })}
          </ListTable>
        </div>
      }
      side={
        <Box title="إضافة لغة">
          <input value={lang} onChange={(e) => setLang(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLang()} placeholder="مثل: الإندونيسية" className={smallInputClass} aria-label="لغة جديدة" />
          <Button size="sm" variant="gold" disabled={!lang.trim()} onClick={addLang}>
            <Plus className="size-4" /> إضافة اللغة
          </Button>
        </Box>
      }
    />
  );
}

// ───────────────────────── One certificate ─────────────────────────

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
    <div className="space-y-5 text-sm">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-white/80">اسم الشهادة أو الوثيقة</span>
        <input value={draft.label} onChange={(e) => set({ label: e.target.value })} placeholder="مثل: شهادة تجويد القرآن الكريم" className={smallInputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-white/80">ملاحظة يقرؤها المتقدم تحت اسمها</span>
        <input value={draft.hint} onChange={(e) => set({ hint: e.target.value })} placeholder="مثل: صادرة خلال آخر سنتين (اختيارية)" className={smallInputClass} />
      </label>

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

      <div className="flex gap-2 border-t border-white/10 pt-4">
        <Button variant="gold" disabled={!draft.label.trim()} onClick={onSave}>
          <Check className="size-4" /> {saveLabel}
        </Button>
        <Button variant="glass" onClick={onCancel}>
          <X className="size-4" /> إلغاء
        </Button>
      </div>
      <p className="text-xs text-white/50">
        لتعديل كل الصفات معاً: <Link href="/staff/admins/manage?s=requirements" className="font-bold text-gold hover:underline">«شروط الصفات»</Link>.
      </p>
    </div>
  );
}
