import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SealAuditEntry,
  SealedStudentOption,
  SealStatusRollup,
  UnsealRequestSummary,
} from "../../domain/entities/seal-batch.entity";
import { AcademicRecordSealScreen } from "./academic-record-seal-screen";
import type {
  AcademicRecordSealScreenVM,
  ClassOption,
  SealTabVM,
  UnsealTabVM,
} from "./academic-record-seal-screen.i-vm";

const M = messages.academicRecordSeal;

const CLASS_OPTIONS: ClassOption[] = [
  { classId: "11B2", className: "Lớp 11B2" },
  { classId: "12C1", className: "Lớp 12C1" },
];

/**
 * US-E18.24 rollup truth-table fixtures — the four states the real
 * `GET .../seal-status` can report (there is no 4th enum value; "never sealed"
 * vs "sealed then fully unsealed" are BOTH `PENDING`, told apart only by
 * `lastSealedAt`).
 */
const PENDING_NEVER_SEALED: SealStatusRollup = {
  classId: "11B2",
  term: "HK1",
  year: "2025-2026",
  totalStudents: 6,
  sealedCount: 0,
  unsealedCount: 0,
  status: "PENDING",
  lastSealedAt: null,
  resealCount: 0,
};

const PARTIAL_BATCH: SealStatusRollup = {
  ...PENDING_NEVER_SEALED,
  classId: "10A1",
  totalStudents: 8,
  sealedCount: 3,
  unsealedCount: 2,
  status: "PARTIAL",
  lastSealedAt: "2026-01-15T14:32:00.000Z",
  resealCount: 1,
};

const PENDING_WAS_SEALED: SealStatusRollup = {
  ...PENDING_NEVER_SEALED,
  classId: "10A2",
  totalStudents: 8,
  sealedCount: 0,
  unsealedCount: 8,
  status: "PENDING",
  lastSealedAt: "2026-01-15T14:32:00.000Z",
  resealCount: 1,
};

const SEALED_BATCH: SealStatusRollup = {
  ...PENDING_NEVER_SEALED,
  classId: "12C1",
  sealedCount: 6,
  unsealedCount: 0,
  status: "SEALED",
  lastSealedAt: "2026-01-15T14:32:00.000Z",
  resealCount: 1,
};

const NEAR_RESEAL_CAP_BATCH: SealStatusRollup = {
  ...SEALED_BATCH,
  resealCount: 4,
};

const AUDIT: SealAuditEntry[] = [
  {
    id: "au-1",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    actorName: "Trần Minh Quân",
    action: "SEAL",
    occurredAt: "2026-01-15T14:32:00.000Z",
  },
  {
    id: "au-2",
    classId: "11B2",
    term: "HK1",
    year: "2025-2026",
    actorName: "Lê Thị Mai",
    action: "UNSEAL",
    occurredAt: "2026-02-11T09:00:00.000Z",
  },
];

const SEALED_STUDENTS: SealedStudentOption[] = [
  {
    studentId: "s-12C1-1",
    studentName: "Lê Hoàng Nhật",
    classId: "12C1",
    term: "HK1",
    year: "2025-2026",
    sealedAt: "2026-01-15T14:32:00.000Z",
  },
];

const PENDING_FROM_OTHER: UnsealRequestSummary = {
  requestId: "ur-2",
  classId: "11B2",
  termId: "HK1",
  studentMemberId: "s-11B2-9",
  studentName: "Nguyễn Hoàng Nam",
  requestedBy: "admin-2",
  requestedByName: "Lê Thị Mai",
  reason:
    "Học sinh chuyển trường vào giữa kỳ. Cần cập nhật học bạ với điểm từ trường cũ.",
  status: "PENDING",
  createdAt: "2026-02-22T08:45:00.000Z",
};

const PENDING_OWN: UnsealRequestSummary = {
  ...PENDING_FROM_OTHER,
  requestId: "ur-1",
  classId: "12C1",
  studentMemberId: "s-12C1-3",
  studentName: "Phạm Hữu Phúc",
  requestedBy: "admin-1",
  requestedByName: "Trần Minh Quân",
};

/**
 * US-E18.24 — the IAM batch lookup could not resolve either id, so both display
 * names degrade to the raw member id (never an error, never a blank).
 */
