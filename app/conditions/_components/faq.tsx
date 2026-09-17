"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, SearchX } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FAQ_CATEGORIES, FAQS, type FaqCategory } from "@/lib/data/faq";
import { normalizeArabic } from "@/lib/data/clusters";
import { cn } from "@/lib/utils";

function highlight(text: string, q: string): ReactNode {
  const query = q.trim();
  if (query.length < 2) return text;
  const idx = text.indexOf(query);
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
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"الكل" | FaqCategory>("الكل");
  const [open, setOpen] = useState<string | null>(FAQS[0].q);

  const nq = normalizeArabic(q);
  const list = FAQS.filter((f) => (cat === "الكل" || f.category === cat) && (!nq || normalizeArabic(`${f.q} ${f.a}`).includes(nq)));
  const counts = (c: "الكل" | FaqCategory) => (c === "الكل" ? FAQS.length : FAQS.filter((f) => f.category === c).length);

  return (
    <div className="mx-auto max-w-4xl">
      <label className="relative block">
        <span className="sr-only">ابحث في الأسئلة الشائعة</span>
        <Search className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-gold-dark" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث في الأسئلة… مثال: محرم، القرعة، الإيصال"
          className="h-14 w-full rounded-3xl border-2 border-gold/50 bg-white pl-4 pr-13 text-base outline-none transition placeholder:text-hint focus:border-green-light focus:ring-8 focus:ring-green-light/10"
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
              {c} <span className={cn("text-xs", cat === c ? "text-gold" : "text-hint")}>{counts(c)}</span>
            </span>
          </button>
        ))}
      </div>

      <motion.ul layout className="mt-8 space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((f) => {
            const isOpen = open === f.q;
            const id = `faq-${FAQS.indexOf(f)}`;
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
                      <span className="mb-1 block text-[11px] font-bold text-gold-dark">{f.category}</span>
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
          <p className="mt-3">لا توجد أسئلة مطابقة. جرّب كلمة أخرى.</p>
        </div>
      )}
    </div>
  );
}
