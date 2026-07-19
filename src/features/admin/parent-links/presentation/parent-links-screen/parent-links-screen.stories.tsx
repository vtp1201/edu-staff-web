import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import type { LinkCandidate } from "../../domain/entities/link-candidate.entity";
import type { ParentStudentLink } from "../../domain/entities/parent-student-link.entity";
import { ParentLinksScreen } from "./parent-links-screen";
import type {
  ActionResult,
  ParentLinksPage,
  ParentLinksScreenProps,
} from "./parent-links-screen.i-vm";

const LINKS: ParentStudentLink[] = [
  {
    linkId: "l1",
    studentId: "st1",
    studentName: "Nguyễn Minh Khoa",
    studentClassName: "11A2",
    parentId: "pa1",
    parentName: "Nguyễn Văn Bình",
    parentPhone: "0912 345 678",
    relationship: "father",
    consentStatus: "agreed",
    linkedOn: "2025-08-12",
  },
  {
    linkId: "l4",
    studentId: "st4",
    studentName: "Lê Thảo Vy",
    studentClassName: "10C3",
    parentId: "pa3",
    parentName: "Lê Văn Hùng",
    parentPhone: "0903 222 111",
    relationship: "guardian",
    consentStatus: "declined",
    note: "PH yêu cầu chỉ liên hệ qua điện thoại.",
    linkedOn: "2025-09-05",
  },
  {
    linkId: "l5",
    studentId: "st5",
    studentName: "Phạm Gia Huy",
    studentClassName: "8B1",
    parentId: "pa4",
    parentName: "Phạm Thị Thu",
    parentPhone: "0938 555 444",
    relationship: "mother",
    consentStatus: "pending",
    linkedOn: "2025-09-14",
  },
];

const STUDENT_CANDIDATES: LinkCandidate[] = [
  { memberId: "st7", fullName: "Vũ Đức Anh", className: "10C3" },
  { memberId: "st8", fullName: "Đặng Thu Hà", className: "12A1" },
];
const PARENT_CANDIDATES: LinkCandidate[] = [
  { memberId: "pa1", fullName: "Nguyễn Văn Bình", phone: "0912 345 678" },
  { memberId: "pa6", fullName: "Vũ Thị Ngọc", phone: "0966 777 888" },
];

const page = (items: ParentStudentLink[]): ParentLinksPage => ({
  items,
  nextCursor: null,
  hasMore: false,
});

const okList =
  (items: ParentStudentLink[]) =>
  async (): Promise<ActionResult<ParentLinksPage>> => ({
    ok: true,
    data: page(items),
  });

const okStudentSearch = async (): Promise<ActionResult<LinkCandidate[]>> => ({
  ok: true,
  data: STUDENT_CANDIDATES,
});
const okParentSearch = async (): Promise<ActionResult<LinkCandidate[]>> => ({
  ok: true,
  data: PARENT_CANDIDATES,
});
const okConsent = async (): Promise<ActionResult<never>> =>
  ({
    ok: true,
    data: {
      studentId: "x",
      parentId: "y",
      disciplineAlerts: true,
      absenceAlerts: false,
      gradeAlerts: true,
    },
  }) as unknown as ActionResult<never>;

const baseProps: ParentLinksScreenProps = {
  initialFilter: { q: "", classId: null },
  initialPage: page(LINKS),
  classOptions: [
    { id: "8B1", label: "Lớp 8B1" },
    { id: "10C3", label: "Lớp 10C3" },
    { id: "11A2", label: "Lớp 11A2" },
  ],
  listLinksAction: okList(LINKS),
  createLinkAction: async (input) => ({
    ok: true,
    data: {
      ...LINKS[0],
      linkId: "l-new",
      studentId: input.studentId,
      studentName: "Vũ Đức Anh",
      parentId: input.parentId,
      parentName: "Vũ Thị Ngọc",
      relationship: input.relationship,
      consentStatus: "pending",
    },
  }),
  unlinkLinkAction: async () => ({ ok: true, data: undefined }),
  getLinkConsentDetailAction: okConsent,
  searchStudentCandidatesAction: okStudentSearch,
  searchParentCandidatesAction: okParentSearch,
};

const meta: Meta<typeof ParentLinksScreen> = {
  title: "Features/Admin/ParentLinksScreen",
  component: ParentLinksScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      if (typeof document !== "undefined")
        document.body.style.pointerEvents = "";
      const qc = new QueryClient({
        defaultOptions: {
          queries: { retry: false, retryDelay: 0 },
          mutations: { retry: false },
        },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
            <Toaster />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof ParentLinksScreen>;

// ── UI states ────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: {
    ...baseProps,
    // Differ the RSC filter from the applied (empty) filter → no seed → query runs.
    initialFilter: { q: "khoa", classId: null },
    listLinksAction: () => new Promise<ActionResult<ParentLinksPage>>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("table")).toBeNull();
    await expect(
      canvas.getByText("Đang tải danh sách liên kết…"),
    ).toBeInTheDocument();
  },
};

