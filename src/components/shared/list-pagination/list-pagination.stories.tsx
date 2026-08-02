import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ListPagination } from "./list-pagination";

/**
 * Canonical prev/next pager shared by the teacher roster screens (decision 0026).
 * Callers pass already-translated labels; the range arithmetic lives here.
 */
const meta = {
  title: "Shared/ListPagination",
  component: ListPagination,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    navLabel: "Phân trang danh sách học sinh",
    prevLabel: "Trang trước",
    nextLabel: "Trang sau",
    formatShowing: ({ from, to, total }) =>
      `Hiển thị ${from}–${to} trên ${total}`,
  },
} satisfies Meta<typeof ListPagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** First page: prev is disabled, next moves forward. */
export const FirstPage: Story = {
  args: {
    page: 1,
    totalPages: 3,
    total: 25,
    pageSize: 10,
    pageRowCount: 10,
    onPageChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Hiển thị 1–10 trên 25")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Trang trước" }),
    ).toBeDisabled();

    await userEvent.click(canvas.getByRole("button", { name: "Trang sau" }));
    await expect(args.onPageChange).toHaveBeenCalledWith(2);
  },
};

/** Last page: next is disabled, the range is short (pageRowCount < pageSize). */
export const LastPage: Story = {
  args: {
    page: 3,
    totalPages: 3,
    total: 25,
    pageSize: 10,
    pageRowCount: 5,
    onPageChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Hiển thị 21–25 trên 25")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Trang sau" }),
    ).toBeDisabled();

    await userEvent.click(canvas.getByRole("button", { name: "Trang trước" }));
    await expect(args.onPageChange).toHaveBeenCalledWith(2);
  },
};

/** A single page needs no pager at all — nothing is rendered. */
export const SinglePageRendersNothing: Story = {
  args: {
    page: 1,
    totalPages: 1,
    total: 4,
    pageSize: 10,
    pageRowCount: 4,
    onPageChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("navigation")).not.toBeInTheDocument();
  },
};
