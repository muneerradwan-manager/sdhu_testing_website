/** Where the visitor's choice of light or dark is kept in this browser */
export const THEME_KEY = "sdhu-theme";

/**
 * Runs in <head> before anything paints (app/layout.tsx): the saved choice, else the device's preference, on
 * <html data-theme>. A plain module, not a client one, so the server layout can inline it.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;
