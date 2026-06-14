/** IAM `UserProfileResponse` — `GET /users/me`. camelCase wire shape. */
export interface UserProfileResponseDto {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  roles: Array<{
    role: string;
    tenantId: string;
    tenantName: string;
    tenantCode?: string;
  }>;
}
