import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: [
        "text",
        "email",
        "password",
        "NumberTest",
        "tel",
        "url",
        "search",
        "date",
        "time",
        "file",
      ],
    },
    disabled: {
      control: "boolean",
    },
    placeholder: {
      control: "text",
    },
    required: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: "text",
    placeholder: "Enter text here...",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="input-with-label" className="text-sm font-medium">
        Email
      </label>
      <Input
        id="input-with-label"
        type="email"
        placeholder="name@example.com"
      />
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="input-with-error" className="text-sm font-medium">
        Password
      </label>
      <Input
        id="input-with-error"
        type="password"
        placeholder="Enter your password"
        aria-invalid="true"
        className="border-red-500"
      />
      <p className="text-sm text-red-500">
        Password must be at least 8 characters
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    type: "text",
    placeholder: "Disabled input",
    disabled: true,
  },
};

export const NumberTest: Story = {
  args: {
    type: "number",
    placeholder: "Enter a number",
    min: 0,
    max: 100,
  },
};

export const File: Story = {
  render: () => (
    <div className="space-y-2">
      <label htmlFor="file-input" className="text-sm font-medium">
        Upload file
      </label>
      <Input id="file-input" type="file" />
    </div>
  ),
};

export const Search: Story = {
  args: {
    type: "search",
    placeholder: "Search...",
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="relative">
      <Input type="text" placeholder="Search..." className="pl-10" />
      <svg
        role="img"
        tex
        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <title></title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <div>
        <label htmlFor="text" className="text-sm font-medium">
          Default
        </label>
        <Input type="text" placeholder="Default input" />
      </div>
      <div>
        <label htmlFor="text" className="text-sm font-medium">
          With success state
        </label>
        <Input
          type="text"
          placeholder="Success input"
          className="border-green-500"
          defaultValue="Valid input"
        />
      </div>
      <div>
        <label htmlFor="text" className="text-sm font-medium">
          With warning state
        </label>
        <Input
          type="text"
          placeholder="Warning input"
          className="border-yellow-500"
          defaultValue="Warning message"
        />
      </div>
    </div>
  ),
};
