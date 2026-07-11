import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import { StaffingPositionTitlesScreen } from "./staffing-position-titles-screen";

const titles: PositionTitle[] = [
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

const okTitle = async (input: {
  name: string;
  scopeType: "SUBJECT_PARENT" | "DEPARTMENT";
  permissions: PositionTitle["permissions"];
}) => ({
  ok: true as const,
  positionTitle: {
    id: `pt-${Math.random()}`,
    name: input.name,
    scopeType: input.scopeType,
    permissions: input.permissions,
    status: "ACTIVE" as const,
    activeAssignmentCount: 0,
  },
});

const errTitle = async () => ({
  ok: false as const,
  errorKey: "invalid-permissions" as const,
});
const okVoid = async () => ({ ok: true as const });

const meta: Meta<typeof StaffingPositionTitlesScreen> = {
  title: "Admin/Staffing/PositionTitlesScreen",
  component: StaffingPositionTitlesScreen,
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
    onCreatePositionTitle: okTitle,
    onPatchPositionTitle: async (_id, data) =>
      okTitle({
        name: "Updated",
        scopeType: "SUBJECT_PARENT",
        permissions: data.permissions,
      }),
    onArchivePositionTitle: okVoid,
  },
};
export default meta;
type Story = StoryObj<typeof StaffingPositionTitlesScreen>;

export const Populated: Story = {
  args: { initialPositionTitles: titles },
};

export const Empty: Story = {
  args: { initialPositionTitles: [] },
};

export const CreateError: Story = {
  args: { initialPositionTitles: titles, onCreatePositionTitle: errTitle },
};

export const ReadOnlyNonAdmin: Story = {
  args: { initialPositionTitles: titles, isAdmin: false },
};
