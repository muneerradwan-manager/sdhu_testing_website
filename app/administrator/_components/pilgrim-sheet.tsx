"use client";

import { BadgeCheck, BedDouble, CircleDashed, Clock3, FileText, HeartPulse, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { CONDITIONS, STEPS, costLines, docStatus, medicalDocsFor, medicalKey, memberDocsDone, stepsDone, useRoomCost, type StepKey } from "@/app/portal/application/_components/post/model";
import { assign } from "@/lib/journey";
import { ageOf, fullName, relationLabel } from "@/lib/registry";
import { useSeason } from "@/lib/season-live";
import { useStore, type DocStatus } from "@/lib/store";
import { cn, maskNationalId, seeded } from "@/lib/utils";
import type { JoinRequest } from "../_lib/group";

/**
 * One pilgrim of a group, opened from its families by whoever serves the group: its head, the guide and the
 * assistant in its seats, the coordinator it is sorted to, the cluster's female guides and assistants, and the
 * cluster's head and deputy. What he sees is the pilgrim's latest: who he is and how to reach his family, where
 * his application stands among the seven steps after acceptance, his documents, the health file the
 * coordinator took, his rooms once the trip is ready, and what happened last on his application.
 * A family that came through the pilgrim portal is read from its own records; the demo's seeded families
 * carry a steady made-up state of their own.
 */

type Sheet = {
  name: string;
  age: number;
  gender: "M" | "F";
  relation: string;
  nationalId: string;
  birth?: string;
  birthPlace?: string;
  office?: string;
  phone?: string;
  emergency?: string;
  done: Record<StepKey, boolean>;
  docs: { label: string; state: DocStatus | "issued" | "waiting" }[];
  health: { conditions: string[]; needs: string[]; medications?: string; by?: string; confirmed: boolean } | null;
  stay?: { room: string; madinahRoom: string; bus: number; tent: number; bracelet: string };
  trail: { action: string; at?: number; actor?: string }[];
};

const DOC: Record<Sheet["docs"][number]["state"], { label: string; tone: "green" | "gold" | "maroon" | "ink" }> = {
  approved: { label: "مقبولة", tone: "green" },
  issued: { label: "صادرة", tone: "green" },
  uploaded: { label: "عند المراجعة", tone: "gold" },
  rejected: { label: "أُعيدت", tone: "maroon" },
  missing: { label: "لم تُرفع", tone: "ink" },
  waiting: { label: "لم تصدر", tone: "ink" },
};

const when = (at: number) => new Intl.DateTimeFormat("ar-SY-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(at);
const isCondition = (x: string) => (CONDITIONS as readonly string[]).includes(x);

export function PilgrimSheet({ family, memberId, groupLabel, onClose }: { family: JoinRequest; memberId: string; groupLabel: string; onClose: () => void }) {
  const app = useStore((s) => (family.real ? s.applications[family.id] : undefined));
  const post = useStore((s) => (family.real ? s.post[family.id] : undefined));
  const account = useStore((s) => (family.real ? s.accounts[family.id] : undefined));
  const events = useStore((s) => s.events);
  const fees = useSeason().fees;
  const room = useRoomCost(app, post);

  const sheet = useMemo<Sheet | null>(() => {
    const seat = family.members.find((m) => m.id === memberId);
    const m = app?.members.find((x) => x.person.id === memberId);
    if (app && post && m) {
      const steps = stepsDone(post, app, costLines(app, fees, room));
      const h = post.health;
      const rec = h?.members[memberId];
      const stay = post.visaAt ? assign(app.members, () => "").find((a) => a.person.id === memberId) : undefined;
      return {
        name: fullName(m.person),
        age: ageOf(m.person),
        gender: m.person.gender,
        relation: m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender),
        nationalId: memberId,
        birth: m.person.birthDate,
        birthPlace: m.person.birthPlace,
        office: app.office,
        phone: account?.phone,
        emergency: account?.emergencyName ? `${account.emergencyName}${account.emergencyPhone ? ` — ${account.emergencyPhone}` : ""}` : undefined,
        // His own papers count for him; the rest of the steps are the family's
        done: {
          ...steps,
          documents: !!post.confirmedAt && memberDocsDone(post, m, ["photo"]),
          passport: memberDocsDone(post, m, ["passport"]),
          medical: !!h?.confirmedAt && !!rec && medicalDocsFor(m, h).every((d) => post.medical?.[medicalKey(m, d)] === "approved"),
        },
        docs: [
          { label: "الصورة الشخصية", state: docStatus(post, m, "photo") },
          { label: "جواز السفر", state: docStatus(post, m, "passport") },
          { label: "التأشيرة", state: post.visaAt ? "issued" : "waiting" },
        ],
        health: rec ? { conditions: rec.conditions, needs: rec.needs, medications: rec.medications, by: h!.by.name, confirmed: !!h!.confirmedAt } : null,
        stay: stay && { room: stay.room, madinahRoom: stay.madinahRoom, bus: stay.bus, tent: stay.tent, bracelet: stay.bracelet },
        trail: events
          .filter((e) => e.target?.includes(`طلب ${app.number}`) || e.target?.includes(`الطلب ${app.number}`))
          .slice(-6)
          .reverse()
          .map((e) => ({ action: e.action, at: e.at, actor: e.actor })),
      };
    }
    if (!seat) return null;
    // A seeded family: attached by its contract, and further along by a draw of its own that never changes
    const rnd = seeded(`pilgrim-${seat.id}`);
    const paid = rnd() < 0.65;
    const passport: DocStatus = !paid ? "missing" : rnd() < 0.7 ? "approved" : "uploaded";
    const recorded = seat.needs.length > 0 || rnd() < 0.4;
    return {
      name: seat.name,
      age: seat.age,
      gender: seat.gender,
      relation: seat.relation,
      nationalId: seat.id,
      phone: `09${seat.id.slice(-8)}`,
      done: { confirm: true, documents: true, group: true, payment: paid, passport: passport === "approved", medical: recorded && passport === "approved" && rnd() < 0.5, visa: false },
      docs: [
        { label: "الصورة الشخصية", state: "approved" },
        { label: "جواز السفر", state: passport },
        { label: "التأشيرة", state: "waiting" },
      ],
      health: recorded ? { conditions: seat.needs.filter(isCondition), needs: seat.needs.filter((x) => !isCondition(x)), confirmed: true } : null,
      trail: [{ action: family.receivedLabel }, ...(family.kind === "transfer" ? [{ action: "انتقل الطلب كاملاً من مجموعة أخرى بعقد جديد" }] : [])],
    };
  }, [family, memberId, app, post, account, events, fees, room]);

  if (!sheet) return null;
  const current = STEPS.find((s) => !sheet.done[s.key]);
  const doneCount = STEPS.filter((s) => sheet.done[s.key]).length;

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4">
        <span className={cn("grid size-14 shrink-0 place-items-center rounded-2xl", sheet.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>
          <UserRound className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-bold text-green-dark">{sheet.name}</h3>
          <p className="text-sm text-ink-soft">
            {sheet.age} عاماً — {sheet.relation} — {groupLabel}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="ink">الطلب {family.number}</Badge>
            <Badge tone={family.real ? "gold" : "ink"}>{family.real ? "من بوابة الحاج" : `عائلة ${family.applicant}`}</Badge>
            <Badge tone={current ? "gold" : "green"}>{current ? `الآن: ${current.title}` : "أتمّ خطواته السبع"}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Block icon={UserRound} title="بياناته">
          <dl className="space-y-1.5 text-sm">
            <Row k="الرقم الوطني" v={maskNationalId(sheet.nationalId)} ltr />
            <Row k="الجنس" v={sheet.gender === "F" ? "أنثى" : "ذكر"} />
            {sheet.birth && <Row k="تاريخ الميلاد" v={sheet.birth} ltr />}
            {sheet.birthPlace && <Row k="مكان الولادة" v={sheet.birthPlace} />}
            {sheet.office && <Row k="المكتب" v={sheet.office} />}
          </dl>
        </Block>
        <Block icon={Phone} title="التواصل مع العائلة">
          <dl className="space-y-1.5 text-sm">
            <Row k="صاحب الطلب" v={family.applicant} />
            <Row k="هاتف العائلة" v={sheet.phone || "—"} ltr />
            {sheet.emergency && <Row k="جهة الطوارئ" v={sheet.emergency} />}
          </dl>
          {sheet.phone && (
            <a href={`tel:${sheet.phone}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-dark px-3 py-1.5 text-xs font-bold text-white hover:bg-green">
              <Phone className="size-3.5" /> اتصال
            </a>
          )}
        </Block>
      </div>

      <Block icon={ShieldCheck} title={`أين وصل — ${doneCount} من ${STEPS.length} خطوات`} className="mt-4">
        <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
          {STEPS.map((s, i) => {
            const ok = sheet.done[s.key];
            const now = s.key === current?.key;
            return (
              <li key={s.key} className={cn("flex items-center gap-2 rounded-xl px-2.5 py-1.5", now && "bg-gold/20 font-bold")}>
                {ok ? <BadgeCheck className="size-4 shrink-0 text-green-light" /> : <CircleDashed className={cn("size-4 shrink-0", now ? "text-gold-dark" : "text-hint")} />}
                <span className={ok || now ? "text-ink" : "text-hint"}>
                  {i + 1}. {s.title}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sheet.docs.map((d) => (
            <Badge key={d.label} tone={DOC[d.state].tone}>
              {d.label}: {DOC[d.state].label}
            </Badge>
          ))}
        </div>
      </Block>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Block icon={HeartPulse} title="الملف الصحي">
          {!sheet.health ? (
            <p className="text-sm text-hint">لم يسجّله منسق المجموعة بعد.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <Chips label="أمراض مزمنة" items={sheet.health.conditions} tone="maroon" />
              <Chips label="احتياجات خاصة" items={sheet.health.needs} tone="gold" />
              {sheet.health.medications && <p className="text-ink-soft">الأدوية: {sheet.health.medications}</p>}
              <p className="text-xs text-hint">
                {sheet.health.by ? `سجّله ${sheet.health.by}` : "سجّله منسق المجموعة"} — {sheet.health.confirmed ? "أكّده الحاج" : "بانتظار تأكيد الحاج"}
              </p>
            </div>
          )}
        </Block>
        <Block icon={BedDouble} title="السكن والرحلة">
          {!sheet.stay ? (
            <p className="text-sm text-hint">تظهر غرفه وحافلته وخيمته حين تصدر التأشيرة وتُجهَّز الرحلة.</p>
          ) : (
            <dl className="space-y-1.5 text-sm">
              <Row k="غرفة مكة" v={sheet.stay.room} ltr />
              <Row k="غرفة المدينة" v={sheet.stay.madinahRoom} ltr />
              <Row k="الحافلة" v={String(sheet.stay.bus)} ltr />
              <Row k="خيمة منى" v={String(sheet.stay.tent)} ltr />
              <Row k="السوار" v={sheet.stay.bracelet} ltr />
            </dl>
          )}
        </Block>
      </div>

      <Block icon={FileText} title="آخر ما جرى على طلبه" className="mt-4">
        {sheet.trail.length === 0 ? (
          <p className="text-sm text-hint">لا أحداث بعد.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {sheet.trail.map((e, i) => (
              <li key={i} className="rounded-xl bg-sand/60 px-3 py-2">
                <p className="font-semibold">{e.action}</p>
                {e.at && (
                  <p className="flex items-center gap-1 text-xs text-hint">
                    <Clock3 className="size-3" /> {when(e.at)}
                    {e.actor ? ` — ${e.actor}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <p className="mt-4 text-xs leading-6 text-hint">يطّلع على الحاج من يخدم مجموعته وحدهم: رئيسها وفريقها في مقاعدها، ومنسقها، وموجّهات التكتل ومعاونه، ورئيس التكتل ونائبه. للاطلاع فقط؛ ما يعدّله الحاج أو المكتب يظهر هنا فوراً.</p>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  );
}

function Block({ icon: Icon, title, className, children }: { icon: typeof UserRound; title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-gold/30 p-4", className)}>
      <p className="mb-2 flex items-center gap-2 font-bold text-green-dark">
        <Icon className="size-4 text-gold-dark" /> {title}
      </p>
      {children}
    </section>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gold/20 pb-1.5">
      <dt className="text-hint">{k}</dt>
      <dd className="text-left font-semibold" dir={ltr ? "ltr" : undefined}>
        {v}
      </dd>
    </div>
  );
}

function Chips({ label, items, tone }: { label: string; items: string[]; tone: "maroon" | "gold" }) {
  return (
    <div>
      <p className="text-xs text-hint">{label}</p>
      {items.length === 0 ? (
        <p className="text-ink-soft">لا شيء</p>
      ) : (
        <p className="mt-1 flex flex-wrap gap-1">
          {items.map((x) => (
            <Badge key={x} tone={tone}>
              {x}
            </Badge>
          ))}
        </p>
      )}
    </div>
  );
}
