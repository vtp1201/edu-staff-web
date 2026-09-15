import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import type { AcademicRecord } from "../../domain/entities/academic-record.entity";
import { buildAcademicRecord } from "../../domain/use-cases/build-academic-record";
import { mapAcademicRecordRow } from "../../infrastructure/mappers/academic-record.mapper";
import {
  MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR,
  MOCK_STUDENT_ACADEMIC_RECORDS,
  MOCK_SUBJECT_NAMES,
} from "../../infrastructure/repositories/mocks/fixtures";
import { AcademicRecordScreen } from "./academic-record-screen";
import type { AcademicRecordScreenVM } from "./academic-record-screen.i-vm";
import { AcademicRecordSkeleton } from "./academic-record-skeleton";

/** Same mapper + grouping the repositories run — stories cannot drift from prod. */
function build(
  payload = MOCK_STUDENT_ACADEMIC_RECORDS,
  subjectNames: Map<string, string> = MOCK_SUBJECT_NAMES,
): AcademicRecord {
  const rows = payload.records.map((r) =>
    mapAcademicRecordRow(r, subjectNames),
  );
  return buildAcademicRecord(payload.studentMemberId, rows);
}

const RECORD = build();

function vm(
  over: Partial<AcademicRecordScreenVM> = {},
): AcademicRecordScreenVM {
  return {
    role: "student",
    studentId: "stu-001",
    record: RECORD,
    selectedYearId: "2025-2026",
    error: null,
    ...over,
  };
}

