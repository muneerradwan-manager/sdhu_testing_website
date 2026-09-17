import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "الإداري الموسمي", template: "%s | الإداري الموسمي" } };

export default function AdministratorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
