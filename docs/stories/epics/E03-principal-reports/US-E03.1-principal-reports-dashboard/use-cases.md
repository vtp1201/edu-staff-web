
# Use Cases — US-E03.1 Principal Reports Dashboard

Source: `requirements.md` (TR-031, FR-001..FR-011, NFR-001..NFR-007), `integration.md`
(INT-001..INT-005, all MOCK-FIRST). No code, no UI layout decisions in this doc.

## 1. Use Case Scope Summary

- **Total UCs:** 7 (UC-01..UC-07), covering FR-001..FR-011 and NFR-001..NFR-005.
- **Actors:** `principal` (primary, sole authorized actor); `teacher`/`student`/`parent`
  (secondary, negative-case only — route-gate rejection); system/scheduler actor for
  polling (UC-07).
- **Boundaries in scope:** term selection + synced re-fetch of 4 data regions (stat
  cards, subject-average chart, attendance-trend chart, periodic-reports table),
  chart a11y text-fallback, table states (loading/empty/error/success), manual
  refresh with real-failure-only error state (NFR-005), principal-only route gate,
  report-generation status polling (provisional mechanism).
- **Out of scope (per requirements.md §scope):** report content/detail view,
  editing underlying academic/attendance/discipline records, scheduling recurring
  generation, non-principal reporting. Export Excel (FR-009) is modeled minimally
  as a Should-priority stub AC only (scope unresolved — see Open Questions) since
  it was not one of the 7 items requested for this pass; full AC deferred.
- **All 5 backing endpoints are MOCK-FIRST** (integration.md) — every AC below that
  references "the fetch fails" refers to the mock repository/TanStack Query layer
  failing (network/mapped failure), not a live BE incident; this does not change
  the AC's testability.

## 2. Actor Catalogue

| Actor/Role | Type | Capabilities |
| --- | --- | --- |
| `principal` | Primary, human | Full screen access: select term, view stat cards/charts/table, refresh, trigger report generation (Should), trigger Excel export (Should, open scope) |
| `teacher` / `student` / `parent` | Secondary, human (negative case) | No access — attempting `/principal/reports` navigation redirects to own workspace; no report data fetched or rendered |
| Unauthenticated user | Secondary, human (negative case) | Redirected to `/login`; no role check reached |
| Polling scheduler (TanStack Query `refetchInterval`) | Secondary, system | Re-issues `GET .../reports` (or `/reports/{id}`) while any row `status: "generating"`; provisional mechanism per integration.md recommendation, not a confirmed BE contract |

## 3. Use Case Catalogue

### UC-01: Select term — synced re-fetch of all dashboard regions

- **Primary actor:** principal. **Secondary:** none.
- **Preconditions:** Principal role resolved server-side; screen has loaded at
  least once (or is loading for the first time with a default term, FR-002).
- **Main success scenario:**
  1. Principal selects one of Semester I / Semester II / Full year in the term
     radiogroup (`role=radio`, `aria-checked`).
  2. System issues 4 fetches for the new `termId`: stat-card summary (INT-001),
     subject-average chart (INT-002), attendance-trend chart (INT-003), periodic
     reports list (INT-004).
  3. Each of the 4 regions independently shows its own loading skeleton, then its
     own success render, scoped to that region.
  4. All 4 regions end up reflecting the newly selected term; the previously
     selected term's data is fully replaced (not merged/appended).
- **Alternative flows:**
  - A1 — On first load, no explicit selection yet made: system defaults to the
    BE-resolved current/active semester, or Semester II if unresolvable
    (`[ASSUMPTION]`, FR-002 errorConditions).
  - A2 — Principal re-selects the *same* term already active: system MAY skip
    the re-fetch (cache hit) or re-fetch idempotently; either is acceptable, no
    visible state change.