const meta: Meta<typeof AcademicRecordScreen> = {
  title: "Features/AcademicRecords/AcademicRecordScreen",
  component: AcademicRecordScreen,
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="vi"
        messages={messages}
        timeZone="Asia/Ho_Chi_Minh"
      >
        <div className="bg-background p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AcademicRecordScreen>;

export const Loading: Story = {
  render: () => (
    <NextIntlClientProvider
      locale="vi"
      messages={messages}
      timeZone="Asia/Ho_Chi_Minh"
    >
      <div className="bg-background p-6">
        <AcademicRecordSkeleton />
      </div>
    </NextIntlClientProvider>
  ),
};

export const StudentView: Story = {
  args: { vm: vm({ role: "student" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Xem học bạ của chính mình"),
    ).toBeInTheDocument();
    // Three client-derived year tabs, current year last.
    await expect(canvas.getAllByRole("tab")).toHaveLength(3);
    // Dynamic snapshot columns become the table's column axis.
    await expect(canvas.getByText("Giữa kỳ")).toBeInTheDocument();
    await expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
  },
};

export const TeacherView: Story = {
  args: { vm: vm({ role: "teacher" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Xem học sinh trong lớp"),
    ).toBeInTheDocument();
  },
};

export const ParentView: Story = {
  args: { vm: vm({ role: "parent" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Xem học bạ con đã liên kết"),
    ).toBeInTheDocument();
  },
};

export const AdminView: Story = {
  args: { vm: vm({ role: "admin" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Toàn quyền xem")).toBeInTheDocument();
  },
};

/** Multi-year: switching to an older year shows that year's sealed terms. */
export const EarlierYear: Story = {
  args: { vm: vm({ role: "admin", selectedYearId: "2023-2024" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học kỳ 1")).toBeInTheDocument();
    await expect(canvas.getByText("Học kỳ 2")).toBeInTheDocument();
  },
};

export const UnsealedTermWarning: Story = {
  args: { vm: vm({ role: "admin", selectedYearId: "2024-2025" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học bạ đã được mở")).toBeInTheDocument();
  },
};

/** A PENDING term has no snapshot at all — the empty-term state, not a table. */
export const PendingTerm: Story = {
  args: { vm: vm({ role: "student", selectedYearId: "2025-2026" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Học kỳ chưa được ký")).toBeInTheDocument();
  },
};

/**
 * The honest degrade, now driven by an explicitly year-LESS wire payload: an
 * unhealed pre-migration-051 row (US-E18.56 — BE denormalized `academicYear`,
 * so this is rare rather than every PARENT read, but the path must stay alive).
 * Records are shown, never dropped, never given an invented year.
 */
export const UnresolvedYear: Story = {
  args: {
    vm: vm({
      role: "parent",
      record: build(MOCK_RECORDS_WITHOUT_ACADEMIC_YEAR),
      selectedYearId: null,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("tab")).toHaveLength(1);
    await expect(canvas.getByText("Chưa xác định năm học")).toBeInTheDocument();
    // The degrade notice is one of several role="status" regions on this
    // screen (the UNSEALED-term banner is another) — assert its own copy.
    await expect(
      canvas.getByText(/Không xác định được năm học/),
    ).toBeInTheDocument();
  },
};

/** No subject-catalogue lookup: a placeholder label, never a subjectId uuid. */
export const UnresolvedSubjectNames: Story = {
  args: {
    vm: vm({
      role: "student",
      record: build(MOCK_STUDENT_ACADEMIC_RECORDS, new Map()),
      selectedYearId: "2023-2024",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getAllByText("Môn học chưa xác định").length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryByText("s-math")).not.toBeInTheDocument();
  },
};

export const EmptyRecord: Story = {
  args: {
    vm: vm({
      role: "student",
      record: { studentMemberId: "stu-001", years: [], sealed: false },
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có dữ liệu học bạ"),
    ).toBeInTheDocument();
    // The homeroom-scope explanation is TEACHER-only — it must not leak into
    // the other three roles' empty state (US-E18.57).
    await expect(
      canvas.queryByText("Không có học bạ nào bạn được xem"),
    ).not.toBeInTheDocument();
  },
};

/**
 * US-E18.57 — the TEACHER read is homeroom-scoped (BE ADR 0136): a teacher who
 * is GVCN of none of this student's classes gets `200 { records: [] }`, NOT a
 * 403. That is the EMPTY branch with teacher-specific copy — asserting here
 * that the generic "no data" wording and the forbidden alert are both absent,
 * since either would misstate why the screen is empty.
 */
export const TeacherNoHomeroomAccessEmpty: Story = {
  args: {
    vm: vm({
      role: "teacher",
      record: { studentMemberId: "stu-001", years: [], sealed: false },
      selectedYearId: null,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("Không có học bạ nào bạn được xem"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByText(/chỉ xem được học bạ của những lớp bạn đang chủ nhiệm/),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByText("Không có dữ liệu học bạ"),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  args: {
    vm: vm({ role: "student", record: null, error: "forbidden" }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByText("Bạn không có quyền xem học bạ này."),
    ).toBeInTheDocument();
  },
};

/* ------------------------------------------------------------------------- *
 * US-E24.16 — PARENT child selector. This repo has no RTL, so these stories
 * are the ONLY DOM-level proof of the switcher's render surface.
 *
 * Note the screen carries TWO tablists once a record renders: the child
 * selector ("Chọn con") and the per-YEAR timeline. Every assertion below scopes
 * itself to one of them rather than counting `tab` roles globally.
 * ------------------------------------------------------------------------- */

/** Seed data, not UI copy — not i18n. */
const TWO_CHILDREN: ChildSwitcherChild[] = [
  {
    childId: "st-1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    ordinal: 1,
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "st-2",
    name: "Nguyễn Thu Hà",
    className: "8B1",
    ordinal: 2,
    avatar: "NH",
    color: "success",
  },
];

/** The child tablist, never the year one. */
function childTabs(canvas: ReturnType<typeof within>) {
  return within(canvas.getByRole("tablist", { name: "Chọn con" }));
}

/** The per-CHILD panel among the (up to two) panels on screen. */
function childPanel(canvas: ReturnType<typeof within>, childId: string) {
  return (canvas.getAllByRole("tabpanel") as HTMLElement[]).find(
    (el) => el.id === `tabpanel-${childId}`,
  );
}

/**
 * AC #2 — two linked children: the active tab is selected and paired with a
 * real panel, and clicking the OTHER tab asks the container to navigate.
 */
export const ParentTwoChildrenSwitch: Story = {
  args: {
    vm: vm({
      role: "parent",
      studentId: "st-1",
      childSwitcher: { childList: TWO_CHILDREN, activeChildId: "st-1" },
    }),
    onSwitchChild: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const tabs = childTabs(canvas);

    const active = tabs.getByRole("tab", { name: /Nguyễn Minh Khoa/ });
    await expect(active).toHaveAttribute("aria-selected", "true");
    await expect(active).toHaveAttribute("aria-controls", "tabpanel-st-1");

    // the pairing the shared ChildSwitcher expects from its consumer
    const panel = childPanel(canvas, "st-1");
    await expect(panel).toBeDefined();
    await expect(panel).toHaveAttribute("aria-labelledby", "tab-st-1");
    // not stale: no switch is in flight
    await expect(panel).not.toHaveAttribute("aria-busy");

    const other = tabs.getByRole("tab", { name: /Nguyễn Thu Hà/ });
    await expect(other).toHaveAttribute("aria-selected", "false");
    await userEvent.click(other);
    await expect(args.onSwitchChild).toHaveBeenCalledWith("st-2");
  },
};

/**
 * AC #2 (hide-when-single): a parent with ONE linked child gets no selector at
 * all — the VM builder returns `undefined`, so no child tablist is rendered.
 */
export const ParentSingleChildNoSelector: Story = {
  args: {
    vm: vm({ role: "parent", studentId: "st-1", childSwitcher: undefined }),
    onSwitchChild: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("tablist", { name: "Chọn con" }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryAllByRole("tab", { name: /Nguyễn/ })).toHaveLength(
      0,
    );
    // the record itself is untouched by the absent selector
    await expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
  },
};

/**
 * AC #3 — fail-soft: the child list is a SECONDARY read. Losing it costs the
 * selector and nothing else; the record still renders and no error surface
 * (alert banner / toast) appears for it.
 */
export const ParentChildListFetchFailed: Story = {
  args: {
    vm: vm({ role: "parent", studentId: "st-1", childSwitcher: undefined }),
    onSwitchChild: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("tablist", { name: "Chọn con" }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    // record content intact
    await expect(canvas.getByText("Xem học bạ con đã liên kết")).toBeVisible();
    await expect(canvas.getAllByText("Toán").length).toBeGreaterThan(0);
  },
};

/**
 * AC #4 — a route `studentId` that belongs to nobody the parent is linked to:
 * BE answers `forbidden`, the selector STAYS (it is the way out) but no tab is
 * selected, so there must be NO tabpanel either — a selected-less tablist with
 * a dangling `aria-controls`/`aria-labelledby` pair is the a11y defect both
 * reviewers called out.
 */
export const ParentForeignStudentIdNoActiveTab: Story = {
  args: {
    vm: vm({
      role: "parent",
      studentId: "foreign-9",
      record: null,
      error: "forbidden",
      childSwitcher: { childList: TWO_CHILDREN, activeChildId: "foreign-9" },
    }),
    onSwitchChild: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("tablist", { name: "Chọn con" }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("tab", { selected: true }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole("tabpanel")).not.toBeInTheDocument();

    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    await expect(
      canvas.getByText("Bạn không có quyền xem học bạ này."),
    ).toBeInTheDocument();
  },
};

/**
 * US-E24.16 review (SHOULD-FIX 1) — a VALID active child hitting a non-forbidden
 * error: the error branch must still pair the tabpanel, or the active tab's
 * `aria-controls` points at nothing. `role="alert"` cannot itself be the panel,
 * so a wrapping region carries the tabpanel role.
 */
export const ParentErrorWithActiveChildPanel: Story = {
  args: {
    vm: vm({
      role: "parent",
      studentId: "st-2",
      record: null,
      error: "network-error",
      childSwitcher: { childList: TWO_CHILDREN, activeChildId: "st-2" },
    }),
    onSwitchChild: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const active = childTabs(canvas).getByRole("tab", {
      name: /Nguyễn Thu Hà/,
    });
    await expect(active).toHaveAttribute("aria-controls", "tabpanel-st-2");

    const panel = canvas.getByRole("tabpanel");
    await expect(panel).toHaveAttribute("id", "tabpanel-st-2");
    await expect(panel).toHaveAttribute("aria-labelledby", "tab-st-2");
    // the alert lives INSIDE the panel (it is this child's content)
    await expect(within(panel).getByRole("alert")).toBeInTheDocument();
  },
};

/**
 * AC #5 — a switch is in flight: the rows still belong to the PREVIOUS child,
 * so the panel is announced stale (`aria-busy`), the inactive tab is disabled
 * and its click is swallowed, while the selector itself stays reachable.
 */
export const ParentSwitchingChildBusy: Story = {
  args: {
    vm: vm({
      role: "parent",
      studentId: "st-1",
      childSwitcher: { childList: TWO_CHILDREN, activeChildId: "st-1" },
    }),
    onSwitchChild: fn(),
    isSwitchingChild: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    const panel = childPanel(canvas, "st-1");
    await expect(panel).toHaveAttribute("aria-busy", "true");

    const tabs = childTabs(canvas);
    const other = tabs.getByRole("tab", { name: /Nguyễn Thu Hà/ });
    await expect(other).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(other);
    await expect(args.onSwitchChild).not.toHaveBeenCalled();

    // the ACTIVE tab is never blocked — the parent can still re-select it
    await expect(
      tabs.getByRole("tab", { name: /Nguyễn Minh Khoa/ }),
    ).toHaveAttribute("aria-disabled", "false");
  },
};
