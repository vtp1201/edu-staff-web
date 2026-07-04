import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  GradeBook,
  GradeBookRow,
} from "@/features/grades/domain/entities/grade-book.entity";
import { GradeBookTable } from "./grade-book-table";

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
  {
    studentId: "hs-004",
    studentName: "Phạm Tiến Dũng",
    studentCode: "HS004",
    scores: { tx: 6, gk: 6.6, ck: 7.2 },
    average: 6.8,
    conductGrade: "Kha",
    publishStatus: "PUBLISHED",
  },
  {
    studentId: "hs-005",
    studentName: "Vũ Thị Em",
    studentCode: "HS005",
    scores: { tx: 5, gk: 5, ck: 5 },
    average: 5.0,
    conductGrade: "Yeu",
    publishStatus: "PUBLISHED",
  },
];

function book(rows: GradeBookRow[]): GradeBook {
  return {
    classSubjectId: "cs-001",
    term: "HK1",
    className: "10A1",
    subjectName: "Toán",
    scheme: SCHEME,
    rows,
    publishMode: "SELF_PUBLISH",
  };
}

const meta: Meta<typeof GradeBookTable> = {
  title: "Shared/GradeBookTable",
  component: GradeBookTable,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="p-5">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof GradeBookTable>;

export const TeacherView_WithScores: Story = {
  args: { gradeBook: book(ROWS), role: "teacher", isPublished: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 5 student rows render with their names.
    expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(canvas.getByText("Vũ Thị Em")).toBeInTheDocument();
    // Table structure (caption + column headers) — the table has no CTA.
    const table = canvas.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(table.querySelector("caption")).toBeInTheDocument();
    const colHeaders = table.querySelectorAll("th[scope='col']");
    expect(colHeaders.length).toBeGreaterThan(0);
    // Conduct grades shown as text (never color-only).
    expect(canvas.getAllByText("Tốt").length).toBeGreaterThan(0);
    // Score color classes applied (4.1 → error, 9.7 → success).
    const errorScores = table.querySelectorAll(".text-edu-error-text");
    expect(errorScores.length).toBeGreaterThan(0);
    const successScores = table.querySelectorAll(".text-edu-success-text");
    expect(successScores.length).toBeGreaterThan(0);
  },
};

export const PrincipalView: Story = {
  args: { gradeBook: book(ROWS), role: "principal", isPublished: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No teacher CTA for principal.
    expect(canvas.queryByRole("button", { name: "Nhập điểm" })).toBeNull();
    expect(canvas.getByText("Lê Hoàng Cường")).toBeInTheDocument();
  },
};

export const StudentView_SingleRow: Story = {
  args: { gradeBook: book([ROWS[0]]), role: "student", isPublished: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(canvas.queryByText("Vũ Thị Em")).toBeNull();
  },
};

export const ParentView_SingleRow: Story = {
  args: { gradeBook: book([ROWS[1]]), role: "parent", isPublished: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Trần Thị Bình")).toBeInTheDocument();
  },
};

export const PublishGateBanner: Story = {
  args: { gradeBook: book([ROWS[0]]), role: "student", isPublished: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Gate banner instead of the table.
    expect(canvas.getByText("Điểm chưa được công bố")).toBeInTheDocument();
    expect(canvas.queryByText("Nguyễn Văn An")).toBeNull();
  },
};

export const EmptyState: Story = {
  args: { gradeBook: book([]), role: "teacher", isPublished: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Chưa có điểm")).toBeInTheDocument();
  },
};

/**
 * US-E17.2 — mobile scroll at 375px. The wrapper is a labelled scroll region;
 * the first column (student name) stays sticky while the score columns scroll.
 */
export const MobileScroll_375: Story = {
  args: { gradeBook: book(ROWS), role: "student", isPublished: true },
  parameters: {
    viewport: {
      viewports: {
        mobile375: {
          name: "Mobile 375",
          styles: { width: "375px", height: "812px" },
          type: "mobile",
        },
      },
      defaultViewport: "mobile375",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Scroll wrapper is an accessible region named via aria-labelledby → the
    // sr-only <caption> (A11Y-002: single source of the name, no duplicate).
    const region = canvas.getByRole("region", { name: "Bảng điểm học sinh" });
    expect(region).toBeInTheDocument();
    expect(region).not.toHaveAttribute("aria-label");
    const labelledBy = region.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const caption = document.getElementById(labelledBy as string);
    expect(caption?.tagName.toLowerCase()).toBe("caption");
    expect(caption?.textContent).toBe("Bảng điểm học sinh");
    // A11Y-001: focusable so keyboard-only users can scroll the overflow region.
    expect(region).toHaveAttribute("tabindex", "0");
    region.focus();
    expect(region).toHaveFocus();
    // iOS momentum scroll + horizontal overflow live on that same element.
    expect(region.style.getPropertyValue("-webkit-overflow-scrolling")).toBe(
      "touch",
    );
    expect(region.className).toContain("overflow-x-auto");
    // Table enforces its 640px readable minimum so columns are not crushed.
    const table = canvas.getByRole("table");
    expect(table.className).toContain("min-w-[640px]");
    // Sticky first column (student name) remains present.
    const rowHeader = canvas.getByRole("rowheader", {
      name: /Nguyễn Văn An/,
    });
    expect(rowHeader).toBeInTheDocument();
    expect(rowHeader.className).toContain("sticky");
    expect(rowHeader.className).toContain("border-r");
  },
};
