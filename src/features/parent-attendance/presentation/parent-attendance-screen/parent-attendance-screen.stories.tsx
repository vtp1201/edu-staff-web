import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import enMessages from "@/bootstrap/i18n/messages/en.json";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import type { ChildAttendanceRecord } from "../../domain/entities/child-attendance-record.entity";
import { ParentAttendanceScreen } from "./parent-attendance-screen";
import { resolveRangeFromParams } from "./resolve-range";

/** Seed data, not UI copy — not i18n. */
const CHILDREN: ChildSwitcherChild[] = [
  {
    childId: "c1",
    name: "Nguyễn Minh Khoa",
    className: "11A2",
    ordinal: 1,
    avatar: "NK",
    color: "primary",
  },
  {
    childId: "c2",
    name: "Nguyễn Thu Hà",
    className: "8B1",
    ordinal: 2,
    avatar: "NH",
    color: "success",
  },
];

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };

const RECORDS: ChildAttendanceRecord[] = [
  { date: "2026-08-03", status: "present" },
  { date: "2026-08-04", status: "late" },
  { date: "2026-08-05", status: "excusedAbsent" },
  { date: "2026-08-06", status: "absent" },
];

const meta: Meta<typeof ParentAttendanceScreen> = {
  title: "ParentAttendance/ParentAttendanceScreen",
  component: ParentAttendanceScreen,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ParentAttendanceScreen>;

export const Populated: Story = {
  args: {
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: RECORDS,
      error: null,
    },
    onChildSwitch: fn(),
    onRangeChange: fn(),
    onRetry: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // one row per record, dates rendered DD/MM/YYYY
    const rows = canvas.getAllByRole("row");
    // header row + 4 record rows
    expect(rows).toHaveLength(5);
    expect(canvas.getByText("03/08/2026")).toBeVisible();

    // AC — status is never colour-only: every badge carries its text label,
    // and the row's status cell also carries a (decorative) icon.
    for (const label of ["Có mặt", "Muộn", "Vắng phép", "Vắng KP"]) {
      expect(canvas.getAllByText(label).length).toBeGreaterThan(0);
    }
    const statusCell = canvas.getByText("Muộn").closest("td");
    expect(statusCell?.querySelector("svg")).not.toBeNull();

    // summary chips: 1 of each status over this range
    const summary = canvas.getByRole("list", { name: "Tổng hợp" });
    expect(within(summary).getByText(/Có mặt\s*1/)).toBeVisible();

    // tablist ↔ tabpanel pairing is owned by THIS screen
    const activeTab = canvas.getByRole("tab", { name: /Nguyễn Minh Khoa/ });
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("aria-controls", "tabpanel-c1");
    const panel = canvas.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "tabpanel-c1");
    expect(panel).toHaveAttribute("aria-labelledby", "tab-c1");
  },
};

/**
 * Same VM under the `en` locale (fix round, tech-lead SHOULD-FIX 3 + 4): the
 * date column is formatted by `useFormatter().dateTime`, so it flips to the
 * en ordering (MM/DD/YYYY) instead of the previously hard-coded DD/MM/YYYY, and
 * the summary chip's label/count word order comes from the `summaryChip`
 * message ("Present: 1") rather than JSX concatenation.
 */
export const PopulatedEnglishLocale: Story = {
  args: { ...Populated.args },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // vi renders 03/08/2026 for the same record — locale decides the ordering.
    expect(canvas.getByText("08/03/2026")).toBeVisible();
    expect(canvas.queryByText("03/08/2026")).toBeNull();

    const summary = canvas.getByRole("list", { name: "Summary" });
    expect(within(summary).getByText("Present: 1")).toBeVisible();
    expect(canvas.getByText("Child attendance")).toBeVisible();
  },
};

/** Switching child asks the RSC to re-fetch (URL navigation in the container). */
export const SwitchChild: Story = {
  args: { ...Populated.args, onChildSwitch: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("tab", { name: /Nguyễn Thu Hà/ }));
    expect(args.onChildSwitch).toHaveBeenCalledWith("c2");
  },
};

