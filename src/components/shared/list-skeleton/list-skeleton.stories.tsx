import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "./list-skeleton";

/**
 * Canonical list-loading placeholder. Two variants cover the two structurally
 * distinct families found repo-wide (INFRA-shared-list-states):
 * `inline` (outer element itself is `role="status" aria-busy`) and `bordered`
 * (sr-only `role="status"` sibling + `aria-hidden` rows block).
 */
const meta = {
  title: "Shared/ListSkeleton",
  component: ListSkeleton,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ListSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The row shape SD/SA use (avatar + 2 text lines + trailing pill). */
const inlineRow = () => (
  <div data-testid="skeleton-row" className="flex items-center gap-4 p-5">
    <Skeleton className="size-10 shrink-0 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-3 w-full max-w-md" />
    </div>
    <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
  </div>
);

/** The row shape PL/Invitations use (flat table row, per-row bottom border). */
const borderedRow = () => (
  <div
    data-testid="skeleton-row"
    className="flex items-center gap-4 border-border border-b px-4 py-3.5 last:border-b-0"
  >
    <Skeleton className="h-4 w-48" />
    <Skeleton className="h-5 w-20 rounded-full" />
    <Skeleton className="ml-auto h-8 w-24" />
  </div>
);

export const Inline: Story = {
  args: {
    loadingAriaLabel: "Đang tải dữ liệu",
    rows: 4,
    variant: "inline",
    renderRow: inlineRow,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const container = canvas.getByRole("status");
    // The outer element itself carries the busy state (Family A).
    await expect(container).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByText("Đang tải dữ liệu")).toBeInTheDocument();
    await expect(
      canvasElement.querySelectorAll('[data-testid="skeleton-row"]'),
    ).toHaveLength(4);
    // Rows themselves are NOT aria-hidden in this variant.
    await expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  },
};

export const Bordered: Story = {
  args: {
    loadingAriaLabel: "Đang tải danh sách lời mời",
    rows: 5,
    variant: "bordered",
    renderRow: borderedRow,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Family B: the status node is a visually-hidden sibling, not the wrapper.
    const status = canvas.getByRole("status");
    await expect(status.tagName).toBe("SPAN");
    await expect(status).toHaveClass("sr-only");
    await expect(status).toHaveTextContent("Đang tải danh sách lời mời");
    await expect(status).not.toHaveAttribute("aria-busy");
    // The shimmer block is hidden from the a11y tree.
    const rowsBlock = canvasElement.querySelector('div[aria-hidden="true"]');
    await expect(rowsBlock).not.toBeNull();
    await expect(
      rowsBlock?.querySelectorAll('[data-testid="skeleton-row"]'),
    ).toHaveLength(5);
  },
};

/** Row count is caller-driven — the loop is the only thing the component owns. */
export const CustomRowCount: Story = {
  args: {
    loadingAriaLabel: "Đang tải dữ liệu",
    rows: 2,
    variant: "inline",
    renderRow: inlineRow,
  },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll('[data-testid="skeleton-row"]'),
    ).toHaveLength(2);
  },
};

/** `renderRow` receives the row index so callers can vary per-row content. */
export const RowIndexIsPassed: Story = {
  args: {
    loadingAriaLabel: "Đang tải dữ liệu",
    rows: 3,
    variant: "bordered",
    renderRow: (index: number) => (
      <div data-testid="skeleton-row">index-{index}</div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("index-0")).toBeInTheDocument();
    await expect(canvas.getByText("index-1")).toBeInTheDocument();
    await expect(canvas.getByText("index-2")).toBeInTheDocument();
  },
};

/** `className` merges onto the outer wrapper (per-screen padding overrides). */
export const CustomClassName: Story = {
  args: {
    loadingAriaLabel: "Đang tải dữ liệu",
    rows: 1,
    variant: "bordered",
    renderRow: borderedRow,
    className: "p-4",
  },
  play: async ({ canvasElement }) => {
    const wrapper = canvasElement.querySelector(".rounded-xl");
    await expect(wrapper).toHaveClass("p-4");
  },
};
