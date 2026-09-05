import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ItemTypeChip } from "./item-type-chip";

const meta: Meta<typeof ItemTypeChip> = {
  title: "Features/LMS/ItemTypeChip",
  component: ItemTypeChip,
  decorators: [
    (Story) => (
      <div className="bg-card p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ItemTypeChip>;

export const Lesson: Story = { args: { itemType: "LESSON" } };
export const Assignment: Story = { args: { itemType: "ASSIGNMENT" } };
export const Document: Story = { args: { itemType: "DOCUMENT" } };

export const Exam: Story = {
  args: { itemType: "EXAM" },
  play: async ({ canvasElement }) => {
    // Decorative: the row's text already names the type, so the chip must be
    // invisible to assistive tech (no duplicate announcement).
    const canvas = within(canvasElement);
    expect(canvas.queryByRole("img")).toBeNull();
    expect(canvasElement.querySelector("[aria-hidden='true']")).not.toBeNull();
  },
};

/** US-E24.5: the player's sidebar shows an unreleased EXAM with a lock in
 *  place of the type icon. Still decorative — the row spells "Sắp mở" out. */
export const LockedExam: Story = {
  args: { itemType: "EXAM", locked: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.queryByRole("img")).toBeNull();
    expect(canvasElement.querySelector("[aria-hidden='true']")).not.toBeNull();
  },
};
