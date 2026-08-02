---
name: us-e15.3-qa-patterns
description: principal member schedule fix-round QA — cross-repo BE-source verification technique, force-mock DI regression-lock pattern, story-diff-as-proof for "unmodified" claims
metadata:
  type: project
---

US-E15.3 (principal teacher-schedule picker, reusing `getByMember`) — rare fully-accurate
self-report post-fix-round, clean PASS, 100% AC coverage, zero new defects found.

**Cross-repo BE-source verification is cheap and worth doing every time a packet cites Go
line numbers.** The sibling `edu-api` checkout lives at `../edu-api` relative to
`edu-staff-web` (both under `Work/edu-staff/`). When a packet claims "BE's `authorize()` has
no MANAGER branch, cited at file.go:119-139" — just read those exact lines and the referenced
`shared.go` role-constant list. Takes one `Read` call, turns a trust-the-docblock claim into a
verified fact. Same technique for "endpoint X doesn't exist" claims: `grep -n "teachers"
services/core/docs/openapi.yaml` and confirm zero real path matches (watch for false-positive
substring hits in unrelated comments).

**Force-mock DI factory regression-lock pattern** (established at US-E13.8
`principal-classes.di.ts`, reused verbatim here as `timetable-view.di.ts`'s
`makeGetMemberTimetableForPrincipalUseCase`): when a repo call is *permanently* mocked because
the real BE call 403s for a whole role (not env-gated), the test that matters most is "stays
mock across `NEXT_PUBLIC_USE_MOCK` unset/false/true" (3 cases) + "never calls
`createServerHttpClient`" + a **sibling regression guard** that the OTHER factories in the
same DI file (the ones that ARE authorized) still resolve to the real/hybrid repo under
`USE_MOCK=false`. Without that last guard a future refactor could accidentally force-mock the
whole file and nothing would catch it.

**Story-diff-as-proof for "N pre-existing stories are unmodified".** Don't trust a claimed
count — `git diff main...HEAD -- <stories-file> | grep "^-export const\|^-"` and confirm zero
removed/modified lines for existing exports, only additions. Caught nothing wrong here, but
this is the cheap, definitive check versus re-running old stories and hoping nothing silently
changed their assertions.

**Real-mode-fails-honestly is a valid release gate, not just "code compiles".** When a
dependent endpoint (teacher roster list) genuinely doesn't exist on BE yet, the bar for PASS
is: confirm the failure surfaces as a normal typed error → error banner → working
`router.refresh()` retry (no crash, no silent empty/wrong data), by reading the DI factory
(plain `USE_MOCK ? Mock : Real`, not force-mocked) and the roster-error Storybook story
end-to-end, not by re-deriving it from the docblock's prose claim alone.
