import type { Department } from "../../../domain/entities/department.entity";
import type { PositionAssignment } from "../../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../../domain/entities/position-title.entity";

export const MOCK_DEPARTMENTS: Department[] = [
  {
    id: "dep-natural-sciences",
    name: "Tổ Khoa học Tự nhiên",
    conceptLabelSuggested: "TO",
    conceptLabelCustom: "Tổ chuyên môn",
    subjectParentIds: ["sp-math", "sp-physics", "sp-chemistry"],
    status: "ACTIVE",
    activeAssignmentCount: 2,
  },
  {
    id: "dep-social-sciences",
    name: "Tổ Khoa học Xã hội",
    conceptLabelSuggested: "TO",
    conceptLabelCustom: "Tổ chuyên môn",
    subjectParentIds: ["sp-literature", "sp-history"],
    status: "ACTIVE",
    activeAssignmentCount: 0,
  },
  {
    id: "dep-foreign-languages",
    name: "Tổ Ngoại ngữ",
    conceptLabelSuggested: null,
    conceptLabelCustom: null,
    subjectParentIds: ["sp-english"],
    status: "ARCHIVED",
    activeAssignmentCount: 0,
  },
];

export const MOCK_POSITION_TITLES: PositionTitle[] = [
  {
    id: "pt-subject-head",
    name: "Tổ trưởng chuyên môn",
    scopeType: "SUBJECT_PARENT",
    permissions: ["MANAGE_SUBJECT_CONTENT", "VIEW_GRADE_DATA"],
    status: "ACTIVE",
    activeAssignmentCount: 2,
  },
  {
    id: "pt-department-head",
    name: "Trưởng phòng",
    scopeType: "DEPARTMENT",
    permissions: ["VIEW_TEACHER_ASSIGNMENTS", "MANAGE_TEACHER_ASSIGNMENTS"],
    status: "ACTIVE",
    activeAssignmentCount: 1,
  },
  {
    id: "pt-deputy",
    name: "Tổ phó",
    scopeType: "DEPARTMENT",
    permissions: ["VIEW_TEACHER_ASSIGNMENTS"],
    status: "ARCHIVED",
    activeAssignmentCount: 0,
  },
];

export const MOCK_ASSIGNMENTS: PositionAssignment[] = [
  {
    id: "pa-1",
    memberId: "m-101",
    memberName: "Nguyễn Thị Hương",
    positionTitleId: "pt-subject-head",
    positionTitleName: "Tổ trưởng chuyên môn",
    scopeEntityId: "sp-math",
    academicYearId: "ay-2025-2026",
    status: "ACTIVE",
    assignedAt: "2025-08-15T00:00:00.000Z",
  },
  {
    id: "pa-2",
    memberId: "m-102",
    memberName: "Trần Văn Bình",
    positionTitleId: "pt-subject-head",
    positionTitleName: "Tổ trưởng chuyên môn",
    scopeEntityId: "sp-physics",
    academicYearId: "ay-2025-2026",
    status: "ACTIVE",
    assignedAt: "2025-08-15T00:00:00.000Z",
  },
  {
    id: "pa-3",
    memberId: "m-103",
    memberName: "Lê Thị Mai",
    positionTitleId: "pt-department-head",
    positionTitleName: "Trưởng phòng",
    scopeEntityId: "dep-natural-sciences",
    academicYearId: "ay-2025-2026",
    status: "ACTIVE",
    assignedAt: "2025-08-20T00:00:00.000Z",
  },
  {
    id: "pa-4",
    memberId: "m-104",
    memberName: "Phạm Văn Cường",
    positionTitleId: "pt-deputy",
    positionTitleName: "Tổ phó",
    scopeEntityId: "dep-social-sciences",
    academicYearId: "ay-2024-2025",
    status: "REVOKED",
    assignedAt: "2024-08-10T00:00:00.000Z",
  },
];
