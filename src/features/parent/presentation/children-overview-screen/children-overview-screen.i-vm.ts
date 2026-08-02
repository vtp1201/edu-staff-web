/**
 * One linked child as the overview grid renders it (US-E20.4).
 *
 * Deliberately narrower than `ParentConsentChildVM`: no `consent` object and no
 * `linkId` — this screen must not surface consent state (AC-004), and the link
 * row id is an internal identifier with no display purpose here.
 */
export interface ChildOverviewCardVM {
  studentId: string;
  /** Real, server-resolved name — never an ordinal fallback on this screen. */
  fullName: string;
  avatarUrl?: string;
}

/** Screen fetch result — stable `errorKey`, never a translated string (i18n.md). */
export type ChildrenOverviewFetchResult =
  | { success: true; children: ChildOverviewCardVM[] }
  | { success: false; errorKey: "forbidden" | "network-error" };
