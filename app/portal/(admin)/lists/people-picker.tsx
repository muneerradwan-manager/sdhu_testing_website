"use client";

import { Check, Search, UserRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";

export type PickPerson = {
  id: string;
  name: string;
  administrator?: boolean;
  /** What is shown beside him: his age, his role, «يُنقل من RB 508» */
  note?: string;
  /** Why he cannot be picked here (already on it, his flight is locked…) */
  blocked?: string;
  /** The family he belongs to, to head his rows */
  family?: string;
};
export type PickGroup = { number: number; title: string; sub?: string; people: PickPerson[] };

/**
 * One way to put people on anything in «القوائم» — a flight, a bus, the Rawdah: a single button opens this picker.
 * The groups are tabs along its top; in the chosen group «الكل» ticks every one of its people who can go, and then
 * whoever is not going is unticked one by one. Picks are kept while moving between groups, so several groups (or
 * parts of them) go in one step.
 */
export function PeoplePicker({ title, subtitle, groups, capacity, extra, confirm, onConfirm, onClose }: { title: ReactNode; subtitle?: ReactNode; groups: PickGroup[]; capacity?: number; extra?: ReactNode; confirm: string; onConfirm: (ids: string[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState(groups[0]?.number);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const g = groups.find((x) => x.number === tab) ?? groups[0];
  const open = (p: PickPerson) => !p.blocked;
  const shown = useMemo(() => (g ? g.people.filter((p) => !q.trim() || p.name.includes(q.trim())) : []), [g, q]);
  const pickable = g ? g.people.filter(open).map((p) => p.id) : [];
  const allOn = pickable.length > 0 && pickable.every((id) => picked.includes(id));
  const toggle = (ids: string[], on: boolean) => setPicked((x) => (on ? [...new Set([...x, ...ids])] : x.filter((id) => !ids.includes(id))));
  const over = capacity !== undefined && picked.length > capacity;
  // His rows under his family's name, in the order they come
  const families: { family?: string; people: PickPerson[] }[] = [];
  for (const p of shown) {
    const last = families.at(-1);
    if (last && last.family === p.family) last.people.push(p);
    else families.push({ family: p.family, people: [p] });
  }

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-green-dark">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}

      {/* The groups, as tabs: each with how many of it are picked */}
      <div className="scrollbar-none -mx-1 mt-4 overflow-x-auto px-1">
        <div role="tablist" aria-label="المجموعات" className="flex w-max gap-1.5">
          {groups.map((x) => {
            const n = x.people.filter((p) => picked.includes(p.id)).length;
            const on = x.number === g?.number;
            return (
              <button key={x.number} type="button" role="tab" aria-selected={on} onClick={() => setTab(x.number)} className={cn("flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-sm font-bold transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/40 bg-white text-ink-soft hover:border-green-dark/40")}>
                {x.title}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", n ? (on ? "bg-gold text-ink" : "bg-green-light/15 text-green") : on ? "bg-white/15" : "bg-sand text-hint")}>{n}/{x.people.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {g && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className={cn("flex h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold", allOn ? "border-green-dark bg-green-dark/5 text-green-dark" : "border-gold/40 text-ink")}>
              <input type="checkbox" className="size-4 accent-[#00594f]" checked={allOn} disabled={!pickable.length} onChange={(e) => toggle(pickable, e.target.checked)} />
              الكل في {g.title} ({pickable.length})
            </label>
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم" aria-label="ابحث بالاسم" className="h-11 w-full rounded-2xl bg-sand ps-9 pe-3 text-sm outline-none focus:ring-4 focus:ring-green-light/15" />
            </label>
          </div>
          {g.sub && <p className="mt-2 text-xs text-hint">{g.sub}</p>}
          <div className="mt-3 max-h-80 overflow-y-auto overscroll-contain rounded-2xl border border-gold/25">
            {families.map((f, i) => (
              <div key={`${f.family ?? "-"}-${i}`}>
                {f.family && <p className="sticky top-0 z-10 bg-sand px-3 py-1.5 text-xs font-bold text-green-dark">{f.family}</p>}
                {f.people.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <label key={p.id} className={cn("flex items-center gap-3 border-t border-gold/10 px-3 py-2 text-sm first:border-t-0", p.blocked ? "cursor-not-allowed opacity-55" : on ? "cursor-pointer bg-green/5" : "cursor-pointer hover:bg-sand/50")}>
                      <input type="checkbox" className="size-4 accent-[#00594f]" checked={on} disabled={!!p.blocked} onChange={(e) => toggle([p.id], e.target.checked)} />
                      <UserRound className={cn("size-4 shrink-0", p.administrator ? "text-maroon" : "text-green-dark")} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{p.blocked ?? p.note}</span>
                    </label>
                  );
                })}
              </div>
            ))}
            {shown.length === 0 && <p className="p-4 text-center text-sm text-hint">لا أحد بهذا الاسم في {g.title}.</p>}
          </div>
        </>
      )}

      {extra}
      <p className={cn("mt-3 text-sm", over ? "font-bold text-maroon" : "text-ink-soft")}>
        اخترت {picked.length}
        {capacity !== undefined ? ` من ${capacity} مقعداً باقية` : ""}
        {groups.filter((x) => x.people.some((p) => picked.includes(p.id))).length > 1 ? ` — من ${groups.filter((x) => x.people.some((p) => picked.includes(p.id))).length} مجموعات` : ""}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>رجوع</Button>
        <Button onClick={() => onConfirm(picked)} disabled={!picked.length || over}>
          <Check className="size-4" /> {confirm}
        </Button>
      </div>
    </Modal>
  );
}
