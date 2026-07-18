import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import {
  expect,
  fn,
  userEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import type {
  SwitchTenantResult,
  TenantCardViewModel,
} from "./tenant-card.i-vm";
import { TenantSwitchDialog } from "./tenant-switch-dialog";

const memberships: TenantCardViewModel[] = [
  {
    tenantId: "tenant-acme",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THPT Chu Văn An",
    address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
    logoColor: "primary",
    isCurrent: true,
    isSwitchable: true,
  },
  {
    tenantId: "tenant-beta",
    roles: ["teacher"],
    status: "ACTIVE",
    tenantName: "THCS Nguyễn Du",
    address: "44 Hàng Quạt, Hoàn Kiếm, Hà Nội",
    logoColor: "purple",
    isCurrent: false,
    isSwitchable: true,
  },
];

function Harness({
  items = memberships,
  onSwitchTenant = async () => ({ ok: true }) as SwitchTenantResult,
}: {
  items?: TenantCardViewModel[];
  onSwitchTenant?: (
    tenantId: string,
    role: string,
  ) => Promise<SwitchTenantResult>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <button type="button" onClick={() => setOpen(true)}>
        Mở
      </button>
      <TenantSwitchDialog
        open={open}
        onOpenChange={setOpen}
        memberships={items}
        onSwitchTenant={onSwitchTenant}
      />
    </NextIntlClientProvider>
  );
}

const meta: Meta<typeof Harness> = {
  title: "Shared/TenantSwitchDialog",
  component: Harness,
  // Radix locks body pointer-events while a dialog/portal is open — reset so a
  // busy-and-left-open story doesn't bleed into the next one.
  decorators: [
    (Story) => {
      document.body.style.pointerEvents = "";
      return <Story />;
    },
  ],
};
export default meta;
type Story = StoryObj<typeof Harness>;

export const OpenCardList: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(within(dialog).getByText("Chọn trường")).toBeInTheDocument();
    // one <button> per membership + the close button
    await expect(within(dialog).getByText("THPT Chu Văn An")).toBeVisible();
    await expect(within(dialog).getByText("THCS Nguyễn Du")).toBeVisible();
    // current card carries the "Hiện tại" badge
    await expect(within(dialog).getByText("Hiện tại")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { items: [] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(
      within(dialog).getByText("Không có trường nào để chuyển"),
    ).toBeInTheDocument();
  },
};

export const ForbiddenInlineError: Story = {
  args: {
    onSwitchTenant: async () => ({ ok: false, errorKey: "forbidden" }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    // activate the non-current card
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Nguyễn Du/ }),
    );
    // inline card error appears; dialog stays open (no navigation)
    await expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
    await expect(dialog).toBeInTheDocument();
  },
};

/**
 * Idle-dismiss companion to DismissBlockedWhileBusy: with no switch in flight,
 * Escape MUST close the dialog. Uses waitForElementToBeRemoved because the
 * `motion-safe` close animation keeps the node in the DOM briefly after
 * `data-state` flips to "closed" (asserting absence synchronously here would
 * false-fail). US-E23.1 A11Y-001.
 */
export const DismissIdle: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitForElementToBeRemoved(() => body.queryByRole("dialog"));
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
  },
};

export const DismissBlockedWhileBusy: Story = {
  args: {
    // never-resolving switch keeps the card in its loading state
    onSwitchTenant: () => new Promise<never>(() => {}),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Nguyễn Du/ }),
    );
    // busy → Escape must NOT close the dialog (FR-006)
    await userEvent.keyboard("{Escape}");
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};

/**
 * Backdrop-click companion to `DismissIdle` (QA gap — Escape-only was tested,
 * never a real overlay pointerdown). Radix's `Dialog.Overlay` is the element
 * `onPointerDownOutside` fires from; clicking it directly (not Escape) must
 * dismiss when idle (AC-004.10/AC-005.1).
 */
export const DismissIdle_Backdrop: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    if (!overlay) throw new Error("dialog overlay not found");
    await userEvent.click(overlay);
    await waitForElementToBeRemoved(() => body.queryByRole("dialog"));
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
  },
};

/**
 * Backdrop-click companion to `DismissBlockedWhileBusy` (QA gap — only
 * Escape-while-busy was proven). Clicking the overlay while a card is mid-flow
 * must ALSO be blocked (AC-004.9), not just the keyboard path.
 */
