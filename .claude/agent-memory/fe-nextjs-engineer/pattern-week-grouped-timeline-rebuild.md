---
name: pattern-week-grouped-timeline-rebuild
description: US-E24.3 — rebuilding a screen behind an existing route; ISO-week grouping in domain, formatter injected instead of Intl, feature-shared component tier, and vi CLDR renders dd-MM (not dd/MM)
metadata:
  type: project
---

Rebuilding a screen behind an unchanged route (US-E24.3 replaced `lesson-player/`
with `course-timeline/`) — what generalizes:

**Why:** the packet's "rename the folder" framing hid a full rebuild; the shape,
the VM and every child differed, so the old tree was deleted (`git rm`) and only
two pure fns survived (`toParagraphs`, `TextContent`).

**How to apply:**
- **Domain returns a discriminated RESULT, not copy.** `formatItemWindow(item,
  format)` takes an INJECTED `(d: Date) => string` and returns
  `{kind:"range"|"from"|"due"|"always", …Text}`; presentation composes it with
  `t(\`timeline.window.${kind}\`, …)`. Keeps the branch rule in one place while
  the domain imports neither `Intl` nor next-intl, and the test needs no
  next-intl (pass `d => \`«${iso}»\``).
- **Format dates in the CLIENT component (`useFormatter`), not the RSC.** No
  `timeZone` is configured in `bootstrap/i18n/request.ts`, so server-side
  formatting risks a hydration mismatch. Week boundaries are the exception: the
  domain computes them in UTC as date-only strings, so they MUST be formatted
  with `timeZone: "UTC"` or the label slips a day.
- **`vi` CLDR renders `{day:"2-digit",month:"2-digit"}` as `08-05`, and puts the
  TIME FIRST** (`09:00 08-05`). Never assert `dd/MM` literally in a story — pin
  the order/values with a tolerant regex (`/^Tuần 20.04 – 26.04$/`).
- **ISO week inline in domain**: no `date-fns`/`dayjs` in `package.json`, no
  `shared/date*` util. ~20 lines (Monday index, Thursday decides the ISO year)
  beat a dependency. Regression case worth keeping: 29/12 + 02/01 = one week.
- **Feature-shared tier**: `features/lms/presentation/shared/` for components
  that are domain-specific (keyed by `CourseItemType`/`CourseItemState`) yet
  reused by ≥2 screens INSIDE one feature — `components/shared/` is for
  app-generic patterns. Not in `component-organization.md`'s table yet.
- A pill that needs a dot **composes** `StatusBadge` through `children`
  (`<StatusBadge tone><Dot/>{label}</StatusBadge>`) — no prop added to, and no
  fork of, `components/shared/status-badge`.

Related: [[gotcha-async-transition-stuck-pending]] (retry button uses a plain
boolean + try/finally), [[pattern-node-env-component-test]] (the mode-guard test
is `renderToStaticMarkup` + `expect(...).toThrow()`),
[[gotcha-tone-and-duplicate-i18n-copy]].

## Fix round (review + a11y) — three recurring traps

- **A key-namespace migration (`player.*` → `timeline.*`) leaves dead keys the
  compiler cannot see.** Typed messages only prove a key EXISTS, never that it
  is READ. After a rename sweep, grep each surviving old-namespace key for a
  consumer; also watch for a key whose STRING is now duplicated by the new
  namespace (`timeline.closedReadOnly` vs `timeline.itemDetail.closedNote`) —
  delete the unused twin, not the used one.
- **`aria-expanded` without `aria-controls` is half a contract.** Give the panel
  `id={`<prefix>-${entity.id}`}` and assert the pairing by resolving it:
  `getElementById(button.getAttribute("aria-controls"))` in the play function —
  a role query cannot catch a dangling id.
- **Don't merge two dot-colour maps just because they mostly agree.** A dot ON a
  rail (`bg-border`, follows the line) and a dot INSIDE a muted badge
  (`bg-edu-text-secondary`, would vanish at `bg-border`) solve different
  legibility problems; keep both maps and comment WHY they diverge.
- Hover affordance for an expand row: `transition-colors hover:bg-muted/60` —
  self-cancelling once expanded (the card is already `bg-muted`, and muted over
  muted blends to itself), so hover only ever means "this collapsed row opens".
