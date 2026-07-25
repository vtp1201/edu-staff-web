import type { UserRole } from "@/features/auth/domain/entities/auth-user.entity";
import type { LinkAuditEntry } from "../entities/link-audit-entry.entity";
import type { LinkCandidate } from "../entities/link-candidate.entity";
import type { ParentStudentConsent } from "../entities/parent-student-consent.entity";
import type {
  ParentStudentLink,
  RelationshipType,
} from "../entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "../failures/parent-student-link.failure";
import type { Result } from "../use-cases/result";

/**
 * Explicit server-derived authorization context for mutating calls (US-E20.1,
 * HIGH-RISK). `requireRole` alone is role-only (tenant is enforced at layout,
 * not the Server Action). Unlink/Create MUST re-validate BOTH role === "admin"
 * AND tenantId === link.tenantId at the repository boundary, independent of the
 * route gate (spec.md §"High-Risk Security Enforcement" pt.1, AC-005.5). This
 * seam is a required param — never implicit in the http client — so it is
 * directly testable with a forged/altered role pre-`core`.
 */
export interface AuthContext {
  role: UserRole;
  tenantId: string;
  /**
   * Acting session's own identity — the ONLY source for an audit entry's actor
   * (US-E20.3, NFR-103). Server-derived (`sub` claim + display name resolved in
   * DI); never client-supplied, never cross-attributed.
   */
  actorId: string;
  actorName: string;
}

export interface ListLinksFilter {
  q?: string;
  classId?: string | null;
  cursor?: string | null;
  limit?: number;
}

export interface ListLinksPage {
  items: ParentStudentLink[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateLinkInput {
  studentId: string;
  parentId: string;
  relationship: RelationshipType;
  note?: string;
}

type PSLResult<T> = Result<T, ParentStudentLinkFailure>;

export interface IParentStudentLinkRepository {
  listLinks(filter: ListLinksFilter): Promise<PSLResult<ListLinksPage>>;
  /** HIGH-RISK: re-authorizes `authCtx` (role + tenant) server-side. */
  createLink(
    input: CreateLinkInput,
    authCtx: AuthContext,
  ): Promise<PSLResult<ParentStudentLink>>;
  /** HIGH-RISK: re-authorizes `authCtx` (role + tenant) against the link's own
   * tenant BEFORE deleting (AC-005.5). */
  unlinkLink(linkId: string, authCtx: AuthContext): Promise<PSLResult<void>>;
  getLinkConsentDetail(
    studentId: string,
    parentId: string,
  ): Promise<PSLResult<ParentStudentConsent>>;
  /**
   * Append-only audit trail for one link, newest-first (US-E20.3, INT-102). An
   * unknown linkId resolves to `ok([])` — `not-found`/`forbidden` are NOT
   * modeled for this read (INT-105); only `network-error` is realistic.
   */
  getLinkAuditTrail(linkId: string): Promise<PSLResult<LinkAuditEntry[]>>;
  searchStudentCandidates(
    q: string,
    classId?: string,
  ): Promise<PSLResult<LinkCandidate[]>>;
  searchParentCandidates(q: string): Promise<PSLResult<LinkCandidate[]>>;
}

/** Default typeahead result cap + list page size. */
export const PARENT_LINKS_PAGE_SIZE = 20;
export const CANDIDATE_SEARCH_CAP = 20;
