---
name: gotcha-storybook-dark-globals-and-visual-audit
description: addon-themes `globals: { theme: "dark" }` is NOT applied by the vitest storybook runner (dark stories render light and still pass); how to force .dark and how to take a real screenshot for a visual audit
metadata:
  type: feedback
---

**A story with only `globals: { theme: "dark" }` renders in LIGHT mode under
`vitest --config vitest.storybook.mts` and passes anyway** — proven on US-E24.12
(probe: `document.documentElement.className === ""` inside `play`). `withThemeByClassName`
reads a Storybook *global*, and story-level globals are applied by the UI toolbar, not the
browser runner. So a "Dark" story added as dark-mode proof proves nothing.

**Fix:** `src/test/storybook-dark-decorator.tsx` → `withDarkTheme` decorator adds `.dark`
to `document.documentElement` in `useEffect` and removes it on cleanup (html-level, so
portalled dropdown/dialog content is covered too; a wrapper `<div className="dark">` is not).
Keep `globals` alongside it for the Storybook UI. Make the story *assert* the token actually
won: `getComputedStyle(document.documentElement).getPropertyValue("--edu-card").trim()`.

**Real screenshots for a visual/design audit** (cheap, no Playwright harness needed): a
throwaway `*.stories.tsx` whose `play` calls `page.screenshot({ path: "x.png" })` from
`@vitest/browser/context`, run through the storybook vitest config — the PNG lands next to
the story file and can be Read directly. Compose one story with every surface you need to
judge at once (sidebar + header + cards + every badge tone + each `bg-edu-*-light` chip +
input), screenshot, then delete story + PNGs. This is how the US-E24.12 dark pass caught an
invisible 1.10:1 badge that no unit test could see.

Gotchas when composing such a story: `Header` needs `QueryClientProvider` AND
`parameters: { nextjs: { appDirectory: true } }` (next-intl `useRouter` → next/navigation
mock invariant), and `console.log` from the browser is NOT surfaced in the run output —
probe by throwing an Error with the value in the message.

**How to apply:** any story whose whole point is a theme/appearance state. Never report
"dark stories green" as dark-mode proof without one of the two mechanisms above.
See [[gotcha-theme-fixed-foreground-token]], [[gotcha-storybook-vitest-runner-broken]].
