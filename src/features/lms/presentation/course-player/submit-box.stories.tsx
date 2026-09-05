import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { BodyAssignment } from "./body-assignment";
import type {
  ActiveItemVm,
  SubmitAssignmentResult,
} from "./course-player.i-vm";

const ASSIGNMENT: Extract<ActiveItemVm, { kind: "assignment" }> = {
  kind: "assignment",
  id: "as-1",
  title: "Bài tập Đạo hàm #11",
  state: "OPEN",
  startAt: "2026-04-20T07:00:00.000Z",
  dueAt: "2026-04-24T16:00:00.000Z",
  instructions: "Hoàn thành các bài trong phiếu bài tập đính kèm.",
  mySubmission: null,
};

const meta: Meta<typeof BodyAssignment> = {
  title: "Features/LMS/CoursePlayerSubmit",
  component: BodyAssignment,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <div className="max-w-2xl bg-card">
          <Story />
          <Toaster />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    item: ASSIGNMENT,
    submitAssignment: async () => ({
      ok: true,
      submission: {
        content: "Bài làm của em",
        submittedAt: "2026-04-23T14:14:00.000Z",
      },
    }),
  },
};
export default meta;

type Story = StoryObj<typeof BodyAssignment>;

/** Payloads the confirm-flow story actually sent (asserted, not assumed). */
const CONFIRM_CALLS: string[] = [];

/** Nothing typed yet → the submit button is disabled and says why. */
export const EmptyIsDisabled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("button", { name: /Nộp bài/ }),
    ).toBeDisabled();
    await expect(
      canvas.getByText(
        "Nhập nội dung bài làm hoặc liên kết để có thể nộp bài.",
      ),
    ).toBeVisible();
    await expect(canvas.getByText("0/20000 ký tự")).toBeVisible();
  },
};

/**
 * The whole point of the high-risk lane: "Nộp bài" NEVER submits. It only
 * reveals the one-way warning; the request goes out from "Xác nhận nộp".
 */
