import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  GradeApprovalBatch,
  GradeApprovalBatchDetail,
} from "../../domain/entities/grade-approval-batch.entity";
import { GradeApprovalScreen } from "./grade-approval-screen";
import type { GradeApprovalScreenVM } from "./grade-approval-screen.i-vm";

const BATCHES: GradeApprovalBatch[] = [
  {
    id: "batch-001",
    className: "10A1",
    subjectName: "Toán",
    teacherName: "Nguyễn Văn A",
    term: "HK1",
    studentCount: 30,
    status: "PENDING_APPROVAL",
    updatedAt: "2025-05-01T10:00:00Z",
  },
  {
    id: "batch-002",
    className: "10A2",
    subjectName: "Ngữ văn",
    teacherName: "Trần Thị B",
    term: "HK1",
    studentCount: 28,
    status: "PUBLISHED",
    updatedAt: "2025-04-28T09:00:00Z",
  },
  {
    id: "batch-003",
    className: "11B1",
    subjectName: "Hóa học",
    teacherName: "Lê Văn C",
    term: "HK1",
    studentCount: 32,
    status: "LOCKED",
    updatedAt: "2025-04-20T08:00:00Z",
  },
  {
    id: "batch-004",
    className: "11B2",
    subjectName: "Vật lý",
    teacherName: "Phạm Thị D",
    term: "HK1",
    studentCount: 25,
    status: "PENDING_APPROVAL",
    updatedAt: "2025-05-03T11:00:00Z",
  },
];

const DETAIL: GradeApprovalBatchDetail = {
  id: "batch-001",
  className: "10A1",
  subjectName: "Toán",
  teacherName: "Nguyễn Văn A",
  term: "HK1",
  studentCount: 3,
  status: "PENDING_APPROVAL",
  updatedAt: "2025-05-01T10:00:00Z",
  averageScore: 8.2,
  distribution: [
    { key: "excellent", count: 1 },
    { key: "good", count: 1 },
    { key: "average", count: 1 },
    { key: "weak", count: 0 },
    { key: "poor", count: 0 },
  ],
  previewRows: [
    {
      studentName: "Nguyễn Văn An",
      studentCode: "HS001",
      average: 8.6,
      gradeBandKey: "excellent",
    },
    {
      studentName: "Trần Thị Bình",
      studentCode: "HS002",
      average: 7.2,
      gradeBandKey: "good",
    },
    {
      studentName: "Lê Hoàng Cường",
      studentCode: "HS003",
      average: 5.5,
      gradeBandKey: "average",
    },
  ],
};

const baseVM: GradeApprovalScreenVM = {
  batches: BATCHES,
  isLoading: false,
  error: null,
  statusFilter: "ALL",
  onFilterChange: fn(),
  selectedBatchIds: [],
  onSelectBatch: fn(),
  onSelectAll: fn(),
  onOpenBatchDetail: fn(),
  detailBatchId: null,
  onCloseDetail: fn(),
  detail: null,
  isDetailLoading: false,
  onApprove: fn(),
  onRequestRevision: fn(),
  onBulkLock: fn(),
  isApproving: false,
  isRequestingRevision: false,
  isBulkLocking: false,
  isSelfPublishMode: false,
};

const meta: Meta<typeof GradeApprovalScreen> = {
  title: "Features/Grades/GradeApprovalScreen",
  component: GradeApprovalScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-[color:var(--edu-bg)]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GradeApprovalScreen>;

export const Loading: Story = {
  args: { vm: { ...baseVM, isLoading: true, batches: [] } },
};

export const ListMixedStatuses: Story = {
  args: { vm: baseVM },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("10A1")).toBeInTheDocument();
    await expect(canvas.getByText("11B1")).toBeInTheDocument();
    await expect(
      canvas.getAllByText(messages.gradeApproval.statusPendingApproval).length,
    ).toBeGreaterThan(0);
  },
};

export const PendingFilter: Story = {
  args: {
    vm: {
      ...baseVM,
      statusFilter: "PENDING_APPROVAL",
      batches: BATCHES.filter((b) => b.status === "PENDING_APPROVAL"),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("10A1")).toBeInTheDocument();
    await expect(canvas.queryByText("11B1")).not.toBeInTheDocument();
  },
};

export const BatchReviewSheet: Story = {
  args: { vm: { ...baseVM, detailBatchId: "batch-001", detail: DETAIL } },
  play: async () => {
    const body = within(document.body);
    await expect(
      body.getByText(messages.gradeApproval.detailSheet.title),
    ).toBeInTheDocument();
    await expect(body.getByText("Nguyễn Văn An")).toBeInTheDocument();
  },
};

export const ApproveFlow: Story = {
  args: { vm: { ...baseVM, detailBatchId: "batch-001", detail: DETAIL } },
  play: async () => {
    const body = within(document.body);
    const approveBtn = body.getByRole("button", {
      name: messages.gradeApproval.actionApprove,
    });
    await userEvent.click(approveBtn);
    await expect(
      body.getByText(messages.gradeApproval.approveDialog.title),
    ).toBeInTheDocument();
  },
};

export const RevisionRequestFlow: Story = {
  args: { vm: { ...baseVM, detailBatchId: "batch-001", detail: DETAIL } },
  play: async () => {
    const body = within(document.body);
    const revisionBtn = body.getByRole("button", {
      name: messages.gradeApproval.actionRequestRevision,
    });
    await userEvent.click(revisionBtn);
    await expect(
      body.getByText(messages.gradeApproval.revisionDialog.title),
    ).toBeInTheDocument();
  },
};

export const BulkLockFlow: Story = {
  args: {
    vm: {
      ...baseVM,
      statusFilter: "PUBLISHED",
      batches: BATCHES.filter((b) => b.status === "PUBLISHED"),
      selectedBatchIds: ["batch-002"],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lockBtn = canvas.getByRole("button", {
      name: messages.gradeApproval.actionBulkLock,
    });
    await userEvent.click(lockBtn);
    const body = within(document.body);
    await expect(
      body.getByText(messages.gradeApproval.bulkLockDialog.title),
    ).toBeInTheDocument();
  },
};

export const SelfPublishModeWarning: Story = {
  args: { vm: { ...baseVM, isSelfPublishMode: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeApproval.selfPublishModeWarning),
    ).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  args: { vm: { ...baseVM, batches: [], statusFilter: "ALL" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.gradeApproval.emptyState),
    ).toBeInTheDocument();
  },
};
