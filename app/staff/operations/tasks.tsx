"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { SEED_TASKS, type TaskColumn } from "@/lib/data/staff-seed";
import { useStore } from "@/lib/store";
import { Drawer, logAs, smallInputClass, useStaffUser } from "../_components/kit";
import { AddButton, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { Field, Segments } from "../exam/_components/ui";

const COLUMNS: { key: TaskColumn; label: string; tone: "muted" | "gold" | "green" }[] = [
  { key: "todo", label: "جديدة", tone: "muted" },
  { key: "doing", label: "قيد التنفيذ", tone: "gold" },
  { key: "done", label: "منجزة", tone: "green" },
  { key: "verified", label: "تم التحقق", tone: "green" },
];
const COLUMN_BY_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.label, c.key])) as Record<string, TaskColumn>;

/** Tasks and their columns are replayed from the append-only log */
export function useTasks() {
  const events = useStore((s) => s.events);
  return useMemo(() => {
    const created = events
      .filter((e) => e.action === "إنشاء مهمة داخلية" && e.detail)
      .map((e) => ({ id: e.detail!, title: e.target ?? "", by: e.actor, to: e.after ?? "", column: "todo" as TaskColumn, evidence: "حسب المهمة", due: "اليوم" }));
    return [...created.reverse(), ...SEED_TASKS].map((t) => {
      const moves = events.filter((e) => e.action === "نقل مهمة داخلية" && e.detail === t.id);
      const last = moves.at(-1);
      return { ...t, column: last?.after ? (COLUMN_BY_LABEL[last.after] ?? t.column) : t.column };
    });
  }, [events]);
}

/**
 * The room's internal tasks as a list: each moves a step forward or back from the links under its title,
 * and «مهمة جديدة» opens a sheet.
 */
export function TasksList() {
  const user = useStaffUser()!;
  const toast = useToast();
  const tasks = useTasks();
  const [filter, setFilter] = useState<TaskColumn | "all">("all");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [to, setTo] = useState("");
  const shown = tasks.filter((t) => filter === "all" || t.column === filter);

  const move = (id: string, column: TaskColumn) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || t.column === column) return;
    const from = COLUMNS.find((c) => c.key === t.column)!.label;
    const toLabel = COLUMNS.find((c) => c.key === column)!.label;
    logAs(user, { action: "نقل مهمة داخلية", target: t.title, detail: t.id, before: from, after: toLabel });
    if (column === "verified") toast({ title: "تم التحقق من المهمة", body: t.title, tone: "success", icon: "✔️" });
  };

  const create = () => {
    if (title.trim().length < 5) return;
    logAs(user, { action: "إنشاء مهمة داخلية", target: title.trim(), detail: `T-${Date.now().toString(36).slice(-4).toUpperCase()}`, after: to.trim() || "غرفة العمليات" });
    setTitle("");
    setTo("");
    setAdding(false);
    toast({ title: "أُنشئت المهمة", tone: "info", icon: "📝" });
  };

  return (
    <div className="space-y-4">
      <AddButton onClick={() => setAdding(true)}>+ مهمة جديدة</AddButton>
      <Segments
        value={filter}
        onChange={setFilter}
        label="تصفية المهام"
        items={[{ value: "all" as const, label: "الكل", count: tasks.length }, ...COLUMNS.map((c) => ({ value: c.key, label: c.label, count: tasks.filter((t) => t.column === c.key).length }))]}
      />
      <ListTable head={["المهمة", "من ← إلى", "الدليل والموعد", "الحالة"]}>
        {shown.length === 0 && <EmptyRow cols={4}>لا مهام هنا.</EmptyRow>}
        {shown.map((t) => {
          const ci = COLUMNS.findIndex((c) => c.key === t.column);
          const prev = COLUMNS[ci - 1];
          const next = COLUMNS[ci + 1];
          return (
            <tr key={t.id} className={t.title.includes("البرج (ب)") ? "bg-gold/[.07] align-top" : "align-top"}>
              <td className="p-3">
                <p className="font-bold leading-6 text-white">{t.title}</p>
                <RowActions>
                  {next && <RowLink onClick={() => move(t.id, next.key)}>نقل إلى «{next.label}»</RowLink>}
                  {prev && <RowLink onClick={() => move(t.id, prev.key)}>إرجاع إلى «{prev.label}»</RowLink>}
                </RowActions>
              </td>
              <td className="p-3 text-xs text-white/75">
                {t.by} ← {t.to}
              </td>
              <td className="p-3 text-xs text-white/75">
                {t.evidence} · {t.due}
              </td>
              <td className="p-3">
                <Tag tone={COLUMNS[ci].tone}>{COLUMNS[ci].label}</Tag>
              </td>
            </tr>
          );
        })}
      </ListTable>

      <Drawer
        open={adding}
        onClose={() => setAdding(false)}
        title="مهمة جديدة"
        width="max-w-md"
        footer={
          <Button variant="gold" className="w-full" onClick={create} disabled={title.trim().length < 5}>
            <Plus className="size-4" /> إضافة المهمة
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="عنوان المهمة" hint="خمسة أحرف على الأقل.">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={smallInputClass} />
          </Field>
          <Field label="تُسند إلى" hint="فارغ = غرفة العمليات.">
            <input value={to} onChange={(e) => setTo(e.target.value)} className={smallInputClass} />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
