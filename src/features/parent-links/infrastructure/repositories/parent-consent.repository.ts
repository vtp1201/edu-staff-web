import "server-only";
import type { AxiosInstance } from "axios";
import {
  PARENT_CONSENT_EP,
  SELF_MEMBER_ID,
} from "@/bootstrap/endpoint/parent-links.endpoint";
import type { LinkedStudentSummary } from "../../domain/entities/linked-student-summary.entity";
import type { ParentStudentConsent } from "../../domain/entities/parent-student-consent.entity";
import type { ParentConsentFailure } from "../../domain/failures/parent-consent.failure";
import type {
  IParentConsentRepository,
  UpdateConsentInput,
} from "../../domain/repositories/i-parent-consent.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { LinkedStudentResponseDto } from "../dtos/linked-student-response.dto";
import type { ParentStudentConsentResponseDto } from "../dtos/parent-student-consent-response.dto";
import {
  toConsentFailure,
  toLinkedStudentSummary,
  toParentStudentConsent,
} from "../mappers/parent-consent.mapper";

type PCResult<T> = Result<T, ParentConsentFailure>;

/**
 * Real `core` parent-consent repository (US-E20.2). `core` is not built
 * (mock-first, decision 0014) — DI selects {@link MockParentConsentRepository}
 * while NEXT_PUBLIC_USE_MOCK=true, so this class is unused until `core` ships.
 * Kept fully wired to the documented contract (camelCase, envelope-unwrapped
 * payloads, ApiError.code → failure mapping) so flipping USE_MOCK=false needs
 * no rework. Same "structurally-ready but unexercised" posture as
 * `ParentStudentLinkRepository` (US-E20.1).
 *
 * Every read/write is scoped SERVER-SIDE to the authenticated parent's memberId
 * (`SELF_MEMBER_ID` alias) — the client never supplies a parent id (NFR-007).
 */
export class ParentConsentRepository implements IParentConsentRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getLinkedStudents(): Promise<PCResult<LinkedStudentSummary[]>> {
    try {
      const dtos = (await this.http.get(
        PARENT_CONSENT_EP.linkedStudents(SELF_MEMBER_ID),
      )) as unknown as LinkedStudentResponseDto[];
      return ok((dtos ?? []).map(toLinkedStudentSummary));
    } catch (err) {
      return fail(toConsentFailure(err));
    }
  }

  async getConsents(
    _studentIds: string[],
  ): Promise<PCResult<ParentStudentConsent[]>> {
    try {
      // Server resolves the parent's memberId + returns consent rows for every
      // linked student; no client-supplied ids are trusted (NFR-007).
      const dtos = (await this.http.get(
        PARENT_CONSENT_EP.consents,
      )) as unknown as ParentStudentConsentResponseDto[];
      return ok((dtos ?? []).map(toParentStudentConsent));
    } catch (err) {
      return fail(toConsentFailure(err));
    }
  }

  async updateConsent(
    input: UpdateConsentInput,
  ): Promise<PCResult<ParentStudentConsent>> {
    try {
      const dto = (await this.http.put(PARENT_CONSENT_EP.consents, {
        studentId: input.studentId,
        category: input.category,
        enabled: input.enabled,
      })) as unknown as ParentStudentConsentResponseDto;
      return ok(toParentStudentConsent(dto));
    } catch (err) {
      return fail(toConsentFailure(err));
    }
  }
}
