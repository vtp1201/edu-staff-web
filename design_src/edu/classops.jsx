// ── Cụm A: Điểm danh + Sổ đầu bài ──────────────────────────────────────────
// Next.js + shadcn/ui latest reference implementation

// ── Mock data ─────────────────────────────────────────────────────────────────

const ATTENDANCE_CLASSES = [
  { id: '10A1', name: '10A1', students: 36, homeroomTeacher: 'Nguyễn Thị Hương' },
  { id: '11B2', name: '11B2', students: 32, homeroomTeacher: 'Nguyễn Thị Hương' },
  { id: '12C1', name: '12C1', students: 34, homeroomTeacher: 'Nguyễn Thị Hương' },
  { id: '10A2', name: '10A2', students: 38, homeroomTeacher: 'Nguyễn Thị Hương' },
];

const makeStudents = (classId) => {
  const names = [
    'Nguyễn Minh Anh','Trần Văn Bình','Lê Thị Cẩm','Phạm Đức Dũng','Hoàng Thị Linh',
    'Vũ Quốc Bảo','Đỗ Thu Hằng','Bùi Minh Tuấn','Ngô Thị Lan','Đinh Văn Hùng',
    'Phan Thị Mai','Lý Minh Đức','Trịnh Thu Hà','Cao Văn Long','Dương Thị Ngọc',
    'Đặng Minh Phúc','Tạ Thị Quỳnh','Hồ Văn Sơn','Lưu Thị Tâm','Mai Văn Uy',
    'Trương Thị Vân','Hà Minh Xuân','Vương Thị Yến','Thái Văn Dũng','Nguyễn Thị Hoa',
    'Trần Minh Khánh','Lê Văn Lực','Phạm Thị Mỹ','Hoàng Văn Nam','Vũ Thị Oanh',
    'Đỗ Minh Phong','Bùi Thị Quế','Ngô Văn Rạng','Đinh Thị Sen','Phan Minh Tài','Lý Thị Uyên',
  ];
  return names.slice(0, ATTENDANCE_CLASSES.find(c => c.id === classId)?.students || 32).map((name, i) => ({
    id: `${classId}-${i+1}`,
    name,
    initials: name.split(' ').slice(-1)[0][0] + name.split(' ')[1][0],
    rollNo: i + 1,
    // default: random attendance for demo
    status: i === 3 || i === 11 ? 'absent' : i === 7 ? 'excused' : 'present',
  }));
};

const PERIODS = [
  { id: 1, label: 'Tiết 1', time: '07:00–07:45' },
  { id: 2, label: 'Tiết 2', time: '07:50–08:35' },
  { id: 3, label: 'Tiết 3', time: '08:45–09:30' },
  { id: 4, label: 'Tiết 4', time: '09:40–10:25' },
  { id: 5, label: 'Tiết 5', time: '10:35–11:20' },
  { id: 6, label: 'Tiết 6', time: '13:00–13:45' },
  { id: 7, label: 'Tiết 7', time: '13:50–14:35' },
  { id: 8, label: 'Tiết 8', time: '14:45–15:30' },
  { id: 9, label: 'Tiết 9', time: '15:35–16:20' },
  { id: 10, label: 'Tiết 10', time: '16:25–17:10' },
];

const ATTENDANCE_HISTORY = [
  { date: '28/04/2026', period: 2, subject: 'Toán học', class: '11B2', present: 30, excused: 1, absent: 1, status: 'saved' },
  { date: '28/04/2026', period: 4, subject: 'Toán học', class: '10A1', present: 34, excused: 1, absent: 1, status: 'saved' },
  { date: '27/04/2026', period: 1, subject: 'Toán học', class: '12C1', present: 33, excused: 0, absent: 1, status: 'saved' },
  { date: '26/04/2026', period: 3, subject: 'Toán học', class: '10A2', present: 37, excused: 1, absent: 0, status: 'saved' },
];

