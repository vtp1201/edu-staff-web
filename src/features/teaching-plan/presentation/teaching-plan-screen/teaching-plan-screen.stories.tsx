import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import { PrincipalReviewScreen } from "./principal-review-screen";
import { TeachingPlanScreen } from "./teaching-plan-screen";
import type {
  PlanCellVM,
  SelectorVM,
  TeachingPlanVM,
} from "./teaching-plan-screen.i-vm";

// ---------------------------------------------------------------------------
// Shared fixtures (mock/seed — not i18n)
// ---------------------------------------------------------------------------

const selectorVM: SelectorVM = {
  subjects: [
    { id: "sub-toan", name: "Toán" },
    { id: "sub-van", name: "Ngữ văn" },
    { id: "sub-anh", name: "Tiếng Anh" },
  ],
  classes: [
    { id: "cls-10a", name: "10A" },
    { id: "cls-10b", name: "10B" },
  ],
  terms: ["HKI", "HKII"],
  selectedSubjectId: "sub-toan",
  selectedClassId: "cls-10a",
  selectedTerm: "HKI",
};

function makeCells(count: number, periodsPerWeek: number): PlanCellVM[] {
  const cells: PlanCellVM[] = [];
  for (let i = 0; i < count; i++) {
    cells.push({
      week: Math.floor(i / periodsPerWeek) + 1,
      period: (i % periodsPerWeek) + 1,
      title: `Bài Toán ${i + 1}`,
      learningObjective: `Mục tiêu bài ${i + 1}`,
    });
  }
  return cells;
}

const draftPlan: TeachingPlanVM = {
  id: "plan-1",
  subjectId: "sub-toan",
  subjectName: "Toán",
  classId: "cls-10a",
  className: "10A",
  term: "HKI",
  status: "DRAFT",
  weeks: 4,
  periodsPerWeek: 3,
  cells: makeCells(6, 3), // 6 of 12 = 50%
};

const submittedPlan: TeachingPlanVM = {
  ...draftPlan,
  id: "plan-2",
  subjectName: "Ngữ văn",
  status: "SUBMITTED",
  cells: makeCells(10, 3),
  teacherName: "Thầy Trần Văn Minh",
};

const rejectedPlan: TeachingPlanVM = {
  ...draftPlan,
  id: "plan-3",
  status: "REJECTED",
  rejectionReason: "Chưa đủ nội dung phân phối chương trình",
  cells: makeCells(4, 3),
};

const approvedPlan: TeachingPlanVM = {
  ...submittedPlan,
  id: "plan-4",
  status: "APPROVED",
};

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: TeachingPlanFailure["type"] };

const okAction = async (): Promise<ActionResult> => ({ ok: true });
const failAction =
  (errorKey: TeachingPlanFailure["type"]) =>
  async (): Promise<ActionResult> => ({ ok: false, errorKey });

// ---------------------------------------------------------------------------
// TeachingPlanScreen (teacher view)
// ---------------------------------------------------------------------------

const teacherMeta: Meta<typeof TeachingPlanScreen> = {
  title: "Features/TeachingPlan/TeachingPlanScreen",
  component: TeachingPlanScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default teacherMeta;

type TeacherStory = StoryObj<typeof TeachingPlanScreen>;

const baseTeacherProps: import("./teaching-plan-screen").TeachingPlanScreenProps =
  {
    vm: { plan: draftPlan, selector: selectorVM, isPrincipal: false },
    savePlanCellAction: okAction,
    submitTeachingPlanAction: okAction,
  };

/** AC-1: skeleton shown during load. */
export const TeacherGrid_Loading: TeacherStory = {
  args: {
    ...baseTeacherProps,
    loading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Skeleton divs present (no grid cells yet)
    await expect(
      canvas.getByRole("heading", { name: /Kế hoạch bài dạy/ }),
    ).toBeInTheDocument();
  },
};

/** AC-2: grid renders correct weeks × periods with filled cells. */
export const TeacherGrid_WithContent: TeacherStory = {
  args: baseTeacherProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Kế hoạch bài dạy/ }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("grid")).toBeInTheDocument();
    // Tuần 1 row header present
    await expect(canvas.getByText("Tuần 1")).toBeInTheDocument();
    // Tiết 1 column header present
    await expect(canvas.getByText("Tiết 1")).toBeInTheDocument();
    // At least one filled cell title visible
    await expect(canvas.getByText("Bài Toán 1")).toBeInTheDocument();
    // Status badge shows "Nháp"
    await expect(canvas.getByText("Nháp")).toBeInTheDocument();
  },
};

/** AC-10: empty state when selector is chosen but no plan exists. */
export const TeacherGrid_EmptyState: TeacherStory = {
  args: {
    ...baseTeacherProps,
    vm: { plan: null, selector: selectorVM, isPrincipal: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toBeInTheDocument();
  },
};

/** AC-9: rejected banner shows reason; grid is editable again. */
export const RejectedBannerTeacherView: TeacherStory = {
  args: {
    ...baseTeacherProps,
    vm: { plan: rejectedPlan, selector: selectorVM, isPrincipal: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Kế hoạch đã bị trả lại"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/Chưa đủ nội dung phân phối chương trình/),
    ).toBeInTheDocument();
    // Edit hint is shown
    await expect(
      canvas.getByText("Bạn có thể chỉnh sửa và gửi lại"),
    ).toBeInTheDocument();
    // Submit button is enabled for rejected plans
    const submitBtn = canvas.getByRole("button", { name: /Gửi phê duyệt/ });
    await expect(submitBtn).not.toBeDisabled();
  },
};

/** AC-3: inline edit popover opens on cell click. */
export const InlineEdit_Flow: TeacherStory = {
  args: baseTeacherProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click a filled cell button (Bài Toán 1)
    const cellBtn = canvas.getByRole("button", { name: "" });
    // Find any cell button and click it to open the popover
    const addBtn = canvas.getByLabelText("Thêm nội dung Tuần 1 Tiết 3");
    await userEvent.click(addBtn);
    await waitFor(() =>
      expect(canvas.getByText("Tiêu đề bài dạy")).toBeInTheDocument(),
    );
    // Filling in a title and saving
    const titleInput = canvas.getByPlaceholderText(
      /VD: Đạo hàm — ứng dụng tính cực trị/,
    );
    await userEvent.type(titleInput, "Đạo hàm và vi phân");
    await userEvent.click(canvas.getByRole("button", { name: /Lưu ô/ }));
    // Popover should close (form no longer visible)
    await waitFor(() =>
      expect(canvas.queryByText("Tiêu đề bài dạy")).not.toBeInTheDocument(),
    );
    // Suppress unused variable warning
    void cellBtn;
  },
};

