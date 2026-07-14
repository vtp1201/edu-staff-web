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
      canvas.getByText("Giải phương trình bậc 2"),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Kiểm tra 15 phút")).toBeInTheDocument();
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
      expect(canvas.getByText("Giải phương trình bậc 2")).toBeInTheDocument(),
    );
    // The graded item is not in the pending tab.
    await expect(
      canvas.queryByText("Kiểm tra 15 phút"),
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
