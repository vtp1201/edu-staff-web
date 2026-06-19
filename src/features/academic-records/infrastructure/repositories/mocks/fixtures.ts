import type {
  AcademicRecordResponseDto,
  SubjectScoreDto,
} from "../../dtos/academic-record-response.dto";

/** Mock/seed data — student names + subject names are DATA, not i18n copy. */

function subject(
  subjectId: string,
  subjectName: string,
  tx1: number | null,
  tx2: number | null,
  giuaKy: number | null,
  cuoiKy: number | null,
): SubjectScoreDto {
  return { subjectId, subjectName, tx1, tx2, giuaKy, cuoiKy };
}

function sixSubjects(seed: number): SubjectScoreDto[] {
  const f = (base: number) => Math.min(10, Math.max(2, base + (seed % 3)));
  return [
    subject("math", "Toán", f(8), f(7), f(8), f(9)),
    subject("lit", "Ngữ Văn", f(7), f(6), f(7), f(7)),
    subject("eng", "Tiếng Anh", f(9), f(8), f(9), f(8)),
    subject("phys", "Vật Lý", f(6), f(7), f(6), f(7)),
    subject("chem", "Hoá Học", f(5), f(6), f(5), f(6)),
    subject("hist", "Lịch Sử", f(8), f(8), f(7), f(8)),
  ];
}

export const ACADEMIC_RECORD_YEAR_IDS = [
  "2023-2024",
  "2024-2025",
  "2025-2026",
] as const;

export const MOCK_ACADEMIC_RECORD: AcademicRecordResponseDto = {
  studentId: "std-001",
  studentName: "Nguyễn Minh Khoa",
  studentCode: "NDU-2009-0184",
  dateOfBirth: "2009-04-12",
  currentClassId: "10A1",
  currentSchoolYear: "2025-2026",
  sealed: false,
  sealedAt: null,
  sealedBy: null,
  years: [
    {
      yearId: "2023-2024",
      yearLabel: "2023 — 2024",
      classId: "8A1",
      grade: 8,
      isCurrent: false,
      terms: [
        {
          termId: "HK1",
          status: "SEALED",
          classId: "8A1",
          conductGrade: "Tot",
          sealedAt: "2024-01-12",
          sealedBy: "Cô Trần Thị Lan",
          unsealedAt: null,
          unsealReason: null,
          subjects: sixSubjects(0),
        },
        {
          termId: "HK2",
          status: "SEALED",
          classId: "8A1",
          conductGrade: "Tot",
          sealedAt: "2024-05-28",
          sealedBy: "Cô Trần Thị Lan",
          unsealedAt: null,
          unsealReason: null,
          subjects: sixSubjects(1),
        },
      ],
    },
    {
      yearId: "2024-2025",
      yearLabel: "2024 — 2025",
      classId: "9A1",
      grade: 9,
      isCurrent: false,
      terms: [
        {
          termId: "HK1",
          status: "SEALED",
          classId: "9A1",
          conductGrade: "Kha",
          sealedAt: "2025-01-15",
          sealedBy: "Thầy Lê Văn Hùng",
          unsealedAt: null,
          unsealReason: null,
          subjects: sixSubjects(2),
        },
        {
          termId: "HK2",
          status: "UNSEALED",
          classId: "9A1",
          conductGrade: "Kha",
          sealedAt: "2025-05-30",
          sealedBy: "Thầy Lê Văn Hùng",
          unsealedAt: "2025-06-10",
          unsealReason: "Điều chỉnh điểm môn Hoá Học theo phúc khảo.",
          subjects: sixSubjects(1),
        },
      ],
    },
    {
      yearId: "2025-2026",
      yearLabel: "2025 — 2026",
      classId: "10A1",
      grade: 10,
      isCurrent: true,
      terms: [
        {
          termId: "HK1",
          status: "SEALED",
          classId: "10A1",
          conductGrade: "Tot",
          sealedAt: "2026-01-18",
          sealedBy: "Cô Phạm Thu Hà",
          unsealedAt: null,
          unsealReason: null,
          subjects: sixSubjects(0),
        },
        {
          termId: "HK2",
          status: "PENDING",
          classId: "10A1",
          conductGrade: null,
          sealedAt: null,
          sealedBy: null,
          unsealedAt: null,
          unsealReason: null,
          subjects: [],
        },
      ],
    },
  ],
};
