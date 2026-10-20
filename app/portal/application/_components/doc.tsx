"use client";

import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Eye, Lock, Printer, type LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { PrintDocument, PrintNote, PrintSection } from "@/components/print/print-document";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button } from "@/components/ui/button";
import { Badge, Modal } from "@/components/ui/widgets";
import { useMediaUrl } from "@/lib/cms/media";
import { cn } from "@/lib/utils";

/**
 * The pilgrim's documents in one design, the one of his flight ticket and his digital card: a band in the
 * document's colour with the season's pattern and the emblem, the tear of a ticket, its fields, and the code that
 * verifies it. The acceptance notice, the contract, the receipts, the visa, the passport and the photo are all
 * drawn in it; in a list each is a stub of the same, opened large to read, print or download.
 */

export type DocTone = "green" | "maroon" | "gold" | "ink";

const BAND: Record<DocTone, string> = {
  green: "bg-gradient-to-br from-green-dark via-green to-green-dark text-white",
  maroon: "bg-gradient-to-br from-maroon-dark via-maroon to-maroon-dark text-white",
  gold: "bg-gradient-to-br from-gold-dark via-gold to-gold-dark text-ink",
  ink: "bg-gradient-to-br from-ink via-[#0c2a40] to-ink text-white",
};
const ACCENT: Record<DocTone, string> = { green: "text-gold", maroon: "text-gold", gold: "text-maroon", ink: "text-gold" };
const PILL: Record<DocTone, string> = { green: "bg-white/15", maroon: "bg-white/15", gold: "bg-white/45", ink: "bg-white/15" };

export type DocField = { k: string; v: ReactNode; wide?: boolean; ltr?: boolean };

/** A ticket's tear: two notches in the colour around it, and a dashed line between them */
function Tear({ notch = "bg-white", small = false }: { notch?: string; small?: boolean }) {
  return (
    <div className={cn("relative bg-white", small ? "h-4" : "h-6")}>
      <span className={cn("absolute top-0 rounded-full", small ? "-right-2 size-4" : "-right-3 size-6", notch)} />
      <span className={cn("absolute top-0 rounded-full", small ? "-left-2 size-4" : "-left-3 size-6", notch)} />
      <span className={cn("absolute top-1/2 border-t-2 border-dashed border-gold-light", small ? "inset-x-4" : "inset-x-6")} />
    </div>
  );
}

/** Set by DocViewer around what it prints: a DocFrame inside it is drawn as the platform's printed document */
const OnPaper = createContext(false);

type DocFrameProps = {
  tone?: DocTone;
  kind: string;
  title: ReactNode;
  sub?: ReactNode;
  code?: string;
  icon?: LucideIcon;
  fields?: DocField[];
  qr?: string;
  qrCaption?: string;
  aside?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  demo?: boolean;
  notch?: string;
};

/**
 * One document, whole. `aside` takes the QR column's place (a photo); `children` sit between the tear and the
 * fields (the file the group's head uploaded); `notch` is the colour around the document, for its tear. On paper
 * it is the one printed template every report uses, with the same fields, code and verification QR.
 */
export function DocFrame(props: DocFrameProps) {
  const paper = useContext(OnPaper);
  return paper ? <DocPaper {...props} /> : <DocTicket {...props} />;
}

/** The text of a title or a line, when it is one: a printed heading takes a string */
const textOf = (x: ReactNode) => (typeof x === "string" || typeof x === "number" ? String(x) : "");

/**
 * The document on A4: the kind as the title under the letterhead, its number in a box (and «تجريبية» for the
 * demo's drawings), whose it is as the section's heading with every field in a box, the uploaded file, the photo
 * or the verification code, and the ticket's footer as a note.
 */