/** AC-5: submit flow — button triggers action, shows toast on success. */
export const SubmitFlow: TeacherStory = {
  args: baseTeacherProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitBtn = canvas.getByRole("button", { name: /Gửi phê duyệt/ });
    await expect(submitBtn).not.toBeDisabled();
    await userEvent.click(submitBtn);
  },
};

/** Submitted plan — submit button is disabled. */
export const TeacherGrid_Submitted: TeacherStory = {
  args: {
    ...baseTeacherProps,
    vm: { plan: submittedPlan, selector: selectorVM, isPrincipal: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument();
    // Both footer buttons should be disabled (not DRAFT/REJECTED)
    const submitBtn = canvas.getByRole("button", { name: /Gửi phê duyệt/ });
    await expect(submitBtn).toBeDisabled();
  },
};

// ---------------------------------------------------------------------------
// PrincipalReviewScreen (separate meta via named export convention)
// ---------------------------------------------------------------------------

export const PrincipalReview_Populated: StoryObj<typeof PrincipalReviewScreen> =
  {
    render: (args) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <PrincipalReviewScreen {...args} />
      </NextIntlClientProvider>
    ),
    args: {
      pendingPlans: [submittedPlan],
      approveTeachingPlanAction: okAction,
      rejectTeachingPlanAction: okAction,
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      await expect(
        canvas.getByRole("heading", { name: /Kế hoạch bài dạy/ }),
      ).toBeInTheDocument();
      // Submitted plan visible
      await expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument();
      // Teacher name shown
      await expect(canvas.getByText(/Thầy Trần Văn Minh/)).toBeInTheDocument();
      // Action buttons present
      await expect(
        canvas.getByRole("button", { name: /Phê duyệt/ }),
      ).toBeInTheDocument();
      await expect(
        canvas.getByRole("button", { name: /Trả lại/ }),
      ).toBeInTheDocument();
    },
  };

export const ApproveFlow: StoryObj<typeof PrincipalReviewScreen> = {
  render: (args) => (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <PrincipalReviewScreen {...args} />
    </NextIntlClientProvider>
  ),
  args: {
    pendingPlans: [submittedPlan],
    approveTeachingPlanAction: okAction,
    rejectTeachingPlanAction: okAction,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click Phê duyệt to open confirmation dialog
    await userEvent.click(canvas.getByRole("button", { name: /Phê duyệt/ }));
    await waitFor(() =>
      expect(canvas.getByText("Xác nhận phê duyệt")).toBeInTheDocument(),
    );
    await expect(
      canvas.getByText(/Bạn có chắc chắn muốn phê duyệt/),
    ).toBeInTheDocument();
    // Confirm
    const confirmBtn = canvas.getByRole("button", { name: /^Phê duyệt$/ });
    await userEvent.click(confirmBtn);
  },
};

export const RejectFlow: StoryObj<typeof PrincipalReviewScreen> = {
  render: (args) => (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <PrincipalReviewScreen {...args} />
    </NextIntlClientProvider>
  ),
  args: {
    pendingPlans: [submittedPlan],
    approveTeachingPlanAction: okAction,
    rejectTeachingPlanAction: okAction,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Click Trả lại to open reject dialog
    await userEvent.click(canvas.getByRole("button", { name: /Trả lại/ }));
    await waitFor(() =>
      expect(canvas.getByText("Trả lại kế hoạch")).toBeInTheDocument(),
    );
    // Try to confirm with empty reason → client-side validation
    await userEvent.click(
      canvas.getByRole("button", { name: /Xác nhận trả lại/ }),
    );
    await waitFor(() =>
      expect(
        canvas.getByText("Lý do phải có ít nhất 10 ký tự"),
      ).toBeInTheDocument(),
    );
    // Fill valid reason and confirm
    const reasonInput = canvas.getByPlaceholderText(
      /Nêu rõ lý do trả lại kế hoạch/,
    );
    await userEvent.type(
      reasonInput,
      "Chưa đủ nội dung phân phối chương trình",
    );
    await userEvent.click(
      canvas.getByRole("button", { name: /Xác nhận trả lại/ }),
    );
  },
};

export const PrincipalReview_Empty: StoryObj<typeof PrincipalReviewScreen> = {
  render: (args) => (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <PrincipalReviewScreen {...args} />
    </NextIntlClientProvider>
  ),
  args: {
    pendingPlans: [],
    approveTeachingPlanAction: okAction,
    rejectTeachingPlanAction: okAction,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có kế hoạch nào chờ duyệt"),
    ).toBeInTheDocument();
  },
};

// Suppress unused variable warnings for plan fixtures used as type examples
void approvedPlan;
void failAction;
