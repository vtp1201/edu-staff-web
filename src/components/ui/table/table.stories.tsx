import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} as Meta<typeof Table>;

export default meta;
type Story = StoryObj<any>;

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