const PENDING_UNRESOLVED_NAMES: UnsealRequestSummary = {
  ...PENDING_FROM_OTHER,
  requestId: "ur-4",
  studentMemberId: "m-9f3c",
  studentName: "m-9f3c",
  requestedBy: "m-77aa",
  requestedByName: "m-77aa",
};

function sealVM(over: Partial<SealTabVM> = {}): SealTabVM {
  return {
    year: "2025-2026",
    term: "HK1",
    classId: "11B2",
    classOptions: CLASS_OPTIONS,
    isClassOptionsLoading: false,
    onYearChange: fn(),
    onTermChange: fn(),
    onClassChange: fn(),
    batch: PENDING_NEVER_SEALED,
    isBatchLoading: false,
    batchError: null,
    isConfirmDialogOpen: false,
    onOpenConfirmDialog: fn(),
    onCloseConfirmDialog: fn(),
    onConfirmSeal: fn(),
    isSealing: false,
    auditTrail: AUDIT,
    isAuditTrailLoading: false,
    ...over,
  };
}

function unsealVM(over: Partial<UnsealTabVM> = {}): UnsealTabVM {
  return {
    currentAdminId: "admin-1",
    currentAdminName: "Trần Minh Quân",
    tenantAdminCount: 3,
    classId: "11B2",
    pendingRequests: [PENDING_FROM_OTHER],
    isRequestsLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: fn(),
    isInitiateFormOpen: false,
    onOpenInitiateForm: fn(),
    onCloseInitiateForm: fn(),
    sealedStudentOptions: SEALED_STUDENTS,
    isSealedStudentOptionsLoading: false,
    onSubmitInitiate: fn(),
    isInitiating: false,
    onConfirmRequest: fn(),
    isConfirming: false,
    sameAdminErrorRequestId: null,
    onDismissSameAdminError: fn(),
    selfApproveTargetRequestId: null,
    onRequestSelfApprove: fn(),
    onDismissSelfApprove: fn(),
    onConfirmSelfApprove: fn(),
    ...over,
  };
}

function baseVM(
  over: Partial<AcademicRecordSealScreenVM> = {},
): AcademicRecordSealScreenVM {
  return {
    activeTab: "seal",
    onTabChange: fn(),
    pendingUnsealCount: 1,
    currentAdminName: "Trần Minh Quân",
    isLoading: false,
    error: null,
    seal: sealVM(),
    unseal: unsealVM(),
    ...over,
  };
}

const meta: Meta<typeof AcademicRecordSealScreen> = {
  title: "Features/AcademicRecords/AcademicRecordSealScreen",
  component: AcademicRecordSealScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-background p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AcademicRecordSealScreen>;

/** AC-1 */
export const Loading: Story = {
  args: { vm: baseVM({ isLoading: true }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByLabelText(messages.Common.skeleton.loadingAriaLabel),
    ).toBeInTheDocument();
  },
};

/**
 * AC-2 + US-E18.24 rollup matrix (1/4) — `status: "SEALED"`, the green branch.
 * The label flips to "reseal" (idempotent) and the button stays enabled.
 */
export const Rollup_Sealed: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: SEALED_BATCH }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(M.gate.rollup.sealedTitle),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: M.resealButton }),
    ).toBeEnabled();
    // Count line is real data now, not a decorative "X/Y locked" mock hint.
    await expect(canvas.getByText(/6 học sinh/)).toBeInTheDocument();
  },
};

/**
 * US-E18.24 rollup matrix (2/4) — `status: "PENDING"` with a NULL
 * `lastSealedAt` = genuinely never sealed.
 */
export const Rollup_PendingNeverSealed: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: PENDING_NEVER_SEALED }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(M.gate.rollup.pendingTitle),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(M.sealSuccess.neverSealed),
    ).toBeInTheDocument();
    // The "was sealed" copy must NOT appear — that would be a lie here.
    await expect(
      canvas.queryByText(M.sealSuccess.wasSealedThenUnsealed),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.24 rollup matrix (3/4) — `status: "PENDING"` with a NON-NULL
 * `lastSealedAt` = sealed once, then fully unsealed. The truth table has no 4th
 * enum value, so the timestamp is the ONLY signal; the copy must say so.
 */
export const Rollup_PendingWasSealed: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: PENDING_WAS_SEALED }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(M.sealSuccess.wasSealedThenUnsealed),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(new RegExp(M.sealSuccess.lastSealedAtLabel)),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByText(M.sealSuccess.neverSealed),
    ).not.toBeInTheDocument();
  },
};

