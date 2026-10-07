"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, ClipboardList, FileSignature, FileText, ScrollText } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/** The cadre's references, each its own public page, in the order the administration's home lists them */
export const REFERENCE_PAGES = [
  { href: "/administrator/job-descriptions", label: "التوصيف الوظيفي", icon: BookOpenText, desc: "كل صفة ومهامها، والهيكل التنظيمي للتكتل." },
  { href: "/administrator/system", label: "النظام الإداري", icon: ScrollText, desc: "النظام الذي يعمل به الكادر: أقسامه السبعة وخاتمته." },
  { href: "/administrator/decisions", label: "المقررات الإدارية", icon: FileText, desc: "ما أصدرته الإدارة من مقررات لكل موسم." },
  { href: "/administrator/contracts", label: "العقود", icon: FileSignature, desc: "نماذج العقود والتعهدات التي يوقّعها الكادر والحجاج." },
  { href: "/administrator/plans", label: "الخطط التشغيلية", icon: ClipboardList, desc: "ما تتضمنه خطة التكتل التشغيلية، وكيف تُقدَّم وتُقبل." },
] as const;

/** A reference page: its title on the season's band, the other references beside it, then its content */
export function ReferencesShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-maroon-dark pb-14 pt-36 text-white md:pt-40">
        <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-ink/70 via-maroon-dark/90 to-green-dark/95" />
        <div className="bg-pattern absolute inset-0 -z-10 opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <Reveal>
            <nav aria-label="مسار التنقل" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
              <Link href="/" className="hover:text-gold">
                الرئيسية
              </Link>
              <span>/</span>
              <Link href="/administrator" className="hover:text-gold">
                الإداري الموسمي
              </Link>
              <span>/</span>
              <span className="text-gold">{title}</span>
            </nav>
            <h1 className="font-display text-4xl font-bold md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-9 text-white/80">{description}</p>
          </Reveal>
          <nav aria-label="مراجع الكادر" className="scrollbar-none mt-8 flex gap-2 overflow-x-auto pb-1">
            {REFERENCE_PAGES.map((p) => {
              const active = pathname === p.href;
              return (
                <Link key={p.href} href={p.href} aria-current={active ? "page" : undefined} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 transition", active ? "bg-gold text-ink ring-gold" : "bg-white/10 text-white ring-white/20 hover:bg-white/15")}>
                  <p.icon className="size-4" /> {p.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">{children}</div>
    </div>
  );
}
