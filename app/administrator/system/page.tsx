import type { Metadata } from "next";
import { SystemPage } from "../_components/references-pages";

export const metadata: Metadata = { title: "النظام الإداري", description: "النظام الذي يعمل به كادر المجموعات والتكتلات لموسم 1448هـ." };

export default function Page() {
  return <SystemPage />;
}
