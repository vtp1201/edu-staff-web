// ── Bảng tin (FeedScreen) — social feed của trường & lớp ─────────────────────
// Tokens-only; tái sử dụng Card / Badge / Avatar / Button / Icon từ ui.jsx.

const FEED_ROLE_LABELS = {
  teacher: { vi: 'Giáo viên', en: 'Teacher' },
  principal: { vi: 'Hiệu trưởng', en: 'Principal' },
  student: { vi: 'Học sinh', en: 'Student' },
  parent: { vi: 'Phụ huynh', en: 'Parent' },
};
const feedRoleColor = (r) => ({
  teacher: T.primary, principal: T.success, student: T.warning, parent: T.purple,
}[r] || T.primary);

const FEED_REACTIONS = [
  { emoji: '👍', vi: 'Thích', en: 'Like' },
  { emoji: '❤️', vi: 'Yêu thích', en: 'Love' },
  { emoji: '🎉', vi: 'Chúc mừng', en: 'Celebrate' },
  { emoji: '👏', vi: 'Tuyệt vời', en: 'Applaud' },
];

// Lớp mà từng vai trò nhìn thấy trên tab switcher
const FEED_MY_CLASSES = {
  teacher: ['11A2', '10B1', '12C3'],
  principal: ['11A2', '10B1', '12C3'],
  student: ['11A2'],
  parent: ['11A2', '8B1'],
};

// Lớp mô phỏng lỗi tải lần đầu (để review state error)
const FEED_ERROR_CLASS = '12C3';

