import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type { ReportEntity } from "../../domain/entities/report.entity";
import type { ReportDetailEntity } from "../../domain/entities/report-detail.entity";
import { ModerationScreen } from "./moderation-screen";
import type {
  GetModerationAuditLogActionResult,
  GetReportDetailActionResult,
  ListReportsActionResult,
  ModerationScreenProps,
  RemoveContentActionResult,
} from "./moderation-screen.i-vm";

const m = messages.moderation;

const STATS = { pendingCount: 3, resolvedThisWeekCount: 5, removedCount: 2 };

function report(
  over: Partial<ReportEntity> & Pick<ReportEntity, "id">,
): ReportEntity {
  return {
    kind: "post",
    contentId: `c-${over.id}`,
    contentPreview: "Nội dung bị báo cáo minh hoạ.",
    authorId: "a-1",
    authorName: "Nguyễn Văn A",
    reporterId: "rp-1",
    reporterName: "Trần Thị B",
    reason: "spam",
    note: null,
    status: "pending",
    createdAt: "2026-07-10T09:00:00Z",
    duplicateCount: 0,
    resolvedBy: null,
    resolvedAt: null,
    resolveNote: null,
    ...over,
  };
}

const REPORTS: ReportEntity[] = [
  report({ id: "r-1", reason: "spam", duplicateCount: 2 }),
  report({ id: "r-2", kind: "comment", reason: "bullying" }),
  report({ id: "r-3", kind: "message", reason: "inappropriate-language" }),
];

const DETAIL: ReportDetailEntity = {
  ...report({ id: "r-1", duplicateCount: 2 }),
  fullContent: "Nội dung đầy đủ của bài viết bị báo cáo.",
  context: [],
  duplicateReports: [
    {
      reportId: "r-9",
      reporterName: "Lê Văn C",
      createdAt: "2026-07-10T10:00:00Z",
    },
    {
      reportId: "r-8",
      reporterName: "Phạm Thị D",
      createdAt: "2026-07-10T11:00:00Z",
    },
  ],
};

const okList = (
  reports: ReportEntity[],
  stats = STATS,
): ListReportsActionResult => ({
  ok: true,
  data: { reports, nextCursor: null, hasMore: false },
  stats,
});

const okDetail = (detail: ReportDetailEntity): GetReportDetailActionResult => ({
  ok: true,
  data: detail,
});

const AUDIT_OK: GetModerationAuditLogActionResult = {
  ok: true,
  data: {
    entries: [
      {
        entryId: "e-1",
        actorId: "p-1",
        actorName: "Lê Thị Bích Ngọc (BGH)",
        action: "removed",
        contentRef: { kind: "post", contentId: "c-1" },
        reason: "Vi phạm nội quy",
        timestamp: "2026-07-11T10:00:00Z",
      },
      {
        entryId: "e-2",
        actorId: "p-1",
        actorName: "Lê Thị Bích Ngọc (BGH)",
        action: "dismissed",
        contentRef: { kind: "comment", contentId: "c-2" },
        reason: null,
        timestamp: "2026-07-10T09:00:00Z",
      },
    ],
    nextCursor: null,
    hasMore: false,
  },
};

const baseProps: ModerationScreenProps = {
  initialFilter: { status: "pending", contentType: "all", search: "" },
  initialQueuePage: { reports: REPORTS, nextCursor: null, hasMore: false },
  initialStats: STATS,
  initialErrorKey: null,
  auditScopeId: "tenant-1",
  viewerRole: "principal",
  listReportsAction: async () => okList(REPORTS),
  getReportDetailAction: async () => okDetail(DETAIL),
  dismissReportAction: async () => ({ ok: true }),
  removeContentAction: async () => ({ ok: true }),
  getModerationAuditLogAction: async () => AUDIT_OK,
};

