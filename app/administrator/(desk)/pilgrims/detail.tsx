"use client";

import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, CircleDashed, Clock3, Database, FileText, Printer, Receipt, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/portal/shell";
import { payMethodLabel } from "@/components/payment/methods";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { DOCS, costLines, docStatus, medicalDocsFor, medicalKey, paidAt } from "@/app/portal/application/_components/post/model";
import { groupInfo } from "@/lib/assignment";
import { planLabel, seasonPlan } from "@/lib/installments";
import { directAccepted, stageAt, trackOf, trackSteps } from "@/lib/journey";
import { ageOf, fullName, getPerson, relationLabel } from "@/lib/registry";
import { useSeason } from "@/lib/season-live";
import { useStore, type DocStatus } from "@/lib/store";
import { cn, formatUSD, maskNationalId } from "@/lib/utils";

const fmt = (at?: number) => (at ? new Intl.DateTimeFormat("ar-SY-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(at) : "—");

const DOC_TONE: Record<DocStatus, { label: string; tone: "green" | "gold" | "maroon" | "ink" }> = {
  approved: { label: "معتمدة", tone: "green" },
  uploaded: { label: "قيد المراجعة", tone: "gold" },
  rejected: { label: "مرفوضة", tone: "maroon" },
  missing: { label: "لم تُرفع", tone: "ink" },
};

/**
 * تفاصيل طلب حاج من داخل لوحة الإدارة. تُقرأ من سجلات المنصة الوطنية للحج نفسها (الطلب، الحساب، الإيصالات،
 * خطوات ما بعد القبول، سجل الأحداث) — لا استعلام من الشؤون المدنية ولا دخول إلى حساب الحاج. يبقى حساب
 * الحاج له وحده، يدخله برقمه الوطني ليتابع طلبه بنفسه.
 */
export function ApplicationDetail({ applicantId, onBack }: { applicantId: string; onBack: () => void }) {
  const app = useStore((s) => s.applications[applicantId]);
  const post = useStore((s) => s.post[applicantId]);
  const account = useStore((s) => s.accounts[applicantId]);
  const events = useStore((s) => s.events);
  const season = useSeason();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!app) {
    return (
      <Card>
        <p className="font-bold text-maroon">لا يوجد طلب بهذا الرقم في سجلات المنصة.</p>
        <Button className="mt-4" variant="outline" onClick={onBack}>
          <ArrowRight className="size-4" /> رجوع
        </Button>
      </Card>
    );
  }

  const holder = getPerson(applicantId);
  const applicant = app.members.find((m) => m.relation === "self")?.person ?? holder;
  const track = trackOf(app);
  const steps = trackSteps(track, directAccepted(app));
  const { stage } = stageAt(steps, (now - app.submittedAt) / 1000);
  const accepted = stage.key === "accepted";
  const fee = app.members.length * season.fees.registrationPerPerson;
  const plan = app.plan ?? seasonPlan(season.fees);
  const lines = costLines(app, season.fees);
  const emptyPost = { documents: {}, payments: {}, ratings: {} };
  const p = post ?? emptyPost;
  const group = post?.groupApprovedAt ? groupInfo(post.clusterId, post.groupNumber) : null;
  const trail = events.filter((e) => e.target?.includes(`طلب ${app.number}`) || e.target?.includes(`الطلب ${app.number}`)).slice(-12).reverse();

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowRight className="size-4" /> رجوع إلى مكتب التسجيل
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> طباعة
        </Button>
      </div>

      {/* Header */}
      <Card className="relative overflow-hidden md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-hint">طلب حج — موسم 1448</p>
            <h2 className="font-display text-3xl font-bold text-green-dark">الطلب رقم {app.number}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={track === "lottery" ? "gold" : "green"}>{track === "lottery" ? "التسجيل على القرعة" : "التسجيل على القبول المباشر"}</Badge>
              <Badge tone={accepted ? "green" : "ink"}>الحالة: {stage.title}</Badge>
              <Badge tone="ink">{app.office}</Badge>
              <Badge tone={group ? "green" : "gold"}>{group ? `المجموعة ${group.number}` : "لم ينضم إلى مجموعة بعد"}</Badge>
            </div>
          </div>
          <div className="rounded-2xl bg-sand px-4 py-3 text-sm leading-7">
            <p>
              <span className="text-hint">سُجّل: </span>
              <b>{fmt(app.submittedAt)}</b>
            </p>
            <p>
              <span className="text-hint">سجّله: </span>
              <b>{app.submittedBy ? `${app.submittedBy.name} — منسق تقني` : "الحاج بنفسه من بوابته"}</b>
            </p>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-green-dark/5 p-3 text-xs leading-6 text-green-dark">
          <Database className="mt-0.5 size-4 shrink-0" />
          البيانات من سجلات المنصة الوطنية للحج كما سُجّلت — لا استعلام جديداً من الشؤون المدنية، ولا دخول إلى حساب الحاج.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Account */}
        <Card className="md:p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <UserRound className="size-5 text-gold-dark" /> الحساب وصاحب الطلب
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="صاحب الطلب" v={applicant ? `${fullName(applicant)} — ${ageOf(applicant)} عاماً` : "—"} />
            <Row k="الحساب على المنصة" v={holder ? `${fullName(holder)} — ${maskNationalId(applicantId)}` : maskNationalId(applicantId)} />
            {applicant && holder && applicant.id !== holder.id && <p className="rounded-xl bg-gold/15 p-2 text-xs leading-5 text-ink">الطلب في حساب {holder.firstName} الذي راجع المكتب ووافق برمز التحقق، وصاحبه {applicant.firstName} لأنه الأكبر سناً.</p>}
            <Row k="أُنشئ الحساب" v={account ? fmt(account.createdAt) : "—"} />
            <Row k="الهاتف المسجّل" v={account?.phone ? `•••• ${account.phone.slice(-3)}` : "—"} />
            <Row k="موافقة المواطن" v="برمز تحقق إلى هاتفه المسجّل في الشؤون المدنية" />
          </dl>
          <p className="mt-3 text-xs leading-5 text-hint">يدخل المواطن حسابه برقمه الوطني ليتابع طلبه بنفسه؛ هذه الصفحة للاطلاع الإداري فقط.</p>
        </Card>

        {/* Payments */}
        <Card className="md:p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <Receipt className="size-5 text-gold-dark" /> الإيصالات والتسديد
          </p>
          <ul className="mt-3 divide-y divide-gold-light text-sm">
            <PayRow title="رسم التسجيل" detail={`${app.members.length} × ${formatUSD(season.fees.registrationPerPerson)}`} amount={fee} receipt={app.receipt} paid={app.submittedAt} />
            {lines.map((l) => (
              <PayRow key={l.key} title={l.title} detail={l.key === "i1" && app.firstPaid?.creditFrom ? `رصيد من الطلب ${app.firstPaid.creditFrom}` : l.due} amount={l.amount} receipt={l.receipt} paid={paidAt(l, app, p)} />
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-ink-soft">
            طريقة الدفع عند التسجيل: {payMethodLabel(app.payMethod === "card" ? undefined : app.payMethod)} — خطة الموسم: {planLabel(plan, season.fees)}.
          </p>
          <p className="mt-1 text-sm font-bold text-green-dark">
            المسدَّد حتى الآن: {formatUSD(app.paid + lines.filter((l) => l.key !== "i1" && paidAt(l, app, p)).reduce((a, l) => a + l.amount, 0))}
          </p>
        </Card>
      </div>

      {/* Members */}
      <Card className="md:p-6">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
          <UsersRound className="size-5 text-gold-dark" /> أفراد الطلب ({app.members.length})
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="bg-sand text-ink-soft">
              <tr>
                {["الاسم", "الرقم الوطني", "الصلة", "العمر", "الصلة من السجل", "الصورة والجواز", "الاحتياجات"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {app.members.map((m) => {
                const escort = app.members.find((x) => x.person.id === m.companionId);
                const docsDone = DOCS.every((d) => docStatus(p, m, d.key) === "approved");
                return (
                  <tr key={m.person.id} className="border-t border-gold-light">
                    <td className="px-3 py-2.5">
                      <b>{fullName(m.person)}</b>
                      {escort && <span className="block text-xs text-hint">مرافقه الرسمي: {escort.person.firstName}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono" dir="ltr">
                      {maskNationalId(m.person.id)}
                    </td>
                    <td className="px-3 py-2.5">{m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}</td>
                    <td className="px-3 py-2.5">{ageOf(m.person)}</td>
                    <td className="px-3 py-2.5">{m.relation === "self" ? "—" : m.relationVerified ? <Badge tone="green">مؤكدة</Badge> : <Badge tone="gold">للمراجعة</Badge>}</td>
                    <td className="px-3 py-2.5">{!post?.confirmedAt ? <span className="text-hint">بعد القبول</span> : docsDone ? <Badge tone="green">معتمدة</Badge> : <Badge tone="gold">ناقصة</Badge>}</td>
                    <td className="px-3 py-2.5 text-xs">{m.needs.length ? m.needs.join("، ") : <span className="text-hint">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Progress after acceptance */}
        <Card className="md:p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <ShieldCheck className="size-5 text-gold-dark" /> المسار
          </p>
          <ol className="mt-3 space-y-2 text-sm">
            {[
              { t: "تقديم الطلب ودفع ما يستحق عند التسجيل", ok: true, at: app.submittedAt },
              { t: `النتيجة: ${stage.title}`, ok: accepted },
              { t: "تأكيد القبول", ok: !!post?.confirmedAt, at: post?.confirmedAt },
              { t: "الصورة الشخصية والجواز", ok: !!post?.confirmedAt && app.members.every((m) => DOCS.every((d) => docStatus(p, m, d.key) === "approved")) },
              { t: group ? `الانضمام إلى المجموعة ${group.number}${post?.enrolledBy ? ` — سجّله ${post.enrolledBy.name}` : ""}` : `الانضمام إلى مجموعة (مرحلة التفويج)`, ok: !!group, at: post?.groupApprovedAt },
              { t: "المعلومات الصحية والوثائق الطبية", ok: !!post?.health?.confirmedAt && app.members.every((m) => medicalDocsFor(m, post.health).every((d) => post.medical?.[medicalKey(m, d)] === "approved")) },
              { t: "التأشيرة", ok: !!post?.visaAt, at: post?.visaAt },
            ].map((s) => (
              <li key={s.t} className="flex items-start gap-2">
                {s.ok ? <BadgeCheck className="mt-0.5 size-4 shrink-0 text-green-light" /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-hint" />}
                <span className={cn(s.ok ? "text-ink" : "text-hint")}>
                  {s.t}
                  {s.at && s.ok ? <span className="block text-xs text-hint">{fmt(s.at)}</span> : null}
                </span>
              </li>
            ))}
          </ol>
          {post?.confirmedAt && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {app.members.flatMap((m) =>
                DOCS.map((d) => {
                  const s = DOC_TONE[docStatus(p, m, d.key)];
                  return (
                    <Badge key={`${m.person.id}-${d.key}`} tone={s.tone}>
                      {m.person.firstName}: {d.label} — {s.label}
                    </Badge>
                  );
                }),
              )}
            </div>
          )}
        </Card>

        {/* Audit trail */}
        <Card className="md:p-6">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <FileText className="size-5 text-gold-dark" /> سجل الأحداث على الطلب
          </p>
          {trail.length === 0 ? (
            <p className="mt-3 text-sm text-hint">لا أحداث بعد.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {trail.map((e) => (
                <li key={e.id} className="rounded-xl bg-sand/60 p-2.5">
                  <p className="font-semibold">{e.action}</p>
                  <p className="flex items-center gap-1 text-xs text-hint">
                    <Clock3 className="size-3" /> {fmt(e.at)} — {e.actor}
                  </p>
                  {e.detail && <p className="mt-0.5 text-xs text-ink-soft">{e.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </motion.div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gold/20 pb-1.5">
      <dt className="text-hint">{k}</dt>
      <dd className="text-left font-semibold">{v}</dd>
    </div>
  );
}

function PayRow({ title, detail, amount, receipt, paid }: { title: string; detail: string; amount: number; receipt: string; paid?: number }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-xs text-hint">
          {detail} — <span dir="ltr" className="font-mono">{receipt}</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <b className="text-green-dark">{formatUSD(amount)}</b>
        {paid ? <Badge tone="green">مسدَّد</Badge> : <Badge tone="ink">لم يُسدَّد</Badge>}
      </span>
    </li>
  );
}
