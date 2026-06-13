# Memory Index

- [Use-case Result pattern](pattern-usecase-result.md) — domain use-cases return discriminated Result<T> + CalendarFailure, not throw
- [Mock-first feature wiring](pattern-mock-first-wiring.md) — USE_MOCK toggle in DI factory; module-level mutable seed in mock repo
- [Role union record ripple](gotcha-role-record-ripple.md) — extending Role breaks every Record<Role,…>; no edu-role-admin token (reuse primary)
- [Route role guard](pattern-route-role-guard.md) — admin/* guard: jwt decodeRoleClaim + pure evaluateAdminAccess + server-only RSC layout redirect
