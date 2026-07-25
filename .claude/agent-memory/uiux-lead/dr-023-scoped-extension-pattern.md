---
name: dr-023-scoped-extension-pattern
description: DR-023 (parent-link audit trail, ADR 0064 backlog) — sub-section-in-existing-dialog pattern for a small feature extension; branch-delete gotcha
metadata:
  type: project
---

DR-023 extended the already-delivered DR-014 (Parent–Student Links) with a
read-only `LinkAuditEntry` audit trail (US-E20.3, backlog stub from ADR
`0064`, which forbids extending the shared `audit-log`/`AuditEntityType`
union — feature-scoped entity only, mirroring `academic-records`'
`SealAuditEntry` and `moderation`'s `AuditEntryEntity`).

## Placement decision worth reusing

When a small "history/audit trail" feature is requested for an
ALREADY-SHIPPED screen that already has a read-only detail dialog with an
established "scoped sub-section, own loading/error state, never blocks
sibling content" pattern (e.g. `pl-consent-detail-section.tsx`) — put the new
trail there as a SIBLING sub-section, not a new screen/tab/route. Only reach
for a screen-level table (like `academic-records`' `audit-trail-table.tsx`)
when the resource is inherently multi-entity/batch (many classes×terms×years
at once); a per-link/per-record trail belongs in the per-record dialog.

## Empty-state honesty for retrofitted trails

Any trail added AFTER a resource has existed for a while has EMPTY as the
DOMINANT initial state for old records (the trail didn't exist when they were
created) — copy must say "recording starts now," not imply something's
broken. Seed mock data accordingly: most existing seed rows get `[]`, only
1-2 get a populated sequence to demo the success state.

## Entry-shape mock-first discipline

When BE has no audit-emission endpoint (checked via ADR/service map), only
include fields the web itself can populate from its own mutations + current
session (`actorName` from `/users/me`, client-clock `occurredAt`, and only a
`note` field if an existing form actually captures one — e.g. create-dialog's
note field, but NOT unlink since its confirm dialog has no note input; don't
invent a "reason" field for unlink just to make entries symmetric).

## Branch-delete gotcha (git safety check)

After `git push origin main` succeeds, `git branch -d <branch>` can still
exit 1 with "not yet merged to refs/remotes/origin/<branch>" — this is git
comparing against the LOCAL remote-tracking ref, which is stale until
`git fetch --prune` or the remote branch is deleted. Order that works
cleanly: `git push origin --delete <branch>` FIRST, then `git branch -D
<branch>` (or `-d` after a `git fetch --prune`). Don't mistake this for the
`git push origin main` step itself having failed — check `git rev-parse
HEAD` vs `origin/main` to confirm the push actually landed before assuming
the whole chain failed.

## Cross-refs

[[dr-020-net-new-pattern]], [[dr-021-parallel-i18nkey-reconcile]] — same
parallel designer+ux-writer split (disjoint files: jsx+design-spec vs
messages), same lead-verifies-and-commits-for-ux-writer step (no Bash tool).
