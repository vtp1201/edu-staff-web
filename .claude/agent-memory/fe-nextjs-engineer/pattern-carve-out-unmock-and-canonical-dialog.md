---
name: pattern-carve-out-unmock-and-canonical-dialog
description: US-E24.11 — un-force-mock a MINORITY of a permanently-mocked DI file via a second repo factory; and check components/shared BEFORE promoting a feature-local dialog (reason-confirm-dialog is already the canonical home)
metadata:
  type: project
---

Three things US-E24.11 (class-hub homeroom tab, discipline leave inbox) settled.

**1. A permanently force-mocked DI file can be un-mocked for a MINORITY of its
factories — with a SECOND repo factory, never by making the existing one
conditional.** `discipline.di.ts` keeps `makeRepo()` returning the mock
unconditionally (14 factories) and adds `makeLeaveRepo()` with the ordinary
`USE_MOCK ? Mock : Real` gate (3 factories). Same class implements both: the real
repository implements exactly the un-blocked methods and leaves the rest as
`blocked()` stubs. Write the DI test in BOTH directions — the 3 follow `USE_MOCK`
AND all the others stay mock in real mode (loop over the factory list).
**Why:** the blocker doc that force-mocked the file is usually still TRUE for most
methods; flipping the shared factory would silently break every other screen the
day `USE_MOCK` goes false.
**How to apply:** find the ONE surface the documented blockers miss (here: a GVCN
inbox needs no roster-UUID lookup because core returns the ids, and no self-scope
discovery because the caller already stands in a `classId`). Update the repo class
doc to say which methods are real and which paragraph still applies to the rest.
Related: [[pattern-two-gaps-one-forcemock]], [[pattern-partial-gap-closure-wiring]].

**2. `components/shared/reason-confirm-dialog/` IS the canonical "confirm +
required reason" component (US-E18.44).** A packet/architect doc may tell you to
"promote" a feature-local `reject-*-dialog.tsx` into a NEW `components/shared/<x>/`
folder — that creates a third parallel dialog and violates decision 0026. Delete
the feature-local one and point every caller at `ReasonConfirmDialog`
(caller-owned copy props, `minLength` + `requiredMessage` + `tooShortMessage`);
keep the ORIGINAL i18n namespace (`discipline.leave.rejectDialog.*`) — namespace
by the string's origin, not by folder.
**Why:** grade-approval + grade-entry already migrated onto it; a third fork means
three places to fix a11y.
**How to apply:** `ls src/components/shared/` before acting on ANY promotion
instruction. Related: [[pattern-promote-shared-identity-header]].

**3. An async RSC cannot be a Storybook story.** When the AC names states that
only the component can show (`attendance-not-taken`, `empty-all`, `error-card`),
make the data-free presentational shell a Client Component (`useTranslations`
instead of `getTranslations`) and keep ALL server work in a `*-vm.ts` builder +
`page.tsx`. Precedent both ways in `class-hub/`: `TimetableTab` stayed RSC and has
no story; `HomeroomTab` became client and got its 8.
**Why:** the alternative (unit-testing `renderToStaticMarkup(await Card({vm}))`)
needs the next-intl request config and proves less than a real interaction.
**How to apply:** the RSC/client line belongs where DATA access stops, not where
JSX starts. Server Action refs pass through client props fine.

Bonus ground truth: core's `GET /conduct/student-leave-requests` needs EXACTLY ONE
of `classId`/`studentMemberId` (400 otherwise), and `POST /{id}/approve|reject`
need `studentMemberId` as a REQUIRED query param (it completes the
`(tenantId, studentMemberId)` partition key). A multi-class dashboard calling
`execute({})` therefore cannot be wired — refuse it in the repo before any HTTP
rather than guessing a class. Related:
[[pattern-usecase-level-authctx-and-shared-map-body]] (this one puts the 0063
guard back at the REPOSITORY, because the scope lives entirely in the authCtx).
