"use client";

import { ArrowDown, ArrowUp, Cpu, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DEFAULT_COORDINATOR_TIERS, coordinatorTierCondition, coordinatorsLabel, useCoordinatorTiers, type CoordinatorTier } from "@/app/administrator/_lib/coordinators";
import { Drawer, Panel, smallInputClass, useStaffUser } from "../../_components/kit";
import { logAdmins } from "../desk";

/**
 * How many technical coordinators each cluster has. The coordinator is the cluster's, never a group's: the
 * cluster head invites as many as his cluster's category allows and sorts its groups among them. The
 * categories go by the groups the cluster takes and its head's last rating, the first that fits in order.
 */
export function CoordinatorTiersPanel() {
  const tiers = useCoordinatorTiers();
  const edited = useStore((s) => s.adminRules.coordinatorTiers) !== undefined;
  const [editing, setEditing] = useState(false);
  return (
    <Panel
      icon={<Cpu />}
      title="فئات منسقي التكتلات"
      action={
        <Button size="sm" variant="glass" onClick={() => setEditing(true)}>
          تعديل الفئات
        </Button>
      }
    >
      <p className="mb-3 text-sm leading-7 text-white/70">
        المنسق التقني للتكتل لا للمجموعة. لكل تكتل منسقون بعدد أول فئة تنطبق عليه بهذا الترتيب، بحسب سعته من المجموعات وتقييم رئيسه في آخر موسم. يدعوهم رئيس التكتل، ويفرز عليهم مجموعات تكتله: لكل مجموعة منسق واحد، وللمنسق مجموعة أو أكثر.
        {edited && <span className="font-bold text-gold"> عُدّلت هذا الموسم.</span>}
      </p>
      <ol className="grid gap-2 md:grid-cols-2">
        {tiers.map((t, i) => (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/20 text-sm font-bold text-gold">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-white">{t.label}</span>
              <span className="block text-xs leading-5 text-white/60">{coordinatorTierCondition(t)}</span>
            </span>
            <span className="shrink-0 text-center">
              <span className="block font-display text-2xl font-bold tabular-nums text-gold">{t.coordinators}</span>
              <span className="block text-[11px] text-white/60">{t.coordinators === 1 ? "منسق" : "منسقين"}</span>
            </span>
          </li>
        ))}
      </ol>
      <Drawer open={editing} onClose={() => setEditing(false)} title="فئات منسقي التكتلات" width="max-w-2xl">
        {editing && <TiersForm tiers={tiers} edited={edited} onClose={() => setEditing(false)} />}
      </Drawer>
    </Panel>
  );
}

