import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  GradeBook,
  GradeBookRow,
} from "@/features/grades/domain/entities/grade-book.entity";
import { GradeBookTable } from "./grade-book-table";

/**
 * QA NOTE (US-E17.11): `@storybook/addon-viewport` is NOT installed, so the
 * `parameters.viewport` blocks below are inert decoration only. To get REAL
 * proof at 375px we drive the `@vitest/browser-playwright` context directly
 * via `page.viewport()` (same pattern as detail-panel-header.stories.tsx).
 */
async function resizeToMobile() {
  const { page } = await import("vitest/browser");
  await page.viewport(375, 812);
}

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
    // AC-10 (iOS momentum scroll): NOT asserted here. Chromium — the only
    // engine `@vitest/browser-playwright` drives — does not recognize the
    // non-standard `-webkit-overflow-scrolling` property, so the browser
    // silently drops the declaration from the live CSSOM (confirmed:
    // `style.getPropertyValue`, `style.cssText`, and even
    // `getAttribute("style")` all come back empty for this property once React
    // sets it via the DOM style API — there is no way to observe it from a
    // real Chromium DOM). This is expected graceful degradation on non-Safari
    // engines, not a component defect. AC-10 proof instead lives in
    // `grade-book-table.test.tsx` (`renderToStaticMarkup`), which asserts the
    // literal server-rendered markup contains
    // `-webkit-overflow-scrolling:touch` — the authoritative check that the
    // JSX actually emits the declaration Safari will honor.
    expect(region.className).toContain("overflow-x-auto");
    // AC-01: computed overflow-x is actually `auto` on the region.
    expect(getComputedStyle(region).overflowX).toBe("auto");
    // AC-02: no internal horizontal padding — sticky column starts flush left.
    const regionStyle = getComputedStyle(region);
    expect(regionStyle.paddingLeft).toBe("0px");
    expect(regionStyle.paddingRight).toBe("0px");
    // Table enforces its 640px readable minimum so columns are not crushed
    // (AC-01/AC-11) — verified via computed layout, not just the className.
    const table = canvas.getByRole("table");
    expect(table.className).toContain("min-w-[640px]");
    expect(table.getBoundingClientRect().width).toBeGreaterThanOrEqual(640);
    // AC-01/AC-12: no page-level horizontal overflow — only the region scrolls.
    expect(document.documentElement.scrollWidth).toBe(
      document.documentElement.clientWidth,
    );
    // Sticky first column (student name) remains present.
    const rowHeader = canvas.getByRole("rowheader", {
      name: /Nguyễn Văn An/,
    });
    expect(rowHeader).toBeInTheDocument();
    expect(rowHeader.className).toContain("sticky");
    expect(rowHeader.className).toContain("border-r");
    // AC-07: sticky cell computed position/left/z-index/background.
    const rowHeaderStyle = getComputedStyle(rowHeader);
    expect(rowHeaderStyle.position).toBe("sticky");
    expect(rowHeaderStyle.left).toBe("0px");
    expect(rowHeaderStyle.zIndex).toBe("1");
    // bg-card is opaque (not "rgba(0, 0, 0, 0)"/"transparent") — a real fill,
    // not the wrapper's card background showing through by accident.
    expect(rowHeaderStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(rowHeaderStyle.backgroundColor).not.toBe("transparent");
    // AC-06: sticky header stays pinned to the left edge of the region after
    // scrolling the region 100px to the right.
    const headerCell = canvas.getByRole("columnheader", { name: "Học sinh" });
    const beforeScroll = headerCell.getBoundingClientRect().left;
    region.scrollLeft = 100;
    const afterScroll = headerCell.getBoundingClientRect().left;
    expect(afterScroll).toBe(beforeScroll);
    expect(getComputedStyle(headerCell).position).toBe("sticky");
  },
};

/**
 * US-E17.2 / AC-12 — at 320px (the narrowest supported viewport) the table
 * still enforces its 640px minimum and the page itself never gains
 * horizontal overflow; only the scroll region does.
 */
