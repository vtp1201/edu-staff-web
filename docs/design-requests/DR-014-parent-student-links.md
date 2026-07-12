# DR-014 — Parent–Student Links & Consent Management

- **US**: US-E20.1 (admin link management) + US-E20.2 (parent consent
  section) — new epic E20.
- **Route(s)**: `(app)/admin/parent-links` (admin); parent consent section
  attaches to the parent Profile/Settings screen (`(app)/(shared)/profile`,
  US-E08.5, when `/fe` builds it).
- **Mockup**: `design_src/edu/parent-links.jsx` — `ParentLinksScreen`
  (admin), `ParentConsentSection` (embeddable card block), `ParentConsentScreen`
  (standalone wrapper for review).
- **Type**: **RECONCILE** — mockup generated + audited (P3 in
  `PROMPTS-group-b-ui-gen.md`, P8 confirms "P3 parent-links ... đạt spec").
- **Already-implemented check**: no `parent-links` feature/route in `src/`;
  no matching i18n namespace → net-new. `ParentConsentSection` is designed to
  be embedded into the existing Profile screen when `/fe` implements it — flag
  this integration point to `/ba`/`/fe`, do not duplicate Profile's i18n
  namespace (`profile`); keep consent copy under its own `parentLinks.consent.*`
  keys and let `/fe` compose it into the Profile page.

## Scope

**Part 1 — Admin "Liên kết Phụ huynh – Học sinh"**: page title + "Tạo liên
kết" dialog (2 combobox search: student → parent, relationship select, note,
duplicate-link inline validation), search + class filter, table (student,
parent, relationship badge, consent-status badge with icon — "Đã đồng ý nhận
TB" / "Chưa phản hồi" / "Đã từ chối", link date, "…" menu incl. destructive
Unlink with confirm), empty state per class with no links.

**Part 2 — Parent "Quyền nhận thông báo về con"**: per-child card with 3
consent toggles (violation/conduct, absence, grades notifications), 1-line
muted description per toggle, toast confirmation on change, privacy footnote.

## States (4 required — confirmed present, both parts)

