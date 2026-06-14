# US-E08.5 Profile — Linked Accounts (VNeID + Google) + Account Requests Section

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E01.2 (Login SSO — VNeID/Google OAuth must be wired before link/unlink is meaningful; however, UI can be built mock-first before E01.2 merges)
- Does not block: other profile tabs (Personal Info, Security/Password, Sessions) — these are already done
- Feature module(s) chạm: `src/features/user/presentation/profile/` (existing ProfileScreen), `src/features/user/domain/`, `src/features/user/infrastructure/`
- Shared contract/file: `bootstrap/endpoint/auth.endpoint.ts` (link/unlink endpoints — may need new AUTH_EP entries)

## Product Contract

### Context (design delta — ADR 0034)

profile.jsx 1406 adds two sections to the existing Profile screen (which is done):

1. **"Yêu cầu tài khoản" (Account Requests)** — left sidebar card below avatar card:
   - Informational copy: deactivation/deletion must go through school admin.
   - "Liên hệ quản trị viên" button → `mailto:admin@school.edu.vn` link.
   - No write action from the user; admin-only operation.

2. **"Liên kết tài khoản" (Linked Accounts)** — under Security tab, below 2FA section:
   - Two rows: VNeID + Google.
   - Each row: provider icon (48×48, white bg + border), provider name, linked/unlinked badge, description (linked: shows email; unlinked: descriptive text).
   - "Hủy liên kết" button (ghost style) when linked → `DELETE /auth/social/:provider`.
   - "Liên kết ngay" button (primary) when unlinked → trigger OAuth flow → `POST /auth/social/link`.
   - State: VNeID linked by default (mock); Google unlinked by default (mock).

### BE readiness

Verified against `services/iam/docs/openapi.yaml` @ origin/main (2026-06-14):

| Action | Endpoint | Readiness |
| --- | --- | --- |
| Get linked accounts status | `GET /iam/api/v1/users/me` | **MOCK-FIRST** — `UserProfileResponse` does NOT contain a `linkedAccounts[]` field. Fields present: `userId`, `email`, `fullName`, `role`, `status`, `isEmailVerified`, `mfaEnabled`, `dob`, `avatarUrl`, `createdAt`, `updatedAt`. |
| Link account | `POST /iam/api/v1/auth/social` (`SocialRequest`) | **MOCK-FIRST** — this endpoint performs login-via-social, not an account-link action. No separate link endpoint exists in IAM. |
| Unlink account | `DELETE /iam/api/v1/auth/social/:provider` | **MOCK-FIRST** — endpoint not present in IAM openapi. |

Overall: **MOCK-FIRST for all linked-accounts operations** (read + write). The `linkedAccounts[]` field does not exist on the IAM contract; there is no link/unlink endpoint. FE wires against a mock repository implementing a local `LinkedAccountsRepository` interface (decision `0014`).

**VNeID provider note:** `SocialRequest.provider` enum = `[google, facebook]` only — VNeID is not a supported IAM provider. The VNeID row in the Linked Accounts section is therefore fully client-only/mock until IAM adds the provider. No client-side action can be wired to real BE for VNeID at this time.

**Wire-real trigger:** when IAM adds `linkedAccounts[]` to `UserProfileResponse` + link/unlink endpoints, update `UserProfileRepository` to call real BE and remove mock DI override. File a new BA story at that point to verify the contract.

## Relevant Product Docs

- `design_src/edu/profile.jsx` — `ProfileScreen` (lines 74–452), specifically:
  - Account Requests card: lines 179–192
  - Linked Accounts section: lines 342–408
  - `vneidLinked` / `googleLinked` state
- `design_src/edu/login.jsx` — `VneIDIcon` + `GoogleIcon` SVG (reuse, do not re-implement)
- `docs/product/screens.md` — Profile row (all roles)
- US-E01.2 — SSO VNeID/Google (linked accounts surface the same OAuth providers)

## RBAC

All roles (teacher, principal, student, parent) see their own Profile. Account Requests card is visible to all. Linked Accounts shown on Security tab for all roles.

## Acceptance Criteria

### Account Requests card (left sidebar)
- AC-1: Card appears below avatar card in left column of Profile page.
- AC-2: Label "Yêu cầu tài khoản" (uppercase, muted, tracking).
- AC-3: Informational copy (vi/en) about admin-only deactivation.
- AC-4: "Liên hệ quản trị viên" button → `mailto:admin@school.edu.vn`; accessible link role.
- AC-5: No write API call; purely informational.

### Linked Accounts section (Security tab)
- AC-6: Section header "Liên kết tài khoản" + description.
- AC-7: VNeID row: VNeID shield-star icon (red/gold, flag colors), name, linked/unlinked badge, description.
- AC-8: Google row: Google colored SVG icon, name, linked/unlinked badge; when linked, shows associated email.
- AC-9: "Linked" badge: success-light bg, success text, success border (10px/700).
- AC-10: "Not linked" badge: card bg, muted text, border.
- AC-11: "Hủy liên kết" (ghost, border) — when linked → calls unlink API (mock-first); optimistic unlinked state shown.
- AC-12: "Liên kết ngay" (primary button) — when unlinked → triggers OAuth flow (mock-first: simulate success toast); optimistic linked state shown.
- AC-13: Loading state on link/unlink button while API in-flight.
- AC-14: Error state: if link fails, revert optimistic state + show inline error.

### Common
- AC-15: VNeID icon and Google icon reused from login feature (`VneIDIcon`, `GoogleIcon` components — promote to `components/shared/` per component-organization rule if not already there).
- AC-16: WCAG 2.1 AA — VNeID SVG has `aria-label="VNeID"`, Google SVG has `aria-label="Google"`; buttons have accessible names.
- AC-17: All strings in `messages/{vi,en}.json` namespace `profileSecurity` (extend existing).
- AC-18: Tokens-only styling.

## Design Notes

### Account Requests card
`background: card`, `borderRadius: 14`, `border: border`, `padding: 16`. Label: 12px/700, uppercase, tracking. Copy: 11.5px muted, lineHeight 1.55. Button: `border: border`, `bg: bg`, `color: textSecondary`, 12px/700.

### Linked accounts row
`padding: 14px 18px`, `bg: bg`, `borderRadius: 10`, `border: border`. Provider icon box: 42×42px, `bg: #fff`, `border: border`, `borderRadius: 10`. Provider name: 13.5px/700 primary. Linked badge: `bg: successLight`, `color: success`. Unlink button: `border: border`, ghost. Link button: `bg: primary`, `color: #fff`.

### Icons reuse
`VneIDIcon` and `GoogleIcon` SVGs currently defined in `login.jsx`. When FE implements US-E01.2 and this US, promote both icons to `components/shared/sso-icons/` (or `components/ui/sso-icons/` if treated as primitives). Reference from there in both login and profile.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | LinkAccountUseCase (mock: optimistic success + error rollback); UnlinkAccountUseCase; GetLinkedAccountsUseCase |
| Integration | UserProfileRepository (mock: getLinkedAccounts → [{provider, linked, email}]; linkAccount; unlinkAccount) |
| E2E | Storybook: AccountRequestsCard / LinkedAccounts-BothLinked / LinkedAccounts-BothUnlinked / LinkedAccounts-LinkingInProgress / LinkedAccounts-LinkError |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: add US-E08.5 row (planned).
- `docs/product/screens.md`: Profile row → note "Linked Accounts + Account Requests ⬜" delta.
- `docs/product/design-spec.jsonc`: add `#profile-linked-accounts` + `#profile-account-requests` sections from profile.jsx 1406.
