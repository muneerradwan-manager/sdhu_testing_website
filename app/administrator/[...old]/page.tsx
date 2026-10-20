import { MovedTo } from "./moved";

/**
 * The administrators' pages moved into the one account area: the account is one, whether its holder is a pilgrim or
 * an administrator this season, and so are its addresses. An old address (a bookmark, a link in a message) leads to
 * the page's new one.
 */
const SPECIAL: Record<string, string> = { dashboard: "/portal", apply: "/portal/role", lessons: "/portal/guide-lessons", notifications: "/portal/notifications", activity: "/portal/activity", academy: "/portal/academy" };
const DESK = ["exam", "groups", "clusters", "requests", "my-contracts", "group", "cluster", "field", "channel", "lists", "letters", "flights", "visas", "pilgrims", "group-page", "files", "evaluation", "cluster-page", "activities"];

export function generateStaticParams() {
  return [...Object.keys(SPECIAL), ...DESK].map((p) => ({ old: [p] }));
}

export default async function OldAdministratorPage({ params }: { params: Promise<{ old: string[] }> }) {
  const [first, ...rest] = (await params).old;
  const base = SPECIAL[first] ?? (DESK.includes(first) ? `/portal/${first}` : "/portal");
  return <MovedTo href={[base, ...rest].join("/")} />;
}
