# US-E14.5 State Design

## State inventory

| State | Type | Location | Notes |
|-------|------|----------|-------|
| Academic record data | Server | RSC page (initial load) | Passed as VM prop |
| Selected year ID | URL searchParam (`?year=`) | URL | RSC reads on load; client updates via `router.push` |
| Loading | TanStack Query | Client (AcademicRecordContainer) | Used on year switch re-fetch |
| Error | TanStack Query | Client | From AcademicRecordsFailure |

## TanStack Query key hierarchy

```ts
// Root key
['academic-record']

// Per-student record (with year filter)
['academic-record', 'record', studentId, yearId?]

// Year list for student
['academic-record', 'years', studentId]
```

## RSC ↔ Client boundary

```
RSC page (server)
  → reads searchParams.year
  → calls makeGetAcademicRecordUseCase(studentId).execute()
  → builds AcademicRecordScreenVM
  → passes to AcademicRecordContainer (use client)
         → provides initial data to TanStack Query
         → re-fetches on year change (client-side navigation)
         → renders AcademicRecordScreen
```

## Year switching

- Initial year from URL (`?year=2025-2026`)
- Default: most recent year from record.years
- Client year switch: update URL searchParam via `router.replace` → RSC refetches
- Alternative (simpler): year selection = local state + re-query with new yearId
  - Chosen approach: local client state (no URL change) — simpler for a read-only viewer; year persists within session but not across navigation (acceptable for academic record viewer)

## Cache strategy

- `staleTime: 5 * 60 * 1000` (5 min) — academic records rarely change mid-session
- `gcTime: 10 * 60 * 1000` (10 min)
- No mutation cache invalidation needed for this US (read-only)
- E14.6 (seal action) will add invalidation of `['academic-record', 'record', studentId]`

## No global store

No Zustand/Redux. Academic record data flows: server → RSC → VM prop → TanStack Query initial data. Year selection = local useState in AcademicRecordContainer.
