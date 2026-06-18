# US-E11.2 Lesson Bank — State Design

## Boundary

- **Server (RSC `page.tsx`)** — initial fetch `ListLessonsUseCase.execute()` qua DI;
  derive `subjects`/`departments` (distinct từ list, mock-first). Pass xuống screen.
- **Client (`LessonBankScreen`)** — local UI state, không global store (đúng rule).

## Client state (useState)

| State | Mục đích |
| --- | --- |
| `lessons` | seeded từ `initialLessons`; cập nhật optimistic sau upload/delete |
| `filters` | search/subject/department/visibility/sort — lọc client-side (`applyClientFilters`) |
| `layout` | grid \| list toggle |
| `selectedLesson` | mở `LessonDetailSheet` |
| `uploadOpen` / `isUploading` | điều khiển `UploadDrawer` + nút submit |

## Mutations (Server Actions, không TanStack mutation vì mock-first single-screen)

- `uploadLessonAction(input)` → use-case validate (title/type/url/size) →
  `{ok:true,lesson}` (prepend vào `lessons`, toast) | `{ok:false,errorKey}` (toast lỗi
  dịch ở presentation qua `errors.<key>`). `revalidatePath` để RSC đồng bộ.
- `deleteLessonAction(id)` → tương tự; remove khỏi `lessons` khi ok.

## Lý do không dùng TanStack Query ở đây

Dữ liệu được RSC nạp sẵn + screen tự hold; danh sách mock-first chưa phân trang
cursor (story cho phép load đơn giản). Khi lms service lên & cần cache/refetch
xuyên screen → nâng lên query keys `["lessons","list",filter]`. Ghi nhận làm follow-up.

## Stable failure keys (i18n boundary)

Use-case/action trả `LessonBankFailure["type"]` (`missing-title` | `invalid-url` |
`unsupported-type` | `file-too-large` | `not-found` | `forbidden` | `unauthorized` |
`network-error` | `unknown`) → presentation dịch `t(\`errors.${key}\`)`. Không dịch ở server.
