---
name: project-us-e204-children-overview-plan
description: US-E20.4 parent-children-overview plan — reuse decision, empty-state precedent correction, class-chip descope
metadata:
  type: project
---

Plan written to
`docs/stories/epics/E20-parent-student-links/US-E20.4-parent-children-overview/US-E20.4-parent-children-overview.md`
(`## Implementation Plan`).

Key findings (code-verified, corrected some story-packet assumptions):
- `LinkedStudentSummary` (via `GetLinkedStudentsWithConsentsUseCase`,
  `bootstrap/di/parent-consent.di.ts`) has NO `className` field — the Product
  Contract's "name + class" wording isn't achievable from this data source.
  Recommended descoping the class chip for v1 (matches all 5 ACs), flagged as
  BE-ask open question rather than inventing data.
- The story guessed `parent/grades`'s "no-child" empty state as precedent —
  verified that page hardcodes `MOCK_CHILD_ID` and has ZERO empty-child
  handling. The REAL precedent is `parent-consent-section.tsx`
  (`features/user/presentation/profile/consent-section/`), which consumes the
  SAME use-case and already has `EmptyState`/`ListError`/`useQuery` states.
  Reuse its `parentLinks.consentSection.empty.*` and `.error.*` i18n keys
  verbatim (generic enough, avoids duplicate copy) instead of minting new ones.
- Data decision: reuse `GetLinkedStudentsWithConsentsUseCase` as-is (new
  use-case would hit the same repo calls internally — zero savings), drop
  `consentByStudentId` in a new pure mapper
  (`build-children-overview-vm.ts`) + a new sibling Server Action
  (`parent/children/actions.ts`) — do NOT reuse/import profile's
  `fetchParentConsentAction` cross-route (wrong coupling).
- `fe-component-architect`/`fe-state-engineer` skipped — read-only card grid,
  one `useQuery`, zero mutations/URL/local-form state.
- Avatar-initials-name header now has 3 near-duplicate inline instances
  (`parent-dashboard.tsx`, `child-consent-card.tsx`, this new screen) —
  flagged as a follow-up promotion candidate (`ChildIdentityHeader` shared
  atom per component-organization.md's "3rd instance" trigger), not blocking
  this US.
- `parent/layout.tsx` already RBAC-gates all `/parent/*` — new route needs no
  manual role check (mirrors `parent/grades`, not the older
  `parent/discipline` pattern which pre-dates the layout guard).
