import type { PagesEn } from "./index";

/** «من نحن», «شروط التسجيل والتكاليف», «نتائج القبول», «التحقق» in English (see ./index.ts) */
export const PAGES_EN_INFO: PagesEn = {
  // ═══════════════════════════ About ═══════════════════════════
  about: {
    hero: {
      title: "About",
      highlight: "us",
      description:
        "The Syrian Hajj and Umrah Administration: we serve the guests of the Most Merciful from their homes in the governorates until they return safely, under published rules and on one national platform.",
      crumb: "About us",
    },
    intro: {
      badge: "From Damascus to the Two Holy Mosques",
      title: "Serving the pilgrim is a trust,",
      titleAccent: "and fairness",
      titleTail: "is how we keep it",
      p1: "Every year, thousands of Syrian pilgrims set out on their journey from near the Umayyad Mosque in Damascus. We are the body that organises that journey: we open two separate registrations, accepting pilgrims by age, oldest first, in the first and by a public lottery in the second. We qualify the administrators, approve the clusters, and stay with the pilgrims in Makkah, Madinah and the holy sites until they return home.",
      p2: "For the 1448 AH season we brought all of this together on the National Hajj Platform: one clear place for citizens, administrators and staff, which protects everyone's rights and shows every step.",
      cta1Label: "Contact us",
      cta2Label: "Find your nearest branch",
      imageMainCaption: "The Umayyad Mosque — Damascus",
      imageTopAlt: "The Holy Kaaba",
      imageBottomAlt: "The Prophet's Mosque",
      badgeLabel: "1448 AH season quota",
      badgeSub: "pilgrims",
    },
    pillars: {
      items: [
        {
          title: "Our vision",
          icon: "Eye",
          text: "That every Syrian pilgrim performs Hajj with peace of mind and dignity, through a fair and transparent service that begins at home and ends with a safe return.",
        },
        {
          title: "Our mission",
          icon: "Target",
          text: "To organise Hajj and Umrah from registration to return on one national platform, with published rules, fair acceptance, follow-up in the field and a real evaluation of every stage.",
        },
        {
          title: "Our values",
          icon: "Gem",
          text: "Fairness in acceptance, transparency in what we publish, the elderly served first, data protection, and accountability through evaluation.",
        },
      ],
      values: [
        { title: "Fairness", text: "One registration for direct acceptance, oldest first, and a separate one for a public lottery — with no exceptions." },
        { title: "Transparency", text: "Lists and decisions are published, and every action is recorded." },
        { title: "Service", text: "The pilgrim comes first, and the elderly before all." },
        { title: "Integrity", text: "A receipt for every fee, and a signed contract for every agreement." },
        { title: "Privacy", text: "We never show personal information on the public portal." },
        { title: "Improvement", text: "Every stage is evaluated, and the results are actually used." },
      ],
    },
    stats: {
      eyebrow: "In numbers",
      title: "One season, thousands of stories",
      items: [
        { value: 22500, label: "pilgrims in the 1448 AH quota" },
        { value: 8, label: "branches in the governorates" },
        { value: 36, label: "approved clusters" },
        { value: 1240, label: "qualified seasonal administrators" },
        { value: 9, label: "specialised departments" },
        { value: 4, label: "field missions" },
      ],
    },
    history: {
      eyebrow: "Our journey",
      title: "From paper records to a national platform",
      description: "The milestones that shaped how we serve pilgrims today.",
      items: [
        { year: "2016", hijri: "1437 AH", title: "The Administration is founded", text: "Work began from a single office in Damascus, with paper records and local committees." },
        { year: "2019", hijri: "1440 AH", title: "The first electronic archive", text: "Pilgrims' files moved to a single database, and numbered receipts were introduced." },
        { year: "2022", hijri: "1443 AH", title: "The public lottery", text: "For the first time, the lottery was held live on air before a supervision and audit committee." },
        { year: "2024", hijri: "1445 AH", title: "More branches", text: "New branches opened in the governorates to bring the office closer to every pilgrim." },
        { year: "2025", hijri: "1446 AH", title: "The complete operating document", text: "The journeys of the pilgrim, the administrator and the staff were written down stage by stage, in preparation for the platform." },
        { year: "2026", hijri: "1448 AH", title: "The National Hajj Platform is launched", text: "One platform for registration, acceptance, the Academy, follow-up and evaluation." },
      ],
    },
    leaders: {
      eyebrow: "Leadership",
      title: "The team leading the season",
      description: "Fictional names, for demonstration only.",
      items: [
        { name: "د. عبد الله الشامي", initials: "ع ش", role: "Director General", note: "Oversees the Administration and its annual plans", photo: "" },
        { name: "سهى الخطيب", initials: "س خ", role: "Season Director", note: "Sets up the season and approves the results", photo: "" },
        { name: "مازن الحلبي", initials: "م ح", role: "Head of the Damascus Office", note: "Final approval of clusters and contracts", photo: "" },
        { name: "طارق مصطفى", initials: "ط م", role: "Head of Audit", note: "Reviews the event log and the appeals", photo: "" },
        { name: "رنا العمر", initials: "ر ع", role: "Registration Director", note: "Registration conditions and lists from abroad", photo: "" },
        { name: "هيثم السيد", initials: "هـ س", role: "Head of Transport", note: "Flights, ground transport and the operations room", photo: "" },
      ],
    },
    departments: {
      eyebrow: "Structure",
      title: "Nine departments, one goal",
      description: "Each department is responsible for a clear part of the pilgrim's journey, and every member of staff is given permissions one by one.",
      items: [
        { title: "Registration", icon: "ClipboardList", text: "Receives applications, checks documents and verifies eligibility." },
        { title: "Seasons", icon: "CalendarRange", text: "Sets the quota, fees and dates, and issues the acceptance results." },
        { title: "Audit", icon: "ShieldCheck", text: "Reviews the event log and appeals, and safeguards integrity." },
        { title: "Operations Room", icon: "Radar", text: "Follows pilgrims in real time and responds to emergencies in the field." },
        { title: "Administrators' Affairs", icon: "UserCog", text: "Tests, qualifies and evaluates the administrators." },
        { title: "Finance", icon: "Wallet", text: "Receipts, payments, share-based accounting and refunds." },
        { title: "Religious Affairs", icon: "BookOpen", text: "The Academy, lessons before travel, and guidance at the holy sites." },
        { title: "Transport", icon: "Plane", text: "Flight contracts, allocation of flights and travel between cities." },
        { title: "Medical Team", icon: "Stethoscope", text: "Check-ups, vaccinations and health care throughout the journey." },
      ],
    },
    accounts: {
      eyebrow: "Account types",
      title: "Three parties, one account per person",
      description: "Everyone on the platform has exactly one type of account and never two. Visitors browse the public content without an account.",
      featuredBadge: "Most common",
      items: [
        {
          title: "Pilgrim",
          icon: "UserRound",
          tagline: "A citizen applying for Hajj",
          who: "A citizen applying for Hajj, or whose application has been accepted",
          create: "Created by the citizen with their national number",
          permissions: "No administrative permissions; sees only their own and their family's data",
          travel: "Yes, if accepted",
          duration: "Linked to their application each season",
        },
        {
          title: "Seasonal administrator",
          icon: "BriefcaseBusiness",
          tagline: "Serves pilgrims during the season",
          who: "A cluster or group leader and their two assistants, the guide, and the technical coordinator",
          create: "Created by the administrator, who then pays a registration fee and takes the automated test",
          permissions: "Come automatically from their role in the season, and change when the role changes",
          travel: "Always, with their pilgrims",
          duration: "Seasonal; renewed by applying for each season",
        },
        {
          title: "Permanent staff",
          icon: "IdCard",
          tagline: "Works in the Administration's offices",
          who: "Registration, seasons, audit, operations or transport staff…",
          create: "Not self-created; opened by a member of staff with that permission",
          permissions: "Granted one by one, according to their work",
          travel: "Only some, in field roles",
          duration: "Permanent; does not end with the season",
        },
      ],
      rows: [
        { key: "who", label: "Who is it?" },
        { key: "create", label: "How is the account created?" },
        { key: "permissions", label: "Permissions" },
        { key: "travel", label: "Travels to Hajj?" },
        { key: "duration", label: "Account duration" },
      ],
    },
    missions: {
      eyebrow: "In the field",
      title: "The four missions",
      description: "Approved by the Administration and stationed across the hotel towers and camps to monitor the clusters' work and serve the pilgrims.",
      items: [
        { title: "Administrative Mission", icon: "Landmark", text: "Checks that the clusters provide housing, transport and meals as their contracts require.", image: "/images/mina-tents.jpg" },
        { title: "Religious Mission", icon: "BookOpen", text: "Guides pilgrims through the rites and answers their questions at the holy sites.", image: "/images/jabal-rahmah.jpg" },
        { title: "Medical Mission", icon: "HeartPulse", text: "Field clinics, and follow-up for the elderly and people with chronic illness.", image: "/images/pilgrim-dua.jpg" },
        { title: "Media Mission", icon: "Camera", text: "Documents the season, reassures families at home and shares instructions as they come.", image: "/images/jamarat.jpg" },
      ],
    },
    principles: {
      eyebrow: "Platform principles",
      title: "The rules that govern everything",
      description: "Fixed principles the National Hajj Platform is built on, from opening an account to archiving the season.",
      items: [
        { title: "The national number is the citizen's key", text: "Official details come from the Civil Registry; if the link is unavailable, the citizen enters them and a member of staff verifies them." },
        { title: "One account type per person", text: "Pilgrim, administrator or staff — never two at once." },
        { title: "The season is the framework", text: "Every rule, quota and role belongs to a season, and may differ in the next one." },
        {
          title: "Two separate registrations for acceptance",
          text: "A registration for direct acceptance, oldest first (65% of the quota), then a separate registration with a new application for a public lottery (35%), whose results are approved and published with a complete record.",
        },
        { title: "The pilgrim sees what concerns them", text: "Anything not yet decided shows as «Not decided yet» instead of disappearing." },
        { title: "Every stage is evaluated", text: "The pilgrim rates every stage, administrators and clusters are rated, and the results are actually used." },
        { title: "An append-only event log", text: "Every action is recorded under the name of whoever did it, and only those with permission can see it." },
        { title: "A receipt for every fee, a contract for every agreement", text: "Separate, verifiable digital receipts, and contracts signed electronically and certified by the Administration." },
        { title: "Visitors first", text: "Everything public is available without an account; an account is only needed for what concerns the person themselves." },
        { title: "Conditions set from the admin panel", text: "They are set for each season, and these never change: Muslim and Syrian, has not performed Hajj before, and not suffering from a terminal illness." },
      ],
    },
    branches: {
      eyebrow: "Branch directory",
      title: "Close to you in every governorate",
      description: "Choose a branch to see it on the map, with its address, opening hours and phone number.",
      items: [
        {
          slug: "damascus",
          name: "Head Office — Damascus, Mezzeh",
          city: "Damascus",
          lat: 33.5006,
          lng: 36.2495,
          address: "Mezzeh, Mezzeh Highway, next to Al-Jalaa Park, Building 14",
          hours: "Sunday – Thursday, 8:00 am – 3:00 pm",
          phone: "011 612 4490",
          head: true,
        },
        { slug: "aleppo", name: "Aleppo Branch", city: "Aleppo", lat: 36.2085, lng: 37.1467, address: "Al-Jamiliyah, Al-Quwatli Street, opposite the Central Post Office", hours: "Sunday – Thursday, 8:00 am – 2:30 pm", phone: "021 221 7735", head: false },
        { slug: "homs", name: "Homs Branch", city: "Homs", lat: 34.7308, lng: 36.7094, address: "Al-Hadara Street, near the New Clock Roundabout", hours: "Sunday – Thursday, 8:00 am – 2:30 pm", phone: "031 247 1102", head: false },
        { slug: "hama", name: "Hama Branch", city: "Hama", lat: 35.1333, lng: 36.7519, address: "Al-Asi Square, Abi al-Fida Street, first floor", hours: "Sunday – Thursday, 8:00 am – 2:30 pm", phone: "033 251 6640", head: false },
        { slug: "latakia", name: "Latakia Branch", city: "Latakia", lat: 35.5196, lng: 35.7897, address: "8 March Street, near Sheikh Daher Square", hours: "Sunday – Thursday, 8:00 am – 2:30 pm", phone: "041 247 3318", head: false },
        { slug: "daraa", name: "Daraa Branch", city: "Daraa", lat: 32.6254, lng: 36.1057, address: "Daraa al-Mahatta, Al-Shuhada Street, Government Complex building", hours: "Sunday – Thursday, 8:00 am – 2:00 pm", phone: "015 223 9051", head: false },
        { slug: "deir-ez-zor", name: "Deir ez-Zor Branch", city: "Deir ez-Zor", lat: 35.3359, lng: 40.1408, address: "Al-Takaya Street, near the Suspension Bridge", hours: "Sunday – Thursday, 8:00 am – 2:00 pm", phone: "051 222 4867", head: false },
        { slug: "idlib", name: "Idlib Branch", city: "Idlib", lat: 35.9306, lng: 36.6339, address: "City centre, Al-Jalaa Street, next to the Cultural Centre", hours: "Sunday – Thursday, 8:00 am – 2:00 pm", phone: "023 255 1470", head: false },
      ],
    },
    contact: {
      eyebrow: "Contact us",
      title: "We listen and we reply",
      description: "Send us your question or comment, and you will get a ticket number to follow up on your message.",
      subjects: [
        { text: "Question about registration" },
        { text: "Acceptance and lottery results" },
        { text: "Fees and receipts" },
        { text: "Report a fake organisation" },
        { text: "Working as an administrator" },
        { text: "Suggestion or complaint" },
      ],
      channels: [
        { label: "Call centre", icon: "Headset", value: "9449", note: "Daily, 8 am to 8 pm", ltr: true },
        { label: "Head Office", icon: "Phone", value: "011 612 4490", note: "Sunday – Thursday", ltr: true },
        { label: "Email", icon: "Mail", value: "info@hajj.gov.sy.demo", note: "We reply within two working days", ltr: true },
        { label: "Address", icon: "Building2", value: "Damascus — Mezzeh", note: "Mezzeh Highway, next to Al-Jalaa Park", ltr: false },
      ],
      warningTitle: "Warning",
      warningText: "The Administration's staff will never ask you for a verification code or any payment over the phone.",
    },
  },

  // ═══════════════════════════ Conditions and costs ═══════════════════════════
  conditions: {
    hero: {
      title: "Registration conditions",
      highlight: "and costs",
      description:
        "Everything you need to know before applying for the 1448 AH season: the conditions, the limits of an application, the fees, how acceptance works, and the season's dates. The Administration approves the conditions and publishes them before registration opens.",
      crumb: "Conditions and costs",
    },
    basics: {
      eyebrow: "The same every season",
      title: "The basic conditions",
      description: "Four conditions that never change from one season to the next, and apply to every person in the application.",
    },
  },

  // ═══════════════════════════ Acceptance results ═══════════════════════════
  results: {
    hero: {
      title: "Acceptance results",
      highlight: "1448 AH",
      description:
        "The results of both registrations are approved and published for everyone: direct acceptance by age, oldest first, and the table of birth years and months drawn in the lottery. Search with your national number, or browse the table and the public lists.",
      crumb: "Acceptance results",
    },
    search: {
      eyebrow: "Search by national number",
      title: "Have you been accepted?",
      description: "Enter your full national number and the verification code. The result appears straight away, with no account needed.",
    },
    charts: {
      eyebrow: "Open statistics",
      title: "Acceptance in numbers",
      description: "Aggregated figures only, updated automatically with every approved publication.",
    },
    lists: {
      eyebrow: "Public results",
      title: "Lottery results and direct acceptances",
      description:
        "The lottery is published as a table of birth years and months, and direct acceptance as a list of names under each application number. National numbers are masked, and no other details are shown.",
    },
  },

  // ═══════════════════════════ Verification ═══════════════════════════
  verify: {
    hero: {
      title: "Verify",
      highlight: "organisations and documents",
      description:
        "Before you pay anything or rely on any paper: make sure the organisation is approved for the season, and that the receipt or certificate was really issued by the platform.",
      crumb: "Verify organisations and documents",
    },
  },
};
