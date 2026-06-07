import "server-only";
import type { AxiosInstance } from "axios";
import { AUTH_EP } from "@/bootstrap/endpoint/auth.endpoint";
import type {
  AuthResult,
  IAuthRepository,
  RefreshResult,
} from "../../domain/repositories/i-auth.repository";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import type { UserProfileResponseDto } from "../dtos/user-profile-response.dto";
import { mapSession, mapTokens } from "../mappers/auth.mapper";
import { mapAuthError } from "../mappers/auth-failure.mapper";

export class AuthRepository implements IAuthRepository {
  constructor(private readonly http: AxiosInstance) {}

  async signin(email: string, password: string): Promise<AuthResult> {
    try {
      // Interceptor unwraps the envelope → repo receives the payload directly.
      const tokens = (await this.http.post(AUTH_EP.signin, {
        email,
        password,
      })) as unknown as TokenResponseDto;

      // TokenResponse has no profile → fetch identity with the fresh token.
      const profile = (await this.http.get(AUTH_EP.me, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })) as unknown as UserProfileResponseDto;

      return { data: mapSession(tokens, profile) };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    try {
      const tokens = (await this.http.post(AUTH_EP.refresh, {
        refreshToken,
      })) as unknown as TokenResponseDto;
      return { data: mapTokens(tokens) };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async signout(): Promise<void> {
    // Best-effort revoke; local cookie clear (caller) must always proceed.
    try {
      await this.http.post(AUTH_EP.signout);
    } catch {
      // session may already be gone / network down — ignore.
    }
  }
}