/** US-E18.24 — near the 5-reseal cap: a non-blocking caption warns the admin. */
export const Rollup_NearResealCap: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: NEAR_RESEAL_CAP_BATCH }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/4\/5/)).toBeInTheDocument();
    // Still only a hint — resealing remains offered (the server decides).
    await expect(
      canvas.getByRole("button", { name: M.resealButton }),
    ).toBeEnabled();
  },
};

/**
 * AC-3 + US-E18.24 rollup matrix (4/4) — `status: "PARTIAL"`. The banner warns
 * + links to Approval & Lock AND still offers Seal (the 422 reactive gate, not
 * this hint, is the submit-time authority). It must NOT claim any per-subject
 * detail — that data has no wire equivalent and is gone from the UI.
 */
export const Rollup_Partial: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: PARTIAL_BATCH }) }) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.gate.rollup.warning)).toBeInTheDocument();
    // Count-based copy replaces the removed per-subject "unlocked subjects" list.
    await expect(canvas.getByText(/3\/8/)).toBeInTheDocument();
    await expect(canvas.queryByText(/Môn chưa khoá/)).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: M.gate.rollup.linkToApproval }),
    ).toBeInTheDocument();
    // Seal button is now PRESENT + enabled in the NOT-OK branch (reactive gate).
    const sealBtn = canvas.getByRole("button", { name: M.sealButton });
    await expect(sealBtn).toBeEnabled();
    await userEvent.click(sealBtn);
    await expect(args.vm.seal.onOpenConfirmDialog).toHaveBeenCalled();
    // A11Y-001: role="alert" scopes to message-only — no focusable control nested.
    const alert = canvas.getByRole("alert");
    await expect(within(alert).queryByRole("button")).toBeNull();
  },
};

/**
 * US-E18.13 QA gate — the NOT-OK warning card now crams 2 buttons (link to
 * approval + Seal) instead of 1 into the same banner. Prove at a REAL 375px
 * viewport (`@vitest/browser-playwright`, same technique as
 * discipline-screen.stories.tsx's TouchTarget_Mobile375) that `flex-col` on
 * the button-group wrapper actually stacks them — no horizontal overflow —
 * rather than trusting the Tailwind classes by inspection alone.
 */
export const Rollup_Partial_Mobile375: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: PARTIAL_BATCH }) }) },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    const canvas = within(canvasElement);

    const approvalBtn = canvas.getByRole("button", {
      name: M.gate.rollup.linkToApproval,
    });
    const sealBtn = canvas.getByRole("button", { name: M.sealButton });
    await expect(approvalBtn).toBeVisible();
    await expect(sealBtn).toBeVisible();

    // Real layout check: the two buttons must NOT sit side-by-side (that's
    // what overflowed) — at 375px the button-group has stacked into a column,
    // so the Seal button's top must be at/after the approval button's bottom.
    const approvalRect = approvalBtn.getBoundingClientRect();
    const sealRect = sealBtn.getBoundingClientRect();
    await expect(sealRect.top).toBeGreaterThanOrEqual(approvalRect.bottom - 1);

    // No horizontal overflow anywhere in the card at this viewport.
    const card = approvalBtn.closest("div.rounded-xl") as HTMLElement | null;
    await expect(card).not.toBeNull();
    await expect((card as HTMLElement).scrollWidth).toBeLessThanOrEqual(
      (card as HTMLElement).clientWidth + 1,
    );

    // Touch target floor (a11y baseline) holds for both buttons at mobile.
    await expect(approvalRect.height).toBeGreaterThanOrEqual(36);
    await expect(sealRect.height).toBeGreaterThanOrEqual(36);
  },
};

/**
 * US-E18.13 (ADR 0055) — reseal on an already-SEALED batch is idempotent: the
 * Seal button stays ENABLED and its label switches to "Ký lại học bạ".
 */
