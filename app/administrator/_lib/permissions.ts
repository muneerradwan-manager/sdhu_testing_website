"use client";

import { useMemo } from "react";
import { useStore, type AdminProfile } from "@/lib/store";
import { useAdmin } from "./admin";
import { examRoleOf } from "./structure";

/**
 * What an administrator may do does not follow from his category: each permission is given to roles by the
 * administration, in one table. «التسجيل على الحج» lets him register any pilgrim on the Hajj while its dates
 * are open — it never puts the pilgrim in his group. Attaching pilgrims to groups is the office's alone: no
 * administrator holds it. A role the table leaves out does not register.
 */
export type AdminPermission = "pilgrims.register";

export const ADMIN_PERMISSIONS: { key: AdminPermission; label: string; desc: string }[] = [
  { key: "pilgrims.register", label: "التسجيل على الحج", desc: "يسجّل أي حاج على الحج في مدة التسجيل بموافقته برمز تحقق. لا يضعه في أي مجموعة." },
];

/** The roles that hold each permission until the administration changes the table */
export const DEFAULT_ROLE_PERMISSIONS: Record<AdminPermission, string[]> = {
  "pilgrims.register": ["group-head", "tech", "group-deputy"],
};

export function useRolePermissions(): Record<AdminPermission, string[]> {
  const saved = useStore((s) => s.adminRules.rolePermissions);
  // A table saved before keeps only the permissions administrators still hold
  return useMemo(() => ({ "pilgrims.register": (saved as Partial<Record<AdminPermission, string[]>> | undefined)?.["pilgrims.register"] ?? DEFAULT_ROLE_PERMISSIONS["pilgrims.register"] }), [saved]);
}

/**
 * His role for the permissions: the one he applied with (a cluster's head or deputy applied as a group head),
 * or the role it is tied to («معاون ومنسق تقني» holds the technical coordinator's)
 */
export function permissionRole(p: AdminProfile | undefined) {
  return p?.positions[0] ? examRoleOf(p.positions[0]) : "";
}

export function useAdminCan() {
  const admin = useAdmin();
  const table = useRolePermissions();
  return (perm: AdminPermission) => {
    const role = permissionRole(admin?.profile);
    return !!role && table[perm].includes(role);
  };
}
