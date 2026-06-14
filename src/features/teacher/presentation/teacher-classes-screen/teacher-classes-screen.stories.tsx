import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherClassesScreen } from "./teacher-classes-screen";
import type { TeacherClassesScreenVM } from "./teacher-classes-screen.i-vm";

const classes: TeacherClassesScreenVM["classes"] = [
  {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    studentCount: 32,
    isHomeroom: true,
    studentsHref: "classes/cls-10a1/students",
  },
  {
    id: "cls-11b2",
    name: "11B2",
    gradeLevel: 11,
    studentCount: 28,
    isHomeroom: false,
    studentsHref: "classes/cls-11b2/students",
  },
  {
    id: "cls-12c1",
    name: "12C1",
    gradeLevel: 12,
    studentCount: 30,
    isHomeroom: false,
    studentsHref: "classes/cls-12c1/students",
  },
  {
    id: "cls-10a3",
    name: "10A3",
    gradeLevel: 10,
    studentCount: 26,
    isHomeroom: false,
    studentsHref: "classes/cls-10a3/students",
  },
];

const meta: Meta<typeof TeacherClassesScreen> = {
  title: "Teacher/TeacherClassesScreen",
  component: TeacherClassesScreen,
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

type Story = StoryObj<typeof TeacherClassesScreen>;

export const Loading: Story = {
  args: { vm: { status: "ready", classes: [] }, loading: true },
};

export const Empty: Story = {
  args: { vm: { status: "ready", classes: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByText(messages.teacherClasses.empty),
    ).toBeInTheDocument();
  },
};

export const WithClasses: Story = {
  args: { vm: { status: "ready", classes } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("10A1")).toBeInTheDocument();
    // GVCN badge appears once (only the homeroom class).
    await expect(
      c.getAllByText(messages.teacherClasses.homeroomBadge),
    ).toHaveLength(1);
    await expect(
      c.getAllByText(messages.teacherClasses.actions.viewStudents),
    ).toHaveLength(4);
  },
};

export const ErrorState: Story = {
  args: { vm: { status: "error", classes: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      messages.teacherClasses.errorRetry,
    );
  },
};
