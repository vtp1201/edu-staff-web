import "server-only";
import type { AxiosInstance } from "axios";
import { PARENT_STUDENT_LINKS_EP } from "@/bootstrap/endpoint/parent-student-link.endpoint";
import { type ApiEnvelope, parseEnvelope } from "@/bootstrap/lib/api-envelope";
import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { ParentStudentLink } from "../../domain/entities/parent-student-link.entity";
import type { ParentStudentLinkFailure } from "../../domain/failures/parent-student-link.failure";
import type {
  AuthContext,
  CreateLinkInput,
  IParentStudentLinkRepository,
  ListLinksFilter,
  ListLinksPage,
} from "../../domain/repositories/i-parent-student-link.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { LinkCandidateResponseDto } from "../dtos/link-candidate-response.dto";
import type { ParentStudentConsentResponseDto } from "../dtos/parent-student-consent-response.dto";
import type { ParentStudentLinkResponseDto } from "../dtos/parent-student-link-response.dto";
import {
  toFailure,
  toLinkCandidate,
  toParentStudentConsent,
  toParentStudentLink,
} from "../mappers/parent-student-link.mapper";

type PSLResult<T> = Result<T, ParentStudentLinkFailure>;

/**
 * Real `core` parent-student-link repository (US-E20.1). The `core` service is
 * not built (mock-first, decision 0014) — DI selects
 * {@link MockParentStudentLinkRepository} while NEXT_PUBLIC_USE_MOCK=true, so
 * this class is unused until `core` ships. Kept fully wired to the documented
 * contract (cursor pagination via `{ raw: true }` + parseEnvelope, camelCase,
 * ApiError.code → failure mapping) so flipping USE_MOCK=false needs no rework.
 *
 * HIGH-RISK note: for create/unlink the server re-authorizes role + tenant from
 * the Bearer token (the real enforcement boundary once `core` ships), so
 * `authCtx` is NOT forwarded on the wire — the mock repo is the testable
 * enforcement boundary pre-`core` (AC-005.5, spec.md §"High-Risk").
 */
export class ParentStudentLinkRepository
  implements IParentStudentLinkRepository
{
  constructor(private readonly http: AxiosInstance) {}

  async listLinks(filter: ListLinksFilter): Promise<PSLResult<ListLinksPage>> {
    try {
      const params: Record<string, unknown> = {};
      if (filter.q?.trim()) params.q = filter.q.trim();
      if (filter.classId) params.classId = filter.classId;
      if (filter.cursor) params.cursor = filter.cursor;
      if (filter.limit) params.limit = filter.limit;

      const envelope = (await this.http.get(PARENT_STUDENT_LINKS_EP.base, {
        params,
        ...({ raw: true } as Record<string, unknown>),
      })) as unknown as ApiEnvelope<ParentStudentLinkResponseDto[]>;

      const { data, pagination } = parseEnvelope(envelope);
      return ok({
        items: (data ?? []).map(toParentStudentLink),
        nextCursor: pagination?.nextCursor ?? null,
        hasMore: pagination?.hasMore ?? false,
      });
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createLink(
    input: CreateLinkInput,
    _authCtx: AuthContext,
  ): Promise<PSLResult<ParentStudentLink>> {
    try {
      const dto = (await this.http.post(PARENT_STUDENT_LINKS_EP.base, {
        studentId: input.studentId,
        parentId: input.parentId,
        relationship: input.relationship,
        note: input.note,
      })) as unknown as ParentStudentLinkResponseDto;
      return ok(toParentStudentLink(dto));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async unlinkLink(
    linkId: string,
    _authCtx: AuthContext,
  ): Promise<PSLResult<void>> {
    try {
      await this.http.delete(PARENT_STUDENT_LINKS_EP.byId(linkId));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getLinkConsentDetail(
    studentId: string,
    parentId: string,
  ): Promise<PSLResult<ParentStudentConsent>> {
    try {
      const dto = (await this.http.get(PARENT_STUDENT_LINKS_EP.consents, {
        params: { studentId, parentId },
      })) as unknown as ParentStudentConsentResponseDto;
      return ok(toParentStudentConsent(dto));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async searchStudentCandidates(
    q: string,
    classId?: string,
  ): Promise<PSLResult<LinkCandidate[]>> {
    try {
      const dtos = (await this.http.get(PARENT_STUDENT_LINKS_EP.studentSearch, {
        params: classId ? { q, classId } : { q },
      })) as unknown as LinkCandidateResponseDto[];
      return ok(dtos.map(toLinkCandidate));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async searchParentCandidates(q: string): Promise<PSLResult<LinkCandidate[]>> {
    try {
      // role=parent is server-enforced (FR-010/NFR-008); sent as a hint only.
      const dtos = (await this.http.get(PARENT_STUDENT_LINKS_EP.parentSearch, {
        params: { q, role: "parent" },
      })) as unknown as LinkCandidateResponseDto[];
      return ok(dtos.map(toLinkCandidate));
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
