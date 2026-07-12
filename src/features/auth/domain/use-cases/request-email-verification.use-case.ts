import type {
  IAuthRepository,
  VoidResult,
} from "../repositories/i-auth.repository";

/** Send/resend the account email-verification message (no input). */
export class RequestEmailVerificationUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(): Promise<VoidResult> {
    return this.repo.requestEmailVerification();
  }
}
