// ── Student Absences — /teacher/absences (+ /principal/absences, /admin/absences) ─
// Role:   TEACHER (GVCN/homeroom, own class — record + edit) and
//         PRINCIPAL/admin-tier (schoolwide, class-filtered — flag only).
//         Same one-file-multi-role pattern as staff-leave.jsx / discipline.jsx.
// Epic:   US-E18.14 (BE ground-truth) → DR-022 (design)
// Notes:  NOT an approval workflow — `absence_state.go` has its OWN 2-value
//         state (`RECORDED` | `FLAGGED_UNEXCUSED`) with a one-way `Flag()`,
//         no submit/approve/reject. Do NOT reuse the ApprovalTransition card
//         shape from discipline.jsx/staff-discipline.jsx here.
//         TWO INDEPENDENT signals per row (never conflate into one badge):
//           1. `excused` (bool) — set by GVCN at record/edit time.
//           2. `state` — whether ADMIN/MANAGER flagged it for follow-up.
//         Flag action mirrors lesson-plan.jsx's one-way publish confirm
//         dialog (irreversible, explicit confirm — no unflag affordance).
//
// Dev annotations (for /ba + /fe):
//   Components: StudentAbsencesScreen, SAAbsenceRow, SAExcusedBadge,
//     SAFlaggedIndicator, SARecordForm, SAFlagConfirmDialog.
//   States: loading (EduSkeleton rows), empty (EduEmpty), error (EduError +
//     retry), validation (duplicate-date on create, future-date on date
//     picker — client-side guard mirroring ABSENCE_INVALID_DATE).
//   Data shape (BE, camelCase — see DR-022): classId, studentMemberId,
//     date (bare YYYY-MM-DD string, NOT datetime), reason? (max 5000),
//     excused (bool), state (RECORDED|FLAGGED_UNEXCUSED), recordedByMemberId,
//     flaggedByMemberId?, createdAt, updatedAt. Natural key =
//     classId+studentMemberId+date (immutable once created — only
//     reason/excused are PATCH-able).
//   i18n: namespace `studentAbsences` (NEW, fully independent — zero shared
//     error codes with discipline/staffDiscipline, confirmed in DR-022).
//     Keys used below: studentAbsences.{excused,unexcused,flagged,flagAction},
//     .flagConfirm.{title,description,cancel,confirm},
//     .errors.{forbidden,not-found,duplicate-date,invalid-date-future,
//     invalid-state,invalid-id,invalid-input}.
//   Mock: studentName/className are mock-only display fields (roster-UUID
//     gap, ask #9/#22) — create form is a mock-roster-SELECT, not live search.

// ── Static lookups ───────────────────────────────────────────────────────────

// Mock roster (fixed list — NOT live search, see file header).
const SA_CLASSES = ['10A1', '10A2', '11B2', '12C1'];
const SA_STUDENT_ROSTER = [
  { studentMemberId: 'stu-1', name: 'Trần Văn Bình',  classId: '11B2', avatar: 'TB', color: T.teal },
  { studentMemberId: 'stu-2', name: 'Phạm Đức Dũng',  classId: '10A1', avatar: 'PD', color: T.error },
  { studentMemberId: 'stu-3', name: 'Bùi Minh Tuấn',  classId: '10A1', avatar: 'BT', color: T.purple },
  { studentMemberId: 'stu-4', name: 'Lê Thị Cẩm',     classId: '11B2', avatar: 'LC', color: T.success },
  { studentMemberId: 'stu-5', name: 'Hoàng Văn Nam',  classId: '12C1', avatar: 'HN', color: T.warning },
  { studentMemberId: 'stu-6', name: 'Nguyễn Minh Anh', classId: '11B2', avatar: 'NA', color: T.primary },
];
const saStudentOf = (id) => SA_STUDENT_ROSTER.find(s => s.studentMemberId === id) || SA_STUDENT_ROSTER[0];

// GVCN (homeroom teacher) actor — this teacher's own class, per the BE
// GVCN-scoped record/edit contract.
const SA_CURRENT_TEACHER = { id: 'teacher-1', name: 'Nguyễn Thị Hương', homeroomClassId: '11B2' };
const SA_CURRENT_ADMIN = { id: 'admin-1', name: 'Trần Minh Quân' };

