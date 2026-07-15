/** Feed comment wire shape (INT-190-05, camelCase). */
export interface FeedCommentResponseDto {
  commentId: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatarInitials?: string;
  content: string;
  createdAt: string;
}
