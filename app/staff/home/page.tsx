import type { Metadata } from "next";
import { HomeRedirect } from "./view";

export const metadata: Metadata = { title: "بوابة الموظفين" };

export default function Page() {
  return <HomeRedirect />;
}
