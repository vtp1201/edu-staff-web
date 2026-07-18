# Memory Index

- [Query key conventions](reference-query-key-conventions.md) — key factory shape, staleTime defaults, invalidation patterns used across features
- [RSC-first read-only pattern](reference-rsc-readonly-pattern.md) — when to skip TanStack Query entirely (pure RSC flow)
- [Failure union i18n mapping](reference-failure-union-i18n.md) — stable error key → i18n path convention across features
- [AppShell/QueryClient boundary](project-appshell-queryclient-boundary.md) — AppShell's own JSX is a sibling of ReactQueryProvider; when plain Context is the correct exception to no-global-store
- [Next Server Action error boundary](reference-nextjs-server-action-error-boundary.md) — actions must return discriminated results not raw-throw ApiError; isRedirectError import path; found violation in switchTenantAction (US-E23.1)
