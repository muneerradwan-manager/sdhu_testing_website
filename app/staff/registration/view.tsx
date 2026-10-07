"use client";

import { ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import { RegistrationDesk, type Registrar } from "@/app/administrator/(desk)/pilgrims/pilgrims";
import { Gate, PageHeader, logAs, useStaffUser } from "../_components/kit";

/**
 * «التسجيل على الحج» for a staff member who holds that permission alone — data entry. He registers any
 * pilgrim in the registration's dates, with the same steps and the citizen's consent by code. The
 * permission gives nothing else: no group, no cluster, no administrator; registering never puts the
 * pilgrim in a group.
 */
export function RegistrationView() {
  const user = useStaffUser()!;
  const registrar: Registrar = {
    id: user.id,
    name: user.name,
    position: user.title,
    label: user.title,
    role: user.title,
    log: (action, target, detail) => logAs(user, { action, target, detail }),
  };
  return (
    <Gate perms={["pilgrims.register"]}>
      <PageHeader
        eyebrow="صلاحية «التسجيل على الحج»"
        title="التسجيل على الحج"
        icon={<UserRoundPlus />}
        description="تسجّل أي مواطن يراجع المكتب على الحج في مدة التسجيل، بموافقته برمز يصل إلى هاتفه، ويُختم اسمك على الطلب. لا يضعه ذلك في أي مجموعة، ولا تمنحك هذه الصلاحية شيئاً في المجموعات أو التكتلات."
      />
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
    </Gate>
  );
}
