import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { EmailVerificationActionResult } from "@/app/[locale]/t/[tenant]/(app)/email-verification.actions";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { EmailVerifyProvider } from "./email-verify-context";
import { EmailVerifyDialog } from "./email-verify-dialog";

const EMAIL = "nguyen.huong@email.com";

type Args = {
  onConfirm?: (otp: string) => Promise<EmailVerificationActionResult>;
  onResend?: () => Promise<EmailVerificationActionResult>;
};

function Harness({ onConfirm, onResend }: Args) {
  const [open, setOpen] = useState(true);
  return (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <EmailVerifyProvider initialEmailVerified={false} email={EMAIL}>
        <EmailVerifyDialog
          open={open}
          onOpenChange={setOpen}
          onConfirm={onConfirm}
          onResend={onResend}
        />
      </EmailVerifyProvider>
    </NextIntlClientProvider>
  );
}

const meta = {
  title: "Auth/EmailVerifyDialog",
  render: (args: Args) => <Harness {...args} />,
  parameters: { layout: "fullscreen" },
  args: {
    onConfirm: (): Promise<EmailVerificationActionResult> =>
      Promise.resolve({ ok: true }),
    onResend: (): Promise<EmailVerificationActionResult> =>
      Promise.resolve({ ok: true }),
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

async function typeCode(code: string) {
  const dialog = within(document.body).getByRole("dialog");
  const cells = within(dialog).getAllByRole("textbox");
  await userEvent.click(cells[0]);
  await userEvent.keyboard(code);
}

async function confirm() {
  const dialog = within(document.body).getByRole("dialog");
  await userEvent.click(
    within(dialog).getByRole("button", { name: /^xác nhận$/i }),
  );
}

export const Idle: Story = {
  play: async () => {
    const dialog = within(document.body).getByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    // Confirm is disabled until 6 digits are entered.
    await expect(
      within(dialog).getByRole("button", { name: /^xác nhận$/i }),
    ).toBeDisabled();
    expect(within(dialog).getAllByRole("textbox")).toHaveLength(6);
  },
};

export const WrongCode: Story = {
  args: { onConfirm: () => Promise.resolve({ errorKey: "invalid-otp" }) },
  play: async () => {
    await typeCode("111111");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /mã không đúng/i,
      ),
    );
    // Cells stay editable (not disabled) after a wrong code.
    await expect(within(dialog).getAllByRole("textbox")[0]).toBeEnabled();
  },
};

export const ExpiredCode: Story = {
  args: { onConfirm: () => Promise.resolve({ errorKey: "otp-expired" }) },
  play: async () => {
    await typeCode("000000");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /mã đã hết hạn/i,
      ),
    );
  },
};

export const Lockout: Story = {
  args: {
    onConfirm: () => Promise.resolve({ errorKey: "too-many-requests" }),
  },
  play: async () => {
    await typeCode("222222");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /quá số lần cho phép/i,
      ),
    );
    // Cells are disabled until a new code is requested (AC-006.2).
    await expect(within(dialog).getAllByRole("textbox")[0]).toBeDisabled();
  },
};

export const Success: Story = {
  args: { onConfirm: () => Promise.resolve({ ok: true }) },
  play: async () => {
    await typeCode("123456");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByText(/email đã được xác thực/i)).toBeVisible(),
    );
  },
};

// ── Gap coverage (fe-qa-playwright, US-E22.1 QA pass) ──────────────────────

export const WrongCodeKeepsDigits: Story = {
  // AC-004.2: cells stay editable AND the submitted digits are NOT cleared.
  args: { onConfirm: () => Promise.resolve({ errorKey: "invalid-otp" }) },
  play: async () => {
    await typeCode("111111");
    await confirm();
    const dialog = within(document.body).getByRole("dialog");
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        /mã không đúng/i,
      ),
    );
    for (const cell of within(dialog).getAllByRole("textbox")) {
      await expect(cell).toHaveValue("1");
    }
  },
};

/** Real trigger (not `open` pre-set) so we can assert focus-return on close —
 * regression coverage for A11Y-002 (`e.currentTarget.focus()` on the CTA). */
function TriggerHarness({ onConfirm, onResend }: Args) {
  const [open, setOpen] = useState(false);
  return (
    <NextIntlClientProvider locale="vi" messages={messages}>
      <EmailVerifyProvider initialEmailVerified={false} email={EMAIL}>
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.focus();
            setOpen(true);
          }}
        >
          Xác thực ngay
        </button>
        <EmailVerifyDialog
          open={open}
          onOpenChange={setOpen}
          onConfirm={onConfirm}
          onResend={onResend}
        />
      </EmailVerifyProvider>
    </NextIntlClientProvider>
  );
}

