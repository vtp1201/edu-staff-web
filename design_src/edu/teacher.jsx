// ── Teacher & Principal Dashboard ────────────────────────────────────────────

const SCHEDULE_DATA = [
  // US-045: timetable rows are keyed by period number (Tiết 1–10), not clock time.
  { period: 1, subject: 'Toán học', subjectEn: 'Mathematics', class: '10A1', room: 'P.201', status: 'done', students: 36 },
  { period: 3, subject: 'Toán học', subjectEn: 'Mathematics', class: '11B2', room: 'P.203', status: 'live', students: 32 },
  { period: 7, subject: 'Toán học', subjectEn: 'Mathematics', class: '12C1', room: 'P.205', status: 'upcoming', students: 34 },
];

const PENDING_GRADES = [
  { student: 'Nguyễn Văn An', class: '10A1', type: 'Kiểm tra 15 phút', typeEn: '15-min Quiz', submitted: '2 giờ trước', submittedEn: '2h ago' },
  { student: 'Trần Thị Bình', class: '11B2', type: 'Bài tập về nhà', typeEn: 'Homework', submitted: '3 giờ trước', submittedEn: '3h ago' },
  { student: 'Lê Hoàng Cường', class: '12C1', type: 'Kiểm tra miệng', typeEn: 'Oral Test', submitted: '5 giờ trước', submittedEn: '5h ago' },
  { student: 'Phạm Thị Dung', class: '10A1', type: 'Bài tập về nhà', typeEn: 'Homework', submitted: 'Hôm qua', submittedEn: 'Yesterday' },
];

const NOTIF_DATA = [
  { icon: 'calendar', color: T.primary, vi: 'Họp hội đồng giáo viên lúc 15:00 hôm nay', en: 'Staff meeting at 15:00 today', time: '30 phút trước' },
  { icon: 'users', color: T.warning, vi: '3 học sinh vắng mặt lớp 10A1', en: '3 students absent in 10A1', time: '1 giờ trước' },
  { icon: 'fileText', color: T.success, vi: 'Kế hoạch thi cuối kỳ đã được cập nhật', en: 'Final exam schedule updated', time: '2 giờ trước' },
  { icon: 'message', color: T.purple, vi: 'Phụ huynh Nguyễn Văn Đức đã nhắn tin', en: 'Parent Nguyen Van Duc sent a message', time: '3 giờ trước' },
];

const TEACHER_CLASSES = [
  { name: '10A1', subject: 'Toán', students: 36, avg: 7.8, attendance: 94, lessons: 18, total: 24 },
  { name: '11B2', subject: 'Toán', students: 32, avg: 8.1, attendance: 96, lessons: 14, total: 24 },
  { name: '12C1', subject: 'Toán', students: 34, avg: 7.5, attendance: 91, lessons: 20, total: 24 },
  { name: '10A2', subject: 'Toán', students: 38, avg: 8.4, attendance: 97, lessons: 18, total: 24 },
];

const GRADEBOOK_STUDENTS = [
  { name: 'Nguyễn Minh Anh', scores: [9, 8, 9, 8.5], avg: 8.7 },
  { name: 'Trần Văn Bình', scores: [7, 8, 7, 7.5], avg: 7.4 },
  { name: 'Lê Thị Cẩm', scores: [10, 9, 10, 9.5], avg: 9.6 },
  { name: 'Phạm Đức Dũng', scores: [6, 7, 6, 6.5], avg: 6.5 },
  { name: 'Hoàng Thị Linh', scores: [8, 9, 8, 8.5], avg: 8.4 },
  { name: 'Vũ Quốc Bảo', scores: [9, 7, 8, 8.0], avg: 8.1 },
  { name: 'Đỗ Thu Hằng', scores: [7, 8, 9, 7.5], avg: 7.9 },
  { name: 'Bùi Minh Tuấn', scores: [5, 6, 7, 6.0], avg: 6.1 },
];

const TEACHER_STUDENTS = [
  { name: 'Nguyễn Minh Anh', class: '10A1', gpa: 8.7, attendance: '96%', status: 'good' },
  { name: 'Trần Văn Bình', class: '10A1', gpa: 7.4, attendance: '88%', status: 'warning' },
  { name: 'Lê Thị Cẩm', class: '11B2', gpa: 9.6, attendance: '100%', status: 'excellent' },
  { name: 'Phạm Đức Dũng', class: '10A1', gpa: 6.5, attendance: '72%', status: 'danger' },
  { name: 'Hoàng Thị Linh', class: '11B2', gpa: 8.4, attendance: '94%', status: 'good' },
  { name: 'Vũ Quốc Bảo', class: '12C1', gpa: 8.1, attendance: '90%', status: 'good' },
];

