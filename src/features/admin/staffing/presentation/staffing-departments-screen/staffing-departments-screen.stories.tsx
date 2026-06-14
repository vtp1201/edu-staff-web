import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
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

/**
 * ArchiveBlocked — discoverable static state.
 *
 * Reuses the Populated data which already contains an ACTIVE department with
 * `activeAssignmentCount: 2` ("Tổ Khoa học Tự nhiên"). For that row the archive
 * action is disabled (aria-disabled) and exposes a blocked tooltip, so the admin
 * cannot archive a department that still has active assignments.
 */
export const ArchiveBlocked: Story = {
  args: { initialDepartments: departments },
};

// ---------------------------------------------------------------------------
// Interaction play story — QA US-E12.9
// ---------------------------------------------------------------------------

/**
 * CreateHappyPath · AC-2 · Create department happy path
 *
 * Opens the create sheet, types a department name, submits, and verifies the
 * success toast ("Đã tạo tổ bộ môn.") rendered by sonner outside the canvas.
 * The `onCreateDepartment` action prop records the call.
 */
export const CreateHappyPath: Story = {
  name: "Interaction / Create department happy path",
  args: { initialDepartments: departments },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    await step("open create sheet", async () => {
      // Header CTA (the empty-state CTA uses a different label)
      const addBtn = canvas.getByRole("button", { name: "Thêm tổ bộ môn" });
      await userEvent.click(addBtn);
    });

    await step("sheet opens with the create title", async () => {
      const dialog = await body.findByRole("dialog");
      const sheetTitle = within(dialog).getByText("Thêm tổ bộ môn");
      expect(sheetTitle).toBeInTheDocument();
    });

    await step("type a department name", async () => {
      const nameInput = body.getByPlaceholderText("VD: Tổ Toán - Lý");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Tổ Tin học");
    });

    await step("submit the form", async () => {
      const submitBtn = body.getByRole("button", { name: "Tạo" });
      await userEvent.click(submitBtn);
    });

    await step("success toast appears", async () => {
      const toast = await body.findByText("Đã tạo tổ bộ môn.");
      expect(toast).toBeInTheDocument();
    });
  },
};