export const DismissBlockedWhileBusy_Backdrop: Story = {
  args: {
    onSwitchTenant: () => new Promise<never>(() => {}),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Nguyễn Du/ }),
    );
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    if (!overlay) throw new Error("dialog overlay not found");
    await userEvent.click(overlay);
    await expect(body.getByRole("dialog")).toBeInTheDocument();
  },
};

/**
 * AC-004.5/FR-005 no-op on the current card (QA gap — no test previously
 * asserted zero network calls, only that nothing visibly broke). Activating
 * the "Hiện tại" card must NEVER invoke `onSwitchTenant` — asserted via a spy,
 * not merely "no toast/no crash".
 */
export const NoOpOnCurrentCard: Story = {
  args: {
    onSwitchTenant: fn(async () => ({ ok: true }) as SwitchTenantResult),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Chu Văn An/ }),
    );
    // no network call was made for the no-op activation
    await expect(args.onSwitchTenant).not.toHaveBeenCalled();
    // dialog stays open (FR-005: no navigation/close forced by a no-op)
    await expect(body.getByRole("dialog")).toBeInTheDocument();
    // no card ever entered a loading/error state as a side effect
    await expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
  },
};

/**
 * NFR-004 responsive — real 320/375px viewport (not the inert
 * `parameters.viewport`, addon-viewport isn't installed; resize via the
 * underlying Playwright page, same technique as
 * `email-verify-dialog.stories.tsx`/`detail-panel-header.stories.tsx`).
 *
 * DEFECT (fe-qa-playwright, US-E23.1 QA pass): both of these currently FAIL —
 * contradicts the design-review Evidence block's claim ("card layout is a
 * simple flex row … no fixed-width breakpoints to break at 320px"). Root
 * cause (confirmed via a throwaway diagnostic pass, not committed): the
 * shared `DialogContent` (`src/components/ui/dialog/dialog.tsx`) is a CSS
 * `grid` container; its direct children (`DialogHeader`, the card `<ul>`) are
 * grid items with NO `min-w-0`, so per CSS Grid's default `min-width: auto`
 * track sizing they refuse to shrink below their content's intrinsic
 * min-content width — the un-wrapped "name + role badge" row inside
 * `TenantCard` forces that intrinsic width to ~350px, wider than the dialog's
 * own shrunk box (`max-w-[calc(100%-2rem)]`: ~342px at 375px viewport, ~287px
 * at 320px) — producing 8px/63px of REAL horizontal overflow inside the
 * dialog (`scrollWidth` 350 vs `clientWidth` 342/287, measured empirically).
 * This is a `components/ui/dialog` primitive-level gap, not scoped to this
 * story's card content, so it likely affects other dialogs too. Fix belongs
 * to `fe-nextjs-engineer`/design-system owner: add `min-w-0` to
 * `DialogContent`'s grid item children (or make `DialogContent` itself
 * `overflow-x-hidden` + give the header/list `min-w-0`). NOT fixed here (QA
 * writes test code only) — kept as a red test per this repo's convention
 * (see `email-verify-dialog.stories.tsx` `Viewport320`).
 */
async function resizeTo(width: number) {
  const { page } = await import("vitest/browser");
  await page.viewport(width, 700);
}

async function assertNoOverflowAt(
  canvas: ReturnType<typeof within>,
  width: number,
) {
  await resizeTo(width);
  await waitFor(() => expect(window.innerWidth).toBe(width));
  await userEvent.click(canvas.getByRole("button", { name: "Mở" }));
  const body = within(document.body);
  const dialog = await body.findByRole("dialog");
  await expect(dialog).toBeInTheDocument();
  const content = dialog as HTMLElement;
  // No horizontal overflow inside the dialog itself.
  await waitFor(() =>
    expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth + 1),
  );
  const cards = within(dialog).getAllByRole("button", {
    name: /Chu Văn An|Nguyễn Du/,
  });
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    // card's right edge must stay inside the dialog's own right edge (no clipping)
    expect(rect.right).toBeLessThanOrEqual(
      content.getBoundingClientRect().right + 0.5,
    );
  }
  await resizeTo(1280);
}

export const Viewport375: Story = {
  play: async ({ canvas }) => {
    await assertNoOverflowAt(canvas, 375);
  },
};

export const Viewport320: Story = {
  play: async ({ canvas }) => {
    await assertNoOverflowAt(canvas, 320);
  },
};
