import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { OtpInput } from "./otp-input";

function Controlled(props: {
  error?: boolean;
  disabled?: boolean;
  initial?: string;
}) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <div className="w-[340px]">
      <OtpInput
        value={value}
        onChange={setValue}
        error={props.error}
        disabled={props.disabled}
        describedById="otp-err"
        groupAriaLabel="Mã xác thực 6 chữ số"
        digitAriaLabel={(n) => `Chữ số thứ ${n}`}
      />
      {props.error && (
        <p id="otp-err" className="mt-2 text-sm text-edu-error-text">
          Mã không đúng.
        </p>
      )}
    </div>
  );
}

const meta = {
  title: "Shared/OtpInput",
  component: OtpInput,
  parameters: { layout: "centered" },
  // Stories drive value via a Controlled wrapper (render); these defaults only
  // satisfy the required-prop types on Meta.
  args: { value: "", onChange: () => {} },
} satisfies Meta<typeof OtpInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("group")).toHaveAttribute(
      "aria-label",
      "Mã xác thực 6 chữ số",
    );
    expect(canvas.getAllByRole("textbox")).toHaveLength(6);
  },
};

export const AutoAdvance: Story = {
  render: () => <Controlled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("textbox");
    await userEvent.click(cells[0]);
    await userEvent.keyboard("12");
    // Auto-advance moves focus forward as digits are entered.
    await expect(cells[0]).toHaveValue("1");
    await expect(cells[1]).toHaveValue("2");
  },
};

export const Filled: Story = {
  render: () => <Controlled initial="123456" />,
};

export const ErrorState: Story = {
  render: () => <Controlled initial="000000" error />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("textbox");
    await expect(cells[0]).toHaveAttribute("aria-invalid", "true");
  },
};

export const Disabled: Story = {
  render: () => <Controlled initial="123456" disabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const cell of canvas.getAllByRole("textbox")) {
      await expect(cell).toBeDisabled();
    }
  },
};
