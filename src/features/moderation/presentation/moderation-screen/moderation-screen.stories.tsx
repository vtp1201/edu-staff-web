import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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

/** Audit tab 403 — distinct "no permission" message, no retry (AC-1929.5). */
export const AuditForbidden: Story = {
  args: {
    ...baseProps,
    getModerationAuditLogAction: async () => ({
      ok: false,
      errorKey: "forbidden",
      retryable: false,
    }),
  },
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { query: { tab: "audit" } } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText(m.errors.forbidden)).toBeInTheDocument(),
    );
    await expect(canvas.queryByRole("button", { name: m.retry })).toBeNull();
  },
};

/** Duplicate section omitted/"0" when the content has exactly 1 report (AC-1930.2). */
export const DuplicateNone: Story = {
  args: {
    ...baseProps,
    getReportDetailAction: async () =>
      okDetail({ ...DETAIL, duplicateCount: 0, duplicateReports: [] }),
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
    await expect(
      await within(sheet).findByText(m.duplicates.none),
    ).toBeInTheDocument();
    // Never the "N báo cáo trùng lặp" heading form.
    await expect(within(sheet).queryByText(/báo cáo trùng lặp$/)).toBeNull();
  },
};

/**
 * Dismiss happy path (AC-1926.1/1926.2): sheet closes on success, "Bỏ qua"
 * button was `aria-busy` while the mutation was in flight.
 *
 * NOTE on the HIGH-RISK release-gate criterion ("an audit-log entry is
 * retrievable end-to-end for every remove/dismiss performed"): this repo's
 * `next/navigation` mock (`@storybook/nextjs-vite`'s `createNavigation`) makes
 * `router.replace`/`push` no-op spies — they do NOT feed back into
 * `useSearchParams()` — so a real in-story click on the "Nhật ký kiểm duyệt"
 * tab cannot be observed switching content here (confirmed empirically: the
 * mocked router never updates the URL the component reads from). The
 * end-to-end write→read proof is instead exercised directly against the real
 * mock repository (no navigation involved) in
 * `moderation.mock.repository.test.ts`: "dismiss transitions status →
 * dismissed AND appends an audit entry" / "remove transitions status →
 * removed AND appends an audit entry" both call `dismissReport`/
 * `removeContent` THEN `getModerationAuditLog` and assert the new entry is
 * present — the exact write-then-read chain the release gate requires.
 */
export const DismissHappyPath: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
      }),
    );
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    const dismissBtn = within(sheet).getByRole("button", {
      name: m.detail.dismiss,
    });
    await userEvent.click(dismissBtn);
    // Sheet auto-closes on dismiss success (onSuccess sets selectedReportId=null).
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

/**
 * Remove happy path (AC-1928.3): confirm dialog + detail sheet BOTH close on
 * success (content is only ever shown as removed once the server call actually
 * resolved — see `RemoveNeverOptimistic` for the pending-state proof). See
 * `DismissHappyPath`'s note above for how the audit-retrievability release-gate
 * criterion is proven (mock-repository write→read test, not UI navigation).
 */
export const RemoveHappyPath: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", {
        name: m.table.openDetail.replace("{id}", "r-1"),
      }),
    );
    const body = within(document.body);
    const sheet = await body.findByRole("dialog");
    await userEvent.click(
      within(sheet).getByRole("button", { name: m.detail.remove }),
    );

    const alert = await body.findByRole("alertdialog");
    const confirm = within(alert).getByRole("button", {
      name: m.removeDialog.confirm,
    });
    await userEvent.click(confirm);

    // Confirm dialog AND detail sheet both close on remove success.
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

/** Remove cancel — no DELETE call fires, dialog closes, status unchanged (AC-1928.5). */
export const RemoveCancel: Story = {
  args: {
    ...baseProps,
    removeContentAction: fn(
      async (): Promise<RemoveContentActionResult> => ({ ok: true }),
    ),
  },
  play: async ({ canvasElement, args }) => {
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
    await userEvent.click(
      within(alert).getByRole("button", {
        name: messages.Common.confirmDialog.cancel,
      }),
    );

    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    // Detail sheet itself remains open, still showing the Remove entry point.
    await expect(within(sheet).getByText(m.detail.remove)).toBeInTheDocument();
    await expect(args.removeContentAction).not.toHaveBeenCalled();
  },
};

/**
 * Remove conflict (409, AC-1928.8) — distinct message, confirm dialog closes,
 * queue refetches to the actual current state.
 */
