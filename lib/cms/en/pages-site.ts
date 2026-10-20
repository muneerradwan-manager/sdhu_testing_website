import type { PagesEn } from "./index";

/** The site's identity, menus and footer in English (CMS page "global", lib/cms/schema.ts GLOBAL) */
export const PAGES_EN_SITE: PagesEn = {
  global: {
    identity: {
      name: "National Hajj Platform",
      authority: "Syrian Directorate of Hajj and Umrah",
      season: "1448 AH season",
    },
    nav: {
      items: [
        { href: "/", label: "Home" },
        { href: "/academy", label: "Academy" },
        { href: "/guide", label: "Hajj Guide" },
        { href: "/prayer-times", label: "Prayer Times" },
        { href: "/news", label: "News" },
        { href: "/clusters", label: "Clusters and groups" },
        { href: "/about", label: "About" },
      ],
      more: [
        { href: "/umrah", label: "Umrah", note: "Umrah services on the platform", soon: true },
        { href: "/results", label: "Admission results", note: "Search with your national number", soon: false },
        { href: "/conditions", label: "Conditions and costs", note: "With a quick eligibility check", soon: false },
        { href: "/faq", label: "FAQ", note: "Approved answers, sorted and searchable", soon: false },
        { href: "/verify", label: "Verify agencies and documents", note: "Approved campaigns, receipts, certificates", soon: false },
        { href: "/3d", label: "3D tour", note: "The Two Holy Mosques, the holy sites, Aisha and Quba mosques", soon: false },
        { href: "/honours", label: "Hall of Honour", note: "The distinguished and the best group heads of every season", soon: false },
        { href: "/administrator/job-descriptions", label: "Staff references", note: "Job descriptions, the administrative system, decisions, contracts, operating plans", soon: false },
      ],
    },
    footer: {
      about:
        "One platform for the whole Hajj journey: from creating your account, registering and the lottery, to accommodation, flights and the holy sites, until you return home safely.",
      col1Title: "Public portal",
      col2Title: "Pilgrim services",
      col2: [
        { label: "Create an account", href: "/register" },
        { label: "Apply for Hajj", href: "/portal/apply" },
        { label: "Track your application", href: "/portal/application" },
        { label: "Staff references", href: "/administrator/job-descriptions" },
        { label: "Staff portal", href: "/staff" },
      ],
      contactTitle: "Contact us",
      address: "Damascus — Mezzeh, Mezzeh Highway, Administration Building (fictitious address)",
      hours: "Office hours: Sunday – Thursday, 8:30 am – 3:30 pm",
      social: [
        { label: "Facebook", network: "facebook", href: "#" },
        { label: "YouTube", network: "youtube", href: "#" },
        { label: "Telegram", network: "telegram", href: "#" },
      ],
      legal: "© 1448 AH season — a demo platform for display only. It does not represent any official body and collects no real data.",
      credits: "Photos and videos from Wikimedia Commons under open licences",
    },
  },
};
