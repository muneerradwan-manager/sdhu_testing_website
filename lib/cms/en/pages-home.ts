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
    tutorials: {
      eyebrow: "Video tutorials",
      title: "How do you use the platform?",
      description: "A short video for each user that walks you through the screens in order: what you see, where you click, and what happens next.",
      tabs: [
        {
          label: "Visitor, then pilgrim",
          title: "From visiting the platform to tracking your application",
          duration: "",
          text: "You start as a visitor with no account: the conditions and costs, the eligibility check, the results, the Academy and prayer times. Then you create a pilgrim account, apply, and follow your application until you travel.",
          points: "The public portal, no account needed\nThe quick eligibility check\nCreating a pilgrim account with your national ID\nApplying and adding your family\nTracking the application and the steps after acceptance",
        },
        {
          label: "Administrator",
          title: "The platform for group heads and the administrative staff",
          duration: "",
          text: "From creating an administrator account and registering for a role this season, to the exam and forming the group and the cluster, then working with your group's pilgrims in the field.",
          points: "Creating an administrator account\nRegistering for a role and the registration fee\nThe automated exam and its result\nForming the group and the cluster\nThe group's pilgrims and the field",
        },
      ],
    },
    directory: {
      eyebrow: "Clusters and groups",
      title: "Choose your group from the approved clusters",
      description: "A glance at this season's approved clusters and their groups: their programmes and housing, their groups' heads and the places left.",
      ctaLabel: "See all clusters and groups",
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
  },
  "pilgrim-journey": {
    journey: {
      eyebrow: "From creating your account to coming home",
      title: "Your trip programme",
      description:
        "From creating your account to coming home: what you do at each stage, when, and where to find it in your account. No need to visit the office to know your next step.",
      steps: [
        {
          icon: "UserRoundPlus",
          title: "Create your account",
          text: "Browse the platform as a visitor with no account. Then create yours with your national number, a password and a code sent to your phone; your details arrive from the Civil Registry for you to confirm, and you can ask for a correction if anything is wrong.",
          when: "Any time — two minutes",
        },
        {
          icon: "FileSignature",
          title: "Direct acceptance registration",
          text: "For those born in 1958 or earlier and their companions, on 65% of the quota, oldest first. Apply from «Apply for Hajj», one question per screen, add your family from the family booklet or by national number, and pay the registration fee.",
          when: "12 – 25 August",
        },
        {
          icon: "Ticket",
          title: "Lottery pre-registration",
          text: "For everyone eligible who was not accepted directly: a separate application for the registration fee alone, with the same people in one click if you had a direct application.",
          when: "26 August – 10 September",
        },
        {
          icon: "Dices",
          title: "The public draw and your result",
          text: "A draw on 35% of the quota, broadcast live: birth years are drawn, some with their months. Your result appears in «My application», you get a notification, and the acceptance notice is kept in «Document vault».",
          when: "Saturday 26 September",
        },
        {
          icon: "BadgeCheck",
          title: "Confirm acceptance and the first instalment",
          text: "Confirm your acceptance; those accepted by lottery confirm their registration with the first instalment, then upload each member's photo. All the steps after acceptance are in «My application», opening one after another.",
          when: "11 – 27 October",
        },
        {
          icon: "FolderLock",
          title: "Document vault",
          text: "All your documents in one place and one design: the acceptance notice, the contract, a receipt for every payment, both flight tickets, and for each member the digital card, visa, passport and photo. Issued ones open and print; the rest say when they come.",
          when: "From confirmation until the return",
        },
        {
          icon: "UsersRound",
          title: "Join a group and sign the contract",
          text: "Choose a group from «Clusters and groups», agree with it, and sign the contract at the office, where its employee attaches you to it together. Your group and its team are in «My group», and your contract in «Document vault».",
          when: "12 November – 15 January",
        },
        {
          icon: "Receipt",
          title: "Second instalment, passport and medical file",
          text: "Pay the second instalment and the sacrifice, each with its own receipt, then upload each member's passport, and the medical documents and vaccines the group's coordinator follows.",
          when: "After the contract is approved",
        },
        {
          icon: "BookOpenText",
          title: "Religious lessons and activities",
          text: "«Religious lessons» has your group guide's lessons and the cluster's female guide's lessons for women: say who will come and see your family's attendance. «Religious activities» has Quran memorisation circles, an-Nawawi's forty hadith, the Hajj supplications and the shared reading of the Quran; join them and see each member's recitation record.",
          when: "Before travel and in Makkah",
        },
        {
          icon: "Stamp",
          title: "Visa and flight",
          text: "Your group head adds each member's visa as the Saudi foreign ministry sends it, and your cluster head puts you on a flight from the cluster's days. The visa and each member's digital card are in «Document vault»; the flight and hotels in «Trip and cards» and «Hotels».",
          when: "1 – 15 Dhul Qadah",
        },
        {
          icon: "Plane",
          title: "Travel and the holy sites",
          text: "«My status now» is your companion day by day: where you are, your meal, your bus, the emergency button, complaints and lost items. Your digital card is on your wristband throughout.",
          when: "24 Dhul Qadah – 12 Dhul Hijjah",
        },
        {
          icon: "Award",
          title: "Return, evaluation and certificate",
          text: "You return home and, if you wish, rate the trip, the group and the cluster; a Hajj completion certificate is issued for each member. Everything you did stays in «My activity».",
          when: "23 Dhul Hijjah",
        },
      ],
    },
  },
};