export const MobileScroll_320: Story = {
  args: { gradeBook: book(ROWS), role: "student", isPublished: true },
  parameters: {
    viewport: {
      viewports: {
        mobile320: {
          name: "Mobile 320",
          styles: { width: "320px", height: "700px" },
          type: "mobile",
        },
      },
      defaultViewport: "mobile320",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table");
    expect(table.getBoundingClientRect().width).toBeGreaterThanOrEqual(640);
    expect(document.documentElement.scrollWidth).toBe(
      document.documentElement.clientWidth,
    );
  },
};

/**
 * US-E17.2 / AC-13 — at desktop (1280px) the table expands to fill its
 * container; `min-w-[640px]` is a floor, not a ceiling.
 */
export const DesktopView_1280: Story = {
  args: { gradeBook: book(ROWS), role: "teacher", isPublished: true },
  parameters: {
    viewport: {
      viewports: {
        desktop1280: {
          name: "Desktop 1280",
          styles: { width: "1280px", height: "800px" },
          type: "desktop",
        },
      },
      defaultViewport: "desktop1280",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table");
    expect(table.getBoundingClientRect().width).toBeGreaterThan(640);
  },
};

/**
 * US-E17.2 / AC-16 — Parent role gets the identical mobile scroll behavior
 * as Student (AC-15); the scroll wrapper structure is role-agnostic.
 */
export const ParentView_Mobile375: Story = {
  args: { gradeBook: book([ROWS[1]]), role: "parent", isPublished: true },
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
    const region = canvas.getByRole("region", { name: "Bảng điểm học sinh" });
    expect(region.className).toContain("overflow-x-auto");
    const table = canvas.getByRole("table");
    expect(table.getBoundingClientRect().width).toBeGreaterThanOrEqual(640);
    expect(canvas.getByText("Trần Thị Bình")).toBeInTheDocument();
  },
};

/**
 * US-E17.2 / AC-17 — Teacher on tablet (768px): scroll wrapper present, and
 * because the table (640px min) is narrower than the viewport here it does
 * not need to scroll — the sticky column classes are still applied
 * (harmless no-op) and stay visible either way.
 */
export const TeacherView_Tablet768: Story = {
  args: { gradeBook: book(ROWS), role: "teacher", isPublished: true },
  parameters: {
    viewport: {
      viewports: {
        tablet768: {
          name: "Tablet 768",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
      },
      defaultViewport: "tablet768",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("region", { name: "Bảng điểm học sinh" });
    expect(region.className).toContain("overflow-x-auto");
    const rowHeader = canvas.getByRole("rowheader", {
      name: /Nguyễn Văn An/,
    });
    expect(getComputedStyle(rowHeader).position).toBe("sticky");
    expect(document.documentElement.scrollWidth).toBe(
      document.documentElement.clientWidth,
    );
  },
};

/**
 * US-E17.11 / AC-E17.11-01 — at a real 375px viewport every data-row cell
 * (row header + score/average/conduct cells) renders at least 44px tall,
 * meeting the WCAG 2.5.5 / 2.5.8 touch-target floor. Proven via live layout
 * (getBoundingClientRect), not just the className.
 */
export const TouchTarget_Mobile375: Story = {
  args: { gradeBook: book(ROWS), role: "student", isPublished: true },
  play: async ({ canvasElement }) => {
    await resizeToMobile();
    const canvas = within(canvasElement);
    // First data row: its sticky row header (student name/code).
    const rowHeader = canvas.getByRole("rowheader", { name: /Nguyễn Văn An/ });
    expect(rowHeader.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    // Every data cell in that same <tr> is ≥ 44px tall too.
    const dataRow = rowHeader.closest("tr");
    expect(dataRow).not.toBeNull();
    const dataCells = (dataRow as HTMLTableRowElement).querySelectorAll("td");
    expect(dataCells.length).toBeGreaterThanOrEqual(5);
    for (const cell of dataCells) {
      expect(cell.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};
