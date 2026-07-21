# US-E20.2 — FE Plan (Parent Notification Consent Section)

Status: plan ready for `fe-lead` review. Branch: `feat/us-e20.2-parent-consent-section`.

## 0. Summary

Extend the already-implemented Profile screen
(`src/features/user/presentation/profile/`, US-E08.5) with a `ParentConsentSection`
card, visible only when the authenticated session's role is `parent`, mounted in
the identity column below `AccountRequestsCard`. Lists linked children with 3
notification-consent toggles each (discipline/absence/grades), instant persist +
toast, section-scoped loading/empty/error states. Data source `core` (not built)
→ mock-first (decision `0014`), independent repository from US-E20.1's admin
`parent-links` module (shared entity-shape convention only, per story.md
Dependencies).

**Folder split (recommendation):**
- **New domain/infrastructure module** `src/features/parent-links/` — own
  `domain/{entities,failures,repositories,use-cases}` +
  `infrastructure/{dtos,mappers,repositories}`. NOT nested under
  `features/user/` (this data belongs to the parent-links bounded concept, not
  "user profile" data — same reasoning `admin/parent-links` already used it as
  its own top-level feature) and NOT reusing `features/admin/parent-links/`
  (story.md explicitly requires an independent repository; sharing the file
  would recreate the coupling risk noted in `admin/parent-links`'s own docs).
- **Presentation stays inside the host screen**: new files under
  `src/features/user/presentation/profile/consent-section/` — mirrors how
  `LinkedAccountsSection` (a `user`-domain-adjacent concept) already lives
  directly in `profile/` rather than getting its own presentation tree,
  because it only ever mounts in this one screen. If a second surface ever
  needs this section, promote (move, don't copy) per
  `.claude/rules/component-organization.md`.
- Naming: avoid the admin module's `PL*` prefix to keep the two independent
  modules visually distinct in diffs/greps — use `ParentConsentSection`,
  `ChildConsentCard`, `ConsentSkeleton`, `ConsentEmpty`, `ConsentError`.

**Key decision flagged to `fe-lead` — role derivation (see §5, tension):**
`profile/page.tsx` currently hardcodes `MOCK.role = "teacher"` for the whole
screen. AC-007.2 requires the `parent`-only gate to be **server-driven** (VM
field never populated for non-parent), which needs the *real* session role,
not `MOCK.role`. Recommend deriving the real role once in `page.tsx` via a new
tiny helper (mirrors `makeParentLinksAuthContext`'s `decodeRoleClaim` call) and
using it for **both** the gate and the existing role-display field, replacing
`MOCK.role` — see §5 for the narrower alternative and why we don't recommend
it.

## 1. Domain layer — `src/features/parent-links/domain/`

```
entities/
  linked-student-summary.entity.ts   # { studentId, fullName, avatarUrl?, linkId }
  parent-student-consent.entity.ts   # { studentId, parentId, disciplineAlerts, absenceAlerts, gradeAlerts }
failures/
  parent-consent.failure.ts          # ParentConsentFailure union + isRetryableFailure
repositories/
  i-parent-consent.repository.ts     # IParentConsentRepository + UpdateConsentInput
use-cases/
  get-linked-students-with-consents.use-case.ts
  update-consent.use-case.ts
```

`ParentConsentFailure`:
```ts
export type ParentConsentFailure =
  | { type: "forbidden" }       // 403 memberId-scoping (AC-002.2) — hard error, never empty
  | { type: "network-error" }   // 5xx/timeout — retryable
  | { type: "validation"; fields: { field: string; message: string }[] }; // 422 on toggle
```

`IParentConsentRepository` (two read methods map 1:1 to INT-001/INT-002 so the
combining/race-handling logic lives in the use-case, testable without HTTP;
`updateConsent` maps to INT-003's recommended per-toggle shape, open question
#1 flagged, not blocking):
```ts
export interface UpdateConsentInput {
  studentId: string;
  category: "discipline" | "absence" | "grades";
  enabled: boolean;
}
export interface IParentConsentRepository {
  getLinkedStudents(): Promise<Result<LinkedStudentSummary[], ParentConsentFailure>>;
  getConsents(studentIds: string[]): Promise<Result<ParentStudentConsent[], ParentConsentFailure>>;
  updateConsent(input: UpdateConsentInput): Promise<Result<ParentStudentConsent, ParentConsentFailure>>;
}
```

`GetLinkedStudentsWithConsentsUseCase.execute()`:
1. `getLinkedStudents()` → fail (forbidden/network-error) → propagate as-is
   (covers AC-002.2's 403-as-error and UC-003's network fail).
2. ok with `[]` → return `ok({ students: [], consentByStudentId: {} })` — the
   empty state (AC-002.1); **does not call `getConsents`**.
3. ok with `>=1` student → `getConsents(studentIds)`; fail → propagate (shared
   section error, FR-006); ok → build
   `consentByStudentId: Record<studentId, ParentStudentConsent>` from the
   result. A `studentId` present in `students` but **absent** from the map =
   the toggles-pending sub-state (AC-001.3) — presentation renders
   disabled/skeleton toggles for that child, never a guessed default.

`UpdateConsentUseCase.execute(input)`: thin proxy to
`repo.updateConsent(input)` — domain does not decide revert; that is a
presentation-layer optimistic-mutation concern (mirrors
`LinkedAccountsSection`'s `useMutation` pattern, not domain logic). Enforces
nothing extra — pass/fail passthrough, single (studentId, category) input
shape only (AC-004.2 invariant lives structurally in the input type, not in
extra logic).

**Test first (red):**
- `get-linked-students-with-consents.use-case.test.ts` — mock repo cases:
  typical (students ok + consents ok, all matched); empty (students ok `[]` →
  asserts `getConsents` never called); students-fail-forbidden (propagates,
  `getConsents` never called); students-ok + consents-fail-network-error
  (propagates); students-ok + consents-ok-but-missing-one-id (asserts that id
  absent from `consentByStudentId`, i.e. pending sub-state contract).
- `update-consent.use-case.test.ts` — ok passthrough; parametrized failure
  passthrough (`validation`/`forbidden`/`network-error`, table-test) — asserts
  the use-case does not swallow or reshape the failure; asserts the repo was
  called with exactly the given `{studentId, category, enabled}` (single-scope
  invariant, AC-004.2/006.1).

Done when: both use-case test files green, no framework deps in `domain/`.

## 2. Infrastructure layer — `src/features/parent-links/infrastructure/`

```
dtos/
  linked-student-response.dto.ts          # camelCase: studentId, fullName, avatarUrl?, linkId
  parent-student-consent-response.dto.ts  # camelCase: studentId, parentId, disciplineAlerts, absenceAlerts, gradeAlerts
mappers/
  parent-consent.mapper.ts   # toLinkedStudentSummary(dto), toParentStudentConsent(dto)
repositories/
  mock-parent-consent.repository.ts   # 'server-only'? — no, plain (matches admin precedent: mock repo has no 'server-only')
  parent-consent.repository.ts        # real HTTP impl, 'server-only', NOT wired to a live core service yet (USE_MOCK branch only)
```

**Mock repository** (`MockParentConsentRepository`), constructor-seedable
(no hidden runtime toggle — anti-demo rule, matches admin precedent):
- Default seed (used by the real DI factory in mock mode): 3 linked children,
  mixed consent values (one all-on, one all-off, one partial) — satisfies the
  "1–3 children, typical" integration case.
- `new MockParentConsentRepository({ students: [] })` — 0-children seed, used
  by the empty-state integration test + a Storybook decorator.
- Deterministic toggle-failure rule (not a hidden toggle): `updateConsent`
  **always** fails with `{ type: "validation", fields: [...] }` when
  `studentId === "st-consent-fail"` — a fixed, documented, seedable student id
  used by the revert-path integration test + the `ToggleFailureRevert`
  Storybook story. Comment explaining the rule inline (mirrors the
  "no `failedOnce` anti-demo" note in `admin/parent-links`'s mock).
- `getLinkedStudents()`/`getConsents()` both resolve immediately in the mock
  (no artificial two-phase delay) — the pending sub-state (AC-001.3) is
  exercised at the **unit-test** level (missing map entry, §1), not simulated
  end-to-end in the mock; flag this as a deliberate scope-narrowing so
  `fe-nextjs-engineer` doesn't over-build a fake network race.

**Real repository** (`ParentConsentRepository`): implements the interface
against `bootstrap/endpoint/parent-links.endpoint.ts` (new constants:
`getLinkedStudents: (memberId) => "/members/${memberId}/linked-students"`,
`consents: "/parent-student-links/consents"`) — structurally ready, **not**
selected until `NEXT_PUBLIC_USE_MOCK=false` and `core` exists (matches
`parent-student-link.repository.ts` precedent: written but unexercised
pre-`core`). No integration test against real HTTP (nothing to hit yet) —
integration proof is entirely against the mock repository this story.

**Test first (red):**
- `mock-parent-consent.repository.test.ts` — 0-children seed → `getLinkedStudents`
  returns `ok([])`; typical seed → 3 students + matching consents; toggle on
  `st-consent-fail` → `updateConsent` returns `fail({type:"validation",...})`
  for any category; toggle on any other student → `ok(...)` echoing the new
  value; asserts **no client-supplied identifier changes which parent's data
  is returned** — the mock has no `parentId` param anywhere in its public
  methods (server-resolved-only by construction, NFR-007's mock-side proof).
- `parent-consent.mapper.test.ts` — DTO → entity field mapping, optional
  `avatarUrl` omission handled.

Done when: mock repository + mapper tests green; `parent-consent.repository.ts`
compiles (no test needed — unexercised real branch, same as precedent).

## 3. Bootstrap DI — `src/bootstrap/di/parent-consent.di.ts`

```ts
import "server-only";
async function makeRepo(): Promise<IParentConsentRepository> {
  if (USE_MOCK) return new MockParentConsentRepository();
  await ensureFreshSession();
  return new ParentConsentRepository(await createServerHttpClient());
}
export async function makeGetLinkedStudentsWithConsentsUseCase() {
  return new GetLinkedStudentsWithConsentsUseCase(await makeRepo());
}
export async function makeUpdateConsentUseCase() {
  return new UpdateConsentUseCase(await makeRepo());
}
```

Mirrors `bootstrap/di/parent-student-link.di.ts`'s `makeRepo` shape exactly
(`USE_MOCK` branch, `ensureFreshSession()` before the real branch, decision
`0018` playbook).

**New shared helper (DRY catch, not an ADR — pure extraction):**
`src/bootstrap/lib/session-role.server.ts`:
```ts
import "server-only";
export async function getSessionRole(): Promise<UserRole | null> {
  const token = (await getAccessToken()) ?? "";
  return decodeRoleClaim(token);
}
```
This is the exact two-line sequence already duplicated conceptually inside
`makeParentLinksAuthContext()`. Extracting it now means `profile/page.tsx`'s
role-gate (§5) and any future role-gated screen share one seam instead of a
third copy-paste. No behavior change, no ADR needed (pure code organization,
not an architecture/token/data-contract decision).

**Test first:** none needed for the DI factories themselves (thin
composition, matches precedent of not unit-testing `*.di.ts` files
elsewhere) — the factories are exercised transitively by the Server Action
tests in §5.

## 4. Presentation — `src/features/user/presentation/profile/consent-section/`

```
parent-consent-section.i-vm.ts   # ParentConsentChildVM, ParentConsentFetchResult, ParentConsentToggleResult
parent-consent-section.tsx       # 'use client' — owns useQuery(fetch) + loading/empty/error/success dispatch
child-consent-card.tsx           # avatar+name+badge + 3 toggle rows, owns useMutation per toggle
consent-skeleton.tsx
consent-empty.tsx
consent-error.tsx
parent-consent-section.stories.tsx
```

**Component-organization flag:** `consent-skeleton.tsx` / `consent-error.tsx`
will be near-identical in shape to `admin/parent-links`'s `PLSkeleton`/
`PLError` (generic row-shimmer skeleton, generic error+retry card — neither is
admin-specific in its props). This is the **2nd occurrence** of the same
pattern → per `.claude/rules/component-organization.md` (decision `0026`,
"promote, don't copy"), `fe-component-architect`/`fe-nextjs-engineer` should
evaluate promoting `PLSkeleton`→`components/shared/list-skeleton` and
`PLError`→`components/shared/error-state` (renamed, generic) instead of
building a 3rd/4th near-duplicate. `PLEmpty` is less clean-cut (two named
variants coupled to admin's create/filter CTAs) — reuse `components/shared/empty-state`
directly here instead (it's already the primitive `PLEmpty` wraps).

**ViewModel (`.i-vm.ts`):**
```ts
export interface ParentConsentChildVM {
  studentId: string;
  fullName: string;
  avatarUrl?: string;
  /** null = consents not yet resolved for this child — pending sub-state (AC-001.3),
   *  never a guessed default. */
  consent: { discipline: boolean; absence: boolean; grades: boolean } | null;
}
export type ParentConsentFetchResult =
  | { success: true; children: ParentConsentChildVM[] }
  | { success: false; errorKey: "forbidden" | "network-error" };
export type ParentConsentToggleResult =
  | { success: true; consent: ParentConsentChildVM["consent"] }
  | { success: false; errorKey: "forbidden" | "network-error" | "validation" };
```

**`ParentConsentSection` (client):** props `{ onFetch: () => Promise<ParentConsentFetchResult>; onToggle: (input) => Promise<ParentConsentToggleResult> }`.
Deliberately **no `initialData` prop** (unlike `LinkedAccountsSection`) — the
section must show its own skeleton on first paint **without** the RSC page
awaiting this fetch (NFR-005: "rest of Profile already interactive" implies
`page.tsx` does NOT block on this use-case). `useQuery({ queryKey: ["parent-consent"], queryFn: onFetch })` with no `initialData`; dispatches:
loading → `ConsentSkeleton`; `success && children.length === 0` → `ConsentEmpty`;
`!success` (including the 403-as-error case, since `onFetch` maps `forbidden`
to the same `errorKey`, never a fake empty payload) → `ConsentError` +
`refetch()` as retry (AC-003.3); success with `children.length > 0` →
list of `ChildConsentCard` + privacy footnote (AC-001.4, static i18n copy,
rendered only in this branch).

**`ChildConsentCard`:** per child — avatar (reuse `Avatar`/`AvatarFallback`
pattern from `profile-screen.tsx`), name, `StatusBadge` for "Đã liên kết"
(confirmed reusable — same shared component `ProfileScreen`'s own identity
card already uses for the role badge; use e.g. `tone="success"` or `"teal"`,
final tone is a design-review call, not architecture). 3 toggle rows, each:
`Switch` (existing `components/ui/switch`) + label + 1-line muted description,
`aria-labelledby`/`aria-describedby` via `useId()` per row (NFR-001). Per-row
`useMutation` mirrors `LinkedAccountsSection`'s `LinkedAccountRow` exactly:
`onMutate` → optimistic set + pending flag; `onSuccess`/`onError` → rollback
to `context.previous` + inline error text on any non-success result (AC-006.1
"any code" — the mutation fn's `errorKey` is not branched on for revert
behavior, only for the message it surfaces); toast on success via existing
toast primitive (grep `sonner`/toast usage elsewhere in `profile/` — reuse,
don't add a new one). `consent === null` (pending sub-state) → toggle renders
`disabled` + `Skeleton` (not the real `Switch`) per AC-001.3.

**Test first (red), per NFR/AC — Storybook interaction stories (10 states
listed in story.md's Validation table):** Loading, Success(1 child),
Success(3 children), Empty, Error+Retry, ToggleOn, ToggleOff,
ToggleFailureRevert, NonParentRoleNoSection (asserted at the
`ProfileScreenVM`-shape level — see §6, not a DOM-hide test), KeyboardToggle
(Space/Enter via `userEvent`, asserts `role="switch"`/`aria-checked`, AC-004.3).

Done when: all 10 Storybook interaction stories pass; `fe-accessibility-auditor`
has toggles/labels to audit.

## 5. Wiring — VM, `profile-screen.tsx`, RSC `page.tsx`, new Server Action

**`profile-screen.i-vm.ts`** (additive only, per requirements.md handoff):
```ts
export interface ProfileScreenVM {
  fullName: string; email: string; phone: string; role: string;
  sessions: ProfileSession[]; linkedAccounts: LinkedAccount[];
  /** Present (literal `true`) only when the resolved session role is `parent`
   *  — server-driven gate (AC-007.2). Absent (not `false`) for every other
   *  role; never carries the fetched children/consent data itself (that
   *  flows through the action props below, fetched client-side on mount). */
  parentConsent?: true;
}
```

**`ProfileScreenProps`** (extends VM) gains two action props, following the
existing `onLinkAccount`/`onUnlinkAccount` pattern exactly:
```ts
onFetchParentConsent?: () => Promise<ParentConsentFetchResult>;
onToggleParentConsent?: (input: UpdateConsentInput) => Promise<ParentConsentToggleResult>;
```

**`profile-screen.tsx`** — inside the identity column, right after
`<AccountRequestsCard />`:
```tsx
{parentConsent && onFetchParentConsent && onToggleParentConsent && (
  <ParentConsentSection onFetch={onFetchParentConsent} onToggle={onToggleParentConsent} />
)}
```
Triple-gate (VM field + both action props) so the section can never render
with a half-wired prop set even if a future refactor forgets one.

**New Server Action** — `src/app/[locale]/t/[tenant]/(app)/(shared)/profile/consent-actions.ts`:
```ts
"use server";
export async function fetchParentConsentAction(): Promise<ParentConsentFetchResult> {
  const result = await (await makeGetLinkedStudentsWithConsentsUseCase()).execute();
  if (!result.success) return { success: false, errorKey: result.failure.type as "forbidden" | "network-error" };
  return { success: true, children: toChildVMs(result.data) }; // maps consentByStudentId → null for pending
}
export async function updateParentConsentAction(input: UpdateConsentInput): Promise<ParentConsentToggleResult> {
  const result = await (await makeUpdateConsentUseCase()).execute(input);
  return result.success
    ? { success: true, consent: toConsentVM(result.data) }
    : { success: false, errorKey: result.failure.type };
}
```
Per `.claude/rules/i18n.md`: these return stable `errorKey`s, never translated
strings — translation happens in `ParentConsentSection`/`ChildConsentCard` via
`useTranslations("parentLinks.consentSection")`.

**`page.tsx` — the role-derivation tension (flagged for `fe-lead` to finalize):**

Current: `MOCK.role = "teacher"` hardcodes the whole screen's role display;
nothing in `page.tsx` reads the real session role today.

AC-007.2 requires the parent-only gate to be resolved **server-side from the
real session**, not from a hardcoded mock, and requires it to be genuine field
omission (not `if (role==='parent')` after already fetching). Two options:

- **Option A (recommended):** `page.tsx` calls the new `getSessionRole()`
  helper (§3) once, and uses that resolved role for **both** the gate and the
  existing `role` display field, i.e. replace `MOCK.role` entirely:
  ```ts
  const role = (await getSessionRole()) ?? MOCK.role; // fallback keeps demo usable pre-auth-wiring
  const isParent = role === "parent";
  return (
    <ProfileScreen
      {...MOCK}
      role={role}
      email={...}
      linkedAccounts={linkedAccounts}
      parentConsent={isParent ? true : undefined}
      onFetchParentConsent={isParent ? fetchParentConsentAction : undefined}
      onToggleParentConsent={isParent ? updateParentConsentAction : undefined}
      ...
    />
  );
  ```
  This makes the whole screen's role-dependent UI internally consistent (no
  more "badge says teacher, section says parent-only-and-showing"), is a
  1-line low-risk change, and is exactly the same seam
  `admin/parent-links`'s DI already established
  (`decodeRoleClaim`/`getAccessToken`) — no new architecture.
- **Option B (narrower, not recommended):** derive role only for the gate,
  leave `MOCK.role = "teacher"` untouched for display. Avoids touching
  existing behavior at all, but produces a self-contradictory screen in any
  session where the real role is `parent` (badge shows "teacher" while the
  consent section renders) — this is confusing for manual QA/design-review
  and for the `NonParentRoleNoSection` Storybook story's realism. Only choose
  this if `fe-lead` judges the `MOCK.role` fix as out-of-scope-creep for this
  story (it does touch a line outside the story's stated file list).

Recommend **Option A** — flagging per this task's instruction, final call is
`fe-lead`'s.

**Test first:** `consent-actions.test.ts` (or colocated with existing
`profile/actions.test.ts` if one exists) — mocks the DI factories, asserts
`fetchParentConsentAction`/`updateParentConsentAction` map `Result`
success/failure → the exact `ParentConsentFetchResult`/`ParentConsentToggleResult`
shapes, never leaking a translated string.

## 6. Test plan → AC mapping (TEST_MATRIX proof)

| Layer | File | Covers |
| --- | --- | --- |
| Unit | `get-linked-students-with-consents.use-case.test.ts` | UC-001 ok/empty/pending-sub-state, UC-002 (AC-002.1 empty-not-error), UC-003 (403-as-error AC-002.2, network-error) |
| Unit | `update-consent.use-case.test.ts` | UC-004/005 (ok passthrough), UC-006 (any-failure-code passthrough, AC-006.1), single-scope invariant (AC-004.2) |
| Integration | `mock-parent-consent.repository.test.ts` | 0-children (AC-002.1), 1–3-children typical, simulated toggle-failure on `st-consent-fail` (AC-006.1/.2), no-client-supplied-parentId (NFR-007 mock-side proof) |
| Integration | `parent-consent.mapper.test.ts` | DTO→entity field mapping (camelCase, optional `avatarUrl`) |
| Integration | `consent-actions.test.ts` | Server Action → `errorKey` mapping (no server-side translation, i18n.md) |
| E2E (Storybook interaction) | `parent-consent-section.stories.tsx` | Loading (AC-001.1), Success 1-child, Success 3-children (AC-001.2/.4/.5), Empty (AC-002.1), Error+Retry (AC-003.1/.2/.3), ToggleOn (AC-004.1/.2/.3), ToggleOff (AC-005.1), ToggleFailureRevert (AC-006.1–.4), NonParentRoleNoSection (AC-007.1/.2 — asserted via VM shape, see below), KeyboardToggle (AC-004.3/NFR-002) |
| Platform | n/a (CI) | `bunx tsc --noEmit` clean w/ extended `ProfileScreenVM`; `bun run build`; `grep -rn '"consentSection"' src/bootstrap/i18n/messages/{vi,en}.json` present, `grep` under `profile.*` absent (AC-007.4) |

**AC-007.2's "field absent, not DOM hidden" proof** is NOT a Storybook DOM
query for "section not present" alone (that alone would still pass even for a
buggy client-side `if`) — it must be backed by a **unit/type-level assertion**
that `page.tsx`/`ProfileScreenVM` never constructs a populated `parentConsent`
value for a non-parent role. Concretely: a small test (colocated with
`consent-actions.test.ts` or a `page`-level test if the route supports it)
asserting the object literal passed to `<ProfileScreen>` for role !== "parent"
has no `parentConsent` key (`"parentConsent" in props === false`) — this is
the closest we can get to testing an RSC page's prop construction without a
full route-render harness; flag to `fe-nextjs-engineer`/`fe-qa-playwright` to
confirm the concrete test shape once `page.tsx` exists.

## 7. i18n

New sub-tree `parentLinks.consentSection.*` in **both** `vi.json`/`en.json`
(nested under the existing top-level `parentLinks` key already used by
`admin/parent-links` — same namespace family, independent leaf, satisfies
NFR-006's "own sub-tree separate from `profile`"). Keys needed (illustrative,
final copy from `design_src/edu/parent-links.jsx` + AC-001.4's exact footnote
text already quoted in use-cases.md):
```
parentLinks.consentSection.title
parentLinks.consentSection.childCard.linkedBadge
parentLinks.consentSection.toggles.discipline.label / .description
parentLinks.consentSection.toggles.absence.label / .description
parentLinks.consentSection.toggles.grades.label / .description
parentLinks.consentSection.toast.success
parentLinks.consentSection.toast.error
parentLinks.consentSection.empty.title / .body
parentLinks.consentSection.error.title / .body / .retry
parentLinks.consentSection.loadingAriaLabel
parentLinks.consentSection.footnote
```
Grep verification (AC-007.4): none of these strings duplicated under the
existing `profile.*` tree.

## 8. Risks, dependencies, open questions

- **[OPEN QUESTION carried, not blocking]** exact `PUT` shape (per-toggle vs
  full-object) — plan commits to the recommended per-toggle shape; only the
  request-shape assertion in tests would need updating if `core` ships
  differently.
- **[OPEN QUESTION carried, not blocking]** whether INT-002 should inline into
  INT-001 — plan keeps them as two repository methods so the use-case, not
  the wire shape, owns the pending-sub-state logic; either wire shape slots in
  without changing the domain contract.
- **[FLAG to fe-lead]** role-derivation tension in `page.tsx` (§5) —
  recommend Option A (derive+replace `MOCK.role`), needs a lane/scope call
  since it touches a file outside this story's literal file list.
- **[FLAG to fe-component-architect]** `ConsentSkeleton`/`ConsentError` vs
  admin's `PLSkeleton`/`PLError` — 2nd-occurrence promotion candidate per
  decision `0026` (§4).
- No ADR needed — no new token, no new architecture decision (the
  `getSessionRole()` extraction is pure DRY, not a design decision).
- A11y risk: touch-target 44×44 on a visually 42×24 switch (NFR-003) — needs
  hit-area padding, verify at 375px in Storybook viewport addon.
- No blocking dependency on US-E20.1 (confirmed in all 4 source docs).
