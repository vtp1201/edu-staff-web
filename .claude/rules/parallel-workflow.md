# Rule: Parallel FE Branch Workflow (branch-per-US, claim, auto-merge)

Nhiều phiên `/fe` chạy song song trên cùng repo. Mọi US đi qua workflow này để
tránh double-work, tránh US ràng buộc đụng nhau, và giữ `main` luôn qua gate
(decision `0025`). Đây là rule **cứng** cho `fe-lead`.

## Vòng đời một US (fe-lead sở hữu)

### 1. Claim check + dependency check — TRƯỚC khi code

1. `git fetch --prune` — đồng bộ remote.
2. **Tập US in-flight** = mọi remote branch dạng `feat/us-eXX.Y-*` / `fix/*` đang
   tồn tại (chưa merge+xóa). Mỗi branch như vậy = một US **đã có team khác claim**.
3. **US yêu cầu đã bị claim?** (remote branch tương ứng đã tồn tại) → DỪNG, báo
   user là US đang được team khác làm; không double-work.
4. **US yêu cầu có ràng buộc với US in-flight không?** Ràng buộc khi:
   - khai báo ở `## Dependencies` của packet (depends-on / blocks), HOẶC
   - cùng feature module (`src/features/<x>/…`), HOẶC chạm chung file/contract
     (cùng DTO/endpoint/use-case/component), HOẶC cùng design-system token mới.
   Nếu có ràng buộc → **chọn US thay thế** thỏa cả ba: (a) status `planned`,
   (b) chưa bị claim, (c) không phụ thuộc US in-flight. **Giải thích cho user**:
   vì sao bỏ US gốc (ràng buộc gì, với US in-flight nào) và vì sao chọn US thay thế.

### 2. Claim qua early push

```bash
git checkout main && git pull --ff-only         # main mới nhất
git checkout -b feat/us-eXX.Y-<slug>            # branch-per-US
git push -u origin HEAD                          # CLAIM — remote branch = khóa
```

Remote branch tồn tại = đã claim. KHÔNG claim bằng cách commit vào `main`.

### 3. Dev + test trên branch

Toàn bộ pipeline (planner → architecture → engineer TDD → review + a11y →
design-review gate → QA) chạy trên branch. Story status → `in-progress`.

### 4. Hoàn tất + auto-merge vào `main`

```bash
# gate phải xanh trên branch
bun vitest run && bun build                      # (pre-push cũng chạy)
git fetch origin && git merge --no-ff origin/main  # giải drift, chạy lại gate nếu có
# cập nhật harness proof
scripts/bin/harness-cli story update --id US-EXX.Y --status implemented --unit 1 ...
# merge vào main
git checkout main && git pull --ff-only
git merge --no-ff feat/us-eXX.Y-<slug> -m "chore(<scope>): merge feat/us-eXX.Y-<slug> (US-EXX.Y)"
git push origin main
```

- Pre-push gate (full test suite + `bun build`) **phải xanh** trước merge — KHÔNG
  `--no-verify`.
- KHÔNG tạo Pull Request (giữ `.claude/CLAUDE.md`).
- Merge commit theo format conventional (commitlint chặn "Merge ..." mặc định).

### 5. Xóa branch (local + remote)

```bash
git branch -d feat/us-eXX.Y-<slug>
git push origin --delete feat/us-eXX.Y-<slug>
```

Danh sách remote branch luôn = tập US đang dở → tín hiệu claim sạch.

## Quy tắc cứng

- **1 US = 1 branch**; dev/test trên branch, không trên `main`.
- **Push branch ngay khi nhận US** (claim) trước khi viết code.
- **`git fetch --prune` bắt buộc** ở đầu mỗi `/fe` run trước claim/dep check.
- US bị claim bởi team khác → KHÔNG đụng vào.
- US ràng buộc US in-flight → đổi US khác + giải thích cho user (không tự ý làm).
- Auto-merge vào `main` chỉ khi US xong **và** gate xanh; sau đó xóa branch.
- Không bao giờ bypass Lefthook / pre-push bằng `--no-verify`.

## Liên quan

- Decision `0025` (parallel FE branch workflow).
- `.claude/CLAUDE.md` §Commits & Branches (auto-merge thay cho merge thủ công).
- `docs/templates/story.md` §Dependencies.
- `.claude/rules/tdd.md` (gate proof trước khi `implemented`).
