import type { Metadata } from "next";
import { HallView } from "./view";

export const metadata: Metadata = { title: "قاعتي الامتحانية" };

export default function Page() {
  return <HallView />;
}
