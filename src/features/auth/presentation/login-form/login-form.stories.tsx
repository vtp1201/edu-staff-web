import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, within } from "storybook/test";
import messages from "@/bootstrap/i18n/messages/vi.json";
import { LoginForm } from "./login-form";

// Story the presentational LoginForm directly (no GoogleOAuthProvider context),
// passing a no-op onGoogleSignin. The container wires the real Google hook.
const meta = {
  title: "Auth/LoginForm",
  component: LoginForm,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="vi" messages={messages}>
        <div className="w-100">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: {
    isLoading: false,
    isGoogleLoading: false,
    errorKey: null,
    onSubmit: () => {},
    onGoogleSignin: () => {},
  },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSSOButtons: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /Google/i })).toBeEnabled();
    // VNeID is disabled (ADR 0035) — aria-disabled, not a hard `disabled` attr.
    const vneid = canvas.getByRole("button", { name: /VNeID/i });
    await expect(vneid).toHaveAttribute("aria-disabled", "true");
  },
};

export const SSOGoogleLoading: Story = {
  args: { isGoogleLoading: true },
};

export const SSOError: Story = {
  args: { errorKey: "sso-unavailable" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toBeVisible();
  },
};
