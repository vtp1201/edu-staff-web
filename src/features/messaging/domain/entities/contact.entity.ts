/**
 * A directory contact selectable in the "new conversation" modal.
 * `color` is a semantic colour key (resolved to a token class in presentation).
 */
export type ContactEntity = {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  color: string;
  isOnline: boolean;
};
