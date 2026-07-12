// ── Student LMS & Parent Screen ──────────────────────────────────────────────

const COURSES = [
  { id: 1, name: 'Toán học', nameEn: 'Mathematics', teacher: 'Nguyễn Thị Hương', teacherEn: 'Nguyen Thi Huong', progress: 78, color: T.primary, icon: 'percent', lessons: 18, total: 24, grade: 8.5, nextLesson: 'Đạo hàm và vi phân', nextLessonEn: 'Derivatives & Differentials' },
  { id: 2, name: 'Vật Lý', nameEn: 'Physics', teacher: 'Trần Văn Minh', teacherEn: 'Tran Van Minh', progress: 65, color: T.success, icon: 'trendUp', lessons: 14, total: 22, grade: 9.0, nextLesson: 'Điện từ trường', nextLessonEn: 'Electromagnetic Fields' },
  { id: 3, name: 'Hóa Học', nameEn: 'Chemistry', teacher: 'Lê Thị Hoa', teacherEn: 'Le Thi Hoa', progress: 52, color: T.warning, icon: 'star', lessons: 12, total: 22, grade: 7.5, nextLesson: 'Phản ứng oxi hoá khử', nextLessonEn: 'Redox Reactions' },
  { id: 4, name: 'Ngữ Văn', nameEn: 'Literature', teacher: 'Phạm Quốc Bảo', teacherEn: 'Pham Quoc Bao', progress: 88, color: T.purple, icon: 'book', lessons: 20, total: 24, grade: 8.0, nextLesson: 'Tác phẩm Truyện Kiều', nextLessonEn: 'The Tale of Kieu' },
  { id: 5, name: 'Tiếng Anh', nameEn: 'English', teacher: 'Đỗ Thị Mai', teacherEn: 'Do Thi Mai', progress: 71, color: T.teal, icon: 'message', lessons: 16, total: 24, grade: 8.8, nextLesson: 'Advanced Reading Skills', nextLessonEn: 'Advanced Reading Skills' },
  { id: 6, name: 'Lịch Sử', nameEn: 'History', teacher: 'Hoàng Văn Nam', teacherEn: 'Hoang Van Nam', progress: 43, color: T.error, icon: 'fileText', lessons: 10, total: 24, grade: 7.2, nextLesson: 'Chiến tranh thế giới II', nextLessonEn: 'World War II' },
];

const ASSIGNMENTS = [
  { id: 1, title: 'Bài tập Đại số tuyến tính #12', titleEn: 'Linear Algebra Homework #12', subject: 'Toán học', subjectEn: 'Mathematics', color: T.primary, due: '27/04/2026', daysLeft: 1, type: 'homework', typeEn: 'Homework', status: 'pending' },
  { id: 2, title: 'Essay: The role of technology in education', titleEn: 'Essay: The role of technology in education', subject: 'Tiếng Anh', subjectEn: 'English', color: T.teal, due: '29/04/2026', daysLeft: 3, type: 'essay', typeEn: 'Essay', status: 'pending' },
  { id: 3, title: 'Báo cáo thí nghiệm Điện phân', titleEn: 'Electrolysis Lab Report', subject: 'Hóa Học', subjectEn: 'Chemistry', color: T.warning, due: '01/05/2026', daysLeft: 5, type: 'report', typeEn: 'Report', status: 'pending' },
  { id: 4, title: 'Phân tích đoạn trích Truyện Kiều', titleEn: 'Kieu Story Excerpt Analysis', subject: 'Ngữ Văn', subjectEn: 'Literature', color: T.purple, due: '20/04/2026', daysLeft: -6, type: 'essay', typeEn: 'Essay', status: 'submitted' },
  { id: 5, title: 'Bài tập Điện từ trường', titleEn: 'EM Fields Worksheet', subject: 'Vật Lý', subjectEn: 'Physics', color: T.success, due: '18/04/2026', daysLeft: -8, type: 'homework', typeEn: 'Homework', status: 'graded', grade: 9.0 },
];

