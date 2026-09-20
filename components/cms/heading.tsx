"use client";

import { SectionHeading } from "@/components/ui/motion";
import { useSection } from "@/lib/cms/store";
import { str } from "./bits";

/** ترويسة قسم (شارة + عنوان + وصف) تُقرأ من لوحة المحتوى */
export function CmsHeading({
  page,
  section,
  align,
  light,
  className,
}: {
  page: string;
  section: string;
  align?: "center" | "start";
  light?: boolean;
  className?: string;
}) {
  const v = useSection(page, section);
  return (
    <SectionHeading
      align={align}
      light={light}
      className={className}
      eyebrow={str(v, "eyebrow") || undefined}
      title={str(v, "title")}
      description={str(v, "description") || undefined}
    />
  );
}
