import type { Metadata } from "next";
import { AdminMeals } from "./meals";

export const metadata: Metadata = { title: "الوجبات" };

export default function Page() {
  return <AdminMeals />;
}
