import type { Lang } from "@/lib/i18n";

/**
 * The news categories' English names. The articles keep their Arabic category (it is their key for the filter,
 * the colour and the related articles), so the English is given where it is shown.
 */
const CATEGORY_EN: Record<string, string> = {
  الكل: "All",
  "إعلانات رسمية": "Official announcements",
  قرارات: "Decisions",
  تعاميم: "Circulars",
  "أخبار الموسم": "Season news",
  توعية: "Awareness",
};

export const categoryLabel = (category: string, lang: Lang) => (lang === "en" ? (CATEGORY_EN[category] ?? category) : category);
