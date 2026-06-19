// ── Notifications Center — /notifications (DR-006) ─────────────────────────
// Roles:   ALL (teacher, principal, admin, student, parent)
// Epic:    US-E10.2 (FE). Realtime fan-out via SSE event `notification.new`
//          per decision-0009 / US-E06.2. The mock here simulates a single
//          incoming push 3s after mount (SOC-02).
//
// Persistence note: read-state is local to this session. In production the
// "mark all read" action would PATCH /notifications/read-batch and the unread
// counter in the global header would re-derive from /notifications/unread-count.

// ── Type taxonomy ───────────────────────────────────────────────────────────

const NC_TYPES = {
  grade: {
    vi: 'Điểm số',      en: 'Grades',
    icon: 'chart',      color: T.success,
    section: 'grades',  // click target — routes via app.handleNavigate.
  },
  attendance: {
    vi: 'Điểm danh',    en: 'Attendance',
    icon: 'calendar',   color: T.primary,
    section: 'attendance',
  },
  discipline: {
    vi: 'Kỷ luật',      en: 'Discipline',
    icon: 'alertTriangle', color: T.warning,
    section: 'discipline',
  },
  announcement: {
    vi: 'Thông báo trường', en: 'School announcement',
    icon: 'megaphone',  color: T.info || '#2A6FDB',
    section: 'messaging',
  },
  system: {
    vi: 'Hệ thống',     en: 'System',
    icon: 'bell',       color: T.textMuted,
    section: null,
  },
};

const NC_TAB_FILTERS = [
  { id: 'all',          vi: 'Tất cả',           en: 'All',           type: null },
  { id: 'unread',       vi: 'Chưa đọc',         en: 'Unread',        type: 'unread' },
  { id: 'grade',        vi: 'Điểm số',          en: 'Grades',        type: 'grade' },
  { id: 'attendance',   vi: 'Điểm danh',        en: 'Attendance',    type: 'attendance' },
  { id: 'discipline',   vi: 'Kỷ luật',          en: 'Discipline',    type: 'discipline' },
  { id: 'announcement', vi: 'Thông báo trường', en: 'Announcements', type: 'announcement' },
];

// ── Mock seed ───────────────────────────────────────────────────────────────
// 4 spec-mandated items + 8 extras to exercise the load-more flow.

