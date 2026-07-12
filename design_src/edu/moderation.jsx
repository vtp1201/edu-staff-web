// ── Kiểm duyệt nội dung (ModerationScreen) — /principal/moderation ────────────
// Role-gated: chỉ principal/admin (route trong app.jsx). Read path: hàng chờ
// báo cáo từ ReportContentDialog (feed post/comment, message). Write path:
// Bỏ qua / Gỡ nội dung (có confirm, không hoàn tác, notify người đăng).

const MOD_REASON_META = {
  spam:     { vi: 'Spam',                    en: 'Spam',                   tone: () => T.warning },
  language: { vi: 'Ngôn từ không phù hợp',   en: 'Inappropriate language', tone: () => T.error },
  bully:    { vi: 'Bắt nạt',                 en: 'Bullying',               tone: () => T.error },
  misinfo:  { vi: 'Thông tin sai',           en: 'Misinformation',         tone: () => T.warning },
  other:    { vi: 'Khác',                    en: 'Other',                  tone: () => T.textSecondary },
};

const MOD_TYPE_META = {
  post:    { vi: 'Bài viết',   en: 'Post',    icon: 'newspaper' },
  comment: { vi: 'Bình luận',  en: 'Comment', icon: 'message' },
  message: { vi: 'Tin nhắn',   en: 'Message', icon: 'send' },
};