// ── Mock data ─────────────────────────────────────────────────────────────────
const FEED_POSTS = [
  {
    id: 'p1', pinned: true,
    author: { name: 'Trần Minh Quân', avatar: 'TQ', role: 'principal' },
    scope: { type: 'school' },
    time: { vi: '2 giờ trước', en: '2 hours ago' }, timeFull: '09:15 · 11/07/2026',
    text: 'Kỷ niệm 30 năm thành lập trường THPT Nguyễn Du (1996–2026) 🎓 Lễ kỷ niệm sẽ diễn ra vào sáng thứ Bảy 19/07 tại sân trường. Trân trọng kính mời toàn thể thầy cô, các em học sinh và quý phụ huynh cùng tham dự. Chương trình gồm lễ diễu hành truyền thống, triển lãm ảnh 30 năm và đêm gala văn nghệ.',
    images: [
      { label: 'ảnh: sân khấu lễ kỷ niệm', alt: 'Sân khấu lễ kỷ niệm 30 năm' },
      { label: 'ảnh: triển lãm 30 năm', alt: 'Không gian triển lãm ảnh 30 năm' },
    ],
    reactions: { '👍': 42, '❤️': 28, '🎉': 65 }, myReaction: '🎉',
    comments: [
      { id: 'c1', author: { name: 'Trần Thu Hà', avatar: 'TH', role: 'teacher' }, text: 'Lớp 11A2 đã đăng ký 2 tiết mục văn nghệ cho đêm gala ạ!', time: { vi: '1 giờ trước', en: '1 hour ago' }, timeFull: '10:20 · 11/07/2026' },
      { id: 'c2', author: { name: 'Nguyễn Minh Khoa', avatar: 'NK', role: 'student' }, text: 'Mong chờ triển lãm ảnh quá ạ 😍', time: { vi: '45 phút trước', en: '45 minutes ago' }, timeFull: '10:35 · 11/07/2026' },
      { id: 'c3', author: { name: 'Nguyễn Văn Đức', avatar: 'ND', role: 'parent' }, text: 'Phụ huynh có cần đăng ký trước khi tham dự không thưa thầy?', time: { vi: '20 phút trước', en: '20 minutes ago' }, timeFull: '11:00 · 11/07/2026' },
    ],
  },
  {
    id: 'p2',
    author: { name: 'Trần Minh Quân', avatar: 'TQ', role: 'principal' },
    scope: { type: 'school' },
    time: { vi: 'Hôm qua', en: 'Yesterday' }, timeFull: '14:30 · 10/07/2026',
    text: 'Thông báo quy chế kiểm tra cuối học kỳ II năm học 2025–2026. Kỳ kiểm tra cuối học kỳ II sẽ bắt đầu từ ngày 21/07 và kéo dài đến hết ngày 26/07. Toàn bộ học sinh có mặt tại phòng thi trước giờ làm bài tối thiểu 15 phút, mang theo thẻ học sinh và dụng cụ học tập cá nhân; tuyệt đối không mang điện thoại hoặc tài liệu vào phòng thi. Lịch thi chi tiết của từng khối đã được gửi tới giáo viên chủ nhiệm và niêm yết tại bảng tin mỗi lớp. Đối với các môn có bài thực hành, điểm thực hành sẽ được tính gộp theo tỷ lệ quy định trong sổ tay học vụ. Học sinh vắng thi có lý do chính đáng cần nộp đơn xin thi bổ sung trong vòng 3 ngày kể từ ngày thi. Nhà trường đề nghị quý phụ huynh phối hợp nhắc nhở các em ôn tập và nghỉ ngơi hợp lý trong giai đoạn này. Chúc các em học sinh có một kỳ thi đạt kết quả tốt!',
    images: [],
    reactions: { '👍': 35, '❤️': 8 }, myReaction: null,
    comments: [],
  },
  {
    id: 'p3',
    author: { name: 'Nguyễn Thị Hương', avatar: 'NH', role: 'teacher' },
    scope: { type: 'school' },
    time: { vi: '2 ngày trước', en: '2 days ago' }, timeFull: '08:05 · 09/07/2026',
    text: 'CLB Toán học tuyển thành viên mới cho năm học 2026–2027! Các em học sinh yêu thích Toán và muốn luyện thi HSG đăng ký tại phòng bộ môn Toán (tầng 2) trước ngày 25/07 nhé.',
    images: [{ label: 'ảnh: hoạt động CLB Toán', alt: 'Buổi sinh hoạt CLB Toán học' }],
    reactions: { '👍': 21, '🎉': 6 }, myReaction: null,
    comments: [],
  },
  {
    id: 'p4',
    author: { name: 'Trần Thu Hà', avatar: 'TH', role: 'teacher' },
    scope: { type: 'class', cls: '11A2' },
    time: { vi: '3 giờ trước', en: '3 hours ago' }, timeFull: '08:10 · 11/07/2026',
    text: 'Cả lớp lưu ý: tiết Toán thứ Hai tuần sau (14/07) sẽ có bài kiểm tra 15 phút chương Lượng giác. Các em ôn kỹ phần phương trình lượng giác cơ bản nhé. Bạn nào còn vướng phần biến đổi thì nhắn cô trước cuối tuần.',
    images: [{ label: 'ảnh: đề cương ôn tập', alt: 'Trang đề cương ôn tập chương Lượng giác' }],
    reactions: { '👍': 28, '❤️': 4 }, myReaction: '👍',
    comments: [],
  },
  {
    id: 'p5',
    author: { name: 'Trần Thu Hà', avatar: 'TH', role: 'teacher' },
    scope: { type: 'class', cls: '11A2' },
    time: { vi: 'Hôm qua', en: 'Yesterday' }, timeFull: '16:45 · 10/07/2026',
    text: 'Chúc mừng đội tuyển lớp mình đạt giải Nhì cuộc thi Khoa học Kỹ thuật cấp trường! 🎉 Cô rất tự hào về tinh thần làm việc nhóm của các em. Sản phẩm "Hệ thống tưới cây tự động" sẽ đại diện trường dự thi cấp cụm vào tháng 8.',
    images: [],
    reactions: { '🎉': 33, '❤️': 19, '👏': 12 }, myReaction: null,
    comments: [],
  },
  {
    id: 'p6',
    author: { name: 'Nguyễn Minh Khoa', avatar: 'NK', role: 'student' },
    scope: { type: 'class', cls: '11A2' },
    time: { vi: '2 ngày trước', en: '2 days ago' }, timeFull: '19:30 · 09/07/2026',
    text: 'Nhóm ôn tập Toán cuối tuần của lớp mình hoạt động lại rồi nhé! Sáng Chủ nhật 9h tại thư viện trường, tuần này ôn chương Lượng giác chuẩn bị cho bài kiểm tra. Bạn nào tham gia thì comment bên dưới để mình giữ chỗ.',
    images: [
      { label: 'ảnh: góc thư viện', alt: 'Góc học nhóm tại thư viện' },
      { label: 'ảnh: bảng công thức', alt: 'Bảng tổng hợp công thức lượng giác' },
      { label: 'ảnh: buổi ôn tuần trước', alt: 'Buổi ôn tập tuần trước của nhóm' },
    ],
    reactions: { '👍': 15, '❤️': 3 }, myReaction: null,
    comments: [],
  },
  // Trang 2 (cursor) — chỉ hiện sau khi "Tải thêm"
  {
    id: 'p7',
    author: { name: 'Nguyễn Thị Hương', avatar: 'NH', role: 'teacher' },
    scope: { type: 'school' },
    time: { vi: '4 ngày trước', en: '4 days ago' }, timeFull: '10:00 · 07/07/2026',
    text: 'Thư viện trường bổ sung 120 đầu sách mới cho hè 2026, gồm sách tham khảo các môn và truyện văn học. Các em có thể mượn tối đa 3 cuốn trong dịp hè.',
    images: [],
    reactions: { '👍': 18, '❤️': 7 }, myReaction: null,
    comments: [],
  },
  {
    id: 'p8',
    author: { name: 'Trần Minh Quân', avatar: 'TQ', role: 'principal' },
    scope: { type: 'school' },
    time: { vi: '5 ngày trước', en: '5 days ago' }, timeFull: '07:45 · 06/07/2026',
    text: 'Nhà trường hoàn tất lắp đặt hệ thống điều hoà cho toàn bộ phòng học khối 10 và 11. Cảm ơn hội phụ huynh đã đồng hành cùng nhà trường trong dự án này.',
    images: [{ label: 'ảnh: phòng học mới', alt: 'Phòng học sau khi lắp điều hoà' }],
    reactions: { '👍': 40, '❤️': 22, '🎉': 9 }, myReaction: null,
    comments: [],
  },
  {
    id: 'p9',
    author: { name: 'Nguyễn Thị Hương', avatar: 'NH', role: 'teacher' },
    scope: { type: 'class', cls: '12C3' },
    time: { vi: 'Hôm qua', en: 'Yesterday' }, timeFull: '15:20 · 10/07/2026',
    text: 'Lớp 12C3 nộp phiếu đăng ký nguyện vọng ôn thi tốt nghiệp cho cô trước thứ Sáu tuần này nhé. Bạn nào chưa nhận phiếu thì gặp cô ở phòng bộ môn Toán.',
    images: [],
    reactions: { '👍': 12 }, myReaction: null,
    comments: [],
  },
];

