// ── Cụm C: Nhắn tin / Messaging ──────────────────────────────────────────────
// DR-008 extends the existing 2-pane messaging screen with:
//   1. Richer group list rows (avatar + member count + last activity + unread).
//   2. "Tạo nhóm" — 2-step modal (info → members).
//   3. Group info panel (320px slide-in from right) with members + pinned.
//   4. Message context menu (right-click / long-press): reply, pin, copy, delete.
//   5. Reply / quote — quoted-strip above input + small quote in sent bubble.
// Realtime / SSE wiring per decision-0009 is omitted from the mock.

// ── Mock data — direct contacts ──────────────────────────────────────────────

const CONTACTS_BY_ROLE = {
  teacher: [
    { id: 'u1', name: 'Trần Minh Quân', nameEn: 'Tran Minh Quan', role: 'BGH', roleEn: 'Admin', avatar: 'TQ', color: T.success, online: true },
    { id: 'u2', name: 'Phạm Quốc Bảo', nameEn: 'Pham Quoc Bao', role: 'Giáo viên Văn', roleEn: 'Literature Teacher', avatar: 'PB', color: T.purple, online: false },
    { id: 'u3', name: 'Nguyễn Văn Đức', nameEn: 'Nguyen Van Duc', role: 'Phụ huynh HS Khoa', roleEn: 'Parent of Khoa', avatar: 'ND', color: T.purple, online: true },
    { id: 'u4', name: 'Lê Thị Hoa', nameEn: 'Le Thi Hoa', role: 'Giáo viên Hóa', roleEn: 'Chemistry Teacher', avatar: 'LH', color: T.warning, online: true },
    { id: 'u5', name: 'Nguyễn Minh Khoa', nameEn: 'Nguyen Minh Khoa', role: 'Học sinh 11A2', roleEn: 'Student 11A2', avatar: 'NK', color: T.warning, online: false },
  ],
  student: [
    { id: 'u6', name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', role: 'GV Toán', roleEn: 'Math Teacher', avatar: 'NH', color: T.primary, online: true },
    { id: 'u7', name: 'Trần Văn Minh', nameEn: 'Tran Van Minh', role: 'GV Vật Lý', roleEn: 'Physics Teacher', avatar: 'TM', color: T.success, online: false, presence: 'recent', lastSeen: { vi: 'Hoạt động 3 phút trước', en: 'Active 3 minutes ago' } },
    { id: 'u8', name: 'Nguyễn Văn Đức', nameEn: 'Nguyen Van Duc', role: 'Phụ huynh', roleEn: 'Parent', avatar: 'ND', color: T.purple, online: true },
    { id: 'u9', name: 'Trần Văn Bình', nameEn: 'Tran Van Binh', role: 'Bạn cùng lớp 11A2', roleEn: 'Classmate 11A2', avatar: 'TB', color: T.teal, online: true },
    { id: 'u10', name: 'Hoàng Thị Linh', nameEn: 'Hoang Thi Linh', role: 'Bạn cùng lớp 11A2', roleEn: 'Classmate 11A2', avatar: 'HL', color: T.error, online: false },
  ],
  principal: [
    { id: 'u11', name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', role: 'GV Toán', roleEn: 'Math Teacher', avatar: 'NH', color: T.primary, online: true },
    { id: 'u12', name: 'Lê Thị Hoa', nameEn: 'Le Thi Hoa', role: 'GV Hóa', roleEn: 'Chemistry Teacher', avatar: 'LH', color: T.warning, online: true },
    { id: 'u13', name: 'Đỗ Thị Mai', nameEn: 'Do Thi Mai', role: 'GV Anh', roleEn: 'English Teacher', avatar: 'DM', color: T.teal, online: false, presence: 'recent', lastSeen: { vi: 'Hoạt động 5 phút trước', en: 'Active 5 minutes ago' } },
    { id: 'u14', name: 'Phạm Quốc Bảo', nameEn: 'Pham Quoc Bao', role: 'GV Văn', roleEn: 'Literature Teacher', avatar: 'PB', color: T.purple, online: false },
  ],
  parent: [
    { id: 'u15', name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', role: 'GVCN lớp 11A2', roleEn: 'Homeroom 11A2', avatar: 'NH', color: T.primary, online: true },
    { id: 'u16', name: 'Trần Văn Minh', nameEn: 'Tran Van Minh', role: 'GV Vật Lý', roleEn: 'Physics Teacher', avatar: 'TM', color: T.success, online: false },
    { id: 'u17', name: 'Trần Minh Quân', nameEn: 'Tran Minh Quan', role: 'BGH', roleEn: 'Admin', avatar: 'TQ', color: T.success, online: true },
  ],
};

// ── P6: Presence ─────────────────────────────────────────────────────────────
// presence: 'online' | 'recent' (left <5 min ago) | 'offline'. Contacts without
// an explicit `presence` field derive it from the legacy `online` boolean.
const MSG_SR_ONLY = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };

const msgPresence = (c) => (c && (c.presence || (c.online ? 'online' : 'offline'))) || 'offline';

// 10px status dot, bottom-right of an avatar. online = solid success with a
// 2px card ring; recent = hollow success ring; offline renders nothing (no
// gray dot). Static — no blink/pulse animation.
const MSGPresenceDot = ({ presence, size = 10, offset = 1, lang, label }) => {
  if (presence !== 'online' && presence !== 'recent') return null;
  const solid = presence === 'online';
  const srText = label || (solid
    ? (lang === 'en' ? 'online' : 'đang hoạt động')
    : (lang === 'en' ? 'recently active' : 'vừa hoạt động gần đây'));
  return (
    <span style={{
      position: 'absolute', bottom: offset, right: offset, width: size, height: size,
      borderRadius: '50%', boxSizing: 'border-box',
      background: solid ? T.success : T.card,
      border: solid ? 'none' : `2px solid ${T.success}`,
      boxShadow: `0 0 0 2px ${T.card}`,
    }}>
      <span style={MSG_SR_ONLY}>{srText}</span>
    </span>
  );
};

// DM header caption under the contact name. Full words, no cryptic shorthand.
const msgPresenceCaption = (c, lang) => {
  const p = msgPresence(c);
  if (p === 'online') return lang === 'en' ? 'Active now' : 'Đang hoạt động';
  const seen = c && c.lastSeen ? (lang === 'en' ? c.lastSeen.en : c.lastSeen.vi) : null;
  if (p === 'recent') return seen || (lang === 'en' ? 'Active 5 minutes ago' : 'Hoạt động 5 phút trước');
  return seen || (lang === 'en' ? 'Active yesterday' : 'Hoạt động hôm qua');
};

// ── DR-008 group catalogue & per-role seeding ────────────────────────────────

// Group "type" taxonomy used by the create-group modal radio.
const GROUP_TYPES = [
  { id: 'class',  vi: 'Lớp học',     en: 'Class',      icon: 'users' },
  { id: 'dept',   vi: 'Bộ môn',      en: 'Department', icon: 'briefcase' },
  { id: 'club',   vi: 'Câu lạc bộ',  en: 'Club',       icon: 'sparkles' },
  { id: 'other',  vi: 'Khác',        en: 'Other',      icon: 'message' },
];

// 8-swatch palette for group avatars (drawn from token colours).
const GROUP_PALETTE = [
  T.primary, T.success, T.warning, T.error,
  T.purple,  T.teal,    '#6366F1',  '#FB923C',
];

// Spec-mandated per-role group seeding.
const GROUPS_BY_ROLE = {
  teacher: [
    { id: 'gT1', name: 'Nhóm GV bộ môn Toán',  nameEn: 'Math Teachers Group',    members: 8,  avatar: 'BM', color: T.primary, type: 'dept',  selfIsAdmin: false },
    { id: 'gT2', name: 'Nhóm chủ nhiệm 10A1',  nameEn: 'Homeroom 10A1 Group',    members: 4,  avatar: '10A1', color: T.success, type: 'class', selfIsAdmin: true },
    { id: 'gT3', name: 'Nhóm GV toàn trường',  nameEn: 'All Teachers Group',     members: 42, avatar: 'GV', color: T.warning, type: 'other', selfIsAdmin: false },
  ],
  principal: [
    { id: 'gT1', name: 'Nhóm GV bộ môn Toán',  nameEn: 'Math Teachers Group',    members: 8,  avatar: 'BM', color: T.primary, type: 'dept',  selfIsAdmin: false },
    { id: 'gT3', name: 'Nhóm GV toàn trường',  nameEn: 'All Teachers Group',     members: 42, avatar: 'GV', color: T.warning, type: 'other', selfIsAdmin: true },
    { id: 'gA1', name: 'Nhóm Ban giám hiệu',   nameEn: 'Leadership Team',        members: 5,  avatar: 'BGH', color: T.error,  type: 'other', selfIsAdmin: true },
  ],
  student: [
    { id: 'gS1', name: 'Nhóm lớp 10A1',        nameEn: 'Class 10A1',             members: 32, avatar: '10A1', color: T.primary, type: 'class', selfIsAdmin: false },
    { id: 'gS2', name: 'Nhóm môn Toán 10A1',   nameEn: 'Math · 10A1',            members: 33, avatar: 'T10', color: T.success, type: 'class', selfIsAdmin: false },
  ],
  parent: [
    { id: 'gP1', name: 'Nhóm phụ huynh lớp 10A1', nameEn: 'Class 10A1 Parents', members: 32, avatar: '10A1', color: T.primary, type: 'class', selfIsAdmin: false },
  ],
};

// Members per group — drives the info panel. `admin` flags the group owner(s).
// `selfId` tells the panel which row is the logged-in user (for "Bạn" suffix).
const GROUP_MEMBERS_BY_GROUP = {
  gT1: [
    { id: 'm1', name: 'Nguyễn Thị Hương', avatar: 'NH', color: T.primary, role: 'GV Toán', online: true,  admin: true,  isSelf: true  },
    { id: 'm2', name: 'Trần Hoàng Long',  avatar: 'TL', color: T.success, role: 'GV Toán', online: true,  admin: false, isSelf: false },
    { id: 'm3', name: 'Lê Văn Sơn',       avatar: 'LS', color: T.warning, role: 'GV Toán', online: false, admin: false, isSelf: false },
    { id: 'm4', name: 'Đỗ Thị Vân',       avatar: 'DV', color: T.purple,  role: 'GV Toán', online: false, admin: false, isSelf: false },
    { id: 'm5', name: 'Phan Hồng Quang',  avatar: 'PQ', color: T.teal,    role: 'GV Toán', online: true,  admin: false, isSelf: false },
  ],
  gT2: [
    { id: 'm6',  name: 'Nguyễn Thị Hương', avatar: 'NH', color: T.primary,  role: 'GVCN 10A1',  online: true,  admin: true, isSelf: true  },
    { id: 'm7',  name: 'Trần Minh Quân',   avatar: 'TQ', color: T.success,  role: 'BGH',        online: true,  admin: true, isSelf: false },
    { id: 'm8',  name: 'Lê Thị Hoa',       avatar: 'LH', color: T.warning,  role: 'GV bộ môn',  online: false, admin: false, isSelf: false },
    { id: 'm9',  name: 'Đỗ Thị Mai',       avatar: 'DM', color: T.teal,     role: 'GV bộ môn',  online: false, admin: false, isSelf: false },
  ],
  gT3: [
    { id: 'm10', name: 'Trần Minh Quân',   avatar: 'TQ', color: T.success,  role: 'BGH',  online: true,  admin: true, isSelf: false },
    { id: 'm11', name: 'Nguyễn Thị Hương', avatar: 'NH', color: T.primary,  role: 'GVBM', online: true,  admin: false, isSelf: true  },
    { id: 'm12', name: 'Phạm Quốc Bảo',    avatar: 'PB', color: T.purple,   role: 'GVBM', online: false, admin: false, isSelf: false },
    { id: 'm13', name: 'Lê Thị Hoa',       avatar: 'LH', color: T.warning,  role: 'GVBM', online: false, admin: false, isSelf: false },
    { id: 'm14', name: 'Trần Văn Minh',    avatar: 'TM', color: T.success,  role: 'GVBM', online: true,  admin: false, isSelf: false },
    { id: 'm15', name: 'Đỗ Thị Mai',       avatar: 'DM', color: T.teal,     role: 'GVBM', online: false, admin: false, isSelf: false },
  ],
  gA1: [
    { id: 'm16', name: 'Trần Minh Quân',   avatar: 'TQ', color: T.error,    role: 'Hiệu trưởng',     online: true,  admin: true, isSelf: true  },
    { id: 'm17', name: 'Lê Thị Mai',       avatar: 'LM', color: T.purple,   role: 'Phó hiệu trưởng', online: true,  admin: true, isSelf: false },
    { id: 'm18', name: 'Phạm Văn Hùng',    avatar: 'PH', color: T.warning,  role: 'Phó hiệu trưởng', online: false, admin: false, isSelf: false },
    { id: 'm19', name: 'Nguyễn Thị An',    avatar: 'NA', color: T.success,  role: 'Tổ trưởng GV',    online: true,  admin: false, isSelf: false },
    { id: 'm20', name: 'Vũ Đức Cường',     avatar: 'VC', color: T.teal,     role: 'Tổ trưởng GV',    online: false, admin: false, isSelf: false },
  ],
  gS1: [
    { id: 'm21', name: 'Nguyễn Thị Hương', avatar: 'NH', color: T.primary,  role: 'GVCN',  online: true,  admin: true, isSelf: false },
    { id: 'm22', name: 'Nguyễn Minh Khoa', avatar: 'NK', color: T.warning,  role: 'Lớp trưởng', online: true,  admin: false, isSelf: true  },
    { id: 'm23', name: 'Trần Văn Bình',    avatar: 'TB', color: T.teal,     role: 'Học sinh', online: true,  admin: false, isSelf: false },
    { id: 'm24', name: 'Hoàng Thị Linh',   avatar: 'HL', color: T.error,    role: 'Học sinh', online: false, admin: false, isSelf: false },
    { id: 'm25', name: 'Lê Thị Cẩm',       avatar: 'LC', color: T.purple,   role: 'Học sinh', online: false, admin: false, isSelf: false },
    { id: 'm26', name: 'Phạm Đức Dũng',    avatar: 'PD', color: T.success,  role: 'Học sinh', online: false, admin: false, isSelf: false },
  ],
  gS2: [
    { id: 'm27', name: 'Nguyễn Thị Hương', avatar: 'NH', color: T.primary,  role: 'GV Toán', online: true,  admin: true, isSelf: false },
    { id: 'm28', name: 'Nguyễn Minh Khoa', avatar: 'NK', color: T.warning,  role: 'Học sinh', online: true,  admin: false, isSelf: true  },
    { id: 'm29', name: 'Trần Văn Bình',    avatar: 'TB', color: T.teal,     role: 'Học sinh', online: true,  admin: false, isSelf: false },
    { id: 'm30', name: 'Hoàng Thị Linh',   avatar: 'HL', color: T.error,    role: 'Học sinh', online: false, admin: false, isSelf: false },
  ],
  gP1: [
    { id: 'm31', name: 'Nguyễn Thị Hương', avatar: 'NH', color: T.primary,  role: 'GVCN',     online: true,  admin: true, isSelf: false },
    { id: 'm32', name: 'Nguyễn Văn Đức',   avatar: 'ND', color: T.purple,   role: 'PH Khoa',  online: true,  admin: false, isSelf: true  },
    { id: 'm33', name: 'Trần Thị Mai',     avatar: 'TM', color: T.success,  role: 'PH Bình',  online: false, admin: false, isSelf: false },
    { id: 'm34', name: 'Lê Văn Tài',       avatar: 'LT', color: T.warning,  role: 'PH Linh',  online: false, admin: false, isSelf: false },
  ],
};

// Pinned messages per group (seed). Mutated locally in MessagingScreen state.
const GROUP_PINNED_BY_GROUP = {
  gT2: [
    { id: 'p1', from: 'GVCN Hương', text: 'Lịch họp phụ huynh: 15/05 lúc 14h tại phòng B205.', time: '12/04' },
  ],
  gS1: [
    { id: 'p2', from: 'GVCN Hương', text: 'Lịch thi giữa kỳ HK2 — 22/04 đến 26/04. Phòng thi sẽ công bố sau.', time: '08/04' },
  ],
};

// User search pool for the create-group / add-member flows. (Spec calls for
// "user search input" — this is what feeds it across all roles.)
const USER_SEARCH_POOL = [
  { id: 'su1', name: 'Nguyễn Thị Hương', role: 'GV Toán',     avatar: 'NH', color: T.primary },
  { id: 'su2', name: 'Trần Hoàng Long',  role: 'GV Toán',     avatar: 'TL', color: T.success },
  { id: 'su3', name: 'Lê Văn Sơn',       role: 'GV Toán',     avatar: 'LS', color: T.warning },
  { id: 'su4', name: 'Đỗ Thị Vân',       role: 'GV Toán',     avatar: 'DV', color: T.purple  },
  { id: 'su5', name: 'Phan Hồng Quang',  role: 'GV Toán',     avatar: 'PQ', color: T.teal    },
  { id: 'su6', name: 'Trần Minh Quân',   role: 'BGH',         avatar: 'TQ', color: T.error   },
  { id: 'su7', name: 'Phạm Quốc Bảo',    role: 'GV Văn',      avatar: 'PB', color: T.purple  },
  { id: 'su8', name: 'Lê Thị Hoa',       role: 'GV Hóa',      avatar: 'LH', color: T.warning },
  { id: 'su9', name: 'Trần Văn Minh',    role: 'GV Vật Lý',   avatar: 'TM', color: T.success },
  { id: 'su10', name: 'Đỗ Thị Mai',      role: 'GV Anh',      avatar: 'DM', color: T.teal    },
];

// ── Mock messages ───────────────────────────────────────────────────────────

const generateMessages = (contactId, myAvatar, myColor, theirAvatar, theirColor) => {
  const convos = {
    u1: [
      { id: 1, from: 'them', text: 'Chào cô Hương, cô có thể nộp kế hoạch giảng dạy tuần tới trước thứ 6 không?', time: '08:30', date: 'Hôm nay' },
      { id: 2, from: 'me', text: 'Dạ thầy, em sẽ nộp trước thứ 5 ạ. Em đang chuẩn bị rồi.', time: '08:45', date: 'Hôm nay' },
      { id: 3, from: 'them', text: 'Tốt. Nhớ bổ sung phần mục tiêu học tập theo chuẩn mới nhé.', time: '08:47', date: 'Hôm nay' },
      { id: 4, from: 'me', text: 'Dạ, em hiểu ạ. Em sẽ cập nhật theo mẫu mới của Sở.', time: '09:00', date: 'Hôm nay' },
      { id: 5, from: 'them', text: 'Cô có thể tham dự họp hội đồng lúc 15h hôm nay không?', time: '10:15', date: 'Hôm nay' },
      { id: 6, from: 'me', text: 'Dạ được thầy ạ, em sẽ có mặt.', time: '10:18', date: 'Hôm nay' },
    ],
    u3: [
      { id: 1, from: 'them', text: 'Chào cô, tôi là phụ huynh của em Nguyễn Minh Khoa lớp 11A2. Tôi muốn hỏi về kết quả học kỳ của con.', time: '14:00', date: 'Hôm qua' },
      { id: 2, from: 'me', text: 'Chào anh Đức, em Khoa học rất tiến bộ. Điểm toán kỳ này đạt 8.5, xếp top 5 lớp.', time: '14:20', date: 'Hôm qua' },
      { id: 3, from: 'them', text: 'Cảm ơn cô nhiều. Con có điểm yếu môn nào không ạ?', time: '14:22', date: 'Hôm qua' },
      { id: 4, from: 'me', text: 'Môn Hóa cần chú ý hơn một chút. Điểm trung bình đang 7.5. Cô sẽ theo dõi thêm.', time: '14:35', date: 'Hôm qua' },
      { id: 5, from: 'them', text: 'Vâng, gia đình sẽ nhắc cháu ôn thêm. Cảm ơn cô!', time: '14:37', date: 'Hôm qua' },
    ],
    u6: [
      { id: 1, from: 'them', text: 'Em Khoa ơi, cô nhận thấy bài kiểm tra đạo hàm em làm tốt lắm. Tiếp tục phát huy nhé!', time: '16:00', date: 'Hôm qua' },
      { id: 2, from: 'me', text: 'Dạ, cảm ơn cô ạ! Em đã ôn lại nhiều lần ạ.', time: '16:10', date: 'Hôm qua' },
      { id: 3, from: 'them', text: 'Ngày mai cô sẽ trả bài kiểm tra 1 tiết. Chuẩn bị tinh thần nhé 😊', time: '16:12', date: 'Hôm qua' },
      { id: 4, from: 'me', text: 'Dạ cô! Em hồi hộp quá ạ, không biết điểm bao nhiêu.', time: '16:20', date: 'Hôm qua' },
      { id: 5, from: 'them', text: 'Cô hỏi về bài tập trang 87 nhé — em có thắc mắc gì không?', time: '08:30', date: 'Hôm nay' },
      { id: 6, from: 'me', text: 'Dạ cô, em chưa hiểu bài 4 ạ. Cô có thể giải thích thêm được không ạ?', time: '08:45', date: 'Hôm nay' },
      { id: 7, from: 'them', text: 'Được, tiết học ngày mai cô sẽ giải chi tiết bài đó nhé.', time: '08:50', date: 'Hôm nay' },
    ],
    u9: [
      { id: 1, from: 'them', text: 'Ê Khoa, mày hiểu bài đạo hàm tiết hôm nay không? Tao chưa hiểu phần sau.', time: '12:00', date: 'Hôm nay' },
      { id: 2, from: 'me', text: 'Hiểu rồi bro. Phần đó là tìm cực trị, tao có note lại hết rồi.', time: '12:05', date: 'Hôm nay' },
      { id: 3, from: 'them', text: 'Cho tao xin note với, chiều học nhóm nha?', time: '12:06', date: 'Hôm nay' },
      { id: 4, from: 'me', text: 'Ok 3h chiều tao rảnh, gặp ở thư viện nha.', time: '12:10', date: 'Hôm nay' },
      { id: 5, from: 'them', text: '👍 Ok bro!', time: '12:11', date: 'Hôm nay' },
    ],
    // Group convo seeds — keyed by group id.
    gT1: [
      { id: 1, from: 'system', text: 'Nhóm GV bộ môn Toán được tạo bởi Nguyễn Thị Hương.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'Trần Hoàng Long', initials: 'TL', color: T.success, text: 'Mọi người, lịch họp tổ thứ 4 tuần này lúc 14h tại P.205.', time: '08:45', date: 'Hôm nay' },
      { id: 3, from: 'me', text: 'Mình sẽ tham dự đầy đủ ạ.', time: '08:48', date: 'Hôm nay' },
      { id: 4, from: 'other', name: 'Đỗ Thị Vân', initials: 'DV', color: T.purple, text: 'Mọi người chuẩn bị nội dung chuyên đề về dạy đạo hàm trước nhé.', time: '09:10', date: 'Hôm nay' },
      { id: 5, from: 'other', name: 'Phan Hồng Quang', initials: 'PQ', color: T.teal, text: 'Mình đã soạn xong slide chuyên đề, sẽ gửi lên nhóm chiều nay.', time: '09:22', date: 'Hôm nay' },
    ],
    gT2: [
      { id: 1, from: 'system', text: 'Nhóm chủ nhiệm 10A1 được tạo bởi Nguyễn Thị Hương.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'Trần Minh Quân', initials: 'TQ', color: T.success, text: 'Cô Hương lưu ý chuẩn bị báo cáo tình hình lớp tuần này nhé.', time: '07:30', date: 'Hôm nay' },
      { id: 3, from: 'me', text: 'Dạ thầy, em đang tổng hợp ạ.', time: '07:45', date: 'Hôm nay' },
      { id: 4, from: 'other', name: 'Lê Thị Hoa', initials: 'LH', color: T.warning, text: 'Mình ghi nhận có 2 em vắng học không phép tuần qua, đã liên hệ phụ huynh.', time: '08:00', date: 'Hôm nay' },
    ],
    gT3: [
      { id: 1, from: 'system', text: 'Nhóm GV toàn trường được khởi tạo.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'Trần Minh Quân', initials: 'TQ', color: T.success, text: '📢 Thông báo: Sáng thứ 6 tuần này họp hội đồng giáo viên tại hội trường lớn.', time: '20:00', date: 'Hôm qua' },
      { id: 3, from: 'other', name: 'Lê Thị Hoa', initials: 'LH', color: T.warning, text: 'Em đã ghi nhận ạ.', time: '20:05', date: 'Hôm qua' },
      { id: 4, from: 'me', text: 'Em sẽ tham dự đầy đủ ạ.', time: '20:10', date: 'Hôm qua' },
    ],
    gA1: [
      { id: 1, from: 'system', text: 'Nhóm Ban giám hiệu được tạo bởi Trần Minh Quân.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'Lê Thị Mai', initials: 'LM', color: T.purple, text: 'Báo cáo tài chính tháng đã hoàn thành, sẽ trình bày sáng mai.', time: '17:15', date: 'Hôm qua' },
      { id: 3, from: 'me', text: 'Cảm ơn cô Mai. Mai 9h họp tại phòng BGH nhé.', time: '17:20', date: 'Hôm qua' },
    ],
    gS1: [
      { id: 1, from: 'system', text: 'Nhóm lớp 10A1 được tạo bởi giáo viên chủ nhiệm.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'GVCN Hương', initials: 'NH', color: T.primary, text: '📢 Nhắc nhở: Ngày mai lớp có tiết kiểm tra Toán tiết 2. Các em chuẩn bị kỹ nhé!', time: '20:00', date: 'Hôm qua' },
      { id: 3, from: 'other', name: 'Trần Văn Bình', initials: 'TB', color: T.teal, text: 'Cảm ơn cô đã nhắc ạ 🙏', time: '20:05', date: 'Hôm qua' },
      { id: 4, from: 'me', text: 'Dạ em ghi nhớ rồi ạ!', time: '20:10', date: 'Hôm qua' },
      { id: 5, from: 'other', name: 'Hoàng Thị Linh', initials: 'HL', color: T.error, text: 'Cô ơi, bài ôn tập mình cần học đến trang mấy ạ?', time: '20:15', date: 'Hôm qua' },
      { id: 6, from: 'other', name: 'GVCN Hương', initials: 'NH', color: T.primary, text: 'Trang 75–90 nhé các em. Trọng tâm là phần đạo hàm.', time: '20:18', date: 'Hôm qua', replyTo: { from: 'Hoàng Thị Linh', text: 'Cô ơi, bài ôn tập mình cần học đến trang mấy ạ?' } },
      { id: 7, from: 'me', text: 'Dạ cô! Em sẽ ôn kỹ phần đó ạ 📚', time: '20:20', date: 'Hôm qua', replyTo: { from: 'GVCN Hương', text: 'Trang 75–90 nhé các em. Trọng tâm là phần đạo hàm.' } },
    ],
    gS2: [
      { id: 1, from: 'system', text: 'Nhóm môn Toán 10A1 được tạo bởi GV Hương.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'GV Hương', initials: 'NH', color: T.primary, text: 'Bài tập trang 87 các em làm bài 1–5 nhé. Nộp trước sáng mai.', time: '08:00', date: 'Hôm nay' },
      { id: 3, from: 'me', text: 'Dạ cô, em sẽ làm xong tối nay.', time: '08:12', date: 'Hôm nay' },
      { id: 4, from: 'other', name: 'Trần Văn Bình', initials: 'TB', color: T.teal, text: 'Cô ơi, bài 4 phần b làm thế nào ạ?', time: '08:15', date: 'Hôm nay' },
      { id: 5, from: 'other', name: 'GV Hương', initials: 'NH', color: T.primary, text: 'Em áp dụng định lý Lagrange nhé. Sáng mai cô giải chi tiết.', time: '08:20', date: 'Hôm nay' },
    ],
    gP1: [
      { id: 1, from: 'system', text: 'Nhóm phụ huynh lớp 10A1 được tạo bởi GVCN Hương.', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'GVCN Hương', initials: 'NH', color: T.primary, text: 'Kính chào quý phụ huynh, tuần tới có buổi họp phụ huynh, kính mong quý phụ huynh tham dự đầy đủ.', time: '20:00', date: 'Hôm qua' },
      { id: 3, from: 'other', name: 'PH Bình (mẹ)', initials: 'TM', color: T.success, text: 'Dạ cô, em sẽ có mặt ạ.', time: '20:05', date: 'Hôm qua' },
      { id: 4, from: 'me', text: 'Cảm ơn cô đã thông báo. Tôi sẽ tham dự đầy đủ.', time: '20:08', date: 'Hôm qua' },
    ],
  };
  return convos[contactId] || [
    { id: 1, from: 'them', text: 'Xin chào!', time: '09:00', date: 'Hôm nay' },
    { id: 2, from: 'me', text: 'Chào bạn!', time: '09:01', date: 'Hôm nay' },
  ];
};

const DIRECT_CONVOS_BY_ROLE = {
  teacher: [
    { contactId: 'u1', lastMsg: 'Cô có thể tham dự họp hội đồng lúc 15h hôm nay không?', time: '10:15', unread: 1 },
    { contactId: 'u3', lastMsg: 'Vâng, gia đình sẽ nhắc cháu ôn thêm. Cảm ơn cô!', time: '14:37', unread: 0 },
    { contactId: 'u4', lastMsg: 'Chị Hoa ơi, mình có thể đổi phòng học không?', time: 'Hôm qua', unread: 2 },
    { contactId: 'u5', lastMsg: 'Dạ cô, em hiểu rồi ạ.', time: 'Hôm qua', unread: 0 },
  ],
  student: [
    { contactId: 'u6', lastMsg: 'Được, tiết học ngày mai cô sẽ giải chi tiết bài đó nhé.', time: '08:50', unread: 1 },
    { contactId: 'u9', lastMsg: '👍 Ok bro!', time: '12:11', unread: 0 },
    { contactId: 'u8', lastMsg: 'Con học tốt nhé, ba nhớ con!', time: 'Hôm qua', unread: 1 },
    { contactId: 'u7', lastMsg: 'Em xem lại phần cảm ứng điện từ nhé.', time: 'Hôm qua', unread: 0 },
    { contactId: 'u10', lastMsg: 'Linh: Bao giờ thi vậy bạn?', time: '2 ngày trước', unread: 0 },
  ],
  principal: [
    { contactId: 'u11', lastMsg: 'Dạ thầy, em sẽ nộp trước thứ 5 ạ.', time: '09:00', unread: 0 },
    { contactId: 'u12', lastMsg: 'Cô Hoa báo cáo về tình trạng phòng thí nghiệm...', time: 'Hôm qua', unread: 3 },
    { contactId: 'u13', lastMsg: 'Dạ thầy ạ, em hiểu rồi.', time: 'Hôm qua', unread: 0 },
  ],
  parent: [
    { contactId: 'u15', lastMsg: 'Được, tiết học ngày mai cô sẽ giải chi tiết bài đó nhé.', time: '08:50', unread: 1 },
    { contactId: 'u16', lastMsg: 'Em Khoa cần ôn thêm phần điện từ.', time: 'Hôm qua', unread: 0 },
    { contactId: 'u17', lastMsg: 'Trường sẽ tổ chức họp phụ huynh vào 15/5.', time: '2 ngày trước', unread: 1 },
  ],
};

// Group last-activity rows — spec calls for sender-prefixed truncated preview.
const GROUP_CONVOS_BY_ROLE = {
  teacher: [
    { groupId: 'gT1', sender: 'Phan Hồng Quang', preview: 'Mình đã soạn xong slide chuyên đề, sẽ gửi lên nhóm chiều nay.', time: '09:22', unread: 3 },
    { groupId: 'gT2', sender: 'Lê Thị Hoa', preview: 'Mình ghi nhận có 2 em vắng học không phép tuần qua…', time: '08:00', unread: 0 },
    { groupId: 'gT3', sender: 'BGH', preview: '📢 Sáng thứ 6 họp hội đồng giáo viên tại hội trường…', time: 'Hôm qua', unread: 1 },
  ],
  principal: [
    { groupId: 'gA1', sender: 'Lê Thị Mai',     preview: 'Báo cáo tài chính tháng đã hoàn thành, sẽ trình bày sáng mai.', time: '17:15', unread: 2 },
    { groupId: 'gT3', sender: 'BGH',            preview: '📢 Sáng thứ 6 họp hội đồng giáo viên tại hội trường…', time: 'Hôm qua', unread: 0 },
    { groupId: 'gT1', sender: 'Trần Hoàng Long', preview: 'Mọi người, lịch họp tổ thứ 4 tuần này lúc 14h tại P.205.',     time: 'Hôm qua', unread: 1 },
  ],
  student: [
    { groupId: 'gS1', sender: 'GVCN Hương', preview: 'Trang 75–90 nhé các em. Trọng tâm là phần đạo hàm.',       time: '20:18', unread: 2 },
    { groupId: 'gS2', sender: 'GV Hương',   preview: 'Em áp dụng định lý Lagrange nhé. Sáng mai cô giải chi tiết.', time: '08:20', unread: 1 },
  ],
  parent: [
    { groupId: 'gP1', sender: 'GVCN Hương', preview: 'Kính chào quý phụ huynh, tuần tới có buổi họp phụ huynh…', time: 'Hôm qua', unread: 1 },
  ],
};

// ── Helper: time-group divider ────────────────────────────────────────────────
const groupMsgsByDate = (msgs) => {
  const groups = [];
  let lastDate = null;
  msgs.forEach(msg => {
    if (msg.date && msg.date !== lastDate) {
      groups.push({ type: 'divider', label: msg.date });
      lastDate = msg.date;
    }
    groups.push({ type: 'msg', ...msg });
  });
  return groups;
};

// ── Chat bubble — extended w/ reply quote + context menu trigger ─────────────

const ChatBubble = ({ msg, isMe, showName, senderName, senderInitials, senderColor, pColor, isGroup, onContextMenu, onScrollToReply }) => {
  if (msg.type === 'divider') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', margin: '4px 0' }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>{msg.label}</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>
    );
  }
  if (msg.from === 'system') {
    return (
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <span style={{ fontSize: 11, color: T.textMuted, background: T.bg, padding: '3px 10px', borderRadius: 99, border: `1px solid ${T.border}` }}>{msg.text}</span>
      </div>
    );
  }

  const replyTo = msg.replyTo;

  return (
    <div
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, msg); }}
      style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
      {!isMe && isGroup && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: (senderColor || T.primary) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: senderColor || T.primary, flexShrink: 0, marginBottom: 2 }}>
          {senderInitials || '?'}
        </div>
      )}
      {!isMe && !isGroup && <div style={{ width: 28, flexShrink: 0 }} />}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {!isMe && isGroup && showName && (
          <span style={{ fontSize: 11, fontWeight: 700, color: senderColor || T.primary, marginBottom: 3, marginLeft: 4 }}>{senderName}</span>
        )}
        {/* Bubble (with optional quoted-message above body) */}
        {msg.deleted ? (
          <div style={{
            padding: '8px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: T.bg, border: `1px dashed ${T.border}`,
            color: T.textMuted, fontSize: 12.5, lineHeight: 1.4,
            fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="x" size={11} color={T.textMuted} strokeWidth={2} />
            Tin nhắn đã bị xoá
          </div>
        ) : (
        <div style={{
          padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMe ? pColor : T.card,
          border: isMe ? 'none' : `1px solid ${T.border}`,
          boxShadow: isMe ? `0 2px 8px ${pColor}30` : '0 1px 4px rgba(0,0,0,0.04)',
          color: isMe ? '#fff' : T.textPrimary,
          fontSize: 13.5, lineHeight: 1.5,
          wordBreak: 'break-word',
          position: 'relative',
        }}>
          {replyTo && (
            <button onClick={() => onScrollToReply && onScrollToReply(replyTo)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                marginBottom: 8, marginTop: -2,
                padding: '6px 10px', width: '100%',
                borderRadius: 8,
                background: isMe ? 'rgba(255,255,255,0.18)' : T.bg,
                border: `1px solid ${isMe ? 'rgba(255,255,255,0.35)' : pColor + '33'}`,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: isMe ? 'rgba(255,255,255,0.9)' : pColor,
              }}>
                {replyTo.from}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: isMe ? 'rgba(255,255,255,0.85)' : T.textSecondary,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {replyTo.text}
              </span>
            </button>
          )}
          {msg.text}
          {msg.pinned && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              width: 18, height: 18, borderRadius: '50%',
              background: T.warning, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }} title="Đã ghim">
              <Icon name="star" size={9} color="#fff" strokeWidth={2.8} />
            </span>
          )}
        </div>
        )}
        <span style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3, marginLeft: 4, marginRight: 4 }}>{msg.time}</span>
      </div>
    </div>
  );
};

