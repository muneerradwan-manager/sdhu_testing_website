"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Columns3, Copy, GripVertical, Plus, Rows3, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { smallInputClass, textareaClass } from "../../_components/kit";

/** كتل متن المقال — نفس الأنواع التي يعرضها قارئ الأخبار */
export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "callout"; title: string; text: string; tone?: "gold" | "maroon" | "green" }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  | { type: "quote"; text: string; by?: string };

const LABELS: Record<Block["type"], string> = {
  p: "فقرة",
  h: "عنوان فرعي",
  list: "قائمة",
  callout: "تنبيه",
  table: "جدول",
  quote: "اقتباس",
};

const BLANK: Record<Block["type"], Block> = {
  p: { type: "p", text: "" },
  h: { type: "h", text: "" },
  list: { type: "list", items: [""], ordered: false },
  callout: { type: "callout", title: "", text: "", tone: "gold" },
  table: { type: "table", caption: "", head: ["", ""], rows: [["", ""]] },
  quote: { type: "quote", text: "", by: "" },
};

/** ملخّص سطر واحد يظهر على رأس الكتلة المطوية */
function preview(b: Block) {
  switch (b.type) {
    case "p":
    case "h":
    case "quote":
      return b.text;
    case "list":
      return b.items.filter(Boolean).join(" · ");
    case "callout":
      return [b.title, b.text].filter(Boolean).join(" — ");
    case "table":
      return b.caption || b.head.filter(Boolean).join(" | ");
  }
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/**
 * محرّر متن المقال: كتل مرتّبة يضيفها الموظف ويحرّكها ويحذفها،
 * بنفس الأنواع التي تعرضها صفحة الخبر — فما يراه هنا هو ما سيُنشر.
 */
export function BlocksField({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const blocks: Block[] = Array.isArray(value) ? (value as Block[]) : [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const write = (next: Block[]) => onChange(next);
  const patch = (i: number, part: Partial<Block>) => write(blocks.map((b, k) => (k === i ? ({ ...b, ...part } as Block) : b)));

  const add = (type: Block["type"]) => {
    write([...blocks, clone(BLANK[type])]);
    setOpenIndex(blocks.length);
    setAdding(false);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    write(next);
    setOpenIndex(j);
  };

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-2.5">
      <AnimatePresence initial={false}>
        {blocks.map((b, i) => {
          const open = openIndex === i;
          return (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[.04]"
            >
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="shrink-0 rounded-lg bg-gold/20 px-2 py-1 text-[11px] font-bold text-gold">{LABELS[b.type]}</span>
                <button type="button" onClick={() => setOpenIndex(open ? null : i)} className="min-w-0 flex-1 truncate py-1.5 text-right text-sm text-white/85">
                  {preview(b) || "…"}
                </button>
                <div className="flex shrink-0 items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="أعلى" className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-25">
                    <GripVertical className="size-4 rotate-90" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} title="أسفل" className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-25">
                    <GripVertical className="size-4 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    title="تكرار"
                    onClick={() => {
                      const next = [...blocks];
                      next.splice(i + 1, 0, clone(b));
                      write(next);
                      setOpenIndex(i + 1);
                    }}
                    className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="حذف"
                    onClick={() => {
                      write(blocks.filter((_, k) => k !== i));
                      setOpenIndex(null);
                    }}
                    className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-maroon/40 hover:text-white"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button type="button" onClick={() => setOpenIndex(open ? null : i)} aria-expanded={open} className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white">
                    <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
                  </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="border-t border-white/10 p-3">
                      <Body block={b} onPatch={(part) => patch(i, part)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {adding ? (
        <div className="flex flex-wrap gap-2 rounded-xl border-2 border-dashed border-gold/50 p-2.5">
          {(Object.keys(LABELS) as Block["type"][]).map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-gold hover:text-ink">
              {LABELS[t]}
            </button>
          ))}
          <button type="button" onClick={() => setAdding(false)} className="mr-auto rounded-xl px-3 py-2 text-xs font-bold text-white/60 hover:text-white">
            إلغاء
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 py-2.5 text-sm font-bold text-white/70 transition hover:border-gold/60 hover:text-white"
        >
          <Plus className="size-4" /> إضافة كتلة
        </button>
      )}
    </div>
  );
}

function Body({ block, onPatch }: { block: Block; onPatch: (part: Partial<Block>) => void }) {
  switch (block.type) {
    case "p":
      return <textarea value={block.text} onChange={(e) => onPatch({ text: e.target.value })} rows={5} className={textareaClass} placeholder="نص الفقرة…" />;

    case "h":
      return <input value={block.text} onChange={(e) => onPatch({ text: e.target.value })} className={smallInputClass} placeholder="العنوان الفرعي" />;

    case "quote":
      return (
        <div className="space-y-3">
          <textarea value={block.text} onChange={(e) => onPatch({ text: e.target.value })} rows={3} className={textareaClass} placeholder="نص الاقتباس" />
          <input value={block.by ?? ""} onChange={(e) => onPatch({ by: e.target.value })} className={smallInputClass} placeholder="القائل" />
        </div>
      );

    case "callout":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <input value={block.title} onChange={(e) => onPatch({ title: e.target.value })} className={smallInputClass} placeholder="عنوان التنبيه" />
          <select value={block.tone ?? "gold"} onChange={(e) => onPatch({ tone: e.target.value as "gold" | "maroon" | "green" })} className={smallInputClass}>
            <option value="gold" className="bg-green-dark">
              ذهبي — معلومة
            </option>
            <option value="green" className="bg-green-dark">
              أخضر — طمأنة
            </option>
            <option value="maroon" className="bg-green-dark">
              عنّابي — تحذير
            </option>
          </select>
          <div className="md:col-span-2">
            <textarea value={block.text} onChange={(e) => onPatch({ text: e.target.value })} rows={3} className={textareaClass} placeholder="نص التنبيه" />
          </div>
        </div>
      );

    case "list":
      return <ListBody block={block} onPatch={onPatch} />;

    case "table":
      return <TableBody block={block} onPatch={onPatch} />;
  }
}

function ListBody({ block, onPatch }: { block: Extract<Block, { type: "list" }>; onPatch: (part: Partial<Block>) => void }) {
  const set = (items: string[]) => onPatch({ items });
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-white/80">
        <input type="checkbox" checked={!!block.ordered} onChange={(e) => onPatch({ ordered: e.target.checked })} className="size-4 accent-gold" />
        قائمة مرقّمة
      </label>
      {block.items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input value={it} onChange={(e) => set(block.items.map((x, k) => (k === i ? e.target.value : x)))} className={smallInputClass} placeholder={`البند ${i + 1}`} />
          <button
            type="button"
            title="حذف البند"
            onClick={() => set(block.items.filter((_, k) => k !== i))}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white/60 transition hover:bg-maroon/40 hover:text-white"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => set([...block.items, ""])}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 py-2 text-xs font-bold text-white/70 transition hover:border-gold/60 hover:text-white"
      >
        <Plus className="size-3.5" /> بند جديد
      </button>
    </div>
  );
}

function TableBody({ block, onPatch }: { block: Extract<Block, { type: "table" }>; onPatch: (part: Partial<Block>) => void }) {
  const cols = block.head.length;

  const setCell = (r: number, c: number, v: string) =>
    onPatch({
      rows: block.rows.map((row, k) => (k === r ? Array.from({ length: cols }, (_, cc) => (cc === c ? v : (row[cc] ?? ""))) : row)),
    });

  return (
    <div className="space-y-3">
      <input value={block.caption ?? ""} onChange={(e) => onPatch({ caption: e.target.value })} className={smallInputClass} placeholder="عنوان الجدول (اختياري)" />

      <div className="scrollbar-none overflow-x-auto pb-1">
        <div className="min-w-max space-y-1.5">
          <div className="flex gap-1.5">
            {block.head.map((h, c) => (
              <div key={c} className="group relative">
                <input
                  value={h}
                  onChange={(e) => onPatch({ head: block.head.map((x, k) => (k === c ? e.target.value : x)) })}
                  className={cn(smallInputClass, "w-40 border-gold/40 font-bold")}
                  placeholder={`العمود ${c + 1}`}
                />
                {cols > 1 && (
                  <button
                    type="button"
                    title="حذف العمود"
                    onClick={() => onPatch({ head: block.head.filter((_, k) => k !== c), rows: block.rows.map((r) => r.filter((_, k) => k !== c)) })}
                    className="absolute -top-2 left-1 grid size-5 place-items-center rounded-full bg-maroon text-white opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {block.rows.map((row, r) => (
            <div key={r} className="flex gap-1.5">
              {Array.from({ length: cols }, (_, c) => (
                <input key={c} value={row[c] ?? ""} onChange={(e) => setCell(r, c, e.target.value)} className={cn(smallInputClass, "w-40")} placeholder={`صف ${r + 1}`} />
              ))}
              <button
                type="button"
                title="حذف الصف"
                onClick={() => onPatch({ rows: block.rows.filter((_, k) => k !== r) })}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white/60 transition hover:bg-maroon/40 hover:text-white"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPatch({ rows: [...block.rows, Array<string>(cols).fill("")] })}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
        >
          <Rows3 className="size-4" /> صف جديد
        </button>
        <button
          type="button"
          onClick={() => onPatch({ head: [...block.head, ""], rows: block.rows.map((r) => [...r, ""]) })}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
        >
          <Columns3 className="size-4" /> عمود جديد
        </button>
      </div>
    </div>
  );
}
