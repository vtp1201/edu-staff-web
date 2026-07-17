---
name: messages-json-conventions
description: Structural conventions observed in vi.json/en.json when authoring a brand-new top-level namespace (used for DR-020 assignments, DR-021 lessonPlan/questionBank)
metadata:
  type: feedback
---

When authoring a genuinely new top-level i18n namespace (no existing keys to reconcile):

- Top-level keys in `src/bootstrap/i18n/messages/{vi,en}.json` are kept roughly **alphabetical**. Insert the new namespace in alphabetical position (verified both files have identical line numbers for every top-level key — grep `^  "[a-zA-Z]+": \{` in both to confirm before inserting, then insert at the same point in both).
- Per-feature confirm dialogs follow a local pattern seen in `adminSettings.confirmDialog` (title/description/cancel/confirm), rather than only relying on the shared `Common.confirmDialog`. Prefer a local `confirmOverdue`/`confirmDialog`/`publishDialog` object scoped to the namespace for destructive/blocking confirmations tied to specific copy.
- Loading copy key is usually `skeleton.loading` (see `exam.skeleton.loading`, `Common.skeleton.loading`) OR a plain `loading` + `loadingAriaLabel` pair (see `examBank.loading`/`loadingAriaLabel`, reused for DR-021 `lessonPlan`/`questionBank`). Fetch-failure copy is `error.title` + `error.description` + `error.retry` (see `academicRecord.error`), and stable failure-union copy goes under a separate `errors.<Failure type>` map (kebab-case types like `network-error`, `not-found`, `title-required`) — keep both patterns since callers use them for different purposes (generic screen-level error state vs precise server failure keys).
- Per-tab empty states get one key per tab (`allTab`/`pendingTab`/... ) even when two tabs share identical copy — mirrors `courses.empty.{allTab,inProgressTab,completedTab}`.
- **One-way DRAFT→PUBLISHED workflows** (exam-bank, DR-021 lesson-plan/question-bank): use `status.{draft,published}`, a `publishDialog` (title/body/cancel/confirm/publishing — body text MUST state irreversibility explicitly, e.g. "không thể chuyển lại về trạng thái nháp"), and a `lockedNotice` (title/body) for the read-only view once published — no unpublish/edit copy since the BE contract doesn't support it.
- **Required-filter search gate** (question bank's mandatory subject/tag filter, BE 422 `QUESTION_SEARCH_FILTER_REQUIRED`): give it its OWN state key distinct from `empty` — e.g. `requiredFilterPrompt.{title,body}` — never reuse the generic empty-state copy for "you must pick a filter first" vs "genuinely zero results".

**Why:** DR-020 (student assignments) was the first genuinely net-new namespace in a while; DR-021 (lesson-plan + question-bank) confirmed the same shape scales to two BE-contract-driven, one-way-publish domains. Grepping existing namespaces (`courses`, `exam`, `examBank`, `academicRecord`, `adminSettings`) before writing keeps new namespaces consistent in tone and shape with the rest of the file, avoiding drift.

**How to apply:** Before authoring a new namespace, grep vi.json for 2-3 similar existing namespaces (same domain or same UI pattern — list+filter+card, submit sheet, graded feedback, draft→publish builder) and mirror their key shapes rather than inventing a new structure.
