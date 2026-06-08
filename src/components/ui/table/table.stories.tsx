import type { Meta, StoryObj } from "@storybook/react";
import { Table, TableBody, TableFooter, TableHeader } from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader></TableHeader>
      <TableBody>
        <p>Content</p>
      </TableBody>
      <TableFooter>
        <p className="text-sm text-muted-foreground">Footer</p>
      </TableFooter>
    </Table>
  ),
};
