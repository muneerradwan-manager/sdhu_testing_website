"use client";

import { useMemo } from "react";
import { useStore, type AdminProfile } from "@/lib/store";
import { useAdmin } from "./admin";

/**
 * What an administrator may do does not follow from his category: each permission is given to roles by the
 * administration, in one table. «التسجيل على الحج» lets him register any pilgrim on the Hajj while its dates
 * are open — it never puts the pilgrim in his group. «إلحاق الحجاج بالمجموعة» lets him upload a pilgrim's
 * contract with a group he works in, for the office to approve. A role the table leaves out does neither.
 */
export type AdminPermission = "pilgrims.register" | "pilgrims.attach";

export const ADMIN_PERMISSIONS: { key: AdminPermission; label: string; desc: string }[] = [
  { key: "pilgrims.register", label: "التسجيل على الحج", desc: "يسجّل أي حاج على الحج في مدة التسجيل بموافقته برمز تحقق. لا يضعه في أي مجموعة." },
  { key: "pilgrims.attach", label: "إلحاق الحجاج بالمجموعة", desc: "يرفع عقد الحاج مع مجموعة يعمل فيها، فيعتمده المكتب." },
];

/** The roles that hold each permission until the administration changes the table */
export const DEFAULT_ROLE_PERMISSIONS: Record<AdminPermission, string[]> = {
  "pilgrims.register": ["group-head", "tech", "group-deputy"],
  "pilgrims.attach": ["group-head", "tech", "group-deputy"],
};

export function useRolePermissions(): Record<AdminPermission, string[]> {
  const saved = useStore((s) => s.adminRules.rolePermissions);
  return useMemo(() => ({ ...DEFAULT_ROLE_PERMISSIONS, ...(saved as Partial<Record<AdminPermission, string[]>> | undefined) }), [saved]);
}

/** His role for the permissions: the one he applied with (a cluster's head or deputy applied as a group head) */
export function permissionRole(p: AdminProfile | undefined) {
  return p?.positions[0] ?? "";
}

export function useAdminCan() {
  const admin = useAdmin();
  const table = useRolePermissions();
  return (perm: AdminPermission) => {
    const role = permissionRole(admin?.profile);
    return !!role && table[perm].includes(role);
  };
}
