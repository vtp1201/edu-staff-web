// ── Cụm C: Nhắn tin / Messaging ──────────────────────────────────────────────

// ── Mock data ─────────────────────────────────────────────────────────────────

const CONTACTS_BY_ROLE = {
  teacher: [
    { id: 'u1', name: 'Trần Minh Quân', nameEn: 'Tran Minh Quan', role: 'Hiệu trưởng', roleEn: 'Principal', avatar: 'TQ', color: T.success, online: true },
    { id: 'u2', name: 'Phạm Quốc Bảo', nameEn: 'Pham Quoc Bao', role: 'Giáo viên Văn', roleEn: 'Literature Teacher', avatar: 'PB', color: T.purple, online: false },
    { id: 'u3', name: 'Nguyễn Văn Đức', nameEn: 'Nguyen Van Duc', role: 'Phụ huynh HS Khoa', roleEn: 'Parent of Khoa', avatar: 'ND', color: T.purple, online: true },
    { id: 'u4', name: 'Lê Thị Hoa', nameEn: 'Le Thi Hoa', role: 'Giáo viên Hóa', roleEn: 'Chemistry Teacher', avatar: 'LH', color: T.warning, online: true },
    { id: 'u5', name: 'Nguyễn Minh Khoa', nameEn: 'Nguyen Minh Khoa', role: 'Học sinh 11A2', roleEn: 'Student 11A2', avatar: 'NK', color: T.warning, online: false },
  ],
  student: [
    { id: 'u6', name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', role: 'GV Toán', roleEn: 'Math Teacher', avatar: 'NH', color: T.primary, online: true },
    { id: 'u7', name: 'Trần Văn Minh', nameEn: 'Tran Van Minh', role: 'GV Vật Lý', roleEn: 'Physics Teacher', avatar: 'TM', color: T.success, online: false },
    { id: 'u8', name: 'Nguyễn Văn Đức', nameEn: 'Nguyen Van Duc', role: 'Phụ huynh', roleEn: 'Parent', avatar: 'ND', color: T.purple, online: true },
    { id: 'u9', name: 'Trần Văn Bình', nameEn: 'Tran Van Binh', role: 'Bạn cùng lớp 11A2', roleEn: 'Classmate 11A2', avatar: 'TB', color: T.teal, online: true },
    { id: 'u10', name: 'Hoàng Thị Linh', nameEn: 'Hoang Thi Linh', role: 'Bạn cùng lớp 11A2', roleEn: 'Classmate 11A2', avatar: 'HL', color: T.error, online: false },
  ],
  principal: [
    { id: 'u11', name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', role: 'GV Toán', roleEn: 'Math Teacher', avatar: 'NH', color: T.primary, online: true },
    { id: 'u12', name: 'Lê Thị Hoa', nameEn: 'Le Thi Hoa', role: 'GV Hóa', roleEn: 'Chemistry Teacher', avatar: 'LH', color: T.warning, online: true },
    { id: 'u13', name: 'Đỗ Thị Mai', nameEn: 'Do Thi Mai', role: 'GV Anh', roleEn: 'English Teacher', avatar: 'DM', color: T.teal, online: false },
    { id: 'u14', name: 'Phạm Quốc Bảo', nameEn: 'Pham Quoc Bao', role: 'GV Văn', roleEn: 'Literature Teacher', avatar: 'PB', color: T.purple, online: false },
  ],
  parent: [
    { id: 'u15', name: 'Nguyễn Thị Hương', nameEn: 'Nguyen Thi Huong', role: 'GVCN lớp 11A2', roleEn: 'Homeroom 11A2', avatar: 'NH', color: T.primary, online: true },
    { id: 'u16', name: 'Trần Văn Minh', nameEn: 'Tran Van Minh', role: 'GV Vật Lý', roleEn: 'Physics Teacher', avatar: 'TM', color: T.success, online: false },
    { id: 'u17', name: 'Trần Minh Quân', nameEn: 'Tran Minh Quan', role: 'Hiệu trưởng', roleEn: 'Principal', avatar: 'TQ', color: T.success, online: true },
  ],
};

const GROUPS_BY_ROLE = {
  teacher: [
    { id: 'g1', name: 'Lớp 11B2 — Toán', nameEn: 'Class 11B2 — Math', members: 33, avatar: '11B2', color: T.primary, type: 'class' },
    { id: 'g2', name: 'Lớp 10A1 — Toán', nameEn: 'Class 10A1 — Math', members: 37, avatar: '10A1', color: T.success, type: 'class' },
    { id: 'g3', name: 'Tổ Toán – Tin học', nameEn: 'Math & IT Department', members: 8, avatar: 'TT', color: T.warning, type: 'dept' },
    { id: 'g4', name: 'Hội đồng giáo viên', nameEn: 'Teacher Council', members: 42, avatar: 'HĐ', color: T.purple, type: 'school' },
  ],
  student: [
    { id: 'g5', name: 'Lớp 11A2', nameEn: 'Class 11A2', members: 36, avatar: '11A2', color: T.primary, type: 'class' },
    { id: 'g6', name: 'Nhóm học Toán', nameEn: 'Math Study Group', members: 8, avatar: 'NH', color: T.success, type: 'study' },
    { id: 'g7', name: 'CLB Tin học', nameEn: 'IT Club', members: 15, avatar: 'TH', color: T.teal, type: 'club' },
  ],
  principal: [
    { id: 'g8', name: 'Ban Giám hiệu', nameEn: 'Leadership Team', members: 5, avatar: 'BGH', color: T.success, type: 'admin' },
    { id: 'g9', name: 'Hội đồng giáo viên', nameEn: 'Teacher Council', members: 42, avatar: 'HĐ', color: T.primary, type: 'school' },
    { id: 'g10', name: 'Thông báo toàn trường', nameEn: 'School Announcements', members: 1280, avatar: 'TB', color: T.warning, type: 'announce' },
  ],
  parent: [
    { id: 'g11', name: 'Lớp 11A2 — Phụ huynh', nameEn: 'Class 11A2 Parents', members: 36, avatar: '11A2', color: T.primary, type: 'parent' },
    { id: 'g12', name: 'Thông báo nhà trường', nameEn: 'School Announcements', members: 1280, avatar: 'TB', color: T.warning, type: 'announce' },
  ],
};

// Generate conversation messages
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
    g1: [
      { id: 1, from: 'system', text: 'Nguyễn Thị Hương đã tạo nhóm Lớp 11B2 — Toán', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'Trần Văn Bình', initials: 'TB', color: T.teal, text: 'Cô ơi, bài tập trang 87 nộp khi nào ạ?', time: '07:30', date: 'Hôm nay' },
      { id: 3, from: 'me', text: 'Các em nộp trước tiết học ngày mai nhé!', time: '07:45', date: 'Hôm nay' },
      { id: 4, from: 'other', name: 'Hoàng Thị Linh', initials: 'HL', color: T.error, text: 'Dạ cô, em hiểu rồi ạ.', time: '07:47', date: 'Hôm nay' },
      { id: 5, from: 'other', name: 'Lê Thị Cẩm', initials: 'LC', color: T.purple, text: 'Cô cho hỏi, phần b bài 3 làm theo cách nào ạ?', time: '08:00', date: 'Hôm nay' },
      { id: 6, from: 'me', text: 'Em áp dụng định lý Lagrange vào nhé. Cô sẽ hướng dẫn chi tiết trong lớp.', time: '08:15', date: 'Hôm nay' },
    ],
    g5: [
      { id: 1, from: 'system', text: 'Nhóm lớp 11A2 được tạo bởi Giáo viên chủ nhiệm', time: '01/09/2025', date: '' },
      { id: 2, from: 'other', name: 'GV Hương', initials: 'NH', color: T.primary, text: '📢 Nhắc nhở: Ngày mai lớp có tiết kiểm tra Toán tiết 2. Các em chuẩn bị kỹ nhé!', time: '20:00', date: 'Hôm qua' },
      { id: 3, from: 'other', name: 'Trần Văn Bình', initials: 'TB', color: T.teal, text: 'Cảm ơn cô đã nhắc ạ 🙏', time: '20:05', date: 'Hôm qua' },
      { id: 4, from: 'me', text: 'Dạ em ghi nhớ rồi ạ!', time: '20:10', date: 'Hôm qua' },
      { id: 5, from: 'other', name: 'Hoàng Thị Linh', initials: 'HL', color: T.error, text: 'Cô ơi, bài ôn tập mình cần học đến trang mấy ạ?', time: '20:15', date: 'Hôm qua' },
      { id: 6, from: 'other', name: 'GV Hương', initials: 'NH', color: T.primary, text: 'Trang 75–90 nhé các em. Trọng tâm là phần đạo hàm.', time: '20:18', date: 'Hôm qua' },
      { id: 7, from: 'me', text: 'Dạ cô! Em sẽ ôn kỹ phần đó ạ 📚', time: '20:20', date: 'Hôm qua' },
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

const GROUP_CONVOS_BY_ROLE = {
  teacher: [
    { groupId: 'g1', lastMsg: 'Em áp dụng định lý Lagrange vào nhé...', time: '08:15', unread: 3 },
    { groupId: 'g2', lastMsg: 'Lớp 10A1: Cô nhắc các em bài tập...', time: 'Hôm qua', unread: 0 },
    { groupId: 'g3', lastMsg: 'Họp tổ thứ 4 tuần này lúc 14h.', time: 'Hôm qua', unread: 1 },
    { groupId: 'g4', lastMsg: 'Thông báo: Lịch họp hội đồng 15/5', time: '2 ngày', unread: 0 },
  ],
  student: [
    { groupId: 'g5', lastMsg: 'GV Hương: Trang 75–90 nhé các em...', time: '20:18', unread: 2 },
    { groupId: 'g6', lastMsg: 'Bình: Chiều nay học nhóm nha mọi người', time: 'Hôm qua', unread: 0 },
    { groupId: 'g7', lastMsg: 'CLB Tin học: Cuộc thi lập trình...', time: '3 ngày', unread: 0 },
  ],
  principal: [
    { groupId: 'g8', lastMsg: 'Họp BGH sáng thứ 2', time: '08:00', unread: 0 },
    { groupId: 'g9', lastMsg: 'Cô Hương: Kế hoạch giảng dạy tuần...', time: 'Hôm qua', unread: 5 },
    { groupId: 'g10', lastMsg: 'Thông báo: Nghỉ bù ngày 30/4', time: 'Hôm qua', unread: 0 },
  ],
  parent: [
    { groupId: 'g11', lastMsg: 'GV Hương: Nhắc nhở kiểm tra Toán...', time: 'Hôm qua', unread: 2 },
    { groupId: 'g12', lastMsg: 'Trường: Nghỉ lễ 30/4 – 1/5', time: '2 ngày', unread: 0 },
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

// ── Chat bubble ───────────────────────────────────────────────────────────────
const ChatBubble = ({ msg, isMe, showName, senderName, senderInitials, senderColor, pColor, isGroup }) => {
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

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
      {/* Avatar (others only) */}
      {!isMe && isGroup && (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: (senderColor || T.primary) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: senderColor || T.primary, flexShrink: 0, marginBottom: 2 }}>
          {senderInitials || '?'}
        </div>
      )}
      {!isMe && !isGroup && <div style={{ width: 28, flexShrink: 0 }} />}

      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        {/* Sender name (group only) */}
        {!isMe && isGroup && showName && (
          <span style={{ fontSize: 11, fontWeight: 700, color: senderColor || T.primary, marginBottom: 3, marginLeft: 4 }}>{senderName}</span>
        )}
        {/* Bubble */}
        <div style={{
          padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMe ? pColor : T.card,
          border: isMe ? 'none' : `1px solid ${T.border}`,
          boxShadow: isMe ? `0 2px 8px ${pColor}30` : '0 1px 4px rgba(0,0,0,0.04)',
          color: isMe ? '#fff' : T.textPrimary,
          fontSize: 13.5, lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3, marginLeft: 4, marginRight: 4 }}>{msg.time}</span>
      </div>
    </div>
  );
};

// ── Main Messaging Screen ─────────────────────────────────────────────────────
const MessagingScreen = ({ role, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const contacts = CONTACTS_BY_ROLE[role] || [];
  const groups = GROUPS_BY_ROLE[role] || [];
  const directConvos = DIRECT_CONVOS_BY_ROLE[role] || [];
  const groupConvos = GROUP_CONVOS_BY_ROLE[role] || [];

  const [tab, setTab] = React.useState('direct'); // 'direct' | 'groups'
  const [activeId, setActiveId] = React.useState(directConvos[0]?.contactId || null);
  const [isGroup, setIsGroup] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [localMsgs, setLocalMsgs] = React.useState({});
  const [showNewMsg, setShowNewMsg] = React.useState(false);
  const messagesEndRef = React.useRef(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [activeId, localMsgs]);

  const getContact = (id) => contacts.find(c => c.id === id);
  const getGroup = (id) => groups.find(g => g.id === id);

  const getMessages = (id) => {
    const base = generateMessages(id, 'NK', pColor, 'U', T.primary);
    const extra = localMsgs[id] || [];
    return [...base, ...extra];
  };

  const allMsgs = groupMsgsByDate(getMessages(activeId));

  const sendMessage = () => {
    if (!input.trim() || !activeId) return;
    const newMsg = { id: Date.now(), from: 'me', text: input.trim(), time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), date: t('Hôm nay', 'Today') };
    setLocalMsgs(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), newMsg] }));
    setInput('');
  };

  // Current contact/group info
  const activeContact = !isGroup ? getContact(activeId) : null;
  const activeGroup = isGroup ? getGroup(activeId) : null;
  const activeName = isGroup ? (lang === 'en' ? activeGroup?.nameEn : activeGroup?.name) : (lang === 'en' ? activeContact?.nameEn : activeContact?.name);
  const activeColor = isGroup ? activeGroup?.color : activeContact?.color;

  // Filtered convos
  const filteredDirect = directConvos.filter(c => {
    const contact = getContact(c.contactId);
    const name = lang === 'en' ? contact?.nameEn : contact?.name;
    return !search || name?.toLowerCase().includes(search.toLowerCase());
  });
  const filteredGroups = groupConvos.filter(c => {
    const group = getGroup(c.groupId);
    const name = lang === 'en' ? group?.nameEn : group?.name;
    return !search || name?.toLowerCase().includes(search.toLowerCase());
  });

  const totalUnread = [...directConvos, ...groupConvos].reduce((s, c) => s + (c.unread || 0), 0);

  const ConvoItem = ({ id, lastMsg, time, unread, isGroupItem }) => {
    const item = isGroupItem ? getGroup(id) : getContact(id);
    if (!item) return null;
    const name = lang === 'en' ? item.nameEn : item.name;
    const subtitle = isGroupItem ? `${item.members} ${t('thành viên', 'members')}` : (lang === 'en' ? item.roleEn : item.role);
    const isActive = activeId === id && isGroup === isGroupItem;
    const itemColor = item.color || pColor;

    return (
      <button onClick={() => { setActiveId(id); setIsGroup(isGroupItem); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: isActive ? pColor + '0F' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
          borderLeft: `3px solid ${isActive ? pColor : 'transparent'}`,
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.bg; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: isGroupItem ? 12 : '50%', background: itemColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: itemColor }}>
            {item.avatar}
          </div>
          {!isGroupItem && item.online && (
            <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: T.success, border: `2px solid ${T.card}` }} />
          )}
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 13.5, fontWeight: unread > 0 ? 800 : 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{name}</span>
            <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0, marginLeft: 4 }}>{time}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: unread > 0 ? T.textSecondary : T.textMuted, fontWeight: unread > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{lastMsg}</span>
            {unread > 0 && (
              <span style={{ background: pColor, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0, marginLeft: 4 }}>{unread}</span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
      {/* Left: conversation list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', background: T.card, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{t('Tin nhắn', 'Messages')}</span>
              {totalUnread > 0 && (
                <span style={{ background: pColor, color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 800, padding: '1px 7px' }}>{totalUnread}</span>
              )}
            </div>
            <button onClick={() => setShowNewMsg(true)}
              style={{ width: 32, height: 32, borderRadius: 9, background: pColor + '15', border: `1px solid ${pColor}30`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={t('Tin nhắn mới', 'New Message')}>
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
            <button key={tb.id} onClick={() => { setTab(tb.id); if (tb.id === 'direct' && directConvos[0]) { setActiveId(directConvos[0].contactId); setIsGroup(false); } else if (tb.id === 'groups' && groupConvos[0]) { setActiveId(groupConvos[0].groupId); setIsGroup(true); } }}
              style={{
                flex: 1, padding: '10px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: tab === tb.id ? 700 : 500, color: tab === tb.id ? pColor : T.textMuted,
                borderBottom: `2px solid ${tab === tb.id ? pColor : 'transparent'}`, marginBottom: -1, transition: 'color 0.15s',
              }}>{t(tb.vi, tb.en)}</button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'direct' && (
            filteredDirect.length > 0
              ? filteredDirect.map(c => <ConvoItem key={c.contactId} id={c.contactId} lastMsg={c.lastMsg} time={c.time} unread={c.unread} isGroupItem={false} />)
              : <div style={{ padding: 24, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>{t('Không tìm thấy', 'No results')}</div>
          )}
          {tab === 'groups' && (
            filteredGroups.length > 0
              ? filteredGroups.map(c => <ConvoItem key={c.groupId} id={c.groupId} lastMsg={c.lastMsg} time={c.time} unread={c.unread} isGroupItem={true} />)
              : <div style={{ padding: 24, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>{t('Không có nhóm', 'No groups')}</div>
          )}
        </div>
      </div>

      {/* Right: chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F8FAFF', overflow: 'hidden' }}>
        {activeId ? (
          <>
            {/* Chat header */}
            <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: isGroup ? 11 : '50%', background: (activeColor || pColor) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: activeColor || pColor }}>
                  {isGroup ? activeGroup?.avatar : activeContact?.avatar}
                </div>
                {!isGroup && activeContact?.online && (
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: T.success, border: `2px solid ${T.card}` }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{activeName}</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  {isGroup
                    ? `${activeGroup?.members} ${t('thành viên', 'members')}`
                    : activeContact?.online ? t('Đang online', 'Online') : (lang === 'en' ? activeContact?.roleEn : activeContact?.role)
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ icon: 'search' }, { icon: 'bell' }, { icon: 'info' }].map((btn, i) => (
                  <button key={i} style={{ width: 34, height: 34, borderRadius: 9, background: T.bg, border: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={btn.icon} size={14} color={T.textMuted} />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages area */}
            <div ref={messagesEndRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allMsgs.map((msg, i) => (
                <ChatBubble
                  key={msg.id || i}
                  msg={msg}
                  isMe={msg.from === 'me'}
                  isGroup={isGroup}
                  pColor={pColor}
                  showName={msg.from === 'other' && (i === 0 || allMsgs[i-1]?.from !== 'other' || allMsgs[i-1]?.name !== msg.name)}
                  senderName={msg.name}
                  senderInitials={msg.initials}
                  senderColor={msg.color}
                />
              ))}
              {/* Typing indicator (decorative) */}
              {!isGroup && activeContact?.online && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: (activeColor || pColor) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: activeColor || pColor, flexShrink: 0 }}>
                    {activeContact?.avatar}
                  </div>
                  <div style={{ padding: '8px 14px', background: T.card, borderRadius: '16px 16px 16px 4px', border: `1px solid ${T.border}`, display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMuted, animation: `bounce ${1 + j * 0.15}s infinite`, opacity: 0.5 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div style={{ background: T.card, borderTop: `1px solid ${T.border}`, padding: '12px 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                {/* Attach + emoji buttons */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {[{ icon: 'plus', title: t('Đính kèm', 'Attach') }, { icon: 'star', title: 'Emoji' }].map((btn, i) => (
                    <button key={i} title={btn.title} style={{ width: 34, height: 34, borderRadius: 9, background: T.bg, border: `1px solid ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={btn.icon} size={14} color={T.textMuted} />
                    </button>
                  ))}
                </div>
                {/* Text input */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={t('Nhập tin nhắn... (Enter để gửi)', 'Type a message... (Enter to send)')}
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
                {/* Send button */}
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

      {/* New message modal */}
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

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

Object.assign(window, { MessagingScreen });
