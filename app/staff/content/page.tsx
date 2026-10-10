import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentView } from "./view";

export const metadata: Metadata = { title: "محتوى الموقع" };

export default function Page() {
  return (
    <Suspense>
      <ContentView />
    </Suspense>
  );
}
