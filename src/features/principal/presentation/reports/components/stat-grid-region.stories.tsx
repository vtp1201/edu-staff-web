import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ReportsSummaryEntity } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import { StatGridRegion } from "./stat-grid-region";

const summary: ReportsSummaryEntity = {
  totalStudents: 1248,
  totalStudentsTrend: 2.1,
  schoolAverage: 7.42,
  schoolAverageTrend: 0.8,
  attendanceRate: 96.4,
  attendanceRateTrend: -0.5,
  incidentCount: 23,
  incidentCountTrend: null, // no baseline → trend chip omitted (AC-04.2)
};

const meta: Meta<typeof StatGridRegion> = {
  title: "Principal/Reports/StatGridRegion",
  component: StatGridRegion,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof StatGridRegion>;

export const Loading: Story = {
  args: { status: "loading", data: null, errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const ErrorState: Story = {
  args: {
    status: "error",
    data: null,
    errorKey: "network-error",
    onRetry: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: messages.reports.retry }),
    ).toBeInTheDocument();
  },
};

export const Success: Story = {
  args: { status: "success", data: summary, errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.reports.stats.totalStudents),
    ).toBeInTheDocument();
    // Baseline-less incident card omits its trend chip (no "%" trend rendered
    // for the incidents value).
    await expect(canvas.getByText("1.248")).toBeInTheDocument();
  },
};
