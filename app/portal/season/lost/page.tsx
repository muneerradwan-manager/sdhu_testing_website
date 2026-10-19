"use client";

import { LostSection } from "../_components/lost";
import { SeasonPage } from "../_components/season-shell";

/** «المفقودات»: reporting a lost item or a lost member of the family, and following the report */
export default function LostPage() {
  return <SeasonPage title="المفقودات">{({ ctx }) => <LostSection ctx={ctx} />}</SeasonPage>;
}
