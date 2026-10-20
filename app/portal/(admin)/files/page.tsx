import type { Metadata } from "next";
import { AdminFiles } from "./files";

export const metadata: Metadata = { title: "وثائقي ومهاراتي" };

export default function Page() {
  return <AdminFiles />;
}
