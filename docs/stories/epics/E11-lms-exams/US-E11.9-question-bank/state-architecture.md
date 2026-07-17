# State Architecture — US-E11.9 Teacher Question Bank

Written by `fe-state-engineer`. Finalizes `plan.md` §6's hand-off sketch — does
not contradict it, resolves the one item plan.md explicitly leaves open (the
`gradeLevel`/`difficulty` key placement). Build contract = `spec.md` (every AC
cited below is traceable there). No global client store (Zustand/Redux/Jotai)
— server state via TanStack Query, everything else is local-component /
local-form state, per `.claude/CLAUDE.md`.

**Ground-truthing note (read this first):** `plan.md` §6 describes the
sibling `lesson-plan` (US-E11.8) precedent as "`useMutation`... mirrors the
`revalidatePath` + `invalidateQueries` combo". I re-read the actually-shipped
`src/features/lesson-plan/**` code (not just its own `state-architecture.md`
design doc) before writing this: the shipped builder uses **zero** TanStack
Query and **zero** `useMutation` — it's plain Server Actions + `useTransition`
+ local `useState`, with `revalidatePath` server-side and **no client-side
`invalidateQueries` call anywhere in the codebase**. The list screen is the
only real TanStack Query consumer (`useInfiniteQuery`). Subject options are
RSC-fetched and passed as plain VM props, not a client query. I'm designing
question-bank to **mirror the simpler, actually-shipped reality** (RSC +
local-state builder, TanStack only for the paginated list), not the more
elaborate `useQuery`/`useMutation` builder design that lesson-plan's own
design doc proposed but never implemented. One deliberate improvement over
that shipped reality: I close a real gap it left (client-side list cache
never explicitly busted after a mutation, only implicitly via 30s
`staleTime`) — see §5/§6.

---

## 1. State Architecture Summary

- **Server state (TanStack Query):** exactly one query family with two modes
  — `listMineRoot()` (`useInfiniteQuery`, scope=mine) and `searchRoot(...)`
  (`useInfiniteQuery`, scope=search, mode-conditional key shape — §4). No
  client-side query for single-question detail; no client-side query for
  subject options.
- **Mutations (Server Action, plain — no `useMutation` wrapper):** create,
  update (save draft), publish — 3 write paths, thin Server Actions calling
  `bootstrap/di/question-bank.di.ts` factories only, invoked from the
  builder's local hook (`use-question-bank-builder.ts`, mirrors
  `use-lesson-plan-builder.ts`) inside `useTransition`. `queryClient` is
  reached via `useQueryClient()` inside that same hook purely to call
  `invalidateQueries` on success/race — no `useMutation` lifecycle needed,
  since there's nothing here that benefits from its retry/dedup machinery
  beyond what a plain `await` + `useTransition` already gives an
  explicit-submit form.
