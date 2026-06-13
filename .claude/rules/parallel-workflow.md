# Rule: Parallel FE Branch Workflow (branch-per-US, claim, auto-merge)

Nhiều phiên `/fe` chạy song song trên cùng repo. Mọi US đi qua workflow này để
tránh double-work, tránh US ràng buộc đụng nhau, và giữ `main` luôn qua gate
(decision `0025`, isolation worktree decision `0033`). Đây là rule **cứng** cho `fe-lead`.

> ⚠️ **Branch isolate code, KHÔNG isolate working tree.** Nhiều phiên cùng một
> checkout = chung `HEAD` + chung index → `git commit` của phiên này rơi vào branch
> đang checkout của phiên kia (đã xảy ra 2026-06-14: commit staffing US-E06.8 rơi
> nhầm branch khác), stash chồng chất, file lẫn nhau. Khi **song song** phải tách
> **git worktree** riêng mỗi US (decision `0033`).

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

### 2. Claim qua early push — chọn 1 trong 2 đường theo mức song song

**Có song song** (claim-check ở §1 thấy CÓ remote branch `feat/us-*`/`fix/*` khác
đang dở, HOẶC user báo đang chạy song song) → **BẮT BUỘC dùng git worktree riêng**
(decision `0033`). Một lệnh lo hết (branch từ `origin/main` không đụng main checkout,
add worktree, `bun install`, early-push claim):

```bash
scripts/bin/fe-worktree add US-EXX.Y <slug>     # → ../edu-staff-web-trees/us-exx.y
cd ../edu-staff-web-trees/us-exx.y              # TỪ ĐÂY mọi việc chạy trong worktree
```

**Solo** (claim-check thấy KHÔNG có branch in-flight nào khác) → làm trên main
checkout như cũ, không tốn overhead worktree:

```bash
git checkout main && git pull --ff-only         # main mới nhất
git checkout -b feat/us-eXX.Y-<slug>            # branch-per-US
git push -u origin HEAD                          # CLAIM — remote branch = khóa
```

Remote branch tồn tại = đã claim. KHÔNG claim bằng cách commit vào `main`.

### 3. Dev + test trên branch (trong worktree nếu song song)

Toàn bộ pipeline (planner → architecture → engineer TDD → review + a11y →
design-review gate → QA) chạy trên branch — **trong thư mục worktree** nếu song song.
Story status → `in-progress`. Trước MỌI `git commit`: xác minh `git branch --show-current`
đúng branch của US này (shell state reset giữa các call → branch có thể lệch).

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

### 5. Xóa branch (local + remote) — và worktree nếu có

**Song song (đã dùng worktree)** — một lệnh gỡ worktree + xóa branch local & remote
(chạy sau khi đã merge vào `main`):

```bash
scripts/bin/fe-worktree rm US-EXX.Y
```

**Solo** — xóa branch như cũ:

```bash
git branch -d feat/us-eXX.Y-<slug>
git push origin --delete feat/us-eXX.Y-<slug>
```

Danh sách remote branch luôn = tập US đang dở → tín hiệu claim sạch.
`scripts/bin/fe-worktree list` để soi worktree đang mở.

## Quy tắc cứng

- **1 US = 1 branch**; dev/test trên branch, không trên `main`.
- **Song song = 1 US = 1 worktree riêng** (`scripts/bin/fe-worktree add`, decision
  `0033`). KHÔNG để hai phiên chạy chung một checkout — đó là nguồn của race commit
  rơi nhầm branch + stash chồng. Solo thì main checkout là đủ.
- **Worktree đặt sibling** `../edu-staff-web-trees/<us-id>` (ngoài repo) — KHÔNG đặt
  trong repo (tránh next/biome/tsc/bun quét nhầm tree thứ hai).
- **Xác minh `git branch --show-current` trước mọi commit** (shell state reset giữa
  các call → branch dễ lệch); sau mỗi run soát `git log --oneline <branch>..HEAD`
  xem có commit rơi nhầm chỗ không.
- **Push branch ngay khi nhận US** (claim) trước khi viết code.
- **`git fetch --prune` bắt buộc** ở đầu mỗi `/fe` run trước claim/dep check.
- US bị claim bởi team khác → KHÔNG đụng vào.
- US ràng buộc US in-flight → đổi US khác + giải thích cho user (không tự ý làm).
- Auto-merge vào `main` chỉ khi US xong **và** gate xanh; sau đó xóa branch (+ worktree).
- Không bao giờ bypass Lefthook / pre-push bằng `--no-verify`.

## Liên quan

- Decision `0025` (parallel FE branch workflow) + `0033` (worktree isolation).
- `scripts/bin/fe-worktree` (`add`/`rm`/`list`/`path`) — helper vòng đời worktree.
- `.claude/CLAUDE.md` §Commits & Branches (auto-merge thay cho merge thủ công).
- `docs/templates/story.md` §Dependencies.
- `.claude/rules/tdd.md` (gate proof trước khi `implemented`).
