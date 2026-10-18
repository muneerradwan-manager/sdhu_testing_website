import type { Metadata } from "next";
import { AllotmentsPage } from "../../allotments";

export const metadata: Metadata = { title: "أيام التكتلات — إدارة الطيران" };

export default function Page() {
  return <AllotmentsPage />;
}
