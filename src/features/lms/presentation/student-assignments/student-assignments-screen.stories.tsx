import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  AssignmentEntity,
  AssignmentStatusFilter,
} from "@/features/lms/domain/entities/assignment.entity";
import { AssignmentsSkeleton } from "./assignments-skeleton";
import { StudentAssignmentsScreen } from "./student-assignments-screen";
import type {
  ListAssignmentsResult,
  SubmitAssignmentResult,
} from "./student-assignments-screen.i-vm";

const iso = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

function make(over: Partial<AssignmentEntity>): AssignmentEntity {
  return {
    id: "a",
    title: "Bài",
    description: "Mô tả bài tập.",
    subject: "Toán học",
    className: "10A1",
    teacherName: "Nguyễn Văn A",
    tone: "primary",
    dueDate: iso(5),
    status: "pending",
    submittedAt: null,
    gradedAt: null,
    score: null,
    maxScore: null,
    teacherComment: null,
    fileName: null,
    answerText: null,
    gradedFileName: null,
    ...over,
  };
}

const PENDING = make({
  id: "a1",
  title: "Giải phương trình bậc 2",
  dueDate: iso(5),
});
const PENDING_OVERDUE = make({
  id: "a2",
  title: "Cân bằng phản ứng oxi hoá khử",
  subject: "Hóa Học",
  tone: "warning",
  dueDate: iso(-4),
});
const SUBMITTED = make({
  id: "a3",
  title: "Phân tích Trao duyên",
  subject: "Ngữ Văn",
  tone: "purple",
  status: "submitted",
  dueDate: iso(-2),
  submittedAt: iso(-3),
  fileName: "trao-duyen.docx",
});
const GRADED = make({
  id: "a4",
  title: "Kiểm tra 15 phút",
  status: "graded",
  dueDate: iso(-10),
  submittedAt: iso(-11),
  gradedAt: iso(-9),
  score: 9,
  maxScore: 10,
  teacherComment: "Bài làm tốt.",
  fileName: "bai.pdf",
  gradedFileName: "nhan-xet.pdf",
});

const ALL = [PENDING, PENDING_OVERDUE, SUBMITTED, GRADED];

const okList =
  (list: AssignmentEntity[]) =>
  async (tab: AssignmentStatusFilter): Promise<ListAssignmentsResult> => ({
    ok: true,
    data: tab === "all" ? list : list.filter((a) => a.status === tab),
  });

const okSubmit = fn(
  async (id: string): Promise<SubmitAssignmentResult> => ({
    ok: true,
    data: make({ id, status: "submitted", submittedAt: iso(0) }),
  }),
);

const meta: Meta<typeof StudentAssignmentsScreen> = {
  title: "Features/LMS/StudentAssignments",
  component: StudentAssignmentsScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider
            locale="vi"
            messages={messages}
            timeZone="Asia/Ho_Chi_Minh"
          >
            <div className="min-h-screen bg-edu-bg p-6">
              <Story />
              <Toaster />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof StudentAssignmentsScreen>;

export const Loading: Story = {
  render: () => <AssignmentsSkeleton />,
};

export const AllTab: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Bài tập: Giải phương trình bậc 2"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText("Bài tập: Kiểm tra 15 phút"),
    ).toBeInTheDocument();
    // Header subtitle reflects pendingCount.
    await expect(
      canvas.getByText("Còn 2 bài đang chờ nộp"),
    ).toBeInTheDocument();
    // Overdue badge with day count.
    await expect(canvas.getByText(/Quá hạn 4 ngày/)).toBeInTheDocument();
    // Score chip on graded card.
    await expect(canvas.getByText("9/10")).toBeInTheDocument();
  },
};

export const PendingTabSwitch: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole("tab", { name: "Chưa nộp" });
    await userEvent.click(tab);
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await waitFor(() =>
      expect(
        canvas.getByText("Bài tập: Giải phương trình bậc 2"),
      ).toBeInTheDocument(),
    );
    // The graded item is not in the pending tab.
    await expect(
      canvas.queryByText("Bài tập: Kiểm tra 15 phút"),
    ).not.toBeInTheDocument();
  },
};

