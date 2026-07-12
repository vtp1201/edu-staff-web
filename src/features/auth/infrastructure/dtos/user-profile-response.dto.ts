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
  /** IAM `isEmailVerified` (openapi.yaml ~line 1386). Optional on the wire so
   *  older cached sessions that predate the field don't fail the mapper. */
  isEmailVerified?: boolean;
}
