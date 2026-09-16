import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { toParentChildren } from "@/features/grades/infrastructure/mappers/parent-child.mapper";
import { MOCK_VIEWER_CHILDREN } from "@/features/grades/infrastructure/repositories/mocks/grade-book-fixtures";
import { ChildSwitcher, childSwitcherIds } from "./child-switcher";

const meta: Meta<typeof ChildSwitcher> = {
  title: "Shared/ChildSwitcher",
  component: ChildSwitcher,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ChildSwitcher>;

/**
 * Single child — the two consumers differ here BY DESIGN, which is why the
 * rule lives in the consumer, not in this shared component: `GradeBookScreen`
 * hides the switcher when `childrenList.length < 2`, while
 * `ParentAttendanceScreen` (US-E20.5) renders it for ≥1 child so the active
 * child is always named on screen. This story pins the single-tab rendering
 * both rely on; each consumer's own stories cover its show/hide rule.
 */
export const ParentView_SingleChild: Story = {
  args: {
    childList: [MOCK_VIEWER_CHILDREN[0]],
    activeChildId: "c1",
    onSwitch: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole("tab")).toHaveLength(1);
    expect(
      canvas.getByRole("tab", { name: /Nguyễn Minh Khoa/ }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

export const ParentView_MultiChild_Tab1: Story = {
  args: {
    childList: MOCK_VIEWER_CHILDREN,
    activeChildId: "c1",
    onSwitch: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");

    // Keyboard roving: ArrowRight moves focus to the next tab WITHOUT
    // changing selection (selection only changes on Enter/Space/click).
    tabs[0].focus();
    await expect(tabs[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(tabs[1]).toHaveFocus();
    await expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    // ArrowLeft wraps focus back to the first tab.
    await userEvent.keyboard("{ArrowLeft}");
    await expect(tabs[0]).toHaveFocus();
  },
};

export const ParentView_SwitchLoading: Story = {
  args: {
    childList: MOCK_VIEWER_CHILDREN,
    activeChildId: "c2",
    isLoading: true,
    onSwitch: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole("tab");
    // active (c2) stays enabled; the non-active tab is disabled while loading.
    expect(tabs[0]).toHaveAttribute("aria-disabled", "true");
    expect(tabs[1]).not.toHaveAttribute("aria-disabled", "true");
  },
};

export const ParentView_MultiChild_Switch: Story = {
  args: {
    childList: MOCK_VIEWER_CHILDREN,
    activeChildId: "c2",
    onSwitch: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole("tab");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    // clicking the first tab fires onSwitch with the first child id.
    await userEvent.click(
      canvas.getByRole("tab", { name: /Nguyễn Minh Khoa/ }),
    );
    expect(args.onSwitch).toHaveBeenCalledWith("c1");
  },
};

/* ── US-E18.33: real-mode roster (un-mocked, ADR 0054 → real) ───────────── */
/**
 * Every other story above feeds the switcher hand-seeded mock fixtures. This
 * one feeds it the output of the ACTUAL real-mode mapper, from an actual
 * `core` `linked-students` wire shape joined with the `memberId → displayName`
 * map IAM's tiered batch lookup returns for a PARENT caller (ADR-0120) — so it
 * fails the day the join or the initials derivation regresses.
 *
 * It also pins the two degradations the real path can hit, which since the
 * US-E18.33 review match the sibling `ChildPicker` exactly: an id the lookup
 * omitted renders the "Con thứ N" ordinal label (NEVER the raw memberId — that
 * uuid would become the tab's accessible name), and a child with no current
 * enrollment renders "Chưa có lớp" rather than a blank second line.
 */
const REAL_CHILDREN = toParentChildren(
  [
    {
      linkId: "link-b",
      parentMemberId: "p-1",
      studentMemberId: "st-2",
      createdAt: "2026-01-02T00:00:00Z",
      classId: null,
      className: null,
    },
    {
      linkId: "link-a",
      parentMemberId: "p-1",
      studentMemberId: "st-1",
      createdAt: "2026-01-01T00:00:00Z",
      classId: "cls-1",
      className: "10A1",
    },
  ],
  new Map([["st-1", "Nguyễn Minh Khoa"]]),
);

export const ParentView_RealMode_ResolvedNames: Story = {
  args: {
    childList: REAL_CHILDREN,
    activeChildId: "st-1",
    onSwitch: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const resolved = canvas.getByRole("tab", { name: /Nguyễn Minh Khoa/ });
    expect(resolved).toHaveAttribute("aria-selected", "true");
    expect(resolved).toHaveTextContent("10A1");
    expect(resolved).not.toHaveTextContent("Chưa có lớp");

    // Unresolved name → the stable ordinal label. `st-2` is roster position 2
    // by linkId-ascending order, so "Con thứ 2" — and the raw memberId must
    // appear NOWHERE in the tab (a uuid is not a human name, and this string is
    // the tab's accessible name).
    const degraded = canvas.getByRole("tab", { name: /Con thứ 2/ });
    expect(degraded).toBeVisible();
    expect(degraded).not.toHaveTextContent("st-2");
    expect(canvas.queryByRole("tab", { name: /st-2/ })).toBeNull();
    // No current enrollment → real copy, not a blank line.
    expect(degraded).toHaveTextContent("Chưa có lớp");

    await userEvent.click(degraded);
    expect(args.onSwitch).toHaveBeenCalledWith("st-2");
  },
};

/* ── US-E24.18 (#11): no dangling `aria-controls`, and id namespacing ───── */

/**
 * A11Y-002 (US-E24.16 review, deferred → closed here): every consumer mounts
 * exactly ONE tabpanel — the ACTIVE child's. The switcher used to emit
 * `aria-controls="tabpanel-<childId>"` on EVERY tab, so every inactive tab
 * referenced an id that exists nowhere in the DOM (WCAG 4.1.2 / ARIA tabs
 * pattern). `aria-controls` is optional per-tab, so the inactive tabs simply
 * omit it; the active tab keeps its pairing with the real panel.
 */
export const AriaControlsNeverDangles: Story = {
  args: {
    childList: MOCK_VIEWER_CHILDREN,
    activeChildId: "c1",
    onSwitch: fn(),
  },
  render: (args) => (
    <div>
      <ChildSwitcher {...args} />
      {/* The consumer contract: exactly one panel, for the ACTIVE child. */}
      <div
        role="tabpanel"
        id={`tabpanel-${args.activeChildId}`}
        aria-labelledby={`tab-${args.activeChildId}`}
      >
        Bảng điểm
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [active, inactive] = canvas.getAllByRole("tab");

    await expect(active).toHaveAttribute("aria-selected", "true");
    // Active tab: the pairing still resolves to a REAL element.
    const controls = active.getAttribute("aria-controls");
    await expect(controls).toBe("tabpanel-c1");
    await expect(
      canvasElement.ownerDocument.getElementById(controls as string),
    ).not.toBeNull();

    // Inactive tab: no attribute at all — never a reference to a missing id.
    await expect(inactive).not.toHaveAttribute("aria-controls");

    // Belt and braces: NOTHING in the tree points at a nonexistent id.
    for (const tab of canvas.getAllByRole("tab")) {
      const ref = tab.getAttribute("aria-controls");
      if (ref !== null) {
        await expect(
          canvasElement.ownerDocument.getElementById(ref),
        ).not.toBeNull();
      }
    }
  },
};

/**
 * Two switchers on one page: without `idPrefix` both would emit
 * `id="tab-c1"` and `id="child-switcher-label"`. With distinct prefixes every
 * id is unique, and each active tab still points at its OWN panel.
 */
export const TwoInstancesNamespacedIds: Story = {
  args: {
    childList: MOCK_VIEWER_CHILDREN,
    activeChildId: "c1",
    onSwitch: fn(),
  },
  render: (args) => (
    <div>
      <ChildSwitcher {...args} idPrefix="left-" />
      <div
        role="tabpanel"
        id={childSwitcherIds("left-").panel("c1")}
        aria-labelledby={childSwitcherIds("left-").tab("c1")}
      >
        Trái
      </div>
      <ChildSwitcher {...args} activeChildId="c2" idPrefix="right-" />
      <div
        role="tabpanel"
        id={childSwitcherIds("right-").panel("c2")}
        aria-labelledby={childSwitcherIds("right-").tab("c2")}
      >
        Phải
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const tabs = within(canvasElement).getAllByRole("tab");
    const ids = tabs.map((t) => t.id);
    await expect(new Set(ids).size).toBe(ids.length);
    await expect(ids).toEqual([
      "left-tab-c1",
      "left-tab-c2",
      "right-tab-c1",
      "right-tab-c2",
    ]);

    // Exactly one `aria-controls` per instance, each resolving to its own panel.
    const refs = tabs
      .map((t) => t.getAttribute("aria-controls"))
      .filter((r): r is string => r !== null);
    await expect(refs).toEqual(["left-tabpanel-c1", "right-tabpanel-c2"]);
    for (const ref of refs) {
      await expect(doc.getElementById(ref)).not.toBeNull();
    }
  },
};
