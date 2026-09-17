import type { Assignment } from "@/lib/journey";
import type { Member } from "@/lib/rules";
import type { Application } from "@/lib/store";
import type { Moment, SeasonDay, Where } from "../_data";

export type SeasonCtx = {
  app: Application;
  sessionId: string;
  day: SeasonDay;
  moment: Moment;
  where: Where;
  assignments: Assignment[];
  /** The signed-in pilgrim (the applicant) */
  self: Assignment;
  ratings: Record<string, number>;
  now: number;
  /** Oldest 69+ member, and the member who officially accompanies them */
  elderly: Member | null;
  companion: Member | null;
  /** Members who get a special meal delivered (diabetes, special meal, 69+) */
  special: Member[];
};

export const DIET_NEEDS = ["سكري", "ضغط الدم", "وجبة خاصة"];
