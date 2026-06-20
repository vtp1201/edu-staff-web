---
name: gotcha-storybook-baseline-failures-and-dual-dialog
description: vitest:storybook runner has pre-existing env failures (router mock) — git-stash to baseline before blaming your story; scope getByRole(dialog) by name when a Sheet + Dialog coexist
metadata:
  type: feedback
---

`bun vitest:storybook run` (browser/playwright) is partially broken env-wide:
many screens fail with `invariant expected app router to be mounted`
(useRouter/useSearchParams not mocked in the runner setup). Some MessagingScreen
stories (`Create Group Optimistic Prepend`, `Reply Strip Active`) FAIL at baseline.

**Why:** the runner is flaky/under-configured for app-router screens; not every
red is your regression.

**How to apply:** before treating a failing story as your bug, `git stash` your
changes and re-run the same filtered story set to get the baseline. Only own the
deltas. The node-env `bun vitest run` (vitest.config.mts, environment:"node") is
the authoritative gate and is fully green — `.test.tsx` React rendering is NOT
possible there (no jsdom, no @testing-library/react), so component-behavior proof
goes through Storybook interaction stories, not Vitest .test.tsx.

**Dual role="dialog" scoping:** GroupInfoPanel is a Radix Sheet (role="dialog")
and a modal opened from inside it (Radix Dialog) is ALSO role="dialog". A bare
`getByRole("dialog")` is ambiguous and "modal closed" assertions match the still-
open Sheet. Always scope by accessible name:
`body.getByRole("dialog", { name: /thêm thành viên/i })` for the modal vs
`{ name: /thông tin nhóm/i }` for the panel. Same when clicking a pinned-message
row whose excerpt text is duplicated as a chat bubble — `within(panel).getByText`
not `body.getByText`.

See [[pattern-rsc-props-local-state-screen]], [[gotcha-storybook-vitest-runner-broken]].
