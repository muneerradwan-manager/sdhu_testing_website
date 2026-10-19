"use client";

import { CmsSection, str } from "@/components/cms/bits";
import { useSection } from "@/lib/cms/store";
import { PilgrimShell } from "../_components/pilgrim-shell";
import { Journey } from "./journey";

/** «برنامج الرحلة»: the stages of the pilgrim's season, what he does in each and where in his account (it was on the home page) */
export default function JourneyPage() {
  const v = useSection("pilgrim-journey", "journey");
  return (
    <PilgrimShell title={str(v, "title", "برنامج الرحلة")} subtitle={str(v, "description")}>
      <CmsSection page="pilgrim-journey" section="journey">
        <Journey />
      </CmsSection>
    </PilgrimShell>
  );
}
