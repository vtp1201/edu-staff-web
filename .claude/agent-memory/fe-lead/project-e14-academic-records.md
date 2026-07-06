---
name: project-e14-academic-records
description: E14 Academic Records epic status — grades feature module, US-E14.2 grade entry implemented
metadata:
  type: project
---

US-E14.2 Grade Entry Screen implemented (2026-06-18). New feature module `src/features/grades/`.

**Why:** Teachers need to enter component scores per class-subject against assessment scheme columns (TX/GK/CK); weighted average auto-computed; publish with SELF_PUBLISH (lock) or ADMIN_APPROVAL (pending) flow.

**How to apply:** When building E14.4 (grade approval) or E13.6 (grade book), EXTEND `src/features/grades/` — do not duplicate domain entities. The `GradeSheet`, `StudentScoreRow`, `GradesFailure`, `IGradesRepository`, and `GRADES_EP` are the shared foundation.

Key decisions:
- Mock-first: grade entry endpoints (BE US-060 planned); assessment-scheme + gradePublishMode are REAL (US-059 live)
- `publishMode` injected into MockGradesRepository at construction (SELF_PUBLISH → PUBLISHED; ADMIN_APPROVAL → PENDING_APPROVAL)
- `PublishGradesUseCase.execute(csId, term, rows)` — rows param required; prechecks incomplete scores → `incomplete-scores` failure before hitting repo
- Score color: proportional (≥80% of maxScore → success, <50% → error) in `score-color.ts` — works for SCALE_10 and SCALE_4
- maxScore hardcoded to 10 at action/screen boundary; wire real GradeScale.maxScore when BE US-060 ships
- `gradeKeys` util in presentation for TanStack Query key hierarchy: `["grades", csId, term]`

Gate numbers at merge: 687/687 Vitest, tsc 0, build clean, biome clean.
A11Y: A11Y-047 (table structure: scope=col + sr-only caption), A11Y-048 (locked cells aria-readonly + sr-only note), A11Y-049 (skeleton role=status), A11Y-050 (AlertDialog Radix-auto, no manual override), A11Y-051 (min-h-[44px]), A11Y-052 (sr-only column #), A11Y-053 (secondary badge text-edu-text-primary), A11Y-054 (minor label readability).

US-E14.4 Grade Approval Pipeline implemented (2026-06-19). EXTENDS grades module with a SEPARATE `IGradeApprovalRepository` (no scheme/publishMode deps — clean separation from E14.2).

Key patterns for E14.4:
- `GradeBandKey = "excellent"|"good"|"average"|"weak"|"poor"` — stable key emitted by mapper, translated at presentation. null average → `gradeBandKey: null` → renders "—".
- `GRADES_EP` extended with 5 approval endpoints (additive, no change to E14.2 entries).
- `gradeApproval` i18n namespace; `bandExcellent/Good/Average/Weak/Poor` keys for translation at render sites.
- Revision note min length 10 chars validated in use-case BEFORE repo call (same as teaching-plan pattern); exported as `MIN_REVISION_NOTE_LENGTH` for dialog import.
- Distribution chart: `motion-safe:transition-[width]` gated; `<ul aria-label>` for a11y.
- A11Y-055–060 fixed (LOCKED badge text-foreground, band label text-edu-text-secondary, table aria-label, Sheet closeLabel i18n, info icon text-foreground, motion-safe).

Gate: 711/711 Vitest, tsc 0 errors, build clean; merged to main commit 71d19ef.

E14.5 (academic record viewer) and E14.6 (record seal, HIGH-RISK) implemented too
(2026-07-06) — see [project-e14-record-seal](project-e14-record-seal.md) for E14.6's
review findings (they live in `src/features/academic-records/`, a SEPARATE module
from `grades/` — don't confuse the two). E14 epic now fully implemented.
Remaining US sharing grades module: E13.6 grade book (multi-role read-only).
