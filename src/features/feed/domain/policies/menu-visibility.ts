import type { FeedRole, FeedScope } from "../entities/feed-post.entity";

export interface MenuVisibilityInput {
  viewerRole: FeedRole;
  viewerId: string;
  authorId: string;
  scope: FeedScope;
  /** Present only for class-scope posts. */
  classId?: string;
  /**
   * Class ids the viewer teaches — the teacher moderator boundary
   * ("classes they teach", per the confirmed [ASSUMPTION], carried as an
   * explicit input so a future BE answer is a one-parameter change, not a
   * rewrite). Ignored for non-teacher roles.
   */
  teacherClassIds?: readonly string[];
}

export interface MenuVisibility {
  canReport: boolean;
  canPin: boolean;
  canRemove: boolean;
}

/**
 * Is the viewer a moderator for THIS post (UC-1905 matrix, spec.md §2)?
 * - principal → any post, any scope.
 * - teacher   → only class-scope posts of a class they teach.
 * - student/parent → never.
 */
function isModerator(input: MenuVisibilityInput): boolean {
  if (input.viewerRole === "principal") return true;
  if (input.viewerRole === "teacher") {
    return (
      input.scope === "class" &&
      input.classId !== undefined &&
      (input.teacherClassIds ?? []).includes(input.classId)
    );
  }
  return false;
}

/**
 * "…" menu entry-point visibility (UC-1905/FR-006). Report shows for anyone
 * who is NOT the author; Pin/Remove show only for a moderator of the post
 * (AC-1905.1–.5). The trigger itself is absent when all three are false — that
 * "hide, not disable" decision belongs to presentation reading these booleans.
 */
export function menuVisibility(input: MenuVisibilityInput): MenuVisibility {
  const moderator = isModerator(input);
  const isAuthor = input.viewerId === input.authorId;
  return {
    canReport: !isAuthor,
    canPin: moderator,
    canRemove: moderator,
  };
}

/** True when zero entry points are entitled → hide the "…" trigger entirely. */
export function isMenuEmpty(v: MenuVisibility): boolean {
  return !v.canReport && !v.canPin && !v.canRemove;
}
