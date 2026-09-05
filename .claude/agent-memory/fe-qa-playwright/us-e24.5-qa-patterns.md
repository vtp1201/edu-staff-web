---
name: us-e24.5-qa-patterns
description: QA patterns for US-E24.5 course player (high-risk lane) — allowlist bypass probing technique, full-suite timeout noise vs isolated pass, focus-retarget proof recipe
metadata:
  type: project
---

US-E24.5 course player (Udemy-style, LESSON/DOCUMENT/ASSIGNMENT/EXAM/locked + one-way
assignment submit) — rare case where the self-reported test suite (48 reviewer-written
embed-allowlist bypass cases + full a11y-fix Storybook stories) was genuinely accurate on
independent re-verification. Clean PASS.

- **Independent bypass-probe technique for a URL allowlist gate**: don't just re-run the
  existing 48 cases — think of DIFFERENT parser-confusion classes and probe them with a
  throwaway `node -e` script FIRST (fast, no test framework overhead) to see actual
  `new URL()` behavior before deciding whether a case is a real bypass or a non-issue. Found
  4 genuinely new classes for this allowlist: (1) userinfo-colon-without-`@`-ambiguity
  (`youtube.com:443@evil.com` → parses as userinfo="youtube.com", host="evil.com" — blocked
  twice over, by both the host-mismatch AND the existing username!=="" check); (2) WHATWG
  backslash-as-slash normalization (`https:\\host\path` → backslashes become `/` per spec,
  still resolves to a real, non-allowlisted hostname — no bypass); (3) DNS root-label
  trailing dot (`youtube.com.` stays a DIFFERENT string than `youtube.com` in a strict
  `Set.has()` compare — over-blocks, never over-permits, acceptable fail-safe direction);
  (4) fullwidth Unicode full-stop homograph (`youtube．com` → IDNA/UTS46 normalizes to ASCII
  `.` making hostname exactly `youtube.com`, i.e. genuinely the SAME real host, not a spoof —
  accepting it is correct, not a vulnerability). None broke the gate; all 4 added as
  permanent regression tests in `embed-source.test.ts`.
- **Full `bun vitest run` timeout noise is a known resource-contention artifact, not a
  regression signal** — a 4341-test parallel run threw 43 timeout failures across ~24
  unrelated RSC `page.test.ts` files (question-bank, lesson-plans, exam-bank, AND this US's
  own `items/[itemId]/page.test.ts`). Isolating the touched files
  (`bun vitest run "path/to/items/[itemId]" "src/features/lms/presentation/course-player"`)
  passed 63/63 with zero timeouts in 1.5s. Always re-run a filtered/isolated invocation before
  treating a full-suite timeout as a real defect — check `git diff --stat` to confirm the
  failing unrelated files were untouched by the current branch's diff.
- **Focus-retarget proof recipe for a multi-step reducer flow** (ready→confirming→
  submitting→submitted→error, US-E24.5's `submit-box.tsx`): assert
  `container.contains(document.activeElement)` at EVERY transition, not just the terminal
  one — this US's Storybook `ConfirmThenSubmit` story checks focus lands inside
  `role="status"` on entering `confirming`, returns to the trigger button on `cancel-confirm`,
  and lands in the terminal banner on `submitted`. A "static code review says focus effect
  exists" claim is NOT proof; only a real `userEvent.click` + `document.activeElement`
  assertion is.
- **Double-submit-guard proof recipe**: story fires a real `userEvent.click` then a raw
  `.click()` on the (React-detached) button node to simulate a double-click racing the
  unmount, asserts `CONFIRM_CALLS` (a module-level array the mock `submitAssignment` pushes
  into) has length 1 — proves the reducer's `submitting`-only-reachable-from-`confirming`/
  `error` invariant holds under a hostile double-press, not just "looks right in the code".
- Server Action `revalidatePath` proof: assert `revalidatePath.mock.calls` as an exact array
  (both the item route AND the sibling course-timeline route) on BOTH the 200 success path
  AND the 409 race path — a single assertion on "was called" would miss a mutant that only
  revalidates on one path.
