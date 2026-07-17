import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { QuestionEntity } from "../../domain/entities/question.entity";
import { QuestionBankListScreen } from "./question-bank-list-screen";
import type { QuestionBankListScreenVM } from "./question-bank-list-screen.i-vm";

const q = (over: Partial<QuestionEntity>): QuestionEntity => ({
  id: "q-1",
  tenantId: "tn-1",
  authorId: "t-me",
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "12",
  difficulty: "HARD",
  body: "Giải phương trình lượng giác 2sin²x − 3sinx + 1 = 0.",
  expectedAnswer: "Đặt t = sin(x)…",
  status: "DRAFT",
  tags: ["Lượng giác"],
  createdAt: "2026-05-10T00:00:00Z",
  updatedAt: "2026-05-18T00:00:00Z",
  ...over,
});

const SUBJECTS = [
  { id: "sub-math", name: "Toán học" },
  { id: "sub-phys", name: "Vật Lý" },
];

const MINE = [
  q({ id: "q-1", status: "PUBLISHED", publishedAt: "2026-05-18T00:00:00Z" }),
  q({
    id: "q-2",
    status: "DRAFT",
    questionType: "SHORT_ANSWER",
    difficulty: "EASY",
    body: "Đạo hàm của f(x) = x³ tại x = 2 là bao nhiêu?",
  }),
];

function baseVM(
  over: Partial<QuestionBankListScreenVM> = {},
): QuestionBankListScreenVM {
  return {
    initialMinePage: { items: MINE, hasMore: false },
    subjects: SUBJECTS,
    gradeOptions: ["10", "11", "12"],
    currentTeacherId: "t-me",
    createPath: "/vi/t/t1/teacher/question-bank/create",
    editPathPrefix: "/vi/t/t1/teacher/question-bank",
    notice: null,
    listMineAction: async () => ({
      ok: true,
      page: { items: MINE, hasMore: false },
    }),
    searchAction: async (params) => ({
      ok: true,
      page: {
        items: [
          q({
            id: "q-pub",
            authorId: "t-other",
            subjectId: params.subjectId ?? "sub-phys",
            status: "PUBLISHED",
            body: "Câu hỏi đã phát hành của giáo viên khác.",
          }),
        ],
        hasMore: false,
      },
    }),
    ...over,
  };
}

const meta: Meta<typeof QuestionBankListScreen> = {
  title: "Features/QuestionBank/ListScreen",
  component: QuestionBankListScreen,
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

type Story = StoryObj<typeof QuestionBankListScreen>;

/** Mine scope, seeded — renders own DRAFT + PUBLISHED row cards. */
export const Mine_Success: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/Giải phương trình lượng giác/),
    ).toBeVisible();
    await expect(canvas.getByText(/Đạo hàm của f/)).toBeVisible();
    // Type + difficulty badges present (icon+text, NFR-001).
    await expect(canvas.getAllByText("Tự luận").length).toBeGreaterThan(0);
  },
};

/** Mine scope, no questions ever created — emptyAll + create CTA. */
export const Mine_EmptyAll: Story = {
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
    await expect(await canvas.findByText("Chưa có câu hỏi nào")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /Tạo câu hỏi đầu tiên/ }),
    ).toBeVisible();
  },
};

/** Mine scope, filters applied but no match — emptyFiltered + clear-filters CTA. */
export const Mine_FilteredEmpty: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/Giải phương trình lượng giác/),
    ).toBeVisible();
    await userEvent.type(
      canvas.getByRole("searchbox", { name: /Tìm kiếm câu hỏi/ }),
      "chuỗi không tồn tại xyz",
    );
    await expect(
      await canvas.findByText("Không tìm thấy câu hỏi"),
    ).toBeVisible();
    // Distinct 4th state — clear-filters CTA, NOT the emptyAll create CTA.
    const clear = canvas.getByRole("button", { name: "Xoá bộ lọc" });
    await expect(clear).toBeVisible();
    await userEvent.click(clear);
    await expect(
      await canvas.findByText(/Giải phương trình lượng giác/),
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
      await canvas.findByText("Không tải được danh sách câu hỏi"),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Thử lại" })).toBeVisible();
  },
};

/**
 * Search scope, no filter — DISTINCT required-filter gate, no request fires.
 * AC-902.1 requires this to be proven at the network-call level, not just
 * visually — spy on `searchAction` and assert it is NEVER invoked while the
 * gate is unsatisfied (TanStack Query `enabled:false` should keep queryFn
 * from ever running).
 */
export const Search_Gate: Story = {
  args: { vm: baseVM({ searchAction: fn(baseVM().searchAction) }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Tìm kiếm/ }));
    await expect(
      await canvas.findByText("Chọn môn học hoặc thẻ để tìm câu hỏi"),
    ).toBeVisible();
    // Indicator shows the unsatisfied (warning) copy.
    await expect(canvas.getByText("Cần chọn môn học hoặc thẻ")).toBeVisible();
    // Give any (incorrect) in-flight request a chance to resolve, then assert
    // the queryFn was truly never invoked (AC-902.1's network-level proof).
    await new Promise((r) => setTimeout(r, 200));
    await expect(args.vm.searchAction).not.toHaveBeenCalled();
  },
};

