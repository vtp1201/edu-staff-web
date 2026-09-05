import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { visibleTabs } from "@/features/teacher/domain/class-hub-tabs";
import type { ClassRole } from "@/features/teacher/domain/entities/teacher-class.entity";
import { TeacherClassStudentsScreen } from "@/features/teacher/presentation/teacher-class-students-screen/teacher-class-students-screen";
import { classHubHref } from "@/shared/class-hub-href";
import type { ClassHubHeaderVm, ClassHubTabsVm } from "./class-hub.i-vm";
import { ClassHubScreen } from "./class-hub-screen";
import { TabPlaceholder } from "./tab-placeholder";

const BASE = "/vi/t/t1/teacher/classes";

function header(roles: ClassRole[]): ClassHubHeaderVm {
  return {
    classId: "cls-10a1",
    className: "10A1",
    roles,
    subjects: roles.includes("subject")
      ? [{ id: "sub-math", name: "Toán" }]
      : [],
    studentCount: 36,
    academicYearLabel: "2025–2026",
    classesHref: BASE,
  };
}

function tabs(
  roles: ClassRole[],
  activeTab: ClassHubTabsVm["activeTab"],
): ClassHubTabsVm {
  return {
    activeTab,
    tabs: visibleTabs(roles).map((id) => ({
      id,
      href: classHubHref(BASE, "cls-10a1", id),
    })),
  };
}

/** Stand-in for the roster body (the real one is fetched by the RSC page). */
function RosterStub() {
  return (
    <div className="rounded-[var(--edu-radius-card)] border border-border bg-card p-6 text-edu-text-secondary text-sm shadow-card">
      Danh sách học sinh
    </div>
  );
}

const meta: Meta<typeof ClassHubScreen> = {
  title: "Teacher/ClassHubScreen",
  component: ClassHubScreen,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ClassHubScreen>;

/* ── AC: GVCN + GVBM → 4 tabs ───────────────────────────────────────────── */
export const ShellBothRoles: Story = {
  args: {
    header: header(["homeroom", "subject"]),
    tabs: tabs(["homeroom", "subject"], "students"),
    children: <RosterStub />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tablist = canvas.getByRole("tablist", {
      name: "Chuyển mục trong lớp học",
    });
    const items = within(tablist).getAllByRole("tab");
    expect(items).toHaveLength(4);
    expect(items.map((el) => el.textContent)).toEqual([
      "Học sinh",
      "Thời khoá biểu",
      "Khoá học online",
      "Chủ nhiệm",
    ]);
    // Active tab is the ONLY selected one, and it is a real anchor (Tab/Enter).
    expect(items[0]).toHaveAttribute("aria-selected", "true");
    expect(items[1]).toHaveAttribute("aria-selected", "false");
    expect(items[1].tagName).toBe("A");
    expect(items[1]).toHaveAttribute(
      "href",
      "/vi/t/t1/teacher/classes/cls-10a1?tab=timetable",
    );
    // Identity header: both role badges + meta line.
    expect(canvas.getByRole("heading", { name: "Lớp 10A1" })).toBeVisible();
    expect(canvas.getByText("GVCN")).toBeVisible();
    expect(canvas.getByText("GVBM · Toán")).toBeVisible();
    expect(canvas.getByText("36 học sinh · Năm học 2025–2026")).toBeVisible();
    // One panel, labelled by the active tab.
    const panel = canvas.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "classhub-tab-students");
    expect(within(panel).getByText("Danh sách học sinh")).toBeVisible();
  },
};

/* ── AC: subject-only class → 3 tabs, no "Chủ nhiệm" ────────────────────── */
export const SubjectOnly: Story = {
  args: {
    header: header(["subject"]),
    tabs: tabs(["subject"], "students"),
    children: <RosterStub />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole("tab")).toHaveLength(3);
    expect(canvas.queryByRole("tab", { name: "Chủ nhiệm" })).toBeNull();
    expect(canvas.queryByText("GVCN")).toBeNull();
    expect(canvas.getByText("GVBM · Toán")).toBeVisible();
  },
};

/* ── AC (A11Y-002): full composition with the REAL embedded roster has
 * exactly ONE <h1> on the page (the shell's) — the roster's own class-name
 * heading is demoted to <h2>. `RosterStub` above proves the shell renders
 * its heading, but a stub can never prove a *second* h1 is absent; this
 * story mounts the actual `TeacherClassStudentsScreen` to close that gap. */
export const ShellWithEmbeddedRealRoster: Story = {
  args: {
    header: header(["homeroom", "subject"]),
    tabs: tabs(["homeroom", "subject"], "students"),
    children: (
      <TeacherClassStudentsScreen
        embedded
        vm={{
          status: "ready",
          className: "10A1",
          classesHref: BASE,
          students: [
            {
              enrollmentId: "enr-1",
              displayName: "Nguyễn Minh Khoa",
              studentCode: "stu-1",
              status: "active",
            },
          ],
        }}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Exactly one h1 on the whole composed page — the shell's identity title.
    const h1s = canvas.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Lớp 10A1");
    // The roster's own class name is present but demoted to h2, not h1.
    expect(
      canvas.getByRole("heading", { level: 2, name: "10A1" }),
    ).toBeVisible();
    // The roster's own breadcrumb is suppressed (the shell owns navigation).
    expect(canvas.queryAllByRole("navigation")).toHaveLength(1);
  },
};

/* ── Not-yet-built tab bodies (US-E24.9/10/11 replace these) ────────────── */
export const PlaceholderTabs: Story = {
  args: {
    header: header(["homeroom", "subject"]),
    tabs: tabs(["homeroom", "subject"], "timetable"),
    children: <TabPlaceholder tab="timetable" />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const active = canvas.getByRole("tab", { name: "Thời khoá biểu" });
    expect(active).toHaveAttribute("aria-selected", "true");
    const panel = canvas.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "classhub-tab-timetable");
    expect(within(panel).getByText("Đang xây dựng")).toBeVisible();
    expect(
      within(panel).getByText(
        messages.teacherClasses.hub.placeholder.body.timetable,
      ),
    ).toBeVisible();
    // A11Y-001: only the active tab points at the one rendered panel.
    expect(active).toHaveAttribute("aria-controls", "classhub-panel-timetable");
    expect(canvas.getByRole("tab", { name: "Học sinh" })).not.toHaveAttribute(
      "aria-controls",
    );
  },
};

/* ── AC (mobile): the strip wraps instead of overflowing at 320px ───────── */
export const MobileWrapTabs: Story = {
  args: {
    header: header(["homeroom", "subject"]),
    tabs: tabs(["homeroom", "subject"], "homeroom"),
    children: <TabPlaceholder tab="homeroom" />,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tablist = canvas.getByRole("tablist");
    expect(tablist.className).toContain("flex-wrap");
    // All four remain reachable (wrapped, not clipped) inside 320px.
    for (const tab of within(tablist).getAllByRole("tab")) {
      expect(tab).toBeVisible();
      expect(tab.getBoundingClientRect().width).toBeLessThanOrEqual(320);
      // Touch target ≥ 44px tall on mobile.
      expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};
