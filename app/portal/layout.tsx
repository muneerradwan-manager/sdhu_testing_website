import type { Metadata } from "next";
import { AuthGate } from "./auth-gate";

export const metadata: Metadata = { title: { default: "حسابي", template: "%s | حسابي" } };

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return <AuthGate>{children}</AuthGate>;
}
