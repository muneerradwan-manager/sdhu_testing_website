"""Screenshot framework driving the real demo site with the system Chrome (Playwright)."""
import json, os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
# CAP_BASE: another build served elsewhere (two captures running side by side)
BASE = __import__("os").environ.get("CAP_BASE", "http://localhost:3001")
ROOT = Path(__file__).parent
import os
OUTDIR = ROOT / os.environ.get("CAP_DIR", ".")
SHOTS = OUTDIR / "shots"
SHOTS.mkdir(parents=True, exist_ok=True)
MANIFEST = OUTDIR / "manifest.json"

HL_JS = """
(boxes) => {
  document.querySelectorAll('.__hl').forEach(e => e.remove());
  boxes.forEach(([r, i, label], idx) => {
    r = {top: r.y, left: r.x, width: r.width, height: r.height, right: r.x + r.width};
    const d = document.createElement('div');
    d.className = '__hl';
    d.style.cssText = `position:fixed;top:${r.top-6}px;left:${r.left-6}px;width:${r.width+12}px;height:${r.height+12}px;border:4px solid #D32F2F;border-radius:14px;box-shadow:0 0 0 2px rgba(255,255,255,.95);z-index:2147483646;pointer-events:none;`;
    document.body.appendChild(d);
    if (label) {
      const b = document.createElement('div');
      b.className = '__hl';
      b.textContent = label;
      b.style.cssText = `position:fixed;top:${r.top + r.height/2 - 15}px;right:${window.innerWidth - r.right - 22}px;background:#D32F2F;color:#fff;font:700 16px/1 system-ui,sans-serif;padding:7px 11px;border-radius:999px;border:2px solid #fff;z-index:2147483647;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.3)`;
      document.body.appendChild(b);
    }
  });
}
"""
UNHL_JS = "() => document.querySelectorAll('.__hl').forEach(e => e.remove())"


class Cap:
    def __init__(self, width=1440, height=900, scale=1.5, storage=None):
        self.p = sync_playwright().start()
        # The written exam is sat on camera: a simulated camera and microphone, already allowed
        self.browser = self.p.chromium.launch(channel="chrome", headless=True, args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        kw = dict(viewport={"width": width, "height": height}, device_scale_factor=scale, locale="ar-SY", timezone_id="Asia/Damascus", permissions=["camera", "microphone"])
        if storage and Path(storage).exists():
            kw["storage_state"] = storage
        self.ctx = self.browser.new_context(**kw)
        self.page = self.ctx.new_page()
        self.page.set_default_timeout(20000)
        self.manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else []
        self.n = len(self.manifest)

    # ── navigation ──
    def goto(self, path, wait=900):
        self.page.goto(BASE + path, wait_until="domcontentloaded")
        self.wait_splash()
        self.page.wait_for_timeout(wait)

    def wait_splash(self):
        try:
            self.page.wait_for_function("() => { const s = document.getElementById('sdhu-splash'); return !s || s.hasAttribute('data-hidden') || getComputedStyle(s).opacity === '0' || getComputedStyle(s).visibility === 'hidden'; }", timeout=12000)
        except Exception:
            pass

    def settle(self, ms=600):
        self.page.wait_for_timeout(ms)

    def scroll_to(self, sel, offset=120):
        loc = self.page.locator(sel).first
        loc.wait_for(state="attached")
        loc.evaluate("(el, off) => { const r = el.getBoundingClientRect(); window.scrollTo({top: r.top + window.scrollY - off, behavior: 'instant'}); }", offset)
        self.settle(700)

    def scroll_top(self):
        self.page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
        self.settle(400)

    def scroll_by(self, dy):
        self.page.evaluate("(dy) => window.scrollBy({top: dy, behavior: 'instant'})", dy)
        self.settle(500)

    # ── actions ──
    def click(self, sel, wait=700, **kw):
        self.page.click(sel, **kw)
        self.settle(wait)

    def click_text(self, text, exact=False, wait=700, nth=0):
        loc = self.page.get_by_text(text, exact=exact)
        loc.nth(nth).click()
        self.settle(wait)

    def fill(self, sel, value, wait=200):
        self.page.fill(sel, value)
        self.settle(wait)

    def otp(self, code="1448", wait=500):
        inputs = self.page.locator('input[aria-label^="الرقم "]')
        for i, ch in enumerate(code):
            inputs.nth(i).fill(ch)
        self.settle(wait)

    def type_pad(self, digits, wait=150):
        """Use the on-screen number pad (dir=ltr grid) — the real elderly-friendly path."""
        for d in digits:
            self.page.locator(f"div[dir='ltr'] button:text-is('{d}')").first.click()
            self.page.wait_for_timeout(60)
        self.settle(wait)

    # ── capture ──
    def shot(self, key, caption, hl=None, full=False, wait=500, section=None, note=None):
        self.settle(wait)
        boxes = []
        if hl:
            for i, h in enumerate(hl):
                sel, label = (h, "") if isinstance(h, str) else (h[0], h[1] if len(h) > 1 else "")
                try:
                    bb = self.page.locator(sel).first.bounding_box()
                except Exception as e:
                    bb = None
                if not bb:
                    print("   ! no highlight for", sel)
                    continue
                boxes.append([bb, i, label])
            self.page.evaluate(HL_JS, boxes)
            self.settle(150)
        self.n += 1
        fname = f"{self.n:03d}-{key}.png"
        path = SHOTS / fname
        self.page.screenshot(path=str(path), full_page=full)
        if hl:
            self.page.evaluate(UNHL_JS)
        entry = {"n": self.n, "key": key, "file": fname, "caption": caption, "section": section, "note": note}
        self.manifest.append(entry)
        MANIFEST.write_text(json.dumps(self.manifest, ensure_ascii=False, indent=1), "utf-8")
        print(f"[{self.n:03d}] {key}")
        return path

    def text(self, sel):
        return self.page.locator(sel).first.inner_text()

    def save_state(self, path):
        self.ctx.storage_state(path=path)

    def close(self):
        self.ctx.close()
        self.browser.close()
        self.p.stop()


def truncate(keep):
    """Drop shots after the first `keep` entries (resume a capture run from a checkpoint)."""
    man = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else []
    for e in man[keep:]:
        f = SHOTS / e["file"]
        if f.exists(): f.unlink()
    MANIFEST.write_text(json.dumps(man[:keep], ensure_ascii=False, indent=1), "utf-8")

def to_jpg():
    from PIL import Image
    out = OUTDIR / "jpg"; out.mkdir(exist_ok=True)
    for f in sorted(SHOTS.glob("*.png")):
        j = out / (f.stem + ".jpg")
        if j.exists() and j.stat().st_mtime > f.stat().st_mtime: continue
        im = Image.open(f).convert("RGB"); im.thumbnail((1600, 1600)); im.save(j, quality=82, optimize=True)
