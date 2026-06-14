// ── Staff Leave Management — /admin/staff-leave ─────────────────────────────
// Role:   ADMIN / MANAGER (BGH)
// Epic:   US-073 (E07 conduct — staff track leave)
// Notes:  Standalone screen, separate from the tabbed Discipline view (which
//         also has a Nhân sự tab as a convenience entry-point). Same API +
//         AuditWriter contract as the student-leave board — `entityType: staff`.
//         Visual pattern follows discipline.jsx's LeaveManagement cards;
//         rejection collects a reason inline within the card instead of a modal.

// ── Static lookups ──────────────────────────────────────────────────────────

const SL_STATUS_META = {
  pending:  { vi: 'Chờ duyệt', en: 'Pending',  color: T.warning, bg: T.warningLight, icon: 'clock', mono: 'PENDING' },
  approved: { vi: 'Đã duyệt',  en: 'Approved', color: T.success, bg: T.successLight, icon: 'check', mono: 'APPROVED' },
  rejected: { vi: 'Từ chối',   en: 'Rejected', color: T.error,   bg: T.errorLight,   icon: 'x',     mono: 'REJECTED' },
};

// Spec-mandated leave types: phép năm / ốm / cá nhân / việc riêng.
const SL_LEAVE_TYPES = {
  annual:   { vi: 'Nghỉ phép năm',  en: 'Annual leave',   color: T.primary,    icon: 'calendar' },
  sick:     { vi: 'Nghỉ ốm',        en: 'Sick leave',     color: T.warning,    icon: 'info' },
  personal: { vi: 'Nghỉ cá nhân',   en: 'Personal leave', color: T.textMuted,  icon: 'user' },
  family:   { vi: 'Nghỉ việc riêng', en: 'Family leave',  color: T.purple,     icon: 'users' },
};

// Staff actor role badge — Giáo viên (teaching) vs Nhân viên (non-teaching).
const SL_ACTOR_ROLES = {
  teacher: { vi: 'Giáo viên', en: 'Teacher', color: T.primary,    bg: T.primaryLight },
  staff:   { vi: 'Nhân viên', en: 'Staff',   color: T.textMuted,  bg: T.bg },
};

// ── Mock data ────────────────────────────────────────────────────────────────

