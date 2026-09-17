import { AlertTriangle, BadgeCheck, Lightbulb, Quote } from "lucide-react";
import type { Block } from "@/lib/data/news";
import { Reveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

export const headingId = (i: number) => `section-${i + 1}`;

const CALLOUT = {
  gold: { box: "border-gold-dark/40 bg-gradient-to-l from-gold/35 to-gold-light/40", icon: Lightbulb, iconBox: "bg-gold-dark text-white", title: "text-maroon" },
  maroon: { box: "border-maroon/30 bg-gradient-to-l from-maroon/10 to-maroon/[.03]", icon: AlertTriangle, iconBox: "bg-maroon text-white", title: "text-maroon" },
  green: { box: "border-green-light/40 bg-gradient-to-l from-green-light/15 to-green-light/[.04]", icon: BadgeCheck, iconBox: "bg-green-dark text-gold", title: "text-green-dark" },
} as const;

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  const leadIndex = blocks.findIndex((b) => b.type === "p");

  return (
    <div className="text-[1.075rem] leading-9 text-ink/90">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p": {
            const lead = i === leadIndex;
            return (
              <p
                key={i}
                className={cn(
                  "my-5",
                  lead &&
                    "border-r-4 border-gold pr-5 text-lg font-medium leading-10 text-ink md:text-xl md:leading-[2.75rem]",
                )}
              >
                {b.text}
              </p>
            );
          }
          case "h":
            return (
              <h2 key={i} id={headingId(i)} className="group mt-12 mb-4 flex scroll-mt-28 items-center gap-3 font-display text-2xl font-bold text-green-dark md:text-[1.75rem]">
                <span className="size-2.5 shrink-0 rotate-45 bg-gold-dark transition-transform duration-500 group-hover:rotate-[225deg]" />
                {b.text}
              </h2>
            );
          case "list":
            return b.ordered ? (
              <ol key={i} className="my-6 space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-4 rounded-2xl bg-white p-4 ring-1 ring-gold/25 transition hover:ring-gold/60">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green-dark font-display text-sm font-bold text-gold">{j + 1}</span>
                    <span className="pt-0.5 leading-8">{it}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="my-6 space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <svg viewBox="0 0 12 12" className="mt-3 size-3 shrink-0 text-gold-dark" aria-hidden>
                      <path d="M6 0l1.8 4.2L12 6l-4.2 1.8L6 12l-1.8-4.2L0 6l4.2-1.8z" fill="currentColor" />
                    </svg>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout": {
            const t = CALLOUT[b.tone ?? "gold"];
            const Icon = t.icon;
            return (
              <Reveal key={i}>
                <aside role="note" className={cn("relative my-8 overflow-hidden rounded-3xl border-2 p-5 md:p-6", t.box)}>
                  <div className="bg-pattern-dark absolute inset-0 opacity-50" />
                  <div className="relative flex gap-4">
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl shadow-lg", t.iconBox)}>
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className={cn("font-display text-lg font-bold", t.title)}>{b.title}</p>
                      <p className="mt-1 leading-8 text-ink">{b.text}</p>
                    </div>
                  </div>
                </aside>
              </Reveal>
            );
          }
          case "quote":
            return (
              <figure key={i} className="relative my-10 rounded-3xl bg-green-dark px-6 py-8 text-white md:px-10">
                <Quote className="absolute -top-4 right-6 size-10 rounded-full bg-gold p-2 text-green-dark" />
                <blockquote className="font-quran text-xl leading-10 md:text-2xl">«{b.text}»</blockquote>
                {b.by && <figcaption className="mt-3 text-sm text-gold">— {b.by}</figcaption>}
              </figure>
            );
          case "table":
            return (
              <div key={i} className="my-8 overflow-hidden rounded-3xl border border-gold/35 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-[15px] leading-7">
                    {b.caption && <caption className="bg-sand px-5 py-3 text-start font-display font-bold text-green-dark">{b.caption}</caption>}
                    <thead>
                      <tr className="bg-green-dark text-white">
                        {b.head.map((h) => (
                          <th key={h} scope="col" className="px-5 py-3 text-start font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((r, j) => (
                        <tr key={j} className="border-t border-gold/20 transition-colors odd:bg-white even:bg-sand/60 hover:bg-gold/20">
                          {r.map((cell, k) => (
                            <td key={k} className={cn("px-5 py-3", k === 0 && "font-semibold text-green-dark")}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
        }
      })}
    </div>
  );
}
