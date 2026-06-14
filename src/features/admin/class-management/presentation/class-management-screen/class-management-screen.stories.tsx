import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import type { TeacherMember } from "@/features/admin/class-management/domain/entities/teacher-member.entity";
import { ClassManagementScreen } from "./class-management-screen";
import type { ClassActionResult } from "./class-management-screen.i-vm";

const teachers: TeacherMember[] = [
  { userId: "u-1", displayName: "Nguyễn Thị Lan", email: "lan@edu.example" },
  { userId: "u-2", displayName: "Trần Văn Minh", email: "minh@edu.example" },
  { userId: "u-3", displayName: "Lê Hoàng Phúc", email: "phuc@edu.example" },
];

const mkClass = (over: Partial<Class>): Class => ({
  id: "c-1",
  name: "10A1",
  gradeLevel: 10,
  status: "ACTIVE",
  academicYear: "2025-2026",
  studentCount: 0,
  homeroomTeacherId: null,
  homeroomTeacherName: null,
  ...over,
});

const okResult = async (): Promise<ClassActionResult> => ({ ok: true });
const okWithClass = async (): Promise<ClassActionResult> => ({
  ok: true,
  data: mkClass({ id: `c-${Date.now()}`, name: "New" }),
});

const handlers = {
  onCreateClass: okWithClass,
  onRenameClass: async () => ({ ok: true, data: mkClass({}) }),
  onArchiveClass: okResult,
  onAssignHomeroom: okResult,
  onListTeachers: async () => ({ ok: true, data: teachers }),
};

const meta: Meta<typeof ClassManagementScreen> = {
  title: "Admin/ClassManagement/ClassManagementScreen",
  component: ClassManagementScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ClassManagementScreen>;

export const Empty: Story = {
  args: {
    vm: {
      classes: [],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

export const Populated: Story = {
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-10a1",
          name: "10A1",
          gradeLevel: 10,
          studentCount: 32,
          homeroomTeacherId: "u-1",
          homeroomTeacherName: "Nguyễn Thị Lan",
        }),
        mkClass({
          id: "c-10a2",
          name: "10A2",
          gradeLevel: 10,
          studentCount: 0,
        }),
        mkClass({
          id: "c-12c1",
          name: "12C1",
          gradeLevel: 12,
          status: "ARCHIVED",
          academicYear: "2024-2025",
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

export const WithHomeroomAssigned: Story = {
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-11b1",
          name: "11B1",
          gradeLevel: 11,
          studentCount: 28,
          homeroomTeacherId: "u-2",
          homeroomTeacherName: "Trần Văn Minh",
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};

export const ArchiveWithWarning: Story = {
  args: {
    vm: {
      classes: [
        mkClass({
          id: "c-busy",
          name: "10A9",
          gradeLevel: 10,
          studentCount: 40,
        }),
      ],
      nextCursor: null,
      hasMore: false,
      gradeRange: { minGrade: 10, maxGrade: 12 },
      teachers,
    },
    ...handlers,
  },
};
