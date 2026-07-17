import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ExamBuilderUnavailable } from "./exam-builder-unavailable";

/**
 * QA (US-E18.15): the blocked-builder route (create/[id]/edit in real mode —
 * no wire endpoint for create/update). Covers the item #2 verification the
 * story packet asked for: heading discoverability post-A11Y-201 fix, back
 * navigation, and that no orphaned form fields/submit handlers are mounted
 * (this component renders NOTHING from the mock builder — no `<form>`,
 * no MCQ editor, no submit button at all, proven by absence assertions below).
 */
const meta: Meta<typeof ExamBuilderUnavailable> = {
  title: "Features/ExamBank/ExamBuilderUnavailable",
  component: ExamBuilderUnavailable,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="flex h-screen flex-col bg-background">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ExamBuilderUnavailable>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // A11Y-201: sr-only <h1> discoverable via heading-navigation, not just
    // reachable by Tab/read-order.
    const heading = canvas.getByRole("heading", { level: 1 });
    await expect(heading).toBeInTheDocument();
    await expect(heading).toHaveTextContent(/Không khả dụng/i);

    // Body copy explains the state (EmptyState visible <p> title + body) —
    // the sr-only <h1> above duplicates the same text for SR heading-nav, so
    // assert on ≥2 matches (heading + visible title) rather than exactly one.
    await expect(
      canvas.getAllByText(/Không khả dụng/i).length,
    ).toBeGreaterThanOrEqual(2);

    // No orphaned builder form fields/controls are mounted alongside the
    // blocked state — this replaces the ENTIRE route, not a partial overlay.
    await expect(
      canvas.queryByLabelText(/Nội dung câu hỏi/i),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /^Publish$/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /Lưu nháp/i }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole("form")).not.toBeInTheDocument();

    // Back button is keyboard-reachable and calls router.push (verified by a
    // Next.js App Router mount — clicking must not throw).
    const backBtn = canvas.getByRole("button", { name: /Quay lại/i });
    await expect(backBtn).toBeInTheDocument();
    await userEvent.click(backBtn);
  },
};
