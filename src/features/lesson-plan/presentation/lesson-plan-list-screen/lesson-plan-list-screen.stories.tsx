import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { LessonPlanEntity } from "../../domain/entities/lesson-plan.entity";
import { MOCK_CURRENT_TEACHER_ID } from "../../infrastructure/repositories/mocks/fixtures";
import { GRADE_OPTIONS } from "../shared.i-vm";
import { LessonPlanListScreen } from "./lesson-plan-list-screen";
import type { LessonPlanListScreenVM } from "./lesson-plan-list-screen.i-vm";

const plan = (over: Partial<LessonPlanEntity>): LessonPlanEntity => ({
  planId: "lp-1",
  teacherId: MOCK_CURRENT_TEACHER_ID,
  subjectId: "sub-math",
  gradeLevel: "11",
  title: "Giáo án — Đạo hàm",
  objectives: "o",
  contentOutline: "c",
  activities: "a",
  assessmentMethod: "m",
  status: "DRAFT",
  tags: ["Chương 5"],
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
  ...over,
});

const SUBJECTS = [
  { id: "sub-math", name: "Toán học" },
  { id: "sub-phys", name: "Vật Lý" },
];

const MINE = [
  plan({
    planId: "lp-1",
    status: "PUBLISHED",
    publishedAt: "2026-05-18T00:00:00Z",
  }),
  plan({ planId: "lp-2", status: "DRAFT", title: "Giáo án — Hàm số" }),
];

function baseVM(
  over: Partial<LessonPlanListScreenVM> = {},
): LessonPlanListScreenVM {
  return {
    initialMinePage: { items: MINE, hasMore: false },
    subjects: SUBJECTS,
    gradeOptions: [...GRADE_OPTIONS],
    currentTeacherId: MOCK_CURRENT_TEACHER_ID,
    createPath: "/vi/t/t1/teacher/lesson-plans/create",
    planPathPrefix: "/vi/t/t1/teacher/lesson-plans",
    notice: null,
    listMineAction: async () => ({
      ok: true,
      page: { items: MINE, hasMore: false },
    }),
    listBySubjectAction: async (subjectId) => ({
      ok: true,
      page: {
        items: [
          plan({
            planId: "lp-9",
            teacherId: "t-other",
            subjectId,
            status: "PUBLISHED",
            title: "Giáo án — của GV khác",
          }),
        ],
        hasMore: false,
      },
    }),
    ...over,
  };
}

const meta: Meta<typeof LessonPlanListScreen> = {
  title: "Features/LessonPlan/ListScreen",
  component: LessonPlanListScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, retryDelay: 0 } },
      });
      return (
        <NextIntlClientProvider locale="vi" messages={messages}>
          <QueryClientProvider client={qc}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
          </QueryClientProvider>
        </NextIntlClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof LessonPlanListScreen>;

/** Mine scope, seeded — renders DRAFT + PUBLISHED cards. */
export const Mine_Success: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Giáo án — Đạo hàm")).toBeVisible();
    await expect(canvas.getByText("Giáo án — Hàm số")).toBeVisible();
  },
};

/** Mine scope, empty (no filters) — empty state + create CTA. */
export const Mine_Empty: Story = {
  args: {
    vm: baseVM({
      initialMinePage: { items: [], hasMore: false },
      listMineAction: async () => ({
        ok: true,
        page: { items: [], hasMore: false },
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Chưa có giáo án nào")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Soạn giáo án đầu tiên/i }),
    ).toBeVisible();
  },
};

/** Mine scope, fetch failed — error state + retry. */
export const Mine_Error: Story = {
  args: {
    vm: baseVM({
      initialMinePage: null,
      listMineAction: async () => ({ ok: false, errorKey: "network-error" }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Không tải được danh sách giáo án"),
    ).toBeVisible();
  },
};

/** Browse scope with no subject chosen — distinct prompt, no fetch. */
export const Browse_Prompt: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Toàn trường/i }));
    await expect(
      await canvas.findByText("Chọn một môn học để xem giáo án"),
    ).toBeVisible();
  },
};

/** Access-denied redirect notice surfaced on the list. */
export const AccessDeniedNotice: Story = {
  args: { vm: baseVM({ notice: "access-denied" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Không có quyền truy cập"),
    ).toBeVisible();
  },
};

/** Not-found redirect notice — visibly distinct from access-denied. */
export const NotFoundNotice: Story = {
  args: { vm: baseVM({ notice: "not-found" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText("Không tìm thấy giáo án.")).toBeVisible(),
    );
  },
};
