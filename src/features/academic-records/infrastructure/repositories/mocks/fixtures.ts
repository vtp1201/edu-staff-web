import type {
  AcademicRecordRowDto,
  GradeSnapshotItemDto,
  ListStudentAcademicRecordsResponseDto,
} from "../../dtos/academic-record-response.dto";

/**
 * Mock/seed data in the REAL wire shape (US-E18.54): a FLAT
 * `(classId, termId)` record list with a DYNAMIC `gradeSnapshot` column array
 * and decimal STRING values — exactly what `GET /members/{memberId}/
 * academic-records` returns. The mock repository therefore runs the same
 * mapper + the same `buildAcademicRecord` grouping as the real one; only the
 * `classId → year` and `subjectId → name` collaborators are local maps.
 *
 * Subject/teacher names are DATA, not i18n copy.
 */

const SUBJECTS: Array<[id: string, name: string]> = [
  ["s-math", "Toán"],
  ["s-lit", "Ngữ Văn"],
  ["s-eng", "Tiếng Anh"],
  ["s-phys", "Vật Lý"],
  ["s-chem", "Hoá Học"],
  ["s-hist", "Lịch Sử"],
];

/** The `subjectId → name` map the real repo gets from the subject catalogue. */
export const MOCK_SUBJECT_NAMES = new Map(SUBJECTS);

/** The `classId → academicYearLabel` map the real repo derives from enrollments. */
export const MOCK_CLASS_YEARS = new Map([
  ["cls-8a1", "2023-2024"],
  ["cls-9a1", "2024-2025"],
  ["cls-10a1", "2025-2026"],
]);

/** The four assessment columns a Vietnamese term typically carries (TT22). */
const COLUMN_SHAPE: Array<[name: string, type: string, coefficient: string]> = [
  ["TX1", "REGULAR", "1.0"],
  ["TX2", "REGULAR", "1.0"],
  ["Giữa kỳ", "MIDTERM", "2.0"],
  ["Cuối kỳ", "FINAL", "3.0"],
];

function snapshot(seed: number): GradeSnapshotItemDto[] {
  const items: GradeSnapshotItemDto[] = [];
  SUBJECTS.forEach(([subjectId], subjectIndex) => {
    COLUMN_SHAPE.forEach(([columnName, columnType, coefficient], colIndex) => {
      const raw = 6 + ((seed + subjectIndex * 3 + colIndex) % 4);
      items.push({
        subjectId,
        columnId: `${subjectId}-${columnName}-${seed}`,
        columnName,
        columnType,
        coefficient,
        value: raw.toFixed(2),
      });
    });
  });
  return items;
}

function record(
  classId: string,
  termId: string,
  status: AcademicRecordRowDto["status"],
  seed: number,
  over: Partial<AcademicRecordRowDto> = {},
): AcademicRecordRowDto {
  const gradeSnapshot = status === "PENDING" ? [] : snapshot(seed);
  return {
    classId,
    termId,
    studentMemberId: "stu-001",
    status,
    gradeSnapshot,
    termAverage: status === "PENDING" ? "" : (7 + (seed % 2)).toFixed(2),
    resealCount: 0,
    ...over,
  };
}

export const MOCK_STUDENT_ACADEMIC_RECORDS: ListStudentAcademicRecordsResponseDto =
  {
    studentMemberId: "stu-001",
    records: [
      record("cls-8a1", "HK1", "SEALED", 0, {
        sealedAt: "2024-01-12T00:00:00Z",
        sealedBy: "adm-lan",
      }),
      record("cls-8a1", "HK2", "SEALED", 1, {
        sealedAt: "2024-05-28T00:00:00Z",
        sealedBy: "adm-lan",
      }),
      record("cls-9a1", "HK1", "SEALED", 2, {
        sealedAt: "2025-01-15T00:00:00Z",
        sealedBy: "adm-hung",
      }),
      record("cls-9a1", "HK2", "UNSEALED", 1, {
        sealedAt: "2025-05-30T00:00:00Z",
        sealedBy: "adm-hung",
        unsealedAt: "2025-06-10T00:00:00Z",
        unsealedBy: "adm-ha",
        unsealReason: "Điều chỉnh điểm môn Hoá Học theo phúc khảo.",
        resealCount: 1,
      }),
      record("cls-10a1", "HK1", "SEALED", 0, {
        sealedAt: "2026-01-18T00:00:00Z",
        sealedBy: "adm-ha",
      }),
      record("cls-10a1", "HK2", "PENDING", 0),
    ],
  };
