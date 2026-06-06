import type { IAuthRepository } from "../repositories/i-auth.repository";

export class LogoutUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(): Promise<void> {
    await this.repo.signout();
  }
}
