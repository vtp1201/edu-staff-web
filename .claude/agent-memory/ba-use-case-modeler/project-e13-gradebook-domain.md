---
name: project-e13-gradebook-domain
description: E13 Grade Book domain rules — gradePublishMode, role variants, US-E13.6 test count, US-E13.7 child-switcher integration map
metadata:
  type: project
---

## gradePublishMode
- SELF_PUBLISH: scores visible immediately after teacher saves.
- ADMIN_APPROVAL: scores hidden until admin approves; shows LockedBanner ("Điểm học kỳ này chưa được công bố") + masked cells.
- Gate applies per active child in parent view — not a global flag.

## US-E13.6 regression constraint
739 unit/integration tests must remain passing after US-E13.7. ParentView_SingleRow story must remain unaffected.

## US-E13.7 child-switcher integration
- INT-001: GET /core/api/v1/parent/children (mock-first) — returns [{childId, name, className, avatar, color}]
- INT-002: GET /core/api/v1/parent/children/{childId}/grades?term= (existing, US-E13.6)
- OQ-001 OPEN: child list source (JWT claim vs REST vs profile field) — pending BE confirmation; FE defaults mock.
- TanStack Query key: ['gradeBook', 'child', childId, term]
- activeChildId = local state in ParentGradeBookScreen; default = children[0].childId on mount.
- ChildSwitcher component home: features/grades/presentation/child-switcher/ (promote to shared/ if 2nd screen needs it).

## VIEWER_CHILDREN seed data
- c1: Nguyễn Minh Khoa, 11A2, avatar NK, color primary
- c2: Nguyễn Thu Hà, 8B1, avatar NH, color success
(story.md names c2 as "Nguyễn Thu Hà"; context prompt names c2 as "Nguyễn Thu Hà" — use this as canonical)

## i18n
gradeBook.childSwitcherLabel already exists in vi.json as "Chọn con". No new keys needed for US-E13.7 (per NFR-007).
