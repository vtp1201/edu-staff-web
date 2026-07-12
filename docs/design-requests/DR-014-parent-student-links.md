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

<!-- UX-WRITER: insert parentLinks.* key block here -->

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
