# -*- coding: utf-8 -*-
"""The vocabulary the roles, permissions and state machines are written in. build_flows.py turns them into
one Word document, draws every machine (Graphviz through viz.js, like build_erd.py), and checks every
reference first: src is a file and line of the site, data a table or table.column of the model, route a
folder under app/, and every transition joins two states of its machine.

    Perm(key, label, text, routes=[...], actions=[...], src=[...], data=[...], manages=False)  a staff permission
    Actor(key, label, text, can=[...], cannot=[...], src=[...])                               a kind of user
    State(value, label, text="", final=False)                                                 a state
    Move(src_state, dst_state, trigger, actor, src=[...], auto=False)                         a transition
    Machine(key, title, text, data, states, moves, src=[...], initial=None, gap=None)         a state machine
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Perm:
    key: str                # the Permission literal in lib/staff.ts, e.g. "registration.manage"
    label: str              # its Arabic name as the portal shows it
    text: str               # what it lets the holder do, Arabic
    routes: list = field(default_factory=list)   # ["app/staff/registration", ...] the screens it opens
    actions: list = field(default_factory=list)  # ["يعتمد نتائج القرعة وينشرها", ...] what the holder can do there
    src: list = field(default_factory=list)      # ["lib/staff.ts:20", ...] where it is declared and checked
    data: list = field(default_factory=list)     # tables it writes
    manages: bool = False   # the management of a whole file (MANAGEMENT_PERMISSIONS)


@dataclass
class Actor:
    key: str                # "pilgrim", "admin", "staff", "visitor"
    label: str
    text: str
    can: list = field(default_factory=list)
    cannot: list = field(default_factory=list)
    src: list = field(default_factory=list)


@dataclass
class State:
    value: str              # the literal the code stores, e.g. "accepted"
    label: str              # its Arabic label as the site shows it
    text: str = ""
    final: bool = False


@dataclass
class Move:
    a: str                  # from state value ("*" = from any state)
    b: str                  # to state value
    trigger: str            # what causes it, Arabic: the button, the deadline, the import…
    actor: str              # who: الحاج، الإداري، موظف بصلاحية x، النظام
    src: list = field(default_factory=list)
    auto: bool = False      # done by the system (a timer, a deadline, a calculation), not a person


@dataclass
class Machine:
    key: str
    title: str
    text: str
    data: str               # where the state lives: "applications.status"
    states: list
    moves: list
    src: list = field(default_factory=list)
    initial: str | None = None
    gap: str | None = None  # what the demo lacks (e.g. transitions it allows that it shouldn't)


def P(key, label, text, routes=(), actions=(), src=(), data=(), manages=False):
    return Perm(key, label, text, list(routes), list(actions), list(src), list(data), manages)


def A(key, label, text, can=(), cannot=(), src=()):
    return Actor(key, label, text, list(can), list(cannot), list(src))


def S(value, label, text="", final=False):
    return State(value, label, text, final)


def T(a, b, trigger, actor, src=(), auto=False):
    return Move(a, b, trigger, actor, list(src), auto)


def SM(key, title, text, data, states, moves, src=(), initial=None, gap=None):
    return Machine(key, title, text, data, list(states), list(moves), list(src), initial, gap)
