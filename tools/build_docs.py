#!/usr/bin/env python3
"""Render the markdown in docs/ into the static HTML pages at the repo root.

Run from anywhere:  python3 tools/build_docs.py

The markdown files are the source of truth. The HTML is generated, committed, and
served by GitHub Pages. No build step runs on the server; there is no server.
"""
import pathlib, re, html, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

try:
    import markdown
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "markdown"])
    import markdown

HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} — Lenexa City Center Commons</title>
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light">
<link rel="icon" href="assets/mark.svg" type="image/svg+xml">
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="page">
<header class="topbar">
  <a class="brand" href="./">
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round" aria-label="Lenexa City Center Commons mark" role="img">
      <path d="M4 30 L12 22 L20 28 L28 16 L36 24"/>
      <path d="M6 34h28"/>
      <circle cx="28" cy="16" r="3.2"/>
      <path d="M12 22v-8"/>
    </svg>
    <span class="brand-text">
      <strong>Lenexa City Center Commons</strong>
      <span>notes from the neighborhood &middot; publish-only</span>
    </span>
  </a>
  <nav class="topnav" aria-label="Primary">
    <a href="./">Map</a>
    <a href="canon.html">Canon</a>
    <a href="three-doors.html">Three doors</a>
    <a href="preparedness.html">Preparedness</a>
    <a href="federation.html">Fork this</a>
    <a href="https://github.com/EVEglyphDesign/lenexa-city-center-commons" target="_blank" rel="noopener">Repo</a>
  </nav>
</header>
<main class="doc">
"""

FOOT = """</main>
<footer class="site">
  <div class="inner">
    <p><strong>Publish-only.</strong> This surface observes and publishes. It notifies no authority.
      In an emergency, call 911. The red <strong>Reach help now</strong> button opens your own
      phone's dialer — it never calls anyone for you, and it never tells anyone you tapped it.</p>
    <ul>
      <li><a href="https://www.lenexapublicmarket.com/" target="_blank" rel="noopener">Lenexa Public Market</a></li>
      <li><a href="https://www.lenexa.com/Events-Activities" target="_blank" rel="noopener">City of Lenexa events</a></li>
      <li><a href="https://www.copaken-brooks.com/our-properties/city-center-lenexa/" target="_blank" rel="noopener">Copaken Brooks — City Center Lenexa</a></li>
      <li><a href="https://github.com/EVEglyphDesign/ark-peer-review-ledger" target="_blank" rel="noopener">Sibling project: ARK Peer Review Ledger</a></li>
    </ul>
  </div>
</footer>
<script src="assets/twin.js"></script>
<script src="assets/panic.js"></script>
</body>
</html>
"""

PAGES = [
    ("docs/canon.md", "canon.html", "Canon",
     "The nineteen rules this surface runs on: safety first, sovereign data, no auto-notification, "
     "no accounts, walkable default, optional local twin, an emergency on-ramp that never claims to have called."),
    ("docs/three-doors.md", "three-doors.html", "Three doors",
     "Neighbor, Business Owner, Institutional Observer. All three produce the same artifact: a note. No door notifies an authority."),
    ("docs/federation.md", "federation.html", "Fork this",
     "How to stand up a Commons for another Midwest city: required tile fields, inherited canon 1–19, portable twin format, naming convention."),
]


def fix_links(h: str) -> str:
    h = h.replace('href="three-doors.md', 'href="three-doors.html')
    h = h.replace('href="canon.md', 'href="canon.html')
    h = h.replace('href="federation.md', 'href="federation.html')
    h = h.replace('href="../sweep/README.md"',
                  'href="https://github.com/EVEglyphDesign/lenexa-city-center-commons/blob/main/sweep/README.md"')
    h = h.replace('href="../../issues/new',
                  'href="https://github.com/EVEglyphDesign/lenexa-city-center-commons/issues/new')
    h = re.sub(r'<a href="(http[^"]+)"', r'<a href="\1" target="_blank" rel="noopener"', h)
    # stable anchors for numbered canon rules: canon.html#13
    h = re.sub(r'<h2>(\d+)\.', lambda m: '<h2 id="%s">%s.' % (m.group(1), m.group(1)), h)
    return h


md = markdown.Markdown(extensions=["extra", "sane_lists"])
for src, out, title, desc in PAGES:
    text = (ROOT / src).read_text()
    body = fix_links(md.convert(text))
    md.reset()
    (ROOT / out).write_text(HEAD.format(title=html.escape(title), desc=html.escape(desc)) + body + "\n" + FOOT)
    print("wrote", out)
