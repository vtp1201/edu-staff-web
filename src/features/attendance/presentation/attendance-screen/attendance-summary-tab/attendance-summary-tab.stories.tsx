import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  ClassAttendanceSummary,
  StudentAttendanceSummary,
} from "../../../domain/entities/student-attendance-summary.entity";
import type { SummaryTerm } from "../../../domain/resolve-summary-range";
import { AttendanceSummaryTab } from "./attendance-summary-tab";
import type { SummaryControlsVM } from "./attendance-summary-tab.i-vm";

function student(
  over: Partial<StudentAttendanceSummary> & { studentId: string; name: string },
): StudentAttendanceSummary {
  return {
    present: 0,
    late: 0,
    excused: 0,
    absent: 0,
    recorded: 0,
    rate: null,
    band: null,
    ...over,
  };
}

const FULL: ClassAttendanceSummary = {
  students: [
    student({
      studentId: "s1",
      name: "Nguyễn Văn An",
      present: 98,
      late: 1,
      excused: 1,
      absent: 0,
      recorded: 100,
      rate: 98,
      band: "ok",
    }),
    student({
      studentId: "s2",
      name: "Trần Thị Bình",
      present: 92,
      late: 2,
      excused: 4,
      absent: 2,
      recorded: 100,
      rate: 92,
      band: "watch",
    }),
    student({
      studentId: "s3",
      name: "Lê Quốc Châu",
      present: 84,
      late: 1,
      excused: 3,
      absent: 12,
      recorded: 100,
      rate: 84,
      band: "risk",
    }),
    // Never marked in this range — an unranked row, no chip, out of the mean.
    student({ studentId: "s4", name: "Phạm Minh Dũng" }),
  ],
  // (98 + 92 + 84) / 3 — the never-marked student is excluded.
  meanRate: 91.3,
};

const ALL_OK: ClassAttendanceSummary = {
  students: [
    student({
      studentId: "s1",
      name: "Nguyễn Văn An",
      present: 99,
      recorded: 100,
      rate: 99,
      band: "ok",
    }),
    student({
      studentId: "s2",
      name: "Trần Thị Bình",
      present: 97,
      recorded: 100,
      rate: 97,
      band: "ok",
    }),
  ],
  meanRate: 98,
};

const TERMS: SummaryTerm[] = [
  {
    id: "t1",
    name: "Học kỳ I",
    startDate: "2025-09-01",
    endDate: "2026-01-15",
  },
  {
    id: "t2",
    name: "Học kỳ II",
    startDate: "2026-01-16",
    endDate: "2026-05-31",
  },
];

const RANGE = { startDate: "2026-04-01", endDate: "2026-04-30" };

const controls: SummaryControlsVM = {
  rangeKind: "month",
  month: "2026-04",
  termId: "t2",
  availableTerms: TERMS,
};

