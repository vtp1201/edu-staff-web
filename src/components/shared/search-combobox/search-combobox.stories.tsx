import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  SearchCombobox,
  type SearchComboboxCandidate,
  type SearchComboboxStatus,
} from "./search-combobox";

const CANDIDATES: SearchComboboxCandidate[] = [
  {
    id: "st1",
    primaryLabel: "Nguyễn Minh Khoa",
    subLabel: "Lớp 11A2",
    avatarInitials: "NK",
  },
  {
    id: "st2",
    primaryLabel: "Trần Quốc Bảo",
    subLabel: "Lớp 11A2",
    avatarInitials: "QB",
  },
  {
    id: "st3",
    primaryLabel: "Lê Thảo Vy",
    subLabel: "Lớp 10C3",
    avatarInitials: "TV",
  },
];

const LABELS = {
  label: "Học sinh",
  placeholder: "Tìm theo tên học sinh…",
  emptyMessage: "Không tìm thấy kết quả.",
  loadingMessage: "Đang tìm…",
  clearSelectionAriaLabel: "Bỏ chọn",
  listboxAriaLabel: "Kết quả tìm học sinh",
  retryLabel: "Thử lại",
};

function Harness({
  status = "success",
  initialCandidates = CANDIDATES,
}: {
  status?: SearchComboboxStatus;
  initialCandidates?: SearchComboboxCandidate[];
}) {
  const [value, setValue] = useState<SearchComboboxCandidate | null>(null);
  const [query, setQuery] = useState("");
  return (
    <div className="w-80 bg-background p-4">
      <SearchCombobox
        {...LABELS}
        value={value}
        onValueChange={setValue}
        query={query}
        onQueryChange={setQuery}
        candidates={initialCandidates}
        status={status}
      />
    </div>
  );
}

const meta: Meta<typeof SearchCombobox> = {
  title: "Shared/SearchCombobox",
  component: SearchCombobox,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof SearchCombobox>;

export const Success: Story = {
  render: () => <Harness status="success" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Học sinh" }));
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Nguyễn Minh Khoa")).toBeInTheDocument(),
    );
  },
};

export const KeyboardSelect: Story = {
  render: () => <Harness status="success" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Open with keyboard, arrow-navigate, Enter to select — no mouse (AC-003.8).
    const trigger = canvas.getByRole("button", { name: "Học sinh" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Trần Quốc Bảo")).toBeInTheDocument(),
    );
    await userEvent.keyboard("{ArrowDown}{Enter}");
    // A selection renders the chip with its clear button.
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Bỏ chọn" }),
      ).toBeInTheDocument(),
    );
    // Focus must land on the clear button after keyboard selection — the cmdk
    // input + trigger both unmount, so without an explicit move focus falls to
    // <body> (A11Y-003).
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Bỏ chọn" })).toHaveFocus(),
    );
  },
};

export const Loading: Story = {
  render: () => <Harness status="loading" initialCandidates={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Học sinh" }));
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Đang tìm…")).toBeInTheDocument(),
    );
  },
};

export const Empty: Story = {
  render: () => <Harness status="success" initialCandidates={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Học sinh" }));
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Không tìm thấy kết quả.")).toBeInTheDocument(),
    );
  },
};

export const ErrorState: Story = {
  render: () => (
    <div className="w-80 bg-background p-4">
      <SearchCombobox
        {...LABELS}
        value={null}
        onValueChange={() => {}}
        query="kh"
        onQueryChange={() => {}}
        candidates={[]}
        status="error"
        errorMessage="Không tải được danh sách."
        onRetry={() => {}}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Học sinh" }));
    const body = within(document.body);
    await waitFor(() =>
      expect(body.getByText("Không tải được danh sách.")).toBeInTheDocument(),
    );
    await expect(
      body.getByRole("button", { name: "Thử lại" }),
    ).toBeInTheDocument();
  },
};