const SL_SEED_REQUESTS = [
  {
    id: 'sl-001',
    staff: { name: 'Nguyễn Thị Hương', role: 'teacher', dept: 'Tổ Toán',          avatar: 'NH', color: T.primary },
    type: 'sick',     startDate: '03/05/2026', endDate: '03/05/2026', days: 1,
    reasonVi: 'Khám sức khoẻ định kỳ tại BV Bạch Mai theo lịch hẹn từ tuần trước. Có giấy hẹn đính kèm.',
    reasonEn: 'Annual health check at Bach Mai Hospital — appointment scheduled last week. Referral letter attached.',
    submittedAt: '29/04/2026 09:10', status: 'pending',
  },
  {
    id: 'sl-002',
    staff: { name: 'Đỗ Thị Mai',      role: 'teacher', dept: 'Tổ Ngoại Ngữ',     avatar: 'DM', color: T.warning },
    type: 'sick',     startDate: '29/04/2026', endDate: '30/04/2026', days: 2,
    reasonVi: 'Bị cảm sốt từ tối qua, có giấy chứng nhận của phòng khám tư. Sẽ gửi đề thi thay thế qua email.',
    reasonEn: "Fever from last night — doctor's note attached. Substitute test material sent via email.",
    submittedAt: '29/04/2026 07:00', status: 'pending',
  },
  {
    id: 'sl-003',
    staff: { name: 'Hoàng Văn Trí',   role: 'staff',   dept: 'Bộ phận Bảo vệ',   avatar: 'HT', color: T.teal },
    type: 'family',   startDate: '05/05/2026', endDate: '06/05/2026', days: 2,
    reasonVi: 'Đám cưới em ruột tại quê. Đã sắp xếp người trực thay ca bảo vệ.',
    reasonEn: "Younger sibling's wedding in hometown. Shift coverage arranged.",
    submittedAt: '24/04/2026 18:45', status: 'pending',
  },
  {
    id: 'sl-004',
    staff: { name: 'Trần Văn Minh',   role: 'teacher', dept: 'Tổ Lý-Hoá',        avatar: 'TM', color: T.purple },
    type: 'annual',   startDate: '12/05/2026', endDate: '14/05/2026', days: 3,
    reasonVi: 'Tham dự hội thảo chuyên môn Vật Lý cấp tỉnh tại TP.HCM — có giấy mời từ Sở GD.',
    reasonEn: 'Provincial Physics specialist conference (HCMC) — invitation from DOE.',
    submittedAt: '20/04/2026 14:00', status: 'approved',
    approver: { name: 'Trần Minh Quân', role: 'BGH' }, approvedAt: '21/04/2026 09:30',
  },
  {
    id: 'sl-005',
    staff: { name: 'Lê Thị Hoa',      role: 'teacher', dept: 'Tổ Lý-Hoá',        avatar: 'LH', color: T.success },
    type: 'family',   startDate: '30/04/2026', endDate: '01/05/2026', days: 2,
    reasonVi: 'Đám tang người thân — cần về quê gấp. Đã gửi giáo án và đề bài thay thế cho tổ trưởng.',
    reasonEn: 'Family bereavement — urgent travel to hometown. Lesson plan handed off to head of department.',
    submittedAt: '29/04/2026 06:20', status: 'approved',
    approver: { name: 'Trần Minh Quân', role: 'BGH' }, approvedAt: '29/04/2026 06:45',
  },
  {
    id: 'sl-006',
    staff: { name: 'Phạm Thị Nga',    role: 'staff',   dept: 'Phòng Văn thư',    avatar: 'PN', color: T.error },
    type: 'personal', startDate: '02/05/2026', endDate: '02/05/2026', days: 1,
    reasonVi: 'Xử lý thủ tục hành chính cá nhân tại UBND phường.',
    reasonEn: 'Personal administrative matter at ward office.',
    submittedAt: '27/04/2026 11:00', status: 'approved',
    approver: { name: 'Trần Minh Quân', role: 'BGH' }, approvedAt: '28/04/2026 08:15',
  },
  {
    id: 'sl-007',
    staff: { name: 'Phạm Quốc Bảo',   role: 'teacher', dept: 'Tổ Văn-Sử',        avatar: 'PB', color: T.teal },
    type: 'annual',   startDate: '02/05/2026', endDate: '04/05/2026', days: 3,
    reasonVi: 'Nghỉ phép năm theo lịch — đi du lịch cùng gia đình. Đã được tổ trưởng phê duyệt sơ bộ.',
    reasonEn: 'Annual leave — family vacation. Pre-approved by head of department.',
    submittedAt: '26/04/2026 11:00', status: 'rejected',
    rejecter: { name: 'Trần Minh Quân', role: 'BGH' }, rejectedAt: '27/04/2026 10:00',
    rejectReason: 'Trùng lịch hội nghị giáo viên toàn trường (03/05). Vui lòng dời sang tuần sau.',
  },
  {
    id: 'sl-008',
    staff: { name: 'Nguyễn Văn Lộc',  role: 'staff',   dept: 'Bộ phận Vệ sinh',  avatar: 'NL', color: T.warning },
    type: 'sick',     startDate: '28/04/2026', endDate: '28/04/2026', days: 1,
    reasonVi: 'Đau lưng cấp tính — đã đi khám và có đơn thuốc.',
    reasonEn: 'Acute back pain — saw doctor, prescription attached.',
    submittedAt: '28/04/2026 07:00', status: 'rejected',
    rejecter: { name: 'Trần Minh Quân', role: 'BGH' }, rejectedAt: '28/04/2026 07:30',
    rejectReason: 'Đơn nộp sau khi ca làm việc đã bắt đầu — cần nộp trước 06:00. Vui lòng tuân thủ quy trình.',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

// Treat anything in current Vietnamese month label as "this month" — a real
// implementation would compare Date objects, but seed timestamps are strings.
const slIsThisMonth = (date) => date.includes('04/2026') || date.includes('05/2026');

// ── Main screen ──────────────────────────────────────────────────────────────

const StaffLeaveScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const [requests, setRequests] = React.useState(SL_SEED_REQUESTS);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [toast, setToast] = React.useState(null);

  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2600);
  };

  // Stats — across the full dataset (not filtered).
  const stats = React.useMemo(() => {
    const pending     = requests.filter(r => r.status === 'pending').length;
    const approvedMo  = requests.filter(r => r.status === 'approved' && slIsThisMonth(r.startDate)).length;
    const totalDaysMo = requests
      .filter(r => r.status === 'approved' && slIsThisMonth(r.startDate))
      .reduce((s, r) => s + r.days, 0);
    return { pending, approvedMo, totalDaysMo };
  }, [requests]);

  // Date string DD/MM/YYYY → comparable (YYYYMMDD) integer-ish.
  const dateKey = (str) => {
    if (!str) return 0;
    const [d, m, y] = str.split('/');
    return parseInt(`${y}${m}${d}`, 10);
  };
  const isoToKey = (iso) => {
    if (!iso) return null;
    return parseInt(iso.split('-').join(''), 10);
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const fromKey = isoToKey(dateFrom);
    const toKey   = isoToKey(dateTo);
    if (fromKey && dateKey(r.startDate) < fromKey) return false;
    if (toKey   && dateKey(r.startDate) > toKey)   return false;
    return true;
  });

  // Mutations
  const handleApprove = (id) => {
    setRequests(rs => rs.map(r => r.id !== id ? r : {
      ...r, status: 'approved',
      approver: { name: 'Trần Minh Quân', role: 'BGH' },
      approvedAt: new Date().toLocaleString('vi-VN', { hour12: false }),
    }));
    setRejectingId(null);
    showToast(t('Đã phê duyệt đơn nghỉ phép.', 'Leave request approved.'));
  };
  const handleStartReject = (id) => {
    setRejectingId(id);
    setRejectReason('');
  };
  const handleConfirmReject = (id) => {
    const reason = rejectReason.trim();
    if (!reason) return;
    setRequests(rs => rs.map(r => r.id !== id ? r : {
      ...r, status: 'rejected',
      rejecter: { name: 'Trần Minh Quân', role: 'BGH' },
      rejectedAt: new Date().toLocaleString('vi-VN', { hour12: false }),
      rejectReason: reason,
    }));
    setRejectingId(null);
    setRejectReason('');
    showToast(t('Đã từ chối đơn nghỉ phép.', 'Leave request rejected.'));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

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
            {t('Nghỉ phép nhân viên', 'Staff Leave')}
          </span>
        </div>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="calendarX" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Quản lý nghỉ phép nhân viên', 'Staff Leave Management')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {t('Xem & xử lý đơn xin nghỉ của giáo viên và nhân viên. Mọi hành động đều ghi vào nhật ký kiểm toán.',
                 'Review and process leave requests from teachers and staff. All actions are logged to the audit trail.')}
            </div>
          </div>
          <Badge color={T.error}>
            <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
            ADMIN · BGH
          </Badge>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard
            icon="clock" iconColor={T.warning}
            label={t('Chờ duyệt', 'Pending review')}
            value={stats.pending}
            lang={lang}
          />
          <StatCard
            icon="check" iconColor={T.success}
            label={t('Đã duyệt tháng này', 'Approved this month')}
            value={stats.approvedMo}
            lang={lang}
          />
          <StatCard
            icon="calendar" iconColor={T.info}
            label={t('Tổng ngày nghỉ trong tháng', 'Total leave days · month')}
            value={stats.totalDaysMo}
            lang={lang}
          />
        </div>

        {/* Filter tabs + date range */}
        <div style={{
          background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          padding: '14px 18px', marginBottom: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => {
              const m = f === 'all' ? null : SL_STATUS_META[f];
              const labelVi = f === 'all' ? 'Tất cả' : m.vi;
              const labelEn = f === 'all' ? 'All'    : m.en;
              const count = f === 'all'
                ? requests.length
                : requests.filter(r => r.status === f).length;
              const active = statusFilter === f;
              const color = m ? m.color : pColor;
              return (
                <button key={f} onClick={() => setStatusFilter(f)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '6px 14px', borderRadius: 8,
                    border: `1.5px solid ${active ? color : T.border}`,
                    background: active ? color + '14' : 'transparent',
                    color: active ? color : T.textSecondary,
                    fontSize: 12.5, fontWeight: active ? 800 : 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {m && <Icon name={m.icon} size={11} color={active ? color : T.textMuted} strokeWidth={2.4} />}
                  {t(labelVi, labelEn)}
                  <span style={{
                    fontSize: 10.5, fontWeight: 800,
                    background: active ? color + '22' : T.bg,
                    color: active ? color : T.textMuted,
                    padding: '1px 7px', borderRadius: 99,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            paddingTop: 12, borderTop: `1px dashed ${T.border}`,
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Icon name="calendar" size={11} color={T.textMuted} strokeWidth={2.2} />
              {t('Khoảng ngày bắt đầu', 'Start-date range')}
            </div>
            <DateField label={t('Từ', 'From')} value={dateFrom} onChange={setDateFrom} />
            <span style={{ color: T.textMuted, fontSize: 13 }}>→</span>
            <DateField label={t('Đến', 'To')}  value={dateTo}   onChange={setDateTo} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{
                  padding: '6px 10px', borderRadius: 7,
                  border: `1px dashed ${T.border}`, background: 'transparent',
                  color: T.textMuted, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>
                {t('Xoá lọc', 'Clear')}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              {t('Hiển thị', 'Showing')}{' '}
              <strong style={{ color: T.textPrimary, fontWeight: 800 }}>{filtered.length}</strong>
              {' / '}{requests.length} {t('đơn', 'requests')}
            </span>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState t={t} status={statusFilter} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(req => (
              <RequestCard
                key={req.id} req={req} t={t} pColor={pColor}
                rejectingId={rejectingId}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                onApprove={() => handleApprove(req.id)}
                onStartReject={() => handleStartReject(req.id)}
                onConfirmReject={() => handleConfirmReject(req.id)}
                onCancelReject={() => { setRejectingId(null); setRejectReason(''); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff',
          padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000,
          animation: 'sl-toast-in 0.2s ease-out',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: T.success,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes sl-toast-in  { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes sl-reject-in { from { opacity: 0; max-height: 0; }                  to { opacity: 1; max-height: 200px; } }
      `}</style>
    </div>
  );
};

// ── DateField — small labelled date input ────────────────────────────────────

const DateField = ({ label, value, onChange }) => (
  <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 9.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {label}
    </span>
    <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '6px 10px', borderRadius: 7,
        border: `1.5px solid ${T.border}`, background: T.card,
        fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
        fontFamily: 'inherit', outline: 'none',
      }}
    />
  </label>
);

// ── RequestCard ──────────────────────────────────────────────────────────────

const RequestCard = ({
  req, t, pColor,
  rejectingId, rejectReason, setRejectReason,
  onApprove, onStartReject, onConfirmReject, onCancelReject,
}) => {
  const sm = SL_STATUS_META[req.status];
  const lt = SL_LEAVE_TYPES[req.type] || SL_LEAVE_TYPES.personal;
  const actorRole = SL_ACTOR_ROLES[req.staff.role] || SL_ACTOR_ROLES.staff;

  const [expanded, setExpanded] = React.useState(false);
  const reasonText = req.reasonVi;  // (en variant available; keeping vi visible for prototype)
  const isLong = reasonText.length > 130;
  const showText = expanded || !isLong ? reasonText : reasonText.slice(0, 130).trimEnd() + '…';

  const isRejecting = rejectingId === req.id;
  const rejectValid = rejectReason.trim().length >= 5;

  return (
    <div style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${req.status === 'pending' ? sm.color + '44' : T.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Status accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: sm.color,
      }} />

      <div style={{ padding: '18px 22px 18px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <Avatar initials={req.staff.avatar} color={req.staff.color} size={42} style={{ flexShrink: 0 }} />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{req.staff.name}</span>
              <Badge color={actorRole.color} bg={actorRole.bg}>
                <Icon name={req.staff.role === 'teacher' ? 'userCheck' : 'briefcase'} size={10} color={actorRole.color} strokeWidth={2.4} />
                {t(actorRole.vi, actorRole.en)}
              </Badge>
              <Badge color={lt.color}>
                <Icon name={lt.icon} size={10} color={lt.color} strokeWidth={2.4} />
                {t(lt.vi, lt.en)}
              </Badge>
              <span style={{ fontSize: 11.5, color: T.textMuted }}>· {req.staff.dept}</span>
            </div>

            {/* Date range + days */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 12.5, color: T.textSecondary, fontWeight: 700,
              padding: '4px 10px', borderRadius: 7,
              background: T.bg, border: `1px solid ${T.border}`,
              marginBottom: 10,
            }}>
              <Icon name="calendar" size={12} color={T.textSecondary} strokeWidth={2} />
              <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }}>
                {req.startDate}{req.endDate !== req.startDate ? ` — ${req.endDate}` : ''}
              </span>
              <span style={{ color: T.textMuted, fontWeight: 600 }}>·</span>
              <span style={{ fontWeight: 800, color: T.textPrimary }}>
                {req.days} {t(req.days > 1 ? 'ngày' : 'ngày', req.days > 1 ? 'days' : 'day')}
              </span>
            </div>

            {/* Reason — truncated with expand */}
            <div style={{
              fontSize: 13, color: T.textPrimary, lineHeight: 1.6,
              padding: '10px 12px', background: T.bg, borderRadius: 8,
              borderLeft: `3px solid ${sm.color}`,
            }}>
              <span style={{
                display: 'inline-block', marginRight: 8,
                fontSize: 9.5, fontWeight: 800, color: T.textMuted,
                letterSpacing: '0.08em', textTransform: 'uppercase', verticalAlign: 'middle',
              }}>
                {t('Lý do', 'Reason')}
              </span>
              {showText}
              {isLong && (
                <button onClick={() => setExpanded(e => !e)}
                  style={{
                    background: 'transparent', border: 'none', padding: 0,
                    marginLeft: 6, cursor: 'pointer', fontFamily: 'inherit',
                    color: pColor, fontSize: 12, fontWeight: 700,
                  }}>
                  {expanded ? t('Thu gọn', 'Show less') : t('Xem thêm', 'Show more')}
                </button>
              )}
            </div>

            {/* Status footnote */}
            {req.status === 'approved' && req.approver && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: T.success, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="check" size={11} color={T.success} strokeWidth={2.4} />
                {t('Phê duyệt bởi', 'Approved by')}{' '}
                <strong style={{ color: T.textPrimary, fontWeight: 800 }}>
                  {req.approver.name} ({req.approver.role})
                </strong>
                <span style={{ color: T.textMuted, marginLeft: 4, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                  · {req.approvedAt}
                </span>
              </div>
            )}
            {req.status === 'rejected' && req.rejecter && (
              <>
                <div style={{ marginTop: 10, fontSize: 11.5, color: T.error, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="x" size={11} color={T.error} strokeWidth={2.4} />
                  {t('Từ chối bởi', 'Rejected by')}{' '}
                  <strong style={{ color: T.textPrimary, fontWeight: 800 }}>
                    {req.rejecter.name} ({req.rejecter.role})
                  </strong>
                  <span style={{ color: T.textMuted, marginLeft: 4, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                    · {req.rejectedAt}
                  </span>
                </div>
                <div style={{
                  marginTop: 6, padding: '8px 12px',
                  background: T.errorLight, borderRadius: 7,
                  border: `1px solid ${T.error}22`,
                  fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
                }}>
                  <strong style={{ color: T.error, fontWeight: 800 }}>
                    {t('Lý do từ chối:', 'Rejection reason:')}
                  </strong>{' '}
                  {req.rejectReason}
                </div>
              </>
            )}

            {/* Inline rejection editor */}
            {isRejecting && (
              <div style={{
                marginTop: 12, padding: '12px 14px',
                background: T.errorLight, borderRadius: 8,
                border: `1px solid ${T.error}33`,
                animation: 'sl-reject-in 0.2s ease-out',
                overflow: 'hidden',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: T.error,
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
                }}>
                  {t('Lý do từ chối', 'Rejection reason')} <span style={{ color: T.error }}>*</span>
                </div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                  rows={3}
                  placeholder={t('Giải thích ngắn gọn lý do từ chối để gửi đến nhân sự…',
                                 'Briefly explain why this request is being rejected…')}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 7,
                    border: `1.5px solid ${rejectValid ? T.error + '88' : T.border}`,
                    background: T.card, fontSize: 13, fontFamily: 'inherit',
                    color: T.textPrimary, outline: 'none', resize: 'vertical',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{
                  marginTop: 8,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 11, color: rejectValid ? T.success : T.textMuted, flex: 1 }}>
                    {rejectValid
                      ? t('Có thể gửi.', 'Ready to send.')
                      : t('Tối thiểu 5 ký tự.', 'Minimum 5 characters.')}
                  </span>
                  <Button variant="ghost" onClick={onCancelReject}
                    style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}
                    size="sm">
                    {t('Huỷ', 'Cancel')}
                  </Button>
                  <Button variant="danger" icon="x" onClick={onConfirmReject}
                    disabled={!rejectValid}
                    size="sm">
                    {t('Xác nhận từ chối', 'Confirm reject')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — status + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 170 }}>
            <Badge color={sm.color} bg={sm.bg}>
              <Icon name={sm.icon} size={11} color={sm.color} strokeWidth={2.4} />
              {t(sm.vi, sm.en)}
            </Badge>
            <span style={{
              fontSize: 9, fontWeight: 800, color: T.textMuted,
              fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.06em',
            }}>{sm.mono}</span>
            <span style={{ fontSize: 11, color: T.textMuted, textAlign: 'right' }}>
              {t(`Nộp ${req.submittedAt}`, `Submitted ${req.submittedAt}`)}
            </span>

            {req.status === 'pending' && !isRejecting && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" icon="x" onClick={onStartReject}
                  size="sm"
                  style={{ border: `1.5px solid ${T.error}55`, color: T.error, background: T.errorLight, fontWeight: 700 }}>
                  {t('Từ chối', 'Reject')}
                </Button>
                <Button variant="primary" icon="check" onClick={onApprove}
                  size="sm"
                  style={{ background: T.success, borderColor: T.success }}>
                  {t('Phê duyệt', 'Approve')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Empty state per tab ──────────────────────────────────────────────────────

const EmptyState = ({ t, status }) => {
  const labelVi = ({
    all: 'nào', pending: 'chờ duyệt nào', approved: 'đã duyệt nào', rejected: 'từ chối nào',
  })[status];
  const labelEn = ({
    all: '', pending: 'pending ', approved: 'approved ', rejected: 'rejected ',
  })[status];

  return (
    <div style={{
      background: T.card, borderRadius: 12, border: `1px dashed ${T.border}`,
      padding: '46px 24px', textAlign: 'center', color: T.textMuted,
    }}>
      <Icon name="calendarX" size={36} color={T.border} strokeWidth={1.6} />
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: T.textSecondary }}>
        {t(`Không có đơn xin nghỉ ${labelVi}.`, `No ${labelEn}leave requests.`)}
      </div>
      <div style={{ marginTop: 4, fontSize: 12 }}>
        {t('Khi có đơn mới, hệ thống sẽ thông báo cho bạn.', "You'll be notified when a new request arrives.")}
      </div>
    </div>
  );
};

Object.assign(window, { StaffLeaveScreen });
