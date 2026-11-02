/**
 * The numbers of the administration's structure as its platform ships them (testdata/settings/structure.json;
 * ./structure re-exports them and reads what the administration changed). Kept apart, with no imports but the
 * data, so the season's seeded data can be built from them.
 */
import STRUCTURE_DATA from "@/testdata/settings/structure.json";

/** The whole file: branches, tiers, the default tier and the early deadline are read in ./structure */
export const STRUCTURE = STRUCTURE_DATA;

/** A group's category, its head's: its weight counts in the cluster's sum of categories */
export type Category = { id: string; name: string; weight: number };
export const DEFAULT_CATEGORIES: Category[] = STRUCTURE.categories;

/** One category under one tier: its seats (guides, assistants, free seats that take either) and its pilgrims */
export type CategoryRule = { guides: number; assistants: number; free: number; pilgrims: number; active: boolean };

/** The numbers on the administration's platform for season 1448 */
export const DEFAULT_CATEGORY_RULES: Record<string, Record<string, CategoryRule>> = STRUCTURE.categoryRules;

/**
 * A tier's cluster: the sum of its groups' categories between `min` and `max`; `assistants` cluster
 * assistants exactly («معاون بعدد» not counted); one coordinator for every `perCoordinator` units of the
 * sum and one female guide for every `perGuide` (rounded).
 */
export type Composition = { min: number; max: number; assistants: number; perCoordinator: number; perGuide: number };
export const DEFAULT_COMPOSITION: Record<string, Composition> = STRUCTURE.composition;

