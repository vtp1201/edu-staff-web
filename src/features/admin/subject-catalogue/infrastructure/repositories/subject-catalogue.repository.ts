import "server-only";
import type { AxiosInstance } from "axios";
import { SUBJECT_CATALOGUE_EP } from "@/bootstrap/endpoint/subject-catalogue.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type {
  CreateSubjectInput,
  PatchSubjectInput,
  Subject,
} from "../../domain/entities/subject.entity";
import type {
  CreateParentInput,
  PatchParentInput,
  SubjectParent,
} from "../../domain/entities/subject-parent.entity";
import type { SubjectCatalogueFailure } from "../../domain/failures/subject-catalogue.failure";
import type { ISubjectCatalogueRepository } from "../../domain/repositories/i-subject-catalogue.repository";
import { fail, ok, type Result } from "../../domain/use-cases/result";
import type { SubjectParentResponseDto } from "../dtos/subject-parent-response.dto";
import type { SubjectResponseDto } from "../dtos/subject-response.dto";
import {
  type ParentChildCounts,
  SubjectCatalogueMapper,
} from "../mappers/subject-catalogue.mapper";

const ZERO_COUNTS: ParentChildCounts = { childCount: 0, activeChildCount: 0 };

/**
 * Map a normalised ApiError to the subject-catalogue failure union. Branch on
 * error.code (UPPER_SNAKE), never on message (TR-026). Covers the full
 * `SubjectParent`/`Subject`/`ClassSubject` sections of core ERROR_CODES.md
 * (US-E18.3).
 */
function toFailure(err: unknown): SubjectCatalogueFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // Network/transport error (no HTTP response received).
  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }

  switch (code) {
    // not-found (404)
    case "SUBJECT_PARENT_NOT_FOUND":
    case "SUBJECT_NOT_FOUND":
    case "CLASS_SUBJECT_NOT_FOUND":
      return { type: "not-found" };

    // already-exists (409)
    case "SUBJECT_PARENT_ALREADY_EXISTS":
    case "SUBJECT_ALREADY_EXISTS":
      return { type: "already-exists" };

    // parent archive blocked — group still has active subjects (409)
    case "SUBJECT_PARENT_IN_USE":
      return { type: "parent-in-use" };

    // parent already archived — cannot modify (409)
    case "SUBJECT_PARENT_ARCHIVED":
      return { type: "parent-archived" };

    // parent-scoped forbidden (403)
    case "SUBJECT_PARENT_FORBIDDEN":
      return { type: "parent-forbidden" };

    // subject archive blocked — active GVBM assignments (409)
    case "SUBJECT_IN_USE":
      return { type: "archive-blocked-subject" };

    // modify-while-archived — subject or its class-offering (409)
    case "SUBJECT_ARCHIVED":
    case "CLASS_SUBJECT_ARCHIVED":
      return { type: "subject-archived" };

    // grade level outside the tenant range (422)
    case "SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE":
      return { type: "grade-level-out-of-range" };

    // referenced bộ môn is archived / not active (422)
    case "SUBJECT_PARENT_NOT_ACTIVE":
      return { type: "parent-not-active" };

    // class-subject offering codes
    case "CLASS_SUBJECT_ALREADY_EXISTS":
      return { type: "class-subject-already-exists" };
    case "CLASS_SUBJECT_LOCKED_FIELD_UPDATE":
      return { type: "class-subject-locked-field-update" };
    case "CLASS_SUBJECT_IN_USE":
      return { type: "class-subject-in-use" };

    // subject code format validation (400) — real code is SUBJECT_INVALID_CODE.
    case "SUBJECT_INVALID_CODE":
      return { type: "code-format" };

    default:
      break;
  }

  // Generic status fallbacks (branch on code first, status last). Covers
  // SUBJECT_FORBIDDEN / CLASS_SUBJECT_FORBIDDEN (403) with no dedicated key.
  if (status === 403) return { type: "forbidden" };
  if (status === 404) return { type: "not-found" };

  // Retryable transport-class errors (decision 0008).
  if ((err as { retryable?: boolean })?.retryable) {
    return { type: "network-error" };
  }

  return { type: "unknown" };
}

export class SubjectCatalogueRepository implements ISubjectCatalogueRepository {
  constructor(private readonly http: AxiosInstance) {}

  // --- Fan-out helpers (fields/filters the BE does not provide) ---

  /**
   * Fully page through `GET /subject-parents`. No failure mapping — callers sit
   * inside their own try/catch.
   */
  private async fetchAllParentDtos(): Promise<SubjectParentResponseDto[]> {
    const out: SubjectParentResponseDto[] = [];
    let cursor: string | undefined;
    do {
      const env = (await this.http.get(SUBJECT_CATALOGUE_EP.parents, {
        params: { ...(cursor ? { cursor } : {}) },
        raw: true,
      })) as unknown as ApiEnvelope<SubjectParentResponseDto[]>;
      const { data, pagination } = parseEnvelope(env);
      out.push(...data);
      cursor =
        pagination?.hasMore && pagination.nextCursor
          ? pagination.nextCursor
          : undefined;
    } while (cursor);
    return out;
  }