// Sổ đầu bài mock data
const CLASS_LOG_ENTRIES = [
  {
    id: 1, date: '29/04/2026', period: 2, class: '11B2', subject: 'Toán học', subjectEn: 'Mathematics',
    topic: 'Đạo hàm và ứng dụng — Bài 3: Cực trị hàm số',
    topicEn: 'Derivatives & Applications — Lesson 3: Function Extrema',
    presentCount: 30, totalCount: 32, absentNames: ['Trần Văn Bình', 'Hoàng Thị Linh'],
    behavior: 'good', homeworkAssigned: 'Bài tập SGK trang 87, bài 1–5',
    notes: 'Học sinh nắm bài tốt. Còn 3 em chưa làm bài tập tiết trước.',
    status: 'submitted', teacherSign: 'Nguyễn Thị Hương',
    bghNote: '', approvedBy: '',
  },
  {
    id: 2, date: '28/04/2026', period: 4, class: '10A1', subject: 'Toán học', subjectEn: 'Mathematics',
    topic: 'Hàm số lượng giác — Bài 2: Đồ thị hàm sin và cos',
    topicEn: 'Trigonometric Functions — Lesson 2: Graphs of sin and cos',
    presentCount: 34, totalCount: 36, absentNames: ['Phạm Đức Dũng', 'Vũ Quốc Bảo'],
    behavior: 'excellent', homeworkAssigned: 'Bài tập SBT trang 42, bài 1–3',
    notes: 'Lớp sôi nổi, tích cực phát biểu.',
    status: 'approved', teacherSign: 'Nguyễn Thị Hương',
    bghNote: 'Ghi chép đầy đủ, rõ ràng. Tốt.',
    approvedBy: 'Trần Minh Quân',
  },
  {
    id: 3, date: '27/04/2026', period: 1, class: '12C1', subject: 'Toán học', subjectEn: 'Mathematics',
    topic: 'Ôn tập giải tích — Tích phân bất định',
    topicEn: 'Calculus Review — Indefinite Integrals',
    presentCount: 33, totalCount: 34, absentNames: ['Nguyễn Minh Anh'],
    behavior: 'average', homeworkAssigned: 'Ôn lại công thức tích phân cơ bản',
    notes: 'Một số em còn nhầm lẫn công thức. Cần ôn thêm tiết sau.',
    status: 'draft', teacherSign: '', bghNote: '', approvedBy: '',
  },
];

const BEHAVIOR_OPTIONS = [
  { id: 'excellent', vi: 'Tốt', en: 'Excellent', color: T.success, icon: 'star' },
  { id: 'good', vi: 'Khá', en: 'Good', color: T.primary, icon: 'check' },
  { id: 'average', vi: 'Trung bình', en: 'Average', color: T.warning, icon: 'clock' },
  { id: 'poor', vi: 'Yếu', en: 'Poor', color: T.error, icon: 'x' },
];

// ── SCREEN 1: Điểm danh ───────────────────────────────────────────────────────

