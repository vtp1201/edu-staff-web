import type {
  IAuthRepository,
  RefreshResult,
} from "../repositories/i-auth.repository";

export class RefreshSessionUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(refreshToken: string): Promise<RefreshResult> {
    if (!refreshToken.trim()) {
      return { error: { type: "invalid-token" } };
    }
    return this.repo.refresh(refreshToken);
  }
}
