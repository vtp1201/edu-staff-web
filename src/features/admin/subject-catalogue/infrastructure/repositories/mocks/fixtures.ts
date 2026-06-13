import type { ClassSubject } from "../../../domain/entities/class-subject.entity";
import type { Subject } from "../../../domain/entities/subject.entity";
import type { SubjectParent } from "../../../domain/entities/subject-parent.entity";

export interface ParentWithSubjects extends SubjectParent {
  subjects: Subject[];
}

export const MOCK_CLASS_OFFERINGS: Record<string, ClassSubject[]> = {
  "sub-math-10": [
    {
      id: "cs-1",
      className: "Lớp 10A1",
      academicYear: "2025–2026",
      teacherName: "Nguyễn Thị Hương",
      studentCount: 42,
    },
    {
      id: "cs-2",
      className: "Lớp 10A2",
      academicYear: "2025–2026",
      teacherName: "Trần Văn Bình",
      studentCount: 41,
    },
    {
      id: "cs-3",
      className: "Lớp 10A3",
      academicYear: "2025–2026",
      teacherName: "Lê Thị Mai",
      studentCount: 40,
    },
  ],
  "sub-math-11": [
    {
      id: "cs-4",
      className: "Lớp 11A1",
      academicYear: "2025–2026",
      teacherName: "Nguyễn Thị Hương",
      studentCount: 40,
    },
    {
      id: "cs-5",
      className: "Lớp 11A2",
      academicYear: "2025–2026",
      teacherName: "Hoàng Minh Tuấn",
      studentCount: 41,
    },
  ],
  "sub-lit-10": [
    {
      id: "cs-l1",
      className: "Lớp 10A1",
      academicYear: "2025–2026",
      teacherName: "Đỗ Thị Lan",
      studentCount: 42,
    },
    {
      id: "cs-l2",
      className: "Lớp 10A2",
      academicYear: "2025–2026",
      teacherName: "Đỗ Thị Lan",
      studentCount: 41,
    },
  ],
  "sub-eng-10": [
    {
      id: "cs-e1",
      className: "Lớp 10A1",
      academicYear: "2025–2026",
      teacherName: "Nguyễn Hoàng Anh",
      studentCount: 42,
    },
  ],
};

const makeSubject = (
  id: string,
  parentId: string,
  name: string,
  code: string,
  gradeLevel: number,
  inUse: boolean,
  outcomeTargets = "",
): Subject => ({
  id,
  parentId,
  name,
  code,
  gradeLevel,
  status: "ACTIVE",
  inUse,
  periodCount: inUse ? 105 : null,
  requiredAssessmentCount: inUse ? 4 : null,
  outcomeTargets,
  masterSyllabus: inUse
    ? `https://drive.school/syllabus/${code.toLowerCase()}.pdf`
    : "",
  exerciseBankRef: "",
  examBankRef: "",
});

export const MOCK_PARENTS_WITH_SUBJECTS: ParentWithSubjects[] = [
  {
    id: "sp-math",
    name: "Bộ môn Toán",
    conceptType: "BO_MON",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 3,
    activeChildCount: 3,
    subjects: [
      makeSubject(
        "sub-math-10",
        "sp-math",
        "Toán lớp 10",
        "MATH10",
        10,
        true,
        "Học sinh nắm vững mệnh đề, tập hợp, hàm số bậc nhất – bậc hai.",
      ),
      makeSubject(
        "sub-math-11",
        "sp-math",
        "Toán lớp 11",
        "MATH11",
        11,
        true,
        "Lượng giác, dãy số, giới hạn, đạo hàm và hình học không gian.",
      ),
      makeSubject("sub-math-12", "sp-math", "Toán lớp 12", "MATH12", 12, false),
    ],
  },
  {
    id: "sp-lit",
    name: "Bộ môn Ngữ văn",
    conceptType: "BO_MON",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 2,
    activeChildCount: 2,
    subjects: [
      makeSubject(
        "sub-lit-10",
        "sp-lit",
        "Ngữ văn lớp 10",
        "LIT10",
        10,
        true,
        "Đọc hiểu văn bản văn học, viết bài nghị luận xã hội và văn học.",
      ),
      makeSubject("sub-lit-11", "sp-lit", "Ngữ văn lớp 11", "LIT11", 11, true),
    ],
  },
  {
    id: "sp-foreign",
    name: "Tổ Ngoại ngữ",
    conceptType: "TO",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 3,
    activeChildCount: 2,
    subjects: [
      makeSubject(
        "sub-eng-10",
        "sp-foreign",
        "Tiếng Anh lớp 10",
        "ENG10",
        10,
        true,
      ),
      makeSubject(
        "sub-eng-11",
        "sp-foreign",
        "Tiếng Anh lớp 11",
        "ENG11",
        11,
        true,
      ),
      {
        ...makeSubject(
          "sub-eng-12",
          "sp-foreign",
          "Tiếng Anh lớp 12",
          "ENG12",
          12,
          false,
        ),
        status: "ARCHIVED",
      },
    ],
  },
  {
    id: "sp-science",
    name: "Khoa Khoa học Tự nhiên",
    conceptType: "KHOA",
    conceptLabelCustom: null,
    status: "ACTIVE",
    childCount: 0,
    activeChildCount: 0,
    subjects: [],
  },
];
