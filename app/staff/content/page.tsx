import type { Metadata } from "next";
import { ContentView } from "./view";

export const metadata: Metadata = { title: "محتوى الموقع" };

export default function Page() {
  return <ContentView />;
}
