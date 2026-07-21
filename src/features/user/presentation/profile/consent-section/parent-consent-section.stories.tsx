import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, waitFor, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { Toaster } from "@/components/ui/sonner";
import { ParentConsentSection } from "./parent-consent-section";
import type {
  ParentConsentChildVM,
  ParentConsentFetchResult,
  ParentConsentToggleResult,
  UpdateConsentInput,
} from "./parent-consent-section.i-vm";

// ── Fixtures ────────────────────────────────────────────────────────────────

const CHILD_1: ParentConsentChildVM = {
  studentId: "st-1",
  fullName: "Nguyễn Minh Khoa",
  consent: { discipline: true, absence: true, grades: true },
};

const CHILD_2: ParentConsentChildVM = {
  studentId: "st-2",
  fullName: "Nguyễn Minh Anh",
  consent: { discipline: false, absence: false, grades: false },
};

const CHILD_3_PARTIAL: ParentConsentChildVM = {
  studentId: "st-3",
  fullName: "Nguyễn Gia Bảo",
  consent: { discipline: true, absence: false, grades: true },
};

/** Deterministic, documented toggle-failure id (matches the mock repository's
 *  own `st-consent-fail` seed convention) — not a hidden/random toggle. */
const CHILD_FAIL: ParentConsentChildVM = {
  studentId: "st-consent-fail",
  fullName: "Trần Bảo Ngọc",
  consent: { discipline: false, absence: false, grades: false },
};

/** AC-001.3 — consent not yet resolved for this child (pending sub-state). */
const CHILD_PENDING: ParentConsentChildVM = {
  studentId: "st-pending",
  fullName: "Lê Hải Đăng",
  consent: null,
};

const okFetch =
  (children: ParentConsentChildVM[]) => (): Promise<ParentConsentFetchResult> =>
    Promise.resolve({ success: true, children });

const errorFetch = (): Promise<ParentConsentFetchResult> =>
  Promise.resolve({ success: false, errorKey: "network-error" });

const okToggle = (
  input: UpdateConsentInput,
): Promise<ParentConsentToggleResult> => {
  if (input.studentId === "st-consent-fail") {
    return Promise.resolve({ success: false, errorKey: "validation" });
  }
  const consent = { discipline: false, absence: false, grades: false };
  consent[input.category] = input.enabled;
  return Promise.resolve({ success: true, consent });
};

function withProviders(Story: () => React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="max-w-md p-6">
          <Story />
        </div>
        <Toaster />
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof ParentConsentSection> = {
  title: "Profile/ParentConsentSection",
  component: ParentConsentSection,
  decorators: [withProviders],
  args: {
    onFetch: okFetch([CHILD_1]),
    onToggle: okToggle,
  },
};
export default meta;
type Story = StoryObj<typeof ParentConsentSection>;

// ── UC-001 Loading / Success ────────────────────────────────────────────────

export const Loading: Story = {
  args: { onFetch: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("status", { hidden: true })).toBeInTheDocument();
  },
};

export const SuccessOneChild: Story = {
  args: { onFetch: okFetch([CHILD_1]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument(),
    );
    expect(canvas.getAllByText(/đã liên kết/i)).toHaveLength(1);
    expect(canvas.getAllByRole("switch")).toHaveLength(3);
    // Privacy footnote visible whenever the section renders with >=1 child.
    expect(
      canvas.getByText(/nhà trường chỉ gửi thông báo khi bạn đồng ý/i),
    ).toBeInTheDocument();
  },
};

export const SuccessThreeChildren: Story = {
  args: { onFetch: okFetch([CHILD_1, CHILD_2, CHILD_3_PARTIAL]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getAllByText(/đã liên kết/i)).toHaveLength(3),
    );
    expect(canvas.getAllByRole("switch")).toHaveLength(9);
  },
};

// ── UC-001 alt: pending consent sub-state (AC-001.3) ───────────────────────

export const ToggleTogglesPendingSubState: Story = {
  args: { onFetch: okFetch([CHILD_PENDING]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByText("Lê Hải Đăng")).toBeInTheDocument(),
    );
    // No live Switch for a pending child — never a guessed on/off value.
    expect(canvas.queryAllByRole("switch")).toHaveLength(0);
  },
};

// ── UC-002 Empty ─────────────────────────────────────────────────────────────

export const Empty: Story = {
  args: { onFetch: okFetch([]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText(/chưa có con nào được liên kết/i),
      ).toBeInTheDocument(),
    );
  },
};

// ── UC-003 Error + retry ─────────────────────────────────────────────────────

