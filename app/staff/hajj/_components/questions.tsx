"use client";

import { AlignRight, ArrowDown, ArrowUp, Calendar, CheckSquare, ChevronDown, CircleDot, Hash, ListChecks, Pencil, Plus, SquareCheckBig, Trash2, Type } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Condition, FieldDef, FieldType } from "@/lib/registration/types";
import { cn } from "@/lib/utils";
import { smallInputClass } from "../../_components/kit";
import { Switch, selectClass } from "../../exam/_components/ui";
import { ConditionEditor } from "./builders";
import { move, newId } from "./editor";

/**
 * Who something is for, in the words the staff use — each a ready condition. Anything else is «شرط مخصص»,
 * built under «خيارات متقدمة».
 */
export type Preset = { key: string; label: string; cond?: Condition };

export const AUDIENCES: Preset[] = [
  { key: "all", label: "كل الحجاج" },
  { key: "direct", label: "من يسجّل على القبول المباشر", cond: { fact: "track", op: "eq", value: "direct" } },
  { key: "lottery", label: "من يسجّل على القرعة", cond: { fact: "track", op: "eq", value: "lottery" } },
  { key: "abroad", label: "من يقيم خارج سوريا", cond: { fact: "abroad", op: "eq", value: true } },
  { key: "other", label: "من يقدّم الطلب لشخص آخر", cond: { fact: "forWhom", op: "eq", value: "other" } },
  { key: "family", label: "الطلبات التي فيها مرافقون", cond: { fact: "companionsCount", op: "gte", value: 1 } },
  { key: "elderly", label: "الطلبات التي فيها كبير سن", cond: { fact: "hasElderly", op: "eq", value: true } },
];

export const MEMBERS: Preset[] = [
  { key: "all", label: "كل أفراد الطلب" },
  { key: "women", label: "النساء", cond: { fact: "member.gender", op: "eq", value: "F" } },
  { key: "men", label: "الرجال", cond: { fact: "member.gender", op: "eq", value: "M" } },
  { key: "60", label: "من بلغ 60 عاماً فأكثر", cond: { fact: "member.age", op: "gte", value: 60 } },
  { key: "applicant", label: "صاحب الطلب وحده", cond: { fact: "member.isApplicant", op: "eq", value: true } },
];

export const presetOf = (list: Preset[], c: Condition | undefined) => list.find((p) => JSON.stringify(p.cond) === JSON.stringify(c))?.key ?? "custom";

export const presetLabel = (list: Preset[], c: Condition | undefined) => list.find((p) => p.key === presetOf(list, c))?.label ?? "شرط مخصص";

/** «لمن؟» as a list of choices, the last one opening a condition of one's own */
export function PresetPicker({ list, value, onChange, fields, member = false }: { list: Preset[]; value: Condition | undefined; onChange: (c: Condition | undefined) => void; fields: FieldDef[]; member?: boolean }) {
  const current = presetOf(list, value);
  const [custom, setCustom] = useState(current === "custom");
  const name = useState(() => newId("p"))[0];
  return (
    <div className="space-y-2">
      {list.map((p) => (
        <label key={p.key} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={name}
            checked={!custom && current === p.key}
            onChange={() => {
              setCustom(false);
              onChange(p.cond);
            }}
            className="accent-[#D9C89E]"
          />
          {p.label}
        </label>
      ))}
      <label className="flex cursor-pointer items-center gap-2">
        <input type="radio" name={name} checked={custom} onChange={() => setCustom(true)} className="accent-[#D9C89E]" />
        شرط مخصص…
      </label>
      {custom && <ConditionEditor value={value} onChange={onChange} fields={fields} member={member} />}
    </div>
  );
}

const TYPES: { value: FieldType; label: string; icon: ReactNode }[] = [
  { value: "text", label: "نص قصير", icon: <Type /> },
  { value: "textarea", label: "نص طويل", icon: <AlignRight /> },
  { value: "number", label: "رقم", icon: <Hash /> },
  { value: "date", label: "تاريخ", icon: <Calendar /> },
  { value: "radio", label: "اختيار واحد", icon: <CircleDot /> },
  { value: "checkboxes", label: "عدة اختيارات", icon: <ListChecks /> },
  { value: "yesno", label: "نعم / لا", icon: <CheckSquare /> },
  { value: "consent", label: "إقرار بالموافقة", icon: <SquareCheckBig /> },
];

const typeName = (t: FieldType) => (t === "select" ? "اختيار واحد (قائمة)" : (TYPES.find((x) => x.value === t)?.label ?? t));
const choice = (t: FieldType) => t === "radio" || t === "select" || t === "checkboxes";

