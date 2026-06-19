// ── Cụm D: Vi phạm + Hạnh kiểm + Nghỉ phép ──────────────────────────────────

// ── Mock Data ─────────────────────────────────────────────────────────────────

const VIOLATION_TYPES = [
  { id: 'late', vi: 'Đi học muộn', en: 'Late to school', severity: 'low', color: T.warning },
  { id: 'uniform', vi: 'Không đúng đồng phục', en: 'Incorrect uniform', severity: 'low', color: T.warning },
  { id: 'phone', vi: 'Sử dụng điện thoại', en: 'Phone use in class', severity: 'medium', color: T.error },
  { id: 'fight', vi: 'Gây gổ đánh nhau', en: 'Fighting', severity: 'high', color: T.error },
  { id: 'skip', vi: 'Trốn học', en: 'Skipping class', severity: 'high', color: T.error },
  { id: 'cheat', vi: 'Gian lận kiểm tra', en: 'Cheating in exam', severity: 'high', color: T.error },
  { id: 'disrespect', vi: 'Vô lễ với giáo viên', en: 'Disrespecting teacher', severity: 'medium', color: T.error },
  { id: 'noise', vi: 'Làm ồn trong lớp', en: 'Making noise in class', severity: 'low', color: T.warning },
  { id: 'other', vi: 'Khác', en: 'Other', severity: 'low', color: T.textMuted },
];

const SEVERITY_CONFIG = {
  low:    { vi: 'Nhẹ',    en: 'Minor',  color: T.warning, bg: T.warningLight, points: -1 },
  medium: { vi: 'Vừa',   en: 'Moderate', color: T.error,  bg: T.errorLight,   points: -3 },
  high:   { vi: 'Nặng',  en: 'Serious', color: '#B91C1C', bg: '#FEE2E2',      points: -5 },
};

const CONDUCT_GRADES = [
  { id: 'excellent', vi: 'Tốt',        en: 'Excellent', color: T.success, bg: T.successLight, min: 90 },
  { id: 'good',      vi: 'Khá',        en: 'Good',      color: T.primary, bg: T.primaryLight,  min: 70 },
  { id: 'average',   vi: 'Trung bình', en: 'Average',   color: T.warning, bg: T.warningLight,  min: 50 },
  { id: 'poor',      vi: 'Yếu',        en: 'Poor',      color: T.error,   bg: T.errorLight,    min: 0  },
];

const VIOLATIONS = [
  { id: 1, student: 'Trần Văn Bình', class: '11B2', avatar: 'TB', color: T.teal, type: 'late', date: '29/04/2026', period: 1, description: 'Vào lớp muộn 15 phút không có lý do chính đáng', severity: 'low', handledBy: 'Nguyễn Thị Hương', status: 'recorded' },
  { id: 2, student: 'Phạm Đức Dũng', class: '10A1', avatar: 'PD', color: T.error, type: 'phone', date: '28/04/2026', period: 3, description: 'Dùng điện thoại trong giờ học Toán', severity: 'medium', handledBy: 'Nguyễn Thị Hương', status: 'recorded' },
  { id: 3, student: 'Bùi Minh Tuấn', class: '10A1', avatar: 'BT', color: T.purple, type: 'uniform', date: '27/04/2026', period: 0, description: 'Không mặc áo đồng phục theo quy định', severity: 'low', handledBy: 'Nguyễn Thị Hương', status: 'notified' },
  { id: 4, student: 'Lê Thị Cẩm', class: '11B2', avatar: 'LC', color: T.success, type: 'noise', date: '26/04/2026', period: 4, description: 'Nói chuyện riêng trong giờ kiểm tra', severity: 'low', handledBy: 'Trần Văn Minh', status: 'notified' },
  { id: 5, student: 'Hoàng Văn Nam', class: '12C1', avatar: 'HN', color: T.warning, type: 'skip', date: '25/04/2026', period: 2, description: 'Vắng mặt không phép tiết Toán lần 2', severity: 'high', handledBy: 'Nguyễn Thị Hương', status: 'parent_notified' },
];

const CONDUCT_STUDENTS = [
  { name: 'Nguyễn Minh Anh', class: '11B2', avatar: 'NA', color: T.primary, violations: 0, absences: 1, conduct: 'excellent', points: 95, semester: 'HK1' },
  { name: 'Trần Văn Bình', class: '11B2', avatar: 'TB', color: T.teal, violations: 2, absences: 3, conduct: 'good', points: 78, semester: 'HK1' },
  { name: 'Lê Thị Cẩm', class: '11B2', avatar: 'LC', color: T.success, violations: 1, absences: 0, conduct: 'good', points: 82, semester: 'HK1' },
  { name: 'Phạm Đức Dũng', class: '10A1', avatar: 'PD', color: T.error, violations: 4, absences: 8, conduct: 'average', points: 55, semester: 'HK1' },
  { name: 'Hoàng Thị Linh', class: '11B2', avatar: 'HL', color: T.error, violations: 0, absences: 2, conduct: 'excellent', points: 92, semester: 'HK1' },
  { name: 'Vũ Quốc Bảo', class: '11B2', avatar: 'VB', color: T.purple, violations: 1, absences: 2, conduct: 'good', points: 75, semester: 'HK1' },
  { name: 'Bùi Minh Tuấn', class: '10A1', avatar: 'BT', color: T.warning, violations: 3, absences: 5, conduct: 'average', points: 58, semester: 'HK1' },
  { name: 'Hoàng Văn Nam', class: '12C1', avatar: 'HN', color: T.warning, violations: 5, absences: 7, conduct: 'poor', points: 42, semester: 'HK1' },
];

const LEAVE_REQUESTS = [
  { id: 1, student: 'Nguyễn Minh Khoa', class: '11A2', avatar: 'NK', color: T.primary, submittedBy: 'parent', submitterName: 'Nguyễn Văn Đức (Phụ huynh)', reason: 'Khám bệnh định kỳ tại bệnh viện', reasonEn: 'Scheduled medical checkup', startDate: '02/05/2026', endDate: '02/05/2026', days: 1, type: 'medical', status: 'pending', submittedAt: '29/04/2026 08:00' },
  { id: 2, student: 'Lê Thị Cẩm', class: '11B2', avatar: 'LC', color: T.success, submittedBy: 'student', submitterName: 'Lê Thị Cẩm (Học sinh)', reason: 'Tham dự đám cưới anh họ', reasonEn: 'Cousin\'s wedding', startDate: '30/04/2026', endDate: '01/05/2026', days: 2, type: 'personal', status: 'approved', approvedBy: 'Nguyễn Thị Hương', submittedAt: '28/04/2026 20:00' },
  { id: 3, student: 'Phạm Đức Dũng', class: '10A1', avatar: 'PD', color: T.error, submittedBy: 'parent', submitterName: 'Phạm Văn Long (Phụ huynh)', reason: 'Gia đình có việc đột xuất', reasonEn: 'Family emergency', startDate: '29/04/2026', endDate: '29/04/2026', days: 1, type: 'personal', status: 'rejected', rejectedBy: 'Nguyễn Thị Hương', rejectReason: 'Học sinh đã nghỉ quá 5 ngày trong tháng', submittedAt: '28/04/2026 18:00' },
  { id: 4, student: 'Vũ Quốc Bảo', class: '11B2', avatar: 'VB', color: T.purple, submittedBy: 'parent', submitterName: 'Vũ Minh Châu (Phụ huynh)', reason: 'Sốt cao, đang điều trị tại nhà', reasonEn: 'High fever, home treatment', startDate: '29/04/2026', endDate: '30/04/2026', days: 2, type: 'medical', status: 'pending', submittedAt: '29/04/2026 07:30' },
];

