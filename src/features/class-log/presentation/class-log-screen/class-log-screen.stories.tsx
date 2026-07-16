import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { HomeroomEntry } from "../../domain/entities/homeroom-entry.entity";
import { ClassLogScreen } from "./class-log-screen";
import type { ClassLogScreenVM } from "./class-log-screen.i-vm";

const baseEntries: HomeroomEntry[] = [
  {
    entryId: "e-1",
    classId: "11b2",
    entryDate: "2026-04-29",
    summary: "Đạo hàm và ứng dụng — Bài 3: Cực trị hàm số",
    notableEvents: "Lớp tham gia sôi nổi.",
    status: "DRAFT",
    authorMemberId: "Nguyễn Thị Hương",
    createdAt: "2026-04-29T01:00:00Z",
    updatedAt: "2026-04-29T01:00:00Z",
  },
  {
    entryId: "e-2",
    classId: "11b2",
    entryDate: "2026-04-28",
    summary: "Hình học không gian — Quan hệ vuông góc",
    status: "SUBMITTED",
    authorMemberId: "Nguyễn Thị Hương",
    createdAt: "2026-04-28T01:00:00Z",
    updatedAt: "2026-04-28T02:00:00Z",
  },
  {
    entryId: "e-3",
    classId: "11b2",
    entryDate: "2026-04-27",
    summary: "Nguyên hàm — Phương pháp đổi biến",
    status: "APPROVED",
    authorMemberId: "Nguyễn Thị Hương",
    decidedBy: "Trần Minh Quân",
    decidedAt: "2026-04-27T05:00:00Z",
    createdAt: "2026-04-27T01:00:00Z",
    updatedAt: "2026-04-27T05:00:00Z",
  },
  {
    entryId: "e-4",
    classId: "11b2",
    entryDate: "2026-04-26",
    summary: "Tích phân — Bài tập tổng hợp",
    status: "REJECTED",
    authorMemberId: "Nguyễn Thị Hương",
    decidedBy: "Trần Minh Quân",
    decidedAt: "2026-04-26T05:00:00Z",
    reason: "Thiếu nội dung bài tập về nhà.",
    createdAt: "2026-04-26T01:00:00Z",
    updatedAt: "2026-04-26T05:00:00Z",
  },
];

function makeEntry(over: Partial<HomeroomEntry>): HomeroomEntry {
  return { ...baseEntries[0], ...over };
}

const okEntry =
  (status: HomeroomEntry["status"] = "DRAFT") =>
  async (classId: string, ...rest: unknown[]) => {
    const entryId =
      typeof rest[0] === "string" && rest[0].startsWith("e-")
        ? (rest[0] as string)
        : "e-new";
    return {
      ok: true as const,
      entry: makeEntry({ entryId, classId, status }),
    };
  };

const baseVm: ClassLogScreenVM = {
  classId: "11b2",
  className: "11B2",
  entries: baseEntries,
  hasMore: false,
  isPrincipal: false,
  createEntryAction: okEntry("DRAFT"),
  submitEntryAction: okEntry("SUBMITTED"),
  reviseEntryAction: okEntry("SUBMITTED"),
  approveEntryAction: okEntry("APPROVED"),
  rejectEntryAction: okEntry("REJECTED"),
};

const meta: Meta<typeof ClassLogScreen> = {
  title: "Features/ClassLog/ClassLogScreen",
  component: ClassLogScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ClassLogScreen>;

/** Teacher list with all four statuses visible. */
export const TeacherListView: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Sổ đầu bài/ }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText("Nháp").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Chờ duyệt").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Đã duyệt").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText("Từ chối").length).toBeGreaterThan(0);
  },
};

/** Teacher opens the new-entry form and sees the required-summary validation. */
export const TeacherNewEntryForm: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Ghi tiết mới/ }));
    await waitFor(() =>
      expect(canvas.getByText("Ghi sổ đầu bài")).toBeInTheDocument(),
    );
    // Submit empty → validation error.
    await userEvent.click(
      canvas.getByRole("button", { name: /Gửi BGH phê duyệt/ }),
    );
    await waitFor(() =>
      expect(
        canvas.getByText("Nội dung bài học là bắt buộc"),
      ).toBeInTheDocument(),
    );
  },
};

/**
 * Teacher detail of a draft entry — shows the submit action (not the revise
 * action, which is REJECTED-only). Clicking it transitions to SUBMITTED via
 * `submitEntryAction` (zero regression from the REJECTED→revise addition).
 */
export const TeacherEntryDetail: Story = {
  args: baseVm,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByText("Đạo hàm và ứng dụng — Bài 3: Cực trị hàm số"),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Quay lại danh sách/ }),
      ).toBeInTheDocument(),
    );
    const submitBtn = canvas.getByRole("button", {
      name: /Gửi BGH phê duyệt/,
    });
    await expect(submitBtn).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Chỉnh sửa & gửi lại/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(submitBtn);
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: /Gửi BGH phê duyệt/ }),
      ).not.toBeInTheDocument(),
    );
    await expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument();
  },
};

/**
 * Teacher detail of a REJECTED entry — shows the distinct "Revise & resubmit"
 * action (not "Submit for approval"). Clicking it transitions to SUBMITTED.
 */