// ── Message context menu ────────────────────────────────────────────────────

const MessageContextMenu = ({ x, y, msg, isMine, withinOneHour, canPin = true, onAction, onClose }) => {
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Clamp position so the menu stays in the viewport.
  const W = 200, H = 226;
  const adjX = Math.min(x, window.innerWidth  - W - 8);
  const adjY = Math.min(y, window.innerHeight - H - 8);

  const items = [
    { id: 'reply',  icon: 'arrowLeft', vi: 'Trả lời',         en: 'Reply',         enabled: true },
    { id: 'pin',    icon: 'star',      vi: 'Ghim tin nhắn',   en: 'Pin message',   enabled: canPin,
      hint: !canPin ? 'Chỉ admin mới có thể ghim' : null },
    { id: 'copy',   icon: 'fileText',  vi: 'Sao chép văn bản', en: 'Copy text',    enabled: true },
    { id: 'report', icon: 'flag',      vi: 'Báo cáo',         en: 'Report',
      enabled: !isMine,
      hint: isMine ? 'Không thể báo cáo tin nhắn của bạn' : null },
    { id: 'delete', icon: 'x',         vi: 'Xóa',             en: 'Delete',
      enabled: isMine && withinOneHour, danger: true,
      hint: !isMine ? 'Chỉ xoá tin nhắn của bạn' : !withinOneHour ? 'Đã quá 1 giờ' : null },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 4000 }} />
      <div role="menu" style={{
        position: 'fixed', top: adjY, left: adjX, width: W,
        background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: 5, zIndex: 4001,
        animation: 'msg-ctx-in 0.12s ease-out',
      }}>
        {items.map((it, i) => (
          <button key={it.id} onClick={() => it.enabled && onAction(it.id, msg)}
            disabled={!it.enabled}
            title={it.hint || ''}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 7,
              border: 'none', background: 'transparent',
              cursor: it.enabled ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', textAlign: 'left',
              color: it.danger ? T.error : T.textPrimary,
              fontSize: 13, fontWeight: 600,
              opacity: it.enabled ? 1 : 0.4,
              transition: 'background 0.1s',
              marginTop: i === items.length - 1 ? 4 : 0,
              borderTop: i === items.length - 1 ? `1px solid ${T.border}` : 'none',
              paddingTop: i === items.length - 1 ? 10 : 8,
            }}
            onMouseEnter={(e) => it.enabled && (e.currentTarget.style.background = it.danger ? T.errorLight : T.bg)}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Icon name={it.icon} size={13} color={it.danger ? T.error : T.textSecondary} strokeWidth={2.2} />
            <span style={{ flex: 1 }}>{it.vi}</span>
            {!it.enabled && it.hint && (
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>·</span>
            )}
          </button>
        ))}
        <style>{`@keyframes msg-ctx-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </>
  );
};

// ── Reply strip (above input) ────────────────────────────────────────────────

const ReplyStrip = ({ replyTo, pColor, onCancel, t }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', marginBottom: 8,
    background: pColor + '0F', borderRadius: 9,
    border: `1px solid ${pColor}33`,
    animation: 'msg-reply-in 0.15s ease-out',
  }}>
    <Icon name="arrowLeft" size={13} color={pColor} strokeWidth={2.4} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: pColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {t(`Đang trả lời ${replyTo.from}`, `Replying to ${replyTo.from}`)}
      </div>
      <div style={{
        fontSize: 12, color: T.textSecondary,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        marginTop: 1,
      }}>
        {replyTo.text}
      </div>
    </div>
    <button onClick={onCancel} title={t('Huỷ', 'Cancel')}
      style={{
        width: 22, height: 22, borderRadius: 5,
        border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = pColor + '20'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
      <Icon name="x" size={12} color={pColor} strokeWidth={2.4} />
    </button>
    <style>{`@keyframes msg-reply-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
  </div>
);

