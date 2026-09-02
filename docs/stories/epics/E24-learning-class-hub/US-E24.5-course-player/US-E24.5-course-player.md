# US-E24.5 Course Player (kiểu Udemy) — nội dung mục + panel khoá học + nộp bài 1 lần

## Status

planned

## Lane

high-risk

> Lý do: mutation `submitAssignment` (nộp 1 lần, không hoàn tác) + ngoại link (`url`) render từ BE
> → validated allowlist embed, `rel="noopener"`, không `dangerouslySetInnerHTML` cho `content`.

## Dependencies

- Depends on: US-E24.3 (timeline + shared chips), US-E24.1
- Blocks: none
- Feature module(s) chạm: `src/features/lms/presentation/course-player/**` (mới), route
  `student/courses/[courseId]/items/[itemId]/{page.tsx,actions.ts}`, `lms.di.ts` (thêm
  `makeGetMySubmissionUseCase` nếu chưa export)
- Shared contract/file: `messages` namespace `courses.player`; `features/exam` chỉ link tới

## Product Contract

Design v3: `design_src/edu/course-player.jsx` → `CourseItemPlayer`, `CpVideo`, `CpDocument`,
`CpAssignment`, `CpExam`, `CpLocked`; `course-items.jsx` → `CiSubmitBox`; design-spec
`student-course-player`. D2/D3/D4/D7 đã áp dụng trong mockup.

Layout: breadcrumb (course › item) · grid 2 cột (`minmax(0,1.65fr) minmax(280px,1fr)`), mobile 1 cột.
- **Trái**: header (chip loại, tiêu đề, "Loại · khung thời gian", pill trạng thái); banner
  "Đã đóng — chỉ xem để ôn tập." khi CLOSED (trừ assignment/exam có banner riêng); body theo loại;
  bên dưới **chỉ** khối "Tổng quan" (mô tả `description` + khung thời gian) — không tab (D2).
- **Body theo loại**:
  - LESSON: `getLesson` → `content` render **plain text/markdown an toàn** (`text-content.tsx` hiện có,
    không HTML thô). Video 16:9 (`bg-edu-media-surface`) chỉ khi `content`/`url` chứa link nhúng được
    (YouTube/Drive allowlist) — D4. Player thật = `<iframe>` allowlist origin, `title` bắt buộc.
  - DOCUMENT: card link ngoài (`url`, hiển thị hostname), nút "Mở liên kết" (`target=_blank
    rel=noopener noreferrer`), khung "Xem trước" iframe khi allowlist, ngược lại text hướng dẫn.
  - ASSIGNMENT: `getAssignment` + `getMySubmission`. Chưa nộp & OPEN → `CiSubmitBox`: textarea
    `maxLength=20000` + counter, ô "Link bài làm" (URL http(s) validate), nút "Nộp bài" → bước xác
    nhận "Chỉ nộp 1 lần duy nhất" → Server Action `submitAssignment(content)` (content = text +
    "\n" + link nếu có) → "Đã nộp lúc HH:mm · dd/MM/yyyy". Drop-zone tệp render **disabled** với badge
    "Sau khi backend hỗ trợ" (D3, ask #1). Đã nộp → banner success "Đã nộp lúc …" (+ điểm khi có —
    US-141). CLOSED chưa nộp → banner lock + "Bạn chưa nộp bài này trước hạn." (error-text).
  - EXAM: intro (icon, tiêu đề, mô tả), OPEN → "Vào làm bài" → `exam.examUrl` nếu có, else
    `/student/exams/[examId]`; UPCOMING → chip "Mở lúc …"; CLOSED → "Xem lại đề & bài làm" →
    `/student/exams/[examId]` (result).
  - UPCOMING (chỉ EXAM tới được, D7) → `CpLocked`.
- **Phải**: panel "Nội dung khoá học" `idx/total`, nhóm tuần collapsible (button `aria-expanded`),
  mỗi mục: chip nhỏ (lock nếu upcoming), tiêu đề, "Loại · ✓ Đã nộp | Đã đóng | Mở dd/MM", mục
  đang học có `border-l-3 primary` + `aria-current="true"`. Footer Prev / "Mục tiếp theo"
  (disabled ở đầu/cuối). Điều hướng = Link (URL đổi), không state.
- Server Action lỗi map: `already-submitted` (409) → toast + chuyển sang trạng thái đã nộp (refetch);
  `item-closed` (409) → banner closed; `item-not-open` (404) → CpLocked; network → retry.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#student-course-player`
- `docs/reports/2026-09-02-fe-to-be-asks-adr0143.md` #1 #2 #3
- `.claude/CLAUDE.md` §Hard Rules Security; `.claude/rules/accessibility.md`

## Acceptance Criteria

- Route `/student/courses/[courseId]/items/[itemId]` render 4 loại + locked (Storybook 5 story + RSC
  page.test 4 branch: ok / item 404 / course 404 / timeline fail).
- Submit: lần 1 → 200 → UI "Đã nộp lúc …" không cần reload (revalidatePath); lần 2 (race) → 409 →
  toast "Bài này đã được nộp" + UI đã nộp (test action + story `SubmitAlreadySubmitted` tái dùng của
  E24.1 chuyển sang màn mới).
- Counter 20000 hiển thị `n/20000`, chặn nhập quá; nút Nộp disabled khi rỗng cả text và link; link
  không hợp lệ → lỗi field `aria-invalid` + `aria-describedby`.
- Không có `dangerouslySetInnerHTML`; iframe chỉ cho origin allowlist (`youtube.com`, `youtu.be`,
  `drive.google.com`, `docs.google.com`, `geogebra.org`) — unit test `embedSourceFor(url)` trả null
  cho origin khác; link ngoài luôn `rel="noopener noreferrer"`.
- Panel: mục đang xem có `aria-current`; Prev/Next là Link; collapse giữ trong URL? **Không** — local
  state OK (UI-only).
- Mobile 375: 1 cột, panel dưới nội dung; video giữ 16:9.
- i18n `courses.player.*` (vi+en) — mọi chuỗi design đưa vào messages; không hardcode "08:57 / 32:00".
- Gate xanh; design-review + a11y pass (contrast trên `bg-edu-media-surface` dùng
  `text-edu-media-surface-foreground`).

## Design Notes

- Commands: `submitAssignment(assignmentId, content)` Server Action trong `actions.ts` → DI
  `makeSubmitAssignmentUseCase`; trả `{ ok } | { errorKey }`.
- Queries: `getCourse`, `listItems`, + theo loại `getLesson` | `getAssignment`+`getMySubmission`.
- UI: `course-player/{course-player.tsx, player-header.tsx, body-lesson.tsx, body-document.tsx,
  body-assignment.tsx, submit-box.tsx, body-exam.tsx, body-locked.tsx, content-panel.tsx,
  embed-source.ts}`. `submit-box.tsx` = 1 nơi (design `CiSubmitBox` dùng ở 2 chỗ → shared trong
  feature; nếu E24.3 expand tạm còn thì gỡ ở US này).
- Xoá `lesson-player` expand-inline tạm của E24.3 (dòng timeline → Link sang player).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | embed allowlist, submit payload compose, failure→UI state |
| Integration | actions.test (409/404 mapping), page.test RSC |
| E2E | Storybook: submit flow confirm → done; already-submitted |
| Platform | tsc/vitest/build |
| Release | design-review + a11y + security checklist |

## Harness Delta

None (không ADR; upload/grade chờ BE).

## Evidence

(điền sau)
