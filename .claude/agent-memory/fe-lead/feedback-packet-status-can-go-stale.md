---
name: feedback-packet-status-can-go-stale
description: story.md ## Status field can lag behind reality after merge — verify against Harness DB + TEST_MATRIX.md, not the prose file, before assuming a US needs (re)implementation
metadata:
  type: feedback
---

Before implementing a US assigned as "planned", verify actual state first:
`git log --oneline --all | grep <US-id>`, `harness-cli query sql "select * from
story where id='<US-id>'"`, and `grep <US-id> docs/TEST_MATRIX.md`. If the
Harness DB shows `status=implemented` with all proof flags set and
TEST_MATRIX confirms it, the work is done — the packet's own `story.md`
`## Status` line is just stale prose that never got updated post-merge.

**Why:** happened twice now — US-E20.1 (already implemented, packet said
planned) and US-E21.2 (fully implemented+merged `c6ff397`, reviewed, QA'd
2285 tests, Harness DB already `implemented`/1/1/1/1 — only `story.md`
Status said "planned"). The prose file is not the source of truth; the
Harness DB + TEST_MATRIX are. Fix is a one-line edit + plain commit to main
(no feature branch needed for a doc-only status correction — nothing else
changed).

**How to apply:** always run this check FIRST for any assigned US, even
when the request describes a full pipeline to run. Report reconciliation
instead of re-running the pipeline when this happens — don't re-implement.
See [[project-e20-parent-links]], [[project-e21-tenant-invitations]] for the
two confirmed instances.