export const ConfirmThenSubmit: Story = {
  args: {
    submitAssignment: async (
      content: string,
    ): Promise<SubmitAssignmentResult> => {
      // Records every REAL call, so the assertions below can prove that the
      // first button press sent nothing.
      CONFIRM_CALLS.push(content);
      return {
        ok: true,
        submission: { content, submittedAt: "2026-04-23T14:14:00.000Z" },
      };
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    CONFIRM_CALLS.length = 0;
    const textarea = canvas.getByLabelText(/Nội dung bài làm/);
    await userEvent.type(textarea, "Bài làm của em");
    await userEvent.type(
      canvas.getByLabelText(/Liên kết bài làm/),
      "https://drive.google.com/abc",
    );
    await expect(canvas.getByText("14/20000 ký tự")).toBeVisible();

    const submit = canvas.getByRole("button", { name: /Nộp bài/ });
    await expect(submit).toBeEnabled();
    await userEvent.click(submit);

    // Step 2 exists, is a real render state (not window.confirm) and is
    // announced — and nothing has been sent yet.
    const warning = canvas.getByText(/chỉ được nộp MỘT lần duy nhất/);
    await expect(warning).toBeVisible();
    expect(canvas.queryByText(/Đã nộp lúc/)).toBeNull();
    expect(CONFIRM_CALLS).toHaveLength(0);

    // "Xem lại" backs out without any request.
    await userEvent.click(canvas.getByRole("button", { name: "Xem lại" }));
    expect(canvas.queryByText(/chỉ được nộp MỘT lần duy nhất/)).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: /Nộp bài/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Xác nhận nộp" }));

    await waitFor(() =>
      expect(canvas.getByText(/Đã nộp lúc/)).toBeInTheDocument(),
    );
    // Exactly ONE request, carrying text + "\n" + link (BE takes one string).
    expect(CONFIRM_CALLS).toEqual([
      "Bài làm của em\nhttps://drive.google.com/abc",
    ]);
    // The form is gone — a single-attempt assignment cannot be resubmitted.
    expect(canvas.queryByLabelText(/Nội dung bài làm/)).toBeNull();
  },
};

/**
 * The 409 race (another tab submitted first). The banner must show the
 * SERVER's submission, never the text still sitting in this textarea.
 */
export const SubmitAlreadySubmitted: Story = {
  args: {
    submitAssignment: async (): Promise<SubmitAssignmentResult> => ({
      ok: false,
      errorKey: "already-submitted",
      submission: {
        content: "Bài làm nộp từ thiết bị khác",
        submittedAt: "2026-04-23T09:05:00.000Z",
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText(/Nội dung bài làm/),
      "Bài làm ở tab này",
    );
    await userEvent.click(canvas.getByRole("button", { name: /Nộp bài/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Xác nhận nộp" }));

    await waitFor(() =>
      expect(canvas.getByText(/Đã nộp lúc/)).toBeInTheDocument(),
    );
    // The SERVER timestamp (09:05Z = 16:05 in the pinned Asia/Ho_Chi_Minh),
    // not a locally invented "just now".
    await expect(canvas.getByText(/16:05/)).toBeInTheDocument();
    // And the student is told what happened.
    await expect(
      await within(document.body).findByText("Bài tập này đã được nộp."),
    ).toBeInTheDocument();
  },
};

/** A deadline that closed mid-flight: refusal, and NO retry button (the
 *  deadline is real — retrying cannot help). */
export const SubmitClosed: Story = {
  args: {
    submitAssignment: async (): Promise<SubmitAssignmentResult> => ({
      ok: false,
      errorKey: "closed",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Nội dung bài làm/), "Bài làm");
    await userEvent.click(canvas.getByRole("button", { name: /Nộp bài/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Xác nhận nộp" }));

    await waitFor(() =>
      expect(canvas.getByRole("alert")).toHaveTextContent(
        "Đã quá hạn — mục này không còn nhận bài.",
      ),
    );
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
    // The work is preserved so nothing is retyped.
    await expect(canvas.getByLabelText(/Nội dung bài làm/)).toHaveValue(
      "Bài làm",
    );
  },
};

/** A transport failure IS retryable, and the retry re-sends the same payload
 *  without asking for the one-way confirmation twice. */
export const SubmitNetworkErrorThenRetry: Story = {
  args: {
    submitAssignment: (() => {
      let attempts = 0;
      return async (content: string): Promise<SubmitAssignmentResult> => {
        attempts += 1;
        if (attempts === 1) return { ok: false, errorKey: "network-error" };
        return {
          ok: true,
          submission: { content, submittedAt: "2026-04-23T14:14:00.000Z" },
        };
      };
    })(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/Nội dung bài làm/), "Bài làm");
    await userEvent.click(canvas.getByRole("button", { name: /Nộp bài/ }));
    await userEvent.click(canvas.getByRole("button", { name: "Xác nhận nộp" }));

    const retry = await canvas.findByRole("button", { name: "Thử lại" });
    await userEvent.click(retry);
    await waitFor(() =>
      expect(canvas.getByText(/Đã nộp lúc/)).toBeInTheDocument(),
    );
  },
};

/** An unparseable link blocks submission and is reported as TEXT + ARIA. */
export const InvalidLink: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByLabelText(/Liên kết bài làm/);
    await userEvent.type(link, "drive.google.com/abc");
    await userEvent.tab();

    await expect(link).toHaveAttribute("aria-invalid", "true");
    const errorId = link.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    const error = canvasElement.ownerDocument.getElementById(errorId ?? "");
    await expect(error).toHaveTextContent(
      "Liên kết phải bắt đầu bằng http:// hoặc https://.",
    );
    await expect(
      canvas.getByRole("button", { name: /Nộp bài/ }),
    ).toBeDisabled();
  },
};

/** Already submitted on page load → no form is mounted at all. */
export const AlreadySubmittedOnLoad: Story = {
  args: {
    item: {
      ...ASSIGNMENT,
      mySubmission: {
        content: "Bài làm của em",
        submittedAt: "2026-04-23T14:14:00.000Z",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Đã nộp lúc/)).toBeVisible();
    expect(canvas.queryByLabelText(/Nội dung bài làm/)).toBeNull();
    expect(canvas.queryByRole("button", { name: /Nộp bài/ })).toBeNull();
  },
};

/** Closed and never submitted — a consequence, stated in words, not colour. */
export const ClosedNotSubmitted: Story = {
  args: { item: { ...ASSIGNMENT, state: "CLOSED" }, submitAssignment: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Bạn chưa nộp bài này trước hạn."),
    ).toBeVisible();
    expect(canvas.queryByLabelText(/Nội dung bài làm/)).toBeNull();
  },
};