export const Rollup_Reseal: Story = {
  args: {
    vm: baseVM({ seal: sealVM({ batch: SEALED_BATCH, classId: "12C1" }) }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const resealBtn = canvas.getByRole("button", { name: M.resealButton });
    await expect(resealBtn).toBeEnabled();
    // The plain "Ký học bạ" label is NOT shown once already sealed.
    await expect(
      canvas.queryByRole("button", { name: M.sealButton }),
    ).not.toBeInTheDocument();
    await userEvent.click(resealBtn);
    await expect(args.vm.seal.onOpenConfirmDialog).toHaveBeenCalled();
  },
};

/** AC-4 + AC-10 (Radix Dialog focus-trap) */
export const SealConfirmDialog: Story = {
  args: { vm: baseVM({ seal: sealVM({ isConfirmDialogOpen: true }) }) },
  play: async () => {
    const body = within(document.body);
    await expect(body.getByText(M.sealDialog.title)).toBeInTheDocument();
    await expect(
      body.getByRole("button", { name: M.sealDialog.confirm }),
    ).toBeInTheDocument();
  },
};

/** AC-5 */
export const SealSuccess: Story = {
  args: {
    vm: baseVM({
      seal: sealVM({ batch: SEALED_BATCH, classId: "12C1" }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // US-E18.24 — the signer's NAME is gone (no `sealedBy` on the wire); the
    // indicator now reports the last-seal TIMESTAMP from the real rollup.
    await expect(
      canvas.getByText(new RegExp(M.sealSuccess.lastSealedAtLabel)),
    ).toBeInTheDocument();
  },
};

/** AC-6 */
export const AuditTrail: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.auditTrail.title)).toBeInTheDocument();
    // actionUnseal ("Mở học bạ") is unique to the audit table; the SEAL label
    // collides with the tab/title copy, so assert the actor + unseal action.
    await expect(
      canvas.getByText(M.auditTrail.actionUnseal),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Lê Thị Mai")).toBeInTheDocument();
  },
};

/** AC-7 — reason under 20 chars keeps submit disabled. */
export const UnsealInitiate: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      unseal: unsealVM({ isInitiateFormOpen: true }),
    }),
  },
  play: async () => {
    // Scope to the slide-over — the form title collides with the toolbar button.
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(
      dialog.getByText(M.unseal.initiateForm.subtitle),
    ).toBeInTheDocument();
    const submit = dialog.getByRole("button", {
      name: M.unseal.initiateForm.submit,
    });
    await expect(submit).toBeDisabled();
    const textarea = dialog.getByLabelText(M.unseal.initiateForm.reasonLabel);
    await userEvent.type(textarea, "quá ngắn");
    await expect(submit).toBeDisabled();
  },
};

/** AC-8 — a different admin can confirm. */
export const UnsealConfirm: Story = {
  args: { vm: baseVM({ activeTab: "unseal" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nguyễn Hoàng Nam")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: M.unseal.confirmButton }),
    ).toBeInTheDocument();
  },
};

/** AC-8 — same admin → blocking error dialog. */
export const UnsealSameAdminError: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      unseal: unsealVM({ sameAdminErrorRequestId: "ur-2" }),
    }),
  },
  play: async () => {
    const body = within(document.body);
    await expect(
      body.getByText(M.unseal.sameAdminDialog.title),
    ).toBeInTheDocument();
  },
};

/** ADR-0037 — single-admin self-approve fallback (warn + proceed). */
export const UnsealSelfApproveFallback: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      pendingUnsealCount: 1,
      unseal: unsealVM({
        tenantAdminCount: 1,
        pendingRequests: [PENDING_OWN],
        selfApproveTargetRequestId: "ur-1",
      }),
    }),
  },
  play: async () => {
    const body = within(document.body);
    await expect(
      body.getByText(M.unseal.selfApproveDialog.title),
    ).toBeInTheDocument();
    await expect(
      body.getByText(M.unseal.selfApproveDialog.auditLabel),
    ).toBeInTheDocument();
  },
};

/** Page-level query failure (e.g. seal-status fetch throws) — inline
 * role="alert" panel mapped from `AcademicRecordsFailure["type"]` via i18n,
 * per state-architecture.md §5 "error (query failure)". */
