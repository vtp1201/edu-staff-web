import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import { PrincipalTeachersScreen } from "./principal-teachers-screen";

const TEACHERS: PrincipalTeacher[] = [
  {
    teacherId: "t-001",
    displayName: "Nguyễn Thị Lan",
    email: "lan@edu.vn",
    primarySubjectName: "Toán",
    homeroomClassId: "c-10a1",
    homeroomClassName: "10A1",
    subjectAssignments: [],
    status: "ACTIVE",
  },
  {
    teacherId: "t-002",
    displayName: "Trần Văn Minh",
    email: "minh@edu.vn",
    primarySubjectName: "Văn",
    homeroomClassId: null,
    homeroomClassName: null,
    subjectAssignments: [
      {
        classSubjectId: "cs-001",
        classId: "c-11b1",
        className: "11B1",
        subjectId: "s-van",
        subjectName: "Ngữ văn",
        hasConflict: false,
      },
    ],
    status: "ACTIVE",
  },
  {
    teacherId: "t-003",
    displayName: "Lê Thị Hoa",
    email: "hoa@edu.vn",
    primarySubjectName: "Lý",
    homeroomClassId: "c-12c2",
    homeroomClassName: "12C2",
    subjectAssignments: [
      {
        classSubjectId: "cs-002",
        classId: "c-12c2",
        className: "12C2",
        subjectId: "s-ly",
        subjectName: "Vật lý",
        hasConflict: true,
      },
    ],
    status: "ON_LEAVE",
  },
];

const ok = async () => ({ errorKey: null });

const handlers = {
  onAssignHomeroom: ok,
  onAssignSubjectTeacher: ok,
};

const meta: Meta<typeof PrincipalTeachersScreen> = {
  title: "Principal/PrincipalTeachersScreen",
  component: PrincipalTeachersScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="vi" messages={messages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof PrincipalTeachersScreen>;

export const TeacherList_Loading: Story = {
  args: {
    teachers: [],
    fetchError: null,
    loading: true,
    ...handlers,
  },
};

export const TeacherList_Populated: Story = {
  args: {
    teachers: TEACHERS,
    fetchError: null,
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Nguyễn Thị Lan")).toBeInTheDocument();
    await expect(await canvas.findByText("Lê Thị Hoa")).toBeInTheDocument();
  },
};

export const TeacherList_Empty: Story = {
  args: {
    teachers: [],
    fetchError: null,
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(messages.principalTeachers.table.noTeachers),
    ).toBeInTheDocument();
  },
};

export const AssignmentSheet_Open: Story = {
  args: {
    teachers: TEACHERS,
    fetchError: null,
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button", {
      name: messages.principalTeachers.assignClass,
    });
    await userEvent.click(buttons[0]);
    await waitFor(() =>
      expect(
        document.body.textContent?.includes(
          messages.principalTeachers.sheet.gvcnSection,
        ),
      ).toBe(true),
    );
  },
};

export const AssignmentSheet_WithConflict: Story = {
  args: {
    teachers: TEACHERS,
    fetchError: null,
    ...handlers,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Lê Thị Hoa (t-003) has a conflicting subject assignment.
    const buttons = await canvas.findAllByRole("button", {
      name: messages.principalTeachers.assignClass,
    });
    // third row → Lê Thị Hoa after vi sort: Lê, Nguyễn, Trần
    await userEvent.click(buttons[0]);
    await waitFor(() =>
      expect(
        document.body.textContent?.includes(
          messages.principalTeachers.sheet.gvbmSection,
        ),
      ).toBe(true),
    );
  },
};
