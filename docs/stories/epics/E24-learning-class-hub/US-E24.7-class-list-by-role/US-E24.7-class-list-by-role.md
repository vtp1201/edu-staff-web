# US-E24.7 Danh sách lớp theo vai trò GVCN / GVBM + KPI theo draft contract

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E24.0b (mockup v3). Độc lập với nhánh student (E24.1–E24.5).
- Blocks: US-E24.8 (class detail cần `roles`/`subjects` trên entity)
- Feature module(s) chạm: `src/features/teacher/**` (entity `TeacherClass`, repo, mapper, DTO,
  `teacher-classes-screen`), `src/bootstrap/endpoint/teacher.endpoint.ts`, `bootstrap/di/teacher-class.di.ts`
- Shared contract/file: `ClassResponse` DTO (`teachingSubjectIds[]` mới), `messages` namespace
  `teacher.classes`. **ADR 0076** (mock theo draft) áp dụng cho KPI.

## Product Contract

Design v3: `design_src/edu/class-hub.jsx` → `ChClassList`, `ChRoleBadges`; design-spec
`teacher-class-hub` (phần list). Quyết định user Q-F: KPI mock theo draft BE, badge "demo".

- `TeacherClass` thêm: `roles: ('homeroom'|'subject')[]`, `subjects: {id, name}[]` (GVBM),
  `kpi?: { absentToday?, pendingGrading?, attendanceRate?, openViolations?, pendingLeave? }`.
- Nguồn: `GET /core/api/v1/classes` nhánh TEACHER đã có `homeroomTeacherId` (so với claim
  `memberId`, ADR 0074) và **`teachingSubjectIds[]`** (ship 02/09 — bỏ N+1 `subject-assignments`).
  Tên môn: map qua subject catalogue đã có (`features/subject-catalogue` hoặc DTO class subjects).
