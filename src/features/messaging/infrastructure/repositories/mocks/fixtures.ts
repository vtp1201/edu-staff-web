import type { ContactEntity } from "@/features/messaging/domain/entities/contact.entity";
import type { ConversationEntity } from "@/features/messaging/domain/entities/conversation.entity";
import type { GroupEntity } from "@/features/messaging/domain/entities/group.entity";
import type { MessageEntity } from "@/features/messaging/domain/entities/message.entity";

/** Synthetic id of the current authenticated user in the mock world. */
export const MOCK_SELF_ID = "me";

/**
 * Mock seed data extracted from design_src/edu/messaging.jsx (teacher role).
 * Colour values use semantic token keys (not raw hex) — resolved to Tailwind
 * classes in the presentation layer. Mock/seed data is NOT i18n copy.
 * Replace with the `social` service once it ships (decision 0017).
 */

export const MOCK_CONTACTS: ContactEntity[] = [
  {
    id: "u1",
    name: "Trần Minh Quân",
    role: "Hiệu trưởng",
    avatarInitials: "TQ",
    color: "success",
    isOnline: true,
  },
  {
    id: "u2",
    name: "Phạm Quốc Bảo",
    role: "Giáo viên Văn",
    avatarInitials: "PB",
    color: "purple",
    isOnline: false,
  },
  {
    id: "u3",
    name: "Nguyễn Văn Đức",
    role: "Phụ huynh HS Khoa",
    avatarInitials: "ND",
    color: "purple",
    isOnline: true,
  },
  {
    id: "u4",
    name: "Lê Thị Hoa",
    role: "Giáo viên Hóa",
    avatarInitials: "LH",
    color: "warning",
    isOnline: true,
  },
  {
    id: "u5",
    name: "Nguyễn Minh Khoa",
    role: "Học sinh 11A2",
    avatarInitials: "NK",
    color: "warning",
    isOnline: false,
  },
];

export const MOCK_CONVERSATIONS: ConversationEntity[] = [
  // Direct conversations
  {
    id: "u1",
    type: "direct",
    name: "Trần Minh Quân",
    avatarInitials: "TQ",
    color: "success",
    lastMessage: "Cô có thể tham dự họp hội đồng lúc 15h hôm nay không?",
    lastMessageTime: "10:15",
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: "u3",
    type: "direct",
    name: "Nguyễn Văn Đức",
    avatarInitials: "ND",
    color: "purple",
    lastMessage: "Vâng, gia đình sẽ nhắc cháu ôn thêm. Cảm ơn cô!",
    lastMessageTime: "14:37",
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: "u4",
    type: "direct",
    name: "Lê Thị Hoa",
    avatarInitials: "LH",
    color: "warning",
    lastMessage: "Chị Hoa ơi, mình có thể đổi phòng học không?",
    lastMessageTime: "Hôm qua",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "u5",
    type: "direct",
    name: "Nguyễn Minh Khoa",
    avatarInitials: "NK",
    color: "warning",
    lastMessage: "Dạ cô, em hiểu rồi ạ.",
    lastMessageTime: "Hôm qua",
    unreadCount: 0,
    isOnline: false,
  },
  // Group conversations
  {
    id: "g1",
    type: "group",
    name: "Lớp 11B2 — Toán",
    avatarInitials: "11B2",
    color: "primary",
    lastMessage: "Em áp dụng định lý Lagrange vào nhé...",
    lastMessageTime: "08:15",
    unreadCount: 3,
    memberCount: 33,
    lastSenderName: "Cô Hương",
    selfIsGroupAdmin: true,
  },
  {
    id: "g2",
    type: "group",
    name: "Lớp 10A1 — Toán",
    avatarInitials: "10A1",
    color: "success",
    lastMessage: "Lớp 10A1: Cô nhắc các em bài tập...",
    lastMessageTime: "Hôm qua",
    unreadCount: 0,
    memberCount: 37,
  },
  {
    id: "g3",
    type: "group",
    name: "Tổ Toán – Tin học",
    avatarInitials: "TT",
    color: "warning",
    lastMessage: "Họp tổ thứ 4 tuần này lúc 14h.",
    lastMessageTime: "Hôm qua",
    unreadCount: 1,
    memberCount: 8,
    lastSenderName: "Tổ trưởng",
    selfIsGroupAdmin: true,
  },
  {
    id: "g4",
    type: "group",
    name: "Hội đồng giáo viên",
    avatarInitials: "HĐ",
    color: "purple",
    lastMessage: "Thông báo: Lịch họp hội đồng 15/5",
    lastMessageTime: "2 ngày",
    unreadCount: 0,
    memberCount: 42,
  },
];

const m = (
  conversationId: string,
  partial: Omit<MessageEntity, "conversationId">,
): MessageEntity => ({ conversationId, ...partial });

