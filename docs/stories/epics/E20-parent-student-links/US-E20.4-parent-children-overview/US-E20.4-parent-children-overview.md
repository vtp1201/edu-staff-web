# US-E20.4 Parent Children Overview (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/parent-links/` (reuse
  `get-linked-students-with-consents.use-case.ts`, or a narrower sibling if the
  consent payload is heavier than this screen needs), route
  `app/[locale]/t/[tenant]/(app)/parent/children/page.tsx`
- Shared contract/file: `LinkedStudentSummary` entity — REUSE, do not
  re-resolve via `features/timetable`'s `TimetableChild` (see rationale below)

## Product Contract

Sidebar nav (`nav-config.ts`, parent role) links to `/parent/children` but only
`parent/children/[studentId]/academic-record` exists (unreachable from the UI —
no way to discover a `studentId` without this index). This adds the missing
"my children" overview: a card per linked child, name + class + a link into
that child's academic record (and, once built, other child-scoped screens).

**Important reuse disambiguation (do not swap these two):**
`features/parent-links`'s `LinkedStudentSummary` (`fullName`, real, resolved by
`GET /parents/{id}/linked-students`-equivalent, US-E20.2/INT-001) HAS a real
child name in production. `features/timetable`'s `TimetableChild` (used by the
schedule/grades child-pickers) documents a KNOWN residual gap — `name` is
`undefined` in real mode (ask #20, no directory endpoint a PARENT can call
resolves a student's name) and falls back to an ordinal label. Building this
overview screen on `TimetableChild` would ship a page that shows "Con thứ 1",
"Con thứ 2" instead of real names for no reason — use `parent-links`'s entity,
which already has the name.

## Relevant Product Docs

- No `docs/product/design-spec.jsonc` entry for this screen. Reuse the design
  system's card pattern (`StatCard`/list-card conventions) — name, avatar
  initials, class chip, "Xem học bạ" (view academic record) CTA per child.

## Acceptance Criteria

- Given a parent with ≥1 linked child, `/parent/children` shows one card per
  child with the child's real name (never an ordinal fallback for this
  screen — that fallback belongs to the timetable/grades pickers only, not
  here).
- Given a parent with zero linked children, the page shows the existing
  no-child empty state pattern (reuse, consistent with `parent/grades`'
  "no-child" state).
- Clicking a child card navigates to
  `/parent/children/[studentId]/academic-record` (existing route, made
  reachable).
- If the underlying consents payload includes per-subject/per-scope consent
  flags this screen doesn't need, do not surface them here — that is
  `parent/profile`'s consent section's job (US-E20.2), not this overview's.
- WCAG 2.1 AA: each card is a single focusable/keyboard-activatable unit with
  an accessible name (not icon-only), visible focus ring.

## Design Notes

- Commands: none (read-only).
- Queries: `getLinkedStudentsWithConsentsAction()` (existing, US-E20.2) — if its
  return shape is consent-heavy, either reuse as-is and select just
  `studentId`/`fullName`/`avatarUrl` in the ViewModel mapper, or (if the
  component-architect judges it cleaner) add a narrow read projection —
  confirm with `fe-component-architect`/`fe-state-engineer` before deciding;
  do not fetch consents twice.