const LEAVE_STATUS = {
  pending:  { vi: 'Chờ duyệt', en: 'Pending',  color: T.warning, bg: T.warningLight, icon: 'clock' },
  approved: { vi: 'Đã duyệt',  en: 'Approved', color: T.success, bg: T.successLight, icon: 'check' },
  rejected: { vi: 'Từ chối',   en: 'Rejected', color: T.error,   bg: T.errorLight,   icon: 'x'     },
};

const LEAVE_TYPES = [
  { id: 'medical', vi: 'Nghỉ bệnh / khám', en: 'Medical', icon: 'info', color: T.primary },
  { id: 'personal', vi: 'Việc cá nhân / gia đình', en: 'Personal / Family', icon: 'users', color: T.purple },
  { id: 'event', vi: 'Tham gia sự kiện', en: 'Event / Competition', icon: 'award', color: T.warning },
  { id: 'other', vi: 'Lý do khác', en: 'Other', icon: 'fileText', color: T.textMuted },
];

// ── Staff leave (E07 — staff track) ──────────────────────────────────────────
// Visible only to ADMIN / MANAGER (BGH). Mirrors the student leave board's
// approve/reject UX with staff-specific fields (department, employment role,
// staff leave types: annual / sick / personal).
const STAFF_LEAVE_REQUESTS = [
  { id: 's1', staff: 'Nguyễn Thị Hương', staffRoleVi: 'GVBM · Toán',     staffRoleEn: 'Math teacher',      dept: 'Tổ Toán',       avatar: 'NH', color: T.primary, reason: 'Khám sức khoẻ định kỳ tại BV Bạch Mai',                      reasonEn: 'Annual health check at Bach Mai Hospital',         startDate: '03/05/2026', endDate: '03/05/2026', days: 1, type: 'sick',     status: 'pending',   submittedAt: '29/04/2026 09:10' },
  { id: 's2', staff: 'Trần Văn Minh',    staffRoleVi: 'GVBM · Vật Lý',   staffRoleEn: 'Physics teacher',   dept: 'Tổ Lý-Hoá',     avatar: 'TM', color: T.purple,  reason: 'Tham dự hội thảo chuyên môn ngành Vật Lý tại TP.HCM',         reasonEn: 'Subject-specialist conference in HCMC',           startDate: '05/05/2026', endDate: '07/05/2026', days: 3, type: 'annual',   status: 'approved',  approvedByVi: 'BGH', approvedByEn: 'Admin', submittedAt: '20/04/2026 14:00' },
  { id: 's3', staff: 'Lê Thị Hoa',       staffRoleVi: 'GVBM · Hoá Học',  staffRoleEn: 'Chemistry teacher', dept: 'Tổ Lý-Hoá',     avatar: 'LH', color: T.success, reason: 'Việc gia đình đột xuất — đám tang người thân',                 reasonEn: 'Family bereavement',                              startDate: '30/04/2026', endDate: '01/05/2026', days: 2, type: 'personal', status: 'approved',  approvedByVi: 'BGH', approvedByEn: 'Admin', submittedAt: '29/04/2026 06:20' },
  { id: 's4', staff: 'Đỗ Thị Mai',       staffRoleVi: 'GVBM · Tiếng Anh', staffRoleEn: 'English teacher',  dept: 'Tổ Ngoại Ngữ',  avatar: 'DM', color: T.warning, reason: 'Bị cảm sốt, có giấy chứng nhận của bác sĩ',                    reasonEn: 'Fever — doctor’s note attached',                  startDate: '29/04/2026', endDate: '30/04/2026', days: 2, type: 'sick',     status: 'pending',   submittedAt: '29/04/2026 07:00' },
  { id: 's5', staff: 'Phạm Quốc Bảo',    staffRoleVi: 'GVBM · Ngữ Văn',  staffRoleEn: 'Literature teacher', dept: 'Tổ Văn-Sử',    avatar: 'PB', color: T.teal,    reason: 'Nghỉ phép năm theo lịch — đi du lịch cùng gia đình',          reasonEn: 'Annual leave — family trip',                      startDate: '02/05/2026', endDate: '04/05/2026', days: 3, type: 'annual',   status: 'rejected',  rejectedByVi: 'BGH', rejectedByEn: 'Admin', rejectReason: 'Trùng lịch hội nghị giáo viên — vui lòng dời sang tuần sau.', submittedAt: '26/04/2026 11:00' },
];

const STAFF_LEAVE_TYPES = [
  { id: 'annual',   vi: 'Nghỉ phép năm',         en: 'Annual leave', icon: 'calendar', color: T.primary },
  { id: 'sick',     vi: 'Nghỉ ốm',               en: 'Sick leave',   icon: 'info',     color: T.error },
  { id: 'personal', vi: 'Việc riêng / gia đình', en: 'Personal',     icon: 'user',     color: T.purple },
];

// ── Small reusable: conduct badge ─────────────────────────────────────────────
const ConductBadge = ({ grade, t }) => {
  const cfg = CONDUCT_GRADES.find(g => g.id === grade) || CONDUCT_GRADES[1];
  return <Badge color={cfg.color} bg={cfg.bg}>{t(cfg.vi, cfg.en)}</Badge>;
};

