// ── Audit Log — /admin/audit-log ─────────────────────────────────────────────
// Role:    ADMIN only
// Epic:    ADR-0032 (Nghị định 13/2023/NĐ-CP — personal data audit trail)
// Notes:   Read-only. Every grade / record / conduct mutation across the
//          system is appended here by the AuditWriter port. Records are
//          append-only at the database level; the screen offers no edit
//          affordances. Cursor pagination is simulated via a `visible` count
//          + "Xem thêm" button; in production this would be a server cursor.

// ── Lookups ──────────────────────────────────────────────────────────────────

const AL_ENTITY_META = {
  grade:   { vi: 'Điểm số', en: 'Grade',     color: T.primary, icon: 'penLine' },
  record:  { vi: 'Học bạ',   en: 'Record',    color: T.teal,    icon: 'award' },
  conduct: { vi: 'Hạnh kiểm', en: 'Conduct',  color: T.warning, icon: 'shield' },
};

const AL_ACTION_META = {
  UPDATE:  { vi: 'Sửa giá trị',  en: 'Value updated', color: T.textSecondary, icon: 'penLine' },
  LOCK:    { vi: 'Khoá điểm',    en: 'Lock',          color: T.error,    icon: 'lock' },
  PUBLISH: { vi: 'Công bố',      en: 'Publish',       color: T.success,  icon: 'send' },
  SEAL:    { vi: 'Ký học bạ',    en: 'Seal',          color: T.success,  icon: 'award' },
  UNSEAL:  { vi: 'Mở học bạ',    en: 'Unseal',        color: T.warning,  icon: 'unlock' },
};

// ── Mock log ─────────────────────────────────────────────────────────────────
// Newest-first. Real backend orders by `createdAt` DESC with a stable cursor.

