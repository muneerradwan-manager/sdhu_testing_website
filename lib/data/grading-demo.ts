import { groupName } from "@/lib/groups";
import type { Graded } from "../grading";
import GROUPS from "@/testdata/grading/groups.json";
import CLUSTERS from "@/testdata/grading/clusters.json";

/**
 * Demo season results: every group and every cluster of season 1447 with the score its evaluation
 * produced, so the classification screen works on realistic numbers (testdata/grading). The demo
 * administrators' own groups are placed by hand so their screens tell the same story.
 */

/** The score is a weighted composite the administration defines; these are its parts */
export const SCORE_PARTS = [
  { label: "تقييم الحجاج", weight: 0.4 },
  { label: "تقييم الموظفين", weight: 0.25 },
  { label: "الالتزام بالمراحل التسع", weight: 0.25 },
  { label: "البلاغات والمخالفات", weight: 0.1 },
] as const;

/** A season's result as testdata/grading writes it: its parts' values in SCORE_PARTS order */
type Result = { head: string; office: string; tier: number; score: number; parts: number[] };

const parts = (values: number[]) => SCORE_PARTS.map((p, i) => ({ label: p.label, weight: p.weight, value: values[i] }));

/** Every group of the season (testdata/grading/groups.json), its name its number's */
export const DEMO_GROUPS: Graded[] = (GROUPS as (Result & { number: number })[]).map(({ number, head, office, tier, score, parts: values }) => ({ id: `g-${number}`, name: groupName(number), head, office, tier, score, parts: parts(values) }));
/** Every cluster of the season (testdata/grading/clusters.json) */
export const DEMO_CLUSTERS: Graded[] = (CLUSTERS as (Result & { id: string; name: string })[]).map(({ id, name, head, office, tier, score, parts: values }) => ({ id, name, head, office, tier, score, parts: parts(values) }));

/** The demo administrator's own group, so his screen shows his standing */
export function groupEntryFor(number: number | undefined) {
  return number === undefined ? undefined : DEMO_GROUPS.find((g) => g.id === `g-${number}`);
}
