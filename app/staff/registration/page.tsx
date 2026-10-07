import type { Metadata } from "next";
import { RegistrationView } from "./view";

export const metadata: Metadata = { title: "التسجيل على الحج" };

export default function Page() {
  return <RegistrationView />;
}
