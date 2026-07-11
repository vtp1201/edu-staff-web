import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { PositionAssignment } from "../../domain/entities/position-assignment.entity";
import type { PositionTitle } from "../../domain/entities/position-title.entity";
import { StaffingAssignmentsScreen } from "./staffing-assignments-screen";

const titles: PositionTitle[] = [
  {
    id: "pt-subject-head",
    name: "Tổ trưởng chuyên môn",
    scopeType: "SUBJECT_PARENT",
    permissions: ["MANAGE_SUBJECT_CONTENT"],
    status: "ACTIVE",
    activeAssignmentCount: 2,
  },
  {
    id: "pt-department-head",
    name: "Trưởng phòng",
    scopeType: "DEPARTMENT",
    permissions: ["APPROVE_LESSON_PLAN"],
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
  {
    id: "pa-2",
    memberId: "m-102",
    memberName: "Trần Văn Bình",
    positionTitleId: "pt-department-head",
    positionTitleName: "Trưởng phòng",
    scopeEntityId: null,
    academicYearId: "2025-2026",
    status: "ACTIVE",
    assignedAt: "2025-08-15T00:00:00.000Z",
  },
  {
    id: "pa-3",
    memberId: "m-103",
    memberName: "Lê Thị Mai",
    positionTitleId: "pt-deputy",
    positionTitleName: "Tổ phó",
    scopeEntityId: "dep-social",
    academicYearId: "2024-2025",
    status: "REVOKED",
    assignedAt: "2024-08-10T00:00:00.000Z",
  },
];

const okAssign = async (input: {
  memberId: string;
  positionTitleId: string;
  scopeEntityId: string | null;
  academicYearId: string;
}) => ({
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
});

const okCopy = async () => ({
  ok: true as const,
  result: { copiedCount: 4, skippedCount: 1 },
});
const okVoid = async () => ({ ok: true as const });

const meta: Meta<typeof StaffingAssignmentsScreen> = {
  title: "Admin/Staffing/AssignmentsScreen",
  component: StaffingAssignmentsScreen,
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
    positionTitles: titles,
    onAssignPosition: okAssign,
    onRevokeAssignment: okVoid,
    onCopyAssignments: okCopy,
  },
};
export default meta;
type Story = StoryObj<typeof StaffingAssignmentsScreen>;

export const Populated: Story = {
  args: { initialAssignments: assignments },
};

export const Empty: Story = {
  args: { initialAssignments: [] },
};

export const RevokeError: Story = {
  args: {
    initialAssignments: assignments,
    onRevokeAssignment: async () => ({
      ok: false as const,
      errorKey: "not-found" as const,
    }),
  },
};

export const ReadOnlyNonAdmin: Story = {
  args: { initialAssignments: assignments, isAdmin: false },
};

/**
 * CopyYear — discoverable static state.
 *
 * Shows the "Sao chép sang năm khác" CTA in the header. The copy-assignments
 * sheet is a controlled component (`open` from `useState`) so its open state
 * cannot be rendered statically; clicking the button opens the sheet to copy a
 * year's assignments into another academic year.
 */
export const CopyYear: Story = {
  args: { initialAssignments: assignments },
};

// ---------------------------------------------------------------------------
// Interaction play story — QA US-E12.9
// ---------------------------------------------------------------------------

/**
 * AssignHappyPath · AC-3 · Assign position happy path
 *
 * Opens the assign sheet, fills the member ID + academic year, and verifies the
 * submit button is present. (Position title is a Radix Select whose listbox
 * portals outside the canvas; the happy-path here exercises the open + field
 * entry up to the submit affordance.)
 */
export const AssignHappyPath: Story = {
  name: "Interaction / Assign position happy path",
  args: { initialAssignments: assignments },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("open assign sheet", async () => {
      const assignBtn = canvas.getByRole("button", { name: "Phân công" });
      await userEvent.click(assignBtn);
    });

    await step("assign sheet opens with the title", async () => {
      const dialog = await body.findByRole("dialog");
      const sheetTitle = within(dialog).getByText("Phân công chức vụ");
      expect(sheetTitle).toBeInTheDocument();
    });

    await step("type a member ID", async () => {
      const memberInput = body.getByPlaceholderText("VD: m-101");
      await userEvent.type(memberInput, "m-200");
    });

    await step("type an academic year", async () => {
      const yearInput = body.getByPlaceholderText("VD: 2025-2026");
      await userEvent.type(yearInput, "2026-2027");
    });

    await step("submit button is present", async () => {
      const dialog = body.getByRole("dialog");
      const submitBtn = within(dialog).getByRole("button", {
        name: "Phân công",
      });
      expect(submitBtn).toBeInTheDocument();
    });
  },
};
