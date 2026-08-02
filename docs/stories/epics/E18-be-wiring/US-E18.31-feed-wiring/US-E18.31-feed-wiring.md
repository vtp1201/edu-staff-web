# US-E18.31 Feed wiring (Post/Comment author denormalization)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/feed/` (US-E19.1's mock feature)
- Shared contract/file: `PostResponseDto`/`CommentResponseDto` (social service)

## Product Contract

BE US-165 denormalizes `authorName`/`authorRole` directly onto `Post` and
`Comment` responses (`social` service) — `avatarUrl` is reserved on the wire
but ALWAYS null today (do not build UI that assumes it's populated; use the
existing initials-avatar fallback pattern). This un-mocks US-E19.1's feed
screen (currently entirely mock, per the epic).

## Relevant Product Docs

- `docs/product/screens.md` — Feed screen row (US-E19.1)

## Acceptance Criteria

- Feed screen shows real author name + role badge per post/comment in real
  mode, sourced from the denormalized wire fields (no client-side batch-lookup
  needed for this — ground-truth whether US-E18.23's `iam-directory` batch
  resolver is still needed for anything else on this screen before removing
  it wholesale).
- Avatar renders via the existing initials-fallback pattern (since
  `avatarUrl` is reserved-but-always-null — do not treat a null avatarUrl as
  an error/loading state).
- `bootstrap/di/feed.di.ts` (or equivalent) flips from force-mock to
  `USE_MOCK ? Mock : Real`.
- Zero regression to existing feed screen tests/stories.

## Design Notes

- Commands: whatever mutation actions already exist (create post/comment) —
  unaffected by this wiring, out of scope unless they also need the
  author-field shape update.
- Queries: `GET /posts`/`GET /posts/{id}/comments` (or equivalent — ground-truth
  exact paths against `services/social/docs/openapi.yaml`).
- API: `social` service.
- Domain rules: `authorRole` drives the existing role-badge rendering
  convention (reuse `ROLE_LABEL_KEY`/role-color mapping already established
  elsewhere, do not invent a new one).
- UI surfaces: `src/features/feed/presentation/` (existing).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | mapper test (author fields, null-avatarUrl handling) |
| Integration | repository test against the real DTO shape |
| E2E | Storybook: real-author-name story, null-avatar-fallback story |
| Platform | `bun build` clean both modes |
| Release | design-review gate + a11y (role badge contrast, avatar fallback a11y) |

## Harness Delta

Registered via `harness-cli story add --id US-E18.31`.

## Evidence

(fill after implementation)
