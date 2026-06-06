# Agent Instructions

> Injected at session start (SessionStart hook → `cat AGENTS.md`, decision `0015`).
> `.claude/CLAUDE.md` và `.claude/rules/*` được Claude Code tự load; file này là
> chỉ mục bootstrap cho cả Claude Code lẫn các agent khác.

## Trước khi làm việc (project)

- **Intake mọi prompt** qua `docs/FEATURE_INTAKE.md` → chọn lane (tiny/normal/high-risk).
- **Rules bắt buộc** (`.claude/rules/`): `tdd.md` (TDD, decision `0016`),
  `design-system.md`, `accessibility.md`, `tailwind-v4.md`, `api-integration.md`
  (contract BE + service map `0017` + token hybrid `0018`), `impeccable.md`.
- **Story UI** phải qua design-review gate `docs/DESIGN_REVIEW.md` trước khi đóng.
- **Design**: token runtime `src/app/tokens.css`; spec màn `docs/product/design-spec.jsonc`
  + `docs/product/screens.md`; legacy = visual spec, không phải kiến trúc (decision `0011`).
- **Data**: mock-first qua `NEXT_PUBLIC_USE_MOCK` + `bootstrap/lib/mock.ts`
  (`USE_MOCK ? Mock : Real` trong DI factory) — decision `0014`.
- **Decisions** ở `docs/decisions/`; ghi durable bằng `scripts/bin/harness-cli`.

<!-- HARNESS:BEGIN -->
## Harness

This repo uses Harness. Before work, read:

- `README.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTEXT_RULES.md`
- `scripts/bin/harness-cli query matrix` on macOS/Linux, or `.\scripts\bin\harness-cli.exe query matrix` on Windows

Use the Rust Harness CLI at `scripts/bin/harness-cli` on macOS/Linux or
`scripts/bin/harness-cli.exe` on Windows as the main operational tool.
<!-- HARNESS:END -->
