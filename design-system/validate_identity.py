#!/usr/bin/env python3
"""Non-destructive style-only validation for the Bastiyan identity branch."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re, subprocess
import tinycss2

ROOT=Path(__file__).resolve().parents[1]
pages=[
 "apps/his/src/index.html",
 "apps/kiosk/src/index.html",
 "apps/kiosk/src/auth-gate.html",
 "apps/kiosk/src/center-management.html",
 "apps/kiosk/src/user-management.html",
 "apps/kiosk/src/doctor-assistant.html",
 "apps/catalog/src/app/web/index.html",
 "apps/clinicsite/design-preview/index.html",
 "apps/holding-site/design-preview/index.html"
]
styles=[
 "apps/his/src/assets/bastiyan-visual-2026.css",
 "apps/kiosk/src/assets/bastiyan-visual-2026.css",
 "apps/catalog/src/app/web/bastiyan-visual-2026.css",
 "apps/clinicsite/design-preview/bastiyan-visual-2026.css",
 "apps/holding-site/design-preview/bastiyan-visual-2026.css"
]
class Html(HTMLParser):
 def __init__(self):super().__init__();self.styles=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="link" and a.get("rel")=="stylesheet":self.styles.append(a.get("href",""))
for p in pages:
 parser=Html()
 content=(ROOT/p).read_text(encoding="utf-8")
 parser.feed(content)
 refs=[u for u in parser.styles if "bastiyan-visual-2026.css" in u]
 if len(refs)!=1:raise AssertionError(f"{p}: require exactly one design overlay, found {refs}")
 for href in refs:
  target=urlsplit(href).path
  base=ROOT/("apps/kiosk/src" if p.startswith("apps/kiosk") else "apps/catalog/src/app/web" if p.startswith("apps/catalog") else p.rsplit("/",1)[0])
  link=(base/target.lstrip("/")).resolve() if target.startswith("/") else (ROOT/p).parent.joinpath(target).resolve()
  if not link.is_file():raise AssertionError(f"{p}: missing stylesheet {link}")
 print("HTML link OK:",p)
for p in styles:
 content=(ROOT/p).read_text(encoding="utf-8")
 parsed=tinycss2.parse_stylesheet(content,skip_comments=True,skip_whitespace=True)
 invalid=[n for n in parsed if n.type=="error"]
 if invalid:raise AssertionError(f"{p}: CSS errors: {invalid}")
 if "bastiyan-architecture.svg" in content:
  assert (ROOT/p).parent.joinpath("bastiyan-architecture.svg").is_file() if not p.startswith(("apps/clinicsite","apps/holding-site")) else (ROOT/p).parent.joinpath("assets/bastiyan-architecture.svg").is_file()
 print("CSS parse OK:",p)
# Refuse altering live business logic, manifests, databases or any installer as part of a visual patch.
changed=subprocess.check_output(["git","diff","--name-only","origin/main...HEAD"],cwd=ROOT,text=True).splitlines()
approved=lambda p: (
 p.startswith("design-system/") or
 p.startswith("apps/clinicsite/design-preview/") or
 p.startswith("apps/holding-site/design-preview/") or
 p in pages or
 p in styles or
 p.endswith("/bastiyan-architecture.svg") or
 p==".github/workflows/bastiyan-identity-review.yml"
)
bad=[p for p in changed if not approved(p)]
if bad:raise AssertionError("Non-visual files changed: "+repr(bad))
print("PASS: no API, business JS, authentication, database or install logic altered")
