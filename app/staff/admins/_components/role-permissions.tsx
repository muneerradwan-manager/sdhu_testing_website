"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { ADMIN_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, useRolePermissions, type AdminPermission } from "@/app/administrator/_lib/permissions";
import { useCan, useStaffUser } from "../../_components/kit";
import { Box, ListTable, Title } from "../../_components/wp";
import { logAdmins } from "../desk";
import { Help, Lead, SaveLine } from "./ui";

const EDIT = "admins.role-permissions.PUT";

type Table = Record<AdminPermission, string[]>;

/**
 * The administrators' permissions, role by role, as one form saved once. A permission is not the category:
 * being a group head does not by itself let him register pilgrims, and registering never attaches them to a
 * group (the office does). Each grant or withdrawal is recorded on its own line when the form is saved.
 */
export function RolePermissionsPanel() {
  const table = useRolePermissions();
  // The form starts again from what is stored whenever it changes
  return <PermissionsForm key={JSON.stringify(table)} table={table} />;
}

function PermissionsForm({ table }: { table: Table }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const may = useCan();
  const [draft, setDraft] = useState<Table>(table);
  const edited = ADMIN_PERMISSIONS.some((p) => table[p.key].join() !== DEFAULT_ROLE_PERMISSIONS[p.key].join());
  const changes = ADMIN_PERMISSIONS.flatMap((p) =>
    APPLIED_ROLES.flatMap((r) => {
      const was = table[p.key].includes(r.key);
      const now = draft[p.key].includes(r.key);
      return was === now ? [] : [{ p, r, on: now }];
    }),
  );

  const toggle = (perm: AdminPermission, role: string) =>
    setDraft((d) => {
      const on = d[perm].includes(role);
      return { ...d, [perm]: on ? d[perm].filter((r) => r !== role) : [...d[perm], role] };
    });

  const save = () => {
    actions.setAdminRules({ rolePermissions: draft });
    for (const c of changes) logAdmins(user, "rules", { action: c.on ? `منح صلاحية «${c.p.label}» لصفة` : `سحب صلاحية «${c.p.label}» من صفة`, target: c.r.label, important: true });
    toast({ title: "حُفظت الصلاحيات", body: changes.map((c) => `${c.on ? "مُنحت" : "سُحبت"} «${c.p.label}» — ${c.r.label}`).join("، "), icon: "🔑", tone: "info" });
  };

  return (
    <div className="space-y-4">
      <Title>صلاحيات الصفات</Title>
      <Lead>ما تستطيعه كل صفة في بوابة الإداريين. فعّل أو أوقف ثم احفظ.</Lead>
      <ListTable
        head={[
          "الصلاحية",
          ...APPLIED_ROLES.map((r) => (
            <span key={r.key} className="block text-center">
              {r.label}
            </span>
          )),
        ]}
        minWidth="36rem"
      >
        {ADMIN_PERMISSIONS.map((p) => (
          <tr key={p.key}>
            <td className="p-3 align-top">
              <p className="font-bold text-white">{p.label}</p>
              <p className="text-xs text-white/55">{p.desc}</p>
            </td>
            {APPLIED_ROLES.map((r) => {
              const on = draft[p.key].includes(r.key);
              return (
                <td key={r.key} className="p-3 text-center align-top">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${p.label} — ${r.label}`}
                    disabled={!may(EDIT)}
                    onClick={() => toggle(p.key, r.key)}
                    className={cn("inline-flex h-7 w-12 items-center rounded-full p-1 transition disabled:cursor-not-allowed disabled:opacity-60", on ? "justify-end bg-gold" : "justify-start bg-white/15")}
                  >
                    <span className={cn("size-5 rounded-full", on ? "bg-green-dark" : "bg-white/60")} />
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </ListTable>
      <SaveLine dirty={changes.length > 0} onSave={save} label="حفظ الصلاحيات" perm={EDIT} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Help>
          <p>الصلاحية مستقلة عن الصفة: لا تأتي مع رئاسة المجموعة ولا مع أي فئة، بل تُمنح للصفات هنا.</p>
          <p>ومن يسجّل حاجاً على الحج لا يصير الحاج تابعاً لمجموعته؛ إلحاق الحجاج بالمجموعات يجريه موظفو المكتب وحدهم، لا الإداريون.</p>
          <p>وللموظفين صلاحية «التسجيل على الحج» مستقلة تمنحها الموارد البشرية لموظفي إدخال البيانات، دون أي صلاحية في المجموعات.</p>
        </Help>
        {edited && may("admins.role-permissions.reset") && (
          <Box title="خيارات متقدمة" open={false}>
            <Button size="sm" variant="glass" onClick={() => actions.setAdminRules({ rolePermissions: undefined })}>
              <RotateCcw className="size-4" /> الصلاحيات كما تطلقها المنصة
            </Button>
          </Box>
        )}
      </div>
    </div>
  );
}
