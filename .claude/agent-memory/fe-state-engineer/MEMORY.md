# Memory Index

- [Query key conventions](reference-query-key-conventions.md) — key factory shape, staleTime defaults, invalidation patterns used across features
- [RSC-first read-only pattern](reference-rsc-readonly-pattern.md) — when to skip TanStack Query entirely (pure RSC flow)
- [Failure union i18n mapping](reference-failure-union-i18n.md) — stable error key → i18n path convention across features
- [AppShell/QueryClient boundary](project-appshell-queryclient-boundary.md) — AppShell's own JSX is a sibling of ReactQueryProvider; when plain Context is the correct exception to no-global-store
- [Next Server Action error boundary](reference-nextjs-server-action-error-boundary.md) — actions must return discriminated results not raw-throw ApiError; isRedirectError import path; found violation in switchTenantAction (US-E23.1)
- [Optimistic update: useState-mirror not useOptimistic](feedback-optimistic-update-no-usestate-mirror.md) — RSC+Server-Action screens (no TanStack) use await-then-upsert local useState (ClassLogScreen/LeaveRequestSheet precedent), not React 19 useOptimistic; lift mirror above sibling surfaces sharing same data (US-E24.9)
- [Content-derived remount key](feedback-content-derived-remount-key.md) — when resync trigger is router.refresh() not a URL param, key client leaf on sorted-id signature not weekParam-copy (US-E24.11)
- [First TanStack in E24: course tab](reference-e24-10-first-tanstack-course-tab.md) — mixed optimistic (reorder only) / non-optimistic (patch/create/publish/delete) mutation set on one screen; lmsKeys extension
