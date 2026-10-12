import type { CollectionsEn } from "./index";
import { ACADEMY_EN_A } from "./academy-a";
import { ACADEMY_EN_B } from "./academy-b";

/** The academy in English: its tracks and the lessons of «فقه الحج» (./academy-a), and the other tracks' lessons (./academy-b) */
export const ACADEMY_EN: CollectionsEn = {
  academyTracks: { ...ACADEMY_EN_A.academyTracks, ...ACADEMY_EN_B.academyTracks },
  academyLessons: { ...ACADEMY_EN_A.academyLessons, ...ACADEMY_EN_B.academyLessons },
};
