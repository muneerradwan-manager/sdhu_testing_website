"use client";

import { RecordHistory as SystemRecordHistory, SystemRecords } from "../../_components/system";

/** The parts of the exam system, each a tab of its management page */
export type Area = "centers" | "people" | "exams" | "bank" | "sittings" | "live" | "review" | "results" | "stats";

const TITLE: Record<Area, string> = {
  centers: "سجل القاعات والمحافظات",
  people: "سجل المتقدمين",
  exams: "سجل الاختبارات",
  bank: "سجل بنك الأسئلة",
  sittings: "سجل الجلسات: الفتح والحضور والدخول والتأكيد",
  live: "سجل الجلسات الجارية",
  review: "سجل القرارات",
  results: "سجل النتائج",
  stats: "سجل الإحصائيات",
};

/** A tab's records, where that part of the exam is worked on */
export function Records({ area }: { area: Area }) {
  return <SystemRecords system="exams" area={area} title={TITLE[area]} />;
}

/** One centre's, exam's or applicant's own history, inside its form */
export function RecordHistory({ refId }: { refId: string }) {
  return <SystemRecordHistory system="exams" refId={refId} />;
}