// ── TAB 1: Vi phạm ────────────────────────────────────────────────────────────
const ViolationsTab = ({ lang, t, pColor, role }) => {
  const [showForm, setShowForm] = React.useState(false);
  const [violations, setViolations] = React.useState(VIOLATIONS);
  const [filterSeverity, setFilterSeverity] = React.useState('all');
  const [filterClass, setFilterClass] = React.useState('all');
  const [saved, setSaved] = React.useState(false);

  // New violation form
  const [form, setForm] = React.useState({ student: '', class: '11B2', type: 'late', date: '2026-04-29', period: '', description: '', severity: 'low' });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = () => {
    if (!form.student || !form.description) return;
    setSubmitting(true);
    setTimeout(() => {
      const vType = VIOLATION_TYPES.find(v => v.id === form.type);
      setViolations(prev => [{
        id: prev.length + 1,
        student: form.student, class: form.class,
        avatar: form.student.split(' ').slice(-1)[0][0] + (form.student.split(' ')[1]?.[0] || ''),
        color: pColor, type: form.type,
        date: form.date.split('-').reverse().join('/'),
        period: Number(form.period) || 0,
        description: form.description, severity: form.severity,
        handledBy: 'Nguyễn Thị Hương', status: 'recorded',
      }, ...prev]);
      setSubmitting(false); setShowForm(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 700);
  };

  const CLASSES = ['all', '10A1', '10A2', '11B2', '12C1'];
  const filtered = violations.filter(v => {
    if (filterSeverity !== 'all' && v.severity !== filterSeverity) return false;
    if (filterClass !== 'all' && v.class !== filterClass) return false;
    return true;
  });

  const STATUS_LABELS = {
    recorded: { vi: 'Đã ghi nhận', en: 'Recorded', color: T.primary },
    notified: { vi: 'Đã thông báo PH', en: 'Parent Notified', color: T.success },
    parent_notified: { vi: 'PH đã xác nhận', en: 'Parent Confirmed', color: T.success },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard icon="x" iconColor={T.error} label={t('Vi phạm tuần này', 'This Week')} value={violations.filter(v => v.date.includes('04/2026')).length} lang={lang} />
        <StatCard icon="info" iconColor={T.warning} label={t('Mức nhẹ', 'Minor')} value={violations.filter(v => v.severity === 'low').length} lang={lang} />
        <StatCard icon="x" iconColor={T.error} label={t('Mức vừa/nặng', 'Moderate/Serious')} value={violations.filter(v => v.severity !== 'low').length} lang={lang} />
        <StatCard icon="bell" iconColor={T.purple} label={t('Chờ thông báo PH', 'Pending Notify')} value={violations.filter(v => v.status === 'recorded').length} lang={lang} />
      </div>

      {/* Toast */}
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, color: T.success, fontWeight: 600, fontSize: 13 }}>
          <Icon name="check" size={15} color={T.success} strokeWidth={2.5} />
          {t('Đã ghi nhận vi phạm thành công!', 'Violation recorded successfully!')}
        </div>
      )}

      {/* New violation form */}
      {showForm && (
        <div style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${pColor}30`, boxShadow: `0 4px 20px ${pColor}12`, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Nhập vi phạm mới', 'Record New Violation')}</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 20 }}>{t('Ghi nhận vi phạm của học sinh vào hệ thống', 'Log a student violation into the system')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Tên học sinh *', 'Student Name *')}</label>
              <input value={form.student} onChange={e => setF('student', e.target.value)}
                placeholder={t('Nguyễn Văn A...', 'Student name...')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Lớp', 'Class')}</label>
              <select value={form.class} onChange={e => setF('class', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                {['10A1','10A2','11B2','12C1'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Ngày', 'Date')}</label>
              <input type="date" value={form.date} onChange={e => setF('date', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Loại vi phạm *', 'Violation Type *')}</label>
              <select value={form.type} onChange={e => { const vt = VIOLATION_TYPES.find(v => v.id === e.target.value); setF('type', e.target.value); if (vt) setF('severity', vt.severity); }}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                {VIOLATION_TYPES.map(v => <option key={v.id} value={v.id}>{t(v.vi, v.en)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Mức độ', 'Severity')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(SEVERITY_CONFIG).map(([k, cfg]) => (
                  <button key={k} onClick={() => setF('severity', k)} style={{
                    flex: 1, padding: '8px 6px', border: `1.5px solid ${form.severity === k ? cfg.color : T.border}`,
                    borderRadius: 7, background: form.severity === k ? cfg.bg : 'transparent',
                    color: form.severity === k ? cfg.color : T.textMuted,
                    fontSize: 11.5, fontWeight: form.severity === k ? 700 : 500, cursor: 'pointer',
                  }}>{t(cfg.vi, cfg.en)}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Mô tả vi phạm *', 'Description *')}</label>
            <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2}
              placeholder={t('Mô tả chi tiết hành vi vi phạm...', 'Describe the violation in detail...')}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '9px 20px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Huỷ', 'Cancel')}</button>
            <button onClick={handleSubmit} disabled={submitting || !form.student || !form.description}
              style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 9, background: submitting || !form.student || !form.description ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
              {submitting ? t('Đang lưu...', 'Saving...') : t('Ghi nhận vi phạm', 'Record Violation')}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, flex: 1 }}>{t('Danh sách vi phạm', 'Violation Records')}</div>
          {/* Filters */}
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ padding: '5px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: T.bg, cursor: 'pointer' }}>
            {CLASSES.map(c => <option key={c} value={c}>{c === 'all' ? t('Tất cả lớp', 'All Classes') : `Lớp ${c}`}</option>)}
          </select>
          {[{ id: 'all', vi: 'Tất cả', en: 'All' }, { id: 'low', vi: 'Nhẹ', en: 'Minor' }, { id: 'medium', vi: 'Vừa', en: 'Moderate' }, { id: 'high', vi: 'Nặng', en: 'Serious' }].map(f => {
            const cfg = f.id !== 'all' ? SEVERITY_CONFIG[f.id] : null;
            return (
              <button key={f.id} onClick={() => setFilterSeverity(f.id)} style={{
                padding: '5px 12px', border: `1.5px solid ${filterSeverity === f.id ? (cfg?.color || pColor) : T.border}`,
                borderRadius: 7, background: filterSeverity === f.id ? (cfg?.color || pColor) + '12' : 'transparent',
                color: filterSeverity === f.id ? (cfg?.color || pColor) : T.textMuted, fontSize: 12, fontWeight: filterSeverity === f.id ? 700 : 500, cursor: 'pointer',
              }}>{t(f.vi, f.en)}</button>
            );
          })}
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: pColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon name="plus" size={13} color="#fff" strokeWidth={2.5} />
              {t('Nhập vi phạm', 'Add Violation')}
            </button>
          )}
        </div>

        {filtered.map((v, i) => {
          const vType = VIOLATION_TYPES.find(vt => vt.id === v.type);
          const sevCfg = SEVERITY_CONFIG[v.severity];
          const stCfg = STATUS_LABELS[v.status] || { vi: v.status, en: v.status, color: T.textMuted };
          return (
            <div key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {/* Severity bar */}
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: sevCfg.color, flexShrink: 0 }} />
              {/* Avatar */}
              <Avatar initials={v.avatar} color={v.color} size={36} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{v.student}</span>
                  <Badge color={pColor} style={{ fontSize: 10 }}>{v.class}</Badge>
                  <Badge color={sevCfg.color} bg={sevCfg.bg} style={{ fontSize: 10 }}>{t(sevCfg.vi, sevCfg.en)}</Badge>
                </div>
                <div style={{ fontSize: 13, color: T.textPrimary, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: vType?.color || T.textPrimary }}>{t(vType?.vi || v.type, vType?.en || v.type)}</span>
                  {' — '}{v.description}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{t(`${v.date}${v.period ? ` · Tiết ${v.period}` : ''} · Ghi bởi: ${v.handledBy}`, `${v.date}${v.period ? ` · Period ${v.period}` : ''} · Recorded by: ${v.handledBy}`)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                <Badge color={stCfg.color}>{t(stCfg.vi, stCfg.en)}</Badge>
                <button style={{ padding: '4px 10px', border: `1px solid ${T.border}`, borderRadius: 6, background: 'transparent', color: T.textMuted, fontSize: 11, cursor: 'pointer' }}>
                  {t('Thông báo PH', 'Notify Parent')}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
            <Icon name="check" size={36} color={T.success} strokeWidth={1.5} />
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: T.success }}>{t('Không có vi phạm nào!', 'No violations found!')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── TAB 2: Hạnh kiểm ─────────────────────────────────────────────────────────
const ConductTab = ({ lang, t, pColor }) => {
  const [selectedClass, setSelectedClass] = React.useState('all');
  const [editId, setEditId] = React.useState(null);
  const [conductData, setConductData] = React.useState(CONDUCT_STUDENTS);
  const [saved, setSaved] = React.useState(null);

  const filtered = selectedClass === 'all' ? conductData : conductData.filter(s => s.class === selectedClass);

  const updateConduct = (name, newGrade) => {
    setConductData(prev => prev.map(s => s.name === name ? { ...s, conduct: newGrade } : s));
    setSaved(name); setEditId(null);
    setTimeout(() => setSaved(null), 2000);
  };

  const summary = { excellent: conductData.filter(s => s.conduct === 'excellent').length, good: conductData.filter(s => s.conduct === 'good').length, average: conductData.filter(s => s.conduct === 'average').length, poor: conductData.filter(s => s.conduct === 'poor').length };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {CONDUCT_GRADES.map(g => (
          <div key={g.id} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: g.color }}>{summary[g.id]}</span>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: g.color, lineHeight: 1 }}>{summary[g.id]}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{t(g.vi, g.en)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, flex: 1 }}>{t('Bảng xếp loại hạnh kiểm — HK1 2025–2026', 'Conduct Grades — Semester 1 2025–2026')}</div>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: T.bg, cursor: 'pointer' }}>
            <option value="all">{t('Tất cả lớp', 'All Classes')}</option>
            {['10A1','11B2','12C1'].map(c => <option key={c} value={c}>{`Lớp ${c}`}</option>)}
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg, color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Icon name="download" size={13} color={T.textSecondary} /> {t('Xuất Excel', 'Export')}
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['#', t('Học sinh', 'Student'), t('Lớp', 'Class'), t('Vi phạm', 'Violations'), t('Nghỉ không phép', 'Unexcused Abs.'), t('Điểm HK', 'Points'), t('Hạnh kiểm', 'Conduct'), ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: T.textMuted, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 16px', fontSize: 12, color: T.textMuted }}>{i + 1}</td>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar initials={s.avatar} color={s.color} size={30} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{s.name}</div>
                      {saved === s.name && <div style={{ fontSize: 10, color: T.success, fontWeight: 600 }}>✓ {t('Đã lưu', 'Saved')}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 16px' }}><Badge color={pColor} style={{ fontSize: 10 }}>{s.class}</Badge></td>
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: s.violations > 0 ? T.error : T.textMuted }}>{s.violations}</td>
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 700, color: s.absences > 3 ? T.error : s.absences > 0 ? T.warning : T.textMuted }}>{s.absences}</td>
                <td style={{ padding: '11px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ProgressBar value={s.points} color={s.points >= 90 ? T.success : s.points >= 70 ? pColor : s.points >= 50 ? T.warning : T.error} height={5} style={{ width: 60 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, minWidth: 24 }}>{s.points}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 16px' }}>
                  {editId === s.name ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {CONDUCT_GRADES.map(g => (
                        <button key={g.id} onClick={() => updateConduct(s.name, g.id)} style={{ padding: '4px 8px', border: `1.5px solid ${g.color}`, borderRadius: 6, background: s.conduct === g.id ? g.bg : 'transparent', color: g.color, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {t(g.vi, g.en)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <ConductBadge grade={s.conduct} t={t} />
                  )}
                </td>
                <td style={{ padding: '11px 16px' }}>
                  <button onClick={() => setEditId(editId === s.name ? null : s.name)} style={{ padding: '4px 12px', border: `1px solid ${T.border}`, borderRadius: 6, background: 'transparent', color: T.textSecondary, fontSize: 11.5, cursor: 'pointer' }}>
                    {editId === s.name ? t('Huỷ', 'Cancel') : t('Sửa', 'Edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── TAB 3: Quản lý nghỉ phép ──────────────────────────────────────────────────
const LeaveManagementTab = ({ lang, t, pColor, role }) => {
  const [requests, setRequests] = React.useState(LEAVE_REQUESTS);
  const [filter, setFilter] = React.useState('all');
  const [rejectModal, setRejectModal] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const filtered = requests.filter(r => filter === 'all' || r.status === filter);

  const handleApprove = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', approvedBy: 'Nguyễn Thị Hương' } : r));
  };

  const handleReject = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectedBy: 'Nguyễn Thị Hương', rejectReason: rejectReason || t('Không đáp ứng điều kiện.', 'Does not meet criteria.') } : r));
    setRejectModal(null); setRejectReason('');
  };

  const LEAVE_TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map(l => [l.id, l]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {['pending','approved','rejected'].map(s => {
          const sc = LEAVE_STATUS[s];
          const count = requests.filter(r => r.status === s).length;
          return (
            <div key={s} style={{ background: T.card, borderRadius: 12, border: `1px solid ${s === 'pending' && count > 0 ? sc.color + '40' : T.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={sc.icon} size={18} color={sc.color} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: sc.color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{t(sc.vi, sc.en)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, flex: 1 }}>{t('Đơn xin nghỉ phép', 'Leave Requests')}</div>
          {['all','pending','approved','rejected'].map(f => {
            const sc = f !== 'all' ? LEAVE_STATUS[f] : null;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', border: `1.5px solid ${filter === f ? (sc?.color || pColor) : T.border}`,
                borderRadius: 7, background: filter === f ? (sc?.color || pColor) + '12' : 'transparent',
                color: filter === f ? (sc?.color || pColor) : T.textMuted, fontSize: 12, fontWeight: filter === f ? 700 : 500, cursor: 'pointer',
              }}>{f === 'all' ? t('Tất cả', 'All') : t(sc.vi, sc.en)}</button>
            );
          })}
        </div>

        {filtered.map((req, i) => {
          const sc = LEAVE_STATUS[req.status];
          const lt = LEAVE_TYPE_MAP[req.type] || LEAVE_TYPES[3];
          return (
            <div key={req.id} style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Status bar */}
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: sc.color, flexShrink: 0 }} />
              {/* Avatar */}
              <Avatar initials={req.avatar} color={req.color} size={38} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{req.student}</span>
                  <Badge color={pColor} style={{ fontSize: 10 }}>{req.class}</Badge>
                  <Badge color={lt.color} style={{ fontSize: 10 }}>{t(lt.vi, lt.en)}</Badge>
                </div>
                <div style={{ fontSize: 13, color: T.textPrimary, marginBottom: 6, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>{t('Lý do:', 'Reason:')}</span> {req.reason}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar" size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{req.startDate}{req.endDate !== req.startDate ? ` → ${req.endDate}` : ''} ({req.days} {t(req.days > 1 ? 'ngày' : 'ngày', req.days > 1 ? 'days' : 'day')})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="user" size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{req.submitterName}</span>
                  </div>
                </div>
                {req.status === 'rejected' && req.rejectReason && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: T.errorLight, borderRadius: 7, border: `1px solid ${T.error}20`, fontSize: 12, color: T.error }}>
                    <span style={{ fontWeight: 700 }}>{t('Lý do từ chối:', 'Rejection reason:')}</span> {req.rejectReason}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                <Badge color={sc.color} bg={sc.bg}>{t(sc.vi, sc.en)}</Badge>
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(req.id)} style={{ padding: '5px 12px', background: T.success, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={11} color="#fff" strokeWidth={2.5} /> {t('Duyệt', 'Approve')}
                    </button>
                    <button onClick={() => setRejectModal(req.id)} style={{ padding: '5px 12px', background: T.errorLight, color: T.error, border: `1px solid ${T.error}30`, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="x" size={11} color={T.error} strokeWidth={2.5} /> {t('Từ chối', 'Reject')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
            <Icon name="check" size={36} color={T.success} strokeWidth={1.5} />
            <div style={{ marginTop: 10, fontSize: 14, color: T.success, fontWeight: 600 }}>{t('Không có đơn nào!', 'No requests!')}</div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: T.card, borderRadius: 16, padding: 28, width: 400, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Từ chối đơn nghỉ phép', 'Reject Leave Request')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{t('Vui lòng nhập lý do từ chối để thông báo phụ huynh/học sinh.', 'Please provide a reason to notify parent/student.')}</div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder={t('Lý do từ chối...', 'Reason for rejection...')}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 16 }}
              onFocus={e => e.target.style.borderColor = T.error} onBlur={e => e.target.style.borderColor = T.border} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} style={{ flex: 1, padding: '9px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Huỷ', 'Cancel')}</button>
              <button onClick={() => handleReject(rejectModal)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 9, background: T.error, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Xác nhận từ chối', 'Confirm Reject')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── TAB 4: Nghỉ phép nhân sự (ADMIN / MANAGER only) ──────────────────────────
// E07 — staff track. Same approve/reject UX template as LeaveManagementTab,
// adapted for staff (department, employment role, annual/sick/personal types).
const StaffLeaveTab = ({ lang, t, pColor }) => {
  const [requests, setRequests] = React.useState(STAFF_LEAVE_REQUESTS);
  const [filter, setFilter] = React.useState('all');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [rejectModal, setRejectModal] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const filtered = requests.filter(r =>
    (filter === 'all' || r.status === filter) &&
    (typeFilter === 'all' || r.type === typeFilter)
  );

  const handleApprove = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', approvedByVi: 'BGH', approvedByEn: 'Admin' } : r));
  };
  const handleReject = (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', rejectedByVi: 'BGH', rejectedByEn: 'Admin', rejectReason: rejectReason || t('Không đáp ứng điều kiện.', 'Does not meet criteria.') } : r));
    setRejectModal(null); setRejectReason('');
  };

  const STAFF_TYPE_MAP = Object.fromEntries(STAFF_LEAVE_TYPES.map(l => [l.id, l]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stats — status counts mirror the student tab */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {['pending', 'approved', 'rejected'].map(s => {
          const sc = LEAVE_STATUS[s];
          const count = requests.filter(r => r.status === s).length;
          return (
            <div key={s} style={{ background: T.card, borderRadius: 12, border: `1px solid ${s === 'pending' && count > 0 ? sc.color + '40' : T.border}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={sc.icon} size={18} color={sc.color} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: sc.color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{t(sc.vi, sc.en)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, flex: 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {t('Đơn nghỉ phép nhân sự', 'Staff Leave Requests')}
            <span style={{
              fontSize: 9.5, fontWeight: 800, color: T.error, background: T.errorLight,
              padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em',
            }}>{t('BGH', 'ADMIN')}</span>
          </div>
          {/* Type filter */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '5px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12, fontFamily: 'inherit', outline: 'none', background: T.bg, cursor: 'pointer' }}>
            <option value="all">{t('Tất cả loại nghỉ', 'All types')}</option>
            {STAFF_LEAVE_TYPES.map(lt => <option key={lt.id} value={lt.id}>{t(lt.vi, lt.en)}</option>)}
          </select>
          {/* Status filter pills */}
          {['all', 'pending', 'approved', 'rejected'].map(f => {
            const sc = f !== 'all' ? LEAVE_STATUS[f] : null;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', border: `1.5px solid ${filter === f ? (sc?.color || pColor) : T.border}`,
                borderRadius: 7, background: filter === f ? (sc?.color || pColor) + '12' : 'transparent',
                color: filter === f ? (sc?.color || pColor) : T.textMuted,
                fontSize: 12, fontWeight: filter === f ? 700 : 500, cursor: 'pointer',
              }}>{f === 'all' ? t('Tất cả', 'All') : t(sc.vi, sc.en)}</button>
            );
          })}
        </div>

        {filtered.map((req, i) => {
          const sc = LEAVE_STATUS[req.status];
          const lt = STAFF_TYPE_MAP[req.type] || STAFF_LEAVE_TYPES[2];
          return (
            <div key={req.id} style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* Status accent bar */}
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: sc.color, flexShrink: 0 }} />
              {/* Avatar */}
              <Avatar initials={req.avatar} color={req.color} size={38} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{req.staff}</span>
                  <Badge color={T.textSecondary} bg={T.bg} style={{ fontSize: 10 }}>{t(req.staffRoleVi, req.staffRoleEn)}</Badge>
                  <Badge color={lt.color} style={{ fontSize: 10 }}>
                    <Icon name={lt.icon} size={10} color={lt.color} strokeWidth={2.4} />
                    {t(lt.vi, lt.en)}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, color: T.textPrimary, marginBottom: 6, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>{t('Lý do:', 'Reason:')}</span> {t(req.reason, req.reasonEn)}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar" size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>
                      {req.startDate}{req.endDate !== req.startDate ? ` → ${req.endDate}` : ''} ({req.days} {t('ngày', req.days > 1 ? 'days' : 'day')})
                    </span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="briefcase" size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{req.dept}</span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="clock" size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{t(`Nộp ${req.submittedAt}`, `Submitted ${req.submittedAt}`)}</span>
                  </div>
                </div>
                {req.status === 'rejected' && req.rejectReason && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: T.errorLight, borderRadius: 7, border: `1px solid ${T.error}20`, fontSize: 12, color: T.error }}>
                    <span style={{ fontWeight: 700 }}>{t('Lý do từ chối:', 'Rejection reason:')}</span> {req.rejectReason}
                  </div>
                )}
                {req.status === 'approved' && (req.approvedByVi || req.approvedByEn) && (
                  <div style={{ marginTop: 8, fontSize: 11.5, color: T.success, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="check" size={11} color={T.success} strokeWidth={2.4} />
                    {t(`Duyệt bởi ${req.approvedByVi}`, `Approved by ${req.approvedByEn}`)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                <Badge color={sc.color} bg={sc.bg}>{t(sc.vi, sc.en)}</Badge>
                {req.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleApprove(req.id)} style={{ padding: '5px 12px', background: T.success, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" size={11} color="#fff" strokeWidth={2.5} /> {t('Duyệt', 'Approve')}
                    </button>
                    <button onClick={() => setRejectModal(req.id)} style={{ padding: '5px 12px', background: T.errorLight, color: T.error, border: `1px solid ${T.error}30`, borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="x" size={11} color={T.error} strokeWidth={2.5} /> {t('Từ chối', 'Reject')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
            <Icon name="check" size={36} color={T.success} strokeWidth={1.5} />
            <div style={{ marginTop: 10, fontSize: 14, color: T.success, fontWeight: 600 }}>{t('Không có đơn nào!', 'No requests!')}</div>
          </div>
        )}
      </div>

      {/* Reject modal — same shell as student tab */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: T.card, borderRadius: 16, padding: 28, width: 420, margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Từ chối đơn nghỉ phép nhân sự', 'Reject Staff Leave Request')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{t('Vui lòng nhập lý do từ chối để thông báo nhân sự.', 'Please provide a reason to notify the staff member.')}</div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder={t('Lý do từ chối...', 'Reason for rejection...')}
              style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 16 }}
              onFocus={e => e.target.style.borderColor = T.error} onBlur={e => e.target.style.borderColor = T.border} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} style={{ flex: 1, padding: '9px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Huỷ', 'Cancel')}</button>
              <button onClick={() => handleReject(rejectModal)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 9, background: T.error, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Xác nhận từ chối', 'Confirm Reject')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── MAIN: Teacher/Principal Discipline Screen ─────────────────────────────────
const DisciplineScreen = ({ role, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [activeTab, setActiveTab] = React.useState('violations');

  // ADMIN / MANAGER (BGH) — only role that sees the staff track. In this app the
  // 'principal' role maps to ADMIN/MANAGER.
  const isAdmin = role === 'principal';

  const baseTabs = [
    { id: 'violations', vi: 'Vi phạm', en: 'Violations', icon: 'x', badge: VIOLATIONS.length },
    { id: 'conduct',    vi: 'Hạnh kiểm', en: 'Conduct Grades', icon: 'award' },
    { id: 'leave',      vi: 'Nghỉ phép', en: 'Leave (Students)', icon: 'calendar', badge: LEAVE_REQUESTS.filter(r => r.status === 'pending').length },
  ];
  const staffTab = { id: 'staff', vi: 'Nhân sự', en: 'Staff', icon: 'briefcase', badge: STAFF_LEAVE_REQUESTS.filter(r => r.status === 'pending').length, adminOnly: true };
  const tabs = isAdmin ? [...baseTabs, staffTab] : baseTabs;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Hành chính & Kỷ luật', 'Administration & Discipline')}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>
            {isAdmin
              ? t('Quản lý vi phạm, hạnh kiểm và nghỉ phép — học sinh & nhân sự (E07).',
                  'Manage violations, conduct and leave — students & staff (E07).')
              : t('Quản lý vi phạm, hạnh kiểm và nghỉ phép học sinh',
                  'Manage violations, conduct grades and leave requests')}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13.5, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? pColor : T.textMuted,
              borderBottom: `2px solid ${activeTab === tab.id ? pColor : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s',
            }}>
              <Icon name={tab.icon} size={14} color={activeTab === tab.id ? pColor : T.textMuted} />
              {t(tab.vi, tab.en)}
              {tab.badge > 0 && <span style={{ background: activeTab === tab.id ? pColor : T.error, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '1px 6px', marginLeft: 2 }}>{tab.badge}</span>}
            </button>
          ))}
        </div>

        {activeTab === 'violations' && <ViolationsTab lang={lang} t={t} pColor={pColor} role={role} />}
        {activeTab === 'conduct' && <ConductTab lang={lang} t={t} pColor={pColor} />}
        {activeTab === 'leave' && <LeaveManagementTab lang={lang} t={t} pColor={pColor} role={role} />}
        {activeTab === 'staff' && isAdmin && <StaffLeaveTab lang={lang} t={t} pColor={pColor} />}
      </div>
    </div>
  );
};

// ── Student view: own discipline record ───────────────────────────────────────
const StudentDisciplineScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const myViolations = VIOLATIONS.filter(v => v.student === 'Nguyễn Minh Khoa' || v.student.includes('Khoa'));
  const [showLeaveForm, setShowLeaveForm] = React.useState(false);
  const [leaveRequests, setLeaveRequests] = React.useState(LEAVE_REQUESTS.filter(r => r.student === 'Nguyễn Minh Khoa'));
  const [form, setForm] = React.useState({ startDate: '', endDate: '', type: 'medical', reason: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmitLeave = () => {
    if (!form.startDate || !form.reason) return;
    setSubmitting(true);
    setTimeout(() => {
      setLeaveRequests(prev => [{
        id: prev.length + 100, student: 'Nguyễn Minh Khoa', class: '11A2', avatar: 'NK', color: pColor,
        submittedBy: 'student', submitterName: 'Nguyễn Minh Khoa (Học sinh)',
        reason: form.reason, startDate: form.startDate.split('-').reverse().join('/'),
        endDate: (form.endDate || form.startDate).split('-').reverse().join('/'),
        days: 1, type: form.type, status: 'pending', submittedAt: new Date().toLocaleString('vi-VN'),
      }, ...prev]);
      setSubmitting(false); setSubmitted(true); setShowLeaveForm(false);
      setForm({ startDate: '', endDate: '', type: 'medical', reason: '' });
      setTimeout(() => setSubmitted(false), 3000);
    }, 800);
  };

  // My conduct
  const myConductData = CONDUCT_STUDENTS.find(s => s.name === 'Nguyễn Minh Anh') || { conduct: 'excellent', points: 95, violations: 0, absences: 1 };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Kỷ luật & Nghỉ phép', 'Discipline & Leave')}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Hồ sơ kỷ luật và đơn xin nghỉ phép của bạn', 'Your discipline record and leave requests')}</div>
        </div>

        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, color: T.success, fontWeight: 600, fontSize: 13, marginBottom: 20 }}>
            <Icon name="check" size={15} color={T.success} strokeWidth={2.5} />
            {t('Đơn xin nghỉ đã được gửi thành công!', 'Leave request submitted successfully!')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Hạnh kiểm card */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{t('Hạnh kiểm HK1', 'Conduct — Semester 1')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 70, height: 70, borderRadius: 16, background: T.success + '18', border: `2px solid ${T.success}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: T.success, lineHeight: 1 }}>{myConductData.points}</span>
                <span style={{ fontSize: 10, color: T.textMuted }}>/ 100</span>
              </div>
              <div>
                <ConductBadge grade={myConductData.conduct} t={t} />
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>{t(`${myConductData.violations} vi phạm · ${myConductData.absences} nghỉ KP`, `${myConductData.violations} violations · ${myConductData.absences} unexcused`)}</div>
              </div>
            </div>
            <ProgressBar value={myConductData.points} color={T.success} height={8} />
          </div>

          {/* Leave request CTA */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t('Xin nghỉ phép', 'Request Leave')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14, lineHeight: 1.6 }}>{t('Gửi đơn xin nghỉ học đến giáo viên chủ nhiệm. Đơn sẽ được duyệt trong vòng 24 giờ.', 'Submit a leave request to your homeroom teacher. Requests are reviewed within 24 hours.')}</div>
            <button onClick={() => setShowLeaveForm(s => !s)} style={{ padding: '10px', background: showLeaveForm ? T.bg : pColor, color: showLeaveForm ? T.textSecondary : '#fff', border: showLeaveForm ? `1px solid ${T.border}` : 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name={showLeaveForm ? 'x' : 'plus'} size={13} color={showLeaveForm ? T.textSecondary : '#fff'} strokeWidth={2.5} />
              {showLeaveForm ? t('Đóng form', 'Close form') : t('Tạo đơn xin nghỉ', 'Create Leave Request')}
            </button>
          </div>
        </div>

        {/* Leave form */}
        {showLeaveForm && (
          <div style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${pColor}30`, boxShadow: `0 4px 20px ${pColor}12`, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 18 }}>{t('Đơn xin nghỉ phép', 'Leave Request Form')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Từ ngày *', 'Start Date *')}</label>
                <input type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Đến ngày', 'End Date')}</label>
                <input type="date" value={form.endDate} onChange={e => setF('endDate', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Loại nghỉ', 'Leave Type')}</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                  {LEAVE_TYPES.map(l => <option key={l.id} value={l.id}>{t(l.vi, l.en)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Lý do nghỉ *', 'Reason *')}</label>
              <textarea value={form.reason} onChange={e => setF('reason', e.target.value)} rows={3}
                placeholder={t('Nêu rõ lý do xin nghỉ...', 'Please explain the reason...')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLeaveForm(false)} style={{ padding: '9px 20px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Huỷ', 'Cancel')}</button>
              <button onClick={handleSubmitLeave} disabled={submitting || !form.startDate || !form.reason}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 9, background: submitting || !form.startDate || !form.reason ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="arrowRight" size={13} color="#fff" />
                {submitting ? t('Đang gửi...', 'Sending...') : t('Gửi đơn xin nghỉ', 'Submit Leave Request')}
              </button>
            </div>
          </div>
        )}

        {/* My violations */}
        {myViolations.length > 0 && (
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Vi phạm của tôi', 'My Violations')}</div>
            </div>
            {myViolations.map((v, i) => {
              const vType = VIOLATION_TYPES.find(vt => vt.id === v.type);
              const sevCfg = SEVERITY_CONFIG[v.severity];
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < myViolations.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: sevCfg.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{t(vType?.vi || v.type, vType?.en || v.type)}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted }}>{v.date} · {v.description}</div>
                  </div>
                  <Badge color={sevCfg.color} bg={sevCfg.bg}>{t(sevCfg.vi, sevCfg.en)}</Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* My leave requests */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Đơn xin nghỉ của tôi', 'My Leave Requests')}</div>
          </div>
          {leaveRequests.length > 0 ? leaveRequests.map((r, i) => {
            const sc = LEAVE_STATUS[r.status];
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: i < leaveRequests.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: sc.color, flexShrink: 0 }} />
                <Icon name={sc.icon} size={18} color={sc.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{r.reason}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted }}>{r.startDate}{r.endDate !== r.startDate ? ` → ${r.endDate}` : ''} · {r.days} {t('ngày', 'day(s)')}</div>
                  {r.status === 'rejected' && r.rejectReason && <div style={{ fontSize: 11, color: T.error, marginTop: 2 }}>{t('Từ chối:', 'Rejected:')} {r.rejectReason}</div>}
                </div>
                <Badge color={sc.color} bg={sc.bg}>{t(sc.vi, sc.en)}</Badge>
              </div>
            );
          }) : (
            <div style={{ padding: 32, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
              {t('Chưa có đơn xin nghỉ nào.', 'No leave requests yet.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Parent view: child's conduct + violations + leave on child's behalf ───────
// Route: /parent/conduct (per selected child).
// Read-only on conduct + violation history. The parent CAN submit a leave
// request on the child's behalf; submissions are addressed to the child's GVCN.
const PARENT_CHILDREN_DISCIPLINE = [
  {
    name: 'Nguyễn Minh Khoa', className: '11A2', avatar: 'NK', color: T.primary,
    gvcnVi: 'Cô Nguyễn Thị Hương', gvcnEn: 'Ms. Nguyễn Thị Hương',
    conduct: { grade: 'good', points: 82, violationsCount: 2, absences: 1, semester: 'HK1 2025–2026' },
    violations: [
      { id: 'pc-k1', type: 'late',    date: '21/04/2026', period: 1, description: 'Muộn 10 phút tiết 1.',                severity: 'low',    handledBy: 'Cô Nguyễn Thị Hương' },
      { id: 'pc-k2', type: 'uniform', date: '15/04/2026', period: 0, description: 'Không đeo huy hiệu trường.',         severity: 'low',    handledBy: 'Thầy Phạm Quốc Bảo' },
    ],
    pastLeaves: [
      { id: 'pl-k1', startDate: '12/03/2026', endDate: '12/03/2026', days: 1, type: 'medical',
        reason: 'Khám bệnh định kỳ tại bệnh viện Nhi.',
        status: 'approved', approvedBy: 'Cô Nguyễn Thị Hương',
        submittedAt: '11/03/2026 21:00' },
    ],
  },
  {
    name: 'Nguyễn Thu Hà', className: '8B1', avatar: 'NH', color: T.success,
    gvcnVi: 'Cô Trần Bích Vân', gvcnEn: 'Ms. Trần Bích Vân',
    conduct: { grade: 'excellent', points: 94, violationsCount: 0, absences: 0, semester: 'HK1 2025–2026' },
    violations: [],
    pastLeaves: [
      { id: 'pl-h1', startDate: '05/02/2026', endDate: '06/02/2026', days: 2, type: 'personal',
        reason: 'Việc gia đình đột xuất — về quê.',
        status: 'approved', approvedBy: 'Cô Trần Bích Vân',
        submittedAt: '04/02/2026 19:30' },
    ],
  },
];

const ParentDisciplineScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [childIdx, setChildIdx] = React.useState(0);
  const child = PARENT_CHILDREN_DISCIPLINE[childIdx];

  // Per-child leave requests state — keyed by child index so switching the
  // pill doesn't drop in-flight requests for the other child.
  const [leavesByChild, setLeavesByChild] = React.useState(() =>
    Object.fromEntries(PARENT_CHILDREN_DISCIPLINE.map((c, i) => [i, c.pastLeaves]))
  );
  const leaveRequests = leavesByChild[childIdx] || [];

  const [showLeaveForm, setShowLeaveForm] = React.useState(false);
  const [form, setForm] = React.useState({ startDate: '', endDate: '', type: 'medical', reason: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Reset the form + close it when switching children, so a half-filled draft
  // for child A doesn't bleed into child B's screen.
  React.useEffect(() => {
    setShowLeaveForm(false);
    setForm({ startDate: '', endDate: '', type: 'medical', reason: '' });
  }, [childIdx]);

  const submitterName = `Nguyễn Văn Đức (${t('Phụ huynh', 'Parent')})`;

  const handleSubmitLeave = () => {
    if (!form.startDate || !form.reason) return;
    setSubmitting(true);
    setTimeout(() => {
      const start = form.startDate.split('-').reverse().join('/');
      const end   = (form.endDate || form.startDate).split('-').reverse().join('/');
      // crude inclusive day-count for the seed; good enough for prototype.
      const days = (() => {
        const a = new Date(form.startDate);
        const b = new Date(form.endDate || form.startDate);
        return Math.max(1, Math.round((b - a) / 86400000) + 1);
      })();
      setLeavesByChild(prev => ({
        ...prev,
        [childIdx]: [{
          id: `pl-${childIdx}-${Date.now()}`,
          startDate: start, endDate: end, days,
          type: form.type, reason: form.reason,
          status: 'pending',
          submitterName,
          submittedAt: new Date().toLocaleString('vi-VN'),
        }, ...(prev[childIdx] || [])],
      }));
      setSubmitting(false); setSubmitted(true); setShowLeaveForm(false);
      setForm({ startDate: '', endDate: '', type: 'medical', reason: '' });
      setTimeout(() => setSubmitted(false), 3000);
    }, 700);
  };

  const conductCfg = CONDUCT_GRADES.find(g => g.id === child.conduct.grade) || CONDUCT_GRADES[1];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: T.bg }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            E06 · {t('Hạnh kiểm & Nghỉ phép', 'Discipline & Leave')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
            {t('Hạnh kiểm của con', "Child's Conduct")}
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>
            {t('Theo dõi hạnh kiểm, vi phạm và gửi đơn xin nghỉ phép cho con.',
               "Track conduct, violations, and submit leave requests on your child's behalf.")}
          </div>
        </div>

        {/* Child selector (same pattern as ParentScreen) */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {PARENT_CHILDREN_DISCIPLINE.map((c, i) => {
            const active = i === childIdx;
            return (
              <button key={i} onClick={() => setChildIdx(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
                borderRadius: 10, border: `2px solid ${active ? c.color : T.border}`,
                background: active ? c.color + '10' : T.card, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
                <Avatar initials={c.avatar} color={c.color} size={34} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>
                    {t(`Lớp ${c.className} · GVCN ${c.gvcnVi}`, `Class ${c.className} · Homeroom ${c.gvcnEn}`)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {submitted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, color: T.success, fontWeight: 600, fontSize: 13, marginBottom: 20 }}>
            <Icon name="check" size={15} color={T.success} strokeWidth={2.5} />
            {t(`Đơn xin nghỉ cho ${child.name} đã gửi tới ${child.gvcnVi}.`,
               `Leave request for ${child.name} sent to ${child.gvcnEn}.`)}
          </div>
        )}

        {/* Top row — conduct summary + leave CTA */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Conduct card (read-only) */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t(`Hạnh kiểm · ${child.conduct.semester}`, `Conduct · ${child.conduct.semester}`)}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 8px', borderRadius: 99, background: T.bg, color: T.textMuted,
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <Icon name="lock" size={10} color={T.textMuted} strokeWidth={2} />
                {t('Chỉ xem', 'Read-only')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 70, height: 70, borderRadius: 16,
                background: conductCfg.color + '18', border: `2px solid ${conductCfg.color}30`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: conductCfg.color, lineHeight: 1 }}>{child.conduct.points}</span>
                <span style={{ fontSize: 10, color: T.textMuted }}>/ 100</span>
              </div>
              <div>
                <ConductBadge grade={child.conduct.grade} t={t} />
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>
                  {t(`${child.conduct.violationsCount} vi phạm · ${child.conduct.absences} nghỉ KP`,
                     `${child.conduct.violationsCount} violations · ${child.conduct.absences} unexcused`)}
                </div>
              </div>
            </div>
            <ProgressBar value={child.conduct.points} color={conductCfg.color} height={8} />
          </div>

          {/* Leave request CTA */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {t('Xin nghỉ phép cho con', 'Request Leave for Child')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              {t(`Gửi đơn xin nghỉ cho ${child.name} đến GVCN ${child.gvcnVi}. Đơn sẽ được duyệt trong 24 giờ.`,
                 `Send a leave request for ${child.name} to homeroom teacher ${child.gvcnEn}. Reviewed within 24 hours.`)}
            </div>
            <button onClick={() => setShowLeaveForm(s => !s)} style={{
              padding: '10px',
              background: showLeaveForm ? T.bg : pColor,
              color: showLeaveForm ? T.textSecondary : '#fff',
              border: showLeaveForm ? `1px solid ${T.border}` : 'none',
              borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Icon name={showLeaveForm ? 'x' : 'plus'} size={13} color={showLeaveForm ? T.textSecondary : '#fff'} strokeWidth={2.5} />
              {showLeaveForm
                ? t('Đóng form', 'Close form')
                : t('Tạo đơn xin nghỉ cho con', 'Create Leave Request for Child')}
            </button>
          </div>
        </div>

        {/* Leave form */}
        {showLeaveForm && (
          <div style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${pColor}30`, boxShadow: `0 4px 20px ${pColor}12`, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>
              {t('Xin nghỉ phép cho con', 'Leave Request for Child')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18 }}>
              {t(`Đơn gửi cho ${child.name} (${child.className}) — đồng bộ tới GVCN ${child.gvcnVi}.`,
                 `For ${child.name} (${child.className}) — addressed to homeroom teacher ${child.gvcnEn}.`)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Từ ngày *', 'Start Date *')}</label>
                <input type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Đến ngày', 'End Date')}</label>
                <input type="date" value={form.endDate} onChange={e => setF('endDate', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Loại nghỉ', 'Leave Type')}</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                  {LEAVE_TYPES.map(l => <option key={l.id} value={l.id}>{t(l.vi, l.en)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Lý do nghỉ *', 'Reason *')}</label>
              <textarea value={form.reason} onChange={e => setF('reason', e.target.value)} rows={3}
                placeholder={t('Nêu rõ lý do xin nghỉ cho con...', 'Please explain the reason...')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLeaveForm(false)} style={{ padding: '9px 20px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Huỷ', 'Cancel')}</button>
              <button onClick={handleSubmitLeave} disabled={submitting || !form.startDate || !form.reason}
                style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 9, background: submitting || !form.startDate || !form.reason ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="arrowRight" size={13} color="#fff" />
                {submitting ? t('Đang gửi...', 'Sending...') : t('Gửi đơn xin nghỉ', 'Submit Leave Request')}
              </button>
            </div>
          </div>
        )}

        {/* Violation history (read-only) */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
              {t(`Lịch sử vi phạm — ${child.name}`, `Violation History — ${child.name}`)}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 99, background: T.bg, color: T.textMuted,
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <Icon name="lock" size={10} color={T.textMuted} strokeWidth={2} />
              {t('Chỉ xem', 'Read-only')}
            </span>
          </div>
          {child.violations.length > 0 ? child.violations.map((v, i) => {
            const vType = VIOLATION_TYPES.find(vt => vt.id === v.type);
            const sevCfg = SEVERITY_CONFIG[v.severity];
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < child.violations.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: sevCfg.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{t(vType?.vi || v.type, vType?.en || v.type)}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted }}>
                    {v.date}{v.period ? t(` · Tiết ${v.period}`, ` · Period ${v.period}`) : ''} · {v.description}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                    {t(`Ghi bởi: ${v.handledBy}`, `Recorded by: ${v.handledBy}`)}
                  </div>
                </div>
                <Badge color={sevCfg.color} bg={sevCfg.bg}>{t(sevCfg.vi, sevCfg.en)}</Badge>
              </div>
            );
          }) : (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <Icon name="check" size={32} color={T.success} strokeWidth={1.6} />
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: T.success }}>
                {t('Không có vi phạm nào trong học kỳ này.', 'No violations this semester.')}
              </div>
            </div>
          )}
        </div>

        {/* Child's leave requests */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>
              {t(`Đơn xin nghỉ — ${child.name}`, `Leave Requests — ${child.name}`)}
            </div>
          </div>
          {leaveRequests.length > 0 ? leaveRequests.map((r, i) => {
            const sc = LEAVE_STATUS[r.status];
            const lt = LEAVE_TYPES.find(l => l.id === r.type) || LEAVE_TYPES[3];
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', borderBottom: i < leaveRequests.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div style={{ width: 4, height: 44, borderRadius: 2, background: sc.color, flexShrink: 0 }} />
                <Icon name={sc.icon} size={18} color={sc.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{r.reason}</span>
                    <Badge color={lt.color} style={{ fontSize: 10 }}>{t(lt.vi, lt.en)}</Badge>
                  </div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                    {r.startDate}{r.endDate !== r.startDate ? ` → ${r.endDate}` : ''} · {r.days} {t('ngày', 'day(s)')}
                    {r.submitterName ? ` · ${r.submitterName}` : ''}
                  </div>
                  {r.status === 'approved' && r.approvedBy && (
                    <div style={{ fontSize: 11, color: T.success, marginTop: 2 }}>
                      {t(`Duyệt bởi: ${r.approvedBy}`, `Approved by: ${r.approvedBy}`)}
                    </div>
                  )}
                  {r.status === 'rejected' && r.rejectReason && (
                    <div style={{ fontSize: 11, color: T.error, marginTop: 2 }}>
                      {t('Từ chối:', 'Rejected:')} {r.rejectReason}
                    </div>
                  )}
                </div>
                <Badge color={sc.color} bg={sc.bg}>{t(sc.vi, sc.en)}</Badge>
              </div>
            );
          }) : (
            <div style={{ padding: 32, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
              {t('Chưa có đơn xin nghỉ nào cho con.', 'No leave requests yet for this child.')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DisciplineScreen, StudentDisciplineScreen, ParentDisciplineScreen });
