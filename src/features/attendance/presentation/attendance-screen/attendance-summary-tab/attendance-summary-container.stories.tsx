import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ClassAttendanceSummary } from "../../../domain/entities/student-attendance-summary.entity";
import type { SummaryYear } from "../../../domain/resolve-summary-range";
import { AttendanceSummaryContainer } from "./attendance-summary-container";

const SUMMARY: ClassAttendanceSummary = {
  students: [
    {
      studentId: "s1",
      name: "Nguyễn Văn An",
      present: 18,
      late: 0,
      excused: 1,
      absent: 1,
      recorded: 20,
      rate: 90,
      band: "watch",
    },
  ],
  meanRate: 90,
};

const getSummaryAction = () =>
  Promise.resolve({ ok: true as const, data: SUMMARY });

/** The academic calendar read refused (403) or came back empty — the exact
 *  degrade `resolve-summary-range` answers `no-terms` for. */
const getNoTermsAction = () => Promise.resolve(null);

const YEARS: SummaryYear[] = [
  {
    isActive: true,
    terms: [
      {
        id: "t2",
        name: "Học kỳ II",
        startDate: "2026-01-16",
        endDate: "2026-05-31",
      },
    ],
  },
];

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/**
 * Container-level stories: they exist for the paths the presentational stories
 * CANNOT reach, because the behaviour lives in the URL → range resolution, not
 * in the markup — a stale `?range=term`, and a `?month=` that has not started.
 */
const meta: Meta<typeof AttendanceSummaryContainer> = {
  title: "Attendance/AttendanceSummaryContainer",
  component: AttendanceSummaryContainer,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/vi/attendance" } },
  },
  args: {
    classId: "c-1",
    getSummaryAction,
    getTermsAction: () => Promise.resolve(YEARS),
    // Injected clock: every range boundary in these stories is deterministic.
    today: "2026-04-17",
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={makeQueryClient()}>
        <NextIntlClientProvider locale="vi" messages={messages}>
          <div className="bg-background p-6">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AttendanceSummaryContainer>;

/**
 * `?range=term` in the URL but NO readable calendar (403/empty).
 *
 * Review SHOULD-FIX #2: the term/year segments are not rendered in that case,
 * so honouring the URL left the segmented control with nothing selected and no
 * secondary control — a screen that looks broken. The container now coerces the
 * effective kind to `month` once the terms read has settled empty, and keeps
 * the `no-terms` notice so the swap is explained rather than silent.
 */
export const NoTermsWithTermInUrl: Story = {
  args: { getTermsAction: getNoTermsAction },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/vi/attendance", query: { range: "term" } },
    },
  },
  play: async ({ canvas }) => {
    // The segmented control has a SELECTED item again — "Tháng".
    const month = await canvas.findByRole("radio", { name: "Tháng" });
    await expect(month).toHaveAttribute("data-state", "on");

    // …and the segments that cannot work are absent, not empty-selected.
    await expect(
      canvas.queryByRole("radio", { name: "Học kỳ" }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("radio", { name: "Cả năm" }),
    ).not.toBeInTheDocument();

    // The month input (the secondary control for `month`) is back, defaulted
    // to the injected today's month — the control state is complete.
    await expect(canvas.getByLabelText("Chọn tháng")).toHaveValue("2026-04");

    // The downgrade is explained, not silent.
    await expect(
      canvas.getByText(
        "Chưa đọc được lịch năm học nên chỉ xem được theo tháng.",
      ),
    ).toBeInTheDocument();
  },
};

/**
 * A `?month=` that has not started yet.
 *
 * Review SHOULD-FIX #1: this used to render the "over 366 days" notice, which
 * is nonsense advice for a one-month span. The reason now travels with the
 * failure, so the copy matches the cause.
 */
export const FutureMonthInUrl: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/vi/attendance",
        query: { range: "month", month: "2027-01" },
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/không hợp lệ/i)).toBeInTheDocument();
    // The wrong explanation is gone.
    await expect(canvas.queryByText(/366 ngày/)).not.toBeInTheDocument();
  },
};

/**
 * The genuine >366-day case still says "366 days": one term spanning two
 * years, asked for as `?range=year`.
 */
export const OversizeYearInUrl: Story = {
  args: {
    getTermsAction: () =>
      Promise.resolve([
        {
          isActive: true,
          terms: [
            {
              id: "long",
              name: "Kỳ dài",
              startDate: "2024-01-01",
              endDate: "2026-12-31",
            },
          ],
        },
      ] satisfies SummaryYear[]),
  },
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/vi/attendance", query: { range: "year" } },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/vượt quá 366 ngày/),
    ).toBeInTheDocument();
    // The term segments ARE offered here — the calendar was readable.
    await expect(canvas.getByRole("radio", { name: "Cả năm" })).toHaveAttribute(
      "data-state",
      "on",
    );
  },
};