// Principal data
const PRINCIPAL_TEACHERS = [
  { id: 'tch-1', name: 'Nguyễn Thị Hương', subject: 'Toán học', subjectEn: 'Mathematics', classes: ['10A1','10A2','11B2'], students: 106, status: 'active', avatar: 'NH',
    gvcnClassId: '10A1', assignments: [
      { id: 'as-1', classId: '10A1', subjectId: 'sub-math-10' },
      { id: 'as-2', classId: '10A2', subjectId: 'sub-math-10' },
      { id: 'as-3', classId: '11B2', subjectId: 'sub-math-11' },
    ] },
  { id: 'tch-2', name: 'Trần Văn Minh', subject: 'Vật Lý', subjectEn: 'Physics', classes: ['11A1','11B2','12C1'], students: 100, status: 'active', avatar: 'TM',
    gvcnClassId: null, assignments: [] },
  { id: 'tch-3', name: 'Lê Thị Hoa', subject: 'Hóa Học', subjectEn: 'Chemistry', classes: ['10A1','11A2','12B1'], students: 104, status: 'active', avatar: 'LH',
    gvcnClassId: '11A2', assignments: [] },
  { id: 'tch-4', name: 'Phạm Quốc Bảo', subject: 'Ngữ Văn', subjectEn: 'Literature', classes: ['10A2','10B1','12C2'], students: 112, status: 'active', avatar: 'PB',
    gvcnClassId: null, assignments: [
      { id: 'as-4', classId: '10A2', subjectId: 'sub-lit-10' },
    ] },
  { id: 'tch-5', name: 'Đỗ Thị Mai', subject: 'Tiếng Anh', subjectEn: 'English', classes: ['11A1','11B1','11B2'], students: 98, status: 'leave', avatar: 'DM',
    gvcnClassId: null, assignments: [
      { id: 'as-5', classId: '11A1', subjectId: 'sub-eng-11' },
      { id: 'as-6', classId: '11B2', subjectId: 'sub-eng-11' },
    ] },
];

// Class master list (subset — would come from GET /api/v1/core/classes in production).
const PT_CLASS_LIST = [
  { id: '10A1', name: 'Lớp 10A1', gradeLevel: 10 },
  { id: '10A2', name: 'Lớp 10A2', gradeLevel: 10 },
  { id: '10B1', name: 'Lớp 10B1', gradeLevel: 10 },
  { id: '11A1', name: 'Lớp 11A1', gradeLevel: 11 },
  { id: '11A2', name: 'Lớp 11A2', gradeLevel: 11 },
  { id: '11B1', name: 'Lớp 11B1', gradeLevel: 11 },
  { id: '11B2', name: 'Lớp 11B2', gradeLevel: 11 },
  { id: '12B1', name: 'Lớp 12B1', gradeLevel: 12 },
  { id: '12C1', name: 'Lớp 12C1', gradeLevel: 12 },
  { id: '12C2', name: 'Lớp 12C2', gradeLevel: 12 },
];

// ClassSubject availability map: subjectId -> classIds that already have a ClassSubject
// row. Drives the “grey out subjects with no ưu tiết for this class” rule (ADR 0037).
const PT_CLASS_SUBJECT_MAP = {
  'sub-math-10': ['10A1', '10A2', '10B1'],
  'sub-math-11': ['11A1', '11A2', '11B1', '11B2'],
  'sub-math-12': ['12B1', '12C1', '12C2'],
  'sub-lit-10':  ['10A1', '10A2', '10B1'],
  'sub-lit-11':  ['11A1', '11B2'],
  'sub-eng-10':  ['10A1', '10A2', '10B1'],
  'sub-eng-11':  ['11A1', '11A2', '11B1', '11B2'],
  // sub-eng-12 archived
};

const ptNewId = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

// ── Section renderers ─────────────────────────────────────────────────────────

