---
name: pattern-diff-sync-unmock
description: "E18.28 un-mocking a write path that has only per-op routes: diff-sync inside the existing repo method, entity fields added for round-trip fidelity (not UI), splitting one capability flag into two, and measuring test baselines honestly via a worktree"
metadata:
  type: project
---

Un-mocking `updateExam`/`deleteExam` (exam-bank, core US-152) after the BE added
per-op routes but still no bulk endpoint.

**Why:** epic E18 progressively un-mocks features as `edu-api` ships endpoints;
the shapes below recur every time a *write* path (not just a read) unblocks.

**How to apply:**

- **Diff-sync lives INSIDE the existing repo method** — the domain interface
  never grows methods just because the wire needs N calls. Order
  `GET → PATCH → DELETE → PUT → POST → GET`: deletes first so server-side
  position renumbering settles; unconditional PUT (an idempotent no-op beats a
  stale-content-diff bug); trailing GET because the server recomputes derived
  fields. Prove the ORDER with a shared `calls: string[]` push in each mocked
  verb, asserted with one `toEqual([...])` — call-count assertions alone miss
  sequencing regressions.
- **A "lossy mapper" becomes a correctness bug the moment the write path opens.**
  Synthetic ids (`q-${position}`) are fine for read-only, fatal for diff-sync
  (every edit looks like a fresh append). When un-mocking a write, re-read the
  mapper for every dropped field and ask "does an unconditional write reset
  this?" Two fields had to join the entity as OPTIONAL round-trip-only carriers
  — `questionType` (else a PUT rewrites an ESSAY as MCQ) and `marks` (else every
  edit silently zeroes the server's weight). Optional keeps existing fixtures
  and mock repos compiling untouched. Round-trip fields are NOT a UI feature —
  no input, no i18n.
- **Read the Go entity validator, not just the request DTO.** `validateOptions`
  revealed: option text must be non-empty (so send only FILLED options — the
  builder seeds 4 blanks), an option-less MCQ needs `answerKey` instead, and a
  non-MCQ may carry none of options/correctOptionId/answerKey. The DTO's
  `omitempty` tags say none of that.
- **Split the capability flag when only part of a feature un-blocks.** One
  `authoringEnabled` prop had come to mean create+edit+delete; edit/delete going
  real needed a second `editingEnabled`, with the old flag narrowed to create.
  Keep mock behaviour bit-identical by leaving the old flag inside the new
  expression (`isOwner && editingEnabled && (authoringEnabled || isDraft)`)
  rather than silently tightening the mock path.
- **Check the owner-identity plumbing before trusting an ownership gate.** The
  list page still passed a hardcoded `MOCK_CURRENT_TEACHER_ID`, so `isOwner`
  could never be true against real `authorId`s — the whole gating change would
  have been dead code. Real mode must resolve `decodeSubClaim(await
  getAccessToken())`; importing those two in an RSC page is established
  (`admin/academic-records/page.tsx`).
- **Extract the RSC route gate as a pure domain policy** (`resolveBuilderAccess`)
  → unit-testable branch instead of a source-string regression guard. Return a
  discriminated `{allowed}` + `reason`, and define the reason union in DOMAIN so
  presentation can import it (never the reverse).
- **A blocked affordance: omit + one explanatory note beats N disabled buttons.**
  Disabled icon buttons are focusable dead ends; `role="note"` once per list
  (rendered only when it could matter, e.g. >1 item) reads better and matches
  the existing "genuinely gone" menu-item idiom.
- **A negative story assertion can be killed by your own new copy.** `queryByText
  (/Tạo đề thi mới/)` "no ghost create button" broke when the note started
  containing that phrase. Scope such guards to a ROLE
  (`queryByRole("link", {name})`), or assert the single matching node IS the
  note (`getAllByText` → length 1 → `toHaveAttribute("role","status")`).
- **Measure before/after test counts honestly**: `git worktree add /tmp/x <base>`
  + `ln -s <main>/node_modules` gives a real baseline in ~30s for `bunx vitest
  run`. The Storybook runner does NOT work in such a worktree (needs this
  checkout's `.cache/storybook`; it errored on all 148 files) — say so and derive
  that one number instead of inventing a measurement.

- **Un-blocking a route resurrects EVERY field on it — sweep the whole form, not
  just the field you changed.** Review MUST-FIX: making the builder reachable in
  real mode exposed two controls (`subjectId` immutable server-side,
  `maxAttempts` with no wire field) that were collected into the input, dropped
  by the PATCH, and followed by `toast.success` — a false success on user input.
  I had *flagged* them and not fixed them; flagging is not enough when the same
  US created the reachability. Same `disabled` + one `aria-describedby`
  explainer treatment as the reorder case; keep the field VISIBLE when it is
  meaningful read-only context.
- **Client pre-check before the FIRST call of a non-atomic sequence.** A
  server-side generic `VALIDATION_FAILED` (core `pkg/kit/response/error.go`) maps
  to `unknown` AND arrives after earlier calls already persisted. If the
  component already computes per-item validation for another gate (publish),
  reuse that exact map in the save path: select the offending item, show its
  specific failure, never write. Apply in mock too — the server can never accept
  it, so mock leniency trains a workflow that breaks in prod.

Related: [[pattern-be-wiring-remap]], [[pattern-boundary-narrow-remap]],
[[pattern-hybrid-partial-real-wiring]], [[gotcha-openapi-drifts-from-go-source]].