function DocPaper({ kind, title, sub, code, fields = [], qr, qrCaption, aside, children, footer, demo }: DocFrameProps) {
  const heading = [textOf(title), textOf(sub)].filter(Boolean).join(" — ");
  return (
    <PrintDocument
      title={kind}
      source="موسم حج 1448هـ"
      meta={[...(code ? [{ label: "الرقم", value: <span dir="ltr">{code}</span> }] : []), ...(demo ? [{ label: "النسخة", value: "تجريبية" }] : [])]}
    >
      <PrintSection title={heading || kind} meta={fields.map((f) => ({ label: f.k, value: f.ltr ? <span dir="ltr">{f.v}</span> : f.v }))}>
        {children && <div className="mt-3">{children}</div>}
        {(qr || aside) && (
          <div className="mt-3 flex flex-col items-start gap-1">
            {aside ?? <QRCodeSVG value={qr!} size={92} fgColor="#021526" />}
            {qrCaption && <PrintNote>{qrCaption}</PrintNote>}
          </div>
        )}
        {footer && <PrintNote>{footer}</PrintNote>}
      </PrintSection>
    </PrintDocument>
  );
}

/** The document on the screen: the ticket */
function DocTicket({
  tone = "green",
  kind,
  title,
  sub,
  code,
  icon: Icon,
  fields = [],
  qr,
  qrCaption,
  aside,
  children,
  footer,
  demo,
  notch,
}: DocFrameProps) {
  return (
    <article className="on-paper overflow-hidden rounded-[2rem] bg-white text-right shadow-[0_30px_60px_-30px_rgba(2,21,38,.4)] ring-1 ring-gold/40 [print-color-adjust:exact]">
      <header className={cn("relative overflow-hidden p-5 md:p-6", BAND[tone])}>
        <div className={cn("absolute inset-0", tone === "gold" ? "bg-pattern-dark opacity-30" : "bg-pattern opacity-15")} />
        <div className="absolute -left-12 -top-12 size-44 rounded-full bg-gold/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Emblem className="size-9 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className={cn("text-sm font-bold", ACCENT[tone])}>{kind}</p>
              <p className="truncate text-[11px] opacity-70">إدارة الحج والعمرة السورية — موسم 1448هـ</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {code && (
              <span dir="ltr" className={cn("rounded-full px-3 py-1 font-mono text-xs font-bold", PILL[tone])}>
                {code}
              </span>
            )}
            {demo && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", PILL[tone])}>تجريبي</span>}
          </div>
        </div>
        <div className="relative mt-5 flex items-end gap-3">
          {Icon && (
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", PILL[tone], ACCENT[tone])}>
              <Icon className="size-6" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold leading-tight md:text-3xl">{title}</h3>
            {sub && <p className="mt-0.5 text-sm opacity-75">{sub}</p>}
          </div>
        </div>
      </header>
      <Tear notch={notch} />
      {children && <div className="px-5 pb-2 md:px-6">{children}</div>}
      {(fields.length > 0 || qr || aside) && (
        <div className="grid gap-4 p-5 pt-2 md:grid-cols-[1fr_auto] md:p-6 md:pt-2">
          <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            {fields.map((f) => (
              <div key={f.k} className={f.wide ? "col-span-2 sm:col-span-3" : undefined}>
                <dt className="text-xs text-hint">{f.k}</dt>
                <dd className={cn("font-bold leading-6 text-ink", f.ltr && "text-right")} dir={f.ltr ? "ltr" : undefined}>
                  {f.v}
                </dd>
              </div>
            ))}
          </dl>
          {(qr || aside) && (
            <div className="flex flex-col items-center justify-center gap-1.5 border-t border-dashed border-gold-light pt-4 md:border-r md:border-t-0 md:pr-6 md:pt-0">
              {aside ?? <QRCodeSVG value={qr!} size={92} fgColor="#021526" />}
              {qrCaption && <span className="max-w-[9rem] text-center text-[11px] leading-4 text-hint">{qrCaption}</span>}
            </div>
          )}
        </div>
      )}
      {footer && <div className="border-t border-gold-light bg-sand/60 px-5 py-3 text-sm leading-7 text-ink-soft md:px-6">{footer}</div>}
    </article>
  );
}

export type DocStatus = { label: string; tone: "green" | "gold" | "maroon" | "ink" };

/**
 * A document in a list: the stub of its ticket, with its kind, whose it is, where it stands and its number. It
 * opens the document; one that has not been issued yet stays grey, saying when it comes.
 */
export function DocStub({ tone = "green", kind, icon: Icon, title, sub, code, status, ready, onOpen, index = 0 }: { tone?: DocTone; kind: string; icon: LucideIcon; title: string; sub?: string; code?: string; status: DocStatus; ready: boolean; onOpen: () => void; index?: number }) {
  return (
    <motion.button
      type="button"
      disabled={!ready}
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05 }}
      aria-label={`${kind} — ${title}`}
      className={cn(
        "group w-full overflow-hidden rounded-3xl bg-white text-right ring-1 transition",
        ready ? "shadow-[0_20px_40px_-28px_rgba(2,21,38,.45)] ring-gold/40 hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-26px_rgba(2,21,38,.5)]" : "cursor-not-allowed ring-gold/25",
      )}
    >
      <div className={cn("relative overflow-hidden px-4 py-3", ready ? BAND[tone] : "bg-sand text-hint")}>
        {ready && <div className={cn("absolute inset-0", tone === "gold" ? "bg-pattern-dark opacity-30" : "bg-pattern opacity-15")} />}
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
            {ready ? <Icon className={cn("size-4 shrink-0", ACCENT[tone])} /> : <Lock className="size-4 shrink-0" />}
            <span className="truncate">{kind}</span>
          </span>
          {code && ready && (
            <span dir="ltr" className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold", PILL[tone])}>
              {code}
            </span>
          )}
        </div>
      </div>
      <Tear small notch="bg-sand" />
      <div className="px-4 pb-4">
        <p className={cn("truncate font-display text-lg font-bold", ready ? "text-green-dark" : "text-hint")}>{title}</p>
        {sub && <p className="truncate text-xs text-hint">{sub}</p>}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <Badge tone={status.tone} className="text-[11px]">
            {status.label}
          </Badge>
          {ready && (
            <span className="flex items-center gap-1 text-xs font-bold text-green-dark opacity-70 transition group-hover:opacity-100">
              <Eye className="size-3.5" /> عرض
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/**
 * A file someone uploaded to the pilgrim (the visa from the Saudi ministry's email): a picture shown whole, a PDF
 * in its frame — a PDF kept as a data URL opens in the browser's viewer only from a blob of its own.
 */
export function useFileUrl(ref?: string) {
  const media = useMediaUrl(ref);
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
  return media.startsWith("data:application/pdf") ? blob : media;
}

export function UploadedFile({ url, type, alt }: { url: string; type?: string; alt: string }) {
  if (!url) return null;
  return type?.startsWith("image/") ? (
    // eslint-disable-next-line @next/next/no-img-element -- a file kept in the browser, not a site image
    <img src={url} alt={alt} className="max-h-[60vh] w-full rounded-2xl border border-gold/40 bg-sand object-contain" />
  ) : (
    <iframe src={url} title={alt} className="h-[60vh] w-full rounded-2xl border border-gold/40 bg-sand" />
  );
}

/**
 * The document opened large: itself, then printing it (on its own A4 sheet, in the platform's printed template),
 * downloading the file it came as, and closing. `print` is what goes on paper when it differs from the screen (the
 * contract's full text).
 */
export function DocViewer({ open, onClose, children, print, file, wide }: { open: boolean; onClose: () => void; children: ReactNode; print?: ReactNode; file?: { url: string; name?: string }; wide?: boolean }) {
  return (
    <>
      <Modal open={open} onClose={onClose} className={wide ? "max-w-4xl" : "max-w-3xl"}>
        {open && (
          <div className="pt-6">
            {children}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => window.print()}>
                <Printer className="size-4" /> طباعة
              </Button>
              {file?.url && (
                <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-green-dark/20 bg-white px-4 text-sm font-bold text-green-dark hover:bg-green-dark/5">
                  <Download className="size-4" /> تنزيل الملف
                </a>
              )}
              <Button variant="outline" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {open && (
        <PrintSheet>
          <OnPaper.Provider value>{print ?? children}</OnPaper.Provider>
        </PrintSheet>
      )}
    </>
  );
}
