---
name: project-e16-impeccable-fixes
description: E16 DR-009 impeccable anti-pattern fixes — US-E16.1–E16.5 all implemented on one shared branch
metadata:
  type: project
---

US-E16.1–E16.5 all implemented on branch `feat/us-e16-dr009-impeccable-fixes` (merged + deleted 2026-06-21). 858 tests passing, tsc/lint/build green. Tech-lead Approved, A11Y-Pass, DR-PASS.

**Why:** DR-009 impeccable audit found 5 anti-patterns (side-stripe, error contrast, a11y gaps, width transitions, bounce easing). All 5 are presentation-only visual fixes with no domain/infra changes.

**Key implementation decisions:**
- All 5 stories shared files (`tokens.css`, sidebar, header, card) → used ONE shared branch instead of 5 per-US worktrees to avoid conflicts.
- Card interactive variant → used native `<button>` element (not div+role) after Biome rejected `noStaticElementInteractions`/`useSemanticElements`.
- scaleX pattern: `style={{ transform: 'scaleX(N)' }}` + `origin-left` + `motion-safe:transition-[transform]` across 4 progress bar files.
- Sidebar grid wrapper: outer `<div style={{ display:'grid', gridTemplateColumns: '${W}px' }}` + `motion-safe:transition-[grid-template-columns]`; inner `<aside min-w-0 overflow-hidden>`; extracted `sidebar-grid.ts` for testability.
- TypingIndicator: `msg-typing` keyframe in globals.css + `.msg-typing-dot` class; gated by global `prefers-reduced-motion: reduce` reset block.
- Pure helper extraction pattern (testable in node env without @testing-library): `urgentCardClass()`, `conversationItemStateClass()`, `scheduleRowClass()`, `parentRowClass()`, `fillTransform()`, `sidebarGridStyle()` — consistent with stat-card.test.ts precedent.

**2 non-blocking follow-up items noted by A11Y:**
- MINOR-001: bell notification dot always renders (not gated on real data) — no sr-only "unread" text
- MINOR-002: sidebar NavLink missing explicit `focus-visible:ring-2 focus-visible:ring-ring` (relies on global UA outline)

**How to apply:** When doing another multi-story fix that touches shared primitives, use one shared branch with sequential per-concern commits rather than parallel worktrees.
