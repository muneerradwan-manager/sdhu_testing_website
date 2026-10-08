import type { Metadata } from "next";
import { HallDisplay } from "../_components/screen";

type Props = { params: Promise<{ n: string }> };

export const dynamicParams = false;

/**
 * The site is exported as static files, so a screen number set after the build has no page of its own. The halls'
 * numbers (1 to 9 as the season opens) and the ones after them are built, so a hall the exam system adds or
 * renumbers within them opens its screen straight away.
 */
export function generateStaticParams() {
  return Array.from({ length: 99 }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return { title: `شاشة القاعة ${n}`, description: "شاشة عرض القاعة الامتحانية: رمز الدخول، وتعليمات الاختبار ووقته." };
}

export default async function Page({ params }: Props) {
  const { n } = await params;
  return <HallDisplay n={Number(n)} />;
}
