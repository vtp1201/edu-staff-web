import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { Class } from "@/features/admin/class-management/domain/entities/class.entity";
import { PrincipalClassesScreen } from "./principal-classes-screen";
import type {
  LoadMoreResult,
  PrincipalClassesVm,
} from "./principal-classes-screen.i-vm";

const copy = messages.principalClasses;

function cls(over: Partial<Class> & { id: string; name: string }): Class {
  return {
    gradeLevel: 10,
    status: "ACTIVE",
    academicYear: "2025-2026",
    studentCount: 30,
    homeroomTeacherId: "u-1",
    homeroomTeacherName: "Nguyễn Thị Lan",
    ...over,
  };
}

const CLASSES: Class[] = [
  cls({ id: "c-10a1", name: "10A1", gradeLevel: 10, studentCount: 32 }),
  cls({
    id: "c-10a2",
    name: "10A2",
    gradeLevel: 10,
    studentCount: 0,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  }),
  cls({
    id: "c-11b1",
    name: "11B1",
    gradeLevel: 11,
    studentCount: 28,
    homeroomTeacherName: "Trần Văn Minh",
  }),
  cls({
    id: "c-12c1",
    name: "12C1",
    gradeLevel: 12,
    status: "ARCHIVED",
    studentCount: 0,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
  }),
];

const NEXT_PAGE: Class[] = [
  cls({ id: "c-11b2", name: "11B2", gradeLevel: 11, studentCount: 27 }),
];

function vm(over: Partial<PrincipalClassesVm> = {}): PrincipalClassesVm {
  return {
    classes: CLASSES,
    nextCursor: null,
    hasMore: false,
    academicYear: "2025-2026",
    fetchError: null,
    teachersHref: "/t/thpt-a/principal/teachers",
    ...over,
  };
}

const noLoadMore = async (): Promise<LoadMoreResult> => ({
  ok: false,
  errorKey: "unknown",
});

/** Desktop width — the table branch (`hidden md:block`) is the one under test. */
async function desktop() {
  const { page } = await import("vitest/browser");
  await page.viewport(1280, 900);
}

const meta: Meta<typeof PrincipalClassesScreen> = {
  title: "Principal/PrincipalClassesScreen",
  component: PrincipalClassesScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      // Radix portal scroll-lock can leak across stories in the shared page.
      document.body.style.pointerEvents = "auto";
      return (
        <NextIntlClientProvider locale="vi" messages={messages}>
          <Story />
        </NextIntlClientProvider>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof PrincipalClassesScreen>;

/** AC-1.1 — loading skeleton, no rows, sr-only status announcement. */
export const Loading: Story = {
  args: { vm: vm({ classes: [] }), onLoadMore: noLoadMore, loading: true },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      copy.table.loading,
    );
    await expect(canvas.queryByText("10A1")).not.toBeInTheDocument();
  },
};

/** AC-1.2 / AC-1.8 — populated, multi-grade, ACTIVE-only by default. */
export const Populated: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    const table = within(await canvas.findByRole("table"));
    await expect(await table.findByText("10A1")).toBeVisible();
    await expect(table.getByText("11B1")).toBeVisible();
    // AC-1.8: the ARCHIVED class is filtered out on load.
    await expect(table.queryByText("12C1")).not.toBeInTheDocument();
    // AC-1.2: real studentCount + homeroom, placeholder only where genuinely absent.
    await expect(table.getByText("32")).toBeVisible();
    await expect(table.getByText("Trần Văn Minh")).toBeVisible();
    await expect(table.getByText(copy.homeroomUnassigned)).toBeVisible();
    // FR-009: no mutation control anywhere.
    for (const name of ["Thêm lớp", "Lưu trữ", "Đổi tên"]) {
      await expect(
        canvas.queryByRole("button", { name }),
      ).not.toBeInTheDocument();
    }
  },
};

/** AC-1.4 — zero classes school-wide: no "clear filters" affordance. */
export const Empty_ZeroTenant: Story = {
  args: { vm: vm({ classes: [] }), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(copy.empty.tenantWide)).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: copy.filters.clearFilters }),
    ).not.toBeInTheDocument();
    // AC-2.1: the CTA is not mounted outside the success branch.
    await expect(
      canvas.queryByRole("link", { name: copy.viewTeachers }),
    ).not.toBeInTheDocument();
  },
};

/**
 * AC-1.4 regression (review finding): a school whose classes are ALL archived
 * under the default ACTIVE filter must NOT get the "clear filters" variant —
 * clearing resets to the already-current defaults, so the button would be a
 * dead end announced as an actionable fix.
 */
