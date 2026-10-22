"use client";

import { Lock, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { RegistrationDesk, type Registrar } from "@/app/portal/(admin)/pilgrims/pilgrims";
import { can, Empty, Gate, PageHeader, logAs, useStaffUser } from "../_components/kit";
import { viewKeys } from "@/lib/permissions";

/**
 * «التسجيل على الحج» for a staff member at the office — data entry. He registers any pilgrim in the
 * registration's dates, with the same steps and the citizen's consent by code: the desk searches the civil
 * registry (`office.citizens.GET`, sensitive) and files the application (`office.applications.POST`), so it
 * opens with both. Nothing else comes with them: no group, no cluster, no administrator; registering never puts
 * the pilgrim in a group.
 */
export function RegistrationView() {
  const user = useStaffUser()!;
  const registrar: Registrar = {
    id: user.id,
    name: user.name,
    position: user.title,
    label: user.title,
    role: user.title,
    staff: true,
    log: (action, target, detail) => logAs(user, { action, target, detail }),
  };
  const desk = can(user, "office.citizens.GET") && can(user, "office.applications.POST");
  return (
    <Gate perms={viewKeys("office")}>
      <PageHeader
        title="التسجيل على الحج"
        icon={<UserRoundPlus />}
        description="سجّل من يراجع المكتب على الحج في مدة التسجيل، بموافقته برمز يصل إلى هاتفه. يُختم اسمك على الطلب."
      />
      {!desk ? (
        <Empty icon={<Lock />} title="التسجيل يحتاج صلاحيتين" text="«عرض — البحث في السجل المدني» و«إضافة — الطلبات التي سجّلها» معاً: يُبحث عن المواطن في السجل المدني ثم يُسجَّل طلبه. تُمنحان من «صلاحيات الموظفين»." />
      ) : (
      <div className="rounded-[2rem] bg-sand p-4 text-ink md:p-6">
        <RegistrationDesk
          registrar={registrar}
          aside={
            <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
              <p className="font-bold text-gold">صلاحيتك</p>
              <ul className="mt-2 space-y-2">
                <li className="flex gap-2">
                  <ShieldCheck className="mt-1 size-4 shrink-0 text-gold" /> التسجيل على الحج وحده، في مدته.
                </li>
                <li className="flex gap-2">
                  <UsersRound className="mt-1 size-4 shrink-0 text-gold" /> إلحاق الحاج بمجموعة وإدارة المجموعات والتكتلات صلاحيات أخرى لا تملكها.
                </li>
              </ul>
            </div>
          }
        />
      </div>
      )}
    </Gate>
  );
}