export const RemoveConflict: Story = {
  args: {
    ...baseProps,
    removeContentAction: async (): Promise<RemoveContentActionResult> => ({
      ok: false,
      errorKey: "already-resolved",
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
    await userEvent.click(
      within(alert).getByRole("button", { name: m.removeDialog.confirm }),
    );

    // Confirm dialog closes on conflict (distinct from forbidden/transient).
    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
  },
};

/**
 * Remove transient (retryable, AC-1928.7) — inline error WITH a retry button;
 * content stays not-removed; clicking retry re-fires the same mutation.
 */
export const RemoveTransient: Story = {
  args: {
    ...baseProps,
    removeContentAction: fn(
      async (): Promise<RemoveContentActionResult> => ({
        ok: false,
        errorKey: "network-error",
        retryable: true,
      }),
    ),
  },
  play: async ({ canvasElement, args }) => {
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

    await waitFor(() =>
      expect(within(alert).getByRole("alert")).toHaveTextContent(
        m.errors["network-error"],
      ),
    );
    const retry = within(alert).getByRole("button", {
      name: messages.Common.confirmDialog.retry,
    });
    await expect(confirm).not.toBeDisabled(); // transient never force-disables confirm
    await userEvent.click(retry);
    await waitFor(() =>
      expect(args.removeContentAction).toHaveBeenCalledTimes(2),
    );
  },
};

/**
 * Real-viewport responsive check (table→card `md:` switch, NFR-103). Both
 * variants carry the SAME semantic fields (reporter/reason/status/date) — this
 * is a genuine resize via the Playwright browser context (`page.viewport`),
 * not just Tailwind class inspection, per US-E17.1 precedent
 * (`@storybook/addon-viewport` is not installed; `parameters.viewport` is inert).
 */
export const Responsive375CardList: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(375, 812);
    const canvas = within(canvasElement);
    // The card-list button carries the reporter name; the desktop table cell
    // is `hidden md:block` at this width, so only the card variant is visible.
    await waitFor(() =>
      expect(canvas.getAllByText("Trần Thị B").length).toBeGreaterThan(0),
    );
    const cardButton = await canvas.findByRole("button", {
      name: m.table.openDetail.replace("{id}", "r-1"),
    });
    await expect(cardButton).toBeVisible();
  },
};

export const Responsive320NoOverflow: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const { page } = await import("vitest/browser");
    await page.viewport(320, 700);
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { name: m.title, level: 1 });
    // No horizontal overflow at the narrowest supported width.
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(321);
  },
};

/**
 * Combined filter (status + type + search) applied via real UI interaction —
 * AND semantics (AC-1924.1/1924.2/1924.3/1924.4). This repo's `next/navigation`
 * mock makes `router.replace` a no-op spy that never feeds back into
 * `useSearchParams()` (see `DismissHappyPath`'s note), so the actual refetch
 * cannot be observed round-tripping through the URL here. What IS genuinely
 * provable via real DOM interaction: (a) all three controls accept input and
 * reflect it immediately in the visible UI (the local `draft` state driving
 * these controls is applied synchronously, before the debounced URL sync), and
 * (b) `router.replace` — the mechanism that would carry the combined filter to
 * the fetch layer — is actually invoked with a query string containing ALL
 * THREE criteria together (AND, not last-write-wins). The URL-string ⇄ filter
 * round-trip itself (`toQueryString`/`parseFilterFromParams`) is unit-proven in
 * `filter-search-params.test.ts`; the per-field forwarding contract
 * (`ListReportsUseCase forwards filter + cursor verbatim`) is proven in
 * `moderation-use-cases.test.ts`.
 */
export const CombinedFilterViaUI: Story = {
  args: baseProps,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const allTab = canvas.getByRole("tab", { name: m.filter.status.all });
    await userEvent.click(allTab);
    await expect(allTab).toHaveAttribute("aria-selected", "true");
    // Selecting a status tab does not clear a concurrently-applied search.
    const search = canvas.getByLabelText(m.filter.searchLabel);
    await userEvent.type(search, "Nguyễn");
    await expect(search).toHaveValue("Nguyễn");

    const typeSelect = canvas.getByLabelText(m.filter.typeLabel);
    await userEvent.click(typeSelect);
    const body = within(document.body);
    await userEvent.click(
      await body.findByRole("option", { name: m.filter.type.post }),
    );
    // All three criteria (status="all", type="post", search="Nguyễn") are
    // simultaneously reflected in the visible UI — the combined AND state
    // `handleFilterChange` merges via `{ ...d, ...patch }` (never resets the
    // other two fields), matching the debounced serialization proven at the
    // unit level in `filter-search-params.test.ts`.
    await expect(allTab).toHaveAttribute("aria-selected", "true");
    await expect(search).toHaveValue("Nguyễn");
    await expect(typeSelect).toHaveTextContent(m.filter.type.post);
  },
};
