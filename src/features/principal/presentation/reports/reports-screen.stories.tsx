import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import type {
  ReportsSummaryEntity,
  Term,
} from "@/features/principal/domain/reports/entities/reports-summary.entity";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import { ReportsScreen } from "./reports-screen";
import type { ActionResult } from "./reports-screen.i-vm";

const summary: ReportsSummaryEntity = {
  totalStudents: 1248,
  totalStudentsTrend: 2.1,
  schoolAverage: 7.42,
  schoolAverageTrend: 0.8,
  attendanceRate: 96.4,
  attendanceRateTrend: -0.5,
  incidentCount: 23,
  incidentCountTrend: -12,
};
const subjects: SubjectAverageEntity[] = [
  { subjectId: "s-math", subjectName: "Toán", average: 7.8 },
  { subjectId: "s-lit", subjectName: "Ngữ văn", average: 7.1 },
];
const weeks: AttendanceTrendPointEntity[] = [
  { weekLabel: "T1", rate: 97.2 },
  { weekLabel: "T3", rate: 95.1 },
];
const reports: ReportListItemEntity[] = [
  {
    id: "r1",
    name: "Báo cáo sơ kết Học kỳ I",
    term: "HK1",
    createdAt: "2026-01-10T02:00:00.000Z",
    status: "ready",
  },
];

const ok =
  <T,>(data: T) =>
  (_termId: Term): Promise<ActionResult<T>> =>
    Promise.resolve({ ok: true, data });
const reject =
  <T,>() =>
  (_termId: Term): Promise<ActionResult<T>> =>
    Promise.resolve({ ok: false, errorKey: "network-error" });

const baseActions = {
  initialTerm: "HK2" as Term,
  getReportsSummaryAction: ok(summary),
  getSubjectAveragesAction: ok(subjects),
  getAttendanceTrendAction: ok(weeks),
  getPeriodicReportsAction: ok(reports),
  generateReportAction: ok(reports[0]),
};

const meta: Meta<typeof ReportsScreen> = {
  title: "Principal/Reports/ReportsScreen",
  component: ReportsScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <NextIntlClientProvider
          locale="vi"
          messages={messages}
          timeZone="Asia/Ho_Chi_Minh"
        >
          <QueryClientProvider client={qc}>
            <Story />
          </QueryClientProvider>
        </NextIntlClientProvider>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof ReportsScreen>;

export const Success: Story = {
  args: baseActions,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: messages.reports.pageTitle }),
    ).toBeInTheDocument();
    // All 4 regions settle to success.
    await waitFor(() => expect(canvas.getByText("1.248")).toBeInTheDocument());
    await waitFor(() =>
      expect(canvas.getAllByRole("img").length).toBeGreaterThanOrEqual(2),
    );
    await expect(
      canvas.getByText(messages.reports.table.title),
    ).toBeInTheDocument();
  },
};

/** AC-01.3 — one region's fetch fails while the other 3 succeed: only the
 *  failed region shows error+retry, the others render normally. */
export const PartialRegionError: Story = {
  args: {
    ...baseActions,
    getReportsSummaryAction: reject<ReportsSummaryEntity>(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Stat grid region shows a scoped error alert.
    await waitFor(() => expect(canvas.getByRole("alert")).toBeInTheDocument());
    // The other 3 regions still render (2 charts + the table title).
    await waitFor(() =>
      expect(canvas.getAllByRole("img").length).toBeGreaterThanOrEqual(2),
    );
    await expect(
      canvas.getByText(messages.reports.table.title),
    ).toBeInTheDocument();
  },
};

/** Viewport matrix (NFR-002). The charts row is
 *  `grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]` — below the
 *  `lg` breakpoint (1024px) it MUST compute to a single column (charts stack,
 *  no horizontal overflow); at/above it, two tracks. Verified via
 *  `getComputedStyle` (real Chromium layout), not just a class-name string
 *  match, so a broken/renamed Tailwind class would actually fail this. */
function chartsGridColumnCount(canvasElement: HTMLElement): number {
  const grid = within(canvasElement)
    .getByText(messages.reports.charts.subjectAverage.title)
    .closest("[class*='grid-cols-1']") as HTMLElement | null;
  if (!grid) throw new Error("charts grid container not found");
  const template = getComputedStyle(grid).gridTemplateColumns;
  return template.split(" ").filter(Boolean).length;
}

const viewport = (width: number, height: number) => ({
  viewport: {
    viewports: {
      custom: {
        name: `custom-${width}`,
        styles: { width: `${width}px`, height: `${height}px` },
        type: "mobile" as const,
      },
    },
    defaultViewport: "custom",
  },
});

export const Viewport320: Story = {
  args: baseActions,
  parameters: { viewport: viewport(320, 700).viewport },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        within(canvasElement).getByText(
          messages.reports.charts.subjectAverage.title,
        ),
      ).toBeInTheDocument(),
    );
    // No horizontal overflow at the narrowest supported width.
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321);
    // Charts stack to a single column below the lg breakpoint.
    expect(chartsGridColumnCount(canvasElement)).toBe(1);
  },
};

export const Viewport768: Story = {
  args: baseActions,
  parameters: { viewport: viewport(768, 900).viewport },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        within(canvasElement).getByText(
          messages.reports.charts.subjectAverage.title,
        ),
      ).toBeInTheDocument(),
    );
    // 768px is still below the `lg` (1024px) breakpoint — still single column.
    expect(chartsGridColumnCount(canvasElement)).toBe(1);
  },
};

export const Viewport1280: Story = {
  args: baseActions,
  parameters: { viewport: viewport(1280, 900).viewport },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(
        within(canvasElement).getByText(
          messages.reports.charts.subjectAverage.title,
        ),
      ).toBeInTheDocument(),
    );
    // At/above `lg`, the 2-column chart layout is in effect.
    expect(chartsGridColumnCount(canvasElement)).toBe(2);
  },
};