export const Success: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(canvas.getByRole("table")).toBeInTheDocument();
    await expect(canvas.getByText("Đã đồng ý nhận TB")).toBeInTheDocument();
    await expect(canvas.getByText("Đã từ chối")).toBeInTheDocument();
  },
};

export const EmptyNoFilter: Story = {
  args: {
    ...baseProps,
    initialPage: page([]),
    listLinksAction: okList([]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Lớp này chưa có liên kết nào"),
    ).toBeInTheDocument();
  },
};

export const EmptyFiltered: Story = {
  // The empty variant is decided by the APPLIED filter (URL); seed it so
  // `useSearchParams()` reports an active filter → filtered-empty variant.
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { q: "zzz" } } },
  },
  args: {
    ...baseProps,
    initialFilter: { q: "zzz", classId: null },
    initialPage: page([]),
    listLinksAction: okList([]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có liên kết nào khớp bộ lọc"),
    ).toBeInTheDocument();
    // Two "Xoá bộ lọc" affordances are valid here: the filter bar's clear
    // button AND the filtered-empty CTA.
    await expect(
      canvas.getAllByRole("button", { name: "Xoá bộ lọc" }).length,
    ).toBeGreaterThanOrEqual(1);
  },
};

export const ErrorState: Story = {
  args: {
    ...baseProps,
    initialErrorKey: "network-error",
    initialPage: page([]),
    listLinksAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText("Không tải được dữ liệu")).toBeInTheDocument(),
    );
    await expect(
      canvas.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};

// ── Create dialog ────────────────────────────────────────────────────────────

async function fillCreateForm() {
  const body = within(document.body);
  const dialog = within(await body.findByRole("dialog"));

  // Student combobox — opening shows the initial candidate list (no typing
  // required); pick a candidate. (Trigger accessible name = field label.)
  await userEvent.click(dialog.getByRole("button", { name: "Học sinh" }));
  await userEvent.click(
    await body.findByText("Vũ Đức Anh", {}, { timeout: 3000 }),
  );

  // Parent combobox.
  await userEvent.click(dialog.getByRole("button", { name: /Phụ huynh/ }));
  await userEvent.click(
    await body.findByText("Vũ Thị Ngọc", {}, { timeout: 3000 }),
  );

  // Relationship select.
  await userEvent.click(dialog.getByRole("combobox", { name: "Quan hệ" }));
  await userEvent.click(await body.findByRole("option", { name: "Bố" }));

  // Radix Select's `hideOthers` sets aria-hidden on the dialog while open and
  // clears it on close (after the exit animation) — wait for the dialog to be
  // interactive again before querying its now-accessible submit button.
  await waitFor(() => {
    const el = document.querySelector('[data-slot="dialog-content"]');
    expect(el?.getAttribute("aria-hidden")).not.toBe("true");
  });
  return within(
    document.querySelector('[data-slot="dialog-content"]') as HTMLElement,
  );
}

export const CreateDialogHappy: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    await userEvent.click(dialog.getByRole("button", { name: "Tạo liên kết" }));
    // Dialog closes on success.
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
  },
};

export const CreateDialogDuplicate: Story = {
  args: {
    ...baseProps,
    createLinkAction: async () => ({
      ok: false,
      errorKey: "already-linked",
      retryable: false,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    await userEvent.click(dialog.getByRole("button", { name: "Tạo liên kết" }));
    // Inline role="alert" + dialog stays open.
    await waitFor(() =>
      expect(dialog.getByText("Liên kết đã tồn tại")).toBeInTheDocument(),
    );
    await expect(within(document.body).getByRole("dialog")).toBeInTheDocument();
  },
};

export const CreateDialogValidation: Story = {
  args: {
    ...baseProps,
    createLinkAction: async () => ({
      ok: false,
      errorKey: "validation",
      retryable: false,
      fields: [{ field: "parentId", message: "not-parent-role" }],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    await userEvent.click(dialog.getByRole("button", { name: "Tạo liên kết" }));
    await waitFor(() =>
      expect(
        dialog.getByText(
          "Tài khoản này không phải phụ huynh hoặc không thuộc trường của bạn.",
        ),
      ).toBeInTheDocument(),
    );
  },
};

export const CreateDialogNetwork: Story = {
  args: {
    ...baseProps,
    createLinkAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    await userEvent.click(dialog.getByRole("button", { name: "Tạo liên kết" }));
    // Dialog stays open (fields preserved) + error surfaced.
    await waitFor(() =>
      expect(within(document.body).getByRole("dialog")).toBeInTheDocument(),
    );
    await expect(dialog.getByText("Vũ Đức Anh")).toBeInTheDocument();
  },
};

export const CreateDialogKeyboard: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const body = within(document.body);
    const dialog = within(await body.findByRole("dialog"));
    // Keyboard-only: the combobox trigger opens with Enter and exposes a proper
    // listbox of role="option" candidates (AC-003.8). The full arrow-navigate +
    // Enter SELECTION is proven in isolation by the SearchCombobox
    // "KeyboardSelect" story (nested modal-dialog focus contention makes the
    // in-dialog keyboard-select flaky in the headless runner, but the listbox
    // semantics + keyboard-open are asserted here at the screen level).
    const studentTrigger = dialog.getByRole("button", { name: "Học sinh" });
    studentTrigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(body.getByText("Vũ Đức Anh")).toBeInTheDocument(),
    );
    const options = await body.findAllByRole("option");
    await expect(options.length).toBeGreaterThan(0);
  },
};

// ── Detail dialog ────────────────────────────────────────────────────────────

async function openRowMenuAndPick(itemName: string, rowStudent: string) {
  const canvas = within(document.body);
  const triggers = canvas.getAllByRole("button", {
    name: /Hành động cho liên kết/i,
  });
  // Pick the trigger whose aria-label mentions the row's student.
  const trigger =
    triggers.find((t) => t.getAttribute("aria-label")?.includes(rowStudent)) ??
    triggers[0];
  await userEvent.click(trigger);
  await userEvent.click(
    await canvas.findByRole("menuitem", { name: itemName }),
  );
}

export const DetailWithNote: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Xem chi tiết", "Lê Thảo Vy");
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Chi tiết liên kết")).toBeInTheDocument(),
    );
    await expect(
      body.getByText("PH yêu cầu chỉ liên hệ qua điện thoại."),
    ).toBeInTheDocument();
  },
};