const GRADE_DATA = [
  { subject: 'Toán học', subjectEn: 'Mathematics', color: T.primary, scores: { oral: 9, quiz15: 8, test45: 8.5, midterm: 8.0 }, avg: 8.5, rank: 5 },
  { subject: 'Vật Lý', subjectEn: 'Physics', color: T.success, scores: { oral: 9, quiz15: 9, test45: 9.0, midterm: 9.0 }, avg: 9.0, rank: 2 },
  { subject: 'Hóa Học', subjectEn: 'Chemistry', color: T.warning, scores: { oral: 7, quiz15: 8, test45: 7.0, midterm: 7.5 }, avg: 7.5, rank: 18 },
  { subject: 'Ngữ Văn', subjectEn: 'Literature', color: T.purple, scores: { oral: 8, quiz15: 8, test45: 8.0, midterm: 8.0 }, avg: 8.0, rank: 8 },
  { subject: 'Tiếng Anh', subjectEn: 'English', color: T.teal, scores: { oral: 9, quiz15: 9, test45: 8.5, midterm: 9.0 }, avg: 8.8, rank: 3 },
  { subject: 'Lịch Sử', subjectEn: 'History', color: T.error, scores: { oral: 7, quiz15: 7, test45: 7.0, midterm: 7.5 }, avg: 7.2, rank: 14 },
];

const RESOURCES = [
  { name: 'Giáo trình Toán 11 – Tập 2', nameEn: 'Math 11 Textbook Vol.2', type: 'PDF', subject: 'Toán học', size: '12.4 MB', color: T.primary },
  { name: 'Bài giảng Điện từ trường (slide)', nameEn: 'EM Fields Lecture Slides', type: 'PPTX', subject: 'Vật Lý', size: '8.1 MB', color: T.success },
  { name: 'Đề thi thử Hóa THPT 2025', nameEn: 'Chemistry Mock Exam 2025', type: 'PDF', subject: 'Hóa Học', size: '3.2 MB', color: T.warning },
  { name: 'Danh sách từ vựng Unit 7–10', nameEn: 'Vocabulary List Unit 7–10', type: 'DOCX', subject: 'Tiếng Anh', size: '1.8 MB', color: T.teal },
  { name: 'Sơ đồ tư duy Lịch Sử thế giới', nameEn: 'World History Mind Map', type: 'PDF', subject: 'Lịch Sử', size: '5.6 MB', color: T.error },
];

// ── Student sub-views ─────────────────────────────────────────────────────────