- KPI theo vai trò:
  - GVBM: `absentToday`, `pendingGrading` — **draft US-255** (`ClassResponse` mở rộng,
    `openapi.draft.yaml` core). Repo real đọc field nếu có, `undefined` nếu chưa → UI ẩn ô đó;
    mock repo trả số. Badge nhỏ "demo" khi giá trị đến từ mock (VM `kpiSource: 'draft-mock'|'live'`).
  - GVCN: `attendanceRate` — **draft US-245** `GET classes/{id}/attendance/summary?termId`;
    `openViolations`, `pendingLeave` — có thể lấy real: `GET conduct/student-violations?classId&state=SUBMITTED`
    (ask #8 xác nhận param) và `GET conduct/student-leave-requests` (homeroom inbox) → count. Nếu
    endpoint trả lỗi → ẩn ô, không crash.
- Card: thanh màu trên (GVCN purple / GVBM primary), "Lớp 10A1", "36 học sinh", badges vai trò,
  ô KPI (grid 2–3), CTA "Mở lớp" → `/teacher/classes/[classId]` (E24.8; tới khi đó → `/students`).
- Bỏ "Tiết đã dạy X/Y" (D5). Bỏ progress bar.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#teacher-class-hub`; `docs/product/screens.md` hàng Classes
- `docs/reports/2026-09-02-be-to-fe-contract-update.md` §2.3, §4 (US-245, US-251, US-255)
- `docs/decisions/0074-*`, `0076-*`; `.claude/rules/api-integration.md`

## Acceptance Criteria

- Given teacher là GVCN 10A1 + GVBM Toán 10A1/10A2/11B2/12C1, Then 4 card; 10A1 có 2 badge, còn lại
  1 badge "GVBM · Toán" (mapper test: `homeroomTeacherId === memberId` → homeroom;
  `teachingSubjectIds` → subjects; `sub` KHÔNG được dùng — test forge).
- Card GVBM có ô "Vắng hôm nay" (error-tint khi >0) + "Bài chờ chấm" (warning-tint khi >0); card
  GVCN có "Chuyên cần %" + "Vi phạm chờ xử lý" (+ "Đơn nghỉ chờ" nếu >0). Số dùng `tabular-nums`.
- KPI thiếu (`undefined`) → ô không render, card không để trống lệch (grid tự co).
- KPI từ mock/draft → badge "demo" có `aria-label="Số liệu minh hoạ"`.
- Loading skeleton 4 card; empty "Bạn chưa được phân công lớp"; error + retry.
- Storybook: homeroom+subject / subject-only / no-kpi / loading / empty / error.
- i18n `teacher.classes.card.*` vi+en; xoá key progress cũ.
- Gate xanh; design-review + a11y (badge role có chữ, không chỉ màu).

## Design Notes

- Queries: `listMyClasses` (mở rộng mapper), `getClassKpi(classId)` (mới, `Promise.allSettled`
  per class; timeout ngắn).
- DTO: `class-response.dto.ts` thêm `teachingSubjectIds?: string[]`, `absentToday?`, `pendingGrading?`
  (đánh dấu `// draft US-255`).
- UI: `teacher-classes-screen/components/{class-card.tsx, role-badges.tsx, kpi-tile.tsx}`.
  `role-badges.tsx` sẽ được E24.8 dùng ở header → đặt `features/teacher/presentation/shared/`.
- Tokens: purple `bg-edu-purple`, badge `Badge`/`StatusBadge` shared.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper roles/subjects/kpi optional; memberId-only |
| Integration | repo ↔ mock http (classes + kpi partial failure) |
| E2E | Storybook |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

None.

## Evidence

Commits: 8096496d (feat, initial TDD) + e59e4348 (fix, review+a11y round).

Tech-lead review: **APPROVED** (fe-tech-lead-reviewer). Layer boundaries clean,
ADR 0074 memberId-only proven by forge test, every BE endpoint/field ground-truthed
against `edu-api/services/core/docs/openapi.yaml` (no invention), envelope/pagination
correct (`raw:true` top-level), tokens-only, vi/en parity exact (4144/4144 keys),
security clean. SHOULD-FIX 1-3 (dead i18n keys, KpiTileVM key typing, unused
gradeLevel) + CONSIDER 4 (cap unbounded violations drain to 1 page, render "N+")
all applied in e59e4348. CONSIDER 5 (features/*/presentation/shared/ tier not yet
named in component-organization.md decision tree) and CONSIDER 6 (mock openViolations/
pendingLeave render without "demo" pill — accepted, they mirror real endpoints under
global USE_MOCK like the rest of the app) are fe-lead judgment calls, recorded here,
no code change required.

A11y audit (fe-accessibility-auditor): 5 findings, all closed in e59e4348 —
A11Y-001 (Blocking, reflow <320px: grid now `grid-cols-1 sm:grid-cols-[...]`),
A11Y-002 (Major, loading state now paired with `role="status" aria-live="polite"`
sr-only announcement), A11Y-003 (Minor, demo badge now has visible+sr-only text
pair, not aria-label-only on a generic span), A11Y-004 (Minor, 10.5px labels bumped
to 11px caption floor), A11Y-005 (Minor, hover elevation moved off the whole card
onto the CTA link only).

Design review: pass
- design-system: conform — tokens-only (bg-edu-role-parent/bg-primary accent bar,
  text-edu-purple-text/text-edu-primary-accessible CTA, StatusBadge tone reuse),
  matches design-spec.jsonc#teacher-class-hub; top accent bar (not side-stripe) is
  design-spec-prescribed, not an anti-pattern.
- a11y: WCAG AA OK post-fix (contrast rechecked by auditor: warning tile ~11.2:1,
  error tile ~4.79:1, KPI label ~4.8-5:1 on tint); keyboard OK (single Tab stop per
  card = CTA, 44px target); reduced-motion OK (motion-safe: gates).
- impeccable audit: code-level pass (5-dimension check) — a11y/theming/responsive
  already hardened by the two specialist rounds above; no anti-pattern tells found
  (no side-stripe accent, no gradient text, no glassmorphism, no hero-metric
  template; card pattern here is design-spec-prescribed, not a lazy default).
- states: loading/empty/error/success covered in Storybook (homeroom+subject /
  subject-only / no-kpi / loading / empty / error); responsive 320px fixed
  (A11Y-001); dark mode uses existing token system (no new tokens introduced).

Test proof: unit 4241 (mapper roles/subjects/kpi incl. memberId-only forge test,
call-count assertions for N+1 avoidance and violations-drain cap) + integration
(repo↔mock http, partial-KPI-source-failure, envelope/pagination) + Storybook
interaction 1265 (all state permutations) — all green. `bunx tsc --noEmit`,
`bun lint`, `bun run build` green. Pre-push gate (full suite incl. Storybook +
build) green on both commits.

Descoped/deferred:
- attendanceRate (GVCN KPI) stays permanently mock — no term-source anywhere in
  this repo (US-245 draft needs `termId`, nothing resolves it yet); ask BE for a
  term-catalogue or a term-less variant if this KPI should ever go real.
- Leave-request count (`pendingLeave`) still drains all pages (already
  server-filtered SUBMITTED so the cost is lower than the violations case fixed
  here) — same one-page cap could apply later, out of instructed scope for this US.
