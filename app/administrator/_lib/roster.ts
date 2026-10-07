import { SKILLS } from "./admin";
import { ROSTER, type Candidate } from "./people";

export { ROSTER, type Candidate };

export function skillLabel(key: string) {
  return SKILLS.find((s) => s.key === key)?.label ?? key;
}
