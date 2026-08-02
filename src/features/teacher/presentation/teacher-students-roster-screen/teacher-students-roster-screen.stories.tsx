import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherStudentsRosterScreen } from "./teacher-students-roster-screen";
import type {
  TeacherStudentRosterRowVM,
  TeacherStudentsRosterScreenVM,
} from "./teacher-students-roster-screen.i-vm";

const copy = messages.teacherStudentsRoster;

const CLASS_NAMES = ["10A1", "11B2"];

const rows: TeacherStudentRosterRowVM[] = Array.from({ length: 12 }, (_, i) => {
  const className = i < 7 ? "10A1" : "11B2";
  return {
    studentMemberId: `hs-${String(i + 1).padStart(2, "0")}`,
    displayName: `Nguyễn Văn Học Sinh ${i + 1}`,
    className,
    status: i === 3 ? "transferred" : "active",
    academicRecordHref: `students/hs-${String(i + 1).padStart(2, "0")}/academic-record`,
  };
});

const base: TeacherStudentsRosterScreenVM = {
  status: "ready",
  rows,
  classNames: CLASS_NAMES,
  failedClassCount: 0,
};

const meta: Meta<typeof TeacherStudentsRosterScreen> = {
  title: "Teacher/TeacherStudentsRosterScreen",
  component: TeacherStudentsRosterScreen,
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

type Story = StoryObj<typeof TeacherStudentsRosterScreen>;

export const Loading: Story = {
  args: { vm: { ...base, rows: [], classNames: [] }, loading: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(copy.loadingLabel)).toBeInTheDocument();
  },
};

/** Teacher assigned to zero classes → empty state, no filter controls. */
export const Empty: Story = {
  args: { vm: { ...base, rows: [], classNames: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(copy.empty)).toBeInTheDocument();
    await expect(c.queryByLabelText(copy.searchLabel)).not.toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: {
    vm: {
      status: "error",
      errorKey: "network-error",
      rows: [],
      classNames: [],
      failedClassCount: 0,
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      copy.errors["network-error"],
    );
    await expect(
      c.getByRole("button", { name: copy.errorRetryAction }),
    ).toBeVisible();
  },
};

/** Happy path: first page of the aggregated, de-duplicated list. */
export const WithStudents: Story = {
  args: { vm: base },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("heading", { name: copy.pageTitle }),
    ).toBeInTheDocument();
    // 12 rows → page 1 shows 10.
    await expect(c.getByText("Nguyễn Văn Học Sinh 1")).toBeInTheDocument();
    await expect(
      c.queryByText("Nguyễn Văn Học Sinh 11"),
    ).not.toBeInTheDocument();
    // No partial-failure notice when every class resolved.
    await expect(c.queryByRole("status")).not.toBeInTheDocument();
  },
};

/** Some classes' rosters failed — rows still render, degrade is announced. */
export const PartialFailure: Story = {
  args: { vm: { ...base, failedClassCount: 2 } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const notice = c.getByRole("status");
    await expect(notice).toHaveTextContent("2");
    // Degraded, not blocked: the classes that DID resolve are still listed.
    await expect(c.getByText("Nguyễn Văn Học Sinh 1")).toBeInTheDocument();
  },
};

export const SearchFilter: Story = {
  args: { vm: base },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByLabelText(copy.searchLabel), "Sinh 11");
    await waitFor(() =>
      expect(c.getByText("Nguyễn Văn Học Sinh 11")).toBeInTheDocument(),
    );
    await expect(
      c.queryByText("Nguyễn Văn Học Sinh 1"),
    ).not.toBeInTheDocument();
    // Filtered count is announced to screen readers.
    await expect(c.getByText("Tìm thấy 1 học sinh")).toBeInTheDocument();
  },
};

export const ClassFilter: Story = {
  args: { vm: base },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByLabelText(copy.classFilterLabel));
    const listbox = within(await within(document.body).findByRole("listbox"));
    await userEvent.click(await listbox.findByRole("option", { name: "11B2" }));

    // Only 11B2 students (rows 8–12) remain.
    await waitFor(() =>
      expect(c.queryByText("Nguyễn Văn Học Sinh 1")).not.toBeInTheDocument(),
    );
    await expect(c.getByText("Nguyễn Văn Học Sinh 8")).toBeInTheDocument();
  },
};

/** Each row's name is a focusable link into the existing academic-record route. */
export const RowLinksToAcademicRecord: Story = {
  args: { vm: base },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const link = c.getByRole("link", {
      name: "Xem học bạ của Nguyễn Văn Học Sinh 1",
    });
    await expect(link).toHaveAttribute(
      "href",
      "students/hs-01/academic-record",
    );
    link.focus();
    await expect(link).toHaveFocus();
  },
};
