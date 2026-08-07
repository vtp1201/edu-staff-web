# US-E18.55 Hygiene pass batch 5: US-185 stale-note sweep + deploy-order notes

## Status

implemented — 2026-08-07

## Lane

tiny

## Dependencies

- Depends on: run LAST in this batch (after US-E18.50..54 land, so the sweep covers their fresh comments too, not just pre-batch-5 ones)
- Blocks: none
- Feature module(s) chạm: cross-cutting grep/doc sweep, no single feature module
- Shared contract/file: none structural

## Ground truth (fe-lead, verified before delegating)

Coordinator's item 6, two sub-items:

**(a) BE US-185 fixed (core migration 048, "year-heal").** This was the
known-issue flagged in the 2026-08-05 BE report: a stale `grade_entries_by_student`
clone could show old status/value after a teacher's first grade entry —
documented in this repo's `TEST_MATRIX.md`/story packets as "if QA sees a
mismatch, it's a known BE bug, not ours." BE confirms this is now fixed.
Task: grep the repo for every note/comment citing this staleness as a
CURRENT caveat and remove/update them — they're now stale THEMSELVES.

**(b) Deploy-order notes.** Core migrations `047→050` must run in order
(047 rejection metadata/US-184, 048 year-heal/US-185, 049 pending-rollup/
US-186, 050 grade-scale bands/US-189) before their respective features go
live; social migration `038` (pinned_messages) before US-192/193 go live.
These are OPERATIONAL notes only — mock/unit tests are unaffected. Task:
consolidate these into ONE clear deploy-notes section (check if one already
exists per-story and is scattered, or needs a single canonical location —
likely a section in `EPIC-OVERVIEW.md` or a dedicated `docs/reports/`
deploy-checklist note) rather than leaving them fragmented across 6+ story
packets' individual Evidence sections.

## Scope

1. Grep the WHOLE repo (`src/`, `docs/`) for "stale"/"US-185"/"grade_entries_by_student"
   mentions describing the now-fixed staleness bug. Update or remove each —
   confirm each one really is about THIS bug before touching it (don't
   accidentally edit an unrelated "stale" comment).
2. Consolidate the migration deploy-order notes (047→050 core, 038 social)
   into one place — check `EPIC-OVERVIEW.md`'s existing structure for where
   this kind of cross-story operational note already lives (search for how
   prior migration notes, e.g. US-047_grade_entries_rejection, were
   documented) and follow that precedent rather than inventing a new doc
   section.
3. Do NOT touch any production code — this is doc-only, same "true no-op
   unless a genuine gap is found" discipline as US-E18.45.

## NOT in scope

- Any functional/behavioral code change.
- Re-running the whole epic's staleness sweep from scratch — only touch
  comments/docs that actually cite the US-185 bug by name or by its
  described symptom (student grade view lagging teacher gradebook after
  first entry).

## Acceptance Criteria

- No doc-comment or story-packet note anywhere in the repo still describes
  the US-185 staleness bug as a CURRENT caveat.
- Deploy-order notes for migrations 047-050 (core) + 038 (social) exist in
  ONE findable, canonical location.
- Zero production code change unless a genuine gap is found (in which case,
  document why this moved from "hygiene" to "real fix").

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | none expected |
| Integration | none expected |
| E2E | none expected |
| Platform | `bun vitest run` zero-regression (should be a no-op diff to `src/`), `bunx tsc --noEmit` |
| Release | merged to main, branch deleted |

## Harness Delta

- TEST_MATRIX: no new row expected unless a real gap surfaces.
- EPIC-OVERVIEW.md Wave 8 row (hygiene note + the consolidated deploy checklist).

## Evidence

**Done 2026-08-07 (doc-only, zero `src/` change — grep-confirmed):**

1. **US-185 sweep:** grep toàn repo (`src/`, `docs/`) cho
   `US-185`/`grade_entries_by_student`/`year-heal`/symptom "student view lagging".
   Kết quả: `src/` sạch (0 citation); citation duy nhất còn mô tả bug như caveat
   HIỆN TẠI là 3 chỗ trong packet `US-E18.44-grade-reject-flow.md` (Ground truth,
   NOT-in-scope, Evidence §4) — cả 3 được đánh dấu resolved kèm ngày + nguồn
   (core migration 048, BE report 2026-08-07). Các report
   `2026-08-05-be-to-fe-response.md`/`2026-08-06-fe-to-be-asks.md` giữ nguyên —
   là record lịch sử tại thời điểm viết, không phải caveat sống.
2. **Deploy-order notes:** hợp nhất vào section mới
   `EPIC-OVERVIEW.md` §"Deploy notes (go-live real mode)" (đặt ngay trước
   §"Dependencies & thứ tự" — vị trí cross-story operational duy nhất của epic):
   core 047→050 theo thứ tự, social 038 trước pin/group-lifecycle real, IAM
   binary-only + 2 env optional.
3. **Gap thật tìm thấy (vẫn doc-only):** hai phiên song song US-E18.50 và
   US-E18.53 quên ghi row Wave 8 trong `EPIC-OVERVIEW.md` — bổ sung cả hai
   (tóm tắt từ packet + verdict review), cùng row US-E18.55 này.

Platform proof: `bunx tsc --noEmit` clean; diff không chạm `src/` nên
`bun vitest run` là zero-regression theo cấu trúc (pre-push gate chạy full suite
khi merge).