export const EmptyPendingTab: Story = {
  args: {
    assignments: [GRADED],
    pendingCount: 0,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList([GRADED]),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // pendingCount === 0 → header shows the zero-state subtitle, not "Còn 0 bài".
    await expect(
      canvas.getByText("Không có bài tập nào cần nộp"),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("tab", { name: "Chưa nộp" }));
    await waitFor(() =>
      expect(
        canvas.getByText("Không có bài tập nào cần nộp 🎉"),
      ).toBeInTheDocument(),
    );
  },
};

export const ListErrorAndRetry: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: async (tab): Promise<ListAssignmentsResult> =>
        tab === "graded"
          ? { ok: false, errorKey: "network-error" }
          : { ok: true, data: ALL },
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Đã chấm" }));
    await waitFor(() =>
      expect(
        canvas.getByText("Không thể tải danh sách bài tập"),
      ).toBeInTheDocument(),
    );
    await expect(canvas.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  },
};

export const ForbiddenGuard: Story = {
  args: {
    assignments: null,
    pendingCount: 0,
    errorKey: "forbidden",
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Bạn không có quyền xem bài tập này.",
    );
  },
};

export const OpenGradedSheet: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Xem điểm & nhận xét/ }),
    );
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Bài làm tốt.")).toBeInTheDocument(),
    );
  },
};

/** AC-1172.9/AC-1174.2 — a submitted card's CTA ("Xem bài đã nộp") opens the
 *  SAME submit-sheet shell in its read-only submitted view (submittedAt +
 *  fileName, no edit controls) — was previously only exercised in isolation
 *  via the `SubmitSheet` component story with `mode: "readonly"` fixed
 *  directly, never through the real card-CTA routing. */
export const OpenSubmittedReadonlySheet: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Xem bài đã nộp" }),
    );
    const body = within(document.body);
    // Filename from the submitted fixture renders; no edit controls present.
    await waitFor(() =>
      expect(body.getByText(/trao-duyen\.docx/)).toBeInTheDocument(),
    );
    await expect(
      body.queryByRole("button", { name: "Lưu nháp" }),
    ).not.toBeInTheDocument();
    await expect(
      body.queryByRole("button", { name: "Nộp bài" }),
    ).not.toBeInTheDocument();
  },
};

export const SubmitHappyPath: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Open the non-overdue pending card's submit sheet.
    const cards = canvas.getAllByRole("button", { name: "Nộp bài" });
    await userEvent.click(cards[0]);
    const body = within(document.body);
    const textarea = await body.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em.");
    // The sheet footer submit button.
    const submitBtn = body
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submitBtn);
    await waitFor(() => expect(okSubmit).toHaveBeenCalled());
  },
};

/**
 * AC-1171.9 (real loading-flash proof, plan.md §13.1 divergence from the
 * sibling courses screen). Every earlier story's mocked `listAssignmentsAction`
 * resolves on a microtask, so the skeleton state is asserted here only —
 * previous stories never actually caught it mid-flight. Delays the fetch by
 * 60ms so the SR loading announcement + skeleton are observable BEFORE the
 * new tab's content renders, proving a real cold-mount cycle fires on every
 * switch (not just first paint).
 */
export const TabSwitchLoadingFlash: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: async (
        tab: AssignmentStatusFilter,
      ): Promise<ListAssignmentsResult> => {
        await new Promise((r) => setTimeout(r, 60));
        return {
          ok: true,
          data: tab === "all" ? ALL : ALL.filter((a) => a.status === tab),
        };
      },
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: "Đã nộp" }));
    // Skeleton/SR announcement must appear DURING the switch, before content.
    await expect(
      canvas.getByText("Đang tải danh sách bài tập..."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        canvas.getByText("Bài tập: Phân tích Trao duyên"),
      ).toBeInTheDocument(),
    );
    // Switch again to a third tab — the flash must repeat, not just on the
    // very first switch (proves per-tab cold-mount, not a one-time effect).
    await userEvent.click(canvas.getByRole("tab", { name: "Đã chấm" }));
    await expect(
      canvas.getByText("Đang tải danh sách bài tập..."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByText("Bài tập: Kiểm tra 15 phút")).toBeInTheDocument(),
    );
  },
};

