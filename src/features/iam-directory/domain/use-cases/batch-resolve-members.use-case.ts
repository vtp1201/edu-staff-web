import type { MemberSummary } from "../entities/member-summary.entity";
import type { IamDirectoryFailure } from "../failures/iam-directory.failure";
import type { IIamDirectoryRepository } from "../repositories/i-iam-directory.repository";
import { ok, type Result } from "./result";

/** BE hard limit for `GET /iam/api/v1/members?ids=` (400 `too_many_member_ids` above it). */
export const BATCH_LOOKUP_MAX_IDS = 50;

/**
 * Resolve display names/emails for an ARBITRARY-length list of member ids.
 *
 * Chunking (≤50 ids/call) is owned here, so callers never see
 * `too_many_member_ids` — that was the explicit choice offered by the AC
 * ("chunk transparently OR surface the failure"): staffing pages can hold more
 * than 50 assignments, and pushing the limit onto every caller would just
 * duplicate this loop three times.
 *
 * Unresolvable ids (unknown, malformed, other-tenant) are simply absent from
 * the result — BE never reports them per-id and neither do we. Callers keep
 * their own raw-id fallback for the missing subset.
 */
export class BatchResolveMembersUseCase {
  constructor(private readonly repo: IIamDirectoryRepository) {}

  async execute(
    ids: string[],
  ): Promise<Result<MemberSummary[], IamDirectoryFailure>> {
    const unique = [...new Set(ids.filter((id) => id.length > 0))];
    if (unique.length === 0) return ok([]);

    const out: MemberSummary[] = [];
    for (let i = 0; i < unique.length; i += BATCH_LOOKUP_MAX_IDS) {
      const chunk = unique.slice(i, i + BATCH_LOOKUP_MAX_IDS);
      const result = await this.repo.batchLookup(chunk);
      if (!result.ok) return result;
      out.push(...result.value);
    }
    return ok(out);
  }
}
