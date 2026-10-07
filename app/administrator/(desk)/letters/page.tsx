import type { Metadata } from "next";
import { AdminLetters } from "./letters";

export const metadata: Metadata = { title: "المراسلات" };

export default function Page() {
  return <AdminLetters />;
}
