"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Copy, GripVertical, ImageOff, ImagePlus, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/widgets";
import { CmsIcon } from "@/components/cms/bits";
import { CMS_ICON_LABELS, CMS_ICON_NAMES } from "@/lib/cms/icons";
import { useMediaUrl } from "@/lib/cms/media";
import type { Field } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { smallInputClass, textareaClass } from "../../_components/kit";
import { BlocksField } from "./blocks";
import { MediaPicker } from "./media";

type Common = { field: Field; value: unknown; onChange: (v: unknown) => void; by: string };

// ───────────────────────── غلاف الحقل ─────────────────────────

export function FieldRow({
  field,
  edited,
  onReset,
  children,
}: {
  field: Field;
  edited: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", field.wide && "md:col-span-2")}>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-sm font-bold text-white">{field.label}</label>
        {edited && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">معدَّل</span>}
        {edited && onReset && (
          <button
            type="button"
            onClick={onReset}
            title="إرجاع هذا الحقل إلى نصه الأصلي"
            className="mr-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="size-3" /> الأصل
          </button>
        )}
      </div>
      {children}
      {field.hint && <p className="mt-1.5 text-[11px] leading-5 text-white/50">{field.hint}</p>}
    </div>
  );
}

// ───────────────────────── الحقول البسيطة ─────────────────────────

export function FieldInput({ field, value, onChange, by }: Common) {
  switch (field.kind) {
    case "textarea":
    case "rich":
      return (
        <textarea
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          className={textareaClass}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={value === "" || value === undefined || value === null ? "" : Number(value)}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={smallInputClass}
          dir="ltr"
        />
      );

    case "boolean":
      return <Toggle value={value === true} onChange={onChange} />;

    case "select":
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn(smallInputClass, "appearance-none")}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value} className="bg-green-dark text-white">
              {o.label}
            </option>
          ))}
        </select>
      );

    case "url":
      return (
        <input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          placeholder={field.placeholder ?? "/page"}
          className={smallInputClass}
        />
      );

    case "image":
    case "video":
      return <MediaField value={String(value ?? "")} onChange={onChange} by={by} video={field.kind === "video"} />;

    case "icon":
      return <IconField value={String(value ?? "")} onChange={onChange} />;

    case "blocks":
      return <BlocksField value={value} onChange={onChange} />;

    case "color":
      return (
        <div className="flex items-center gap-2">
          <input type="color" value={String(value ?? "#00594F")} onChange={(e) => onChange(e.target.value)} className="h-11 w-16 cursor-pointer rounded-xl border-2 border-white/15 bg-transparent" />
          <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} dir="ltr" className={smallInputClass} />
        </div>
      );

    default:
      return (
        <input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={smallInputClass} />
      );
  }
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl border-2 px-3 text-sm font-bold transition",
        value ? "border-green-light/50 bg-green-light/15 text-white" : "border-white/15 bg-white/5 text-white/60",
      )}
    >
      <span className={cn("relative h-6 w-11 rounded-full transition", value ? "bg-green-light" : "bg-white/20")}>
        <motion.span layout transition={{ type: "spring", damping: 26, stiffness: 400 }} className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow", value ? "left-0.5" : "right-0.5")} />
      </span>
      {value ? "مفعّل" : "غير مفعّل"}
    </button>
  );
}

// ───────────────────────── حقل الصورة/الفيديو ─────────────────────────

function MediaField({ value, onChange, by, video }: { value: string; onChange: (v: unknown) => void; by: string; video?: boolean }) {
  const [open, setOpen] = useState(false);
  const url = useMediaUrl(value);

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-white/15 bg-black/25">
        {url ? (
          video ? (
            <video src={url} className="size-full object-cover" muted playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- معاينة داخل لوحة التحكم
            <img src={url} alt="" className="size-full object-cover" />
          )
        ) : (
          <ImageOff className="size-7 text-white/30" />
        )}
      </div>
      <div className="min-w-48 flex-1 space-y-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          placeholder={video ? "/videos/example.webm" : "/images/example.jpg"}
          className={smallInputClass}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-bold text-ink transition hover:bg-gold-light"
          >
            <ImagePlus className="size-4" /> من المكتبة أو رفع
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-maroon/40 hover:text-white"
            >
              <Trash2 className="size-4" /> إزالة
            </button>
          )}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={onChange} by={by} current={value} />
    </div>
  );
}

// ───────────────────────── حقل الأيقونة ─────────────────────────

