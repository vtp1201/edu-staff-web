import { getLocale, getTranslations } from "next-intl/server";
import { AuthBrandPanel } from "@/components/shared/auth-brand-panel";
import { GoogleAuthWrapper } from "@/features/auth/presentation/login-form/google-auth-wrapper";
import { loginAction, socialSigninAction } from "./actions";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const locale = await getLocale();

  return (
    <div className="flex h-screen">
      <AuthBrandPanel title={t("brand.name")} tagline={t("brand.tagline")} />

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-100">
          <h1 className="mb-2 text-[26px] font-extrabold text-foreground">
            {t("login.title")}
          </h1>
          <p className="mb-6 text-[13.5px] text-muted-foreground">
            {t("login.subtitle")}
          </p>
          <GoogleAuthWrapper
            clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}
            action={loginAction}
            socialAction={socialSigninAction}
          />
          <a
            href={`/${locale}/forgot-password`}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("forgot.linkFromLogin")}
          </a>
        </div>
      </div>
    </div>
  );
}
