import type {
  IAuthRepository,
  VoidResult,
} from "../repositories/i-auth.repository";

export class RequestPasswordResetUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(email: string): Promise<VoidResult> {
    if (!email.trim())
      return { error: { type: "unknown", message: "email-required" } };
    return this.repo.requestPasswordReset(email.trim());
  }
}
