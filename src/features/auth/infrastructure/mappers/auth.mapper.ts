import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  UserTenantRole,
} from "../../domain/entities/auth-user.entity";
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
    roles: dto.roles as UserTenantRole[],
  };
}

export function mapSession(
  tokens: TokenResponseDto,
  profile: UserProfileResponseDto,
): AuthSession {
  return { ...mapTokens(tokens), user: mapProfile(profile) };
}
