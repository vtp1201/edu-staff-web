import "server-only";
import type { DirectoryMember } from "../../domain/entities/directory-member.entity";
import type { MemberSummary } from "../../domain/entities/member-summary.entity";
import type { MemberBatchItemDto } from "../dtos/member-batch-item.dto";
import type { MemberListItemDto } from "../dtos/member-list-item.dto";

/**
 * DTO → entity for the IAM member directory (US-E18.23).
 *
 * Deliberately a straight pass-through: the wire shape already matches the
 * domain. No status filtering happens here — BE owns the LEFT-exclusion rule
 * (excluded from the list, included in the batch lookup), and re-implementing
 * it web-side would silently swallow a future BE change.
 */
export const IamDirectoryMapper = {
  toDirectoryMember(dto: MemberListItemDto): DirectoryMember {
    return {
      memberId: dto.memberId,
      userId: dto.userId,
      displayName: dto.displayName,
      email: dto.email,
      roles: dto.roles,
      status: dto.status,
    };
  },

  /**
   * TIERED (ADR-0120, US-E18.33). `email`/`roles` are spread CONDITIONALLY, not
   * copied unconditionally: a narrowed-tier row (STAFF/STUDENT/PARENT caller)
   * omits those keys on the wire, and materialising them as
   * `email: undefined` would destroy the presence-based tier signal
   * (`"email" in summary`) the contract is built on.
   */
  toMemberSummary(dto: MemberBatchItemDto): MemberSummary {
    return {
      memberId: dto.memberId,
      displayName: dto.displayName,
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.roles !== undefined ? { roles: dto.roles } : {}),
    };
  },
};
