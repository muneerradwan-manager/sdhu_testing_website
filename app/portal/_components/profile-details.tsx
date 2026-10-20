"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BadgeCheck, IdCard, LogOut, MapPin, Phone, RotateCcw, UserRound } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { maskPhone } from "@/lib/phone";
import { ageOf, fullName, getPerson } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { maskNationalId } from "@/lib/utils";

const monthYear = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { month: "long", year: "numeric" });

/**
 * «ملفي»'s details: what the civil registry holds on him and what his account holds (how to reach him, and whom to
 * call for him), his office, then signing out. Nothing here repeats a card above it: an administrator's name and
 * number are on his ID card beside his season card (`identity` false), so the card opens straight on the details;
 * anyone else's open it. His seasons have their own page in the sidebar («سجل المواسم»)
 */
export function ProfileDetails({ identity }: { identity: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const id = useStore((s) => s.sessionId)!;
  const account = useStore((s) => s.accounts[s.sessionId ?? ""]);
  const person = getPerson(id)!;
  const since = account?.createdAt ? `عضو في المنصة منذ ${monthYear.format(account.createdAt)}` : undefined;

  const civil: [string, string][] = [
    ["اسم الأب", person.fatherName],
    ["اسم الأم", person.motherName],
    ["تاريخ الميلاد", `${person.birthDate.slice(0, 4)} (${ageOf(person)} عاماً)`],
    ["مكان الولادة", person.birthPlace],
    ["المحافظة", person.governorate],
    ["مكان القيد", person.registry],
    ["الحالة المدنية", person.maritalStatus],
    ["الجنسية", person.nationality],
  ];
  const contact: { k: string; v: ReactNode; ltr?: boolean; missing?: boolean }[] = [
    { k: "الهاتف", v: maskPhone(account?.phone), ltr: true },
    ...(account?.altPhone ? [{ k: "هاتف بديل", v: maskPhone(account.altPhone), ltr: true }] : []),
    { k: "البريد الإلكتروني", v: account?.email || "لم يُضف بعد", ltr: !!account?.email, missing: !account?.email },
    {
      k: "جهة الطوارئ",
      // The number in its own direction, or it reads backwards beside an Arabic name
      v: account?.emergencyName ? (
        <>
          {account.emergencyName}
          {account.emergencyPhone && <span className="ms-2 font-semibold text-ink-soft" dir="ltr">{maskPhone(account.emergencyPhone)}</span>}
        </>
      ) : (
        "لم تُضف بعد"
      ),
      missing: !account?.emergencyName,
    },
  ];

  return (
    <Card className="md:p-7">
      {identity ? (
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-gold to-gold-dark font-display text-3xl font-bold text-ink shadow-lg">
            {person.firstName[0]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold text-green-dark">{fullName(person)}</p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-hint" dir="ltr">{maskNationalId(person.id)}</span>
              <Badge>
                <BadgeCheck className="size-3.5" /> مؤكدة من الشؤون المدنية
              </Badge>
            </p>
          </div>
          {since && <span className="text-xs text-hint">{since}</span>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-dark text-gold">
            <IdCard className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold text-green-dark">بياناتي</p>
            <p className="text-xs text-hint">من الشؤون المدنية، ومن حسابك في المنصة</p>
          </div>
          {since && <span className="text-xs text-hint">{since}</span>}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-dark">
            <BadgeCheck className="size-4 text-gold-dark" /> من الشؤون المدنية
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {civil.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-sand p-3">
                <dt className="text-xs text-hint">{k}</dt>
                <dd className="mt-0.5 font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-dark">
            <UserRound className="size-4 text-gold-dark" /> التواصل
          </h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
            {contact.map((c) => (
              <div key={c.k} className="rounded-2xl bg-sand p-3">
                <dt className="text-xs text-hint">{c.k}</dt>
                <dd className={c.missing ? "mt-0.5 font-semibold text-hint" : "mt-0.5 font-bold"} dir={c.ltr ? "ltr" : undefined}>
                  {c.v}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gold-light pt-4 text-sm text-ink-soft">
        <span className="flex items-center gap-2"><MapPin className="size-4 text-gold-dark" /> مكتبك: {person.governorate} — {person.registry.split(" ")[0]}</span>
        <span className="flex items-center gap-2"><Phone className="size-4 text-gold-dark" /> <span dir="ltr">+963 11 000 1448</span></span>
        <span className="ms-auto flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              actions.logout();
              router.push("/");
            }}
          >
            <LogOut className="size-4" /> تسجيل الخروج
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-maroon"
            onClick={() => {
              actions.resetDemo();
              toast({ title: "أُعيد ضبط النسخة التجريبية", body: "حُذفت جميع الحسابات والطلبات من هذا المتصفح.", icon: "🧹" });
              router.push("/");
            }}
          >
            <RotateCcw className="size-4" /> إعادة ضبط التجربة
          </Button>
        </span>
      </div>
    </Card>
  );
}
