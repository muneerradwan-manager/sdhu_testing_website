import SEASON_DATA from "@/testdata/settings/season.json";
import OFFICES_DATA from "@/testdata/settings/offices.json";

/**
 * Season 1448 AH settings, exactly as the season director configures them in the admin panel
 * (see "المرحلة 0" in the operating document), in testdata/settings/season.json. Nothing here is
 * hard-coded business logic — the rules engine reads these values:
 *
 * - `referenceYear`: birth-year thresholds are evaluated against it.
 * - `quota`, `directShare`/`lotteryShare`, `directSeats`/`lotterySeats`: season 1448 as announced, 65% accepted
 *   directly by age (`acceptedDirectAge`: born 1958 or earlier), 35% by the lottery.
 * - `windows`: the two SEPARATE registrations, one after the other (lib/operations.ts). Nobody moves from direct
 *   acceptance to the lottery automatically; the draw picks birth years (some by months), and the accepted
 *   confirm by paying the first installment (lib/lottery.ts).
 * - `rules`: the applicant's and the companions' birth years, the woman who needs a mahram, the elderly who need
 *   a companion, and the most companions.
 * - `fees`: `hajjCost` is the full cost per person; `firstInstallment` is paid with the registration on direct
 *   acceptance, and when the name comes out in the draw; `roomExample` is what a cluster may ask per person for
 *   private accommodation (each cluster sets its own).
 * - `installments`: decided by the administration for the whole season (`count` 1 or 2); with 1, the whole cost
 *   is paid at the first moment.
 * - `administrators.keepRole`: keeping last season's role needs `minRating`, waives the exams (`examExempt`), and
 *   lapses after `maxGapSeasons` without participation. The clusters' structure is app/administrator/_lib/structure.
 * - `grading`: the end-of-season tiers. A first-season group head starts at `entryTier`; inside every tier the top
 *   `promoteShare` moves up and the bottom `demoteShare` moves down; `honorTop` are honoured in every tier.
 * - `groupingWindow`: attaching accepted pilgrims to groups, by contract, from the forming of the clusters on.
 * - `medicalDocuments`: asked only after the pilgrim joined a group.
 * - `dates`: the pilgrims' calendar; `from` and `to` are days, so the public timeline lights the demo's row.
 */
export const SEASON = SEASON_DATA;

/**
 * One registration office per governorate inside Syria, plus one office in each country abroad with a
 * large Syrian community. The office is never chosen from a list: it follows where the applicant lives —
 * the governorate office (from the civil registry) inside Syria, or the country office abroad. A
 * coordinator-filed application belongs to the coordinator's office (testdata/settings/offices.json).
 */
export const OFFICES = OFFICES_DATA;

/** The offices abroad, each its own choice (Türkiye has two: Istanbul and Gaziantep) — the only extra question the applicant is asked */
export const ABROAD = OFFICES.filter((o) => o.abroad).map((o) => o.governorate);

/** Where the applicant lives: "سوريا" or one of the offices abroad */
export type Residence = "سوريا" | (typeof ABROAD)[number];

/** The country of a residence, as the season's conditions read it (both Türkiye offices are Türkiye) */
export function countryOf(residence: string) {
  return OFFICES.find((o) => o.governorate === residence)?.country ?? residence;
}

/** The office area an application belongs to: the registry governorate inside Syria, or the country abroad */
export function officeArea(governorate: string, residence: string = "سوريا") {
  return residence === "سوريا" ? governorate : residence;
}

export function officeFor(area: string) {
  // An application kept before Türkiye had two offices belongs to Istanbul's
  const a = area === "تركيا" ? "تركيا — إسطنبول" : area;
  return OFFICES.find((o) => o.governorate === a)?.office ?? `مكتب ${area}`;
}
