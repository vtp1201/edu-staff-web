---
name: pattern-retry-by-name-and-mobile-overflow-proof
description: E24.6 fix round — a partial-upload result must return failed item NAMES (a count re-sends everything and breaks a capped resource); a "no overflow at 375px" story needs per-element scrollWidth + offsetWidth (transforms), and it will find real StatCard overflow
metadata:
  type: project
---

Three reusable findings from the US-E24.6 review fix round (parent leave-request
attachments + attendance summary at mobile).

**A partial-failure result returns NAMES, never a count.** `uploadAll` returned
`failedCount: number`, so the screen kept the whole original `File[]` and the
retry re-POSTed all of them to a request that already held the successful ones →
core's 3-attachment cap (`LEAVE_REQUEST_ATTACHMENT_LIMIT_EXCEEDED`) → the retry
affordance could never clear its own error. Fix shape: repo/action returns the
failed items (`File[]` → `failedFiles: string[]` across the `'use server'`
boundary), the client keeps only `files.filter(f => failedFiles.includes(f.name))`,
and the story asserts `formData.getAll("file")` LENGTH, not just the id argument.
**Why:** a story that only checks "the retry hit the same requestId" is exactly
how the bug shipped. **How to apply:** any fan-out over a server-capped
collection (attachments, batch enrol, bulk seal) — assert the retry BODY.

**Role guards on a mutation are allowlists.** `if (role !== "student") return
requested;` fails open for teacher/principal/admin/unreadable-role. Enumerate the
two roles that may act, `return null` otherwise, and short-circuit before the
use-case. Prove it with `it.each` over forged role tokens asserting zero HTTP.

**Proving "nothing overflows at 375px".** `canvasElement.scrollWidth <=
clientWidth` on the root is too coarse; iterate every descendant, skip
`sr-only` (clipped to 1px by design), and report `TAG.className` so the failure
NAMES the culprit. Doing that exposed a real defect: the default shared
`StatCard` (px-6 + 52px icon + 26px value ≈ 173px min-content) does not fit a
2-up grid at 375px. Fixed by an opt-in `denseOnMobile` prop on the shared
component whose class strings all re-state the design-spec value at `sm:` (so no
existing caller changes) + a node test asserting that restoration.
See [[gotcha-dialog-grid-min-w-0]].

**Measuring a control inside a Radix dialog:** `getBoundingClientRect()` reads
the zoom-in ENTRANCE transform (44px measured as ~42), so a ≥44×44 touch-target
assertion flakes/false-fails. Use `offsetWidth`/`offsetHeight` — layout box,
transform-independent.
