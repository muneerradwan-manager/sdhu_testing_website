import type { CollectionsEn } from "./index";
import type { Block } from "@/lib/data/news";

/**
 * The English of the built-in news articles (lib/data/news.ts), keyed by slug. Each body keeps the Arabic one's
 * blocks in the same order and shape. `category` is left out: it is the article's key for its filter, its colour
 * and its related articles, so its English label is given where it is shown (app/news).
 */

const tags = (...list: string[]) => list.map((text) => ({ text }));

type ArticleEn = {
  title: string;
  excerpt: string;
  hijri: string;
  gregorian: string;
  author: string;
  department: string;
  ticker: string;
  tags: { text: string }[];
  body: Block[];
};

const ARTICLES_EN: Record<string, ArticleEn> = {
  "administrators-applications-1448": {
    title: "Applications open for administrator roles in the 1448 AH Hajj season",
    hijri: "5 Rabi' al-Thani 1448 AH",
    gregorian: "16 September 2026",
    excerpt:
      "The Administration is opening registration for administrators — group leaders, assistant group leaders, religious guides and technical coordinators — from Sunday 20 to Thursday 24 September, with an automated test for each role in the exam centres' halls.",
    tags: tags("Administrators", "Automated test", "1448 season"),
    author: "Administrators' Affairs",
    department: "Seasons Management",
    ticker: "Administrator registration for the administrative roles: 20 to 24 September",
    body: [
      {
        type: "p",
        text: "The Hajj and Umrah Administration is opening applications for administrative work in the 1448 AH Hajj season. This announcement covers the following seasonal roles: group leader, assistant group leader, religious guide and technical coordinator. Cluster leadership is not applied for here, and it is not elected: a group leader who meets the conditions submits the request to form a cluster, within the set period.",
      },
      { type: "h", text: "How to apply" },
      {
        type: "list",
        ordered: true,
        items: [
          "Create an “Administrator” account on the platform with your national number, and confirm the details received from the Civil Registry.",
          "Register for the season from Sunday 20 to Thursday 24 September 2026, in person at the Administration's branches in the governorates or its offices abroad, with an appointment booked in advance, and pay the registration fee ($30) with a digital receipt.",
          "Sit the automated test in early October: each role on its own day, in the exam-centre hall of your governorate, on your own device with your national number, under the hall supervisor's oversight.",
          "Pass by reaching the required score in every section of the test, after the supervisor confirms your submission with their code.",
          "Follow the announcement of the approved administrator lists.",
        ],
      },
      {
        type: "callout",
        tone: "gold",
        title: "Important",
        text: "Each person can hold only one type of account on the platform. Anyone who creates an “Administrator” account cannot apply for Hajj as a pilgrim in the same season.",
      },
      { type: "h", text: "Key dates" },
      {
        type: "table",
        head: ["Stage", "Hijri date", "Gregorian date"],
        rows: [
          ["Administrator registration", "9 – 13 Rabi' al-Thani", "20 – 24 September 2026"],
          ["Automated test", "Late Rabi' al-Thani", "Early October 2026"],
          ["Approved administrators announced", "21 Jumada al-Ula (estimated)", "1 November 2026 (estimated)"],
          ["Groups formed", "Estimated", "1 – 10 November 2026 (estimated)"],
          ["Clusters formed by request", "Estimated", "12 – 30 November 2026 (estimated)"],
        ],
      },
      {
        type: "p",
        text: "Once the approved lists are announced, the successful group leaders form their groups themselves. Cluster formation then opens by request — not by election — while pilgrims are assigned to groups, and each complete cluster is approved after the deadline. The Administration advises applicants to work through the training units in the Knowledge Centre before the exam.",
      },
    ],
  },

  "academy-launch": {
    title: "Religious lessons academy launched for everyone, with no sign-in needed",
    hijri: "20 Safar 1448 AH",
    gregorian: "3 August 2026",
    excerpt:
      "Six learning tracks to watch, listen to and read, open all year round to every citizen. An account adds progress tracking, short quizzes and a certificate of completion.",
    tags: tags("Academy", "Fiqh of Hajj", "Learning"),
    author: "Religious Affairs",
    department: "Religious Affairs",
    ticker: "The religious lessons academy is now open to everyone",
    body: [
      {
        type: "p",
        text: "The Administration has launched the religious lessons academy on the National Hajj Platform. The academy is open to every visitor without an account, and it runs all year round, not only during the season, so that pilgrims and their families can prepare calmly, well before they travel.",
      },
      { type: "h", text: "The tracks" },
      {
        type: "list",
        items: [
          "Fiqh of Hajj: 18 lessons in three levels (Ihram, Tawaf and Sa'i, the holy sites).",
          "Fiqh of Umrah: its pillars, its obligations and the common mistakes.",
          "Travel etiquette and the pilgrim's conduct: patience, coping with crowds, and serving the elderly.",
          "Madinah and the visit: the etiquette of the visit, the Prophet's Mosque, Quba and Uhud.",
          "Duas and remembrance: the duas of the rites day by day, with text and audio.",
          "Getting ready before travel: health, medicines, packing and using the app.",
        ],
      },
      {
        type: "quote",
        text: "We wanted sound knowledge to reach every home, and every pilgrim to travel knowing what awaits them, step by step.",
        by: "Director of Religious Affairs",
      },
      {
        type: "callout",
        tone: "green",
        title: "What an account adds",
        text: "With an account, your progress is saved, you take short five-question quizzes after each level, and you receive a certificate of completion that is kept in your document vault. The quizzes are for revision only and do not affect any application.",
      },
      {
        type: "p",
        text: "The staff member in charge of religious content reviews and approves every lesson before it is published. You can send the lecturer a question from the lesson page, and frequently asked questions are published with their approved answers.",
      },
    ],
  },

  "registration-opens-1448": {
    title: "Direct acceptance registration for the 1448 AH Hajj season open from 12 to 25 August",
    hijri: "27 Safar 1448 AH",
    gregorian: "10 August 2026",
    excerpt:
      "The Administration is opening direct acceptance registration for those born in 1958 or earlier and their companions (65% of the quota). Lottery pre-registration (35%) opens afterwards, as a separate application, from 26 August to 10 September. The registration fee is $25 per person.",
    tags: tags("Registration", "1448 season", "Quota", "Fees"),
    author: "Registration Department",
    department: "Registration Department",
    ticker: "Direct acceptance registration for the 1448 season: 12 to 25 August",
    body: [
      {
        type: "p",
        text: "The Hajj and Umrah Administration announces that direct acceptance registration for the 1448 AH (2027) season is open on the National Hajj Platform from Wednesday 12 to Tuesday 25 August 2026, corresponding to 29 Safar – 12 Rabi' al-Awwal 1448 AH. Pilgrims register themselves, or are registered by someone the Administration has authorised to do so, and registering does not place anyone in a group. This season, direct acceptance is for applications whose main applicant is 66 or older (35% of the quota), and the platform checks age at registration, before any payment; anyone younger registers for the lottery. The lists are approved on 26 August.",
      },
      { type: "h", text: "The season's quota and how acceptance works" },
      {
        type: "table",
        caption: "How the 1448 AH season quota is divided",
        head: ["Item", "Share", "Places", "Registration period"],
        rows: [
          ["Direct acceptance, oldest first", "65%", "14,625", "12 – 25 August"],
          ["Public lottery", "35%", "7,875", "26 August – 10 September (separate pre-registration)"],
          ["Total", "100%", "22,500", "—"],
        ],
      },
      {
        type: "p",
        text: "The two registrations are separate, and each has its own application. The registration opening today is for direct acceptance only. Lottery pre-registration opens once the direct acceptance lists are approved, from 26 August to 10 September 2026 (13 – 28 Rabi' al-Awwal), and the lottery is drawn in public on Saturday 26 September.",
      },
      { type: "h", text: "Who can register?" },
      {
        type: "list",
        items: [
          "The applicant must be a Syrian Muslim who has not performed Hajj before and does not have a serious incurable illness.",
          "The main applicant must be born in 1997 or earlier, and a companion in 2009 or earlier.",
          "Up to 3 people can accompany the main applicant, or 5 for a man travelling with his wife and children.",
          "A woman born in 1982 or later needs a mahram (male guardian).",
          "Anyone born in 1957 or earlier must travel with a companion.",
        ],
      },
      { type: "h", text: "How to register" },
      {
        type: "list",
        ordered: true,
        items: [
          "Create an account with your national number and just four fields.",
          "Submit an application for yourself or for someone else, and add the companions.",
          "No papers at registration: the personal photo comes after acceptance and the first instalment, and the passport after the second instalment.",
          "Pay the registration fee of $25 per person, and keep the digital receipt.",
        ],
      },
      {
        type: "callout",
        tone: "maroon",
        title: "Important notice",
        text: "Registration is only through the platform and the Administration's official offices, and nobody sells “guaranteed places”. Paying the registration fee does not mean you are accepted. An application that is not accepted directly does not move to the lottery by itself: register for the lottery with a new application from 26 August to 10 September.",
      },
      {
        type: "p",
        text: "The announced cost of Hajj is $4,750 per person, plus $180 for the Hady. For this season, the Administration has decided that it is paid in two instalments: the first ($3,500) with direct acceptance registration, or when confirming registration for those accepted through the lottery; the second on joining a group. Each instalment has its own receipt.",
      },
    ],
  },

  "fake-campaigns-warning": {
    title: "Warning: fake campaigns promising guaranteed places for money",
    hijri: "5 Rabi' al-Awwal 1448 AH",
    gregorian: "18 August 2026",
    excerpt:
      "The Administration has spotted adverts on social media from unapproved organisations asking for money in exchange for a “guaranteed place”. Check any organisation on the verification page before you pay anything.",
    tags: tags("Fraud", "Verification", "Awareness"),
    author: "Operations Room",
    department: "Audit",
    ticker: "There are no guaranteed places — check any organisation before you pay",
    body: [
      {
        type: "p",
        text: "The Hajj and Umrah Administration warns citizens about adverts spreading on social media and messaging apps, posted by organisations calling themselves “campaigns” that promise a guaranteed place in the 1448 AH Hajj in exchange for money.",
      },
      {
        type: "callout",
        tone: "maroon",
        title: "One fact that never changes",
        text: "There is no such thing as a guaranteed place. Acceptance comes only through two official registrations on the platform: direct acceptance registration, oldest first (65%), and pre-registration for the public lottery (65%), which is broadcast live.",
      },
      { type: "h", text: "Signs of a fake organisation" },
      {
        type: "list",
        items: [
          "It asks for money before the acceptance results are announced.",
          "It promises acceptance “regardless of age or the lottery”.",
          "It asks for a photo of your ID or the verification code sent to your phone.",
          "Its name does not appear in the list of approved organisations on the platform.",
          "It gives you a paper receipt with no verifiable QR code.",
        ],
      },
      { type: "h", text: "How to check" },
      {
        type: "list",
        ordered: true,
        items: [
          "Open the “Verify organisations and documents” page on the platform (/verify).",
          "Type the organisation's name or licence number, and the result appears at once: “Approved” or “Not approved”.",
          "For any receipt or certificate: scan the QR code, and you should see “Issued by the platform — valid”.",
          "If the organisation is not approved, use the “Report” button on the same page.",
        ],
      },
      {
        type: "quote",
        text: "Never give your verification code to anyone, even if they say they work for the Administration. Our staff never ask for it.",
        by: "Operations Room",
      },
      {
        type: "p",
        text: "Remember that every official fee has its own digital receipt that can be verified, and that the cost of Hajj is paid only after acceptance, and only through the platform or the Administration's offices.",
      },
    ],
  },

  "health-instructions": {
    title: "Health instructions circular: meningitis vaccine and a passport valid for 6 months",
    hijri: "18 Rabi' al-Thani 1448 AH",
    gregorian: "29 September 2026",
    excerpt:
      "Every applicant must make sure their passport is valid for 6 months after the return date, and must get the meningitis vaccine. Vaccination certificates and the medical report are uploaded after joining a group; no medical document is needed before then.",
    tags: tags("Health", "Vaccinations", "Passport", "Medical team"),
    author: "Medical Team",
    department: "Medical Team",
    ticker: "Your passport must be valid for 6 months after your return",
    body: [
      {
        type: "p",
        text: "For the safety of pilgrims, the Administration's medical team is issuing the health instructions and document requirements for the 1448 AH season. Please read them carefully before uploading your papers, because anything missing delays the approval of your application.",
      },
      { type: "h", text: "Required documents" },
      {
        type: "table",
        head: ["Document", "Requirement", "When to upload"],
        rows: [
          ["Personal photo", "Recent, with a white background", "After acceptance and the first instalment"],
          ["Passport", "Valid for 6 months after the return (until at least 23 Jumada al-Akhirah 1449)", "Once the second instalment is paid"],
          ["Meningitis vaccine", "A valid, approved certificate", "After joining a group"],
          ["Medical documents", "The Administration sets the list", "Once the full amount is paid"],
        ],
      },
      {
        type: "callout",
        tone: "maroon",
        title: "Important",
        text: "A passport is rejected if it is valid for less than 6 months after the return date, and you will receive a notification asking you to renew it and upload it again. Renew your passport early.",
      },
      { type: "h", text: "Health advice before you travel" },
      {
        type: "list",
        items: [
          "See your doctor at least a month before you travel, especially if you are elderly.",
          "Carry enough of your regular medicines for the whole journey, with a prescription.",
          "Record any chronic conditions in your file on the platform so the medical team can see them.",
          "Drink plenty of water, use an umbrella, and avoid exertion in the midday hours.",
          "Start walking every day from now on to build up your strength for Tawaf and Sa'i.",
        ],
      },
      {
        type: "p",
        text: "The medical mission accompanies pilgrims in Makkah, Madinah and the holy sites, and you can ask for medical help at any time with the emergency button in the app.",
      },
    ],
  },

  "accepted-ages-66": {
    title: "Decision: direct acceptance for the 1448 AH season for those born in 1958 or earlier (aged 68 and over)",
    hijri: "13 Rabi' al-Awwal 1448 AH",
    gregorian: "26 August 2026",
    excerpt:
      "After checking the applications, the platform has issued the results of direct acceptance, oldest first, for 65% of the quota (14,625 places). Accepted: those born in 1958 or earlier (aged 68 and over). Anyone not accepted can pre-register for the lottery from 26 August to 10 September.",
    tags: tags("Direct acceptance", "Accepted ages", "Results"),
    author: "Seasons Management",
    department: "Seasons Management",
    ticker: "Direct acceptance: born in 1958 or earlier",
    body: [
      {
        type: "p",
        text: "With direct acceptance registration closed on 25 August and the data checked, the platform has issued the results of direct acceptance, oldest first, for 65% of the season's quota.",
      },
      {
        type: "callout",
        tone: "gold",
        title: "The decision",
        text: "Every main applicant born in 1958 or earlier whose application meets the conditions is accepted directly, together with the companions registered in the same application: 14,625 places in all.",
      },
      { type: "h", text: "What happens next?" },
      {
        type: "list",
        ordered: true,
        items: [
          "The result appears in your account straight away, and you receive a text message on your phone.",
          "Anyone can search by national number on the “Acceptance results” page without an account.",
          "An application not accepted directly does not move to the lottery by itself; you can pre-register for the lottery with a new application from 26 August to 10 September, and the lottery is drawn on Saturday 26 September.",
          "Accepted pilgrims confirm their registration with the first instalment from 11 to 27 October, and are assigned to a group by contract during the assignment period announced by the Administration.",
        ],
      },
      { type: "h", text: "Publication rules" },
      {
        type: "table",
        head: ["Shown in the public lists", "Never shown"],
        rows: [
          ["Name", "Phone number"],
          ["Result", "Address"],
          ["Campaign and governorate", "Age and reason for non-acceptance"],
          ["National number (masked)", "Any other personal data"],
        ],
      },
      {
        type: "p",
        text: "Every publication of the lists is recorded in the event log with the name of the person who carried it out and the time, and an objection can be submitted from your account within the set deadline.",
      },
    ],
  },

  "e-lottery-1-shaaban": {
    title: "The public lottery on Saturday 26 September in Deir ez-Zor",
    hijri: "13 Rabi' al-Thani 1448 AH",
    gregorian: "24 September 2026",
    excerpt:
      "Lottery pre-registration closed on 10 September. The lottery for 35% of the quota (7,875 places) is drawn in public on Saturday 26 September in the auditorium of Al-Furat University in Deir ez-Zor. Birth years are drawn, and for some of them months, and the results are published the same day.",
    tags: tags("Lottery", "Live broadcast", "Transparency"),
    author: "Seasons Management",
    department: "Operations Room",
    ticker: "Public lottery on Saturday 26 September — Al-Furat University, Deir ez-Zor: birth years and months are drawn",
    body: [
      {
        type: "p",
        text: "With lottery pre-registration closed on 10 September, the Administration announces that the lottery for the 1448 AH season will be drawn on Saturday 26 September 2026, corresponding to 15 Rabi' al-Thani 1448 AH, in the auditorium of Al-Furat University in Deir ez-Zor, at 20:00 Damascus time, broadcast live and in public for everyone to follow.",
      },
      {
        type: "table",
        caption: "Lottery details",
        head: ["Item", "Details"],
        rows: [
          ["Lottery pre-registration", "26 August – 10 September — an application separate from direct acceptance registration, with the registration fee only"],
          ["Date", "Saturday 26 September 2026 (15 Rabi' al-Thani 1448 AH) — Al-Furat University, Deir ez-Zor"],
          ["Places", "7,875 places (35% of the quota)"],
          ["What is drawn", "Birth years, and for some of them specific months, until the places are filled — no names"],
          ["Who is accepted", "Every application whose main applicant (its oldest member) was born in a drawn year, or in a drawn month of it"],
          ["Results published", "26 September — a table of the years and months"],
          ["Confirming registration", "11 – 27 October: the first instalment of $3,500 via Sham Cash or Al Baraka Bank, or the acceptance lapses"],
        ],
      },
      { type: "h", text: "How to follow the broadcast" },
      {
        type: "list",
        items: [
          "The live broadcast link appears in the “Season calendar” on the platform an hour before the draw.",
          "It is also broadcast on the Administration's official channels, and only there.",
          "The lottery is drawn in the presence of the supervisory committee and representatives of the audit team.",
        ],
      },
      {
        type: "callout",
        tone: "green",
        title: "A family application is matched by its main applicant's birth date",
        text: "If the main applicant's birth year, or their birth month within it, is drawn, the main applicant and their companions are accepted together. Members of one family are never separated.",
      },
      {
        type: "p",
        text: "The lottery is drawn outside the platform. An authorised staff member then enters what was drawn, and a second staff member approves it and publishes it with a full log, so the result reaches the applicants and the table is published to the public at the same moment. This way any citizen can check both routes to acceptance.",
      },
      {
        type: "quote",
        text: "Transparency is not a slogan; every step of the lottery is recorded, published and open to review.",
        by: "Season Director",
      },
    ],
  },

  "clusters-programs-approved": {
    title: "Cluster and group programmes approved and published in the services directory",
    hijri: "28 Jumada al-Akhirah 1448 AH",
    gregorian: "8 December 2026",
    excerpt:
      "The announcements committee and the office director have approved the programmes of 36 approved clusters, among them “تكتل النور لخدمة الحجاج”, and their profile pages are now published in the services directory for everyone to see.",
    tags: tags("Clusters", "Services directory", "Programmes"),
    author: "Damascus Office",
    department: "Seasons Management",
    ticker: "Approved cluster programmes are available in the services directory",
    body: [
      {
        type: "p",
        text: "After the clusters were approved at the deadline and the brochures submitted by their leaders were reviewed, the announcements committee and the office director approved the cluster and group programmes for the 1448 AH season, and they are published in the services directory on the public portal.",
      },
      { type: "h", text: "What does the services directory show?" },
      {
        type: "list",
        items: [
          "The profile page of each approved cluster, such as “تكتل النور لخدمة الحجاج”.",
          "The level of service: accommodation, distance from the Haram, transport and catering.",
          "The travel programme and the religious lessons before departure.",
          "The cluster's rating in previous seasons, if there is one.",
        ],
      },
      {
        type: "callout",
        tone: "gold",
        title: "How do I join a group?",
        text: "Everyone can browse the directory now. Joining a group, however, is for accepted pilgrims only, until 15 January, and it is not done on the platform itself: you agree with the group and sign your contract with it at the office, the office staff member assigns you to it, and your group and contract then appear in your account. A family application is assigned as a whole.",
      },
      {
        type: "p",
        text: "After the season, clusters and groups are evaluated as entities across nine stages, and the results affect their ranking in the services directory and whether they are contracted for the following season.",
      },
    ],
  },

  "new-ages-reserve-promotion": {
    title: "New accepted ages announced (66 and over) for the places of those who did not pay",
    hijri: "17 Jumada al-Ula 1448 AH",
    gregorian: "28 October 2026",
    excerpt:
      "Some accepted applicants did not pay within the deadline and their acceptance lapsed, so the Administration has decided to accept new ages (66 and over, born in 1960 or earlier) from the direct acceptance applications for the places left free, with the public lists updated automatically.",
    tags: tags("Reserve round", "Accepted ages", "Payment"),
    author: "Seasons Management",
    department: "Finance",
    ticker: "New accepted ages: 66 and over",
    body: [
      {
        type: "p",
        text: "The deadline for paying the first instalment ended on 27 October, and a number of accepted applicants did not pay within it. To fill the season's quota, the Administration has issued the following decision.",
      },
      {
        type: "callout",
        tone: "gold",
        title: "The decision",
        text: "New ages from 66 and over (born in 1960 or earlier) are accepted from the direct acceptance registration applications, until the places left free are filled.",
      },
      { type: "h", text: "If you are newly accepted" },
      {
        type: "list",
        ordered: true,
        items: [
          "You will receive a text message and a notification in your account.",
          "Confirm your acceptance and upload your personal photo within 5 days.",
          "Agree with a group and sign your contract with it at the office; the office staff member assigns you to it. Then pay the second instalment.",
          "After the second instalment: a passport for each member.",
          "After joining a group: vaccination certificates (COVID-19 and meningitis) and the medical report.",
        ],
      },
      {
        type: "p",
        text: "The public list has been updated automatically, with the date of the last update. Those who did not pay are refunded the amounts due, with refund receipts linked to the original payment receipts.",
      },
    ],
  },

  "flight-contracts-signed": {
    title: "Flight contracts signed and groups assigned to flights",
    hijri: "5 Dhu al-Qa'dah 1448 AH",
    gregorian: "12 April 2027",
    excerpt:
      "The contracts committee has signed the flight contracts for the 1448 AH season, and the transport team has started assigning clusters to flights. The first Damascus → Jeddah flights are on 24 Dhu al-Qa'dah.",
    tags: tags("Aviation", "Flights", "Transport", "Travel"),
    author: "Transport",
    department: "Transport",
    ticker: "First Hajj flights: Damascus → Jeddah on 24 Dhu al-Qa'dah",
    body: [
      {
        type: "p",
        text: "The Administration's contracts committee has signed the flight contracts for the 1448 AH Hajj season, and the transport team has started assigning clusters and groups to flights, alongside the issuing of visas between 1 and 15 Dhu al-Qa'dah.",
      },
      { type: "h", text: "How flights are assigned" },
      {
        type: "list",
        items: [
          "A whole cluster travels on two consecutive flights.",
          "Each group travels on a single flight with its administrators.",
          "Seating gives priority to the elderly and people with special needs.",
          "Any changes to flights can be followed directly on the platform.",
        ],
      },
      {
        type: "table",
        caption: "The journey",
        head: ["Stage", "Hijri date", "Gregorian date"],
        rows: [
          ["Departure: Damascus → Jeddah → Makkah", "24 Dhu al-Qa'dah", "1 May 2027"],
          ["The holy sites", "8 – 12 Dhu al-Hijjah", "14 – 18 May 2027"],
          ["Madinah", "16 – 23 Dhu al-Hijjah", "22 – 29 May 2027"],
          ["Return: Madinah → Damascus", "23 Dhu al-Hijjah", "29 May 2027"],
        ],
      },
      {
        type: "callout",
        tone: "green",
        title: "Your boarding pass in the app",
        text: "Your flight details, the time to be at the airport and your group's meeting point appear in the app, and you receive a reminder 72 hours before departure.",
      },
    ],
  },
};

export const NEWS_EN: CollectionsEn = { news: ARTICLES_EN };
