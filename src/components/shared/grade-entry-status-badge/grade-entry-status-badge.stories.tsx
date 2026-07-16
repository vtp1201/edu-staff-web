import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  GradeEntryStatusBadge,
  GradeRowStatusSummaryBadge,
} from "./grade-entry-status-badge";

const meta: Meta<typeof GradeEntryStatusBadge> = {
  title: "Shared/GradeEntryStatusBadge",
  component: GradeEntryStatusBadge,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof GradeEntryStatusBadge>;

export const Draft: Story = { args: { status: "DRAFT" } };
export const PendingApproval: Story = { args: { status: "PENDING_APPROVAL" } };
export const Published: Story = { args: { status: "PUBLISHED" } };
export const Locked: Story = { args: { status: "LOCKED" } };

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <GradeEntryStatusBadge status="DRAFT" />
      <GradeEntryStatusBadge status="PENDING_APPROVAL" />
      <GradeEntryStatusBadge status="PUBLISHED" />
      <GradeEntryStatusBadge status="LOCKED" />
    </div>
  ),
};

export const RowSummaryStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <GradeRowStatusSummaryBadge rowStatus="draft" />
      <GradeRowStatusSummaryBadge rowStatus="pending-approval" />
      <GradeRowStatusSummaryBadge rowStatus="published" />
      <GradeRowStatusSummaryBadge rowStatus="locked" />
    </div>
  ),
};