const TeacherDashboardHome = ({ lang, t, pColor, onNavigate }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    {/* Stats — 5 cards. auto-fit/minmax gives 5 cols on xl screens and reflows to
        2-up on mobile without a media-query stylesheet. */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      <StatCard icon="users" iconColor={pColor} label={t('Tổng học sinh', 'Total Students')} value="140" trend={2.1} trendLabel={t('so tháng trước', 'vs last month')} lang={lang} />
      <StatCard icon="clock" iconColor={T.success} label={t('Tiết học hôm nay', 'Classes Today')} value="3" lang={lang} />
      <StatCard icon="clipboard" iconColor={T.warning} label={t('Chờ chấm điểm', 'Pending Grades')} value="23" trend={-5.3} trendLabel={t('so tuần trước', 'vs last week')} lang={lang} />
      {/* Awaiting-approval metric — only meaningful when school is in
          ADMIN_APPROVAL grade-publish mode (grade state machine:
          DRAFT → PUBLISHED → LOCKED). */}
      <StatCard icon="clock" iconColor={'#FFAE1F'} label={t('Điểm chờ duyệt', 'Grades Awaiting Approval')} value="4" trendLabel={t('Chế độ ADMIN_APPROVAL', 'ADMIN_APPROVAL mode')} lang={lang} />
      <StatCard icon="message" iconColor={T.purple} label={t('Tin nhắn mới', 'New Messages')} value="5" lang={lang} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      {/* Schedule */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Lịch dạy hôm nay', "Today's Schedule")}</div>
          <Badge color={pColor}>{t('Thứ Tư', 'Wednesday')}</Badge>
        </div>
        <div style={{ padding: '8px 0' }}>
          {SCHEDULE_DATA.map((s, i) => {
            const STATUS = { done: { color: T.textMuted, bg: T.bg, label: t('Hoàn thành', 'Done') }, live: { color: T.success, bg: T.successLight, label: t('Đang dạy', 'Live') }, upcoming: { color: T.warning, bg: T.warningLight, label: t('Sắp tới', 'Upcoming') } };
            const st = STATUS[s.status];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderLeft: s.status === 'live' ? `3px solid ${T.success}` : '3px solid transparent' }}>
                <div style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: T.textPrimary, lineHeight: 1.15 }}>
                    {t(`Tiết ${s.period}`, `Period ${s.period}`)}
                  </div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>
                    {s.period <= 5 ? t('Buổi sáng', 'Morning') : t('Buổi chiều', 'Afternoon')}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{t(s.subject, s.subjectEn)}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{t(`Lớp ${s.class} · ${s.room}`, `Class ${s.class} · ${s.room}`)}</div>
                </div>
                <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending grades + notifications */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Chờ chấm điểm', 'Pending Grades')}</div>
            <Badge color={T.warning}>23</Badge>
          </div>
          {PENDING_GRADES.slice(0, 3).map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
              <Avatar initials={g.student.split(' ').slice(-1)[0][0] + g.student.split(' ')[1][0]} color={pColor} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.student}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{t(g.type, g.typeEn)} · {g.class}</div>
              </div>
              <a href="/teacher/grades/enter"
                onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate('grades'); } }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: pColor, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '5px 11px', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
                }}>
                <Icon name="penLine" size={11} color="#fff" strokeWidth={2.2} />
                {t('Nhập điểm', 'Enter grades')}
              </a>
            </div>
          ))}
        </div>

        {/* Notifications */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Thông báo', 'Notifications')}</div>
          </div>
          {NOTIF_DATA.slice(0, 3).map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 20px', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: n.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon name={n.icon} size={13} color={n.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: T.textPrimary, lineHeight: 1.4 }}>{t(n.vi, n.en)}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TeacherGrades = ({ lang, t, pColor }) => {
  const [selectedClass, setSelectedClass] = React.useState('10A1');
  const cols = [t('KT Miệng', 'Oral'), t('KT 15\'', '15-min'), t('KT 1 tiết', '45-min'), t('Giữa kỳ', 'Midterm')];
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, flex: 1 }}>{t('Bảng điểm', 'Grade Book')}</div>
        {TEACHER_CLASSES.map(c => (
          <button key={c.name} onClick={() => setSelectedClass(c.name)}
            style={{ padding: '5px 14px', borderRadius: 6, border: `1.5px solid ${selectedClass === c.name ? pColor : T.border}`, background: selectedClass === c.name ? pColor : 'transparent', color: selectedClass === c.name ? '#fff' : T.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {c.name}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.bg }}>
              <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.textMuted, whiteSpace: 'nowrap' }}>#</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.textMuted }}>{t('Họ và tên', 'Full Name')}</th>
              {cols.map(c => <th key={c} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>{c}</th>)}
              <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>{t('Trung bình', 'Average')}</th>
              <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>{t('Xếp loại', 'Grade')}</th>
            </tr>
          </thead>
          <tbody>
            {GRADEBOOK_STUDENTS.map((s, i) => {
              const rank = s.avg >= 8.5 ? { label: t('Giỏi', 'Excellent'), color: T.success } : s.avg >= 7 ? { label: t('Khá', 'Good'), color: pColor } : { label: t('TB', 'Average'), color: T.warning };
              return (
                <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 24px', fontSize: 12, color: T.textMuted }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={s.name.split(' ').slice(-1)[0][0]} color={pColor} size={28} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{s.name}</span>
                    </div>
                  </td>
                  {s.scores.map((sc, j) => (
                    <td key={j} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: sc < 5 ? T.error : sc >= 8 ? T.success : T.textPrimary }}>
                      {sc}
                    </td>
                  ))}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: rank.color }}>{s.avg.toFixed(1)}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <Badge color={rank.color}>{rank.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TeacherClasses = ({ lang, t, pColor }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
    {TEACHER_CLASSES.map((cls, i) => (
      <div key={i} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary }}>{t(`Lớp ${cls.name}`, `Class ${cls.name}`)}</div>
            <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>{t(cls.subject, 'Mathematics')} · {cls.students} {t('học sinh', 'students')}</div>
          </div>
          <Badge color={pColor}>{t('Đang học', 'Active')}</Badge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: t('Điểm TB', 'Avg Score'), value: cls.avg + '/10', color: cls.avg >= 8 ? T.success : T.warning },
            { label: t('Chuyên cần', 'Attendance'), value: cls.attendance + '%', color: cls.attendance >= 90 ? T.success : T.error },
          ].map((m, j) => (
            <div key={j} style={{ background: T.bg, borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>{t('Tiến độ chương trình', 'Curriculum Progress')}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: pColor }}>{cls.lessons}/{cls.total} {t('tiết', 'lessons')}</span>
        </div>
        <ProgressBar value={(cls.lessons / cls.total) * 100} color={pColor} />
      </div>
    ))}
  </div>
);

