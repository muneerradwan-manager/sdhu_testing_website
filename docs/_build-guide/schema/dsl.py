# -*- coding: utf-8 -*-
"""The vocabulary the data model is written in. One description feeds both outputs: the Word document
(build_schema.py) and schema.sql (MySQL 8.0+ / MariaDB 10.6+), so the two can never disagree.

    T(name, title, desc, cols, ...)   a table
    c(name, type, desc, ...)          a column (NOT NULL unless null=True)
    M(key, title, intro, tables, ...) a chapter of tables
"""
from dataclasses import dataclass, field


@dataclass
class Col:
    name: str
    type: str
    desc: str
    null: bool = False
    pk: bool = False
    ai: bool = False
    uq: bool = False
    fk: str | None = None          # "table" (→ its id) or "table.column"
    od: str = "RESTRICT"           # ON DELETE: RESTRICT | CASCADE | SET NULL
    d: str | None = None           # DEFAULT, written as SQL (quote strings yourself)
    onupdate: bool = False
    ck: str | None = None          # a CHECK on this column, SQL

    def fk_target(self):
        if not self.fk: return None
        t, _, col = self.fk.partition(".")
        return t, (col or "id")


@dataclass
class Table:
    name: str
    title: str
    desc: str
    cols: list
    uq: list = field(default_factory=list)       # [("a", "b"), ...] composite unique keys
    idx: list = field(default_factory=list)      # [("a", "b"), ...] indexes
    checks: list = field(default_factory=list)   # ["SQL expression", ...]
    rules: list = field(default_factory=list)    # business rules, Arabic
    src: str | None = None                       # where it lives in the demo's code
    new: bool = False                            # proposed: the demo has no stored equivalent
    seed: str | None = None                      # what the initial rows are (text)
    module: str = ""

    def pk_cols(self):
        return [c.name for c in self.cols if c.pk]


@dataclass
class Module:
    key: str
    title: str
    intro: list
    tables: list
    flow: list = field(default_factory=list)     # how data moves through the chapter, Arabic steps
    blocks: list = field(default_factory=list)   # extra content after the tables (headings, lists, tables)
    notes: list = field(default_factory=list)


def c(name, type_, desc, **kw):
    return Col(name, type_, desc, **kw)


def T(name, title, desc, cols, **kw):
    flat = []
    for x in cols:
        flat.extend(x if isinstance(x, (list, tuple)) else [x])
    return Table(name, title, desc, flat, **kw)


def M(key, title, intro, tables, **kw):
    mod = Module(key, title, intro if isinstance(intro, list) else [intro], tables, **kw)
    for t in tables: t.module = key
    return mod


# ── the columns every table repeats ──

def pk(desc="المعرّف الداخلي، يتولّد تلقائياً"):
    return c("id", "BIGINT UNSIGNED", desc, pk=True, ai=True)


def created(desc="وقت الإنشاء (UTC)"):
    return c("created_at", "DATETIME(3)", desc, d="CURRENT_TIMESTAMP(3)")


def updated(desc="وقت آخر تعديل (UTC)"):
    return c("updated_at", "DATETIME(3)", desc, d="CURRENT_TIMESTAMP(3)", onupdate=True)


def stamps():
    return [created(), updated()]


def ref(name, table, desc, null=False, od=None, uq=False):
    """A foreign key to a table's surrogate id"""
    return c(name, "BIGINT UNSIGNED", desc, null=null, fk=table, od=od or ("SET NULL" if null else "RESTRICT"), uq=uq)


def season(desc="الموسم الهجري (مثل 1448)", null=False, name="season_year", **kw):
    return c(name, "SMALLINT UNSIGNED", desc, null=null, fk="seasons.season_year", od="SET NULL" if null else "RESTRICT", **kw)


def person(name, desc, null=False, od=None, uq=False):
    """A person of the civil registry, by national number"""
    return c(name, "CHAR(11)", desc, null=null, fk="civil_persons.national_id",
             od=od or ("SET NULL" if null else "RESTRICT"), uq=uq)


def account(name, desc, null=False, od=None, uq=False):
    return ref(name, "accounts", desc, null=null, od=od, uq=uq)


def staff(name, desc, null=True, od=None):
    return ref(name, "staff_users", desc, null=null, od=od)


def file_(name, desc, null=True):
    return ref(name, "files", desc, null=null)


def code_ref(name, table, desc, null=False, length=40, od=None, col="code"):
    """A foreign key to a reference table keyed by a short code"""
    return c(name, f"VARCHAR({length})", desc, null=null, fk=f"{table}.{col}",
             od=od or ("SET NULL" if null else "RESTRICT"))


def enum(*values):
    return "ENUM(" + ",".join(f"'{v}'" for v in values) + ")"


def by_staff(prefix, what):
    """Who decided (FK) plus when"""
    return [staff(f"{prefix}_by_staff_id", f"الموظف الذي {what}"),
            c(f"{prefix}_at", "DATETIME(3)", f"وقت {what.replace('قام ب', '')}", null=True)]


MONEY = "DECIMAL(12,2)"
