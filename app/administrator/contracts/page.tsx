import type { Metadata } from "next";
import { ContractsPage } from "../_components/references-pages";

export const metadata: Metadata = { title: "العقود", description: "نماذج العقود والتعهدات المعتمدة للكادر والحجاج." };

export default function Page() {
  return <ContractsPage />;
}
