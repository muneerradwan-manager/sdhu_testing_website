import type { Metadata } from "next";
import { getCollectionDef } from "@/lib/cms/collections";
import { CLUSTERS } from "@/lib/data/clusters";
import { ClusterPage } from "./cluster-page";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

/**
 * The site is exported as static files, so a cluster added after the build cannot get a fresh URL.
 * The season's clusters are built here, and a few reserved URLs are built empty so a cluster the
 * staff add from the content panel opens on its own full page straight away.
 */
export function generateStaticParams() {
  const def = getCollectionDef("clusters");
  const built = def?.builtIn.map((c) => c.id) ?? CLUSTERS.map((c) => c.slug);
  const slots = def?.slots ?? [];
  return [...built, ...slots].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = CLUSTERS.find((x) => x.slug === slug);
  if (!c) return { title: "برنامج التكتل" };
  return {
    title: `${c.name} — البرنامج المعتمد`,
    description: c.about,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <ClusterPage slug={slug} />;
}
