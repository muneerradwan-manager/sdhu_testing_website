import type { Metadata } from "next";
import { CadreTab } from "../../_components/cadre";

export const metadata: Metadata = { title: "الكادر الإداري — إدارة الإداريين" };

export default function Page() {
  return <CadreTab />;
}
