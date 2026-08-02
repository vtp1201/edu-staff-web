/** IAM `UserProfileResponse` — `GET /users/me`. camelCase wire shape.
 *  The live IAM returns `userId`/`fullName` and NO roles (roles come from
 *  `GET /members/me/tenants`); older mocks/fixtures use `id`/`name`/`roles`.
 *  Both shapes are accepted — the mapper normalises. */
export interface UserProfileResponseDto {
  id?: string;
  userId?: string;
  email: string;
  name?: string;
  fullName?: string;
  avatar?: string | null;
  roles?: Array<{
    role: string;
    tenantId: string;
    tenantName: string;
    tenantCode?: string;
  }>;
  /** IAM `isEmailVerified` (openapi.yaml ~line 1386). Optional on the wire so
   *  older cached sessions that predate the field don't fail the mapper. */
  isEmailVerified?: boolean;
}
