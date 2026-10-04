"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { AuthShell, DemoAccounts, FormError, PasswordField, UsernameField } from "@/components/portal/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { ALL_PERMISSIONS, getStaff, holdsAll, PERMISSION_LABELS, STAFF, STAFF_PASSWORD, type StaffUser } from "@/lib/staff";
import { useHalls } from "@/app/administrator/_lib/halls";
import { actions, useHydrated, useStore } from "@/lib/store";
import { sleep } from "@/lib/utils";
import { logAs } from "./kit";

export function StaffLogin() {
  const router = useRouter();
  const toast = useToast();
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.staffSessionId);
  const current = hydrated ? getStaff(sessionId) : null;
  const halls = useHalls();

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
    router.push("/staff/dashboard");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = STAFF.find((s) => s.username === username.trim().toLowerCase());
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
      steps={["اسم المستخدم وكلمة المرور", "لوحتي: الأقسام بحسب صلاحياتك"]}
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
              لكل موظف تجريبي صلاحية واحدة، إلا مديرة الموسم فلها الصلاحيات كلها، ومشرفة القاعة فلا صلاحية لها: قاعتها من إسناد قسم الامتحانات. كلمة المرور للجميع: <b className="font-mono text-green-dark">{STAFF_PASSWORD}</b>. اضغط على بطاقة للدخول مباشرة.
            </>
          }
          groups={[
            {
              items: STAFF.map((u) => ({
                key: u.id,
                title: u.name,
                subtitle: u.title + (u.travels ? " — مسافر مع البعثة" : ""),
                code: u.username,
                initial: u.initials,
                tags: [...(holdsAll(u) ? [`كل الصلاحيات (${ALL_PERMISSIONS.length})`] : u.permissions.map((p) => PERMISSION_LABELS[p])), ...halls.centersOf(u.id).map((c) => `مشرف قاعة — ${c.name}`)],
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
          <Button size="sm" variant="gold" onClick={() => router.push("/staff/dashboard")}>
            متابعة إلى لوحتي <ArrowLeft className="size-4" />
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
