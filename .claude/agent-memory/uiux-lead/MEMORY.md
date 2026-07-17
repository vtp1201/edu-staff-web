# uiux-lead Memory Index

- [Pipeline conventions](pipeline-conventions.md) — what worked in DR-001 trial pipeline run
- [Token: edu-warning-text ADR 0046](token-warning-text.md) — #9A6A0F pattern in 7 handoff screens
- [DR-002 reconcile result](dr-002-reconcile.md) — grade-book screens already implemented; design-spec was the only gap
- [DR-003 reconcile pattern](dr-003-reconcile-pattern.md) — teaching-plan: already implemented + handoff JSX exists; only gap was design-spec.jsonc entry; zero new i18n keys
- [DR-004 reconcile pattern](dr-004-reconcile-pattern.md) — lesson-bank: fully implemented US-E11.2 (stale DR said US-E13.3); design-spec was only gap; 3rd confirmation of reconcile pattern
- [DR-005 reconcile pattern](dr-005-reconcile-pattern.md) — exam-bank: fully implemented US-E11.3 (stale DR said US-E13.4); design-spec was only gap; 4th confirmation + builder screen spec (~450 lines)
- [DR-006 reconcile pattern](dr-006-reconcile-pattern.md) — notifications: fully implemented US-E10.2; JSX 661 lines + 30 i18n keys exist; design-spec screens.notifications was only gap; 5th confirmation
- [DR-007 reconcile pattern](dr-007-reconcile-pattern.md) — announcements: fully implemented US-E10.3; JSX 1641 lines + 80+ i18n keys exist; design-spec was only gap; 6th confirmation; US-E10.3 correct (not stale)
- [DR-008 reconcile pattern](dr-008-reconcile-pattern.md) — group-chat: JSX 1953 lines fully built; DR said "net-new" but reconcile pattern held; gaps were design-spec groupChat + 5 new i18n sub-namespaces; US header said E10.1 → corrected to E10.4; 7th confirmation
- [DR-009 impeccable retrofit pattern](dr-009-reconcile-pattern.md) — post-impeccable mockup fixes; commit type must be chore(design-mockup) not design(); 5 concerns = US-E16.1–5; sync file at design_src/CLAUDE_DESIGN_SYNC.md
- [DR-010 cross-cutting pattern](dr-010-pattern.md) — responsive+empty-state DR: no new JSX file needed for cross-cutting patterns; design-spec.jsonc is sufficient; all i18n keys existed; tmp-handoff fully synced fixes A-E
- [DR-011 interaction patterns](dr-011-pattern.md) — 6 P2+P3 UX issues as 1 DR; no JSX; design-spec interactionPatterns + 21 new i18n keys; adminSchoolSetup (not adminSetup) is the correct namespace
- [DR-012..019 batch reconcile pattern](dr-012-019-batch-reconcile-pattern.md) — 8-screen group-B batch on ONE combined branch (deviation from 1-DR-1-branch, justified when user requests atomic batch + zero contention); designer/ux-writer/docs-manager task split; uiux-ux-writer had no Bash — lead must verify+commit on its behalf
- [DR-020 net-new pattern](dr-020-net-new-pattern.md) — first negative already-implemented check in a long streak; lean-pipeline shortcut (skip PM/researcher/brainstormer/design-system-builder when patterns are fully established, documented why in DR); docs-manager must NOT pre-check design-review-gate box — lead self-audits and adds real Evidence section
- [DR-021 parallel i18nKey reconcile](dr-021-parallel-i18nkey-reconcile.md) — designer+ux-writer in parallel causes i18nKey annotation drift in design-spec.jsonc, lead must diff against real JSON; `bun build` != `bun run build`; stash stray cross-team memory edits before branch switches
