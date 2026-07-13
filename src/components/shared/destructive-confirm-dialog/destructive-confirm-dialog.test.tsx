import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "@/bootstrap/i18n/messages/vi.json";
import {
  DestructiveConfirmDialog,
  DestructiveDialogActions,
} from "./destructive-confirm-dialog";

/**
 * The repo's Vitest runs in `node` env (no jsdom / @testing-library) and Radix
 * portals do not render server-side, so the dialog's portal content is not
 * reachable via renderToStaticMarkup. The loading/disabled/aria-busy/variant/
 * order contract (FR-003 / FR-004) is therefore proven here against the pure,
 * portal-free `DestructiveDialogActions` footer; role="alertdialog", focus trap,
 * Escape, and onConfirm/onCancel call-counts are proven in the Storybook
 * interaction stories (browser env).
 */
describe("DestructiveDialogActions (footer contract)", () => {
  const baseProps = {
    confirmLabel: "Xóa vi phạm",
    cancelLabel: "Huỷ",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("sets aria-busy='true' on the confirm button when loading", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading />,
    );
    expect(html).toContain('aria-busy="true"');
  });

  it("does not set aria-busy='true' on the confirm button when idle", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading={false} />,
    );
    expect(html).not.toContain('aria-busy="true"');
  });

  it("disables both buttons when loading", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading />,
    );
    // two <button> tags, both carrying the disabled attribute (attr form,
    // not the always-present `disabled:` utility classes)
    const buttons = html.match(/<button/g) ?? [];
    const disabledAttr = html.match(/disabled=""/g) ?? [];
    expect(buttons).toHaveLength(2);
    expect(disabledAttr).toHaveLength(2);
  });

  it("leaves both buttons interactive when idle", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading={false} />,
    );
    expect(html).not.toContain('disabled=""');
  });

  it("renders cancel (left) before confirm (right) in DOM order", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading={false} />,
    );
    expect(html.indexOf("Huỷ")).toBeLessThan(html.indexOf("Xóa vi phạm"));
  });

  it("renders the confirm button with the destructive variant", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading={false} />,
    );
    expect(html).toContain('data-variant="destructive"');
    expect(html).toContain('data-variant="outline"');
  });

  it("renders the provided confirm and cancel labels", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions {...baseProps} isLoading={false} />,
    );
    expect(html).toContain("Xóa vi phạm");
    expect(html).toContain("Huỷ");
  });

  // US-E19.2 — confirmDisabled force-disables ONLY confirm (cancel stays open).
  it("force-disables confirm (only) when confirmDisabled, leaving cancel enabled", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions
        {...baseProps}
        isLoading={false}
        confirmDisabled
      />,
    );
    // Exactly one disabled attr — the confirm button. Cancel remains interactive.
    const disabledAttr = html.match(/disabled=""/g) ?? [];
    expect(disabledAttr).toHaveLength(1);
    // The disabled one is the destructive (confirm) button.
    const destructiveIdx = html.indexOf('data-variant="destructive"');
    const outlineIdx = html.indexOf('data-variant="outline"');
    const disabledIdx = html.indexOf('disabled=""');
    // disabled attr sits within the destructive button's tag (after outline's).
    expect(disabledIdx).toBeGreaterThan(outlineIdx);
    expect(disabledIdx).toBeGreaterThan(destructiveIdx);
  });

  it("is NOT aria-busy when only confirmDisabled (forbidden ≠ loading)", () => {
    const html = renderToStaticMarkup(
      <DestructiveDialogActions
        {...baseProps}
        isLoading={false}
        confirmDisabled
      />,
    );
    expect(html).not.toContain('aria-busy="true"');
  });
});

describe("DestructiveConfirmDialog (closed state)", () => {
  it("renders nothing when open=false", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={messages}>
        <DestructiveConfirmDialog
          open={false}
          title="Xóa vi phạm?"
          body="Hành động này không thể hoàn tác."
          confirmLabel="Xóa vi phạm"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(html).toBe("");
  });
});