- API: whatever `parent-consent.repository.ts` already calls — no new BE call.
- Domain rules: none new.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/parent/children/page.tsx` (RSC) +
  `features/parent/presentation/children-overview-screen/` (new; parent's own
  presentation home, not parent-links', since parent-links' domain purpose is
  consent management — keep the screen namespaced where a parent expects "my
  dashboard" screens to live, mirroring `parent-dashboard.tsx`'s home).

## Validation

| Layer | Expected proof | Actual |
| --- | --- | --- |
| Unit | ViewModel-mapping test (select child summary fields, no-child empty mapping) | ✅ 14 tests — `build-children-overview-vm.test.ts` (8) + `child-identity-header.test.tsx` (6) |
| Integration | none new (repository already covered by US-E20.2) | ✅ n/a — no new repo/HTTP boundary |
| E2E | Storybook interaction: cards render, empty state, card → academic-record navigation | ✅ 11 stories (7 screen + 4 shared component), incl. loading/empty/error+retry/keyboard/href |
| Platform | `bun build` clean | ✅ clean with `NEXT_PUBLIC_USE_MOCK=` unset; route emitted |
| Release | design-review gate + a11y audit green | ⏳ pending `fe-lead` review/QA gate |

## Harness Delta

Registered via `harness-cli story add --id US-E20.4`.

## Evidence

Implemented on `feat/us-e20.4-parent-children-overview` (commits `43a6419`
shared-component promotion, `365377e` screen + route).

### Files

| Layer | File |
| --- | --- |
| Presentation (pure) | `src/features/parent/presentation/children-overview-screen/build-children-overview-vm.ts` (+ `.test.ts`), `children-overview-screen.i-vm.ts`, `children-overview.query-keys.ts` |
| Presentation (client) | `children-overview-screen.tsx` (`'use client'`), `child-overview-card.tsx` (`'use client'`), `children-overview-screen.stories.tsx` |
| Shared component | `src/components/shared/child-identity-header/{child-identity-header.tsx,index.ts,child-identity-header.test.tsx,child-identity-header.stories.tsx}` |
| App (server action) | `src/app/[locale]/t/[tenant]/(app)/parent/children/actions.ts` (`'use server'`) |
| App (RSC) | `src/app/[locale]/t/[tenant]/(app)/parent/children/page.tsx` |
| Refactored call sites | `src/features/parent/presentation/parent-dashboard.tsx`, `src/features/user/presentation/profile/consent-section/child-consent-card.tsx` |
| i18n | `messages/{vi,en}.json` → new `parentChildrenOverview.*` (4 keys, vi+en); empty/error copy REUSED from `parentLinks.consentSection.*` |

No new domain / infrastructure / DI code: the screen reuses US-E20.2's
`GetLinkedStudentsWithConsentsUseCase` via the existing
`makeGetLinkedStudentsWithConsentsUseCase()` factory and drops the consent
dictionary in the screen mapper (AC-004).

### Decisions taken during implementation

- **Class chip descoped** (planner's open question, accepted): `LinkedStudentSummary`
  has no `className`; the card shows avatar + real name + "Xem học bạ" CTA. All 5
  ACs pass without it. Surfacing class would need a BE ask, not a client-side guess.
- **`ChildIdentityHeader` promoted, not copied a 3rd time** (decision `0026`,
  "promote, đừng copy"): the avatar+initials+name pattern was inlined in
  `parent-dashboard.tsx` and `child-consent-card.tsx`; it now lives once in
  `components/shared/child-identity-header/` and BOTH pre-existing call sites were
  refactored onto it. `tone` / `size` / `initials` props preserve each site's
  existing visuals exactly (dashboard: lg + purple + single initial + class
  subtitle; consent card: md + primary + double initials + tinted container +
  trailing `StatusBadge`).
- Whole card is a single next-intl `<Link>` (one tab stop, native Enter
  activation, `focus-visible:ring-ring`) with a per-child `aria-label`
  ("Xem học bạ của {name}") so the repeated CTA is never the accessible name
  (WCAG 2.4.4 / 2.4.9).
- Card-grid skeleton is screen-local (not the shared `ListSkeleton`, which is a
  flat row list inside ONE bordered card) — same documented ruling as
  `ConsentSkeleton`.

### Proof (all run on the branch, real results)

| Check | Result |
| --- | --- |
| `bun vitest run` | **453 files / 3259 tests passed** (baseline 451/3245 → +2 files, +14 tests; zero regressions, refactored consent-card + dashboard suites green) |
| `bunx vitest run --config vitest.storybook.mts` | **156 files / 1170 interaction tests passed** (+2 files, +11 stories) |
| `bunx tsc --noEmit` | clean |
| `bun lint:fix` / Biome | clean (only pre-existing repo-wide warning/info) |
| `bun run build` (`NEXT_PUBLIC_USE_MOCK=` unset) | clean — route `ƒ /[locale]/t/[tenant]/parent/children` present |

New unit tests (14): mapper identity-field projection, key-set assertion that
no `consent`/`linkId` leaks onto the card VM, zero-children → genuine empty,
`forbidden` → own errorKey (never a fake empty), other failures →
`network-error`, `academicRecordHref` incl. URL-unsafe id encoding;
`childInitials` both modes + whitespace/empty-name guards, `identityToneClass`.

New interaction stories (11): screen — loading, success ×3 children (real names
asserted, `/Con thứ/` absent, zero consent affordance), success single child,
card href = `/vi/t/{tenant}/parent/children/{studentId}/academic-record`,
keyboard Tab card-to-card (one tab stop per card), empty state, forbidden error
+ retry → success (asserts forbidden is NOT rendered as "no children");
`ChildIdentityHeader` — default, consent-card shape, dashboard shape, long-name
truncation.

## Implementation Plan

### 0. Ground-truthing notes (verified against current code, not the story prose)

- `GetLinkedStudentsWithConsentsUseCase` (`src/features/parent-links/domain/use-cases/get-linked-students-with-consents.use-case.ts`)
  is confirmed real (US-E20.2) and wired via the existing DI factory
  `makeGetLinkedStudentsWithConsentsUseCase()` in
  `src/bootstrap/di/parent-consent.di.ts`. Its output
  (`LinkedStudentsWithConsents.students: LinkedStudentSummary[]`) has exactly
  `studentId`, `fullName` (real), `avatarUrl?`, `linkId` — **no `className`
  field**. The Product Contract's "name + class" wording is not achievable from
  this data source (and `TimetableChild` — the only other child-list source in
  the codebase — is explicitly the wrong one per the story's own rationale, and
  also has no reliable class field). **Recommendation: descope the class chip
  from this screen's v1** — card shows avatar + name + CTA only. This matches
  every hard AC (none of the 5 ACs mention class) and avoids inventing data.
  Flag as an open question below, not a blocker.
- The identical use-case is ALREADY consumed once, in
  `src/app/[locale]/t/[tenant]/(app)/(shared)/profile/consent-actions.ts`
  (`fetchParentConsentAction` → `toChildVMs`), which projects the same 3 fields
  plus a `consent` object for `ParentConsentSection`
  (`src/features/user/presentation/profile/consent-section/`). That section is
  the closest existing precedent for BOTH the data-fetch shape and the
  loading/empty/error UI (client `useQuery`, `EmptyState`, `ListError`,
  `Avatar`+`AvatarFallback` initials card) — **this plan mirrors it**, not
  `parent/grades/page.tsx` (which the story guessed as the empty-state
  precedent but actually hardcodes `MOCK_CHILD_ID` and has no zero-child
  handling at all — verified, that guess doesn't hold up).
- `parent/layout.tsx` already enforces `role === "parent"` server-side for
  every `/parent/*` route (ADR 0063 follow-up) — the new route needs no manual
  role check (mirrors `parent/grades/page.tsx`, unlike `parent/discipline/page.tsx`
  which pre-dates the layout guard and still does its own redirect).
- Sidebar nav (`nav-config.ts` line 91) already points `labelKey: "children"` →
  `/parent/children` — no nav change needed, this US only makes the target real.
- Existing i18n reuse found: `parentLinks.consentSection.empty.{title,body}`
  ("Chưa có con nào được liên kết" / contact-school body) and
  `parentLinks.consentSection.error.{title,body,retry}` are generic enough
  (not consent-specific wording) to reuse verbatim for this screen's empty/error
  states — avoids minting near-duplicate copy.

### 1. Data source decision (answering the story's open question)

**Reuse `GetLinkedStudentsWithConsentsUseCase` as-is via the existing
`parent-consent.di.ts` factory. Do NOT add a narrower projection use-case.**

- No new domain/infrastructure/DI code. The use-case always needs to call both
  `getLinkedStudents()` + `getConsents()` internally (it's one execute() call,
  not two separate repo hits we could skip) — a "narrower" use-case would still
  invoke the same repository methods, so it saves zero HTTP calls and only adds
  a duplicate class to maintain. The consent dict is simply **ignored** in this
  screen's mapper (`consentByStudentId` never read) — same pattern
  `consent-actions.ts` already uses to opt INTO consent, we do the opposite and
  drop it.
- **`fe-component-architect` / `fe-state-engineer`: NOT needed.** This is a
  read-only card grid over an already-shaped list, one `useQuery` (mirroring
  `ParentConsentSection` verbatim), zero mutations, zero URL/local-form state.
  Skipping straight to `fe-nextjs-engineer`.
- **Card component reuse check (done, per component-organization.md):** grepped
  for an existing "child card" shared component — none exists. The
  avatar-initials-name header pattern is currently **inlined 2×** already
  (`parent-dashboard.tsx`'s `CHILDREN.map` card, and
  `child-consent-card.tsx`'s `ChildConsentCard` header). This screen would be a
  **3rd inline instance**. Per the decision tree in
  `.claude/rules/component-organization.md`, three near-identical instances is
  the trigger to promote — but the two existing instances differ (dashboard:
  last-name-only initial + purple tone + no `AvatarImage`; consent card: 2-letter
  initials + primary tone + real `AvatarImage`). **Recommendation:** build this
  screen's card as its own `features/parent/presentation/` component now (don't
  block this US on a cross-screen refactor), but flag the promotion opportunity
  to `fe-lead` as a follow-up story (extract a shared `ChildIdentityHeader`
  atom: avatar+initials+name, taking `variant`/`tone` props) rather than doing
  it inline in this US's scope creep.

### 2. Phased breakdown

```
Phase 1 — ViewModel mapping (pure, unit-testable)
  Files:
    src/features/parent/presentation/children-overview-screen/
      build-children-overview-vm.ts   # pure: Result<LinkedStudentsWithConsents,
                                       #   ParentConsentFailure> -> ChildrenOverviewVM
      children-overview-screen.i-vm.ts
        # ChildOverviewCardVM { studentId; fullName; avatarUrl? }
        # ChildrenOverviewFetchResult =
        #   | { success: true; children: ChildOverviewCardVM[] }
        #   | { success: false; errorKey: "forbidden" | "network-error" }
        #   (same shape as ParentConsentFetchResult minus `consent`)
  Test first: build-children-overview-vm.test.ts
    - ok + students>0 -> selects only studentId/fullName/avatarUrl (asserts
      NO `consent`/`linkId` leak onto the VM)
    - ok + students=[] -> success:true, children:[]
    - !ok forbidden -> success:false, errorKey:"forbidden"
    - !ok other -> success:false, errorKey:"network-error"
  Done when: vitest green (domain-adjacent pure fn, no HTTP/React).

Phase 2 — Server Action (thin, reuses existing DI — no new DI/repo/use-case)
  Files:
    src/app/[locale]/t/[tenant]/(app)/parent/children/actions.ts
      # 'use server'; calls makeGetLinkedStudentsWithConsentsUseCase() from
      # bootstrap/di/parent-consent.di.ts (already exists); passes result
      # through build-children-overview-vm.ts; returns ChildrenOverviewFetchResult.
      # New sibling action, NOT a re-export of profile's fetchParentConsentAction
      # (that one is profile-namespaced and shaped for consent toggles — wrong
      # coupling to import cross-route).
  Test first: none new at this layer (integration coverage for the repo/use-case
    already exists from US-E20.2); this file is a pure pass-through covered by
    Phase 1's unit test on the mapper it calls.
  Done when: typecheck green, action wired.

Phase 3 — Presentation + route + i18n + Storybook
  Files:
    src/features/parent/presentation/children-overview-screen/
      children-overview.query-keys.ts   # CHILDREN_OVERVIEW_QUERY_KEY = ["children-overview"]
      children-overview-screen.tsx       # 'use client'; useQuery (mirrors
                                          # ParentConsentSection: loading/error/
                                          # empty/success), renders a
                                          # <div role="list"> grid of cards
      child-overview-card.tsx            # composed card: Avatar+initials,
                                          # fullName, CTA — whole card is a
                                          # single <Link> (Next.js Link, native
                                          # keyboard-activatable, visible focus
                                          # ring via existing focus-visible
                                          # tokens) to
                                          # /parent/children/[studentId]/academic-record
      children-overview-screen.stories.tsx
    src/app/[locale]/t/[tenant]/(app)/parent/children/page.tsx
      # RSC; no manual role check (parent/layout.tsx guards); just renders
      # <ChildrenOverviewScreen onFetch={getChildrenOverviewAction} />
      # (mirrors ParentConsentSection's prop-injection convention — RSC never
      # awaits the query itself, NFR-005 precedent)
  i18n: new namespace `parentChildrenOverview` in messages/{vi,en}.json:
    - pageTitle: "Con của tôi"
    - cardCta: "Xem học bạ"
    - cardAriaLabel: "Xem học bạ của {name}"  (accessible name on the card Link,
       since the CTA text alone repeats per card — WCAG 2.1 AA distinct-name)
    - loadingAriaLabel: "Đang tải danh sách con…"
    REUSE (no new keys): `parentLinks.consentSection.empty.{title,body}` for the
    zero-children empty state; `parentLinks.consentSection.error.{title,body,retry}`
    for the fetch-error state.
  Test first: children-overview-screen.stories.tsx interaction play functions:
    - Loading -> skeleton/loading state renders (reuse ConsentSkeleton pattern
      or a simple skeleton grid — engineer's call, not worth a new shared
      component for one screen)
    - Empty (0 children) -> EmptyState renders reused copy, no cards
    - Error -> ListError renders reused copy + retry button re-triggers fetch
    - Success (2+ children) -> N cards render with real fullName, no class chip,
      no consent data anywhere in the DOM
    - Keyboard: Tab reaches a card, Enter/Space activates navigation to
      /parent/children/[studentId]/academic-record (assert on rendered href /
      router push in the interaction harness)
  Done when: design-review gate ready (`docs/DESIGN_REVIEW.md`) + a11y audit green.
```

### 3. Component + state sketch

```
parent/children/page.tsx (RSC)
  -> ChildrenOverviewScreen (client, owns useQuery)
       -> EmptyState | ListError | loading skeleton | grid of:
            ChildOverviewCard (Link-wrapped, Avatar+initials+fullName+CTA)
```

State classification: **server state only** — one `useQuery` keyed
`["children-overview"]`, no URL state (no filters/params on this screen), no
local form state. No Zustand, no new query-key collisions (namespace disjoint
from `["parent-consent"]`).

### 4. Risks, dependencies, open questions

- **[OPEN QUESTION]** Product Contract mentions a "class chip" the data source
  doesn't support. Recommendation above is to descope for v1 (matches all 5
  ACs). If `fe-lead`/product wants class shown, that requires a BE contract
  change (an endpoint that resolves class for a parent's linked students) —
  flag to `fe-lead` as a BE ask, not something to fake client-side.
  Not ADR-worthy on its own (no new token/architecture decision), just a scope
  note — confirm with fe-lead before the engineer starts, so it isn't a mid-
  implementation surprise.
- **[OPEN QUESTION]** Avatar-initials-name header pattern now has 3 near-
  duplicate inline instances (`parent-dashboard.tsx`, `child-consent-card.tsx`,
  this screen). Flagged as a follow-up promotion candidate
  (`ChildIdentityHeader` shared atom), not blocking this US.
- No BE-contract gap for the data actually used here (`core`'s parent-linked-
  students endpoint is already the wired source via US-E20.2's mock-first
  repo — `NEXT_PUBLIC_USE_MOCK` gate unchanged).
- A11y: whole-card-as-link pattern needs a distinct accessible name per card
  (`cardAriaLabel` with `{name}` interpolation) since "Xem học bạ" repeated
  across N cards is ambiguous out of context (WCAG 2.4.4/2.4.9). Visible focus
  ring via existing `--ring` token, no new token needed.
- No new design-spec.jsonc entry exists for this screen (confirmed) — reuse
  `StatCard`/card conventions per `.claude/rules/design-system.md`; flag to
  `uiux-lead`/`fe-lead` if a normative entry is wanted later, not required to
  ship this US.
