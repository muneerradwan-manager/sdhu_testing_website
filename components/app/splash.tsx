/**
 * Splash screen on first open and on every refresh: the official seal draws itself (gold ring, rising eagle, twinkling
 * stars, halo pulsing), the platform name rises, a progress line fills — then it fades once the page is ready.
 *
 * Everything here is inline (styles and keyframes), so it shows correctly before the stylesheet has
 * loaded — the moment the page used to flash a giant unsized logo. It hides itself after a few seconds
 * even if JavaScript never runs; <SplashHider /> fades it out earlier, as soon as the page is interactive.
 */
import { EAGLE, MARK, STARS } from "@/components/brand/emblem-paths";
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
#sdhu-splash .sp-draw{stroke-dasharray:491;stroke-dashoffset:491;animation:sdhu-draw 1.1s ease .2s forwards}
#sdhu-splash .sp-eagle{opacity:0;animation:sdhu-rise .8s cubic-bezier(.16,1,.3,1) .35s both}
#sdhu-splash .sp-tw{animation:sdhu-twinkle 1.8s ease-in-out infinite}
#sdhu-splash .sp-tw:nth-child(2){animation-delay:.3s}
#sdhu-splash .sp-tw:nth-child(3){animation-delay:.6s}
#sdhu-splash .sp-title{font-family:var(--font-qomra),system-ui,sans-serif;font-weight:700;font-size:28px;letter-spacing:.3px;animation:sdhu-rise .8s cubic-bezier(.16,1,.3,1) .45s both}
#sdhu-splash .sp-sub{font-family:var(--font-qomra),system-ui,sans-serif;font-size:14px;color:#D9C89E;margin-top:-12px;animation:sdhu-rise .8s cubic-bezier(.16,1,.3,1) .6s both}
#sdhu-splash .sp-bar{width:160px;height:3px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden;animation:sdhu-rise .6s ease .75s both}
#sdhu-splash .sp-bar i{display:block;height:100%;width:40%;border-radius:3px;background:linear-gradient(90deg,#AD9E6E,#E4DDD3,#AD9E6E);animation:sdhu-load 1.2s ease-in-out .8s infinite}
#sdhu-splash .sp-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#sdhu-splash .sp-en{display:none}
html[data-lang="en"] #sdhu-splash .sp-en{display:inline}
html[data-lang="en"] #sdhu-splash .sp-ar{display:none}
html[data-lang="en"] #sdhu-splash :is(.sp-title,.sp-sub){font-family:var(--font-latin),var(--font-qomra),system-ui,sans-serif}
@keyframes sdhu-pop{from{opacity:0;transform:scale(.6) rotate(-12deg)}to{opacity:1;transform:none}}
@keyframes sdhu-halo{from{opacity:.9;transform:scale(.85)}to{opacity:0;transform:scale(1.35)}}
@keyframes sdhu-twinkle{50%{opacity:.25}}
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
      {/* Arabic and English both written, the page's language (set on <html> before the first paint) shows one */}
      <div id="sdhu-splash" role="status">
        <span className="sp-hidden">
          <span className="sp-ar">جارٍ تحميل المنصة الوطنية للحج</span>
          <span className="sp-en">Loading the National Hajj Platform</span>
        </span>
        <div className="sp-pattern" />
        <div className="sp-mark">
          <span className="sp-halo" />
          <span className="sp-halo b" />
          {/* The official seal (components/brand/logo.tsx): the gold ring draws itself, the eagle rises, the stars twinkle */}
          <svg viewBox={`${MARK.cx - 84} ${MARK.cy - 84} 168 168`} width="112" height="112" aria-hidden>
            <defs>
              <linearGradient id="sp-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#DCCDA2" />
                <stop offset=".55" stopColor="#C1B07E" />
                <stop offset="1" stopColor="#A39364" />
              </linearGradient>
            </defs>
            <circle cx={MARK.cx} cy={MARK.cy} r="83.5" fill="#00594F" />
            <circle className="sp-draw" cx={MARK.cx} cy={MARK.cy} r="78" fill="none" stroke="url(#sp-gold)" strokeWidth="1.8" />
            <g className="sp-eagle" fill="url(#sp-gold)">
              <path d={EAGLE} />
              <g>
                {STARS.map((d) => (
                  <path key={d} className="sp-tw" d={d} />
                ))}
              </g>
            </g>
          </svg>
        </div>
        <p className="sp-title" aria-hidden>
          <span className="sp-ar">إدارة الحج والعمرة</span>
          <span className="sp-en">Directorate of Hajj and Umrah</span>
        </p>
        <p className="sp-sub" aria-hidden>
          {/* As wide as the name above it, measured in Qomra at these sizes (28px / 14px): the splash is drawn before any script runs */}
          <span className="sp-ar">{`الس${"ـ".repeat(63)}ورية`}</span>
          <span className="sp-en">Syria</span>
        </p>
        <div className="sp-bar">
          <i />
        </div>
      </div>
      <SplashHider />
    </>
  );
}