const meta: Meta<typeof ModerationScreen> = {
  title: "Features/Moderation/ModerationScreen",
  component: ModerationScreen,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => {
      const qc = new QueryClient({
        // retryDelay: 0 keeps the per-query retry predicate fast (no backoff)
        // so error stories settle within the play timeout.
        defaultOptions: { queries: { retry: false, retryDelay: 0 } },
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

type Story = StoryObj<typeof ModerationScreen>;

/** Success — stat row + queue table render. */
export const QueueSuccess: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: m.title, level: 1 }),
    ).toBeInTheDocument();
    // "Chờ xử lý" appears in both the stat card and the status tab.
    await expect(canvas.getAllByText(m.stats.pending).length).toBeGreaterThan(
      0,
    );
    // reporter appears in the desktop table.
    await expect(canvas.getAllByText("Trần Thị B").length).toBeGreaterThan(0);
  },
};

/** Loading — no RSC seed for this filter → skeleton (query hangs). */
export const QueueLoading: Story = {
  args: {
    ...baseProps,
    initialFilter: { status: "resolved", contentType: "all", search: "" },
    listReportsAction: () => new Promise<ListReportsActionResult>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText(m.title)).toBeInTheDocument(),
    );
  },
};

/** Empty-positive — pending tab, zero total pending reports (good outcome). */
export const EmptyPositive: Story = {
  args: {
    ...baseProps,
    initialQueuePage: { reports: [], nextCursor: null, hasMore: false },
    initialStats: {
      pendingCount: 0,
      resolvedThisWeekCount: 5,
      removedCount: 2,
    },
    listReportsAction: async () =>
      okList([], {
        pendingCount: 0,
        resolvedThisWeekCount: 5,
        removedCount: 2,
      }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(m.empty.positiveTitle)).toBeInTheDocument();
    await expect(canvas.queryByText(m.empty.filteredTitle)).toBeNull();
  },
};

/** Empty-filtered — a filter narrowed a non-empty queue to zero (distinct copy). */
export const EmptyFiltered: Story = {
  args: {
    ...baseProps,
    initialFilter: { status: "pending", contentType: "all", search: "zzzz" },
    initialQueuePage: { reports: [], nextCursor: null, hasMore: false },
    initialStats: STATS, // pendingCount 3 > 0 → filtered, not positive
    listReportsAction: async () => okList([], STATS),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(m.empty.filteredTitle)).toBeInTheDocument(),
    );
    await expect(canvas.queryByText(m.empty.positiveTitle)).toBeNull();
  },
};

/** Whole-screen error — a failed base fetch falls the whole screen back (AC-1923.2). */
export const WholeScreenError: Story = {
  args: {
    ...baseProps,
    initialQueuePage: { reports: [], nextCursor: null, hasMore: false },
    initialErrorKey: "network-error",
    listReportsAction: async () => ({
      ok: false,
      errorKey: "network-error",
      retryable: true,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(m.errorTitle)).toBeInTheDocument(),
    );
    // no partial stat numbers on a failed base fetch.
    await expect(canvas.queryByText("3")).toBeNull();
  },
};

/** Detail sheet (pending, principal) → Dismiss + Remove both render. */
export const DetailSheetPending: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const open = await canvas.findByRole("button", {
      name: m.table.openDetail.replace("{id}", "r-1"),
    });
    await userEvent.click(open);
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    await expect(within(sheet).getByText(m.detail.dismiss)).toBeInTheDocument();
    await expect(within(sheet).getByText(m.detail.remove)).toBeInTheDocument();
    // duplicate section present (r-1 has 2 duplicates).
    await expect(
      within(sheet).getByText(m.duplicates.heading.replace("{count}", "2")),
    ).toBeInTheDocument();
  },
};

/** Non-principal viewer → Remove entry point is NOT rendered (AC-1928.1). */
export const NonPrincipalHidesRemove: Story = {
  args: { ...baseProps, viewerRole: "teacher" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
      }),
    );
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    await expect(within(sheet).getByText(m.detail.dismiss)).toBeInTheDocument();
    await expect(within(sheet).queryByText(m.detail.remove)).toBeNull();
  },
};