const NC_SEED = [
  // ── Spec-mandated ──
  { id: 'n1', type: 'grade',        unread: true,  ts: '5 phút trước',
    titleVi: 'Điểm Toán lớp 10A1 đã được công bố',
    titleEn: 'Math grades published — Class 10A1',
    bodyVi: 'BGH đã phê duyệt và công bố điểm Toán học kỳ I cho lớp 10A1. Toàn bộ 32 học sinh đã có điểm chính thức.',
    bodyEn: 'Admin approved and published Math grades (Term I) for Class 10A1. All 32 students now have final grades.' },
  { id: 'n2', type: 'attendance',   unread: true,  ts: '1 giờ trước',
    titleVi: 'Vắng không phép — Trần Văn Bình',
    titleEn: 'Unexcused absence — Tran Van Binh',
    bodyVi: 'Học sinh lớp 10A1 vắng không phép trong tiết 2 (Toán) hôm nay. Đã gửi thông báo cho phụ huynh.',
    bodyEn: 'Student in 10A1 absent unexcused in period 2 (Math) today. Parent notified.' },
  { id: 'n3', type: 'announcement', unread: false, ts: 'Hôm qua',
    titleVi: 'Thông báo: Họp phụ huynh cuối kỳ',
    titleEn: 'Announcement: End-of-term parent meeting',
    bodyVi: 'Họp phụ huynh cuối kỳ I diễn ra vào 14h thứ Bảy tuần này tại hội trường lớn. Kính mong quý phụ huynh tham dự đầy đủ.',
    bodyEn: 'End-of-term I parent meeting takes place 2pm this Saturday at the main hall. Attendance is requested.' },
  { id: 'n4', type: 'discipline',   unread: false, ts: '3 ngày trước',
    titleVi: 'Ghi nhận vi phạm — Lê Thị Cẩm (mức Nhẹ)',
    titleEn: 'Violation logged — Le Thi Cam (Minor)',
    bodyVi: 'Vi phạm: nói chuyện riêng trong giờ học. GVCN đã ghi nhận. Sổ kỷ luật được cập nhật.',
    bodyEn: 'Talking during class. Homeroom teacher logged the case. Discipline record updated.' },

  // ── Extras ──
  { id: 'n5', type: 'grade',        unread: true,  ts: '2 giờ trước',
    titleVi: 'Bài giữa kỳ đã được chấm — Vật Lý 10A1',
    titleEn: 'Midterm graded — Physics 10A1',
    bodyVi: 'GV Trần Văn Minh đã chấm xong bài giữa kỳ Vật Lý. Đang chờ BGH phê duyệt trước khi công bố.',
    bodyEn: 'Mr. Tran Van Minh finished grading Physics midterms. Awaiting admin approval before publishing.' },
  { id: 'n6', type: 'announcement', unread: true,  ts: '4 giờ trước',
    titleVi: 'Nghỉ lễ 30/4 — 1/5',
    titleEn: 'Public holiday 30/4 — 1/5',
    bodyVi: 'Trường nghỉ lễ từ ngày 30/04 đến hết 03/05. Học sinh trở lại trường từ ngày 04/05.',
    bodyEn: 'School closed 30/04–03/05. Students return on 04/05.' },
  { id: 'n7', type: 'attendance',   unread: false, ts: 'Hôm qua',
    titleVi: 'Báo cáo điểm danh tuần — 10A1',
    titleEn: 'Weekly attendance report — 10A1',
    bodyVi: 'Tỉ lệ điểm danh tuần: 96.5%. 3 lượt vắng không phép, 7 lượt có phép.',
    bodyEn: 'Weekly attendance rate: 96.5%. 3 unexcused absences, 7 excused.' },
  { id: 'n8', type: 'system',       unread: false, ts: 'Hôm qua',
    titleVi: 'Đăng nhập từ thiết bị mới',
    titleEn: 'New device sign-in',
    bodyVi: 'Tài khoản của bạn được đăng nhập từ Chrome trên macOS lúc 19:42. Nếu không phải bạn, vui lòng đổi mật khẩu.',
    bodyEn: 'Account signed in from Chrome on macOS at 19:42. If this was not you, please change your password.' },
  { id: 'n9', type: 'discipline',   unread: false, ts: '2 ngày trước',
    titleVi: 'Xóa khỏi sổ kỷ luật — Phạm Đức Dũng',
    titleEn: 'Discipline entry cleared — Pham Duc Dung',
    bodyVi: 'Sau buổi sinh hoạt chủ nhiệm, GVCN quyết định xoá ghi nhận vi phạm nhẹ ngày 10/04.',
    bodyEn: 'After homeroom session, teacher cleared minor violation from 10/04.' },
  { id: 'n10', type: 'grade',       unread: false, ts: '4 ngày trước',
    titleVi: 'Điểm Tiếng Anh đã chốt — 10A1',
    titleEn: 'English grades locked — 10A1',
    bodyVi: 'BGH đã khoá điểm Tiếng Anh học kỳ I. Điểm sẵn sàng cho việc ký học bạ cuối kỳ.',
    bodyEn: 'Admin locked English grades for Term I. Ready for transcript signing.' },
  { id: 'n11', type: 'attendance',  unread: false, ts: '5 ngày trước',
    titleVi: 'Có phép — Đỗ Thu Hằng',
    titleEn: 'Excused absence — Do Thu Hang',
    bodyVi: 'PH đã gửi giấy phép nghỉ học ngày 09/04 (lý do: khám sức khoẻ).',
    bodyEn: 'Parent submitted excuse for 09/04 absence (reason: medical checkup).' },
  { id: 'n12', type: 'announcement', unread: false, ts: '1 tuần trước',
    titleVi: 'Bảng tin trường: Cuộc thi học sinh giỏi cấp tỉnh',
    titleEn: 'Notice: Provincial student excellence contest',
    bodyVi: 'Đăng ký dự thi học sinh giỏi cấp tỉnh môn Toán & Vật Lý mở từ 15/04. Học sinh quan tâm liên hệ GVCN.',
    bodyEn: 'Registration for provincial Math & Physics excellence contest opens 15/04. Interested students contact homeroom teacher.' },
];

