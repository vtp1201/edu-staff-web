import type { ParentConsentFailure } from "@/features/parent-links/domain/failures/parent-consent.failure";
import type { LinkedStudentsWithConsents } from "@/features/parent-links/domain/use-cases/get-linked-students-with-consents.use-case";
import type { Result } from "@/features/parent-links/domain/use-cases/result";
import type {
  ChildOverviewCardVM,
  ChildrenOverviewFetchResult,
} from "./children-overview-screen.i-vm";

/**
 * Projects the shared US-E20.2 use-case output onto this screen's card VMs
 * (US-E20.4). The consent dictionary is deliberately dropped — the overview
 * shows identity + navigation only; consent management stays in the profile
 * section (AC-004).
 *
 * `forbidden` keeps its own key so a scoping rejection can never be rendered as
 * "you have no children" (the same reasoning as US-E20.2's AC-002.2).
 */
export function buildChildrenOverviewVM(
  result: Result<LinkedStudentsWithConsents, ParentConsentFailure>,
): ChildrenOverviewFetchResult {
  if (!result.ok) {
    return {
      success: false,
      errorKey:
        result.failure.type === "forbidden" ? "forbidden" : "network-error",
    };
  }
  const children: ChildOverviewCardVM[] = result.value.students.map((s) => ({
    studentId: s.studentId,
    fullName: s.fullName,
    avatarUrl: s.avatarUrl,
  }));
  return { success: true, children };
}

/**
 * Href of the EXISTING per-child academic-record route. `basePath` is the
 * tenant-scoped `/t/{tenant}/parent/children` prefix computed by the RSC page
 * (the client screen has no access to the tenant segment).
 */
export function academicRecordHref(
  basePath: string,
  studentId: string,
): string {
  return `${basePath}/${encodeURIComponent(studentId)}/academic-record`;
}