  /**
   * Fully page through `GET /subjects` with NO `status` filter — both ACTIVE
   * and ARCHIVED are needed: for count derivation (childCount vs activeChild-
   * Count) AND to preserve the subjects screen, which lists archived subjects
   * too. The wire has no `subjectParentId` filter, so `listParents` and
   * `listSubjects` share this full fetch and group/filter client-side (§3/§6).
   */
  private async fetchAllSubjectDtos(): Promise<SubjectResponseDto[]> {
    const out: SubjectResponseDto[] = [];
    let cursor: string | undefined;
    do {
      const env = (await this.http.get(SUBJECT_CATALOGUE_EP.subjects, {
        params: { ...(cursor ? { cursor } : {}) },
        raw: true,
      })) as unknown as ApiEnvelope<SubjectResponseDto[]>;
      const { data, pagination } = parseEnvelope(env);
      out.push(...data);
      cursor =
        pagination?.hasMore && pagination.nextCursor
          ? pagination.nextCursor
          : undefined;
    } while (cursor);
    return out;
  }

  /** parentId → derived child counts, from the full subjects list. */
  private countByParent(
    subjects: SubjectResponseDto[],
  ): Map<string, ParentChildCounts> {
    const map = new Map<string, ParentChildCounts>();
    for (const s of subjects) {
      const counts = map.get(s.subjectParentId) ?? {
        childCount: 0,
        activeChildCount: 0,
      };
      counts.childCount += 1;
      if (s.status === "ACTIVE") counts.activeChildCount += 1;
      map.set(s.subjectParentId, counts);
    }
    return map;
  }

  // --- SubjectParent ---

  async listParents(): Promise<
    Result<SubjectParent[], SubjectCatalogueFailure>
  > {
    try {
      const [parentDtos, subjectDtos] = await Promise.all([
        this.fetchAllParentDtos(),
        this.fetchAllSubjectDtos(),
      ]);
      const counts = this.countByParent(subjectDtos);
      return ok(
        parentDtos.map((dto) =>
          SubjectCatalogueMapper.toSubjectParent(
            dto,
            counts.get(dto.subjectParentId) ?? ZERO_COUNTS,
          ),
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createParent(
    input: CreateParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>> {
    try {
      const data = (await this.http.post(
        SUBJECT_CATALOGUE_EP.parents,
        SubjectCatalogueMapper.toCreateParentBody(input),
      )) as unknown as SubjectParentResponseDto;
      // A freshly-created bộ môn has no subjects yet.
      return ok(SubjectCatalogueMapper.toSubjectParent(data, ZERO_COUNTS));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchParent(
    id: string,
    input: PatchParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>> {
    try {
      const [data, subjectDtos] = await Promise.all([
        this.http.patch(
          SUBJECT_CATALOGUE_EP.parent(id),
          SubjectCatalogueMapper.toUpdateParentBody(input),
        ) as unknown as Promise<SubjectParentResponseDto>,
        this.fetchAllSubjectDtos(),
      ]);
      const counts = this.countByParent(subjectDtos);
      return ok(
        SubjectCatalogueMapper.toSubjectParent(
          data,
          counts.get(data.subjectParentId) ?? ZERO_COUNTS,
        ),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archiveParent(
    id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    try {
      await this.http.post(SUBJECT_CATALOGUE_EP.archiveParent(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  /**
   * WEB-ONLY optimistic success (story §9). The BE exposes no un-archive /
   * restore endpoint anywhere in `SubjectParents` — only archive. This method
   * exists solely so the `restoreParentAction` UI flow keeps working end-to-end
   * in real mode: it returns success (no HTTP call) so the screen's optimistic
   * flip-to-ACTIVE applies. There is NO server-side persistence — on reload the
   * parent is still ARCHIVED. Delegating to the mock repository was rejected: a
   * fresh MockSubjectCatalogueRepository's `restoreParent` looks the parent up
   * in its fixture seed and returns `not-found` for real (non-fixture) UUIDs,
   * which would break the flow. Flagged as a cross-repo BE gap (need a
   * `POST /subject-parents/{id}/restore`).
   */
  async restoreParent(
    _id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    return ok(undefined);
  }

  // --- Subject ---

  async listSubjects(
    parentId: string,
  ): Promise<Result<Subject[], SubjectCatalogueFailure>> {
    try {
      const subjectDtos = await this.fetchAllSubjectDtos();
      return ok(
        subjectDtos
          .filter((dto) => dto.subjectParentId === parentId)
          .map(SubjectCatalogueMapper.toSubject),
      );
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async createSubject(
    input: CreateSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>> {
    try {
      const data = (await this.http.post(
        SUBJECT_CATALOGUE_EP.subjects,
        SubjectCatalogueMapper.toCreateSubjectBody(input),
      )) as unknown as SubjectResponseDto;
      return ok(SubjectCatalogueMapper.toSubject(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async getSubject(
    id: string,
  ): Promise<
    Result<
      { subject: Subject; classOfferings: ClassSubject[] },
      SubjectCatalogueFailure
    >
  > {
    try {
      const data = (await this.http.get(
        SUBJECT_CATALOGUE_EP.subject(id),
      )) as unknown as SubjectResponseDto;
      // `classOfferings` (classes teaching this subject) has NO BE reverse-
      // lookup endpoint — always empty in real mode (story §8). The UI already
      // renders the `classOfferingsEmpty` state. Cross-repo ask: a
      // `GET /subjects/{id}/classes` endpoint would populate this.
      return ok({
        subject: SubjectCatalogueMapper.toSubject(data),
        classOfferings: [],
      });
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchSubject(
    id: string,
    input: PatchSubjectInput,
  ): Promise<Result<Subject, SubjectCatalogueFailure>> {
    try {
      const data = (await this.http.patch(
        SUBJECT_CATALOGUE_EP.subject(id),
        SubjectCatalogueMapper.toUpdateSubjectBody(input),
      )) as unknown as SubjectResponseDto;
      return ok(SubjectCatalogueMapper.toSubject(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async archiveSubject(
    id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    try {
      await this.http.post(SUBJECT_CATALOGUE_EP.archiveSubject(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }
}
