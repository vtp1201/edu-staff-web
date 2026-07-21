---
name: feedback-agent-relay-resilience
description: How to recover when a spawned specialist agent dies mid-task (API disconnect) instead of stalling
metadata:
  type: feedback
---

When a background specialist agent (e.g. fe-nextjs-engineer) is reported
`failed` due to a connection drop mid-response, do NOT treat its work as lost
or restart from scratch. Check observable on-disk state first: `git status`,
`git log <branch> --oneline`, and directly `Read` the files it already wrote.
In the US-E20.2 run, an engineer agent died after reporting "37 tests green,
now writing Storybook stories" — everything through the domain/infra/DI/
presentation/wiring/i18n layers was already correct and complete on disk,
only the Storybook stories file was missing.

**Why:** the harness's async agent model means a `failed` status reflects the
*connection*, not necessarily the work — file writes already landed are real
and don't need to be redone. Restarting from scratch wastes an entire
implementation pass that was actually fine.

**How to apply:** on a mid-task agent failure, (1) verify current branch,
(2) `git status`/`git log` to see what's committed vs uncommitted,
(3) commit the good uncommitted work immediately in logical layer-scoped
chunks (don't let a large diff sit uncommitted — a second interruption could
lose it) before doing anything else, (4) finish only the genuinely missing
piece yourself or via a fresh, narrowly-scoped agent call, (5) then resume the
normal review/gate/merge pipeline. Chunked commits (domain+infra+DI →
presentation+wiring+i18n → docs packet → tests) also made it trivial to see
exactly what the crashed agent had actually finished.
