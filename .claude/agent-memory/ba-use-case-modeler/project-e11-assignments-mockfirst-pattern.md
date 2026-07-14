---
name: project-e11-assignments-mockfirst-pattern
description: US-E11.7 Student Assignments — mock-first submit flow UC pattern, i18n gap found (overdue-days interpolation), mock-download-toast resolution pattern
metadata:
  type: project
---

US-E11.7 (Student Assignments, single-role `student`, `lms` service has zero
BE — 100% mock-first per decision 0014) produced UC-1171..UC-1179 in
`docs/stories/epics/E11-lms-exams/US-E11.7-student-assignments/use-cases.md`.

**Why:** first story in this repo where an ENTIRE screen (list + submit +
grading) is mock-first with no real endpoint at all (unlike US-E19.1 social
feed's partial-real status). Two recurring patterns worth reusing:

1. **i18n-gap-found-not-invented pattern**: when a design-spec.jsonc literal
   copy pattern (e.g. `"Quá hạn {n} ngày"`) doesn't match the actual staged
   i18n key's interpolation support (e.g. `daysLeft.overdue` has no `{days}`
   placeholder), flag it explicitly as a genuine pre-existing gap for
   `ba-spec-writer`/`ba-lead` to register a key change — do NOT invent the
   final key name in the use-cases doc, just name the exact mismatch.
2. **Mock-download honest-signal pattern**: for a UI-only "download" link with
   no real file behind it (mock-first), resolve as "click shows a toast
   saying it's a demo, no real file" rather than disabled/no-op — matches
   [[project-e19-social-shared-dialog-pattern]]'s mock-signal precedent
   (US-E19.1 non-persisted-pin toast). Always check if the toast copy key
   already exists before assuming it does; if not, flag as a new key (don't
   hardcode).

Also flagged 3 specific edge-case decisions worth reusing as a template for
future mock-first submit-flow stories: (a) file-size validation blocks the
"final" action only, not the "draft/save" action; (b) double-click guard =
the submitting sub-state's disabled/aria-busy control itself, no extra
dedupe logic needed; (c) a modal-a11y-correct focus-trap already prevents
"switch tab while sheet open" as a reachable state — don't invent new
interaction rules if the existing focus-trap contract already blocks it.