function TiersForm({ tiers, edited, onClose }: { tiers: CoordinatorTier[]; edited: boolean; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [rows, setRows] = useState<CoordinatorTier[]>(tiers);
  const set = (i: number, patch: Partial<CoordinatorTier>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: number) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setRows(next);
  };
  const rating = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Math.min(5, Number(v))));
  const count = (v: string) => (v.trim() === "" ? undefined : Math.max(1, Math.round(Number(v) || 1)));
  const invalid = rows.some((r) => !r.label.trim() || !(r.coordinators > 0) || (r.minRating !== undefined && r.maxRating !== undefined && r.minRating >= r.maxRating));

  const save = () => {
    const clean = rows.map((r) => ({ ...r, label: r.label.trim() }));
    actions.setAdminRules({ coordinatorTiers: clean });
    const line = (t: CoordinatorTier) => `${t.label} ${t.coordinators}`;
    logAdmins(user, "clusters", { action: "تعديل فئات منسقي التكتلات", target: "موسم 1448", before: tiers.map(line).join("، "), after: clean.map(line).join("، "), important: true });
    toast({ title: "حُفظت فئات المنسقين", body: "يدعو بها كل رئيس تكتل منسقيه.", tone: "success", icon: "💾" });
    onClose();
  };
  const reset = () => {
    actions.setAdminRules({ coordinatorTiers: undefined });
    logAdmins(user, "clusters", { action: "إعادة فئات منسقي التكتلات إلى الأصل", target: "موسم 1448", important: true });
    toast({ title: "عادت فئات المنسقين إلى الأصل", tone: "info", icon: "↩️" });
    onClose();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-white/70">
        لكل فئة اسمها، ومن تنطبق عليه: تكتل سعته حتى عدد من المجموعات (فارغاً لأي عدد)، وتقييم رئيسه ضمن مدى من 5 (الحد الأدنى داخل فيه والأعلى خارج)، ثم عدد منسقيه. تُفحص الفئات بترتيبها، ويأخذ التكتل عدد أول فئة تنطبق عليه.
      </p>
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id} className="space-y-3 rounded-2xl bg-white/[.06] p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/20 text-sm font-bold text-gold">{i + 1}</span>
              <input value={r.label} onChange={(e) => set(i, { label: e.target.value })} className={smallInputClass} aria-label={`اسم فئة المنسقين ${i + 1}`} />
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="نقل الفئة إلى الأعلى" className="grid size-9 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-white/10 disabled:opacity-30">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="نقل الفئة إلى الأسفل" className="grid size-9 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-white/10 disabled:opacity-30">
                <ArrowDown className="size-4" />
              </button>
              <button type="button" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`حذف فئة المنسقين ${i + 1}`} className="grid size-9 shrink-0 place-items-center rounded-xl text-white/70 hover:bg-maroon/40 disabled:opacity-30">
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">سعته حتى (مجموعة)</span>
                <input type="number" min={1} value={r.maxGroups ?? ""} onChange={(e) => set(i, { maxGroups: count(e.target.value) })} placeholder="أي عدد" className={cn(smallInputClass, "w-28 text-center")} dir="ltr" aria-label={`أقصى سعة للفئة ${i + 1}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">تقييم رئيسه من</span>
                <input type="number" min={0} max={5} step={0.1} value={r.minRating ?? ""} onChange={(e) => set(i, { minRating: rating(e.target.value) })} placeholder="—" className={cn(smallInputClass, "w-24 text-center")} dir="ltr" aria-label={`أدنى تقييم لفئة المنسقين ${i + 1}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">إلى ما دون</span>
                <input type="number" min={0} max={5} step={0.1} value={r.maxRating ?? ""} onChange={(e) => set(i, { maxRating: rating(e.target.value) })} placeholder="—" className={cn(smallInputClass, "w-24 text-center")} dir="ltr" aria-label={`أعلى تقييم لفئة المنسقين ${i + 1}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-white/60">عدد المنسقين</span>
                <input type="number" min={1} value={r.coordinators} onChange={(e) => set(i, { coordinators: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className={cn(smallInputClass, "w-24 text-center font-display text-lg")} dir="ltr" aria-label={`عدد منسقي الفئة ${i + 1}`} />
              </label>
              <span className="pb-3 text-xs text-white/60">{r.coordinators > 0 ? coordinatorsLabel(r.coordinators) : ""}</span>
            </div>
          </li>
        ))}
      </ol>
      <Button size="sm" variant="glass" onClick={() => setRows([...rows, { id: `c-${Date.now().toString(36)}`, label: "", coordinators: 1 }])}>
        <Plus className="size-4" /> فئة جديدة
      </Button>
      {invalid && <p className="text-xs font-bold text-gold">لكل فئة اسم وعدد منسقين، وحد التقييم الأدنى أقل من الأعلى.</p>}
      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        <Button variant="gold" disabled={invalid} onClick={save}>
          حفظ الفئات
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
        {edited && (
          <Button variant="ghost" className="text-white" onClick={reset}>
            <RotateCcw className="size-4" /> إعادة إلى الأصل ({DEFAULT_COORDINATOR_TIERS.length} فئات)
          </Button>
        )}
      </div>
    </div>
  );
}
