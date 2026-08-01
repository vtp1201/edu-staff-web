import type {
  DirectoryMember,
  DirectoryRole,
} from "../entities/directory-member.entity";
import type { IamDirectoryFailure } from "../failures/iam-directory.failure";
import type { IIamDirectoryRepository } from "../repositories/i-iam-directory.repository";
import { ok, type Result } from "./result";

export interface SearchMembersParams {
  tenantId: string;
  role?: DirectoryRole;
  search?: string;
}

/**
 * BE's maximum page size for the directory list (`limit` is 1–100, default 20).
 *
 * Always request the cap: this use-case ALWAYS drains the whole directory, and
 * the read happens inside RSC render (`admin/classes` calls `listTeachers({})`
 * with no search), so every extra page is a blocking round trip. At BE's
 * default of 20 a 500-member tenant costs 25 sequential requests; at 100 it
 * costs 5.
 */
const PAGE_SIZE = 100;

/**
 * Defensive cap on the pagination loop. At {@link PAGE_SIZE} (100) this is
 * 20 000 members — far beyond any single tenant — so hitting it means the BE
 * is misbehaving (`hasMore` stuck true), not that a tenant is genuinely large.
 */
const MAX_PAGES = 200;

/**
 * Read the WHOLE tenant member directory (optionally filtered by role/search).
 *
 * The BE applies `role`/`search` in the application AFTER a keyset read, so a
 * page may return fewer than `limit` items — even zero — while
 * `meta.pagination.hasMore` is still true. Stopping on a short page would
 * silently truncate the directory. The ONLY termination signal is
 * `hasMore === false` (US-144, mirrored in the AC).
 */
export class SearchMembersUseCase {
  constructor(private readonly repo: IIamDirectoryRepository) {}

  async execute(
    params: SearchMembersParams,
  ): Promise<Result<DirectoryMember[], IamDirectoryFailure>> {
    const out: DirectoryMember[] = [];
    let cursor: string | undefined;

    for (let pages = 0; pages < MAX_PAGES; pages++) {
      const result = await this.repo.listMembers({
        tenantId: params.tenantId,
        role: params.role,
        search: params.search,
        cursor,
        limit: PAGE_SIZE,
      });
      if (!result.ok) return result;

      out.push(...result.value.data);

      // `hasMore` alone decides; a missing cursor while `hasMore` is true would
      // be a BE bug, so stop rather than re-request page 1 forever.
      if (!result.value.hasMore || !result.value.nextCursor) break;
      cursor = result.value.nextCursor;
    }

    return ok(out);
  }
}
