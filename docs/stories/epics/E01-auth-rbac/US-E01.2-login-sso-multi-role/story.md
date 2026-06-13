# US-E01.2 Login SSO (VNeID + Google) + Multi-Role / Multi-Tenant Select

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E01.1 (Login email + token flow — done; this story EXTENDS, not replaces)
- Blocks: nothing critical (E01.1 is production-viable; this adds SSO layer)
- Feature module(s) chạm: `src/features/auth/presentation/login-form/`, `src/features/auth/domain/`, `src/features/auth/infrastructure/`
- Shared contract/file: `bootstrap/endpoint/auth.endpoint.ts` (`AUTH_EP.social` already defined per api-integration.md)

## Product Contract

### Context (design delta — ADR 0034)

Login screen in 1406 handoff (`design_src/edu/login.jsx`) adds:

1. **SSO buttons** — "Tiếp tục với Google" + "Đăng nhập VNeID" above email form.
2. **Multi-role / multi-tenant select step** — after authenticate (email or SSO), if user has ≥2 role-tenant combos, show role selector before routing. If single role → route directly.
3. **ROLE_META expansion** — all 6 roles: `admin` (enum=ADMIN, appRole=principal), `manager` (enum=MANAGER, appRole=principal), `staff` (enum=STAFF, appRole=teacher), `teacher`, `student`, `parent`. Each carries icon + color + enum badge.
4. **Tenant code display** — each role card shows school name + `tenantCode` badge.

### Screens

**`/login` (extended):**
- SSO section (2 buttons: Google + VNeID) above the email/password divider.
- On SSO click: call `POST /auth/social` with provider token → same auth flow → if single role navigate, else show role-select step.
- On email auth: unchanged from E01.1 except now triggers role-select when user has multiple roles.

**`/select-role` (new route):**
- Header: user avatar initials + full name + count "N vai trò khả dụng".
- Role cards list: each card = role icon + role label (vi/en) + enum badge + school name + tenantCode badge + chevron.
- On card click: resolve `appRole` from `ROLE_META[role.enum]` mapping, navigate to `DEFAULT_ROUTE[appRole]`.
- Back link: "Đăng nhập tài khoản khác" → back to login form.

### ROLE_META mapping (normative, from login.jsx 1406)

| Enum (BE) | appRole (route) | Label vi | Color |
| --- | --- | --- | --- |
| TEACHER | teacher | Giáo viên | #5D87FF (primary) |
| ADMIN | principal | Ban giám hiệu (BGH) | #13DEB9 (success) |
| MANAGER | principal | Phó Hiệu trưởng / BGH | #13DEB9 (success) |
| STAFF | teacher | Nhân viên | #7B5EA7 (purple) |
| STUDENT | student | Học sinh | #FFAE1F (warning) |
| PARENT | parent | Phụ huynh | #7B5EA7 (purple) |

## Relevant Product Docs

- `design_src/edu/login.jsx` — `LoginScreen` (full 328-line 1406 version) + `GoogleIcon` + `VneIDIcon` + `ROLE_META` + `ACCOUNTS` mock + `handleSSOLogin` + `handleSelectRole`
- `docs/product/screens.md` — Login row (SSO ⬜), Select role row (⬜)
- `.claude/rules/api-integration.md` — `AUTH_EP.social` endpoint + IAM token flow
- BE readiness:
  - `POST /iam/api/v1/auth/social` — **LIVE** (AUTH_EP.social exists); provider+token body
  - `GET /iam/api/v1/users/me` — **LIVE** (returns roles array per tenant)
  - Role-select is client-side routing after auth — no separate BE endpoint needed

## BE Contract Notes

- `POST /auth/social` sends `{ provider: "google"|"vneid", token: "<provider_token>" }` → returns `TokenResponse` same as signin.
- After token exchange, `GET /users/me` returns `roles[]` where each entry has `role` (TEACHER/ADMIN/…) + `tenantCode` + `tenantName`.
- Client maps `role` enum → `appRole` via `ROLE_META` table above.
- Single role → navigate immediately. Multiple roles → show `/select-role` screen.

## Acceptance Criteria

### Google SSO
- AC-1: "Tiếp tục với Google" button visible on login form above email divider.
- AC-2: Click → Google OAuth popup/redirect → on success, POST /auth/social with provider="google" + id_token → store tokens (httpOnly cookie).
- AC-3: If single role → navigate to DEFAULT_ROUTE; if multiple → navigate to /select-role.
- AC-4: Error (SSO cancelled, network fail) → inline error message, form stays accessible.

### VNeID SSO
- AC-5: "Đăng nhập VNeID" button visible with VNeID shield-star icon (Vietnamese flag colors: red #DA251D + gold #FFCD00).
- AC-6: Click → VNeID OAuth flow → POST /auth/social with provider="vneid" → same token + role-select flow as Google.
- AC-7: Error handling identical to Google.

### Multi-role / multi-tenant select
- AC-8: `/select-role` renders list of role-tenant cards when user has ≥2 roles.
- AC-9: Each card shows: role icon (colored per ROLE_META), role label (vi/en), enum badge (UPPERCASE), school name, tenantCode badge, chevron.
- AC-10: Clicking a card resolves `appRole` from ROLE_META mapping and navigates to correct DEFAULT_ROUTE.
- AC-11: "Đăng nhập tài khoản khác" link returns to /login and clears session state.
- AC-12: Email login with single-role account → navigates directly without showing /select-role.
- AC-13: Email login with multi-role account → /select-role shown (same as SSO flow).

### Shared / non-functional
- AC-14: WCAG 2.1 AA — SSO buttons ≥44×44px touch target; VNeID icon has `aria-label`; role cards keyboard-navigable.
- AC-15: Loading state on all async operations (SSO + role select).
- AC-16: All UI strings in `messages/{vi,en}.json` — no hardcoded Vietnamese copy in TSX.
- AC-17: Design matches `login.jsx` 1406: split-panel layout, brand colors, token-only styling.

## Design Notes

### SSO Button layout
Two full-width buttons stacked, `border: 1.5px solid border`, `background: card`, hover: `borderColor = primary`. Google icon (SVG inline); VNeID icon (shield + star SVG, flag colors).

### Role card layout (select-role screen)
`maxWidth: 480px`, centered. Role icon box `48×48px`, `borderRadius: 12`, `background: meta.color + '18'`. Title 15px/800 + enum badge (10px/700, bg=bg, border). School name 12px + tenantCode badge (10px/700). Hover: `borderColor = meta.color`, `boxShadow: ${meta.color}22`, `translateY(-1px)`.

### design-spec.jsonc
BA team to regenerate `design-spec.jsonc#login` and `design-spec.jsonc#select-role` entries from `login.jsx` 1406 before FE implements. (ADR 0034 §3.)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | SocialAuthUseCase (google/vneid → token → single-role navigate; multi-role → role-select); RoleSelectUseCase (enum→appRole mapping, 6 roles) |
| Integration | AuthRepository.socialSignin (POST /auth/social, token storage, UNAUTHORIZED/NETWORK mapping) |
| E2E | Storybook: LoginWithSSO / RoleSelectScreen (2 roles / 3 roles / single-role skip) / SSOError / Loading |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: add US-E01.2 row (planned).
- `docs/product/screens.md`: Login row SSO → `🎨 design-ready`; Select-role row → `🎨 design-ready`.
- `docs/product/design-spec.jsonc`: regenerate `#login` + `#select-role` entries from login.jsx 1406 before FE starts.
