# -*- coding: utf-8 -*-
"""The staff portal's permission catalog, read from lib/permissions.ts (CATALOG): its systems, each system's
resources, and each resource's verbs, named acts, scope and sensitivity. build_flows.py describes every system
from here, so the document cannot drift from the code: a system added to CATALOG without its description in
permissions.py stops the build."""
import re
from dataclasses import dataclass, field
from pathlib import Path

SRC = Path(__file__).resolve().parents[3] / "lib" / "permissions.ts"
VERB_LABEL = {"GET": "عرض", "POST": "إضافة", "PUT": "تعديل", "DELETE": "حذف"}
SCOPE_LABEL = {"center": "قاعة الامتحان", "airport": "المطار", "operation": "العملية", "collection": "مجموعة المحتوى",
               "office": "مكتب التسجيل", "opfileType": "نوع الملف التشغيلي", "posting": "مواقعه في الملفات التشغيلية"}
SHORT = {"G": ["GET"], "CRUD": ["GET", "POST", "PUT", "DELETE"]}


@dataclass
class Resource:
    key: str
    label: str
    verbs: list
    special: list = field(default_factory=list)   # [(key, label)]
    sensitive: bool = False
    scope: str | None = None
    note: str | None = None


@dataclass
class System:
    key: str
    label: str
    desc: str
    href: str
    line: int
    scope: str | None
    resources: list

    def keys(self):
        return [f"{self.key}.{r.key}.{v}" for r in self.resources for v in r.verbs + [k for k, _ in r.special]]


def _resource(m):
    key, label, verbs, more = m.group(1), m.group(2), m.group(3), m.group(4) or ""
    verbs = SHORT.get(verbs) or re.findall(r'"([A-Z]+)"', verbs)
    sp = re.search(r"special:\s*\[(.*)\]", more, re.S)
    special = re.findall(r'\["([^"]+)",\s*"([^"]+)"\]', sp.group(1)) if sp else []
    scope = re.search(r'scope:\s*"([^"]+)"', more)
    note = re.search(r'note:\s*"([^"]+)"', more)
    return Resource(key, label, verbs, special, "sensitive: true" in more, scope and scope.group(1), note and note.group(1))


def load():
    text = SRC.read_text("utf-8")
    start = text.index("export const CATALOG")
    end = text.index("export const PERM_SYSTEM")
    body = text[start:end]
    base = text[:start].count("\n") + 1
    systems = []
    # each system opens with `key: "…"` at four spaces; its block runs to the next one
    heads = [m for m in re.finditer(r'^    key: "([^"]+)",', body, re.M)]
    for i, h in enumerate(heads):
        block = body[h.start(): heads[i + 1].start() if i + 1 < len(heads) else len(body)]
        get = lambda k: (re.search(rf'^    {k}: "([^"]*)"', block, re.M) or [None, None])[1]
        res = [_resource(m) for m in re.finditer(r'R\("([^"]+)",\s*"([^"]+)",\s*(G|CRUD|\[[^\]]*\])(?:,\s*\{(.*?)\})?\)', block, re.S)]
        systems.append(System(h.group(1), get("label"), get("desc"), get("href"), base + body[: h.start()].count("\n"), get("scope"), res))
    return systems


SYSTEMS = load()
BY_KEY = {s.key: s for s in SYSTEMS}
ALL_KEYS = [k for s in SYSTEMS for k in s.keys()]
