import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  MOCK_DEPARTMENTS,
  MOCK_LESSONS,
  MOCK_SUBJECTS,
} from "../../infrastructure/repositories/mocks/fixtures";
import { LessonBankScreen } from "./lesson-bank-screen";
import type { LessonBankScreenVM } from "./lesson-bank-screen.i-vm";

const uploadAction: LessonBankScreenVM["uploadAction"] = async () => ({
  ok: true,
  lesson: MOCK_LESSONS[0],
});

const deleteAction: LessonBankScreenVM["deleteAction"] = async () => ({
  ok: true,
});

const baseProps: LessonBankScreenVM = {
  lessons: MOCK_LESSONS,
  filters: {},
  subjects: MOCK_SUBJECTS,
  departments: MOCK_DEPARTMENTS,
  viewerRole: "teacher",
  currentUserId: "u-teacher-1",
  uploadAction,
  deleteAction,
};

const meta: Meta<typeof LessonBankScreen> = {
  title: "Features/LessonBank/LessonBankScreen",
  component: LessonBankScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="min-h-screen bg-[color:var(--edu-bg)]">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof LessonBankScreen>;

/** Teacher view — populated grid of lessons (AC-2). */
export const Populated: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Kho bài giảng/i }),
    ).toBeInTheDocument();
    await expect(canvas.getAllByText(/Toán|Vật lý/i).length).toBeGreaterThan(0);
  },
};

/** Teacher view — no lessons at all → empty state (AC-6). */
export const EmptyTeacher: Story = {
  args: { ...baseProps, lessons: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Chưa có bài giảng/i)).toBeInTheDocument();
  },
};

/** Filter active but no match → distinct no-match empty state (AC-6 edge). */
export const NoMatch: Story = {
  args: {
    ...baseProps,
    filters: { search: "không-tồn-tại-xyz" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Không tìm thấy bài giảng/i),
    ).toBeInTheDocument();
  },
};

/** Principal view — read-only (no upload button / no edit-delete) (AC-8). */
export const PrincipalReadOnly: Story = {
  args: { ...baseProps, viewerRole: "principal" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /Tải lên bài giảng/i }),
    ).not.toBeInTheDocument();
  },
};
