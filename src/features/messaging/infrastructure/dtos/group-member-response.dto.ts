/** Wire shape for a group member (INT-002). All fields camelCase. */
export type GroupMemberResponseDto = {
  userId: string;
  name: string;
  initials: string;
  color: string;
  role: "admin" | "member";
  isOnline: boolean;
};