// ── Ảnh placeholder (sọc chéo nhẹ + chú thích monospace) ─────────────────────
const FeedImg = ({ img, ratio = '16/9', style }) => (
  <div role="img" aria-label={img.alt} title={img.alt} style={{
    aspectRatio: ratio, borderRadius: 10, border: `1px solid ${T.border}`,
    background: `repeating-linear-gradient(45deg, ${T.bg}, ${T.bg} 10px, ${T.card} 10px, ${T.card} 20px)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 0, overflow: 'hidden', ...style,
  }}>
    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, color: T.textMuted, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>
      {img.label}
    </span>
  </div>
);

const FeedImageGrid = ({ images }) => {
  if (!images || images.length === 0) return null;
  if (images.length === 1) return <FeedImg img={images[0]} ratio="16/9" style={{ marginTop: 12 }} />;
  if (images.length === 2) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
      {images.map((im, i) => <FeedImg key={i} img={im} ratio="4/3" />)}
    </div>
  );
  if (images.length === 3) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
      <FeedImg img={images[0]} ratio="4/3" style={{ gridColumn: '1 / -1', aspectRatio: '21/9' }} />
      <FeedImg img={images[1]} ratio="4/3" />
      <FeedImg img={images[2]} ratio="4/3" />
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
      {images.slice(0, 4).map((im, i) => <FeedImg key={i} img={im} ratio="4/3" />)}
    </div>
  );
};

// ── Menu "…" (Radix-style semantics) ──────────────────────────────────────────
const FeedMenu = ({ items, ariaLabel }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  if (!items || items.length === 0) return null;
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)}
        aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel}
        style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
          background: open ? T.bg : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.bg}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        <Icon name="moreHorizontal" size={16} color={T.textMuted} />
      </button>
      {open && (
        <div role="menu" aria-label={ariaLabel} style={{
          position: 'absolute', right: 0, top: 34, minWidth: 190, zIndex: 50,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 6,
        }}>
          {items.map((it, i) => (
            <button key={i} role="menuitem" onClick={() => { setOpen(false); it.onClick(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', border: 'none', background: 'transparent',
                borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                fontSize: 12.5, fontWeight: 600,
                color: it.danger ? T.errorDark : T.textPrimary,
              }}
              onMouseEnter={e => e.currentTarget.style.background = it.danger ? T.errorDarkLight : T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name={it.icon} size={14} color={it.danger ? T.errorDark : T.textSecondary} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Reaction bar ──────────────────────────────────────────────────────────────
const FeedReactionBar = ({ post, onReact, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const pickerRef = React.useRef(null);
  React.useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setPickerOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [pickerOpen]);

  const active = FEED_REACTIONS.filter(r => (post.reactions[r.emoji] || 0) > 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {active.map(r => {
        const count = post.reactions[r.emoji];
        const mine = post.myReaction === r.emoji;
        return (
          <button key={r.emoji} onClick={() => onReact(post.id, r.emoji)}
            aria-pressed={mine}
            aria-label={t(`Thả cảm xúc ${r.vi}, ${count} người`, `React ${r.en}, ${count} people`)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
              border: `1px solid ${mine ? pColor : T.border}`,
              background: mine ? pColor + '1F' : T.card,
              fontSize: 12.5, fontWeight: mine ? 700 : 600,
              color: mine ? pColor : T.textSecondary,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
            <span aria-hidden="true" style={{ fontSize: 13 }}>{r.emoji}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          </button>
        );
      })}
      <div ref={pickerRef} style={{ position: 'relative' }}>
        <button onClick={() => setPickerOpen(o => !o)}
          aria-haspopup="true" aria-expanded={pickerOpen}
          aria-label={t('Thả cảm xúc khác', 'Add a reaction')}
          style={{
            width: 28, height: 28, borderRadius: 99, cursor: 'pointer',
            border: `1px dashed ${T.border}`, background: 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Icon name="smile" size={14} color={T.textMuted} />
        </button>
        {pickerOpen && (
          <div style={{
            position: 'absolute', left: 0, bottom: 34, zIndex: 50,
            display: 'flex', gap: 2, padding: 6,
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 99,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}>
            {FEED_REACTIONS.map(r => (
              <button key={r.emoji} onClick={() => { onReact(post.id, r.emoji); setPickerOpen(false); }}
                aria-label={t(`Thả cảm xúc ${r.vi}`, `React ${r.en}`)}
                title={t(r.vi, r.en)}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: post.myReaction === r.emoji ? pColor + '1F' : 'transparent',
                  cursor: 'pointer', fontSize: 16, transition: 'transform 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <span aria-hidden="true">{r.emoji}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Comment thread ────────────────────────────────────────────────────────────
const FeedComments = ({ post, me, canModerate, onAddComment, onRemoveComment, onReport, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [draft, setDraft] = React.useState('');
  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onAddComment(post.id, v);
    setDraft('');
  };
  return (
    <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 14, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {post.comments.map(c => {
        const isAuthor = c.author.name === me.name;
        const items = [];
        if (!isAuthor) items.push({ icon: 'flag', label: t('Báo cáo bình luận', 'Report comment'), onClick: () => onReport({ kind: 'comment', text: c.text, authorName: c.author.name }) });
        if (canModerate || isAuthor) items.push({ icon: 'trash', label: t('Gỡ bình luận', 'Remove comment'), danger: true, onClick: () => onRemoveComment(post.id, c.id) });
        return (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar initials={c.author.avatar} color={feedRoleColor(c.author.role)} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: T.bg, borderRadius: 10, padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{c.author.name}</span>
                  <span title={c.timeFull} style={{ fontSize: 11, color: T.textMuted }}>{t(c.time.vi, c.time.en)}</span>
                </div>
                <div style={{ fontSize: 13, color: T.textPrimary, marginTop: 2, lineHeight: 1.55 }}>{c.text}</div>
              </div>
            </div>
            <FeedMenu items={items} ariaLabel={t('Tuỳ chọn bình luận', 'Comment options')} />
          </div>
        );
      })}
      {/* input thêm comment */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Avatar initials={me.avatar} color={feedRoleColor(me.role)} size={28} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 99, padding: '6px 6px 6px 14px' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            aria-label={t('Viết bình luận', 'Write a comment')}
            placeholder={t('Viết bình luận…', 'Write a comment…')}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: T.textPrimary, minWidth: 0 }} />
          <button onClick={submit} disabled={!draft.trim()}
            aria-label={t('Gửi bình luận', 'Send comment')}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: draft.trim() ? pColor : T.border,
              cursor: draft.trim() ? 'pointer' : 'default',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background 0.15s',
            }}>
            <Icon name="send" size={13} color="#fff" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Post card ─────────────────────────────────────────────────────────────────
const FeedPostCard = ({ post, me, role, myClasses, lang, pColor, onReact, onTogglePin, onRemovePost, onReport, onAddComment, onRemoveComment }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [expanded, setExpanded] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const isAuthor = post.author.name === me.name;
  const canModerate = role === 'principal' || (role === 'teacher' && post.scope.type === 'class' && myClasses.includes(post.scope.cls));
  const long = post.text.length > 320;
  const commentCount = post.comments.length;
  const rl = FEED_ROLE_LABELS[post.author.role];
  const rColor = feedRoleColor(post.author.role);

  const menuItems = [];
  if (canModerate) menuItems.push({ icon: 'pin', label: post.pinned ? t('Bỏ ghim bài viết', 'Unpin post') : t('Ghim bài viết', 'Pin post'), onClick: () => onTogglePin(post.id) });
  if (!isAuthor) menuItems.push({ icon: 'flag', label: t('Báo cáo bài viết', 'Report post'), onClick: () => onReport({ kind: 'post', text: post.text, authorName: post.author.name }) });
  if (canModerate) menuItems.push({ icon: 'trash', label: t('Gỡ bài viết', 'Remove post'), danger: true, onClick: () => onRemovePost(post.id) });

  return (
    <Card style={{ padding: 20, border: post.pinned ? `1px solid ${pColor}4D` : `1px solid ${T.border}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar initials={post.author.avatar} color={rColor} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{post.author.name}</span>
            <Badge color={rColor}>{t(rl.vi, rl.en)}</Badge>
            {post.pinned && (
              <Badge color={pColor} style={{ gap: 4 }}>
                <Icon name="pin" size={10} color={pColor} strokeWidth={2.2} />
                {t('Đã ghim', 'Pinned')}
              </Badge>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span title={post.timeFull}>{t(post.time.vi, post.time.en)}</span>
            <span aria-hidden="true">·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={post.scope.type === 'school' ? 'globe' : 'users'} size={11} color={T.textMuted} />
              {post.scope.type === 'school' ? t('Toàn trường', 'Whole school') : t(`Lớp ${post.scope.cls}`, `Class ${post.scope.cls}`)}
            </span>
          </div>
        </div>
        <FeedMenu items={menuItems} ariaLabel={t('Tuỳ chọn bài viết', 'Post options')} />
      </div>

      {/* Body */}
      <div style={{ marginTop: 12 }}>
        <p className={long && !expanded ? 'feed-clamp' : undefined}
          style={{ fontSize: 13.5, lineHeight: 1.65, color: T.textPrimary, whiteSpace: 'pre-line' }}>
          {post.text}
        </p>
        {long && (
          <button onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
            style={{ border: 'none', background: 'transparent', padding: 0, marginTop: 4, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: pColor, fontFamily: 'inherit' }}>
            {expanded ? t('Thu gọn', 'Show less') : t('Xem thêm', 'See more')}
          </button>
        )}
        <FeedImageGrid images={post.images} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <FeedReactionBar post={post} onReact={onReact} lang={lang} pColor={pColor} />
        <button onClick={() => setShowComments(s => !s)}
          aria-expanded={showComments}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: showComments ? pColor + '12' : 'transparent',
            color: showComments ? pColor : T.textSecondary,
            fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!showComments) e.currentTarget.style.background = T.bg; }}
          onMouseLeave={e => { if (!showComments) e.currentTarget.style.background = 'transparent'; }}>
          <Icon name="message" size={14} color="currentColor" />
          {t('Bình luận', 'Comments')}{commentCount > 0 ? ` · ${commentCount}` : ''}
        </button>
      </div>

      {showComments && (
        <FeedComments post={post} me={me} canModerate={canModerate}
          onAddComment={onAddComment} onRemoveComment={onRemoveComment} onReport={onReport}
          lang={lang} pColor={pColor} />
      )}
    </Card>
  );
};

