import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  Assignment,
  AssignmentSummary,
} from "@/features/lms/domain/entities/assignment.entity";
import { AssignmentsSkeleton } from "./assignments-skeleton";
import { StudentAssignmentsScreen } from "./student-assignments-screen";
import type {
  GetAssignmentDetailResult,
  StudentAssignmentsActions,
  SubmitAssignmentResult,
} from "./student-assignments-screen.i-vm";

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** Real `AssignmentSummary` shape — no status, no grade, no meta line. */
const ROWS: AssignmentSummary[] = [
  {
    id: "as-1",
    classId: "cl-10a1",
    subjectId: "sub-toan",
    courseId: "co-toan-10",
    title: "Bài tập Khảo sát hàm số #12",
    dueAt: iso(5),
    createdBy: "t1",
    updatedAt: iso(-2),
  },
  {
    id: "as-2",
    classId: "cl-10a1",
    subjectId: "sub-ly",
    courseId: "co-ly-10",
    title: "Bài tập Cảm ứng điện từ",
    dueAt: iso(1),
    createdBy: "t2",
    updatedAt: iso(-1),
  },
  {
    id: "as-3",
    classId: "cl-10a1",
    subjectId: "sub-van",
    courseId: "co-van-10",
    title: "Phân tích đoạn trích Trao duyên",
    dueAt: iso(-3),
    createdBy: "t3",
    updatedAt: iso(-4),
  },
  {
    id: "as-4",
    classId: "cl-10a1",
    subjectId: "sub-anh",
    courseId: "co-anh-10",
    title: "Reading log tuần 12",
    dueAt: null,
    createdBy: "t4",
    updatedAt: iso(-6),
  },
];

const fullOf = (row: AssignmentSummary): Assignment => ({
  ...row,
  instructions: "Trình bày rõ từng bước và nộp dưới dạng văn bản.",
  startAt: iso(-7),
  state: "OPEN",
  createdAt: iso(-8),
});

function makeActions(
  over: Partial<StudentAssignmentsActions> = {},
): StudentAssignmentsActions {
  return {
    listAssignmentsAction: async () => ({ ok: true, data: ROWS }),
    getAssignmentDetailAction: async (
      id,
    ): Promise<GetAssignmentDetailResult> => {
      const row = ROWS.find((r) => r.id === id);
      if (!row) return { ok: false, errorKey: "not-found" };
      return {
        ok: true,
        data: {
          assignment: fullOf(row),
          mySubmission:
            id === "as-3"
              ? {
                  assignmentId: id,
                  studentUserId: "u1",
                  content: "Bài làm đã nộp của em…",
                  status: "SUBMITTED",
                  submittedAt: iso(-4),
                }
              : null,
        },
      };
    },
    submitAssignmentAction: async (
      assignmentId,
      content,
    ): Promise<SubmitAssignmentResult> => ({
      ok: true,
      data: {
        assignmentId,
        studentUserId: "u1",
        content,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
      },
    }),
    ...over,
  };
}

const meta: Meta<typeof StudentAssignmentsScreen> = {
  title: "Features/LMS/StudentAssignments",
  component: StudentAssignmentsScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      // Radix locks `pointer-events` on <body> while a Sheet is open; reset it
      // so a portal from a previous story cannot block this one.
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "";
      }
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-edu-bg p-6">
              <Story />
              <Toaster />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
  args: { assignments: ROWS, errorKey: null, actions: makeActions() },
};
export default meta;

type Story = StoryObj<typeof StudentAssignmentsScreen>;

export const Assignments_Loading: Story = {
  render: () => <AssignmentsSkeleton />,
};

export const Assignments_Success: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Bài tập Khảo sát hàm số #12"),
    ).toBeInTheDocument();
    // Deadline framing is the only badge the list row can honestly carry.
    await expect(canvas.getByText("Quá hạn 3 ngày")).toBeInTheDocument();
    // Badge ("Không có hạn") and the date line ("Không có hạn nộp") are
    // deliberately different strings so neither query is ambiguous.
    await expect(canvas.getByText("Không có hạn")).toBeInTheDocument();
    await expect(canvas.getByText("Không có hạn nộp")).toBeInTheDocument();
  },
};

export const Assignments_Empty: Story = {
  args: {
    assignments: [],
    actions: makeActions({
      listAssignmentsAction: async () => ({ ok: true, data: [] }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Lớp của bạn chưa có bài tập nào."),
    ).toBeInTheDocument();
  },
};

export const Assignments_Error: Story = {
  args: {
    assignments: null,
    actions: makeActions({
      listAssignmentsAction: async () => ({
        ok: false,
        errorKey: "network-error",
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText("Không thể tải danh sách bài tập"),
      ).toBeInTheDocument(),
    );
  },
};

/** The signed-in student has no resolvable class → the list cannot be requested. */
export const Assignments_NoClass: Story = {
  args: { assignments: null, errorKey: "no-class" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Chưa xác định được lớp của bạn",
    );
  },
};

/** Opening a card fires the DETAIL read — the only place a submission is known. */
export const Assignments_OpenSheet_NotSubmitted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Khảo sát hàm số/ })[0],
    );
    const sheet = within(await within(document.body).findByRole("dialog"));
    await waitFor(() =>
      expect(sheet.getByLabelText("Nội dung bài làm")).toBeInTheDocument(),
    );
    // Single-attempt copy replaces the old "confirm late submission" flow.
    await expect(
      sheet.getByText("Bạn chỉ được nộp bài một lần duy nhất."),
    ).toBeInTheDocument();
  },
};

export const Assignments_OpenSheet_AlreadySubmitted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Trao duyên/ })[0],
    );
    const sheet = within(await within(document.body).findByRole("dialog"));
    await waitFor(() =>
      expect(sheet.getByText("Bài làm đã nộp của em…")).toBeInTheDocument(),
    );
    // Read-only: no textarea, no submit button.
    await expect(sheet.queryByLabelText("Nội dung bài làm")).toBeNull();
  },
};

/** A submit after `dueAt` is REJECTED by BE (409 LMS_ITEM_CLOSED) — the sheet
 *  surfaces the refusal instead of the old client-side confirm dialog. */
export const Assignments_SubmitClosed: Story = {
  args: {
    actions: makeActions({
      submitAssignmentAction: async () => ({ ok: false, errorKey: "closed" }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Cảm ứng điện từ/ })[0],
    );
    const sheet = within(await within(document.body).findByRole("dialog"));
    const textarea = await sheet.findByLabelText("Nội dung bài làm");
    await userEvent.type(textarea, "Bài làm của em");
    await userEvent.click(sheet.getByRole("button", { name: "Nộp bài" }));
    await waitFor(() =>
      expect(
        sheet.getByText("Đã quá hạn nộp — bài tập này không còn nhận bài."),
      ).toBeInTheDocument(),
    );
  },
};
