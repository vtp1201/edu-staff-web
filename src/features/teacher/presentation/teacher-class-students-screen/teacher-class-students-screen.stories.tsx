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
    // Standalone page: the class name IS the page heading.
    await expect(
      c.getByRole("heading", { level: 1, name: "10A1" }),
    ).toBeInTheDocument();
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
  args: {
    vm: { ...base, status: "error", errorKey: "not-found", students: [] },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      messages.teacherClasses.errors["not-found"],
    );
    await expect(
      c.getByRole("button", {
        name: messages.teacherClasses.studentPage.errorRetryAction,
      }),
    ).toBeInTheDocument();
  },
};

/**
 * US-E24.8 — embedded as the class hub's "Học sinh" tab. The shell renders the
 * breadcrumb + class identity itself, so `embedded` suppresses this screen's own
 * breadcrumb AND demotes its class-name heading to `<h2>` (the shell owns the
 * page `<h1>` — one h1 per page, A11Y-002). The roster, search and pagination
 * are untouched. Default (every story above) stays a standalone page.
 */
export const EmbeddedInClassHub: Story = {
  args: { vm: base, embedded: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.queryByRole("navigation", {
        name: messages.teacherClasses.breadcrumbLabel,
      }),
    ).toBeNull();
    // A11Y-002: no second <h1> — the class name becomes an <h2>.
    await expect(c.queryByRole("heading", { level: 1 })).toBeNull();
    await expect(
      c.getByRole("heading", { level: 2, name: "10A1" }),
    ).toBeInTheDocument();
    // The roster itself is unchanged.
    await expect(
      c.getByRole("region", {
        name: messages.teacherClasses.studentPage.studentListSection,
      }),
    ).toBeInTheDocument();
  },
};
