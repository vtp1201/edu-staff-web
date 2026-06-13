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
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type { SubjectParentResponseDto } from "../dtos/subject-parent-response.dto";
import type { SubjectResponseDto } from "../dtos/subject-response.dto";
import { SubjectCatalogueMapper } from "../mappers/subject-catalogue.mapper";

/**
 * Map a normalised ApiError to the subject-catalogue failure union.
 * Branch on error.code (UPPER_SNAKE), never on message (TR-026, US-E06.6).
 */
function toFailure(err: unknown): SubjectCatalogueFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  // Network/transport error
  if (code === "NETWORK_ERROR" || status === undefined) {
    return { type: "network-error" };
  }

  // SubjectParent error codes
  if (
    code === "SUBJECT_PARENT_NOT_FOUND" ||
    code === "SUBJECT_NOT_FOUND" ||
    code === "CLASS_SUBJECT_NOT_FOUND" ||
    status === 404
  ) {
    return { type: "not-found" };
  }
  if (
    code === "SUBJECT_PARENT_ALREADY_EXISTS" ||
    code === "SUBJECT_ALREADY_EXISTS"
  ) {
    return { type: "already-exists" };
  }
  if (code === "SUBJECT_PARENT_IN_USE") {
    return { type: "parent-in-use" };
  }
  if (code === "SUBJECT_PARENT_ARCHIVED") {
    return { type: "parent-archived" };
  }
  if (
    code === "SUBJECT_PARENT_FORBIDDEN" ||
    code === "ROSTER_ACCESS_FORBIDDEN"
  ) {
    return { type: "parent-forbidden" };
  }
  if (status === 403) {
    return { type: "forbidden" };
  }

  // Subject error codes
  if (code === "SUBJECT_IN_USE") {
    return { type: "archive-blocked-subject" };
  }
  // Legacy code kept for backwards compat with mock
  if (code === "SUBJECT_PARENT_HAS_ACTIVE_CHILDREN") {
    return { type: "archive-blocked-parent" };
  }
  if (code === "SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE") {
    return { type: "grade-level-out-of-range" };
  }
  if (code === "SUBJECT_PARENT_NOT_ACTIVE") {
    return { type: "parent-not-active" };
  }

  // ClassSubject error codes
  if (code === "CLASS_SUBJECT_ALREADY_EXISTS") {
    return { type: "class-subject-already-exists" };
  }
  if (code === "CLASS_SUBJECT_LOCKED_FIELD_UPDATE") {
    return { type: "class-subject-locked-field-update" };
  }
  if (code === "CLASS_SUBJECT_IN_USE") {
    return { type: "class-subject-in-use" };
  }

  // Code/format validation
  if (code === "INVALID_SUBJECT_CODE") {
    return { type: "code-format" };
  }

  // Retryable errors (network-level, decision 0008)
  const isRetryable = (err as { retryable?: boolean })?.retryable;
  if (isRetryable) return { type: "network-error" };

  return { type: "unknown" };
}

export class SubjectCatalogueRepository implements ISubjectCatalogueRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listParents(): Promise<
    Result<SubjectParent[], SubjectCatalogueFailure>
  > {
    try {
      // cursor-paginated list: use { raw: true } + parseEnvelope (TR-026)
      const envelope = (await this.http.get(SUBJECT_CATALOGUE_EP.parents, {
        params: { raw: true },
      })) as unknown as ApiEnvelope<SubjectParentResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(SubjectCatalogueMapper.toSubjectParent));
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
        input,
      )) as unknown as SubjectParentResponseDto;
      return ok(SubjectCatalogueMapper.toSubjectParent(data));
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async patchParent(
    id: string,
    input: PatchParentInput,
  ): Promise<Result<SubjectParent, SubjectCatalogueFailure>> {
    try {
      const data = (await this.http.patch(
        SUBJECT_CATALOGUE_EP.parent(id),
        input,
      )) as unknown as SubjectParentResponseDto;
      return ok(SubjectCatalogueMapper.toSubjectParent(data));
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

  async restoreParent(
    id: string,
  ): Promise<Result<void, SubjectCatalogueFailure>> {
    try {
      await this.http.post(SUBJECT_CATALOGUE_EP.restoreParent(id));
      return ok(undefined);
    } catch (err) {
      return fail(toFailure(err));
    }
  }

  async listSubjects(
    parentId: string,
  ): Promise<Result<Subject[], SubjectCatalogueFailure>> {
    try {
      // cursor-paginated list: use { raw: true } + parseEnvelope (TR-026)
      const envelope = (await this.http.get(SUBJECT_CATALOGUE_EP.subjects, {
        params: { parentId, raw: true },
      })) as unknown as ApiEnvelope<SubjectResponseDto[]>;
      const { data } = parseEnvelope(envelope);
      return ok(data.map(SubjectCatalogueMapper.toSubject));
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
        input,
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
      )) as unknown as {
        subject: SubjectResponseDto;
        classOfferings: ClassSubjectResponseDto[];
      };
      return ok({
        subject: SubjectCatalogueMapper.toSubject(data.subject),
        classOfferings: data.classOfferings.map(
          SubjectCatalogueMapper.toClassSubject,
        ),
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
        input,
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
