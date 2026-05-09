"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { makeLoginUseCase } from "@/bootstrap/di/auth.di";

const FAILURE_MESSAGES: Record<string, string> = {
  "invalid-credentials": "Email hoặc mật khẩu không đúng",
  "account-suspended": "Tài khoản đã bị tạm ngừng",
  "network-error": "Không thể kết nối đến máy chủ",
  unknown: "Có lỗi xảy ra, vui lòng thử lại",
};

export async function loginAction(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const useCase = await makeLoginUseCase();
  const result = await useCase.execute(email, password);

  if (result.error) {
    return {
      error: FAILURE_MESSAGES[result.error.type] ?? FAILURE_MESSAGES.unknown,
    };
  }

  const store = await cookies();
  store.set("auth_token", result.data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  const { roles } = result.data.user;
  redirect(roles.length === 1 ? `/${roles[0].role}` : "/select-role");
}