function IconField({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const matches = useMemo(
    () => CMS_ICON_NAMES.filter((n) => !q || n.toLowerCase().includes(q.toLowerCase()) || (CMS_ICON_LABELS[n] ?? "").includes(q)),
    [q],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-3 rounded-xl border-2 border-white/15 bg-white/10 px-3 text-right text-sm font-bold text-white transition hover:border-gold/60"
      >
        <span className="grid size-7 place-items-center rounded-lg bg-gold/20 text-gold">{value ? <CmsIcon name={value} className="size-4.5" /> : "؟"}</span>
        <span className="truncate">{CMS_ICON_LABELS[value] ?? value ?? "اختر أيقونة"}</span>
        <ChevronDown className="mr-auto size-4 text-white/50" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-2xl bg-gradient-to-b from-[#004a42] to-[#00352f] text-white">
        <h2 className="mb-4 font-display text-lg font-bold">اختر أيقونة</h2>
        <label className="relative mb-4 block">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعربية أو بالإنكليزية…" className={cn(smallInputClass, "pr-10")} />
        </label>
        <div className="grid max-h-96 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
          {matches.map((name) => (
              <button
                key={name}
                type="button"
                title={CMS_ICON_LABELS[name] ?? name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl p-2.5 text-[10px] transition",
                  value === name ? "bg-gold text-ink" : "bg-white/5 text-white/70 hover:bg-white/15 hover:text-white",
                )}
              >
                <CmsIcon name={name} className="size-5" />
                <span className="w-full truncate text-center">{CMS_ICON_LABELS[name] ?? name}</span>
              </button>
          ))}
        </div>
      </Modal>
    </>
  );
}

// ───────────────────────── حقل القائمة (عناصر متكررة) ─────────────────────────

type Item = Record<string, unknown>;

export function ListField({ field, value, onChange, by }: Common) {
  const items: Item[] = Array.isArray(value) ? (value as Item[]) : [];
  const [openIndex, setOpenIndex] = useState<number | null>(items.length ? 0 : null);
  const sub = field.item ?? [];

  const write = (next: Item[]) => onChange(next);

  const patch = (i: number, key: string, v: unknown) => write(items.map((it, k) => (k === i ? { ...it, [key]: v } : it)));

  const add = () => {
    const blank = Object.fromEntries(sub.map((f) => [f.key, f.def]));
    write([...items, blank]);
    setOpenIndex(items.length);
  };

  const duplicate = (i: number) => {
    const next = [...items];
    next.splice(i + 1, 0, { ...items[i] });
    write(next);
    setOpenIndex(i + 1);
  };

  const remove = (i: number) => {
    write(items.filter((_, k) => k !== i));
    setOpenIndex(null);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    write(next);
    setOpenIndex(j);
  };

  const titleOf = (it: Item, i: number) => {
    const key = field.itemTitleKey ?? sub[0]?.key;
    const raw = key ? it[key] : undefined;
    const text = typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
    return text.trim() || `${field.itemName ?? "عنصر"} ${i + 1}`;
  };

  const full = field.maxItems !== undefined && items.length >= field.maxItems;

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-2.5">
      <AnimatePresence initial={false}>
        {items.map((it, i) => {
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
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[11px] font-bold tabular-nums text-gold">{i + 1}</span>
                <button type="button" onClick={() => setOpenIndex(open ? null : i)} className="min-w-0 flex-1 truncate py-1.5 text-right text-sm font-bold text-white">
                  {titleOf(it, i)}
                </button>
                <div className="flex shrink-0 items-center">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-25" title="أعلى">
                    <GripVertical className="size-4 rotate-90" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-25" title="أسفل">
                    <GripVertical className="size-4 -rotate-90" />
                  </button>
                  <button type="button" onClick={() => duplicate(i)} className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white" title="تكرار">
                    <Copy className="size-4" />
                  </button>
                  <button type="button" onClick={() => remove(i)} className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-maroon/40 hover:text-white" title="حذف">
                    <Trash2 className="size-4" />
                  </button>
                  <button type="button" onClick={() => setOpenIndex(open ? null : i)} className="grid size-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white" aria-expanded={open}>
                    <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
                  </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="grid gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                      {sub.map((f) => (
                        <FieldRow key={f.key} field={f} edited={false}>
                          <FieldInput field={f} value={it[f.key] ?? f.def} onChange={(v) => patch(i, f.key, v)} by={by} />
                        </FieldRow>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <button
        type="button"
        onClick={add}
        disabled={full}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 py-2.5 text-sm font-bold text-white/70 transition hover:border-gold/60 hover:text-white disabled:opacity-40"
      >
        <Plus className="size-4" /> {full ? `الحد الأقصى ${field.maxItems}` : `إضافة ${field.itemName ?? "عنصر"}`}
      </button>
    </div>
  );
}
