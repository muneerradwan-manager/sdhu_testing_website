# -*- coding: utf-8 -*-
"""Add the live-demo link to an existing guide .docx without rebuilding it.
Usage: python add_site_link.py <content|admin_content|staff_content> <guide.docx>"""
import sys, importlib
from docx import Document
from site_link import add_to_guide
sys.stdout.reconfigure(encoding="utf-8")
mod = importlib.import_module(sys.argv[1])
doc = Document(sys.argv[2])
print("added" if add_to_guide(doc, mod.META, mod.INTRO) else "already there")
doc.save(sys.argv[2])