// ── Mock reports ──────────────────────────────────────────────────────────────
const MOD_SEED = [
  {
    id: 'rp-105', type: 'post', status: 'pending',
    reason: 'spam', reasonNote: '',
    content: 'Săn deal khoá luyện thi cấp tốc 9+ chỉ 199k/tháng!!! Inbox mình để nhận mã giảm giá, kèm link đăng ký nhanh: hoc-sieu-toc.vn/dang-ky 🔥🔥🔥',
    contentAuthor: { name: 'Lê Hoàng Nhật', avatar: 'LN', role: 'student', detail: 'Học sinh · 12C1' },
    reporter: { name: 'Nguyễn Minh Khoa', avatar: 'NK', role: 'student' },
    time: { vi: '2 giờ trước', en: '2 hours ago' }, timeFull: '09:20 · 11/07/2026',
    location: { vi: 'Bảng tin · Lớp 11A2', en: 'Feed · Class 11A2' },
    duplicates: [
      { reporter: 'Trần Thu Hà', time: '1 giờ trước', reason: 'spam' },
      { reporter: 'Lê Thảo Vy', time: '30 phút trước', reason: 'spam' },
    ],
    context: null,
  },
  {
    id: 'rp-104', type: 'message', status: 'pending',
    reason: 'bully', reasonNote: '',
    content: 'Đồ ngu, đừng có vác mặt đến buổi ôn nhóm nữa, không ai muốn nhìn thấy cậu đâu.',
    contentAuthor: { name: 'Hoàng Văn Nam', avatar: 'HN', role: 'student', detail: 'Học sinh · 11A2' },
    reporter: { name: 'Lê Thảo Vy', avatar: 'LV', role: 'student' },
    time: { vi: '5 giờ trước', en: '5 hours ago' }, timeFull: '06:40 · 11/07/2026',
    location: { vi: 'Nhắn tin · Nhóm ôn tập 11A2', en: 'Messages · Study group 11A2' },
    duplicates: [],
    context: {
      kind: 'messages',
      items: [
        { from: 'Nguyễn Minh Khoa', text: 'Mai 9h ôn ở thư viện như mọi tuần nhé mọi người.', time: '06:35' },
        { from: 'Hoàng Văn Nam', text: 'Đồ ngu, đừng có vác mặt đến buổi ôn nhóm nữa, không ai muốn nhìn thấy cậu đâu.', time: '06:38', reported: true },
        { from: 'Lê Thảo Vy', text: 'Bạn nói vậy là không được nhé, mình sẽ báo cô.', time: '06:39' },
      ],
    },
  },
  {
    id: 'rp-103', type: 'post', status: 'pending',
    reason: 'misinfo', reasonNote: '',
    content: 'Nghe nói lịch thi cuối kỳ dời hết sang tháng 8 rồi nhé, mọi người khỏi cần ôn gấp. Ai hỏi thì bảo mình nói.',
    contentAuthor: { name: 'Phạm Đức Dũng', avatar: 'PD', role: 'student', detail: 'Học sinh · 10A1' },
    reporter: { name: 'Trần Thu Hà', avatar: 'TH', role: 'teacher' },
    time: { vi: 'Hôm qua', en: 'Yesterday' }, timeFull: '15:05 · 10/07/2026',
    location: { vi: 'Bảng tin · Toàn trường', en: 'Feed · Whole school' },
    duplicates: [],
    context: null,
  },
  {
    id: 'rp-102', type: 'comment', status: 'resolved', resolution: 'removed',
    reason: 'language', reasonNote: '',
    content: 'Đội gì mà dốt thế, giải Nhì cũng khoe. Đúng là lớp toàn đứa kém.',
    contentAuthor: { name: 'Hoàng Văn Nam', avatar: 'HN', role: 'student', detail: 'Học sinh · 11A2' },
    reporter: { name: 'Nguyễn Văn Đức', avatar: 'ND', role: 'parent' },
    time: { vi: '2 ngày trước', en: '2 days ago' }, timeFull: '20:12 · 09/07/2026',
    location: { vi: 'Bảng tin · Lớp 11A2', en: 'Feed · Class 11A2' },
    duplicates: [{ reporter: 'Trần Thu Hà', time: '2 ngày trước', reason: 'language' }],
    context: {
      kind: 'post',
      author: 'Trần Thu Hà',
      text: 'Chúc mừng đội tuyển lớp mình đạt giải Nhì cuộc thi Khoa học Kỹ thuật cấp trường! 🎉 Cô rất tự hào về tinh thần làm việc nhóm của các em.',
    },
    resolvedBy: 'Trần Minh Quân', resolvedAt: '08:30 · 10/07/2026',
    resolveNote: 'Vi phạm quy tắc ứng xử — đã gỡ và nhắc nhở học sinh qua GVCN.',
  },
  {
    id: 'rp-101', type: 'post', status: 'resolved', resolution: 'dismissed',
    reason: 'other', reasonNote: 'Hình như bạn này đăng nhầm sang lớp khác.',
    content: 'Nhóm ôn tập Toán cuối tuần của lớp mình hoạt động lại rồi nhé! Sáng Chủ nhật 9h tại thư viện trường.',
    contentAuthor: { name: 'Nguyễn Minh Khoa', avatar: 'NK', role: 'student', detail: 'Học sinh · 11A2' },
    reporter: { name: 'Nguyễn Văn Đức', avatar: 'ND', role: 'parent' },
    time: { vi: '3 ngày trước', en: '3 days ago' }, timeFull: '10:40 · 08/07/2026',
    location: { vi: 'Bảng tin · Lớp 11A2', en: 'Feed · Class 11A2' },
    duplicates: [],
    context: null,
    resolvedBy: 'Trần Minh Quân', resolvedAt: '11:05 · 08/07/2026',
    resolveNote: 'Bài viết đăng đúng lớp, không vi phạm.',
  },
];

const MOD_LOG_SEED = [
  { id: 'ml-3', ts: '08:30 · 10/07/2026', actor: 'Trần Minh Quân', action: 'removed', type: 'comment', author: 'Hoàng Văn Nam', reason: 'Vi phạm quy tắc ứng xử — đã gỡ và nhắc nhở học sinh qua GVCN.' },
  { id: 'ml-2', ts: '11:05 · 08/07/2026', actor: 'Trần Minh Quân', action: 'dismissed', type: 'post', author: 'Nguyễn Minh Khoa', reason: 'Bài viết đăng đúng lớp, không vi phạm.' },
  { id: 'ml-1', ts: '16:20 · 05/07/2026', actor: 'Trần Minh Quân', action: 'removed', type: 'post', author: 'Lê Hoàng Nhật', reason: 'Bài quảng cáo dịch vụ ngoài trường (spam), lần thứ 2.' },
];

