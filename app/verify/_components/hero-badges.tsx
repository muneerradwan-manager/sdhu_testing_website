"use client";

import { BadgeCheck, QrCode, ShieldAlert } from "lucide-react";
import { useT } from "@/lib/i18n";

/** The three promises under the verification page's header, in the visitor's language */
export function HeroBadges() {
  const t = useT();
  return (
    <div className="mt-7 flex flex-wrap gap-2 text-sm">
      {[
        { icon: BadgeCheck, t: t("تكتلات معتمدة لموسم 1448 بالقائمة الكاملة", "The full list of clusters approved for the 1448 season") },
        { icon: QrCode, t: t("مسح رمز QR للإيصالات والشهادات", "Scan the QR code on receipts and certificates") },
        { icon: ShieldAlert, t: t("إبلاغ فوري عن الجهات المخالفة", "Report offending organisations straight away") },
      ].map((x, i) => (
        <span key={i} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur">
          <x.icon className="size-4 text-gold" /> {x.t}
        </span>
      ))}
    </div>
  );
}
