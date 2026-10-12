/**
 * The site's content in English: for each page, section by section, the English of its fields; and for each
 * collection, item by item, the English of its fields. Only what has words: a field left out (an image, a link,
 * a number) keeps its value. A list field gives the whole list in English, in the same order and shape.
 *
 * The visitor's reads (lib/cms/store readSection, the collections' live reads) lay this over the content when
 * the page is in English (lib/i18n). The staff edit the Arabic; what they wrote in Arabic shows in Arabic pages,
 * and these English texts in English pages.
 *
 * One file per area, so they can be written apart: ./pages-<area>.ts and ./collection-<id>.ts, joined here.
 */
import { PAGES_EN_HOME } from "./pages-home";
import { PAGES_EN_SITE } from "./pages-site";
import { PAGES_EN_INFO } from "./pages-info";
import { PAGES_EN_SERVICES } from "./pages-services";
import { NEWS_EN } from "./collection-news";
import { FAQ_EN } from "./collection-faq";
import { GUIDE_EN } from "./collection-guide";
import { ACADEMY_EN } from "./collection-academy";
import { CLUSTERS_EN } from "./collection-clusters";

export type FieldsEn = Record<string, unknown>;
/** page id → section id → field key → English */
export type PagesEn = Record<string, Record<string, FieldsEn>>;
/** collection id → item id → field key → English */
export type CollectionsEn = Record<string, Record<string, FieldsEn>>;

const merge = (...parts: PagesEn[]): PagesEn => {
  const out: PagesEn = {};
  for (const p of parts) for (const [page, sections] of Object.entries(p)) out[page] = { ...out[page], ...sections };
  return out;
};

export const PAGES_EN: PagesEn = merge(PAGES_EN_SITE, PAGES_EN_HOME, PAGES_EN_INFO, PAGES_EN_SERVICES);
export const COLLECTIONS_EN: CollectionsEn = { ...NEWS_EN, ...FAQ_EN, ...GUIDE_EN, ...ACADEMY_EN, ...CLUSTERS_EN };
