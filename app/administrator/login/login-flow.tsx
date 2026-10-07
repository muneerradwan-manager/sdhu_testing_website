"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, KeyRound, Send } from "lucide-react";
import { useState } from "react";
import { AuthShell, DemoAccounts, FormError, NationalIdField, OtpStep, PasswordField, SwitchLine } from "@/components/portal/auth";
import { DEMO_OTP } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { getPerson, isValidNationalId } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { contactOf } from "../_lib/cadre";
import { DEMO_ADMINS, DEMO_GROUPS, DEMO_LISTED, demoAdminLogin, logAdmin, type DemoAdminMode } from "../_lib/admin";

/** The accounts the list shows now (DEMO_LISTED); the others keep working, unlisted */
const LISTED = ((ids) => (ids ? DEMO_ADMINS.filter((d) => ids.includes(d.id)) : DEMO_ADMINS))(DEMO_LISTED);

export function AdminLoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("next");
  const next = raw && raw.startsWith("/administrator/") ? raw : "/administrator/dashboard";
  // «?demo=all» lists every demo account, beyond today's test (the guides' captures open it so)
  const all = params.get("demo") === "all";
  const shown = all ? DEMO_ADMINS : LISTED;
  const toast = useToast();
  const accounts = useStore((s) => s.accounts);
  const admins = useStore((s) => s.admins);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ text: string; link?: { href: string; label: string } } | null>(null);
  const [otpStage, setOtpStage] = useState(false);
  // The administration's platform signs its cadre in by name or phone and a PIN; the national id and password stay
  const [way, setWay] = useState<"id" | "pin">("id");
  const [by, setBy] = useState<"name" | "phone">("name");
  const [who, setWho] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const cadre = useStore((s) => s.cadre);
  // Who can sign in by PIN here: the demo accounts shown, and whoever has an administrator's account on this device
  const pinPeople = [...shown.map((d) => ({ id: d.id, name: d.title.split(" — ")[0], mode: d.mode })), ...Object.keys(admins).filter((x) => !shown.some((d) => d.id === x)).map((x) => ({ id: x, name: getPerson(x) ? `${getPerson(x)!.firstName} ${getPerson(x)!.lastName}` : x, mode: "start" as const }))];
  const chosen = by === "name" ? pinPeople.find((x) => x.id === who) : pinPeople.find((x) => contactOf(x.id, cadre).phone === phone);

  const sendCode = () => setTimeout(() => toast({ title: "رمز دخول الإداري", body: `رمز التحقق: ${DEMO_OTP}`, icon: "💬", tone: "gold" }), 700);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidNationalId(id)) return setError({ text: "الرقم الوطني يتكون من 11 رقماً." });
    const admin = admins[id];
    if (!admin) {
      if (accounts[id]) return setError({ text: "هذا الرقم مسجّل كحساب حاج، لا كحساب إداري.", link: { href: "/login", label: "دخول الحجاج" } });
      return setError({ text: "لا يوجد حساب إداري بهذا الرقم.", link: { href: "/administrator/register", label: "أنشئ حساباً إدارياً" } });
    }
    // Profiles opened before administrators had passwords sign in with the code alone
    if (admin.password && admin.password !== password) return setError({ text: "كلمة المرور غير صحيحة." });
    const stopped = stoppedText(id);
    if (stopped) return setError({ text: stopped });
    setOtpStage(true);
    sendCode();
  };

  const enter = () => {
    actions.adminLogin(id);
    logAdmin(id, "تسجيل دخول الإداري");
    toast({ title: `مرحباً بعودتك ${getPerson(id)?.firstName}`, icon: "👋", tone: "success" });
    router.push(next);
  };

  const stoppedText = (x: string) => {
    const st = cadre.status[x];
    return st ? `${st.state === "disabled" ? "حسابك موقوف من الإدارة" : "حسابك محذوف من الكادر"}: ${st.reason}. راجع فرعك.` : null;
  };

  const pinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!chosen) return setError({ text: by === "name" ? "اختر اسمك من القائمة." : "لا إداري بهذا الهاتف في الكادر." });
    const stopped = stoppedText(chosen.id);
    if (stopped) return setError({ text: stopped });
    if (pin !== contactOf(chosen.id, cadre).pin) return setError({ text: "رمز الدخول غير صحيح. تأخذه من المكتب، أو يصلك من بوت تيليجرام إن ربطته." });
    if (admins[chosen.id]) {
      actions.adminLogin(chosen.id);
      logAdmin(chosen.id, "تسجيل دخول الإداري برمز الدخول");
    } else {
      const err = demoAdminLogin({ accounts, admins }, chosen.id, chosen.mode);
      if (err) return setError({ text: err });
    }
    toast({ title: `مرحباً ${chosen.name.split(" ")[0] === "الشيخ" ? chosen.name.split(" ").slice(0, 2).join(" ") : chosen.name.split(" ")[0]}`, body: "دخلت برمز الدخول", icon: "🔑", tone: "success" });
    router.push(next);
  };

  const pinByBot = () => {
    setError(null);
    if (!chosen) return setError({ text: "اختر اسمك أو اكتب هاتفك أولاً." });
    const c = contactOf(chosen.id, cadre);
    if (!c.chatId) return setError({ text: "لم تربط حسابك ببوت تيليجرام: خذ رمزك من المكتب، أو ادخل برقمك الوطني ثم اربطه من «الإشعارات»." });
    actions.addTelegram({ by: "بوت المنصة", text: `رمز دخولك إلى منصة الإداريين: ${c.pin}`, to: [chosen.id], reached: [chosen.id] });
    setTimeout(() => toast({ title: "تيليجرام — بوت منصة الكوادر", body: `رمز دخولك: ${c.pin}`, icon: "✈️", tone: "gold" }), 600);
  };

  const quick = (nationalId: string, mode: DemoAdminMode = "start") => {
    const stopped = stoppedText(nationalId);
    if (stopped) return setError({ text: stopped });
    const err = demoAdminLogin({ accounts, admins }, nationalId, mode);
    if (err) return setError({ text: err });
    toast({ title: `مرحباً ${getPerson(nationalId)?.firstName}`, body: "دخول تجريبي سريع", icon: "⚡", tone: "success" });
    router.push(next);
  };

  return (
    <AuthShell
      portal="admin"
      page="login"
      title="دخول الإداريين"
      subtitle="لكل الإداريين: رؤساء التكتلات والمجموعات، والمعاونين، والمنسقين التقنيين، والموجّهين والموجّهات الدينيين بدرجاتهم. الدخول بالرقم الوطني وكلمة المرور، ثم رمز تحقق يصل إلى هاتفك."
      steps={["الرقم الوطني وكلمة المرور", "رمز التحقق", "ملفي كإداري"]}
      step={otpStage ? 1 : 0}
      tabs={!otpStage}
      note="لكل شخص نوع حساب واحد في المنصة: حاج، أو إداري، أو موظف."
      below={
        <DemoAccounts
          hint={
            DEMO_LISTED && !all
              ? "تجربة اليوم: تسجيل رئيس المجموعة لموسم 1448 في ثلاث حالات — من يتقدم أول مرة، ورئيس مجموعة الموسم الماضي يجدّد صفته، ورئيس مجموعة أربعة مواسم منحته الإدارة صفة «رئيس تكتل» فيُتاح له تشكيل تكتل. اضغط على بطاقة للدخول مباشرة، دون كلمة مرور ولا رمز تحقق."
              : "لكل صفة ولكل مكان في التكتل حسابان: من أنهى رحلته فترى كل ما يظهر له (أغلبهم في تكتل النور)، ومن لم يبدأ بعد — مؤهَّل في أول عمله: تكتل يقدّم طلبه، أو مجموعة يشكّلها، أو دعوة تنتظر رده في تكتل البيان. ومن لم يسجّل للموسم بعد يجرّب التسجيل والامتحان. اضغط على بطاقة للدخول مباشرة، دون كلمة مرور ولا رمز تحقق."
          }
          groups={DEMO_GROUPS.filter((g) => shown.some((d) => d.section === g)).map((g) => ({
            label: g,
            items: shown.filter((d) => d.section === g).map((d) => ({
              key: d.id,
              title: d.title,
              note: d.note,
              code: d.id,
              initial: d.title[0],
              badge: d.mode === "done" ? { text: "أنهى رحلته", tone: "green" as const } : d.mode === "ready" ? { text: "لم يبدأ بعد", tone: "maroon" as const } : { text: "لم يسجّل للموسم بعد", tone: "maroon" as const },
              onPick: () => quick(d.id, d.mode),
            })),
          }))}
          footer="يُنشأ الملف الإداري تلقائياً إن لم يكن موجوداً."
        />
      }
    >
      {!otpStage && (
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-sand p-1" role="tablist" aria-label="طريقة الدخول">
          {(
            [
              ["id", "الرقم الوطني وكلمة المرور"],
              ["pin", "الاسم أو الهاتف ورمز الدخول"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={way === k} onClick={() => { setWay(k); setError(null); }} className={cn("rounded-xl px-3 py-2 text-sm font-bold transition", way === k ? "bg-white text-green-dark shadow" : "text-ink-soft hover:text-ink")}>
              {l}
            </button>
          ))}
        </div>
      )}
      <AnimatePresence mode="wait">
        {!otpStage && way === "pin" ? (
          <motion.form key="pin" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} onSubmit={pinSubmit} className="space-y-5">
            <div className="flex gap-2 text-sm">
              {(
                [
                  ["name", "اختيار الاسم"],
                  ["phone", "إدخال رقم الهاتف"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={by === k} onClick={() => setBy(k)} className={cn("rounded-full px-4 py-1.5 font-bold ring-1", by === k ? "bg-green-dark text-white ring-green-dark" : "text-ink-soft ring-gold/40")}>
                  {l}
                </button>
              ))}
            </div>
            {by === "name" ? (
              <label className="block">
                <span className="mb-2 block font-bold">الاسم</span>
                <select value={who} onChange={(e) => setWho(e.target.value)} className="h-14 w-full rounded-2xl border-2 border-gold/40 bg-white px-4 outline-none focus:border-green-light">
                  <option value="">— اختر اسمك —</option>
                  {pinPeople.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block font-bold">رقم الهاتف</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="09XXXXXXXX" inputMode="numeric" dir="ltr" className="h-14 w-full rounded-2xl border-2 border-gold/40 px-4 text-lg outline-none focus:border-green-light" />
              </label>
            )}
            <label className="block">
              <span className="mb-2 flex items-center gap-2 font-bold">
                <KeyRound className="size-4 text-gold-dark" /> رمز الدخول (PIN)
              </span>
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" dir="ltr" placeholder="••••" className="h-14 w-full rounded-2xl border-2 border-gold/40 px-4 text-center font-display text-2xl tracking-[.5em] outline-none focus:border-green-light" />
            </label>
            {chosen && <p className="rounded-xl bg-gold/15 px-3 py-2 text-xs text-maroon">تجريبي: رمز هذا الحساب {contactOf(chosen.id, cadre).pin} — في الحقيقة تعطيه الإدارة أو يصله من بوت تيليجرام.</p>}
            <FormError text={error?.text} link={error?.link} />
            <Button type="submit" size="lg" className="w-full" disabled={pin.length !== 4}>
              دخول <ArrowLeft className="size-5" />
            </Button>
            <button type="button" onClick={pinByBot} className="mx-auto flex items-center gap-1.5 text-sm font-bold text-green-dark hover:underline">
              <Send className="size-4" /> أرسل رمزي إلى تيليجرام
            </button>
          </motion.form>
        ) : !otpStage ? (
          <motion.form key="form" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} onSubmit={submit} className="space-y-6">
            <NationalIdField value={id} onChange={setId} placeholder="01033300871" />
            <PasswordField value={password} onChange={setPassword} />
            <FormError text={error?.text} link={error?.link} />
            <Button type="submit" size="lg" className="w-full">
              متابعة <ArrowLeft className="size-5" />
            </Button>
            <SwitchLine text="ليس لديك حساب إداري؟" href="/administrator/register" label="أنشئ حساباً" />
          </motion.form>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
            <OtpStep phone={admins[id]?.phone} confirm="دخول" onSuccess={enter} onResend={sendCode} back={{ label: "تغيير الرقم الوطني", onClick: () => setOtpStage(false) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
