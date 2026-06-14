import type {
  AuthResult,
  IAuthRepository,
} from "../repositories/i-auth.repository";

export class SocialAuthUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(
    provider: "google" | "vneid",
    token: string,
  ): Promise<AuthResult> {
    // No provider token (e.g. Google client id not configured, or a cancelled
    // popup) → surface the same sso-unavailable key the presentation shows.
    if (!provider || !token.trim()) {
      return { error: { type: "sso-unavailable" } };
    }
    return this.repo.socialSignin(provider, token);
  }
}
