import type {
  AuthSession,
  UserTenantRole,
} from "../../domain/entities/auth-user.entity";
import type { LoginResponseDto } from "../dtos/login-response.dto";

export function mapToSession(dto: LoginResponseDto): AuthSession {
  return {
    accessToken: dto.accessToken,
    user: {
      id: dto.user.id,
      email: dto.user.email,
      name: dto.user.name,
      avatar: dto.user.avatar,
      roles: dto.user.roles as UserTenantRole[],
    },
  };
}
