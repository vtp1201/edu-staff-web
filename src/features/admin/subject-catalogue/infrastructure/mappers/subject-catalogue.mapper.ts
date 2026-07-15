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
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type {
  CreateSubjectParentRequestDto,
  SubjectParentResponseDto,
  UpdateSubjectParentRequestDto,
} from "../dtos/subject-parent-response.dto";
import type {
  CreateSubjectRequestDto,
  MasterFieldsDto,
  ResourceRefDto,
  SubjectResponseDto,
  UpdateSubjectRequestDto,
} from "../dtos/subject-response.dto";

/** Derived child counts for a parent (computed by the repository fan-out). */
export interface ParentChildCounts {
  childCount: number;
  activeChildCount: number;
}

/**
 * Wrap a flat ref string as a forward-compatible `ResourceRef` (core ADR 0037).
 * Returns `undefined` for an empty string so the caller omits the field
 * entirely — the BE does not need an empty `ResourceRef` (story §5).
 */
function toResourceRef(value: string): ResourceRefDto | undefined {
  return value === "" ? undefined : { type: "OPAQUE", ref: value };
}

export const SubjectCatalogueMapper = {
  /**
   * DTO → entity. Counts are NOT on the wire — the repository derives them from
   * a fan-out `GET /subjects` fetch and passes them in (story §3).
   */
  toSubjectParent(
    dto: SubjectParentResponseDto,
    counts: ParentChildCounts,
  ): SubjectParent {
    return {
      id: dto.subjectParentId,
      name: dto.name,
      conceptType: dto.conceptLabelSuggested,
      conceptLabelCustom: dto.conceptLabelCustom,
      status: dto.status,
      childCount: counts.childCount,
      activeChildCount: counts.activeChildCount,
    };
  },

  toSubject(dto: SubjectResponseDto): Subject {
    const master = dto.master ?? {};
    return {
      id: dto.subjectId,
      parentId: dto.subjectParentId,
      name: dto.name,
      code: dto.code,
      gradeLevel: dto.gradeLevel,
      status: dto.status,
      // `inUse` is not exposed on the wire and is not cheaply derivable
      // (no public listing of active GVBM assignments). Default false; the
      // archive 409 `SUBJECT_IN_USE` remains the authoritative guard (story §7).
      inUse: false,
      periodCount: master.periodCount ?? null,
      requiredAssessmentCount: master.requiredExamCount ?? null,
      outcomeTargets: master.learningOutcomes ?? "",
      masterSyllabus: master.masterSyllabus ?? "",
      exerciseBankRef: master.exerciseBankRef?.ref ?? "",
      examBankRef: master.examBankRef?.ref ?? "",
    };
  },

  toClassSubject(dto: ClassSubjectResponseDto): ClassSubject {
    return {
      id: dto.id,
      className: dto.className,
      academicYear: dto.academicYear,
      teacherName: dto.teacherName,
      studentCount: dto.studentCount,
    };
  },

  // --- Request-body shaping (entity input → wire body) ---

  toCreateParentBody(input: CreateParentInput): CreateSubjectParentRequestDto {
    const body: CreateSubjectParentRequestDto = { name: input.name };
    if (input.conceptType) body.conceptLabelSuggested = input.conceptType;
    if (input.conceptLabelCustom)
      body.conceptLabelCustom = input.conceptLabelCustom;
    return body;
  },

  /** `name` is immutable on the wire — only concept fields are updatable. */
  toUpdateParentBody(input: PatchParentInput): UpdateSubjectParentRequestDto {
    const body: UpdateSubjectParentRequestDto = {};
    if (input.conceptType) body.conceptLabelSuggested = input.conceptType;
    if (input.conceptLabelCustom)
      body.conceptLabelCustom = input.conceptLabelCustom;
    return body;
  },

  toCreateSubjectBody(input: CreateSubjectInput): CreateSubjectRequestDto {
    const body: CreateSubjectRequestDto = {
      subjectParentId: input.parentId,
      name: input.name,
      gradeLevel: input.gradeLevel,
    };
    if (input.code) body.code = input.code;
    return body;
  },

  toUpdateSubjectBody(input: PatchSubjectInput): UpdateSubjectRequestDto {
    const master: MasterFieldsDto = {};
    // Numbers: a cleared (null) value is omitted — the wire fields are
    // non-nullable integers, so BE keeps the prior value (story §4).
    if (input.periodCount != null) master.periodCount = input.periodCount;
    if (input.requiredAssessmentCount != null)
      master.requiredExamCount = input.requiredAssessmentCount;
    // Strings: send as-is (empty string clears the value server-side).
    if (input.outcomeTargets !== undefined)
      master.learningOutcomes = input.outcomeTargets;
    if (input.masterSyllabus !== undefined)
      master.masterSyllabus = input.masterSyllabus;
    // Refs: wrap non-empty as OPAQUE ResourceRef, omit when empty (story §5).
    if (input.exerciseBankRef !== undefined) {
      const ref = toResourceRef(input.exerciseBankRef);
      if (ref) master.exerciseBankRef = ref;
    }
    if (input.examBankRef !== undefined) {
      const ref = toResourceRef(input.examBankRef);
      if (ref) master.examBankRef = ref;
    }

    // `name` is required on the wire; the detail sheet always submits it.
    const body: UpdateSubjectRequestDto = { name: input.name ?? "" };
    if (input.code) body.code = input.code;
    if (Object.keys(master).length > 0) body.master = master;
    return body;
  },
};
