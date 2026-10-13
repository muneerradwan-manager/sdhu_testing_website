"use client";

import { motion } from "motion/react";
import { Award, BookOpen, Calculator, Crown, Laptop, Medal, Star, Timer, UserRound, Users, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { Badge } from "@/components/ui/widgets";
import type { Cluster, ClusterTeam, TeamGroup, TeamMember } from "@/lib/data/clusters";
import { groupName } from "@/lib/groups";
import { useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";

/** The roles and posts in English; the names stay Arabic */
const EN: Record<string, string> = {
  "رئيس تكتل": "Cluster head",
  "رئيس مجموعة": "Group head",
  "معاون": "Assistant",
  "منسق تقني": "Technical coordinator",
  "معاون ومنسق تقني": "Assistant and technical coordinator",
  "معاون بعدد": "Assistant (adds pilgrims)",
  "موجّه ديني أ": "Religious guide, grade A",
  "موجّه ديني ب": "Religious guide, grade B",
  "موجّه ديني ج": "Religious guide, grade C",
  "موجّهة دينية أ": "Female religious guide, grade A",
  "موجّهة دينية ب": "Female religious guide, grade B",
  "موجّهة دينية ج": "Female religious guide, grade C",
  "رئيس التكتل": "Head of the cluster",
  "رئيس التكتل ورئيس مجموعته": "Head of the cluster and of his own group",
  "رئيس المجموعة": "Head of the group",
  "نائب رئيس التكتل": "Deputy head of the cluster",
  "محاسب التكتل": "Accountant of the cluster",
  "معاون التكتل": "Assistant of the cluster",
  "المنسق التقني": "Technical coordinator",
  "موجّهة التكتل": "Female guide of the cluster",
  "موجّه المجموعة": "Guide of the group",
  "معاون المجموعة": "Assistant of the group",
};

function useWord() {
  const t = useT();
  return (ar: string) => t(ar, EN[ar] ?? ar);
}

/** «4 مواسم · تقييم آخر موسم 4.8» — or a first season on the platform */
function Experience({ m }: { m: TeamMember }) {
  const t = useT();
  if (!m.seasons) return <span className="text-xs text-hint">{t("أول موسم له على المنصة", "First season on the platform")}</span>;
  const seasons = m.seasons === 1 ? t("موسم واحد", "one season") : m.seasons === 2 ? t("موسمان", "two seasons") : t(`${m.seasons} مواسم`, `${m.seasons} seasons`);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
      <span>{t(`خبرة ${seasons}`, `Experience: ${seasons}`)}</span>
      {m.rating !== null && (
        <span className="inline-flex items-center gap-0.5 font-bold text-gold-dark">
          <Star className="size-3 fill-gold-dark" /> {m.rating.toFixed(1)}
          <span className="font-normal text-hint">{t(" آخر موسم", " last season")}</span>
        </span>
      )}
    </span>
  );
}

/** One of the cluster's people: initial, name, post and role, experience */
function Person({ m, icon, big }: { m: TeamMember; icon?: ReactNode; big?: boolean }) {
  const t = useT();
  const word = useWord();
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl bg-sand/60 p-3", big && "bg-gradient-to-l from-gold/25 to-sand/60 p-4")}>
      <span className={cn("grid shrink-0 place-items-center rounded-xl font-display font-bold", big ? "size-14 bg-green-dark text-2xl text-gold" : "size-10 bg-gradient-to-br from-gold to-gold-dark text-lg text-ink")}>
        {icon ?? m.name.replace(/^الشيخ\s+/, "")[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block font-bold leading-6 text-green-dark", big && "font-display text-xl")}>
          <bdi>{m.name}</bdi>
        </span>
        <span className="block text-xs font-semibold text-maroon">
          {word(m.post)}
          {m.role && m.role !== m.post && <span className="font-normal text-ink-soft"> · {word(m.role)}</span>}
        </span>
        <span className="mt-0.5 block">
          <Experience m={m} />
        </span>
        <span className="block text-[11px] text-hint">{t(`فرع ${m.branch}`, `${m.branch} branch`)}</span>
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-bold text-green-dark">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const BADGES = [
  { key: "guidance", icon: BookOpen, ar: "شارة التميّز في التوجيه الديني", en: "Excellence in religious guidance", hintAr: "في فريقه موجّه أو موجّهة من الدرجة «أ»", hintEn: "A grade-A guide serves in its team" },
  { key: "age", icon: Medal, ar: "شارة العمر", en: "Youthful team", hintAr: "متوسط أعمار فريقه 40 سنة أو أقل", hintEn: "Its team's average age is 40 or under" },
  { key: "timeliness", icon: Timer, ar: "شارة الالتزام بالمواعيد", en: "On time", hintAr: "قدّم طلب تشكيله قبل الموعد الأول", hintEn: "It filed its request before the early deadline" },
] as const;

/**
 * Who serves the cluster's pilgrims, from its approved request in the administrators' platform: its head, deputy
 * and accountant, its assistants, technical coordinators and female guides, and the badges its team earned.
 */
export function ClusterTeamCard({ team }: { team: ClusterTeam }) {
  const t = useT();
  const earned = BADGES.filter((b) => team.badges[b.key]);
  const groupsOf = (name: string, pick: (g: TeamGroup) => string | undefined) =>
    team.groups
      .filter((g) => pick(g) === name)
      .map((g) => groupName(g.no))
      .join("، ");
  return (
    <Card className="md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <UsersRound className="size-6 text-gold-dark" /> {t("فريق التكتل", "The cluster's team")}
      </h2>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        {t(
          `${team.size} إدارياً يخدمون حجاج التكتل، كلٌّ في مكانه من طلب التكتل الذي اعتمدته الإدارة: الخبرة عدد مواسمهم على المنصة، والتقييم ما ناله كلٌّ في آخر موسم شارك فيه.`,
          `${team.size} administrators serve the cluster's pilgrims, each in his place in the cluster's request as the Administration approved it: experience is their seasons on the platform, and the rating is what each earned in his last season.`,
        )}
      </p>

      {earned.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {earned.map((b) => (
            <span key={b.key} title={t(b.hintAr, b.hintEn)} className="inline-flex items-center gap-1.5 rounded-full bg-green-dark px-3 py-1.5 text-xs font-bold text-white">
              <b.icon className="size-3.5 text-gold" /> {t(b.ar, b.en)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-2">
        <Person m={team.head} icon={<Crown className="size-6" />} big />
      </div>
      {(team.deputy || team.accountant) && (
        <Section title={t("قيادة التكتل", "The cluster's leadership")}>
          {team.deputy && <Person m={team.deputy} icon={<Award className="size-5" />} />}
          {team.accountant && <Person m={team.accountant} icon={<Calculator className="size-5" />} />}
        </Section>
      )}
      {team.assistants.length > 0 && (
        <Section title={t("معاونو التكتل — للمطارات والمخيمات والطوارئ", "The cluster's assistants — airports, camps and emergencies")}>
          {team.assistants.map((m) => (
            <Person key={m.id} m={m} icon={<UserRound className="size-5" />} />
          ))}
        </Section>
      )}
      {team.coordinators.length > 0 && (
        <Section title={t("المنسقون التقنيون — بيانات الحجاج وأوراقهم، كلٌّ لمجموعاته", "Technical coordinators — the pilgrims' records and papers, each for his groups")}>
          {team.coordinators.map((m) => (
            <div key={m.id}>
              <Person m={m} icon={<Laptop className="size-5" />} />
              {groupsOf(m.name, (g) => g.coordinator) && <p className="mt-1 px-3 text-[11px] text-ink-soft">{t(`مجموعاته: ${groupsOf(m.name, (g) => g.coordinator)}`, `His groups: ${groupsOf(m.name, (g) => g.coordinator)}`)}</p>}
            </div>
          ))}
        </Section>
      )}
      {team.femaleGuides.length > 0 && (
        <Section title={t("الموجّهات الدينيات — لحاجّات التكتل", "Female religious guides — for the cluster's women pilgrims")}>
          {team.femaleGuides.map((m) => (
            <div key={m.id}>
              <Person m={m} icon={<BookOpen className="size-5" />} />
              {groupsOf(m.name, (g) => g.femaleGuide) && <p className="mt-1 px-3 text-[11px] text-ink-soft">{t(`حاجّات: ${groupsOf(m.name, (g) => g.femaleGuide)}`, `Women of: ${groupsOf(m.name, (g) => g.femaleGuide)}`)}</p>}
            </div>
          ))}
        </Section>
      )}
      <p className="mt-5 text-xs leading-6 text-hint">
        {t(`مستوى التكتل في طلبه المعتمد: ${team.tier}.`, `The cluster's tier in its approved request: ${team.tier}.`)}
      </p>
    </Card>
  );
}

/** The cluster at a glance, beside its programme: who leads it, its tier and office, its groups, pilgrims and team, its badges */
export function ClusterFactsCard({ cluster, team }: { cluster: Cluster; team: ClusterTeam }) {
  const t = useT();
  const earned = BADGES.filter((b) => team.badges[b.key]);
  const rows: { k: string; v: ReactNode }[] = [
    { k: t("رئيس التكتل", "Head"), v: <bdi>{team.head.name}</bdi> },
    ...(team.deputy ? [{ k: t("نائبه", "Deputy"), v: <bdi>{team.deputy.name}</bdi> }] : []),
    ...(team.accountant ? [{ k: t("محاسبه", "Accountant"), v: <bdi>{team.accountant.name}</bdi> }] : []),
    { k: t("المستوى", "Tier"), v: team.tier },
    { k: t("المكتب", "Office"), v: cluster.office },
    { k: t("المجموعات", "Groups"), v: formatNumber(cluster.groupsCount) },
    { k: t("الحجاج", "Pilgrims"), v: formatNumber(cluster.pilgrims) },
    { k: t("الإداريون", "Administrators"), v: formatNumber(team.size) },
    { k: t("المنسقون والموجّهات", "Coordinators and female guides"), v: `${formatNumber(team.coordinators.length)} · ${formatNumber(team.femaleGuides.length)}` },
  ];
  return (
    <div className="rounded-[2rem] border border-gold/30 bg-white p-6">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
        <Crown className="size-5 text-gold-dark" /> {t("بطاقة التكتل", "The cluster at a glance")}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.k} className="flex justify-between gap-3 rounded-xl bg-sand px-3 py-2">
            <dt className="text-ink-soft">{r.k}</dt>
            <dd className="text-end font-bold text-ink">{r.v}</dd>
          </div>
        ))}
      </dl>
      {earned.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {earned.map((b) => (
            <span key={b.key} title={t(b.hintAr, b.hintEn)} className="inline-flex items-center gap-1 rounded-full bg-green-dark px-2.5 py-1 text-[11px] font-bold text-white">
              <b.icon className="size-3 text-gold" /> {t(b.ar, b.en)}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs leading-6 text-hint">{t("من طلب التكتل الذي اعتمدته الإدارة في منصة الإداريين.", "From the cluster's request as the Administration approved it on the administrators' platform.")}</p>
    </div>
  );
}

function seatsLeft(n: number, t: (ar: string, en: string) => string) {
  if (n === 0) return t("مكتملة", "Full");
  if (n === 1) return t("بقي مقعد واحد", "1 place left");
  if (n === 2) return t("بقي مقعدان", "2 places left");
  return t(`بقي ${n} ${n <= 10 ? "مقاعد" : "مقعداً"}`, `${n} places left`);
}

/** «موجّه ديني ب: الشيخ خالد الرفاعي» — the people of a group's seats */
function SeatLine({ label, people }: { label: string; people: TeamMember[] }) {
  const word = useWord();
  if (!people.length) return null;
  return (
    <li className="flex flex-wrap gap-x-1.5">
      <span className="text-hint">{label}:</span>
      {people.map((m, i) => (
        <span key={m.id} className="font-semibold text-ink">
          <bdi>{m.name}</bdi>
          {m.role && <span className="font-normal text-ink-soft"> ({word(m.role)})</span>}
          {i < people.length - 1 && "،"}
        </span>
      ))}
    </li>
  );
}

/** Every group of the cluster with its head, the guides and assistants in its seats, its coordinator and female guide, and the seats left */
export function ClusterGroupsCard({ groups }: { groups: TeamGroup[] }) {
  const t = useT();
  return (
    <Card className="md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <Users className="size-6 text-gold-dark" /> {t("مجموعات التكتل وفرقها", "The cluster's groups and their teams")}
      </h2>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        {t(
          "للاطلاع: الالتحاق بمجموعة لا يكون من المنصة. تتفق مع المجموعة، وتوقّع عقدك معها في المكتب، فيلحقك موظف المكتب بها. لكل مجموعة رئيسها وفريقها وسعتها بفئتها في مستوى التكتل.",
          "For information: you do not join a group through the platform. You agree with the group and sign your contract with it at the office, and the office staff add you to it. Each group has its head, its team and a capacity set by its category in the cluster's tier.",
        )}
      </p>
      <ul className="mt-4 space-y-3">
        {groups.map((g, i) => {
          const remaining = Math.max(0, g.capacity - g.pilgrims);
          const pct = Math.min(100, Math.round((g.pilgrims / Math.max(1, g.capacity)) * 100));
          return (
            <motion.li key={g.no} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05 }} className="rounded-2xl border-2 border-gold/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">
                    {groupName(g.no)} <span className="text-xs font-semibold text-gold-dark">· {g.category}</span>
                    {g.own && <span className="ms-1 text-xs font-semibold text-maroon">· {t("مجموعة رئيس التكتل", "the head's own group")}</span>}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {t("رئيسها: ", "Head: ")}
                    <bdi className="font-semibold text-green-dark">{g.head.name}</bdi>
                  </p>
                  <Experience m={g.head} />
                </div>
                <Badge tone={remaining === 0 ? "maroon" : remaining <= 5 ? "gold" : "green"}>{seatsLeft(remaining, t)}</Badge>
              </div>
              <ul className="mt-3 space-y-1 text-xs leading-6">
                <SeatLine label={t("الموجّه", "Guide")} people={g.guides} />
                <SeatLine label={t("المعاون", "Assistant")} people={g.assistants} />
                {g.coordinator && (
                  <li>
                    <span className="text-hint">{t("المنسق التقني: ", "Technical coordinator: ")}</span>
                    <bdi className="font-semibold text-ink">{g.coordinator}</bdi>
                  </li>
                )}
                {g.femaleGuide && (
                  <li>
                    <span className="text-hint">{t("موجّهة الحاجّات: ", "Guide for the women: ")}</span>
                    <bdi className="font-semibold text-ink">{g.femaleGuide}</bdi>
                  </li>
                )}
              </ul>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sand">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: Math.min(i, 8) * 0.05 }} className={cn("h-full", remaining === 0 ? "bg-maroon" : "bg-green-light")} />
              </div>
              <p className="mt-1 text-xs text-hint">{t(`${g.pilgrims} من ${g.capacity} مقعداً مشغولة`, `${g.pilgrims} of ${g.capacity} places taken`)}</p>
            </motion.li>
          );
        })}
      </ul>
    </Card>
  );
}
