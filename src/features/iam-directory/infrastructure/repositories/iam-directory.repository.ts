import "server-only";
import type { AxiosInstance } from "axios";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { MemberSummary } from "../../domain/entities/member-summary.entity";
import type { IamDirectoryFailure } from "../../domain/failures/iam-directory.failure";
import type {
  DirectoryPage,
  IIamDirectoryRepository,
  ListMembersParams,
} from "../../domain/repositories/i-iam-directory.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { MemberBatchItemDto } from "../dtos/member-batch-item.dto";
import type { MemberListItemDto } from "../dtos/member-list-item.dto";
import { IamDirectoryMapper } from "../mappers/iam-directory.mapper";

/**
 * Map a normalised {@link ApiError} to {@link IamDirectoryFailure}.
 *
 * IAM's real wire `error.code` is the RAW LOWERCASE snake_case i18n key emitted
 * by the Go `apperror` helpers (`services/iam/docs/ERROR_CODES.md`), NOT the
 * UPPER_SNAKE convention `core`/`social` use. Ground-truthed in US-E18.6 and
 * re-confirmed for the US-144 member routes; branch on `code`, never message.
 */
function toFailure(err: unknown): IamDirectoryFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }
  switch (code) {
    case "member_list_role_filter_required":
      // ADR 0129: narrowed-tier caller with a missing/disallowed `role=`.
      // Checked BEFORE the bare-403 fallback and kept separate from
      // `member_list_forbidden` — different cause, different remedy.
      return { type: "role-filter-required" };
    case "member_list_forbidden":
      // 403 on the directory list (missing reader RBAC) AND on the batch
      // lookup when the token carries no active tenant claim.
      return { type: "forbidden" };
    case "too_many_member_ids":
      return { type: "too-many-ids" };
    default:
      break;
  }
  if (status === 403) return { type: "forbidden" };
  if ((err as { retryable?: boolean })?.retryable) {
    return { type: "network-error" };
  }
  return { type: "unknown" };
}

export class IamDirectoryRepository implements IIamDirectoryRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listMembers(
    params: ListMembersParams,
  ): Promise<Result<DirectoryPage, IamDirectoryFailure>> {
    try {
      // Cursor-paginated list → `{ raw: true }` + `parseEnvelope` so
      // `meta.pagination` is readable. `raw` MUST be a top-level config
      // sibling of `params` (US-E18.19 regression class): nested inside
      // `params` it is silently ignored and the payload arrives unwrapped.
      const envelope = (await this.http.get(
        IAM_MEMBER_EP.directoryMembers(params.tenantId),
        {
          params: {
            role: params.role,
            search: params.search,
            cursor: params.cursor,
            limit: params.limit,
          },
          raw: true,
        },
      )) as unknown as ApiEnvelope<MemberListItemDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return ok({
        data: data.map(IamDirectoryMapper.toDirectoryMember),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      });
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async batchLookup(
    ids: string[],
  ): Promise<Result<MemberSummary[], IamDirectoryFailure>> {
    try {
      // Not paginated — the interceptor unwraps to the payload directly.
      const data = (await this.http.get(IAM_MEMBER_EP.batchMembers, {
        params: { ids: ids.join(",") },
      })) as unknown as MemberBatchItemDto[];
      return ok(data.map(IamDirectoryMapper.toMemberSummary));
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
