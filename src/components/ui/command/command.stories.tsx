import type { Meta, StoryObj } from "@storybook/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

const meta = {
  title: "UI/Command",
  component: Command,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className="w-72 rounded-lg border border-border">
      <CommandInput placeholder="Tìm kiếm…" />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
        <CommandGroup>
          <CommandItem value="a">Nguyễn Minh Khoa</CommandItem>
          <CommandItem value="b">Trần Quốc Bảo</CommandItem>
          <CommandItem value="c">Lê Thảo Vy</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
