---
name: gotcha-dialog-grid-min-w-0
description: Shared DialogContent is a CSS grid; its children need [&>*]:min-w-0 or they overflow horizontally at 320/375px (DEF-E23.1-01 root cause)
metadata:
  type: feedback
---

`components/ui/dialog/dialog.tsx` `DialogContent` is a CSS `grid` container. Grid
items (and flex items) default to `min-width:auto`, so they REFUSE to shrink below
their content's intrinsic min-content width → real horizontal overflow at narrow
viewports even when the dialog box itself is capped by `max-w-[calc(100%-2rem)]`.
Fix applied: add `[&>*]:min-w-0` to `DialogContent` so every direct grid-item child
(header/body/footer) can shrink to the box. One class fixed DEF-E23.1-01 at both
320px and 375px; no change needed to TenantCard (its text column already had
`min-w-0 flex-1` + `truncate`).

**Why:** QA (fe-qa-playwright) caught this with real-browser `page.viewport()` resize
in a Storybook test — the inert `parameters.viewport` addon can't catch it. `scrollWidth`
exceeded `clientWidth` inside the dialog. Same root-cause class as the flex `min-width:auto`
gotcha (a flex item also won't shrink below content without `min-w-0`).

**How to apply:** When any dialog/flex/grid container overflows horizontally at narrow
viewports, suspect missing `min-w-0` on the SHRINKING children first (not a fixed width).
`[&>*]:min-w-0` only lowers the min-width floor — it never breaks content that already
fits, so blast radius on other `DialogContent` consumers is safe (verified 22 shared
files / 127 storybook tests still green). NOTE: this is distinct from
`email-verify-dialog` `Viewport320`, whose overflow is fixed-width OTP cells (~301px),
NOT the grid floor — `min-w-0` does not fix that one (it was already passing anyway).
Prove narrow-viewport overflow with `import('vitest/browser').page.viewport(w,700)` in a
Storybook play fn, assert `scrollWidth <= clientWidth + 1`. See [[gotcha-dropdown-to-dialog-and-exit-animation]].