export const MOCK_MESSAGES: Record<string, MessageEntity[]> = {
  u1: [
    m("u1", {
      id: "u1-1",
      from: "other",
      text: "Chào cô Hương, cô có thể nộp kế hoạch giảng dạy tuần tới trước thứ 6 không?",
      time: "08:30",
      date: "Hôm nay",
    }),
    m("u1", {
      id: "u1-2",
      from: "me",
      text: "Dạ thầy, em sẽ nộp trước thứ 5 ạ. Em đang chuẩn bị rồi.",
      time: "08:45",
      date: "Hôm nay",
    }),
    m("u1", {
      id: "u1-3",
      from: "other",
      text: "Tốt. Nhớ bổ sung phần mục tiêu học tập theo chuẩn mới nhé.",
      time: "08:47",
      date: "Hôm nay",
    }),
    m("u1", {
      id: "u1-4",
      from: "me",
      text: "Dạ, em hiểu ạ. Em sẽ cập nhật theo mẫu mới của Sở.",
      time: "09:00",
      date: "Hôm nay",
    }),
    m("u1", {
      id: "u1-5",
      from: "other",
      text: "Cô có thể tham dự họp hội đồng lúc 15h hôm nay không?",
      time: "10:15",
      date: "Hôm nay",
    }),
    m("u1", {
      id: "u1-6",
      from: "me",
      text: "Dạ được thầy ạ, em sẽ có mặt.",
      time: "10:18",
      date: "Hôm nay",
    }),
  ],
  u3: [
    m("u3", {
      id: "u3-1",
      from: "other",
      text: "Chào cô, tôi là phụ huynh của em Nguyễn Minh Khoa lớp 11A2. Tôi muốn hỏi về kết quả học kỳ của con.",
      time: "14:00",
      date: "Hôm qua",
    }),
    m("u3", {
      id: "u3-2",
      from: "me",
      text: "Chào anh Đức, em Khoa học rất tiến bộ. Điểm toán kỳ này đạt 8.5, xếp top 5 lớp.",
      time: "14:20",
      date: "Hôm qua",
    }),
    m("u3", {
      id: "u3-3",
      from: "other",
      text: "Cảm ơn cô nhiều. Con có điểm yếu môn nào không ạ?",
      time: "14:22",
      date: "Hôm qua",
    }),
    m("u3", {
      id: "u3-4",
      from: "me",
      text: "Môn Hóa cần chú ý hơn một chút. Điểm trung bình đang 7.5. Cô sẽ theo dõi thêm.",
      time: "14:35",
      date: "Hôm qua",
    }),
    m("u3", {
      id: "u3-5",
      from: "other",
      text: "Vâng, gia đình sẽ nhắc cháu ôn thêm. Cảm ơn cô!",
      time: "14:37",
      date: "Hôm qua",
    }),
  ],
  u4: [
    m("u4", {
      id: "u4-1",
      from: "other",
      text: "Chị Hoa ơi, mình có thể đổi phòng học không?",
      time: "09:00",
      date: "Hôm qua",
    }),
    m("u4", {
      id: "u4-2",
      from: "me",
      text: "Được chị, để mình xem lịch phòng đã nhé.",
      time: "09:05",
      date: "Hôm qua",
    }),
  ],
  u5: [
    m("u5", {
      id: "u5-1",
      from: "me",
      text: "Em xem lại phần bài tập về nhà nhé.",
      time: "15:00",
      date: "Hôm qua",
    }),
    m("u5", {
      id: "u5-2",
      from: "other",
      text: "Dạ cô, em hiểu rồi ạ.",
      time: "15:10",
      date: "Hôm qua",
    }),
  ],
  g1: [
    m("g1", {
      id: "g1-1",
      from: "system",
      text: "Nguyễn Thị Hương đã tạo nhóm Lớp 11B2 — Toán",
      time: "01/09/2025",
      date: "01/09/2025",
    }),
    m("g1", {
      id: "g1-2",
      from: "other",
      text: "Cô ơi, bài tập trang 87 nộp khi nào ạ?",
      time: "07:30",
      date: "Hôm nay",
      senderName: "Trần Văn Bình",
      senderInitials: "TB",
      senderColor: "teal",
    }),
    m("g1", {
      id: "g1-3",
      from: "me",
      text: "Các em nộp trước tiết học ngày mai nhé!",
      time: "07:45",
      date: "Hôm nay",
    }),
    m("g1", {
      id: "g1-4",
      from: "other",
      text: "Dạ cô, em hiểu rồi ạ.",
      time: "07:47",
      date: "Hôm nay",
      senderName: "Hoàng Thị Linh",
      senderInitials: "HL",
      senderColor: "error",
    }),
    m("g1", {
      id: "g1-5",
      from: "other",
      text: "Cô cho hỏi, phần b bài 3 làm theo cách nào ạ?",
      time: "08:00",
      date: "Hôm nay",
      senderName: "Lê Thị Cẩm",
      senderInitials: "LC",
      senderColor: "purple",
    }),
    m("g1", {
      id: "g1-6",
      from: "me",
      text: "Em áp dụng định lý Lagrange vào nhé. Cô sẽ hướng dẫn chi tiết trong lớp.",
      time: "08:15",
      date: "Hôm nay",
    }),
  ],
  g2: [
    m("g2", {
      id: "g2-1",
      from: "me",
      text: "Cô nhắc các em hoàn thành bài tập trước thứ 6 nhé.",
      time: "10:00",
      date: "Hôm qua",
    }),
  ],
  g3: [
    m("g3", {
      id: "g3-1",
      from: "other",
      text: "Họp tổ thứ 4 tuần này lúc 14h.",
      time: "11:00",
      date: "Hôm qua",
      senderName: "Tổ trưởng",
      senderInitials: "TT",
      senderColor: "warning",
    }),
  ],
  g4: [
    m("g4", {
      id: "g4-1",
      from: "system",
      text: "Thông báo: Lịch họp hội đồng 15/5",
      time: "08:00",
      date: "2 ngày",
    }),
  ],
};

