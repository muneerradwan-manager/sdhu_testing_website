"use client";

import { MealsSection } from "../_components/meals";
import { SeasonPage } from "../_components/season-shell";

/** «الوجبات»: the family's meals where it stays that day, the special ones, and a complaint about a meal */
export default function MealsPage() {
  return <SeasonPage title="الوجبات">{({ ctx }) => <MealsSection ctx={ctx} />}</SeasonPage>;
}