/** AC-1171.10 — arrow-key tablist navigation + Enter/Space activation
 *  (WCAG APG tablist pattern, delegated to Radix `Tabs` but verified here
 *  end-to-end rather than trusting the primitive's self-report). */
export const TablistKeyboardNav: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const allTab = canvas.getByRole("tab", { name: "Tất cả" });
    allTab.focus();
    await expect(allTab).toHaveFocus();
    // ArrowRight moves focus to the next tab without activating it by itself.
    await userEvent.keyboard("{ArrowRight}");
    const pendingTab = canvas.getByRole("tab", { name: "Chưa nộp" });
    await expect(pendingTab).toHaveFocus();
    // Enter activates the focused tab.
    await userEvent.keyboard("{Enter}");
    await expect(pendingTab).toHaveAttribute("aria-selected", "true");
    await waitFor(() =>
      expect(
        canvas.getByText("Bài tập: Giải phương trình bậc 2"),
      ).toBeInTheDocument(),
    );
    // ArrowLeft moves focus back; Space activates.
    await userEvent.keyboard("{ArrowLeft}");
    await expect(allTab).toHaveFocus();
    await userEvent.keyboard(" ");
    await expect(allTab).toHaveAttribute("aria-selected", "true");
  },
};

/** AC-1177.4/1177.5/1177.6/1177.7 — the 4 submit-failure branches that are
 *  NOT reachable from the sheet-local `submit-sheet.stories.tsx` (they require
 *  the container's mutation/error-key wiring + auto-close/refresh behavior). */
export const SubmitFailureAlreadySubmitted: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: fn(
        async (): Promise<SubmitAssignmentResult> => ({
          ok: false,
          errorKey: "already-submitted",
        }),
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = canvas.getAllByRole("button", { name: "Nộp bài" });
    await userEvent.click(cards[0]);
    const body = within(document.body);
    const textarea = await body.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em.");
    const submitBtn = body
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submitBtn);
    // AC-1177.4: inline error, then sheet auto-closes (does NOT stay open).
    await waitFor(() =>
      expect(body.getByText("Bài tập này đã được nộp.")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        body.queryByText("Bài tập này đã được nộp."),
      ).not.toBeInTheDocument(),
    );
  },
};

export const SubmitFailureNotFound: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: fn(
        async (): Promise<SubmitAssignmentResult> => ({
          ok: false,
          errorKey: "not-found",
        }),
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = canvas.getAllByRole("button", { name: "Nộp bài" });
    await userEvent.click(cards[0]);
    const body = within(document.body);
    const textarea = await body.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em.");
    const submitBtn = body
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submitBtn);
    await waitFor(() =>
      expect(body.getByText("Không tìm thấy bài tập.")).toBeInTheDocument(),
    );
    // AC-1177.5: sheet closes back to an auto-refreshed list.
    await waitFor(() =>
      expect(
        body.queryByText("Không tìm thấy bài tập."),
      ).not.toBeInTheDocument(),
    );
  },
};

export const SubmitFailureForbiddenNoRetry: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: fn(
        async (): Promise<SubmitAssignmentResult> => ({
          ok: false,
          errorKey: "forbidden",
        }),
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = canvas.getAllByRole("button", { name: "Nộp bài" });
    await userEvent.click(cards[0]);
    const body = within(document.body);
    const textarea = await body.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em.");
    const submitBtn = body
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submitBtn);
    // AC-1177.6: inline error stays; sheet remains open (no auto-refresh/close
    // path for forbidden), and no separate retry action is offered.
    await waitFor(() =>
      expect(
        body.getByText("Bạn không có quyền xem bài tập này."),
      ).toBeInTheDocument(),
    );
    await expect(
      body.queryByRole("button", { name: "Thử lại" }),
    ).not.toBeInTheDocument();
  },
};

