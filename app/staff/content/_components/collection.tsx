"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileClock,
  GripVertical,
  Link2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { CmsIcon } from "@/components/cms/bits";
import { useMediaUrl } from "@/lib/cms/media";
import {
  cms,
  collectionState,
  freeSlots,
  hasCollectionDraft,
  readCollection,
  useCms,
  type CollectionItem,
} from "@/lib/cms/store";
import type { CollectionDef, Field } from "@/lib/cms/types";
import type { StaffUser } from "@/lib/staff";
import { cn } from "@/lib/utils";
import { Empty, fmtDateTime, logAs, Panel } from "../../_components/kit";
import { FieldInput, FieldRow, ListField } from "./fields";

type Author = { name: string; title?: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const str = (v: Record<string, unknown>, k?: string) => {
  const raw = k ? v[k] : undefined;
  return typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
};

export function CollectionEditor({
  collection,
  user,
  onBack,
  onOpenRevisions,
}: {
  collection: CollectionDef;
  user: StaffUser;
  onBack: () => void;
  onOpenRevisions: () => void;
}) {
  const toast = useToast();
  const author: Author = useMemo(() => ({ name: user.name, title: user.title }), [user]);

  const items = useCms((s) => readCollection(s, collection.id));
  const dirty = useCms((s) => hasCollectionDraft(s, collection.id));
  const state = useCms((s) => collectionState(s, collection.id));
  const free = useCms((s) => freeSlots(s, collection.id));

  const [openId, setOpenId] = useState<string | null>(null);
  // مشتق أثناء العرض: إن حُذف العنصر المفتوح أو أُلغيت المسودة التي أنشأته عادت القائمة وحدها
  const open = openId ? (items.find((i) => i.id === openId) ?? null) : null;

  const publish = () => {
    cms.publishCollection(collection.id, author);
    logAs(user, { action: "نشر مجموعة محتوى", target: collection.label, detail: "أصبحت التعديلات ظاهرة للزوار" });
    toast({ title: "نُشرت التعديلات", body: `${collection.label} — يراها الزوار الآن`, tone: "success", icon: "✅" });
  };

  const create = () => {
    const seed = Object.fromEntries(collection.fields.map((f) => [f.key, f.def]));
    const id = cms.createItem(collection.id, { ...seed, ...seedExtras(collection) }, author);
    if (!id) {
      toast({ title: "لا توجد روابط متاحة", body: `الحد الأقصى ${collection.slots?.length ?? 0} ${collection.itemName}اً جديداً`, tone: "warning", icon: "⚠️" });
      return;
    }
    logAs(user, { action: `إنشاء ${collection.itemName} جديد`, target: `${collection.label} — ${id}` });
    toast({ title: `أُنشئ ${collection.itemName} جديد`, body: "املأ حقوله ثم اضغط «نشر» ليظهر في الموقع", tone: "success", icon: "✍️" });
    setOpenId(id);
  };

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 rounded-3xl border border-gold/30 bg-gradient-to-br from-green-dark/95 to-[#00352f]/95 p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,.7)] md:p-4"
      >
        <button onClick={open ? () => setOpenId(null) : onBack} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20">
          <ArrowRight className="size-4" /> {open ? `كل ال${collection.itemName}ات` : "كل الصفحات"}
        </button>

        <div className="min-w-0 px-1">
          <h2 className="truncate font-display text-lg font-bold text-white md:text-xl">{open ? str(open.values, collection.titleKey) || collection.itemName : collection.label}</h2>
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-white/60">
            <span>{items.filter((i) => !i.archived).length} منشوراً</span>
            {state.updatedAt && <span>· آخر تعديل {fmtDateTime(state.updatedAt)}</span>}
            {state.updatedBy && <span>· {state.updatedBy}</span>}
          </p>
        </div>

        <div className="mr-auto flex flex-wrap items-center gap-2">
          <Link href={collection.path} target="_blank" className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-white/20 hover:text-white">
            <ExternalLink className="size-4" /> معاينة
          </Link>
          <button onClick={onOpenRevisions} className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-white/20 hover:text-white">
            <FileClock className="size-4" /> النسخ السابقة
          </button>
          {dirty && (
            <button
              onClick={() => {
                cms.discardCollectionDraft(collection.id, author);
                setOpenId(null);
                toast({ title: "أُلغيت التعديلات غير المنشورة", tone: "warning", icon: "↩️" });
              }}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white/85 transition hover:bg-maroon/40 hover:text-white"
            >
              <Undo2 className="size-4" /> تجاهل
            </button>
          )}
          <button
            onClick={() => {
              cms.saveCollectionDraft(collection.id, author);
              toast({ title: "حُفظت المسودة", body: "لم تُنشر بعد — فعّل المعاينة لتراها", tone: "info", icon: "💾" });
            }}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Save className="size-4" /> حفظ كمسودة
          </button>
          <button
            onClick={publish}
            disabled={!dirty}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-ink shadow-lg transition hover:bg-gold-light disabled:opacity-40"
          >
            <Send className="size-4" /> نشر
          </button>
        </div>
      </motion.div>

      {dirty && (
        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-sm text-gold">
          <FileClock className="size-4 shrink-0" />
          في هذه المجموعة تعديلات لم تُنشر بعد. الزوار ما زالوا يرون النسخة المنشورة حتى تضغط «نشر».
        </motion.p>
      )}

      {open ? (
        <ItemForm key={open.id} collection={collection} item={open} user={user} author={author} onClose={() => setOpenId(null)} />
      ) : (
        <ItemList collection={collection} items={items} user={user} author={author} free={free.length} onOpen={setOpenId} onCreate={create} />
      )}
    </div>
  );
}

/** قيم إضافية يبدأ بها العنصر الجديد (التواريخ مثلاً) */
function seedExtras(collection: CollectionDef): Record<string, unknown> {
  if (collection.id !== "news") return {};
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return {
    iso,
    hijri: new Intl.DateTimeFormat("ar-SY-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(now) + "هـ",
    gregorian: new Intl.DateTimeFormat("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }).format(now) + "م",
  };
}

// ───────────────────────── قائمة العناصر ─────────────────────────

function ItemList({
  collection,
  items,
  user,
  author,
  free,
  onOpen,
  onCreate,
}: {
  collection: CollectionDef;
  items: CollectionItem[];
  user: StaffUser;
  author: Author;
  free: number;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim();
    return items.filter((i) => {
      if (i.archived && !showArchived) return false;
      if (!needle) return true;
      return Object.values(i.values).some((v) => typeof v === "string" && v.includes(needle));
    });
  }, [items, q, showArchived]);

  const archivedCount = items.filter((i) => i.archived).length;

  const archive = (item: CollectionItem, next: boolean) => {
    cms.setItemArchived(collection.id, item.id, next, author);
    logAs(user, {
      action: next ? `أرشفة ${collection.itemName}` : `استعادة ${collection.itemName}`,
      target: `${collection.label} — ${str(item.values, collection.titleKey)}`,
    });
    toast({
      title: next ? `أُرشف ال${collection.itemName}` : `استُعيد ال${collection.itemName}`,
      body: "اضغط «نشر» ليظهر الأثر للزوار",
      tone: next ? "warning" : "success",
      icon: next ? "📦" : "↩️",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="absolute right-4 top-1/2 size-4.5 -translate-y-1/2 text-white/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`ابحث في ال${collection.itemName}ات…`}
            className="h-12 w-full rounded-2xl border-2 border-white/15 bg-white/10 pr-11 text-base text-white outline-none transition placeholder:text-white/40 focus:border-gold focus:ring-4 focus:ring-gold/15"
          />
        </label>
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "flex h-12 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold transition",
              showArchived ? "bg-gold text-ink" : "bg-white/10 text-white hover:bg-white/20",
            )}
          >
            <Archive className="size-4" /> المؤرشف ({archivedCount})
          </button>
        )}
        {collection.slots && (
          <button
            onClick={onCreate}
            disabled={free === 0}
            title={free === 0 ? "نفدت الروابط المحجوزة" : `${free} رابطاً متاحاً`}
            className="flex h-12 items-center gap-1.5 rounded-2xl bg-gold px-4 text-sm font-bold text-ink shadow-lg transition hover:bg-gold-light disabled:opacity-40"
          >
            <Plus className="size-4" /> {collection.itemName} جديد
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <Panel>
          <Empty icon={<Search />} title="لا نتائج" text={q ? "جرّب كلمة أخرى." : `لا يوجد ${collection.itemName} هنا بعد.`} />
        </Panel>
      ) : (
        <Panel bodyClass="grid gap-3 lg:grid-cols-2">
          <AnimatePresence initial={false}>
            {shown.map((item, i) => (
              <ItemCard
                key={item.id}
                collection={collection}
                item={item}
                index={items.indexOf(item)}
                total={items.length}
                delay={Math.min(i, 8) * 0.03}
                onOpen={() => onOpen(item.id)}
                onArchive={(next) => archive(item, next)}
                onMove={(dir) => cms.moveItem(collection.id, item.id, dir, author)}
                onDelete={() => {
                  cms.deleteCreatedItem(collection.id, item.id, author);
                  toast({ title: `حُذف ال${collection.itemName}`, body: "عاد رابطه متاحاً لعنصر جديد", tone: "warning", icon: "🗑️" });
                }}
              />
            ))}
          </AnimatePresence>
        </Panel>
      )}
    </div>
  );
}

