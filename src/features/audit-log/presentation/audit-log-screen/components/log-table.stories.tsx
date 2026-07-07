import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AuditEvent } from "../../../domain/entities/audit-event.entity";
import { LogTable } from "./log-table";

const EVENTS: AuditEvent[] = [
  {
    id: "log-1",
    occurredAt: "2026-06-13T08:15:03.000Z",
    actorId: "tch-1",
    actorName: "Nguyễn Thị Hương",
    actorRole: "teacher",
    action: "UPDATE",
    entityType: "grade",
    entityId: "gr-1",
    entityLabel: "Toán · Cuối kỳ — Lê Hoàng Nhật",
    beforeValue: "8.5",
    afterValue: "9.0",
  },
  {
    id: "log-2",
    occurredAt: "2026-06-12T09:10:32.000Z",
    actorId: "admin-2",
    actorName: "Lê Thị Mai",
    actorRole: "admin",
    action: "DELETE",
    entityType: "grade",
    entityId: "gr-2",
    entityLabel: "Tiếng Anh · TX1 — Đặng Thuỳ Linh",
    beforeValue: "7.5",
    afterValue: null,
  },
  {
    id: "log-3",
    occurredAt: "2026-06-12T11:55:00.000Z",
    actorId: "admin-1",
    actorName: "Trần Minh Quân",
    actorRole: "admin",
    action: "SEAL",
    entityType: "record",
    entityId: "rec-1",
    entityLabel: "Học bạ · HK1 · 2025-2026 — Lê Hoàng Nhật",
    beforeValue: "open",
    afterValue: "sealed",
  },
];

const meta: Meta<typeof LogTable> = {
  title: "Features/AuditLog/LogTable",
  component: LogTable,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof LogTable>;

export const Default: Story = {
  args: { events: EVENTS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Column headers present (AC-12 scope=col defaulted by TableHead).
    await expect(
      canvas.getByRole("columnheader", { name: /Thời gian/i }),
    ).toBeInTheDocument();
    // DELETE renders the error-tone action label regardless of entity type.
    await expect(canvas.getByText("Xoá")).toBeInTheDocument();
    // No destructive affordance in any row (AC-8).
    await expect(
      canvas.queryByRole("button", { name: /xoá|sửa|chỉnh/i }),
    ).not.toBeInTheDocument();
  },
};
