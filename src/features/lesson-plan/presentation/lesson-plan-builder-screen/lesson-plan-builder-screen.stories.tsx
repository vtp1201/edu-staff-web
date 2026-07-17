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
        <div className="flex min-h-screen flex-col bg-background">
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

/** Duplicate tag entered is silently ignored — no 2nd chip, no error (AC-009.2). */
export const TagDuplicateSilentIgnore: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // fullDraft already has tag "Chương 5" as one chip.
    const before = canvas.getAllByText("Chương 5");
    await expect(before).toHaveLength(1);
    const input = canvas.getByRole("textbox", { name: "Thẻ" });
    await userEvent.type(input, "Chương 5{Enter}");
    const after = canvas.getAllByText("Chương 5");
    await expect(after).toHaveLength(1); // still exactly one chip, no dupe
    await expect(input).toHaveValue(""); // input cleared, no error shown
  },
};

/**
 * Tag chip remove control: per-tag `aria-label` (AC-009.6), independently
 * keyboard-operable, and hidden entirely on a locked (PUBLISHED) plan.
 */
export const TagRemoveAriaLabelAndLockedHidden: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const removeBtn = canvas.getByRole("button", {
      name: "Xoá thẻ Chương 5",
    });
    await expect(removeBtn).toBeVisible();
    removeBtn.focus();
    await expect(removeBtn).toHaveFocus();
  },
};

/** Locked (PUBLISHED) plan: tag remove controls are entirely absent from the DOM. */
export const TagRemoveHiddenWhenLocked: Story = {
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
    await expect(canvas.getByText("Chương 5")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Xoá thẻ Chương 5" }),
    ).not.toBeInTheDocument();
  },
};

/**
 * AC-003.2/AC-003.3 — clicking Publish while the gate is unmet marks all
 * required fields "touched" with simultaneous inline errors, shows the flash
 * summary, never opens the confirm dialog; the disabled reason is exposed via
 * `aria-disabled` + a visible helper (not visual dimming alone).
 */
