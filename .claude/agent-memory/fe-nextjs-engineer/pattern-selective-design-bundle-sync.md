---
name: pattern-selective-design-bundle-sync
description: US-E24.0 — syncing a designer bundle into design_src/ is SELECTIVE; design_src/EduPortal.html is gitignored; design-spec.jsonc entries must be validated as JSON after edit
metadata:
  type: project
---

Syncing an external designer bundle (`~/Downloads/design_srcNNNN`) into
`design_src/` is a **selective copy**, never `cp -r`.

**Why:** the bundle is a full snapshot of the designer's own tree, so a blind
overwrite silently (a) reverts in-repo design decisions the designer never saw
(E24.0: the bundle deleted the DR-023 "Lịch sử liên kết" audit trail from
`parent-links.jsx`, already built in `src/` with BE data behind it), (b) strips
decision-provenance comments (`tokens.js` diff was 100% comments — values
byte-identical — but the repo's comments cite decisions 0040/0027/0046/0013),
and (c) the bundle simply does not contain the mockups the uiux team authored
in-repo (DR-020..023), which a `rsync --delete`-style sync would drop.

**How to apply:**
- Classify every file first: NEW / UPDATED / keep-repo / not-in-bundle. `diff -rq
  <bundle>/edu design_src/edu` before AND after; the after-diff is the proof
  artifact for the packet Evidence.
- `design_src/EduPortal.html` is **gitignored** (`.gitignore:68`) — copying it is
  correct and required for local browser use, but it will never show in
  `git status`. Verify its `<script src="edu/*.jsx">` list diff is purely
  ADDITIVE before overwriting, otherwise you orphan kept mockups.
- New `docs/product/design-spec.jsonc` screen entries go INSIDE the top-level
  `"screens"` object (it closes well before the sibling keys `class-log`,
  `components`, …). After editing, strip `//` comments and `json.loads()` it —
  a stray comma in a 10k-line JSONC is invisible to tsc/build/tests.
- Bundle hardcodes raw hex outside `tokens.js` (`#0E9A82`, `#EEF1F6`, `#00806F`,
  `#0f1117`) — all already have tokens (`--edu-success-text`, `--muted`,
  `--edu-teal-text`, `--edu-media-surface`). Record the mapping as a doc note in
  the design-spec entry; do NOT add a token, do NOT raise an ADR.
- Known design-vs-BE deviations get **flagged inline per entry**, not fixed —
  the corrected bundle comes back from the designer.

Related: [[pattern-force-mock-vs-honest-degrade]] (same "record the gap, don't
paper over it" discipline).
