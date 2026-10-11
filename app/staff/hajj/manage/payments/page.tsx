import type { Metadata } from "next";
import { PaymentsPage } from "../../_components/payments";

export const metadata: Metadata = { title: "الدفعات والمسارات — إدارة التسجيل على الحج" };

export default function Page() {
  return <PaymentsPage />;
}