// `excused`/`unexcused` — 2-value convention (success/warning-family), always
// icon + label (never color-only, WCAG 2.1 AA).
const SA_EXCUSED_META = {
  true:  { vi: 'Có phép',    en: 'Excused',   color: T.success, bg: T.successLight, icon: 'checkSquare' },
  false: { vi: 'Không phép', en: 'Unexcused', color: T.warning, bg: T.warningLight, icon: 'alertTriangle', fg: T.warningForeground },
};

// Today (fixed mock "now" so the future-date guard is deterministic to demo).
const SA_TODAY = '2026-05-06';

// ── Seed data ────────────────────────────────────────────────────────────────

const SA_SEED_ABSENCES = [
  { classId: '11B2', studentMemberId: 'stu-1', date: '2026-05-05', reason: 'Sốt cao, có giấy khám của trạm y tế phường.', excused: true,  state: 'RECORDED', recordedByMemberId: 'teacher-1', createdAt: '2026-05-05 07:40', updatedAt: '2026-05-05 07:40' },
  { classId: '11B2', studentMemberId: 'stu-4', date: '2026-05-05', reason: '', excused: false, state: 'RECORDED', recordedByMemberId: 'teacher-1', createdAt: '2026-05-05 07:45', updatedAt: '2026-05-05 07:45' },
  { classId: '11B2', studentMemberId: 'stu-6', date: '2026-05-04', reason: 'Không rõ lý do, gia đình không liên lạc được.', excused: false, state: 'FLAGGED_UNEXCUSED', recordedByMemberId: 'teacher-1', flaggedByMemberId: 'admin-1', createdAt: '2026-05-04 07:35', updatedAt: '2026-05-04 15:00' },
  { classId: '11B2', studentMemberId: 'stu-1', date: '2026-05-02', reason: 'Đi khám răng theo lịch hẹn — có giấy xác nhận phòng khám.', excused: true, state: 'RECORDED', recordedByMemberId: 'teacher-1', createdAt: '2026-05-02 07:30', updatedAt: '2026-05-02 07:30' },
  { classId: '10A1', studentMemberId: 'stu-2', date: '2026-05-04', reason: '', excused: false, state: 'FLAGGED_UNEXCUSED', recordedByMemberId: 'teacher-2', flaggedByMemberId: 'admin-1', createdAt: '2026-05-04 07:20', updatedAt: '2026-05-05 09:10' },
  { classId: '10A1', studentMemberId: 'stu-3', date: '2026-04-30', reason: 'Việc gia đình đột xuất, đã báo GVCN qua điện thoại.', excused: true, state: 'RECORDED', recordedByMemberId: 'teacher-2', createdAt: '2026-04-30 07:25', updatedAt: '2026-04-30 07:25' },
  { classId: '12C1', studentMemberId: 'stu-5', date: '2026-04-29', reason: '', excused: false, state: 'RECORDED', recordedByMemberId: 'teacher-3', createdAt: '2026-04-29 07:15', updatedAt: '2026-04-29 07:15' },
];

// ── Small shared badges — TWO INDEPENDENT signals, never merged ─────────────

const SAExcusedBadge = ({ excused, t }) => {
  const m = SA_EXCUSED_META[String(excused)];
  return (
    <Badge color={m.fg || m.color} bg={m.bg}>
      <Icon name={m.icon} size={10} color={m.fg || m.color} strokeWidth={2.4} />
      {t(m.vi, m.en)}
    </Badge>
  );
};

// Shown ONLY when state === FLAGGED_UNEXCUSED — independent of excused/unexcused.
const SAFlaggedIndicator = ({ t }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 800, color: T.error,
    padding: '3px 9px', borderRadius: 20, background: T.errorLight,
  }}>
    <Icon name="flag" size={10} color={T.error} strokeWidth={2.6} />
    {t('Đã gắn cờ', 'Flagged')}
  </span>
);

