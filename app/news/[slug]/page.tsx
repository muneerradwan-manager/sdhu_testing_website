import type { Metadata } from "next";
import { getCollectionDef } from "@/lib/cms/collections";
import { getArticle } from "@/lib/data/news";
import { ArticleView } from "./article-view";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

/**
 * الروابط المبنية: منشورات الموسم الأصلية، ومعها روابط محجوزة فارغة.
 * الموقع يُصدَّر ملفات ثابتة، فلا يُولَّد رابط جديد بعد البناء؛ والروابط المحجوزة
 * تجعل ما يُنشئه الموظف من لوحة المحتوى يفتح فوراً بصفحته الكاملة.
 */
export function generateStaticParams() {
  const news = getCollectionDef("news");
  const built = news?.builtIn.map((a) => a.id) ?? [];
  const slots = news?.slots ?? [];
  return [...built, ...slots].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // العنوان هنا يُبنى وقت البناء؛ المنشورات التي تُدخَل لاحقاً يضبط عنوانها العرض نفسه
  const article = getArticle(slug);
  if (!article) return { title: "منشورات الإدارة" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { title: article.title, description: article.excerpt, images: [article.image], type: "article" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  return <ArticleView slug={slug} />;
}