function ItemCard({
  collection,
  item,
  index,
  total,
  delay,
  onOpen,
  onArchive,
  onMove,
  onDelete,
}: {
  collection: CollectionDef;
  item: CollectionItem;
  index: number;
  total: number;
  delay: number;
  onOpen: () => void;
  onArchive: (next: boolean) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const thumb = useMediaUrl(collection.imageKey ? item.values[collection.imageKey] : "");
  const title = str(item.values, collection.titleKey) || `${collection.itemName} بلا عنوان`;
  const subtitle = str(item.values, collection.subtitleKey);
  const badge = str(item.values, collection.badgeKey);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "group flex gap-3 rounded-2xl border p-3 transition",
        item.archived ? "border-white/5 bg-white/[.02] opacity-70" : "border-white/10 bg-white/[.04] hover:border-gold/50 hover:bg-white/[.08]",
      )}
    >
      {collection.imageKey && (
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-black/25">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- معاينة داخل لوحة التحكم
            <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="grid size-full place-items-center text-white/25">
              <CmsIcon name={collection.icon} className="size-6" />
            </span>
          )}
        </div>
      )}

      <button onClick={onOpen} className="min-w-0 flex-1 text-right">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="font-display text-base font-bold text-white">{title}</span>
          {item.isNew && <span className="rounded-full bg-green-light/20 px-2 py-0.5 text-[10px] font-bold text-green-light">جديد</span>}
          {item.archived && <span className="rounded-full bg-maroon/40 px-2 py-0.5 text-[10px] font-bold text-white/80">مؤرشف</span>}
          {badge && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{badge}</span>}
        </p>
        {subtitle && <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/60">{subtitle}</p>}
        {collection.itemHref && (
          <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-white/35" dir="ltr">
            <Link2 className="size-3" /> {collection.itemHref(item.id)}
          </p>
        )}
      </button>

      <div className="flex shrink-0 flex-col items-center justify-center opacity-70 transition group-hover:opacity-100">
        <button onClick={() => onMove(-1)} disabled={index === 0} title="أعلى" className="grid size-7 place-items-center rounded-lg text-white/60 transition hover:bg-white/15 hover:text-white disabled:opacity-25">
          <GripVertical className="size-3.5 rotate-90" />
        </button>
        <button onClick={() => onArchive(!item.archived)} title={item.archived ? "استعادة" : "أرشفة"} className="grid size-7 place-items-center rounded-lg text-white/60 transition hover:bg-white/15 hover:text-white">
          {item.archived ? <ArchiveRestore className="size-3.5 text-gold" /> : <Archive className="size-3.5" />}
        </button>
        {item.isNew ? (
          <button onClick={onDelete} title="حذف نهائي" className="grid size-7 place-items-center rounded-lg text-white/60 transition hover:bg-maroon/40 hover:text-white">
            <Trash2 className="size-3.5" />
          </button>
        ) : (
          <button onClick={() => onMove(1)} disabled={index === total - 1} title="أسفل" className="grid size-7 place-items-center rounded-lg text-white/60 transition hover:bg-white/15 hover:text-white disabled:opacity-25">
            <GripVertical className="size-3.5 -rotate-90" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ───────────────────────── نموذج العنصر ─────────────────────────

function ItemForm({
  collection,
  item,
  user,
  author,
  onClose,
}: {
  collection: CollectionDef;
  item: CollectionItem;
  user: StaffUser;
  author: Author;
  onClose: () => void;
}) {
  const toast = useToast();
  // النموذج يُعاد تركيبه عند تبديل العنصر (key)، فالحالة تبدأ فارغة دائماً
  const [pending, setPending] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!Object.keys(pending).length) return;
    const t = setTimeout(() => {
      for (const [k, v] of Object.entries(pending)) cms.setItemField(collection.id, item.id, k, v, author);
      setPending({});
    }, 350);
    return () => clearTimeout(t);
  }, [pending, collection.id, item.id, author]);

  const valueOf = (key: string) => (key in pending ? pending[key] : item.values[key]);
  const original = (key: string) => collection.builtIn.find((b) => b.id === item.id)?.values[key] ?? collection.fields.find((f) => f.key === key)?.def;

  // حقول العرض في اللوحة فقط (اسم المسار والمستوى) لا تُحرَّر هنا
  const editable = collection.fields;

  const href = collection.itemHref?.(item.id);

  return (
    <Panel
      title={str(item.values, collection.titleKey) || `${collection.itemName} جديد`}
      icon={<CmsIcon name={collection.icon} />}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {href && (
            <Link href={href} target="_blank" className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/20 hover:text-white">
              <ExternalLink className="size-3.5" /> فتح في الموقع
            </Link>
          )}
          <button
            onClick={() => {
              setPending({});
              cms.resetItem(collection.id, item.id, author);
              logAs(user, { action: `إرجاع ${collection.itemName} إلى نصه الأصلي`, target: `${collection.label} — ${item.id}` });
              toast({ title: "أُعيد إلى محتواه الأصلي", tone: "warning", icon: "♻️" });
            }}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <RotateCcw className="size-3.5" /> إرجاع للأصل
          </button>
          <button onClick={onClose} className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/20 hover:text-white">
            إغلاق
          </button>
        </div>
      }
    >
      {item.isNew && href && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-green-light/30 bg-green-light/10 px-4 py-2.5 text-sm text-white/85">
          <CheckCircle2 className="size-4 shrink-0 text-green-light" />
          رابط هذا ال{collection.itemName} في الموقع:
          <span className="font-mono text-gold" dir="ltr">
            {href}
          </span>
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {editable.map((f: Field) => {
          const v = valueOf(f.key);
          const isEdited = !same(v, original(f.key));
          const set = (next: unknown) => setPending((p) => ({ ...p, [f.key]: next }));
          const reset = () => {
            setPending((p) => {
              const n = { ...p };
              delete n[f.key];
              return n;
            });
            cms.resetItemField(collection.id, item.id, f.key, author);
          };
          return (
            <FieldRow key={f.key} field={f} edited={isEdited} onReset={reset}>
              {f.kind === "list" ? <ListField field={f} value={v} onChange={set} by={user.name} /> : <FieldInput field={f} value={v} onChange={set} by={user.name} />}
            </FieldRow>
          );
        })}
      </div>

      <p className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-white/50">
        <CheckCircle2 className="size-4 text-green-light" />
        يُحفظ كل تعديل في المسودة تلقائياً. اضغط «نشر» في الأعلى ليراه الزوار.
      </p>
    </Panel>
  );
}
