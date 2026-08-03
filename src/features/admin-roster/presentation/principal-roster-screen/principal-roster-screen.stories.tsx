import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ClassSummary } from "../../domain/entities/class-summary.entity";
import type { RosterStudent } from "../../domain/entities/roster-student.entity";
import { toRosterStudentFromEnrollment } from "../../infrastructure/mappers/roster.mapper";
import { PrincipalRosterScreen } from "./principal-roster-screen";
import type { PrincipalRosterScreenVm } from "./principal-roster-screen.i-vm";
import { PrincipalRosterSkeleton } from "./principal-roster-skeleton";

const t = messages.principalStudents;
const tRoster = messages.adminRoster;

const classes: ClassSummary[] = [
  {
    id: "cls-10a1",
    name: "10A1",
    gradeLevel: 10,
    homeroomTeacher: "Nguyễn Thị Hương",
    year: "2025–2026",
  },
  {
    id: "cls-10a2",
    name: "10A2",
    gradeLevel: 10,
    homeroomTeacher: "Trần Văn Minh",
    year: "2025–2026",
  },
];

const genders: Array<"F" | "M"> = ["F", "M"];
const roster: RosterStudent[] = Array.from({ length: 12 }, (_, i) => ({
  id: `HS250${String(i + 1).padStart(2, "0")}`,
  code: `HS250${String(i + 1).padStart(2, "0")}`,
  name: `Học sinh ${i + 1}`,
  dob: "01/01/2010",
  gender: genders[i % 2],
  status: i === 3 ? "transferred" : "active",
}));

/**
 * REAL-mode rows built by running the actual mapper over a wire
 * `EnrollmentResponse` + IAM detail map (fully decorated / PII unset /
 * self-reported OTHER / unresolved member).
 */
const realRoster: RosterStudent[] = (
  [
    [
      "8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31",
      {
        name: "Nguyễn Minh Anh",
        dob: "2010-03-15T00:00:00Z",
        gender: "FEMALE" as const,
      },
    ],
    ["b2c3d4e5-1111-4444-8888-222233334444", { name: "Trần Văn Bình" }],
    [
      "c3d4e5f6-2222-4444-8888-333344445555",
      { name: "Lê Thị Cẩm", gender: "OTHER" as const },
    ],
    ["d4e5f6a7-3333-4444-8888-444455556666", undefined],
  ] as const
).map(([studentMemberId, detail]) =>
  toRosterStudentFromEnrollment(
    {
      enrollmentId: `enr-${studentMemberId}`,
      classId: "cls-10a1",
      studentMemberId,
      academicYearLabel: "2025–2026",
      enrolledAt: "2025-09-05T02:00:00Z",
    },
    detail,
  ),
);

const baseVm: PrincipalRosterScreenVm = {
  classes,
  currentClass: classes[0],
  roster,
  activeCount: roster.filter((s) => s.status === "active").length,
  transferredCount: roster.filter((s) => s.status === "transferred").length,
  fetchError: null,
};

const meta: Meta<typeof PrincipalRosterScreen> = {
  title: "Principal/PrincipalRosterScreen",
  component: PrincipalRosterScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof PrincipalRosterScreen>;

export const Populated: Story = {
  args: { vm: baseVm },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { level: 1, name: t.title }),
    ).toBeInTheDocument();
    // Rows render (the table body, not just the header).
    await expect(canvas.getByText("Học sinh 1")).toBeInTheDocument();
    await expect(canvas.getByText(tRoster.status.transferred)).toBeVisible();

    // AC-3 — ZERO mutation affordance is reachable for this role.
    await expect(canvas.queryAllByRole("checkbox")).toHaveLength(0);
    await expect(
      canvas.queryByRole("button", { name: tRoster.table.exportCsv }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: tRoster.actions.importCsv }),
    ).not.toBeInTheDocument();
    for (const button of canvas.queryAllByRole("button")) {
      await expect(button.getAttribute("aria-label") ?? "").not.toContain(
        tRoster.table.removeFromClass,
      );
    }
    // No AddStudentPanel anywhere.
    await expect(
      canvas.queryByText(tRoster.addPanel.title),
    ).not.toBeInTheDocument();
  },
};

export const EmptyRoster: Story = {
  args: {
    vm: {
      ...baseVm,
      roster: [],
      activeCount: 0,
      transferredCount: 0,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(t.empty.title)).toBeInTheDocument();
    await expect(canvas.getByText(t.empty.body)).toBeInTheDocument();
    // The admin enroll-oriented CTA must NOT leak into the read-only screen.
    await expect(
      canvas.queryByText(tRoster.empty.addFirst),
    ).not.toBeInTheDocument();
  },
};

export const NoClasses: Story = {
  args: {
    vm: {
      classes: [],
      currentClass: null,
      roster: [],
      activeCount: 0,
      transferredCount: 0,
      fetchError: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(t.emptyClasses.title)).toBeInTheDocument();
    // No class picker when there is nothing to pick.
    await expect(
      canvas.queryByText(tRoster.breadcrumb.classes),
    ).not.toBeInTheDocument();
  },
};

export const FetchError: Story = {
  args: {
    vm: { ...baseVm, currentClass: null, roster: [], fetchError: "unknown" },
    onRetry: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(canvas.getByText(t.error.title)).toBeInTheDocument();
    await expect(canvas.getByText(tRoster.errors.unknown)).toBeInTheDocument();
    const retry = canvas.getByRole("button", {
      name: messages.Common.confirmDialog.retry,
    });
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};

export const ForbiddenError: Story = {
  args: {
    vm: { ...baseVm, currentClass: null, roster: [], fetchError: "forbidden" },
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(tRoster.errors.forbidden)).toBeVisible();
    // A 403 cannot be retried away — the control is absent, not disabled.
    await expect(
      canvas.queryByRole("button", {
        name: messages.Common.confirmDialog.retry,
      }),
    ).not.toBeInTheDocument();
  },
};

export const ClassSwitch: Story = {
  args: { vm: baseVm, onClassChange: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /10A1/ }));
    const item = await within(document.body).findByRole("menuitem", {
      name: /10A2/,
    });
    await userEvent.click(item);
    await expect(args.onClassChange).toHaveBeenCalledWith("cls-10a2");
  },
};

/**
 * US-E18.35 — the read-only principal sees the SAME real rows an admin does
 * (core enrollments + IAM detail), with the same honest placeholders and still
 * zero mutation affordance. Rows are produced by the real mapper, not a
 * fixture, so a regression in the join fails this story.
 */
export const RealModeWithMissingFields: Story = {
  args: {
    vm: {
      ...baseVm,
      roster: realRoster,
      activeCount: realRoster.length,
      transferredCount: 0,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tbl = tRoster.table;

    await expect(await canvas.findByText("Nguyễn Minh Anh")).toBeVisible();
    await expect(canvas.getByText("15/03/2010")).toBeVisible();
    expect(canvas.getAllByText(tbl.notProvided).length).toBeGreaterThan(0);
    await expect(canvas.getByText(tbl.unknownName)).toBeVisible();
    expect(canvasElement.textContent ?? "").not.toContain(
      "8f14e45f-ceea-467a-9d0b-2c1a4b9e7d31",
    );

    // Read-only guarantee holds on the degraded data too.
    await expect(canvas.queryAllByRole("checkbox")).toHaveLength(0);
  },
};

export const Loading: StoryObj<typeof PrincipalRosterSkeleton> = {
  render: () => <PrincipalRosterSkeleton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(messages.Common.skeleton.loadingAriaLabel),
    ).toBeInTheDocument();
  },
};
