"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Link2, ListTree, Printer, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91A9.86 9.86 0 0012.04 2zm5.8 14.09c-.24.68-1.42 1.3-1.95 1.35-.5.05-1.13.07-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21.94 4.3l-3.2 15.1c-.24 1.06-.87 1.33-1.76.83l-4.87-3.59-2.35 2.26c-.26.26-.48.48-.98.48l.35-4.96 9.03-8.16c.39-.35-.09-.54-.61-.2L6.4 13.1 1.6 11.6c-1.04-.33-1.06-1.04.22-1.54L20.6 2.8c.87-.32 1.63.2 1.34 1.5z" />
    </svg>
  );
}

export function ShareBar({ title, className }: { title: string; className?: string }) {
  const toast = useToast();
  const t = useT();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* clipboard may be blocked; still confirm so the demo flows */
    }
    setCopied(true);
    toast({
      title: t("تم نسخ الرابط", "Link copied"),
      body: t("يمكنك الآن مشاركته مع أهلك ومعارفك.", "You can now share it with your family and friends."),
      tone: "success",
      icon: "🔗",
    });
    setTimeout(() => setCopied(false), 2200);
  };

  const open = (network: "wa" | "tg") => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    const href = network === "wa" ? `https://wa.me/?text=${text}%20${url}` : `https://t.me/share/url?url=${url}&text=${text}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const btn =
    "group relative grid size-11 place-items-center rounded-2xl border border-gold/35 bg-white text-green-dark transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="me-1 text-sm font-semibold text-ink-soft">{t("شارك:", "Share:")}</span>
      <button type="button" onClick={copy} className={cn(btn, copied && "border-green-light bg-green-light/10")} aria-label={t("نسخ الرابط", "Copy link")}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={copied ? "ok" : "link"} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }}>
            {copied ? <Check className="size-5 text-green" /> : <Link2 className="size-5" />}
          </motion.span>
        </AnimatePresence>
      </button>
      <button type="button" onClick={() => open("wa")} className={cn(btn, "hover:border-[#25D366] hover:bg-[#25D366] hover:text-white")} aria-label={t("مشاركة عبر واتساب", "Share on WhatsApp")}>
        <WhatsAppIcon className="size-5" />
      </button>
      <button type="button" onClick={() => open("tg")} className={cn(btn, "hover:border-[#229ED9] hover:bg-[#229ED9] hover:text-white")} aria-label={t("مشاركة عبر تيليغرام", "Share on Telegram")}>
        <TelegramIcon className="size-5" />
      </button>
      <button type="button" onClick={() => window.print()} className={cn(btn, "hover:bg-green-dark hover:text-gold")} aria-label={t("طباعة", "Print")}>
        <Printer className="size-5" />
      </button>
    </div>
  );
}

export function Feedback() {
  const toast = useToast();
  const t = useT();
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

  const pick = (v: "yes" | "no") => {
    setAnswer(v);
    toast(
      v === "yes"
        ? { title: t("شكراً لك!", "Thank you!"), body: t("يسعدنا أن المنشور كان مفيداً.", "We're glad the post was helpful."), tone: "gold", icon: "💚" }
        : { title: t("شكراً لملاحظتك", "Thanks for your feedback"), body: t("سنعمل على توضيح هذا المنشور أكثر.", "We will work on making this post clearer."), tone: "info", icon: "📝" },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/35 bg-gradient-to-l from-gold-light/60 to-white p-6 text-center ltr:bg-gradient-to-r md:p-8">
      <div className="bg-pattern-dark absolute inset-0 opacity-50" />
      <AnimatePresence mode="wait">
        {answer === null ? (
          <motion.div key="ask" className="relative" exit={{ opacity: 0, y: -10 }}>
            <p className="font-display text-xl font-bold text-green-dark">{t("هل كان هذا مفيداً؟", "Was this helpful?")}</p>
            <p className="mt-1 text-sm text-ink-soft">{t("رأيك يساعدنا على كتابة إعلانات أوضح.", "Your opinion helps us write clearer announcements.")}</p>
            <div className="mt-5 flex justify-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, rotate: -3 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => pick("yes")}
                className="inline-flex items-center gap-2 rounded-2xl bg-green-dark px-6 py-2.5 font-bold text-white shadow-[0_8px_24px_-10px_rgba(0,89,79,.7)]"
              >
                <ThumbsUp className="size-4" /> {t("نعم", "Yes")}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05, rotate: 3 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => pick("no")}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-green-dark/20 bg-white px-6 py-2.5 font-bold text-green-dark"
              >
                <ThumbsDown className="size-4" /> {t("لا", "No")}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="thanks" className="relative" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.25, 1] }}
              transition={{ duration: 0.6 }}
              className="mx-auto grid size-14 place-items-center rounded-full bg-green-dark text-gold"
            >
              <Check className="size-7" />
            </motion.span>
            <p className="mt-3 font-display text-xl font-bold text-green-dark">{answer === "yes" ? t("شكراً، سعدنا بذلك", "Thank you, we're glad to hear it") : t("شكراً، وصلت ملاحظتك", "Thank you, we received your feedback")}</p>
            <button type="button" onClick={() => setAnswer(null)} className="mt-2 text-sm text-hint underline-offset-4 hover:underline">
              {t("تغيير إجابتي", "Change my answer")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TableOfContents({ items }: { items: { id: string; text: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label={t("محتويات المنشور", "Post contents")} className="rounded-3xl border border-gold/30 bg-white p-5">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
        <ListTree className="size-5 text-gold-dark" /> {t("في هذا المنشور", "In this post")}
      </p>
      <ol className="relative mt-4 space-y-1 border-s-2 border-gold/30">
        {items.map((it) => {
          const on = active === it.id;
          return (
            <li key={it.id} className="relative">
              {on && <motion.span layoutId="toc-bar" className="absolute -start-[2px] top-0 h-full w-[2px] bg-green-dark" />}
              <a
                href={`#${it.id}`}
                className={cn("block py-1.5 ps-4 text-sm leading-6 transition-colors", on ? "font-bold text-green-dark" : "text-ink-soft hover:text-green-dark")}
              >
                {it.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
