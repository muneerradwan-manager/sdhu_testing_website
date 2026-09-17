import type { Metadata } from "next";
import { AdministratorsView } from "./view";

export const metadata: Metadata = { title: "الإداريون والمجموعات" };

export default function Page() {
  return <AdministratorsView />;
}
