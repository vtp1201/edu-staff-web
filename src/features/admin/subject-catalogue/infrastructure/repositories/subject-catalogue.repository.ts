import "server-only";
import type { AxiosInstance } from "axios";
import { SUBJECT_CATALOGUE_EP } from "@/bootstrap/endpoint/subject-catalogue.endpoint";
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

function toFailure(err: unknown): SubjectCatalogueFailure {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "SUBJECT_PARENT_HAS_ACTIVE_CHILDREN")
      return { type: "archive-blocked-parent" };
    if (code === "SUBJECT_IN_USE") return { type: "archive-blocked-subject" };
    if (code === "INVALID_SUBJECT_CODE") return { type: "code-format" };
    if (code === "NOT_FOUND") return { type: "not-found" };
    if ((err as { retryable?: boolean }).retryable)
      return { type: "network-error" };
  }
  return { type: "unknown" };
}

export class SubjectCatalogueRepository implements ISubjectCatalogueRepository {
  constructor(private readonly http: AxiosInstance) {}

  async listParents(): Promise<
    Result<SubjectParent[], SubjectCatalogueFailure>
  > {
    try {
      const data = (await this.http.get(
        SUBJECT_CATALOGUE_EP.parents,
      )) as unknown as SubjectParentResponseDto[];
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
      const data = (await this.http.get(SUBJECT_CATALOGUE_EP.subjects, {
        params: { parentId },
      })) as unknown as SubjectResponseDto[];
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
