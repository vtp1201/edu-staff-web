# 0043 Exam Builder Question Reorder — Up/Down Buttons, No @dnd-kit Dependency

Date: 2026-06-19

## Status

Accepted

## Context

US-E11.3 Exam Builder requires teachers to reorder MCQ questions (AC-5). The original plan
considered `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop reorder. Before implementing,
we needed to decide whether to add a new runtime dependency or use a zero-dep approach.

The repo has no prior drag-and-drop dependency. `@dnd-kit` adds ~30 kB gzipped. The builder
question list is expected to contain 5–20 questions — drag-and-drop UX is a convenience but not
a hard requirement. AC-12 requires keyboard-accessible reorder, which dnd-kit supports via Space
+ arrow keys, but so do Up/Down icon-buttons (native `<button>` elements, inherently keyboard
navigable).

## Decision

Use Up/Down icon-buttons (no new dependency) for question reordering in the Exam Builder.

Each `QuestionListItem` renders two `<Button variant="ghost" size="icon">` elements:
- Move Up: `aria-label="Di chuyển câu hỏi {index} lên trên"`, `disabled` on first item.
- Move Down: `aria-label="Di chuyển câu hỏi {index} xuống dưới"`, `disabled` on last item.

The parent `ExamBuilderScreen` performs an immutable array-swap via `reorderQuestions(fromIdx, toIdx)`
inside the `useExamBuilder` hook.

## Alternatives Considered

1. **@dnd-kit/core + @dnd-kit/sortable** — Native pointer/touch drag with keyboard support
   (Space + arrows). Better UX for power users. Adds ~30 kB runtime + 2 new transitive deps.
   Rejected for this story due to dependency footprint and timeline. Can be revisited if user
   research shows drag-and-drop is significantly more intuitive.

2. **HTML5 Drag and Drop API** — No runtime dep, but complex cross-browser behaviour, no touch
   support, no keyboard support. Rejected.

## Consequences

Positive:
- Zero new runtime dependencies.
- Up/Down buttons are inherently keyboard-accessible (Tab + Enter/Space to activate); satisfies AC-12.
- Simpler implementation — no library-specific ARIA dance; `reorderQuestions` is a plain array-swap
  testable without React.
- Reduced bundle size.

Tradeoffs:
- Less polished UX than drag-and-drop for lists > 5 items.
- Future upgrade to dnd-kit requires replacing `QuestionList`/`QuestionListItem` + adding the
  `@dnd-kit` packages — medium refactor, no domain/infrastructure impact.

## Follow-Up

- Reassess if teacher UX research flags reorder friction with >10 questions in a session.
- If drag-and-drop is added, register a new ADR superseding this one and add `@dnd-kit/core` +
  `@dnd-kit/sortable` to `package.json`.
- The full-screen builder layout (nested under `(app)` route group) cannot fully escape the
  dashboard AppShell. A follow-up story should extract builder pages to a `(builder)` route
  group with its own layout if true full-screen is required by design.