// Skeleton / Empty / Error — delegate sang bộ chuẩn states.jsx (bắt buộc)
const FeedSkeleton = ({ lang }) => <EduSkeleton variant="rows" count={3} lang={lang} />;

const FeedEmpty = ({ canPost, onCompose, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <EduEmpty icon="newspaper" color={pColor} lang={lang}
      title={t('Chưa có bài viết nào', 'No posts yet')}
      desc={t('Bảng tin này còn trống. Bài viết mới sẽ xuất hiện tại đây.', 'This feed is empty. New posts will appear here.')}
      action={canPost ? { label: t('Đăng bài viết đầu tiên', 'Write the first post'), icon: 'penLine', onClick: onCompose } : undefined} />
  );
};

const FeedError = ({ onRetry, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <EduError lang={lang} onRetry={onRetry}
      title={t('Không tải được bảng tin', 'Could not load the feed')}
      desc={t('Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.', 'Something went wrong while connecting. Please try again.')} />
  );
};

// ── Composer ──────────────────────────────────────────────────────────────────
const FeedComposer = React.forwardRef(({ me, tabLabel, onPost, lang, pColor }, ref) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [draft, setDraft] = React.useState('');
  const [attach, setAttach] = React.useState(false);
  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onPost(v, attach);
    setDraft(''); setAttach(false);
  };
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar initials={me.avatar} color={feedRoleColor(me.role)} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea ref={ref} value={draft} onChange={e => setDraft(e.target.value)} rows={draft ? 3 : 1}
            aria-label={t('Nội dung bài viết', 'Post content')}
            placeholder={tabLabel === 'school'
              ? t('Chia sẻ với cả trường…', 'Share with the whole school…')
              : t(`Chia sẻ với lớp ${tabLabel}…`, `Share with class ${tabLabel}…`)}
            style={{
              width: '100%', border: `1px solid ${T.border}`, background: T.bg,
              borderRadius: 10, padding: '10px 14px', fontSize: 13.5, color: T.textPrimary,
              outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6,
              transition: 'border 0.15s',
            }}
            onFocus={e => e.currentTarget.style.border = `1px solid ${pColor}`}
            onBlur={e => e.currentTarget.style.border = `1px solid ${T.border}`} />
          {attach && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 10px', background: T.bg, borderRadius: 8, border: `1px dashed ${T.border}` }}>
              <Icon name="image" size={14} color={T.textMuted} />
              <span style={{ fontSize: 12, color: T.textSecondary, flex: 1 }}>{t('1 ảnh đính kèm (mô phỏng)', '1 image attached (mock)')}</span>
              <button onClick={() => setAttach(false)} aria-label={t('Gỡ ảnh', 'Remove image')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: 2 }}>
                <Icon name="x" size={12} color={T.textMuted} />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <button onClick={() => setAttach(a => !a)}
              aria-pressed={attach} aria-label={t('Đính kèm ảnh', 'Attach image')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: attach ? pColor + '12' : 'transparent',
                color: attach ? pColor : T.textSecondary, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!attach) e.currentTarget.style.background = T.bg; }}
              onMouseLeave={e => { if (!attach) e.currentTarget.style.background = 'transparent'; }}>
              <Icon name="image" size={15} color="currentColor" />
              {t('Ảnh', 'Photo')}
            </button>
            <Button size="sm" onClick={submit} disabled={!draft.trim()} icon="send">
              {t('Đăng', 'Post')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

// ── FeedScreen ────────────────────────────────────────────────────────────────
const FeedScreen = ({ role, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const me = role === 'principal' ? MOCK.principal : role === 'student' ? MOCK.student : role === 'parent' ? MOCK.parent : MOCK.teacher;
  const myClasses = FEED_MY_CLASSES[role] || [];

  const [posts, setPosts] = React.useState(FEED_POSTS);
  const [tab, setTab] = React.useState('school'); // 'school' | class name
  const [classPickerOpen, setClassPickerOpen] = React.useState(false);
  const [status, setStatus] = React.useState('loading'); // loading | ready | error
  const [visible, setVisible] = React.useState(3);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [reportTarget, setReportTarget] = React.useState(null);
  const failedOnce = React.useRef({});
  const composerRef = React.useRef(null);
  const classPickerRef = React.useRef(null);

  // Đóng dropdown chọn lớp
  React.useEffect(() => {
    if (!classPickerOpen) return;
    const onDown = (e) => { if (classPickerRef.current && !classPickerRef.current.contains(e.target)) setClassPickerOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setClassPickerOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [classPickerOpen]);

  // Tải feed khi đổi tab (mô phỏng cursor pagination reset)
  React.useEffect(() => {
    setStatus('loading');
    setVisible(3);
    const shouldFail = tab === FEED_ERROR_CLASS && !failedOnce.current[tab];
    const timer = window.setTimeout(() => {
      if (shouldFail) { failedOnce.current[tab] = true; setStatus('error'); }
      else setStatus('ready');
    }, shouldFail ? 900 : 700);
    return () => window.clearTimeout(timer);
  }, [tab]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  // Quyền
  const canPost = tab === 'school'
    ? (role === 'teacher' || role === 'principal')
    : (role === 'teacher' || role === 'principal' || role === 'student'); // policy: HS được đăng feed lớp

  // Lọc & sắp xếp (ghim lên đầu)
  const filtered = posts
    .filter(p => tab === 'school' ? p.scope.type === 'school' : (p.scope.type === 'class' && p.scope.cls === tab))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  // Actions
  const handleReact = (postId, emoji) => setPosts(ps => ps.map(p => {
    if (p.id !== postId) return p;
    const rx = { ...p.reactions };
    let mine = p.myReaction;
    if (mine === emoji) { rx[emoji] = Math.max(0, (rx[emoji] || 1) - 1); mine = null; }
    else {
      if (mine) rx[mine] = Math.max(0, (rx[mine] || 1) - 1);
      rx[emoji] = (rx[emoji] || 0) + 1; mine = emoji;
    }
    return { ...p, reactions: rx, myReaction: mine };
  }));

  const handleTogglePin = (postId) => setPosts(ps => ps.map(p => p.id === postId ? { ...p, pinned: !p.pinned } : p));
  const handleRemovePost = (postId) => { setPosts(ps => ps.filter(p => p.id !== postId)); showToast(t('Đã gỡ bài viết', 'Post removed')); };
  const handleReport = (target) => setReportTarget(target);
  const submitReport = () => {
    setReportTarget(null);
    showToast(t('Đã gửi báo cáo. BGH sẽ xem xét.', 'Report sent. School leadership will review it.'));
  };
  const handleAddComment = (postId, text) => setPosts(ps => ps.map(p => p.id === postId ? {
    ...p,
    comments: [...p.comments, { id: 'c' + Date.now(), author: { name: me.name, avatar: me.avatar, role }, text, time: { vi: 'Vừa xong', en: 'Just now' }, timeFull: t('Vừa xong', 'Just now') }],
  } : p));
  const handleRemoveComment = (postId, commentId) => setPosts(ps => ps.map(p => p.id === postId ? { ...p, comments: p.comments.filter(c => c.id !== commentId) } : p));

  const handlePost = (text, withImage) => {
    const newPost = {
      id: 'p' + Date.now(), pinned: false,
      author: { name: me.name, avatar: me.avatar, role },
      scope: tab === 'school' ? { type: 'school' } : { type: 'class', cls: tab },
      time: { vi: 'Vừa xong', en: 'Just now' }, timeFull: t('Vừa xong', 'Just now'),
      text,
      images: withImage ? [{ label: 'ảnh: ảnh vừa tải lên', alt: t('Ảnh đính kèm bài viết mới', 'Image attached to new post') }] : [],
      reactions: {}, myReaction: null, comments: [],
    };
    setPosts(ps => [newPost, ...ps]);
    setVisible(v => v + 1);
    showToast(t('Đã đăng bài viết', 'Post published'));
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    window.setTimeout(() => { setLoadingMore(false); setVisible(v => v + 3); }, 700);
  };

  const retryLoad = () => {
    setStatus('loading');
    window.setTimeout(() => setStatus('ready'), 800);
  };

  const focusComposer = () => { if (composerRef.current) composerRef.current.focus(); };

  // Tab switcher: 1 lớp → tab tĩnh; nhiều lớp → tab kèm dropdown
  const activeClass = tab === 'school' ? (myClasses[0] || null) : tab;
  const multiClass = myClasses.length > 1;

  return (
    <div data-screen-label="Bảng tin" style={{ flex: 1, overflowY: 'auto' }}>
      <style>{`
        .feed-clamp {
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .feed-tabs { overflow-x: auto; scrollbar-width: none; }
        .feed-tabs::-webkit-scrollbar { display: none; }
        .feed-col { padding: 28px 32px; }
        @media (max-width: 640px) {
          .feed-col { padding: 16px 12px; }
        }
      `}</style>

      <div className="feed-col">
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tab switcher */}
          <div className="feed-tabs" role="tablist" aria-label={t('Phạm vi bảng tin', 'Feed scope')}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button role="tab" aria-selected={tab === 'school'} onClick={() => setTab('school')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px',
                borderRadius: 99, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                border: `1.5px solid ${tab === 'school' ? pColor : T.border}`,
                background: tab === 'school' ? pColor + '12' : T.card,
                color: tab === 'school' ? pColor : T.textSecondary,
                fontSize: 13, fontWeight: tab === 'school' ? 700 : 600, transition: 'all 0.15s',
              }}>
              <Icon name="globe" size={14} color="currentColor" />
              {t('Toàn trường', 'Whole school')}
            </button>

            {myClasses.length > 0 && (
              <div ref={classPickerRef} style={{ position: 'relative' }}>
                <button role="tab" aria-selected={tab !== 'school'}
                  aria-haspopup={multiClass ? 'listbox' : undefined}
                  aria-expanded={multiClass ? classPickerOpen : undefined}
                  onClick={() => {
                    if (tab === 'school') setTab(activeClass);
                    else if (multiClass) setClassPickerOpen(o => !o);
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px',
                    borderRadius: 99, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                    border: `1.5px solid ${tab !== 'school' ? pColor : T.border}`,
                    background: tab !== 'school' ? pColor + '12' : T.card,
                    color: tab !== 'school' ? pColor : T.textSecondary,
                    fontSize: 13, fontWeight: tab !== 'school' ? 700 : 600, transition: 'all 0.15s',
                  }}>
                  <Icon name="users" size={14} color="currentColor" />
                  {t(`Lớp ${tab === 'school' ? activeClass : tab}`, `Class ${tab === 'school' ? activeClass : tab}`)}
                  {multiClass && <Icon name="chevronDown" size={12} color="currentColor" />}
                </button>
                {classPickerOpen && (
                  <div role="listbox" aria-label={t('Chọn lớp', 'Choose class')} style={{
                    position: 'absolute', left: 0, top: 42, zIndex: 60, minWidth: 150,
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 6,
                  }}>
                    {myClasses.map(c => (
                      <button key={c} role="option" aria-selected={tab === c}
                        onClick={() => { setTab(c); setClassPickerOpen(false); }}
                        style={{
                          width: '100%', padding: '8px 12px', border: 'none', borderRadius: 7,
                          background: tab === c ? pColor + '12' : 'transparent',
                          color: tab === c ? pColor : T.textPrimary,
                          fontSize: 12.5, fontWeight: tab === c ? 700 : 600,
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (tab !== c) e.currentTarget.style.background = T.bg; }}
                        onMouseLeave={e => { if (tab !== c) e.currentTarget.style.background = 'transparent'; }}>
                        {t(`Lớp ${c}`, `Class ${c}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer — ẩn hoàn toàn nếu không có quyền đăng */}
          {canPost && status !== 'error' && (
            <FeedComposer ref={composerRef} me={me} tabLabel={tab} onPost={handlePost} lang={lang} pColor={pColor} />
          )}

          {/* Feed body */}
          {status === 'loading' && <FeedSkeleton />}
          {status === 'error' && <FeedError onRetry={retryLoad} lang={lang} />}
          {status === 'ready' && filtered.length === 0 && (
            <FeedEmpty canPost={canPost} onCompose={focusComposer} lang={lang} pColor={pColor} />
          )}
          {status === 'ready' && shown.map(p => (
            <FeedPostCard key={p.id} post={p} me={me} role={role} myClasses={myClasses}
              lang={lang} pColor={pColor}
              onReact={handleReact} onTogglePin={handleTogglePin} onRemovePost={handleRemovePost}
              onReport={handleReport} onAddComment={handleAddComment} onRemoveComment={handleRemoveComment} />
          ))}

          {/* Pagination / end of feed */}
          {status === 'ready' && hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="secondary" size="sm" onClick={handleLoadMore} disabled={loadingMore} icon={loadingMore ? undefined : 'chevronDown'}>
                {loadingMore ? t('Đang tải…', 'Loading…') : t('Tải thêm bài viết', 'Load more posts')}
              </Button>
            </div>
          )}
          {status === 'ready' && !hasMore && filtered.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 12px' }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t('Bạn đã xem hết bảng tin', "You're all caught up")}
              </span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>
          )}
        </div>
      </div>

      {/* Report dialog */}
      {reportTarget && (
        <ReportContentDialog target={reportTarget} onClose={() => setReportTarget(null)}
          onSubmit={submitReport} lang={lang} primaryColor={pColor} />
      )}

      {/* Toast */}
      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff', borderRadius: 99,
          padding: '10px 20px', fontSize: 12.5, fontWeight: 600, zIndex: 9500,
          boxShadow: '0 12px 32px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}
    </div>
  );
};

Object.assign(window, { FeedScreen });
