import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Emblem } from "@/components/brand/logo";

export const metadata: Metadata = { title: "لا يوجد اتصال" };

export default function OfflinePage() {
  return (
    <section className="relative grid min-h-[80vh] place-items-center overflow-hidden bg-green-dark px-4 pt-28 text-center text-white">
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <div className="relative max-w-md">
        <Emblem className="mx-auto size-20" />
        <WifiOff className="mx-auto mt-8 size-10 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-bold">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-3 leading-8 text-white/80">
          الصفحات التي فتحتها سابقاً ودروس الأكاديمية المسموعة ما زالت متاحة. عند عودة الاتصال تُحدَّث المنصة تلقائياً.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="rounded-2xl bg-gold px-6 py-3 font-bold text-ink">الصفحة الرئيسية</Link>
          <Link href="/portal/application" className="rounded-2xl border border-white/25 px-6 py-3 font-bold">طلبي</Link>
        </div>
      </div>
    </section>
  );
}