// ── One-way flag confirm dialog — mirrors lesson-plan.jsx LPConfirmDialog ──
const SAFlagConfirmDialog = ({ student, t, pColor, onCancel, onConfirm }) => (
  <React.Fragment>
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.55)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
    <div role="dialog" aria-modal="true" aria-labelledby="sa-flag-title" style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 440, maxWidth: 'calc(100vw - 32px)', background: T.card,
      borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.24)', zIndex: 1101,
      padding: 24, animation: 'sa-fadein 0.18s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.errorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="flag" size={20} color={T.error} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div id="sa-flag-title" style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
            {t('Gắn cờ buổi nghỉ không phép?', 'Flag this unexcused absence?')}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>
            {t(`${student.name} — buổi nghỉ sẽ chuyển sang trạng thái "Đã gắn cờ" để theo dõi. Hành động này KHÔNG THỂ hoàn tác (không có thao tác gỡ cờ).`,
               `${student.name} — this absence will move to "Flagged" for follow-up. This action CANNOT be undone (no unflag affordance).`)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>{t('Huỷ', 'Cancel')}</Button>
        <button onClick={onConfirm} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none', background: T.error, color: '#fff',
          fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="flag" size={12} color="#fff" strokeWidth={2.4} />
          {t('Gắn cờ', 'Flag')}
        </button>
      </div>
    </div>
  </React.Fragment>
);

// ── Main screen ──────────────────────────────────────────────────────────────

