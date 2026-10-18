"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { CmsImage } from "@/components/cms/image";
import { useToast } from "@/components/ui/widgets";
import { uploadMedia } from "@/lib/cms/media";
import { cn } from "@/lib/utils";

/** Pictures chosen from the device, into the media library: each one's reference, in the order chosen */
function useUpload(by: string) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | null): Promise<string[]> => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return [];
    setBusy(true);
    const refs: string[] = [];
    for (const f of list) {
      try {
        refs.push((await uploadMedia(f, by)).ref);
      } catch (e) {
        toast({ title: "لم تُرفع الصورة", body: `${f.name}: ${(e as Error).message}`, tone: "warning", icon: "⚠️" });
      }
    }
    setBusy(false);
    return refs;
  };
  return { busy, upload };
}

/**
 * A photo gallery as its writers keep it: pictures added from the device (several at once), each moved earlier or
 * later or removed. The first one leads the gallery on the public page.
 */
export function GalleryEditor({ value, onChange, by, max = 24 }: { value: string[]; onChange: (v: string[]) => void; by: string; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUpload(by);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {value.map((src, i) => (
          <li key={`${src}-${i}`} className="overflow-hidden rounded-2xl border-2 border-gold/40 bg-white">
            <div className="relative aspect-[4/3] bg-sand">
              <CmsImage src={src} alt={`الصورة ${i + 1}`} fill sizes="240px" className="object-cover" />
              {i === 0 && <span className="absolute start-2 top-2 rounded-full bg-green-dark px-2 py-0.5 text-[11px] font-bold text-white">الأولى في المعرض</span>}
            </div>
            <div className="flex items-center justify-between gap-1 p-1.5">
              <div className="flex">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`قدّم الصورة ${i + 1}`} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-sand disabled:opacity-30">
                  <ArrowRight className="size-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`أخّر الصورة ${i + 1}`} className="grid size-8 place-items-center rounded-lg text-ink-soft hover:bg-sand disabled:opacity-30">
                  <ArrowLeft className="size-4" />
                </button>
              </div>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`احذف الصورة ${i + 1}`} className="grid size-8 place-items-center rounded-lg text-maroon hover:bg-maroon/10">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {value.length < max && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="grid aspect-[4/3] size-full place-items-center rounded-2xl border-2 border-dashed border-gold-dark/50 bg-gold/10 p-3 text-center text-sm font-bold text-maroon transition hover:bg-gold/20"
            >
              <span className="grid place-items-center gap-1.5">
                {busy ? <Loader2 className="size-7 animate-spin" /> : <ImagePlus className="size-7" />}
                {busy ? "جارٍ الرفع…" : "أضف صوراً"}
              </span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="صور المعرض"
        onChange={async (e) => {
          const refs = await upload(e.target.files);
          e.target.value = "";
          if (refs.length) onChange([...value, ...refs].slice(0, max));
        }}
      />
      <p className="mt-2 text-xs text-hint">صور حتى 12 ميغابايت للصورة، تُصغَّر الكبيرة منها تلقائياً. حتى {max} صورة.</p>
    </div>
  );
}

/** One picture (the group's): chosen from the device, replaced or removed */
export function CoverPicker({ value, onChange, by }: { value: string; onChange: (v: string) => void; by: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, upload } = useUpload(by);
  return (
    <div>
      <div className={cn("relative aspect-[16/7] overflow-hidden rounded-2xl", value ? "bg-sand" : "border-2 border-dashed border-gold-dark/50 bg-gold/10")}>
        {value ? (
          <CmsImage src={value} alt="صورة المجموعة" fill sizes="720px" className="object-cover" />
        ) : (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="grid size-full place-items-center text-sm font-bold text-maroon">
            <span className="grid place-items-center gap-1.5">
              {busy ? <Loader2 className="size-7 animate-spin" /> : <ImagePlus className="size-7" />}
              {busy ? "جارٍ الرفع…" : "اختر صورة المجموعة"}
            </span>
          </button>
        )}
      </div>
      {value && (
        <div className="mt-2 flex gap-3 text-sm font-semibold">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="text-green-dark underline">
            {busy ? "جارٍ الرفع…" : "غيّر الصورة"}
          </button>
          <button type="button" onClick={() => onChange("")} className="text-maroon underline">
            احذفها
          </button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label="صورة المجموعة"
        onChange={async (e) => {
          const [ref] = await upload(e.target.files);
          e.target.value = "";
          if (ref) onChange(ref);
        }}
      />
    </div>
  );
}
