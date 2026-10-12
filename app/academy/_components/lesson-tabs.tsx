"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, BookOpenText, ChevronDown, ListChecks, MessageCircleQuestion, Send, UserPlus } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { SpeakButton, useToast } from "@/components/ui/widgets";
import { useHydrated, useStore } from "@/lib/store";
import type { Lesson } from "@/lib/data/academy";
import { cn } from "@/lib/utils";
import { DuaCard } from "@/app/guide/_components/dua-card";
import { useLang, useT } from "@/lib/i18n";

const TABS = [
  { id: "summary", label: { ar: "الملخص المكتوب", en: "Written summary" }, icon: BookOpenText },
  { id: "points", label: { ar: "النقاط الرئيسية", en: "Key points" }, icon: ListChecks },
  { id: "faq", label: { ar: "الأسئلة المعتمدة", en: "Approved questions" }, icon: BadgeCheck },
  { id: "ask", label: { ar: "اسأل المحاضر", en: "Ask the lecturer" }, icon: MessageCircleQuestion },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function LessonTabs({ lesson, lecturerName }: { lesson: Pick<Lesson, "title" | "summary" | "points" | "faq" | "duas">; lecturerName: string }) {
  const lang = useLang();
  const t = useT();
  const [tab, setTab] = useState<TabId>("summary");
  const uid = useId();

  return (
    <section className="rounded-3xl border border-gold/35 bg-white p-2 shadow-[0_20px_60px_-40px_rgba(2,21,38,.4)] sm:p-3">
      <div role="tablist" aria-label={t("محتوى الدرس", "Lesson content")} className="scrollbar-none flex gap-1 overflow-x-auto rounded-2xl bg-sand p-1">
        {TABS.map((tb) => {
          const active = tb.id === tab;
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              id={`${uid}-tab-${tb.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`${uid}-panel`}
              onClick={() => setTab(tb.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors sm:flex-1 sm:justify-center",
                active ? "text-white" : "text-ink-soft hover:text-green-dark",
              )}
            >
              {active && <motion.span layoutId={`${uid}-pill`} className="absolute inset-0 rounded-xl bg-green-dark shadow-md" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <Icon className={cn("relative size-4", active && "text-gold")} />
              <span className="relative">{tb.label[lang]}</span>
            </button>
          );
        })}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} className="p-3 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
          >
            {tab === "summary" && <Summary lesson={lesson} />}
            {tab === "points" && <Points points={lesson.points} />}
            {tab === "faq" && <FaqList faq={lesson.faq} lecturerName={lecturerName} />}
            {tab === "ask" && <AskForm lecturerName={lecturerName} lessonTitle={lesson.title} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Summary({ lesson }: { lesson: Pick<Lesson, "summary" | "duas" | "title"> }) {
  const t = useT();
  const en = useLang() === "en";
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-green-dark">{t("ملخص الدرس", "Lesson summary")}</h2>
        {/* The voice reads Arabic only, so the English page has no read-aloud */}
        {!en && <SpeakButton text={`${lesson.title}. ${lesson.summary.join(" ")}`} label="استمع إلى الملخص" />}
      </div>
      <div className="space-y-4 text-[17px] leading-9 text-ink/90">
        {lesson.summary.map((p, i) => (
          <motion.p key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }} className={cn(i === 0 && "first-letter:font-display first-letter:text-3xl first-letter:text-maroon")}>
            {p}
          </motion.p>
        ))}
      </div>
      {lesson.duas && lesson.duas.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 font-display text-lg font-bold text-green-dark">{t("أدعية الدرس", "Duas of the lesson")}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {lesson.duas.map((d) => (
              <DuaCard key={d.title} title={d.title} text={d.text} source={d.source} />
            ))}
          </div>
        </div>
      )}
      <p className="mt-6 rounded-2xl bg-sand px-4 py-3 text-sm leading-7 text-ink-soft">
        {t(
          "راجع هذا الملخص لجنة المحتوى الديني في الإدارة. وعند اختلاف أقوال العلماء في مسألة، اتبع توجيه مرشد مجموعتك.",
          "This summary was reviewed by the Administration's religious content committee. Where scholars differ on a question, follow your group guide's advice.",
        )}
      </p>
    </div>
  );
}

function Points({ points }: { points: string[] }) {
  const en = useLang() === "en";
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {points.map((p, i) => (
        <motion.li
          key={p}
          initial={{ opacity: 0, x: en ? -16 : 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }}
          className="group flex items-start gap-3 rounded-2xl border border-gold/30 bg-sand/60 p-4 transition hover:border-gold-dark/50 hover:bg-white"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-green-dark font-display text-sm font-bold text-gold transition group-hover:rotate-6">{i + 1}</span>
          <span className="pt-0.5 font-semibold leading-7 text-ink">{p}</span>
        </motion.li>
      ))}
    </ol>
  );
}

function FaqList({ faq, lecturerName }: { faq: Lesson["faq"]; lecturerName: string }) {
  const t = useT();
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      {faq.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className={cn("overflow-hidden rounded-2xl border transition-colors", isOpen ? "border-green-light/40 bg-green-light/5" : "border-gold/30 bg-white")}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center gap-3 p-4 text-start">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/30 font-display font-bold text-maroon">{t("س", "Q")}</span>
              <span className="flex-1 font-bold leading-7 text-ink">{f.q}</span>
              <ChevronDown className={cn("size-5 shrink-0 text-gold-dark transition-transform duration-300", isOpen && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="px-4 pb-4 ps-15">
                    <p className="leading-8 text-ink/85">{f.a}</p>
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-light/12 px-3 py-1 text-xs font-bold text-green">
                      <BadgeCheck className="size-3.5" /> {t("جواب معتمد", "Approved answer")} — {lecturerName}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <p className="pt-2 text-sm text-hint">{t("تُنشر الأسئلة المتكررة مع أجوبتها بعد مراجعتها واعتمادها.", "Frequently asked questions are published with their answers once reviewed and approved.")}</p>
    </div>
  );
}

function AskForm({ lecturerName, lessonTitle }: { lecturerName: string; lessonTitle: string }) {
  const t = useT();
  const hydrated = useHydrated();
  const session = useStore((s) => s.sessionId);
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!hydrated || !session) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-green-dark p-6 text-center text-white sm:p-10">
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative mx-auto max-w-md">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gold/20 text-gold">
            <MessageCircleQuestion className="size-7" />
          </span>
          <h3 className="mt-4 font-display text-2xl font-bold">{t("عندك سؤال عن هذا الدرس؟", "Have a question about this lesson?")}</h3>
          <p className="mt-2 leading-7 text-white/75">{t(`أنشئ حساباً مجانياً لترسل سؤالك إلى ${lecturerName}، وتصلك الإجابة في حسابك.`, `Create a free account to send your question to ${lecturerName}. The answer will reach you in your account.`)}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl bg-gold px-5 py-3 font-bold text-ink transition hover:bg-gold-dark hover:text-white">
              <UserPlus className="size-5" /> {t("إنشاء حساب", "Create an account")}
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/20">
              {t("تسجيل الدخول", "Log in")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast({
        title: t("السؤال قصير جداً", "Your question is too short"),
        body: t("اكتب سؤالك بوضوح في 10 أحرف على الأقل.", "Write your question clearly in at least 10 characters."),
        tone: "warning",
        icon: "✍️",
      });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setText("");
      toast({
        title: t("وصل سؤالك إلى المحاضر", "Your question has reached the lecturer"),
        body: t(`سيجيب ${lecturerName} خلال 48 ساعة، وتصلك الإجابة في حسابك.`, `${lecturerName} will answer within 48 hours, and the answer will reach you in your account.`),
        tone: "success",
        icon: "✅",
      });
    }, 1100);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="ask-q" className="mb-2 block font-bold text-green-dark">
          {t("سؤالك إلى", "Your question to")} {lecturerName}
        </label>
        <p className="mb-3 text-sm text-hint">{t(`عن درس «${lessonTitle}». لا تكتب بيانات شخصية في السؤال.`, `About the lesson «${lessonTitle}». Do not include personal details in your question.`)}</p>
        <textarea
          id="ask-q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={600}
          placeholder={t("مثال: هل يجوز للمحرم استعمال مرطب الشفاه؟", "Example: may a pilgrim in Ihram use lip balm?")}
          className="w-full resize-none rounded-2xl border border-gold/40 bg-sand/50 p-4 leading-8 outline-none transition focus:border-green-light focus:bg-white focus:ring-4 focus:ring-green-light/15"
        />
        <p className="mt-1 text-end text-xs tabular-nums text-hint">{text.length}/600</p>
      </div>
      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center gap-2 rounded-2xl bg-green-dark px-6 py-3 font-bold text-white shadow-lg transition hover:bg-green disabled:opacity-60"
      >
        {sending ? <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send className="size-5 rtl:-scale-x-100" />}
        {sending ? t("جارٍ الإرسال…", "Sending…") : t("أرسل السؤال", "Send your question")}
      </button>
    </form>
  );
}