export const blankQuestion = (): FieldDef => ({ id: newId("f"), key: newId("q").replace("-", "_"), label: "", type: "radio", required: true, scope: "application", options: [{ id: newId("o"), value: "o1", label: "" }, { id: newId("o"), value: "o2", label: "" }] });

/**
 * The questions of a page, each a card: shown as a line, opened to edit — its words, its kind of answer
 * picked from icons, its choices, and whether it must be answered. The rest waits under «خيارات متقدمة».
 */
export function QuestionList({ fields, onChange, before, published = new Set<string>() }: { fields: FieldDef[]; onChange: (f: FieldDef[]) => void; before: FieldDef[]; published?: Set<string> }) {
  const [open, setOpen] = useState<string | null>(fields.find((f) => !f.label)?.id ?? null);
  return (
    <div className="space-y-3">
      {fields.length === 0 && <p className="rounded-2xl border border-dashed border-white/20 p-5 text-center text-white/65">لا أسئلة في هذه الصفحة. إن أردت أن يجيب الحاج عن شيء فأضف سؤالاً.</p>}
      {fields.map((f, i) => (
        <div key={f.id} className={cn("rounded-2xl ring-1", open === f.id ? "bg-white/[.08] ring-gold/50" : "bg-white/[.05] ring-white/10")}>
          <div className="flex flex-wrap items-center gap-2 p-3">
            <button type="button" onClick={() => setOpen(open === f.id ? null : f.id)} className="min-w-0 flex-1 text-right">
              <span className="block font-bold text-white">
                {i + 1}. {f.label || <span className="text-white/45">سؤال بلا نص</span>} {f.required && <span className="text-[#ffb4c8]">*</span>}
              </span>
              <span className="text-xs text-white/55">
                {typeName(f.type)}
                {choice(f.type) && ` — ${(f.options ?? []).length} خيارات`}
                {f.scope === "member" && ` — لكل فرد: ${presetLabel(MEMBERS, f.showIf)}`}
              </span>
            </button>
            <span className="flex items-center">
              <Icon label="تعديل" onClick={() => setOpen(open === f.id ? null : f.id)}>
                <Pencil className="size-4" />
              </Icon>
              <Icon label="أعلى" onClick={() => onChange(move(fields, i, -1))}>
                <ArrowUp className="size-4" />
              </Icon>
              <Icon label="أسفل" onClick={() => onChange(move(fields, i, 1))}>
                <ArrowDown className="size-4" />
              </Icon>
              <Icon label="حذف السؤال" onClick={() => onChange(fields.filter((x) => x.id !== f.id))}>
                <Trash2 className="size-4" />
              </Icon>
            </span>
          </div>
          {open === f.id && (
            <div className="border-t border-white/10 p-4">
              <Question field={f} published={published.has(f.key)} before={[...before, ...fields.slice(0, i)]} onChange={(nf) => onChange(fields.map((x) => (x.id === f.id ? nf : x)))} onDone={() => setOpen(null)} />
            </div>
          )}
        </div>
      ))}
      <Button
        variant="glass"
        onClick={() => {
          const q = blankQuestion();
          onChange([...fields, q]);
          setOpen(q.id);
        }}
      >
        <Plus className="size-4" /> إضافة سؤال
      </Button>
    </div>
  );
}

