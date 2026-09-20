import type { Metadata } from "next";
import { Suspense } from "react";
import { CmsPageHero } from "@/components/cms/page-hero";
import { PrayerDashboard } from "./_components/prayer-dashboard";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export const metadata: Metadata = {
  title: "مواقيت الصلاة واتجاه القبلة",
  description: "مواقيت الصلاة في المدن السورية ومكة المكرمة والمدينة المنورة، مع عدّ تنازلي للصلاة القادمة، وبوصلة القبلة، وإمساكية لثلاثين يوماً.",
};

export default function PrayerTimesPage() {
  return (
    <>
      <CmsPageHero page="prayer-times" />
      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-8 print:px-0 print:pb-0">
        <Suspense fallback={<DashboardSkeleton />}>
          <PrayerDashboard />
        </Suspense>
      </div>
    </>
  );
}
