# US-E07.6 Pagination active-state accessible primary token (contrast ≥ 4.5:1)

## Status

implemented

## Lane

tiny

## Dependencies

- Depends on: US-E07.2 (--edu-primary-dark token established)
- Blocks: none
- Feature module(s) chạm: `src/features/admin-roster/presentation/student-roster-screen/`
- Shared contract/file: `src/app/tokens.css`, `src/app/globals.css`

## Product Contract

Finding A11Y-005 from the US-E12.4 roster audit: the active pagination button uses
`#4570EA` (--edu-primary-dark) on white background = 4.41:1, which is 0.09 under
the WCAG AA 4.5:1 threshold for normal text (12px bold).

A dedicated `--edu-primary-accessible` token (`#4468e0`, contrast 4.88:1 on white)
must be added and applied to the pagination active state.

## Acceptance Criteria

- [ ] Token `--edu-primary-accessible` added to `src/app/tokens.css` (≥4.5:1 on white, documented contrast)
- [ ] Mapped in `src/app/globals.css` `@theme` as `--color-edu-primary-accessible`
- [ ] `docs/product/design-system.md` synced with the new token
- [ ] ADR 0031 Accepted documenting the new token
- [ ] `roster-pagination.tsx` active state uses `bg-edu-primary-accessible` instead of `bg-primary`
- [ ] `bun vitest run` passes (194+ tests)
- [ ] `bun build` green, `tsc --noEmit` clean

## Implementation Notes

- New token: `--edu-primary-accessible: #4468e0` (4.88:1 on white)
- Active pagination button: `border-edu-primary-accessible bg-edu-primary-accessible text-white`
- The shared `components/ui/pagination/` uses `buttonVariants` with `outline` variant
  for active — it does not render custom background so no change needed there
- The shadcn `--primary` semantic var remains `--edu-primary-dark` for all other uses
  (buttons, links, etc. which use large/bold text meeting 3:1 for UI components)

## Test Matrix Row

| US-E07.6 | Pagination active-state WCAG AA token #4468e0 (4.88:1 on white) | no | no | no | yes | planned | none |
