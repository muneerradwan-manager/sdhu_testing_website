"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Emblem } from "@/components/brand/logo";
import { useT } from "@/lib/i18n";

export function OfflineBody() {
  const t = useT();
  return (
    <section className="relative grid min-h-[calc(80vh/var(--zoom))] place-items-center overflow-hidden bg-green-dark px-4 pt-28 text-center text-white">
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <div className="relative max-w-md">
        <Emblem className="mx-auto size-20" />
        <WifiOff className="mx-auto mt-8 size-10 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-bold">{t("لا يوجد اتصال بالإنترنت", "No internet connection")}</h1>
        <p className="mt-3 leading-8 text-white/80">
          {t(
            "الصفحات التي فتحتها سابقاً ودروس الأكاديمية المسموعة ما زالت متاحة. عند عودة الاتصال تُحدَّث المنصة تلقائياً.",
            "Pages you opened before and the Academy's audio lessons are still available. When the connection returns, the platform updates automatically.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-2xl bg-gold px-6 py-3 font-bold text-ink">
            {t("الصفحة الرئيسية", "Home page")}
          </Link>
          <Link href="/portal/application" className="rounded-2xl border border-white/25 px-6 py-3 font-bold">
            {t("طلبي", "My application")}
          </Link>
        </div>
      </div>
    </section>
  );
}
