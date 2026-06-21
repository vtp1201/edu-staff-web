---
name: repo-uc-patterns
description: Standard UC pattern shapes for edu-staff-web — async four-state, role-gating, keyboard nav, error mapping
metadata:
  type: project
---

## Four async states (mandatory for every async UC)
Every async UC must cover: loading (skeleton within 320ms), empty (no data), error (mapped from failure code), success.

## Role gating
Roles: teacher | principal | student | parent. Routes are hard-gated per role group.
Role variants always need: (a) a UC showing the correct role's feature, (b) a negative UC confirming other roles cannot access.

## Error failure codes → UI messages (grades domain)
- not-found → "Không tìm thấy dữ liệu điểm"
- forbidden → "Bạn không có quyền xem bảng điểm này" (no retry)
- not-published → banner "Điểm học kỳ này chưa được công bố" (locked banner, not error)
- network-error → "Lỗi kết nối. Vui lòng thử lại." + retry button
- unknown → "Đã có lỗi xảy ra. Vui lòng thử lại sau."

## Keyboard nav pattern (tablist)
Focus moves with ArrowLeft/ArrowRight (no fetch, focus only). Enter/Space activate the focused tab (triggers fetch). Tab key moves between tab buttons and the rest of the page. Wraps at boundary.

## TanStack Query key convention
['gradeBook', 'child', childId, term] — invalidate on term change.

## Parent role child-switcher UC pattern (E09.4)
- Two UCs: (1) single-child happy path, (2) multi-child switcher. Split at the selector level.
- Form reset on child switch is a separate BR (TR-015), modeled explicitly in the multi-child UC.
- The only write operation on a read-mostly screen should be called out explicitly in both UC-01 (happy path) and the validation UC.
- RBAC has two sub-flows: (a) non-parent redirect, (b) parent with out-of-scope childId → 403.
- Read-only enforcement UC covers DOM-level absence (not CSS hide) of mutation controls.

## Conduct score color token thresholds (discipline domain)
score ≥90 → var(--edu-success) | ≥70 → var(--edu-primary) | ≥50 → var(--edu-warning) | <50 → var(--edu-error)
Grade mapping: excellent(≥90)=success | good(≥70)=primary | average(≥50)=warning | weak(<50)=error
Domain rule: score = 100 + sum(violation.points), floor 0 (TR-017) — lives in domain layer only.

## Leave status badge color tokens
pending → var(--edu-warning) | approved → var(--edu-success) | rejected → var(--edu-error)

## Leave form validation rules (discipline domain)
startDate >= today | endDate >= startDate (optional field) | reason.trim().length >= 10
All three rules fire independently; model concurrent-violation alt flow explicitly.
