"use client";

import { Download, FileSignature, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CmsImage } from "@/components/cms/image";
import { Modal } from "@/components/ui/widgets";
import { useMediaUrl } from "@/lib/cms/media";
import type { SignedContract } from "@/lib/store";
import { cn } from "@/lib/utils";

/** The season's seed was formed at the office before the demo began: its contracts are a sample page, as uploaded then */
const SEED_AT = new Date("2026-11-18T11:00:00+03:00").getTime();
export const seedContract = (kind: "group" | "cluster", title: string): SignedContract => ({
  ref: `/images/contracts/${kind}-contract.svg`,
  name: `${title}.svg`,
  type: "image/svg+xml",
  at: SEED_AT,
  by: "مازن الحلبي",
});

const fmt = (ts: number) => new Date(ts).toLocaleDateString("ar-SY-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });

/**
 * A paper contract signed at the office, as its employee uploaded it: a card with its name, who signed it and when
 * it was uploaded, that opens the contract itself large (a picture, or a file in its frame). Before it is
 * uploaded, the card says what it will be.
 */
export function ContractView({ title, contract, signers, empty, kind = "group" }: { title: string; contract?: SignedContract; signers: string; empty: string; kind?: "group" | "cluster" }) {
  const [open, setOpen] = useState(false);
  const media = useMediaUrl(contract?.ref);
  // a PDF kept as a data URL opens in the browser's viewer only from a blob of its own
  const [blob, setBlob] = useState("");
  useEffect(() => {
    if (!media.startsWith("data:application/pdf")) return;
    let made = "";
    void fetch(media)
      .then((r) => r.blob())
      .then((b) => setBlob((made = URL.createObjectURL(b))));
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [media]);
  const url = media.startsWith("data:application/pdf") ? blob : media;
  const label = kind === "cluster" ? "عقد التكتل" : "عقد المجموعة";
  if (!contract) {
    return (
      <div className="flex h-full flex-col rounded-3xl border-2 border-dashed border-gold/40 bg-white/60 p-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-sand text-hint"><FileSignature className="size-6" /></span>
        <p className="mt-3 text-xs font-bold text-gold-dark">{label}</p>
        <p className="font-display text-xl font-bold text-green-dark">{title}</p>
        <p className="mt-2 text-sm leading-7 text-ink-soft">{empty}</p>
      </div>
    );
  }
  const image = contract.type.startsWith("image/");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-gold/30 bg-white text-right transition hover:-translate-y-0.5 hover:shadow-lg">
        <span className="relative block aspect-[4/3] w-full overflow-hidden bg-sand">
          {image ? (
            <CmsImage src={contract.ref} alt={title} fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover object-top transition group-hover:scale-[1.02]" />
          ) : (
            <span className="grid h-full place-items-center text-gold-dark"><FileSignature className="size-14" /></span>
          )}
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white"><Maximize2 className="size-3.5" /> فتح العقد</span>
        </span>
        <span className="block p-5">
          <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-bold", kind === "cluster" ? "bg-gold/30 text-maroon" : "bg-green-light/15 text-green")}>{label}</span>
          <span className="mt-2 block font-display text-xl font-bold text-green-dark">{title}</span>
          <span className="mt-1 block text-sm leading-7 text-ink-soft">وقّعه في المكتب {signers}. رفعه {contract.by} في {fmt(contract.at)}.</span>
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-gold-dark">{label}</p>
            <h2 className="font-display text-2xl font-bold text-green-dark">{title}</h2>
            <p className="mt-1 text-sm text-ink-soft">وقّعه {signers} — رفعه {contract.by} في {fmt(contract.at)}</p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a href={url} download={contract.name} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-2 text-sm font-bold text-green-dark">
                <Download className="size-4" /> تنزيل
              </a>
            )}
            <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-sand text-ink hover:bg-gold/30"><X className="size-4" /></button>
          </div>
        </div>
        {image ? (
          <div className="relative mt-4 h-[75vh] w-full overflow-hidden rounded-2xl border border-gold/30 bg-sand">
            <CmsImage src={contract.ref} alt={title} fill sizes="(min-width: 1024px) 860px, 100vw" className="object-contain" />
          </div>
        ) : url ? (
          <iframe src={url} title={title} className="mt-4 h-[75vh] w-full rounded-2xl border border-gold/30" />
        ) : (
          <p className="mt-4 rounded-2xl bg-sand p-4 text-sm text-ink-soft">العقد محفوظ في مكتبة المنصة: {contract.name}</p>
        )}
      </Modal>
    </>
  );
}
