/**
 * REAL `social` comment wire shape — `Comment` in
 * `edu-api/services/social/docs/openapi.yaml` (US-E18.31 ground-truth,
 * camelCase). Replaced the invented INT-190-05 shape: the wire says
 * `id`/`text`/`authorUserId`, and comments are immutable (no `updatedAt`).
 *
 * `authorName`/`authorRole`/`avatarUrl` are BE US-165 additions with the same
 * nullability caveats as `Post` (pre-migration-035 rows read back `null`, no
 * backfill; `avatarUrl` is reserved but always `null`, OQ-165-01).
 */
export interface FeedCommentResponseDto {
  id: string;
  postId: string;
  authorUserId: string;
  text: string;
  createdAt: string;
  authorName?: string | null;
  authorRole?: string | null;
  avatarUrl?: string | null;
}
