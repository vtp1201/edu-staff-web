---
name: project-parallel-branch-workflow
description: Parallel branch workflow — claim via remote branch early-push, dependency check, auto-merge to main on gate-green, delete branch
metadata:
  type: project
---

Decision `0025` (`.claude/rules/parallel-workflow.md`). Nhiều `/fe` chạy song song.
Mỗi US trước khi code: `git fetch --prune` → claim check (remote `feat/us-eXX.Y-*`
branch tồn tại = US team khác đang làm) → dependency check (packet `## Dependencies`
+ feature module / shared contract overlap). US bị claim hoặc ràng buộc US in-flight
→ chọn US khác + giải thích cho user. Claim bằng tạo branch từ main rồi push ngay
(early push). Xong + gate xanh → auto-merge `--no-ff` vào main (no PR) → xóa branch
local + remote. Đây là tự động, KHÔNG chờ user yêu cầu merge từng lần (đổi từ rule cũ).
