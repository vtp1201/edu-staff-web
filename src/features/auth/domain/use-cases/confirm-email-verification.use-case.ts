import type {
  IAuthRepository,
  VoidResult,
} from "../repositories/i-auth.repository";

const OTP_RE = /^[0-9]{6}$/;

/** Confirm the account email with a 6-digit OTP. Guards format before the call. */
export class ConfirmEmailVerificationUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(otp: string): Promise<VoidResult> {
    if (!OTP_RE.test(otp)) return { error: { type: "invalid-otp" } };
    return this.repo.confirmEmailVerification(otp);
  }
}
