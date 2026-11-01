/** Approved FAQ answers published on the public portal (season 1448, fictional) */

import FAQ_DATA from "@/testdata/content/faq.json";

export const FAQ_CATEGORIES = ["التسجيل", "الشروط", "القبول والقرعة", "التكاليف والدفع", "الخدمات والتحقق"] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export type Faq = { q: string; a: string; category: FaqCategory };

export const FAQS: Faq[] = FAQ_DATA as Faq[];
