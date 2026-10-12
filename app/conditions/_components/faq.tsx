"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, SearchX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFaqs } from "@/lib/cms/content";
import { FAQ_CATEGORIES, type FaqCategory } from "@/lib/data/faq";
import { normalizeArabic } from "@/lib/data/clusters";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The categories in English; a category the English content may already give in English maps back to its Arabic key */
const CATEGORY_EN: Record<string, string> = {
  "الكل": "All",
  "التسجيل": "Registration",
  "الشروط": "Conditions",
  "القبول والقرعة": "Acceptance and lottery",
  "التكاليف والدفع": "Costs and payment",
  "الخدمات والتحقق": "Services and verification",
};
const CATEGORY_AR: Record<string, string> = Object.fromEntries(Object.entries(CATEGORY_EN).map(([ar, en]) => [en, ar]));
const categoryOf = (c: string) => CATEGORY_AR[c] ?? c;

/** Search in Arabic or English: Arabic letters normalised, Latin letters in any case */
const norm = (s: string) => normalizeArabic(s).toLowerCase();

function highlight(text: string, q: string): ReactNode {
  const query = q.trim();
  if (query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-gold/60 px-0.5 text-ink">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function Faq() {
  const t = useT();
  const faqs = useFaqs().map((f) => ({ ...f, category: categoryOf(f.category) as FaqCategory }));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"الكل" | FaqCategory>("الكل");
  // null = لم يختر الزائر شيئاً بعد، فيُفتح أول سؤال معروض
  const [open, setOpen] = useState<string | null>(null);

  const nq = norm(q);
  const list = faqs.filter((f) => (cat === "الكل" || f.category === cat) && (!nq || norm(`${f.q} ${f.a}`).includes(nq)));
  const counts = (c: "الكل" | FaqCategory) => (c === "الكل" ? faqs.length : faqs.filter((f) => f.category === c).length);
  const openQuestion = open ?? list[0]?.q ?? null;

  return (
    <div className="mx-auto max-w-4xl">
      <label className="relative block">
        <span className="sr-only">{t("ابحث في الأسئلة الشائعة", "Search the FAQ")}</span>
        <Search className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("ابحث في الأسئلة… مثال: محرم، القرعة، الإيصال", "Search the questions… e.g. mahram, lottery, receipt")}
          className="h-14 w-full rounded-3xl border-2 border-gold/50 bg-white ps-13 pe-4 text-base outline-none transition placeholder:text-hint focus:border-green-light focus:ring-8 focus:ring-green-light/10"
        />
      </label>

      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        {(["الكل", ...FAQ_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn("relative shrink-0 rounded-full px-4 py-2 text-sm font-bold transition", cat === c ? "text-white" : "bg-white text-ink-soft ring-1 ring-gold/50 hover:text-ink")}
          >
            {cat === c && <motion.span layoutId="faq-cat" className="absolute inset-0 rounded-full bg-green-dark" transition={{ type: "spring", damping: 26, stiffness: 320 }} />}
            <span className="relative">
              {t(c, CATEGORY_EN[c] ?? c)} <span className={cn("text-xs", cat === c ? "text-gold" : "text-hint")}>{counts(c)}</span>
            </span>
          </button>
        ))}
      </div>

      <motion.ul layout className="mt-8 space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((f) => {
            const isOpen = openQuestion === f.q;
            const id = `faq-${faqs.indexOf(f)}`;
            return (
              <motion.li
                layout
                key={f.q}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "overflow-hidden rounded-3xl border bg-white transition-shadow",
                  isOpen ? "border-green-light/40 shadow-[0_20px_50px_-30px_rgba(0,89,79,.6)]" : "border-gold/40 hover:border-gold-dark/60",
                )}
              >
                <h3>
                  <button
                    onClick={() => setOpen(isOpen ? null : f.q)}
                    aria-expanded={isOpen}
                    aria-controls={id}
                    className="flex w-full items-center gap-4 p-5 text-start"
                  >
                    <span className="flex-1">
                      <span className="mb-1 block text-[11px] font-bold text-gold-dark">{t(f.category, CATEGORY_EN[f.category] ?? f.category)}</span>
                      <span className={cn("block font-bold leading-7 transition-colors", isOpen ? "text-green-dark" : "text-ink")}>{highlight(f.q, q)}</span>
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0, backgroundColor: isOpen ? "#00594F" : "#F7F4EF", color: isOpen ? "#D9C89E" : "#00594F" }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    >
                      <Plus className="size-5" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={id}
                      role="region"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 0.25 } }}
                    >
                      <p className="mx-5 border-t border-dashed border-gold/60 pb-5 pt-4 leading-8 text-ink-soft">{highlight(f.a, q)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      {list.length === 0 && (
        <div className="py-14 text-center text-ink-soft">
          <SearchX className="mx-auto size-10 text-gold-dark" />
          <p className="mt-3">{t("لا توجد أسئلة مطابقة. جرّب كلمة أخرى.", "No matching questions. Try another word.")}</p>
        </div>
      )}
    </div>
  );
}
