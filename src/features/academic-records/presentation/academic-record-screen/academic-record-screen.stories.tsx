import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { academicRecordMapper } from "../../infrastructure/mappers/academic-record.mapper";
import { MOCK_ACADEMIC_RECORD } from "../../infrastructure/repositories/mocks/fixtures";
import { AcademicRecordScreen } from "./academic-record-screen";
import type { AcademicRecordScreenVM } from "./academic-record-screen.i-vm";
import { AcademicRecordSkeleton } from "./academic-record-skeleton";

const RECORD = academicRecordMapper(MOCK_ACADEMIC_RECORD);

function vm(
  over: Partial<AcademicRecordScreenVM> = {},
): AcademicRecordScreenVM {
  return {
    role: "student",
    studentId: "std-001",
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
      <NextIntlClientProvider locale="vi" messages={messages}>
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
    <NextIntlClientProvider locale="vi" messages={messages}>
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
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(canvas.getByRole("tablist")).toBeInTheDocument();
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

const SEALED_RECORD = academicRecordMapper({
  ...MOCK_ACADEMIC_RECORD,
  years: MOCK_ACADEMIC_RECORD.years.map((y) => ({
    ...y,
    terms: y.terms.map((tr) => ({
      ...tr,
      status: "SEALED" as const,
      conductGrade: tr.conductGrade ?? "Tot",
      subjects:
        tr.subjects.length > 0
          ? tr.subjects
          : MOCK_ACADEMIC_RECORD.years[0].terms[0].subjects,
    })),
  })),
});

export const SealedRecord: Story = {
  args: {
    vm: vm({ role: "admin", record: SEALED_RECORD }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText("Đã niêm phong").length).toBeGreaterThan(
      0,
    );
  },
};

export const UnsealedTermWarning: Story = {
  args: { vm: vm({ role: "admin", selectedYearId: "2024-2025" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học bạ đã được mở")).toBeInTheDocument();
  },
};

export const EmptyYear: Story = {
  args: {
    vm: vm({ role: "student", record: { ...RECORD, years: [] } }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có dữ liệu học bạ"),
    ).toBeInTheDocument();
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
