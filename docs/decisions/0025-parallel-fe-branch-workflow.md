# 0025 Parallel FE Branch Workflow — Branch-per-US, Claim, Auto-Merge

Date: 2026-06-13

## Status

Accepted

## Context

Nhiều phiên `/fe` (fe-lead) chạy **song song** trên cùng repo, mỗi phiên nhận một
US khác nhau của epic E12 (admin-core) và các epic khác. Quy trình trước đây có
hai vấn đề:

1. **Mù điều phối.** Story chỉ có trạng thái thực tế `planned`/`implemented` —
   không có `in-progress`, không có chủ sở hữu, không có khai báo phụ thuộc. Hai
   team có thể cùng pick một US, hoặc pick hai US ràng buộc nhau (chạm cùng
   feature/file), rồi đụng nhau khi merge.
2. **Merge thủ công.** Rule cũ: "chỉ push/merge khi user yêu cầu". Với nhiều team
   song song, việc gom merge thủ công tạo nút cổ chai và để branch tồn đọng.

Yêu cầu mới: mỗi team **tạo branch → dev + test trên branch → merge thẳng vào
`main`** ngay khi US xong (gate xanh); trước khi nhận US phải **kiểm tra US nào
team khác đang làm** và **ràng buộc** với US định làm — nếu vướng thì chọn US khác
và giải thích lý do; merge xong **xóa branch**.

## Decision

Áp dụng **Parallel FE Branch Workflow** cho team `/fe` (chi tiết enforceable ở
`.claude/rules/parallel-workflow.md`):

1. **Branch-per-US bắt buộc.** Mỗi US làm trên một branch riêng `feat/us-eXX.Y-<slug>`
   (hoặc `fix/...`) tách từ `main` mới nhất. Dev + toàn bộ test diễn ra trên branch.

2. **Claim qua remote branch (early push).** Ngay khi fe-lead nhận một US, nó tạo
   branch và **push lên remote ngay** (`git push -u origin HEAD`) — sự tồn tại của
   remote branch `feat/us-eXX.Y-*` **chính là khóa claim**. Phi tập trung, real-time
   xuyên session song song, KHÔNG ghi vào `main` nên không gây contention.

3. **Claim check + dependency check trước khi code.** Mỗi `/fe` run, fe-lead:
   `git fetch --prune` → liệt kê remote branch đang dở = tập US in-flight. Nếu US
   yêu cầu đã bị claim → dừng, báo user. Nếu US yêu cầu **ràng buộc** với một US
   in-flight (cùng feature module, chạm chung file/contract, hoặc khai báo ở
   `## Dependencies` của packet) → **chọn US khác** thỏa (planned + chưa claim +
   không phụ thuộc US in-flight) và **giải thích cho user** vì sao bỏ US gốc, vì
   sao chọn US thay thế.

4. **Auto-merge vào `main` khi US xong.** Thay rule cũ "chỉ merge khi user yêu cầu":
   khi US hoàn tất và **pre-push gate (full test suite + `bun build`) xanh**, fe-lead
   tự rebase/merge `main` mới nhất vào branch (giải drift, chạy lại gate) → merge
   `--no-ff` vào `main` với `chore(<scope>): merge <branch> (<US-id>)` → push `main`.
   KHÔNG tạo Pull Request (giữ nguyên `.claude/CLAUDE.md`).

5. **Xóa branch sau merge (local + remote).** `git branch -d` +
   `git push origin --delete` → danh sách remote branch luôn phản ánh đúng tập US
   đang dở (giữ tín hiệu claim sạch).

Story `## Status` nhận thêm giá trị **`in-progress`** (mô tả vòng đời; nguồn claim
thật vẫn là remote branch để tránh contention trên `main`).

## Alternatives Considered

1. **Claim bằng story status `in-progress` commit thẳng vào `main`** — mọi team thấy
   qua harness-cli, nhưng nhiều team claim cùng lúc → churn/contention ngay trên
   `main`. Bỏ.
2. **File claims ledger `docs/stories/CLAIMS.md`** — đơn giản để đọc nhưng vẫn phải
   commit lên `main` → cùng vấn đề contention + dễ stale. Bỏ.
3. **Auto-merge vào nhánh tích hợp `dev`, batch lên `main`** — an toàn hơn cho `main`
   nhưng thêm một tầng và một bước duyệt thủ công, ngược mục tiêu giảm nút cổ chai.
   Bỏ; có thể nâng lại nếu `main` bất ổn.
4. **Giữ merge thủ công** — không giải quyết nút cổ chai khi nhiều team song song. Bỏ.

## Consequences

Positive:

- Hai team song song không double-work hay đụng US ràng buộc nhau (claim + dep check).
- Branch isolation: dev/test cô lập, `main` luôn ở trạng thái đã qua gate.
- `main` cập nhật liên tục theo từng US; branch không tồn đọng.

Tradeoffs:

- Đổi rule "chỉ merge khi user yêu cầu" → "auto-merge khi US xong & gate xanh" cho
  team `/fe`. (User đã chốt 2026-06-13.)
- Claim qua remote branch yêu cầu push sớm — branch claim phải được tạo từ `main`
  mới nhất; nếu một team quên fetch trước, vẫn có khe đua nhỏ (mitigate bằng
  `git fetch --prune` bắt buộc ở đầu mỗi run).
- Dependency check phụ thuộc `## Dependencies` của packet + suy luận file-scope khi
  packet chưa khai báo → cần fe-lead chủ động điền mục này khi tạo packet.

## Follow-Up

- Bổ sung `## Dependencies` vào `docs/templates/story.md`; backfill cho packet E12
  còn `planned` khi pick.
- Nếu tần suất xung đột merge trên `main` cao → cân nhắc Alternative 3 (nhánh `dev`).
