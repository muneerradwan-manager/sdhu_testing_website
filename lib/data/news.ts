/**
 * مدونة الإدارة والإعلانات الرسمية — بيانات وهمية لموسم 1448هـ (2027م)
 * المحتوى مبني على الخط الزمني في وثيقة التشغيل، وليس إعلاناً حقيقياً.
 */

import NEWS_DATA from "@/testdata/content/news.json";

export const CATEGORIES = ["إعلانات رسمية", "قرارات", "تعاميم", "أخبار الموسم", "توعية"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "callout"; title: string; text: string; tone?: "gold" | "maroon" | "green" }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  | { type: "quote"; text: string; by?: string };

export type Article = {
  slug: string;
  title: string;
  category: Category;
  hijri: string;
  gregorian: string;
  /** للترتيب فقط */
  iso: string;
  image: string;
  excerpt: string;
  body: Block[];
  tags: string[];
  author: string;
  department: string;
  views: number;
  pinned?: boolean;
  /** نص قصير لشريط الأخبار العاجلة */
  ticker?: string;
  readingMinutes: number;
};

type RawArticle = Omit<Article, "readingMinutes">;

const RAW = NEWS_DATA as RawArticle[];

function wordCount(blocks: Block[]) {
  const text = blocks
    .map((b) => {
      switch (b.type) {
        case "p":
        case "h":
          return b.text;
        case "list":
          return b.items.join(" ");
        case "callout":
          return `${b.title} ${b.text}`;
        case "quote":
          return b.text;
        case "table":
          return [...b.head, ...b.rows.flat()].join(" ");
      }
    })
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

/** الأحدث أولاً */
export const ARTICLES: Article[] = RAW.map((a) => ({ ...a, readingMinutes: Math.max(2, Math.round(wordCount(a.body) / 130)) })).sort(
  (a, b) => b.iso.localeCompare(a.iso),
);

export function getArticle(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}

export function relatedArticles(article: Article, count = 3) {
  const others = ARTICLES.filter((a) => a.slug !== article.slug);
  const score = (a: Article) =>
    (a.category === article.category ? 3 : 0) + a.tags.filter((t) => article.tags.includes(t)).length;
  return [...others].sort((a, b) => score(b) - score(a) || b.iso.localeCompare(a.iso)).slice(0, count);
}

export const MOST_READ = [...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 5);

export const CATEGORY_TONE: Record<Category, "green" | "gold" | "maroon" | "ink"> = {
  "إعلانات رسمية": "green",
  قرارات: "maroon",
  تعاميم: "gold",
  "أخبار الموسم": "ink",
  توعية: "maroon",
};
