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
            <div className="min-h-screen bg-background">
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

/**
 * Mine scope, filters active but no client-side match (AC-006.7, 2nd distinct
 * empty state) — a genuinely DIFFERENT title/body from Mine_Empty (no create
 * CTA here, since plans DO exist, they're just filtered out).
 *
 * QA NOTE: the clear-filters button is currently wired to `t("error.retry")`
 * ("Thử lại"/"Retry") instead of a dedicated "Bỏ lọc"/"Clear filters" copy —
 * confirmed via i18n JSON, no such key exists in the shipped `lessonPlan`
 * namespace. Functionally it does clear filters (asserted below), but the
 * label is misleading (reads as "Retry" on a non-error empty state) — flagged
 * as a QA defect (DEF-lesson-plan-01), not fixed here.
 */
export const Mine_FilteredEmpty: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Giáo án — Đạo hàm")).toBeVisible();
    await userEvent.type(
      canvas.getByRole("searchbox", { name: /Tìm kiếm giáo án theo tiêu đề/i }),
      "không tồn tại chuỗi này",
    );
    await expect(
      await canvas.findByText("Không tìm thấy giáo án"),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Soạn giáo án đầu tiên/i }),
    ).not.toBeInTheDocument();
    // Distinct from Mine_Empty's title — not the same generic empty state.
    await expect(
      canvas.queryByText("Chưa có giáo án nào"),
    ).not.toBeInTheDocument();
    // Functional proof the CTA clears filters (mislabeled "Thử lại" — DEF-lesson-plan-01).
    await userEvent.click(canvas.getByRole("button", { name: "Thử lại" }));
    await expect(await canvas.findByText("Giáo án — Đạo hàm")).toBeVisible();
  },
};

/**
 * Browse scope, subject chosen, results render (AC-007.3) — owner attribution
 * on every card, no status filter dropdown, no "create new plan" CTA anywhere.
 */
export const Browse_Success: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Toàn trường/i }));
    await userEvent.click(
      canvas.getByRole("combobox", { name: /Lọc theo môn học/i }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Toán học" }),
    );
    await expect(
      await canvas.findByText("Giáo án — của GV khác"),
    ).toBeVisible();
    await expect(canvas.getByText(/Giáo viên khác/i)).toBeVisible();
    await expect(
      canvas.queryByRole("combobox", { name: /Lọc theo trạng thái/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Soạn giáo án mới/i }),
    ).not.toBeInTheDocument();
  },
};

/** Browse scope, subject chosen, 0 published plans (AC-007.8) — distinct from Mine's empty states, no create CTA. */
export const Browse_Empty: Story = {
  args: {
    vm: baseVM({
      listBySubjectAction: async () => ({
        ok: true,
        page: { items: [], hasMore: false },
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Toàn trường/i }));
    await userEvent.click(
      canvas.getByRole("combobox", { name: /Lọc theo môn học/i }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Toán học" }),
    );
    await expect(
      await canvas.findByText("Chưa có giáo án nào được phát hành cho môn này"),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Soạn giáo án mới/i }),
    ).not.toBeInTheDocument();
  },
};

/** Browse scope fetch failure (AC-007.6) — EduError + retry, same surface as mine-scope failures. */
export const Browse_Error: Story = {
  args: {
    vm: baseVM({
      listBySubjectAction: async () => ({
        ok: false,
        errorKey: "network-error",
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Toàn trường/i }));
    await userEvent.click(
      canvas.getByRole("combobox", { name: /Lọc theo môn học/i }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Toán học" }),
    );
    await expect(
      await canvas.findByText("Không tải được danh sách giáo án"),
    ).toBeVisible();
  },
};

/**
 * NFR-002 responsive — 320px: card grid collapses to 1 column, filter bar
 * wraps, no horizontal scroll (real Chromium resize via `page.viewport`, per
 * the exam-bank precedent — `@storybook/addon-viewport` params alone don't
 * resize the vitest-browser render frame).
 */
export const Viewport320_NoOverflow: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(320, 800);
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Giáo án — Đạo hàm")).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321);
  },
};

/** NFR-002 — 1280px: full desktop layout, still no horizontal overflow. */
export const Viewport1280_NoOverflow: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(1280, 800);
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Giáo án — Đạo hàm")).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      1281,
    );
  },
};
