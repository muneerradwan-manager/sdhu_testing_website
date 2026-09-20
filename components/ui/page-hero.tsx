import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { CmsImage } from "@/components/cms/image";
import { Reveal } from "./motion";
import { cn } from "@/lib/utils";

/** Hero banner for inner pages: photo, green wash, star lattice, breadcrumb */
export function PageHero({
  title,
  description,
  image,
  crumbs = [],
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  image: string;
  crumbs?: { label: string; href?: string }[];
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-green-dark pb-16 pt-36 text-white md:pb-24 md:pt-44", className)}>
      <div className="absolute inset-0 -z-20">
        <CmsImage src={image} alt="" fill priority sizes="100vw" quality={70} className="object-cover opacity-45" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-green-dark via-green-dark/80 to-ink/60" />
      <div className="bg-pattern absolute inset-0 -z-10 opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <nav aria-label="مسار التنقل" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
            <Link href="/" className="hover:text-gold">الرئيسية</Link>
            {crumbs.map((c) => (
              <span key={c.label} className="flex items-center gap-1.5">
                <ChevronLeft className="size-3.5" />
                {c.href ? <Link href={c.href} className="hover:text-gold">{c.label}</Link> : <span className="text-gold">{c.label}</span>}
              </span>
            ))}
          </nav>
          <h1 className="font-display text-4xl font-bold text-balance md:text-6xl">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">{description}</p>}
          {children}
        </Reveal>
      </div>
      <svg className="absolute -bottom-px left-0 right-0 h-10 w-full text-sand md:h-14" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
        <path d="M0 60V30c240-30 480-30 720 0s480 30 720 0v30z" fill="currentColor" />
      </svg>
    </section>
  );
}
