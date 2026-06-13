---
name: project-e06-be-integration
description: E06 BE Integration epic status — which stories are done and what was wired
metadata:
  type: project
---

E06 BE Integration epic wires real BE through Kong gateway (ADR 0030, base URL decision).

**Why:** core/iam/lms services were mock-first (decision 0014); E06 lifts the mocks story-by-story.

**Status as of 2026-06-13:**
- US-E06.3 (Kong base URL): implemented — NEXT_PUBLIC_API_URL default → localhost:8000; all endpoints add Kong prefix
- US-E06.4 (IAM member/invitation): implemented — IamMemberRepository in `features/auth/`; iam-member.endpoint.ts; iam-member.di.ts; IamMemberFailure union; 10 tests; token rotation via mapTokens (setAuthCookies is Server Action concern)
- US-E06.5 (core school+calendar): implemented — SchoolConfigRepository lifted from generic catch to errorCodeOf mapping; CalendarRepository aligned to activate/archive contract (not PATCH/DELETE); cursor-paginated listYears with {raw:true}+parseEnvelope; 13 tests
- US-E06.6 (core subject-catalogue): planned
- US-E06.7 (core student-roster): planned
- US-E06.8 (core staffing): planned

**How to apply:** When continuing E06 work, E06.6 (subject-catalogue) is next unclaimed and safe to pick up after fetching --prune to confirm.
