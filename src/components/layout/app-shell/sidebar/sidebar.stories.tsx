import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, userEvent, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { withDarkTheme } from "@/test/storybook-dark-decorator";
import { Sidebar } from "./sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "Layout/Sidebar",
  component: Sidebar,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div style={{ height: "100vh" }}>
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const tenantId = "tenant-acme";

export const Teacher: Story = { args: { tenantId, role: "teacher" } };
export const Principal: Story = { args: { tenantId, role: "principal" } };
export const Student: Story = { args: { tenantId, role: "student" } };
export const Parent: Story = { args: { tenantId, role: "parent" } };

/** Collapsed rail (72px): icon-only, labels move into hover/focus tooltips. */
export const Collapsed: Story = {
  args: { tenantId, role: "teacher", collapsed: true, onToggle: () => {} },
};

/** Expanded with the collapse toggle rendered (footer control). */
export const WithToggle: Story = {
  args: { tenantId, role: "teacher", collapsed: false, onToggle: () => {} },
};

/**
 * US-E24.12 — no `helpHref` configured (no NEXT_PUBLIC_HELP_URL) ⇒ the help
 * entry must NOT render. There is no in-app guide page, and a link to nowhere
 * is worse than no link (dead-link precedent, 2026-08-02).
 */
export const WithoutHelpLink: Story = {
  args: { tenantId, role: "teacher", onToggle: () => {} },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole("link", { name: "Hướng dẫn sử dụng" }),
    ).not.toBeInTheDocument();
    // the collapse control is unaffected
    await expect(
      canvas.getByRole("button", { name: "Thu gọn thanh bên" }),
    ).toBeInTheDocument();
  },
};

/** Configured help URL → an external link above the collapse control. */
export const WithHelpLink: Story = {
  args: {
    tenantId,
    role: "teacher",
    onToggle: () => {},
    helpHref: "https://help.eduportal.vn",
  },
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", {
      name: "Hướng dẫn sử dụng",
    });
    await expect(link).toHaveAttribute("href", "https://help.eduportal.vn");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener");
    // both footer controls present ⇒ they are visually separated
    await expect(
      canvas.getByTestId("sidebar-footer-separator"),
    ).toBeInTheDocument();
  },
};

/**
 * Mobile Sheet case: the sidebar is rendered WITHOUT `onToggle` (there is
 * nothing to collapse), so the footer shows the help link alone — no collapse
 * button, and no separator dangling above nothing.
 */
export const HelpLinkWithoutToggle: Story = {
  args: { tenantId, role: "teacher", helpHref: "https://help.eduportal.vn" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: "Hướng dẫn sử dụng" }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /thanh bên/ }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByTestId("sidebar-footer-separator"),
    ).not.toBeInTheDocument();
  },
};

/** Collapsed rail: the help entry is icon-only, its label in a tooltip. */
export const CollapsedWithHelpLink: Story = {
  args: {
    tenantId,
    role: "teacher",
    collapsed: true,
    onToggle: () => {},
    helpHref: "https://help.eduportal.vn",
  },
  play: async ({ canvas }) => {
    const link = await canvas.findByRole("link", {
      name: "Hướng dẫn sử dụng",
    });
    await expect(link).toBeInTheDocument();
    await userEvent.hover(link);
    await expect(
      await within(document.body).findByRole("tooltip"),
    ).toHaveTextContent("Hướng dẫn sử dụng");
  },
};

/** Dark theme rendering of the sidebar chrome (US-E24.12 dark token pass). */
export const Dark: Story = {
  args: { tenantId, role: "teacher", onToggle: () => {} },
  globals: { theme: "dark" },
  decorators: [withDarkTheme],
};