export const SubmitFailureUnknownWithRetry: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: fn(
        async (): Promise<SubmitAssignmentResult> => ({
          ok: false,
          errorKey: "unknown",
        }),
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = canvas.getAllByRole("button", { name: "Nộp bài" });
    await userEvent.click(cards[0]);
    const body = within(document.body);
    const textarea = await body.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em.");
    const submitBtn = body
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submitBtn);
    await waitFor(() =>
      expect(
        body.getByText("Đã có lỗi xảy ra. Vui lòng thử lại."),
      ).toBeInTheDocument(),
    );
    // AC-1177.7: retry available — the same "Nộp bài" CTA is still enabled.
    await expect(submitBtn).toBeEnabled();
  },
};

/** AC-1177.8 — rapid double-activation of "Nộp bài" while submitting must
 *  fire exactly one `submitAssignmentAction` call, never two. */
export const DoubleClickGuard: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: fn(
        async (id: string): Promise<SubmitAssignmentResult> => {
          await new Promise((r) => setTimeout(r, 50));
          return {
            ok: true,
            data: make({ id, status: "submitted", submittedAt: iso(0) }),
          };
        },
      ),
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cards = canvas.getAllByRole("button", { name: "Nộp bài" });
    await userEvent.click(cards[0]);
    const body = within(document.body);
    const textarea = await body.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em.");
    const submitBtn = body
      .getAllByRole("button", { name: "Nộp bài" })
      .at(-1) as HTMLElement;
    await userEvent.click(submitBtn);
    // The CTA must already be disabled + aria-busy synchronously after the
    // first click — this is the guard itself (a disabled control absorbs any
    // further activation; the browser never dispatches "click" on it).
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveAttribute("aria-busy", "true");
    // A stray extra activation (native dispatch, bypassing the pointer-events
    // guard a real click would hit) must still be a no-op on a disabled button.
    submitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitFor(() =>
      expect(args.actions.submitAssignmentAction).toHaveBeenCalledTimes(1),
    );
  },
};

/** NFR-003 — no layout break at 320px; tabs remain scrollable (overflow-x). */
export const Viewport320NoBreak: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(320, 720);
    const canvas = within(canvasElement);
    const tablist = canvas.getByRole("tablist");
    await expect(tablist).toBeVisible();
    const styles = getComputedStyle(tablist);
    expect(["auto", "scroll"]).toContain(styles.overflowX);
    // No horizontal scroll on the document root at 320px (no layout break).
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      321, // small render-rounding tolerance
    );
  },
};

/** AC-1174.5 — Escape closes a card-triggered sheet with focus restored to
 *  the CTA that opened it. Container-level (real card CTA as the trigger,
 *  unlike the isolated `SubmitSheet` story which has no real trigger of its
 *  own) — this is the faithful end-to-end shape of the AC. */
export const EscapeRestoresFocusToCardCta: Story = {
  args: {
    assignments: ALL,
    pendingCount: 2,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ctas = canvas.getAllByRole("button", { name: "Nộp bài" });
    const cta = ctas[0];
    await userEvent.click(cta);
    await within(document.body).findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(cta).toHaveFocus(), { timeout: 1500 });
  },
};

/** AC-1172.10 — at ≤480px the title row must WRAP so the badge moves below
 *  the title (not stay pinned inline on the same row). Uses a long-title
 *  fixture so the wrap would be visually forced if the CSS actually wraps. */
export const TitleRowWrapsAt480px: Story = {
  args: {
    assignments: [
      make({
        id: "long",
        title:
          "Ôn tập tổng hợp chương 3: Hàm số bậc nhất và bậc hai — luyện đề nâng cao",
        dueDate: iso(5),
      }),
    ],
    pendingCount: 1,
    errorKey: null,
    actions: {
      listAssignmentsAction: okList(ALL),
      submitAssignmentAction: okSubmit,
    },
  },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    const canvas = within(canvasElement);
    const title = canvas.getByText(/Ôn tập tổng hợp chương 3/);
    const badge = canvas.getByText("Còn 5 ngày");
    const titleTop = title.getBoundingClientRect().top;
    const badgeTop = badge.getBoundingClientRect().top;
    // If the badge is still pinned to the same row as the title (not wrapped
    // below it), their tops are within a few px of each other.
    expect(Math.abs(badgeTop - titleTop)).toBeGreaterThan(8);
  },
};
