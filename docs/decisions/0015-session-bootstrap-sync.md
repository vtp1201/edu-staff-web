# 0015 Session Bootstrap Sync (Claude Code ↔ Harness)

Date: 2026-06-06

## Status

Accepted

## Context

Harness đặt "đọc trước khi làm" trong `AGENTS.md` (README, HARNESS.md,
FEATURE_INTAKE, ARCHITECTURE, CONTEXT_RULES + `harness-cli query matrix`). Nhưng:

- Claude Code **tự load** `.claude/CLAUDE.md` và `.claude/rules/*.md` (xác nhận:
  `tailwind-v4.md` xuất hiện trong context session này).
- Claude Code **KHÔNG tự load** `AGENTS.md` → bootstrap của harness và các doc
  nó trỏ tới không được nạp đáng tin cậy mỗi session.
- Project `.claude/settings.json` trước đó **không có** hook nào (chỉ permissions).

→ Hai hệ (Claude Code dùng CLAUDE.md, Harness dùng AGENTS.md) chưa đồng bộ.

## Decision

Đồng bộ bằng 3 lớp:

1. **SessionStart hook** trong `.claude/settings.json`: `cat AGENTS.md` → nội
   dung AGENTS.md được inject vào context **mỗi khi mở session**. Đây là cơ chế
   "luôn đọc AGENTS.md khi start session".
2. **AGENTS.md được enrich** thành chỉ mục bootstrap đầy đủ: intake discipline,
   danh sách `.claude/rules/*`, design-review gate, design source-of-truth,
   mock-first, harness-cli. (Vừa cho Claude Code vừa cho agent khác.)
3. **CLAUDE.md** (luôn auto-load) thêm mục "Session Bootstrap (Harness)" trỏ tới
   AGENTS.md + read-list — belt-and-suspenders nếu hook bị tắt.

`.claude/rules/*` đã auto-load nên không cần hook cho chúng.

## Alternatives Considered

1. Chỉ dựa vào AGENTS.md (giữ nguyên) — bỏ: Claude Code không đọc → không đáng tin.
2. Hook `cat` toàn bộ HARNESS.md/CONTEXT_RULES.md mỗi session — bỏ: bloat context
   (HARNESS.md ~11KB, CONTEXT_RULES ~8KB). Chỉ inject AGENTS.md (chỉ mục ngắn);
   agent đọc sâu khi cần.

## Consequences

Positive:

- Mỗi session (kể cả agent/headless) thấy ngay bootstrap harness + read-list.
- Hook commit trong project → cả team hưởng, không phụ thuộc cấu hình cá nhân.

Tradeoffs:

- Thêm một ít output vào đầu mỗi session (AGENTS.md ngắn — chấp nhận được).
- Nếu hook bị tắt, vẫn còn lớp CLAUDE.md.

## Follow-Up

- ✅ Hook + AGENTS.md + CLAUDE.md cập nhật.
- Cân nhắc thêm `harness-cli query matrix` vào hook nếu muốn thấy proof status
  mỗi session (hiện để agent tự chạy theo AGENTS.md).