export const Empty_AllArchivedDefaultFilter: Story = {
  args: {
    vm: vm({
      classes: [
        cls({ id: "c-9a1", name: "9A1", gradeLevel: 9, status: "ARCHIVED" }),
        cls({ id: "c-9a2", name: "9A2", gradeLevel: 9, status: "ARCHIVED" }),
      ],
    }),
    onLoadMore: noLoadMore,
  },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(copy.empty.tenantWide)).toBeVisible();
    await expect(
      canvas.queryByText(copy.empty.filtered),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: copy.filters.clearFilters }),
    ).not.toBeInTheDocument();
    // The archived rows are still reachable — via the status filter, not a
    // no-op clear-filters button.
    await userEvent.click(
      canvas.getByRole("combobox", { name: copy.filters.statusLabel }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", {
        name: copy.status.ARCHIVED,
      }),
    );
    await expect(
      within(await canvas.findByRole("table")).getByText("9A1"),
    ).toBeVisible();
  },
};

/** AC-1.5 — filtered to zero: message + working "clear filters". */
export const Empty_ZeroFiltered: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    const search = await canvas.findByLabelText(copy.filters.searchLabel);
    await userEvent.type(search, "zzz");
    await expect(await canvas.findByText(copy.empty.filtered)).toBeVisible();
    const clear = canvas.getByRole("button", {
      name: copy.filters.clearFilters,
    });
    await userEvent.click(clear);
    await expect(
      within(await canvas.findByRole("table")).getByText("10A1"),
    ).toBeVisible();
  },
};

/** AC-1.6 — network error: alert + retry control. */
export const Error_Network: Story = {
  args: {
    vm: vm({ classes: [], fetchError: "network-error" }),
    onLoadMore: noLoadMore,
  },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(copy.errors["network-error"]);
    await expect(
      canvas.getByRole("button", { name: copy.retry }),
    ).toBeEnabled();
  },
};

/** AC-1.7 — 403 CLASS_FORBIDDEN: alert, retry control ABSENT (not disabled). */
export const Error_Forbidden: Story = {
  args: {
    vm: vm({ classes: [], fetchError: "forbidden" }),
    onLoadMore: noLoadMore,
  },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent(copy.errors.forbidden);
    await expect(
      canvas.queryByRole("button", { name: copy.retry }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1.19 — load more appends the next page (never replaces). */
export const LoadMore_Success: Story = {
  args: {
    vm: vm({ nextCursor: "cur-2", hasMore: true }),
    onLoadMore: async () => ({
      ok: true,
      data: { data: NEXT_PAGE, nextCursor: null, hasMore: false },
    }),
  },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: copy.loadMore.label }),
    );
    const table = within(await canvas.findByRole("table"));
    await expect(await table.findByText("11B2")).toBeVisible();
    // AC-1.19: the first page is still there.
    await expect(table.getByText("10A1")).toBeVisible();
    // AC-1.21: hasMore=false → the control unmounts.
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: copy.loadMore.label }),
      ).not.toBeInTheDocument(),
    );
  },
};

/** AC-1.20 — load more failure: rows preserved, inline retry copy. */
export const LoadMore_Failure: Story = {
  args: {
    vm: vm({ nextCursor: "cur-2", hasMore: true }),
    onLoadMore: async () => ({ ok: false, errorKey: "network-error" }),
  },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: copy.loadMore.label }),
    );
    await expect(
      await canvas.findByRole("button", { name: copy.loadMore.retry }),
    ).toBeVisible();
    await expect(
      within(canvas.getByRole("table")).getByText("10A1"),
    ).toBeVisible();
  },
};

/** AC-1.21 — hasMore=false: the load-more control never renders. */
export const LoadMore_Hidden: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await canvas.findByRole("table");
    await expect(
      canvas.queryByRole("button", { name: copy.loadMore.label }),
    ).not.toBeInTheDocument();
  },
};

/** AC-1.9 — status filter toggles to archived-only, client-side. */
export const Filter_StatusArchived: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("combobox", { name: copy.filters.statusLabel }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", {
        name: copy.status.ARCHIVED,
      }),
    );
    const table = within(await canvas.findByRole("table"));
    await expect(await table.findByText("12C1")).toBeVisible();
    await waitFor(() =>
      expect(table.queryByText("10A1")).not.toBeInTheDocument(),
    );
  },
};

/** AC-1.11 — grade filter narrows to one grade level. */
export const Filter_Grade: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("combobox", { name: copy.filters.gradeLabel }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Khối 11" }),
    );
    const table = within(await canvas.findByRole("table"));
    await expect(await table.findByText("11B1")).toBeVisible();
    await waitFor(() =>
      expect(table.queryByText("10A1")).not.toBeInTheDocument(),
    );
  },
};

/** AC-1.12 / AC-1.13 — case-insensitive name search, AND-ed with status. */
export const Filter_NameSearch: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText(copy.filters.searchLabel),
      "10a",
    );
    const table = within(await canvas.findByRole("table"));
    await expect(await table.findByText("10A1")).toBeVisible();
    await expect(table.getByText("10A2")).toBeVisible();
    await waitFor(() =>
      expect(table.queryByText("11B1")).not.toBeInTheDocument(),
    );
  },
};

