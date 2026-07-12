---
name: project-e22-email-verification
description: US-E22.1 Email Verification epic — implemented, merged to main; recurring findings for future stories touching AppShell/Dialog
metadata:
  type: project
---

US-E22.1 (Email Verification: shell banner + Profile row + OTP dialog) implemented
and merged to `main` (2026-07-12, commit `829149b`). All 3 `iam` endpoints real,
no mock-first, no ADR. 8 UC / 48 AC, full pipeline (planner → component-architect +
state-engineer parallel → nextjs-engineer TDD → tech-lead + a11y parallel → fix →
design-review gate → QA → 1 more defect-fix round → merge).

**Why this record matters**: two structural findings surfaced here recur across
stories touching shell-level state or Dialog usage:

1. **`AppShell` cannot use TanStack Query directly.** `layout.tsx` wraps
   `ReactQueryProvider` around `AppShell`'s `{children}` prop only — `AppShell`'s
   own JSX (Header, banner slot, Sidebar) is a SIBLING of the QueryClient, not a
   descendant. Any future shell-level reactive data (badges, banners, counters
   mounted in `AppShell` itself, not inside `{children}`) hits this same wall —
   use a plain React Context seeded from an RSC fetch, not `useQuery`, unless
   `ReactQueryProvider` is first moved to wrap all of `AppShell`.
2. **Manual-open `Dialog` (controlled `open`/`onOpenChange`, no `DialogTrigger`)
   breaks Radix's focus-restore-on-close.** `Dialog.Content`'s `onCloseAutoFocus`
   always defers to `context.triggerRef.current`, which only `DialogTrigger`
   populates. ~8+ other `Dialog` usages in this repo share the pattern (grep
   "onOpenChange" without "DialogTrigger" in the same file) — likely the same
   latent a11y defect (AC/NFR "focus returns to invoking control on close").
   Fixed locally in `EmailVerifyDialog` via an activeElement snapshot +
   `onCloseAutoFocus` override; **flagged as a candidate shared fix baked into
   `src/components/ui/dialog/dialog.tsx`'s `DialogContent` itself** — worth a
   dedicated story before the next Dialog-heavy feature, rather than re-patching
   per-caller each time.

Also confirmed: `GET /users/me` was NOT actually wired anywhere before this story
(AppLayout only decoded JWT claims; ProfilePage used a hardcoded MOCK) — this
story added the first real fetch. If a future spec assumes "reuse already-fetched
session data," verify that premise against the actual code before accepting it.

QA caught 2 genuine production defects (not test-writing artifacts) by actually
writing keyboard-walkthrough + 320px-viewport Storybook interaction tests instead
of just reviewing existing ones — reinforces: QA writing NEW targeted tests for
under-tested dimensions (keyboard, viewport) finds real bugs review/audit passes
missed. Worth keeping as a standing QA practice, not just AC-coverage bookkeeping.
