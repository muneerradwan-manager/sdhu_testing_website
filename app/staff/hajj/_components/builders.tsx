"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FACTS, OPS, describe, factDef, isLeaf, type FactDef } from "@/lib/registration/conditions";
import type { Condition, ContentBlock, FieldDef, Leaf, Op } from "@/lib/registration/types";
import { cn } from "@/lib/utils";
import { smallInputClass, textareaClass } from "../../_components/kit";
import { selectClass } from "../../exam/_components/ui";
import { move, newId } from "./editor";

const OPS_BY_TYPE: Record<FactDef["type"], Op[]> = {
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "set", "unset"],
  enum: ["eq", "neq", "in", "nin", "set", "unset"],
  boolean: ["eq"],
};

/**
 * A condition as the staff build it: rows of «what — how — value», all of them or any of them. A condition
 * written another way (nested) is shown as text and can be rebuilt here.
 */
export function ConditionEditor({
  value,
  onChange,
  fields,
  member = false,
  empty = "دائماً (دون شرط)",
}: {
  value: Condition | undefined;
  onChange: (c: Condition | undefined) => void;
  /** The questions this condition may read */
  fields: FieldDef[];
  /** May read the member's own facts (a member question, a member rule) */
  member?: boolean;
  empty?: string;
}) {
  const mode: "all" | "any" = value && "any" in value ? "any" : "all";
  const rows: Leaf[] | null = !value ? [] : isLeaf(value) ? [value] : "all" in value && value.all.every(isLeaf) ? (value.all as Leaf[]) : "any" in value && value.any.every(isLeaf) ? (value.any as Leaf[]) : null;
  const facts: FactDef[] = [
    ...FACTS.filter((f) => member || !f.member),
    ...fields.filter((f) => f.scope === "application" || member).flatMap((f) => {
      const d = factDef(`${f.scope === "application" ? "answer" : "manswer"}:${f.key}`, fields);
      return d ? [{ ...d, label: `سؤال: ${f.label}` }] : [];
    }),
  ];
  const set = (list: Leaf[], m = mode) => onChange(list.length === 0 ? undefined : list.length === 1 && m === "all" ? list[0] : m === "all" ? { all: list } : { any: list });

  if (rows === null) {
    return (
      <div className="rounded-2xl bg-black/15 p-3 text-sm text-white/85 ring-1 ring-white/10">
        {describe(value, fields)}
        <Button size="sm" variant="glass" className="mt-2" onClick={() => onChange(undefined)}>
          إعادة بنائه
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl bg-black/15 p-3 ring-1 ring-white/10">
      {rows.length === 0 && <p className="text-sm text-white/65">{empty}</p>}
      {rows.length > 1 && (
        <select value={mode} onChange={(e) => set(rows, e.target.value as "all" | "any")} className={cn(selectClass, "h-9 w-auto py-0 text-sm")} aria-label="ربط الشروط">
          <option value="all">تتحقق كل الشروط</option>
          <option value="any">يتحقق أي شرط منها</option>
        </select>
      )}
      {rows.map((l, i) => {
        const def = facts.find((f) => f.key === l.fact) ?? factDef(l.fact, fields);
        const ops = OPS_BY_TYPE[def?.type ?? "enum"];
        const patch = (p: Partial<Leaf>) => set(rows.map((x, j) => (j === i ? { ...x, ...p } : x)));
        const multi = l.op === "in" || l.op === "nin";
        return (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
            <select
              value={l.fact}
              onChange={(e) => {
                const d = facts.find((f) => f.key === e.target.value);
                patch({ fact: e.target.value as Leaf["fact"], op: OPS_BY_TYPE[d?.type ?? "enum"][0], value: d?.type === "boolean" ? true : undefined });
              }}
              className={cn(selectClass, "h-10 py-0 text-sm")}
              aria-label="ما يُقرأ"
            >
              {!def && <option value={l.fact}>{l.fact}</option>}
              {facts.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select value={l.op} onChange={(e) => patch({ op: e.target.value as Op })} className={cn(selectClass, "h-10 py-0 text-sm")} aria-label="المقارنة">
              {ops.map((o) => (
                <option key={o} value={o}>
                  {OPS[o]}
                </option>
              ))}
            </select>
            {l.op === "set" || l.op === "unset" ? (
              <span />
            ) : def?.type === "boolean" ? (
              <select value={String(l.value ?? true)} onChange={(e) => patch({ value: e.target.value === "true" })} className={cn(selectClass, "h-10 py-0 text-sm")} aria-label="القيمة">
                <option value="true">نعم</option>
                <option value="false">لا</option>
              </select>
            ) : def?.options?.length ? (
              multi ? (
                <div className="flex flex-wrap gap-1">
                  {def.options.map((o) => {
                    const vals = (Array.isArray(l.value) ? l.value : l.value === undefined ? [] : [l.value]).map(String);
                    const on = vals.includes(o.value);
                    return (
                      <button key={o.value} type="button" aria-pressed={on} onClick={() => patch({ value: on ? vals.filter((v) => v !== o.value) : [...vals, o.value] })} className={cn("rounded-full px-2 py-1 text-xs font-bold ring-1", on ? "bg-green-light/30 text-white ring-green-light/50" : "text-white/60 ring-white/15")}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <select value={String(l.value ?? "")} onChange={(e) => patch({ value: e.target.value })} className={cn(selectClass, "h-10 py-0 text-sm")} aria-label="القيمة">
                  <option value="">اختر…</option>
                  {def.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <input
                type={def?.type === "number" ? "number" : "text"}
                value={Array.isArray(l.value) ? l.value.join("،") : String(l.value ?? "")}
                onChange={(e) => patch({ value: def?.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : multi ? e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) : e.target.value })}
                className={cn(smallInputClass, "h-10")}
                aria-label="القيمة"
                dir={def?.type === "number" ? "ltr" : undefined}
              />
            )}
            <button type="button" onClick={() => set(rows.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-xl text-white/60 hover:bg-maroon/40 hover:text-white" aria-label="حذف الشرط">
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}
      <Button size="sm" variant="glass" onClick={() => set([...rows, { fact: facts[0].key, op: OPS_BY_TYPE[facts[0].type][0], value: facts[0].type === "boolean" ? true : undefined }])}>
        <Plus className="size-4" /> إضافة شرط
      </Button>
      {value && <p className="text-xs leading-5 text-white/60">يُقرأ: {describe(value, fields)}</p>}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="grid size-10 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white" aria-label={label} title={label}>
      {children}
    </button>
  );
}


const BLOCKS: { kind: ContentBlock["kind"]; label: string }[] = [
  { kind: "paragraph", label: "فقرة" },
  { kind: "notice", label: "تنبيه" },
  { kind: "cards", label: "بطاقات" },
  { kind: "checklist", label: "قائمة متطلبات" },
];

function blankBlock(kind: ContentBlock["kind"]): ContentBlock {
  const id = newId("b");
  if (kind === "paragraph") return { id, kind, text: "" };
  if (kind === "notice") return { id, kind, tone: "info", text: "" };
  if (kind === "cards") return { id, kind, items: [{ id: newId("c"), emoji: "📌", title: "", text: "" }] };
  return { id, kind, items: [{ id: newId("i"), text: "" }] };
}

/** A page's content: paragraphs, notices, cards and lists of requirements, in order */
export function ContentEditor({ blocks, onChange }: { blocks: ContentBlock[]; onChange: (b: ContentBlock[]) => void }) {
  const set = (i: number, b: ContentBlock) => onChange(blocks.map((x, j) => (j === i ? b : x)));
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={b.id} className="rounded-2xl bg-black/15 p-3 ring-1 ring-white/10">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-bold text-gold">{BLOCKS.find((x) => x.kind === b.kind)?.label}</span>
            {b.kind === "notice" && (
              <select value={b.tone} onChange={(e) => set(i, { ...b, tone: e.target.value as "info" | "warn" })} className={cn(selectClass, "h-8 w-auto py-0 text-xs")} aria-label="نوع التنبيه">
                <option value="info">معلومة</option>
                <option value="warn">تحذير</option>
              </select>
            )}
            <span className="mr-auto flex">
              <IconBtn label="أعلى" onClick={() => onChange(move(blocks, i, -1))}>
                <ArrowUp className="size-4" />
              </IconBtn>
              <IconBtn label="أسفل" onClick={() => onChange(move(blocks, i, 1))}>
                <ArrowDown className="size-4" />
              </IconBtn>
              <IconBtn label="حذف" onClick={() => onChange(blocks.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" />
              </IconBtn>
            </span>
          </div>
          {(b.kind === "paragraph" || b.kind === "notice") && <textarea rows={3} value={b.text} onChange={(e) => set(i, { ...b, text: e.target.value })} className={textareaClass} aria-label="النص" />}
          {b.kind === "cards" && (
            <div className="space-y-2">
              {b.items.map((it, k) => (
                <div key={it.id} className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                  <input value={it.emoji} onChange={(e) => set(i, { ...b, items: b.items.map((x) => (x.id === it.id ? { ...x, emoji: e.target.value } : x)) })} className={cn(smallInputClass, "h-10 text-center")} aria-label="رمز" />
                  <input value={it.title} placeholder="العنوان" onChange={(e) => set(i, { ...b, items: b.items.map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x)) })} className={cn(smallInputClass, "h-10")} aria-label={`عنوان البطاقة ${k + 1}`} />
                  <input value={it.text} placeholder="النص" onChange={(e) => set(i, { ...b, items: b.items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) })} className={cn(smallInputClass, "h-10")} aria-label={`نص البطاقة ${k + 1}`} />
                  <IconBtn label="حذف البطاقة" onClick={() => set(i, { ...b, items: b.items.filter((x) => x.id !== it.id) })}>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              ))}
              <Button size="sm" variant="glass" onClick={() => set(i, { ...b, items: [...b.items, { id: newId("c"), emoji: "📌", title: "", text: "" }] })}>
                <Plus className="size-4" /> بطاقة
              </Button>
            </div>
          )}
          {b.kind === "checklist" && (
            <div className="space-y-2">
              {b.items.map((it, k) => (
                <div key={it.id} className="flex gap-2">
                  <input value={it.text} onChange={(e) => set(i, { ...b, items: b.items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)) })} className={cn(smallInputClass, "h-10")} aria-label={`البند ${k + 1}`} />
                  <IconBtn label="حذف البند" onClick={() => set(i, { ...b, items: b.items.filter((x) => x.id !== it.id) })}>
                    <Trash2 className="size-4" />
                  </IconBtn>
                </div>
              ))}
              <Button size="sm" variant="glass" onClick={() => set(i, { ...b, items: [...b.items, { id: newId("i"), text: "" }] })}>
                <Plus className="size-4" /> بند
              </Button>
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {BLOCKS.map((x) => (
          <Button key={x.kind} size="sm" variant="glass" onClick={() => onChange([...blocks, blankBlock(x.kind)])}>
            <Plus className="size-4" /> {x.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
