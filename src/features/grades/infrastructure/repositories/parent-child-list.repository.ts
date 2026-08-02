import "server-only";
import type { AxiosInstance } from "axios";
import { GRADES_EP } from "@/bootstrap/endpoint/grades.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { ChildSummary } from "../../domain/entities/grade-book.entity";
import type { GradesFailure } from "../../domain/failures/grades.failure";
import type { IChildListRepository } from "../../domain/repositories/i-grade-book.repository";
import type { LinkedStudentsResponseDto } from "../dtos/linked-student-item.dto";
import { toParentChildren } from "../mappers/parent-child.mapper";

/**
 * `memberId → displayName` resolver, injected by `bootstrap/di/grades.di.ts`
 * from `iam-directory`'s `BatchResolveMembersUseCase` (the ONE batch-lookup
 * client in this app — do not add a second). Composing across features belongs
 * in `bootstrap/di`, never inside a feature's own layers (decision 0017), so
 * this repository sees a plain function and never spans two services.
 *
 * Contractually never throws and never reports per-id: ids it cannot resolve
 * are simply absent from the returned map.
 */
export type ResolveChildNames = (
  memberIds: string[],
) => Promise<Map<string, string>>;

/**
 * Real parent child-switcher roster (US-E18.33) — un-mocks ADR 0054's
 * "permanent" mock.
 *
 * ADR 0054 force-mocked this because the roster endpoint carries no display
 * name and no directory endpoint a PARENT could call resolved one. IAM
 * ADR-0120 removed exactly that blocker: `GET /members?ids=` is now callable
 * by any tenant member, returning `memberId + displayName` for a
 * PARENT-tier caller. So the roster is now a genuine two-source composition:
 *
 * 1. `core` `GET /members/{selfId}/linked-students` — the AUTHORITY for which
 *    children this parent has. `{selfId}` is the token's own `sub`, resolved
 *    in DI; the client never supplies a parent id, and BE additionally rejects
 *    a PARENT asking about anyone else (`PARENTLINK_FORBIDDEN`).
 * 2. IAM `GET /members?ids=` — decoration ONLY, and only for the ids step 1
 *    returned. It is not an existence oracle and must never be handed an id
 *    the link list did not produce.
 *
 * The name lookup is best-effort: a failure degrades every row to its raw
 * memberId rather than failing the screen (staffing/invitations precedent).
 * The roster read itself is NOT best-effort — without it there is no roster.
 */
export class ParentChildListRepository implements IChildListRepository {
  constructor(
    private readonly http: AxiosInstance,
    /** The signed-in parent's memberId (token `sub`); `null` = unidentifiable. */
    private readonly parentMemberId: string | null,
    /**
     * Optional so wire-level tests can construct the repository with just an
     * http client. Absent = every row keeps the raw-id fallback — a degraded
     * display, never an error (same convention as `staffing.repository.ts`).
     */
    private readonly resolveNames?: ResolveChildNames,
  ) {}

  async getChildList(): Promise<ChildSummary[]> {
    if (!this.parentMemberId) {
      // No network call: an unidentifiable caller has no roster to show, and
      // probing the endpoint with a guessed id would be exactly the misuse the
      // BE 403 exists to stop.
      throw { type: "not-found" } satisfies GradesFailure;
    }

    let links: LinkedStudentsResponseDto["links"];
    try {
      // Flat `{ links: [...] }` object — not cursor-paginated, so no
      // `raw: true` / paging handling applies.
      const dto = (await this.http.get(
        GRADES_EP.linkedStudents(this.parentMemberId),
      )) as unknown as LinkedStudentsResponseDto;
      links = dto?.links ?? [];
    } catch (err) {
      // BE returns the same 403 for "not this parent" as for a probe, so the
      // honest client state is "no roster" (which the screen renders as its
      // empty state), not a distinguishable permission error.
      if (errorCodeOf(err) === "PARENTLINK_FORBIDDEN") {
        throw { type: "not-found" } satisfies GradesFailure;
      }
      throw { type: "network-error" } satisfies GradesFailure;
    }

    return toParentChildren(links, await this.childNameMap(links));
  }

  /**
   * Names for EXACTLY the ids the link list returned, in one batch call.
   * Never throws: a lookup error degrades to an empty map, which the mapper's
   * raw-id fallback then covers.
   */
  private async childNameMap(
    links: LinkedStudentsResponseDto["links"],
  ): Promise<Map<string, string>> {
    const ids = links.map((l) => l.studentMemberId);
    if (!this.resolveNames || ids.length === 0) return new Map();
    try {
      return await this.resolveNames(ids);
    } catch {
      return new Map();
    }
  }
}
