"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { MessageSquareText, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { useLang, useT } from "@/lib/i18n";
import { getPerson } from "@/lib/registry";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const MAX = 500;

/**
 * The comments under a news post. Anyone reads them; any account writes one — a pilgrim, an administrator, or a
 * member of the platform who has not chosen anything this season — under its first name and family name, and its
 * writer may take it down.
 */
export function ArticleComments({ slug }: { slug: string }) {
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const comments = useStore((s) => s.newsComments[slug]) ?? [];
  const [text, setText] = useState("");
  const me = hydrated && session ? getPerson(session) : null;
  const when = (at: number) => new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ar-SY-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!me || !session || !body) return;
    actions.addNewsComment(slug, { by: session, name: `${me.firstName} ${me.lastName}`, text: body.slice(0, MAX) });
    setText("");
    toast({ title: t("نُشر تعليقك", "Your comment is published"), icon: "💬", tone: "success" });
  };

  return (
    <section aria-labelledby="comments-title" className="rounded-3xl bg-white p-5 ring-1 ring-gold/30 md:p-7">
      <h2 id="comments-title" className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
        <MessageSquareText className="size-5 text-gold-dark" /> {t("التعليقات", "Comments")}
        {hydrated && comments.length > 0 && <span className="rounded-full bg-sand px-2 text-sm text-ink-soft">{comments.length}</span>}
      </h2>

      {hydrated && comments.length > 0 ? (
        <ol className="mt-4 space-y-3">
          <AnimatePresence initial={false}>
            {comments.map((c) => (
              <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 rounded-2xl bg-sand/70 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold font-display font-bold text-ink">{c.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-bold text-green-dark">{c.name}</span>
                    <span className="text-xs text-hint">{when(c.at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words leading-7 text-ink">{c.text}</p>
                </div>
                {c.by === session && (
                  <button type="button" onClick={() => actions.removeNewsComment(slug, c.id)} aria-label={t("حذف تعليقي", "Delete my comment")} title={t("حذف تعليقي", "Delete my comment")} className="grid size-9 shrink-0 place-items-center rounded-xl text-hint transition hover:bg-maroon/10 hover:text-maroon">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      ) : (
        <p className="mt-3 text-sm text-hint">{t("لا تعليقات بعد. كن أول من يعلّق.", "No comments yet. Be the first to comment.")}</p>
      )}

      {me ? (
        <form onSubmit={send} className="mt-5">
          <label className="block">
            <span className="text-sm font-bold text-ink-soft">{t(`علّق باسمك: ${me.firstName} ${me.lastName}`, `Comment as ${me.firstName} ${me.lastName}`)}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX))}
              rows={3}
              placeholder={t("اكتب تعليقك…", "Write your comment…")}
              className="mt-2 w-full resize-y rounded-2xl border-2 border-gold/40 bg-white p-3 leading-7 outline-none transition focus:border-green-dark"
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={cn("text-xs tabular-nums", text.length >= MAX ? "text-maroon" : "text-hint")}>{text.length}/{MAX}</span>
            <Button type="submit" disabled={!text.trim()}>
              <Send className="size-4" /> {t("نشر التعليق", "Post comment")}
            </Button>
          </div>
        </form>
      ) : (
        hydrated && (
          <p className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-green-dark/[.04] p-4 text-sm text-ink-soft">
            {t("للتعليق تحتاج إلى حساب في المنصة.", "You need an account on the platform to comment.")}
            <Link href="/login" className="font-bold text-green-dark hover:underline">{t("سجّل الدخول", "Sign in")}</Link>
            <span>{t("أو", "or")}</span>
            <Link href="/register" className="font-bold text-green-dark hover:underline">{t("أنشئ حساباً", "create an account")}</Link>
          </p>
        )
      )}
    </section>
  );
}
