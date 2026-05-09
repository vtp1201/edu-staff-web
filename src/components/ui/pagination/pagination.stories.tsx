import type { Meta, StoryObj } from "@storybook/react";
import { Pagination, PaginationContent, PaginationItem } from "./pagination";

const meta = {
  title: "UI/Pagination",
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem value="item-1">Item 1</PaginationItem>
        <PaginationItem value="item-2">Item 2</PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