// Retry re-issues the failed fetch(es) and transitions through loading →
// success on the new result (AC-003.3) — a stateful fetch fn (1st call —
// the initial mount's own query — fails, every call after succeeds) proves
// the retry button genuinely re-dispatches, not a no-op. NOT reset inside
// `play`: the component's own mount already consumes the 1st call before
// `play` ever runs, so resetting there would mis-count which call is "first".
let errorWithRetryCalls = 0;
const errorThenSuccessFetch = (): Promise<ParentConsentFetchResult> => {
  errorWithRetryCalls += 1;
  return errorWithRetryCalls === 1 ? errorFetch() : okFetch([CHILD_1])();
};

export const ErrorWithRetry: Story = {
  args: { onFetch: errorThenSuccessFetch },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryBtn = await canvas.findByRole("button", { name: /thử lại/i });
    expect(canvas.getByRole("alert")).toBeInTheDocument();

    await userEvent.click(retryBtn);
    await waitFor(() =>
      expect(canvas.getByText("Nguyễn Minh Khoa")).toBeInTheDocument(),
    );
    expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

// ── UC-004/005 Toggle on/off ─────────────────────────────────────────────────

export const ToggleOn: Story = {
  args: { onFetch: okFetch([CHILD_2]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switches = await waitFor(() => canvas.getAllByRole("switch"));
    expect(switches[2]).toHaveAttribute("aria-checked", "false");
    await userEvent.click(switches[2]);
    await waitFor(() =>
      expect(switches[2]).toHaveAttribute("aria-checked", "true"),
    );
    const body = within(document.body);
    await expect(
      await body.findByText(/đã cập nhật quyền nhận thông báo/i),
    ).toBeInTheDocument();
  },
};

export const ToggleOff: Story = {
  args: { onFetch: okFetch([CHILD_1]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switches = await waitFor(() => canvas.getAllByRole("switch"));
    expect(switches[2]).toHaveAttribute("aria-checked", "true");
    await userEvent.click(switches[2]);
    await waitFor(() =>
      expect(switches[2]).toHaveAttribute("aria-checked", "false"),
    );
    // Identical toast copy for on/off (FR-003) — same message asserted above.
    const body = within(document.body);
    await expect(
      await body.findByText(/đã cập nhật quyền nhận thông báo/i),
    ).toBeInTheDocument();
  },
};

// ── UC-006 Toggle-save failure (revert + error) ─────────────────────────────

export const ToggleFailureRevert: Story = {
  args: { onFetch: okFetch([CHILD_FAIL]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switches = await waitFor(() => canvas.getAllByRole("switch"));
    expect(switches[0]).toHaveAttribute("aria-checked", "false");
    await userEvent.click(switches[0]);
    // Reverts to the prior confirmed value — never left showing the failed
    // attempted state (AC-006.1).
    await waitFor(() =>
      expect(switches[0]).toHaveAttribute("aria-checked", "false"),
    );
    // Distinct inline error indication (AC-006.2), no success toast fired.
    expect(canvas.getByRole("alert")).toBeInTheDocument();
    const body = within(document.body);
    expect(
      body.queryByText(/đã cập nhật quyền nhận thông báo/i),
    ).not.toBeInTheDocument();
  },
};

// ── UC-007 Role-gate (VM-shape, not DOM-hide) ───────────────────────────────

export const NonParentRoleNoSection: Story = {
  render: () => {
    // AC-007.2 is a server-side VM-omission concern (ProfileScreenVM.parentConsent
    // is `undefined`, so `ParentConsentSection` is never even mounted by
    // `profile-screen.tsx`'s triple-gate — see profile-screen.stories.tsx and
    // consent-gate.test.ts for the VM-shape-level proof). Rendering NOTHING here
    // is the accurate representation of "never mounted for a non-parent role",
    // not a DOM query for absence within a mounted-but-hidden section.
    return (
      <p>
        See consent-gate.test.ts — ProfileScreenVM.parentConsent is absent for
        non-parent roles (server-side omission, not client-hidden DOM).
      </p>
    );
  },
};

// ── AC-004.3 Keyboard operability ───────────────────────────────────────────

export const KeyboardToggle: Story = {
  args: { onFetch: okFetch([CHILD_2]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const switches = await waitFor(() => canvas.getAllByRole("switch"));
    switches[0].focus();
    expect(switches[0]).toHaveAttribute("aria-checked", "false");
    await userEvent.keyboard(" ");
    await waitFor(() =>
      expect(switches[0]).toHaveAttribute("aria-checked", "true"),
    );
  },
};
