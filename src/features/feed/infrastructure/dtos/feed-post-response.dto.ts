/**
 * Presigned image attachment (`Media`, BE US-128). `url` is a ~15-minute
 * presigned S3 GET resolved at READ time — never persist/cache it.
 *
 * NOT surfaced to the domain today: `FeedAttachment` is a caption-only
 * placeholder with no `url`, and `FeedImageGrid` renders a striped placeholder
 * tile, so there is no honest way to display a real image yet (blocking gap #3,
 * see `bootstrap/di/feed.di.ts`).
 */
export interface FeedMediaDto {
  mediaId: string;
  url: string;
  expiresAt: string;
}

/**
 * REAL `social` post wire shape — `Post` in
 * `edu-api/services/social/docs/openapi.yaml` (US-E18.31 ground-truth,
 * camelCase). This REPLACED the invented INT-190-01/02 shape US-E19.1 mocked
 * against: the wire says `id`/`textBody`/`isPinned`/`authorUserId`, carries no
 * per-type reaction counts, and no `attachments[]`.
 *
 * `authorName`/`authorRole`/`avatarUrl` are BE US-165 additions — denormalized
 * onto the row at write time, so a feed read needs NO per-author profile
 * lookup. All three are NULLABLE and absent from the schema's `required` list:
 * posts created before migration 035 read back `null` (no backfill), and
 * `authorRole` is `null` when the author held no member role. `avatarUrl` is
 * reserved but ALWAYS `null` today (OQ-165-01) — the mapper never reads it.
 *
 * `poll` / `event` / `achievement` exist on the wire (US-120/121/122) but the
 * feed screen has no surface for them, so they are deliberately not modeled.
 */
export interface FeedPostResponseDto {
  id: string;
  authorUserId: string;
  /** `SCHOOL` | `CLASS` | `CLUB` (UPPERCASE on the wire). */
  scope: string;
  tenantId?: string;
  /** Present only when `scope === "CLASS"`. */
  classId?: string | null;
  /** Present only when `scope === "CLUB"` (US-123). */
  clubId?: string | null;
  textBody: string;
  linkUrl?: string | null;
  /** Single denormalized total (ADR 0080) — NOT per reaction type. */
  reactionCount?: number;
  /** `like|love|haha|wow|sad|angry` — the real taxonomy (blocking gap #2). */
  callerReaction?: string | null;
  commentCount?: number;
  isPinned?: boolean;
  createdAt: string;
  media?: FeedMediaDto | null;
  authorName?: string | null;
  authorRole?: string | null;
  avatarUrl?: string | null;
}

/**
 * `data` payload of both feed-read endpoints (`FeedPage`, US-101 / ADR 0083) —
 * an OBJECT, not a bare `Post[]`. `pinnedPost` is fetched independently of the
 * chronological page and is populated ONLY on the first page (null afterwards),
 * so a pin living in an older cursor bucket still surfaces at the top.
 */
export interface FeedPageResponseDto {
  posts: FeedPostResponseDto[];
  pinnedPost?: FeedPostResponseDto | null;
}
