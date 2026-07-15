/**
 * Unit tests — SubjectCatalogueMapper (US-E18.3 real-contract remap).
 * Covers id renames, concept-label split, master-field nesting/defaults,
 * ResourceRef string↔object round-trip, and request-body shaping (omit rules).
 */
import { describe, expect, it } from "vitest";
import type {
  CreateSubjectInput,
  PatchSubjectInput,
} from "../../domain/entities/subject.entity";
import type {
  CreateParentInput,
  PatchParentInput,
} from "../../domain/entities/subject-parent.entity";
import type { SubjectParentResponseDto } from "../dtos/subject-parent-response.dto";
import type { SubjectResponseDto } from "../dtos/subject-response.dto";
import { SubjectCatalogueMapper } from "./subject-catalogue.mapper";

function parentDto(
  over: Partial<SubjectParentResponseDto> = {},
): SubjectParentResponseDto {
  return {
    subjectParentId: "sp-1",
    tenantId: "t-1",
    name: "Bộ môn Toán",
    conceptLabelSuggested: "BO_MON",
    conceptLabelCustom: null,
    effectiveConceptLabel: "Bộ môn",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

function subjectDto(
  over: Partial<SubjectResponseDto> = {},
): SubjectResponseDto {
  return {
    subjectId: "sub-1",
    tenantId: "t-1",
    subjectParentId: "sp-1",
    name: "Toán 10",
    code: "MATH10",
    gradeLevel: 10,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

describe("SubjectCatalogueMapper.toSubjectParent", () => {
  it("renames subjectParentId → id and splits concept fields, taking counts from arg", () => {
    const parent = SubjectCatalogueMapper.toSubjectParent(parentDto(), {
      childCount: 3,
      activeChildCount: 2,
    });
    expect(parent.id).toBe("sp-1");
    expect(parent.conceptType).toBe("BO_MON");
    expect(parent.conceptLabelCustom).toBeNull();
    expect(parent.childCount).toBe(3);
    expect(parent.activeChildCount).toBe(2);
    expect(parent.status).toBe("ACTIVE");
  });

  it("maps a null suggested label + custom override", () => {
    const parent = SubjectCatalogueMapper.toSubjectParent(
      parentDto({
        conceptLabelSuggested: null,
        conceptLabelCustom: "Ban Toán",
      }),
      { childCount: 0, activeChildCount: 0 },
    );
    expect(parent.conceptType).toBeNull();
    expect(parent.conceptLabelCustom).toBe("Ban Toán");
  });
});

describe("SubjectCatalogueMapper.toSubject", () => {
  it("renames ids and unnests master fields (learningOutcomes → outcomeTargets, requiredExamCount → requiredAssessmentCount)", () => {
    const subject = SubjectCatalogueMapper.toSubject(
      subjectDto({
        master: {
          masterSyllabus: "syllabus.pdf",
          periodCount: 105,
          learningOutcomes: "Mục tiêu",
          requiredExamCount: 4,
          exerciseBankRef: { type: "OPAQUE", ref: "ex-123" },
          examBankRef: { type: "OPAQUE", ref: "exam-456" },
        },
      }),
    );
    expect(subject.id).toBe("sub-1");
    expect(subject.parentId).toBe("sp-1");
    expect(subject.masterSyllabus).toBe("syllabus.pdf");
    expect(subject.periodCount).toBe(105);
    expect(subject.outcomeTargets).toBe("Mục tiêu");
    expect(subject.requiredAssessmentCount).toBe(4);
    expect(subject.exerciseBankRef).toBe("ex-123");
    expect(subject.examBankRef).toBe("exam-456");
  });

  it("defaults absent master to null numbers / empty strings and inUse false", () => {
    const subject = SubjectCatalogueMapper.toSubject(subjectDto());
    expect(subject.periodCount).toBeNull();
    expect(subject.requiredAssessmentCount).toBeNull();
    expect(subject.outcomeTargets).toBe("");
    expect(subject.masterSyllabus).toBe("");
    expect(subject.exerciseBankRef).toBe("");
    expect(subject.examBankRef).toBe("");
    expect(subject.inUse).toBe(false);
  });

  it("reads ResourceRef.ref → flat string, defaulting a missing ref to empty string", () => {
    const subject = SubjectCatalogueMapper.toSubject(
      subjectDto({ master: { periodCount: 90 } }),
    );
    expect(subject.exerciseBankRef).toBe("");
    expect(subject.examBankRef).toBe("");
    expect(subject.periodCount).toBe(90);
  });
});

describe("SubjectCatalogueMapper.toCreateParentBody", () => {
  it("maps conceptType → conceptLabelSuggested and keeps custom", () => {
    const input: CreateParentInput = {
      name: "Bộ môn Lý",
      conceptType: "TO",
      conceptLabelCustom: "Ban Lý",
    };
    expect(SubjectCatalogueMapper.toCreateParentBody(input)).toEqual({
      name: "Bộ môn Lý",
      conceptLabelSuggested: "TO",
      conceptLabelCustom: "Ban Lý",
    });
  });

  it("omits suggested when conceptType is null and omits empty custom", () => {
    const input: CreateParentInput = {
      name: "Bộ môn Hoá",
      conceptType: null,
      conceptLabelCustom: null,
    };
    expect(SubjectCatalogueMapper.toCreateParentBody(input)).toEqual({
      name: "Bộ môn Hoá",
    });
  });
});

describe("SubjectCatalogueMapper.toUpdateParentBody", () => {
  it("maps only concept fields (name is immutable on the wire)", () => {
    const input: PatchParentInput = {
      name: "ignored",
      conceptType: "KHOA",
      conceptLabelCustom: null,
    };
    expect(SubjectCatalogueMapper.toUpdateParentBody(input)).toEqual({
      conceptLabelSuggested: "KHOA",
    });
  });
});

describe("SubjectCatalogueMapper.toCreateSubjectBody", () => {
  it("maps parentId → subjectParentId, omits null code, and has no master on create", () => {
    const input: CreateSubjectInput = {
      parentId: "sp-1",
      name: "Toán 11",
      code: null,
      gradeLevel: 11,
    };
    expect(SubjectCatalogueMapper.toCreateSubjectBody(input)).toEqual({
      subjectParentId: "sp-1",
      name: "Toán 11",
      gradeLevel: 11,
    });
  });

  it("includes code when present", () => {
    const body = SubjectCatalogueMapper.toCreateSubjectBody({
      parentId: "sp-1",
      name: "Toán 11",
      code: "MATH11",
      gradeLevel: 11,
    });
    expect(body.code).toBe("MATH11");
  });
});

describe("SubjectCatalogueMapper.toUpdateSubjectBody", () => {
  it("nests master fields and wraps non-empty refs as OPAQUE ResourceRef", () => {
    const input: PatchSubjectInput = {
      name: "Toán 10 nâng cao",
      code: "MATH10A",
      periodCount: 120,
      requiredAssessmentCount: 5,
      outcomeTargets: "Mục tiêu mới",
      masterSyllabus: "new.pdf",
      exerciseBankRef: "ex-999",
      examBankRef: "exam-888",
    };
    expect(SubjectCatalogueMapper.toUpdateSubjectBody(input)).toEqual({
      name: "Toán 10 nâng cao",
      code: "MATH10A",
      master: {
        periodCount: 120,
        requiredExamCount: 5,
        learningOutcomes: "Mục tiêu mới",
        masterSyllabus: "new.pdf",
        exerciseBankRef: { type: "OPAQUE", ref: "ex-999" },
        examBankRef: { type: "OPAQUE", ref: "exam-888" },
      },
    });
  });

  it("omits empty ResourceRefs and null-cleared numbers, keeps empty strings", () => {
    const body = SubjectCatalogueMapper.toUpdateSubjectBody({
      name: "Toán 10",
      code: null,
      periodCount: null,
      requiredAssessmentCount: null,
      outcomeTargets: "",
      masterSyllabus: "",
      exerciseBankRef: "",
      examBankRef: "",
    });
    expect(body.master?.exerciseBankRef).toBeUndefined();
    expect(body.master?.examBankRef).toBeUndefined();
    expect(body.master?.periodCount).toBeUndefined();
    expect(body.master?.requiredExamCount).toBeUndefined();
    expect(body.master?.learningOutcomes).toBe("");
    expect(body.master?.masterSyllabus).toBe("");
    // null code omitted from the body
    expect(body.code).toBeUndefined();
  });
});
