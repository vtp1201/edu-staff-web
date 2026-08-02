import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { MOCK_VIEWER_CHILDREN } from "@/features/grades/infrastructure/repositories/mocks/grade-book-fixtures";
import { ChildSwitcher } from "./child-switcher";

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
