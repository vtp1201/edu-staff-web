"use client";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";
import type { LoginFormVM } from "./login-form.i-vm";

export function LoginForm({ isLoading, errorKey, onSubmit }: LoginFormVM) {
  const t = useTranslations("auth.login");
  const tErrors = useTranslations("auth.errors");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(email, password);
      }}
      className="flex flex-col gap-4"
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("email")}
        required
        className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm outline-none focus:border-[#5D87FF]"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("password")}
        required
        className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm outline-none focus:border-[#5D87FF]"
      />
      {errorKey && (
        <p className="text-sm text-[#FA896B]">{tErrors(errorKey)}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-[12px] bg-[#5D87FF] py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {isLoading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

export function LoginFormContainer({
  action,
}: {
  action: (
    email: string,
    password: string,
  ) => Promise<{ errorKey?: AuthFailure["type"] }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<AuthFailure["type"] | null>(null);

  function handleSubmit(email: string, password: string) {
    startTransition(async () => {
      const result = await action(email, password);
      setErrorKey(result.errorKey ?? null);
    });
  }

  return (
    <LoginForm
      isLoading={isPending}
      errorKey={errorKey}
      onSubmit={handleSubmit}
    />
  );
}
