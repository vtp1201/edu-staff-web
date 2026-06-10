import { getLocale } from "next-intl/server";
import { ForgotPassword } from "@/features/auth/presentation/forgot-password/forgot-password";
import { forgotPasswordAction, resetPasswordAction } from "./actions";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <ForgotPassword
        onRequest={forgotPasswordAction}
        onReset={resetPasswordAction}
        loginHref={`/${locale}/login`}
      />
    </div>
  );
}