function Question({ field, onChange, before, published, onDone }: { field: FieldDef; onChange: (f: FieldDef) => void; before: FieldDef[]; published: boolean; onDone: () => void }) {
  const set = (p: Partial<FieldDef>) => onChange({ ...field, ...p });
  const [advanced, setAdvanced] = useState(false);
  const opts = field.options ?? [];
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-white">السؤال</span>
        <input autoFocus value={field.label} onChange={(e) => set({ label: e.target.value })} className={cn(smallInputClass, "h-12 text-lg")} placeholder="مثال: هل يحتاج أحد أفراد الطلب كرسياً متحركاً؟" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-white">{field.type === "consent" ? "النص الذي يقرّ به الحاج" : "شرح صغير تحت السؤال (اختياري)"}</span>
        <input value={field.help ?? ""} onChange={(e) => set({ help: e.target.value || undefined })} className={smallInputClass} />
      </label>

      <div>
        <span className="mb-2 block text-sm font-bold text-white">نوع الإجابة</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="نوع الإجابة">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={field.type === t.value}
              disabled={published && field.type !== t.value}
              title={published && field.type !== t.value ? "سؤال منشور: لا يتغير نوعه، فإجابات الطلبات محفوظة به. احذفه وأضف سؤالاً جديداً." : undefined}
              onClick={() => set({ type: t.value, options: choice(t.value) ? (opts.length ? opts : [{ id: newId("o"), value: "o1", label: "" }, { id: newId("o"), value: "o2", label: "" }]) : undefined })}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold ring-1 transition disabled:opacity-35 [&_svg]:size-4",
                field.type === t.value ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white ring-white/15 hover:bg-white/10",
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {choice(field.type) && (
        <div>
          <span className="mb-2 block text-sm font-bold text-white">الخيارات</span>
          <ul className="space-y-2">
            {opts.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2">
                <span className="text-white/50">{field.type === "checkboxes" ? "☐" : "○"}</span>
                <input value={o.label} placeholder={`الخيار ${i + 1}`} onChange={(e) => set({ options: opts.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })} className={cn(smallInputClass, "h-10")} aria-label={`الخيار ${i + 1}`} />
                <Icon label="حذف الخيار" onClick={() => set({ options: opts.filter((x) => x.id !== o.id) })}>
                  <Trash2 className="size-4" />
                </Icon>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => set({ options: [...opts, { id: newId("o"), value: `o${opts.length + 1}-${newId("v").slice(-3)}`, label: "" }] })} className="mt-2 text-sm font-bold text-gold hover:underline">
            + إضافة خيار
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white">
        <span className="flex items-center gap-2">
          <Switch on={field.required} onChange={(v) => set({ required: v })} label="الإجابة إلزامية" /> الإجابة إلزامية
        </span>
        <span className="flex items-center gap-2">
          <Switch on={field.scope === "member"} onChange={(v) => set({ scope: v ? "member" : "application", showIf: undefined })} label="يُسأل لكل فرد في الطلب" /> يُسأل لكل فرد في الطلب
        </span>
      </div>
      {field.scope === "member" && (
        <div className="rounded-2xl bg-black/15 p-3 text-sm text-white/85">
          <p className="mb-2 font-bold text-white">يُسأل عن</p>
          <PresetPicker list={MEMBERS} value={field.showIf} onChange={(c) => set({ showIf: c })} fields={before} member />
        </div>
      )}

      <button type="button" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced} className="flex items-center gap-1 text-sm font-bold text-white/70 hover:text-white">
        خيارات متقدمة <ChevronDown className={cn("size-4 transition", advanced && "rotate-180")} />
      </button>
      {advanced && (
        <div className="space-y-3 rounded-2xl bg-black/15 p-3">
          {field.scope === "application" && (
            <div>
              <p className="mb-2 text-sm font-bold text-white">يظهر السؤال فقط حين</p>
              <ConditionEditor value={field.showIf} onChange={(c) => set({ showIf: c })} fields={before} empty="يظهر دائماً" />
            </div>
          )}
          {field.type === "number" && (
            <div className="grid grid-cols-2 gap-2">
              <Num label="أقل قيمة" value={field.min} onChange={(v) => set({ min: v })} />
              <Num label="أعلى قيمة" value={field.max} onChange={(v) => set({ max: v })} />
            </div>
          )}
          {(field.type === "text" || field.type === "textarea") && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Num label="أقل عدد أحرف" value={field.minLength} onChange={(v) => set({ minLength: v })} />
              <Num label="أكبر عدد أحرف" value={field.maxLength} onChange={(v) => set({ maxLength: v })} />
              <label className="text-xs text-white/70">
                صيغة يجب أن يطابقها (لمن يعرف التعابير النمطية)
                <input value={field.pattern ?? ""} onChange={(e) => set({ pattern: e.target.value || undefined })} className={cn(smallInputClass, "mt-1 h-10")} dir="ltr" placeholder="^09\d{8}$" />
              </label>
              <label className="text-xs text-white/70">
                الرسالة إن لم يطابقها
                <input value={field.patternMessage ?? ""} onChange={(e) => set({ patternMessage: e.target.value || undefined })} className={cn(smallInputClass, "mt-1 h-10")} />
              </label>
            </div>
          )}
          {field.type === "radio" || field.type === "select" ? (
            <label className="flex items-center gap-2 text-xs text-white/70">
              شكل الخيارات
              <select value={field.type} onChange={(e) => set({ type: e.target.value as FieldType })} className={cn(selectClass, "h-9 w-auto py-0")} disabled={published}>
                <option value="radio">أزرار</option>
                <option value="select">قائمة منسدلة</option>
              </select>
            </label>
          ) : null}
          <p className="text-xs text-white/45" dir="ltr">key: {field.key}</p>
        </div>
      )}
      <Button size="sm" variant="gold" onClick={onDone}>
        تم
      </Button>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <label className="text-xs text-white/70">
      {label}
      <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className={cn(smallInputClass, "mt-1 h-10")} dir="ltr" />
    </label>
  );
}

export function Icon({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="grid size-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white" aria-label={label} title={label}>
      {children}
    </button>
  );
}
