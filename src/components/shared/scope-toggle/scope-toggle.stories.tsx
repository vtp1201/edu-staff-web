import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { ScopeToggle } from "./scope-toggle";

const meta: Meta<typeof ScopeToggle> = {
  title: "Shared/ScopeToggle",
  component: ScopeToggle,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof ScopeToggle>;

/** Mine active — the count badges and aria-pressed reflect the active option. */
export const MineActive: Story = {
  render: () => {
    const [value, setValue] = useState("mine");
    return (
      <ScopeToggle
        value={value}
        options={[
          { id: "mine", label: "Của tôi", count: 3 },
          { id: "search", label: "Tìm kiếm", count: 12 },
        ]}
        onChange={setValue}
        groupAriaLabel="Chọn phạm vi xem câu hỏi"
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mine = canvas.getByRole("button", { name: /Của tôi/ });
    const search = canvas.getByRole("button", { name: /Tìm kiếm/ });
    await expect(mine).toHaveAttribute("aria-pressed", "true");
    await expect(search).toHaveAttribute("aria-pressed", "false");
  },
};

/** Clicking the inactive option flips aria-pressed (controlled state). */
export const SwitchScope: Story = {
  render: () => {
    const [value, setValue] = useState("mine");
    return (
      <ScopeToggle
        value={value}
        options={[
          { id: "mine", label: "Của tôi", count: 3 },
          { id: "search", label: "Tìm kiếm", count: 12 },
        ]}
        onChange={setValue}
        groupAriaLabel="Chọn phạm vi xem câu hỏi"
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole("button", { name: /Tìm kiếm/ });
    await userEvent.click(search);
    await expect(search).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("button", { name: /Của tôi/ }),
    ).toHaveAttribute("aria-pressed", "false");
  },
};
