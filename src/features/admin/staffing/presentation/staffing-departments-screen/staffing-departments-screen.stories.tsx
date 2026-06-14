import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { Department } from "../../domain/entities/department.entity";
import { StaffingDepartmentsScreen } from "./staffing-departments-screen";

const departments: Department[] = [
  {
    id: "dep-natural-sciences",
    name: "Tổ Khoa học Tự nhiên",
    conceptLabel: "Tổ chuyên môn",
    subjectParentIds: ["sp-math", "sp-physics"],
    status: "ACTIVE",
    activeAssignmentCount: 2,
  },
  {
    id: "dep-social-sciences",
    name: "Tổ Khoa học Xã hội",
    conceptLabel: "Tổ chuyên môn",
    subjectParentIds: ["sp-literature"],
    status: "ACTIVE",
    activeAssignmentCount: 0,
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

const okDepartment = async (input: { name: string }) => ({
  ok: true as const,
  department: {
    id: `dep-${Math.random()}`,
    name: input.name,
    conceptLabel: null,
    subjectParentIds: [],
    status: "ACTIVE" as const,
    activeAssignmentCount: 0,
  },
});

const errDepartment = async () => ({
  ok: false as const,
  errorKey: "already-exists" as const,
});
const okVoid = async () => ({ ok: true as const });

const meta: Meta<typeof StaffingDepartmentsScreen> = {
  title: "Admin/Staffing/DepartmentsScreen",
  component: StaffingDepartmentsScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    isAdmin: true,
    onCreateDepartment: okDepartment,
    onPatchDepartment: async (_id, data) =>
      okDepartment({ name: data.name ?? "" }),
    onArchiveDepartment: okVoid,
  },
};
export default meta;
type Story = StoryObj<typeof StaffingDepartmentsScreen>;

export const Populated: Story = {
  args: { initialDepartments: departments },
};

export const Empty: Story = {
  args: { initialDepartments: [] },
};

export const CreateError: Story = {
  args: { initialDepartments: departments, onCreateDepartment: errDepartment },
};

export const ReadOnlyNonAdmin: Story = {
  args: { initialDepartments: departments, isAdmin: false },
};
