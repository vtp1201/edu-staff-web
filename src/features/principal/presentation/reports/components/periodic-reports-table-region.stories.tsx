import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ReportListItemEntity } from "@/features/principal/domain/reports/entities/report-list-item.entity";
import { PeriodicReportsTableRegion } from "./periodic-reports-table-region";

const reports: ReportListItemEntity[] = [
  {
    id: "r1",
    name: "Báo cáo sơ kết Học kỳ I",
    term: "HK1",
    createdAt: "2026-01-10T02:00:00.000Z",
    status: "ready",
  },
  {
    id: "r2",
    name: "Báo cáo tổng kết năm học",
    term: "FULL_YEAR",
    createdAt: "2026-07-01T02:00:00.000Z",
    status: "generating",
  },
];

const meta: Meta<typeof PeriodicReportsTableRegion> = {
  title: "Principal/Reports/PeriodicReportsTableRegion",
  component: PeriodicReportsTableRegion,
  parameters: { layout: "padded" },
  args: {
    onRetry: () => {},
    onNewReport: () => {},
    isGeneratingNewReport: false,
    errorKey: null,
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof PeriodicReportsTableRegion>;

export const Loading: Story = {
  args: { status: "loading", reports: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    // The "New report" header button is present even during loading (D-4).
    await expect(
      canvas.getByRole("button", { name: messages.reports.table.newReport }),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { status: "empty", reports: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(messages.reports.table.emptyTitle),
    ).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: { status: "error", reports: [], errorKey: "network-error" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toBeInTheDocument();
  },
};

export const Success: Story = {
  args: { status: "success", reports },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Ready row → status badge + enabled download.
    await expect(
      canvas.getByRole("button", {
        name: `${messages.reports.table.downloadAria.replace("{name}", "Báo cáo sơ kết Học kỳ I")}`,
      }),
    ).toBeEnabled();
    // Generating row → download disabled via the disabled attribute (not opacity).
    await expect(
      canvas.getByRole("button", {
        name: `${messages.reports.table.downloadAria.replace("{name}", "Báo cáo tổng kết năm học")}`,
      }),
    ).toBeDisabled();
  },
};
