import type {
  ChildSwitcherChild,
  ChildSwitcherVM,
} from "@/components/shared/child-switcher";

/**
 * Assembles the optional parent child-selector VM for the academic-record
 * screen (US-E24.16).
 *
 * Deliberately NOT folded into `buildAcademicRecordVM`: the child list is a
 * SECOND, independent read whose failure must not touch the record read's own
 * error path (AC #3 — a lost child list costs the selector, never the record).
 * Keeping it a separate pure function lets the RSC page settle the two reads
 * side by side and lets this rule be proved without any HTTP seam.
 *
 * The parameter is typed as the shared component's own `ChildSwitcherChild`
 * rather than `grades`' `ChildSummary`: the two shapes are structurally
 * identical, and depending on the UI contract instead of another feature's
 * domain entity keeps this feature free of a cross-feature domain import while
 * still turning any future drift into a compile error at the call site.
 *
 * @returns `undefined` when there is nothing to switch between (< 2 children) —
 * this is the "hide when single" rule, owned by the caller-side VM the way
 * `grade-book-screen` owns its `showChildSwitcher` gate. A route `studentId`
 * that is not among the linked children still yields a VM: the switcher must
 * remain visible on the resulting `forbidden` screen, simply with no tab
 * selected (AC #4).
 */
export function buildChildSwitcherVM(
  childList: ChildSwitcherChild[],
  activeStudentId: string,
): ChildSwitcherVM | undefined {
  if (childList.length < 2) return undefined;
  return { childList, activeChildId: activeStudentId };
}
