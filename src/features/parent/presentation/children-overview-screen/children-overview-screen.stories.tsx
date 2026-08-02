import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { ChildrenOverviewScreen } from "./children-overview-screen";
import type {
  ChildOverviewCardVM,
  ChildrenOverviewFetchResult,
} from "./children-overview-screen.i-vm";

// ── Fixtures ────────────────────────────────────────────────────────────────

const BASE_PATH = "/t/tenant-acme/parent/children";

const CHILD_1: ChildOverviewCardVM = {
  studentId: "st-1",
  fullName: "Nguyễn Minh Khoa",
};

const CHILD_2: ChildOverviewCardVM = {
  studentId: "st-2",
  fullName: "Nguyễn Minh Anh",
};

const CHILD_3: ChildOverviewCardVM = {
  studentId: "st-3",
  fullName: "Nguyễn Gia Bảo",
};

const okFetch =
  (children: ChildOverviewCardVM[]) =>
  (): Promise<ChildrenOverviewFetchResult> =>
    Promise.resolve({ success: true, children });

const forbiddenFetch = (): Promise<ChildrenOverviewFetchResult> =>
  Promise.resolve({ success: false, errorKey: "forbidden" });

const networkErrorFetch = (): Promise<ChildrenOverviewFetchResult> =>
  Promise.resolve({ success: false, errorKey: "network-error" });

function withProviders(Story: () => React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="max-w-3xl p-6">
          <Story />
        </div>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof ChildrenOverviewScreen> = {
  title: "Parent/ChildrenOverviewScreen",
  component: ChildrenOverviewScreen,
  decorators: [withProviders],
  args: { basePath: BASE_PATH, onFetch: okFetch([CHILD_1, CHILD_2]) },
};
export default meta;
type Story = StoryObj<typeof ChildrenOverviewScreen>;

// ── Loading ─────────────────────────────────────────────────────────────────

export const Loading: Story = {
  args: { onFetch: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("status", { hidden: true }),
    ).toBeInTheDocument();
    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
  },
};

// ── AC-001 Success: real names, one card per child, no consent state ────────

export const SuccessMultipleChildren: Story = {
  args: { onFetch: okFetch([CHILD_1, CHILD_2, CHILD_3]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(3));

    // Real, server-resolved names — never an ordinal fallback on this screen.
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
    await expect(canvas.getByText("Nguyễn Minh Anh")).toBeInTheDocument();
    await expect(canvas.getByText("Nguyễn Gia Bảo")).toBeInTheDocument();
    await expect(canvas.queryByText(/Con thứ/i)).not.toBeInTheDocument();

    // AC-004: no consent affordance leaks onto the overview.
    await expect(canvas.queryAllByRole("switch")).toHaveLength(0);
    await expect(canvas.queryByText(/thông báo/i)).not.toBeInTheDocument();
  },
};

export const SuccessSingleChild: Story = {
  args: { onFetch: okFetch([CHILD_1]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(1));
    await expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument();
  },
};

// ── AC-003 Navigation target ────────────────────────────────────────────────

export const CardLinksToAcademicRecord: Story = {
  args: { onFetch: okFetch([CHILD_1, CHILD_2]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = await canvas.findByRole("link", {
      name: /Xem học bạ của Nguyễn Minh Khoa/i,
    });
    // Locale-prefixed by the next-intl Link; tenant prefix from the RSC page.
    await expect(link).toHaveAttribute(
      "href",
      `/vi${BASE_PATH}/st-1/academic-record`,
    );
    // AC-005: each card has a DISTINCT accessible name (not the repeated CTA).
    await expect(
      canvas.getByRole("link", { name: /Xem học bạ của Nguyễn Minh Anh/i }),
    ).toBeInTheDocument();
  },
};

// ── AC-005 Keyboard operability ─────────────────────────────────────────────

export const KeyboardReachesCard: Story = {
  args: { onFetch: okFetch([CHILD_1, CHILD_2]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(2));
    const [first, second] = canvas.getAllByRole("link");

    // Whole card = ONE tab stop; Tab moves card-to-card (no nested controls).
    await userEvent.tab();
    await expect(first).toHaveFocus();
    await userEvent.tab();
    await expect(second).toHaveFocus();
    // Native <a href> → Enter navigates; the href asserted above is the target.
    await expect(second).toHaveAttribute(
      "href",
      `/vi${BASE_PATH}/st-2/academic-record`,
    );
  },
};

// ── AC-002 Empty (zero linked children) ─────────────────────────────────────

export const EmptyNoChildren: Story = {
  args: { onFetch: okFetch([]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText(/chưa có con nào được liên kết/i),
      ).toBeInTheDocument(),
    );
    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
  },
};

// ── Error + retry (only a transport failure is retryable) ───────────────────

// Stateful fetch: the component's own mount consumes call #1 (fails), every
// call after succeeds — proves the retry button genuinely re-dispatches.
let errorWithRetryCalls = 0;
const errorThenSuccessFetch = (): Promise<ChildrenOverviewFetchResult> => {
  errorWithRetryCalls += 1;
  return errorWithRetryCalls === 1
    ? networkErrorFetch()
    : okFetch([CHILD_1, CHILD_2])();
};

export const ErrorWithRetry: Story = {
  args: { onFetch: errorThenSuccessFetch },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = await canvas.findByRole("button", { name: /thử lại/i });
    await expect(canvas.getByRole("alert")).toBeInTheDocument();
    // A transport failure must not render as "no children linked".
    await expect(
      canvas.queryByText(/chưa có con nào được liên kết/i),
    ).not.toBeInTheDocument();

    await userEvent.click(retryBtn);
    await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(2));
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

/**
 * A 403 scoping rejection: distinct, actionable copy and NO retry control at
 * all (omitted from the DOM, never merely disabled) — retrying can never fix
 * it. Still an alert, and still never a fake "no children linked" empty state.
 */
export const ForbiddenNoRetry: Story = {
  args: { onFetch: forbiddenFetch },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(
      within(alert).getByText(/không có quyền xem danh sách này/i),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /thử lại/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText(/chưa có con nào được liên kết/i),
    ).not.toBeInTheDocument();
    await expect(canvas.queryAllByRole("link")).toHaveLength(0);
  },
};
