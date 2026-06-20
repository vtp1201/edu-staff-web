// ── Announcements — /admin/announcements (DR-007) ──────────────────────────
// Roles:   ADMIN / principal (create + manage)
//          recipients receive entries via DR-006 Notifications Center.
// Epic:    US-E10.3 (FE).
// Flow:    Send pipeline = compose → preview → send (or schedule, or save
//          as draft). Sent items fan out via the same SSE channel as
//          DR-006 (`notification.new`).
//
// App routing: mounted by app.jsx for ADMIN under section `announcements`
//   (route /admin/announcements). The list view is the default surface; the
//   compose drawer opens in-place — there is NO separate route for compose.
//   Detail sheet opens via `setDetailId(itemId)`; closing returns to the list
//   without a URL change. Read-receipts come from `ncReadReceipts()` (window-
//   exported by notifications.jsx) so the surfaces stay in sync.

// ── Lookups ───────────────────────────────────────────────────────────────

const AN_PRIORITY = {
  normal:    { vi: 'Thông thường', en: 'Normal',     color: T.textSecondary, bg: T.bg,           icon: 'bell',      stamp: 'NORMAL' },
  important: { vi: 'Quan trọng',    en: 'Important',  color: T.warning,       bg: T.warningLight, icon: 'alertTriangle', stamp: 'IMPORTANT' },
  urgent:    { vi: 'Khẩn',          en: 'Urgent',     color: T.error,         bg: T.errorLight,   icon: 'alertTriangle', stamp: 'URGENT' },
};

const AN_STATUS = {
  draft:     { vi: 'Nháp',         en: 'Draft',      color: T.warning, bg: T.warningLight, icon: 'penLine' },
  scheduled: { vi: 'Đã lên lịch',  en: 'Scheduled',  color: T.primary, bg: T.primaryLight, icon: 'clock' },
  sent:      { vi: 'Đã gửi',       en: 'Sent',       color: T.success, bg: T.successLight, icon: 'check' },
};

// Recipient presets — multi-select shows these as toggle chips. Class-level
// targeting drops the per-class list from ROSTER_CLASSES (window-exported by
// roster.jsx) so the picker stays in sync with the real catalogue.
const AN_AUDIENCE_PRESETS = [
  { id: 'all',       vi: 'Tất cả',           en: 'Everyone',      icon: 'users',     est: 1280, exclusive: true },
  { id: 'teachers',  vi: 'Chỉ giáo viên',    en: 'Teachers only', icon: 'userCheck', est: 42 },
  { id: 'parents',   vi: 'Chỉ phụ huynh',    en: 'Parents only',  icon: 'users',     est: 768 },
  { id: 'students',  vi: 'Chỉ học sinh',     en: 'Students only', icon: 'graduationCap', est: 480 },
];

const AN_GRADE_LEVELS = [10, 11, 12];

// ── Mock seed ─────────────────────────────────────────────────────────────

const AN_SEED = [
  {
    id: 'a1',
    title: 'Họp phụ huynh cuối kỳ',
    body: 'Kính chào quý phụ huynh, nhà trường tổ chức họp phụ huynh tổng kết học kỳ I vào lúc 14h00 thứ Bảy ngày 18/01/2026 tại hội trường lớn. Kính mong quý phụ huynh sắp xếp tham dự đầy đủ để cùng nhà trường trao đổi về kết quả học tập của các em.',
    priority: 'important',
    status: 'sent',
    audience: { presets: ['parents'], gradeLevels: [], classIds: [] },
    audienceLabelVi: 'Tất cả phụ huynh',
    audienceLabelEn: 'All parents',
    sentAtVi: '10/01/2026 09:30', sentAtEn: '2026-01-10 09:30',
    createdBy: 'Trần Minh Quân',
    recipientCount: 312, readCount: 280,
    attachments: [{ name: 'Chuong-trinh-hop.pdf', size: '124 KB' }],
  },
  {
    id: 'a2',
    title: 'Thông báo lịch thi học kỳ 2',
    body: 'Kính gửi các em học sinh, lịch thi học kỳ II năm học 2025–2026 đã được cập nhật và niêm yết tại bảng tin. Các em xem lịch chi tiết và chuẩn bị tài liệu ôn tập kỹ. Mọi thắc mắc liên hệ giáo viên chủ nhiệm hoặc văn phòng nhà trường.',
    priority: 'normal',
    status: 'sent',
    audience: { presets: ['students'], gradeLevels: [], classIds: [] },
    audienceLabelVi: 'Tất cả học sinh',
    audienceLabelEn: 'All students',
    sentAtVi: '05/01/2026 14:00', sentAtEn: '2026-01-05 14:00',
    createdBy: 'Trần Minh Quân',
    recipientCount: 480, readCount: 412,
    attachments: [{ name: 'Lich-thi-HK2.pdf', size: '88 KB' }],
  },
  {
    id: 'a3',
    title: 'Kế hoạch hè 2026',
    body: 'Bản thảo kế hoạch hoạt động hè 2026. Bao gồm các chương trình ngoại khoá, lớp học hè và lịch nghỉ. Đang chờ rà soát từ phòng giáo vụ trước khi gửi chính thức.',
    priority: 'normal',
    status: 'draft',
    audience: { presets: ['all'], gradeLevels: [], classIds: [] },
    audienceLabelVi: 'Tất cả',
    audienceLabelEn: 'Everyone',
    savedAtVi: '12/06/2026 16:45', savedAtEn: '2026-06-12 16:45',
    createdBy: 'Trần Minh Quân',
    recipientCount: 0, readCount: 0,
    attachments: [],
  },
];

