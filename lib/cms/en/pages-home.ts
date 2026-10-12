import type { PagesEn } from "./index";

/** The home page in English (CMS page "home", lib/cms/schema.ts HOME) */
export const PAGES_EN_HOME: PagesEn = {
  home: {
    hero: {
      badge: "Registration for the 1448 AH Hajj season is now open",
      titleWords: [
        { word: "Your", highlight: false },
        { word: "lifetime", highlight: true },
        { word: "journey", highlight: false },
        { word: "starts", highlight: false },
        { word: "here", highlight: false },
      ],
      description:
        "One platform with you all the way: from creating your account with your national number, to the lottery and acceptance, then the hotel, the flight and the camp, until you return safely to your family.",
      primaryLabel: "Start your Hajj application",
      secondaryLabel: "Register as an administrator",
      trust: [{ text: "Your details come straight from the Civil Registry" }, { text: "A public lottery, streamed live" }],
      soundOn: "Close the live stream",
      soundOff: "Live from the Haram",
      scrollHint: "Discover more",
      countdownEyebrow: "Countdown",
      countdownTitle: "To the Day of Arafah 1448 AH",
      rows: [
        { label: "Direct acceptance registration", value: "12 – 25 August", live: true },
        { label: "Direct acceptance lists approved", value: "26 August", live: false },
        { label: "Lottery pre-registration", value: "26 August – 10 September", live: false },
        { label: "The public lottery", value: "Saturday 26 September — Deir ez-Zor", live: false },
      ],
    },
    ticker: {
      label: "Breaking",
      items: [
        { text: "Direct acceptance registration (oldest applicants first) for the 1448 AH Hajj season: 12 – 25 August" },
        { text: "Lottery pre-registration, as a separate application: 26 August – 10 September — the public lottery is on Saturday 26 September in Deir ez-Zor" },
        { text: "Warning: no seat is guaranteed in exchange for money — check approved agencies on the platform" },
        { text: "Registration fee: $25 per person, with a digital receipt you can verify" },
        { text: "New in the religious lessons Academy: the «Fiqh of Hajj» track — 18 lessons at three levels" },
      ],
    },
    services: {
      eyebrow: "Open to everyone, no sign-in needed",
      title: "Everything you need in one place",
      description:
        "Browse the news, the Academy, prayer times and admission results freely. We only ask you for an account when you submit your application.",
      items: [
        { href: "/register", icon: "UsersRound", title: "Apply for Hajj", text: "For you and your family, in simple steps", tone: "gold" },
        { href: "/results", icon: "FileSearch", title: "Admission results", text: "Search by your national number", tone: "green" },
        { href: "/academy", icon: "BookOpenText", title: "Lessons Academy", text: "Video, audio and summaries", tone: "green" },
        { href: "/guide", icon: "NotebookTabs", title: "Hajj rites guide", text: "Day by day, with the duas", tone: "green" },
        { href: "/prayer-times", icon: "Clock3", title: "Prayer times", text: "And the Qibla direction for your city", tone: "green" },
        { href: "/conditions", icon: "ScrollText", title: "Conditions and costs", text: "With a quick eligibility check", tone: "green" },
        { href: "/verify", icon: "ShieldCheck", title: "Verify agencies", text: "Receipts and certificates too", tone: "maroon" },
        { href: "/news", icon: "Megaphone", title: "Official announcements", text: "The Administration's decisions and circulars", tone: "green" },
      ],
    },
    umrahTeaser: {
      title: "Umrah services",
      badge: "Coming soon",
      text: "We are adding registration for Umrah trips, approved agencies and application tracking. Until then, the «Fiqh of Umrah» track is available in the Academy.",
      ctaLabel: "Learn more",
    },
    journey: {
      eyebrow: "How does the platform work?",
      title: "Your journey in six clear stages",
      description:
        "No need to visit the office or ask what comes next: each stage appears in your account with its date and what you need to do.",
      steps: [
        {
          icon: "UserRoundPlus",
          title: "Create your account",
          text: "Just your national number and phone number — your details arrive from the Civil Registry for you to confirm.",
          when: "Two minutes",
        },
        {
          icon: "FileSignature",
          title: "Direct acceptance registration",
          text: "An application for acceptance by age, oldest first, for 65% of the quota, open to those born in 1958 or earlier. Simple questions, one at a time, and you add your family from the family booklet or by national number.",
          when: "12 – 25 August",
        },
        {
          icon: "ScanSearch",
          title: "Checks and announcing the ages",
          text: "The platform applies the season's conditions to each person and explains any note to you, including the direct acceptance age, before you pay anything.",
          when: "Until 26 August",
        },
        {
          icon: "Ticket",
          title: "Lottery pre-registration",
          text: "A separate registration with a new application for everyone eligible, including those not accepted directly. A public lottery then fills 35% of the quota: birth years and months are drawn, and those selected confirm their registration with the first instalment.",
          when: "26 August – 10 September · Lottery 26 September",
        },
        {
          icon: "BadgeCheck",
          title: "Preparation and payment",
          text: "Joining a group with a contract that is uploaded and approved, receipts, the visa, and the religious lessons before you travel.",
          when: "October – Dhu al-Qa'dah",
        },
        {
          icon: "Plane",
          title: "Travel and return",
          text: "The flight, the hotel, the camp, and your digital card in your pocket throughout the journey.",
          when: "24 Dhu al-Qa'dah – 23 Dhu al-Hijjah",
        },
      ],
    },
    numbers: {
      eyebrow: "The 1448 AH season in numbers",
      title: "Full transparency in every number",
      items: [
        { value: 22500, label: "Total quota", sub: "Pilgrims, men and women" },
        { value: 72420, label: "Applied for direct acceptance", sub: "By the close of registration on 25 August" },
        { value: 14625, label: "Direct acceptance", sub: "65% for the oldest applicants" },
        { value: 7875, label: "Through the public lottery", sub: "35% by public draw" },
      ],
    },
    academy: {
      eyebrow: "Religious Lessons Academy",
      title: "Learn your rites before you travel",
      description:
        "Ordered tracks with video, audio and a written summary, available all year round. Create an account to track your progress and receive a certificate of completion.",
      videoBadge: "Video • 13 seconds",
      videoTitle: "Scenes from Tawaf al-Ifadah",
      videoNote: "From the «Fiqh of Hajj» track — Level two: Tawaf and Sa'i",
      stats: [
        { n: "6", l: "tracks" },
        { n: "18", l: "lessons in the Fiqh of Hajj" },
        { n: "24/7", l: "always available" },
      ],
      ctaLabel: "Enter the Academy",
      prayerEyebrow: "Prayer times",
      prayerTitle: "Pray on time, wherever you are",
      prayerDescription: "Damascus, Aleppo, Makkah and Madinah, with a countdown to the next prayer.",
    },
    verse: {
      source: "Surat al-Hajj — verse 27",
      alt: "Mount Arafat (Jabal al-Rahmah) at Arafah",
    },
    news: {
      eyebrow: "The Administration's blog",
      title: "Latest news and announcements",
      ctaLabel: "All news",
    },
    calendar: {
      eyebrow: "Season calendar",
      title: "Dates of the 1448 AH Hajj season",
      description:
        "The Administration sets these dates in the season settings, and you receive personal reminders of them once you have created your account.",
      dates: [
        {
          hijri: "29 Safar – 12 Rabi' al-Awwal",
          gregorian: "12 – 25 August 2026",
          title: "Hajj registration — direct acceptance (65% — born in 1958 or earlier)",
          who: "The pilgrim or whoever registers them",
        },
        { hijri: "13 Rabi' al-Awwal", gregorian: "26 August 2026", title: "Direct acceptance lists approved", who: "The pilgrim" },
        {
          hijri: "13 – 28 Rabi' al-Awwal",
          gregorian: "26 August – 10 September 2026",
          title: "Hajj registration — lottery pre-registration (35%): a separate application",
          who: "The pilgrim or whoever registers them",
        },
        {
          hijri: "15 Rabi' al-Thani",
          gregorian: "Saturday 26 September 2026",
          title: "The public lottery in Deir ez-Zor: birth years are drawn, and months for some of them",
          who: "The pilgrim",
        },
        {
          hijri: "30 Rabi' al-Thani – 16 Jumada al-Ula",
          gregorian: "11 – 27 October 2026",
          title: "Those selected confirm their registration with the first instalment ($3,500) and upload their documents",
          who: "The pilgrim",
        },
        {
          hijri: "2 Jumada al-Akhirah – 7 Sha'ban (estimated)",
          gregorian: "12 November 2026 – 15 January 2027",
          title: "Joining a group with a contract uploaded by its leader or coordinator and approved by the office, then the second instalment",
          who: "The pilgrim + the group",
        },
        { hijri: "1 – 15 Dhu al-Qa'dah", gregorian: "8 – 22 April 2027", title: "Visas issued and flights assigned", who: "The staff" },
        { hijri: "24 Dhu al-Qa'dah", gregorian: "1 May 2027", title: "Departure: Damascus → Jeddah → Makkah", who: "Everyone" },
        { hijri: "8 – 12 Dhu al-Hijjah", gregorian: "14 – 18 May 2027", title: "The holy sites", who: "Everyone" },
        { hijri: "23 Dhu al-Hijjah", gregorian: "29 May 2027", title: "Return: Madinah → Damascus", who: "Everyone" },
      ],
    },
    cta: {
      title: "Ready to apply?",
      titleHighlight: "We are with you every step",
      text: "The questions are clear, large and read aloud, so that older pilgrims can submit their application themselves without help.",
      primaryLabel: "Create a pilgrim account",
      secondaryLabel: "Check your eligibility first",
      points: [
        { text: "Just your national number and phone number" },
        { text: "Your details come from the Civil Registry" },
        { text: "Add your family from the family booklet" },
        { text: "Follow your application every step of the way" },
      ],
    },
  },
};
