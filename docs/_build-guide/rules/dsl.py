# -*- coding: utf-8 -*-
"""The vocabulary the business rules and the glossary are written in. build_rules.py turns them into one
Word document, and checks every reference first: each src is a file and line that exist in the site, and
each data reference is a table or table.column of the data model (docs/_build-guide/schema).

    R(id, title, text, src=[...], data=[...], cfg=None, ex=None, gap=None)   a business rule
    D(key, prefix, title, intro, rules)                                      a chapter of rules
    G(term, en, text, code=[...], data=[...], see=[...])                     a glossary entry
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Rule:
    id: str                 # "REG-01": the chapter prefix and a two-digit number, never reused
    title: str              # a short name, Arabic
    text: str               # the rule itself, Arabic, with its numbers
    src: list               # ["lib/registration/conditions.ts:42", ...] where the demo applies it
    data: list = field(default_factory=list)  # ["season_settings.max_companions", "applications"] where it lives in the data model
    cfg: str | None = None  # who can change the value and where (a setting, a published version), else it is fixed
    ex: str | None = None   # a worked example from the demo's data
    gap: str | None = None  # where the demo falls short of the rule, for the real platform to do


@dataclass
class Domain:
    key: str
    prefix: str             # "REG"
    title: str
    intro: list
    rules: list


@dataclass
class Term:
    term: str               # the Arabic term as the platform writes it
    en: str                 # the identifier the code uses for it
    text: str               # what it means on this platform, Arabic
    code: list = field(default_factory=list)  # ["lib/registration/types.ts:40", ...]
    data: list = field(default_factory=list)  # tables or table.column
    see: list = field(default_factory=list)   # other terms


def R(id, title, text, src, data=(), cfg=None, ex=None, gap=None):
    return Rule(id, title, text, list(src), list(data), cfg, ex, gap)


def D(key, prefix, title, intro, rules):
    return Domain(key, prefix, title, list(intro), list(rules))


def G(term, en, text, code=(), data=(), see=()):
    return Term(term, en, text, list(code), list(data), list(see))
