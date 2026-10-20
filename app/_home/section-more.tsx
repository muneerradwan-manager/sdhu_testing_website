"use client";

import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * The way from a home page section to its own page, the same in every section: one large green button, «عرض …» with
 * the arrow, centred under the section's content. A section in two columns gives each column its own, under it
 * (`className` then sets its spacing in place of the default margin)
 */
export function SectionMore({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Reveal className={cn("flex justify-center", className ?? "mt-10")}>
      <ButtonLink href={href} size="lg">
        {label} <ArrowLeft className="size-5" />
      </ButtonLink>
    </Reveal>
  );
}
