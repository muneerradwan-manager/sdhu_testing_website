/**
 * The site's language before the first paint (app/layout.tsx), as lib/theme-script.ts does for the theme: the
 * visitor's choice, remembered in this browser — Arabic unless he chose English. The portals (pilgrim,
 * administrator, staff) and the exam screens are in Arabic only for now, so on their paths the page stays
 * Arabic whatever was chosen. While an English page waits for React to draw it in English the body is hidden
 * (`data-lang-pending`), never longer than a moment: lib/i18n.ts clears it, and a timer clears it regardless.
 * A plain module (no "use client") so the server layout can import it.
 */
export const LANG_KEY = "sdhu-lang";
/** The paths that stay in Arabic (with or without the site's base path in front) */
export const ARABIC_ONLY = "/(staff|administrator|portal|exam-display)(/|$)";

export const LANG_SCRIPT = `try{var c=localStorage.getItem("${LANG_KEY}");var p=new RegExp("${ARABIC_ONLY}").test(location.pathname);var l=c==="en"&&!p?"en":"ar";var d=document.documentElement;d.lang=l;d.dir=l==="en"?"ltr":"rtl";d.dataset.lang=l;if(l==="en"){d.dataset.langPending="1";setTimeout(function(){delete d.dataset.langPending},1500)}}catch(e){}`;
