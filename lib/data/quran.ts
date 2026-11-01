/**
 * What the religious activities track (lib/religious.ts): the pages of the Madinah Mushaf (604, in 30 parts) with
 * the surah each page is in, the forty hadith of an-Nawawi, and the supplications of Hajj and Umrah.
 */

import SURAHS_DATA from "@/testdata/content/quran-surahs.json";
import NAWAWI_DATA from "@/testdata/content/nawawi-hadiths.json";
import ADHKAR_DATA from "@/testdata/content/adhkar.json";

/** Each surah's name and the page of the Madinah Mushaf it begins on */
export const SURAHS = SURAHS_DATA as [string, number][];
export const PAGES = 604;

/** The part (جزء) a page is in: part 1 is pages 1 – 21, each next part 20 pages from 22 */
export const juzOf = (page: number) => (page < 22 ? 1 : Math.min(30, Math.floor((page - 22) / 20) + 2));
/** A part's first and last page */
export const juzPages = (juz: number): [number, number] => [juz === 1 ? 1 : 20 * juz - 18, juz === 30 ? PAGES : 20 * juz + 1];
/** The surahs on a page: those that begin on it, else the one running through it */
export function surahsOn(page: number): string[] {
  const starting = SURAHS.filter(([, p]) => p === page).map(([n]) => n);
  if (starting.length) return starting;
  const running = [...SURAHS].reverse().find(([, p]) => p < page);
  return running ? [running[0]] : [];
}
/** A page as a pilgrim reads it: «صفحة 589 — الانشقاق — الجزء 30» */
export const pageLabel = (page: number) => `صفحة ${page} — ${surahsOn(page).join("، ")} — الجزء ${juzOf(page)}`;

/** الأربعون النووية: each hadith by its number and its opening words */
export const NAWAWI: string[] = NAWAWI_DATA;

/** The supplications of Hajj and Umrah a pilgrim learns by heart, in the order he needs them */
export const ADHKAR: { key: string; title: string }[] = ADHKAR_DATA;