// ── Create-group modal (2 steps) ─────────────────────────────────────────────

const CreateGroupModal = ({ t, pColor, onClose, onCreate }) => {
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [type, setType] = React.useState('class');
  const [colorIdx, setColorIdx] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState([]);

  const step1Valid = name.trim().length >= 2;
  const step2Valid = selected.length >= 1;

  const filteredPool = USER_SEARCH_POOL.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const handleCreate = () => {
    onCreate({
      name: name.trim(),
      desc: desc.trim(),
      type,
      color: GROUP_PALETTE[colorIdx],
      memberIds: selected,
    });
  };

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 20, backdropFilter: 'blur(3px)',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
        style={{
          background: T.card, borderRadius: 14, width: '100%', maxWidth: 460,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          animation: 'msg-fadein 0.18s ease-out',
        }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="users" size={18} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
              {t('Tạo nhóm mới', 'Create new group')}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
              fontSize: 11, color: T.textMuted,
            }}>
              <StepDot active={step === 1} done={step > 1} pColor={pColor} />
              <span style={{ fontWeight: step === 1 ? 800 : 600, color: step === 1 ? pColor : T.textMuted }}>
                {t('Thông tin nhóm', 'Group info')}
              </span>
              <span style={{ margin: '0 6px', color: T.border }}>→</span>
              <StepDot active={step === 2} done={false} pColor={pColor} />
              <span style={{ fontWeight: step === 2 ? 800 : 600, color: step === 2 ? pColor : T.textMuted }}>
                {t('Thêm thành viên', 'Add members')}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 6, borderRadius: 7, display: 'flex',
          }}>
            <Icon name="x" size={16} color={T.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          {step === 1 ? (
            <>
              {/* Group avatar preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: GROUP_PALETTE[colorIdx] + '20',
                  border: `2px solid ${GROUP_PALETTE[colorIdx]}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: GROUP_PALETTE[colorIdx], fontSize: 15, fontWeight: 900,
                  transition: 'all 0.2s',
                }}>
                  {name.trim() ? name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 3) : '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10.5, fontWeight: 800, color: T.textMuted,
                    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
                  }}>
                    {t('Màu nhóm', 'Group colour')}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {GROUP_PALETTE.map((c, i) => (
                      <button key={i} onClick={() => setColorIdx(i)}
                        style={{
                          width: 24, height: 24, borderRadius: 7,
                          background: c,
                          border: i === colorIdx ? `2.5px solid ${T.textPrimary}` : `2px solid ${T.card}`,
                          boxShadow: i === colorIdx ? `0 0 0 2px ${c}` : 'none',
                          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                          transition: 'all 0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <FieldLabel label={t('Tên nhóm', 'Group name')} required />
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={60}
                placeholder={t('VD: Nhóm GV bộ môn Toán', 'e.g. Math Teachers Group')}
                style={inputStyle(pColor)} />

              <div style={{ height: 14 }} />

              <FieldLabel label={t('Mô tả', 'Description')} optional />
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={140}
                placeholder={t('Vài dòng mô tả mục đích của nhóm…',
                               'A few words about what the group is for…')}
                style={{ ...inputStyle(pColor), resize: 'vertical', lineHeight: 1.55 }} />

              <div style={{ height: 14 }} />

              <FieldLabel label={t('Loại nhóm', 'Group type')} required />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {GROUP_TYPES.map(gt => {
                  const active = type === gt.id;
                  return (
                    <button key={gt.id} onClick={() => setType(gt.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: '10px 12px', borderRadius: 9,
                        border: `1.5px solid ${active ? pColor : T.border}`,
                        background: active ? pColor + '12' : T.card,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: `2px solid ${active ? pColor : T.border}`,
                        flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {active && <span style={{ width: 9, height: 9, borderRadius: '50%', background: pColor }} />}
                      </span>
                      <Icon name={gt.icon} size={13} color={active ? pColor : T.textMuted} strokeWidth={2} />
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: active ? pColor : T.textPrimary,
                      }}>{t(gt.vi, gt.en)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Selected chips */}
              {selected.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                  marginBottom: 12, padding: '8px 10px',
                  background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`,
                }}>
                  {selected.map(id => {
                    const u = USER_SEARCH_POOL.find(x => x.id === id);
                    if (!u) return null;
                    return (
                      <span key={id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '4px 4px 4px 10px', borderRadius: 99,
                        background: u.color + '14', border: `1px solid ${u.color}33`,
                      }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: u.color + '22', color: u.color,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800,
                        }}>
                          {u.avatar}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: u.color }}>{u.name}</span>
                        <button onClick={() => toggle(id)}
                          style={{
                            width: 16, height: 16, borderRadius: '50%',
                            border: 'none', background: u.color + '22',
                            cursor: 'pointer', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                          <Icon name="x" size={9} color={u.color} strokeWidth={2.6} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search */}
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Icon name="search" size={13} color={T.textMuted}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                  placeholder={t('Tìm theo tên hoặc vai trò…', 'Search by name or role…')}
                  style={{ ...inputStyle(pColor), paddingLeft: 34 }} />
              </div>

              {/* User list */}
              <div style={{
                border: `1px solid ${T.border}`, borderRadius: 10,
                overflow: 'hidden',
              }}>
                {filteredPool.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: T.textMuted }}>
                    {t('Không có người dùng nào khớp.', 'No matching users.')}
                  </div>
                ) : (
                  filteredPool.map((u, i) => {
                    const checked = selected.includes(u.id);
                    return (
                      <label key={u.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 11,
                          padding: '10px 14px',
                          borderBottom: i < filteredPool.length - 1 ? `1px solid ${T.border}` : 'none',
                          cursor: 'pointer', background: checked ? pColor + '0A' : T.card,
                        }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 5,
                          border: `1.5px solid ${checked ? pColor : T.border}`,
                          background: checked ? pColor : T.card,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {checked && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
                        </span>
                        <input type="checkbox" checked={checked} onChange={() => toggle(u.id)}
                          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: u.color + '22', color: u.color,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, flexShrink: 0,
                        }}>
                          {u.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{u.role}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', background: T.bg,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          {step === 2 && (
            <Button variant="ghost" icon="arrowLeft" onClick={() => setStep(1)}
              style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
              {t('Quay lại', 'Back')}
            </Button>
          )}
          {step === 1 && (
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              {t('Tối thiểu 2 ký tự cho tên nhóm.', 'Group name needs at least 2 characters.')}
            </span>
          )}
          {step === 2 && (
            <span style={{ fontSize: 11.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              {t(`Đã chọn ${selected.length} người`, `${selected.length} selected`)}
            </span>
          )}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Huỷ', 'Cancel')}
          </Button>
          {step === 1 ? (
            <Button variant="primary" icon="arrowRight" onClick={() => setStep(2)} disabled={!step1Valid}>
              {t('Tiếp theo', 'Next')}
            </Button>
          ) : (
            <Button variant="primary" icon="check" onClick={handleCreate} disabled={!step2Valid}>
              {t('Tạo nhóm', 'Create group')}
            </Button>
          )}
        </div>
        <style>{`@keyframes msg-fadein { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    </div>
  );
};

const StepDot = ({ active, done, pColor }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 18, height: 18, borderRadius: '50%',
    background: done ? T.success : (active ? pColor : T.bg),
    border: `1.5px solid ${done ? T.success : (active ? pColor : T.border)}`,
    color: done || active ? '#fff' : T.textMuted,
    fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
  }}>
    {done ? <Icon name="check" size={10} color="#fff" strokeWidth={3} /> : (active ? '●' : '')}
  </span>
);

const FieldLabel = ({ label, required, optional }) => (
  <div style={{
    fontSize: 10.5, fontWeight: 800, color: T.textMuted,
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
  }}>
    {label}
    {required && <span style={{ color: T.error, marginLeft: 4 }}>*</span>}
    {optional && <span style={{ color: T.textMuted, fontWeight: 600, marginLeft: 6, textTransform: 'none', letterSpacing: 0 }}>(tuỳ chọn)</span>}
  </div>
);

const inputStyle = (pColor) => ({
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1.5px solid ${T.border}`, background: T.card,
  fontSize: 13.5, color: T.textPrimary, fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s',
});

// ── Group info panel (right slide-in 320px) ─────────────────────────────────

const GroupInfoPanel = ({ t, pColor, group, members, pinned, isAdmin, onClose, onLeave, onDelete, onPinnedJump, onAddMembers }) => {
  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(group.name);
  const [editDesc, setEditDesc] = React.useState(group.desc || t('Mô tả nhóm sẽ hiển thị ở đây.', 'Group description appears here.'));
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  return (
    <>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.35)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        animation: 'msg-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 18px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, flex: 1 }}>
            {t('Thông tin nhóm', 'Group info')}
          </div>
          {isAdmin && !editing && (
            <button onClick={() => setEditing(true)} title={t('Chỉnh sửa', 'Edit')}
              style={iconBtnStyle(pColor)}>
              <Icon name="penLine" size={13} color={pColor} strokeWidth={2.2} />
            </button>
          )}
          <button onClick={onClose} style={iconBtnStyle(T.textMuted)}>
            <Icon name="x" size={14} color={T.textMuted} strokeWidth={2.2} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Group avatar 80x80 + name + desc */}
          <div style={{
            padding: '22px 18px', textAlign: 'center',
            borderBottom: `1px solid ${T.border}`, background: group.color + '08',
          }}>
            <div style={{
              position: 'relative', display: 'inline-block', marginBottom: 12,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: group.color + '22', color: group.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900,
                border: `3px solid ${group.color}33`,
              }}>
                {group.avatar}
              </div>
              {isAdmin && (
                <button title={t('Đổi ảnh đại diện nhóm', 'Edit group avatar')}
                  style={{
                    position: 'absolute', right: -4, bottom: -4,
                    width: 28, height: 28, borderRadius: '50%',
                    background: pColor, color: '#fff', border: `3px solid ${T.card}`,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  }}>
                  <Icon name="penLine" size={11} color="#fff" strokeWidth={2.4} />
                </button>
              )}
            </div>
            {editing ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  style={{
                    ...inputStyle(pColor), textAlign: 'center', fontWeight: 800, fontSize: 16,
                    marginBottom: 8,
                  }} />
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  rows={2} placeholder={t('Mô tả nhóm…', 'Group description…')}
                  style={{ ...inputStyle(pColor), textAlign: 'center', fontSize: 12.5, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
                  <Button variant="ghost" onClick={() => setEditing(false)}
                    style={{ border: `1px solid ${T.border}`, color: T.textSecondary }} size="sm">
                    {t('Huỷ', 'Cancel')}
                  </Button>
                  <Button variant="primary" icon="check" onClick={() => setEditing(false)} size="sm">
                    {t('Lưu', 'Save')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, lineHeight: 1.3 }}>
                  {editName || group.name}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, lineHeight: 1.5, padding: '0 6px' }}>
                  {editDesc}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
                  padding: '3px 9px', borderRadius: 99,
                  background: T.bg, border: `1px solid ${T.border}`,
                  fontSize: 11, fontWeight: 700, color: T.textSecondary,
                }}>
                  <Icon name="users" size={11} color={T.textSecondary} />
                  {members.length} {t('thành viên', 'members')}
                </div>
              </>
            )}
          </div>

          {/* Members section */}
          <PanelSection
            title={t(`Thành viên (${members.length})`, `Members (${members.length})`)}
            rightAction={isAdmin
              ? <button onClick={onAddMembers} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 800, color: pColor,
                  fontFamily: 'inherit', padding: 0,
                }}>+ {t('Thêm', 'Add')}</button>
              : null}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', background: T.bg }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: T.success, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: T.textSecondary }}>
                  {members.filter(mm => msgPresence(mm) !== 'offline').length} {t('đang hoạt động', 'online now')}
                </span>
              </div>
              {[...members].sort((a, b) => {
                const rank = (m) => ({ online: 2, recent: 1 }[msgPresence(m)] || 0);
                return rank(b) - rank(a);
              }).map((m, i) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 18px',
                  borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                  opacity: msgPresence(m) !== 'offline' ? 1 : 0.6,
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: m.color + '22', color: m.color,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                      filter: msgPresence(m) !== 'offline' ? 'none' : 'grayscale(20%)',
                    }}>
                      {m.avatar}
                    </div>
                    <MSGPresenceDot presence={msgPresence(m)} size={9} offset={0} label={t('đang hoạt động', 'online')} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, lineHeight: 1.3 }}>
                      {m.name}
                      {m.isSelf && (
                        <span style={{ marginLeft: 5, fontSize: 10, color: T.textMuted, fontWeight: 600 }}>
                          ({t('Bạn', 'You')})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
                      {m.role}
                    </div>
                  </div>
                  {m.admin && (
                    <Badge color={T.error} bg={T.errorLight}>
                      Admin
                    </Badge>
                  )}
                  {isAdmin && !m.isSelf && !m.admin && (
                    <button title={t('Xoá khỏi nhóm', 'Remove')}
                      style={{
                        width: 22, height: 22, borderRadius: 5,
                        border: `1px solid ${T.border}`, background: T.card,
                        cursor: 'pointer', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.errorLight; e.currentTarget.style.borderColor = T.error; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = T.card; e.currentTarget.style.borderColor = T.border; }}>
                      <Icon name="x" size={10} color={T.error} strokeWidth={2.4} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </PanelSection>

          {/* Pinned section */}
          <PanelSection
            title={t(`Tin nhắn đã ghim (${pinned.length})`, `Pinned messages (${pinned.length})`)}>
            {pinned.length === 0 ? (
              <div style={{
                padding: '18px 18px', textAlign: 'center', color: T.textMuted,
                fontSize: 12, fontStyle: 'italic',
              }}>
                {t('Chưa có tin nhắn nào được ghim. Nhấp phải vào tin nhắn để ghim.',
                   'No pinned messages yet. Right-click a message to pin it.')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pinned.map((p, i) => (
                  <button key={p.id} onClick={() => onPinnedJump && onPinnedJump(p)}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '10px 18px',
                      borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: T.warning + '22', color: T.warning,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="star" size={10} color={T.warning} strokeWidth={2.6} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.textPrimary, marginBottom: 2 }}>
                        {p.from} · <span style={{ color: T.textMuted, fontWeight: 600 }}>{p.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                        {p.text}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </PanelSection>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 18px', borderTop: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
        }}>
          {!confirmDelete ? (
            <>
              <Button variant="ghost" icon="arrowLeft" onClick={onLeave}
                style={{
                  border: `1px solid ${T.warning}55`,
                  color: T.warning, background: T.warningLight,
                  width: '100%', justifyContent: 'center',
                }}>
                {t('Rời nhóm', 'Leave group')}
              </Button>
              {isAdmin && (
                <Button variant="ghost" icon="x" onClick={() => setConfirmDelete(true)}
                  style={{
                    border: `1px solid ${T.error}55`,
                    color: T.error, background: T.errorLight,
                    width: '100%', justifyContent: 'center',
                  }}>
                  {t('Xoá nhóm', 'Delete group')}
                </Button>
              )}
            </>
          ) : (
            <div style={{ padding: 6, fontSize: 12, color: T.textSecondary, textAlign: 'center' }}>
              {t('Xoá nhóm là hành động không thể hoàn tác.', 'Deleting a group cannot be undone.')}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}
                  style={{ border: `1px solid ${T.border}`, color: T.textSecondary, flex: 1 }}
                  size="sm">
                  {t('Huỷ', 'Cancel')}
                </Button>
                <Button variant="danger" icon="x" onClick={onDelete} style={{ flex: 1 }} size="sm">
                  {t('Xác nhận xoá', 'Confirm delete')}
                </Button>
              </div>
            </div>
          )}
        </div>
        <style>{`@keyframes msg-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      </div>
    </>
  );
};

const PanelSection = ({ title, children, rightAction }) => (
  <div style={{ borderBottom: `1px solid ${T.border}` }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '14px 18px 8px',
      fontSize: 10.5, fontWeight: 800, color: T.textMuted,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      <span style={{ flex: 1 }}>{title}</span>
      {rightAction}
    </div>
    {children}
  </div>
);

const iconBtnStyle = (color) => ({
  width: 28, height: 28, borderRadius: 7,
  border: `1px solid ${T.border}`, background: T.card,
  cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
});

// ── Skeleton bubbles for loading state ──────────────────────────────────────

const SkeletonBubbles = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
    {[
      { side: 'left',  w: 220 },
      { side: 'left',  w: 160 },
      { side: 'right', w: 200 },
      { side: 'left',  w: 240 },
      { side: 'right', w: 140 },
    ].map((r, i) => (
      <div key={i} style={{
        display: 'flex', justifyContent: r.side === 'left' ? 'flex-start' : 'flex-end',
      }}>
        <div style={{
          width: r.w, height: 28, borderRadius: r.side === 'left' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
          background: `linear-gradient(90deg, ${T.bg} 0%, #F2F5F9 50%, ${T.bg} 100%)`,
          backgroundSize: '200% 100%',
          animation: `msg-shimmer 1.2s linear infinite`,
          animationDelay: `${i * 0.08}s`,
        }} />
      </div>
    ))}
    <style>{`@keyframes msg-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
  </div>
);

// ── Main Messaging Screen ─────────────────────────────────────────────────────

const MessagingScreen = ({ role, lang, primaryColor }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const contacts = CONTACTS_BY_ROLE[role] || [];
  const baseGroups = GROUPS_BY_ROLE[role] || [];
  const directConvos = DIRECT_CONVOS_BY_ROLE[role] || [];
  const baseGroupConvos = GROUP_CONVOS_BY_ROLE[role] || [];

  // Local mutable state — groups + last-activity rows may grow when the user
  // creates a new group.
  const [groups, setGroups] = React.useState(baseGroups);
  const [groupConvos, setGroupConvos] = React.useState(baseGroupConvos);
  const [pinnedByGroup, setPinnedByGroup] = React.useState(GROUP_PINNED_BY_GROUP);

  const [tab, setTab] = React.useState('direct');
  const [activeId, setActiveId] = React.useState(directConvos[0]?.contactId || null);
  const [isGroup, setIsGroup] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [localMsgs, setLocalMsgs] = React.useState({});
  const [deletedMsgIds, setDeletedMsgIds] = React.useState({});
  const [showNewMsg, setShowNewMsg] = React.useState(false);
  const [showCreateGroup, setShowCreateGroup] = React.useState(false);
  const [showInfoPanel, setShowInfoPanel] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [contextMenu, setContextMenu] = React.useState(null);
  const [loadingChat, setLoadingChat] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [reportTarget, setReportTarget] = React.useState(null);
  const [reportToast, setReportToast] = React.useState(null);
  // SSE design tie-in (US-068 / ADR-0041): UI flag pulses when a `message.new`
  // event is received from /api/v1/social/events.
  const [sseFlash, setSseFlash] = React.useState(false);

  const messagesEndRef = React.useRef(null);

  // Auto-scroll to bottom on switch / new message.
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [activeId, localMsgs]);

  // Loading skeleton on chat switch (decorative — feels like SSE re-subscribe).
  React.useEffect(() => {
    if (!activeId) return;
    setLoadingChat(true);
    const tid = window.setTimeout(() => setLoadingChat(false), 320);
    return () => window.clearTimeout(tid);
  }, [activeId]);

  // ── SSE realtime mock (US-068 / ADR-0041) ──────────────────────────────────────────
  // 3 s after the screen mounts, fake a `message.new` push from
  // /api/v1/social/events and append it into the active conversation.
  // Demonstrates that bubbles are added without a reload (reactive state).
  const sseLatest = React.useRef({ activeId, isGroup, lang });
  sseLatest.current = { activeId, isGroup, lang };
  React.useEffect(() => {
    const tid = window.setTimeout(() => {
      const s = sseLatest.current;
      if (!s.activeId) return;
      const incoming = {
        id: `sse-${Date.now()}`,
        from: 'other',
        name:     s.isGroup ? 'Hoàng Thị Linh' : 'Hệ thống',
        initials: s.isGroup ? 'HL' : 'SSE',
        color:    s.isGroup ? T.error : T.success,
        text: s.lang === 'en'
          ? '📡 message.new — a fresh event arrived over SSE and was appended without a reload.'
          : '📡 Đây là tin nhắn realtime được đẩy từ SSE — không cần tải lại trang.',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        date: s.lang === 'en' ? 'Today' : 'Hôm nay',
        sse: true,
      };
      setLocalMsgs(prev => ({ ...prev, [s.activeId]: [...(prev[s.activeId] || []), incoming] }));
      setSseFlash(true);
      window.setTimeout(() => setSseFlash(false), 2400);
    }, 3000);
    return () => window.clearTimeout(tid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- spec: "3 s after the component mounts"

  // Resolvers
  const getContact = (id) => contacts.find(c => c.id === id);
  const getGroup = (id) => groups.find(g => g.id === id);

  const getMessages = (id) => {
    const base = generateMessages(id, 'NK', pColor, 'U', T.primary);
    const extra = localMsgs[id] || [];
    const deleted = deletedMsgIds[id] || [];
    // Soft-delete: keep the row in place and tombstone it, so reply threads
    // and surrounding context don't collapse.
    return [...base, ...extra].map(m => deleted.includes(m.id) ? { ...m, deleted: true } : m);
  };

  const allMsgs = activeId ? groupMsgsByDate(getMessages(activeId)) : [];

  const sendMessage = () => {
    if (!input.trim() || !activeId) return;
    const newMsg = {
      id: Date.now(), from: 'me', text: input.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: t('Hôm nay', 'Today'),
      createdAt: Date.now(),
      ...(replyingTo ? { replyTo: { from: replyingTo.from === 'me' ? t('Bạn', 'You') : (replyingTo.name || t('Họ', 'Them')), text: replyingTo.text } } : {}),
    };
    setLocalMsgs(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), newMsg] }));
    setInput('');
    setReplyingTo(null);
  };

  // Context menu actions
  const handleCtxAction = (action, msg) => {
    setContextMenu(null);
    if (action === 'reply') {
      setReplyingTo({
        ...msg,
        // For group bubbles `msg.name` is set; for direct it's empty.
      });
    }
    if (action === 'copy') {
      try { navigator.clipboard?.writeText(msg.text); } catch (e) { /* noop */ }
    }
    if (action === 'pin') {
      setPinnedByGroup(prev => {
        const list = prev[activeId] || [];
        if (list.find(p => p.id === msg.id)) return prev;
        const sender = msg.from === 'me' ? t('Bạn', 'You') : (msg.name || t('Họ', 'Them'));
        return {
          ...prev,
          [activeId]: [...list, { id: msg.id, from: sender, text: msg.text, time: msg.time }],
        };
      });
      // Mark the bubble as pinned visually.
      setLocalMsgs(prev => {
        const list = prev[activeId] || [];
        // If the message originated from the base seed, we still need to add a
        // local override row to mark it pinned — use the same id.
        const found = list.find(m => m.id === msg.id);
        if (found) {
          return {
            ...prev,
            [activeId]: list.map(m => m.id === msg.id ? { ...m, pinned: true } : m),
          };
        }
        return prev;
      });
    }
    if (action === 'report') {
      setReportTarget({
        kind: 'message',
        text: msg.text,
        authorName: msg.name || t('Người dùng', 'User'),
      });
    }
    if (action === 'delete') {
      // Confirm via AlertDialog per spec — soft-delete only after the user confirms.
      setPendingDelete(msg);
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete || !activeId) return;
    setDeletedMsgIds(prev => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), pendingDelete.id],
    }));
    setPendingDelete(null);
  };

  // Create-group submission.
  const handleCreateGroup = ({ name, desc, type, color, memberIds }) => {
    const newId = `gC${Date.now()}`;
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'NH';
    const newGroup = {
      id: newId, name, nameEn: name, members: memberIds.length + 1,
      avatar: initials, color, type, desc, selfIsAdmin: true,
    };
    setGroups(gs => [newGroup, ...gs]);
    setGroupConvos(gc => [
      { groupId: newId, sender: t('Bạn', 'You'), preview: t('Bạn đã tạo nhóm.', 'You created the group.'), time: t('Vừa xong', 'Just now'), unread: 0 },
      ...gc,
    ]);
    // Seed the members list for the panel.
    const selfMember = { id: `self-${newId}`, name: t('Bạn', 'You'), avatar: 'YOU', color, role: t('Người tạo', 'Creator'), online: true, admin: true, isSelf: true };
    const otherMembers = memberIds.map(id => {
      const u = USER_SEARCH_POOL.find(x => x.id === id);
      if (!u) return null;
      return { id: u.id, name: u.name, avatar: u.avatar, color: u.color, role: u.role, online: false, admin: false, isSelf: false };
    }).filter(Boolean);
    GROUP_MEMBERS_BY_GROUP[newId] = [selfMember, ...otherMembers];

    setShowCreateGroup(false);
    setTab('groups');
    setActiveId(newId);
    setIsGroup(true);
  };

  const activeContact = !isGroup ? getContact(activeId) : null;
  const activeGroup = isGroup ? getGroup(activeId) : null;
  const activeName = isGroup ? (lang === 'en' ? activeGroup?.nameEn : activeGroup?.name) : (lang === 'en' ? activeContact?.nameEn : activeContact?.name);
  const activeColor = isGroup ? activeGroup?.color : activeContact?.color;

  const filteredDirect = directConvos.filter(c => {
    const contact = getContact(c.contactId);
    const name = lang === 'en' ? contact?.nameEn : contact?.name;
    return !search || name?.toLowerCase().includes(search.toLowerCase());
  });
  const filteredGroups = groupConvos.filter(c => {
    const group = getGroup(c.groupId);
    if (!group) return false;
    const name = lang === 'en' ? group?.nameEn : group?.name;
    return !search || name?.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = [...directConvos, ...groupConvos].reduce((s, c) => s + (c.unread || 0), 0);

  // ── Conversation item ──
  const ConvoItem = ({ id, lastMsg, sender, time, unread, isGroupItem }) => {
    const item = isGroupItem ? getGroup(id) : getContact(id);
    if (!item) return null;
    const name = lang === 'en' ? item.nameEn : item.name;
    const isActive = activeId === id && isGroup === isGroupItem;
    const itemColor = item.color || pColor;

    return (
      <button onClick={() => { setActiveId(id); setIsGroup(isGroupItem); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: isActive ? pColor + '16' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.bg; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: isGroupItem ? 12 : '50%',
            background: itemColor + '20', color: itemColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800,
          }}>
            {item.avatar}
          </div>
          {!isGroupItem && <MSGPresenceDot presence={msgPresence(item)} lang={lang} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 6 }}>
            <span style={{
              fontSize: 13.5, fontWeight: unread > 0 ? 800 : 600, color: T.textPrimary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
            }}>{name}</span>
            <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{time}</span>
          </div>
          {isGroupItem ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11.5, color: T.textMuted, lineHeight: 1.3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {sender && (
                  <span style={{ fontWeight: 700, color: T.textSecondary }}>{sender}:</span>
                )}
                <span style={{
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: unread > 0 ? 700 : 400,
                  color: unread > 0 ? T.textSecondary : T.textMuted,
                }}>
                  {lastMsg}
                </span>
                {unread > 0 && (
                  <span style={{
                    background: T.errorDark, color: T.errorForeground,
                    borderRadius: 99, fontSize: 10, fontWeight: 800,
                    padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0,
                  }}>{unread}</span>
                )}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3,
                padding: '1px 7px', borderRadius: 4,
                background: T.bg, fontSize: 10, fontWeight: 700, color: T.textMuted,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <Icon name="users" size={9} color={T.textMuted} />
                {item.members} {t('thành viên', 'members')}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 12, color: unread > 0 ? T.textSecondary : T.textMuted,
                fontWeight: unread > 0 ? 600 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
              }}>{lastMsg}</span>
              {unread > 0 && (
                <span style={{
                  background: pColor, color: '#fff',
                  borderRadius: 99, fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0, marginLeft: 4,
                }}>{unread}</span>
              )}
            </div>
          )}
        </div>
      </button>
    );
  };

  // ── Active group members for info panel ──
  const activeGroupMembers = activeGroup ? (GROUP_MEMBERS_BY_GROUP[activeGroup.id] || []) : [];
  const activeGroupPinned = activeGroup ? (pinnedByGroup[activeGroup.id] || []) : [];
  const selfIsGroupAdmin = activeGroup?.selfIsAdmin || false;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      {/* Left pane */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', background: T.card, overflow: 'hidden' }}>
        {/* Pane header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{t('Tin nhắn', 'Messages')}</span>
              {totalUnread > 0 && (
                <span style={{ background: pColor, color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 7px' }}>{totalUnread}</span>
              )}
            </div>
            <button onClick={() => setShowNewMsg(true)} title={t('Tin nhắn mới', 'New Message')}
              style={{ width: 32, height: 32, borderRadius: 9, background: pColor + '15', border: `1px solid ${pColor}30`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={15} color={pColor} strokeWidth={2.5} />
            </button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon name="search" size={13} color={T.textMuted} />
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('Tìm kiếm...', 'Search...')}
              style={{ width: '100%', padding: '8px 10px 8px 30px', border: `1.5px solid ${T.border}`, borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: T.bg, color: T.textPrimary, transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {[{ id: 'direct', vi: 'Trực tiếp', en: 'Direct' }, { id: 'groups', vi: 'Nhóm', en: 'Groups' }].map(tb => (
            <button key={tb.id}
              onClick={() => {
                setTab(tb.id);
                if (tb.id === 'direct' && directConvos[0]) { setActiveId(directConvos[0].contactId); setIsGroup(false); }
                else if (tb.id === 'groups' && groupConvos[0]) { setActiveId(groupConvos[0].groupId); setIsGroup(true); }
              }}
              style={{
                flex: 1, padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === tb.id ? 700 : 500, color: tab === tb.id ? pColor : T.textMuted,
                borderBottom: `2px solid ${tab === tb.id ? pColor : 'transparent'}`, marginBottom: -1, transition: 'color 0.15s',
              }}>
              {t(tb.vi, tb.en)}
              {tb.id === 'groups' && groupConvos.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 800,
                  background: tab === 'groups' ? pColor + '22' : T.bg,
                  color: tab === 'groups' ? pColor : T.textMuted,
                  padding: '1px 6px', borderRadius: 99,
                }}>{groupConvos.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Groups tab sub-header: "+ Tạo nhóm" CTA */}
        {tab === 'groups' && (
          <button onClick={() => setShowCreateGroup(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderTop: 'none',
              borderBottom: `1px solid ${T.border}`,
              background: pColor + '08', color: pColor, cursor: 'pointer',
              border: 'none', borderBottom: `1px solid ${T.border}`,
              fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = pColor + '12'}
            onMouseLeave={e => e.currentTarget.style.background = pColor + '08'}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: pColor, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="plus" size={12} color="#fff" strokeWidth={2.6} />
            </span>
            {t('Tạo nhóm mới', 'Create new group')}
          </button>
        )}

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'direct' && (
            filteredDirect.length > 0
              ? filteredDirect.map(c => <ConvoItem key={c.contactId} id={c.contactId} lastMsg={c.lastMsg} time={c.time} unread={c.unread} isGroupItem={false} />)
              : <div style={{ padding: 24, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>{t('Không tìm thấy', 'No results')}</div>
          )}
          {tab === 'groups' && (
            filteredGroups.length > 0
              ? filteredGroups.map(c => <ConvoItem key={c.groupId} id={c.groupId} lastMsg={c.preview} sender={c.sender} time={c.time} unread={c.unread} isGroupItem={true} />)
              : (
                <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <Icon name="users" size={36} color={T.border} strokeWidth={1.4} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, marginTop: 8 }}>
                    {t('Bạn chưa tham gia nhóm nào.', "You haven't joined any groups yet.")}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4, marginBottom: 14 }}>
                    {t('Tạo nhóm mới để cộng tác với đồng nghiệp.', 'Create a new group to collaborate.')}
                  </div>
                  <Button variant="primary" icon="plus" onClick={() => setShowCreateGroup(true)} size="sm">
                    {t('Tạo nhóm mới', 'Create new group')}
                  </Button>
                </div>
              )
          )}
        </div>
      </div>

      {/* Right: chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFF', overflow: 'hidden' }}>
        {activeId ? (
          <>
            {/* Chat header — group name clickable */}
            <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button
                onClick={() => { if (isGroup) setShowInfoPanel(true); }}
                disabled={!isGroup}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, flex: 1,
                  background: 'transparent', border: 'none', padding: 0,
                  cursor: isGroup ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left',
                }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: isGroup ? 11 : '50%',
                    background: (activeColor || pColor) + '20', color: activeColor || pColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {isGroup ? activeGroup?.avatar : activeContact?.avatar}
                  </div>
                  {!isGroup && <MSGPresenceDot presence={msgPresence(activeContact)} lang={lang} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: T.textPrimary,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    {activeName}
                    {isGroup && <Icon name="chevronRight" size={11} color={T.textMuted} strokeWidth={2.4} />}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>
                    {isGroup
                      ? `${activeGroup?.members} ${t('thành viên', 'members')}`
                      : msgPresenceCaption(activeContact, lang)
                    }
                  </div>
                </div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* SSE live indicator — /api/v1/social/events */}
                <div title={t('Kết nối realtime SSE · /api/v1/social/events', 'Realtime SSE connection · /api/v1/social/events')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 9px', borderRadius: 99,
                    background: sseFlash ? T.success + '24' : T.success + '12',
                    border: `1px solid ${sseFlash ? T.success + '80' : T.success + '30'}`,
                    fontSize: 10, fontWeight: 800, color: T.success,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    transition: 'all 0.25s',
                  }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', background: T.success,
                    boxShadow: `0 0 0 ${sseFlash ? 4 : 2}px ${T.success}33`,
                    animation: sseFlash ? 'sse-pulse 0.9s ease-out 2' : 'none',
                  }} />
                  {sseFlash ? t('Tin mới', 'New') : t('Trực tuyến', 'Live')}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ icon: 'search' }, { icon: 'bell' }, { icon: 'info', onClick: () => isGroup && setShowInfoPanel(true) }].map((btn, i) => (
                    <button key={i} onClick={btn.onClick}
                      style={{ width: 34, height: 34, borderRadius: 9, background: T.bg, border: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={btn.icon} size={14} color={T.textMuted} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div ref={messagesEndRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loadingChat ? (
                <SkeletonBubbles />
              ) : (
                <>
                  {allMsgs.map((msg, i) => (
                    <ChatBubble
                      key={msg.id || i}
                      msg={msg}
                      isMe={msg.from === 'me'}
                      isGroup={isGroup}
                      pColor={pColor}
                      showName={msg.from === 'other' && (i === 0 || allMsgs[i - 1]?.from !== 'other' || allMsgs[i - 1]?.name !== msg.name)}
                      senderName={msg.name}
                      senderInitials={msg.initials}
                      senderColor={msg.color}
                      onContextMenu={(e, m) => setContextMenu({ x: e.clientX, y: e.clientY, msg: m })}
                    />
                  ))}
                  {!isGroup && activeContact?.online && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: (activeColor || pColor) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: activeColor || pColor, flexShrink: 0 }}>
                        {activeContact?.avatar}
                      </div>
                      <div style={{ padding: '8px 14px', background: T.card, borderRadius: '16px 16px 16px 4px', border: `1px solid ${T.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>
                        {[0, 1, 2].map(j => (
                          <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMuted, animation: `msg-typing 1.2s ${j * 0.18}s ease-in-out infinite` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input area */}
            <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '12px 16px', flexShrink: 0 }}>
              {/* Reply strip */}
              {replyingTo && (
                <ReplyStrip
                  replyTo={{
                    from: replyingTo.from === 'me' ? t('chính bạn', 'yourself') : (replyingTo.name || (lang === 'en' ? activeContact?.nameEn : activeContact?.name) || t('Họ', 'Them')),
                    text: replyingTo.text,
                  }}
                  pColor={pColor} t={t}
                  onCancel={() => setReplyingTo(null)}
                />
              )}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {[{ icon: 'plus', title: t('Đính kèm', 'Attach') }, { icon: 'star', title: 'Emoji' }].map((btn, i) => (
                    <button key={i} title={btn.title} style={{ width: 34, height: 34, borderRadius: 9, background: T.bg, border: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={btn.icon} size={14} color={T.textMuted} />
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={replyingTo
                      ? t('Trả lời tin nhắn… (Enter để gửi)', 'Reply… (Enter to send)')
                      : t('Nhập tin nhắn... (Enter để gửi)', 'Type a message... (Enter to send)')}
                    rows={1}
                    style={{
                      width: '100%', padding: '9px 14px', borderRadius: 22, border: `1.5px solid ${T.border}`,
                      fontSize: 13.5, fontFamily: 'inherit', outline: 'none', resize: 'none',
                      background: T.bg, color: T.textPrimary, lineHeight: 1.5, transition: 'border-color 0.15s',
                      maxHeight: 120, overflowY: 'auto',
                    }}
                    onFocus={e => e.target.style.borderColor = pColor}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>
                <button onClick={sendMessage} disabled={!input.trim()}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                    background: input.trim() ? pColor : T.bg,
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                    boxShadow: input.trim() ? `0 2px 8px ${pColor}40` : 'none',
                  }}>
                  <Icon name="arrowRight" size={16} color={input.trim() ? '#fff' : T.textMuted} strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.textMuted, gap: 12 }}>
            <Icon name="message" size={52} color={T.border} strokeWidth={1.2} />
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary }}>{t('Chọn một cuộc trò chuyện', 'Select a conversation')}</div>
            <div style={{ fontSize: 13, color: T.textMuted }}>{t('Nhấn vào một cuộc trò chuyện để bắt đầu nhắn tin', 'Click a conversation to start messaging')}</div>
          </div>
        )}
      </div>

      {/* New message modal (existing flow) */}
      {showNewMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: T.card, borderRadius: 16, padding: 24, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Tin nhắn mới', 'New Message')}</div>
              <button onClick={() => setShowNewMsg(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Icon name="x" size={16} color={T.textMuted} />
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <Icon name="search" size={13} color={T.textMuted} />
              </div>
              <input placeholder={t('Tìm kiếm người dùng...', 'Search users...')}
                style={{ width: '100%', padding: '9px 12px 9px 30px', border: `1.5px solid ${T.border}`, borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: T.bg }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('Gợi ý', 'Suggestions')}</div>
            {contacts.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => { setActiveId(c.id); setIsGroup(false); setTab('direct'); setShowNewMsg(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8, transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: c.color }}>{c.avatar}</div>
                  {c.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: T.success, border: `2px solid ${T.card}` }} />}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{lang === 'en' ? c.nameEn : c.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{lang === 'en' ? c.roleEn : c.role}</div>
                </div>
                <Icon name="arrowRight" size={13} color={T.textMuted} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create-group modal */}
      {showCreateGroup && (
        <CreateGroupModal
          t={t} pColor={pColor}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* Group info panel */}
      {showInfoPanel && activeGroup && (
        <GroupInfoPanel
          t={t} pColor={pColor}
          group={activeGroup}
          members={activeGroupMembers}
          pinned={activeGroupPinned}
          isAdmin={selfIsGroupAdmin}
          onClose={() => setShowInfoPanel(false)}
          onLeave={() => { setShowInfoPanel(false); }}
          onDelete={() => {
            setGroups(gs => gs.filter(g => g.id !== activeGroup.id));
            setGroupConvos(gc => gc.filter(c => c.groupId !== activeGroup.id));
            setShowInfoPanel(false);
            setActiveId(directConvos[0]?.contactId || null);
            setIsGroup(false);
            setTab('direct');
          }}
          onPinnedJump={() => { /* would scroll to message in production */ }}
          onAddMembers={() => { setShowInfoPanel(false); setShowCreateGroup(true); }}
        />
      )}

      {/* Message context menu */}
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x} y={contextMenu.y} msg={contextMenu.msg}
          isMine={contextMenu.msg.from === 'me'}
          canPin={!isGroup || selfIsGroupAdmin}
          withinOneHour={
            // Only locally-sent messages have createdAt; seed messages are always
            // considered older than 1h → delete is allowed only on fresh local sends.
            (contextMenu.msg.createdAt && (Date.now() - contextMenu.msg.createdAt) < 3600000)
            || false
          }
          onAction={handleCtxAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      <style>{`
        @keyframes msg-typing {
          0%, 70%, 100% { opacity: 0.35; transform: translateY(0); }
          35%           { opacity: 1;    transform: translateY(-3px); }
        }
        @keyframes sse-pulse {
          0%   { box-shadow: 0 0 0 0   ${T.success}55; }
          70%  { box-shadow: 0 0 0 10px ${T.success}00; }
          100% { box-shadow: 0 0 0 0   ${T.success}00; }
        }
        @keyframes msg-fadein {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Delete-confirmation AlertDialog (spec §3) */}
      {pendingDelete && (
        <div onClick={() => setPendingDelete(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: 20, backdropFilter: 'blur(3px)',
          }}>
          <div onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true"
            style={{
              background: T.card, borderRadius: 14, width: '100%', maxWidth: 380,
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
              animation: 'msg-fadein 0.18s ease-out',
            }}>
            <div style={{ padding: '20px 22px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: T.errorLight, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="alertTriangle" size={17} color={T.error} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35 }}>
                  {t('Xoá tin nhắn này?', 'Delete this message?')}
                </div>
                <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
                  {t('Hành động không thể hoàn tác. Tin nhắn sẽ hiển thị dạng “Tin nhắn đã bị xoá” trong cuộc trò chuyện.',
                    'This cannot be undone. The bubble will be replaced by “Message deleted” in the conversation.')}
                </div>
                {/* Quoted preview of the message being deleted */}
                <div style={{
                  marginTop: 10, padding: '7px 10px',
                  background: `${T.error}14`, border: `1px solid ${T.error}33`, borderRadius: 8,
                  fontSize: 12, color: T.textSecondary, lineHeight: 1.4,
                  maxHeight: 60, overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {pendingDelete.text}
                </div>
              </div>
            </div>
            <div style={{
              padding: '12px 22px', background: T.bg,
              borderTop: `1px solid ${T.border}`,
              display: 'flex', gap: 8, justifyContent: 'flex-end',
            }}>
              <Button variant="ghost" onClick={() => setPendingDelete(null)} size="sm"
                style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
                {t('Huỷ', 'Cancel')}
              </Button>
              <Button variant="danger" icon="x" onClick={confirmDelete} size="sm">
                {t('Xác nhận xoá', 'Confirm delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Report-content dialog (shared component from ui.jsx) */}
      {reportTarget && (
        <ReportContentDialog target={reportTarget} onClose={() => setReportTarget(null)}
          onSubmit={() => {
            setReportTarget(null);
            setReportToast(t('Đã gửi báo cáo. BGH sẽ xem xét.', 'Report sent. School leadership will review it.'));
            window.setTimeout(() => setReportToast(null), 2600);
          }}
          lang={lang} primaryColor={pColor} />
      )}
      {reportToast && (
        <div role="status" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff', borderRadius: 99,
          padding: '10px 20px', fontSize: 12.5, fontWeight: 600, zIndex: 9500,
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        }}>{reportToast}</div>
      )}
    </div>
  );
};

Object.assign(window, { MessagingScreen });
