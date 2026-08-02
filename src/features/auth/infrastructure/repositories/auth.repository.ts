import "server-only";
import type { AxiosInstance } from "axios";
import { AUTH_EP } from "@/bootstrap/endpoint/auth.endpoint";
import {
  OAUTH_CLIENT_ID,
  TENANT_EP,
} from "@/bootstrap/endpoint/tenant.endpoint";
import type {
  AuthResult,
  IAuthRepository,
  ProfileResult,
  RefreshResult,
  VoidResult,
} from "../../domain/repositories/i-auth.repository";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import type { UserProfileResponseDto } from "../dtos/user-profile-response.dto";
import { mapProfile, mapSession, mapTokens } from "../mappers/auth.mapper";
import { mapAuthError } from "../mappers/auth-failure.mapper";

export class AuthRepository implements IAuthRepository {
  constructor(private readonly http: AxiosInstance) {}

  /** Live IAM's `/users/me` carries no roles — they live on
   *  `/members/me/tenants`. Merge them into the profile so the mapper builds
   *  a routable session. Skipped when the profile already embeds roles. */
  private async withRoles(
    profile: UserProfileResponseDto,
    accessToken?: string,
  ): Promise<UserProfileResponseDto> {
    if (profile.roles?.length) return profile;
    const memberships = (await this.http.get(TENANT_EP.myTenants, {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    })) as unknown as Array<{
      tenantId: string;
      roles: string[];
      status: string;
    }>;
    return {
      ...profile,
      roles: memberships.flatMap((m) =>
        m.roles.map((role) => ({
          role,
          tenantId: m.tenantId,
          // ponytail: membership summary carries no tenant name; fetch it if a screen needs it
          tenantName: m.tenantId,
        })),
      ),
    };
  }

  async signin(email: string, password: string): Promise<AuthResult> {
    try {
      // Interceptor unwraps the envelope → repo receives the payload directly.
      const tokens = (await this.http.post(AUTH_EP.signin, {
        email,
        password,
        clientId: OAUTH_CLIENT_ID,
      })) as unknown as TokenResponseDto;

      // TokenResponse has no profile → fetch identity with the fresh token.
      const profile = (await this.http.get(AUTH_EP.me, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })) as unknown as UserProfileResponseDto;

      return {
        data: mapSession(
          tokens,
          await this.withRoles(profile, tokens.accessToken),
        ),
      };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async socialSignin(
    provider: "google" | "vneid",
    token: string,
  ): Promise<AuthResult> {
    try {
      // Exchange the provider token for an IAM session (envelope unwrapped).
      const tokens = (await this.http.post(AUTH_EP.social, {
        provider,
        idToken: token,
        clientId: OAUTH_CLIENT_ID,
      })) as unknown as TokenResponseDto;

      const profile = (await this.http.get(AUTH_EP.me, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })) as unknown as UserProfileResponseDto;

      return {
        data: mapSession(
          tokens,
          await this.withRoles(profile, tokens.accessToken),
        ),
      };
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

  async requestPasswordReset(email: string): Promise<VoidResult> {
    // Enumeration-safe: BE always 200s. Only transport/422/429 surface as errors.
    try {
      await this.http.post(AUTH_EP.forgotPassword, { email });
      return { ok: true };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<VoidResult> {
    try {
      await this.http.post(AUTH_EP.resetPassword, { email, otp, newPassword });
      return { ok: true };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async getProfile(): Promise<ProfileResult> {
    try {
      // Interceptor unwraps the envelope → repo receives the payload directly.
      const profile = (await this.http.get(
        AUTH_EP.me,
      )) as unknown as UserProfileResponseDto;
      return { data: mapProfile(await this.withRoles(profile)) };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async requestEmailVerification(): Promise<VoidResult> {
    // 204 no body; idempotent when already verified (BE treats as success).
    try {
      await this.http.post(AUTH_EP.requestEmailVerification);
      return { ok: true };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }

  async confirmEmailVerification(otp: string): Promise<VoidResult> {
    // 204 no body; errors map via CODE_MAP (invalid-otp/otp-expired/too-many-requests).
    try {
      await this.http.post(AUTH_EP.confirmEmailVerification, { otp });
      return { ok: true };
    } catch (err: unknown) {
      return { error: mapAuthError(err) };
    }
  }
}
