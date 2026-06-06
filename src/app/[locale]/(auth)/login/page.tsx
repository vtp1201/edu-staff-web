import { getTranslations } from "next-intl/server";
import { LoginFormContainer } from "@/features/auth/presentation/login-form/login-form";
import { loginAction } from "./actions";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex h-screen">
      <div
        className="hidden w-[42%] flex-col items-center justify-center lg:flex"
        style={{
          background:
            "linear-gradient(150deg, #5D87FF 0%, #5D87FFCC 55%, #13DEB988 100%)",
        }}
      >
        <h1 className="text-3xl font-extrabold text-white">
          {t("brand.name")}
        </h1>
        <p className="mt-2 text-sm text-white/80">{t("brand.tagline")}</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-100">
          <h2 className="mb-2 text-[26px] font-extrabold text-[#2A3547]">
            {t("login.title")}
          </h2>
          <p className="mb-6 text-[13.5px] text-[#8898A9]">
            {t("login.subtitle")}
          </p>
          <LoginFormContainer action={loginAction} />
        </div>
      </div>
    </div>
  );
}
