"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, MousePointerClick, Plane, ShieldAlert, UserRound } from "lucide-react";
import { useState } from "react";
import { Emblem } from "@/components/brand/logo";
import { inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { getStaff, PERMISSION_LABELS, STAFF, STAFF_PASSWORD, type StaffUser } from "@/lib/staff";
import { actions, useHydrated, useStore } from "@/lib/store";
import { cn, sleep } from "@/lib/utils";
import { logAs } from "./kit";

export function StaffLogin() {
  const router = useRouter();
  const toast = useToast();
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.staffSessionId);
  const current = hydrated ? getStaff(sessionId) : null;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

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

  const pick = (u: StaffUser) => {
    setPicked(u.id);
    setUsername(u.username);
    setPassword(STAFF_PASSWORD);
    setError("");
  };

  return (
    <div data-dark-page className="relative isolate min-h-[calc(100dvh/var(--zoom))] overflow-hidden pt-28 text-white">
      <div className="absolute inset-0 -z-10 bg-[#003d36]">
        <Image src="/images/clock-tower.jpg" alt="" fill priority sizes="100vw" quality={70} className="object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-[#003d36]/90 to-[#002a25]" />
        <div className="bg-pattern absolute inset-0 opacity-10" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-20 pt-8 md:px-8 lg:grid-cols-[1fr_1.15fr] lg:pt-12">
        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mb-6 flex items-center gap-3">
            <Emblem className="size-14" animated />
            <div>
              <p className="text-xs font-bold tracking-wide text-gold">إدارة الحج والعمرة السورية</p>
              <h1 className="font-display text-3xl font-bold md:text-4xl">بوابة الموظفين</h1>
            </div>
          </div>
          <p className="mb-6 max-w-lg leading-8 text-white/70">
            للموظفين الدائمين في الإدارة والبعثات. تظهر لكل موظف الأقسام التي يملك صلاحيتها فقط، وكل إجراء يُسجَّل باسمه في سجل الأحداث.
          </p>

          {current && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-sm">
                أنت مسجّل الدخول باسم <b className="text-gold">{current.name}</b>
              </p>
              <Button size="sm" variant="gold" onClick={() => router.push("/staff/dashboard")}>
                متابعة إلى لوحتي <ArrowLeft className="size-4" />
              </Button>
            </motion.div>
          )}

          <form onSubmit={submit} className="rounded-3xl border border-gold/30 bg-white p-6 text-ink shadow-2xl md:p-8">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 font-bold">
                  <UserRound className="size-4 text-gold-dark" /> اسم المستخدم
                </span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} dir="ltr" autoComplete="username" placeholder="suha" />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 font-bold">
                  <KeyRound className="size-4 text-gold-dark" /> كلمة المرور
                </span>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(inputClass, "pl-12")}
                    dir="ltr"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-hint hover:text-green-dark" aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>
                    {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </label>
            </div>
            {error && (
              <motion.p initial={{ x: 0 }} animate={{ x: [0, -8, 8, -4, 4, 0] }} className="mt-3 text-sm font-bold text-maroon" role="alert">
                {error}
              </motion.p>
            )}
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy || !username || !password}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
              {busy ? "جارٍ التحقق من الصلاحيات..." : "دخول"}
            </Button>
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-maroon/5 p-3 text-sm leading-6 text-maroon ring-1 ring-maroon/15">
              <ShieldAlert className="mt-0.5 size-5 shrink-0" />
              <p>
                <b>حساب الموظف لا يُنشأ ذاتياً.</b> تنشئه الموارد البشرية بالرقم الوطني ورقم الهاتف، وتمنح الصلاحيات واحدة واحدة، ويُطلب تغيير كلمة المرور المؤقتة عند أول دخول.
              </p>
            </div>
          </form>
        </motion.div>

        {/* Demo staff */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <MousePointerClick className="size-5 text-gold" /> حسابات تجريبية
            </h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
              كلمة المرور للجميع: <b className="font-mono text-gold">{STAFF_PASSWORD}</b>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {STAFF.map((u, i) => (
              <motion.button
                key={u.id}
                type="button"
                onClick={() => pick(u)}
                onDoubleClick={() => enter(u)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border p-4 text-right transition",
                  picked === u.id ? "border-gold bg-gold/15 shadow-[0_0_0_3px_rgba(217,200,158,.35)]" : "border-white/10 bg-white/[.06] hover:border-gold/40 hover:bg-white/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark font-display text-xl font-bold text-ink">{u.initials}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{u.name}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-white/60">
                      {u.title}
                      {u.travels && <Plane className="size-3 text-gold" aria-label="مسافر" />}
                    </p>
                  </div>
                  <span className="mr-auto font-mono text-[11px] text-white/40" dir="ltr">
                    {u.username}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {u.permissions.map((p) => (
                    <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] text-white/70">
                      {PERMISSION_LABELS[p]}
                    </span>
                  ))}
                </div>
              </motion.button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-white/50">اضغط على بطاقة لتعبئة البيانات، أو اضغط مرتين للدخول مباشرة.</p>
        </div>
      </div>
    </div>
  );
}
