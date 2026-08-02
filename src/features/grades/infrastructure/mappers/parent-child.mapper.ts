import type {
  ChildColor,
  ChildSummary,
} from "../../domain/entities/grade-book.entity";
import type { LinkedStudentItemDto } from "../dtos/linked-student-item.dto";

/** `ChildSummary.color` palette, cycled by stable roster position. */
const CHILD_COLORS: readonly ChildColor[] = [
  "primary",
  "success",
  "warning",
  "error",
  "purple",
];

/**
 * 2-char avatar initials — first + last word of a Vietnamese display name
 * ("Nguyễn Minh Khoa" → "NK"). A one-word name yields one letter.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Real-mode mapper for the parent child-switcher (US-E18.33). Joins `core`'s
 * `linked-students` rows (which children) with IAM's narrowed-tier batch
 * lookup (their names, ADR-0120).
 *
 * Four fields are DERIVED — the wire sends none of them:
 * - roster ORDER comes from a stable `linkId`-ascending sort, never raw
 *   response order (BE does not guarantee it stable across refetches, and the
 *   order drives both the color assignment and which child is selected first);
 * - `ordinal` = the 1-based position in that stable order;
 * - `avatar` = initials of the resolved name, or the ordinal digit when no
 *   name resolved (never fake initials off a uuid);
 * - `color` cycles the 5-token palette from that same stable index.
 *
 * A name the batch lookup omitted (unknown / other-tenant / lookup failed)
 * leaves `name` ABSENT — a cosmetic degradation, never an error (staffing +
 * invitations precedent). It deliberately does NOT fall back to the raw
 * memberId: that uuid would become the switcher tab's accessible name. The
 * presentation layer owns the fallback COPY ("Con thứ N") because
 * infrastructure never translates (i18n.md) — identical to the sibling
 * `toTimetableChildren` → `ChildPicker` pair.
 *
 * `className` is absent OR null for a child with no current enrollment — the
 * two are equivalent by BE design (US-148 D5) and both normalise to `""`,
 * which the switcher renders as its `classPending` copy. Again: no copy here.
 */
export function toParentChildren(
  links: LinkedStudentItemDto[],
  names: Map<string, string>,
): ChildSummary[] {
  return [...links]
    .sort((a, b) => a.linkId.localeCompare(b.linkId))
    .map((link, index) => {
      const resolved = names.get(link.studentMemberId);
      return {
        childId: link.studentMemberId,
        // Conditional spread, not `name: resolved` — a materialised
        // `name: undefined` key would still read as "the wire had a name".
        ...(resolved ? { name: resolved } : {}),
        className: link.className ?? "",
        ordinal: index + 1,
        avatar: resolved ? initialsOf(resolved) : String(index + 1),
        color: CHILD_COLORS[index % CHILD_COLORS.length] ?? "primary",
      };
    });
}