// Per-announcement recipient mock — drives the read-receipt list.
const AN_RECIPIENTS = {
  a1: [
    { id: 'r1', name: 'Nguyễn Văn Đức',  child: 'Nguyễn Minh Khoa · 11A2', avatar: 'ND', color: T.purple,  readAt: '10/01/2026 09:42' },
    { id: 'r2', name: 'Trần Thị Mai',    child: 'Trần Văn Bình · 10A1',     avatar: 'TM', color: T.success, readAt: '10/01/2026 10:15' },
    { id: 'r3', name: 'Lê Văn Tài',      child: 'Hoàng Thị Linh · 10A1',    avatar: 'LT', color: T.warning, readAt: '10/01/2026 12:30' },
    { id: 'r4', name: 'Phạm Quốc Huy',   child: 'Phạm Đức Dũng · 10A1',     avatar: 'PH', color: T.primary, readAt: '11/01/2026 07:08' },
    { id: 'r5', name: 'Đỗ Mạnh Cường',   child: 'Đỗ Thu Hằng · 10A1',       avatar: 'DC', color: T.teal,    readAt: '11/01/2026 19:22' },
    { id: 'r6', name: 'Vũ Khắc Bình',    child: 'Vũ Quốc Bảo · 10A1',       avatar: 'VB', color: T.error,   readAt: null },
    { id: 'r7', name: 'Bùi Thanh Hoa',   child: 'Bùi Minh Tuấn · 10A1',     avatar: 'BH', color: T.warning, readAt: null },
    { id: 'r8', name: 'Phan Thị Vân',    child: 'Phan Anh Khoa · 11B2',     avatar: 'PV', color: T.purple,  readAt: '13/01/2026 08:00' },
    { id: 'r9', name: 'Mai Thị Hồng',    child: 'Mai Thu Hà · 11B2',         avatar: 'MH', color: T.success, readAt: '13/01/2026 14:11' },
    { id: 'r10', name: 'Lý Minh Khôi',   child: 'Lý Thanh Hà · 10A2',        avatar: 'LK', color: T.primary, readAt: null },
  ],
  a2: [
    { id: 'r11', name: 'Nguyễn Minh Khoa', child: 'Lớp 11A2',  avatar: 'NK', color: T.warning, readAt: '05/01/2026 14:12' },
    { id: 'r12', name: 'Trần Văn Bình',    child: 'Lớp 10A1',  avatar: 'TB', color: T.teal,    readAt: '05/01/2026 14:18' },
    { id: 'r13', name: 'Hoàng Thị Linh',   child: 'Lớp 10A1',  avatar: 'HL', color: T.error,   readAt: '05/01/2026 15:00' },
    { id: 'r14', name: 'Lê Thị Cẩm',       child: 'Lớp 11B2',  avatar: 'LC', color: T.purple,  readAt: '05/01/2026 16:30' },
    { id: 'r15', name: 'Phạm Đức Dũng',    child: 'Lớp 10A1',  avatar: 'PD', color: T.success, readAt: null },
    { id: 'r16', name: 'Vũ Quốc Bảo',      child: 'Lớp 10A1',  avatar: 'VB', color: T.error,   readAt: null },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────

const anReadPct = (a) => a.recipientCount > 0 ? Math.round((a.readCount / a.recipientCount) * 100) : 0;

// ── Main screen ──────────────────────────────────────────────────────────

const AnnouncementsScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [items, setItems] = React.useState(AN_SEED);
  const [filter, setFilter] = React.useState('all');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerEdit, setDrawerEdit] = React.useState(null);  // existing draft to edit
  const [detailId, setDetailId] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind, key: Date.now() });
    window.setTimeout(() => setToast(null), 2600);
  };

  const counts = {
    all: items.length,
    sent: items.filter(i => i.status === 'sent').length,
    scheduled: items.filter(i => i.status === 'scheduled').length,
    draft: items.filter(i => i.status === 'draft').length,
  };

  const filtered = items.filter(i => filter === 'all' || i.status === filter);

  // ── Mutations ──
  const handleSave = (payload) => {
    const id = drawerEdit ? drawerEdit.id : `a${Date.now()}`;
    const status = payload.action === 'send'
      ? 'sent'
      : payload.action === 'schedule'
      ? 'scheduled'
      : 'draft';
    const now = new Date().toLocaleString('vi-VN', { hour12: false });

    const next = {
      id,
      title: payload.title.trim(),
      body: payload.body.trim(),
      priority: payload.priority,
      status,
      audience: payload.audience,
      audienceLabelVi: payload.audienceLabelVi,
      audienceLabelEn: payload.audienceLabelEn,
      ...(status === 'sent'      ? { sentAtVi: now,     sentAtEn: now } : {}),
      ...(status === 'scheduled' ? { scheduledAtVi: payload.scheduleAt, scheduledAtEn: payload.scheduleAt } : {}),
      ...(status === 'draft'     ? { savedAtVi: now,    savedAtEn: now } : {}),
      createdBy: 'Trần Minh Quân',
      recipientCount: status === 'sent' ? payload.estimate : 0,
      readCount: 0,
      attachments: payload.attachments || [],
    };

    setItems(prev => {
      const exists = prev.find(p => p.id === id);
      if (exists) return prev.map(p => p.id === id ? next : p);
      return [next, ...prev];
    });
    setDrawerOpen(false);
    setDrawerEdit(null);
    showToast(
      status === 'sent'      ? t('Đã gửi thông báo.',  'Announcement sent.')
      : status === 'scheduled' ? t('Đã lên lịch thông báo.', 'Announcement scheduled.')
      :                          t('Đã lưu nháp.', 'Draft saved.')
    );
  };

  const handleDelete = (id) => {
    setItems(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
    if (detailId === id) setDetailId(null);
    showToast(t('Đã xoá thông báo.', 'Announcement deleted.'));
  };

  const handleRemind = (id) => {
    const a = items.find(p => p.id === id);
    const unread = (a?.recipientCount || 0) - (a?.readCount || 0);
    showToast(t(`Đã gửi nhắc đến ${unread} người chưa đọc.`,
                `Reminder sent to ${unread} unread recipients.`));
  };

  const detailItem = detailId ? items.find(i => i.id === detailId) : null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
      <div style={{ padding: '28px 32px 40px', maxWidth: 1120, margin: '0 auto' }}>

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
            {t('Thông báo toàn trường', 'School announcements')}
          </span>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="megaphone" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Thông báo toàn trường', 'School announcements')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Gửi thông báo đến giáo viên, học sinh, phụ huynh. Mỗi lượt gửi đẩy thông báo qua SSE.',
                 'Send announcements to teachers, students, and parents. Each send fans out over SSE.')}
            </div>
          </div>
          <Badge color={T.error}>
            <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
            ADMIN · BGH
          </Badge>
          <Button variant="primary" icon="plus" onClick={() => { setDrawerEdit(null); setDrawerOpen(true); }}>
            {t('Tạo thông báo mới', 'New announcement')}
          </Button>
        </div>

        {/* Status filter pills */}
        <StatusPills t={t} pColor={pColor} filter={filter} setFilter={setFilter} counts={counts} />

        {/* List */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <EmptyState t={t} pColor={pColor}
              variant={filter === 'all' ? 'all' : 'filter'}
              onCreate={() => { setDrawerEdit(null); setDrawerOpen(true); }}
              onReset={() => setFilter('all')} />
          ) : (
            filtered.map(item => (
              <AnnouncementCard
                key={item.id} item={item} t={t} lang={lang} pColor={pColor}
                onDetail={() => setDetailId(item.id)}
                onDelete={() => setConfirmDelete(item.id)}
                onEdit={item.status === 'draft' ? () => { setDrawerEdit(item); setDrawerOpen(true); } : null}
              />
            ))
          )}
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <CreateAnnouncementDrawer
          t={t} lang={lang} pColor={pColor}
          edit={drawerEdit}
          onClose={() => { setDrawerOpen(false); setDrawerEdit(null); }}
          onSave={handleSave}
        />
      )}

      {/* Detail sheet */}
      {detailItem && (
        <AnnouncementDetailSheet
          t={t} lang={lang} pColor={pColor}
          item={detailItem}
          recipients={AN_RECIPIENTS[detailItem.id] || []}
          onClose={() => setDetailId(null)}
          onRemind={() => handleRemind(detailItem.id)}
          onDelete={() => setConfirmDelete(detailItem.id)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <DeleteDialog
          t={t} item={items.find(i => i.id === confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000,
          animation: 'an-toast-in 0.2s ease-out',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: T.success,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes an-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes an-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes an-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ── Status pills ──────────────────────────────────────────────────────────

const StatusPills = ({ t, pColor, filter, setFilter, counts }) => {
  const pills = [
    { id: 'all',       vi: 'Tất cả',        en: 'All',       color: pColor,           icon: null },
    { id: 'sent',      vi: 'Đã gửi',        en: 'Sent',      color: T.success,        icon: 'check' },
    { id: 'scheduled', vi: 'Đã lên lịch',   en: 'Scheduled', color: T.primary,        icon: 'clock' },
    { id: 'draft',     vi: 'Nháp',          en: 'Draft',     color: T.warning,        icon: 'penLine' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 8, flexWrap: 'wrap',
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: 8,
    }}>
      {pills.map(p => {
        const active = filter === p.id;
        return (
          <button key={p.id} onClick={() => setFilter(p.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 13px', borderRadius: 8,
              border: `1.5px solid ${active ? p.color : 'transparent'}`,
              background: active ? p.color + '14' : 'transparent',
              color: active ? p.color : T.textSecondary,
              fontSize: 12.5, fontWeight: active ? 800 : 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bg; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            {p.icon && <Icon name={p.icon} size={11} color={active ? p.color : T.textMuted} strokeWidth={2.4} />}
            {t(p.vi, p.en)}
            <span style={{
              fontSize: 10.5, fontWeight: 800,
              background: active ? p.color + '22' : T.bg,
              color: active ? p.color : T.textMuted,
              padding: '1px 7px', borderRadius: 99,
              fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
            }}>{counts[p.id]}</span>
          </button>
        );
      })}
    </div>
  );
};

// ── Announcement card ─────────────────────────────────────────────────────

const AnnouncementCard = ({ item, t, lang, pColor, onDetail, onDelete, onEdit }) => {
  const sm = AN_STATUS[item.status];
  const pm = AN_PRIORITY[item.priority];
  const pct = anReadPct(item);
  const audienceLabel = lang === 'en' ? item.audienceLabelEn : item.audienceLabelVi;
  const timeline = item.status === 'sent'
    ? (lang === 'en' ? item.sentAtEn : item.sentAtVi)
    : item.status === 'scheduled'
    ? (lang === 'en' ? item.scheduledAtEn : item.scheduledAtVi)
    : (lang === 'en' ? item.savedAtEn : item.savedAtVi);

  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${item.status === 'draft' ? T.warning + '44' : T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '18px 22px', position: 'relative', overflow: 'hidden',
    }}>
      {item.priority === 'urgent' && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: T.error,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: pm.color + '18', color: pm.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="megaphone" size={19} color={pm.color} strokeWidth={2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{item.title}</span>
            <Badge color={pm.color} bg={pm.bg}>
              <Icon name={pm.icon} size={10} color={pm.color} strokeWidth={2.4} />
              {t(pm.vi, pm.en)}
            </Badge>
            <Badge color={sm.color} bg={sm.bg}>
              <Icon name={sm.icon} size={10} color={sm.color} strokeWidth={2.4} />
              {t(sm.vi, sm.en)}
              {item.status === 'scheduled' && timeline && (
                <span style={{ marginLeft: 5, opacity: 0.8 }}>· {timeline}</span>
              )}
            </Badge>
          </div>

          <div style={{ fontSize: 12.5, color: T.textMuted, marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="users" size={11} color={T.textMuted} />
              {t('Gửi đến:', 'To:')} <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{audienceLabel}</strong>
            </span>
            {timeline && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.border }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  <Icon name="clock" size={11} color={T.textMuted} />
                  {timeline}
                </span>
              </>
            )}
            {item.createdBy && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: T.border }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="userCheck" size={11} color={T.textMuted} />
                  {item.createdBy}
                </span>
              </>
            )}
          </div>

          {item.status === 'sent' && (
            <div style={{
              padding: '8px 12px', background: T.bg, borderRadius: 8,
              border: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              marginBottom: 4,
            }}>
              <Stat icon="users" iconColor={pColor}
                label={t('Đã gửi', 'Sent')}
                value={item.recipientCount.toLocaleString('vi-VN')} />
              <span style={{ width: 1, height: 22, background: T.border }} />
              <Stat icon="check" iconColor={T.success}
                label={t('Đã đọc', 'Read')}
                value={`${item.readCount.toLocaleString('vi-VN')} (${pct}%)`} />
              <div style={{ flex: 1, minWidth: 120 }}>
                <ProgressTrack value={pct} color={T.success} />
              </div>
            </div>
          )}

          {item.status === 'draft' && (
            <div style={{
              padding: '6px 10px', background: T.warningLight, borderRadius: 7,
              border: `1px solid ${T.warning}33`,
              fontSize: 11.5, color: '#9A6A0F', fontStyle: 'italic',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="alertTriangle" size={11} color={T.warning} strokeWidth={2.2} />
              {t('Bản nháp — chưa gửi.', 'Draft — not sent yet.')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-end', flexShrink: 0 }}>
          {item.status === 'sent' ? (
            <Button variant="primary" icon="eye" onClick={onDetail} size="sm">
              {t('Xem chi tiết', 'Details')}
            </Button>
          ) : item.status === 'draft' ? (
            <Button variant="primary" icon="penLine" onClick={onEdit} size="sm">
              {t('Sửa nháp', 'Edit draft')}
            </Button>
          ) : (
            <Button variant="primary" icon="eye" onClick={onDetail} size="sm">
              {t('Xem chi tiết', 'Details')}
            </Button>
          )}
          <Button variant="ghost" icon="x" onClick={onDelete} size="sm"
            style={{ border: `1px solid ${T.border}`, color: T.error }}>
            {t('Xoá', 'Delete')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, iconColor, label, value }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
    <Icon name={icon} size={13} color={iconColor} strokeWidth={2.2} />
    <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}:</span>
    <span style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
  </div>
);

const ProgressTrack = ({ value, color }) => (
  <div style={{ height: 6, background: T.border, borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: '100%', transformOrigin: 'left', transform: `scaleX(${value / 100})`,
      background: color, borderRadius: 99,
      transition: 'transform 0.3s',
    }} />
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────

const EmptyState = ({ t, pColor, variant, onCreate, onReset }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '52px 24px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="megaphone" size={40} color={T.border} strokeWidth={1.6} />
    <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: T.textSecondary }}>
      {variant === 'all'
        ? t('Chưa có thông báo nào.', 'No announcements yet.')
        : t('Không có thông báo phù hợp bộ lọc.', 'No matching announcements.')}
    </div>
    <div style={{ marginTop: 4, fontSize: 12, marginBottom: 18 }}>
      {variant === 'all'
        ? t('Tạo thông báo đầu tiên để gửi đến giáo viên, học sinh, phụ huynh.',
            'Create the first announcement to send to teachers, students, or parents.')
        : t('Thử bộ lọc khác.', 'Try a different filter.')}
    </div>
    {variant === 'all' ? (
      <Button variant="primary" icon="plus" onClick={onCreate}>
        {t('Tạo thông báo', 'Create announcement')}
      </Button>
    ) : (
      <Button variant="ghost" onClick={onReset}
        style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
        {t('Xoá bộ lọc', 'Reset filter')}
      </Button>
    )}
  </div>
);

// ── Create / edit drawer ──────────────────────────────────────────────────

const CreateAnnouncementDrawer = ({ t, lang, pColor, edit, onClose, onSave }) => {
  const [title, setTitle] = React.useState(edit?.title || '');
  const [body, setBody]   = React.useState(edit?.body  || '');
  const [priority, setPriority] = React.useState(edit?.priority || 'normal');
  const [presets, setPresets]   = React.useState(edit?.audience?.presets || []);
  const [grades, setGrades]     = React.useState(edit?.audience?.gradeLevels || []);
  const [classes, setClasses]   = React.useState(edit?.audience?.classIds || []);
  const [scheduleMode, setScheduleMode] = React.useState('now');
  const [scheduleAt, setScheduleAt] = React.useState('');
  const [attachments, setAttachments] = React.useState(edit?.attachments || []);
  const [showPreview, setShowPreview] = React.useState(false);

  const rosterClasses = window.ROSTER_CLASSES || [];

  // Toggle helpers
  const togglePreset = (id) => {
    setPresets(p => {
      // "all" is exclusive — selecting it clears the others; selecting any
      // other clears "all".
      if (id === 'all') return p.includes('all') ? [] : ['all'];
      const next = p.filter(x => x !== 'all');
      return next.includes(id) ? next.filter(x => x !== id) : [...next, id];
    });
  };
  const toggleGrade = (g) => setGrades(gs => gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g]);
  const toggleClass = (id) => setClasses(cs => cs.includes(id) ? cs.filter(x => x !== id) : [...cs, id]);

  // Audience estimate — rough rollup of selected presets + per-grade + per-class.
  const audienceEstimate = React.useMemo(() => {
    let total = 0;
    presets.forEach(pid => {
      const meta = AN_AUDIENCE_PRESETS.find(p => p.id === pid);
      if (meta) total += meta.est;
    });
    total += grades.length * 96;   // assume ~96 students per grade
    total += classes.length * 32;  // ~32 per class
    return total;
  }, [presets, grades, classes]);

  // Audience label for the card.
  const audienceLabelVi = React.useMemo(() => {
    const parts = [];
    presets.forEach(pid => {
      const meta = AN_AUDIENCE_PRESETS.find(p => p.id === pid);
      if (meta) parts.push(meta.vi);
    });
    grades.forEach(g => parts.push(`Khối ${g}`));
    if (classes.length) {
      const names = classes.map(cid => rosterClasses.find(c => c.id === cid)?.name || cid);
      parts.push(`Lớp ${names.join(', ')}`);
    }
    return parts.length ? parts.join(' · ') : '— chưa chọn —';
  }, [presets, grades, classes, rosterClasses]);

  const audienceLabelEn = React.useMemo(() => {
    const parts = [];
    presets.forEach(pid => {
      const meta = AN_AUDIENCE_PRESETS.find(p => p.id === pid);
      if (meta) parts.push(meta.en);
    });
    grades.forEach(g => parts.push(`Grade ${g}`));
    if (classes.length) {
      const names = classes.map(cid => rosterClasses.find(c => c.id === cid)?.name || cid);
      parts.push(`Class ${names.join(', ')}`);
    }
    return parts.length ? parts.join(' · ') : '— none —';
  }, [presets, grades, classes, rosterClasses]);

  // Validation
  const titleOk = title.trim().length >= 5 && title.length <= 200;
  const bodyOk  = body.trim().length  >= 10 && body.length  <= 2000;
  const audienceOk = presets.length + grades.length + classes.length > 0;
  const scheduleOk = scheduleMode === 'now' || (scheduleMode === 'schedule' && scheduleAt);
  const canSubmit = titleOk && bodyOk && audienceOk && scheduleOk;

  const submit = (action) => {
    onSave({
      action, title, body, priority,
      audience: { presets, gradeLevels: grades, classIds: classes },
      audienceLabelVi, audienceLabelEn,
      scheduleAt: scheduleMode === 'schedule' ? scheduleAt : null,
      estimate: audienceEstimate,
      attachments,
    });
  };

  const addAttachment = () => {
    if (attachments.length >= 3) return;
    const idx = attachments.length + 1;
    const samples = [
      { name: `Tai-lieu-${idx}.pdf`, size: `${50 + idx * 20} KB` },
      { name: `Phu-luc-${idx}.docx`, size: `${30 + idx * 15} KB` },
      { name: `Bao-cao-${idx}.xlsx`, size: `${120 + idx * 25} KB` },
    ];
    setAttachments(a => [...a, samples[(a.length) % samples.length]]);
  };

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.45)',
        zIndex: 1000, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        animation: 'an-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="megaphone" size={17} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
              {edit ? t('Sửa thông báo', 'Edit announcement') : t('Tạo thông báo mới', 'New announcement')}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {edit ? t('Cập nhật bản nháp.', 'Update the draft.') : t('Gửi đến nhiều đối tượng cùng lúc.', 'Reach multiple audiences at once.')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}>
            <Icon name="x" size={16} color={T.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
          {/* Title */}
          <FieldLabel label={t('Tiêu đề', 'Title')} required />
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
            placeholder={t('VD: Họp phụ huynh cuối kỳ', 'e.g. End-of-term parent meeting')}
            style={inputStyle(pColor)} />
          <CharCount cur={title.length} max={200} valid={titleOk} t={t} />

          <div style={{ height: 14 }} />

          {/* Body */}
          <FieldLabel label={t('Nội dung', 'Body')} required />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000}
            placeholder={t('Nội dung chi tiết của thông báo…', 'Write the announcement here…')}
            style={{ ...inputStyle(pColor), resize: 'vertical', lineHeight: 1.55 }} />
          <CharCount cur={body.length} max={2000} valid={bodyOk} t={t} minHint={10} />

          <div style={{ height: 16 }} />

          {/* Audience */}
          <FieldLabel label={t('Gửi đến', 'Send to')} required />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 10 }}>
            {AN_AUDIENCE_PRESETS.map(p => {
              const active = presets.includes(p.id);
              return (
                <button key={p.id} onClick={() => togglePreset(p.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 11px', borderRadius: 99,
                    border: `1.5px solid ${active ? pColor : T.border}`,
                    background: active ? pColor + '14' : T.card,
                    color: active ? pColor : T.textSecondary,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                  <Icon name={p.icon} size={11} color={active ? pColor : T.textMuted} strokeWidth={2.2} />
                  {t(p.vi, p.en)}
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, color: active ? pColor : T.textMuted,
                    fontFamily: 'ui-monospace, Menlo, monospace',
                  }}>~{p.est}</span>
                </button>
              );
            })}
          </div>

          <details style={{ marginBottom: 10 }}>
            <summary style={{
              fontSize: 11, fontWeight: 700, color: T.textMuted, cursor: 'pointer',
              padding: '5px 0', userSelect: 'none',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {t('Lọc theo khối lớp / lớp cụ thể', 'Narrow by grade / specific class')}
            </summary>
            <div style={{ marginTop: 10 }}>
              <SubFieldLabel label={t('Theo khối lớp', 'By grade')} />
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                {AN_GRADE_LEVELS.map(g => {
                  const active = grades.includes(g);
                  return (
                    <button key={g} onClick={() => toggleGrade(g)}
                      style={{
                        padding: '5px 12px', borderRadius: 7,
                        border: `1.5px solid ${active ? pColor : T.border}`,
                        background: active ? pColor + '14' : T.card,
                        color: active ? pColor : T.textSecondary,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}>
                      {t(`Khối ${g}`, `Grade ${g}`)}
                    </button>
                  );
                })}
              </div>
              <SubFieldLabel label={t('Theo lớp', 'By class')} />
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {(window.ROSTER_CLASSES || []).map(c => {
                  const active = classes.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleClass(c.id)}
                      style={{
                        padding: '5px 11px', borderRadius: 7,
                        border: `1.5px solid ${active ? pColor : T.border}`,
                        background: active ? pColor + '14' : T.card,
                        color: active ? pColor : T.textSecondary,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </details>

          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: pColor + '08', border: `1px solid ${pColor}33`,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: T.textSecondary,
          }}>
            <Icon name="users" size={12} color={pColor} strokeWidth={2.4} />
            <span style={{ flex: 1 }}>
              {t('Ước tính người nhận:', 'Estimated recipients:')}
            </span>
            <strong style={{ color: pColor, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              ~{audienceEstimate.toLocaleString('vi-VN')}
            </strong>
          </div>

          <div style={{ height: 16 }} />

          {/* Priority */}
          <FieldLabel label={t('Độ ưu tiên', 'Priority')} required />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['normal', 'important', 'urgent'].map(p => {
              const meta = AN_PRIORITY[p];
              const active = priority === p;
              return (
                <button key={p} onClick={() => setPriority(p)}
                  style={{
                    flex: 1, minWidth: 100,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 11px', borderRadius: 8,
                    border: `1.5px solid ${active ? meta.color : T.border}`,
                    background: active ? meta.color + '12' : T.card,
                    color: active ? meta.color : T.textPrimary,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: `2px solid ${active ? meta.color : T.border}`,
                    flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <span style={{ width: 9, height: 9, borderRadius: '50%', background: meta.color }} />}
                  </span>
                  <Icon name={meta.icon} size={12} color={active ? meta.color : T.textMuted} strokeWidth={2.2} />
                  <span style={{ fontSize: 12.5, fontWeight: 800 }}>{t(meta.vi, meta.en)}</span>
                </button>
              );
            })}
          </div>

          <div style={{ height: 16 }} />

          {/* Schedule */}
          <FieldLabel label={t('Thời gian gửi', 'Send time')} required />
          <div style={{ display: 'flex', gap: 8 }}>
            <ScheduleRadio active={scheduleMode === 'now'} onClick={() => setScheduleMode('now')}
              icon="send" labelVi="Gửi ngay" labelEn="Send now" t={t} pColor={pColor} />
            <ScheduleRadio active={scheduleMode === 'schedule'} onClick={() => setScheduleMode('schedule')}
              icon="clock" labelVi="Lên lịch" labelEn="Schedule" t={t} pColor={pColor} />
          </div>
          {scheduleMode === 'schedule' && (
            <SchedulePicker value={scheduleAt} onChange={setScheduleAt} pColor={pColor} t={t} lang={lang} />
          )}

          <div style={{ height: 16 }} />

          {/* Attachments */}
          <FieldLabel label={t('Đính kèm file', 'Attachments')} optional />
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: 10, background: T.bg, borderRadius: 8,
            border: `1px dashed ${T.border}`,
          }}>
            {attachments.length === 0 && (
              <div style={{ fontSize: 11.5, color: T.textMuted, textAlign: 'center', padding: '6px 0' }}>
                {t('Tối đa 3 file. Kéo thả hoặc bấm để thêm.', 'Up to 3 files. Drop or click to add.')}
              </div>
            )}
            {attachments.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '6px 10px', background: T.card, borderRadius: 6,
                border: `1px solid ${T.border}`,
                fontSize: 12,
              }}>
                <Icon name="fileText" size={13} color={pColor} strokeWidth={2} />
                <span style={{ flex: 1, fontWeight: 700, color: T.textPrimary }}>{f.name}</span>
                <span style={{ color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5 }}>{f.size}</span>
                <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))}
                  style={{
                    width: 18, height: 18, borderRadius: 4, border: 'none',
                    background: T.bg, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Icon name="x" size={10} color={T.error} strokeWidth={2.4} />
                </button>
              </div>
            ))}
            {attachments.length < 3 && (
              <button onClick={addAttachment}
                style={{
                  padding: '6px 10px', borderRadius: 6,
                  border: `1px dashed ${pColor}55`, background: 'transparent',
                  color: pColor, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                <Icon name="plus" size={11} color={pColor} strokeWidth={2.4} />
                {t('Thêm file', 'Add file')}
              </button>
            )}
          </div>

          <div style={{ height: 18 }} />

          {/* Preview toggle */}
          <button onClick={() => setShowPreview(p => !p)}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              background: pColor + '0F', border: `1px solid ${pColor}33`,
              color: pColor, fontSize: 12.5, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
            <Icon name="eye" size={12} color={pColor} strokeWidth={2.4} />
            {showPreview ? t('Ẩn xem trước', 'Hide preview') : t('Xem trước thông báo', 'Preview notification')}
          </button>

          {showPreview && (
            <NotificationPreview
              t={t} title={title || t('(Tiêu đề trống)', '(empty title)')}
              body={body || t('(Nội dung trống)', '(empty body)')}
              priority={priority} pColor={pColor}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', background: T.bg,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <Button variant="ghost" onClick={onClose}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Huỷ', 'Cancel')}
          </Button>
          <Button variant="ghost" icon="fileText" onClick={() => submit('draft')}
            disabled={!titleOk}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Lưu nháp', 'Save draft')}
          </Button>
          <span style={{ flex: 1 }} />
          {scheduleMode === 'schedule' ? (
            <Button variant="primary" icon="clock" onClick={() => submit('schedule')} disabled={!canSubmit}>
              {t('Lên lịch', 'Schedule')}
            </Button>
          ) : (
            <Button variant="primary" icon="send" onClick={() => submit('send')} disabled={!canSubmit}>
              {t('Gửi ngay', 'Send now')}
            </Button>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

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

const SubFieldLabel = ({ label }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: T.textMuted,
    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5,
  }}>{label}</div>
);

const inputStyle = (pColor) => ({
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1.5px solid ${T.border}`, background: T.card,
  fontSize: 13.5, color: T.textPrimary, fontFamily: 'inherit',
  outline: 'none', transition: 'border-color 0.15s',
});

const CharCount = ({ cur, max, valid, minHint, t }) => (
  <div style={{
    marginTop: 5, display: 'flex', justifyContent: 'space-between',
    fontSize: 10.5, color: valid ? T.success : T.textMuted, fontWeight: 700,
  }}>
    <span>
      {minHint && cur < minHint
        ? t(`Tối thiểu ${minHint} ký tự`, `Min ${minHint} characters`)
        : valid ? t('Hợp lệ', 'OK') : ''}
    </span>
    <span style={{ fontVariantNumeric: 'tabular-nums', color: cur >= max * 0.9 ? T.warning : T.textMuted }}>
      {cur} / {max}
    </span>
  </div>
);

// ── Schedule picker (shadcn-style Popover + Calendar + TimePicker) ─────────
// Replaces the native <input type="datetime-local"> for the compose drawer so
// scheduling lives inside the design system: a trigger button shows the
// formatted value; clicking it opens a popover containing a month-grid calendar
// and an HH:MM time picker (steppers + native input fallback). The value is
// kept in the same "YYYY-MM-DDTHH:MM" shape the rest of the form expects, so
// the send pipeline is untouched.

// Pad helpers and (de)serializers for the "YYYY-MM-DDTHH:MM" wire format.
const _sp_pad2 = (n) => String(n).padStart(2, '0');
const _sp_toWire = (d, hh, mm) =>
  `${d.getFullYear()}-${_sp_pad2(d.getMonth() + 1)}-${_sp_pad2(d.getDate())}T${_sp_pad2(hh)}:${_sp_pad2(mm)}`;
const _sp_parseWire = (s) => {
  if (!s) return { date: null, hh: 9, mm: 0 };
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return { date: null, hh: 9, mm: 0 };
  return { date: new Date(+m[1], +m[2] - 1, +m[3]), hh: +m[4], mm: +m[5] };
};
const _sp_fmt = (d, hh, mm, lang) => {
  if (!d) return '';
  const wd = lang === 'en'
    ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
    : ['CN','T2','T3','T4','T5','T6','T7'][d.getDay()];
  return `${wd} ${_sp_pad2(d.getDate())}/${_sp_pad2(d.getMonth() + 1)}/${d.getFullYear()} · ${_sp_pad2(hh)}:${_sp_pad2(mm)}`;
};

const SchedulePicker = ({ value, onChange, pColor, t, lang }) => {
  const init = React.useMemo(() => _sp_parseWire(value), []);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    const d = init.date || new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selDate, setSelDate] = React.useState(init.date);
  const [hh, setHh] = React.useState(init.hh);
  const [mm, setMm] = React.useState(init.mm);

  // Push every change up so the parent form always has the wire value.
  React.useEffect(() => {
    if (selDate) onChange(_sp_toWire(selDate, hh, mm));
  }, [selDate, hh, mm]);  // eslint-disable-line react-hooks/exhaustive-deps

  const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
  const monthEnd   = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  // Grid starts on Monday — the Vietnamese convention used elsewhere in the app.
  const startPad   = (monthStart.getDay() + 6) % 7;
  const totalCells = Math.ceil((startPad + monthEnd.getDate()) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startPad + 1;
    if (day < 1 || day > monthEnd.getDate()) return null;
    return new Date(view.getFullYear(), view.getMonth(), day);
  });

  const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
  const monthLabel = lang === 'en'
    ? view.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : `Tháng ${view.getMonth() + 1}, ${view.getFullYear()}`;

  const stepHh = (delta) => setHh(v => (v + delta + 24) % 24);
  const stepMm = (delta) => setMm(v => (v + delta + 60) % 60);

  const triggerLabel = selDate
    ? _sp_fmt(selDate, hh, mm, lang)
    : t('Chọn ngày và giờ gửi…', 'Pick date and time…');

  return (
    <div style={{ position: 'relative', marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...inputStyle(pColor),
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left', cursor: 'pointer', width: '100%',
          color: selDate ? T.textPrimary : T.textMuted,
          fontWeight: selDate ? 700 : 500,
        }}>
        <Icon name="calendar" size={14} color={selDate ? pColor : T.textMuted} strokeWidth={2.1} />
        <span style={{ flex: 1 }}>{triggerLabel}</span>
        <Icon name="chevronDown" size={12} color={T.textMuted} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div
            role="dialog"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 61,
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
              padding: 14, display: 'flex', gap: 14,
              minWidth: 460,
            }}>
            {/* Calendar */}
            <div style={{ width: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <button type="button"
                  onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                  style={spIconBtn}>
                  <Icon name="chevronLeft" size={13} color={T.textSecondary} strokeWidth={2} />
                </button>
                <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 800, color: T.textPrimary }}>
                  {monthLabel}
                </div>
                <button type="button"
                  onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                  style={spIconBtn}>
                  <Icon name="chevronRight" size={13} color={T.textSecondary} strokeWidth={2} />
                </button>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4,
              }}>
                {(lang === 'en'
                  ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
                  : ['T2','T3','T4','T5','T6','T7','CN']
                ).map((w, i) => (
                  <div key={i} style={{
                    fontSize: 10, fontWeight: 700, color: T.textMuted,
                    textAlign: 'center', padding: '4px 0',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{w}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const isToday = sameDay(d, today);
                  const isSel = sameDay(d, selDate);
                  const isPast = d < today;
                  return (
                    <button key={i} type="button"
                      onClick={() => setSelDate(new Date(d))}
                      disabled={isPast}
                      style={{
                        height: 32, borderRadius: 7,
                        border: isToday && !isSel ? `1px solid ${pColor}55` : '1px solid transparent',
                        background: isSel ? pColor : 'transparent',
                        color: isSel ? '#fff' : isPast ? T.textMuted : T.textPrimary,
                        fontSize: 12.5, fontWeight: isSel || isToday ? 800 : 500,
                        cursor: isPast ? 'not-allowed' : 'pointer',
                        opacity: isPast ? 0.4 : 1,
                        fontFamily: 'inherit',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time picker */}
            <div style={{
              width: 170, paddingLeft: 14, borderLeft: `1px solid ${T.border}`,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('Giờ gửi', 'Time')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SpStepper value={hh} max={23} onStep={stepHh}
                  onSet={(v) => setHh(Math.max(0, Math.min(23, v)))} pColor={pColor} />
                <div style={{ fontSize: 18, fontWeight: 800, color: T.textMuted }}>:</div>
                <SpStepper value={mm} max={59} onStep={stepMm}
                  onSet={(v) => setMm(Math.max(0, Math.min(59, v)))} pColor={pColor} step={5} />
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 'auto' }}>
                {selDate
                  ? t(`Gửi vào: ${_sp_fmt(selDate, hh, mm, lang)}`, `Send at: ${_sp_fmt(selDate, hh, mm, lang)}`)
                  : t('Chưa chọn ngày.', 'No date selected.')}
              </div>
              <button type="button"
                onClick={() => setOpen(false)}
                disabled={!selDate}
                style={{
                  padding: '8px 0', borderRadius: 8, border: 'none',
                  background: selDate ? pColor : T.border, color: '#fff',
                  fontSize: 12.5, fontWeight: 800, cursor: selDate ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}>
                {t('Xác nhận', 'Confirm')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const spIconBtn = {
  width: 26, height: 26, borderRadius: 7,
  border: `1px solid ${T.border}`, background: T.bg,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', fontFamily: 'inherit',
};

const SpStepper = ({ value, max, onStep, onSet, pColor, step = 1 }) => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    border: `1px solid ${T.border}`, borderRadius: 8, background: '#fff',
    overflow: 'hidden',
  }}>
    <button type="button" onClick={() => onStep(step)}
      style={{ width: '100%', padding: '4px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}>
      <Icon name="chevronUp" size={11} color={T.textSecondary} strokeWidth={2.4} />
    </button>
    <input
      type="number" value={String(value).padStart(2, '0')}
      onChange={(e) => onSet(parseInt(e.target.value, 10) || 0)}
      style={{
        width: '100%', textAlign: 'center', border: 'none', outline: 'none',
        fontSize: 18, fontWeight: 800, color: pColor,
        background: 'transparent', fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        padding: '2px 0',
      }} />
    <button type="button" onClick={() => onStep(-step)}
      style={{ width: '100%', padding: '4px 0', border: 'none', background: 'transparent', cursor: 'pointer' }}>
      <Icon name="chevronDown" size={11} color={T.textSecondary} strokeWidth={2.4} />
    </button>
  </div>
);

const ScheduleRadio = ({ active, onClick, icon, labelVi, labelEn, t, pColor }) => (
  <button onClick={onClick}
    style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 11px', borderRadius: 8,
      border: `1.5px solid ${active ? pColor : T.border}`,
      background: active ? pColor + '14' : T.card,
      color: active ? pColor : T.textPrimary,
      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    }}>
    <span style={{
      width: 18, height: 18, borderRadius: '50%',
      border: `2px solid ${active ? pColor : T.border}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {active && <span style={{ width: 9, height: 9, borderRadius: '50%', background: pColor }} />}
    </span>
    <Icon name={icon} size={13} color={active ? pColor : T.textMuted} strokeWidth={2.2} />
    <span style={{ fontSize: 12.5, fontWeight: 800 }}>{t(labelVi, labelEn)}</span>
  </button>
);

// ── DR-006-style notification preview ─────────────────────────────────────

const NotificationPreview = ({ t, title, body, priority, pColor }) => {
  const m = AN_PRIORITY[priority];
  return (
    <div style={{
      marginTop: 10, padding: 12, borderRadius: 10,
      background: T.bg, border: `1px dashed ${T.border}`,
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 800, color: T.textMuted,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
      }}>
        {t('Người nhận sẽ thấy như sau (DR-006)', 'Recipients will see (DR-006)')}
      </div>
      <div style={{
        background: pColor + '08', borderRadius: 10,
        border: `1px solid ${pColor + '33'}`,
        padding: '12px 14px',
        display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 12,
        alignItems: 'flex-start',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: m.color + '18', color: m.color,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="megaphone" size={14} color={m.color} strokeWidth={2.2} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35 }}>
              {title}
            </span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: pColor }} />
          </div>
          <div style={{
            fontSize: 12, color: T.textSecondary, lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {body}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11,
          }}>
            <span style={{ color: T.textMuted, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="clock" size={10} color={T.textMuted} />
              {t('Vừa xong', 'Just now')}
            </span>
            <Badge color={m.color} bg={m.bg}>
              <Icon name={m.icon} size={9} color={m.color} strokeWidth={2.4} />
              {t(m.vi, m.en)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Detail sheet (read receipts) ──────────────────────────────────────────

const AnnouncementDetailSheet = ({ t, lang, pColor, item, recipients, onClose, onRemind, onDelete }) => {
  const [tab, setTab] = React.useState('all');  // all | read | unread
  const pct = anReadPct(item);

  const filtered = recipients.filter(r =>
    tab === 'all' ? true
    : tab === 'read' ? !!r.readAt
    : !r.readAt
  );

  const pm = AN_PRIORITY[item.priority];
  const sm = AN_STATUS[item.status];

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.45)',
        zIndex: 1000, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 620, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column',
        animation: 'an-slide-in 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: pm.color + '18', color: pm.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="megaphone" size={19} color={pm.color} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <Badge color={pm.color} bg={pm.bg}>
                <Icon name={pm.icon} size={10} color={pm.color} strokeWidth={2.4} />
                {t(pm.vi, pm.en)}
              </Badge>
              <Badge color={sm.color} bg={sm.bg}>
                <Icon name={sm.icon} size={10} color={sm.color} strokeWidth={2.4} />
                {t(sm.vi, sm.en)}
              </Badge>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary }}>{item.title}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {item.status === 'sent'
                ? t(`Gửi ${item.sentAtVi} bởi ${item.createdBy}`, `Sent ${item.sentAtEn} by ${item.createdBy}`)
                : t(`Cập nhật ${item.savedAtVi} bởi ${item.createdBy}`, `Updated ${item.savedAtEn} by ${item.createdBy}`)
              }
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}>
            <Icon name="x" size={18} color={T.textMuted} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          {/* Audience strip */}
          <div style={{
            padding: '10px 14px', background: T.bg, borderRadius: 10,
            border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.textSecondary,
            marginBottom: 16,
          }}>
            <Icon name="users" size={13} color={T.textMuted} />
            <span style={{ flex: 1 }}>
              {t('Gửi đến:', 'Sent to:')} <strong style={{ color: T.textPrimary, fontWeight: 800 }}>
                {lang === 'en' ? item.audienceLabelEn : item.audienceLabelVi}
              </strong>
            </span>
          </div>

          {/* Body */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            border: `1px solid ${T.border}`,
            fontSize: 13.5, lineHeight: 1.6, color: T.textSecondary,
            whiteSpace: 'pre-wrap',
            marginBottom: 16,
          }}>
            {item.body}
          </div>

          {/* Attachments */}
          {item.attachments && item.attachments.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <FieldLabel label={t('Đính kèm', 'Attachments')} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.attachments.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${T.border}`, background: T.card,
                    fontSize: 12.5,
                  }}>
                    <Icon name="fileText" size={14} color={pColor} strokeWidth={2} />
                    <span style={{ flex: 1, fontWeight: 700, color: T.textPrimary }}>{f.name}</span>
                    <span style={{ color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5 }}>{f.size}</span>
                    <button title={t('Tải xuống', 'Download')}
                      style={{
                        width: 24, height: 24, borderRadius: 6, border: `1px solid ${T.border}`,
                        background: T.bg, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      <Icon name="arrowRight" size={11} color={T.textMuted} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read-receipt section */}
          {item.status === 'sent' && (
            <>
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 12,
                padding: '14px 16px', borderRadius: 10,
                background: pColor + '08', border: `1px solid ${pColor}33`,
              }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {t('Tỉ lệ đọc', 'Read rate')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: pColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {pct}%
                    </span>
                    <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 700 }}>
                      {item.readCount} / {item.recipientCount}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <ProgressTrack value={pct} color={pColor} />
                  <div style={{ marginTop: 6, fontSize: 11, color: T.textMuted }}>
                    {item.recipientCount - item.readCount} {t('người chưa đọc', 'recipients have not read')}
                  </div>
                </div>
                <Button variant="secondary" icon="bell" onClick={onRemind}
                  disabled={item.recipientCount - item.readCount === 0}>
                  {t('Gửi nhắc lại', 'Resend reminder')}
                </Button>
              </div>

              {/* Receipt filter + export */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap',
              }}>
                {[
                  { id: 'all',    vi: 'Tất cả',    en: 'All',      n: recipients.length, color: T.textSecondary },
                  { id: 'read',   vi: 'Đã đọc',    en: 'Read',     n: recipients.filter(r => r.readAt).length,  color: T.success },
                  { id: 'unread', vi: 'Chưa đọc',  en: 'Unread',   n: recipients.filter(r => !r.readAt).length, color: T.error },
                ].map(opt => {
                  const active = tab === opt.id;
                  return (
                    <button key={opt.id} onClick={() => setTab(opt.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 7,
                        border: `1.5px solid ${active ? opt.color : T.border}`,
                        background: active ? opt.color + '14' : T.card,
                        color: active ? opt.color : T.textSecondary,
                        fontSize: 12, fontWeight: 800, cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                      {t(opt.vi, opt.en)}
                      <span style={{
                        fontSize: 10, fontWeight: 800,
                        background: active ? opt.color + '22' : T.bg,
                        color: active ? opt.color : T.textMuted,
                        padding: '1px 6px', borderRadius: 99,
                        fontVariantNumeric: 'tabular-nums',
                      }}>{opt.n}</span>
                    </button>
                  );
                })}
                <span style={{ flex: 1 }} />
                <Button variant="ghost" icon="fileText"
                  style={{ border: `1px solid ${T.border}`, color: T.textSecondary }} size="sm">
                  {t('Xuất CSV', 'Export CSV')}
                </Button>
              </div>

              {/* Recipient list */}
              <div style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden',
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: T.textMuted }}>
                    {t('Không có người nhận phù hợp.', 'No matching recipients.')}
                  </div>
                ) : (
                  filtered.map((r, i) => (
                    <div key={r.id} style={{
                      display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 10,
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: r.color + '22', color: r.color,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800,
                      }}>
                        {r.avatar}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{r.child}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {r.readAt ? (
                          <>
                            <Badge color={T.success}>
                              <Icon name="check" size={9} color={T.success} strokeWidth={2.6} />
                              {t('Đã đọc', 'Read')}
                            </Badge>
                            <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                              {r.readAt}
                            </div>
                          </>
                        ) : (
                          <Badge color={T.error}>
                            <Icon name="clock" size={9} color={T.error} strokeWidth={2.6} />
                            {t('Chưa đọc', 'Unread')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0,
          background: T.card,
        }}>
          <Button variant="ghost" icon="x" onClick={onDelete}
            style={{ border: `1px solid ${T.error}55`, color: T.error, background: T.errorLight }}>
            {t('Xoá thông báo', 'Delete')}
          </Button>
          <span style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}
            style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
            {t('Đóng', 'Close')}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

// ── Delete confirm dialog ─────────────────────────────────────────────────

const DeleteDialog = ({ t, item, onCancel, onConfirm }) => (
  <div onClick={onCancel}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 20, backdropFilter: 'blur(3px)',
    }}>
    <div onClick={(e) => e.stopPropagation()}
      role="alertdialog" aria-modal="true"
      style={{
        background: T.card, borderRadius: 14, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: 'an-fadein 0.18s ease-out',
      }}>
      <div style={{ padding: '22px 24px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: T.error + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="alertTriangle" size={19} color={T.error} strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
              {t('Xóa thông báo này?', 'Delete this announcement?')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6 }}>
              {t('Người nhận đã đọc sẽ không bị ảnh hưởng.',
                 'Recipients who have already read will not be affected.')}
            </div>
          </div>
        </div>
      </div>
      <div style={{
        padding: '14px 24px', background: T.bg,
        borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'flex-end', gap: 10,
      }}>
        <Button variant="ghost" onClick={onCancel}
          style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
          {t('Huỷ', 'Cancel')}
        </Button>
        <Button variant="danger" icon="x" onClick={onConfirm}>
          {t('Xoá', 'Delete')}
        </Button>
      </div>
    </div>
  </div>
);

Object.assign(window, { AnnouncementsScreen, CreateAnnouncementDrawer });
