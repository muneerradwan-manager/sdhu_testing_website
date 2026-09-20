/**
 * نظام إدارة المحتوى (CMS) — الأنواع الأساسية.
 *
 * كل ما يظهر في الموقع العام موصوف هنا كـ «صفحة ← قسم ← حقل»، تماماً كما في ووردبريس:
 * الموظف يختار الصفحة، ثم القسم، ثم يعدّل الحقول (نص، صورة، رابط، قائمة عناصر...).
 * القيم الافتراضية مكتوبة داخل الوصف نفسه (`def`)، فإن لم يعدّل الموظف شيئاً ظهر المحتوى الأصلي.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "rich"
  | "number"
  | "boolean"
  | "image"
  | "video"
  | "url"
  | "select"
  | "icon"
  | "color"
  | "list"
  | "blocks";

export type SelectOption = { value: string; label: string };

export type Field = {
  key: string;
  label: string;
  kind: FieldKind;
  /** شرح قصير يظهر تحت الحقل في لوحة التحكم */
  hint?: string;
  placeholder?: string;
  /** القيمة الافتراضية = المحتوى الحالي للموقع */
  def: unknown;
  /** kind: "select" */
  options?: SelectOption[];
  /** kind: "list" — وصف حقول العنصر الواحد */
  item?: Field[];
  /** kind: "list" — اسم العنصر في زر الإضافة، مثل «خدمة» */
  itemName?: string;
  /** kind: "list" — الحقل الذي يُستخدم عنواناً للعنصر في القائمة المطوية */
  itemTitleKey?: string;
  /** kind: "list" */
  maxItems?: number;
  /** kind: "number" */
  min?: number;
  max?: number;
  step?: number;
  /** kind: "textarea" | "rich" */
  rows?: number;
  /** يمتد الحقل على عرض العمودين في شبكة التحرير */
  wide?: boolean;
};

export type SectionDef = {
  id: string;
  label: string;
  /** اسم أيقونة من lucide-react يظهر بجانب القسم */
  icon?: string;
  note?: string;
  fields: Field[];
  /** أقسام لا يمكن إخفاؤها أو أرشفتها (مثل ترويسة الصفحة) */
  required?: boolean;
};

/** وصف مجموعة محتوى: عناصر متشابهة لكل منها صفحته أو بطاقته في الموقع (مقالات، دروس، أسئلة...) */
export type CollectionDef = {
  id: string;
  label: string;
  /** اسم العنصر الواحد، مثل «مقال» */
  itemName: string;
  icon?: string;
  group: string;
  description?: string;
  /** مسار قائمة العناصر في الموقع */
  path: string;
  /** رابط العنصر الواحد في الموقع، إن كان له صفحة مستقلة */
  itemHref?: (id: string) => string;
  /** مفاتيح العرض في قائمة لوحة التحكم */
  titleKey: string;
  subtitleKey?: string;
  imageKey?: string;
  badgeKey?: string;
  fields: Field[];
  /** العناصر الأصلية الآتية من الشيفرة */
  builtIn: { id: string; values: Record<string, unknown> }[];
  /**
   * روابط محجوزة ومبنية مسبقاً لعناصر جديدة. الموقع يُصدَّر ملفات ثابتة،
   * فلا يمكن توليد رابط جديد بعد البناء؛ لذلك تُحجز روابط جاهزة ينزل فيها ما يُنشئه الموظف.
   */
  slots?: string[];
};

export type PageDef = {
  id: string;
  label: string;
  /** المسار في الموقع العام — يُستخدم لزر «معاينة» */
  path: string;
  icon?: string;
  group: string;
  description?: string;
  /** صفحات لا يمكن أرشفتها (الرئيسية والإعدادات العامة) */
  required?: boolean;
  sections: SectionDef[];
};

// ───────────────────────── حالة المحتوى المحفوظة ─────────────────────────

export type SectionState = {
  /** قيم الحقول التي عدّلها الموظف فقط؛ الباقي يأتي من `def` */
  values?: Record<string, unknown>;
  /** القسم مخفي عن الزوار لكنه ما زال في الصفحة */
  hidden?: boolean;
  /** القسم مؤرشف — خارج الصفحة، ويمكن استعادته من سلة الأرشيف */
  archived?: boolean;
  archivedAt?: number;
};

export type PageStatus = "published" | "draft" | "archived";

export type PageState = {
  status: PageStatus;
  /** المحتوى المنشور الذي يراه الزوار */
  sections: Record<string, SectionState>;
  /** تعديلات غير منشورة بعد — تظهر في وضع المعاينة فقط */
  draft?: Record<string, SectionState>;
  /** ترتيب الأقسام داخل الصفحة (المعرّفات)؛ ما ليس هنا يأخذ ترتيبه من الوصف */
  order?: string[];
  updatedAt?: number;
  updatedBy?: string;
  publishedAt?: number;
  publishedBy?: string;
  archivedAt?: number;
};

export type CollectionItemState = {
  values?: Record<string, unknown>;
  archived?: boolean;
  archivedAt?: number;
  /** عنصر أنشأه الموظف في خانة محجوزة */
  createdAt?: number;
  createdBy?: string;
};

export type CollectionState = {
  items: Record<string, CollectionItemState>;
  draft?: Record<string, CollectionItemState>;
  order?: string[];
  updatedAt?: number;
  updatedBy?: string;
  publishedAt?: number;
  publishedBy?: string;
};

export type Revision = {
  id: string;
  /** معرّف الصفحة أو المجموعة */
  pageId: string;
  /** أي شيء تحفظه هذه النسخة */
  scope?: "page" | "collection";
  at: number;
  by: string;
  byTitle?: string;
  note: string;
  /** لقطة كاملة من المحتوى المنشور قبل هذا التعديل */
  snapshot: { sections: Record<string, SectionState>; order?: string[]; status: PageStatus };
  /** لقطة مجموعة، حين يكون scope = "collection" */
  itemsSnapshot?: { items: Record<string, CollectionItemState>; order?: string[] };
};

export type MediaMeta = {
  id: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  at: number;
  by?: string;
  /** نص بديل للصورة (alt) */
  alt?: string;
};

export type CmsState = {
  pages: Record<string, PageState>;
  collections: Record<string, CollectionState>;
  revisions: Revision[];
  media: MediaMeta[];
  /** الموظف يعاين المسودات على الموقع العام */
  preview: boolean;
};

/** مرجع صورة من مكتبة الوسائط */
export const MEDIA_PREFIX = "cms:";
export const isMediaRef = (v: unknown): v is string => typeof v === "string" && v.startsWith(MEDIA_PREFIX);
export const mediaId = (ref: string) => ref.slice(MEDIA_PREFIX.length);
