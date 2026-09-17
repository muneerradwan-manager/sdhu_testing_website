"use client";

import { motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SpeakButton, useToast } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";

/** Quran-font dua card with read-aloud and copy */
export function DuaCard({
  title,
  text,
  source,
  when,
  className,
  dark = false,
}: {
  title: string;
  text: string;
  source?: string;
  when?: string;
  className?: string;
  dark?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n${text}${source ? `\n(${source})` : ""}`);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      toast({ title: "نُسخ الدعاء", body: "يمكنك لصقه ومشاركته مع أهلك ورفاقك.", tone: "success", icon: "📋" });
    } catch {
      toast({ title: "تعذّر النسخ", body: "انسخ النص يدوياً من فضلك.", tone: "warning", icon: "⚠️" });
    }
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 shadow-[0_12px_40px_-24px_rgba(2,21,38,.35)] sm:p-6",
        dark ? "border-gold/25 bg-green-dark text-white" : "border-gold/40 bg-white",
        className,
      )}
    >
      <span className={cn("pointer-events-none absolute -left-10 -top-10 size-32 rounded-full blur-2xl transition-opacity group-hover:opacity-100", dark ? "bg-gold/10" : "bg-gold/25 opacity-60")} />
      <header className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className={cn("font-display text-lg font-bold", dark ? "text-gold" : "text-green-dark")}>{title}</h3>
          {when && <p className={cn("mt-0.5 text-xs", dark ? "text-white/60" : "text-hint")}>{when}</p>}
        </div>
        <svg viewBox="0 0 24 24" className={cn("size-7 shrink-0", dark ? "text-gold/60" : "text-gold-dark/60")} aria-hidden>
          <path d="M12 2l2.6 6.3L21 9l-4.9 4.3L17.5 20 12 16.6 6.5 20l1.4-6.7L3 9l6.4-.7z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </header>
      <p className={cn("relative mt-4 flex-1 font-quran text-xl leading-[2.3] sm:text-2xl sm:leading-[2.4]", dark ? "text-white" : "text-ink")}>{text}</p>
      <footer className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-gold/40 pt-4">
        {source ? <span className={cn("text-xs font-semibold", dark ? "text-white/60" : "text-gold-dark")}>{source}</span> : <span />}
        <div className="flex items-center gap-2">
          <SpeakButton text={text} className="px-3 py-1.5" />
          <button
            type="button"
            onClick={copy}
            aria-label={`نسخ ${title}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
              copied ? "border-green-light bg-green-light/10 text-green" : "border-green-dark/15 bg-white text-green-dark hover:border-green-dark/40",
            )}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "نُسخ" : "نسخ"}
          </button>
        </div>
      </footer>
    </motion.article>
  );
}