const StudentAbsencesScreen = ({ role, lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const pColor = primaryColor || T.primary;

  const isTeacher = role === 'teacher';   // record + edit, own homeroom class
  const isAdminTier = role === 'principal'; // ADMIN/MANAGER — flag-only, schoolwide

  const [absences, setAbsences] = React.useState(SA_SEED_ABSENCES);
  const [classFilter, setClassFilter] = React.useState(isTeacher ? SA_CURRENT_TEACHER.homeroomClassId : 'all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editKey, setEditKey] = React.useState(null); // `${classId}|${studentMemberId}|${date}`
  const [flagTarget, setFlagTarget] = React.useState(null); // absence row pending flag confirm
  const [dupError, setDupError] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast._tid);
    showToast._tid = window.setTimeout(() => setToast(null), 2600);
  };

  // Shared loading/error demo, same pattern as lesson-plan.jsx / staff-discipline.jsx.
  const [status, setStatus] = React.useState('loading');
  const failedOnce = React.useRef(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setStatus('ready'), 600);
    return () => window.clearTimeout(id);
  }, []);
  const refresh = () => {
    setStatus('loading');
    window.setTimeout(() => {
      if (!failedOnce.current) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 600);
  };

  const [form, setForm] = React.useState({
    studentMemberId: SA_STUDENT_ROSTER.find(s => s.classId === SA_CURRENT_TEACHER.homeroomClassId)?.studentMemberId || SA_STUDENT_ROSTER[0].studentMemberId,
    date: SA_TODAY, excused: true, reason: '',
  });
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const key = (classId, studentMemberId, date) => `${classId}|${studentMemberId}|${date}`;

  const scoped = isTeacher
    ? absences.filter(a => a.classId === SA_CURRENT_TEACHER.homeroomClassId)
    : absences.filter(a => classFilter === 'all' || a.classId === classFilter);

  const filtered = scoped.filter(a => {
    if (dateFrom && a.date < dateFrom) return false;
    if (dateTo && a.date > dateTo) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const stats = {
    total: scoped.length,
    unexcused: scoped.filter(a => !a.excused).length,
    flagged: scoped.filter(a => a.state === 'FLAGGED_UNEXCUSED').length,
  };

  // Future-date guard mirrors ABSENCE_INVALID_DATE — client-side, disable
  // future dates via `max` AND re-validate on submit.
  const isFutureDate = (d) => d > SA_TODAY;

  const handleCreate = () => {
    const classId = SA_CURRENT_TEACHER.homeroomClassId;
    if (isFutureDate(form.date)) return; // guarded by input max — defensive re-check
    const duplicate = absences.some(a => a.classId === classId && a.studentMemberId === form.studentMemberId && a.date === form.date);
    if (duplicate) { setDupError(true); return; }
    setDupError(false);
    setAbsences(as => [{
      classId, studentMemberId: form.studentMemberId, date: form.date,
      reason: form.reason.trim(), excused: form.excused, state: 'RECORDED',
      recordedByMemberId: SA_CURRENT_TEACHER.id,
      createdAt: `${form.date} —`, updatedAt: `${form.date} —`,
    }, ...as]);
    setShowForm(false);
    setForm(f => ({ ...f, reason: '' }));
    showToast(t('Đã ghi nhận buổi nghỉ.', 'Absence recorded.'));
  };

  const startEdit = (a) => {
    setEditKey(key(a.classId, a.studentMemberId, a.date));
    setForm(f => ({ ...f, excused: a.excused, reason: a.reason || '' }));
  };
  const saveEdit = (a) => {
    setAbsences(as => as.map(x => (x.classId === a.classId && x.studentMemberId === a.studentMemberId && x.date === a.date)
      ? { ...x, excused: form.excused, reason: form.reason.trim(), updatedAt: `${a.date} —` }
      : x));
    setEditKey(null);
    showToast(t('Đã cập nhật.', 'Updated.'));
  };

  const confirmFlag = () => {
    const a = flagTarget;
    setAbsences(as => as.map(x => (x.classId === a.classId && x.studentMemberId === a.studentMemberId && x.date === a.date)
      ? { ...x, state: 'FLAGGED_UNEXCUSED', flaggedByMemberId: SA_CURRENT_ADMIN.id }
      : x));
    setFlagTarget(null);
    showToast(t('Đã gắn cờ buổi nghỉ.', 'Absence flagged.'));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', position: 'relative' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.textMuted, marginBottom: 12 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('dashboard'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
            <Icon name="home" size={12} color="currentColor" />
            {t('Trang chủ', 'Home')}
          </a>
          <Icon name="chevronRight" size={11} color={T.textMuted} />
          <span style={{ color: T.textPrimary, fontWeight: 700 }}>{t('Nghỉ học học sinh', 'Student Absences')}</span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, flexWrap: 'wrap' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="calendarX" size={22} color={pColor} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>
              {t('Nghỉ học học sinh', 'Student Absences')}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>
              {isTeacher
                ? t(`Ghi nhận & chỉnh sửa buổi nghỉ của lớp chủ nhiệm ${SA_CURRENT_TEACHER.homeroomClassId}.`, `Record & edit absences for your homeroom class ${SA_CURRENT_TEACHER.homeroomClassId}.`)
                : t('Xem toàn trường và gắn cờ buổi nghỉ không phép cần theo dõi (một chiều, không thể gỡ cờ).', 'Schoolwide view — flag unexcused absences that need follow-up (one-way, no unflag).')}
            </div>
          </div>
          {isTeacher && (
            <Badge color={pColor}>
              <Icon name="userCheck" size={11} color={pColor} strokeWidth={2.4} />
              GVCN · {SA_CURRENT_TEACHER.homeroomClassId}
            </Badge>
          )}
          {isAdminTier && (
            <Badge color={T.error}>
              <Icon name="shield" size={11} color={T.error} strokeWidth={2.4} />
              ADMIN · BGH
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          <StatCard icon="calendar" iconColor={pColor} label={t('Tổng buổi nghỉ', 'Total absences')} value={stats.total} lang={lang} />
          <StatCard icon="alertTriangle" iconColor={T.warning} label={t('Không phép', 'Unexcused')} value={stats.unexcused} lang={lang} />
          <StatCard icon="flag" iconColor={T.error} label={t('Đã gắn cờ', 'Flagged')} value={stats.flagged} lang={lang} />
        </div>

        {/* Filter row */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdminTier && (
            <div>
              <label htmlFor="sa-class" style={{ fontSize: 9.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{t('Lớp', 'Class')}</label>
              <select id="sa-class" value={classFilter} onChange={e => setClassFilter(e.target.value)}
                style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', background: T.bg, cursor: 'pointer' }}>
                <option value="all">{t('Tất cả lớp', 'All classes')}</option>
                {SA_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <SADateField label={t('Từ ngày', 'From')} value={dateFrom} onChange={setDateFrom} max={SA_TODAY} />
          <span style={{ color: T.textMuted, fontSize: 13 }}>→</span>
          <SADateField label={t('Đến ngày', 'To')} value={dateTo} onChange={setDateTo} max={SA_TODAY} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '6px 10px', borderRadius: 7, border: `1px dashed ${T.border}`, background: 'transparent', color: T.textMuted, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('Xoá lọc', 'Clear')}
            </button>
          )}
          {isTeacher && !showForm && (
            <Button size="sm" icon="plus" onClick={() => setShowForm(true)} style={{ marginLeft: 'auto' }}>
              {t('Ghi nhận nghỉ học', 'Record absence')}
            </Button>
          )}
        </div>

        {/* Record form — GVCN only */}
        {isTeacher && showForm && (
          <div style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${pColor}30`, boxShadow: `0 4px 20px ${pColor}12`, padding: 22, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Ghi nhận buổi nghỉ mới', 'Record new absence')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>
              {t('Lớp và học sinh không thể thay đổi sau khi ghi nhận.', 'Class and student cannot be changed once recorded.')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label htmlFor="sa-student" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Học sinh *', 'Student *')}</label>
                <select id="sa-student" value={form.studentMemberId} onChange={e => { setF('studentMemberId', e.target.value); setDupError(false); }}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                  {SA_STUDENT_ROSTER.filter(s => s.classId === SA_CURRENT_TEACHER.homeroomClassId).map(s => <option key={s.studentMemberId} value={s.studentMemberId}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sa-date" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Ngày nghỉ *', 'Absence date *')}</label>
                <input id="sa-date" type="date" value={form.date} max={SA_TODAY}
                  aria-invalid={isFutureDate(form.date)}
                  aria-describedby={isFutureDate(form.date) ? 'sa-date-err' : undefined}
                  onChange={e => { setF('date', e.target.value); setDupError(false); }}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${isFutureDate(form.date) ? T.error : T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                {isFutureDate(form.date) && (
                  <div id="sa-date-err" style={{ fontSize: 11, color: T.error, marginTop: 4 }}>
                    {t('Ngày nghỉ không được ở tương lai.', 'Absence date cannot be in the future.')}
                  </div>
                )}
              </div>
            </div>
            {dupError && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: T.errorLight, border: `1px solid ${T.error}33`, borderRadius: 8, color: T.error, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
                <Icon name="alertTriangle" size={14} color={T.error} strokeWidth={2.4} />
                {t('Đã có bản ghi nghỉ học cho học sinh này vào ngày đã chọn.', 'An absence record already exists for this student on the selected date.')}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>{t('Loại', 'Type')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[true, false].map(v => {
                  const m = SA_EXCUSED_META[String(v)];
                  const active = form.excused === v;
                  return (
                    <button key={String(v)} type="button" onClick={() => setF('excused', v)} style={{
                      flex: 1, padding: '8px 6px', border: `1.5px solid ${active ? m.color : T.border}`,
                      borderRadius: 7, background: active ? m.bg : 'transparent',
                      color: active ? (m.fg || m.color) : T.textMuted,
                      fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
                    }}>{t(m.vi, m.en)}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="sa-reason" style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Lý do (không bắt buộc)', 'Reason (optional)')}</label>
              <textarea id="sa-reason" value={form.reason} onChange={e => setF('reason', e.target.value)} rows={2} maxLength={5000}
                placeholder={t('Ghi chú lý do nghỉ nếu có...', 'Note the reason if any...')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" onClick={() => { setShowForm(false); setDupError(false); }} style={{ border: `1px solid ${T.border}` }}>{t('Huỷ', 'Cancel')}</Button>
              <Button disabled={isFutureDate(form.date)} onClick={handleCreate} icon="check" style={{ flex: 1, justifyContent: 'center' }}>
                {t('Ghi nhận', 'Record')}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {status === 'loading' && <EduSkeleton variant="rows" count={4} lang={lang} />}
        {status === 'error' && (
          <EduError lang={lang} onRetry={refresh} title={t('Không tải được dữ liệu nghỉ học', 'Failed to load absence data')} />
        )}
        {status === 'ready' && (filtered.length === 0 ? (
          <EduEmpty lang={lang} icon="calendarX" color={pColor}
            title={t('Chưa ghi nhận nghỉ học kỳ này', 'No absences recorded this term')}
            desc={isTeacher ? t('Nhấn "Ghi nhận nghỉ học" để thêm bản ghi đầu tiên.', 'Click "Record absence" to add the first entry.') : undefined}
            action={isTeacher && !showForm ? { label: t('Ghi nhận nghỉ học', 'Record absence'), icon: 'plus', onClick: () => setShowForm(true) } : undefined}
          />
        ) : (
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {filtered.map((a, i) => {
              const student = saStudentOf(a.studentMemberId);
              const rowKey = key(a.classId, a.studentMemberId, a.date);
              const isEditing = editKey === rowKey;
              return (
                <div key={rowKey} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <Avatar initials={student.avatar} color={student.color} size={38} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{student.name}</span>
                      {!isTeacher && <Badge color={pColor} style={{ fontSize: 10 }}>{a.classId}</Badge>}
                      <span style={{ fontSize: 11.5, color: T.textMuted, fontFamily: 'ui-monospace, Menlo, monospace' }}>{a.date}</span>
                      {/* Two independent signals — never conflated */}
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[true, false].map(v => {
                            const m = SA_EXCUSED_META[String(v)];
                            const active = form.excused === v;
                            return (
                              <button key={String(v)} onClick={() => setF('excused', v)} style={{
                                padding: '3px 9px', borderRadius: 20, border: `1.5px solid ${active ? m.color : T.border}`,
                                background: active ? m.bg : 'transparent', color: active ? (m.fg || m.color) : T.textMuted,
                                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                              }}>{t(m.vi, m.en)}</button>
                            );
                          })}
                        </div>
                      ) : (
                        <SAExcusedBadge excused={a.excused} t={t} />
                      )}
                      {a.state === 'FLAGGED_UNEXCUSED' && <SAFlaggedIndicator t={t} />}
                    </div>
                    {isEditing ? (
                      <textarea value={form.reason} onChange={e => setF('reason', e.target.value)} rows={2} maxLength={5000}
                        aria-label={t('Lý do', 'Reason')}
                        style={{ width: '100%', padding: '7px 10px', border: `1.5px solid ${T.border}`, borderRadius: 7, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
                    ) : (
                      a.reason && <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>{a.reason}</div>
                    )}
                    <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4 }}>
                      {t(`Ghi nhận bởi ${SA_CURRENT_TEACHER.name}`, `Recorded by ${SA_CURRENT_TEACHER.name}`)}
                      {a.state === 'FLAGGED_UNEXCUSED' && ` · ${t('Gắn cờ bởi', 'Flagged by')} ${SA_CURRENT_ADMIN.name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                    {isTeacher && (isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="ghost" size="sm" onClick={() => setEditKey(null)} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>{t('Huỷ', 'Cancel')}</Button>
                        <Button size="sm" icon="check" onClick={() => saveEdit(a)}>{t('Lưu', 'Save')}</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" icon="edit" onClick={() => startEdit(a)} style={{ border: `1px solid ${T.border}`, color: T.textSecondary }}>
                        {t('Sửa', 'Edit')}
                      </Button>
                    ))}
                    {isAdminTier && a.state === 'RECORDED' && (
                      <Button size="sm" icon="flag" onClick={() => setFlagTarget(a)} style={{ background: T.error, borderColor: T.error }}>
                        {t('Gắn cờ', 'Flag')}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {flagTarget && (
        <SAFlagConfirmDialog student={saStudentOf(flagTarget.studentMemberId)} t={t} pColor={pColor}
          onCancel={() => setFlagTarget(null)} onConfirm={confirmFlag} />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: T.textPrimary, color: '#fff', padding: '11px 18px', borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          fontSize: 13, fontWeight: 600, zIndex: 9000, animation: 'sa-toast-in 0.2s ease-out',
        }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: T.success, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="check" size={12} color="#fff" strokeWidth={2.6} />
          </div>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes sa-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes sa-fadein   { from { opacity: 0; transform: translate(-50%, -46%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @media (max-width: 768px) {
          .sa-filter-row { flex-direction: column; align-items: stretch; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
};

const SADateField = ({ label, value, onChange, max }) => (
  <label style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 9.5, fontWeight: 800, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    <input type="date" value={value} max={max} onChange={(e) => onChange(e.target.value)}
      style={{ padding: '6px 10px', borderRadius: 7, border: `1.5px solid ${T.border}`, background: T.card, fontSize: 12.5, fontWeight: 700, color: T.textPrimary, fontFamily: 'inherit', outline: 'none' }} />
  </label>
);

Object.assign(window, { StudentAbsencesScreen });
