import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { addDays, subDays } from "date-fns";
import { Calendar } from "./calendar";

const meta: Meta<typeof Calendar> = {
  title: "UI/Calendar",
  component: Calendar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: "select",
      options: ["single", "multiple", "range"],
    },
    showOutsideDays: {
      control: "boolean",
    },
    captionLayout: {
      control: "select",
      options: ["label", "dropdown"],
    },
    buttonVariant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: {},
};

export const SingleDate: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

export const MultipleDates: Story = {
  render: () => {
    const [dates, setDates] = React.useState<Date[]>([]);

    return (
      <Calendar
        mode="multiple"
        selected={dates}
        onSelect={setDates}
        className="rounded-md border"
        required
      />
    );
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = React.useState<{
      from: Date | undefined;
      to: Date | undefined;
    }>({
      from: new Date(),
      to: addDays(new Date(), 7),
    });

    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={(value) => {
          setRange({
            from: value?.from,
            to: value?.to || undefined,
          });
        }}
        className="rounded-md border"
      />
    );
  },
};

export const WithDropdowns: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        captionLayout="dropdown"
        className="rounded-md border"
      />
    );
  },
};

export const HideOutsideDays: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        showOutsideDays={false}
        className="rounded-md border"
      />
    );
  },
};

export const WithWeekNumbers: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        showWeekNumber
        className="rounded-md border"
      />
    );
  },
};

export const DisabledDates: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={[
          new Date(),
          { dayOfWeek: [0, 6] }, // Disable weekends
          subDays(new Date(), 1), // Disable yesterday
        ]}
        className="rounded-md border"
      />
    );
  },
};

export const CustomButtonVariant: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        buttonVariant="outline"
        className="rounded-md border"
      />
    );
  },
};