const StudentHome = ({ lang, t, pColor, onNavigate, onCourseSelect }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      <StatCard icon="award" iconColor={pColor} label={t('Điểm TB học kỳ', 'Semester GPA')} value="8.5/10" trend={3.2} trendLabel={t('so HK trước', 'vs last sem.')} lang={lang} />
      <StatCard icon="bookOpen" iconColor={T.success} label={t('Khoá học đang học', 'Active Courses')} value="6" lang={lang} />
      <StatCard icon="clipboard" iconColor={T.warning} label={t('Bài tập sắp đến hạn', 'Due Assignments')} value="3" lang={lang} />
      <StatCard icon="percent" iconColor={T.purple} label={t('Chuyên cần', 'Attendance')} value="95%" trend={1.4} trendLabel={t('so tháng trước', 'vs last month')} lang={lang} />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
      {/* Course progress */}
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Tiến độ khoá học', 'Course Progress')}</div>
          <button onClick={() => onNavigate('courses')} style={{ background: 'none', border: 'none', color: pColor, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('Xem tất cả →', 'View all →')}</button>
        </div>
        <div style={{ padding: '8px 0' }}>
          {COURSES.map((c, i) => (
            <div key={i} onClick={() => onCourseSelect(c)} style={{ padding: '10px 24px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{lang === 'en' ? c.nameEn : c.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>{c.lessons}/{c.total} {t('tiết', 'lessons')}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{c.progress}%</span>
                </div>
              </div>
              <ProgressBar value={c.progress} color={c.color} height={5} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Upcoming assignments */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Bài tập sắp hết hạn', 'Due Soon')}</div>
            <Badge color={T.warning}>3</Badge>
          </div>
          {ASSIGNMENTS.filter(a => a.status === 'pending').map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 20px', borderBottom: i < 1 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.daysLeft <= 1 ? T.error : a.daysLeft <= 3 ? T.warning : T.success, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lang === 'en' ? a.titleEn : a.title}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{lang === 'en' ? a.subjectEn : a.subject} · {a.due}</div>
              </div>
              <Badge color={a.daysLeft <= 1 ? T.error : a.daysLeft <= 3 ? T.warning : T.success} style={{ flexShrink: 0, fontSize: 10 }}>
                {a.daysLeft <= 0 ? t('Quá hạn', 'Overdue') : `${a.daysLeft}d`}
              </Badge>
            </div>
          ))}
        </div>

        {/* Recent grades */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Điểm gần đây', 'Recent Grades')}</div>
          </div>
          {GRADE_DATA.slice(0, 4).map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: i < 3 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: g.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{lang === 'en' ? g.subjectEn : g.subject}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{t(`Hạng ${g.rank}/36 lớp`, `Rank ${g.rank}/36`)}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: g.avg >= 8.5 ? T.success : g.avg >= 7 ? pColor : T.error }}>{g.avg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Seed: full lesson breakdown for the lesson player. Keyed by course.id.
// Only Toán lớp 10 (id 1) is wired with content; other courses fall through
// to the empty state "Giáo viên chưa tải lên nội dung…".
const COURSE_LESSONS = {
  1: {
    chapters: [
      {
        id: 'ch1',
        vi: 'Chương 1 — Mệnh đề & Tập hợp',
        en: 'Chapter 1 — Statements & Sets',
        lessons: [
          {
            id: 'l1', n: 1, type: 'video',
            vi: 'Bài 1: Mệnh đề toán học',
            en: 'Lesson 1: Mathematical statements',
            duration: '32 phút', durationEn: '32 min',
            done: true,
          },
          {
            id: 'l2', n: 2, type: 'video',
            vi: 'Bài 2: Tập hợp & các phép toán',
            en: 'Lesson 2: Sets & operations',
            duration: '28 phút', durationEn: '28 min',
            done: false, active: true,
          },
          {
            id: 'l3', n: 3, type: 'pdf',
            vi: 'Bài 3: Tài liệu ôn tập chương I',
            en: 'Lesson 3: Chapter I review handout',
            duration: '12 trang', durationEn: '12 pages',
            done: false,
          },
        ],
      },
      {
        id: 'ch2',
        vi: 'Chương 2 — Bất phương trình & Hệ',
        en: 'Chapter 2 — Inequalities & Systems',
        lessons: [], empty: true,
      },
    ],
  },
};

const StudentCourses = ({ lang, t, pColor, onCourseSelect }) => {
  const [filter, setFilter] = React.useState('all');
  const isActive = (c) => c.progress > 0 && c.progress < 100;
  const isDone = (c) => c.progress >= 100;
  const tabs = [
    { id: 'all', vi: 'Tất cả', en: 'All', count: COURSES.length },
    { id: 'active', vi: 'Đang học', en: 'In progress', count: COURSES.filter(isActive).length },
    { id: 'done', vi: 'Hoàn thành', en: 'Completed', count: COURSES.filter(isDone).length },
  ];
  const list = filter === 'active' ? COURSES.filter(isActive)
            : filter === 'done'   ? COURSES.filter(isDone)
            : COURSES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setFilter(tab.id)}
            style={{
              padding: '7px 14px', borderRadius: 99,
              border: `1.5px solid ${filter === tab.id ? pColor : T.border}`,
              background: filter === tab.id ? pColor : T.card,
              color: filter === tab.id ? '#fff' : T.textSecondary,
              fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
            {t(tab.vi, tab.en)}
            <span style={{
              background: filter === tab.id ? 'rgba(255,255,255,0.22)' : T.bg,
              color: filter === tab.id ? '#fff' : T.textMuted,
              borderRadius: 99, padding: '1px 7px', fontSize: 10.5, minWidth: 16,
              textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 48, textAlign: 'center', color: T.textMuted }}>
          <Icon name="bookOpen" size={32} color={T.border} />
          <div style={{ marginTop: 8, fontSize: 13 }}>{t('Không có khoá học nào trong mục này.', 'No courses in this filter.')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {list.map((c) => {
            const started = c.progress > 0;
            return (
              <div key={c.id} onClick={() => onCourseSelect(c)}
                style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ height: 8, background: c.color }} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginBottom: 3 }}>{lang === 'en' ? c.nameEn : c.name}</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted }}>{lang === 'en' ? c.teacherEn : c.teacher}</div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={c.icon} size={18} color={c.color} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <div style={{ flex: 1, background: T.bg, borderRadius: 7, padding: '7px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{c.grade}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{t('Điểm TB', 'Grade')}</div>
                    </div>
                    <div style={{ flex: 1, background: T.bg, borderRadius: 7, padding: '7px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{c.lessons}/{c.total}</div>
                      <div style={{ fontSize: 10, color: T.textMuted }}>{t('Tiết học', 'Lessons')}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: T.textMuted }}>{t('Tiến độ', 'Progress')}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.progress}%</span>
                    </div>
                    <ProgressBar value={c.progress} color={c.color} />
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); onCourseSelect(c); }}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8,
                      border: `1.5px solid ${c.color}`,
                      background: started ? '#fff' : c.color,
                      color: started ? c.color : '#fff',
                      fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                    <Icon name={started ? 'play' : 'plus'} size={12} color={started ? c.color : '#fff'} strokeWidth={2.4} />
                    {started ? t('Tiếp tục học', 'Continue') : t('Bắt đầu', 'Start')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Lesson body variants (video / pdf / text) ──────────────────────────────

const LessonBody = ({ lesson, course, lang, t, pColor }) => {
  if (!lesson) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
        <Icon name="bookOpen" size={42} color={T.border} strokeWidth={1.6} />
        <div style={{ marginTop: 12 }}>{t('Giáo viên chưa tải lên nội dung cho khoá học này.', "Teacher hasn't uploaded content for this course yet.")}</div>
      </div>
    );
  }
  if (lesson.type === 'video') {
    return (
      <div style={{ background: '#0f1117', aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${course.color}22 0%, transparent 60%)` }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(255,255,255,0.3)', cursor: 'pointer',
          }}>
            <Icon name="play" size={26} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
            {t('Video bài giảng', 'Lecture video')} · {lang === 'en' ? lesson.durationEn : lesson.duration}
          </div>
        </div>
        {/* Faux player chrome */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <div style={{ width: '34%', height: '100%', background: course.color }} />
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
            10:48 / {lang === 'en' ? lesson.durationEn : lesson.duration}
          </div>
        </div>
      </div>
    );
  }
  if (lesson.type === 'pdf' || lesson.type === 'document') {
    return (
      <div style={{ background: T.bg, padding: '52px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: 16, background: T.errorLight, marginBottom: 14 }}>
          <Icon name="fileText" size={36} color={T.error} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{t('Tài liệu bài giảng', 'Lecture handout')}</div>
        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>PDF · {lang === 'en' ? lesson.durationEn : lesson.duration}</div>
        <button style={{
          marginTop: 16, padding: '9px 18px', background: pColor, color: '#fff', border: 'none',
          borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="download" size={13} color="#fff" strokeWidth={2.4} />
          {t('Tải xuống', 'Download')}
        </button>
      </div>
    );
  }
  // text
  return (
    <div style={{ padding: '24px 28px', color: T.textPrimary, lineHeight: 1.7, fontSize: 13.5 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 8px' }}>{t('Khái niệm', 'Core concept')}</h3>
      <p style={{ margin: '0 0 12px', color: T.textSecondary }}>
        {t('Một mệnh đề toán học là một khẳng định có giá trị chân lý xác định — đúng hoặc sai, nhưng không thể đồng thời cả hai.',
           'A mathematical statement is an assertion with a definite truth value — either true or false, but never both.')}
      </p>
      <h3 style={{ fontSize: 15, fontWeight: 800, margin: '14px 0 8px' }}>{t('Ví dụ', 'Examples')}</h3>
      <p style={{ margin: '0 0 4px', color: T.textSecondary }}>{t('• “Số 7 là số nguyên tố” — mệnh đề đúng.', '• “7 is a prime number” — true.')}</p>
      <p style={{ margin: '0', color: T.textSecondary }}>{t('• “Trái Đất phẳng” — mệnh đề sai.', '• “The Earth is flat” — false.')}</p>
    </div>
  );
};

const lessonTypeMeta = (type, t) => (
  type === 'video'    ? { icon: 'play',     label: t('Video', 'Video') } :
  type === 'pdf'      ? { icon: 'fileText', label: 'PDF' } :
  type === 'document' ? { icon: 'fileText', label: 'DOC' } :
                        { icon: 'fileText', label: t('Văn bản', 'Text') }
);

const LessonPlayer = ({ course, lang, t, pColor, onBack }) => {
  const data = COURSE_LESSONS[course.id];
  const allLessons = (data?.chapters || []).flatMap(c => c.lessons.map(l => ({ ...l, _chapterId: c.id, _chapter: c })));
  const initialActive = allLessons.find(l => l.active) || allLessons.find(l => !l.done) || allLessons[0];
  const [activeId, setActiveId]   = React.useState(initialActive?.id);
  const [collapsed, setCollapsed] = React.useState({});
  const [tab, setTab]             = React.useState('notes');
  const [note, setNote]           = React.useState('');

  const active = allLessons.find(l => l.id === activeId);
  const activeChapter = active?._chapter;
  const total = allLessons.length;
  const done  = allLessons.filter(l => l.done).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const idx = allLessons.findIndex(l => l.id === activeId);
  const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

  const courseName = lang === 'en' ? course.nameEn : course.name;
  const lessonName = active ? (lang === 'en' ? active.en : active.vi) : t('Chọn bài học', 'Pick a lesson');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          <Icon name="chevronLeft" size={12} color={T.textMuted} strokeWidth={2.3} />
          {t('Khoá học', 'Courses')}
        </button>
        <Icon name="chevronRight" size={11} color={T.textMuted} />
        <span style={{ color: T.textSecondary, fontWeight: 600 }}>{courseName}</span>
        <Icon name="chevronRight" size={11} color={T.textMuted} />
        <span style={{ color: T.textPrimary, fontWeight: 700 }}>{lessonName}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 18, alignItems: 'flex-start' }}>
        {/* ── LEFT pane (60%): content + tabs ─────────────────────────────────── */}
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Lesson header */}
          <div style={{ padding: '14px 22px 12px' }}>
            {activeChapter && (
              <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t(activeChapter.vi, activeChapter.en)}
              </div>
            )}
            <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginTop: 3 }}>
              {lessonName}
            </div>
          </div>

          <LessonBody lesson={active} course={course} lang={lang} t={t} pColor={pColor} />

          {/* Tabs: Ghi chú | Hỏi & Đáp */}
          <div style={{ borderTop: `1px solid ${T.border}`, padding: '0 22px' }}>
            <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}` }}>
              {[
                { id: 'notes', vi: 'Ghi chú', en: 'Notes' },
                { id: 'qna',   vi: 'Hỏi & Đáp', en: 'Q & A' },
              ].map(x => (
                <button key={x.id} onClick={() => setTab(x.id)}
                  style={{
                    padding: '12px 16px', background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${tab === x.id ? pColor : 'transparent'}`,
                    marginBottom: -1, fontSize: 12.5,
                    fontWeight: tab === x.id ? 700 : 600,
                    color: tab === x.id ? pColor : T.textMuted,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {t(x.vi, x.en)}
                </button>
              ))}
            </div>
            <div style={{ padding: '16px 0 20px' }}>
              {tab === 'notes' ? (
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder={t('Ghi chú của bạn…', 'Your notes…')}
                  style={{
                    width: '100%', minHeight: 96, padding: '10px 12px',
                    borderRadius: 8, border: `1px solid ${T.border}`,
                    fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: T.textPrimary,
                    background: '#fff', outline: 'none', boxSizing: 'border-box', lineHeight: 1.55,
                  }} />
              ) : (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                  <Icon name="message" size={28} color={T.border} strokeWidth={1.7} />
                  <div style={{ marginTop: 8 }}>{t('Chưa có câu hỏi nào cho bài học này.', 'No questions yet for this lesson.')}</div>
                  <button style={{
                    marginTop: 10, padding: '7px 14px', background: 'transparent', border: `1.5px solid ${T.border}`,
                    borderRadius: 8, color: T.textSecondary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {t('Đặt câu hỏi', 'Ask a question')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT pane (40%): progress + lesson list ───────────────────────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Progress card */}
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('Tiến độ', 'Progress')}
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: pct >= 100 ? T.success : course.color, fontVariantNumeric: 'tabular-nums' }}>
                {done}/{total} {t('bài', 'lessons')} · {pct}%
              </div>
            </div>
            <ProgressBar value={pct} color={pct >= 100 ? T.success : course.color} height={6} />
          </div>

          {/* Lesson list */}
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {(!data || data.chapters.length === 0) ? (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
                <Icon name="bookOpen" size={28} color={T.border} strokeWidth={1.7} />
                <div style={{ marginTop: 8, lineHeight: 1.5 }}>
                  {t('Giáo viên chưa tải lên nội dung cho khoá học này.', "Teacher hasn't uploaded content for this course yet.")}
                </div>
              </div>
            ) : data.chapters.map((ch, ci) => {
              const isCollapsed = !!collapsed[ch.id];
              const chDone  = ch.lessons.filter(l => l.done).length;
              const chTotal = ch.lessons.length;
              return (
                <div key={ch.id} style={{ borderTop: ci > 0 ? `1px solid ${T.border}` : 'none' }}>
                  <button onClick={() => setCollapsed(s => ({ ...s, [ch.id]: !s[ch.id] }))}
                    style={{
                      width: '100%', padding: '11px 16px', background: T.bg,
                      border: 'none', borderBottom: isCollapsed || ch.empty ? 'none' : `1px solid ${T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                      <Icon name={isCollapsed ? 'chevronRight' : 'chevronDown'} size={11} color={T.textMuted} strokeWidth={2.4} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t(ch.vi, ch.en)}
                      </span>
                    </div>
                    {!ch.empty && (
                      <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {chDone}/{chTotal}
                      </span>
                    )}
                  </button>
                  {!isCollapsed && (ch.empty ? (
                    <div style={{ padding: '14px 18px', color: T.textMuted, fontSize: 11.5, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {t('Giáo viên chưa tải lên nội dung cho chương này.', "Teacher hasn't uploaded content for this chapter yet.")}
                    </div>
                  ) : ch.lessons.map((l, li) => {
                    const isActive = l.id === activeId;
                    const meta = lessonTypeMeta(l.type, t);
                    return (
                      <button key={l.id} onClick={() => setActiveId(l.id)}
                        style={{
                          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                          background: isActive ? course.color + '16' : 'transparent',
                          border: 'none',
                          borderBottom: li < ch.lessons.length - 1 ? `1px solid ${T.border}` : 'none',
                          padding: '11px 14px 11px 13px',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                        }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                          background: l.done ? T.success + '22' : isActive ? course.color + '20' : 'transparent',
                          border: l.done ? 'none' : `1.5px solid ${isActive ? course.color : T.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {l.done
                            ? <Icon name="check" size={11} color={T.success} strokeWidth={2.7} />
                            : <span style={{ fontSize: 10, color: isActive ? course.color : T.textMuted, fontWeight: 800 }}>{l.n}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12.5, fontWeight: isActive ? 700 : 600,
                            color: isActive ? course.color : l.done ? T.textSecondary : T.textPrimary,
                            lineHeight: 1.4,
                          }}>
                            {lang === 'en' ? l.en : l.vi}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10.5, color: T.textMuted }}>
                            <Icon name={meta.icon} size={11} color={T.textMuted} strokeWidth={2.2} />
                            <span style={{ fontWeight: 700, letterSpacing: '0.02em' }}>{meta.label}</span>
                            <span>·</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{lang === 'en' ? l.durationEn : l.duration}</span>
                          </div>
                        </div>
                      </button>
                    );
                  }))}
                </div>
              );
            })}

            {next && (
              <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, background: T.bg }}>
                <button onClick={() => setActiveId(next.id)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none',
                    background: course.color, color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {t('Tiếp theo', 'Next')}
                  <Icon name="chevronRight" size={13} color="#fff" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

const StudentAssignments = ({ lang, t, pColor }) => {
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? ASSIGNMENTS : ASSIGNMENTS.filter(a => a.status === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ id: 'all', vi: 'Tất cả', en: 'All' }, { id: 'pending', vi: 'Chưa nộp', en: 'Pending' }, { id: 'submitted', vi: 'Đã nộp', en: 'Submitted' }, { id: 'graded', vi: 'Đã chấm', en: 'Graded' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 16px', border: `1.5px solid ${filter === f.id ? pColor : T.border}`,
            borderRadius: 8, background: filter === f.id ? pColor : T.card, color: filter === f.id ? '#fff' : T.textSecondary,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{t(f.vi, f.en)}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((a, i) => (
          <div key={i} style={{ background: T.card, borderRadius: 12, border: `1px solid ${a.daysLeft <= 1 && a.status === 'pending' ? T.error + '40' : T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: a.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={a.type === 'homework' ? 'clipboard' : a.type === 'essay' ? 'fileText' : 'fileText'} size={20} color={a.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 3 }}>{lang === 'en' ? a.titleEn : a.title}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Badge color={a.color} style={{ fontSize: 10 }}>{lang === 'en' ? a.subjectEn : a.subject}</Badge>
                <span style={{ fontSize: 12, color: T.textMuted }}>{t('Hạn nộp:', 'Due:')} {a.due}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {a.status === 'graded' && <div style={{ fontSize: 20, fontWeight: 800, color: T.success, marginBottom: 2 }}>{a.grade}/10</div>}
              <Badge color={a.status === 'pending' ? (a.daysLeft <= 1 ? T.error : T.warning) : a.status === 'submitted' ? pColor : T.success}>
                {a.status === 'pending' ? (a.daysLeft <= 0 ? t('Quá hạn', 'Overdue') : t(`Còn ${a.daysLeft} ngày`, `${a.daysLeft}d left`)) : a.status === 'submitted' ? t('Đã nộp', 'Submitted') : t('Đã chấm', 'Graded')}
              </Badge>
              {a.status === 'pending' && <button style={{ display: 'block', marginTop: 6, padding: '5px 14px', background: pColor, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{t('Nộp bài', 'Submit')}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StudentGrades = ({ lang, t, pColor }) => {
  const cols = [t('KT Miệng', 'Oral'), t("KT 15'", "15-min"), t("KT 1 tiết", "45-min"), t('Giữa kỳ', 'Midterm')];
  const overallGPA = (GRADE_DATA.reduce((s, g) => s + g.avg, 0) / GRADE_DATA.length).toFixed(1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard icon="award" iconColor={pColor} label={t('Điểm TB học kỳ', 'Semester GPA')} value={overallGPA + '/10'} lang={lang} />
        <StatCard icon="trendUp" iconColor={T.success} label={t('Xếp hạng lớp', 'Class Rank')} value="4/36" lang={lang} />
        <StatCard icon="star" iconColor={T.warning} label={t('Môn học tốt nhất', 'Best Subject')} value={t('Vật Lý', 'Physics')} lang={lang} />
      </div>
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{t('Bảng điểm học kỳ I – Năm học 2025–2026', 'Semester I Grades — Academic Year 2025–2026')}</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: T.textMuted }}>{t('Môn học', 'Subject')}</th>
                {cols.map(c => <th key={c} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>{c}</th>)}
                <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>{t('Trung bình', 'Average')}</th>
                <th style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center' }}>{t('Xếp hạng', 'Rank')}</th>
              </tr>
            </thead>
            <tbody>
              {GRADE_DATA.map((g, i) => {
                const rank = g.avg >= 8.5 ? { label: t('Giỏi', 'Excellent'), color: T.success } : g.avg >= 7 ? { label: t('Khá', 'Good'), color: pColor } : { label: t('TB', 'Average'), color: T.warning };
                return (
                  <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{lang === 'en' ? g.subjectEn : g.subject}</span>
                      </div>
                    </td>
                    {Object.values(g.scores).map((sc, j) => (
                      <td key={j} style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: sc >= 8 ? T.success : sc < 5 ? T.error : T.textPrimary }}>{sc}</td>
                    ))}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: rank.color }}>{g.avg}</span>
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
    </div>
  );
};

const StudentResources = ({ lang, t, pColor }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
    {RESOURCES.map((r, i) => (
      <div key={i} style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 10, background: r.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="fileText" size={20} color={r.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? r.nameEn : r.name}</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
            <Badge color={r.color} style={{ fontSize: 10, marginRight: 6 }}>{r.type}</Badge>
            {r.subject} · {r.size}
          </div>
        </div>
        <button style={{ flexShrink: 0, padding: '7px 14px', background: r.color + '12', border: `1px solid ${r.color}30`, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: r.color, fontSize: 12, fontWeight: 600 }}>
          <Icon name="download" size={13} color={r.color} /> {t('Tải về', 'Download')}
        </button>
      </div>
    ))}
  </div>
);

// ── Parent Screen ─────────────────────────────────────────────────────────────
const ParentScreen = ({ section, lang, pColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [selectedChild, setSelectedChild] = React.useState(0);
  const children = [
    { name: 'Nguyễn Minh Khoa', class: '11A2', gpa: 8.5, attendance: '95%', avatar: 'NK', color: pColor },
    { name: 'Nguyễn Thu Hà', class: '8B1', gpa: 9.1, attendance: '98%', avatar: 'NH', color: T.success },
  ];
  const child = children[selectedChild];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Child selector */}
      <div style={{ display: 'flex', gap: 12 }}>
        {children.map((c, i) => (
          <button key={i} onClick={() => setSelectedChild(i)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
            borderRadius: 10, border: `2px solid ${selectedChild === i ? c.color : T.border}`,
            background: selectedChild === i ? c.color + '10' : T.card, cursor: 'pointer',
          }}>
            <Avatar initials={c.avatar} color={c.color} size={34} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{c.name}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{t(`Lớp ${c.class}`, `Class ${c.class}`)}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard icon="award" iconColor={child.color} label={t('GPA học kỳ', 'Semester GPA')} value={child.gpa + '/10'} lang={lang} />
        <StatCard icon="percent" iconColor={T.success} label={t('Chuyên cần', 'Attendance')} value={child.attendance} lang={lang} />
        <StatCard icon="clipboard" iconColor={T.warning} label={t('Bài tập sắp hạn', 'Assignments Due')} value="3" lang={lang} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <StudentGrades lang={lang} t={t} pColor={child.color} />
        <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 14 }}>{t('Thông báo từ trường', 'School Notifications')}</div>
          {NOTIF_DATA.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < 3 ? `1px solid ${T.border}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: n.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={n.icon} size={13} color={n.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: T.textPrimary, lineHeight: 1.4 }}>{t(n.vi, n.en)}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Student Screen ───────────────────────────────────────────────────────
const StudentScreen = ({ section, lang, primaryColor }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [selectedCourse, setSelectedCourse] = React.useState(null);
  const [currentSection, setCurrentSection] = React.useState(section);

  React.useEffect(() => { setCurrentSection(section); setSelectedCourse(null); }, [section]);

  const TITLES = {
    home: { vi: 'Tổng quan', en: 'Overview', sub_vi: 'Chào buổi sáng, Minh Khoa! 👋', sub_en: 'Good morning, Minh Khoa! 👋' },
    courses: { vi: 'Khoá học của tôi', en: 'My Courses', sub_vi: '6 môn học học kỳ I', sub_en: '6 subjects this semester' },
    assignments: { vi: 'Bài tập & Nộp bài', en: 'Assignments', sub_vi: '3 bài sắp đến hạn', sub_en: '3 assignments due soon' },
    grades: { vi: 'Điểm số', en: 'Grades', sub_vi: 'Học kỳ I – 2025/2026', sub_en: 'Semester I – 2025/2026' },
    schedule: { vi: 'Lịch học', en: 'Schedule' },
    resources: { vi: 'Tài nguyên học liệu', en: 'Learning Resources', sub_vi: `${RESOURCES.length} tài liệu`, sub_en: `${RESOURCES.length} files` },
  };

  const info = TITLES[currentSection] || {};
  const title = selectedCourse ? (lang === 'en' ? selectedCourse.nameEn : selectedCourse.name) : t(info.vi, info.en);
  const subtitle = selectedCourse ? t('Chi tiết khoá học', 'Course Detail') : t(info.sub_vi, info.sub_en);

  const renderContent = () => {
    if (selectedCourse) return <LessonPlayer course={selectedCourse} lang={lang} t={t} pColor={pColor} onBack={() => setSelectedCourse(null)} />;
    if (currentSection === 'home') return <StudentHome lang={lang} t={t} pColor={pColor} onNavigate={setCurrentSection} onCourseSelect={setSelectedCourse} />;
    if (currentSection === 'courses') return <StudentCourses lang={lang} t={t} pColor={pColor} onCourseSelect={setSelectedCourse} />;
    if (currentSection === 'assignments') return <StudentAssignments lang={lang} t={t} pColor={pColor} />;
    if (currentSection === 'grades') return <StudentGrades lang={lang} t={t} pColor={pColor} />;
    if (currentSection === 'resources') return <StudentResources lang={lang} t={t} pColor={pColor} />;
    // 'schedule' is handled by TimetableViewScreen at the app.jsx level, not here.
    return null;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{title}</div>
              {subtitle && <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
            </div>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

Object.assign(window, { StudentScreen, ParentScreen });
