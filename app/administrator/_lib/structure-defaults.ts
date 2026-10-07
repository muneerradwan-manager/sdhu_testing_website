/**
 * The numbers of the administration's structure as its platform ships them (./structure re-exports them and
 * reads what the administration changed). Kept apart, with no imports, so the season's seeded data can be
 * built from them.
 */

/** A group's category, its head's: its weight counts in the cluster's sum of categories */
export type Category = { id: string; name: string; weight: number };
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "c1", name: "الفئة الأولى", weight: 1 },
  { id: "c2", name: "الفئة الثانية", weight: 2 },
  { id: "c3", name: "الفئة الثالثة", weight: 3 },
  { id: "c4", name: "الفئة الرابعة", weight: 4 },
];

/** One category under one tier: its seats (guides, assistants, free seats that take either) and its pilgrims */
export type CategoryRule = { guides: number; assistants: number; free: number; pilgrims: number; active: boolean };
const rule = (guides: number, assistants: number, free: number, pilgrims: number): CategoryRule => ({ guides, assistants, free, pilgrims, active: true });

/** The numbers on the administration's platform for season 1448 */
export const DEFAULT_CATEGORY_RULES: Record<string, Record<string, CategoryRule>> = {
  eco: { c1: rule(1, 0, 0, 45), c2: rule(1, 1, 0, 90), c3: rule(1, 1, 1, 135), c4: rule(2, 2, 0, 200) },
  "eco-plus": { c1: rule(1, 0, 0, 45), c2: rule(1, 1, 0, 135), c3: rule(1, 1, 1, 135), c4: rule(2, 2, 1, 200) },
  five: { c1: rule(0, 0, 0, 30), c2: rule(0, 0, 0, 60), c3: rule(0, 0, 0, 90), c4: rule(0, 0, 0, 120) },
};

/**
 * A tier's cluster: the sum of its groups' categories between `min` and `max`; `assistants` cluster
 * assistants exactly («معاون بعدد» not counted); one coordinator for every `perCoordinator` units of the
 * sum and one female guide for every `perGuide` (rounded).
 */
export type Composition = { min: number; max: number; assistants: number; perCoordinator: number; perGuide: number };
export const DEFAULT_COMPOSITION: Record<string, Composition> = {
  eco: { min: 5, max: 24, assistants: 1, perCoordinator: 6, perGuide: 7 },
  "eco-plus": { min: 5, max: 21, assistants: 1, perCoordinator: 6, perGuide: 7 },
  five: { min: 5, max: 21, assistants: 0, perCoordinator: 20, perGuide: 100 },
};

