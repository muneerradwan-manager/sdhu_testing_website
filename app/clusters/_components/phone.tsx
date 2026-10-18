"use client";

import { Phone } from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A phone the pilgrims call (a cluster's assistant or coordinator, a group's head), as a link that dials it */
export function PhoneLink({ phone, className }: { phone?: string; className?: string }) {
  const t = useT();
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone}`}
      onClick={(e) => e.stopPropagation()}
      title={t("اتصال", "Call")}
      className={cn("inline-flex items-center gap-1.5 rounded-full bg-green-dark/8 px-2.5 py-1 text-xs font-bold text-green-dark transition hover:bg-green-dark hover:text-white", className)}
    >
      <Phone className="size-3.5" />
      <span dir="ltr" className="font-mono tracking-wide">
        {phone}
      </span>
    </a>
  );
}
