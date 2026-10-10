"use client";

import { usePathname } from "next/navigation";
import { FileCheck2 } from "lucide-react";
import type { ReactNode } from "react";
import { OperationHeader } from "../../_components/system";
import { PublishBar, RegSeasonProvider } from "./editor";

/**
 * Every page of «إدارة التسجيل على الحج»: its title (an edit screen or the preview brings its own), and the
 * bar that says whether what is here is what pilgrims see — with «نشر التغييرات» when it is not.
 */
export function RegManageShell({ children }: { children: ReactNode }) {
  const path = usePathname().replace(/\/+$/, "");
  const own = path.endsWith("/edit") || path.endsWith("/preview");
  return (
    <RegSeasonProvider>
      {!own && <OperationHeader system="registration" icon={<FileCheck2 />} />}
      <PublishBar />
      {children}
    </RegSeasonProvider>
  );
}
