import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AcademicRecord } from "../../domain/entities/academic-record.entity";
import { buildAcademicRecord } from "../../domain/use-cases/build-academic-record";
import { mapAcademicRecordRow } from "../../infrastructure/mappers/academic-record.mapper";
import {
  MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR,
  MOCK_STUDENT_ACADEMIC_RECORDS,
  MOCK_SUBJECT_NAMES,
} from "../../infrastructure/repositories/mocks/fixtures";
import { AcademicRecordScreen } from "./academic-record-screen";
import type { AcademicRecordScreenVM } from "./academic-record-screen.i-vm";
import { AcademicRecordSkeleton } from "./academic-record-skeleton";

/** Same mapper + grouping the repositories run — stories cannot drift from prod. */
function build(
  payload = MOCK_STUDENT_ACADEMIC_RECORDS,
  subjectNames: Map<string, string> = MOCK_SUBJECT_NAMES,
): AcademicRecord {
  const rows = payload.records.map((r) =>
    mapAcademicRecordRow(r, subjectNames),
  );
  return buildAcademicRecord(payload.studentMemberId, rows);
}

const RECORD = build();

function vm(
  over: Partial<AcademicRecordScreenVM> = {},
): AcademicRecordScreenVM {
  return {
    role: "student",
    studentId: "stu-001",
    record: RECORD,
    selectedYearId: "2025-2026",
    error: null,
    ...over,
  };
}

const meta: Meta<typeof AcademicRecordScreen> = {
  title: "Features/AcademicRecords/AcademicRecordScreen",
  component: AcademicRecordScreen,
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <div className="bg-background p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AcademicRecordScreen>;

export const Loading: Story = {
  render: () => (
    <NextIntlClientProvider
      locale="vi"
      messages={messages}
      timeZone="Asia/Ho_Chi_Minh"
    >
      <div className="bg-background p-6">
        <AcademicRecordSkeleton />
      </div>
    </NextIntlClientProvider>
  ),
};

export const StudentView: Story = {
  args: { vm: vm({ role: "student" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Xem học bạ của chính mình"),
    ).toBeInTheDocument();
    // Three client-derived year tabs, current year last.
    await expect(canvas.getAllByRole("tab")).toHaveLength(3);
    // Dynamic snapshot columns become the table's column axis.
    await expect(canvas.getByText("Giữa kỳ")).toBeInTheDocument();
    await expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
  },
};

export const TeacherView: Story = {
  args: { vm: vm({ role: "teacher" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Xem học sinh trong lớp"),
    ).toBeInTheDocument();
  },
};

export const ParentView: Story = {
  args: { vm: vm({ role: "parent" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Xem học bạ con đã liên kết"),
    ).toBeInTheDocument();
  },
};

export const AdminView: Story = {
  args: { vm: vm({ role: "admin" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Toàn quyền xem")).toBeInTheDocument();
  },
};

/** Multi-year: switching to an older year shows that year's sealed terms. */
export const EarlierYear: Story = {
  args: { vm: vm({ role: "admin", selectedYearId: "2023-2024" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học kỳ 1")).toBeInTheDocument();
    await expect(canvas.getByText("Học kỳ 2")).toBeInTheDocument();
  },
};

export const UnsealedTermWarning: Story = {
  args: { vm: vm({ role: "admin", selectedYearId: "2024-2025" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học bạ đã được mở")).toBeInTheDocument();
  },
};

/** A PENDING term has no snapshot at all — the empty-term state, not a table. */
export const PendingTerm: Story = {
  args: { vm: vm({ role: "student", selectedYearId: "2025-2026" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học kỳ chưa được ký")).toBeInTheDocument();
  },
};

/**
 * The honest degrade, now driven by an explicitly year-LESS wire payload: an
 * unhealed pre-migration-051 row (US-E18.56 — BE denormalized `academicYear`,
 * so this is rare rather than every PARENT read, but the path must stay alive).
 * Records are shown, never dropped, never given an invented year.
 */
export const UnresolvedYear: Story = {
  args: {
    vm: vm({
      role: "parent",
      record: build(MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR),
      selectedYearId: null,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("tab")).toHaveLength(1);
    await expect(canvas.getByText("Chưa xác định năm học")).toBeInTheDocument();
    // The degrade notice is one of several role="status" regions on this
    // screen (the UNSEALED-term banner is another) — assert its own copy.
    await expect(
      canvas.getByText(/Không xác định được năm học/),
    ).toBeInTheDocument();
  },
};

/** No subject-catalogue lookup: a placeholder label, never a subjectId uuid. */
export const UnresolvedSubjectNames: Story = {
  args: {
    vm: vm({
      role: "student",
      record: build(MOCK_STUDENT_ACADEMIC_RECORDS, new Map()),
      selectedYearId: "2023-2024",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Môn học chưa xác định").length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryByText("s-math")).not.toBeInTheDocument();
  },
};

export const EmptyRecord: Story = {
  args: {
    vm: vm({
      role: "student",
      record: { studentMemberId: "stu-001", years: [], sealed: false },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có dữ liệu học bạ"),
    ).toBeInTheDocument();
    // The homeroom-scope explanation is TEACHER-only — it must not leak into
    // the other three roles' empty state (US-E18.57).
    await expect(
      canvas.queryByText("Không có học bạ nào bạn được xem"),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.57 — the TEACHER read is homeroom-scoped (BE ADR 0136): a teacher who
 * is GVCN of none of this student's classes gets `200 { records: [] }`, NOT a
 * 403. That is the EMPTY branch with teacher-specific copy — asserting here
 * that the generic "no data" wording and the forbidden alert are both absent,
 * since either would misstate why the screen is empty.
 */
export const TeacherNoHomeroomAccessEmpty: Story = {
  args: {
    vm: vm({
      role: "teacher",
      record: { studentMemberId: "stu-001", years: [], sealed: false },
      selectedYearId: null,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có học bạ nào bạn được xem"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/chỉ xem được học bạ của những lớp bạn đang chủ nhiệm/),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByText("Không có dữ liệu học bạ"),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: {
    vm: vm({ role: "student", record: null, error: "forbidden" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByText("Bạn không có quyền xem học bạ này."),
    ).toBeInTheDocument();
  },
};
