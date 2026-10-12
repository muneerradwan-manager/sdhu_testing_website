import type { CollectionsEn } from "./index";

/**
 * The frequently asked questions in English. The categories are English too, one English name for each Arabic
 * one (FAQ_CATEGORY_EN), so a page that filters by category can map its Arabic tabs to them.
 */
export const FAQ_CATEGORY_EN = {
  التسجيل: "Registration",
  الشروط: "Conditions",
  "القبول والقرعة": "Acceptance and lottery",
  "التكاليف والدفع": "Costs and payment",
  "الخدمات والتحقق": "Services and verification",
} as const;

const C = FAQ_CATEGORY_EN;

export const FAQ_EN: CollectionsEn = {
  faq: {
    "faq-builtin-0": {
      category: C["التسجيل"],
      q: "Do I need an account to see the season's conditions and the acceptance results?",
      a: "No. The conditions, costs, calendar and acceptance results are open to everyone without signing in. You only need an account to submit an application or follow its status.",
    },
    "faq-builtin-1": {
      category: C["التسجيل"],
      q: "How many applications can I submit in a season?",
      a: "One application in each registration: one in the direct acceptance registration and, if you are not accepted, a new one in the lottery pre-registration. No person's name can appear in two applications in the same registration. An authorised staff member may submit more than one application on behalf of citizens.",
    },
    "faq-builtin-2": {
      category: C["التسجيل"],
      q: "How many people can I take with me?",
      a: "The applicant and up to 3 others. The number rises to 5 if the applicant is a man taking his wife and children.",
    },
    "faq-builtin-3": {
      category: C["التسجيل"],
      q: "Can I change my application after submitting it?",
      a: "Yes, as long as the registration you applied in is still open: until 25 August for a direct acceptance application, and until 10 September for a lottery pre-registration application. Once registration closes, checking begins and no changes can be made.",
    },
    "faq-builtin-4": {
      category: C["الشروط"],
      q: "I have performed Hajj before. Can I apply?",
      a: "Anyone who has already performed the obligatory Hajj is not accepted, unless he is a man accompanying his mother or wife as her mahram in the same application.",
    },
    "faq-builtin-5": {
      category: C["الشروط"],
      q: "When does a woman need a mahram?",
      a: "A woman born in 1982 or later (under 44) needs a mahram in the same application: her husband, father, son, brother, grandfather or grandson.",
    },
    "faq-builtin-6": {
      category: C["الشروط"],
      q: "My father was born in 1955. Can he apply on his own?",
      a: "No. Anyone born in 1957 or earlier (69 or older) needs a companion named in the application, and one companion may not accompany more than one elderly person.",
    },
    "faq-builtin-7": {
      category: C["القبول والقرعة"],
      q: "How does acceptance work?",
      a: "Through two separate registrations, each with its own application. Direct acceptance registration runs from 12 to 25 August and accepts applications whose main applicant was born in 1958 or earlier, for 65% of the quota (14,625 places). Then lottery pre-registration runs from 26 August to 10 September, and the lottery is held publicly on Saturday 26 September for 35% of the quota (7,875 places): years of birth are drawn, with months for some of them, and every application whose main applicant was born in them is accepted.",
    },
    "faq-builtin-8": {
      category: C["القبول والقرعة"],
      q: "Does my application move to the lottery if I am not accepted directly?",
      a: "The two registrations are separate. Direct acceptance is for applications whose main applicant was born in 1958 or earlier (68 or older), and the platform checks age at registration before any payment, so no one pays the first instalment and is then refused because of age. Younger applicants can switch their application to lottery pre-registration with one click and pay only the registration fee.",
    },
    "faq-builtin-9": {
      category: C["القبول والقرعة"],
      q: "Who can take part in lottery pre-registration?",
      a: "Everyone who meets the season's conditions and was not accepted directly, whether or not they registered for direct acceptance before. A family application is matched by the birth of its main applicant (the eldest in it), so the whole family is accepted or none of it is.",
    },
    "faq-builtin-10": {
      category: C["القبول والقرعة"],
      q: "Is the lottery held on the platform?",
      a: "No. The lottery is broadcast live on television, supervised by an official committee that draws the years and months of birth. An authorised staff member enters the results into the platform, and they are only published once another staff member has approved them.",
    },
    "faq-builtin-11": {
      category: C["القبول والقرعة"],
      q: "How do I know if I was accepted in the lottery?",
      a: "The results are published as a table of years of birth, each marked \"all months\" or with the months drawn for it. If your main applicant's year of birth is in the table, marked \"all months\" or with their month of birth, your application is accepted with all its members. The result also appears in your account, and you can search with your national number on the acceptance results page. You then confirm your registration between 11 and 27 October by confirming acceptance and paying the first instalment; otherwise the acceptance lapses.",
    },
    "faq-builtin-12": {
      category: C["التكاليف والدفع"],
      q: "Is the registration fee refundable?",
      a: "The registration fee ($25 per person) is an administrative fee for processing the application. You receive a digital receipt for it, which can be checked on the verification page.",
    },
    "faq-builtin-13": {
      category: C["التكاليف والدفع"],
      q: "When do I pay the cost of Hajj?",
      a: "The cost of Hajj is $4,750 per person, and the Administration sets how it is paid each season. In the 1448 season it is paid in two instalments: the first ($3,500) with the direct acceptance registration, or when confirming registration for those accepted in the lottery; the second ($1,250) when joining a group, together with the Hady and the price of private accommodation if you chose it. Each instalment has its own receipt.",
    },
    "faq-builtin-14": {
      category: C["التكاليف والدفع"],
      q: "What is the accommodation like, and can we choose private rooms?",
      a: "Shared accommodation comes at no extra cost: men together and women together. Instead, you may take private rooms for the members of your application only, one bed per person, divided between you as you wish: a single room with its own bathroom, or a room with two, three or four beds. So four people can take one four-bed room or two two-bed rooms, and six people two three-bed rooms, for example. The fewer beds in a room, the higher the price per person, which is set by the cluster. You choose your accommodation after joining a group, and pay for it with the final instalment.",
    },
    "faq-builtin-15": {
      category: C["الخدمات والتحقق"],
      q: "A campaign sent me a message promising a guaranteed place. What should I do?",
      a: "There is no guaranteed place outside official acceptance. Look up the organisation's name on the verification page, and if it is not approved, report it through the hotline or the report form.",
    },
    "faq-builtin-16": {
      category: C["الخدمات والتحقق"],
      q: "How can I make sure my receipt is genuine?",
      a: "Scan the QR code on the receipt or enter its number on the \"Document verification\" page. It will show \"Issued by the platform — valid\" with non-personal details.",
    },
  },
};
