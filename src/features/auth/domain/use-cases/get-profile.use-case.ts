import type {
  IAuthRepository,
  ProfileResult,
} from "../repositories/i-auth.repository";

/** Standalone `GET /users/me` — identity + verification status, no login flow. */
export class GetProfileUseCase {
  constructor(private readonly repo: IAuthRepository) {}

  async execute(): Promise<ProfileResult> {
    return this.repo.getProfile();
  }
}