export const PageError: Story = {
  args: { vm: baseVM({ error: "network-error" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = canvas.getByRole("alert");
    await expect(alert).toBeInTheDocument();
    await expect(alert).toHaveTextContent(M.errors["network-error"]);
  },
};

/** Seal tab — no batch loaded yet (selector incomplete / no data for the
 * chosen class+term+year). Distinct from AC-3's NOT-OK gate: here there is no
 * batch object at all. */
export const SealTab_EmptyBatch: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: null, classId: null }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.emptyBatch)).toBeInTheDocument();
    // No seal button and no gate copy should render without a batch.
    await expect(
      canvas.queryByRole("button", { name: M.sealButton }),
    ).not.toBeInTheDocument();
  },
};

/** Audit trail — no entries yet for the tenant. */
export const AuditTrail_Empty: Story = {
  args: { vm: baseVM({ seal: sealVM({ auditTrail: [] }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.auditTrail.empty)).toBeInTheDocument();
  },
};

/** Unseal tab — a class IS selected but it has no pending requests. */
export const UnsealTab_EmptyPending: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      pendingUnsealCount: 0,
      unseal: unsealVM({ pendingRequests: [] }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.unseal.empty.pending)).toBeInTheDocument();
  },
};

/**
 * US-E18.24 — the listing is class+term-scoped on the wire, so with NO class
 * selected the tab prompts instead of showing a misleading "no requests" empty
 * state (and the tab badge is omitted).
 */
export const UnsealTab_SelectAClassPrompt: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      pendingUnsealCount: 0,
      unseal: unsealVM({ classId: null, pendingRequests: [] }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(M.unseal.emptyClassPrompt),
    ).toBeInTheDocument();
    // NOT the plain empty state — that would imply "this class has none".
    await expect(
      canvas.queryByText(M.unseal.empty.pending),
    ).not.toBeInTheDocument();
    // No load-more affordance when there is nothing scoped to load.
    await expect(
      canvas.queryByRole("button", { name: M.unseal.loadMore }),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.24 — the BE listing is served from a reconciler-maintained clone
 * table, so a just-filed request can lag. Surfaced as a light, non-blocking
 * caption (never an error state — no error code exists for "not yet visible").
 */
export const UnsealTab_EventualConsistencyHint: Story = {
  args: { vm: baseVM({ activeTab: "unseal" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(M.unseal.eventualConsistencyHint),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

/** US-E18.24 — cursor pagination: the load-more button fetches the next page. */
export const UnsealTab_LoadMore: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      unseal: unsealVM({ hasNextPage: true }),
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: M.unseal.loadMore });
    await expect(btn).toBeEnabled();
    await userEvent.click(btn);
    await expect(args.vm.unseal.onLoadMore).toHaveBeenCalledTimes(1);
  },
};

/** US-E18.24 — exhausted cursor: the control leaves the DOM (no dead tab-stop). */
export const UnsealTab_LoadMoreExhausted: Story = {
  args: { vm: baseVM({ activeTab: "unseal" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: M.unseal.loadMore }),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.24 — `core` ships raw member UUIDs; when the IAM batch lookup cannot
 * resolve one, the row degrades to the raw id rather than erroring or blanking.
 */
export const UnsealTab_UnresolvedNamesFallBackToRawId: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      unseal: unsealVM({ pendingRequests: [PENDING_UNRESOLVED_NAMES] }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("m-9f3c")).toBeInTheDocument();
    await expect(
      canvas.getByText(M.unseal.card.requestedBy.replace("{name}", "m-77aa")),
    ).toBeInTheDocument();
    // Degraded display, never an error banner.
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: M.unseal.confirmButton }),
    ).toBeEnabled();
  },
};

/** ADR-0037 — in a MULTI-admin tenant the initiator's own pending request shows
 * only "awaiting other admin"; the self-approve bypass must NOT be offered. */
export const UnsealOwnRequestMultiAdmin: Story = {
  args: {
    vm: baseVM({
      activeTab: "unseal",
      pendingUnsealCount: 1,
      unseal: unsealVM({
        tenantAdminCount: 3,
        pendingRequests: [PENDING_OWN],
      }),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.unseal.card.awaitingOther)).toBeVisible();
    // The two-admin gate: no self-approve affordance for the initiator.
    await expect(
      canvas.queryByRole("button", { name: M.unseal.selfApproveButton }),
    ).not.toBeInTheDocument();
    // ...and no confirm button either (own request can't be self-confirmed).
    await expect(
      canvas.queryByRole("button", { name: M.unseal.confirmButton }),
    ).not.toBeInTheDocument();
  },
};
