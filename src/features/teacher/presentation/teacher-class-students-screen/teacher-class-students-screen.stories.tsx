import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherClassStudentsScreen } from "./teacher-class-students-screen";
import type { TeacherClassStudentsScreenVM } from "./teacher-class-students-screen.i-vm";

const students: TeacherClassStudentsScreenVM["students"] = Array.from(
  { length: 15 },
  (_, i) => ({
    enrollmentId: `enr-${i + 1}`,
    displayName: `Học sinh ${i + 1}`,
    studentCode: `HS250${String(i + 1).padStart(2, "0")}`,
    status: i === 4 || i === 11 ? "transferred" : "active",
  }),
);

const meta: Meta<typeof TeacherClassStudentsScreen> = {
  title: "Teacher/TeacherClassStudentsScreen",
  component: TeacherClassStudentsScreen,
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

type Story = StoryObj<typeof TeacherClassStudentsScreen>;

const base: TeacherClassStudentsScreenVM = {
  status: "ready",
  className: "10A1",
  classesHref: "../..",
  students,
};

export const Loading: Story = {
  args: { vm: { ...base, students: [] }, loading: true },
};

export const Empty: Story = {
  args: { vm: { ...base, students: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByText(messages.teacherClasses.studentPage.empty),
    ).toBeInTheDocument();
  },
};

export const WithStudents: Story = {
  args: { vm: base },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Page 1 shows 10 of 15 rows.
    await expect(c.getByText("Học sinh 1")).toBeInTheDocument();
    await expect(c.queryByText("Học sinh 11")).not.toBeInTheDocument();

    // Search narrows the list (and resets to page 1).
    const search = c.getByLabelText(
      messages.teacherClasses.studentPage.searchPlaceholder,
    );
    await userEvent.type(search, "HS25013");
    await waitFor(() => expect(c.getByText("Học sinh 13")).toBeInTheDocument());
    await expect(c.queryByText("Học sinh 1")).not.toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: { vm: { ...base, status: "error", students: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      messages.teacherClasses.studentPage.errorRetry,
    );
  },
};
