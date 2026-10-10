import type { Metadata } from "next";
import { PaymentsPage } from "../../_components/payments";

export const metadata: Metadata = { title: "المسارات والدفعات — إدارة التسجيل على الحج" };

export default function Page() {
  return <PaymentsPage />;
}
