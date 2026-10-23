"use client";

import { CMS_COLLECTIONS } from "@/lib/cms/collections";
import { CMS_PAGES } from "@/lib/cms/schema";
import { archivedItems, archivedSections, cmsMemo, editedFieldCount, editedItemCount, hasCollectionDraft, hasDraft, pageState, useCms } from "@/lib/cms/store";
import type { CmsState } from "@/lib/cms/types";

/** The site content's numbers (published, drafts, edited, archived…) — shown on its statistics page (/staff/stats/content) and «لوحة الإدارة العليا», counted beside the content page's filters */
export function useContentSummary() {
  return useCms(summarise);
}

function summarise(s: CmsState) {
  return cmsMemo("contentSummary", s, () => compute(s));
}

function compute(s: CmsState) {
  let published = 0;
  let drafts = 0;
  let edited = 0;
  let archivedPages = 0;
  for (const p of CMS_PAGES) {
    const st = pageState(s, p.id);
    if (st.status === "published") published++;
    if (st.status === "archived") archivedPages++;
    if (hasDraft(s, p.id)) drafts++;
    edited += editedFieldCount(s, p.id, true);
  }
  for (const c of CMS_COLLECTIONS) {
    if (hasCollectionDraft(s, c.id)) drafts++;
    edited += editedItemCount(s, c.id);
  }
  return {
    published,
    drafts,
    edited,
    archived: archivedPages + archivedSections(s).length + archivedItems(s).length,
    media: s.media.length,
    revisions: s.revisions.length,
  };
}
