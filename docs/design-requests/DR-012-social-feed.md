# DR-012 — Social Feed (bảng tin trường & lớp)

- **US**: US-E19.1 (new epic E19 — Social)
- **Route(s)**: `(app)/(shared)/feed` (all 4 roles)
- **Mockup**: `design_src/edu/feed.jsx` — `FeedScreen`
- **Type**: **RECONCILE** — mockup already generated + audited (P1 in
  `docs/design-requests/PROMPTS-group-b-ui-gen.md`, P8 fix-pass confirmed
  "✅ P1 feed ... đạt spec", 2026-07-12). This DR does NOT redesign; it wires
  the existing mockup onto the Harness surface (design-spec entry + i18n keys)
  so `/ba` and `/fe` can build from it.
- **Already-implemented check**: `src/features/` has no `feed`/`social`
  feature folder, no route, no i18n namespace named `feed`/`social` in
  `messages/{vi,en}.json` → genuinely net-new authoring, not a redesign of
  live code.

## Scope

Social feed screen — school-wide + per-class post/comment/reaction feed.
- Composer (role-gated: teacher/principal post; student conditionally per
  class policy; parent view-only).
- Tab switcher: "Toàn trường" | "Lớp <tên>".
- Post card: header (avatar, role badge via `--edu-role-*`, relative time,
  pinned badge), body (line-clamp 5 + "Xem thêm"), image grid (1–4), reaction
  bar (emoji groups, toggled state `bg-primary/12` + border), comment count.
- Comment thread expand + inline add-comment.
- "…" menu: Pin/Unpin (moderator), Remove (moderator), **Report** (all roles
  except author) — Report dialog itself is shared with DR-013 (Moderation);
  do not duplicate the dialog spec here, reference it.
- Pinned posts float to top, `border-primary/30` accent.

## States (4 required — confirmed present in mockup)

- Loading: skeleton 3 post cards (now via shared `EduSkeleton` per P8 item 6,
  not the old bespoke `FeedSkeleton`).
- Empty: "Chưa có bài viết nào" + CTA to post (role-gated), via shared
  `EduEmpty`.
- Error: banner + retry, via shared `EduError`.
- End-of-feed: "Bạn đã xem hết" (cursor pagination, "Tải thêm").

## Shared dependency

