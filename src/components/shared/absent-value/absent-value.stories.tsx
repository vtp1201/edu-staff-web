import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { AbsentValue } from "./absent-value";

/**
 * Canonical absent-value marker (US-E18.35 promotion, decision 0026). The two
 * stories are the two real consumers' copy — each passes its OWN already
 * translated label, taken from `vi.json` so the story cannot drift from
 * shipped copy.
 */
const meta: Meta<typeof AbsentValue> = {
  title: "Shared/AbsentValue",
  component: AbsentValue,
  args: { label: messages.adminRoster.table.notProvided },
};
export default meta;

type Story = StoryObj<typeof AbsentValue>;

/** admin-roster: a roster field the student/IAM never recorded. */
export const RosterNotProvided: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The meaning is readable text, not the glyph.
    await expect(
      canvas.getByText(messages.adminRoster.table.notProvided),
    ).toBeInTheDocument();
    // The dash itself is hidden from the accessibility tree.
    await expect(
      canvasElement.querySelector('[aria-hidden="true"]')?.textContent,
    ).toBe("—");
  },
};

/** moderation: a field the server omits by design (reporter identity). */
export const ModerationUnavailable: Story = {
  args: { label: messages.moderation.unavailable },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(messages.moderation.unavailable),
    ).toBeInTheDocument();
  },
};