/** AC-1.15 / AC-1.17 — name sort, direction toggle, persists across a filter change. */
export const Sort_NameAndPersistence: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole("combobox", { name: copy.filters.sortLabel }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", {
        name: copy.filters.sortByName,
      }),
    );

    const names = async () => {
      const table = await canvas.findByRole("table");
      return within(table)
        .getAllByRole("row")
        .slice(1)
        .map((r) => r.textContent?.match(/1[012][A-Z]\d/)?.[0] ?? "");
    };
    await waitFor(async () =>
      expect(await names()).toEqual(["10A1", "10A2", "11B1"]),
    );

    // Direction toggle → descending.
    await userEvent.click(
      canvas.getByRole("button", { name: copy.filters.sortAsc }),
    );
    await waitFor(async () =>
      expect(await names()).toEqual(["11B1", "10A2", "10A1"]),
    );

    // AC-1.17: still descending after a filter change.
    await userEvent.click(
      canvas.getByRole("combobox", { name: copy.filters.gradeLabel }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", { name: "Khối 10" }),
    );
    await waitFor(async () => expect(await names()).toEqual(["10A2", "10A1"]));
  },
};

/** AC-1.16 — grade sort, descending. */
export const Sort_GradeDescending: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("combobox", { name: copy.filters.sortLabel }),
    );
    await userEvent.click(
      await within(document.body).findByRole("option", {
        name: copy.filters.sortByGrade,
      }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: copy.filters.sortAsc }),
    );
    await waitFor(async () => {
      const table = await canvas.findByRole("table");
      const first = within(table).getAllByRole("row")[1];
      expect(first.textContent).toContain("11B1");
    });
  },
};

/** AC-2.1 / AC-2.2 — CTA visible only in the success branch, navigates out. */
export const Cta_VisibleOnSuccess: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    const cta = await canvas.findByRole("link", { name: copy.viewTeachers });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/t/thpt-a/principal/teachers");
  },
};

/** AC-X.2 — keyboard-only: every control is reachable and operable by Tab/Enter. */
export const KeyboardOnly: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    const status = await canvas.findByRole("combobox", {
      name: copy.filters.statusLabel,
    });
    status.focus();
    await expect(status).toHaveFocus();

    await userEvent.tab();
    await expect(
      canvas.getByRole("combobox", { name: copy.filters.gradeLabel }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByLabelText(copy.filters.searchLabel)).toHaveFocus();
    await userEvent.tab();
    await expect(
      canvas.getByRole("combobox", { name: copy.filters.sortLabel }),
    ).toHaveFocus();

    // Open + choose a sort key with the keyboard only.
    await userEvent.keyboard("{Enter}");
    const option = await within(document.body).findByRole("option", {
      name: copy.filters.sortByName,
    });
    await expect(option).toBeVisible();
    await userEvent.keyboard("{Escape}");
  },
};

/** AC-X.1 — 320px: card list renders, table hidden, no horizontal overflow. */
export const Viewport320_CardList: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(320, 800);
    const canvas = within(canvasElement);
    const card = await canvas.findByRole("listitem", {
      name: `Lớp 10A1, ${copy.status.ACTIVE}`,
    });
    await expect(card).toBeVisible();
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321);
  },
};

/** AC-X.1 — 375px: card list still the active branch. */
export const Viewport375_CardList: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 800);
    const canvas = within(canvasElement);
    const card = await canvas.findByRole("listitem", {
      name: `Lớp 10A2, ${copy.status.ACTIVE}`,
    });
    // FR-002: the placeholder appears only on the row genuinely lacking a GVCN.
    await expect(within(card).getByText(copy.homeroomUnassigned)).toBeVisible();
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(376);
  },
};

/** AC-1.1 (mobile) — card skeleton variant at 375px. */
export const Viewport375_LoadingCards: Story = {
  args: { vm: vm({ classes: [] }), onLoadMore: noLoadMore, loading: true },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 800);
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      copy.table.loading,
    );
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
  },
};

/** AC-X.1 — 768px: the table branch takes over at the md breakpoint. */
export const Viewport768_Table: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(768, 900);
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("table")).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(769);
  },
};

/** AC-X.1 — 1280px: full desktop layout, no overflow. */
export const Viewport1280_Table: Story = {
  args: { vm: vm(), onLoadMore: noLoadMore },
  play: async ({ canvasElement }) => {
    await desktop();
    const canvas = within(canvasElement);
    await expect(
      within(await canvas.findByRole("table")).getByText("10A1"),
    ).toBeVisible();
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      1281,
    );
  },
};