Uses the **Screen State Primitives** (`EduSkeleton`/`EduEmpty`/`EduError`) from
`design_src/edu/states.jsx` — documented once in `docs/product/design-system.md`
§Component patterns (not a separate DR; it is a design-system component set,
not a screen with its own route). All DR-012→DR-019 mockups in this batch
consume it.

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.feed` (added by `uiux-designer`,
reconciled from `feed.jsx` — composer, post card, reaction bar, comment
thread, tab switcher, states dimensions/spacing/tokens).

## UX copy (i18n keys)

Namespace: `feed` (net-new — no existing key collision). Keys staged below by
`uiux-ux-writer`, vi source + en mirror, ready for `/fe` to paste into
`src/bootstrap/i18n/messages/{vi,en}.json`.

```jsonc
// vi.json → "feed"
{
  "feed": {
    "tabs": {
      "ariaLabel": "Phạm vi bảng tin",
      "school": "Toàn trường",
      "class": "Lớp {class}",
      "choosePickerAriaLabel": "Chọn lớp"
    },
    "composer": {
      "contentAriaLabel": "Nội dung bài viết",
      "placeholderSchool": "Chia sẻ với cả trường…",
      "placeholderClass": "Chia sẻ với lớp {class}…",
      "attachImage": "Đính kèm ảnh",
      "attachedMock": "1 ảnh đính kèm (mô phỏng)",
      "removeImage": "Gỡ ảnh",
      "photo": "Ảnh",
      "post": "Đăng"
    },
    "post": {
      "pinned": "Đã ghim",
      "scopeSchool": "Toàn trường",
      "scopeClass": "Lớp {class}",
      "seeMore": "Xem thêm",
      "showLess": "Thu gọn",
      "optionsAriaLabel": "Tuỳ chọn bài viết",
      "menu": {
        "pin": "Ghim bài viết",
        "unpin": "Bỏ ghim bài viết",
        "report": "Báo cáo bài viết",
        "remove": "Gỡ bài viết"
      },
      "comments": "Bình luận",
      "removed": "Đã gỡ bài viết",
      "published": "Đã đăng bài viết"
    },
    "reaction": {
      "like": "Thích",
      "love": "Yêu thích",
      "celebrate": "Chúc mừng",
      "applaud": "Tuyệt vời",
      "reactAriaLabel": "Thả cảm xúc {reaction}, {count} người",
      "addReaction": "Thả cảm xúc khác",
      "addReactionNamed": "Thả cảm xúc {reaction}"
    },
    "comments": {
      "optionsAriaLabel": "Tuỳ chọn bình luận",
      "report": "Báo cáo bình luận",
      "remove": "Gỡ bình luận",
      "writeAriaLabel": "Viết bình luận",
      "placeholder": "Viết bình luận…",
      "sendAriaLabel": "Gửi bình luận",
      "justNow": "Vừa xong"
    },
    "empty": {
      "title": "Chưa có bài viết nào",
      "description": "Bảng tin này còn trống. Bài viết mới sẽ xuất hiện tại đây.",
      "cta": "Đăng bài viết đầu tiên"
    },
    "error": {
      "title": "Không tải được bảng tin",
      "description": "Đã xảy ra lỗi khi kết nối. Vui lòng thử lại."
    },
    "pagination": {
      "loadMore": "Tải thêm bài viết",
      "loading": "Đang tải…",
      "endOfFeed": "Bạn đã xem hết bảng tin"
    },
    "report": {
      "sent": "Đã gửi báo cáo. BGH sẽ xem xét."
    }
  }
}
```

```jsonc
// en.json → "feed" (mirror)
{
  "feed": {
    "tabs": {
      "ariaLabel": "Feed scope",
      "school": "Whole school",
      "class": "Class {class}",
      "choosePickerAriaLabel": "Choose class"
    },
    "composer": {
      "contentAriaLabel": "Post content",
      "placeholderSchool": "Share with the whole school…",
      "placeholderClass": "Share with class {class}…",
      "attachImage": "Attach image",
      "attachedMock": "1 image attached (mock)",
      "removeImage": "Remove image",
      "photo": "Photo",
      "post": "Post"
    },
    "post": {
      "pinned": "Pinned",
      "scopeSchool": "Whole school",
      "scopeClass": "Class {class}",
      "seeMore": "See more",
      "showLess": "Show less",
      "optionsAriaLabel": "Post options",
      "menu": {
        "pin": "Pin post",
        "unpin": "Unpin post",
        "report": "Report post",
        "remove": "Remove post"
      },
      "comments": "Comments",
      "removed": "Post removed",
      "published": "Post published"
    },
    "reaction": {
      "like": "Like",
      "love": "Love",
      "celebrate": "Celebrate",
      "applaud": "Applaud",
      "reactAriaLabel": "React {reaction}, {count} people",
      "addReaction": "Add a reaction",
      "addReactionNamed": "React {reaction}"
    },
    "comments": {
      "optionsAriaLabel": "Comment options",
      "report": "Report comment",
      "remove": "Remove comment",
      "writeAriaLabel": "Write a comment",
      "placeholder": "Write a comment…",
      "sendAriaLabel": "Send comment",
      "justNow": "Just now"
    },
    "empty": {
      "title": "No posts yet",
      "description": "This feed is empty. New posts will appear here.",
      "cta": "Write the first post"
    },
    "error": {
      "title": "Could not load the feed",
      "description": "Something went wrong while connecting. Please try again."
    },
    "pagination": {
      "loadMore": "Load more posts",
      "loading": "Loading…",
      "endOfFeed": "You're all caught up"
    },
    "report": {
      "sent": "Report sent. School leadership will review it."
    }
  }
}
```

Notes:
- `feed.post.menu.report` / `feed.comments.report` reuse the SAME reason list +
  dialog copy as `moderation.reportDialog.*` (DR-013) — the dialog itself
  (title, radio reasons, textarea, submit/cancel) is keyed once under
  `moderation.reportDialog.*`; `feed.jsx` only needs its own menu-item labels
  and the post-submit toast (`feed.report.sent`), which duplicates
  `moderation.reportDialog.toastSent` intentionally (same string, two call
  sites — `messaging.jsx` uses the third). Do not add a second copy of the
  dialog body under `feed.*`.
- Relative-time strings (`"2 giờ trước"`, `"Hôm qua"`, …) and full timestamps
  are **mock/seed data** shaped per-post — not i18n keys (would need per-post
  dynamic values that don't fit a message catalogue); `/fe` should compute
  these from real timestamps with a date-relative formatter, not hardcode.

## A11y (WCAG 2.1 AA)

- Reaction buttons: `<button aria-pressed>` + Vietnamese `aria-label` ("Thả
  cảm xúc Thích, 12 người").
- "…" menu: Radix menu semantics (role=menu/menuitem).
- Relative time: `title` with full timestamp.
- Images: meaningful `alt`.
- Status (pinned) not color-only — icon + label.

## BE contract (mock-first note)

Service `social` (US-097→100 implemented; US-101 post-pinning `in_progress`).
`GET/POST /api/v1/feeds/school`, `/feeds/classes/{classId}`, `PUT/DELETE
/feeds/posts/{postId}/reaction`, `GET/POST .../comments`, `DELETE
.../moderate-delete`. Pin/unpin UI can ship now; wiring waits on US-101 —
`/ba` should flag this explicitly in AC.

## Dependencies

- Sibling DR-013 (Moderation) shares the Report dialog and touches the same
  `feed.jsx` file region — sequence DR-012 before DR-013 conceptually (mockup
  already merged in this order per P1→P2).
- Depends on shared states.jsx pattern (doc-only, no blocking).

## Status

- [ ] delivered
