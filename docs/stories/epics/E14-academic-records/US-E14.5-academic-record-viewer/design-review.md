# US-E14.5 Academic Record Viewer — Design Review Gate

> Gate theo `docs/DESIGN_REVIEW.md` + `.claude/rules/impeccable.md`. Phần cuối pipeline
> (gate record này) được hoàn tất sau khi phiên `fe-lead` bị stall ngay trước bước gate
> — code đã commit đầy đủ trên branch; gate được chạy & xác minh độc lập.

## Verdict: PASS

### Tokens-only
- Không raw color. Score colors theo design-system (≥8 success / <5 error / else text-primary)
  reuse `score-color.ts` của grades. Conduct: Tốt→success / Khá→primary / TB→warning / Yếu→error.
- Seal indicator: badge success + lock icon ("đã niêm phong") | muted ("chưa niêm phong").
- impeccable PostToolUse hook quét presentation: no anti-patterns.

### WCAG 2.1 AA
- Record table = native `<table>` với `scope="col"/"row"` + `<caption>` sr-only.
- Year-timeline selector keyboard accessible + labelled.
- Seal status truyền bằng icon + text (không chỉ màu).
- A11Y-070–075 đã resolve (contrast trên header/footer cells + chart text → token `text-edu-text-secondary`;
  decorative bars `aria-hidden`; empty/loading `role="status"`).

### Multi-role RBAC (read-only)
- student=self · parent=linked child · teacher=assigned class · admin=all. 4 route role-guarded.
- Không expose edit/seal — chỉ đọc. **Seal ACTION defer sang US-E14.6** (E14.5 chỉ hiển thị `sealed` flag).

### State coverage (Storybook)
loading / empty / error / multi-year populated / sealed vs unsealed / per-role variants.

## Proof (verified độc lập trên branch HEAD 8d4a4b3)
- `bunx tsc --noEmit`: 0 lỗi.
- `bun vitest run`: 766/766 pass (151 file).
- `bun run build`: green; 4 route academic-record (student/teacher/parent/admin).
- biome: clean.

## Open items (follow-up, không chặn)
- Seal ACTION = US-E14.6 (mutation flip `sealed`, bulk-seal admin).
- Sidebar nav cho 4 route chưa wire (shell scope).
- Student/parent identity mock — lấy từ JWT session khi auth integration xong.
- Real core academic-record API khi BE US-064 ship.
- Export/Print PDF = placeholder (out of scope theo story).
