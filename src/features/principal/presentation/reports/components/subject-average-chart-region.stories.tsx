import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { SubjectAverageEntity } from "@/features/principal/domain/reports/entities/subject-average.entity";
import { SubjectAverageChartRegion } from "./subject-average-chart-region";

const subjects: SubjectAverageEntity[] = [
  { subjectId: "s-math", subjectName: "Toán", average: 7.8 },
  { subjectId: "s-lit", subjectName: "Ngữ văn", average: 7.1 },
  { subjectId: "s-eng", subjectName: "T. Anh", average: 6.9 },
  { subjectId: "s-his", subjectName: "Lịch sử", average: 8.1 },
];

const meta: Meta<typeof SubjectAverageChartRegion> = {
  title: "Principal/Reports/SubjectAverageChartRegion",
  component: SubjectAverageChartRegion,
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
type Story = StoryObj<typeof SubjectAverageChartRegion>;

export const Loading: Story = {
  args: { status: "loading", data: [], errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const Empty: Story = {
  args: { status: "empty", data: [], errorKey: null, onRetry: () => {} },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(
        messages.reports.charts.subjectAverage.emptyTitle,
      ),
    ).toBeInTheDocument();
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
  args: {
    status: "success",
    data: subjects,
    errorKey: null,
    onRetry: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // role=img chart with descriptive aria-label (NFR-001).
    await expect(canvas.getByRole("img")).toBeInTheDocument();
    // Every value is also a visible text label (never chart-only).
    await expect(canvas.getByText("7.8")).toBeInTheDocument();
    await expect(canvas.getByText("Toán")).toBeInTheDocument();
  },
};
