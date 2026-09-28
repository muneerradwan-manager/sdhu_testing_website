import type { Metadata } from "next";
import { ReferenceView } from "./view";

export const metadata: Metadata = { title: "البيانات المرجعية" };

export default function Page() {
  return <ReferenceView />;
}
