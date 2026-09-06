---
name: gotcha-storybook-viewport-and-upload-limits
description: Storybook interaction tests — scrollWidth reports a phantom 320px overflow, userEvent.upload is filtered by the accept attribute, and two i18n keys sharing one string make getByText ambiguous
metadata:
  type: project
---

Three interaction-test traps hit in one story (US-E24.6). Each cost a red run that looked like a real
defect.

**Why they matter:** each one either fakes a failure (1, 2) or fakes a pass if you "fix" it by
loosening the assertion.

**How to apply:**

1. **`element.scrollWidth <= clientWidth` is NOT a 320px-overflow check.** It counts the element's own
   padding box and reported 334 vs 320 with nothing actually overflowing. Assert per element instead:
   ```ts
   const overflowing = [...canvasElement.querySelectorAll("*")]
     .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1);
   await expect(overflowing).toHaveLength(0);
   ```
   Same diagnostic (map the offenders to `tag.class=right|text`) finds the real culprit fast.

2. **`userEvent.upload` respects `accept`.** A file with a disallowed extension never reaches
   `onChange`, so the "wrong file type" branch of a client validator is UNTESTABLE through the picker.
   Prove the ext rule in the pure validator's node test and say so in a comment in the story — the
   validator still earns its keep for drag-and-drop and renamed files.

3. **A shared string across two i18n keys breaks `getByText`.** "Vắng có phép" is both a StatCard label
   and a StatusBadge label (correct per design). Scope the query — `<section aria-labelledby>` has
   `role="region"`, so `within(canvas.getByRole("region", { name: cardTitle }))` is a clean scope that
   also doubles as an a11y assertion. Related: [[gotcha-tone-and-duplicate-i18n-copy]].

Bonus: a class-instance thrown across `vi.resetModules()` fails `instanceof`. Throw the RAW
axios-shaped error (`{ response: { status, data: { error: { code } } } }`) instead of
`new ApiError(...)` — `errorCodeOf`/`statusOf` read both, and the raw shape exercises the same path a
real un-normalised error would.