- **RSC↔client split:** list route seeds `listMineRoot()`'s `initialData`
  server-side (default scope=mine only, mirrors lesson-plan exactly). Search
  scope has no RSC seed (no subject/tag preselected by default,
  AC-902.1 — landing shows the gate, not data). Edit route seeds the
  question entity as a plain VM prop (`initial`) via
  `makeGetQuestionUseCase()`, **not** a client query — visibility-gate
  redirects happen in the RSC before any client component mounts. Create
  route has no read of its own; `subjects`/`gradeOptions` are RSC-fetched
  (`getSubjectOptions()`) and passed as VM props to both create/edit/list
  screens — no client query for reference data, matching the shipped
  lesson-plan reality (not its design doc's proposal).
- **URL state:** only `:id` route param (edit route). Scope toggle
  (mine/search), the search subject/tag/gradeLevel/difficulty/status/
  questionType filter values are all **local state**, not URL search
  params — spec §8's own assumption confirms this ("session-local UI state
  only — no URL/deep-link persistence required for v1").
- **Local-form state:** react-hook-form + zod for the create/edit builder
  (questionType, subjectId, gradeLevel, difficulty, body, expectedAnswer,
  tags) — or, if the engineer follows the lesson-plan precedent literally, a
  hand-rolled `useState` draft object (that's what actually shipped for
  lesson-plan despite its own design doc naming RHF); either is acceptable,
  this doc doesn't re-litigate that engineer-level choice, only the state
  **classification** (local-form, not server/URL). Tag-chip input buffer is
  separate ephemeral local state from the committed `tags: string[]` value
  (promoted `TagChipsInput` component owns this internally, per plan.md §4).
- **Key decision made (the one plan.md flags as most important):**
  `gradeLevel`/`difficulty` are **mode-conditionally** part of the search
  key — present (as real key segments) only in **subject-mode**, absent (pure
  client-side filter over the tag-keyed page) in **tag-mode**. See §4 for the
  full reasoning; this is not a compromise, it is the literal shape of
  FR-005's split table expressed as a query key.
- **No new global store, no ADR trigger.** Subject options are read-only
  cross-feature RSC reuse of `makeSubjectCatalogueRepository()` (per plan.md
  §0 item 1) — not a data-contract change.

---

## 2. State Inventory

| Item | Type | Owner | Shape (TS) | Reason |
| --- | --- | --- | --- | --- |
| List-mine pages | Server (`useInfiniteQuery`) | `QuestionBankListScreen` (scope=mine) | `InfiniteData<{ items: QuestionEntity[]; nextCursor?: string; hasMore: boolean }>` | cursor-paginated server list, INT-202, no server filter params at all |
| Search pages | Server (`useInfiniteQuery`, `enabled` gated on FR-002/003 satisfaction) | `QuestionBankListScreen` (scope=search) | same page shape, keyed mode-conditionally — §4 | cursor-paginated server list, INT-201 |
| Question detail (create/edit/locked view) | RSC-fetched + local state — **not** a client query | `QuestionBankBuilderScreen` / `use-question-bank-builder.ts` | `QuestionEntity \| undefined` seeded once from VM `initial` prop, resynced only via the explicit `refetchAction` race path (§6) | matches shipped lesson-plan reality; no background-refetch benefit for a single-owner edit form the user is actively looking at |
| Subject options | RSC-fetched, plain VM prop | list + create + edit screens | `SubjectOption[]` | reference data, cheap to refetch per-navigation server-side; no client cache needed (matches shipped lesson-plan reality, not its design doc) |
| Grade options | Static constant, plain VM prop | same as above | `readonly string[]` | fixed enum, no fetch at all |
| Scope toggle (`"mine" \| "search"`) | Local (`useState`) | `QuestionBankListScreen` | `"mine" \| "search"` | session-local only, spec §8 |
| Search subjectId / tag (mandatory-filter-gate inputs) | Local (`useState`), feeds the query key | `QuestionBankListScreen` | `string \| undefined` each | the two real gate-satisfying params (§4) |
| Search gradeLevel / difficulty | Local (`useState`), **mode-conditionally** feeds the query key | `QuestionBankListScreen` | `GradeLevel \| undefined`, `Difficulty \| undefined` | real server param in subject-mode, client-only filter in tag-mode — same state, different key participation depending on mode (§4) |
| Client-only filters (questionType always; status scope=mine only) | Local (`useState`/derived) | `QuestionBankListScreen` | plain filter object | never a server param in either scope (FR-005 table), must never pollute the key |
| Debounced tag text (pre-commit buffer) | Local (`useState` + debounce timer) | `QuestionBankListScreen` | `string` | FR-013, 300–400ms; distinct from the committed `tag` value that drives the key |
| Mandatory-filter-satisfied boolean | Local, derived (`useMemo` over `isSearchFilterSatisfied`) | `QuestionBankListScreen` | `boolean` | pure predicate reuse from domain (plan.md §1), not server state |
| Builder form fields | Local-form | `QuestionBankBuilderScreen` / `use-question-bank-builder.ts` | `{ questionType, subjectId, gradeLevel, difficulty, body, expectedAnswer, tags: string[] }` | per-field validation (FR-008), 4 fields immutable post-create (FR-009) |
| Tag-chip input buffer | Local (`useState`, string) | promoted `TagChipsInput` (shared) | `string` | ephemeral UI-only |
| Publish-readiness boolean | Local, derived | builder | `boolean` | pure client compute (`body` valid only, FR-007/FR-010 — `expectedAnswer` never gates it) |
| Race/informational toast state | Ephemeral, fire-and-forget (`sonner` `toast`) | builder | n/a (no persisted local flag) | matches shipped lesson-plan pattern exactly — a toast call, not a `raceBannerVisible` boolean, since AC-905.6/AC-904.8 call for a toast, not a banner (question-bank's own spec is explicit about this — even more so than lesson-plan's) |
| Publish confirm dialog open | Local (`useState`) | builder | `boolean` | ephemeral UI state |

---

## 3. State Flow

**Read flow (RSC → ViewModel → client):**

```
list/page.tsx (RSC)
  → Promise.all([
      makeListMyQuestionsUseCase().execute({}),   // INT-202, no filter params
      getSubjectOptions(),
    ])
  → vm: { initialMinePage, subjects, gradeOptions, currentTeacherId, ... }
  → <QuestionBankListScreen vm={vm} />
     → useInfiniteQuery(questionBankKeys.listMineRoot(), {
         initialData: vm.initialMinePage ? { pages:[vm.initialMinePage], pageParams:[undefined] } : undefined,
         enabled: scope === "mine",
       })
     → scope=search: useInfiniteQuery(questionBankKeys.searchRoot({subjectId,tag,gradeLevel,difficulty}), {
         enabled: scope === "search" && isSearchFilterSatisfied(subjectId, tag),
       })
       — NOT RSC-seeded (no default filter, AC-902.1 requires the gate prompt
       on landing, not a request).

create/page.tsx (RSC) — no read of its own.
  → subjects = await getSubjectOptions()
  → <QuestionBankBuilderScreen vm={{ initial: undefined, subjects, gradeOptions, ... }} />

[id]/edit/page.tsx (RSC)
  → makeGetQuestionUseCase().execute(id)
  → branch:
      not-found → redirect(`${base}?notice=not-found`)                      // AC per plan.md §5
      not-visible | forbidden-edit → redirect(`${base}?notice=access-denied`) // BEFORE client mounts
      network-error | unknown → stay on route, vm.loadFailed = true          // client shows retry
      success (own DRAFT, own PUBLISHED, or cross-teacher PUBLISHED — FR-011)
        → <QuestionBankBuilderScreen vm={{ initial: question, planId: id, subjects, ... }} />
```

**Write flow (mutation → Server Action → invalidation):**

```
use-question-bank-builder.ts ('use client')
  const queryClient = useQueryClient();

  handleSaveDraft() → startSave(async () => {
    const res = await vm.saveDraftAction({ ...draft, id: planId }); // Server Action
    if (!res.ok) {
      if (res.errorKey === "already-published") { await resyncLocked(id); return; }  // §6 race
      applyFailure(res.errorKey);  // inline field error or toast, no cache touch
      return;
    }
    setLocalStateFrom(res.question);
    queryClient.invalidateQueries({ queryKey: questionBankKeys.listMineRoot() });
    toast.success(t("toast.draftSaved"));
  });

  handleConfirmPublish() → startPublish(async () => {
    const res = await vm.publishAction(id);
    if (!res.ok) {
      if (res.errorKey === "already-published") { await resyncLocked(id); return; }
      applyFailure(res.errorKey);
      return;
    }
    setLocalStateFrom(res.question);  // status → PUBLISHED, publishedAt set
    queryClient.invalidateQueries({ queryKey: questionBankKeys.listMineRoot() });
    queryClient.invalidateQueries({ queryKey: ["question-bank", "search"], exact: false });
    toast.success(t("toast.published"));
  });
```

Server Action side (`actions.ts`, mirrors lesson-plan's shape 1:1):
`revalidatePath(LIST_PATH, "page")` on create/update/publish success — busts
the Next.js RSC cache so the **next full navigation** to
`/teacher/question-bank` re-runs `makeListMyQuestionsUseCase()` fresh. This
is the RSC-side half; `invalidateQueries` above is the **client TanStack
cache** half — both are needed because they invalidate two different caches
(Next.js data cache vs. the in-browser QueryClient), and lesson-plan's
shipped code only did the first. See §5 for why this matters concretely.

No SSE/realtime in this feature (spec.md has no push requirement) — no
event-taxonomy entry needed.

---

## 4. Query Key Hierarchy + Cache Policy — THE key decision

```ts
// src/features/question-bank/presentation/question-bank.query-keys.ts

export const questionBankKeys = {
  all: () => ["question-bank"] as const,

  listMineRoot: () => ["question-bank", "list", "mine"] as const,

  /**
   * Mode-conditional shape — the single most important state decision in
   * this story (plan.md §6/§7 flags it explicitly). Per FR-005's
   * ground-truthed split table:
   *   - subjectId set  → SUBJECT-MODE: gradeLevel/difficulty are REAL server
   *     params (AC-902.14, "DO narrow server results") → they are key
   *     segments. A gradeLevel/difficulty change while subjectId is fixed
   *     genuinely changes what the server returns, so it MUST be a distinct
   *     cache entry — folding it into a client-side filter would silently
   *     serve a stale, wrongly-narrowed (or wrongly-unnarrowed) page.
   *   - subjectId NOT set, gate satisfied via tag only → TAG-MODE:
   *     gradeLevel/difficulty are IGNORED server-side (AC-902.13, "do NOT
   *     narrow server results") → they are NOT key segments. Putting them in
   *     the key here would be actively wrong: it would fragment the cache
   *     into N entries that all fetch the IDENTICAL server response, and it
   *     would misrepresent to any future reader of this hook that difficulty
   *     "drives" the tag-mode request — exactly the misrepresentation
   *     AC-902.13 warns against, just moved from the UI layer into the code
   *     layer. In tag-mode, gradeLevel/difficulty apply as a plain
   *     client-side `.filter()` over the already-fetched tag-keyed pages,
   *     identical in mechanism to how lesson-plan's mine-scope filters work.
   *
   * Consequence for the mode-switch race plan.md flags: switching subjectId
   * from unset→set (or vice versa) changes which BRANCH of this function
   * runs, which changes the key shape entirely (["...,"subject",...] vs
   * ["...,"tag",...]) — there is no key collision between modes, so a
   * mode switch can never serve a stale/wrong-looking page from the other
   * mode's cache entry. This is the concrete mechanism that answers item 1
   * of the brief.
   */
  searchRoot: (params: {
    subjectId?: string;
    tag?: string;
    gradeLevel?: string;
    difficulty?: string;
  }) =>
    params.subjectId
      ? ([
          "question-bank",
          "search",
          "subject",
          params.subjectId,
          params.tag ?? null,
          params.gradeLevel ?? null,
          params.difficulty ?? null,
        ] as const)
      : (["question-bank", "search", "tag", params.tag ?? null] as const),

  detail: (id: string) => ["question-bank", "detail", id] as const,
};
```

**`detail(id)` is a reserved/latent key, not an active `useQuery` consumer in
this story** — the builder reads via RSC + local state (§1/§3), matching
shipped lesson-plan reality. It's kept in the factory for (a) invalidation-map
completeness/future-proofing (harmless no-op to invalidate a key nobody
subscribes to) and (b) a plausible future consumer (e.g. a quick-view drawer
from the list card that wants `useQuery` without a full page navigation) —
do not build that consumer speculatively now.

**Why `questionType`/`status` (mine-only) are never key segments:** per the
FR-005 table, neither has a server param in EITHER scope, ever (`questionType`
row: "client-side only" both columns; `status`: mine-only, no BE param
exists). These are always applied as a client-side `.filter()` over fetched
pages, exactly mirroring lesson-plan's `subjectId`/`gradeLevel`/`status`
mine-scope filters.

| Query | `staleTime` | `gcTime` | `enabled` / notes |
| --- | --- | --- | --- |
| `listMineRoot()` | `30_000` | `300_000` | RSC-seeded `initialData`; `enabled: scope === "mine"` |
| `searchRoot(params)` | `30_000` | `300_000` | `enabled: scope === "search" && isSearchFilterSatisfied(subjectId, tag)` (FR-002/003 gate — no request at all while unsatisfied, not merely a disabled query, matching AC-902.1's "no request fires") |

`refetchOnWindowFocus: false` on both (matches the repo global default; not a
live-collaboration surface).

---

## 5. Invalidation Map

| Trigger | Keys invalidated (client `queryClient.invalidateQueries`) | RSC cache (`revalidatePath`) | Notes |
| --- | --- | --- | --- |
| `createQuestion` success | `listMineRoot()` | `LIST_PATH` | new DRAFT should appear in "Của tôi" on next visit/refetch |
| `updateQuestion` (save draft) success | `listMineRoot()` | `LIST_PATH` | `body`/`tags` may have changed and are shown on the row-card preview (FR-004) |
| `updateQuestion` onError `already-published` | none (query-cache) — resolved by direct `refetchAction` call + local `setState`, not `invalidateQueries`, since detail has no active query subscriber (§3/§6) | — | race mechanism |
| `publishQuestion` success | `listMineRoot()`, **and** `["question-bank", "search"]` with `exact: false` (prefix — busts EVERY cached search entry, both subject-mode and tag-mode variants, regardless of key shape) | `LIST_PATH` | a newly PUBLISHED question becomes cross-teacher-visible (FR-004/UC-902) — the broad prefix invalidate is necessary specifically BECAUSE `searchRoot`'s key shape is mode-conditional (§4): a narrower, shape-specific invalidate call would have to know which mode's key to target, which the publish action doesn't and shouldn't have to know. Default `refetchType: "active"` means only a currently-mounted search view eagerly refetches; an inactive one is just marked stale — matches lesson-plan's own accepted "won't see it until they switch scope" precedent. |
| `publishQuestion` onError `already-published` | none (query-cache) — same direct-refetch mechanism as update's race branch | — | |
| Any mutation onError, non-race branches (`not-found`, `not-visible`, `forbidden-edit`, `network-error`, `unknown`, field-validation types like `body-required`/`tag-limit-exceeded`/`invalid-difficulty`/`subject-not-found`/`type-not-supported`) | none | none | genuine validation/permission/transient failure must not perturb cache — content stays exactly as it was pre-mutation |
| `QUESTION_INVALID_CURSOR` mid-pagination | none (cache-level) | — | handled inside the `queryFn` itself — see §8 item 3 |

**Why this diverges from lesson-plan's shipped (zero client invalidation)
behavior:** lesson-plan accepted a 30s window where the client's
`listMineRoot()` cache could show pre-mutation data after navigating back
from the builder (masked in practice because `revalidatePath` + a fresh page
load usually wins the race, and 30s is short). For question-bank I close
this explicitly with `invalidateQueries` calls, because it costs nothing
extra (`queryClient` is trivially available via `useQueryClient()` in the same
client hook already calling the Server Action) and removes a latent
correctness gap rather than silently re-shipping it. This is a deliberate
improvement, not a requirement mismatch — flag to `fe-lead` only if it's
considered scope creep; I judge it in-scope since I own the invalidation map
per this role's mandate.

---

## 6. `already-published` Race Handling (AC-905.6 / AC-904.8)

Mirrors lesson-plan's UC-905 mechanism, adapted to the fact that question-bank
has no client `detail(id)` query to invalidate (§3):

```ts
const resyncLocked = useCallback(async (id: string) => {
  const res = await vm.refetchAction(id);      // Server Action → makeGetQuestionUseCase()
  if (res.ok) {
    setLocalStateFrom(res.question);           // status→PUBLISHED, publishedAt set,
                                                // form/local fields re-seeded from the
                                                // server-confirmed value (isDirty cleared)
  }
  queryClient.invalidateQueries({ queryKey: questionBankKeys.listMineRoot() });
  queryClient.invalidateQueries({ queryKey: ["question-bank", "search"], exact: false });
  toast.info(t("toast.published"));            // INFORMATIONAL toast — NEVER a red error
                                                // banner (AC-905.6/AC-904.8 explicit)
}, [vm, queryClient, t]);
```

Sequence: **refetch (direct Server Action call) → local-state resync (locks
the UI via the same `status === "PUBLISHED"` derivation FR-011 already uses
everywhere else — no separate "force-locked" boolean, single source of
truth) → list-cache invalidation (so the list reflects the true state next
render) → informational toast**. No red banner path exists for this failure
type anywhere in the mapping (§6.5 of spec.md: "Benign — refresh to
locked/PUBLISHED view + informational toast, NEVER a red error banner" — the
strongest possible wording in the spec, stronger than lesson-plan's own
copy, so this must not regress to a banner even inadvertently).

---

## 7. Filter-Change-Mid-Flight Cancellation Strategy (plan.md §0 item 3 — my call)

**Decision: key-based isolation (TanStack's built-in per-key mechanism) +
FR-013's debounce — NOT `AbortSignal`, NOT `keepPreviousData`.**

Reasoning:
1. **Correctness is already guaranteed by the key shape, not by
   cancellation.** Every filter that can change mid-flight and matters for
   correctness (`subjectId`, `tag`, and — mode-conditionally — `gradeLevel`/
   `difficulty`) is a **key segment** (§4). A response for a stale
   combination can only ever write to its own, now-unobserved cache entry;
   it can never render under the currently-active key. This is the identical
   mechanism lesson-plan's browse-by-subject already relies on (its own
   state-architecture.md §8 item 3), now extended to a 4-dimensional
   mode-conditional key instead of a 2-dimensional one — same guarantee, more
   dimensions.
2. **`AbortSignal` cannot meaningfully reach a Next.js Server Action.** The
   repository call happens server-side, invoked via an RPC-style Server
   Action from the client; there is no standard mechanism to propagate a
   client-issued `AbortController` signal into an already-dispatched Server
   Action invocation the way you would with a raw `fetch()`. Wiring a
   `queryFn`'s `signal` through to `vm.searchAction(...)` and having it
   actually cancel the in-flight server-side HTTP call would need bespoke
   plumbing with no proven precedent in this codebase (checked: lesson-plan
   doesn't do this either). Not worth building for a gate that's already
   protected by key isolation.
3. **`keepPreviousData` is the wrong UX call here specifically**, even
   though it's tempting for "don't flash a skeleton on every filter tweak":
   the mandatory-filter-gate UX (FR-002/003) has a HARD requirement that the
   `requiredFilterGate` state render distinctly and immediately when the gate
   becomes unsatisfied (AC-902.4, "clearing both filters reverts to the
   gate") — `keepPreviousData` would, by design, keep showing the previous
   (satisfied-state) results on screen while the query is `enabled: false`,
   which is the literal wrong behavior for this AC. So `keepPreviousData` is
   deliberately NOT used for the gate transition. It MAY be reasonable for
   the strictly-narrower case of "user is already in a satisfied state and
   tweaks `gradeLevel`/`difficulty` within subject-mode" (avoids a skeleton
   flash on a same-subject refinement) — left as an engineer-level polish
   option, not a requirement, since NFR-006 only requires a skeleton within
   ≤100ms, not that a skeleton never appear.
4. **FR-013's 300–400ms debounce** already suppresses the vast majority of
   redundant mid-flight requests for the tag-typing path (the highest-churn
   input) before a request is ever issued at all — cancellation would only
   matter for requests that debounce didn't prevent, which the key-isolation
   mechanism already handles correctly (if wastefully — one extra completed
   network round trip whose result nobody reads). Accepted cost, not a
   regression risk.

**Net effect:** a user rapidly toggling scope, subject, or typing a tag never
sees stale/flickering results (mode/param changes always resolve to a fresh
key, isolating any late response); the only cost is occasional wasted
network bandwidth for a response that arrives after its key stopped being
active, which is judged acceptable given FR-013 already bounds request
frequency.

---

## 8. Race Conditions & Resolution (full list)

1. **`QUESTION_ALREADY_PUBLISHED` on save-draft or publish** (AC-904.8/
   AC-905.6) — resolved by direct `refetchAction` call + local-state resync +
   list-cache invalidation + informational toast. Full mechanism in §6.
2. **Mode switch mid-flight** (tag-mode ↔ subject-mode, or scope mine ↔
   search) — resolved natively by the mode-conditional key shape (§4/§7): a
   mode change is always a different key, so a late response for the
   abandoned mode can never render under the new mode's active key.
3. **`QUESTION_INVALID_CURSOR` mid-pagination** — handled inside the
   client-side list-fetch wrapper passed to `useInfiniteQuery`'s `queryFn`:
   on receiving this failure, the wrapper silently re-invokes the use-case
   with `cursor: undefined` and returns that page-1 result in place of the
   stale requested page, instead of throwing (matches lesson-plan's
   `AC-006.6`-equivalent silent-recovery pattern exactly). The domain
   use-case itself still returns the typed failure honestly per
   `.claude/rules/api-integration.md`; this is a query-layer reaction
   decision, not a change to the failure-mapping contract.
4. **Concurrent edits across two tabs of the same teacher on the same
   DRAFT** (no version/ETag field on `QuestionResponse`, §6.3) — plain
   last-write-wins overwrite, matching the BE's own lack of optimistic-
   concurrency control. Not the `already-published` race (that has an
   explicit BE error code); do not invent client-side version checking.
5. **Double-submit: Save Draft and Publish both triggerable while one is
   in-flight** — resolved by a mutual in-flight guard (`isBusy = isSaving ||
   isPublishing`, disable both CTAs whenever true), identical to lesson-plan.
   Avoids an ambiguous UI where the publish-confirm dialog could open mid-
   save, and avoids needing request cancellation for a Server Action call
   that isn't specified as abortable (§7 reasoning applies here too).
6. **Rapid gradeLevel/difficulty toggling within an already-satisfied
   subject-mode search** — each toggle is a new key segment (§4), so late
   responses for an abandoned combination write to their own unobserved
   cache entry; no flicker risk, same mechanism as item 2, called out
   separately because it's the literal scenario the "single most important
   decision" (§4) exists to protect.

---

## Cross-references

- `spec.md` §6 (Data & Integration, FR-005 client/server split table §3,
  failure union §6.4), UC-902 AC-902.1/.4/.8/.12/.13/.14, UC-904/UC-905
  AC-904.8/AC-905.6.
- `plan.md` §0 item 3 (cancellation strategy, my call), §6 (hand-off sketch
  this document finalizes — including the explicit "single most important
  state decision" flag, resolved in §4).
- Sibling precedent: `src/features/lesson-plan/**` (US-E11.8) — both its
  `state-architecture.md` design doc AND its actually-shipped code were
  read; this doc explicitly notes where the two diverge and which one
  question-bank follows.
- Repo memory: `query-key-conventions.md` (key factory shape, client-filter
  vs server-param rule), `rsc-readonly-pattern.md` (RSC-seeded `initialData`
  pattern, RSC + local-state builder pattern).
