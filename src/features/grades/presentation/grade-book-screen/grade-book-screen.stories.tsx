import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  GradeBook,
  GradeBookRow,
} from "../../domain/entities/grade-book.entity";
import { GradeBookScreen } from "./grade-book-screen";
import type {
  ClassSubjectOption,
  GradeBookScreenVM,
} from "./grade-book-screen.i-vm";

const SCHEME = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  columns: [
    {
      id: "tx",
      type: "TX" as const,
      label: "Thường xuyên",
      count: 2,
      weight: 20,
    },
    { id: "gk", type: "GK" as const, label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK" as const, label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

const CLASS_SUBJECTS: ClassSubjectOption[] = [
  { id: "cs-001", label: "10A1 — Toán" },
  { id: "cs-002", label: "10A2 — Toán" },
];

const ROWS: GradeBookRow[] = [
  {
    studentId: "hs-001",
    studentName: "Nguyễn Văn An",
    studentCode: "HS001",
    scores: { tx: 8, gk: 8, ck: 9 },
    average: 8.5,
    conductGrade: "Tot",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-002",
    studentName: "Trần Thị Bình",
    studentCode: "HS002",
    scores: { tx: 3, gk: 4, ck: 4.6 },
    average: 4.1,
    conductGrade: "TB",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-003",
    studentName: "Lê Hoàng Cường",
    studentCode: "HS003",
    scores: { tx: 9.4, gk: 9.6, ck: 9.9 },
    average: 9.7,
    conductGrade: "Tot",
    publishStatus: "PUBLISHED",
  },
];

const book: GradeBook = {
  classSubjectId: "cs-001",
  term: "HK1",
  className: "10A1",
  subjectName: "Toán",
  scheme: SCHEME,
  rows: ROWS,
  publishMode: "SELF_PUBLISH",
};

function vm(over: Partial<GradeBookScreenVM> = {}): GradeBookScreenVM {
  return {
    role: "teacher",
    classSubjects: CLASS_SUBJECTS,
    selectedCsId: "cs-001",
    selectedTerm: "HK1",
    gradeBook: book,
    isPublished: true,
    error: null,
    gradeEntryPath: "/vi/t/demo/teacher/grades",
    ...over,
  };
}

const meta: Meta<typeof GradeBookScreen> = {
  title: "Grades/GradeBookScreen",
  component: GradeBookScreen,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof GradeBookScreen>;

export const Loading: Story = {
  args: { vm: vm(), isLoading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status")).toBeInTheDocument();
  },
};

export const TeacherView_WithScores: Story = {
  args: { vm: vm() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    // Rank distribution chart present for roster roles.
    expect(canvas.getByText("Phân bố xếp loại")).toBeInTheDocument();
  },
};

export const PrincipalView: Story = {
  args: { vm: vm({ role: "principal", gradeEntryPath: undefined }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Phân bố xếp loại")).toBeInTheDocument();
  },
};

export const StudentView_SingleRow: Story = {
  args: {
    vm: vm({
      role: "student",
      classSubjects: [],
      selectedCsId: null,
      gradeBook: { ...book, rows: [ROWS[0]] },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    // No selectors for student.
    expect(canvas.queryByText("Chọn lớp - môn")).toBeNull();
  },
};

export const ParentView_SingleRow: Story = {
  args: {
    vm: vm({
      role: "parent",
      classSubjects: [],
      selectedCsId: null,
      gradeBook: { ...book, rows: [ROWS[1]] },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Trần Thị Bình")).toBeInTheDocument();
  },
};

export const PublishGateBanner: Story = {
  args: {
    vm: vm({
      role: "student",
      classSubjects: [],
      selectedCsId: null,
      isPublished: false,
      gradeBook: { ...book, rows: [ROWS[0]] },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Điểm chưa được công bố")).toBeInTheDocument();
  },
};

export const NoSelection: Story = {
  args: { vm: vm({ selectedCsId: null, gradeBook: null }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.getByText("Chọn lớp và học kỳ để xem bảng điểm"),
    ).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  args: { vm: vm({ gradeBook: { ...book, rows: [] } }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Chưa có điểm")).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: { vm: vm({ error: "network-error", gradeBook: null }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("alert")).toBeInTheDocument();
    expect(canvas.getByText("Lỗi kết nối, thử lại sau")).toBeInTheDocument();
  },
};