export const TeacherReviseRejectedEntry: Story = {
  args: {
    ...baseVm,
    entries: [
      makeEntry({
        entryId: "e-1",
        status: "REJECTED",
        summary: "Tích phân — Bài tập tổng hợp",
        decidedBy: "Trần Minh Quân",
        reason: "Thiếu nội dung bài tập về nhà.",
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Tích phân — Bài tập tổng hợp"));
    // The revise action, not the submit action, is offered for REJECTED.
    const reviseBtn = await waitFor(() =>
      canvas.getByRole("button", { name: /Chỉnh sửa & gửi lại/ }),
    );
    await expect(
      canvas.queryByRole("button", { name: /Gửi BGH phê duyệt/ }),
    ).not.toBeInTheDocument();
    // The rejection reason stays visible while the teacher revises.
    await expect(
      canvas.getByText(/Thiếu nội dung bài tập về nhà/),
    ).toBeInTheDocument();
    // Clicking revise transitions the entry to SUBMITTED (Chờ duyệt).
    await userEvent.click(reviseBtn);
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: /Chỉnh sửa & gửi lại/ }),
      ).not.toBeInTheDocument(),
    );
    await expect(canvas.getByText("Chờ duyệt")).toBeInTheDocument();
  },
};

/**
 * Principal viewing a REJECTED entry must NEVER see a revise affordance —
 * `revise` is a teacher-only transition (`canTeacherRevise = !isPrincipal &&
 * status === "REJECTED"`); the principal-only `canPrincipalReview` branch only
 * activates for SUBMITTED, so a REJECTED entry shows neither revise nor
 * approve/reject for a principal viewer.
 */
export const PrincipalCannotRevise: Story = {
  args: {
    ...baseVm,
    isPrincipal: true,
    entries: [
      makeEntry({
        entryId: "e-4",
        status: "REJECTED",
        summary: "Tích phân — Bài tập tổng hợp",
        decidedBy: "Trần Minh Quân",
        reason: "Thiếu nội dung bài tập về nhà.",
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Tích phân — Bài tập tổng hợp"));
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Quay lại danh sách/ }),
      ).toBeInTheDocument(),
    );
    // No revise action for a principal viewer.
    await expect(
      canvas.queryByRole("button", { name: /Chỉnh sửa & gửi lại/ }),
    ).not.toBeInTheDocument();
    // No approve/reject either — those only activate for SUBMITTED.
    await expect(
      canvas.queryByRole("button", { name: /Phê duyệt/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /^Từ chối$/ }),
    ).not.toBeInTheDocument();
    // The rejection banner + reason is still visible (read-only view).
    await expect(
      canvas.getByText(/Thiếu nội dung bài tập về nhà/),
    ).toBeInTheDocument();
  },
};

/**
 * Revise action fails (mapped `invalid-transition` failure) — the generic
 * error-toast mechanism (shared with create/submit/approve/reject) surfaces
 * the i18n-mapped message; the entry stays REJECTED (no optimistic mutation).
 */
export const TeacherReviseFails: Story = {
  args: {
    ...baseVm,
    entries: [
      makeEntry({
        entryId: "e-1",
        status: "REJECTED",
        summary: "Tích phân — Bài tập tổng hợp",
        decidedBy: "Trần Minh Quân",
        reason: "Thiếu nội dung bài tập về nhà.",
      }),
    ],
    reviseEntryAction: async () => ({
      ok: false as const,
      errorKey: "invalid-transition" as const,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Tích phân — Bài tập tổng hợp"));
    const reviseBtn = await waitFor(() =>
      canvas.getByRole("button", { name: /Chỉnh sửa & gửi lại/ }),
    );
    await userEvent.click(reviseBtn);
    // Failure keeps the entry REJECTED — the revise button is still offered
    // (no optimistic transition), and the rejection reason stays visible.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Chỉnh sửa & gửi lại/ }),
      ).toBeInTheDocument(),
    );
    await expect(
      canvas.getByText(/Thiếu nội dung bài tập về nhà/),
    ).toBeInTheDocument();
  },
};

/** Principal review list — SUBMITTED entries awaiting approval. */
export const PrincipalReviewView: Story = {
  args: {
    ...baseVm,
    isPrincipal: true,
    entries: [
      makeEntry({ entryId: "e-1", status: "SUBMITTED" }),
      makeEntry({
        entryId: "e-2",
        status: "SUBMITTED",
        entryDate: "2026-04-28",
        summary: "Hình học không gian",
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Xem xét và phê duyệt/)).toBeInTheDocument();
    // Principal must NOT see the create button.
    await expect(
      canvas.queryByRole("button", { name: /Ghi tiết mới/ }),
    ).not.toBeInTheDocument();
  },
};

/** Principal detail with approve / reject buttons on a SUBMITTED entry. */
export const PrincipalApproveDetail: Story = {
  args: {
    ...baseVm,
    isPrincipal: true,
    entries: [makeEntry({ entryId: "e-1", status: "SUBMITTED" })],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByText("Đạo hàm và ứng dụng — Bài 3: Cực trị hàm số"),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /Phê duyệt/ }),
      ).toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("button", { name: /^Từ chối$/ }),
    ).toBeInTheDocument();
  },
};

/** Empty state — no entries. */
export const EmptyState: Story = {
  args: { ...baseVm, entries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Không có mục nào")).toBeInTheDocument();
  },
};

/** Error state — create action fails; a toast surfaces the error key. */
export const ErrorState: Story = {
  args: {
    ...baseVm,
    createEntryAction: async () => ({
      ok: false as const,
      errorKey: "network-error" as const,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /Ghi tiết mới/ }));
    await waitFor(() =>
      expect(canvas.getByText("Ghi sổ đầu bài")).toBeInTheDocument(),
    );
  },
};