const TeacherStudents = ({ lang, t, pColor }) => (
  <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Danh sách học sinh', 'Student List')}</div>
      <Button icon="plus" size="sm" style={{ borderRadius: 7 }}>{t('Thêm học sinh', 'Add Student')}</Button>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: T.bg }}>
          {[t('Học sinh', 'Student'), t('Lớp', 'Class'), t('GPA', 'GPA'), t('Chuyên cần', 'Attendance'), t('Tình trạng', 'Status'), ''].map(h => (
            <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.textMuted }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {TEACHER_STUDENTS.map((s, i) => {
          const ST = { excellent: { color: T.success, label: t('Xuất sắc', 'Excellent') }, good: { color: pColor, label: t('Khá', 'Good') }, warning: { color: T.warning, label: t('Trung bình', 'Average') }, danger: { color: T.error, label: t('Yếu', 'Poor') } };
          const st = ST[s.status];
          return (
            <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={s.name.split(' ').slice(-1)[0][0]} color={pColor} size={30} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{s.name}</span>
                </div>
              </td>
              <td style={{ padding: '12px 20px', fontSize: 13, color: T.textSecondary }}>{s.class}</td>
              <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 700, color: s.gpa >= 8.5 ? T.success : T.textPrimary }}>{s.gpa}</td>
              <td style={{ padding: '12px 20px', fontSize: 13, color: T.textSecondary }}>{s.attendance}</td>
              <td style={{ padding: '12px 20px' }}><Badge color={st.color}>{st.label}</Badge></td>
              <td style={{ padding: '12px 20px' }}>
                <button style={{ background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: T.textSecondary }}>{t('Xem', 'View')}</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const TeacherScheduleFull = ({ lang, t, pColor }) => {
  const days = [t('Thứ 2', 'Mon'), t('Thứ 3', 'Tue'), t('Thứ 4', 'Wed'), t('Thứ 5', 'Thu'), t('Thứ 6', 'Fri'), t('Thứ 7', 'Sat')];
  const slots = ['07:00', '08:30', '10:00', '13:00', '14:30'];
  // Each slot: { cls, room, subject?, conflict? }
  // • `subject` falls back to the teacher's primary subject (Toán học) when omitted.
  // • `conflict: true` triggers the US-045 "double-booked" visual variant
  //   (errorLight bg + error left border + AlertTriangle + tooltip).
  //   Conflict detection itself is API-enforced — the UI just reflects the flag.
  const SUBJ = t('Toán học', 'Mathematics');
  const schedule = [
    [null, { cls: '10A1', room: 'P.201', subject: SUBJ }, { cls: '11B2', room: 'P.203', subject: SUBJ }, null, null, null],
    [{ cls: '12C1', room: 'P.205', subject: SUBJ }, null, null, { cls: '10A2', room: 'P.201', subject: SUBJ }, null, null],
    // Wed 10:00 — mock conflict: the same period is already taken in another class.
    [null, null, { cls: '10A1', room: 'P.201', subject: SUBJ, conflict: true }, null, { cls: '11B2', room: 'P.203', subject: SUBJ }, null],
    [null, { cls: '10A2', room: 'P.201', subject: SUBJ }, null, null, { cls: '12C1', room: 'P.205', subject: SUBJ }, null],
    [{ cls: '10A1', room: 'P.201', subject: SUBJ }, null, null, { cls: '11B2', room: 'P.203', subject: SUBJ }, null, null],
  ];
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Thời khoá biểu tuần này', 'This Week Schedule')}</div>
      </div>
      <div style={{ overflowX: 'auto', padding: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: 70, padding: '8px 12px', fontSize: 11, color: T.textMuted, fontWeight: 600, textAlign: 'left' }}>{t('Tiết', 'Period')}</th>
              {days.map(d => <th key={d} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: T.textPrimary, textAlign: 'center' }}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, ri) => (
              <tr key={ri}>
                <td style={{ padding: '6px 12px', fontSize: 11, color: T.textMuted, fontWeight: 600, verticalAlign: 'middle' }}>{slot}</td>
                {schedule[ri].map((cell, ci) => (
                  <td key={ci} style={{ padding: 4 }}>
                    {cell ? (
                      <div
                        title={cell.conflict
                          ? t('Xung đột lịch dạy — giáo viên đã có lịch tiết này',
                              'Schedule conflict — teacher already has a class this period')
                          : `${cell.cls} · ${cell.subject || ''} · ${cell.room}`}
                        style={{
                          position: 'relative',
                          background: cell.conflict ? T.errorLight : pColor + '15',
                          border: `1px solid ${cell.conflict ? T.error + '55' : pColor + '30'}`,
                          borderLeft: `3px solid ${cell.conflict ? T.error : pColor}`,
                          borderRadius: 8, padding: '8px 10px',
                        }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: cell.conflict ? T.error : pColor }}>
                          {cell.cls}
                        </div>
                        <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{cell.room}</div>
                        {cell.subject && (
                          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cell.subject}
                          </div>
                        )}
                        {cell.conflict && (
                          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex' }}>
                            <Icon name="alertTriangle" size={12} color={T.error} strokeWidth={2.2} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ height: 46, borderRadius: 8, background: T.bg, border: `1px dashed ${T.border}` }} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Principal specific
const PrincipalDashboardHome = ({ lang, t, pColor }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      <StatCard icon="userCheck" iconColor={pColor} label={t('Giáo viên', 'Teachers')} value="42" trend={4.8} trendLabel={t('năm học trước', 'vs last year')} lang={lang} />
      <StatCard icon="users" iconColor={T.success} label={t('Học sinh', 'Students')} value="1,240" trend={6.2} trendLabel={t('năm học trước', 'vs last year')} lang={lang} />
      <StatCard icon="grid" iconColor={T.warning} label={t('Lớp học', 'Classes')} value="38" lang={lang} />
      <StatCard icon="percent" iconColor={T.purple} label={t('Chuyên cần TB', 'Avg Attendance')} value="94.2%" trend={1.1} trendLabel={t('so tháng trước', 'vs last month')} lang={lang} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Danh sách giáo viên', 'Teacher List')}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {[t('Giáo viên', 'Teacher'), t('Môn', 'Subject'), t('Lớp', 'Classes'), t('Trạng thái', 'Status')].map(h => (
                <th key={h} style={{ padding: '9px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRINCIPAL_TEACHERS.map((tc, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar initials={tc.avatar} color={pColor} size={28} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{tc.name}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{tc.students} {t('học sinh', 'students')}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '11px 20px', fontSize: 12, color: T.textSecondary }}>{t(tc.subject, tc.subjectEn)}</td>
                <td style={{ padding: '11px 20px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {tc.classes.slice(0, 2).map(c => <Badge key={c} color={pColor} style={{ fontSize: 10 }}>{c}</Badge>)}
                    {tc.classes.length > 2 && <Badge color={T.textMuted} style={{ fontSize: 10 }}>+{tc.classes.length - 2}</Badge>}
                  </div>
                </td>
                <td style={{ padding: '11px 20px' }}>
                  <Badge color={tc.status === 'active' ? T.success : T.warning}>
                    {tc.status === 'active' ? t('Đang dạy', 'Active') : t('Nghỉ phép', 'On Leave')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 16 }}>{t('Chỉ số trường học', 'School Metrics')}</div>
          {[
            { label: t('Tỷ lệ lên lớp', 'Promotion Rate'), value: '96.5%', color: T.success },
            { label: t('Tỷ lệ tốt nghiệp', 'Graduation Rate'), value: '98.2%', color: pColor },
            { label: t('Học sinh giỏi', 'High Achievers'), value: '15.3%', color: T.warning },
            { label: t('GPA trung bình', 'Avg GPA'), value: '7.9/10', color: T.purple },
          ].map((m, i) => (
            <div key={i} style={{ marginBottom: i < 3 ? 14 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>{m.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</span>
              </div>
              <ProgressBar value={parseFloat(m.value)} color={m.color} height={5} />
            </div>
          ))}
        </div>

        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>{t('Hành động nhanh', 'Quick Actions')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { icon: 'plus', label: t('Thêm giáo viên', 'Add Teacher'), color: pColor },
              { icon: 'fileText', label: t('Xuất báo cáo', 'Export Report'), color: T.success },
              { icon: 'bell', label: t('Gửi thông báo', 'Send Notice'), color: T.warning },
              { icon: 'calendar', label: t('Lịch nhà trường', 'School Calendar'), color: T.purple },
            ].map((a, i) => (
              <button key={i} style={{
                padding: '10px', background: a.color + '10', border: `1px solid ${a.color}25`,
                borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6, transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = a.color + '20'}
                onMouseLeave={e => e.currentTarget.style.background = a.color + '10'}
              >
                <Icon name={a.icon} size={16} color={a.color} />
                <span style={{ fontSize: 11, fontWeight: 600, color: a.color, textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Teacher Screen ───────────────────────────────────────────────────────
const TeacherScreen = ({ role, section, onNavigate, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  const TITLES = {
    teacher: {
      dashboard: { vi: 'Tổng quan', en: 'Dashboard', sub_vi: 'Chào mừng trở lại!', sub_en: 'Welcome back!' },
      classes: { vi: 'Lớp học', en: 'Classes' },
      grades: { vi: 'Bảng điểm', en: 'Grade Book' },
      schedule: { vi: 'Lịch dạy', en: 'Teaching Schedule' },
      students: { vi: 'Học sinh', en: 'Students' },
      notifications: { vi: 'Thông báo', en: 'Notifications' },
      settings: { vi: 'Cài đặt', en: 'Settings' },
    },
    principal: {
      dashboard: { vi: 'Tổng quan trường', en: 'School Overview', sub_vi: 'THPT Nguyễn Du — Năm học 2025–2026', sub_en: 'Nguyen Du HS — Academic Year 2025–2026' },
      teachers: { vi: 'Quản lý giáo viên', en: 'Teacher Management' },
      classes: { vi: 'Lớp học', en: 'Classes' },
      reports: { vi: 'Báo cáo', en: 'Reports' },
      notifications: { vi: 'Thông báo', en: 'Notifications' },
      settings: { vi: 'Cài đặt trường', en: 'School Settings' },
    }
  };

  const info = (TITLES[role] || TITLES.teacher)[section] || {};
  const title = t(info.vi || section, info.en || section);
  const subtitle = t(info.sub_vi, info.sub_en);

  const renderContent = () => {
    if (role === 'principal') {
      if (section === 'dashboard') return <PrincipalDashboardHome lang={lang} t={t} pColor={pColor} />;
      if (section === 'teachers') return <PrincipalTeachersScreen lang={lang} t={t} pColor={pColor} />;
    }
    if (section === 'dashboard') return <TeacherDashboardHome lang={lang} t={t} pColor={pColor} onNavigate={onNavigate} />;
    if (section === 'grades') return <TeacherGrades lang={lang} t={t} pColor={pColor} />;
    if (section === 'classes') return <TeacherClasses lang={lang} t={t} pColor={pColor} />;
    if (section === 'students') return <TeacherStudents lang={lang} t={t} pColor={pColor} />;
    if (section === 'schedule') return <TeacherScheduleFull lang={lang} t={t} pColor={pColor} />;
    return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 60, textAlign: 'center', color: T.textMuted }}>
        <Icon name="settings" size={40} color={T.border} />
        <div style={{ marginTop: 12, fontSize: 14 }}>{title}</div>
      </div>
    );
  };

  const user = role === 'principal' ? MOCK.principal : MOCK.teacher;

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg }}>
      {/* This component just provides content — Sidebar/Header are rendered by App */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{title}</div>
                {subtitle && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
              </div>
              {(section === 'dashboard' || section === 'grades') && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="secondary" icon="download" size="sm">{t('Xuất Excel', 'Export Excel')}</Button>
                  <Button icon="plus" size="sm">{t('Thêm mới', 'Add New')}</Button>
                </div>
              )}
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// ── Principal Teachers Screen + Assignment Sheet ─────────────────────────────
// Route:   /admin/teachers (principal section)
// Role:    ADMIN / BGH
// Purpose: BGH manages TeachingAssignment records — GVCN (homeroom) for a class,
//          and GVBM (subject teacher) for each ClassSubject. ADR 0029.
// Note:    Lightweight quick-action UI; full TeachingAssignment management is
//          out of scope here (see NEW-06).

const PrincipalTeachersScreen = ({ lang, t, pColor }) => {
  // Lazy resolve seed data — loaded by subjects-data.jsx after this script
  const seedParents = window.SM_SEED_PARENTS || [];

  // All grade-scoped subjects grouped by parent, ACTIVE only.
  // Each item carries parent metadata for the grouped picker.
  const allSubjects = React.useMemo(() => {
    return seedParents.map(p => ({
      parentId: p.id,
      parentName: p.name,
      conceptType: p.conceptType,
      subjects: p.subjects.filter(s => s.status === 'ACTIVE'),
    })).filter(g => g.subjects.length > 0);
  }, [seedParents]);

  const [teachers, setTeachers] = React.useState(PRINCIPAL_TEACHERS);
  const [assignTeacherId, setAssignTeacherId] = React.useState(null);

  const assignTeacher = teachers.find(x => x.id === assignTeacherId) || null;

  const saveAssignments = (teacherId, next) => {
    setTeachers(list => list.map(x => x.id !== teacherId ? x : {
      ...x,
      gvcnClassId: next.gvcnClassId,
      assignments: next.assignments,
      // Recompute "classes" badges from the union of GVCN + GVBM class IDs.
      classes: [...new Set([next.gvcnClassId, ...next.assignments.map(a => a.classId)].filter(Boolean))],
    }));
    setAssignTeacherId(null);
  };

  return (
    <React.Fragment>
      {/* Summary + table */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{t('Danh sách giáo viên', 'Teacher List')}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
              {t('Bấm “Phân công lớp” để cập nhật GVCN và phân công bộ môn.', 'Click "Assign classes" to update homeroom and subject assignments.')}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
            <Icon name="userCheck" size={13} color={pColor} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
              {teachers.length} {t('giáo viên', 'teachers')}
            </span>
          </div>
          <Button icon="plus" size="sm">{t('Thêm giáo viên', 'Add teacher')}</Button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {[
                  t('Giáo viên', 'Teacher'),
                  t('Môn chính', 'Primary Subject'),
                  t('GVCN', 'Homeroom'),
                  t('Phân công bộ môn', 'Subject Assignments'),
                  t('Trạng thái', 'Status'),
                  '',
                ].map((h, i) => (
                  <th key={i} style={{ padding: '11px 20px', textAlign: i === 5 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teachers.map(tc => {
                const gvcnClass = PT_CLASS_LIST.find(c => c.id === tc.gvcnClassId);
                return (
                  <tr key={tc.id} style={{ borderTop: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar initials={tc.avatar} color={pColor} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{tc.name}</div>
                          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                            {tc.students} {t('học sinh', 'students')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: T.textSecondary, whiteSpace: 'nowrap' }}>
                      {t(tc.subject, tc.subjectEn)}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      {gvcnClass ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 4, background: T.success + '15', color: T.success, border: `1px solid ${T.success}33`, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                          <Icon name="users" size={11} color={T.success} /> {gvcnClass.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>{t('Chưa phân công', 'Unassigned')}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {tc.assignments.length === 0 ? (
                          <span style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>{t('Chưa có', 'None')}</span>
                        ) : (
                          tc.assignments.slice(0, 3).map(a => {
                            const cls = PT_CLASS_LIST.find(c => c.id === a.classId);
                            return (
                              <Badge key={a.id} color={pColor} style={{ fontSize: 10 }}>
                                {cls?.name?.replace('Lớp ', '') || a.classId}
                              </Badge>
                            );
                          })
                        )}
                        {tc.assignments.length > 3 && (
                          <Badge color={T.textMuted} style={{ fontSize: 10 }}>+{tc.assignments.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <Badge color={tc.status === 'active' ? T.success : T.warning}>
                        {tc.status === 'active' ? t('Đang dạy', 'Active') : t('Nghỉ phép', 'On Leave')}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setAssignTeacherId(tc.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 7,
                            border: `1.5px solid ${pColor}`, background: 'transparent',
                            color: pColor, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = pColor + '12'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          <Icon name="users" size={11} color="currentColor" />
                          {t('Phân công lớp', 'Assign classes')}
                        </button>
                        <button
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 7,
                            border: `1px solid ${T.border}`, background: 'transparent',
                            color: T.textSecondary, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.color = pColor; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; }}>
                          <Icon name="eye" size={11} color="currentColor" />
                          {t('Chi tiết', 'Details')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {assignTeacher && (
        <TeacherAssignmentSheet
          teacher={assignTeacher}
          subjectGroups={allSubjects}
          classList={PT_CLASS_LIST}
          classSubjectMap={PT_CLASS_SUBJECT_MAP}
          pColor={pColor} t={t}
          onClose={() => setAssignTeacherId(null)}
          onSave={(next) => saveAssignments(assignTeacher.id, next)}
        />
      )}
    </React.Fragment>
  );
};

// ── Assignment Sheet ──────────────────────────────────────────────────────────

const TeacherAssignmentSheet = ({ teacher, subjectGroups, classList, classSubjectMap, pColor, t, onClose, onSave }) => {
  const [gvcnClassId, setGvcnClassId] = React.useState(teacher.gvcnClassId || '');
  const [assignments, setAssignments] = React.useState(() => teacher.assignments.map(a => ({ ...a })));
  const [openPicker, setOpenPicker] = React.useState(null); // { rowId, kind: 'class'|'subject' }

  const lookupClass = (id) => classList.find(c => c.id === id);
  const lookupSubject = (id) => {
    for (const g of subjectGroups) {
      const s = g.subjects.find(x => x.id === id);
      if (s) return { ...s, parentName: g.parentName };
    }
    return null;
  };

  const addRow = () => {
    setAssignments(a => [...a, { id: ptNewId('as'), classId: '', subjectId: '' }]);
  };
  const updateRow = (rowId, patch) => {
    setAssignments(a => a.map(r => r.id !== rowId ? r : { ...r, ...patch }));
    setOpenPicker(null);
  };
  const removeRow = (rowId) => setAssignments(a => a.filter(r => r.id !== rowId));

  const handleSave = () => onSave({ gvcnClassId: gvcnClassId || null, assignments });

  // ── Render ──
  return (
    <React.Fragment>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20, 30, 50, 0.45)', zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '100vw',
        background: T.card, boxShadow: '-12px 0 40px rgba(0,0,0,0.18)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', fontFamily: 'inherit',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar initials={teacher.avatar} color={pColor} size={42} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{teacher.name}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                {t('Phân công lớp & bộ môn', 'Class & subject assignments')}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 7, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="x" size={16} color={T.textMuted} />
            </button>
          </div>

          {/* Current summary chips */}
          <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              <span style={{ fontWeight: 700, color: T.textSecondary }}>{t('GVCN', 'Homeroom')}: </span>
              {teacher.gvcnClassId ? (lookupClass(teacher.gvcnClassId)?.name || teacher.gvcnClassId) : t('chưa có', 'none')}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted }}>
              <span style={{ fontWeight: 700, color: T.textSecondary }}>{t('Bộ môn hiện tại', 'Current GVBM')}: </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{teacher.assignments.length}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
          {/* Section A — GVCN */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: T.success + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="users" size={14} color={T.success} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>
                  {t('Giáo viên chủ nhiệm', 'Homeroom Teacher (GVCN)')}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>
                  {t('Một giáo viên chỉ chủ nhiệm tối đa một lớp.', 'A teacher can be homeroom for at most one class.')}
                </div>
              </div>
            </div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
              {t('Lớp chủ nhiệm (GVCN)', 'Homeroom class (GVCN)')}
            </label>
            <div style={{ position: 'relative' }}>
              <select value={gvcnClassId} onChange={e => setGvcnClassId(e.target.value)}
                style={{
                  width: '100%', padding: '11px 36px 11px 14px', borderRadius: 9,
                  border: `1.5px solid ${T.border}`, fontSize: 13.5, fontFamily: 'inherit',
                  outline: 'none', color: T.textPrimary, background: '#fff',
                  appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', boxSizing: 'border-box',
                }}>
                <option value="">{t('— Không chủ nhiệm —', '— No homeroom —')}</option>
                {classList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 14, top: 32, pointerEvents: 'none', display: 'flex' }}>
                <Icon name="chevronDown" size={13} color={T.textMuted} />
              </div>
            </div>
          </div>

          {/* Section B — GVBM list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: pColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bookOpen" size={14} color={pColor} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: T.textPrimary }}>
                  {t('Phân công bộ môn (GVBM)', 'Subject Assignments (GVBM)')}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted }}>
                  {t('Chọn lớp trước; chỉ các môn đã có tiết học sẽ chọn được.', 'Pick a class first; only subjects with class-subject rows are selectable.')}
                </div>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', border: `1.5px dashed ${T.border}`, borderRadius: 10, background: T.bg, marginBottom: 12 }}>
                <Icon name="bookOpen" size={22} color={T.textMuted} strokeWidth={1.5} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginTop: 8 }}>
                  {t('Chưa có phân công', 'No assignments yet')}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, lineHeight: 1.5 }}>
                  {t('Bấm "Thêm phân công" để bắt đầu.', 'Click "Add assignment" to begin.')}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {assignments.map((row, idx) => (
                  <AssignmentRow key={row.id} row={row} index={idx}
                    classList={classList} subjectGroups={subjectGroups} classSubjectMap={classSubjectMap}
                    openPicker={openPicker} setOpenPicker={setOpenPicker}
                    onChange={(patch) => updateRow(row.id, patch)}
                    onRemove={() => removeRow(row.id)}
                    pColor={pColor} t={t}
                    lookupClass={lookupClass} lookupSubject={lookupSubject} />
                ))}
              </div>
            )}

            <button onClick={addRow}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', border: `1px dashed ${pColor}`, background: pColor + '08',
                color: pColor, borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = pColor + '14'}
              onMouseLeave={e => e.currentTarget.style.background = pColor + '08'}>
              <Icon name="plus" size={13} color={pColor} strokeWidth={2.4} />
              {t('Thêm phân công', 'Add assignment')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, background: T.bg, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <Button variant="ghost" onClick={onClose}>{t('Hủy', 'Cancel')}</Button>
          <Button onClick={handleSave} icon="check">
            {t('Lưu phân công', 'Save assignments')}
          </Button>
        </div>
      </div>
    </React.Fragment>
  );
};

// One row in the GVBM list. Custom picker (not native select) because subjects
// need to be grouped by bộ môn and selectively greyed out per ADR 0037.
const AssignmentRow = ({ row, index, classList, subjectGroups, classSubjectMap, openPicker, setOpenPicker, onChange, onRemove, pColor, t, lookupClass, lookupSubject }) => {
  const cls = lookupClass(row.classId);
  const subj = lookupSubject(row.subjectId);

  const classPickerOpen = openPicker?.rowId === row.id && openPicker?.kind === 'class';
  const subjPickerOpen  = openPicker?.rowId === row.id && openPicker?.kind === 'subject';

  // Determine subject availability: enabled if classSubjectMap[subjectId] includes selected classId.
  const isSubjectEnabled = (sid) => row.classId
    ? (classSubjectMap[sid] || []).includes(row.classId)
    : false;

  // For grade-coherence, also surface a soft "wrong grade" warning when the
  // selected subject's gradeLevel doesn't match the class grade.
  const gradeMismatch = cls && subj && subj.gradeLevel !== cls.gradeLevel;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 30px', gap: 8, alignItems: 'flex-start',
      padding: 10, background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`,
    }}>
      {/* Class picker */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          {t('Lớp', 'Class')}
        </div>
        <button onClick={() => setOpenPicker(classPickerOpen ? null : { rowId: row.id, kind: 'class' })}
          style={pickerButtonStyle(pColor, cls)}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cls ? cls.name : t('Chọn lớp…', 'Pick class…')}
          </span>
          <Icon name="chevronDown" size={12} color={T.textMuted} />
        </button>
        {classPickerOpen && (
          <div style={pickerMenuStyle}>
            {classList.map(c => (
              <button key={c.id} onClick={() => onChange({ classId: c.id, subjectId: row.subjectId && isSubjectEnabledFor(c.id, row.subjectId, classSubjectMap) ? row.subjectId : '' })}
                style={pickerItemStyle(c.id === row.classId, pColor)}>
                <Icon name="users" size={12} color={c.id === row.classId ? pColor : T.textMuted} />
                <span style={{ flex: 1, textAlign: 'left' }}>{c.name}</span>
                <span style={{ fontSize: 10, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {t('K', 'G')}{c.gradeLevel}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Subject picker (grouped, with disabled state) */}
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          {t('Môn học', 'Subject')}
        </div>
        <button onClick={() => row.classId && setOpenPicker(subjPickerOpen ? null : { rowId: row.id, kind: 'subject' })}
          disabled={!row.classId}
          title={!row.classId ? t('Chọn lớp trước', 'Pick a class first') : undefined}
          style={{
            ...pickerButtonStyle(pColor, subj),
            opacity: !row.classId ? 0.55 : 1,
            cursor: !row.classId ? 'not-allowed' : 'pointer',
          }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subj ? subj.name : (row.classId ? t('Chọn môn…', 'Pick subject…') : t('Chọn lớp trước', 'Pick class first'))}
          </span>
          <Icon name="chevronDown" size={12} color={T.textMuted} />
        </button>
        {subjPickerOpen && row.classId && (
          <div style={{ ...pickerMenuStyle, maxHeight: 280 }}>
            {subjectGroups.map(g => (
              <div key={g.parentId}>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', background: T.bg, borderTop: `1px solid ${T.border}` }}>
                  {g.parentName}
                </div>
                {g.subjects.map(s => {
                  const enabled = isSubjectEnabled(s.id);
                  return (
                    <div key={s.id} style={{ position: 'relative' }}>
                      <button disabled={!enabled}
                        onClick={() => enabled && onChange({ subjectId: s.id })}
                        title={!enabled ? t('Chưa có tiết học — thêm môn vào lớp trước.', 'No class-subject — add the subject to this class first.') : undefined}
                        style={{
                          ...pickerItemStyle(s.id === row.subjectId, pColor),
                          opacity: enabled ? 1 : 0.45,
                          cursor: enabled ? 'pointer' : 'not-allowed',
                        }}>
                        <Icon name="bookOpen" size={12} color={s.id === row.subjectId ? pColor : T.textMuted} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{s.name}</span>
                        {!enabled && (
                          <span style={{ fontSize: 10, color: T.textMuted, fontStyle: 'italic' }}>
                            {t('chưa có tiết', 'no class')}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        {gradeMismatch && (
          <div style={{ marginTop: 5, fontSize: 10.5, color: T.warning, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="alertTriangle" size={11} color={T.warning} />
            {t(`Môn lớp ${subj.gradeLevel} không khớp khối ${cls.gradeLevel}`, `Grade ${subj.gradeLevel} subject doesn't match class grade ${cls.gradeLevel}`)}
          </div>
        )}
      </div>

      {/* Delete */}
      <button onClick={onRemove}
        title={t('Xoá phân công', 'Remove assignment')}
        style={{
          marginTop: 18, width: 30, height: 30, borderRadius: 7,
          border: `1px solid ${T.border}`, background: 'transparent',
          color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.error; e.currentTarget.style.color = T.error; e.currentTarget.style.background = T.errorLight; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent'; }}>
        <Icon name="x" size={13} color="currentColor" />
      </button>
    </div>
  );
};

const isSubjectEnabledFor = (classId, subjectId, classSubjectMap) =>
  (classSubjectMap[subjectId] || []).includes(classId);

const pickerButtonStyle = (pColor, hasValue) => ({
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
  padding: '8px 11px', borderRadius: 8,
  border: `1.5px solid ${T.border}`, background: '#fff',
  fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
  color: hasValue ? T.textPrimary : T.textMuted,
  fontWeight: hasValue ? 700 : 500, transition: 'border-color 0.15s',
  boxSizing: 'border-box',
});

const pickerMenuStyle = {
  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
  background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 70, maxHeight: 240, overflowY: 'auto',
  padding: 4,
};

const pickerItemStyle = (active, pColor) => ({
  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
  padding: '7px 10px', borderRadius: 6, border: 'none',
  background: active ? pColor + '14' : 'transparent',
  color: active ? pColor : T.textPrimary,
  fontSize: 12.5, fontWeight: active ? 700 : 500, fontFamily: 'inherit', textAlign: 'left',
});

Object.assign(window, { TeacherScreen, PrincipalTeachersScreen, TeacherAssignmentSheet });