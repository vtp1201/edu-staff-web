import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  UserTenantRole,
} from "../../domain/entities/auth-user.entity";
import { appRoleOf } from "../../domain/entities/role-meta";
import type { TokenResponseDto } from "../dtos/token-response.dto";
import type { UserProfileResponseDto } from "../dtos/user-profile-response.dto";

export function mapTokens(dto: TokenResponseDto): AuthTokens {
  return {
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    sessionId: dto.sessionId,
  };
}

export function mapProfile(dto: UserProfileResponseDto): AuthUser {
  return {
    id: dto.id,
    email: dto.email,
    name: dto.name,
    avatar: dto.avatar,
    // Default false when absent — never assume verified for a legacy session.
    emailVerified: dto.isEmailVerified ?? false,
    roles: dto.roles.map(
      (r): UserTenantRole => ({
        // BE enum → appRole for routing; fall back defensively to "teacher" on
        // an unknown enum so a new BE role never hard-crashes login (ADR 0036).
        role: appRoleOf(r.role) ?? "teacher",
        roleEnum: r.role, // preserve the raw BE enum (ADR 0036)
        tenantId: r.tenantId,
        tenantName: r.tenantName,
        tenantCode: r.tenantCode,
      }),
    ),
  };
}

export function mapSession(
  tokens: TokenResponseDto,
  profile: UserProfileResponseDto,
): AuthSession {
  return { ...mapTokens(tokens), user: mapProfile(profile) };
}
