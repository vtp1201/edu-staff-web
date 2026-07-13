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
