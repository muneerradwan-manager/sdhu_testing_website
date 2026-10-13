import type { Metadata } from "next";
import { CmsPageHero } from "@/components/cms/page-hero";
import { ClustersDirectory } from "./_components/clusters-directory";

export const metadata: Metadata = {
  title: "التكتلات والمجموعات",
  description: "التكتلات المعتمدة لموسم 1448هـ: برامجها وسكنها، ورئيس كل تكتل وفريقه، ومجموعاته برؤسائها والمقاعد المتبقية — بيانات تجريبية.",
};

/** The approved clusters on a page of their own: each programme, joined to the cluster's approved request (app/administrator/_lib/directory) */
export default function ClustersPage() {
  return (
    <>
      <CmsPageHero page="services" />
      <section className="bg-pattern-dark">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pt-14">
          <ClustersDirectory />
        </div>
      </section>
    </>
  );
}
