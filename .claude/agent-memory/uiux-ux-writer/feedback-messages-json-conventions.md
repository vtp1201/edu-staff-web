---
name: messages-json-conventions
description: Structural conventions observed in vi.json/en.json when authoring a brand-new top-level namespace (used for DR-020 assignments)
metadata:
  type: feedback
---

When authoring a genuinely new top-level i18n namespace (no existing keys to reconcile):

- Top-level keys in `src/bootstrap/i18n/messages/{vi,en}.json` are kept roughly **alphabetical**. Insert the new namespace in alphabetical position (verified both files have identical line numbers for every top-level key — grep `^  "[a-zA-Z]+": \{` in both to confirm before inserting, then insert at the same point in both).
- Per-feature confirm dialogs follow a local pattern seen in `adminSettings.confirmDialog` (title/description/cancel/confirm), rather than only relying on the shared `Common.confirmDialog`. Prefer a local `confirmOverdue`/`confirmDialog` object scoped to the namespace for destructive/blocking confirmations tied to specific copy.
- Loading copy key is usually `skeleton.loading` (see `exam.skeleton.loading`, `Common.skeleton.loading`), fetch-failure copy is `error.title` + `error.description` + `error.retry` (see `academicRecord.error`), and stable failure-union copy goes under a separate `errors.<Failure type>` map (kebab-case types like `network-error`, `not-found`, `already-submitted`) — keep both patterns since callers use them for different purposes (generic screen-level error state vs precise server failure keys).
- Per-tab empty states get one key per tab (`allTab`/`pendingTab`/... ) even when two tabs share identical copy — mirrors `courses.empty.{allTab,inProgressTab,completedTab}`.

**Why:** DR-020 (student assignments) was the first genuinely net-new namespace in a while; grepping existing namespaces (`courses`, `exam`, `academicRecord`, `adminSettings`) before writing kept the new `assignments` namespace consistent in tone and shape with the rest of the file, avoiding drift.

**How to apply:** Before authoring a new namespace, grep vi.json for 2-3 similar existing namespaces (same domain or same UI pattern — list+filter+card, submit sheet, graded feedback) and mirror their key shapes rather than inventing a new structure.
