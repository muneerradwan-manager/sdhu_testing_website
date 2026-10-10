"use client";

import { RecordHistory as SystemRecordHistory } from "../../_components/system";
import { RecordsBox } from "../../_components/wp";

/** The parts of the exam system, each one operation of its own in the menu */
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

/** What was done in one part of the exam file: closed at the end of its page until it is wanted */
export function Records({ area }: { area: Area }) {
  return <RecordsBox system="exams" area={area} title={TITLE[area]} />;
}

/** One centre's, exam's or applicant's own history, inside its edit screen or sheet */
export function RecordHistory({ refId, bare }: { refId: string; bare?: boolean }) {
  return <SystemRecordHistory system="exams" refId={refId} bare={bare} />;
}