const AL_SEED = [
  // RECORD events
  { id: 'log-1041', ts: '13/06/2026 09:42:11', entityType: 'record',  action: 'UNSEAL', target: 'Học bạ · HK2 · 2024-2025',  targetId: 'rec-Phamhuuphuc-HK2-24-25', student: 'Phạm Hữu Phúc',  studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Mở học bạ theo công văn 142/SGD — chờ điều chỉnh điểm Lịch Sử.', selfApproved: true,  ip: '10.40.1.18' },
  { id: 'log-1040', ts: '13/06/2026 08:15:03', entityType: 'grade',   action: 'UPDATE', target: 'Toán · Cuối kỳ',            targetId: 'gr-12c1-math-ck-001', student: 'Lê Hoàng Nhật',   studentClass: '12C1', actor: { name: 'Nguyễn Thị Hương', role: 'TEACHER', id: 'tch-1' }, oldValue: '8.5', newValue: '9.0', reasonVi: 'Chấm lại theo đáp án chính thức của Sở GD.' },
  { id: 'log-1039', ts: '12/06/2026 16:30:47', entityType: 'grade',   action: 'LOCK',   target: 'Toán · 12C1 · HK1',          targetId: 'batch-12c1-math-hk1', student: '— · toàn lớp',     studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Khoá điểm chuẩn bị ký học bạ cuối kỳ.' },
  { id: 'log-1038', ts: '12/06/2026 16:05:22', entityType: 'grade',   action: 'PUBLISH', target: 'Toán · 12C1 · HK1',         targetId: 'batch-12c1-math-hk1', student: '— · toàn lớp',     studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Phê duyệt sau khi rà soát.' },
  { id: 'log-1037', ts: '12/06/2026 15:48:09', entityType: 'grade',   action: 'UPDATE', target: 'Toán · Giữa kỳ',             targetId: 'gr-11b2-math-gk-006', student: 'Trần Quốc Việt',  studentClass: '11B2', actor: { name: 'Nguyễn Thị Hương', role: 'TEACHER', id: 'tch-1' }, oldValue: '6.0', newValue: '7.0', reasonVi: 'Cộng điểm bài luận thêm theo quyết định 18/HD.' },
  { id: 'log-1036', ts: '12/06/2026 14:20:18', entityType: 'conduct', action: 'UPDATE', target: 'Hạnh kiểm · HK1',            targetId: 'conduct-10A1-PD',     student: 'Phạm Đức Dũng',   studentClass: '10A1', actor: { name: 'Nguyễn Văn Phúc', role: 'TEACHER', id: 'tch-9' }, oldValue: 'Trung bình', newValue: 'Khá', reasonVi: 'Đã cải thiện sau buổi sinh hoạt chủ nhiệm 10/06.' },
  { id: 'log-1035', ts: '12/06/2026 11:55:00', entityType: 'record',  action: 'SEAL',   target: 'Học bạ · HK1 · 2025-2026',  targetId: 'rec-Lehoangnhat-HK1-25-26', student: 'Lê Hoàng Nhật',  studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Ký học bạ cuối HK1.' },
  { id: 'log-1034', ts: '12/06/2026 11:54:48', entityType: 'record',  action: 'SEAL',   target: 'Học bạ · HK1 · 2025-2026',  targetId: 'rec-Dinhquynh-HK1-25-26',  student: 'Đinh Thị Quỳnh', studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Ký học bạ cuối HK1.' },
  { id: 'log-1033', ts: '12/06/2026 11:54:32', entityType: 'record',  action: 'SEAL',   target: 'Học bạ · HK1 · 2025-2026',  targetId: 'rec-Phamhuuphuc-HK1-25-26', student: 'Phạm Hữu Phúc',  studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Ký học bạ cuối HK1.' },
  { id: 'log-1032', ts: '11/06/2026 17:02:14', entityType: 'grade',   action: 'UPDATE', target: 'Vật Lý · TX2',                targetId: 'gr-11b2-phy-tx2-004', student: 'Mai Thu Hà',      studentClass: '11B2', actor: { name: 'Trần Văn Minh', role: 'TEACHER', id: 'tch-2' }, oldValue: '7.0', newValue: '8.0', reasonVi: 'Sai sót khi nhập — đối chiếu lại với bài làm.' },
  { id: 'log-1031', ts: '11/06/2026 14:30:00', entityType: 'grade',   action: 'LOCK',   target: 'Toán · 11B2 · HK1',           targetId: 'batch-11b2-math-hk1', student: '— · toàn lớp',     studentClass: '11B2', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Khoá theo lịch cuối kỳ.' },
  { id: 'log-1030', ts: '10/06/2026 09:00:42', entityType: 'grade',   action: 'UPDATE', target: 'Hoá Học · GK',                targetId: 'gr-10a1-chem-gk-002', student: 'Trần Văn Bình',   studentClass: '10A1', actor: { name: 'Lê Thị Hoa', role: 'TEACHER', id: 'tch-3' }, oldValue: '6.5', newValue: '7.5', reasonVi: 'Phụ huynh khiếu nại — chấm lại bài.' },
  { id: 'log-1029', ts: '09/06/2026 22:14:55', entityType: 'conduct', action: 'UPDATE', target: 'Hạnh kiểm · HK1',             targetId: 'conduct-12C1-HN',     student: 'Hoàng Văn Nam',   studentClass: '12C1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, oldValue: 'Yếu',  newValue: 'Trung bình', reasonVi: 'Học sinh đã hoàn thành biện pháp giáo dục kỷ luật.' },
  { id: 'log-1028', ts: '09/06/2026 16:22:01', entityType: 'grade',   action: 'PUBLISH', target: 'Hoá · 10A1 · HK1',           targetId: 'batch-10a1-chem-hk1', student: '— · toàn lớp',     studentClass: '10A1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Phê duyệt cột.' },
  { id: 'log-1027', ts: '09/06/2026 10:42:11', entityType: 'grade',   action: 'UPDATE', target: 'Toán · Giữa kỳ',              targetId: 'gr-10a1-math-gk-008', student: 'Bùi Minh Tuấn',   studentClass: '10A1', actor: { name: 'Nguyễn Thị Hương', role: 'TEACHER', id: 'tch-1' }, oldValue: '5.0', newValue: '6.0', reasonVi: 'Cộng điểm khuyến khích bài làm thêm.' },
  { id: 'log-1026', ts: '08/06/2026 18:45:09', entityType: 'record',  action: 'UNSEAL', target: 'Học bạ · HK1 · 2024-2025',   targetId: 'rec-Tranqviet-HK1-24-25', student: 'Trần Quốc Việt', studentClass: '11B2', actor: { name: 'Lê Thị Mai', role: 'ADMIN', id: 'admin-2' }, reasonVi: 'Mở học bạ theo khiếu nại của phụ huynh — đã có biên bản đối chiếu.' },
  { id: 'log-1025', ts: '08/06/2026 11:08:54', entityType: 'grade',   action: 'UPDATE', target: 'Tiếng Anh · CK',              targetId: 'gr-11a1-eng-ck-003', student: 'Đặng Thuỳ Linh',  studentClass: '11A1', actor: { name: 'Đỗ Thị Mai', role: 'TEACHER', id: 'tch-5' }, oldValue: '8.5', newValue: '9.0', reasonVi: 'Phúc khảo phần nghe — điều chỉnh.' },
  { id: 'log-1024', ts: '07/06/2026 15:30:18', entityType: 'grade',   action: 'LOCK',   target: 'Văn · 11B2 · HK1',            targetId: 'batch-11b2-lit-hk1', student: '— · toàn lớp',     studentClass: '11B2', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Khoá điểm.' },
  { id: 'log-1023', ts: '07/06/2026 09:14:00', entityType: 'conduct', action: 'UPDATE', target: 'Hạnh kiểm · HK1',             targetId: 'conduct-11B2-VB',     student: 'Vũ Quốc Bảo',     studentClass: '11B2', actor: { name: 'Nguyễn Thị Hương', role: 'TEACHER', id: 'tch-1' }, oldValue: 'Khá', newValue: 'Tốt', reasonVi: 'Tham gia tốt phong trào lớp.' },
  { id: 'log-1022', ts: '06/06/2026 17:00:00', entityType: 'grade',   action: 'PUBLISH', target: 'Lý · 11B2 · HK1',            targetId: 'batch-11b2-phy-hk1', student: '— · toàn lớp',     studentClass: '11B2', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Phê duyệt cột.' },
  { id: 'log-1021', ts: '06/06/2026 09:33:21', entityType: 'grade',   action: 'UPDATE', target: 'Lịch Sử · CK',                targetId: 'gr-10a2-his-ck-005', student: 'Trần Khải An',    studentClass: '10A2', actor: { name: 'Phạm Quốc Bảo', role: 'TEACHER', id: 'tch-4' }, oldValue: '7.0', newValue: '7.5', reasonVi: 'Sửa lỗi nhập điểm.' },
  { id: 'log-1020', ts: '05/06/2026 14:00:00', entityType: 'record',  action: 'UNSEAL', target: 'Học bạ · HK2 · 2023-2024',  targetId: 'rec-Lethicam-HK2-23-24', student: 'Lê Thị Cẩm',     studentClass: '11B2', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Cập nhật học bạ theo hồ sơ chuyển trường.', selfApproved: false },
  { id: 'log-1019', ts: '05/06/2026 10:21:46', entityType: 'grade',   action: 'UPDATE', target: 'Toán · TX1',                  targetId: 'gr-10a1-math-tx1-005', student: 'Hoàng Thị Linh', studentClass: '10A1', actor: { name: 'Nguyễn Thị Hương', role: 'TEACHER', id: 'tch-1' }, oldValue: '8.0', newValue: '8.5', reasonVi: 'Bổ sung điểm cộng phát biểu.' },
  { id: 'log-1018', ts: '04/06/2026 22:08:30', entityType: 'conduct', action: 'UPDATE', target: 'Hạnh kiểm · HK1',             targetId: 'conduct-10A1-PD-2', student: 'Phạm Đức Dũng',   studentClass: '10A1', actor: { name: 'Nguyễn Văn Phúc', role: 'TEACHER', id: 'tch-9' }, oldValue: 'Yếu', newValue: 'Trung bình', reasonVi: 'Học sinh có tiến bộ tích cực trong tháng.' },
  { id: 'log-1017', ts: '03/06/2026 16:42:09', entityType: 'grade',   action: 'UPDATE', target: 'Văn · GK',                    targetId: 'gr-11b2-lit-gk-001', student: 'Phan Anh Khoa',   studentClass: '11B2', actor: { name: 'Phạm Quốc Bảo', role: 'TEACHER', id: 'tch-4' }, oldValue: '7.5', newValue: '8.0', reasonVi: 'Phúc khảo — đề thi ngữ pháp có lỗi đánh máy.' },
  { id: 'log-1016', ts: '02/06/2026 11:20:55', entityType: 'grade',   action: 'PUBLISH', target: 'Anh · 11A1 · HK1',           targetId: 'batch-11a1-eng-hk1', student: '— · toàn lớp',     studentClass: '11A1', actor: { name: 'Trần Minh Quân', role: 'ADMIN', id: 'admin-1' }, reasonVi: 'Phê duyệt cột.' },
  { id: 'log-1015', ts: '01/06/2026 09:14:32', entityType: 'grade',   action: 'UPDATE', target: 'Toán · CK',                   targetId: 'gr-12c1-math-ck-005', student: 'Bùi Tuấn Kiệt',   studentClass: '12C1', actor: { name: 'Nguyễn Thị Hương', role: 'TEACHER', id: 'tch-1' }, oldValue: '5.5', newValue: '6.0', reasonVi: 'Chấm lại theo đáp án mới.' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// Parse "DD/MM/YYYY HH:MM:SS" → comparable integer.
const alTimestampKey = (ts) => {
  if (!ts) return 0;
  const [datePart, timePart = '00:00:00'] = ts.split(' ');
  const [d, m, y] = datePart.split('/');
  return parseInt(`${y}${m}${d}${timePart.replace(/:/g, '')}`, 10);
};
const alIsoToKey = (iso) => iso ? parseInt(iso.split('-').join('') + '000000', 10) : null;
const alIsoToEndKey = (iso) => iso ? parseInt(iso.split('-').join('') + '235959', 10) : null;

// Build class + subject option lists from the seed data.
const alUniqueClasses = Array.from(new Set(AL_SEED.map(l => l.studentClass).filter(Boolean))).sort();
const alSubjectsForClass = (classFilter) => {
  const subjects = new Set();
  AL_SEED.forEach(l => {
    if (classFilter !== 'all' && l.studentClass !== classFilter) return;
    // target string starts with the subject name before the "·"
    const sub = (l.target || '').split('·')[0].trim();
    if (sub && sub !== '—' && l.entityType === 'grade') subjects.add(sub);
  });
  return Array.from(subjects).sort();
};

// ── Main screen ──────────────────────────────────────────────────────────────

const AuditLogScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  // Filter state — both "draft" (the form fields) and "applied" (used by the
  // list). The Tìm kiếm button copies draft → applied so users can configure
  // multiple filters before re-querying.
  const [draft, setDraft] = React.useState({
    dateFrom: '', dateTo: '',
    entityType: 'all',
    actor: '',
    classFilter: 'all',
    subjectFilter: 'all',
  });
  const [applied, setApplied] = React.useState(draft);
  const [visible, setVisible] = React.useState(10);

  const setD = (k, v) => setDraft(d => {
    const next = { ...d, [k]: v };
    if (k === 'classFilter') next.subjectFilter = 'all';
    return next;
  });

  const search = () => {
    setApplied(draft);
    setVisible(10);
  };
  const resetFilters = () => {
    const fresh = { dateFrom: '', dateTo: '', entityType: 'all', actor: '', classFilter: 'all', subjectFilter: 'all' };
    setDraft(fresh);
    setApplied(fresh);
    setVisible(10);
  };

  // Apply filters to the seed log.
  const filtered = React.useMemo(() => {
    const fromKey = alIsoToKey(applied.dateFrom);
    const toKey   = alIsoToEndKey(applied.dateTo);
    const actorQ  = applied.actor.trim().toLowerCase();
    return AL_SEED.filter(l => {
      const k = alTimestampKey(l.ts);
      if (fromKey && k < fromKey) return false;
      if (toKey   && k > toKey)   return false;
      if (applied.entityType !== 'all' && l.entityType !== applied.entityType) return false;
      if (applied.classFilter !== 'all' && l.studentClass !== applied.classFilter) return false;
      if (applied.subjectFilter !== 'all') {
        const sub = (l.target || '').split('·')[0].trim();
        if (sub !== applied.subjectFilter) return false;
      }
      if (actorQ) {
        const hay = `${l.actor.name} ${l.actor.id}`.toLowerCase();
        if (!hay.includes(actorQ)) return false;
      }
      return true;
    });
  }, [applied]);

  const slice = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const subjectsForCurrentClass = alSubjectsForClass(draft.classFilter);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

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
            {t('Nhật ký kiểm toán', 'Audit log')}
          </span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="scrollText" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Nhật ký kiểm toán', 'Audit log')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Mọi thay đổi đối với điểm số, học bạ và hạnh kiểm. Chỉ đọc — không thể chỉnh sửa hoặc xoá.',
                 'All changes to grades, transcripts, and conduct. Read-only — cannot be edited or deleted.')}
            </div>
          </div>
          <Badge color={T.error}>
            <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
            ADMIN · BGH
          </Badge>
        </div>

        {/* Read-only compliance notice */}
        <ComplianceNotice t={t} />

        {/* Filter bar */}
        <FilterBar
          t={t} pColor={pColor}
          draft={draft} setD={setD}
          subjectsForCurrentClass={subjectsForCurrentClass}
          onSearch={search} onReset={resetFilters}
        />

        {/* Result count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '14px 2px 12px',
          fontSize: 12, color: T.textMuted,
        }}>
          <span>
            {t('Đang hiển thị', 'Showing')}{' '}
            <strong style={{ color: T.textPrimary, fontWeight: 800 }}>{slice.length}</strong>
            {' / '}<strong style={{ color: T.textPrimary, fontWeight: 800 }}>{filtered.length}</strong>
            {' '}{t('nhật ký', 'log entries')}
            {filtered.length !== AL_SEED.length && (
              <> {t('(trong tổng', '(of')} {AL_SEED.length}{t(')', ')')}</>
            )}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11,
            color: T.textMuted,
          }}>
            <Icon name="clock" size={11} color={T.textMuted} strokeWidth={2} />
            {t('mới nhất ở trên', 'newest on top')}
          </span>
        </div>

        {/* Table or empty */}
        {filtered.length === 0
          ? <EmptyState t={t} />
          : <LogTable t={t} pColor={pColor} rows={slice} />
        }

        {/* Pagination */}
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button onClick={() => setVisible(v => v + 10)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 9,
                background: T.card, border: `1.5px solid ${T.border}`,
                color: T.textPrimary, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = pColor}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              <Icon name="arrowRight" size={13} color={pColor} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} />
              {t(`Xem thêm ${Math.min(10, filtered.length - visible)} nhật ký`,
                 `Load ${Math.min(10, filtered.length - visible)} more entries`)}
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

        {!hasMore && filtered.length > 0 && (
          <div style={{
            marginTop: 18, textAlign: 'center', fontSize: 12, color: T.textMuted,
            display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center',
          }}>
            <Icon name="check" size={12} color={T.success} strokeWidth={2.4} />
            {t('Đã hiển thị tất cả nhật ký phù hợp.', 'All matching entries shown.')}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Compliance notice ────────────────────────────────────────────────────────

const ComplianceNotice = ({ t }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', marginBottom: 18,
    background: T.bg, borderRadius: 10,
    border: `1px solid ${T.border}`,
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: T.error + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="lock" size={14} color={T.error} strokeWidth={2.2} />
    </div>
    <div style={{ flex: 1, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55 }}>
      <strong style={{ color: T.textPrimary, fontWeight: 800 }}>
        {t('Nhật ký này không thể chỉnh sửa hoặc xoá. ',
           'This log cannot be edited or deleted. ')}
      </strong>
      {t('Dữ liệu được lưu giữ theo ',
         'Records are retained per ')}
      <span style={{
        fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5,
        background: T.card, border: `1px solid ${T.border}`,
        padding: '1px 7px', borderRadius: 4, color: T.textPrimary, fontWeight: 700,
      }}>
        Nghị định 13/2023/NĐ-CP
      </span>
      {t(' — bảo vệ dữ liệu cá nhân.', ' — Personal Data Protection Decree.')}
    </div>
  </div>
);

// ── Filter bar ───────────────────────────────────────────────────────────────

const FilterBar = ({ t, pColor, draft, setD, subjectsForCurrentClass, onSearch, onReset }) => {
  const Field = ({ label, children, span = 1 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: `span ${span}` }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  );

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, background: T.card,
    fontSize: 13, fontWeight: 700, color: T.textPrimary,
    fontFamily: 'inherit', outline: 'none', width: '100%',
  };

  const selectStyle = {
    ...inputStyle,
    padding: '9px 32px 9px 12px',
    appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><polyline points='1,1 5,5 9,1' fill='none' stroke='%238898A9' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  };

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      padding: '16px 20px',
    }}>
      {/* Top row — date range + entity type */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr)',
        gap: 14, alignItems: 'end',
      }}>
        <Field label={t('Từ ngày', 'From')}>
          <input type="date" value={draft.dateFrom} onChange={(e) => setD('dateFrom', e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t('Đến ngày', 'To')}>
          <input type="date" value={draft.dateTo} onChange={(e) => setD('dateTo', e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t('Loại đối tượng', 'Entity type')}>
          <select value={draft.entityType} onChange={(e) => setD('entityType', e.target.value)} style={selectStyle}>
            <option value="all">{t('Tất cả', 'All')}</option>
            <option value="grade">{t('Điểm số', 'Grade')}</option>
            <option value="record">{t('Học bạ', 'Record')}</option>
            <option value="conduct">{t('Hạnh kiểm', 'Conduct')}</option>
          </select>
        </Field>
        <Field label={t('Người thực hiện', 'Actor')}>
          <div style={{ position: 'relative' }}>
            <input
              type="text" value={draft.actor}
              onChange={(e) => setD('actor', e.target.value)}
              placeholder={t('Tên hoặc mã tài khoản…', 'Name or user ID…')}
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
            <Icon name="search" size={13} color={T.textMuted}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </Field>
      </div>

      {/* Bottom row — class + subject + actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 2fr) auto auto',
        gap: 14, alignItems: 'end', marginTop: 14, paddingTop: 14,
        borderTop: `1px dashed ${T.border}`,
      }}>
        <Field label={t('Lớp', 'Class')}>
          <select value={draft.classFilter} onChange={(e) => setD('classFilter', e.target.value)} style={selectStyle}>
            <option value="all">{t('Tất cả lớp', 'All classes')}</option>
            {alUniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={t('Môn', 'Subject')}>
          <select value={draft.subjectFilter} onChange={(e) => setD('subjectFilter', e.target.value)} style={selectStyle}
            disabled={subjectsForCurrentClass.length === 0}>
            <option value="all">{t('Tất cả môn', 'All subjects')}</option>
            {subjectsForCurrentClass.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div />
        <button onClick={onReset}
          style={{
            padding: '9px 16px', borderRadius: 8,
            border: `1px dashed ${T.border}`, background: 'transparent',
            color: T.textMuted, fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {t('Xoá bộ lọc', 'Reset')}
        </button>
        <Button variant="primary" icon="search" onClick={onSearch}>
          {t('Tìm kiếm', 'Search')}
        </Button>
      </div>
    </div>
  );
};

// ── Log table ────────────────────────────────────────────────────────────────

const LogTable = ({ t, pColor, rows }) => {
  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {[
                t('Thời gian', 'Time'),
                t('Loại', 'Type'),
                t('Đối tượng', 'Target'),
                t('Học sinh', 'Student'),
                t('Người thực hiện', 'Actor'),
                t('Thay đổi (Trước → Sau)', 'Change (before → after)'),
                t('Lý do', 'Reason'),
              ].map((h, i) => (
                <th key={i} style={{
                  padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap',
                  fontSize: 10.5, fontWeight: 800, color: T.textMuted,
                  background: T.bg, borderBottom: `1px solid ${T.border}`,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <LogRow key={row.id} row={row} t={t} pColor={pColor} striped={ri % 2 === 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LogRow = ({ row, t, pColor, striped }) => {
  const em = AL_ENTITY_META[row.entityType] || AL_ENTITY_META.grade;
  const am = AL_ACTION_META[row.action] || AL_ACTION_META.UPDATE;
  const [hovered, setHovered] = React.useState(false);

  const isStateAction = row.action !== 'UPDATE';
  const isUnseal = row.action === 'UNSEAL';

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.bg : (striped ? '#FBFCFE' : T.card),
        transition: 'background 0.1s',
      }}>
      {/* Time */}
      <td style={alTdStyle}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: T.textPrimary,
          fontFamily: 'ui-monospace, Menlo, monospace',
          whiteSpace: 'nowrap', lineHeight: 1.3,
        }}>
          {row.ts.split(' ')[1]}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 }}>
          {row.ts.split(' ')[0]}
        </div>
      </td>

      {/* Type badge */}
      <td style={alTdStyle}>
        <Badge color={em.color}>
          <Icon name={em.icon} size={10} color={em.color} strokeWidth={2.4} />
          {t(em.vi, em.en)}
        </Badge>
      </td>

      {/* Target */}
      <td style={alTdStyle}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, lineHeight: 1.35 }}>
          {row.target}
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: T.textMuted,
          fontFamily: 'ui-monospace, Menlo, monospace',
          letterSpacing: '0.04em', marginTop: 3,
        }}>
          {row.targetId}
        </div>
      </td>

      {/* Student */}
      <td style={alTdStyle}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, lineHeight: 1.3 }}>
          {row.student}
        </div>
        {row.studentClass && (
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            {row.studentClass}
          </div>
        )}
      </td>

      {/* Actor */}
      <td style={alTdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Avatar
            initials={row.actor.name.split(' ').slice(-1)[0][0]}
            color={row.actor.role === 'ADMIN' ? T.error : pColor}
            size={26}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, lineHeight: 1.25 }}>
              {row.actor.name}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{
                fontSize: 9, fontWeight: 800,
                color: row.actor.role === 'ADMIN' ? T.error : pColor,
                background: (row.actor.role === 'ADMIN' ? T.error : pColor) + '14',
                padding: '1px 5px', borderRadius: 3, letterSpacing: '0.06em',
              }}>{row.actor.role}</span>
              <span style={{
                fontSize: 10, color: T.textMuted,
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}>{row.actor.id}</span>
            </div>
          </div>
        </div>
      </td>

      {/* Change column — old → new or state badge */}
      <td style={alTdStyle}>
        {isStateAction ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6,
              background: am.color + '18', color: am.color,
              border: `1px solid ${am.color}33`,
              fontSize: 11.5, fontWeight: 800, letterSpacing: '0.05em',
              alignSelf: 'flex-start',
            }}>
              <Icon name={am.icon} size={11} color={am.color} strokeWidth={2.4} />
              {row.action}
            </span>
            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700 }}>
              {t(am.vi, am.en)}
            </span>
            {isUnseal && row.selfApproved === true && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 8px', borderRadius: 5,
                background: T.warning + '22', color: '#9A6A0F',
                fontSize: 10, fontWeight: 800, letterSpacing: '0.04em',
                marginTop: 3, alignSelf: 'flex-start',
              }} title={t('Người yêu cầu tự phê duyệt yêu cầu của mình', 'Requester self-approved')}>
                <Icon name="alertTriangle" size={9} color="#9A6A0F" strokeWidth={2.4} />
                {t('Tự phê duyệt', 'Self-approved')}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 130 }}>
            <span style={{ fontSize: 11, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: T.textMuted, background: T.bg,
                padding: '1px 5px', borderRadius: 3, letterSpacing: '0.06em',
              }}>CŨ</span>
              <span style={{
                fontWeight: 700, color: T.textMuted, textDecoration: 'line-through',
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}>{row.oldValue}</span>
            </span>
            <span style={{ fontSize: 12.5, color: T.textPrimary, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                fontSize: 9, fontWeight: 800, color: pColor, background: pColor + '14',
                padding: '1px 5px', borderRadius: 3, letterSpacing: '0.06em',
              }}>MỚI</span>
              <span style={{
                fontWeight: 800, color: pColor,
                fontFamily: 'ui-monospace, Menlo, monospace',
              }}>{row.newValue}</span>
            </span>
          </div>
        )}
      </td>

      {/* Reason */}
      <td style={{ ...alTdStyle, maxWidth: 320 }}>
        <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.55 }}>
          {row.reasonVi}
        </div>
      </td>
    </tr>
  );
};

const alTdStyle = {
  padding: '14px 14px',
  borderBottom: `1px solid ${T.border}`,
  verticalAlign: 'top',
};

// ── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ t }) => (
  <div style={{
    background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
    padding: '46px 24px', textAlign: 'center', color: T.textMuted,
  }}>
    <Icon name="scrollText" size={36} color={T.border} strokeWidth={1.6} />
    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: T.textSecondary }}>
      {t('Không có nhật ký phù hợp với bộ lọc đã chọn.',
         'No log entries match the current filters.')}
    </div>
    <div style={{ marginTop: 4, fontSize: 12 }}>
      {t('Thử mở rộng khoảng ngày, đổi loại đối tượng hoặc xoá bộ lọc.',
         'Try widening the date range, changing the entity type, or clearing filters.')}
    </div>
  </div>
);

Object.assign(window, { AuditLogScreen });
