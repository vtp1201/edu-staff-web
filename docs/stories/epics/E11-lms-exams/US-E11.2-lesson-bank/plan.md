# US-E11.2 Lesson Bank — Implementation Plan

> Mock-first (decision 0014): lms service chưa ship → `MockLessonBankRepository`
> qua `USE_MOCK` trong DI factory. File upload = placeholder (không có storage backend).

## Phases

1. **Domain (TDD red→green)** — `LessonEntity`/`LessonListFilter`/`UploadLessonInput`
   entities, `LessonBankFailure` union, `ILessonBankRepository` interface; use-cases
   `list-lessons`, `get-lesson-detail`, `upload-lesson` (validate title/type/url/size),
   `delete-lesson` (map not-found/forbidden). Unit test trước.
2. **Infrastructure (server-only)** — `LessonResponseDto`, `mapLesson`/`mapLessonList`
   (plain functions), `LessonBankRepository` (envelope/error mapping), mock repo + fixtures.
3. **Bootstrap** — `LESSON_BANK_EP` endpoint constants + `lesson-bank.di` factory
   (`USE_MOCK ? Mock : Real`).
4. **Presentation (client)** — `LessonBankScreen` (grid/list toggle, filter bar,
   cards, detail sheet, upload drawer, empty/no-match/skeleton states), VM contract.
5. **App routing** — `/teacher/lesson-bank` RSC page (list via DI, derive
   subjects/departments) + `actions.ts` (upload/delete → stable `errorKey`).
6. **i18n** — namespace `lessonBank` (vi nguồn + en mirror).
7. **Proof** — 31 unit/integ tests + 4 Storybook interaction stories; gate
   (tsc/biome/vitest/build) xanh; design-review gate.

## Out of scope (follow-up)

- Sidebar nav link tới `/teacher/lesson-bank` (shell story).
- Principal route `/principal/lesson-bank` (screen đã hỗ trợ `viewerRole="principal"`,
  chỉ cần wiring route — tách story để tránh chạm shell trong US này).
- Real lms wiring (chờ service lên) + real file storage/upload progress.
