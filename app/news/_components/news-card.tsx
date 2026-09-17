import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, CalendarDays, Clock3, Eye, Pin } from "lucide-react";
import type { ReactNode } from "react";
import { CATEGORY_TONE, type Article } from "@/lib/data/news";
import { Badge } from "@/components/ui/widgets";
import { cn, formatNumber } from "@/lib/utils";

export function CategoryBadge({ article, className }: { article: Article; className?: string }) {
  return (
    <Badge tone={CATEGORY_TONE[article.category]} className={className}>
      {article.category}
    </Badge>
  );
}

export function ArticleMeta({ article, light, className }: { article: Article; light?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs", light ? "text-white/70" : "text-hint", className)}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="size-3.5" />
        {article.hijri}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="size-3.5" />
        {article.readingMinutes} دقائق قراءة
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5" />
        {formatNumber(article.views)}
      </span>
    </div>
  );
}

export function NewsCard({ article, title, priority }: { article: Article; title?: ReactNode; priority?: boolean }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-[0_10px_40px_-30px_rgba(2,21,38,.45)] transition-all duration-500 ease-out-expo hover:-translate-y-1.5 hover:border-gold/70 hover:shadow-[0_30px_60px_-35px_rgba(0,89,79,.55)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gold-light">
        <Image
          src={article.image}
          alt=""
          fill
          priority={priority}
          quality={70}
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-90" />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <CategoryBadge article={article} className="bg-white/95 backdrop-blur" />
          {article.pinned && (
            <span className="grid size-7 place-items-center rounded-full bg-maroon text-white shadow-lg" title="خبر مثبّت">
              <Pin className="size-3.5" />
            </span>
          )}
        </div>
        <span className="absolute bottom-3 right-3 text-xs font-semibold text-white/90">{article.gregorian}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-8 text-green-dark transition-colors group-hover:text-green">{title ?? article.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-7 text-ink-soft">{article.excerpt}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <ArticleMeta article={article} className="gap-x-3" />
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-green-dark/5 text-green-dark transition-all duration-500 group-hover:-rotate-45 group-hover:bg-green-dark group-hover:text-gold">
            <ArrowUpLeft className="size-4 rotate-45" />
          </span>
        </div>
      </div>
    </Link>
  );
}