/** The date inputs are labelled, keyboard-operable and drive a re-fetch. */
export const ChangeDateRange: Story = {
  args: { ...Populated.args, onRangeChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByLabelText("Từ ngày");
    expect(start).toHaveValue("2026-08-01");
    expect(canvas.getByLabelText("Đến ngày")).toHaveValue("2026-08-31");

    await userEvent.clear(start);
    await userEvent.type(start, "2026-08-10");
    expect(args.onRangeChange).toHaveBeenCalled();
  },
};

/** Default range with no URL params = the current calendar month. */
export const DefaultCurrentMonthRange: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: resolveRangeFromParams({}, new Date().toISOString().slice(0, 10)),
      records: RECORDS,
      error: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const lastDay = new Date(Date.UTC(yyyy, today.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10);

    expect(canvas.getByLabelText("Từ ngày")).toHaveValue(`${yyyy}-${mm}-01`);
    expect(canvas.getByLabelText("Đến ngày")).toHaveValue(lastDay);
  },
};

export const Loading: Story = {
  args: {
    ...Populated.args,
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Đang tải lịch sử điểm danh")).toBeInTheDocument();
    expect(canvas.queryByRole("table")).toBeNull();
  },
};

/** Zero linked children — no switcher, no range control, just the empty state. */
export const NoLinkedChildren: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: [],
      activeChildId: null,
      range: RANGE,
      records: [],
      error: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Chưa có con nào được liên kết")).toBeVisible();
    expect(canvas.queryAllByRole("tab")).toHaveLength(0);
    expect(canvas.queryByLabelText("Từ ngày")).toBeNull();
  },
};

/** Children linked, but no attendance session inside the chosen range. */
export const EmptyRange: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      error: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Không có dữ liệu điểm danh")).toBeVisible();
    // the switcher + range control stay available so the parent can adjust
    expect(canvas.getAllByRole("tab")).toHaveLength(2);
  },
};

/**
 * BE gap degrade (PARENT is not authorized on the real endpoint): honest copy
 * and NO retry control — a retry can never fix a 403.
 */
export const ErrorForbidden: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      error: "forbidden",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("alert")).toBeVisible();
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
};

export const ErrorNetworkRetry: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: RANGE,
      records: [],
      error: "network-error",
    },
    onRetry: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Thử lại" }));
    expect(args.onRetry).toHaveBeenCalled();
  },
};

/**
 * Over the BE's 366-day cap. Same treatment as the inverted range (a11y audit
 * Minor, fix round): the two inputs that CAUSED the failure are `aria-invalid`
 * and `aria-describedby` the alert, so the reason is announced, not just tinted.
 */
export const ErrorRangeTooLarge: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: { startDate: "2024-01-01", endDate: "2026-08-31" },
      records: [],
      error: "date-range-too-large",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const label of ["Từ ngày", "Đến ngày"]) {
      const input = canvas.getByLabelText(label);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAttribute("aria-describedby", "pa-range-error");
      expect(input).toHaveAccessibleDescription(/không được vượt quá 366 ngày/);
    }
    expect(canvas.getByRole("alert")).toHaveAttribute("id", "pa-range-error");
    // Terminal failure — no retry affordance.
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
};

/** An inverted range: the inputs are marked invalid and point at the message. */
export const ErrorInvalidRange: Story = {
  args: {
    ...Populated.args,
    vm: {
      childList: CHILDREN,
      activeChildId: "c1",
      range: { startDate: "2026-08-31", endDate: "2026-08-01" },
      records: [],
      error: "invalid-date-range",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByLabelText("Từ ngày");
    expect(start).toHaveAttribute("aria-invalid", "true");
    expect(start).toHaveAttribute("aria-describedby", "pa-range-error");
    const alert = canvas.getByRole("alert");
    expect(alert).toHaveAttribute("id", "pa-range-error");
    // range failures are terminal — no retry affordance
    expect(canvas.queryByRole("button", { name: "Thử lại" })).toBeNull();
  },
};
