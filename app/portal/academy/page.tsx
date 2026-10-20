"use client";

import { AcademyProgress } from "@/components/portal/academy-progress";
import { PilgrimShell } from "../_components/pilgrim-shell";

/**
 * «الأكاديمية» in the account: the recorded lessons he studies on his own and how far he got in each track — kept
 * apart from «دروس المجموعة الدينية», the lessons his group's guide gives in person. The same progress shows in the
 * administrators' pages: it is the account's.
 */
export default function PortalAcademy() {
  return (
    <PilgrimShell title="الأكاديمية" subtitle="دروس مسجّلة تتعلّمها بنفسك متى شئت، وتقدّمك في كل مسار. أما دروس موجّه مجموعتك فهي في «دروس المجموعة الدينية».">
      <AcademyProgress />
    </PilgrimShell>
  );
}