const meta: Meta<typeof AttendanceSummaryTab> = {
  title: "Attendance/AttendanceSummaryTab",
  component: AttendanceSummaryTab,
  parameters: { layout: "fullscreen" },
  args: {
    controls,
    maxMonth: "2026-04",
    notice: null,
    onControlsChange: fn(),
    onRetry: fn(),
  },
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
type Story = StoryObj<typeof AttendanceSummaryTab>;

/**
 * The populated tab: 4 stat cards, the per-student table with a chip per band,
 * the alerts aside and the thresholds legend.
 */
export const Full: Story = {
  args: {
    vm: {
      status: "ready",
      range: RANGE,
      rangeKind: "month",
      availableTerms: TERMS,
      summary: FULL,
    },
  },
  play: async ({ canvas }) => {
    // Class mean excludes the never-marked student (91.3, not 68.5).
    const meanCard = canvas
      .getByText("Chuyên cần trung bình lớp")
      .closest("div")?.parentElement as HTMLElement;
    await expect(within(meanCard).getByText("91.3%")).toBeInTheDocument();

    // One chip per band, scoped to its own row (the same three words also
    // label the thresholds legend, which is the point of the legend).
    // Scoped to the TABLE: an at-risk student's name also appears in the
    // alerts aside, so a bare getByText would match twice.
    const table = within(canvas.getByRole("table"));
    const rowOf = (name: string) =>
      within(table.getByText(name).closest("tr") as HTMLElement);
    await expect(rowOf("Nguyễn Văn An").getByText("Đạt")).toBeInTheDocument();
    await expect(
      rowOf("Trần Thị Bình").getByText("Cảnh báo"),
    ).toBeInTheDocument();
    await expect(
      rowOf("Lê Quốc Châu").getByText("Nguy cơ"),
    ).toBeInTheDocument();

    const unranked = rowOf("Phạm Minh Dũng");
    await expect(unranked.queryByText("Đạt")).not.toBeInTheDocument();
    await expect(
      unranked.getByText("Chưa có buổi điểm danh nào"),
    ).toBeInTheDocument();

    // Table a11y: a caption plus scoped column headers.
    await expect(
      canvas.getByRole("table").querySelector("caption"),
    ).not.toBeNull();
    for (const header of canvas.getAllByRole("columnheader")) {
      await expect(header).toHaveAttribute("scope", "col");
    }

    // The rate bar is a real progressbar carrying the student's rate.
    await expect(
      canvas.getByRole("progressbar", {
        name: "Tỉ lệ chuyên cần của Lê Quốc Châu",
      }),
    ).toHaveAttribute("aria-valuenow", "84");

    // Alerts: the at-risk student comes FIRST, the watch student after.
    const alerts = canvas
      .getByRole("region", { name: "Cảnh báo chuyên cần" })
      .querySelectorAll("li");
    await expect(alerts).toHaveLength(2);
    await expect(alerts[0]).toHaveTextContent("Lê Quốc Châu");
    await expect(alerts[1]).toHaveTextContent("Trần Thị Bình");

    // No "Báo PH" affordance — there is no BE endpoint behind it.
    await expect(canvas.queryByText(/báo ph/i)).not.toBeInTheDocument();

    // Thresholds legend is always present.
    await expect(canvas.getByText("Ngưỡng đánh giá")).toBeInTheDocument();
  },
};

/** Everybody above 95%: the alerts panel states that explicitly. */
export const NoAlerts: Story = {
  args: {
    vm: {
      status: "ready",
      range: RANGE,
      rangeKind: "month",
      availableTerms: TERMS,
      summary: ALL_OK,
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Không có học sinh nào dưới ngưỡng."),
    ).toBeInTheDocument();
    // "HS dưới ngưỡng 90%" reads 0 and takes the success tone.
    const card = canvas.getByText("HS dưới ngưỡng 90%").closest("div")
      ?.parentElement as HTMLElement;
    await expect(within(card).getByText("0")).toBeInTheDocument();
  },
};

/** Clicking the "Tỉ lệ" header sorts the weakest students to the top. */
export const SortByRate: Story = {
  args: {
    vm: {
      status: "ready",
      range: RANGE,
      rangeKind: "month",
      availableTerms: TERMS,
      summary: FULL,
    },
  },
  play: async ({ canvas, userEvent }) => {
    const rowNames = () =>
      canvas
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("td:nth-child(2)")?.textContent ?? "");

    await expect(rowNames()[0]).toContain("Nguyễn Văn An");

    await userEvent.click(
      canvas.getByRole("button", { name: "Sắp xếp theo tỉ lệ chuyên cần" }),
    );

    const sorted = rowNames();
    await expect(sorted[0]).toContain("Lê Quốc Châu"); // 84% — weakest first
    // A student with no rate is never "the worst": they stay last.
    await expect(sorted[sorted.length - 1]).toContain("Phạm Minh Dũng");

    // Toggling back restores the roster order (STT), and the STT number
    // followed its student rather than the row position.
    await userEvent.click(
      canvas.getByRole("button", { name: "Sắp xếp theo tỉ lệ chuyên cần" }),
    );
    await expect(rowNames()[0]).toContain("Nguyễn Văn An");
  },
};

