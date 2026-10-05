"use client";

import { RecordHistory as SystemRecordHistory, SystemRecords } from "../../_components/system";

/** The parts of the exam system, each a tab of its management page */
export type Area = "centers" | "people" | "exams" | "bank" | "results";

const TITLE: Record<Area, string> = {
  centers: "سجل المراكز",
  people: "سجل المتقدمين",
  exams: "سجل الامتحانات وجلساتها",
  bank: "سجل بنك الأسئلة",
  results: "سجل النتائج",
};

/** A tab's records, where that part of the exam is worked on */
export function Records({ area }: { area: Area }) {
  return <SystemRecords system="exams" area={area} title={TITLE[area]} />;
}

/** One centre's, exam's or applicant's own history, inside its form */
export function RecordHistory({ refId }: { refId: string }) {
  return <SystemRecordHistory system="exams" refId={refId} />;
}
