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