export const KeyboardWalkthrough: Story = {
  render: (args: Args) => <TriggerHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /xác thực ngay/i });
    await userEvent.click(trigger);

    const dialog = within(document.body).getByRole("dialog");
    const cells = within(dialog).getAllByRole("textbox");

    // Auto-advance: typing a digit moves focus to the next (empty) cell.
    await userEvent.click(cells[0]);
    await userEvent.keyboard("1");
    await expect(cells[1]).toHaveFocus();

    // Backspace on an EMPTY cell moves focus back to the previous cell
    // (does not delete cell[0]'s already-entered digit).
    await userEvent.keyboard("{Backspace}");
    await expect(cells[0]).toHaveFocus();
    await expect(cells[0]).toHaveValue("1");

    // Resume entry from cell 1 (cell 0 is already filled — maxLength=1 blocks
    // further typing there) and finish all 6 digits via auto-advance.
    await userEvent.click(cells[1]);
    await userEvent.keyboard("23456");
    await expect(cells[5]).toHaveValue("6");

    // AC-003.6: Confirm + Resend are reachable via Tab from the last OTP
    // cell, in DOM order (Resend control, then Confirm).
    await userEvent.tab();
    await expect(
      within(dialog).getByRole("button", { name: /gửi lại mã/i }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(
      within(dialog).getByRole("button", { name: /^xác nhận$/i }),
    ).toHaveFocus();

    // AC-003.5 / UC-003 step 9: Escape closes without submitting; focus
    // MUST return to the control that opened the dialog.
    //
    // DEFECT (fe-qa-playwright, US-E22.1 QA pass — see QA report): this
    // currently FAILS. Radix's `DialogContentModal` unconditionally calls
    // `event.preventDefault()` in its `onCloseAutoFocus` handler and then
    // focuses `context.triggerRef.current` — a ref that Radix only populates
    // via `<DialogTrigger>`. `EmailVerifyDialog` is opened via a plain
    // `<button onClick={() => setOpen(true)}>` (no `<DialogTrigger>`, both in
    // this harness and in the real callers — `profile-screen.tsx`'s
    // `EmailField` CTA, and the banner's entry point), so `triggerRef.current`
    // is always `null` and focus lands on `<body>` on every close path
    // (Escape, "Hoàn tất", the dialog's own X). The A11Y-002 fix
    // (`e.currentTarget.focus()` before `onVerifyNow()`) addresses a
    // DIFFERENT problem (Safari/Firefox not focusing a clicked <button>) and
    // does not fix this — Radix ignores whatever was focused before open and
    // always defers to `triggerRef`. Root-cause fix belongs to
    // `fe-nextjs-engineer`: wrap the invoking control in `<DialogTrigger
    // asChild>` (needs `Dialog`/`DialogTrigger` composition instead of
    // controlled `open`/`onOpenChange` from a plain button), or add an
    // explicit `onCloseAutoFocus` override on `EmailVerifyDialog`'s
    // `DialogContent` that manually restores focus to the invoking element.
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        within(document.body).queryByRole("dialog"),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

// `@storybook/addon-viewport` is NOT installed in this repo (see
// `.storybook/main.ts`), so `parameters.viewport` is INERT decoration — it
// does not resize anything in the `vitest --config vitest.storybook.mts`
// browser runner (default Playwright chromium viewport is 1280x720). To get
// REAL proof of AC-003.7 (320px), resize via the underlying
// `@vitest/browser-playwright` context's `page.viewport()` before asserting
// (same technique as `detail-panel-header.stories.tsx`, US-E17.9).
async function resizeTo320() {
  const { page } = await import("vitest/browser");
  await page.viewport(320, 700);
}

export const Viewport320: Story = {
  // AC-003.7: 320px viewport — no horizontal scroll / cell overlap.
  //
  // DEFECT (fe-qa-playwright, US-E22.1 QA pass — see QA report): this
  // currently FAILS. At a real 320px viewport (resized via `page.viewport`,
  // not the inert `parameters.viewport`), the dialog box itself fits
  // (~305px, within the `max-w-[calc(100%-2rem)]` budget), but the 6
  // fixed-width OTP cells (`w-11.5` = 46px each + `gap-2` between, ~301px
  // total) do NOT fit inside the dialog's ~270px content area (318px
  // clientWidth minus 2×24px `p-6` padding) — `scrollWidth` (340) exceeds
  // `clientWidth` (318) and the last cell's right edge (x≈332) overflows
  // past the dialog's own right edge (x≈312). `OtpInput`'s cells never
  // shrink (no `flex-1`/`min-w-0` on the cells, no narrower-viewport
  // variant), so the row cannot compress below its natural ~301px. Root-cause
  // fix belongs to `fe-nextjs-engineer`/design-system owner: shrink cell
  // width/gap at narrow viewports, or let the OTP group scroll horizontally
  // within its own bounds instead of pushing the dialog's box out.
  play: async () => {
    await resizeTo320();
    // Give layout a tick to settle after the real resize before measuring.
    await waitFor(() => expect(window.innerWidth).toBe(320));
    const dialog = within(document.body).getByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    const content = dialog as HTMLElement;
    // No horizontal overflow: scrollWidth must not exceed the dialog's own
    // rendered (client) width.
    await waitFor(() =>
      expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth),
    );
    const cells = within(dialog).getAllByRole("textbox");
    const rects = cells.map((c) => c.getBoundingClientRect());
    for (let i = 1; i < rects.length; i++) {
      // Each cell starts at/after the previous cell's right edge (no overlap).
      expect(rects[i].left).toBeGreaterThanOrEqual(rects[i - 1].right - 0.5);
    }
  },
};
