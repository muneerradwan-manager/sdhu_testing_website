/**
 * The 3D models on the "جولة ثلاثية الأبعاد" page (the two Holy Mosques, Arafat, the Jamarat, and the Aisha and Quba mosques), shown as their authors published them on Sketchfab
 * (embedded through Sketchfab's own player: nothing is downloaded or hosted here, and the rights stay
 * with the authors). The two mosques are heavy models, so none loads before the visitor asks for it.
 */

export type Model3D = {
  /** Sketchfab model id */
  uid: string;
  title: string;
  place: string;
  /** Sketchfab author, credited under the viewer */
  author: string;
  /** Sketchfab page of the model */
  url: string;
  /** A heavy model: better on Wi-Fi */
  heavy: boolean;
  size: string;
  image: string;
  /** Where the photograph's subject is, when its middle is sky (CSS object-position) */
  focus?: string;
  /** For a photograph whose licence asks to name its author (the others: the site's Wikimedia Commons note) */
  photoCredit?: string;
  /** When the pilgrim comes to this place */
  when: string;
  about: string;
  points: string[];
};

export const MODELS_3D: Model3D[] = [
  {
    uid: "7d84e450db6240bd9add035640ba2005",
    title: "المسجد الحرام",
    place: "مكة المكرمة",
    author: "nuralam018",
    url: "https://sketchfab.com/3d-models/masjid-al-haram-makkah-7d84e450db6240bd9add035640ba2005",
    heavy: true,
    size: "نحو 2 مليون وجه",
    image: "/images/haram-2022.jpg",
    when: "طواف القدوم عند الوصول، وطواف الإفاضة يوم النحر أو بعده، وطواف الوداع في آخر الرحلة",
    about: "فيه الكعبة المشرفة والمطاف، والمسعى بين الصفا والمروة. تطوف سبعة أشواط تبدأ من الحجر الأسود والكعبة عن يسارك، وتسعى سبعة أشواط تبدأ بالصفا وتنتهي بالمروة.",
    points: ["الكعبة المشرفة والحجر الأسود", "المطاف حول الكعبة", "المسعى بين الصفا والمروة", "أبواب المسجد ومآذنه"],
  },
  {
    uid: "aec2fd44d2104cbdbaa29fd659de8b40",
    title: "المسجد النبوي",
    place: "المدينة المنورة",
    author: "nuralam018",
    url: "https://sketchfab.com/3d-models/masjid-al-nabawi-prophet-mosque-medina-aec2fd44d2104cbdbaa29fd659de8b40",
    heavy: true,
    size: "نحو 3.7 مليون وجه",
    image: "/images/nabawi.jpg",
    when: "قبل الحج أو بعده، بحسب برنامج مجموعتك",
    about: "ثاني الحرمين الشريفين، وفيه الروضة الشريفة والحجرة النبوية. زيارته ليست من أعمال الحج، ويزوره أكثر الحجاج قبل الحج أو بعده، وتُحجز زيارة الروضة بموعد مسبق.",
    points: ["الروضة الشريفة", "الحجرة النبوية والقبة الخضراء", "المظلات في الساحات"],
  },
  {
    uid: "8971a7f14c0c427cb25771e6acbfd044",
    title: "جبل عرفات",
    place: "عرفات — جبل الرحمة",
    author: "kaaba",
    url: "https://sketchfab.com/3d-models/arafah-8971a7f14c0c427cb25771e6acbfd044",
    heavy: false,
    size: "نحو 92 ألف وجه",
    image: "/images/jabal-rahmah.jpg",
    when: "يوم التاسع من ذي الحجة، من الزوال حتى غروب الشمس",
    about: "الوقوف بعرفة ركن الحج الأعظم. جبل الرحمة في عرفات، وصعوده ليس من المناسك: عرفة كلها موقف، فابقَ في مخيم مجموعتك داخل حدود عرفة وأكثر من الدعاء.",
    points: ["جبل الرحمة والشاخص على قمته", "سهل عرفات حول الجبل", "الوقوف داخل حدود عرفة"],
  },
  {
    uid: "ec0db00a3587489c9e2f18ebe5a289d3",
    title: "جسر الجمرات",
    place: "منى",
    author: "agrees_putra",
    url: "https://sketchfab.com/3d-models/jamaraat-ec0db00a3587489c9e2f18ebe5a289d3",
    heavy: false,
    size: "نحو 185 ألف وجه",
    image: "/images/jamarat.jpg",
    when: "يوم النحر (10 ذي الحجة) لجمرة العقبة، وأيام التشريق للجمرات الثلاث",
    about: "منشأة من عدة طوابق لرمي الجمرات الثلاث: الصغرى ثم الوسطى ثم الكبرى (جمرة العقبة)، بسبع حصيات لكل جمرة. الدخول والخروج باتجاه واحد، فالتزم بموعد الرمي وطريق مجموعتك.",
    points: ["الجمرة الصغرى", "الجمرة الوسطى", "جمرة العقبة (الكبرى)", "المداخل والمخارج باتجاه واحد"],
  },
  {
    uid: "ea93b7d646524c9da61309ab95fe3937",
    title: "مسجد عائشة",
    place: "مكة المكرمة — التنعيم",
    author: "nuralam018",
    url: "https://sketchfab.com/3d-models/aisha-masjid-mecca-saudi-arabia-ea93b7d646524c9da61309ab95fe3937",
    heavy: false,
    size: "نحو 103 آلاف وجه",
    image: "/images/aisha-mosque.jpg",
    focus: "40% 75%",
    photoCredit: "صورة المسجد: GusJuned، ويكيميديا كومنز، CC BY-SA 3.0",
    when: "إن أردت عمرة وأنت في مكة، قبل الحج أو بعده",
    about: "في التنعيم، أقرب الحِلّ إلى المسجد الحرام، على نحو 7.5 كيلومترات منه. أحرمت منه أم المؤمنين عائشة رضي الله عنها بالعمرة بأمر النبي ﷺ، ولذلك يُحرم منه من كان في مكة وأراد العمرة.",
    points: ["ميقات من في مكة للعمرة", "أماكن للوضوء والاستعداد للإحرام", "مواصلات منتظمة إلى المسجد الحرام"],
  },
  {
    uid: "4deea1e1edae43a5ac9f8c683b361260",
    title: "مسجد قباء",
    place: "المدينة المنورة",
    author: "nuralam018",
    url: "https://sketchfab.com/3d-models/quba-mosque-saudi-arabia-3d-model-4deea1e1edae43a5ac9f8c683b361260",
    heavy: false,
    size: "نحو 158 ألف وجه",
    image: "/images/quba.jpg",
    when: "في أثناء إقامتك في المدينة، بحسب برنامج مجموعتك",
    about: "أول مسجد بُني في الإسلام، أسسه النبي ﷺ عند قدومه المدينة مهاجراً، وهو جنوب المسجد النبوي على نحو 3 كيلومترات. قال ﷺ: «من تطهّر في بيته ثم أتى مسجد قباء فصلى فيه صلاة كان له كأجر عمرة».",
    points: ["أول مسجد في الإسلام", "المآذن والقباب البيضاء", "الصلاة فيه بعد التطهر في البيت"],
  },
];

/** Sketchfab's player for a model: starts at once (the visitor asked for it), dark, no tracking */
export const embedUrl = (uid: string) => `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_theme=dark&dnt=1`;
