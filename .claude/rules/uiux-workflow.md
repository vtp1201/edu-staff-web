# Rule: UI/UX Design Team Workflow (upstream design-authoring, shared source)

The UI/UX team (`/uiux` → `uiux-lead`, `.claude/agents/uiux/`) is the **upstream** of
delivery: it authors design artifacts the FE team builds from, then hands off.

```
/uiux (design)  →  /ba (engineering spec)  →  /fe (implementation)
```

This rule is **cứng** for `uiux-lead`. It adapts the FE parallel-branch model
(`.claude/rules/parallel-workflow.md`, decisions `0025` + `0033`) to design work,
where contention is on **shared files**, not feature modules.

## Deliverables = canonical homes (NEVER a parallel doc tree)

| Artifact | Canonical home |
| --- | --- |
| Design request / brief | `docs/design-requests/DR-NNN-<slug>.md` (+ row in `README.md`) |
| High-fidelity reference mockup | `design_src/edu/<slug>.jsx` (uses `design_src/edu/tokens.js`; maps 1:1 to `src/app/tokens.css`) |
| Per-screen normative layout | an entry in `docs/product/design-spec.jsonc` |
| Design-system contract | `docs/product/design-system.md` (runtime truth: `src/app/tokens.css`) |
| Screen inventory | `docs/product/screens.md` |
| UX copy | i18n keys for `src/bootstrap/i18n/messages/{vi,en}.json` (vi source + en mirror) |
| Terminology | `docs/GLOSSARY.md` |
| Design changelog | `docs/design-changelog.md` (the only new file the team may create) |
| Token/palette/font/layout decision | ADR `docs/decisions/NNNN-*.md` (+ `harness-cli decision add`) |

FORBIDDEN parallel trees: `docs/design-guidelines.md`, `docs/design-tokens.yaml`,
`docs/ux-copy-*.md`, `docs/terminology.md`, `docs/wireframes/`, top-level `plans/`.

## Design system is supreme (decision 0011/0012/0044)

`src/app/tokens.css` + `.claude/rules/design-system.md` + the handoff baseline
(`design_src/edu/*.jsx`, `docs/product/design-spec.jsonc`) **win** over any trend,
awwwards reference, or `/impeccable` suggestion. The team may catch a11y/spacing/
state/hierarchy issues and design NEW screens *with the existing system*; it may NOT
reinvent palette/font/layout. A genuinely new token → **ADR first** (flagged by
`uiux-design-system-builder`, registered by `uiux-lead`), then `tokens.css` → `@theme`
in `globals.css` → sync `design-system.md`. No raw color, ever.

## Already-implemented check (before authoring — avoid i18n/design drift)

Design-authoring on a screen the FE team has ALREADY built causes drift (the DR-001 trial
added 51 `assessmentScheme` i18n keys onto an implemented screen → `/fe` had to prune dead
duplicates). Before designing, `uiux-lead` MUST grep `src/features/` + `src/app/` (and
`design_src/edu/<slug>.jsx`) for the target screen:

- **Already implemented** (feature folder + route + components + i18n keys exist) → treat as
  **reconcile/redesign**: read the existing implementation first; add only what's genuinely
  missing; **re-use the existing i18n keys** (extend, never regenerate a parallel set); flag
  the work as such in the DR.
- **Not implemented** → normal net-new authoring.

## Multi-team / parallel claim (shared source)

1. **Sync + claim check.** `git fetch --prune`. A remote `docs/dr-NNN-*` branch = a DR
   another session claimed; a `feat/us-*`/`fix/*` branch = FE work in-flight. If your DR/
   screen is claimed → STOP, tell the user.
2. **Shared-file dependency check.** Does this design edit a shared file an in-flight branch
   also edits — same `--edu-*` token in `tokens.css`, same `design-spec.jsonc` section, same
   `messages/{vi,en}.json` namespace, same screen? If yes → sequence (token ADR lands first)
   or pick another DR and explain why. `design_src/edu/*.jsx` are per-screen → low contention.
3. **Claim by early push.** 1 DR = 1 branch `docs/dr-NNN-<slug>` (type `docs` — design requests
   + `design_src/*.jsx` are reference/docs, not built `src/`; lefthook allows `docs/`).
   `git checkout main && git pull --ff-only` → `git checkout -b docs/dr-NNN-<slug>` →
   `git push -u origin HEAD`. The remote branch IS the lock.
4. **Work on the branch.** DR packet, `design_src/edu/<slug>.jsx`, `design-spec.jsonc` entry,
   copy keys, docs sync — never on `main`. **Verify `git branch --show-current` before EVERY
   commit** (shell state resets between calls). After each run, check
   `git log --oneline <branch>..HEAD` for commits that landed on the wrong branch.
5. **Finish → auto-merge** when done and the gate is green (`bun vitest run && bun build` —
   `design_src/*.jsx` aren't imported so they won't break it, but `tokens.css`/`globals.css`/
   `messages` edits CAN, so run it): `git fetch origin && git merge --no-ff origin/main` →
   `git checkout main && git pull --ff-only && git merge --no-ff docs/dr-NNN-<slug>`
   (`chore(design): merge docs/dr-NNN-<slug> (DR-NNN)`) → `git push origin main`. No PR.
   Never `--no-verify`.
6. **Delete the branch** (local + remote). Remote `docs/dr-*` list = the in-flight DR set.

### Within-session shared-file edits (serialize — no parallel writes)

Beyond cross-session branch contention, the lead and a spawned specialist can collide on the
SAME shared file inside one run (observed on the DR-001 trial: `uiux-designer` was editing
`docs/product/design-spec.jsonc` while the lead issued its own Edit on the same file → the
lead's Edit failed on stale state). Rule:

- The lead does NOT edit a shared file (`docs/product/design-spec.jsonc`, `src/app/tokens.css`,
  `src/app/globals.css`, `messages/{vi,en}.json`, `docs/product/design-system.md`) while a
  specialist that also writes it is still running. **Wait for that specialist to complete, then
  do any additive edit.**
- Give each shared file ONE writer per step. If two specialists must touch the same file, run
  them sequentially (not in the same `parallel` batch) — keep parallelism for independent files
  (e.g. `uiux-designer`→`design_src/edu/<slug>.jsx` + `uiux-ux-writer`→`messages/*` are safe in
  parallel; two writers of `design-spec.jsonc` are not).

## Handoff (end every /uiux run with this)

When a DR is delivered (jsx + design-spec entry + copy keys exist, design-review gate green,
DR marked `[x] delivered`): tell the user to run **`/ba`** (turn the design into an
engineering-ready spec + AC) then **`/fe`** (TDD implementation), pointing both at the DR +
`design-spec.jsonc` entry + `design_src/edu/<slug>.jsx`.

## Seams (no overlap)

- `uiux-product-manager` = product *what/why* (PRD). `ba-requirements-analyst` = engineering
  *how* (TR-XXX/AC). Don't write AC in `/uiux`.
- `uiux-design-system-builder` audits + proposes tokens; it does NOT mint a parallel YAML.
- `uiux-ux-writer` writes copy as i18n keys; `fe-nextjs-engineer` pastes them into `messages`.
- The team STOPS before `src/` app code — that's `fe-nextjs-engineer` only.

## Liên quan
- `.claude/rules/parallel-workflow.md` (FE model this adapts), `design-system.md`,
  `component-organization.md`, `accessibility.md`, `i18n.md`, `impeccable.md`.
- `docs/design-requests/README.md`, `docs/product/design-spec.jsonc`, `docs/DESIGN_REVIEW.md`.
- `.claude/CLAUDE.md` §Agent Teams.
