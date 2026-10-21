# -*- coding: utf-8 -*-
"""The vocabulary the requirements specification (SRS) is written in. build_srs.py turns it into one Word
document and checks every reference first: a rule is an id of the business rules (rules/), a route a folder
under app/, data a table or table.column of the model (schema/), src a file and line of the site.

    FR(id, title, text, actor, accept=[...], rules=[...], routes=[...], data=[...], pri="M", state="demo")
    Area(key, prefix, title, intro, reqs)            a group of functional requirements
    NFR(id, kind, title, text, measure=None, now=None)  a non-functional requirement
    Q(id, topic, question, why, options=[...])       an open question the administration has to settle
"""
from __future__ import annotations
from dataclasses import dataclass, field

PRIORITY = {"M": "إلزامي", "S": "مهم", "C": "مرغوب"}           # MoSCoW: Must / Should / Could
STATE = {"demo": "موجود في النسخة التجريبية", "partial": "موجود جزئياً", "new": "غير موجود"}


@dataclass
class Req:
    id: str                 # "FR-REG-01": FR, the area's prefix, a two-digit number never reused
    title: str
    text: str               # «يجب أن تتيح المنصة …»: one capability, Arabic
    actor: str              # who uses it: الزائر، الحاج، الإداري، موظف بصلاحية «…»، النظام
    accept: list = field(default_factory=list)   # acceptance criteria, each one testable
    rules: list = field(default_factory=list)    # ["REG-07", ...] business rules it must obey
    routes: list = field(default_factory=list)   # ["app/portal/apply", ...] where the demo shows it
    data: list = field(default_factory=list)     # tables it reads or writes
    pri: str = "M"          # M | S | C
    state: str = "demo"     # demo | partial | new


@dataclass
class Area:
    key: str
    prefix: str             # "REG"
    title: str
    intro: list
    reqs: list


@dataclass
class Nfr:
    id: str                 # "NFR-SEC-01"
    kind: str               # the category, Arabic: الأمن، الخصوصية، الأداء…
    title: str
    text: str
    measure: str | None = None  # how it is checked: a number, a test
    now: str | None = None      # what the demo does today


@dataclass
class Question:
    id: str                 # "Q-01"
    topic: str
    question: str
    why: str                # what depends on the answer
    options: list = field(default_factory=list)


def FR(id, title, text, actor, accept=(), rules=(), routes=(), data=(), pri="M", state="demo"):
    return Req(id, title, text, actor, list(accept), list(rules), list(routes), list(data), pri, state)


def AREA(key, prefix, title, intro, reqs):
    return Area(key, prefix, title, list(intro), list(reqs))


def NFR(id, kind, title, text, measure=None, now=None):
    return Nfr(id, kind, title, text, measure, now)


def Q(id, topic, question, why, options=()):
    return Question(id, topic, question, why, list(options))
