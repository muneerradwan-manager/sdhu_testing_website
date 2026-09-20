"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ImagePlus, Link2, Loader2, Search, Trash2, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Modal, useToast } from "@/components/ui/widgets";
import { cms, useMediaList } from "@/lib/cms/store";
import { deleteMedia, formatBytes, uploadMedia, useMediaUrl } from "@/lib/cms/media";
import { MEDIA_PREFIX, type MediaMeta } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import { Empty, fmtDateTime, smallInputClass } from "../../_components/kit";

/** صور الموقع الأصلية، ليختار منها الموظف دون رفع شيء */
const BUILT_IN = [
  "/images/kaaba-hajj.jpg",
  "/images/kaaba-panoramio.jpg",
  "/images/haram-2022.jpg",
  "/images/tawaf-night.jpg",
  "/images/farewell-tawaf.jpg",
  "/images/jabal-rahmah.jpg",
  "/images/mina-tents.jpg",
  "/images/clock-tower.jpg",
  "/images/umayyad.jpg",
  "/images/umayyad-courtyard.jpg",
  "/images/pilgrim-elder.jpg",
];

function Thumb({ src, className }: { src: string; className?: string }) {
  const url = useMediaUrl(src);
  if (!url) return <div className={cn("bg-white/10", className)} />;
  // eslint-disable-next-line @next/next/no-img-element -- معاينة داخل لوحة التحكم، قد تكون رابط بيانات
  return <img src={url} alt="" className={cn("size-full object-cover", className)} loading="lazy" decoding="async" />;
}

function useUploader(by: string) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null, onDone?: (ref: string) => void) => {
    if (!files?.length) return;
    setBusy(true);
    let last = "";
    for (const file of Array.from(files)) {
      try {
        const { ref, meta } = await uploadMedia(file, by);
        last = ref;
        toast({ title: "تم الرفع", body: `${meta.name} — ${formatBytes(meta.size)}`, tone: "success", icon: "🖼️" });
      } catch (e) {
        toast({ title: "تعذّر الرفع", body: e instanceof Error ? e.message : "ملف غير مدعوم", tone: "warning", icon: "⚠️" });
      }
    }
    setBusy(false);
    if (last) onDone?.(last);
  };

  return { busy, upload };
}

/** منطقة السحب والإفلات لرفع الملفات */
export function DropZone({ by, onUploaded, compact }: { by: string; onUploaded?: (ref: string) => void; compact?: boolean }) {
  const { busy, upload } = useUploader(by);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void upload(e.dataTransfer.files, onUploaded);
      }}
      className={cn(
        "grid place-items-center rounded-2xl border-2 border-dashed text-center transition",
        compact ? "p-4" : "p-8",
        over ? "border-gold bg-gold/10" : "border-white/20 bg-white/5 hover:border-gold/50",
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files, onUploaded);
          e.target.value = "";
        }}
      />
      {busy ? (
        <Loader2 className="size-7 animate-spin text-gold" />
      ) : (
        <UploadCloud className={cn("text-gold", compact ? "size-6" : "size-9")} />
      )}
      <p className={cn("mt-2 font-bold text-white", compact && "text-sm")}>{busy ? "جارٍ الرفع…" : "اسحب الصور إلى هنا"}</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="mt-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-ink transition hover:bg-gold-light disabled:opacity-50"
      >
        اختر ملفات من جهازك
      </button>
      {!compact && <p className="mt-2 text-xs text-white/55">صور أو فيديو، حتى 12 ميغابايت للملف. تُصغَّر الصور الكبيرة تلقائياً.</p>}
    </div>
  );
}

// ───────────────────────── نافذة اختيار صورة ─────────────────────────

