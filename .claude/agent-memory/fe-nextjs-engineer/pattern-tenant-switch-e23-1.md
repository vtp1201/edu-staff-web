---
name: pattern-tenant-switch-e23-1
description: E23.1 tenant-switch — 'use server' can't export type; Path A server-action result + framework-free redirect-safe controller; vitest:storybook works now; AppShell intl mock
metadata:
  type: project
---

US-E23.1 header tenant-switch menu + dialog. Reusable facts:

- **`'use server'` files CANNOT re-export a type** (`export type {X}` → `bun run build` fails
  "Export X doesn't exist in target module", every page that imports the action module breaks —
  Next treats all exports of a `'use server'` module as server actions). Put a shared result type
  (e.g. `SwitchTenantResult`) in a pure `.i-vm.ts` (no directive); the action imports it for its
  return annotation (type import is erased, fine) but must NOT re-export it. Client components +
  the action both import from the i-vm.

- **Path A server-action contract** (fe-lead-approved shape for actions the client must branch on):
  action returns `{ ok:true } | { ok:false; errorKey }` instead of throwing a raw `ApiError`
  (Next redacts custom error props across the RSC→client boundary in prod). Repo throws a typed
  failure (`toFailure()` mirroring `AnnouncementRepository`), action catches + maps to errorKey.
  **redirect() fires INSIDE the try on success → its NEXT_REDIRECT throw is caught by the same
  catch, so the catch MUST `if (isRedirectError(err)) throw err;` FIRST** (deep import
  `next/dist/client/components/redirect-error` — no public re-export in Next 16). This is Risk A.

- **Framework-free activation controller** = the clean way to unit-test the redirect-vs-error
  classification without mounting Radix: `runSwitchActivation(id, role, {onSwitchTenant, onLoading,
  onForbidden, onGenericError})` — rethrows redirect, classifies result, resets loading. The
  redirect-passthrough test (inject a fn throwing a `{digest:"NEXT_REDIRECT;replace;/x;307;"}`
  Error, assert `.rejects.toBe(err)` + no error callbacks) is the single most important proof.

- **`bun run vitest:storybook run <path>` WORKS** (v4.1.8, Storybook 10.3 + addon-vitest). Contradicts
  the older "storybook vitest runner broken env-wide" memory — the ERR_REQUIRE_ESM issue is gone.
  Portal content asserted via `within(document.body).findByRole("dialog")`. Add a decorator that
  resets `document.body.style.pointerEvents = ""` so a busy-left-open dialog story doesn't bleed.

- **Adding `useTranslations`/`useSearchParams` to AppShell breaks the existing SSR node-env
  `app-shell.test.tsx`** (renderToStaticMarkup, no NextIntlClientProvider). Fix: `vi.mock("next-intl",
  () => ({ useTranslations: () => (k)=>k }))` + `vi.mock("next/navigation", () => ({ useSearchParams:
  () => new URLSearchParams("") }))` in that test. Effects don't run under SSR so the toast effect is
  inert there — one-shot `?switched=1` toast logic must be a pure helper (`parseSwitchedParam`) to be
  node-testable; the useEffect stays a thin binding + `useRef` guard against strict-mode double-fire.

- **TenantCard/TenantLogo live in `components/shared/tenant-card/`** (E23.2 reuses the same shape —
  `enrichMemberships()` server-only helper is the shared RSC widener; `logoColor` is a closed
  `TenantAccentTone` 6-enum consumed via `bg-edu-*/15` tint, NEVER a raw hex, deterministic hash of
  tenantId). `DialogContent` already wires `useDialogReturnFocus` → controlled dialog (no Trigger)
  returns focus to the invoker correctly; Risk B was a non-issue.
