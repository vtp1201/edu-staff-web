import type {
  DirectoryMember,
  DirectoryRole,
} from "../entities/directory-member.entity";
import type { MemberSummary } from "../entities/member-summary.entity";
import type { IamDirectoryFailure } from "../failures/iam-directory.failure";
import type { Result } from "../use-cases/result";

/** One cursor page of the member directory. */
export interface DirectoryPage {
  data: DirectoryMember[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ListMembersParams {
  tenantId: string;
  role?: DirectoryRole;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface IIamDirectoryRepository {
  /**
   * ONE page of the directory. Callers must not treat a short (or empty) page
   * as the end — only `hasMore === false` terminates. Use
   * `SearchMembersUseCase` rather than looping by hand.
   */
  listMembers(
    params: ListMembersParams,
  ): Promise<Result<DirectoryPage, IamDirectoryFailure>>;

  /**
   * Resolve display data for member ids the caller already holds. At most 50
   * ids per call (BE hard limit) — use `BatchResolveMembersUseCase`, which
   * owns the chunking. Unknown/malformed/other-tenant ids are silently
   * omitted from the result, never reported per-id.
   */
  batchLookup(
    ids: string[],
  ): Promise<Result<MemberSummary[], IamDirectoryFailure>>;
}
