import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SealAuditEntry,
  SealBatchStatus,
  SealedStudentOption,
  UnsealRequest,
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

const LOCKED_BATCH: SealBatchStatus = {
  classId: "11B2",
  term: "HK1",
  year: "2025-2026",
  subjectLabel: "Toán",
  allLocked: true,
  totalStudents: 6,
  unlockedStudents: 0,
  unlockedSubjectNames: [],
  status: "PENDING",
  sealedAt: null,
  sealedBy: null,
};

const NOT_LOCKED_BATCH: SealBatchStatus = {
  classId: "10A1",
  term: "HK1",
  year: "2025-2026",
  subjectLabel: "Toán",
  allLocked: false,
  totalStudents: 8,
  unlockedStudents: 3,
  unlockedSubjectNames: ["Toán", "Ngữ văn", "Tiếng Anh"],
  status: "PENDING",
  sealedAt: null,
  sealedBy: null,
};

const SEALED_BATCH: SealBatchStatus = {
  ...LOCKED_BATCH,
  classId: "12C1",
  status: "SEALED",
  sealedAt: "2026-01-15T14:32:00.000Z",
  sealedBy: "Trần Minh Quân",
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

const PENDING_FROM_OTHER: UnsealRequest = {
  id: "ur-2",
  studentId: "s-11B2-9",
  studentName: "Nguyễn Hoàng Nam",
  classId: "11B2",
  term: "HK1",
  year: "2025-2026",
  reason:
    "Học sinh chuyển trường vào giữa kỳ. Cần cập nhật học bạ với điểm từ trường cũ.",
  requestedById: "admin-2",
  requestedByName: "Lê Thị Mai",
  requestedAt: "2026-02-22T08:45:00.000Z",
  status: "PENDING",
  coSignerId: null,
  coSignerName: null,
  confirmedAt: null,
  selfApproved: false,
};

const PENDING_OWN: UnsealRequest = {
  ...PENDING_FROM_OTHER,
  id: "ur-1",
  studentId: "s-12C1-3",
  studentName: "Phạm Hữu Phúc",
  classId: "12C1",
  requestedById: "admin-1",
  requestedByName: "Trần Minh Quân",
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
    batch: LOCKED_BATCH,
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
    pendingRequests: [PENDING_FROM_OTHER],
    isRequestsLoading: false,
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

/** AC-2 */
export const AllLockedGate_OK: Story = {
  args: { vm: baseVM() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(M.gate.allLocked.title)).toBeInTheDocument();
    const sealBtn = canvas.getByRole("button", { name: M.sealButton });
    await expect(sealBtn).toBeEnabled();
  },
};

/** AC-3 */
export const AllLockedGate_NotOK: Story = {
  args: { vm: baseVM({ seal: sealVM({ batch: NOT_LOCKED_BATCH }) }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(M.gate.notAllLocked.warning),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: M.gate.notAllLocked.linkToApproval }),
    ).toBeInTheDocument();
    // Seal button is absent in the NOT-OK branch.
    await expect(
      canvas.queryByRole("button", { name: M.sealButton }),
    ).not.toBeInTheDocument();
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
    await expect(
      canvas.getByText(new RegExp(M.sealSuccess.sealedByLabel)),
    ).toBeInTheDocument();
    // Sealed-by name appears both in the header chip and the seal indicator.
    await expect(canvas.getAllByText("Trần Minh Quân").length).toBeGreaterThan(
      0,
    );
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

/** Unseal tab — no pending requests. */
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
