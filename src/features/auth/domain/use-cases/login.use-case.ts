import type {
  AuthResult,
  IAuthRepository,
} from "../repositories/i-auth.repository";

export class LoginUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(email: string, password: string): Promise<AuthResult> {
    if (!email.trim() || !password) {
      return { error: { type: "invalid-credentials" } };
    }
    return this.repo.login(email, password);
  }
}
