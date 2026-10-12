import type { Metadata } from "next";
import { GuideBody } from "./_components/guide-body";

export const metadata: Metadata = {
  title: "دليل المناسك",
  description: "مركز المعرفة: أعمال الحج يوماً بيوم، أنواع النسك، محظورات الإحرام، عدّاد الطواف والسعي، الأدعية، وحقيبة الحاج.",
};

export default function GuidePage() {
  return <GuideBody />;
}
