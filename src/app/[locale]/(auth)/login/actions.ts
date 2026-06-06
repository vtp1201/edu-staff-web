"use server";
import { redirect } from "next/navigation";
import { makeLoginUseCase, makeLogoutUseCase } from "@/bootstrap/di/auth.di";
import {
  clearAuthCookies,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import type { AuthFailure } from "@/features/auth/domain/failures/auth.failure";

const FAILURE_MESSAGES: Record<AuthFailure["type"], string> = {
  "invalid-credentials": "Email hoặc mật khẩu không đúng",
  "account-suspended": "Tài khoản đã bị tạm ngừng",
  "email-already-exists": "Email đã được đăng ký",
  "token-expired": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
  "invalid-token": "Phiên không hợp lệ, vui lòng đăng nhập lại",
  unauthorized: "Bạn không có quyền truy cập",
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
    return { error: FAILURE_MESSAGES[result.error.type] };
  }

  await setAuthCookies(result.data);

  const { roles } = result.data.user;
  redirect(roles.length === 1 ? `/${roles[0].role}` : "/select-role");
}

export async function logoutAction(): Promise<void> {
  const useCase = await makeLogoutUseCase();
  await useCase.execute(); // best-effort server revoke
  await clearAuthCookies();
  redirect("/login");
}