/** Detail 404 → inline error, no stale content rendered (AC-1925.4). */
export const DetailNotFound: Story = {
  args: {
    ...baseProps,
    getReportDetailAction: async () => ({
      ok: false,
      errorKey: "not-found",
      retryable: false,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
      }),
    );
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    await waitFor(() =>
      expect(
        within(sheet).getByText(m.errors["not-found"]),
      ).toBeInTheDocument(),
    );
    // No stale content section.
    await expect(within(sheet).queryByText(DETAIL.fullContent)).toBeNull();
  },
};

/**
 * HIGH-RISK — Remove 403: confirm dialog shows a DISTINCT forbidden error, NO
 * retry, confirm force-disabled, content NOT removed (AC-1928.6). Distinct from
 * the transient path.
 */
export const RemoveForbidden: Story = {
  args: {
    ...baseProps,
    removeContentAction: async (): Promise<RemoveContentActionResult> => ({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
      }),
    );
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    await userEvent.click(within(sheet).getByText(m.detail.remove));

    const alert = await body.findByRole("alertdialog");
    const confirm = within(alert).getByRole("button", {
      name: m.removeDialog.confirm,
    });
    await userEvent.click(confirm);

    // Distinct permissions error, no retry, confirm force-disabled.
    await waitFor(() =>
      expect(within(alert).getByRole("alert")).toHaveTextContent(
        m.errors.forbidden,
      ),
    );
    await expect(
      within(alert).queryByRole("button", {
        name: messages.Common.confirmDialog.retry,
      }),
    ).toBeNull();
    await expect(confirm).toBeDisabled();
  },
};

/**
 * HIGH-RISK — never-optimistic: while the remove promise is pending, the report
 * content is STILL shown (not removed), and the confirm button is aria-busy
 * (AC-1928.4). Uses a never-resolving remove action.
 */
export const RemoveNeverOptimistic: Story = {
  args: {
    ...baseProps,
    removeContentAction: () => new Promise<RemoveContentActionResult>(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
      }),
    );
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    await userEvent.click(within(sheet).getByText(m.detail.remove));
    const alert = await body.findByRole("alertdialog");
    const confirm = within(alert).getByRole("button", {
      name: m.removeDialog.confirm,
    });
    await userEvent.click(confirm);

    // Pending: confirm aria-busy; the queue row is STILL present (not removed).
    await waitFor(() => expect(confirm).toHaveAttribute("aria-busy", "true"));
    // Content NOT removed: the confirm dialog is still open (flow blocked at
    // pending, never proceeded to the removed state) and the queue row for r-1
    // is still in the DOM (aria-hidden under the modals, but not deleted from
    // the cache — no optimistic removal).
    await expect(body.getByRole("alertdialog")).toBeInTheDocument();
    // (table + card both carry the same aria-label; both still in the DOM.)
    await expect(
      body.getAllByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
        hidden: true,
      }).length,
    ).toBeGreaterThan(0);
  },
};

/** Audit tab (read-only) — entries render, no action controls in the subtree. */
export const AuditReadOnly: Story = {
  args: baseProps,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { query: { tab: "audit" } } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(m.audit.actionBadge.removed)).toBeInTheDocument(),
    );
    // Read-only: no dismiss/remove buttons anywhere in the audit subtree.
    await expect(canvas.queryByText(m.detail.remove)).toBeNull();
    await expect(canvas.queryByText(m.detail.dismiss)).toBeNull();
  },
};

/** Audit tab empty. */
export const AuditEmpty: Story = {
  args: {
    ...baseProps,
    getModerationAuditLogAction: async () => ({
      ok: true,
      data: { entries: [], nextCursor: null, hasMore: false },
    }),
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { query: { tab: "audit" } } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(m.audit.empty)).toBeInTheDocument(),
    );
  },
};