/** Switching the range segment reports the new kind to the container. */
export const RangeSwitch: Story = {
  args: {
    vm: {
      status: "ready",
      range: RANGE,
      rangeKind: "month",
      availableTerms: TERMS,
      summary: FULL,
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Học kỳ" }));
    await expect(args.onControlsChange).toHaveBeenCalledWith({
      rangeKind: "term",
    });
  },
};

/** No academic calendar (403/empty): only "Tháng" is offered, with a notice. */
export const NoTerms: Story = {
  args: {
    controls: { ...controls, availableTerms: null, termId: null },
    notice: "no-terms",
    vm: {
      status: "ready",
      range: RANGE,
      rangeKind: "month",
      availableTerms: null,
      summary: FULL,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Tháng" })).toBeVisible();
    await expect(
      canvas.queryByRole("radio", { name: "Học kỳ" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("radio", { name: "Cả năm" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.getByText(
        "Chưa đọc được lịch năm học nên chỉ xem được theo tháng.",
      ),
    ).toBeInTheDocument();
  },
};

/** A range longer than 366 days is refused client-side — no wire call. */
export const RangeTooLarge: Story = {
  args: {
    notice: "range-too-large",
    vm: { status: "empty", range: { startDate: "", endDate: "" } },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/vượt quá 366 ngày/)).toBeInTheDocument();
    // Never the generic "selection is invalid" copy: the cause is known.
    await expect(canvas.queryByText(/không hợp lệ/i)).not.toBeInTheDocument();
  },
};

/**
 * An unusable SELECTION (a month that has not started, a malformed `?month=`,
 * a term with inverted dates) gets its own copy — telling a teacher who picked
 * next month to "shorten the span" was the bug (review SHOULD-FIX #1).
 */
export const InvalidRange: Story = {
  args: {
    notice: "invalid-range",
    vm: { status: "empty", range: { startDate: "", endDate: "" } },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/không hợp lệ/i)).toBeInTheDocument();
    await expect(canvas.queryByText(/366 ngày/)).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { vm: { status: "loading" } },
  play: async ({ canvas }) => {
    const status = canvas.getByRole("status");
    await expect(status).toHaveAttribute("aria-busy", "true");
    // Exactly ONE live region for the load (stat grid + list, one announcement).
    await expect(canvas.getAllByRole("status")).toHaveLength(1);
    // The range controls stay usable while the data loads.
    await expect(canvas.getByRole("radio", { name: "Tháng" })).toBeEnabled();
  },
};

export const Empty: Story = {
  args: { vm: { status: "empty", range: RANGE } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Chưa có điểm danh trong khoảng này"),
    ).toBeInTheDocument();
  },
};

/** A retryable failure keeps its retry button. */
export const ErrorState: Story = {
  args: { vm: { status: "error", errorKey: "network-error" } },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    const retry = canvas.getByRole("button", { name: "Thử lại" });
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

/** 403 is terminal for this teacher: the retry control is absent, not disabled. */
export const ErrorForbidden: Story = {
  args: { vm: { status: "error", errorKey: "forbidden" } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Bạn không có quyền điểm danh lớp này"),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Thử lại" }),
    ).not.toBeInTheDocument();
  },
};

const VIEWPORT_375 = {
  viewports: {
    mobile375: {
      name: "Mobile 375",
      styles: { width: "375px", height: "812px" },
      type: "mobile" as const,
    },
  },
  defaultViewport: "mobile375",
};

/** 375px: stat cards go 2×2, the aside drops below, the table scrolls. */
export const Viewport375: Story = {
  args: {
    vm: {
      status: "ready",
      range: RANGE,
      rangeKind: "month",
      availableTerms: TERMS,
      summary: FULL,
    },
  },
  parameters: { viewport: VIEWPORT_375 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("table")).toBeInTheDocument();
    // The table is the only thing allowed to scroll horizontally: the PAGE
    // itself must not overflow 375px (a11y — no break at 320/375).
    const root = canvasElement.firstElementChild as HTMLElement;
    await expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(375);
  },
};
