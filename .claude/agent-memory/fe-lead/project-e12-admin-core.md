---
name: project-e12-admin-core
description: E12 Admin Core epic status — School Setup (US-E12.1) implemented; remaining US-E12.2..E12.6 planned
metadata:
  type: project
---

E12 Admin Core epic is the admin-facing configuration flow. Entry point story US-E12.1 (School Setup) implemented 2026-06-13.

Feature folder: `src/features/admin-school-setup/` (note: NOT `admin/school-setup` — it's a top-level feature name)

Onboarding order: US-E12.1 → US-E12.2 (calendar) → US-E12.3 (subjects) → US-E12.4 (roster) → US-E12.5 (timetable) → US-E12.6 (assessment)

**Why:** All admin routes under `/admin/*` are role-guarded to `admin` role (decision 0022). Core service is mock-first (decision 0014) — MockSchoolConfigRepository seeded with THPT (10-12) config.

**Open items:**
- Route role-guard story needed (priority raised: first destructive admin surface is live)
- ADR for `--edu-role-admin` token needed
- PRODUCT.md for impeccable /init needed (separate Harness item)
- Real SchoolConfigRepository needs richer error mapping when core service goes live
