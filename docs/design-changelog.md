# Design Changelog — EduPortal

Chronological log of design changes on the `/uiux` surface (DR/ADR/US refs +
rationale). The one new file the design docs surface is allowed to create per
`.claude/rules/uiux-workflow.md` — do not fork a parallel history file. Newest
entry on top. Classification tag (`[INTERNAL]`/`[EXTERNAL]`) marks whether the
change is dev-facing docs only or touches user-visible product surface.

---

## 2026-07-14 — Student Assignments net-new (DR-020, US-E11.7) `[EXTERNAL]`

**What changed**: new reference mockup `design_src/edu/assignments.jsx`
(`StudentAssignmentsScreen`) — assignments list with filter tabs (Tất cả/Chưa
nộp/Đã nộp/Đã chấm), assignment card (course-color icon, days-left/overdue
badge per the fixed status→color mapping, submitted/graded variants), a submit
sheet (file picker mock + textarea + overdue confirm dialog), and a graded
feedback view (score chip + teacher comment). No new design-system token —
reuses existing status badge mapping, `states.jsx` (`EduSkeleton`/`EduEmpty`/
`EduError`), and the score/GPA color mapping. Mock-first (no real `lms`
assignment endpoint yet, per decision `0014`).

- `docs/product/design-spec.jsonc`: extended the pre-existing skeletal
  `lms.assignments` key in place (was a ~13-line stub) with full card/
  submitSheet/gradedSheet anatomy, states, a11y, responsive notes.
- `messages/{vi,en}.json`: new `assignments` namespace (filters, card copy,
  empty states, submit sheet, graded feedback, confirm dialogs, a11y labels).
- `docs/product/screens.md`: Student row 109 flipped `⬜ (E11)` →
  `🎨 design-ready (US-E11.7; assignments.jsx, DR-020 2026-07-14)`; added
  `design_src/edu/assignments.jsx` to the design-file mapping list next to the
  other Epic E11 entries (lesson-bank/exam-bank/teaching-plan).
- `docs/design-requests/README.md`: added DR-020 row, `[x] delivered
  (2026-07-14)`.

**Refs**: DR-020 (`docs/design-requests/DR-020-student-assignments.md`) ·
US-E11.7 (new, registered via `harness-cli story add`) · Epic E11 (LMS).

**Rationale**: genuine net-new authoring (grepped `src/features/lms`,
`src/features/student`, `src/app/**/student` — no assignment list/detail
implementation exists, only a dashboard stat widget), so this closes a real
gap in the Student LMS surface ahead of `/ba` → `/fe` handoff.

---

## 2026-07-14 — Presence spec contrast correction (US-E10.6, DR-017) `[INTERNAL]`

**What changed**: `docs/product/design-spec.jsonc` `screens.messaging.presence`
literally specified `var(--edu-success)` for the presence dots (~1.72:1 vs card
— fails WCAG 1.4.11) and `var(--edu-text-muted)` for the DM header caption
(2.95:1 — decorative-only per ADR 0049). The US-E10.6 implementation (a11y
findings A11Y-001/002, fixed pre-merge) correctly uses `var(--edu-success-text)`
(5.24:1) and `var(--edu-text-secondary)` (5.48:1); the spec entry now matches so
future implementers don't copy the failing values. Also flipped the block's `us`
ref from "US-E10.x (planned)" to "US-E10.6 (implemented)". Doc-only — no token
or runtime change.

---

## 2026-07-12 — Group B handoff v2.2 reconcile (DR-012..019) `[INTERNAL]`

**What changed**: doc-sync pass for 8 net-new reference mockups merged in
commit `0ebcb59` (`feed.jsx`, `moderation.jsx`, `parent-links.jsx`,
`invitations.jsx`, `email-verify.jsx`, `tenant-switch.jsx`, `reports.jsx`,
plus `messaging.jsx` extended in place for presence) and the shared
`states.jsx` state-primitive set (`EduSkeleton`/`EduEmpty`/`EduError`/
`EduComingSoon`).

- `docs/product/screens.md`: added a new "Social (Epic E19)" section (Feed,
  Moderation); added Parent–Student Links + Tenant Invitations admin rows and
  the public Invite-Accept + post-login Select-Tenant rows in Auth; extended
  the existing Profile row (email-verify + parent-consent) and Messaging row
  (presence) in place — no duplicate rows; filled the pre-existing Reports
  placeholder row instead of adding a second one; added shell-level rows for
  the email-verify banner and tenant-switch header menu; updated the Ghi Chú
  bullet list + top version line for the v2.2 batch.
- `docs/product/design-system.md` §Component patterns: documented the shared
  `states.jsx` primitive set as the canonical loading/empty/error/coming-soon
  pattern (supersedes the retired bespoke `FeedSkeleton`/`ModSkeleton`-style
  per-screen implementations); confirmed `design_src/edu/tokens.js`
  `warningText`/`errorText` mirror `--edu-warning-text` (decision `0046`) and
  `--edu-error-text` (decision `0027`) — no new tokens in this batch.
- `docs/design-requests/README.md`: added DR-012 through DR-019 rows to the
  Active Requests table. All 8 flipped to `[x] delivered (2026-07-12)` by
  `uiux-lead` after validating the design-spec + i18n reconcile and adding a
  per-DR design-review section (verdict: Pass, carried over from the P1–P8
  audit — no new visual work introduced by this batch).

**Refs**: DR-012 (Social Feed, US-E19.1) · DR-013 (Content Moderation,
US-E19.2) · DR-014 (Parent–Student Links, US-E20.1/E20.2) · DR-015 (Tenant
Invitations, US-E21.1/E21.2) · DR-016 (Email Verification, US-E22.1) ·
DR-017 (Messaging Presence, US-E10.5) · DR-018 (Multi-Tenant Switch,
US-E23.1/E23.2) · DR-019 (Principal Reports, US-E03.1). No new ADR — this
batch introduces no new tokens/palette/layout decisions, only new screens on
the existing design system + the `docs/design-requests/PROMPTS-group-b-ui-gen.md`
P1–P8 audit.

**Rationale**: keep BA/FE downstream reading current truth — the 8 mockups
already passed the P1-P8 design audit and had DR packets + design-spec
entries + i18n key blocks staged by prior agents in this session; this pass
closes the loop so `screens.md`/`design-system.md`/DR README reflect what
actually exists in `design_src/edu/` before handoff to `/ba` → `/fe`.
