import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { Department } from "../../domain/entities/department.entity";
import type { PositionAssignment } from "../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import { StaffingScreen } from "./staffing-screen";

const departments: Department[] = [
  {
    id: "dep-natural-sciences",
    name: "Tổ Khoa học Tự nhiên",
    conceptLabel: "Tổ chuyên môn",
    subjectParentIds: ["sp-math"],
    status: "ACTIVE",
    activeAssignmentCount: 2,
  },
  {
    id: "dep-foreign-languages",
    name: "Tổ Ngoại ngữ",
    conceptLabel: null,
    subjectParentIds: ["sp-english"],
    status: "ARCHIVED",
    activeAssignmentCount: 0,
  },
];

const positionTitles: PositionTitle[] = [
  {
    id: "pt-subject-head",
    name: "Tổ trưởng chuyên môn",
    scopeType: "SUBJECT_PARENT",
    permissions: ["MANAGE_SUBJECT_CONTENT", "VIEW_REPORTS"],
    status: "ACTIVE",
    activeAssignmentCount: 2,
  },
  {
    id: "pt-department-head",
    name: "Trưởng phòng",
    scopeType: "DEPARTMENT",
    permissions: ["MANAGE_SCHEDULE"],
    status: "ACTIVE",
    activeAssignmentCount: 1,
  },
];

const assignments: PositionAssignment[] = [
  {
    id: "pa-1",
    memberId: "m-101",
    memberName: "Nguyễn Thị Hương",
    positionTitleId: "pt-subject-head",
    positionTitleName: "Tổ trưởng chuyên môn",
    scopeEntityId: "sp-math",
    academicYearId: "2025-2026",
    status: "ACTIVE",
    assignedAt: "2025-08-15T00:00:00.000Z",
  },
];

const okVoid = async () => ({ ok: true as const });

const meta: Meta<typeof StaffingScreen> = {
  title: "Admin/Staffing/StaffingScreen",
  component: StaffingScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: {
    isAdmin: true,
    onCreateDepartment: async (input) => ({
      ok: true as const,
      department: {
        id: `dep-${Math.random()}`,
        name: input.name,
        conceptLabel: null,
        subjectParentIds: [],
        status: "ACTIVE" as const,
        activeAssignmentCount: 0,
      },
    }),
    onPatchDepartment: async (_id, data) => ({
      ok: true as const,
      department: {
        id: _id,
        name: data.name ?? "",
        conceptLabel: null,
        subjectParentIds: [],
        status: "ACTIVE" as const,
        activeAssignmentCount: 0,
      },
    }),
    onArchiveDepartment: okVoid,
    onCreatePositionTitle: async (input) => ({
      ok: true as const,
      positionTitle: {
        id: `pt-${Math.random()}`,
        name: input.name,
        scopeType: input.scopeType,
        permissions: input.permissions,
        status: "ACTIVE" as const,
        activeAssignmentCount: 0,
      },
    }),
    onPatchPositionTitle: async (_id, data) => ({
      ok: true as const,
      positionTitle: {
        id: _id,
        name: "Updated",
        scopeType: "SUBJECT_PARENT" as const,
        permissions: data.permissions,
        status: "ACTIVE" as const,
        activeAssignmentCount: 0,
      },
    }),
    onArchivePositionTitle: okVoid,
    onAssignPosition: async (input) => ({
      ok: true as const,
      assignment: {
        id: `pa-${Math.random()}`,
        memberId: input.memberId,
        memberName: input.memberId,
        positionTitleId: input.positionTitleId,
        positionTitleName: "Tổ trưởng chuyên môn",
        scopeEntityId: input.scopeEntityId,
        academicYearId: input.academicYearId,
        status: "ACTIVE" as const,
        assignedAt: new Date().toISOString(),
      },
    }),
    onRevokeAssignment: okVoid,
    onCopyAssignments: async () => ({
      ok: true as const,
      result: { copiedCount: 3, skippedCount: 0 },
    }),
  },
};
export default meta;
type Story = StoryObj<typeof StaffingScreen>;

export const Populated: Story = {
  args: {
    initialDepartments: departments,
    initialPositionTitles: positionTitles,
    initialAssignments: assignments,
  },
};

export const AllEmpty: Story = {
  args: {
    initialDepartments: [],
    initialPositionTitles: [],
    initialAssignments: [],
  },
};
