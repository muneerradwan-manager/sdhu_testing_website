# -*- coding: utf-8 -*-
"""Shared by the staff guide's capture runs (stf_*.py): a browser signed in as one employee, and the clicks they
all make. Each run captures its own part of the guide into its own CAP_DIR; staff_merge.py joins them into staff/.
Usage of a run: CAP_DIR=<folder> python stf_<part>.py"""
from cap import Cap, ROOT

# The administrators' states the runs start from (produced by adm_a.py and adm_c.py in admin/)
STATE = ROOT / "admin"


class Staff:
    def __init__(self, storage=None):
        self.c = Cap(storage=str(storage) if storage else None); self.p = self.c.page

    def login(self, user, shots=False, S="A"):
        c, p = self.c, self.p
        c.goto("/staff/login", wait=1500)
        p.locator("label:has-text('اسم المستخدم') input").first.fill(user)
        p.locator("label:has-text('كلمة المرور') input").first.fill("1448"); c.settle(300)
        if shots:
            c.shot("login-filled", "إدخال اسم المستخدم وكلمة المرور", hl=[("main button:text-is('دخول')", "")], section=S)
        p.locator("main button:text-is('دخول')").first.click(); c.settle(2500)
        # each lands on his own home: a file's dashboard, «لوحتي», his hall, his airport or his files
        p.wait_for_url(lambda u: "/staff/" in u and "/staff/login" not in u, timeout=20000); c.settle(1500)

    def clock(self, today, time=None):
        """Move the demo date (the season runs on its dates), then reload the page"""
        self.p.evaluate("""([d, t]) => { const k = 'sdhu-demo-v1'; const s = JSON.parse(localStorage.getItem(k) || '{}');
          s.clock = { ...(s.clock || {}), today: d, time: t || undefined }; localStorage.setItem(k, JSON.stringify(s)); }""", [today, time])
        self.p.reload(); self.c.wait_splash(); self.c.settle(1500)

    def logout(self):
        b = self.p.locator("button:has-text('تسجيل الخروج')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); self.c.settle(1500)

    def btn(self, text, wait=900, scope="main"):
        b = self.p.locator(f"{scope} button:has-text('{text}')").filter(visible=True).first
        b.scroll_into_view_if_needed(); b.click(); self.c.settle(wait)

    def link(self, text, wait=1200, scope="main"):
        a = self.p.locator(f"{scope} a:has-text('{text}')").filter(visible=True).first
        a.scroll_into_view_if_needed(); a.click(); self.c.settle(wait)

    def nav(self, label, wait=1500):
        """An entry of the sidebar (the staff portal's menu)"""
        a = self.p.locator(f"aside a:has-text('{label}'), nav a:has-text('{label}')").filter(visible=True).first
        a.click(); self.c.settle(wait)

    def close(self):
        self.c.close()
