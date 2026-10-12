import type { PagesEn } from "./index";

/** The English of the service pages: the Hajj guide, the academy, the news, the prayer times and Umrah */
export const PAGES_EN_SERVICES: PagesEn = {
  guide: {
    hero: {
      title: "Hajj Rites",
      highlight: "Guide",
      description:
        "The knowledge centre for Syrian pilgrims: what to do each day, where to be, and what to say. In plain language, with maps and duas you can listen to.",
      crumb: "Hajj Rites Guide",
    },
    days: {
      eyebrow: "8 to 13 Dhu al-Hijjah",
      title: "The Hajj day by day",
      description: "Choose a day to see what to do, the approximate times, the dua, and the place on the map.",
    },
    rites: {
      eyebrow: "Before Ihram",
      title: "Which type of Hajj will you perform?",
      description:
        "All three types are valid. This quick comparison will help you understand them. Ask your group's guide which suits you best.",
    },
  },

  academy: {
    hero: {
      title: "Religious Lessons",
      highlight: "Academy",
      description:
        "Learn your rites before you travel: short, clear lessons from respected sheikhs and specialists, free all year round, with a written summary for every lesson.",
      crumb: "Academy",
    },
  },

  news: {
    hero: {
      title: "Administration Blog",
      highlight: "and Official Announcements",
      description:
        "Every decision, circular and announcement from the Administration is published here first, once approved. Follow the season's dates, acceptance results and important warnings.",
      crumb: "News",
    },
  },

  "prayer-times": {
    hero: {
      title: "Prayer",
      highlight: "Times",
      description:
        "Accurate times for your city, Makkah and Madinah, with a live countdown to the next prayer, a compass pointing to the Qibla, and a printable monthly timetable.",
      crumb: "Prayer Times",
    },
  },

  umrah: {
    hero: {
      title: "Umrah",
      highlight: "Coming soon",
      description:
        "We are working on adding Umrah services to the National Hajj Platform. Details and dates will be announced officially once the Administration approves them.",
      crumb: "Umrah",
    },
    notice: {
      title: "This service is being prepared",
      text: "No Umrah programmes, dates or costs have been announced on the platform yet. Anyone offering you \"registration through the National Platform\" for Umrah today does not represent the Administration. You can check approved organisations.",
      linkLabel: "check approved organisations",
    },
    planned: {
      eyebrow: "What we are working on",
      title: "Planned Umrah services",
      description: "This is a list of what we are working to add. Details may change at launch.",
      badge: "Coming soon",
      items: [
        {
          icon: "UsersRound",
          title: "Registering for Umrah trips",
          text: "Apply for Umrah for yourself and your family from the same account, in the simple way you know from the Hajj application.",
        },
        {
          icon: "ShieldCheck",
          title: "Approved Umrah organisations",
          text: "A directory of approved companies and campaigns, with a way to check any organisation before dealing with it.",
        },
        {
          icon: "Wallet",
          title: "Published programmes and costs",
          text: "Approved programmes and their official costs, shown openly, with a digital receipt for every payment.",
        },
        {
          icon: "FileCheck2",
          title: "Tracking your application and visa",
          text: "Your application status, required documents and visa step by step, with notifications on your phone.",
        },
        {
          icon: "Plane",
          title: "Travel and accommodation",
          text: "Your flight, hotel and group details in one place once your application is approved.",
        },
        {
          icon: "CalendarClock",
          title: "Season dates",
          text: "When registration opens for each Umrah season, with a personal reminder.",
        },
      ],
    },
    academyCard: {
      badge: "Available now",
      title: "The \"Umrah Fiqh\" track at the Academy",
      text: "The pillars, obligations and common mistakes of Umrah, through video, audio explanations and written summaries — no sign-in needed.",
      ctaLabel: "Start learning",
    },
  },
};
