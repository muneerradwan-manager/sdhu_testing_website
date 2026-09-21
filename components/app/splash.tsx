/**
 * Splash screen on first open and on every refresh: the emblem draws itself (gold star turning, halo
 * pulsing), the platform name rises, a progress line fills — then it fades once the page is ready.
 *
 * Everything here is inline (styles and keyframes), so it shows correctly before the stylesheet has
 * loaded — the moment the page used to flash a giant unsized logo. It hides itself after a few seconds
 * even if JavaScript never runs; <SplashHider /> fades it out earlier, as soon as the page is interactive.
 */
import { SplashHider } from "./splash-hider";

const CSS = `
#sdhu-splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
  background:radial-gradient(circle at 50% 42%,#016D5D 0%,#00594F 45%,#003B34 100%);color:#fff;
  transition:opacity .55s ease,visibility .55s ease;animation:sdhu-splash-out .6s ease 5s forwards}
#sdhu-splash[data-hidden]{opacity:0;visibility:hidden;pointer-events:none}
#sdhu-splash .sp-pattern{position:absolute;inset:0;opacity:.07;background-image:radial-gradient(#D9C89E 1px,transparent 1px);background-size:22px 22px}
#sdhu-splash .sp-mark{position:relative;width:112px;height:112px;animation:sdhu-pop .9s cubic-bezier(.16,1,.3,1) both}
#sdhu-splash .sp-halo{position:absolute;inset:-18px;border-radius:50%;border:2px solid rgba(217,200,158,.55);animation:sdhu-halo 1.8s ease-out .5s infinite}
#sdhu-splash .sp-halo.b{animation-delay:1.1s}
#sdhu-splash .sp-star{transform-origin:32px 32px;animation:sdhu-spin 6s linear infinite}
#sdhu-splash .sp-draw{stroke-dasharray:190;stroke-dashoffset:190;animation:sdhu-draw 1.1s ease .25s forwards}
#sdhu-splash .sp-title{font-family:var(--font-qomra),system-ui,sans-serif;font-weight:700;font-size:28px;letter-spacing:.3px;animation:sdhu-rise .8s cubic-bezier(.16,1,.3,1) .45s both}
#sdhu-splash .sp-sub{font-family:var(--font-qomra),system-ui,sans-serif;font-size:14px;color:#D9C89E;margin-top:-12px;animation:sdhu-rise .8s cubic-bezier(.16,1,.3,1) .6s both}
#sdhu-splash .sp-bar{width:160px;height:3px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden;animation:sdhu-rise .6s ease .75s both}
#sdhu-splash .sp-bar i{display:block;height:100%;width:40%;border-radius:3px;background:linear-gradient(90deg,#AD9E6E,#E4DDD3,#AD9E6E);animation:sdhu-load 1.2s ease-in-out .8s infinite}
@keyframes sdhu-pop{from{opacity:0;transform:scale(.6) rotate(-12deg)}to{opacity:1;transform:none}}
@keyframes sdhu-halo{from{opacity:.9;transform:scale(.85)}to{opacity:0;transform:scale(1.35)}}
@keyframes sdhu-spin{to{transform:rotate(360deg)}}
@keyframes sdhu-draw{to{stroke-dashoffset:0}}
@keyframes sdhu-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes sdhu-load{0%{transform:translateX(160%)}100%{transform:translateX(-260%)}}
@keyframes sdhu-splash-out{to{opacity:0;visibility:hidden;pointer-events:none}}
@media (prefers-reduced-motion:reduce){#sdhu-splash *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;

export function Splash() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div id="sdhu-splash" role="status" aria-label="جارٍ تحميل المنصة الوطنية للحج">
        <div className="sp-pattern" />
        <div className="sp-mark">
          <span className="sp-halo" />
          <span className="sp-halo b" />
          <svg viewBox="0 0 64 64" width="112" height="112" aria-hidden>
            <defs>
              <linearGradient id="sp-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#E4DDD3" />
                <stop offset=".5" stopColor="#D9C89E" />
                <stop offset="1" stopColor="#AD9E6E" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="31" fill="#00594F" stroke="url(#sp-gold)" strokeWidth=".8" />
            <g className="sp-star">
              <path className="sp-draw" d="M32 5l7.6 18.4L58 31.99 39.6 39.6 32 58l-7.6-18.4L6 32l18.4-7.6z" fill="none" stroke="url(#sp-gold)" strokeWidth="1.6" />
              <rect className="sp-draw" x="13.5" y="13.5" width="37" height="37" fill="none" stroke="url(#sp-gold)" strokeWidth="1.6" />
            </g>
            <circle cx="32" cy="32" r="12.5" fill="#016D5D" stroke="url(#sp-gold)" strokeWidth="1.2" />
            <path d="M25.5 29.2l6.5-2.7 6.5 2.7v8.3l-6.5 2.7-6.5-2.7z" fill="#021526" />
            <path d="M25.5 29.2l6.5 2.7 6.5-2.7" fill="none" stroke="#D9C89E" strokeWidth=".8" />
            <path d="M25.5 31.4l6.5 2.7 6.5-2.7" fill="none" stroke="#D9C89E" strokeWidth="1.3" />
            <path d="M32 31.9v8.3" stroke="#0a2438" strokeWidth=".6" />
          </svg>
        </div>
        <p className="sp-title">المنصة الوطنية للحج</p>
        <p className="sp-sub">إدارة الحج والعمرة السورية</p>
        <div className="sp-bar">
          <i />
        </div>
      </div>
      <SplashHider />
    </>
  );
}
