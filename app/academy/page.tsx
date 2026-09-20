import type { Metadata } from "next";
import { AcademyView } from "./academy-view";

export const metadata: Metadata = {
  title: "أكاديمية الدروس الدينية",
  description: "دروس فيديو وصوت مجانية في فقه الحج والعمرة وآداب الرحلة والأدعية، مع ملخصات مكتوبة وأسئلة معتمدة وشهادات إتمام.",
};

export default function AcademyPage() {
  return <AcademyView />;
}
