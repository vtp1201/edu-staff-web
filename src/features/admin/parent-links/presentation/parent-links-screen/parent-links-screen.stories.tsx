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

// `@storybook/addon-viewport` is NOT installed, so `parameters.viewport` blocks
// are inert. To exercise a REAL width (so `useIsMobile`'s matchMedia and the
// layout genuinely respond) drive the `@vitest/browser-playwright` context
// directly (same pattern as discipline-screen.stories.tsx). Reset to a wide
// desktop after each width-specific story so later table stories aren't left on
// a narrow viewport.
async function setViewport(w: number, h: number) {
  const { page } = await import("vitest/browser");
  await page.viewport(w, h);
}
async function resetViewport() {
  await setViewport(1280, 900);
}
function expectNoHorizontalOverflow() {
  // A truthful "no clipping / no horizontal scroll" check at the current width.
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    window.innerWidth + 1,
  );
}

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

// ── Filter (UC-002) ──────────────────────────────────────────────────────────
// NOTE: the Storybook Next.js mock router does NOT update `useSearchParams()` on
// `router.replace()` (verified), so a typed-into-the-box → refetch round-trip
// can't be exercised at the story level. The APPLIED filter is therefore seeded
// via `navigation.query`, which is exactly what the RSC deep-link path produces.

export const FilterActiveNarrows: Story = {
  // Applied filter = class 10C3 → only the 10C3 link is returned.
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { classId: "10C3" } } },
  },
  args: {
    ...baseProps,
    initialFilter: { q: "", classId: "10C3" },
    initialPage: page([LINKS[1]]),
    listLinksAction: okList([LINKS[1]]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Narrowed to the matching row; an excluded row is absent.
    await expect(canvas.getByText("Lê Thảo Vy")).toBeInTheDocument();
    await expect(canvas.queryByText("Nguyễn Minh Khoa")).toBeNull();
    // "(đã lọc)" count suffix (AC-002.1).
    await expect(canvas.getByText(/1 liên kết/)).toBeInTheDocument();
    await expect(canvas.getByText(/\(đã lọc\)/)).toBeInTheDocument();
  },
};

export const FilterClearResetsInputs: Story = {
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { q: "khoa" } } },
  },
  args: {
    ...baseProps,
    initialFilter: { q: "khoa", classId: null },
    initialPage: page([LINKS[0]]),
    listLinksAction: okList([LINKS[0]]),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The search box mirrors the applied filter draft.
    const search = canvas.getByRole("searchbox", {
      name: "Tìm học sinh hoặc phụ huynh",
    });
    await expect(search).toHaveValue("khoa");
    // Clicking the filter bar's "Xoá bộ lọc" resets the draft inputs (AC-002.2).
    // (The subsequent URL reload is driven by router.replace, inert in SB.)
    await userEvent.click(canvas.getByRole("button", { name: "Xoá bộ lọc" }));
    await waitFor(() => expect(search).toHaveValue(""));
  },
};

export const FilterRefilterLoading: Story = {
  // Applied filter present (filtered context) but differs from the RSC-seeded
  // filter → no seed → the query runs fresh; the action never resolves →
  // skeleton shows with NO stale rows flashing (AC-002.3).
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { q: "vy" } } },
  },
  args: {
    ...baseProps,
    initialFilter: { q: "khoa", classId: null },
    listLinksAction: () => new Promise<ActionResult<ParentLinksPage>>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Đang tải danh sách liên kết…"),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("table")).toBeNull();
    // No stale row content while the refilter is in flight.
    await expect(canvas.queryByText("Nguyễn Minh Khoa")).toBeNull();
  },
};