Loading skeleton, empty, error+retry (shared `EduSkeleton`/`EduEmpty`/
`EduError`), success.

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.parentLinks` (admin table +
dialog) and `screens.parentLinks.consentSection` (parent card block) —
added by `uiux-designer`.

## UX copy (i18n keys)

Namespace: `parentLinks` (net-new). Consent sub-namespace `parentLinks.consent.*`
kept separate so `/fe` can compose it into `profile` page without merging
namespaces.

```jsonc
// vi.json → "parentLinks"
{
  "parentLinks": {
    "title": "Liên kết Phụ huynh – Học sinh",
    "subtitle": "Quản lý liên kết tài khoản và trạng thái đồng ý nhận thông báo của phụ huynh.",
    "createLink": "Tạo liên kết",
    "search": {
      "ariaLabel": "Tìm học sinh hoặc phụ huynh",
      "placeholder": "Tìm học sinh hoặc phụ huynh…"
    },
    "classFilter": {
      "ariaLabel": "Lọc theo lớp",
      "all": "Tất cả các lớp",
      "class": "Lớp {class}"
    },
    "table": {
      "student": "Học sinh",
      "parent": "Phụ huynh",
      "relation": "Quan hệ",
      "consentStatus": "Trạng thái consent",
      "linkedOn": "Ngày liên kết",
      "actions": "Hành động",
      "linked": "Liên kết"
    },
    "relation": {
      "father": "Bố",
      "mother": "Mẹ",
      "guardian": "Người giám hộ"
    },
    "consent": {
      "agreed": "Đã đồng ý nhận TB",
      "pending": "Chưa phản hồi",
      "declined": "Đã từ chối"
    },
    "rowMenu": {
      "ariaLabel": "Hành động",
      "viewDetails": "Xem chi tiết",
      "unlink": "Gỡ liên kết"
    },
    "createDialog": {
      "title": "Tạo liên kết Phụ huynh – Học sinh",
      "description": "Phụ huynh được liên kết sẽ có thể xem dữ liệu học tập của học sinh.",
      "close": "Đóng",
      "studentLabel": "Học sinh",
      "studentPlaceholder": "Tìm theo tên học sinh…",
      "parentLabel": "Phụ huynh (tài khoản role parent)",
      "parentPlaceholder": "Tìm theo tên phụ huynh…",
      "duplicateError": "Liên kết đã tồn tại",
      "relationLabel": "Quan hệ",
      "noteLabel": "Ghi chú (không bắt buộc)",
      "notePlaceholder": "VD: người giám hộ hợp pháp, giấy tờ kèm theo…",
      "cancel": "Hủy",
      "submit": "Tạo liên kết",
      "clearSelection": "Bỏ chọn",
      "noResults": "Không tìm thấy kết quả.",
      "toastCreated": "Đã tạo liên kết {parent} → {student}. Đã gửi yêu cầu xác nhận consent."
    },
    "unlinkDialog": {
      "title": "Gỡ liên kết phụ huynh – học sinh?",
      "body": "Phụ huynh {parent} sẽ mất quyền xem điểm số, hạnh kiểm, chuyên cần và mọi thông báo về học sinh {student} ({class}). Tài khoản của hai bên không bị xoá.",
      "cancel": "Hủy",
      "confirm": "Gỡ liên kết",
      "toastRemoved": "Đã gỡ liên kết. {parent} không còn quyền xem dữ liệu học sinh."
    },
    "detailDialog": {
      "title": "Chi tiết liên kết",
      "close": "Đóng",
      "student": "Học sinh",
      "parent": "Phụ huynh",
      "relation": "Quan hệ",
      "consent": "Consent",
      "linkedOn": "Ngày liên kết",
      "note": "Ghi chú"
    },
    "empty": {
      "noMatch": "Không có liên kết nào khớp bộ lọc",
      "noMatchDescription": "Thử từ khóa khác hoặc xoá bộ lọc lớp.",
      "noLinksInClass": "Lớp này chưa có liên kết nào",
      "noLinksDescription": "Tạo liên kết để phụ huynh có thể theo dõi điểm số, chuyên cần và hạnh kiểm của con.",
      "clearFilters": "Xoá bộ lọc"
    },
    "error": {
      "title": "Không tải được dữ liệu",
      "description": "Đã xảy ra lỗi khi tải danh sách. Vui lòng thử lại.",
      "retry": "Thử lại"
    },
    "count": {
      "links": "{count} liên kết",
      "filtered": " (đã lọc)"
    },
    "consentSection": {
      "title": "Quyền nhận thông báo về con",
      "description": "Chọn loại thông tin bạn muốn nhà trường gửi cho từng con.",
      "linked": "Đã liên kết",
      "toggle": {
        "discipline": "Thông báo vi phạm / hạnh kiểm",
        "disciplineDescription": "Gửi khi con có ghi nhận vi phạm mới hoặc thay đổi xếp loại hạnh kiểm.",
        "absence": "Thông báo vắng học",
        "absenceDescription": "Gửi khi con vắng mặt ở tiết học có điểm danh, kèm lý do nếu có.",
        "grades": "Thông báo điểm số",
        "gradesDescription": "Gửi khi có điểm kiểm tra, điểm thi mới của con được công bố.",
        "on": "Bật",
        "off": "Tắt"
      },
      "toastUpdated": "Đã cập nhật quyền nhận thông báo",
      "privacyNote": "Nhà trường chỉ gửi thông báo khi bạn đồng ý, và chỉ về những học sinh đã được liên kết với tài khoản của bạn. Bạn có thể thay đổi lựa chọn bất cứ lúc nào — việc tắt thông báo không ảnh hưởng đến quyền xem dữ liệu của con trong ứng dụng.",
      "empty": {
        "title": "Chưa có con nào được liên kết",
        "description": "Liên hệ nhà trường để liên kết tài khoản của bạn với hồ sơ học sinh."
      },
      "error": {
        "title": "Không tải được dữ liệu",
        "description": "Đã xảy ra lỗi khi tải danh sách. Vui lòng thử lại."
      }
    }
  }
}
```

```jsonc
// en.json → "parentLinks" (mirror)
{
  "parentLinks": {
    "title": "Parent–Student Links",
    "subtitle": "Manage account links and parents’ notification-consent status.",
    "createLink": "Create link",
    "search": {
      "ariaLabel": "Search student or parent",
      "placeholder": "Search student or parent…"
    },
    "classFilter": {
      "ariaLabel": "Filter by class",
      "all": "All classes",
      "class": "Class {class}"
    },
    "table": {
      "student": "Student",
      "parent": "Parent",
      "relation": "Relation",
      "consentStatus": "Consent status",
      "linkedOn": "Linked on",
      "actions": "Actions",
      "linked": "Linked"
    },
    "relation": {
      "father": "Father",
      "mother": "Mother",
      "guardian": "Guardian"
    },
    "consent": {
      "agreed": "Consented",
      "pending": "No response",
      "declined": "Declined"
    },
    "rowMenu": {
      "ariaLabel": "Actions",
      "viewDetails": "View details",
      "unlink": "Remove link"
    },
    "createDialog": {
      "title": "Create parent–student link",
      "description": "Linked parents can view the student’s academic data.",
      "close": "Close",
      "studentLabel": "Student",
      "studentPlaceholder": "Search students…",
      "parentLabel": "Parent (member with parent role)",
      "parentPlaceholder": "Search parents…",
      "duplicateError": "This link already exists",
      "relationLabel": "Relationship",
      "noteLabel": "Note (optional)",
      "notePlaceholder": "e.g. legal guardian, supporting documents…",
      "cancel": "Cancel",
      "submit": "Create link",
      "clearSelection": "Clear selection",
      "noResults": "No results found.",
      "toastCreated": "Linked {parent} → {student}. Consent request sent."
    },
    "unlinkDialog": {
      "title": "Remove this parent–student link?",
      "body": "Parent {parent} will lose access to grades, conduct, attendance and all notifications about {student} ({class}). Neither account is deleted.",
      "cancel": "Cancel",
      "confirm": "Remove link",
      "toastRemoved": "Link removed. {parent} no longer has access."
    },
    "detailDialog": {
      "title": "Link details",
      "close": "Close",
      "student": "Student",
      "parent": "Parent",
      "relation": "Relationship",
      "consent": "Consent",
      "linkedOn": "Linked on",
      "note": "Note"
    },
    "empty": {
      "noMatch": "No links match your filters",
      "noMatchDescription": "Try a different keyword or clear the class filter.",
      "noLinksInClass": "No links in this class yet",
      "noLinksDescription": "Create a link so parents can follow their child’s grades, attendance and conduct.",
      "clearFilters": "Clear filters"
    },
    "error": {
      "title": "Failed to load data",
      "description": "Something went wrong while loading. Please try again.",
      "retry": "Retry"
    },
    "count": {
      "links": "{count} link(s)",
      "filtered": " (filtered)"
    },
    "consentSection": {
      "title": "Notification consent for your children",
      "description": "Choose what the school may send you about each child.",
      "linked": "Linked",
      "toggle": {
        "discipline": "Discipline & conduct alerts",
        "disciplineDescription": "Sent when a new incident is recorded or the conduct rating changes.",
        "absence": "Absence alerts",
        "absenceDescription": "Sent when your child is absent from a roll-call lesson, with the reason if recorded.",
        "grades": "Grade alerts",
        "gradesDescription": "Sent when new test or exam grades for your child are published.",
        "on": "On",
        "off": "Off"
      },
      "toastUpdated": "Notification consent updated",
      "privacyNote": "The school only sends notifications with your consent, and only about students linked to your account. You can change these choices at any time — turning notifications off does not affect your in-app access to your child’s data.",
      "empty": {
        "title": "No linked children yet",
        "description": "Contact the school to link your account with a student record."
      },
      "error": {
        "title": "Failed to load data",
        "description": "Something went wrong while loading. Please try again."
      }
    }
  }
}
```

Notes:
- `parentLinks.consentSection.*` is written as its own sub-tree (not merged
  into `profile`) per the DR's own instruction — `/fe` composes
  `ParentConsentSection` into the Profile page while keeping this namespace.
- `{count} link(s)` in the en count string is placeholder-style plural
  handling; `/fe` should use next-intl ICU plural (`{count, plural, one {# link} other {# links}}`)
  rather than the literal `(s)` when wiring — flagged here since the mockup's
  inline JS ternary (`link${n>1?'s':''}`) doesn't map 1:1 to a static message key.

## A11y (WCAG 2.1 AA)

- Toggles are real `<Switch>` with linked label + readable state.
- Consent badges: icon + text, not color-only.
- Unlink (destructive): confirm dialog states consequence (parent loses
  visibility into the child's data).

## BE contract

Service `core` (US-047, US-094/095). `GET/POST
/api/v1/parent-student-links`, `DELETE
/api/v1/parent-student-links/{linkId}`, `GET/PUT
/api/v1/parent-student-links/consents`, `GET
/api/v1/members/{memberId}/linked-students`/`linked-parents`.

## Dependencies

None blocking — independent of DR-012/013/017. Shares only the doc-level
states.jsx pattern.

## Status

- [ ] delivered
