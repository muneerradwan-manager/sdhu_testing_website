"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { AuthShell, DemoAccounts, FormError, PasswordField, UsernameField } from "@/components/portal/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { getStaff, holdsAll, PERMISSION_LABELS, STAFF_PASSWORD, TASK_PERMISSIONS, type StaffUser } from "@/lib/staff";
import { useHalls } from "@/app/administrator/_lib/halls";
import { SYSTEM_KEYS, SYSTEMS, useStaffAccounts } from "@/lib/systems";
import { useAirportReps, useAirports } from "@/lib/flights";
import { actions, useHydrated, useStore } from "@/lib/store";
import { sleep } from "@/lib/utils";
import { logAs, staffHome, useStaffHome } from "./kit";

export function StaffLogin() {
  const router = useRouter();
  const toast = useToast();
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.staffSessionId);
  const current = hydrated ? getStaff(sessionId) : null;
  const halls = useHalls();
  // Every account with the management permissions the director granted or took back since it was opened
  const accounts = useStaffAccounts();
  const reps = useAirportReps();
  const airports = useAirports();
  const currentHome = useStaffHome(current);
  const homeOf = (u: StaffUser) =>
    staffHome(
      u,
      SYSTEM_KEYS.filter((k) => u.permissions.includes(SYSTEMS[k].permission)),
      { hall: halls.centersOf(u.id).length > 0, airport: reps.airportsOf(u.id).length > 0 },
    );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const enter = async (user: StaffUser) => {
    setBusy(true);
    await sleep(900);
    actions.staffLogin(user.id);
    logAs(user, { action: "تسجيل دخول", target: "بوابة الموظفين" });
    toast({ title: `أهلاً ${user.name.split(" ")[0]}`, body: `دخلت بصفة: ${user.title}`, tone: "success", icon: "🔐" });
    router.push(homeOf(user));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = accounts.find((s) => s.username === username.trim().toLowerCase());
    if (!user || password !== STAFF_PASSWORD) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
      return;
    }
    setError("");
    enter(user);
  };

  return (
    <AuthShell
      portal="staff"
      page="login"
      title="دخول الموظفين"
      subtitle="للموظفين الدائمين في الإدارة والبعثات: تظهر لكل موظف الأقسام التي يملك صلاحيتها، وكل إجراء يُسجَّل باسمه. الدخول باسم المستخدم وكلمة المرور."
      steps={["اسم المستخدم وكلمة المرور", "أقسامك بحسب صلاحياتك"]}
      step={busy ? 1 : 0}
      note={
        <>
          <b>حساب الموظف لا يُنشأ ذاتياً.</b> تنشئه الموارد البشرية بالرقم الوطني ورقم الهاتف، وتمنح الصلاحيات واحدة واحدة، ويُطلب تغيير كلمة المرور المؤقتة عند أول دخول.
        </>
      }
      below={
        <DemoAccounts
          hint={
            <>
              لكل موظف تجريبي صلاحية واحدة. صلاحية الإدارة — «إدارة الموظفين»، «إدارة الإداريين»، «إدارة الامتحانات»، «إدارة الطيران» — تفتح لصاحبها الملف كله، وتمنحها مديرة الموسم، ولها كل صلاحيات المهام الأخرى. ومشرفة القاعة ومندوب المطار لا صلاحية لهما: يسندهما في الميدان صاحب صلاحية الإدارة. كلمة المرور للجميع: <b className="font-mono text-green-dark">{STAFF_PASSWORD}</b>. اضغط على بطاقة للدخول مباشرة.
            </>
          }
          groups={[
            {
              items: accounts.map((u) => ({
                key: u.id,
                title: u.name,
                subtitle: u.title + (u.travels ? " — مسافر مع البعثة" : ""),
                code: u.username,
                initial: u.initials,
                tags: [
                  ...(holdsAll(u) ? [`كل صلاحيات المهام (${TASK_PERMISSIONS.length})`, PERMISSION_LABELS["systems.assign"]] : u.permissions.map((p) => PERMISSION_LABELS[p])),
                  ...halls.centersOf(u.id).map((c) => `مشرف قاعة — ${c.name}`),
                  ...reps.airportsOf(u.id).map((a) => `مندوب مطار — ${airports.find((x) => x.id === a)?.city ?? a}`),
                ],
                onPick: () => void enter(u),
              })),
            },
          ]}
        />
      }
    >
      {current && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm">
            أنت مسجّل الدخول باسم <b className="text-green-dark">{current.name}</b>
          </p>
          <Button size="sm" variant="gold" onClick={() => router.push(currentHome)}>
            متابعة إلى أقسامي <ArrowLeft className="size-4" />
          </Button>
        </motion.div>
      )}
      <form onSubmit={submit} className="space-y-6">
        <UsernameField value={username} onChange={setUsername} placeholder="suha" />
        <PasswordField value={password} onChange={setPassword} />
        <FormError text={error} />
        <Button type="submit" size="lg" className="w-full" disabled={busy || !username || !password}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
          {busy ? "جارٍ التحقق من الصلاحيات..." : "دخول"}
        </Button>
      </form>
    </AuthShell>
  );
}
