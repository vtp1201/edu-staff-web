import { getLocale, getTranslations } from "next-intl/server";
import { LoginFormContainer } from "@/features/auth/presentation/login-form/login-form";
import { loginAction } from "./actions";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  const locale = await getLocale();

  return (
    <div className="flex h-screen">
      <div
        className="hidden w-[42%] flex-col items-center justify-center lg:flex"
        style={{
          background:
            "linear-gradient(150deg, var(--edu-primary) 0%, color-mix(in srgb, var(--edu-primary) 80%, transparent) 55%, color-mix(in srgb, var(--edu-success) 53%, transparent) 100%)",
        }}
      >
        <h1 className="text-3xl font-extrabold text-primary-foreground">
          {t("brand.name")}
        </h1>
        <p className="mt-2 text-sm text-primary-foreground/80">
          {t("brand.tagline")}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-100">
          <h2 className="mb-2 text-[26px] font-extrabold text-foreground">
            {t("login.title")}
          </h2>
          <p className="mb-6 text-[13.5px] text-muted-foreground">
            {t("login.subtitle")}
          </p>
          <LoginFormContainer action={loginAction} />
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