// ── Small pieces ──────────────────────────────────────────────────────────────

const ModStatusBadge = ({ report, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  if (report.status === 'pending') return (
    <Badge color={T.warning} style={{ gap: 4 }}>
      <Icon name="clock" size={10} color={T.warning} strokeWidth={2.4} />
      {t('Chờ xử lý', 'Pending')}
    </Badge>
  );
  if (report.resolution === 'removed') return (
    <Badge color={T.errorDark} bg={T.errorDarkLight} style={{ gap: 4 }}>
      <Icon name="trash" size={10} color={T.errorDark} strokeWidth={2.2} />
      {t('Đã gỡ', 'Removed')}
    </Badge>
  );
  return (
    <Badge color={T.textSecondary} style={{ gap: 4 }}>
      <Icon name="check" size={10} color={T.textSecondary} strokeWidth={2.4} />
      {t('Đã bỏ qua', 'Dismissed')}
    </Badge>
  );
};

const ModReasonBadge = ({ reason, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const meta = MOD_REASON_META[reason] || MOD_REASON_META.other;
  return <Badge color={meta.tone()}>{t(meta.vi, meta.en)}</Badge>;
};

const ModTypeIcon = ({ type }) => {
  const meta = MOD_TYPE_META[type] || MOD_TYPE_META.post;
  return (
    <div style={{ width: 30, height: 30, borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={meta.icon} size={14} color={T.textSecondary} />
    </div>
  );
};

// ── Confirm-remove alertdialog ────────────────────────────────────────────────
const ModConfirmRemove = ({ report, onCancel, onConfirm, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const ref = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    if (el) { const f = el.querySelector('button'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onCancel(); return; }
      if (e.key === 'Tab' && el) {
        const fs = el.querySelectorAll('button');
        if (!fs.length) return;
        const first = fs[0], last = fs[fs.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onCancel]);
  const typeMeta = MOD_TYPE_META[report.type];
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 8500, padding: 20,
    }}>
      <div ref={ref} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="mod-confirm-title"
        style={{ background: T.card, borderRadius: 14, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: T.errorDarkLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trash" size={16} color={T.errorDark} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="mod-confirm-title" style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35 }}>
              {t(`Gỡ ${typeMeta.vi.toLowerCase()} này?`, `Remove this ${typeMeta.en.toLowerCase()}?`)}
            </div>
            <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
              {t('Hành động này không thể hoàn tác. Nội dung sẽ bị gỡ khỏi hệ thống và ',
                 'This cannot be undone. The content will be removed and ')}
              <strong style={{ color: T.textPrimary }}>{report.contentAuthor.name}</strong>
              {t(' sẽ nhận được thông báo về quyết định kiểm duyệt.',
                 ' will be notified of the moderation decision.')}
            </div>
            <div style={{
              marginTop: 10, padding: '7px 10px', background: `${T.errorDark}0D`,
              border: `1px solid ${T.errorDark}33`, borderRadius: 8,
              fontSize: 12, color: T.textSecondary, lineHeight: 1.45,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{report.content}</div>
          </div>
        </div>
        <div style={{ padding: '12px 22px', background: T.bg, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onCancel} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Hủy', 'Cancel')}
          </Button>
          <Button variant="danger" size="sm" icon="trash" onClick={onConfirm}>
            {t('Gỡ nội dung', 'Remove content')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Detail sheet (right panel, focus-trapped) ─────────────────────────────────
const ModDetailSheet = ({ report, onClose, onDismiss, onRemove, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const ref = React.useRef(null);
  React.useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    if (el) { const f = el.querySelector('button'); if (f) f.focus(); }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && el) {
        const fs = el.querySelectorAll('button:not([disabled]), input, textarea, a[href]');
        if (!fs.length) return;
        const first = fs[0], last = fs[fs.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);

  const typeMeta = MOD_TYPE_META[report.type];
  const reasonMeta = MOD_REASON_META[report.reason] || MOD_REASON_META.other;
  const sectionLabel = { fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,30,50,0.35)', animation: 'mod-fade-in 0.15s ease-out' }} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="mod-sheet-title"
        className="mod-sheet"
        style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '100vw',
          background: T.card, borderLeft: `1px solid ${T.border}`,
          boxShadow: '-16px 0 48px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          animation: 'mod-sheet-in 0.2s ease-out',
        }}>
        {/* Sheet header */}
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} aria-label={t('Đóng chi tiết', 'Close details')}
            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="x" size={13} color={T.textSecondary} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="mod-sheet-title" style={{ fontSize: 14.5, fontWeight: 800, color: T.textPrimary }}>
              {t(`Báo cáo ${typeMeta.vi.toLowerCase()}`, `${typeMeta.en} report`)} · {report.id.toUpperCase()}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>{t(report.location.vi, report.location.en)}</div>
          </div>
          <ModStatusBadge report={report} lang={lang} />
        </div>

        {/* Sheet body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Nội dung bị báo cáo */}
          <div>
            <div style={sectionLabel}>{t('Nội dung bị báo cáo', 'Reported content')}</div>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', background: T.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Avatar initials={report.contentAuthor.avatar} color={T.textSecondary} size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{report.contentAuthor.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{report.contentAuthor.detail}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{report.content}</div>
            </div>
          </div>

          {/* Context */}
          {report.context && report.context.kind === 'post' && (
            <div>
              <div style={sectionLabel}>{t('Bài viết gốc', 'Original post')}</div>
              <div style={{ borderLeft: `3px solid ${T.border}`, paddingLeft: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary }}>{report.context.author}</div>
                <div style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.55, marginTop: 2 }}>{report.context.text}</div>
              </div>
            </div>
          )}
          {report.context && report.context.kind === 'messages' && (
            <div>
              <div style={sectionLabel}>{t('Ngữ cảnh hội thoại', 'Conversation context')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.context.items.map((m, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 10,
                    background: m.reported ? `${T.errorDark}0D` : T.bg,
                    border: `1px solid ${m.reported ? T.errorDark + '44' : T.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary }}>{m.from}</span>
                      <span style={{ fontSize: 10.5, color: T.textMuted }}>{m.time}</span>
                      {m.reported && <Badge color={T.errorDark} bg={T.errorDarkLight} style={{ fontSize: 9.5, padding: '1px 7px' }}>{t('Bị báo cáo', 'Reported')}</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.5, marginTop: 2 }}>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lý do & người báo cáo */}
          <div>
            <div style={sectionLabel}>{t('Báo cáo', 'Report')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar initials={report.reporter.avatar} color={pColor} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>{report.reporter.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }} title={report.timeFull}>{t(report.time.vi, report.time.en)}</div>
                </div>
                <ModReasonBadge reason={report.reason} lang={lang} />
              </div>
              {report.reasonNote && (
                <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55, background: T.bg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
                  “{report.reasonNote}”
                </div>
              )}
            </div>
          </div>

          {/* Báo cáo trùng */}
          {report.duplicates.length > 0 && (
            <div>
              <div style={sectionLabel}>{t(`Báo cáo trùng (${report.duplicates.length})`, `Duplicate reports (${report.duplicates.length})`)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {report.duplicates.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.textSecondary, padding: '6px 10px', background: T.bg, borderRadius: 8 }}>
                    <Icon name="flag" size={12} color={T.textMuted} />
                    <span style={{ fontWeight: 700, color: T.textPrimary }}>{d.reporter}</span>
                    <span style={{ flex: 1 }}>{t((MOD_REASON_META[d.reason] || MOD_REASON_META.other).vi, (MOD_REASON_META[d.reason] || MOD_REASON_META.other).en)}</span>
                    <span style={{ color: T.textMuted, fontSize: 11 }}>{d.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kết quả xử lý (resolved) */}
          {report.status === 'resolved' && (
            <div>
              <div style={sectionLabel}>{t('Kết quả xử lý', 'Resolution')}</div>
              <div style={{
                borderRadius: 10, padding: '12px 14px',
                background: report.resolution === 'removed' ? `${T.errorDark}0A` : T.bg,
                border: `1px solid ${report.resolution === 'removed' ? T.errorDark + '33' : T.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ModStatusBadge report={report} lang={lang} />
                  <span style={{ fontSize: 11.5, color: T.textMuted }}>
                    {t(`bởi ${report.resolvedBy} · ${report.resolvedAt}`, `by ${report.resolvedBy} · ${report.resolvedAt}`)}
                  </span>
                </div>
                {report.resolveNote && (
                  <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55, marginTop: 8 }}>{report.resolveNote}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions — chỉ khi pending */}
        {report.status === 'pending' && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
            <Button variant="ghost" onClick={() => onDismiss(report.id)} icon="check"
              style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
              {t('Bỏ qua', 'Dismiss')}
            </Button>
            <Button variant="danger" icon="trash" onClick={() => onRemove(report)}>
              {t('Gỡ nội dung', 'Remove content')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Skeleton / empty / error ──────────────────────────────────────────────────
// Skeleton / empty / error — delegate sang bộ chuẩn states.jsx (bắt buộc)
const ModSkeleton = ({ lang }) => <EduSkeleton variant="rows" count={5} lang={lang} />;

const ModEmpty = ({ statusFilter, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const isPending = statusFilter === 'pending';
  return (
    <EduEmpty lang={lang} color={T.success} icon={isPending ? 'checkSquare' : 'search'}
      title={isPending ? t('Không có báo cáo nào chờ xử lý', 'No reports waiting') : t('Không tìm thấy báo cáo nào', 'No reports found')}
      desc={isPending
        ? t('Tuyệt vời — cộng đồng trường đang lành mạnh. Báo cáo mới sẽ xuất hiện tại đây.', 'Great — the school community is healthy. New reports will appear here.')
        : t('Thử đổi bộ lọc hoặc từ khoá tìm kiếm.', 'Try changing the filters or search keywords.')} />
  );
};

const ModError = ({ onRetry, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <EduError lang={lang} onRetry={onRetry}
      title={t('Không tải được danh sách báo cáo', 'Could not load reports')}
      desc={t('Đã xảy ra lỗi khi kết nối. Vui lòng thử lại.', 'Something went wrong. Please try again.')} />
  );
};

// ── Audit timeline tab ────────────────────────────────────────────────────────
const ModAuditTimeline = ({ log, lang }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  return (
    <div style={{ padding: '20px 24px' }}>
      {log.length === 0 && (
        <div style={{ fontSize: 12.5, color: T.textMuted, textAlign: 'center', padding: '32px 0' }}>
          {t('Chưa có hành động kiểm duyệt nào.', 'No moderation actions yet.')}
        </div>
      )}
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        {log.length > 0 && <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: T.border, borderRadius: 2 }} aria-hidden="true" />}
        {log.map((e) => {
          const removed = e.action === 'removed';
          const tone = removed ? T.errorDark : T.textSecondary;
          const typeMeta = MOD_TYPE_META[e.type] || MOD_TYPE_META.post;
          return (
            <div key={e.id} style={{ position: 'relative', paddingBottom: 22 }}>
              <div aria-hidden="true" style={{
                position: 'absolute', left: -22, top: 4, width: 16, height: 16, borderRadius: '50%',
                background: removed ? T.errorDarkLight : T.bg, border: `2px solid ${tone}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{e.actor}</span>
                <Badge color={tone} bg={removed ? T.errorDarkLight : undefined}>
                  {removed ? t('Đã gỡ', 'Removed') : t('Đã bỏ qua', 'Dismissed')}
                </Badge>
                <span style={{ fontSize: 12.5, color: T.textSecondary }}>
                  {t(`${typeMeta.vi.toLowerCase()} của`, `${typeMeta.en.toLowerCase()} by`)} <strong style={{ color: T.textPrimary }}>{e.author}</strong>
                </span>
                <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 'auto' }}>{e.ts}</span>
              </div>
              <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55, marginTop: 4 }}>{e.reason}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
const ModerationScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [reports, setReports] = React.useState(MOD_SEED);
  const [log, setLog] = React.useState(MOD_LOG_SEED);
  const [view, setView] = React.useState('queue'); // queue | audit
  const [statusFilter, setStatusFilter] = React.useState('pending'); // pending | resolved | all
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('loading'); // loading | ready | error
  const [detail, setDetail] = React.useState(null); // report id
  const [confirmRemove, setConfirmRemove] = React.useState(null); // report object
  const [toast, setToast] = React.useState(null);
  const failedOnce = React.useRef(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setStatus('ready'), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const showToast = (msg) => { setToast(msg); window.setTimeout(() => setToast(null), 2600); };

  // Refresh — lần đầu mô phỏng lỗi để review state error
  const refresh = () => {
    setStatus('loading');
    const willFail = !failedOnce.current;
    window.setTimeout(() => {
      if (willFail) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 800);
  };
  const retry = () => { setStatus('loading'); window.setTimeout(() => setStatus('ready'), 700); };

  // Stats
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const removedCount = reports.filter(r => r.resolution === 'removed').length;

  // Filtering
  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${r.content} ${r.contentAuthor.name} ${r.reporter.name}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const detailReport = detail ? reports.find(r => r.id === detail) : null;

  // Actions
  const nowLabel = t('Vừa xong', 'Just now');
  const resolveReport = (id, resolution, note) => {
    const target = reports.find(r => r.id === id);
    setReports(rs => rs.map(r => r.id === id ? {
      ...r, status: 'resolved', resolution,
      resolvedBy: MOCK.principal.name, resolvedAt: nowLabel,
      resolveNote: note,
    } : r));
    if (target) {
      setLog(l => [{
        id: 'ml-' + Date.now(), ts: nowLabel, actor: MOCK.principal.name,
        action: resolution, type: target.type, author: target.contentAuthor.name,
        reason: note,
      }, ...l]);
    }
  };

  const handleDismiss = (id) => {
    resolveReport(id, 'dismissed', t('Không vi phạm quy tắc cộng đồng.', 'No community-guideline violation.'));
    setDetail(null);
    showToast(t('Đã bỏ qua báo cáo', 'Report dismissed'));
  };
  const handleRemoveRequest = (report) => setConfirmRemove(report);
  const handleRemoveConfirm = () => {
    if (!confirmRemove) return;
    const reasonMeta = MOD_REASON_META[confirmRemove.reason] || MOD_REASON_META.other;
    resolveReport(confirmRemove.id, 'removed', t(`Gỡ do vi phạm: ${reasonMeta.vi}. Người đăng đã được thông báo.`, `Removed for: ${reasonMeta.en}. The author has been notified.`));
    setConfirmRemove(null);
    setDetail(null);
    showToast(t('Đã gỡ nội dung và thông báo cho người đăng', 'Content removed — author notified'));
  };

  const statusTabs = [
    { id: 'pending', vi: 'Chờ xử lý', en: 'Pending', count: pendingCount },
    { id: 'resolved', vi: 'Đã xử lý', en: 'Resolved', count: resolvedCount },
    { id: 'all', vi: 'Tất cả', en: 'All', count: reports.length },
  ];

  const thStyle = { padding: '10px 12px', fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '13px 12px', fontSize: 12.5, color: T.textSecondary, verticalAlign: 'middle' };

  return (
    <div data-screen-label="Kiểm duyệt nội dung" style={{ flex: 1, overflowY: 'auto' }}>
      <style>{`
        @keyframes mod-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mod-sheet-in { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .mod-sheet { animation: none !important; }
        }
        .mod-table-wrap { display: block; }
        .mod-cards { display: none; }
        @media (max-width: 760px) {
          .mod-table-wrap { display: none; }
          .mod-cards { display: flex; }
          .mod-page { padding: 16px 12px !important; }
        }
        .mod-row:hover { background: ${T.bg}; }
        .mod-clamp2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="mod-page" style={{ padding: '28px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <StatCard icon="clock" iconColor={T.warning} label={t('Chờ xử lý', 'Pending')} value={pendingCount} />
            <StatCard icon="checkSquare" iconColor={T.success} label={t('Đã xử lý tuần này', 'Resolved this week')} value={resolvedCount} />
            <StatCard icon="trash" iconColor={T.errorDark} label={t('Đã gỡ nội dung', 'Content removed')} value={removedCount} />
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* View tabs */}
            <div role="tablist" aria-label={t('Chế độ xem kiểm duyệt', 'Moderation view')}
              style={{ display: 'flex', gap: 4, padding: '12px 20px 0', borderBottom: `1px solid ${T.border}` }}>
              {[
                { id: 'queue', vi: 'Hàng chờ báo cáo', en: 'Report queue', icon: 'flag' },
                { id: 'audit', vi: 'Nhật ký kiểm duyệt', en: 'Moderation log', icon: 'scrollText' },
              ].map(v => {
                const active = view === v.id;
                return (
                  <button key={v.id} role="tab" aria-selected={active} onClick={() => setView(v.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px 12px',
                      border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: active ? 700 : 600,
                      color: active ? pColor : T.textSecondary,
                      borderBottom: `2px solid ${active ? pColor : 'transparent'}`,
                      marginBottom: -1, transition: 'all 0.15s',
                    }}>
                    <Icon name={v.icon} size={14} color="currentColor" />
                    {t(v.vi, v.en)}
                  </button>
                );
              })}
            </div>

            {view === 'audit' && <ModAuditTimeline log={log} lang={lang} />}

            {view === 'queue' && (
              <>
                {/* Filter bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap' }}>
                  <div role="tablist" aria-label={t('Lọc theo trạng thái', 'Filter by status')} style={{ display: 'flex', gap: 6 }}>
                    {statusTabs.map(s => {
                      const active = statusFilter === s.id;
                      return (
                        <button key={s.id} role="tab" aria-selected={active} onClick={() => setStatusFilter(s.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                            borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                            border: `1.5px solid ${active ? pColor : T.border}`,
                            background: active ? pColor + '12' : 'transparent',
                            color: active ? pColor : T.textSecondary,
                            fontSize: 12, fontWeight: active ? 700 : 600, transition: 'all 0.15s',
                          }}>
                          {t(s.vi, s.en)}
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, padding: '0 6px', borderRadius: 99, minWidth: 18,
                            background: active ? pColor + '22' : T.bg, fontVariantNumeric: 'tabular-nums',
                          }}>{s.count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    aria-label={t('Lọc theo loại nội dung', 'Filter by content type')}
                    style={{
                      padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.card, fontSize: 12.5, color: T.textPrimary, fontFamily: 'inherit', cursor: 'pointer',
                    }}>
                    <option value="all">{t('Mọi loại nội dung', 'All content types')}</option>
                    <option value="post">{t('Bài viết', 'Posts')}</option>
                    <option value="comment">{t('Bình luận', 'Comments')}</option>
                    <option value="message">{t('Tin nhắn', 'Messages')}</option>
                  </select>

                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160,
                    background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: '7px 12px',
                  }}>
                    <Icon name="search" size={13} color={T.textMuted} />
                    <input value={query} onChange={e => setQuery(e.target.value)}
                      aria-label={t('Tìm trong báo cáo', 'Search reports')}
                      placeholder={t('Tìm nội dung, người đăng, người báo cáo…', 'Search content, author, reporter…')}
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12.5, color: T.textPrimary, minWidth: 0, fontFamily: 'inherit' }} />
                  </div>

                  <button onClick={refresh} aria-label={t('Tải lại danh sách', 'Refresh list')}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`, background: T.card,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = T.card}>
                    <Icon name="refreshCw" size={14} color={T.textSecondary} />
                  </button>
                </div>

                {status === 'loading' && <ModSkeleton />}
                {status === 'error' && <ModError onRetry={retry} lang={lang} />}
                {status === 'ready' && filtered.length === 0 && <ModEmpty statusFilter={statusFilter} lang={lang} />}

                {/* Desktop table */}
                {status === 'ready' && filtered.length > 0 && (
                  <div className="mod-table-wrap" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                          <th style={{ ...thStyle, paddingLeft: 20, width: '34%' }}>{t('Nội dung', 'Content')}</th>
                          <th style={thStyle}>{t('Người báo cáo', 'Reporter')}</th>
                          <th style={thStyle}>{t('Lý do', 'Reason')}</th>
                          <th style={thStyle}>{t('Người bị báo cáo', 'Reported user')}</th>
                          <th style={thStyle}>{t('Thời gian', 'Time')}</th>
                          <th style={thStyle}>{t('Trạng thái', 'Status')}</th>
                          <th style={{ ...thStyle, paddingRight: 20 }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{t('Hành động', 'Action')}</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(r => (
                          <tr key={r.id} className="mod-row" onClick={() => setDetail(r.id)}
                            style={{ borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.12s' }}>
                            <td style={{ ...tdStyle, paddingLeft: 20 }}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                <ModTypeIcon type={r.type} />
                                <div style={{ minWidth: 0 }}>
                                  <div className="mod-clamp2" style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.45 }}>{r.content}</div>
                                  <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3 }}>{t(r.location.vi, r.location.en)}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                              {r.reporter.name}
                              {r.duplicates.length > 0 && (
                                <span style={{ fontSize: 10.5, color: T.textMuted }}> +{r.duplicates.length}</span>
                              )}
                            </td>
                            <td style={tdStyle}><ModReasonBadge reason={r.reason} lang={lang} /></td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontWeight: 600, color: T.textPrimary }}>{r.contentAuthor.name}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }} title={r.timeFull}>{t(r.time.vi, r.time.en)}</td>
                            <td style={tdStyle}><ModStatusBadge report={r} lang={lang} /></td>
                            <td style={{ ...tdStyle, paddingRight: 20, textAlign: 'right' }}>
                              <button onClick={(e) => { e.stopPropagation(); setDetail(r.id); }}
                                aria-label={t(`Mở chi tiết báo cáo ${r.id.toUpperCase()}`, `Open report ${r.id.toUpperCase()}`)}
                                style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="chevronRight" size={13} color={T.textSecondary} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile card list */}
                {status === 'ready' && filtered.length > 0 && (
                  <div className="mod-cards" style={{ flexDirection: 'column', gap: 10, padding: 14 }}>
                    {filtered.map(r => (
                      <button key={r.id} onClick={() => setDetail(r.id)}
                        style={{
                          textAlign: 'left', border: `1px solid ${T.border}`, borderRadius: 12,
                          background: T.card, padding: 14, cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ModTypeIcon type={r.type} />
                          <ModReasonBadge reason={r.reason} lang={lang} />
                          <span style={{ marginLeft: 'auto' }}><ModStatusBadge report={r} lang={lang} /></span>
                        </div>
                        <div className="mod-clamp2" style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.5 }}>{r.content}</div>
                        <div style={{ fontSize: 11, color: T.textMuted }}>
                          {t(`${r.reporter.name} báo cáo ${r.contentAuthor.name}`, `${r.reporter.name} reported ${r.contentAuthor.name}`)} · <span title={r.timeFull}>{t(r.time.vi, r.time.en)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Detail sheet */}
      {detailReport && (
        <ModDetailSheet report={detailReport} onClose={() => setDetail(null)}
          onDismiss={handleDismiss} onRemove={handleRemoveRequest} lang={lang} pColor={pColor} />
      )}

      {/* Confirm remove */}
      {confirmRemove && (
        <ModConfirmRemove report={confirmRemove} onCancel={() => setConfirmRemove(null)} onConfirm={handleRemoveConfirm} lang={lang} />
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

Object.assign(window, { ModerationScreen });
