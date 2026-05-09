"use client";
import { useState, useTransition } from "react";
import type { LoginFormVM } from "./login-form.i-vm";

export function LoginForm({ isLoading, error, onSubmit }: LoginFormVM) {
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
        placeholder="Email"
        required
        className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm outline-none focus:border-[#5D87FF]"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mật khẩu"
        required
        className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm outline-none focus:border-[#5D87FF]"
      />
      {error && <p className="text-sm text-[#FA896B]">{error}</p>}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-[12px] bg-[#5D87FF] py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}

export function LoginFormContainer({
  action,
}: {
  action: (email: string, password: string) => Promise<{ error?: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(email: string, password: string) {
    startTransition(async () => {
      const result = await action(email, password);
      setError(result.error ?? null);
    });
  }

  return (
    <LoginForm isLoading={isPending} error={error} onSubmit={handleSubmit} />
  );
}
