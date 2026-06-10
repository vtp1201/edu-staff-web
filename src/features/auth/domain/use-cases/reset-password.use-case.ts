import type {
  IAuthRepository,
  VoidResult,
} from "../repositories/i-auth.repository";

const OTP_RE = /^[0-9]{6}$/;

export class ResetPasswordUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<VoidResult> {
    if (!OTP_RE.test(otp)) return { error: { type: "invalid-otp" } };
    if (newPassword.length < 8) {
      return { error: { type: "unknown", message: "password-too-short" } };
    }
    return this.repo.resetPassword(email.trim(), otp, newPassword);
  }
}
