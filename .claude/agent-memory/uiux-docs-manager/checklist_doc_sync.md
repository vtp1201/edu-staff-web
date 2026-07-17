---
name: checklist-doc-sync
description: Canonical doc-sync checklist and file locations for uiux-docs-manager passes
metadata:
  type: reference
---

Canonical docs this role maintains (never create parallel trees):
- `docs/product/screens.md` — screen inventory. Sections: Auth (E01), All roles
  (E08 shell + E10 messaging), Teacher, Principal/Admin, Student, Parent, plus
  add new epic sections (e.g. "Social (Epic E19)") when a genuinely new domain
  lands. Update the top-of-file version/changelog prose line + the "## Ghi chú"
  bullet list (one bullet per new `design_src/edu/*.jsx`) every batch.
- `docs/product/design-system.md` — product-contract summary; §"Component &
  status mappings" is where new shared component patterns (e.g. `states.jsx`
  primitives) get one write-up. Token details stay terse — full detail lives in
  `.claude/rules/design-system.md` + `src/app/tokens.css` (tokens.css wins).
- `docs/design-requests/README.md` — Active Requests table, one row per DR.
  New DR rows start `[ ] pending doc-sync — mockup delivered, spec+copy staged`
  (do NOT mark `[x] delivered` — that flip is `uiux-lead`'s call after final
  validation + design-review gate).
- `docs/design-changelog.md` — the ONE new file this role may create (per
  `.claude/rules/uiux-workflow.md`). Did not exist before 2026-07-12 — I created
  it fresh with a "newest entry on top" chronological format, `[INTERNAL]`/
  `[EXTERNAL]` tags, What changed / Refs / Rationale sections per entry. No
  other changelog file existed anywhere in the repo to mirror style from.

Note on "who flips [x] delivered": the DR-012..019 pass established that
`uiux-lead` does the final `[x] delivered` flip after validating the batch.
DR-020 (2026-07-14) is a counter-example — the lead's task brief explicitly
directed `uiux-docs-manager` to mark DR-020 `[x] delivered` + check every
Delivery-checklist box (jsx/spec/i18n/screens.md/README/gate/harness-story all
already done by prior specialists in the same run) as part of THIS sync pass.
Read the actual task brief for who owns the flip in a given run rather than
assuming the DR-012..019 precedent always applies — the lead can delegate the
flip explicitly when it has already confirmed the artifacts exist.

Golden rules learned from the DR-012..019 group-B reconcile pass:
- ALWAYS extend an existing row (Profile, Messaging, Reports placeholder)
  in-place rather than duplicating — grep the target screen name in the table
  first. Reports had a pre-existing `⬜` placeholder row that just needed its
  design file + status filled in, not a new row.
- Shell-level / cross-cutting deliverables (banners, header-menu items, shared
  state primitives) don't get a route-shaped row — either fold into the
  relevant screen's row as a note, or add a brief shell-level row in "All
  roles" (e.g. email-verify banner, tenant-switch header menu).
- When a DR says "coordinate namespace with existing X" (e.g. tenant-switch
  vs. the pre-existing `tenant` i18n namespace/US-E01.2), reflect that
  coordination note directly in the screens.md row so `/ba`/`/fe` see it later.
- Confirm retired bespoke component names (e.g. `FeedSkeleton`/`ModSkeleton`)
  are actually thin wrappers around the new shared primitive (grep the file)
  before writing "supersedes" language — don't assume from the DR prose alone.

DR-021 (2026-07-17, Lesson Plan + Question Bank, US-E18.16 design follow-up):
- Working on a `docs/dr-NNN-*` branch alongside other in-flight agent memory
  edits (fe-lead, uiux-ux-writer) in the same working tree — `git status`
  showed unrelated modified memory files. Stage only the docs files this role
  owns (`git add docs/design-changelog.md docs/design-requests/README.md
  docs/product/screens.md`), never a blanket `git add -A`, to avoid sweeping
  another agent's in-progress edits into this commit.
- Verified i18n key counts by counting leaf nodes in `vi.json` with a small
  Python script (namespace dict may nest, so a raw `grep -c` overcounts) —
  more reliable than trusting the design-spec.jsonc comment count at face
  value, though in this case they matched (80 lessonPlan, 94 questionBank).
- When two net-new screens both get Teacher-section rows, model the row
  format on the *closest sibling* already in the table (Lesson Bank →
  lesson-plan row placed directly below it; Exam Bank → question-bank row
  placed directly below it) rather than grouping both new rows together —
  keeps domain adjacency (bank vs. authoring-tool pairs) readable.
- Lead's brief here explicitly said "do NOT mark the design-review gate
  checkbox" and reserved that self-audit step for itself — another
  confirmation that gate-flip ownership is stated per-run, not assumed from
  precedent (see existing note above on DR-020 vs DR-012..019).
