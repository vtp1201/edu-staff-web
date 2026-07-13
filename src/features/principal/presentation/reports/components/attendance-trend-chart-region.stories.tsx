import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AttendanceTrendPointEntity } from "@/features/principal/domain/reports/entities/attendance-trend-point.entity";
import { AttendanceTrendChartRegion } from "./attendance-trend-chart-region";

const weeks: AttendanceTrendPointEntity[] = [
  { weekLabel: "T1", rate: 97.2 },
  { weekLabel: "T2", rate: 96.8 },
  { weekLabel: "T3", rate: 95.1 }, // < 96 → dual-flagged (color + bold label)
  { weekLabel: "T4", rate: 96.9 },
  { weekLabel: "T5", rate: 97.6 },
  { weekLabel: "T6", rate: 96.4 },
];

const meta: Meta<typeof AttendanceTrendChartRegion> = {
  title: "Principal/Reports/AttendanceTrendChartRegion",
  component: AttendanceTrendChartRegion,
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
type Story = StoryObj<typeof AttendanceTrendChartRegion>;

export const Loading: Story = {
  args: { status: "loading", data: [], errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const ErrorState: Story = {
  args: {
    status: "error",
    data: [],
    errorKey: "network-error",
    onRetry: () => {},
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toBeInTheDocument();
  },
};

export const Success: Story = {
  args: { status: "success", data: weeks, errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img")).toBeInTheDocument();
    // Low-attendance week label carries the bold warning-text style (dual-flag,
    // AC-03.2 — survives color-removed because the weight differs too).
    const low = canvas.getByText("95,1%");
    await expect(low).toHaveClass("font-extrabold");
    await expect(low).toHaveClass("text-edu-warning-text");
    // A healthy week does NOT use that style.
    await expect(canvas.getByText("97,2%")).toHaveClass("font-semibold");
  },
};

export const Empty: Story = {
  args: { status: "empty", data: [], errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        messages.reports.charts.attendanceTrend.emptyTitle,
      ),
    ).toBeInTheDocument();
  },
};
