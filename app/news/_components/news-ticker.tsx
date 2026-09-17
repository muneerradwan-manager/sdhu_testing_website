import Link from "next/link";
import { Radio } from "lucide-react";
import { ARTICLES } from "@/lib/data/news";

export function NewsTicker() {
  const items = ARTICLES.filter((a) => a.ticker);
  const row = (copy: number) => (
    <ul className="flex shrink-0 items-center" aria-hidden={copy === 1}>
      {items.map((a) => (
        <li key={a.slug} className="flex items-center">
          <Link href={`/news/${a.slug}`} tabIndex={copy === 1 ? -1 : undefined} className="whitespace-nowrap px-5 text-sm font-semibold text-white/90 transition hover:text-gold">
            {a.ticker}
          </Link>
          <span className="size-1.5 rotate-45 bg-gold" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group relative flex items-stretch overflow-hidden rounded-2xl bg-ink text-white shadow-[0_20px_50px_-30px_rgba(2,21,38,.8)] ring-1 ring-gold/25">
      <div className="relative z-10 flex shrink-0 items-center gap-2 bg-maroon px-4 py-3 text-sm font-bold shadow-[8px_0_24px_rgba(2,21,38,.6)]">
        <span className="relative flex size-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-gold" />
          <span className="relative size-2.5 rounded-full bg-gold" />
        </span>
        <Radio className="hidden size-4 sm:block" />
        عاجل
      </div>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_left,transparent,black_4%,black_96%,transparent)]">
        <div className="flex w-max animate-marquee items-center py-3 group-hover:[animation-play-state:paused]">
          {row(0)}
          {row(1)}
        </div>
      </div>
    </div>
  );
}
