---
name: pattern-question-bank-e11-9
description: E11.9 question-bank — call-site forbidden mapper, mode-conditional search key, typed-i18n error narrowing, mockup-underprovisioned namespace
metadata:
  type: project
---

US-E11.9 (question-bank, `core` exercisebank) reusable patterns. See also
[[pattern-mock-first-wiring]], [[pattern-rsc-seeded-infinite-query]],
[[gotcha-result-shape-and-dynamic-i18n]], [[pattern-usecase-result]].

**Why:** two BE denials share one wire code + typed-messages force careful error-key handling; the design mockup under-specifies i18n vs a production a11y build.

**How to apply:**
- **Call-site forbidden disambiguation:** when one wire code (`403 FORBIDDEN_ACTION`) means two things (role-gate vs ownership), the infra error mapper takes a `callSite: "browse"|"edit"` param FIXED PER REPOSITORY METHOD (search/list/create→"browse"; update/publish→"edit"); NEVER infer from the code. Test asserts same code → two results by call-site. `fe-tech-lead-reviewer` specifically checks this signature.
- **Mode-conditional search query key:** when a filter is a real server param in one mode but ignored in another (FR-005 split), the key factory returns DISJOINT shapes per mode (`["search","subject",sid,tag,grade,diff]` vs `["search","tag",tag]`) so a mode switch never serves a stale page and the ignored dims don't fragment cache. Client-only filters (questionType always, status) never enter any key — applied as `.filter()` over fetched pages.
- **Typed-messages error narrowing:** do NOT call `tErr(errorKey)` with a broad `Failure["type"]` union — typed messages then require ALL union keys in the namespace. Instead use an explicit `toErrorMsgKey(key): <existing-key-subunion>` switch that collapses client-prevented/defensive failures to `unknown`, and pass PRE-TRANSLATED strings (not raw keys) into presentational sub-components for optional field errors.
- **Mockup under-provisions i18n:** design_src mockups hardcode strings a production a11y build needs as keys (unsaved indicator, min-length helper, tag-remove aria, dismiss, load-more, "Grade {n}"). Adding them beyond the spec's "authorized" count is correct per i18n rules (genuine gaps) — add to vi+en together and flag the extras to fe-lead transparently.
- **expectedAnswer optional (FR-007):** entity `string|null`, mapper normalizes absent/""/null→null; validate has NO required-check; publish gates on body only. This is a "must never regress" rule — assert it per questionType in the validate test.
- **Builder = plain Server Actions + useTransition + local state** (mirror SHIPPED lesson-plan, not its design doc). `useQueryClient().invalidateQueries(listMineRoot())` on save/publish success is the one client-cache touch; reads come via RSC props.
