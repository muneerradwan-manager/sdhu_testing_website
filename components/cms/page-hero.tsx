"use client";

import type { ReactNode } from "react";
import { PageHero } from "@/components/ui/page-hero";
import { useSection } from "@/lib/cms/store";
import { str } from "./bits";

/**
 * ترويسة صفحة داخلية يديرها المحتوى: العنوان والكلمة المميّزة والوصف وصورة الخلفية
 * واسم الصفحة في مسار التنقل — كلها من لوحة التحكم.
 *
 * variant="badge" يعرض الكلمة المميّزة كشارة (مثل «قريباً» في صفحة العمرة).
 */
export function CmsPageHero({
  page,
  variant = "accent",
  crumbs,
  children,
  className,
}: {
  page: string;
  variant?: "accent" | "badge";
  /** مسار تنقل مخصّص؛ الافتراضي هو اسم الصفحة من لوحة التحكم */
  crumbs?: { label: string; href?: string }[];
  children?: ReactNode;
  className?: string;
}) {
  const v = useSection(page, "hero");
  const title = str(v, "title");
  const highlight = str(v, "highlight");
  const crumb = str(v, "crumb");

  return (
    <PageHero
      className={className}
      image={typeof v.image === "string" ? v.image : ""}
      description={str(v, "description") || undefined}
      crumbs={crumbs ?? (crumb ? [{ label: crumb }] : [])}
      title={
        variant === "badge" ? (
          <span className="flex flex-wrap items-center gap-4">
            {title}
            {highlight && <span className="rounded-full border border-gold/50 bg-gold/15 px-4 py-1 text-xl text-gold md:text-2xl">{highlight}</span>}
          </span>
        ) : (
          <>
            {title} {highlight && <span className="text-gold-shine">{highlight}</span>}
          </>
        )
      }
    >
      {children}
    </PageHero>
  );
}
