import { getRankBand } from "@/features/grades/domain/use-cases/rank-band";
import type {
  AcademicRecord,
  AcademicYear,
  ConductGrade,
  SubjectScore,
  TermRecord,
} from "../../domain/entities/academic-record.entity";
import { calculateSubjectAvg } from "../../domain/use-cases/calculate-subject-avg";
import { deriveYearSealStatus } from "../../domain/use-cases/derive-year-seal-status";
import type {
  AcademicRecordResponseDto,
  SubjectScoreDto,
  TermRecordDto,
} from "../dtos/academic-record-response.dto";

const CONDUCT_VALUES: ConductGrade[] = ["Tot", "Kha", "TrungBinh", "Yeu"];

function mapConduct(raw: string | null): ConductGrade | null {
  if (raw === null) return null;
  return CONDUCT_VALUES.includes(raw as ConductGrade)
    ? (raw as ConductGrade)
    : null;
}

function mapSubject(dto: SubjectScoreDto): SubjectScore {
  const termAvg = calculateSubjectAvg(dto.tx1, dto.tx2, dto.giuaKy, dto.cuoiKy);
  return {
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    tx1: dto.tx1,
    tx2: dto.tx2,
    giuaKy: dto.giuaKy,
    cuoiKy: dto.cuoiKy,
    termAvg,
    rankBand: getRankBand(termAvg),
  };
}

function mapTerm(dto: TermRecordDto): TermRecord {
  const subjects = dto.subjects.map(mapSubject);
  const avgs = subjects
    .map((s) => s.termAvg)
    .filter((v): v is number => v !== null);
  const gpa =
    avgs.length === 0
      ? null
      : Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 100) / 100;

  return {
    termId: dto.termId,
    status: dto.status,
    classId: dto.classId,
    conductGrade: mapConduct(dto.conductGrade),
    sealedAt: dto.sealedAt,
    sealedBy: dto.sealedBy,
    unsealedAt: dto.unsealedAt,
    unsealReason: dto.unsealReason,
    subjects,
    gpa,
  };
}

function mapYear(
  dto: AcademicRecordResponseDto["years"][number],
): AcademicYear {
  const terms = dto.terms.map(mapTerm);
  return {
    yearId: dto.yearId,
    yearLabel: dto.yearLabel,
    classId: dto.classId,
    grade: dto.grade,
    isCurrent: dto.isCurrent,
    sealStatus: deriveYearSealStatus(terms),
    terms,
  };
}

/** Maps an academic-record API payload to the domain entity, computing each
 * subject's weighted termAvg + rank band, each term's GPA, and each year's
 * seal status. The record is `sealed` only when every year is all_sealed. */
export function academicRecordMapper(
  dto: AcademicRecordResponseDto,
): AcademicRecord {
  const years = dto.years.map(mapYear);
  return {
    studentId: dto.studentId,
    studentName: dto.studentName,
    studentCode: dto.studentCode,
    dateOfBirth: dto.dateOfBirth,
    currentClassId: dto.currentClassId,
    currentSchoolYear: dto.currentSchoolYear,
    years,
    sealed:
      years.length > 0 && years.every((y) => y.sealStatus === "all_sealed"),
    sealedAt: dto.sealedAt,
    sealedBy: dto.sealedBy,
  };
}
