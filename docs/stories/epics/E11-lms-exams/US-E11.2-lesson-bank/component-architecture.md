# US-E11.2 Lesson Bank — Component Architecture

```
app/.../teacher/lesson-bank/page.tsx (RSC)
  └─ LessonBankScreen ('use client', state machine via useState)
       ├─ LessonBankFilterBar   (search, subject/dept/visibility selects, sort, grid|list toggle)
       ├─ LessonBankSkeleton    (loading state, grid|list)
       ├─ LessonBankEmpty       (empty vs no-match — driven by hasActiveFilter)
       ├─ LessonCard            (grid|list variant; click → detail)
       ├─ LessonDetailSheet     (side sheet; download/open/edit/delete + confirm dialog)
       └─ UploadDrawer          (right sheet; title/subject/dept/fileType/file|link/visibility)
```

## ViewModel contract (`lesson-bank-screen.i-vm.ts`)

Screen nhận **initial data qua props (RSC)** + **Server-Action refs**:
- `lessons`, `filters`, `subjects`, `departments` — RSC-provided.
- `viewerRole` (`teacher|principal`) → `canUpload`/`canEdit` gating; `currentUserId`
  → ownership gate cho edit/delete (`viewerRole==="teacher" && authorId===currentUserId`).
- `uploadAction(input) → {ok:true,lesson}|{ok:false,errorKey}`.
- `deleteAction(id) → {ok:true}|{ok:false,errorKey}`.

## Reuse / placement (decision 0026)

- Primitives từ `components/ui/`: Button, Input, Select, Sheet, Toggle, Textarea,
  Label, Skeleton — không fork.
- Các component lesson-bank hiện **chỉ 1 screen dùng** → đặt feature-local
  (`features/lesson-bank/presentation/lesson-bank-screen/`); promote sang
  `components/shared/` khi screen thứ 2 (vd principal route) cần.
- File-type badge / visibility badge: dùng token semantic sẵn có, không tạo token mới.

## A11y notes

- Upload drop-zone là `<button type="button">` thật (native focus + Enter/Space),
  không phải div role=button.
- Toggle group dùng `role="group"` + `aria-label` (toolbar pattern — biome-ignore
  useSemanticElements có chủ đích, không phải fieldset form).
- Skeleton dùng `role="status"` + sr-only text; key ổn định (không index key).
- Form fields: Label liên kết `htmlFor/id`, `aria-invalid` + `aria-describedby` +
  `role="alert"` cho lỗi.