export function MediaPicker({
  open,
  onClose,
  onPick,
  by,
  current,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (ref: string) => void;
  by: string;
  current?: string;
}) {
  const media = useMediaList();
  const [q, setQ] = useState("");
  const [manual, setManual] = useState("");

  const uploaded = useMemo(() => media.filter((m) => !q || m.name.includes(q)), [media, q]);
  const builtIn = useMemo(() => BUILT_IN.filter((p) => !q || p.includes(q)), [q]);

  const choose = (ref: string) => {
    onPick(ref);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-4xl bg-gradient-to-b from-[#004a42] to-[#00352f] p-0 text-white">
      <div className="flex items-center justify-between gap-3 border-b border-gold/30 bg-black/15 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <ImagePlus className="size-5 text-gold" /> اختيار صورة
        </h2>
        <button onClick={onClose} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="إغلاق">
          <X className="size-5" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <DropZone by={by} compact onUploaded={choose} />

        <label className="relative block">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الملف…" className={cn(smallInputClass, "pr-10")} />
        </label>

        {media.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-bold text-gold">المرفوعة ({uploaded.length})</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {uploaded.map((m) => (
                <PickCard key={m.id} src={`${MEDIA_PREFIX}${m.id}`} label={m.name} active={current === `${MEDIA_PREFIX}${m.id}`} onPick={choose} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-bold text-gold">صور الموقع الأصلية</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {builtIn.map((p) => (
              <PickCard key={p} src={p} label={p.split("/").pop() ?? p} active={current === p} onPick={choose} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-gold">
            <Link2 className="size-4" /> أو ضع مساراً أو رابطاً مباشراً
          </h3>
          <div className="flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} dir="ltr" placeholder="/images/example.jpg" className={smallInputClass} />
            <button
              type="button"
              disabled={!manual.trim()}
              onClick={() => choose(manual.trim())}
              className="shrink-0 rounded-xl bg-gold px-4 text-sm font-bold text-ink transition hover:bg-gold-light disabled:opacity-40"
            >
              استخدم
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function PickCard({ src, label, active, onPick }: { src: string; label: string; active?: boolean; onPick: (ref: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(src)}
      title={label}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-xl ring-2 transition hover:-translate-y-0.5",
        active ? "ring-gold" : "ring-white/10 hover:ring-gold/60",
      )}
    >
      <Thumb src={src} />
      {active && (
        <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-gold text-ink">
          <Check className="size-4" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/90 to-transparent px-2 py-1 text-[10px] text-white/85" dir="ltr">
        {label}
      </span>
    </button>
  );
}

// ───────────────────────── صفحة مكتبة الوسائط ─────────────────────────

export function MediaLibrary({ by }: { by: string }) {
  const media = useMediaList();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MediaMeta | null>(null);

  const shown = media.filter((m) => !q || m.name.includes(q));
  const total = media.reduce((n, m) => n + m.size, 0);

  const remove = async (m: MediaMeta) => {
    await deleteMedia(m.id);
    setSelected(null);
    toast({ title: "حُذف الملف", body: `${m.name} — تأكد أن لا قسم يستعمله`, tone: "warning", icon: "🗑️" });
  };

  return (
    <div className="space-y-5">
      <DropZone by={by} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative min-w-60 flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في المكتبة…" className={cn(smallInputClass, "pr-10")} />
        </label>
        <p className="text-sm text-white/65">
          {media.length} ملفاً · {formatBytes(total)}
        </p>
      </div>

      {shown.length === 0 ? (
        <Empty icon={<ImagePlus />} title="المكتبة فارغة" text="ارفع صور الأخبار والأقسام هنا، ثم اخترها من أي حقل صورة في الصفحات." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <AnimatePresence initial={false}>
            {shown.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setSelected(m)}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-right transition hover:-translate-y-1 hover:border-gold/50"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Thumb src={`${MEDIA_PREFIX}${m.id}`} className="transition duration-700 group-hover:scale-110" />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-bold text-white" dir="ltr">
                    {m.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/55">
                    {formatBytes(m.size)}
                    {m.width ? ` · ${m.width}×${m.height}` : ""}
                  </p>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} className="max-w-xl bg-gradient-to-b from-[#004a42] to-[#00352f] text-white">
        {selected && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-black/30">
              <Thumb src={`${MEDIA_PREFIX}${selected.id}`} className="max-h-80 w-full object-contain" />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-white/55">الاسم</dt>
                <dd className="truncate font-bold" dir="ltr">
                  {selected.name}
                </dd>
              </div>
              <div>
                <dt className="text-white/55">الحجم</dt>
                <dd className="font-bold">{formatBytes(selected.size)}</dd>
              </div>
              <div>
                <dt className="text-white/55">الأبعاد</dt>
                <dd className="font-bold">{selected.width ? `${selected.width}×${selected.height}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-white/55">تاريخ الرفع</dt>
                <dd className="font-bold">{fmtDateTime(selected.at)}</dd>
              </div>
            </dl>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">النص البديل للصورة (يقرؤه قارئ الشاشة)</span>
              <input
                value={selected.alt ?? ""}
                onChange={(e) => {
                  cms.updateMedia(selected.id, { alt: e.target.value });
                  setSelected({ ...selected, alt: e.target.value });
                }}
                className={smallInputClass}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(`${MEDIA_PREFIX}${selected.id}`);
                  toast({ title: "نُسخ المرجع", body: "الصقه في أي حقل صورة", tone: "info", icon: "📋" });
                }}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20"
              >
                نسخ مرجع الصورة
              </button>
              <button
                onClick={() => void remove(selected)}
                className="mr-auto flex items-center gap-1.5 rounded-xl bg-maroon/40 px-4 py-2 text-sm font-bold transition hover:bg-maroon"
              >
                <Trash2 className="size-4" /> حذف نهائي
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
