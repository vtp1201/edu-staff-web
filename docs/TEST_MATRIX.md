# Test Matrix

This file maps product behavior to proof.

No product behavior has been defined or implemented yet. Do not mark a row
implemented until tests or validation evidence exist.

## Status Values

| Status | Meaning |
| --- | --- |
| planned | Accepted as intended behavior, not implemented |
| in_progress | Actively being built |
| implemented | Implemented and proof exists |
| changed | Contract changed after earlier implementation |
| retired | No longer part of the product contract |

## Matrix

| Story | Contract | Unit | Integration | E2E | Platform | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | Add rows when story packets are created | no | no | no | no | planned | none |
| US-E12.1 | Admin role enabler: nav-config admin 7 items + DEFAULT_ROUTE + UserRole "admin" | yes | yes | no | yes | implemented | validate-grade-range.use-case.test.ts (13), get-setup-progress.use-case.test.ts (4), nav-config.test.ts admin block; mock repo; bun build clean |
| US-E12.1 | School Setup screen: grade range form (1≤min≤max≤13), narrowing warning, publish mode radio, onboarding progress, collapsible guide | yes | yes | no | yes | implemented | domain unit tests; mock repository integration; bun build + tsc clean; design-review pass |
| US-E12.2 | Academic Calendar: year/term CRUD, date-order validation, date-overlap validation, graded-term delete block, mock-first DI, accordion UI | yes | yes | no | yes | implemented | create-term (5), update-term (4), delete-term (3), create-year (4) unit tests (16 total); mock repository integration; bun build + tsc clean; a11y blocking issues fixed; design-review pass |
| US-E07.2 | --primary semantic var → --edu-primary-dark (#4570EA); WCAG AA 4.56:1 on white; all bg-primary/text-primary-foreground fixed globally via token remap | no | no | no | yes | implemented | No domain logic — pure CSS token change. tsc --noEmit clean (0 errors); bun build green; biome 0 issues; 130/130 Vitest tests pass; contrast ratio 4.56:1 verified (≥4.5:1 AA). ADR 0023 Accepted. |
| US-E07.5 | A11Y deferred cleanup (E07.3/E07.4): StatCard trend chip text-edu-success/error → text-edu-success-text/error-text (WCAG 1.4.3, 4.5:1 for text-xs); SecurityTab new-password Label+Input linked via useId() htmlFor/id (WCAG 1.3.1/4.1.2) | yes | no | no | yes | implemented | trendColorClass() unit tests (2 new, 7 total stat-card); 160/160 Vitest pass (28 files); tsc --noEmit clean; next build green. Decision 0027. |
| US-E12.7 | A11Y-006 sweep: text-edu-primary on normal text (non-icon, non-large-text) must achieve WCAG AA ≥4.5:1; icons/large-text confirmed passing at ≥3:1 | no | no | no | yes | implemented | 1 fix: calendar-screen.tsx:509 text-edu-primary → text-edu-primary-dark (4.56:1); 10 occurrences swept; tsc clean; 130/130 Vitest pass; bun build green; design-review pass |
| US-E12.8 | Admin route role guard: server-side RSC layout enforces role==="admin" before any /admin/* content renders; non-admin → redirect to DEFAULT_ROUTE; no token/unknown role → redirect to select-tenant; mock-first (NEXT_PUBLIC_USE_MOCK=true, NODE_ENV!==production) | yes | no | no | yes | implemented | decodeRoleClaim (8 tests), evaluateAdminAccess (7 tests); 145/145 Vitest pass; tsc --noEmit 0 errors; bun build green; tech-lead Approved; a11y Pass (no UI rendered) |
| US-E12.3 | Subject Catalogue: SubjectParent departments CRUD + archive (block when activeChildCount>0), grade-scoped Subjects per department with master-detail 35/65 layout, Subject detail sheet (locked curriculum fields, class offerings), code validation /^[A-Z0-9]{1,16}$/, mock-first DI (core service absent), concept badge AA tokens (decision 0029) | yes | yes | no | yes | implemented | validateSubjectCode (5), ArchiveParent (2), ArchiveSubject (2), CreateSubject (3) = 12 use-case unit; MockSubjectCatalogueRepository (5 integration: create parent, create subject, archive parent, archive subject, getSubject bundle); 194/194 Vitest pass; tsc clean; bun build green. Routes: /admin/subject-departments, /admin/subjects. |
| US-E12.4 | Student roster / class enrollment: class selector breadcrumb, roster table (search, bulk select, pagination, transferred muted+strikethrough), Add panel (transfer-warning, enroll/transfer), unenroll + transfer confirm dialogs, empty state; mock-first DI; one student ⇒ one class per year invariant (enroll-with-currentClassId ⇒ transfer) | yes | yes | yes | yes | implemented | enroll-student.use-case (3: unassigned/transfer-warning/failure), unenroll-student.use-case (2: ok/not-found) = 5 unit; roster.mapper (6) + roster.repository (6: envelope unwrap, 404→not-found, 401→unauthorized, paths) = 12 integration; 6/6 Storybook interaction stories pass (Loading/EmptyClass/Populated/TransferWarning/BulkSelected/ErrorState); 194/194 Vitest pass; 110/110 Storybook tests pass (44 files); tsc --noEmit clean; bun build green. ERR_REQUIRE_ESM unblocked by INFRA-storybook-test-runner (ADR 0032). |
| US-E07.6 | Pagination active-state accessible token: --edu-primary-accessible (#4468e0) = 4.88:1 on white, closes A11Y-005; applied to roster-pagination.tsx active button; tokens.css + globals.css + design-system.md synced; ADR 0031 Accepted | no | no | no | yes | implemented | No domain logic — pure CSS token + component fix. 194/194 Vitest pass; tsc --noEmit clean; bun build green. Contrast verified: #4468e0 on white = 4.88:1 (≥4.5:1 AA). |
| US-E08.4 | html lang derived from [locale]: RootLayout uses getLocale() from next-intl/server to set lang={locale} dynamically; closes A11Y-012; vi routes → lang="vi", en routes → lang="en" | no | no | no | yes | implemented | No domain logic. 194/194 Vitest pass; tsc --noEmit clean; bun build green. |
| INFRA-storybook-test-runner | Storybook interaction-test runner (vitest:storybook) executes play() fns without ERR_REQUIRE_ESM; all 110/110 Storybook interaction tests pass. Fix: bun patch @storybook/nextjs-vite@10.4.2 (dynamic import() instead of require()), postcss.config.mjs → .js (CJS), story decorators (nextjs.appDirectory + NextIntlClientProvider). | no | no | yes | no | implemented | 110/110 Storybook interaction tests pass (44 files); 194/194 unit tests pass; tsc --noEmit clean; bun build green. ADR 0032. |
| US-E06.3 | Kong gateway base URL: NEXT_PUBLIC_API_URL default → localhost:8000; all core endpoint files add /api/v1 segment; all IAM endpoint paths get /iam/api/v1 prefix; bun build + tsc clean | no | yes | no | yes | implemented | 194/194 Vitest pass (37 files); tsc --noEmit clean; bun build green (19 routes). Endpoint tests: roster.repository (6 — path assertions updated to /core/api/v1/*), auth.repository (3 — AUTH_EP refs follow updated constants). ADR 0030 Accepted. |
| US-E06.4 | IAM tenant/member/invitation real wiring: IamMemberRepository (inviteMember, removeMember, changeRoles, acceptInvitation, listMyTenants, switchTenant); token rotation on switch-tenant; last-admin invariant error mapping | yes | yes | no | yes | planned | none |
| US-E06.5 | core school-config + academic-calendar real wiring: SchoolConfigRepository lifted from mock; CalendarRepository (years + terms CRUD, cursor-pagination, date-overlap, archive-blocked); Kong /core/api/v1/* | yes | yes | no | yes | planned | none |
| US-E06.6 | core subject-catalogue real wiring: SubjectCatalogueRepository lifted from mock; locked vs editable ClassSubject fields; GVBM set/remove; cursor-pagination; archive-blocked error mapping | yes | yes | no | yes | planned | none |
| US-E06.7 | core student-roster real wiring: RosterRepository lifted from mock; no dedicated transfer endpoint (unenroll+enroll two-step); ROSTER_STUDENT_ALREADY_ENROLLED=transfer-warning; TEACHER sees only own classes | yes | yes | no | yes | planned | none |
| US-E06.8 | core staffing real wiring (new feature): StaffingRepository (departments, position-titles, position-assignments); MANAGE_SUBJECT_CONTENT permission scope constraint; copy-year-to-year; design-needed for screens | yes | yes | no | yes | planned | none |

## Evidence Rules

- Unit proof covers pure domain and application rules.
- Integration proof covers backend enforcement, data integrity, provider
  behavior, jobs, or service contracts.
- E2E proof covers user-visible browser flows.
- Platform proof covers only shell, deployment, mobile, desktop, or runtime
  behavior that cannot be proven in lower layers.
- A story can be implemented without every proof column if the story packet
  explains why.