- **Exception flows:**
  - E1 — One region's fetch fails while others succeed: only the failed region
    shows its scoped error+retry (FR-003 errorConditions); the newly selected
    term is NOT discarded, and the other 3 regions render normally for the new
    term.
  - E2 — Principal switches term again while a previous term's fetches are still
    in flight: in-flight requests for the stale term are superseded/ignored on
    resolution (no race where a late-arriving stale-term response overwrites the
    newer term's rendered data).
- **Business rules:** Exactly one term is selected at all times (radiogroup, not
  checkbox group); term values are `"HK1"|"HK2"|"FULL_YEAR"` (INT-001..004).
- **Non-functional constraints:** Skeleton within 320ms of term-change (NFR-003);
  keyboard-operable radiogroup with visible focus ring (NFR-001, accessibility.md).

### UC-02: Subject-average bar chart render + text/table fallback

- **Primary actor:** principal.
- **Preconditions:** Term selected; INT-002 fetch initiated.
- **Main success scenario:**
  1. Fetch resolves with `subjects: [{subjectId, subjectName, average}]`, length > 0.
  2. System renders one bar per subject (0–10 scale) AND a visible numeric label
     for every bar (FR-005) — the value is never chart-only.
  3. The chart carries `role="img"` with a descriptive `aria-label` summarizing
     the data (NFR-001), so the value is also available to assistive tech that
     doesn't parse the visual bar directly, independent of the on-bar numeric
     label.
- **Alternative flows:**
  - A1 — Underlying data available but `subjects.length === 0`: treated as the
    dedicated empty state (FR-005 errorConditions → FR-007 pattern), not a
    rendering/error state, with empty-state illustration/copy distinct from
    loading and error.
- **Exception flows:**
  - E1 — INT-002 fetch fails (network/mapped failure): chart region shows its
    own scoped error+retry, independent of stat cards/attendance chart/table
    (FR-003).
- **Business rules:** Numeric label is mandatory per bar — never rely on bar
  height/color alone to convey the value (NFR-001, WCAG 2.1 AA "not by color
  alone").
- **Non-functional constraints:** Text/numeric fallback ≥4.5:1 contrast for body
  text, ≥3:1 for the bar/UI element itself; responsive — chart column stacks
  rather than overflows below the two-column breakpoint (NFR-002).

### UC-03: Attendance-trend chart render + text fallback

- **Primary actor:** principal.
- **Preconditions:** Term selected; INT-003 fetch initiated.
- **Main success scenario:**
  1. Fetch resolves with `weeks: [{weekLabel, rate}]` (last 6 weeks), length > 0.
  2. System renders one column per week with a visible numeric `%` label per
     column (FR-005) and `role="img"` + descriptive `aria-label` (NFR-001).
  3. Weeks with `rate < 96` are flagged as low-attendance via BOTH a color change
     AND a distinct numeric-label style (e.g. bold/icon) — never color alone
     (FR-005 postconditions, NFR-001).
- **Alternative flows:**
  - A1 — `weeks.length === 0`: dedicated empty state (FR-005 → FR-007 pattern),
    not an error.
- **Exception flows:**
  - E1 — INT-003 fetch fails: chart region shows its own scoped error+retry,
    independent of the other 3 regions (FR-003).
- **Business rules:** `rate < 96` threshold is the sole flagging rule specified;
  no other threshold is defined by requirements — `[OPEN QUESTION]` if additional
  bands (e.g. severe <90%) are desired, flagged in §6.
- **Non-functional constraints:** Same contrast/keyboard/responsive constraints
  as UC-02.

### UC-04: Periodic-reports table — load / empty (filtered) / error+retry / success

- **Primary actor:** principal.
- **Preconditions:** Term selected; INT-004 fetch initiated.
- **Main success scenario:**
  1. Fetch resolves with ≥1 `ReportListItem` for the selected term.
  2. Table renders columns: report name, term, created date, status, download
     action (FR-006).
  3. Status is communicated via icon+text badge (`ready`/`generating`), never
     color alone (FR-006 postconditions, NFR-001).
  4. Download action is enabled only when `status === "ready"`; disabled state is
     communicated via the `disabled` attribute (not opacity alone), so it's
     also correctly exposed to assistive tech and unreachable via Tab when
     disabled.
- **Alternative flows:**
  - A1 — Fetch succeeds, list is empty for the selected term: dedicated empty
    state (illustration/copy) replaces the table; stat cards and charts continue
    to render independently — an empty report list does NOT imply empty stat
    cards/charts (FR-007).
  - A2 — List exceeds one page (cursor pagination present in the envelope):
    `hasMore`/`nextCursor` drive a "load more"/infinite-scroll continuation;
    small schools may realistically never hit this (integration.md open note).
- **Exception flows:**
  - E1 — INT-004 fetch fails (initial load or term change): table region shows
    scoped error state with a retry action that re-issues the SAME fetch
    (FR-011); stat cards/charts are unaffected if their own fetches succeeded.
  - E2 — Retry itself fails: error state persists (does not loop/retry silently
    or infinitely) — principal must explicitly retry again (FR-011
    errorConditions).
- **Business rules:** Loading, empty, and error states are visually and
  structurally distinct (FR-007) — an empty state must never be mistaken for a
  loading skeleton or an error banner.
- **Non-functional constraints:** Table-rows-variant skeleton within 320ms
  (NFR-003); responsive — table does not force horizontal overflow at 320px
  (NFR-002, may need column priority/stacking, layout left to design system).

### UC-05: Manual refresh — error state driven ONLY by genuine fetch failure (NFR-005 anti-demo assertion)

- **Primary actor:** principal.
- **Preconditions:** Screen already loaded (any state — success or a prior
  scoped error) for the current term.
- **Main success scenario:**
  1. Principal clicks "Refresh"/"Làm mới" (FR-010).
  2. System re-issues the fetch(es) for the current term (all 4 regions, or just
     the previously-errored region(s) — implementation detail left to
     `fe-state-engineer`).
  3. Loading state is shown during refresh; on success, region(s) render fresh
     data (FR-010 postconditions).
- **Alternative flows:**
  - A1 — Principal refreshes a screen that is already fully in a success state:
    same success re-render with the (possibly unchanged) data; no error is
    introduced by the act of refreshing itself.
- **Exception flows:**
  - E1 — The refresh's underlying fetch genuinely fails (network/mapped
    failure): real error state renders per FR-011 (scoped to the failed
    region(s)), with a retry action.
- **Business rules — NFR-005 anti-demo assertion (write and test as its own,
  standalone assertion, independent of any other AC in this doc):**
  - **AC-05.N (mandatory, non-negotiable):** The production error state for this
    screen (any of the 4 regions, and the manual-refresh action itself) MUST be
    triggered 1:1 by an actual failed fetch/operation outcome. It MUST NOT be
    triggered by a scripted "first attempt always fails" (`failedOnce`) pattern,
    a fixed-count/fixed-order simulated failure, or any other non-genuine
    demo/rehearsal behavior. The reference mockup's `failedOnce` behavior in
    `design_src/edu/reports.jsx` is explicitly a DESIGN-REVIEW-ONLY artifact
    (NFR-005) and MUST NOT be ported into the mock repository, the TanStack
    Query layer, or any production code path. QA (`fe-qa-playwright`) must
    verify: (a) the FIRST refresh in a fresh session succeeds when the mock
    repository is configured to succeed — it does NOT fail by default/design;
    (b) an error state appears only when the mock/fetch layer is explicitly
    configured or forced to reject; (c) no timer/counter/session-based logic
    exists anywhere in the shipped code that forces an error on a particular
    ordinal call.
- **Non-functional constraints:** Retry button and refresh button are both
  keyboard-operable with visible focus (NFR-001); loading feedback appears
  within 320ms of the refresh click if data isn't yet resolved (NFR-003).

### UC-06: Principal-only route gate (server-side)

- **Primary actor:** any authenticated user (principal = success path; other
  roles = negative case, per requirements.md handoff note — the meaningful role
  variant here is the negative case, not an in-screen permission-scoped UI).
- **Preconditions:** none (entry use case).
- **Main success scenario:**
  1. User with an authenticated session and a resolved `principal` role for the
     active tenant navigates to `/principal/reports`.
  2. Server-side check (not client-side hide) confirms the role (FR-001,
     NFR-007, consistent with `roles-permissions.md` hard-gate rule).
  3. Screen renders; UC-01 begins.
- **Alternative flows:**
  - A1 — Authenticated user with an unresolved/pending role for the current
    tenant: `[ASSUMPTION]` treated as non-principal until resolved — redirected,
    same as E1.
- **Exception flows:**
  - E1 — Authenticated user resolves to `teacher`/`student`/`parent` (non-
    principal): redirected server-side to that role's own workspace; NO report
    data (stat cards/charts/table) is fetched or rendered at any point during
    the redirect — the gate happens before any of INT-001..004 fire.
  - E2 — Unauthenticated user: redirected to `/login` (FR-001 errorConditions);
    role check is never reached.
  - E3 — Direct navigation attempt (deep link, not via in-app nav) by a non-
    principal: same as E1 — the gate is enforced at the route/server level, not
    only by hiding the nav entry (NFR-007's explicit measurable target).
- **Business rules:** Role check MUST be server-side and MUST occur before any
  data fetch for this screen begins (no flash-of-restricted-content, no data
  leak via a client-side-only hide).
- **Non-functional constraints:** Redirect must not leave the restricted screen
  briefly visible/rendered (no client-only gate); consistent with the
  session/redirect handling already used elsewhere in the app.

### UC-07: Report generation status transition (generating → ready) — polling, provisional mechanism

> **Provisional/best-effort — flagged per integration.md:** polling is a
> **recommendation**, not a confirmed BE contract (NFR-004, FR-008 are
> "Should"-priority and explicitly open — see integration.md §4). AC below are
> written against the mock repository's simulated `generating → ready`
> transition so `fe-nextjs-engineer` has a testable target now; if BE later
> exposes a push channel (noti/SSE) instead of a poll endpoint, this UC's
> mechanism-level AC (not its user-visible AC) will need revision — flagged to
> `ba-spec-writer`'s traceability matrix.

- **Primary actor:** principal. **Secondary:** polling scheduler (system actor).
- **Preconditions:** Principal role; a term is selected; principal has clicked
  "New report"/"Tạo báo cáo" (FR-008).
- **Main success scenario:**
  1. Principal clicks "New report" for the selected term.
  2. System issues the generation request (INT-005, `POST .../reports`); on
     success, a new row appears in the periodic-reports table with
     `status: "generating"` (FR-008 postconditions).
  3. While ANY row in the table has `status: "generating"`, the system polls
     (re-fetches INT-004's list, or a per-report status endpoint) at an
     interval ≤10s (NFR-004 measurable target; exact interval/backoff left to
     `fe-state-engineer`, integration.md §6 open question).
  4. When the polled response shows the row's `status` has transitioned to
     `"ready"`, the table updates in place WITHOUT a full page reload; the
     download action for that row becomes enabled.
  5. Polling stops once no row remains `"generating"`.
- **Alternative flows:**
  - A1 — Multiple reports are `"generating"` simultaneously (e.g. principal
    triggers "New report" more than once before the first resolves): a single
    poll cycle covers all in-flight rows (one list re-fetch, not N per-report
    polls), each transitioning independently as its own status resolves.
- **Exception flows:**
  - E1 — INT-005 generation request itself fails (before any row is added):
    inline/toast error shown; the periodic-reports table is unaffected — no
    ghost "generating" row is added for a request that never succeeded (FR-008
    errorConditions).
  - E2 — Polling exceeds a bounded number of attempts without the row reaching
    `"ready"`: polling is capped/backed off per NFR-004's measurable target
    (exact bound `[OPEN QUESTION]`, left to `fe-state-engineer`); the row
    should not poll forever silently — `[OPEN QUESTION]` whether a stalled-row
    UI treatment (e.g. "taking longer than expected" messaging) is required, or
    the row simply remains visually `"generating"` with backed-off polling.
  - E3 — A poll request itself fails (transient network error) while other
    regions are healthy: `[OPEN QUESTION]` whether a single failed poll attempt
    should surface a user-visible error or silently retry on the next interval
    (leaning toward silent retry, consistent with "not a scripted demo failure"
    spirit of NFR-005, but not explicitly specified) — flagged in §6.
- **Business rules:** Generation is asynchronous (`[ASSUMPTION]`, requirements.md)
  — status never jumps to `"ready"` synchronously in the POST response itself
  (INT-005's response payload only ever returns `status: "generating"` as the
  initial state).
- **Non-functional constraints:** No full page reload for the status update
  (NFR-004 hard requirement); poll must not visually disrupt the rest of the
  screen (term selection, other regions) while in flight.

## 4. Acceptance Criteria

```
UC-01: Select term — synced re-fetch of all dashboard regions
  AC-01.1 Happy path — Given the screen has loaded with term "HK1" fully rendered,
    When the principal selects "Semester II" in the term radiogroup,
    Then all 4 regions (stat cards, subject-average chart, attendance-trend chart,
    periodic-reports table) show their own loading skeleton, then re-render with
    HK2 data, and the radiogroup shows `aria-checked=true` only on "Semester II".
  AC-01.2 Default term on first load — Given a principal navigates to the screen
    for the first time this session, When the initial fetch resolves, Then the
    term radiogroup shows the BE-resolved current/active semester pre-selected
    (or Semester II if unresolvable per [ASSUMPTION]), without requiring any
    click.
  AC-01.3 Scoped partial failure — Given the principal switches to "Full year",
    When the subject-average chart fetch fails but the other 3 regions succeed,
    Then only the subject-average chart region shows an error+retry state, the
    stat cards/attendance chart/table render Full-year data normally, and the
    term selector still shows "Full year" as selected (not reverted to HK1).
  AC-01.4 Stale-response race — Given the principal rapidly switches HK1 → HK2 →
    Full year before the HK1 fetches resolve, When the HK1 response arrives after
    the Full-year selection is active, Then the HK1 response is discarded/ignored
    and the screen continues to reflect Full-year data only.
  AC-01.5 Loading — Given a term-change fetch is in flight, Then each affected
    region shows `EduSkeleton` (cards / chart / table-rows variant per region)
    within 320ms, and the term radiogroup itself remains interactive (selecting a
    different term while one is loading is not blocked).
  AC-01.6 Keyboard — Given the term radiogroup is focused, When the principal
    uses arrow keys, Then focus/selection moves between the 3 options per native
    `role=radio` group behavior, with a visible focus ring at each step.

UC-02: Subject-average bar chart render + text/table fallback
  AC-02.1 Happy path — Given INT-002 resolves with ≥1 subject for the selected
    term, Then the chart renders one bar per subject AND a visible numeric label
    (e.g. "7.8") on/next to each bar — the value is legible without relying on
    bar height or color.
  AC-02.2 A11y descriptive label — Given the chart has rendered, Then the chart
    container carries `role="img"` and an `aria-label` summarizing the dataset
    (e.g. subject count + average range), independent of the per-bar numeric
    labels, satisfying NFR-001 for non-visual access.
  AC-02.3 Empty — Given INT-002 resolves with `subjects: []`, Then a dedicated
    empty-state illustration/copy is shown in place of the chart, visually
    distinct from both the loading skeleton and the error state.
  AC-02.4 Error + retry — Given INT-002's fetch genuinely rejects, Then the
    chart region alone shows an error state with a retry action; retry re-issues
    only the subject-average fetch, not the other 3 regions.
  AC-02.5 Loading — Given the fetch is in flight, Then a chart-shaped skeleton
    is visible within 320ms of navigation/term-change.
  AC-02.6 Responsive — Given viewport width 320px, Then the chart column stacks
    (no horizontal overflow, no clipped bars/labels).

UC-03: Attendance-trend chart render + text fallback
  AC-03.1 Happy path — Given INT-003 resolves with 6 weeks of data, Then the
    chart renders one column per week with a visible "%" numeric label per
    column.
  AC-03.2 Low-attendance flag, not color-only — Given a week's `rate < 96`, Then
    that column is flagged via BOTH a distinct color AND a distinct numeric-label
    style (e.g. bold/warning icon) — verified by confirming the label style
    differs even when color is simulated as removed/greyscale.
  AC-03.3 A11y descriptive label — Given the chart has rendered, Then it carries
    `role="img"` + a summarizing `aria-label` (e.g. lowest/highest week + trend
    direction).
  AC-03.4 Empty — Given INT-003 resolves with `weeks: []`, Then a dedicated
    empty state is shown, distinct from loading/error.
  AC-03.5 Error + retry — Given INT-003's fetch genuinely rejects, Then the
    attendance-trend region alone shows error+retry, independent of the
    subject-average chart/stat cards/table.
  AC-03.6 Loading — Skeleton visible within 320ms of navigation/term-change.

UC-04: Periodic-reports table — load / empty / error+retry / success
  AC-04.1 Happy path — Given INT-004 resolves with ≥1 report for the selected
    term, Then the table renders name/term/created-date/status/download for
    each row; status is shown as an icon+text badge (not a color swatch alone).
  AC-04.2 Download gating — Given a row has `status: "generating"`, Then its
    download action is rendered with the `disabled` HTML attribute (not merely
    dimmed via opacity), is unreachable via Tab in that state, and re-enables
    automatically once status becomes `"ready"` (see UC-07).
  AC-04.3 Empty (filtered by term) — Given INT-004 resolves successfully with an
    empty array for the selected term, Then a dedicated empty-state
    illustration/copy replaces the table, while the stat cards and both charts
    continue to render their own (non-empty) data for that same term
    independently.
  AC-04.4 Error + retry — Given INT-004's fetch genuinely rejects (initial load
    or after a term change), Then the table region shows an error state with a
    retry action; clicking retry re-issues the same INT-004 fetch for the
    currently selected term.
  AC-04.5 Retry-fails-again — Given the principal clicks retry and the re-issued
    fetch also genuinely rejects, Then the error state persists (same message +
    retry action) — no silent infinite retry loop, no unannounced state change.
  AC-04.6 Loading — Given the table's fetch is in flight, Then a table-rows-
    variant skeleton is visible within 320ms.
  AC-04.7 Distinctness — Given each of loading, empty, and error states in
    isolation, Then a user/QA screenshot comparison confirms no two of the three
    states are visually or structurally identical (each has a distinguishable
    illustration/copy/structure).

UC-05: Manual refresh — real-failure-only error state (NFR-005)
  AC-05.1 Happy path — Given the screen is in a success state, When the
    principal clicks "Refresh", Then a brief loading indicator appears and the
    screen re-renders with (possibly identical) fresh data on success.
  AC-05.2 Genuine failure on refresh — Given the mock/fetch layer is configured
    to reject the refresh's underlying request, When the principal clicks
    "Refresh", Then the affected region(s) show the real error+retry state
    (FR-011), triggered strictly by that rejection.
  AC-05.3 **NFR-005 anti-demo assertion (standalone, mandatory)** — Given a
    FRESH session where the mock repository is configured to succeed (default
    configuration, no forced failure), When the principal performs their FIRST
    ever refresh (or initial load) of this screen, Then the fetch succeeds and
    NO error state is shown — i.e., there is NO scripted "first call always
    fails" (`failedOnce`) behavior anywhere in the shipped mock repository,
    TanStack Query configuration, or presentation code. This AC is independently
    testable by `fe-qa-playwright` via: (a) inspecting the mock repository
    source for any ordinal/counter/session-based forced-failure logic (must
    find none) and (b) an E2E run confirming the very first refresh in a clean
    browser/session context succeeds. This directly enforces NFR-005 and
    supersedes/forbids replicating `design_src/edu/reports.jsx`'s `failedOnce`
    demo pattern in production code.
  AC-05.4 Loading — Given refresh submit pending, Then the "Refresh" button
    shows `aria-busy="true"` + a spinner, and is not clickable again until the
    in-flight refresh resolves (no duplicate concurrent refresh requests).

UC-06: Principal-only route gate
  AC-06.1 Happy path — Given an authenticated user with a server-resolved
    `principal` role for the active tenant, When they navigate to
    `/principal/reports`, Then the screen renders and UC-01's initial fetch
    begins.
  AC-06.2 Non-principal redirect — Given an authenticated user resolved to
    `teacher`/`student`/`parent`, When they navigate (via nav link or direct
    URL) to `/principal/reports`, Then they are redirected server-side to their
    own workspace route, and NONE of INT-001..INT-004 are ever invoked (verified
    via network assertion: zero requests to `/core/api/v1/principal/reports/*`).
  AC-06.3 Unauthenticated — Given no valid session, When navigating to
    `/principal/reports`, Then the user is redirected to `/login` before any
    role check or data fetch occurs.
  AC-06.4 Deep-link enforcement — Given a non-principal user directly pastes the
    `/principal/reports` URL (bypassing in-app nav, which would otherwise hide
    the link), Then the same server-side redirect in AC-06.2 applies — proving
    the gate is not merely a hidden nav item (NFR-007).
  AC-06.5 Role variant note — Given only one role variant matters for this
    screen (principal = full access), Then there is no partial/permission-
    scoped UI to test within the screen itself for other roles — the negative
    case (AC-06.2/06.4) IS the role-variant coverage for this UC.

UC-07: Report generation status transition (generating → ready) — polling, provisional
  AC-07.1 Happy path — Given the principal clicks "New report" for the selected
    term and INT-005 resolves successfully, Then a new row appears in the table
    immediately with `status: "generating"` and a disabled download action.
  AC-07.2 Polling transition — Given a row is `status: "generating"`, When the
    mock repository's simulated background transition completes (deterministic,
    injected-clock in tests per tdd.md — no real timers), Then within one poll
    cycle (≤10s per NFR-004) the row updates in place to `status: "ready"` with
    its download action enabled, WITHOUT a full page reload/navigation.
  AC-07.3 Generation request failure — Given INT-005's request itself rejects,
    Then an inline/toast error is shown, and NO new row is added to the table
    (no ghost "generating" row for a request that never succeeded).
  AC-07.4 Multiple concurrent generations — Given 2 reports are simultaneously
    `status: "generating"`, When a poll cycle runs, Then a single re-fetch/poll
    covers both rows, and each transitions to `"ready"` independently as its own
    underlying status resolves (not gated on the other completing first).
  AC-07.5 Poll cap/backoff (provisional) — Given a row remains `"generating"`
    past a bounded number of poll attempts, Then polling backs off/caps per
    NFR-004's measurable target (exact interval/count `[OPEN QUESTION]`, left to
    `fe-state-engineer`) rather than polling indefinitely at a fixed short
    interval forever.
  AC-07.6 Mechanism caveat (provisional, not a confirmed contract) — This UC's
    AC assume polling per integration.md's recommendation. If BE instead ships a
    push channel (noti/SSE), AC-07.2/07.5's *mechanism* (poll cycle, backoff)
    would be superseded by a subscribe-based equivalent, but the *user-visible*
    outcome (AC-07.1, AC-07.3, AC-07.4 — row appears, transitions, no ghost rows
    on failure) would hold unchanged.
```

## 5. Edge Case Matrix

| Feature / UC | Empty | Max-length / large data | Concurrent (rapid term switch / multi-generation) | Auth-expired mid-session | Network-error | Wrong-role |
| --- | --- | --- | --- | --- | --- | --- |
| UC-01 Term selector sync | n/a (always 1 selected) | n/a | AC-01.4 stale-response race handled | Session expiry mid-fetch → treated as a failed fetch → scoped error per region (reactive 401 refresh per api-integration.md hybrid strategy; out of this doc's scope to re-derive) | AC-01.3 scoped partial failure | Never reached — gated at UC-06 |
| UC-02 Subject-avg chart | AC-02.3 | `[OPEN QUESTION]` max subject count before chart needs horizontal scroll/wrap not specified — flag to `ba-lead`/design | n/a (single fetch per term) | Same as UC-01 | AC-02.4 | Never reached |
| UC-03 Attendance chart | AC-03.4 | Fixed at 6 weeks per contract (INT-003) — no max-length concern | n/a | Same as UC-01 | AC-03.5 | Never reached |
| UC-04 Reports table | AC-04.3 | Pagination via cursor (INT-004) for report count beyond one page — AC not written for pagination scrolling behavior in this pass (`[OPEN QUESTION]`, low priority per integration.md) | New row insertion during an in-flight list fetch (UC-07 AC-07.1) — `[OPEN QUESTION]` whether optimistic insert or wait-for-poll | Same as UC-01 | AC-04.4/04.5 | Never reached |
| UC-05 Manual refresh | n/a | n/a | Duplicate refresh clicks while one is in flight → AC-05.4 disables the button | Same as UC-01 | AC-05.2, and critically AC-05.3 (must NOT be a scripted failure) | Never reached |
| UC-06 Route gate | n/a | n/a | n/a | Unauthenticated case = AC-06.3 (distinct from wrong-role) | n/a (gate check itself doesn't hit `core`) | AC-06.2/06.4 (this UC IS the wrong-role case) |
| UC-07 Report generation polling | n/a (no rows generating = no polling) | Multiple concurrent generating rows → AC-07.4 | AC-07.4 (concurrent generations); AC-01.4-style race if term changes while a row is generating → `[OPEN QUESTION]` does switching term stop polling for the other term's row? | Same as UC-01 during poll requests | AC-07.3 (generation POST failure); poll-request-itself-fails → E3 `[OPEN QUESTION]` | Never reached |

## 6. Open Questions

- `[OPEN QUESTION]` UC-03/AC-03.2: only one attendance threshold (`<96%`) is
  specified. Should a second, more severe band (e.g. `<90%`) get a distinct
  visual/label treatment? Not specified in requirements.md or integration.md —
  flag to `ba-lead` before `fe-component-architect` finalizes the chart contract.
- `[OPEN QUESTION]` UC-04/edge matrix: exact pagination UX for the periodic-
  reports table (load-more button vs. infinite scroll vs. none, given
  integration.md's own doubt that pagination is realistically needed) — left
  unresolved for `ba-lead`/`fe-state-engineer` to decide together.
- `[OPEN QUESTION]` UC-07/AC-07.1 vs table fetch race: if a term-change re-fetch
  (UC-01) happens while a report is `generating` for a DIFFERENT term, should
  polling for that row continue in the background, pause, or stop? Not specified
  — recommend continuing in background (reports outlive the currently-viewed
  term) but this is a judgment call, not a confirmed rule.
- `[OPEN QUESTION]` UC-07/E3: should a single failed poll attempt (transient
  network error, not a generation failure) surface a user-visible error, or
  retry silently on the next interval? Leaning silent-retry (consistent with
  NFR-005's spirit of not manufacturing extra error surfaces) but not explicitly
  specified by requirements.md/integration.md — flag to `ba-lead`.
- `[OPEN QUESTION]` FR-009 (Export Excel) full AC were explicitly out of scope
  for this modeling pass (per task instructions, only 7 items requested) — scope
  itself is still open per integration.md (client-side render vs. future BE
  file endpoint). A dedicated UC-08 + AC set should be written once export
  scope is confirmed or once `ba-lead`/`fe-state-engineer` commits to the
  client-side-render recommendation as the shipped behavior.
- `[OPEN QUESTION]` Exact poll interval/backoff numeric values (NFR-004,
  integration.md §6) are explicitly left to `fe-state-engineer` — AC-07.5 only
  states the qualitative requirement (bounded, capped/backed-off), not concrete
  numbers, per integration.md's own deferral.
- `[OPEN QUESTION]` Whether `role=principal` resolution itself can be "pending/
  unresolved" as a real transient state (UC-06/A1) or whether the app's auth
  model guarantees role is always resolved by the time a protected route
  renders — assumed the latter is more likely true elsewhere in the app, but not
  verified against this specific route in this pass.