export const DetailNoNote: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Xem chi tiết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Chi tiết liên kết")).toBeInTheDocument(),
    );
    // No note row rendered (omitted, not an error).
    await expect(body.queryByText("Ghi chú")).toBeNull();
  },
};

export const DetailConsentError: Story = {
  args: {
    ...baseProps,
    getLinkConsentDetailAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  },
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Xem chi tiết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    await waitFor(() =>
      expect(
        body.getByText("Không tải được chi tiết consent."),
      ).toBeInTheDocument(),
    );
    // Rest of the dialog still usable.
    await expect(body.getByText("Chi tiết liên kết")).toBeInTheDocument();
  },
};

// ── Unlink dialog (HIGH-RISK) ────────────────────────────────────────────────

export const UnlinkConsequenceCopy: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const dialog = within(
      await within(document.body).findByRole("alertdialog"),
    );
    // The EXACT DR-014 consequence copy, interpolated (AC-005.1).
    await waitFor(() =>
      expect(
        dialog.getByText(
          /sẽ mất quyền xem điểm số, hạnh kiểm, chuyên cần và mọi thông báo về học sinh/i,
        ),
      ).toBeInTheDocument(),
    );
    await expect(
      dialog.getByText(/Tài khoản của hai bên không bị xoá/i),
    ).toBeInTheDocument();
    await expect(dialog.getByText(/Nguyễn Văn Bình/)).toBeInTheDocument();
    await expect(dialog.getByText(/Nguyễn Minh Khoa/)).toBeInTheDocument();
  },
};

export const UnlinkConfirm: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Gỡ liên kết" }));
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
  },
};

export const UnlinkNonOptimisticPending: Story = {
  args: {
    ...baseProps,
    // Never resolves — the row MUST stay visible while pending (AC-005.4).
    unlinkLinkAction: () => new Promise<ActionResult<undefined>>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Gỡ liên kết" }));
    // Row still present in the table while the DELETE is in flight.
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
  },
};

export const Unlink403: Story = {
  args: {
    ...baseProps,
    unlinkLinkAction: async () => ({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Gỡ liên kết" }));
    // Inline forbidden error, dialog stays, row NOT removed (AC-005.6).
    await waitFor(() =>
      expect(
        dialog.getByText("Bạn không có quyền gỡ liên kết này."),
      ).toBeInTheDocument(),
    );
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
  },
};

export const Unlink404: Story = {
  args: {
    ...baseProps,
    unlinkLinkAction: async () => ({
      ok: false,
      errorKey: "not-found",
      retryable: false,
    }),
  },
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Gỡ liên kết" }));
    // 404 race → "already removed" toast + dialog closes (AC-005.7).
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await waitFor(() =>
      expect(
        body.getByText("Liên kết đã được gỡ trước đó."),
      ).toBeInTheDocument(),
    );
  },
};

export const UnlinkNetwork: Story = {
  args: {
    ...baseProps,
    unlinkLinkAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  },
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Gỡ liên kết" }));
    // Transient error + retry control, dialog stays open (AC-005.8).
    await waitFor(() =>
      expect(
        dialog.getByText("Không gỡ được liên kết. Vui lòng thử lại."),
      ).toBeInTheDocument(),
    );
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
  },
};

export const UnlinkCancel: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    within(canvasElement);
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Huỷ" }));
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
  },
};

// ── Mobile (viewport set; data parity asserted, UC-007) ──────────────────────

export const MobileCardList375: Story = {
  args: baseProps,
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Full data parity per card (student + parent + phone + consent).
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(canvas.getByText("Nguyễn Văn Bình")).toBeInTheDocument();
    await expect(canvas.getByText("0912 345 678")).toBeInTheDocument();
    await expect(canvas.getByText("Đã đồng ý nhận TB")).toBeInTheDocument();
  },
};
