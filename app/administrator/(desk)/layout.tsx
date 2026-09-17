import { AdminGate } from "../_components/ui";

/** Every screen inside (desk) needs a signed-in administrator */
export default function AdministratorDeskLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
