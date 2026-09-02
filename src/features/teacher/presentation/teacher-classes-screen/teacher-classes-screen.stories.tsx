import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { TeacherClassesScreen } from "./teacher-classes-screen";
import type { TeacherClassVM } from "./teacher-classes-screen.i-vm";

const card = messages.teacherClasses.card;
const MATH = [{ id: "sub-math", name: "Toán" }];

/** 10A1 — GVCN *and* GVBM Toán: two badges, both role tile-sets. */
const homeroomAndSubject: TeacherClassVM = {
  id: "cls-10a1",
  name: "10A1",
  studentCount: 32,
  roles: ["homeroom", "subject"],
  subjects: MATH,
  kpi: {
    tiles: [
      {
        key: "absentToday",
        value: 2,
        label: card.kpi.absentToday,
        tone: "error",
        isDemo: true,
      },
      {
        key: "pendingGrading",
        value: 5,
        label: card.kpi.pendingGrading,
        tone: "warning",
        isDemo: true,
      },
      {
        key: "attendanceRate",
        value: 94,
        suffix: "%",
        label: card.kpi.attendanceRate,
        tone: "neutral",
        isDemo: true,
      },
      {
        key: "openViolations",
        value: 2,
        suffix: "+",
        label: card.kpi.openViolations,
        tone: "error",
        isDemo: false,
      },
      {
        key: "pendingLeave",
        value: 1,
        label: card.kpi.pendingLeave,
        tone: "warning",
        isDemo: false,
      },
    ],
  },
  studentsHref: "classes/cls-10a1/students",
};

/** 11B2 — GVBM only: one badge, the two draft-sourced GVBM tiles. */
const subjectOnly: TeacherClassVM = {
  id: "cls-11b2",
  name: "11B2",
  studentCount: 28,
  roles: ["subject"],
  subjects: MATH,
  kpi: {
    tiles: [
      {
        key: "absentToday",
        value: 0,
        label: card.kpi.absentToday,
        tone: "neutral",
        isDemo: true,
      },
      {
        key: "pendingGrading",
        value: 3,
        label: card.kpi.pendingGrading,
        tone: "warning",
        isDemo: true,
      },
    ],
  },
  studentsHref: "classes/cls-11b2/students",
};

/** 12C1 — no BE source produced a single KPI number → no tile row at all. */
const noKpi: TeacherClassVM = {
  id: "cls-12c1",
  name: "12C1",
  studentCount: 30,
  roles: ["subject"],
  subjects: MATH,
  studentsHref: "classes/cls-12c1/students",
};

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
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // The skeleton is aria-hidden, so the ONLY thing a screen reader gets is
    // this polite live region (A11Y-002).
    await expect(c.getByRole("status")).toHaveTextContent(
      messages.teacherClasses.loadingClasses,
    );
  },
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

export const HomeroomAndSubject: Story = {
  args: { vm: { status: "ready", classes: [homeroomAndSubject] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Dual role → BOTH badges, each carrying TEXT (never colour alone).
    await expect(
      c.getByText(messages.teacherClasses.homeroomBadge),
    ).toBeInTheDocument();
    await expect(c.getByText("GVBM · Toán")).toBeInTheDocument();

    // GVCN tiles, incl. "Đơn nghỉ chờ" (only rendered because it is > 0).
    await expect(c.getByText(card.kpi.attendanceRate)).toBeInTheDocument();
    await expect(c.getByText(card.kpi.openViolations)).toBeInTheDocument();
    await expect(c.getByText(card.kpi.pendingLeave)).toBeInTheDocument();

    // Numbers are tabular so tiles stay aligned across cards.
    await expect(c.getByText("94%")).toHaveClass("tabular-nums");

    // A capped count reads "2+" — never a fabricated exact total.
    await expect(c.getByText("2+")).toBeInTheDocument();

    // Draft/mock numbers carry the "demo" pill, whose meaning is spelled out in
    // TEXT for assistive tech (the short "demo" pill is aria-hidden).
    expect(c.getAllByLabelText(card.kpi.demoLabel).length).toBeGreaterThan(0);
    expect(c.getAllByText(card.kpi.demoLabel).length).toBeGreaterThan(0);

    await expect(
      c.getByRole("link", { name: new RegExp(card.cta) }),
    ).toHaveAttribute("href", "classes/cls-10a1/students");
  },
};

export const SubjectOnly: Story = {
  args: { vm: { status: "ready", classes: [subjectOnly] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("GVBM · Toán")).toBeInTheDocument();
    await expect(
      c.queryByText(messages.teacherClasses.homeroomBadge),
    ).not.toBeInTheDocument();
    await expect(c.getByText(card.kpi.absentToday)).toBeInTheDocument();
    await expect(c.getByText(card.kpi.pendingGrading)).toBeInTheDocument();
    // GVCN-only tiles must not appear on a subject-only card.
    await expect(
      c.queryByText(card.kpi.attendanceRate),
    ).not.toBeInTheDocument();
  },
};

export const NoKpi: Story = {
  args: { vm: { status: "ready", classes: [noKpi] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("12C1")).toBeInTheDocument();
    // Not "rendered empty" — the tile row is absent from the DOM entirely, so
    // the card does not go lopsided.
    for (const label of Object.values(card.kpi)) {
      await expect(c.queryByText(label)).not.toBeInTheDocument();
    }
  },
};

export const AllClasses: Story = {
  args: {
    vm: { status: "ready", classes: [homeroomAndSubject, subjectOnly, noKpi] },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getAllByRole("link", { name: new RegExp(card.cta) }),
    ).toHaveLength(3);
    // The GVCN badge belongs to exactly one card.
    await expect(
      c.getAllByText(messages.teacherClasses.homeroomBadge),
    ).toHaveLength(1);
  },
};

export const ErrorState: Story = {
  args: { vm: { status: "error", errorKey: "network-error", classes: [] } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent(
      messages.teacherClasses.errors["network-error"],
    );
    await expect(
      c.getByRole("button", {
        name: messages.teacherClasses.errorRetryAction,
      }),
    ).toBeInTheDocument();
  },
};