/**
 * Group lifecycle seed (US-E10.4, teacher role per TR-025). The current user
 * (`MOCK_SELF_ID`) is admin on the homeroom group (g1) and the dept group (g3),
 * member on g2/g4 — so both admin and non-admin panel states are reachable.
 * Keyed by groupId, which equals the linked `conversationId` for group convos.
 */
export const MOCK_GROUPS: Record<string, GroupEntity> = {
  g1: {
    id: "g1",
    name: "Lớp 11B2 — Toán",
    description: "Nhóm trao đổi bài tập lớp 11B2.",
    kind: "class",
    color: "primary",
    conversationId: "g1",
    members: [
      {
        userId: MOCK_SELF_ID,
        name: "Nguyễn Thị Hương",
        initials: "NH",
        color: "primary",
        role: "admin",
        isOnline: true,
      },
      {
        userId: "u-b1",
        name: "Trần Văn Bình",
        initials: "TB",
        color: "teal",
        role: "member",
        isOnline: true,
      },
      {
        userId: "u-l1",
        name: "Hoàng Thị Linh",
        initials: "HL",
        color: "error",
        role: "member",
        isOnline: false,
      },
      {
        userId: "u-c1",
        name: "Lê Thị Cẩm",
        initials: "LC",
        color: "purple",
        role: "member",
        isOnline: true,
      },
    ],
    pinnedMessages: [
      {
        messageId: "g1-3",
        senderId: MOCK_SELF_ID,
        senderName: "Nguyễn Thị Hương",
        excerpt: "Các em nộp trước tiết học ngày mai nhé!",
        sentAt: "2026-06-20T07:45:00.000Z",
      },
    ],
  },
  g2: {
    id: "g2",
    name: "Lớp 10A1 — Toán",
    description: "Nhóm lớp 10A1.",
    kind: "class",
    color: "success",
    conversationId: "g2",
    members: [
      {
        userId: MOCK_SELF_ID,
        name: "Nguyễn Thị Hương",
        initials: "NH",
        color: "primary",
        role: "member",
        isOnline: true,
      },
      {
        userId: "u-tt",
        name: "Phạm Tổ Trưởng",
        initials: "PT",
        color: "warning",
        role: "admin",
        isOnline: false,
      },
    ],
    pinnedMessages: [],
  },
  g3: {
    id: "g3",
    name: "Tổ Toán – Tin học",
    description: "Nhóm tổ bộ môn Toán – Tin học.",
    kind: "dept",
    color: "warning",
    conversationId: "g3",
    members: [
      {
        userId: MOCK_SELF_ID,
        name: "Nguyễn Thị Hương",
        initials: "NH",
        color: "primary",
        role: "admin",
        isOnline: true,
      },
      {
        userId: "u-tt",
        name: "Phạm Tổ Trưởng",
        initials: "PT",
        color: "warning",
        role: "admin",
        isOnline: true,
      },
      {
        userId: "u4",
        name: "Lê Thị Hoa",
        initials: "LH",
        color: "warning",
        role: "member",
        isOnline: false,
      },
    ],
    pinnedMessages: [],
  },
  g4: {
    id: "g4",
    name: "Hội đồng giáo viên",
    description: "Nhóm hội đồng giáo viên toàn trường.",
    kind: "other",
    color: "purple",
    conversationId: "g4",
    members: [
      {
        userId: MOCK_SELF_ID,
        name: "Nguyễn Thị Hương",
        initials: "NH",
        color: "primary",
        role: "member",
        isOnline: true,
      },
      {
        userId: "u1",
        name: "Trần Minh Quân",
        initials: "TQ",
        color: "success",
        role: "admin",
        isOnline: true,
      },
    ],
    pinnedMessages: [],
  },
};
