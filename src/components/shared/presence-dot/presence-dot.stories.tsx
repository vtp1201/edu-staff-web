import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { PresenceDot } from "./presence-dot";

/**
 * Presence dot (US-E10.6). Rendered inside a `relative` avatar wrapper; the
 * decorator supplies one so the absolute positioning has an anchor.
 */
const meta: Meta<typeof PresenceDot> = {
  title: "Shared/PresenceDot",
  component: PresenceDot,
  decorators: [
    (Story) => (
      <span className="relative inline-flex size-[42px] items-center justify-center rounded-full bg-muted">
        <Story />
      </span>
    ),
  ],
  args: { size: "list", label: "đang hoạt động" },
};
export default meta;

type Story = StoryObj<typeof PresenceDot>;

/** Online → filled success dot + sr-only status text (never color-only). */
export const Online: Story = {
  args: { presence: "online", label: "đang hoạt động" },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('[data-presence="online"]');
    await expect(dot).not.toBeNull();
    await expect(
      within(canvasElement).getByText("đang hoạt động"),
    ).toBeInTheDocument();
  },
};

/** Recent → hollow dot (card fill, success border) + sr-only text. */
export const Recent: Story = {
  args: { presence: "recent", label: "vừa hoạt động gần đây" },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('[data-presence="recent"]');
    await expect(dot).not.toBeNull();
    await expect(dot?.className).toContain("border-edu-success");
    await expect(
      within(canvasElement).getByText("vừa hoạt động gần đây"),
    ).toBeInTheDocument();
  },
};

/** Offline → no DOM node at all (not a grey dot). */
export const Offline: Story = {
  args: { presence: "offline", label: "offline" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-presence]")).toBeNull();
    await expect(canvasElement.querySelector(".sr-only")).toBeNull();
  },
};

/** Panel size (9px / 0 offset) — group member row geometry. */
export const PanelSize: Story = {
  args: { presence: "online", size: "panel", label: "đang hoạt động" },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('[data-presence="online"]');
    await expect(dot?.className).toContain("size-[9px]");
  },
};

/** Header size (10px / 1px offset) — DM chat header geometry. */
export const HeaderSize: Story = {
  args: { presence: "recent", size: "header", label: "vừa hoạt động gần đây" },
  play: async ({ canvasElement }) => {
    const dot = canvasElement.querySelector('[data-presence="recent"]');
    await expect(dot?.className).toContain("size-2.5");
  },
};
