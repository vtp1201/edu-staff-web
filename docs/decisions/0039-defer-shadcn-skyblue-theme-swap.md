# 0039 Defer shadcnthemer Sky-Blue Theme Swap — Keep Current Palette

Date: 2026-06-17

## Status

Accepted (defer / parked)

## Context

The current EduPortal palette (derived from the legacy design handoff, decision 0011)
was reported as visually busy ("rối mắt") — ~13 high-chroma accent hues at the same
level (primary, success, warning, error, info, purple, teal, 4 role colors, 2 gender
colors) — and Plus Jakarta Sans was felt to be unclear for an education context.

A full-replace with a shadcnthemer "sky-blue" theme (X/Twitter-style palette,
`--primary` #1E9DF1) plus a font swap to **Be Vietnam Pro** was prototyped on a
**preview branch** to evaluate the direction.

## Decision

**Keep `main`'s current palette and font.** The sky-blue theme is **deferred** — UI/UX
optimization will be revisited later. The prototype is **preserved, not merged**, on
branch `feat/theme-shadcn-skyblue` (commit `8c54e91`) for future reference.

`main` is unchanged; no ADR-mandated palette change is in effect. The token source of
truth `src/app/tokens.css` and `globals.css` stay as-is (decisions 0011/0007/0023 intact).

## What the prototype contains (for whoever resumes)

On branch `feat/theme-shadcn-skyblue`:
- `tokens.css` rewritten to the sky-blue palette; every `*-text` variant re-derived
  to WCAG 2.1 AA (≥4.5:1 on white) since the theme ships only `primary` + `destructive`.
- `globals.css`: semantic mapping + dark variant from the theme.
- `layout.tsx`: Plus Jakarta Sans → Be Vietnam Pro.
- Two AA/quality findings worth keeping if resumed:
  1. Theme `--primary` #1E9DF1 fails AA on white (2.94:1) — must use a darker
     accessible variant (#0078C4, 4.68:1) for text/links, same pattern as ADR 0023.
  2. Theme's `--muted-foreground` equals `--foreground` (a theme bug) — must override
     to a true mid-gray (#72767A) or muted text loses hierarchy.
- `bun run build` passed on the branch.

## Alternatives Considered

1. **Full replace now (merge to main)** — rejected: reviewer preferred main's colors;
   blast radius is 79 files using `edu-*` tokens needing a11y regression; premature.
2. **Calm the existing palette only** (fewer accents, font swap, no palette change) —
   still on the table as a lighter future option, lower risk than a full theme swap.
3. **Delete the prototype** — rejected: keep the branch so the AA-derived palette and
   findings aren't lost when the team revisits UI/UX polish.

## Consequences

Positive:
- No risk to `main`; current accessible palette + decisions preserved.
- Future UI/UX work has a vetted, AA-corrected starting point on the branch.

Tradeoffs / Follow-Up:
- `feat/theme-shadcn-skyblue` is a long-lived parked branch — will drift from `main`;
  rebase or re-derive when resumed.
- **Mock-login gap surfaced**: `bootstrap/di/auth.di.ts` does NOT branch on `USE_MOCK`
  (unlike `tenant.di.ts`), so login can't be exercised offline — dashboards are only
  reachable by minting a fake tenant cookie or running BE IAM. A future story should
  add a `MockAuthRepository` for full offline self-test (decision 0014 mock-first).
- Local dev still needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; with it empty the
  `GoogleOAuthProvider` throws "Missing required parameter client_id." (contradicts the
  graceful-disable claim in decision 0035 §Tradeoffs) — worth a real guard later.