// New notifications that will be "pushed" into the list via the SSE simulation.
// SOC-02: the prototype pushes exactly ONE — NC_INCOMING[0] — three seconds
// after mount. Later entries stay as fallback seed in case the demo is rerun.
const NC_INCOMING = [
  { type: 'grade',        ts: 'Vừa xong',
    titleVi: 'Điểm Toán lớp 10A1 đã được công bố',
    titleEn: 'Math grades published — 10A1',
    bodyVi: 'BGH vừa phê duyệt và công bố điểm Toán học kỳ I cho lớp 10A1.',
    bodyEn: 'Admin just approved and published Term I Math grades for 10A1.' },
  { type: 'attendance',   ts: 'Vừa xong',
    titleVi: 'Có phép — Hoàng Thị Linh',
    titleEn: 'Excused absence — Hoang Thi Linh',
    bodyVi: 'PH đã gửi giấy xin phép nghỉ học buổi chiều nay.',
    bodyEn: 'Parent submitted excuse for this afternoon.' },
  { type: 'announcement', ts: 'Vừa xong',
    titleVi: 'Cập nhật lịch thi cuối kỳ',
    titleEn: 'Updated end-of-term exam schedule',
    bodyVi: 'Lịch thi cuối kỳ I đã được cập nhật. Vui lòng kiểm tra mục Lịch thi.',
    bodyEn: 'End-of-term I exam schedule updated. Please review the exam schedule page.' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const ncUnreadCount = (items) => items.filter(n => n.unread).length;

// ── Main screen ────────────────────────────────────────────────────────────

const NotificationsCenterScreen = ({ role, lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [items, setItems]       = React.useState(NC_SEED);
  const [tab, setTab]           = React.useState('all');
  const [visible, setVisible]   = React.useState(8);
  const [loading, setLoading]   = React.useState(true);
  const [toast, setToast]       = React.useState(null);

  // Simulated initial load — 400ms skeleton.
  React.useEffect(() => {
    const tid = window.setTimeout(() => setLoading(false), 420);
    return () => window.clearTimeout(tid);
  }, []);

  // SSE simulation — single push 3s after the skeleton clears (SOC-02).
  // NC_INCOMING[0] is the canonical incoming event; the surface mirrors it
  // both as a row prepend and a sonner-style toast at the bottom-right.
  React.useEffect(() => {
    if (loading) return;
    const id = window.setTimeout(() => {
      const tpl = NC_INCOMING[0];
      const fresh = {
        ...tpl, id: `nc-live-${Date.now()}`,
        unread: true, starred: false, archived: false,
      };
      setItems(prev => [fresh, ...prev]);
      setToast({ ...fresh, key: fresh.id });
      window.setTimeout(() => setToast(t0 => (t0?.key === fresh.id ? null : t0)), 4500);
    }, 3000);
    return () => window.clearTimeout(id);
  }, [loading]);  // eslint-disable-line react-hooks/exhaustive-deps

  const unread = ncUnreadCount(items);

  const filter = NC_TAB_FILTERS.find(f => f.id === tab);
  const filtered = items.filter(n => {
    if (!filter || !filter.type) return true;
    if (filter.type === 'unread') return n.unread;
    return n.type === filter.type;
  });

  const visibleItems = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  // ── Actions ──
  const markRead = (id) => {
    setItems(prev => prev.map(n => n.id !== id ? n : { ...n, unread: false }));
  };

  const markAllRead = () => {
    setItems(prev => prev.map(n => n.unread ? { ...n, unread: false } : n));
    setToast({ type: 'system', titleVi: t('Đã đánh dấu tất cả là đã đọc.', 'All notifications marked as read.'), titleEn: '', key: `mark-${Date.now()}`, ack: true });
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleClick = (n) => {
    if (n.unread) markRead(n.id);
    const target = NC_TYPES[n.type]?.section;
    if (target && onNavigate) onNavigate(target);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      <div style={{ padding: '28px 32px 40px', maxWidth: 920, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, color: T.textMuted, marginBottom: 12,
        }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            <Icon name="home" size={12} color="currentColor" />
            {t('Trang chủ', 'Home')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>
            {t('Thông báo', 'Notifications')}
          </span>
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22,
        }}>
          <div style={{
            position: 'relative',
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="bell" size={22} color={pColor} strokeWidth={1.8} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 18, height: 18, borderRadius: 99,
                background: T.error, color: '#fff',
                fontSize: 10.5, fontWeight: 800, letterSpacing: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px',
                border: `2px solid ${T.card}`,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Thông báo', 'Notifications')}
            </div>
            <div style={{
              fontSize: 13, color: unread === 0 ? T.success : T.textMuted, marginTop: 2,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontWeight: unread === 0 ? 700 : 500,
            }}>
              {unread === 0 ? (
                <>
                  <Icon name="check" size={12} color={T.success} strokeWidth={2.6} />
                  {t('Tất cả đã đọc', 'All read')}
                </>
              ) : (
                <>
                  <strong style={{ color: T.textPrimary, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {unread}
                  </strong>{' '}
                  {t('chưa đọc', 'unread')}
                </>
              )}
              <span style={{ color: T.textMuted, fontWeight: 500 }}>
                · {items.length} {t('tổng cộng', 'total')}
              </span>
            </div>
          </div>
          <button onClick={markAllRead} disabled={unread === 0}
            style={{
              background: 'transparent', border: 'none', cursor: unread === 0 ? 'not-allowed' : 'pointer',
              padding: '7px 12px', borderRadius: 8,
              color: unread === 0 ? T.textMuted : pColor,
              fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit',
              opacity: unread === 0 ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => unread > 0 && (e.currentTarget.style.background = pColor + '10')}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Icon name="check" size={12} color={unread === 0 ? T.textMuted : pColor} strokeWidth={2.6} />
            {t('Đánh dấu tất cả đã đọc', 'Mark all as read')}
          </button>
        </div>

        {/* Filter pills */}
        <FilterPills
          t={t} pColor={pColor}
          items={items} tab={tab} setTab={(id) => { setTab(id); setVisible(8); }}
        />

        {/* List */}
        <div style={{
          marginTop: 16,
          background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
        }}>
          {loading ? (
            <SkeletonRows />
          ) : visibleItems.length === 0 ? (
            <EmptyState t={t} tab={tab} />
          ) : (
            visibleItems.map((n, i) => (
              <NotificationRow
                key={n.id} n={n} lang={lang} t={t} pColor={pColor}
                onClick={() => handleClick(n)}
                isLast={i === visibleItems.length - 1}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {!loading && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button onClick={() => setVisible(v => v + 8)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 9,
                background: T.card, border: `1.5px solid ${T.border}`,
                color: T.textPrimary, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = pColor}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              <Icon name="chevronDown" size={13} color={pColor} strokeWidth={2.4} />
              {t(`Xem thêm ${Math.min(8, filtered.length - visible)} thông báo`,
                 `Load ${Math.min(8, filtered.length - visible)} more`)}
              <span style={{
                fontSize: 11, fontWeight: 800, color: T.textMuted,
                background: T.bg, padding: '2px 8px', borderRadius: 4,
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}>
                {filtered.length - visible} {t('còn lại', 'left')}
              </span>
            </button>
          </div>
        )}

        {!loading && !hasMore && filtered.length > 0 && (
          <div style={{
            marginTop: 18, textAlign: 'center',
            fontSize: 12, color: T.textMuted,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            width: '100%', justifyContent: 'center',
          }}>
            <Icon name="check" size={12} color={T.success} strokeWidth={2.4} />
            {t('Đã hiển thị tất cả thông báo.', 'All notifications shown.')}
          </div>
        )}
      </div>

      {/* SSE toast (sonner-style) */}
      {toast && <SonnerToast t={t} lang={lang} toast={toast} pColor={pColor} onDismiss={() => setToast(null)} />}

      <style>{`
        @keyframes nc-row-in   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes nc-toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes nc-shimmer  { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
      `}</style>
    </div>
  );
};

// ── Filter pills ────────────────────────────────────────────────────────────

const FilterPills = ({ t, pColor, items, tab, setTab }) => {
  const counts = NC_TAB_FILTERS.map(f => {
    if (f.type === null)      return items.length;
    if (f.type === 'unread')  return ncUnreadCount(items);
    return items.filter(n => n.type === f.type).length;
  });

  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: 8,
    }}>
      {NC_TAB_FILTERS.map((f, idx) => {
        const active = tab === f.id;
        const meta = f.type && NC_TYPES[f.type];
        const color = active ? pColor : (meta?.color || T.textSecondary);
        const count = counts[idx];

        return (
          <button key={f.id} onClick={() => setTab(f.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 13px', borderRadius: 8,
              border: `1.5px solid ${active ? pColor : 'transparent'}`,
              background: active ? pColor + '14' : 'transparent',
              color: active ? pColor : T.textSecondary,
              fontSize: 12.5, fontWeight: active ? 800 : 600,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bg; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            {meta?.icon && (
              <Icon name={meta.icon} size={11} color={color} strokeWidth={2.4} />
            )}
            {f.id === 'unread' && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: active ? pColor : T.error,
              }} />
            )}
            {t(f.vi, f.en)}
            <span style={{
              fontSize: 10.5, fontWeight: 800,
              background: active ? pColor + '22' : T.bg,
              color: active ? pColor : T.textMuted,
              padding: '1px 7px', borderRadius: 99,
              fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Notification row ───────────────────────────────────────────────────────

const NotificationRow = ({ n, lang, t, pColor, onClick, isLast }) => {
  const m = NC_TYPES[n.type] || NC_TYPES.system;
  const unread = n.unread;
  const titleColor = unread ? T.textPrimary : T.textSecondary;

  return (
    <button onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr) auto',
        gap: 14, alignItems: 'flex-start',
        padding: '14px 20px 14px 17px',
        borderLeft: `3px solid ${unread ? pColor : 'transparent'}`,
        borderBottom: isLast ? 'none' : `1px solid ${T.border}`,
        background: unread ? pColor + '08' : T.card,
        border: 'none',
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 0.12s',
        animation: 'nc-row-in 0.18s ease-out',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = unread ? pColor + '12' : T.bg}
      onMouseLeave={e => e.currentTarget.style.background = unread ? pColor + '08' : T.card}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: m.color + '18',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 1,
      }}>
        <Icon name={m.icon} size={14} color={m.color} strokeWidth={2.2} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 14, fontWeight: unread ? 800 : 500,
            color: titleColor, lineHeight: 1.35,
          }}>
            {lang === 'en' ? n.titleEn : n.titleVi}
          </span>
          {unread && (
            <span title={t('Chưa đọc', 'Unread')} style={{
              width: 7, height: 7, borderRadius: '50%', background: pColor,
              flexShrink: 0,
            }} />
          )}
        </div>
        <div style={{
          fontSize: 12.5, color: unread ? T.textSecondary : T.textMuted,
          lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {lang === 'en' ? n.bodyEn : n.bodyVi}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9, marginTop: 7,
          flexWrap: 'wrap',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, color: T.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <Icon name="clock" size={10} color={T.textMuted} strokeWidth={2.2} />
            {n.ts}
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.border }} />
          <Badge color={m.color}>{t(m.vi, m.en)}</Badge>
        </div>
      </div>

      <Icon name="chevronRight" size={13} color={T.textMuted}
        style={{ alignSelf: 'center', flexShrink: 0 }} />
    </button>
  );
};

// ── Skeleton rows ─────────────────────────────────────────────────────────

const SkeletonRows = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto',
        gap: 14, padding: '14px 20px 14px 17px',
        borderBottom: i < 3 ? `1px solid ${T.border}` : 'none',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: T.bg,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{
            width: `${60 + i * 8}%`, height: 13, borderRadius: 4,
            background: 'linear-gradient(90deg, #EEF1F6 0%, #F8FAFC 50%, #EEF1F6 100%)',
            backgroundSize: '200% 100%',
            animation: 'nc-shimmer 1.2s linear infinite',
            animationDelay: `${i * 0.08}s`,
          }} />
          <div style={{
            width: `${85 - i * 5}%`, height: 11, borderRadius: 4,
            background: 'linear-gradient(90deg, #F2F5F9 0%, #FAFBFD 50%, #F2F5F9 100%)',
            backgroundSize: '200% 100%',
            animation: 'nc-shimmer 1.2s linear infinite',
            animationDelay: `${i * 0.08 + 0.05}s`,
          }} />
          <div style={{
            width: 80, height: 9, borderRadius: 4,
            background: 'linear-gradient(90deg, #F2F5F9 0%, #FAFBFD 50%, #F2F5F9 100%)',
            backgroundSize: '200% 100%',
            animation: 'nc-shimmer 1.2s linear infinite',
            animationDelay: `${i * 0.08 + 0.1}s`,
          }} />
        </div>
        <div />
      </div>
    ))}
  </>
);

// ── Empty state ───────────────────────────────────────────────────────────

const EmptyState = ({ t, tab }) => {
  const variant = tab === 'unread' ? 'unread' : 'all';
  return (
    <div style={{
      padding: '60px 24px', textAlign: 'center', color: T.textMuted,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 20, margin: '0 auto 14px',
        background: T.bg, border: `1px dashed ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={variant === 'unread' ? 'check' : 'bell'} size={36}
          color={variant === 'unread' ? T.success : T.border}
          strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary }}>
        {variant === 'unread'
          ? t('Tất cả đã đọc 🎉', "You're all caught up 🎉")
          : t('Chưa có thông báo nào.', 'No notifications yet.')}
      </div>
      <div style={{ marginTop: 4, fontSize: 12 }}>
        {variant === 'unread'
          ? t('Quay lại khi có thông báo mới.', 'Come back when new notifications arrive.')
          : t('Bạn sẽ nhận được thông báo về điểm số, điểm danh và sự kiện trường.',
              'You will be notified about grades, attendance, and school events.')}
      </div>
    </div>
  );
};

// ── Sonner-style toast (bottom-right) ──────────────────────────────────────

const SonnerToast = ({ t, lang, toast, pColor, onDismiss }) => {
  const m = NC_TYPES[toast.type] || NC_TYPES.system;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9000,
      background: T.card, color: T.textPrimary,
      padding: '12px 14px 12px 12px', borderRadius: 12,
      border: `1px solid ${m.color}33`,
      borderLeft: `4px solid ${m.color}`,
      boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'flex-start', gap: 11,
      minWidth: 280, maxWidth: 360,
      animation: 'nc-toast-in 0.22s ease-out',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: m.color + '18', color: m.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={m.icon} size={15} color={m.color} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
        }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: m.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {t(m.vi, m.en)}
          </span>
          {!toast.ack && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, color: T.textMuted,
              background: T.bg, padding: '0 6px', borderRadius: 4,
              fontFamily: 'ui-monospace, Menlo, monospace',
            }}>SSE</span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, lineHeight: 1.4 }}>
          {lang === 'en' ? toast.titleEn : toast.titleVi}
        </div>
        {toast.bodyVi && (
          <div style={{
            fontSize: 12, color: T.textMuted, marginTop: 2, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {lang === 'en' ? toast.bodyEn : toast.bodyVi}
          </div>
        )}
      </div>
      <button onClick={onDismiss} title={t('Đóng', 'Dismiss')}
        style={{
          width: 22, height: 22, borderRadius: 5, flexShrink: 0,
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: T.textMuted,
        }}>
        <Icon name="x" size={12} color={T.textMuted} strokeWidth={2.4} />
      </button>
    </div>
  );
};

Object.assign(window, { NotificationsCenterScreen });
