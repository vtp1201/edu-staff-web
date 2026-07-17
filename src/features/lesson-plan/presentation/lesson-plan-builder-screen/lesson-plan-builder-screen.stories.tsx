import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import { GRADE_OPTIONS } from "../shared.i-vm";
import { LessonPlanBuilderScreen } from "./lesson-plan-builder-screen";
import type { LessonPlanBuilderScreenVM } from "./lesson-plan-builder-screen.i-vm";

const SUBJECTS = [
  { id: "sub-math", name: "Toán học" },
  { id: "sub-phys", name: "Vật Lý" },
];

const fullDraft: LessonPlanEntity = {
  planId: "lp-1",
  teacherId: "t-me",
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án — Đạo hàm và ý nghĩa hình học",
  objectives: "Học sinh nắm định nghĩa đạo hàm.",
  contentOutline: "1) Định nghĩa. 2) Ý nghĩa. 3) Tiếp tuyến.",
  activities: "Khởi động — Kiến thức — Luyện tập.",
  assessmentMethod: "Hỏi đáp + bài tập.",
  status: "DRAFT",
  tags: ["Chương 5"],
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
};

function vmOf(
  over: Partial<LessonPlanBuilderScreenVM>,
): LessonPlanBuilderScreenVM {
  return {
    initial: undefined,
    subjects: SUBJECTS,
    gradeOptions: [...GRADE_OPTIONS],
    lessonPlansPath: "/vi/t/t1/teacher/lesson-plans",
    editPathPrefix: "/vi/t/t1/teacher/lesson-plans",
    saveDraftAction: async (input) => ({
      ok: true,
      plan: { ...fullDraft, ...input, planId: input.id ?? "lp-new" },
    }),
    publishAction: async (id) => ({
      ok: true,
      plan: {
        ...fullDraft,
        planId: id,
        status: "PUBLISHED",
        publishedAt: "2026-06-01T00:00:00Z",
      },
    }),
    refetchAction: async (id) => ({
      ok: true,
      plan: { ...fullDraft, planId: id, status: "PUBLISHED" },
    }),
    ...over,
  };
}

const meta: Meta<typeof LessonPlanBuilderScreen> = {
  title: "Features/LessonPlan/BuilderScreen",
  component: LessonPlanBuilderScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="flex min-h-screen flex-col bg-[color:var(--edu-bg)]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof LessonPlanBuilderScreen>;

/** Create mode — empty; publish gate unmet → visible helper (AC-003.3). */
export const Create: Story = {
  args: { vm: vmOf({ initial: undefined }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(
        /Cần nhập tiêu đề và điền đủ 4 mục nội dung trước khi phát hành/i,
      ),
    ).toBeVisible();
  },
};

/** Edit DRAFT — fields populated, publishable (all sections filled). */
export const EditDraft: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByDisplayValue("Giáo án — Đạo hàm và ý nghĩa hình học"),
    ).toBeVisible();
  },
};

/** Locked PUBLISHED — locked banner, no Save/Publish controls (AC-005.4). */
export const LockedPublished: Story = {
  args: {
    vm: vmOf({
      initial: {
        ...fullDraft,
        status: "PUBLISHED",
        publishedAt: "2026-06-01T00:00:00Z",
      },
      planId: "lp-1",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Giáo án đã được xuất bản")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Lưu nháp/i }),
    ).not.toBeInTheDocument();
  },
};

/** Publish confirm dialog opens when the gate is satisfied (AC-004.1). */
export const PublishConfirmOpens: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Xuất bản/i }));
    await waitFor(() =>
      expect(within(document.body).getByRole("alertdialog")).toBeVisible(),
    );
    await expect(
      within(document.body).getByText("Xuất bản giáo án này?"),
    ).toBeVisible();
  },
};

/** Tag chips: the max-10 helper blocks the 11th add (AC-009.3). */
export const TagLimit: Story = {
  args: {
    vm: vmOf({
      initial: {
        ...fullDraft,
        tags: Array.from({ length: 10 }, (_, i) => `Thẻ ${i + 1}`),
      },
      planId: "lp-1",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 10 tags already → the input has no placeholder; select by its aria-label.
    const input = canvas.getByRole("textbox", { name: "Thẻ" });
    await userEvent.type(input, "Thẻ thừa{Enter}");
    await expect(
      await canvas.findByText("Tối đa 10 thẻ cho mỗi giáo án."),
    ).toBeVisible();
  },
};
