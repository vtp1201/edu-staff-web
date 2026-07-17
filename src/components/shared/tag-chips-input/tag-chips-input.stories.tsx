import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { TagChipsInput } from "./tag-chips-input";

const LABELS = {
  placeholder: "Nhập thẻ, Enter để thêm…",
  inputAriaLabel: "Thẻ",
  maxTagsHelper: "Đã đạt số lượng thẻ tối đa.",
  tagTooLongError: "Thẻ quá dài.",
  removeAriaLabelOf: (tag: string) => `Xoá thẻ ${tag}`,
};

function Controlled(props: {
  initial?: string[];
  isLocked?: boolean;
  maxTags?: number;
  maxTagLength?: number;
}) {
  const [tags, setTags] = useState(props.initial ?? []);
  return (
    <div className="w-[360px]">
      <TagChipsInput
        tags={tags}
        onChange={setTags}
        isLocked={props.isLocked ?? false}
        maxTags={props.maxTags ?? 10}
        maxTagLength={props.maxTagLength ?? 50}
        labels={LABELS}
      />
    </div>
  );
}

const meta = {
  title: "Shared/TagChipsInput",
  component: TagChipsInput,
  parameters: { layout: "centered" },
  // Stories drive state via a Controlled wrapper (render); these defaults only
  // satisfy the required-prop types on Meta.
  args: {
    tags: [],
    onChange: () => {},
    isLocked: false,
    maxTags: 10,
    maxTagLength: 50,
    labels: LABELS,
  },
} satisfies Meta<typeof TagChipsInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByPlaceholderText(LABELS.placeholder),
    ).toBeInTheDocument();
  },
};

export const WithTags: Story = {
  render: () => <Controlled initial={["Toán", "Chương 1"]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Toán")).toBeInTheDocument();
    await expect(canvas.getByText("Chương 1")).toBeInTheDocument();
  },
};

/** Enter commits a new tag; the input clears afterward. */
export const AddTagOnEnter: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(LABELS.inputAriaLabel);
    await userEvent.type(input, "Đạo hàm{Enter}");
    await expect(canvas.getByText("Đạo hàm")).toBeInTheDocument();
    await expect(input).toHaveValue("");
  },
};

/** Duplicate tag is silently ignored — no error, no second chip. */
export const DuplicateIgnored: Story = {
  render: () => <Controlled initial={["Toán"]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(LABELS.inputAriaLabel);
    await userEvent.type(input, "Toán{Enter}");
    await expect(canvas.getAllByText("Toán")).toHaveLength(1);
  },
};

/** The (maxTags+1)th add is blocked with an inline helper. */
export const MaxTagsExceeded: Story = {
  render: () => <Controlled initial={["a", "b"]} maxTags={2} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(LABELS.inputAriaLabel);
    await userEvent.type(input, "c{Enter}");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      LABELS.maxTagsHelper,
    );
    await expect(canvas.queryByText("c")).toBeNull();
  },
};

/** A tag longer than maxTagLength shows an inline error and is not added. */
export const TagTooLong: Story = {
  render: () => <Controlled maxTagLength={3} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(LABELS.inputAriaLabel);
    await userEvent.type(input, "toolong{Enter}");
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      LABELS.tagTooLongError,
    );
    await expect(canvas.queryByText("toolong")).toBeNull();
  },
};

/** Remove button names its specific tag and removes only that chip. */
export const RemoveTag: Story = {
  render: () => <Controlled initial={["Toán", "Lý"]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Xoá thẻ Toán" }));
    await expect(canvas.queryByText("Toán")).toBeNull();
    await expect(canvas.getByText("Lý")).toBeInTheDocument();
  },
};

/** Locked: no input, no remove buttons — read-only chip display only. */
export const Locked: Story = {
  render: () => <Controlled initial={["Toán", "Lý"]} isLocked />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByLabelText(LABELS.inputAriaLabel)).toBeNull();
    await expect(
      canvas.queryByRole("button", { name: "Xoá thẻ Toán" }),
    ).toBeNull();
  },
};
