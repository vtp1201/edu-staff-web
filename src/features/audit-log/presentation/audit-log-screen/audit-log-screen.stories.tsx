import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { AuditEvent } from "../../domain/entities/audit-event.entity";
import { AuditLogScreen } from "./audit-log-screen";
import type {
  AuditLogActionResult,
  AuditLogPage,
  AuditLogScreenProps,
} from "./audit-log-screen.i-vm";

const MIXED: AuditEvent[] = [
  {
    id: "log-1041",
    occurredAt: "2026-06-13T09:42:11.000Z",
    actorId: "admin-1",
    actorName: "Trần Minh Quân",
    actorRole: "admin",
    action: "UNSEAL",
    entityType: "record",
    entityId: "rec-phamhuuphuc-hk2-24-25",
    entityLabel: "Học bạ · HK2 · 2024-2025 — Phạm Hữu Phúc",
    beforeValue: "sealed",
    afterValue: "open",
  },
  {
    id: "log-1040",
    occurredAt: "2026-06-13T08:15:03.000Z",
    actorId: "tch-1",
    actorName: "Nguyễn Thị Hương",
    actorRole: "teacher",
    action: "UPDATE",
    entityType: "grade",
    entityId: "gr-12c1-math-ck-001",
    entityLabel: "Toán · Cuối kỳ — Lê Hoàng Nhật",
    beforeValue: "8.5",
    afterValue: "9.0",
  },
  {
    id: "log-1033",
    occurredAt: "2026-06-12T09:10:32.000Z",
    actorId: "admin-2",
    actorName: "Lê Thị Mai",
    actorRole: "admin",
    action: "DELETE",
    entityType: "grade",
    entityId: "gr-11a1-eng-tx1-009",
    entityLabel: "Tiếng Anh · TX1 — Đặng Thuỳ Linh",
    beforeValue: "7.5",
    afterValue: null,
  },
  {
    id: "log-1036",
    occurredAt: "2026-06-12T14:20:18.000Z",
    actorId: "tch-9",
    actorName: "Nguyễn Văn Phúc",
    actorRole: "teacher",
    action: "UPDATE",
    entityType: "conduct",
    entityId: "conduct-10a1-pd",
    entityLabel: "Hạnh kiểm · HK1 — Phạm Đức Dũng",
    beforeValue: "Trung bình",
    afterValue: "Khá",
  },
  {
    id: "log-1024",
    occurredAt: "2026-06-09T08:00:00.000Z",
    actorId: "admin-1",
    actorName: "Trần Minh Quân",
    actorRole: "admin",
    action: "UPDATE",
    entityType: "setting",
    entityId: "setting-grade-scale",
    entityLabel: "Thang điểm · Toàn trường",
    beforeValue: "Thang 10",
    afterValue: "Thang 10 (làm tròn 0.25)",
  },
  {
    id: "log-1009",
    occurredAt: "2026-06-01T16:20:00.000Z",
    actorId: "admin-1",
    actorName: "Trần Minh Quân",
    actorRole: "admin",
    action: "CREATE",
    entityType: "setting",
    entityId: "setting-term-weights",
    entityLabel: "Trọng số điểm · Năm học 2025-2026",
    beforeValue: null,
    afterValue: "TX 15% · GK 25% · CK 60%",
  },
];

const GRADES = MIXED.filter((e) => e.entityType === "grade");

function page(events: AuditEvent[], hasMore = false): AuditLogPage {
  return {
    events,
    nextCursor: hasMore ? "offset:20" : null,
    hasMore,
  };
}

const resolveWith =
  (result: AuditLogActionResult) => async (): Promise<AuditLogActionResult> =>
    result;

const baseProps: AuditLogScreenProps = {
  initialFilter: {},
  initialPage: page(MIXED),
  initialErrorKey: null,
  getAuditLogAction: resolveWith({ ok: true, data: page(MIXED) }),
};

const meta: Meta<typeof AuditLogScreen> = {
  title: "Features/AuditLog/AuditLogScreen",
  component: AuditLogScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <QueryClientProvider client={qc}>
          <NextIntlClientProvider locale="vi" messages={messages}>
            <div className="min-h-screen bg-[color:var(--edu-bg)]">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof AuditLogScreen>;

/** AC-1 — skeleton rows while the first page loads (no RSC seed for this filter). */
export const Loading: Story = {
  args: {
    ...baseProps,
    // initialFilter differs from the empty applied filter → no seed → query runs.
    initialFilter: { entityType: "grade" },
    getAuditLogAction: () => new Promise<AuditLogActionResult>(() => {}),
  },
};

/** AC-2 — list with mixed entity types + action badges (incl. DELETE = error tone). */
export const List_MixedActionTypes: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: /Nhật ký kiểm toán/i, level: 1 }),
    ).toBeInTheDocument();
    // One row per seeded event.
    const rows = canvas.getAllByText(/·/);
    await expect(rows.length).toBeGreaterThanOrEqual(MIXED.length);
    await expect(canvas.getByText("Xoá")).toBeInTheDocument();
  },
};

/** AC-3 — entity-type filter view (grade-only rows). */
export const Filter_EntityType: Story = {
  args: {
    ...baseProps,
    initialPage: page(GRADES),
    getAuditLogAction: resolveWith({ ok: true, data: page(GRADES) }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Toán · Cuối kỳ/)).toBeInTheDocument();
    await expect(canvas.queryByText(/Hạnh kiểm · HK1/)).not.toBeInTheDocument();
  },
};

/** AC-5 — date-range filtered view (subset within a window). */
export const Filter_DateRange: Story = {
  args: {
    ...baseProps,
    initialPage: page(MIXED.slice(0, 3)),
    getAuditLogAction: resolveWith({ ok: true, data: page(MIXED.slice(0, 3)) }),
  },
};

/** AC-7 — "Tải thêm" appends the next page and the button reflects loading. */
export const LoadMore: Story = {
  args: {
    ...baseProps,
    initialPage: page(MIXED.slice(0, 3), true),
    getAuditLogAction: resolveWith({
      ok: true,
      data: page(MIXED.slice(3), false),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", {
      name: /Tải thêm nhật ký kiểm toán/i,
    });
    await userEvent.click(button);
    await waitFor(() =>
      expect(
        canvas.getByText(/Trọng số điểm · Năm học 2025-2026/),
      ).toBeInTheDocument(),
    );
  },
};

/** AC-9 — no results match the filter. */
export const EmptyState: Story = {
  args: {
    ...baseProps,
    initialPage: page([]),
    getAuditLogAction: resolveWith({ ok: true, data: page([]) }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/Không tìm thấy kết quả/i),
    ).toBeInTheDocument();
  },
};

/** AC-10 — error banner with retry when the fetch fails. */
export const ErrorState: Story = {
  args: {
    ...baseProps,
    initialErrorKey: "network-error",
    getAuditLogAction: resolveWith({
      ok: false,
      errorKey: "network-error",
      retryable: false,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole("alert")).toBeInTheDocument());
    await expect(
      canvas.getByRole("button", { name: /Thử lại/i }),
    ).toBeInTheDocument();
  },
};
