---
name: pattern-url-tab-shell-rsc
description: US-E24.8 class-hub — role-gated `?tab=` shell where the URL is the state; RSC resolves + renders ONE panel, tabs are Links, and the digest strings for testing notFound()/permanentRedirect in node env
metadata:
  type: project
---

Detail screen with tabs where **the URL is the state** (`/…/[id]?tab=x`), no
client tab state, no client fetch:

- **Domain owns tab validity**: `visibleTabs(roles)` (single source: resolver AND
  tablist read it) + a pure `resolveClassHubTab(roles, requested)` that collapses
  unknown / empty / `string[]` / role-forbidden values to a **role default**. A bad
  deep-link must degrade to a working screen, never a 404 or an empty shell.
- **RSC page** resolves the tab, builds header/tabs VMs, fetches ONLY the active
  tab's data, and passes the body as `children` into a `'use client'` shell
  (Server-Component-as-children). One `role="tabpanel"` in the DOM ever — nothing
  to show/hide, no `hidden` juggling.
- **Tabs are `<Link role="tab" aria-selected>`**, not buttons: Tab/Enter come free
  (arrow-key roving tabindex is then genuinely optional). `aria-controls` points at
  the single rendered panel id.
- **Existence oracle**: a by-id read scoped to "my list" (`listMyClasses().find`)
  makes "not mine" indistinguishable from "doesn't exist"; the page turns EVERY
  failure (incl. `network-error`) into `notFound()`.
- **Legacy sub-route → alias**: `permanentRedirect` (308, permanent move), not
  `redirect` (307). Also repoint the primary entry (the card CTA) at the new URL so
  the main path doesn't pay a redirect hop.

**Digest strings for node-env route tests (no jsdom, call the page fn directly):**
- `notFound()` throws digest starting `NEXT_HTTP_ERROR_FALLBACK;404`
- `permanentRedirect()` throws `NEXT_REDIRECT;<kind>;<url>;308;` → `split(";")`,
  `[2]` = url, `[3]` = status (assert 308 vs 307 explicitly — that IS the AC).

**Deep-link plumbing**: put the href builder in `src/shared/<x>-href.ts` (pure,
importable by two features + the grid cell) so `?tab=` has ONE spelling. Client
components know neither locale nor tenant ⇒ build ABSOLUTE hrefs in the RSC page
and pass them as VM strings / an opt-in `hrefBase` prop. An entity whose id field
is still absent on the real wire ⇒ **render unlinked** (optional `classHref`,
no href) — a dead link is worse than plain text; assert that "no id ⇒ no `<a>`"
in both a unit test and a story.

Related: [[pattern-rsc-props-local-state-screen]], [[pattern-client-searchparams-nav]],
[[gotcha-storybook-vitest-runner-broken]].