/** Search scope satisfied via SUBJECT (not tag) — indicator flips + request fires (AC-902.2). */
export const Search_SubjectSatisfies: Story = {
  args: { vm: baseVM({ searchAction: fn(baseVM().searchAction) }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Tìm kiếm/ }));
    await userEvent.click(
      canvas.getByRole("combobox", { name: /Lọc theo môn học/ }),
    );
    const listbox = within(document.body);
    await userEvent.click(await listbox.findByText("Vật Lý"));
    // Indicator flips satisfied synchronously (no debounce needed via subject).
    await expect(
      await canvas.findByText("Đã đủ điều kiện tìm kiếm"),
    ).toBeVisible();
    await waitFor(() => expect(args.vm.searchAction).toHaveBeenCalled());
    const [params] = (args.vm.searchAction as ReturnType<typeof fn>).mock
      .calls[0] as [{ subjectId?: string }];
    expect(params.subjectId).toBe("sub-phys");
  },
};

/**
 * AC-902.4 — clearing both subjectId and tag after a satisfied search reverts
 * to the required-filter-prompt (gate re-imposed), no further request fires.
 */
export const Search_ClearRevertsToGate: Story = {
  args: { vm: baseVM({ searchAction: fn(baseVM().searchAction) }) },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Tìm kiếm/ }));
    const tagInput = canvas.getByRole("searchbox", { name: /Lọc theo thẻ/ });
    await userEvent.type(tagInput, "Lượng giác");
    await waitFor(() => expect(args.vm.searchAction).toHaveBeenCalled());
    await expect(
      await canvas.findByText("Câu hỏi đã phát hành của giáo viên khác."),
    ).toBeVisible();

    // Clear the tag back to empty — gate must re-impose (subjectId is also unset).
    await userEvent.clear(tagInput);
    await expect(
      await canvas.findByText("Chọn môn học hoặc thẻ để tìm câu hỏi"),
    ).toBeVisible();
    await expect(canvas.getByText("Cần chọn môn học hoặc thẻ")).toBeVisible();

    const callsAtClear = (args.vm.searchAction as ReturnType<typeof fn>).mock
      .calls.length;
    await new Promise((r) => setTimeout(r, 500)); // past the 350ms debounce
    expect(
      (args.vm.searchAction as ReturnType<typeof fn>).mock.calls.length,
    ).toBe(callsAtClear);
  },
};

/**
 * AC-902.8 — defense-in-depth: the client gate is satisfied (a tag is typed)
 * but the BE still returns 422 QUESTION_SEARCH_FILTER_REQUIRED (stale
 * state/regression). Must render the SAME QBFilterRequiredPrompt, never a
 * generic error banner.
 */
export const Search_DefenseInDepth422: Story = {
  args: {
    vm: baseVM({
      searchAction: async () => ({
        ok: false,
        errorKey: "search-filter-required",
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Tìm kiếm/ }));
    await userEvent.type(
      canvas.getByRole("searchbox", { name: /Lọc theo thẻ/ }),
      "Lượng giác",
    );
    await expect(
      await canvas.findByText("Đã đủ điều kiện tìm kiếm"),
    ).toBeVisible();
    // AC-902.8: same QBFilterRequiredPrompt, NOT the generic error banner.
    await waitFor(
      () =>
        expect(
          canvas.getByText("Chọn môn học hoặc thẻ để tìm câu hỏi"),
        ).toBeVisible(),
      { timeout: 3000 },
    );
    await expect(
      canvas.queryByText("Không tải được danh sách câu hỏi"),
    ).not.toBeInTheDocument();
  },
};

/** Search scope, tag entered — indicator flips satisfied, results render after debounce. */
export const Search_TagSatisfies: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Tìm kiếm/ }));
    await userEvent.type(
      canvas.getByRole("searchbox", { name: /Lọc theo thẻ/ }),
      "Lượng giác",
    );
    // Indicator flips immediately (AC-902.3).
    await expect(
      await canvas.findByText("Đã đủ điều kiện tìm kiếm"),
    ).toBeVisible();
    // Request fires after the debounce → cross-teacher PUBLISHED result.
    await waitFor(
      () =>
        expect(
          canvas.getByText("Câu hỏi đã phát hành của giáo viên khác."),
        ).toBeVisible(),
      { timeout: 3000 },
    );
    // Author attribution shown on search cards.
    await expect(canvas.getByText("Giáo viên khác")).toBeVisible();
    // AC-906.6 — no Edit CTA rendered on a cross-teacher PUBLISHED search
    // card; only the "Xem" (view) action.
    await expect(canvas.getByRole("button", { name: /Xem:/ })).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: /Chỉnh sửa:/ }),
    ).not.toBeInTheDocument();
  },
};

/** Route-guard rejection (non-teacher) — full-page access-denied, no query runs. */
export const Forbidden: Story = {
  args: { vm: baseVM({ forbidden: true }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Bạn không có quyền tìm kiếm trong kho câu hỏi."),
    ).toBeVisible();
  },
};

/** Redirect notice (edit route → not-visible) surfaced on the list. */
export const NotVisibleNotice: Story = {
  args: { vm: baseVM({ notice: "not-visible" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Câu hỏi nháp này không hiển thị với bạn."),
    ).toBeVisible();
    const dismiss = canvas.getByRole("button", { name: "Đóng" });
    await userEvent.click(dismiss);
    await expect(
      canvas.queryByText("Câu hỏi nháp này không hiển thị với bạn."),
    ).not.toBeInTheDocument();
  },
};
