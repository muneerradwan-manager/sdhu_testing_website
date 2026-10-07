"use client";

import { KeyRound, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { ADMIN_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, useRolePermissions, type AdminPermission } from "@/app/administrator/_lib/permissions";
import { Panel, useStaffUser } from "../../_components/kit";
import { logAdmins } from "../desk";

/**
 * The administrators' permissions, role by role. A permission is not the category: being a group head
 * does not by itself let him register pilgrims, and registering never attaches them to a group (the office does).
 * Each is given to the roles here, and the holder of «إدارة الإداريين» changes it for the season.
 */
export function RolePermissionsPanel() {
  const user = useStaffUser()!;
  const toast = useToast();
  const table = useRolePermissions();
  const edited = ADMIN_PERMISSIONS.some((p) => table[p.key].join() !== DEFAULT_ROLE_PERMISSIONS[p.key].join());

  const toggle = (perm: AdminPermission, role: string) => {
    const on = table[perm].includes(role);
    const next = on ? table[perm].filter((r) => r !== role) : [...table[perm], role];
    actions.setAdminRules({ rolePermissions: { ...table, [perm]: next } });
    const p = ADMIN_PERMISSIONS.find((x) => x.key === perm)!;
    const r = APPLIED_ROLES.find((x) => x.key === role)!;
    logAdmins(user, "rules", { action: on ? `سحب صلاحية «${p.label}» من صفة` : `منح صلاحية «${p.label}» لصفة`, target: r.label, important: true });
    toast({ title: on ? "سُحبت الصلاحية" : "مُنحت الصلاحية", body: `«${p.label}» — ${r.label}`, icon: "🔑", tone: "info" });
  };

  return (
    <Panel
      icon={<KeyRound />}
      title="صلاحيات الصفات"
      action={
        edited && (
          <Button size="sm" variant="glass" onClick={() => actions.setAdminRules({ rolePermissions: undefined })}>
            <RotateCcw className="size-4" /> كما تطلقها المنصة
          </Button>
        )
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">
        الصلاحية مستقلة عن الصفة: لا تأتي مع رئاسة المجموعة ولا مع أي فئة، بل تُمنح للصفات هنا. ومن يسجّل حاجاً على الحج لا يصير الحاج تابعاً لمجموعته؛ إلحاق الحجاج بالمجموعات يجريه موظفو المكتب وحدهم، لا الإداريون.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="text-right text-xs text-white/60">
              <th className="p-2">الصلاحية</th>
              {APPLIED_ROLES.map((r) => (
                <th key={r.key} className="p-2 text-center">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_PERMISSIONS.map((p) => (
              <tr key={p.key} className="border-t border-white/10">
                <td className="p-2">
                  <p className="font-bold text-white">{p.label}</p>
                  <p className="text-xs text-white/55">{p.desc}</p>
                </td>
                {APPLIED_ROLES.map((r) => {
                  const on = table[p.key].includes(r.key);
                  return (
                    <td key={r.key} className="p-2 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${p.label} — ${r.label}`}
                        onClick={() => toggle(p.key, r.key)}
                        className={cn("inline-flex h-7 w-12 items-center rounded-full p-1 transition", on ? "justify-end bg-gold" : "justify-start bg-white/15")}
                      >
                        <span className={cn("size-5 rounded-full", on ? "bg-green-dark" : "bg-white/60")} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-white/50">وللموظفين صلاحية «التسجيل على الحج» مستقلة تمنحها الموارد البشرية لموظفي إدخال البيانات، دون أي صلاحية في المجموعات.</p>
    </Panel>
  );
}