export const PublishGateBlocked: Story = {
  args: {
    vm: vmOf({
      initial: { ...fullDraft, contentOutline: "", activities: "" },
      planId: "lp-1",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const publishBtn = canvas.getByRole("button", { name: /Xuất bản/i });
    await expect(publishBtn).toHaveAttribute("aria-disabled", "true");
    const helperId = publishBtn.getAttribute("aria-describedby");
    await expect(helperId).toBeTruthy();
    await expect(
      canvas.getByText(
        /Cần nhập tiêu đề và điền đủ 4 mục nội dung trước khi phát hành/i,
      ),
    ).toBeVisible();

    await userEvent.click(publishBtn);
    // Confirm dialog never opens.
    await expect(
      within(document.body).queryByRole("alertdialog"),
    ).not.toBeInTheDocument();
    // Both empty sections now show a simultaneous inline required error.
    const alerts = canvas.getAllByRole("alert");
    await expect(alerts.length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * AC-002.4 (race) — Save Draft hits `already-published` (plan was published
 * elsewhere between load and this save): the UI auto-locks to read-only,
 * refetches to sync state, and surfaces the discarded-edit banner (never
 * silently drops the unsaved edit without telling the teacher).
 */
export const SaveDraftAlreadyPublishedRace: Story = {
  args: {
    vm: vmOf({
      initial: fullDraft,
      planId: "lp-1",
      saveDraftAction: async () => ({
        ok: false,
        errorKey: "already-published",
      }),
      refetchAction: async (id) => ({
        ok: true,
        plan: {
          ...fullDraft,
          planId: id,
          status: "PUBLISHED",
          publishedAt: "2026-06-05T00:00:00Z",
        },
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const titleInput = canvas.getByDisplayValue(
      "Giáo án — Đạo hàm và ý nghĩa hình học",
    );
    await userEvent.clear(titleInput);
    await userEvent.type(
      titleInput,
      "Sửa tiêu đề trong lúc bị publish nơi khác",
    );
    await userEvent.click(canvas.getByRole("button", { name: /Lưu nháp/i }));
    // Race banner surfaces the discarded-edit notice.
    await expect(
      await canvas.findByText(/đã được phát hành ở nơi khác/i),
    ).toBeVisible();
    // Auto-locks to read-only: locked banner appears, no Save/Publish controls.
    await expect(
      await canvas.findByText("Giáo án đã được xuất bản"),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Lưu nháp/i }),
    ).not.toBeInTheDocument();
  },
};

/**
 * AC-004.5 (race) — confirming Publish hits `already-published` (already
 * published elsewhere): dialog closes, error banner shows, UI refetches and
 * refreshes to the locked view (idempotent end state).
 */
export const PublishAlreadyPublishedRace: Story = {
  args: {
    vm: vmOf({
      initial: fullDraft,
      planId: "lp-1",
      publishAction: async () => ({
        ok: false,
        errorKey: "already-published",
      }),
      refetchAction: async (id) => ({
        ok: true,
        plan: {
          ...fullDraft,
          planId: id,
          status: "PUBLISHED",
          publishedAt: "2026-06-05T00:00:00Z",
        },
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Xuất bản/i }));
    await waitFor(() =>
      expect(within(document.body).getByRole("alertdialog")).toBeVisible(),
    );
    await userEvent.click(
      within(document.body).getByRole("button", { name: /Xuất bản$/i }),
    );
    // Dialog closes.
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("alertdialog"),
      ).not.toBeInTheDocument(),
    );
    await expect(
      await within(document.body).findByText(/đã được phát hành ở nơi khác/i),
    ).toBeVisible();
    // Refetched to the locked end state.
    await expect(
      await canvas.findByText("Giáo án đã được xuất bản"),
    ).toBeVisible();
  },
};

/**
 * AC-010.1/AC-010.2 — the "Chưa lưu" dot appears immediately on any field
 * edit, and clears immediately on a successful Save Draft (does not wait for
 * a subsequent refetch — the mock `saveDraftAction` resolves synchronously
 * with the saved plan and the indicator must already be gone by then).
 */
export const UnsavedIndicatorAppearsAndClearsOnSave: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText("Chưa lưu")).not.toBeInTheDocument();
    const titleInput = canvas.getByDisplayValue(
      "Giáo án — Đạo hàm và ý nghĩa hình học",
    );
    await userEvent.type(titleInput, " v2");
    await expect(await canvas.findByText("Chưa lưu")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /Lưu nháp/i }));
    await waitFor(() =>
      expect(canvas.queryByText("Chưa lưu")).not.toBeInTheDocument(),
    );
  },
};

/**
 * AC-002.1/AC-002.8 — on the edit route the subject field renders as a
 * disabled/read-only display, never an editable `<select>`.
 */
export const EditDraftSubjectLocked: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const subjectTrigger = canvas.getByRole("combobox", {
      name: /Môn học|Subject/i,
    });
    await expect(subjectTrigger).toBeDisabled();
  },
};

/**
 * NFR-002 responsive — below the 1024px `lg:` breakpoint the 2-column builder
 * (320px meta panel + document sections) stacks to a single column; no
 * horizontal overflow at 375px.
 */
export const ViewportMobile_Stacks: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 900);
    const canvas = within(canvasElement);
    await expect(
      canvas.getByDisplayValue("Giáo án — Đạo hàm và ý nghĩa hình học"),
    ).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(376);
  },
};

/** NFR-002 — at 1280px the builder's `lg:` 2-column layout is engaged. */
export const ViewportDesktop_TwoColumn: Story = {
  args: { vm: vmOf({ initial: fullDraft, planId: "lp-1" }) },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(1280, 900);
    const canvas = within(canvasElement);
    const titleInput = canvas.getByDisplayValue(
      "Giáo án — Đạo hàm và ý nghĩa hình học",
    );
    const metaPanel = titleInput.closest(
      ".lg\\:grid-cols-\\[320px_1fr\\]",
    ) as HTMLElement | null;
    // Confirm the grid container is present and its computed column template
    // actually reflects the 2-column split at this viewport (not just present
    // in the className string, which would be a vacuous check).
    const grid = canvasElement.querySelector(
      ".lg\\:grid-cols-\\[320px_1fr\\]",
    ) as HTMLElement;
    await expect(grid).toBeTruthy();
    const style = window.getComputedStyle(grid);
    await expect(style.gridTemplateColumns).toContain("320px");
    await expect(metaPanel).toBeTruthy();
  },
};
