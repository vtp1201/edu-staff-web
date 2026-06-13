import type { ClassSubject } from "../../domain/entities/class-subject.entity";
import type { Subject } from "../../domain/entities/subject.entity";
import type { SubjectParent } from "../../domain/entities/subject-parent.entity";
import type { ClassSubjectResponseDto } from "../dtos/class-subject-response.dto";
import type { SubjectParentResponseDto } from "../dtos/subject-parent-response.dto";
import type { SubjectResponseDto } from "../dtos/subject-response.dto";

export const SubjectCatalogueMapper = {
  toSubjectParent(dto: SubjectParentResponseDto): SubjectParent {
    return {
      id: dto.id,
      name: dto.name,
      conceptType: dto.conceptType,
      conceptLabelCustom: dto.conceptLabelCustom,
      status: dto.status,
      childCount: dto.childCount,
      activeChildCount: dto.activeChildCount,
    };
  },

  toSubject(dto: SubjectResponseDto): Subject {
    return {
      id: dto.id,
      parentId: dto.parentId,
      name: dto.name,
      code: dto.code,
      gradeLevel: dto.gradeLevel,
      status: dto.status,
      inUse: dto.inUse,
      periodCount: dto.periodCount,
      requiredAssessmentCount: dto.requiredAssessmentCount,
      outcomeTargets: dto.outcomeTargets,
      masterSyllabus: dto.masterSyllabus,
      exerciseBankRef: dto.exerciseBankRef,
      examBankRef: dto.examBankRef,
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
};
