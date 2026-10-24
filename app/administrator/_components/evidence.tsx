"use client";

import { FileText, Mic, Paperclip, Video, X } from "lucide-react";
import { useRef, useState } from "react";
import { EVIDENCE_ACCEPT, evidenceKind, uploadEvidence, useEvidenceUrl } from "@/lib/evidence";
import type { Evidence } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Evidence on an objection or an answer to it — photos, recordings, videos, documents: the same pieces for the
 * administrator (light portal), the staff who rated and the committee (dark). `EvidencePicker` attaches,
 * `EvidenceView` reads.
 */
export function EvidencePicker({ value, onChange, tone = "light", label = "إرفاق دليل — صورة أو صوت أو فيديو أو مستند" }: { value: Evidence[]; onChange: (v: Evidence[]) => void; tone?: "light" | "dark"; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dark = tone === "dark";
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const made: Evidence[] = [];
      for (const f of Array.from(files)) made.push(await uploadEvidence(f));
      onChange([...value, ...made]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition disabled:opacity-60", dark ? "bg-white/10 text-white/85 ring-white/15 hover:ring-gold/60" : "bg-white text-green-dark ring-gold/50 hover:ring-green-dark")}
        >
          <Paperclip className="size-3.5" /> {busy ? "جارٍ الرفع…" : label}
        </button>
        <input ref={input} type="file" multiple accept={EVIDENCE_ACCEPT} onChange={(e) => add(e.target.files)} className="sr-only" aria-label="إرفاق دليل" />
        {value.map((v, i) => (
          <span key={v.ref} className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1", dark ? "bg-green-light/20 text-white ring-green-light/40" : "bg-green-light/10 text-green-dark ring-green-light/40")}>
            <KindIcon type={v.type} />
            <span className="truncate">{v.name}</span>
            <button type="button" aria-label={`إزالة ${v.name}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="opacity-70 hover:opacity-100">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      {error && <p className={cn("mt-1.5 text-xs font-bold", dark ? "text-gold" : "text-maroon")}>{error}</p>}
    </div>
  );
}

function KindIcon({ type }: { type: string }) {
  const k = evidenceKind(type);
  return k === "audio" ? <Mic className="size-3.5 shrink-0" /> : k === "video" ? <Video className="size-3.5 shrink-0" /> : <FileText className="size-3.5 shrink-0" />;
}

/** The pieces, each as it is read: a picture shows, a recording and a video play, a document opens */
export function EvidenceView({ items, tone = "light" }: { items?: Evidence[]; tone?: "light" | "dark" }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2">
      {items.map((v) => (
        <li key={v.ref} className={cn("overflow-hidden rounded-2xl p-2 ring-1", tone === "dark" ? "bg-white/[.06] ring-white/10" : "bg-sand ring-gold/30")}>
          <Piece item={v} tone={tone} />
        </li>
      ))}
    </ul>
  );
}

function Piece({ item, tone }: { item: Evidence; tone: "light" | "dark" }) {
  const url = useEvidenceUrl(item.ref);
  const kind = evidenceKind(item.type);
  const name = <p className={cn("mt-1.5 truncate px-1 text-xs font-bold", tone === "dark" ? "text-white/80" : "text-ink-soft")}>{item.name}</p>;
  if (!url) return <p className="p-3 text-xs text-hint">يُحمَّل «{item.name}»…</p>;
  if (kind === "image")
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={item.name} className="max-h-56 w-full rounded-xl object-contain" />
        {name}
      </>
    );
  if (kind === "audio")
    return (
      <>
        <audio controls src={url} className="w-full" />
        {name}
      </>
    );
  if (kind === "video")
    return (
      <>
        <video controls src={url} className="max-h-56 w-full rounded-xl" />
        {name}
      </>
    );
  return (
    <a href={url} download={item.name} className={cn("flex items-center gap-2 p-2 text-sm font-bold underline", tone === "dark" ? "text-gold" : "text-green-dark")}>
      <FileText className="size-4 shrink-0" /> <span className="truncate">{item.name}</span>
    </a>
  );
}
