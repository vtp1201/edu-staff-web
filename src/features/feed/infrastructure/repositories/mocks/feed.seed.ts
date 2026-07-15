import type { FeedCommentEntity } from "../../../domain/entities/feed-comment.entity";
import type { FeedPostEntity } from "../../../domain/entities/feed-post.entity";
import { emptyReactionCounts } from "../../../domain/entities/reaction.entity";

/**
 * In-memory feed fixtures (US-E19.1 mock-first, decision 0014). This is MOCK
 * DATA (names/subjects), not UI copy — not i18n (i18n.md). Adapted from
 * design_src/edu/feed.jsx.
 */
function post(p: Partial<FeedPostEntity> & { postId: string }): FeedPostEntity {
  return {
    authorId: "u-principal",
    authorName: "Trần Minh Quân",
    authorRole: "principal",
    authorAvatarInitials: "TQ",
    scope: "school",
    content: "",
    attachments: [],
    createdAt: "2026-07-11T09:15:00.000Z",
    pinned: false,
    reactions: { counts: emptyReactionCounts(), myReaction: null },
    commentCount: 0,
    ...p,
  };
}

export function seedPosts(): FeedPostEntity[] {
  return [
    post({
      postId: "p1",
      pinned: true,
      content:
        "Kỷ niệm 30 năm thành lập trường THPT Nguyễn Du (1996–2026) 🎓 Lễ kỷ niệm sẽ diễn ra vào sáng thứ Bảy 19/07 tại sân trường.",
      attachments: [
        {
          label: "ảnh: sân khấu lễ kỷ niệm",
          alt: "Sân khấu lễ kỷ niệm 30 năm",
        },
        {
          label: "ảnh: triển lãm 30 năm",
          alt: "Không gian triển lãm ảnh 30 năm",
        },
      ],
      reactions: {
        counts: { ...emptyReactionCounts(), like: 42, love: 28, celebrate: 65 },
        myReaction: "celebrate",
      },
      commentCount: 3,
    }),
    post({
      postId: "p2",
      createdAt: "2026-07-10T14:30:00.000Z",
      content:
        "Thông báo quy chế kiểm tra cuối học kỳ II năm học 2025–2026. Kỳ kiểm tra sẽ bắt đầu từ ngày 21/07 và kéo dài đến hết ngày 26/07.",
      reactions: {
        counts: { ...emptyReactionCounts(), like: 35, love: 8 },
        myReaction: null,
      },
    }),
    post({
      postId: "p3",
      authorId: "u-teacher",
      authorName: "Nguyễn Thị Hương",
      authorRole: "teacher",
      authorAvatarInitials: "NH",
      createdAt: "2026-07-09T08:05:00.000Z",
      content:
        "CLB Toán học tuyển thành viên mới cho năm học 2026–2027! Đăng ký tại phòng bộ môn Toán trước ngày 25/07.",
      attachments: [
        {
          label: "ảnh: hoạt động CLB Toán",
          alt: "Buổi sinh hoạt CLB Toán học",
        },
      ],
      reactions: {
        counts: { ...emptyReactionCounts(), like: 21, celebrate: 6 },
        myReaction: null,
      },
    }),
    post({
      postId: "p4",
      authorId: "u-teacher-2",
      authorName: "Trần Thu Hà",
      authorRole: "teacher",
      authorAvatarInitials: "TH",
      scope: "class",
      classId: "11A2",
      createdAt: "2026-07-11T08:10:00.000Z",
      content:
        "Cả lớp lưu ý: tiết Toán thứ Hai tuần sau sẽ có bài kiểm tra 15 phút chương Lượng giác.",
      reactions: {
        counts: { ...emptyReactionCounts(), like: 28, love: 4 },
        myReaction: "like",
      },
    }),
    post({
      postId: "p5",
      authorId: "u-student",
      authorName: "Nguyễn Minh Khoa",
      authorRole: "student",
      authorAvatarInitials: "NK",
      scope: "class",
      classId: "11A2",
      createdAt: "2026-07-09T19:30:00.000Z",
      content:
        "Nhóm ôn tập Toán cuối tuần của lớp mình hoạt động lại rồi nhé! Sáng Chủ nhật 9h tại thư viện.",
      reactions: {
        counts: { ...emptyReactionCounts(), like: 15, love: 3 },
        myReaction: null,
      },
    }),
    post({
      postId: "p6",
      authorId: "u-teacher",
      authorName: "Nguyễn Thị Hương",
      authorRole: "teacher",
      authorAvatarInitials: "NH",
      scope: "class",
      classId: "12C3",
      createdAt: "2026-07-10T15:20:00.000Z",
      content:
        "Lớp 12C3 nộp phiếu đăng ký nguyện vọng ôn thi tốt nghiệp cho cô trước thứ Sáu tuần này nhé.",
      reactions: {
        counts: { ...emptyReactionCounts(), like: 12 },
        myReaction: null,
      },
    }),
  ];
}

export function seedComments(): Record<string, FeedCommentEntity[]> {
  return {
    p1: [
      {
        commentId: "c1",
        postId: "p1",
        authorId: "u-teacher-2",
        authorName: "Trần Thu Hà",
        authorRole: "teacher",
        authorAvatarInitials: "TH",
        content: "Lớp 11A2 đã đăng ký 2 tiết mục văn nghệ cho đêm gala ạ!",
        createdAt: "2026-07-11T10:20:00.000Z",
      },
      {
        commentId: "c2",
        postId: "p1",
        authorId: "u-student",
        authorName: "Nguyễn Minh Khoa",
        authorRole: "student",
        authorAvatarInitials: "NK",
        content: "Mong chờ triển lãm ảnh quá ạ 😍",
        createdAt: "2026-07-11T10:35:00.000Z",
      },
      {
        commentId: "c3",
        postId: "p1",
        authorId: "u-parent",
        authorName: "Nguyễn Văn Đức",
        authorRole: "parent",
        authorAvatarInitials: "NĐ",
        content: "Phụ huynh có cần đăng ký trước khi tham dự không thưa thầy?",
        createdAt: "2026-07-11T11:00:00.000Z",
      },
    ],
  };
}