const AttendanceScreen = ({ lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const [activeTab, setActiveTab] = React.useState('take'); // 'take' | 'history'
  const [selectedClass, setSelectedClass] = React.useState('11B2');
  const [selectedPeriod, setSelectedPeriod] = React.useState(2);
  const [selectedDate, setSelectedDate] = React.useState('2026-04-29');
  const [students, setStudents] = React.useState(() => makeStudents('11B2'));
  const [notes, setNotes] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [search, setSearch] = React.useState('');

  // When class changes, reload students
  const handleClassChange = (cls) => {
    setSelectedClass(cls);
    setStudents(makeStudents(cls));
    setSaved(false);
  };

  const setStatus = (studentId, status) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
    setSaved(false);
  };

  const markAll = (status) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
    setSaved(false);
  };

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    excused: students.filter(s => s.status === 'excused').length,
    absent:  students.filter(s => s.status === 'absent').length,
  };

  const filteredStudents = students.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); }, 800);
  };

  const STATUS_CONFIG = {
    present: { vi: 'Có mặt', en: 'Present', color: T.success, bg: T.successLight, short: 'P' },
    excused: { vi: 'Vắng phép', en: 'Excused', color: T.warning, bg: T.warningLight, short: 'E' },
    absent:  { vi: 'Vắng KP', en: 'Absent',  color: T.error,  bg: T.errorLight,   short: 'A' },
  };

  const periodInfo = PERIODS.find(p => p.id === selectedPeriod);

  const tabs = [
    { id: 'take', vi: 'Điểm danh', en: 'Take Attendance' },
    { id: 'history', vi: 'Lịch sử', en: 'History' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Điểm danh', 'Attendance')}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Ghi nhận chuyên cần học sinh theo từng tiết học', 'Record student attendance per class period')}</div>
          </div>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: T.success }}>
              <Icon name="check" size={15} color={T.success} strokeWidth={2.5} />
              {t('Đã lưu điểm danh!', 'Attendance saved!')}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13.5, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? pColor : T.textMuted,
              borderBottom: `2px solid ${activeTab === tab.id ? pColor : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s',
            }}>{t(tab.vi, tab.en)}</button>
          ))}
        </div>

        {activeTab === 'take' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Controls row */}
            <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr', gap: 16, alignItems: 'end' }}>
                {/* Class selector */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    {t('Lớp học', 'Class')}
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ATTENDANCE_CLASSES.map(cls => (
                      <button key={cls.id} onClick={() => handleClassChange(cls.id)}
                        style={{
                          padding: '8px 16px', border: `1.5px solid ${selectedClass === cls.id ? pColor : T.border}`,
                          borderRadius: 8, background: selectedClass === cls.id ? pColor : T.card,
                          color: selectedClass === cls.id ? '#fff' : T.textSecondary,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {cls.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    {t('Ngày', 'Date')}
                  </label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    style={{ padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.textPrimary, outline: 'none', background: T.card }}
                    onFocus={e => e.target.style.borderColor = pColor}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>

                {/* Period selector */}
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    {t('Tiết', 'Period')}
                  </label>
                  <select value={selectedPeriod} onChange={e => setSelectedPeriod(Number(e.target.value))}
                    style={{ padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.textPrimary, outline: 'none', background: T.card, cursor: 'pointer' }}>
                    {PERIODS.map(p => (
                      <option key={p.id} value={p.id}>{p.label} ({p.time})</option>
                    ))}
                  </select>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => markAll('present')}
                    style={{ padding: '8px 14px', border: `1px solid ${T.success}40`, borderRadius: 8, background: T.successLight, color: T.success, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="check" size={12} color={T.success} strokeWidth={2.5} />
                    {t('Tất cả có mặt', 'All Present')}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '8px 18px', border: 'none', borderRadius: 8, background: saving ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {saving
                      ? <><Icon name="clock" size={13} color="#fff" />{t('Đang lưu...', 'Saving...')}</>
                      : <><Icon name="check" size={13} color="#fff" strokeWidth={2.5} />{t('Lưu điểm danh', 'Save Attendance')}</>
                    }
                  </button>
                </div>
              </div>
            </div>

            {/* Stats + list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

              {/* Student list */}
              <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {/* List header */}
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
                    <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <Icon name="search" size={13} color={T.textMuted} />
                    </div>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder={t('Tìm học sinh...', 'Search students...')}
                      style={{ width: '100%', padding: '7px 12px 7px 30px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: T.bg, color: T.textPrimary }}
                      onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[{ id: 'all', vi: 'Tất cả', en: 'All' }, { id: 'present', vi: 'Có mặt', en: 'Present' }, { id: 'absent', vi: 'Vắng', en: 'Absent' }, { id: 'excused', vi: 'Có phép', en: 'Excused' }].map(f => (
                      <button key={f.id} onClick={() => setFilter(f.id)}
                        style={{ padding: '5px 12px', border: `1px solid ${filter === f.id ? pColor : T.border}`, borderRadius: 6, background: filter === f.id ? pColor + '12' : 'transparent', color: filter === f.id ? pColor : T.textMuted, fontSize: 11.5, fontWeight: filter === f.id ? 700 : 500, cursor: 'pointer' }}>
                        {t(f.vi, f.en)}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap' }}>{filteredStudents.length} {t('học sinh', 'students')}</span>
                </div>

                {/* Students */}
                <div>
                  {filteredStudents.map((student, i) => {
                    const sc = STATUS_CONFIG[student.status];
                    return (
                      <div key={student.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: i < filteredStudents.length - 1 ? `1px solid ${T.border}` : 'none', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.bg}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ width: 28, fontSize: 12, color: T.textMuted, fontWeight: 600, textAlign: 'center', flexShrink: 0 }}>{student.rollNo}</span>
                        <Avatar initials={student.initials} color={pColor} size={32} />
                        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{student.name}</span>

                        {/* Status toggle buttons */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <button key={key} onClick={() => setStatus(student.id, key)}
                              title={t(cfg.vi, cfg.en)}
                              style={{
                                width: 72, padding: '5px 0', border: `1.5px solid ${student.status === key ? cfg.color : T.border}`,
                                borderRadius: 7, background: student.status === key ? cfg.bg : 'transparent',
                                color: student.status === key ? cfg.color : T.textMuted,
                                fontSize: 11.5, fontWeight: student.status === key ? 700 : 500,
                                cursor: 'pointer', transition: 'all 0.12s', textAlign: 'center',
                              }}>
                              {t(cfg.vi, cfg.en)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: stats + notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Summary */}
                <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 14 }}>{t('Tổng kết buổi học', 'Session Summary')}</div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: T.textMuted }}>{t('Tỉ lệ chuyên cần', 'Attendance Rate')}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: stats.present / students.length >= 0.9 ? T.success : T.warning }}>
                        {Math.round(stats.present / students.length * 100)}%
                      </span>
                    </div>
                    <ProgressBar value={stats.present / students.length * 100} color={stats.present / students.length >= 0.9 ? T.success : T.warning} height={8} />
                  </div>

                  {[
                    { label: t('Có mặt', 'Present'), count: stats.present, total: students.length, color: T.success, icon: 'check' },
                    { label: t('Vắng có phép', 'Excused'), count: stats.excused, total: students.length, color: T.warning, icon: 'fileText' },
                    { label: t('Vắng không phép', 'Absent'), count: stats.absent, total: students.length, color: T.error, icon: 'x' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i === 0 ? `1px solid ${T.border}` : 'none', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={s.icon} size={14} color={s.color} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: T.textMuted }}>{s.label}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</span>
                        <span style={{ fontSize: 11, color: T.textMuted }}>/ {s.total}</span>
                      </div>
                    </div>
                  ))}

                  {stats.absent > 0 && (
                    <div style={{ marginTop: 14, padding: '10px 12px', background: T.errorLight, borderRadius: 8, border: `1px solid ${T.error}20` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.error, marginBottom: 4 }}>{t('Học sinh vắng không phép:', 'Absent without excuse:')}</div>
                      {students.filter(s => s.status === 'absent').map(s => (
                        <div key={s.id} style={{ fontSize: 12, color: T.error, marginTop: 2 }}>• {s.name}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, display: 'block', marginBottom: 8 }}>{t('Ghi chú buổi học', 'Session Notes')}</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                    placeholder={t('Nhận xét, ghi chú về buổi học...', 'Notes about this session...')}
                    style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: T.textPrimary, outline: 'none', resize: 'vertical', background: T.bg }}
                    onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
                  />
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button onClick={handleSave} disabled={saving}
                      style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: saving ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
                      {saving ? t('Đang lưu...', 'Saving...') : t('Lưu & Xác nhận', 'Save & Confirm')}
                    </button>
                  </div>
                </div>

                {/* Session info badge */}
                <div style={{ background: pColor + '0C', border: `1px solid ${pColor}20`, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('Thông tin tiết học', 'Session Info')}</div>
                  {[
                    { label: t('Lớp', 'Class'), value: selectedClass },
                    { label: t('Tiết', 'Period'), value: `${periodInfo?.label} (${periodInfo?.time})` },
                    { label: t('Môn', 'Subject'), value: t('Toán học', 'Mathematics') },
                    { label: t('Ngày', 'Date'), value: selectedDate.split('-').reverse().join('/') },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: i < 3 ? 6 : 0 }}>
                      <span style={{ fontSize: 12, color: T.textMuted }}>{r.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Lịch sử điểm danh', 'Attendance History')}</div>
                <Badge color={pColor}>{ATTENDANCE_HISTORY.length} {t('buổi gần đây', 'recent sessions')}</Badge>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {[t('Ngày', 'Date'), t('Tiết', 'Period'), t('Lớp', 'Class'), t('Môn', 'Subject'), t('Có mặt', 'Present'), t('Vắng phép', 'Excused'), t('Vắng KP', 'Absent'), t('Trạng thái', 'Status'), ''].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: T.textMuted, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ATTENDANCE_HISTORY.map((row, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = T.bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{row.date}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: T.textSecondary }}>{t(`Tiết ${row.period}`, `Period ${row.period}`)}</td>
                      <td style={{ padding: '12px 20px' }}><Badge color={pColor}>{row.class}</Badge></td>
                      <td style={{ padding: '12px 20px', fontSize: 13, color: T.textSecondary }}>{t(row.subject, row.subject)}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, color: T.success }}>{row.present}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, color: T.warning }}>{row.excused}</td>
                      <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, color: row.absent > 0 ? T.error : T.textMuted }}>{row.absent}</td>
                      <td style={{ padding: '12px 20px' }}><Badge color={T.success}>{t('Đã lưu', 'Saved')}</Badge></td>
                      <td style={{ padding: '12px 20px' }}>
                        <button style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: T.textSecondary }}>{t('Xem', 'View')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── SCREEN 2: Sổ đầu bài ─────────────────────────────────────────────────────

const ClassLogScreen = ({ lang, primaryColor, role }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isPrincipal = role === 'principal';

  const [view, setView] = React.useState('list'); // 'list' | 'new' | 'detail'
  const [entries, setEntries] = React.useState(CLASS_LOG_ENTRIES);
  const [selectedEntry, setSelectedEntry] = React.useState(null);
  const [filterStatus, setFilterStatus] = React.useState('all');

  // New entry form state
  const [form, setForm] = React.useState({
    date: '2026-04-29', period: 2, class: '11B2', subject: 'Toán học',
    topic: '', presentCount: '', totalCount: 32,
    behavior: 'good', homeworkAssigned: '', notes: '',
    absentNames: '',
  });
  const [formSaving, setFormSaving] = React.useState(false);
  const [formSaved, setFormSaved] = React.useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const STATUS_CONFIG = {
    draft:     { vi: 'Nháp',       en: 'Draft',     color: T.textMuted,  bg: T.bg          },
    submitted: { vi: 'Chờ duyệt',  en: 'Submitted', color: T.warning,    bg: T.warningLight },
    approved:  { vi: 'Đã duyệt',   en: 'Approved',  color: T.success,    bg: T.successLight },
    rejected:  { vi: 'Đã từ chối', en: 'Rejected',  color: T.error,      bg: T.errorLight  },
  };

  const handleSubmitEntry = (asDraft = false) => {
    setFormSaving(true);
    setTimeout(() => {
      const newEntry = {
        id: entries.length + 1,
        date: form.date.split('-').reverse().join('/'),
        period: form.period, class: form.class, subject: form.subject,
        topic: form.topic, topicEn: form.topic,
        presentCount: Number(form.presentCount) || form.totalCount,
        totalCount: form.totalCount,
        absentNames: form.absentNames ? form.absentNames.split(',').map(s => s.trim()) : [],
        behavior: form.behavior, homeworkAssigned: form.homeworkAssigned,
        notes: form.notes, status: asDraft ? 'draft' : 'submitted',
        teacherSign: 'Nguyễn Thị Hương', bghNote: '', approvedBy: '',
      };
      setEntries(prev => [newEntry, ...prev]);
      setFormSaving(false); setFormSaved(true);
      setTimeout(() => { setView('list'); setFormSaved(false); }, 1200);
    }, 800);
  };

  const handleApprove = (entryId, note) => {
    setEntries(prev => prev.map(e => e.id === entryId
      ? { ...e, status: 'approved', approvedBy: 'Trần Minh Quân', bghNote: note || 'Đã phê duyệt.' }
      : e
    ));
    setSelectedEntry(prev => prev && prev.id === entryId ? { ...prev, status: 'approved' } : prev);
  };

  // Single-step rejection (Q D1 is still open — if multi-step is adopted later,
  // this becomes the first level only; for now BGH is the sole approver).
  const handleReject = (entryId, reason) => {
    setEntries(prev => prev.map(e => e.id === entryId
      ? { ...e, status: 'rejected', rejectedBy: 'Trần Minh Quân', rejectReason: reason || '' }
      : e
    ));
    setSelectedEntry(prev => prev && prev.id === entryId ? { ...prev, status: 'rejected' } : prev);
    setView('list');
  };

  const filteredEntries = entries.filter(e => filterStatus === 'all' || e.status === filterStatus);

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedEntry) {
    const entry = entries.find(e => e.id === selectedEntry.id) || selectedEntry;
    const sc = STATUS_CONFIG[entry.status];
    const behaviorOpt = BEHAVIOR_OPTIONS.find(b => b.id === entry.behavior);
    const [bghNote, setBghNote] = React.useState(entry.bghNote || '');
    const [approving, setApproving] = React.useState(false);
    const [rejecting, setRejecting] = React.useState(false);
    const [rejectReason, setRejectReason] = React.useState('');

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20, alignSelf: 'flex-start' }}>
            <Icon name="chevronLeft" size={14} color={T.textMuted} /> {t('Quay lại danh sách', 'Back to list')}
          </button>

          {/* Entry card */}
          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header strip */}
            <div style={{ background: pColor, padding: '20px 28px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                  <Badge color="#fff" bg="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }}>
                    {t(`Lớp ${entry.class} · Tiết ${entry.period}`, `Class ${entry.class} · Period ${entry.period}`)}
                  </Badge>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{entry.topic}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{t(entry.subject, entry.subject)} · {entry.date}</div>
                </div>
                <Badge color={sc.color} bg="rgba(255,255,255,0.22)">{t(sc.vi, sc.en)}</Badge>
              </div>
            </div>

            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: t('Sĩ số', 'Total'), value: entry.totalCount },
                  { label: t('Có mặt', 'Present'), value: entry.presentCount, color: T.success },
                  { label: t('Vắng', 'Absent'), value: entry.totalCount - entry.presentCount, color: entry.totalCount - entry.presentCount > 0 ? T.error : T.textMuted },
                ].map((m, i) => (
                  <div key={i} style={{ background: T.bg, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: m.color || T.textPrimary }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Absent students */}
              {entry.absentNames?.length > 0 && (
                <div style={{ background: T.errorLight, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.error}20` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.error, marginBottom: 6 }}>{t('Học sinh vắng mặt:', 'Absent students:')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {entry.absentNames.map((name, i) => (
                      <Badge key={i} color={T.error}>{name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavior */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, width: 140, flexShrink: 0 }}>{t('Tình hình lớp học:', 'Class behavior:')}</div>
                <Badge color={behaviorOpt?.color || T.primary} style={{ fontSize: 13 }}>
                  {t(behaviorOpt?.vi || 'Khá', behaviorOpt?.en || 'Good')}
                </Badge>
              </div>

              {/* Homework */}
              {entry.homeworkAssigned && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('Bài tập về nhà', 'Homework Assigned')}</div>
                  <div style={{ padding: '10px 14px', background: pColor + '08', border: `1px solid ${pColor}20`, borderRadius: 8, fontSize: 13, color: T.textPrimary }}>{entry.homeworkAssigned}</div>
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('Ghi chú giáo viên', 'Teacher Notes')}</div>
                  <div style={{ padding: '10px 14px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{entry.notes}</div>
                </div>
              )}

              {/* Signature row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{t('Giáo viên ký tên', 'Teacher Signature')}</div>
                  {entry.teacherSign
                    ? <div style={{ fontSize: 13, fontWeight: 700, color: pColor, fontStyle: 'italic' }}>{entry.teacherSign}</div>
                    : <div style={{ fontSize: 12, color: T.textMuted }}>{t('Chưa ký', 'Not signed')}</div>
                  }
                </div>
              </div>

              {/* BGH approval section (single-step — see Q D1) */}
              {(entry.status === 'approved' || entry.status === 'rejected' || isPrincipal) && (
                <div style={{
                  background: (entry.status === 'rejected' ? T.error : T.success) + '08',
                  border: `1px solid ${(entry.status === 'rejected' ? T.error : T.success)}30`,
                  borderRadius: 12, padding: 16,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: entry.status === 'rejected' ? T.error : T.success, marginBottom: entry.status === 'submitted' && isPrincipal ? 10 : 8 }}>
                    {t('Phê duyệt của BGH', 'BGH Review')}
                  </div>
                  {entry.status === 'submitted' && isPrincipal ? (
                    rejecting ? (
                      // Inline reject — mirrors the leave-approval pattern in discipline.jsx.
                      <React.Fragment>
                        <label style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t('Lý do từ chối', 'Rejection reason')} <span style={{ color: T.error }}>*</span>
                        </label>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                          placeholder={t('VD: Thiếu nội dung bài tập về nhà...', 'e.g. Missing homework details...')}
                          style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', marginBottom: 10, outline: 'none', resize: 'vertical' }}
                          onFocus={e => e.target.style.borderColor = T.error} onBlur={e => e.target.style.borderColor = T.border} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setRejecting(false); setRejectReason(''); }}
                            style={{ padding: '8px 16px', background: 'transparent', color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {t('Huỷ', 'Cancel')}
                          </button>
                          <button onClick={() => { handleReject(entry.id, rejectReason); setRejecting(false); setRejectReason(''); }}
                            disabled={!rejectReason.trim()}
                            style={{ padding: '8px 16px', background: rejectReason.trim() ? T.error : T.textMuted, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="x" size={11} color="#fff" strokeWidth={2.5} />
                            {t('Xác nhận từ chối', 'Confirm rejection')}
                          </button>
                        </div>
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        <label style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t('Ghi chú BGH', 'BGH note')}
                        </label>
                        <textarea value={bghNote} onChange={e => setBghNote(e.target.value)} rows={2}
                          placeholder={t('Nhận xét của BGH...', 'BGH comments...')}
                          style={{ width: '100%', padding: '8px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', marginBottom: 10, outline: 'none', resize: 'vertical' }}
                          onFocus={e => e.target.style.borderColor = T.success} onBlur={e => e.target.style.borderColor = T.border}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setApproving(true); setTimeout(() => { handleApprove(entry.id, bghNote); setApproving(false); }, 700); }} disabled={approving}
                            style={{ padding: '9px 20px', background: approving ? T.textMuted : T.success, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="check" size={12} color="#fff" strokeWidth={2.5} />
                            {approving ? t('Đang phê...', 'Approving...') : t('Phê duyệt', 'Approve')}
                          </button>
                          <button onClick={() => setRejecting(true)}
                            style={{ padding: '9px 20px', background: 'transparent', color: T.error, border: `1.5px solid ${T.error}`, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="x" size={12} color={T.error} strokeWidth={2.5} />
                            {t('Từ chối', 'Reject')}
                          </button>
                        </div>
                      </React.Fragment>
                    )
                  ) : entry.status === 'approved' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Badge color={T.success} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="check" size={11} color={T.success} strokeWidth={2.6} />
                          {t('Đã phê duyệt', 'Approved')}
                        </Badge>
                        <span style={{ fontSize: 11.5, color: T.textMuted }}>
                          {t('Bởi BGH', 'by BGH')} · <span style={{ fontWeight: 700, color: T.textSecondary }}>{entry.approvedBy}</span>
                        </span>
                      </div>
                      {entry.bghNote && (
                        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 8, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700 }}>{t('Ghi chú BGH:', 'BGH note:')}</span> {entry.bghNote}
                        </div>
                      )}
                    </div>
                  ) : entry.status === 'rejected' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Badge color={T.error} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="x" size={11} color={T.error} strokeWidth={2.6} />
                          {t('Đã từ chối', 'Rejected')}
                        </Badge>
                        <span style={{ fontSize: 11.5, color: T.textMuted }}>
                          {t('Bởi BGH', 'by BGH')} · <span style={{ fontWeight: 700, color: T.textSecondary }}>{entry.rejectedBy}</span>
                        </span>
                      </div>
                      {entry.rejectReason && (
                        <div style={{ fontSize: 12, color: T.error, marginTop: 8, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 700 }}>{t('Lý do từ chối:', 'Rejection reason:')}</span> {entry.rejectReason}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── New entry form ────────────────────────────────────────────────────────────
  if (view === 'new') {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            <Icon name="chevronLeft" size={14} color={T.textMuted} /> {t('Quay lại', 'Back')}
          </button>

          {formSaved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: T.successLight, border: `1px solid ${T.success}40`, borderRadius: 10, marginBottom: 20, color: T.success, fontWeight: 600, fontSize: 13 }}>
              <Icon name="check" size={15} color={T.success} strokeWidth={2.5} />
              {t('Đã ghi sổ thành công!', 'Log entry saved!')}
            </div>
          )}

          <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 4 }}>{t('Ghi sổ đầu bài', 'New Class Log Entry')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 24 }}>{t('Ghi lại nội dung tiết học để BGH phê duyệt', 'Record lesson details for BGH review')}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Ngày', 'Date')}</label>
                <input type="date" value={form.date} onChange={e => setF('date', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Lớp', 'Class')}</label>
                <select value={form.class} onChange={e => setF('class', e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                  {ATTENDANCE_CLASSES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Tiết thứ', 'Period')}</label>
                <select value={form.period} onChange={e => setF('period', Number(e.target.value))}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', background: T.card, cursor: 'pointer' }}>
                  {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label} – {p.time}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Tên bài học / Nội dung tiết dạy *', 'Lesson Topic *')}</label>
              <input value={form.topic} onChange={e => setF('topic', e.target.value)}
                placeholder={t('VD: Đạo hàm và ứng dụng — Bài 3: Cực trị hàm số', 'E.g. Derivatives — Lesson 3: Function Extrema')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Số học sinh có mặt', 'Students Present')}</label>
                <input type="number" min={0} max={form.totalCount} value={form.presentCount} onChange={e => setF('presentCount', e.target.value)}
                  placeholder={String(form.totalCount)}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Học sinh vắng (tên, cách nhau dấu phẩy)', 'Absent Students (comma separated)')}</label>
                <input value={form.absentNames} onChange={e => setF('absentNames', e.target.value)}
                  placeholder={t('Nguyễn Văn A, Trần Thị B', 'Nguyen Van A, Tran Thi B')}
                  style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
                />
              </div>
            </div>

            {/* Behavior rating */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 8 }}>{t('Tình hình lớp học', 'Class Behavior')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {BEHAVIOR_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setF('behavior', opt.id)}
                    style={{
                      flex: 1, padding: '9px 8px', border: `1.5px solid ${form.behavior === opt.id ? opt.color : T.border}`,
                      borderRadius: 8, background: form.behavior === opt.id ? opt.color + '12' : 'transparent',
                      color: form.behavior === opt.id ? opt.color : T.textSecondary,
                      fontSize: 12, fontWeight: form.behavior === opt.id ? 700 : 500, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                    }}>
                    <Icon name={opt.icon} size={14} color={form.behavior === opt.id ? opt.color : T.textMuted} strokeWidth={2} />
                    {t(opt.vi, opt.en)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Bài tập về nhà', 'Homework Assigned')}</label>
              <input value={form.homeworkAssigned} onChange={e => setF('homeworkAssigned', e.target.value)}
                placeholder={t('Bài tập trang..., bài...', 'Textbook p.__, ex.__')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, display: 'block', marginBottom: 6 }}>{t('Ghi chú (tùy chọn)', 'Notes (optional)')}</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3}
                placeholder={t('Nhận xét, tình hình đặc biệt trong tiết học...', 'Any special observations...')}
                style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = pColor} onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => handleSubmitEntry(true)} disabled={formSaving}
                style={{ padding: '10px 20px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Lưu nháp', 'Save as Draft')}
              </button>
              <button onClick={() => handleSubmitEntry(false)} disabled={formSaving || !form.topic}
                style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 9, background: formSaving || !form.topic ? T.textMuted : pColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: formSaving || !form.topic ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="arrowRight" size={14} color="#fff" />
                {formSaving ? t('Đang gửi...', 'Submitting...') : t('Gửi BGH phê duyệt', 'Submit for Approval')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Sổ đầu bài', 'Class Log Book')}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>
              {isPrincipal
                ? t('Xem xét và phê duyệt sổ đầu bài của giáo viên', 'Review and approve teacher class logs')
                : t('Ghi lại nội dung từng tiết dạy để BGH phê duyệt', 'Log lesson content for BGH review')}
            </div>
          </div>
          {!isPrincipal && (
            <Button icon="plus" onClick={() => setView('new')}>{t('Ghi tiết mới', 'New Log Entry')}</Button>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: t('Chờ duyệt', 'Pending Review'), count: entries.filter(e => e.status === 'submitted').length, color: T.warning, icon: 'clock' },
            { label: t('Đã duyệt', 'Approved'), count: entries.filter(e => e.status === 'approved').length, color: T.success, icon: 'check' },
            { label: t('Nháp', 'Draft'), count: entries.filter(e => e.status === 'draft').length, color: T.textMuted, icon: 'edit' },
          ].map((s, i) => (
            <div key={i} style={{ background: T.card, borderRadius: 12, border: `1px solid ${s.count > 0 && s.color === T.warning ? T.warning + '40' : T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={s.icon} size={18} color={s.color} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter + list */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, flex: 1 }}>{t('Danh sách sổ đầu bài', 'Log Entries')}</div>
            {[{ id: 'all', vi: 'Tất cả', en: 'All' }, { id: 'submitted', vi: 'Chờ duyệt', en: 'Pending' }, { id: 'approved', vi: 'Đã duyệt', en: 'Approved' }, { id: 'draft', vi: 'Nháp', en: 'Draft' }].map(f => {
              const cfg = STATUS_CONFIG[f.id] || { color: T.textMuted };
              return (
                <button key={f.id} onClick={() => setFilterStatus(f.id)}
                  style={{ padding: '5px 14px', border: `1.5px solid ${filterStatus === f.id ? (cfg.color || pColor) : T.border}`, borderRadius: 7, background: filterStatus === f.id ? (cfg.color || pColor) + '12' : 'transparent', color: filterStatus === f.id ? (cfg.color || pColor) : T.textMuted, fontSize: 12, fontWeight: filterStatus === f.id ? 700 : 500, cursor: 'pointer' }}>
                  {t(f.vi, f.en)}
                </button>
              );
            })}
          </div>

          <div>
            {filteredEntries.map((entry, i) => {
              const sc = STATUS_CONFIG[entry.status];
              const bOpt = BEHAVIOR_OPTIONS.find(b => b.id === entry.behavior);
              return (
                <div key={entry.id}
                  onClick={() => { setSelectedEntry(entry); setView('detail'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < filteredEntries.length - 1 ? `1px solid ${T.border}` : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Status color bar */}
                  <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: sc.color, flexShrink: 0 }} />

                  {/* Date + period */}
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{entry.date}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{t(`Tiết ${entry.period}`, `Period ${entry.period}`)}</div>
                  </div>

                  {/* Class badge */}
                  <Badge color={pColor} style={{ flexShrink: 0 }}>{entry.class}</Badge>

                  {/* Topic */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.topic}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{entry.subject} · {entry.presentCount}/{entry.totalCount} {t('có mặt', 'present')}</div>
                  </div>

                  {/* Behavior */}
                  {bOpt && <Badge color={bOpt.color} style={{ flexShrink: 0 }}>{t(bOpt.vi, bOpt.en)}</Badge>}

                  {/* Status */}
                  <Badge color={sc.color} bg={sc.bg} style={{ flexShrink: 0 }}>{t(sc.vi, sc.en)}</Badge>

                  {/* Action */}
                  {isPrincipal && entry.status === 'submitted' && (
                    <button onClick={e => { e.stopPropagation(); setSelectedEntry(entry); setView('detail'); }}
                      style={{ padding: '5px 12px', background: T.success, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {t('Phê duyệt', 'Approve')}
                    </button>
                  )}

                  <Icon name="chevronRight" size={14} color={T.textMuted} />
                </div>
              );
            })}
            {filteredEntries.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: T.textMuted }}>
                <Icon name="fileText" size={36} color={T.border} />
                <div style={{ marginTop: 10, fontSize: 13 }}>{t('Không có mục nào', 'No entries found')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { AttendanceScreen, ClassLogScreen });