export const FilterRefilterError: Story = {
  parameters: {
    nextjs: { appDirectory: true, navigation: { query: { q: "vy" } } },
  },
  args: {
    ...baseProps,
    initialFilter: { q: "khoa", classId: null },
    listLinksAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // A failed refilter shows the same error + retry UI (AC-002.4).
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
  // The created link is returned with `consentStatus: "pending"` so the success
  // toast — the observable proof the create succeeded (AC-003.2) — carries the
  // parent→student names. (The refetched-row appearing in the table is driven by
  // the mutation's `invalidateQueries` wiring, exercised against a real backend;
  // the Storybook mock-refetch + `initialData` interaction makes the in-table
  // row assertion unreliable, so it is intentionally not asserted here.)
  args: {
    ...baseProps,
    createLinkAction: async (input) => ({
      ok: true,
      data: {
        linkId: "l-new",
        studentId: input.studentId,
        studentName: "Vũ Đức Anh",
        studentClassName: "10C3",
        parentId: input.parentId,
        parentName: "Vũ Thị Ngọc",
        parentPhone: "0966 777 888",
        relationship: input.relationship,
        consentStatus: "pending",
        linkedOn: "2026-07-19",
      },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    await userEvent.click(dialog.getByRole("button", { name: "Tạo liên kết" }));
    // Dialog closes on success.
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    // Success toast text with the interpolated parent → student names (AC-003.2).
    await waitFor(() =>
      expect(
        within(document.body).getByText(
          /Đã tạo liên kết Vũ Thị Ngọc → Vũ Đức Anh/,
        ),
      ).toBeInTheDocument(),
    );
  },
};

export const CreateDialogPendingBusy: Story = {
  args: {
    ...baseProps,
    // Never resolves — the submit button must show its busy/pending state
    // (AC-003.5), mirroring the unlink non-optimistic pending proof.
    createLinkAction: () =>
      new Promise<ActionResult<ParentStudentLink>>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    const submit = dialog.getByRole("button", { name: "Tạo liên kết" });
    await userEvent.click(submit);
    // Submit reflects the in-flight state and the dialog stays open.
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
    await expect(within(document.body).getByRole("dialog")).toBeInTheDocument();
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

export const CreateDialogValidationStudent: Story = {
  args: {
    ...baseProps,
    createLinkAction: async () => ({
      ok: false,
      errorKey: "validation",
      retryable: false,
      fields: [{ field: "studentId", message: "student-not-found" }],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Tạo liên kết" }));
    const dialog = await fillCreateForm();
    await userEvent.click(dialog.getByRole("button", { name: "Tạo liên kết" }));
    // The studentId 422 must render visible + accessible error text — a
    // role="alert" node is announced by AT on render (A11Y-002; previously the
    // student field got only a red border with no text). Its id is what the
    // combobox's describedById points at when the field is in trigger state.
    const alert = await dialog.findByText("Không tìm thấy học sinh này.");
    await expect(alert).toBeInTheDocument();
    await expect(alert).toHaveAttribute("role", "alert");
    await expect(alert.getAttribute("id")).toBeTruthy();
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
    // Keyboard-only END-TO-END selection INSIDE the dialog (AC-003.8, DEF-2).
    // The combobox trigger opens with Enter, exposes a role="option" listbox,
    // then ArrowDown+Enter must genuinely COMPLETE a selection — proven here at
    // the real create-dialog level (the nested Popover is `modal`, so its own
    // focus scope pauses the Dialog's trap and cmdk keeps keyboard focus).
    const studentTrigger = dialog.getByRole("button", { name: "Học sinh" });
    studentTrigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(body.getByText("Vũ Đức Anh")).toBeInTheDocument(),
    );
    const options = await body.findAllByRole("option");
    await expect(options.length).toBeGreaterThan(0);
    // Arrow-navigate to the first candidate and select it with Enter.
    await userEvent.keyboard("{ArrowDown}{Enter}");
    // The selection renders the chip + its "Bỏ chọn" clear button inside the
    // dialog; the trigger placeholder is gone.
    await waitFor(() =>
      expect(
        dialog.getByRole("button", { name: "Bỏ chọn" }),
      ).toBeInTheDocument(),
    );
  },
};

// ── Detail dialog ────────────────────────────────────────────────────────────

function getRowTrigger(rowStudent: string): HTMLElement {
  const canvas = within(document.body);
  const triggers = canvas.getAllByRole("button", {
    name: /Hành động cho liên kết/i,
  });
  // Pick the trigger whose aria-label mentions the row's student.
  return (
    triggers.find((t) => t.getAttribute("aria-label")?.includes(rowStudent)) ??
    triggers[0]
  );
}

async function openRowMenuAndPick(itemName: string, rowStudent: string) {
  const canvas = within(document.body);
  const trigger = getRowTrigger(rowStudent);
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

// ── Focus-return on dialog close (A11Y-001) ──────────────────────────────────
// The row menu opens the dialog via a deferred callback (setTimeout past the
// dropdown's own close) so focus is captured/restored to THIS "..." trigger —
// never falling to <body>. Assert it for both the unlink (Cancel + Escape) and
// the detail dialog.

export const UnlinkCancelReturnsFocus: Story = {
  args: baseProps,
  play: async () => {
    const trigger = getRowTrigger("Nguyễn Minh Khoa");
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Huỷ" }));
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const UnlinkEscapeReturnsFocus: Story = {
  args: baseProps,
  play: async () => {
    const trigger = getRowTrigger("Nguyễn Minh Khoa");
    await openRowMenuAndPick("Gỡ liên kết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    await body.findByRole("alertdialog");
    await waitFor(() => expect(body.queryByRole("menuitem")).toBeNull());
    // The dropdown→dialog transition briefly leaves a stale dismissable layer
    // that swallows Escape until it settles (Radix + exit-animation timing in
    // the headless runner). Re-send Escape each poll until the dialog closes —
    // this proves Escape DOES dismiss it, then focus must return to the trigger.
    await waitFor(async () => {
      await userEvent.keyboard("{Escape}");
      expect(body.queryByRole("alertdialog")).toBeNull();
    });
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const DetailReturnsFocus: Story = {
  args: baseProps,
  play: async () => {
    const trigger = getRowTrigger("Nguyễn Minh Khoa");
    await openRowMenuAndPick("Xem chi tiết", "Nguyễn Minh Khoa");
    const body = within(document.body);
    const dialog = within(await body.findByRole("dialog"));
    await waitFor(() =>
      expect(body.getByText("Chi tiết liên kết")).toBeInTheDocument(),
    );
    await waitFor(() => expect(body.queryByRole("menuitem")).toBeNull());
    // Close via the dialog's own "Đóng" (X) button — the deferred open captured
    // the row trigger as the return-focus target, so focus must land back there.
    await userEvent.click(dialog.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

// ── Responsive widths (REAL page.viewport, UC-007 / AC-007) ──────────────────
// Card list <760px; table ≥760px. Each story drives a real width so matchMedia
// (useIsMobile) responds, asserts data parity + NO horizontal overflow, then
// resets to desktop so later stories aren't left narrow.

async function expectCardParity(canvas: ReturnType<typeof within>) {
  // Full data parity per card: student + relationship badge + parent + phone +
  // consent badge (AC-007.2, MAJOR-3 — relationship is the shared badge).
  await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
  await expect(canvas.getByText("Bố")).toBeInTheDocument();
  await expect(canvas.getByText("Nguyễn Văn Bình")).toBeInTheDocument();
  await expect(canvas.getByText("0912 345 678")).toBeInTheDocument();
  await expect(canvas.getByText("Đã đồng ý nhận TB")).toBeInTheDocument();
}

export const MobileCardList320: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    await setViewport(320, 720);
    try {
      const canvas = within(canvasElement);
      await waitFor(() =>
        expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument(),
      );
      await expect(canvas.queryByRole("table")).toBeNull();
      await expectCardParity(canvas);
      expectNoHorizontalOverflow();
    } finally {
      await resetViewport();
    }
  },
};

export const MobileCardList375: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    await setViewport(375, 812);
    try {
      const canvas = within(canvasElement);
      await waitFor(() =>
        expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument(),
      );
      await expect(canvas.queryByRole("table")).toBeNull();
      await expectCardParity(canvas);
      expectNoHorizontalOverflow();
    } finally {
      await resetViewport();
    }
  },
};

export const Tablet768: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    await setViewport(768, 1024);
    try {
      const canvas = within(canvasElement);
      // ≥760px → the table renders (no clipping / horizontal scroll).
      await waitFor(() =>
        expect(canvas.getByRole("table")).toBeInTheDocument(),
      );
      await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
      expectNoHorizontalOverflow();
    } finally {
      await resetViewport();
    }
  },
};

export const Desktop1280: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    await setViewport(1280, 900);
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("table")).toBeInTheDocument());
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    expectNoHorizontalOverflow();
  },
};

export const MobileEmpty: Story = {
  args: { ...baseProps, initialPage: page([]), listLinksAction: okList([]) },
  play: async ({ canvasElement }) => {
    await setViewport(375, 812);
    try {
      const canvas = within(canvasElement);
      await waitFor(() =>
        expect(
          canvas.getByText("Lớp này chưa có liên kết nào"),
        ).toBeInTheDocument(),
      );
      expectNoHorizontalOverflow();
    } finally {
      await resetViewport();
    }
  },
};

export const MobileError: Story = {
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
    await setViewport(375, 812);
    try {
      const canvas = within(canvasElement);
      await waitFor(() =>
        expect(canvas.getByText("Không tải được dữ liệu")).toBeInTheDocument(),
      );
      await expect(
        canvas.getByRole("button", { name: "Thử lại" }),
      ).toBeInTheDocument();
      expectNoHorizontalOverflow();
    } finally {
      await resetViewport();
    }
  },
};

export const MobileRowMenuKeyboard: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    await setViewport(375, 812);
    try {
      within(canvasElement);
      const body = within(document.body);
      // AC-007.6: the mobile card's row menu is keyboard-operable identically to
      // desktop (Radix DropdownMenu). Focus the trigger, open with Enter, and
      // reach the menu items with the keyboard.
      const trigger = getRowTrigger("Nguyễn Minh Khoa");
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      await waitFor(() =>
        expect(
          body.getByRole("menuitem", { name: "Xem chi tiết" }),
        ).toBeInTheDocument(),
      );
      await expect(
        body.getByRole("menuitem", { name: "Gỡ liên kết" }),
      ).toBeInTheDocument();
      // Radix focuses the first item on open; Enter activates "Xem chi tiết" and
      // opens the detail dialog — fully keyboard-operable, identical to desktop.
      await userEvent.keyboard("{Enter}");
      await waitFor(() =>
        expect(body.getByText("Chi tiết liên kết")).toBeInTheDocument(),
      );
    } finally {
      await resetViewport();
    }
  },
};
