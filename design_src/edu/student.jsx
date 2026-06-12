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

const StudentCourses = ({ lang, t, pColor, onCourseSelect }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
    {COURSES.map((c, i) => (
      <div key={i} onClick={() => onCourseSelect(c)}
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

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: T.textMuted }}>{t('Tiến độ', 'Progress')}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.progress}%</span>
            </div>
            <ProgressBar value={c.progress} color={c.color} />
          </div>

          <div style={{ paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.textMuted }}>{t('Bài tiếp theo:', 'Next lesson:')}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lang === 'en' ? c.nextLessonEn : c.nextLesson}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const CourseDetail = ({ course, lang, t, pColor, onBack }) => {
  const [activeTab, setActiveTab] = React.useState('lessons');
  const lessons = Array.from({ length: course.total }, (_, i) => ({
    n: i + 1,
    title: lang === 'en' ? `Lesson ${i + 1}: ${course.nextLessonEn}` : `Bài ${i + 1}: ${course.nextLesson}`,
    done: i < course.lessons,
    duration: `${35 + (i % 3) * 10} phút`,
  }));
  const tabs = [{ id: 'lessons', vi: 'Bài học', en: 'Lessons' }, { id: 'resources', vi: 'Tài liệu', en: 'Resources' }, { id: 'quiz', vi: 'Kiểm tra', en: 'Quizzes' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back + header */}
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>
        <Icon name="chevronLeft" size={14} color={T.textMuted} /> {t('Quay lại', 'Back')}
      </button>

      <div style={{ background: course.color, borderRadius: 12, padding: '28px 32px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative' }}>
          <Badge color="#fff" bg="rgba(255,255,255,0.2)" style={{ marginBottom: 10 }}>{t('Đang học', 'In Progress')}</Badge>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{lang === 'en' ? course.nameEn : course.name}</div>
          <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 20 }}>{lang === 'en' ? course.teacherEn : course.teacher}</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: t('Điểm TB', 'Grade'), value: course.grade + '/10' },
              { label: t('Tiến độ', 'Progress'), value: course.progress + '%' },
              { label: t('Bài học', 'Lessons'), value: `${course.lessons}/${course.total}` },
            ].map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{m.value}</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Video + tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Video placeholder */}
          <div style={{ background: '#0f1117', borderRadius: 12, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${course.color}22 0%, transparent 60%)` }} />
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid rgba(255,255,255,0.3)' }}>
              <Icon name="play" size={22} color="#fff" />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>{lang === 'en' ? course.nextLessonEn : course.nextLesson}</div>
              {t('Video bài giảng · 42 phút', 'Lecture video · 42 min')}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: '12px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? pColor : T.textMuted,
                  borderBottom: `2px solid ${activeTab === tab.id ? pColor : 'transparent'}`,
                  marginBottom: -1, transition: 'color 0.15s',
                }}>
                  {t(tab.vi, tab.en)}
                </button>
              ))}
            </div>
            <div style={{ padding: 16, maxHeight: 300, overflowY: 'auto' }}>
              {activeTab === 'resources' && RESOURCES.slice(0, 3).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: r.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="fileText" size={15} color={r.color} />
                  </div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>{lang === 'en' ? r.nameEn : r.name}</div><div style={{ fontSize: 11, color: T.textMuted }}>{r.type} · {r.size}</div></div>
                  <button style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}><Icon name="download" size={12} color={T.textSecondary} /></button>
                </div>
              ))}
              {activeTab === 'quiz' && <div style={{ padding: 20, textAlign: 'center', color: T.textMuted }}><Icon name="clipboard" size={32} color={T.border} /><div style={{ marginTop: 8, fontSize: 13 }}>{t('2 bài kiểm tra trong khoá học này', '2 quizzes in this course')}</div><button style={{ marginTop: 12, padding: '8px 20px', background: pColor, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{t('Bắt đầu kiểm tra', 'Start Quiz')}</button></div>}
              {activeTab === 'lessons' && lessons.slice(0, 8).map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 7 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: l.done ? T.success + '18' : T.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {l.done ? <Icon name="check" size={11} color={T.success} strokeWidth={2.5} /> : <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>{l.n}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: l.done ? 500 : 600, color: l.done ? T.textMuted : T.textPrimary, textDecoration: l.done ? 'line-through' : 'none' }}>
                      {lang === 'en' ? `Lesson ${l.n}` : `Bài ${l.n}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{l.duration}</span>
                  {!l.done && <button style={{ background: pColor, color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>▶</button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: progress + info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 14 }}>{t('Điểm số', 'Grades')}</div>
            {Object.entries({ oral: t('Kiểm tra miệng', 'Oral'), quiz15: t('KT 15 phút', '15-min Quiz'), test45: t('KT 1 tiết', '45-min Test'), midterm: t('Giữa kỳ', 'Midterm') }).map(([k, label]) => {
              const score = GRADE_DATA.find(g => g.subject === course.name)?.scores[k] || '—';
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 12, color: T.textMuted }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: score >= 8 ? T.success : score < 5 ? T.error : T.textPrimary }}>{score}</span>
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{t('Trung bình', 'Average')}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: course.color }}>{course.grade}/10</span>
            </div>
          </div>
          <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>{t('Thông tin giáo viên', 'Teacher Info')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Avatar initials={course.teacher.split(' ').slice(-1)[0][0] + course.teacher.split(' ')[1][0]} color={course.color} size={38} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{lang === 'en' ? course.teacherEn : course.teacher}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{lang === 'en' ? course.nameEn : course.name}</div>
              </div>
            </div>
            <button style={{ width: '100%', padding: '9px', background: course.color + '12', border: `1px solid ${course.color}30`, borderRadius: 8, color: course.color, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Icon name="message" size={14} color={course.color} /> {t('Nhắn tin', 'Message')}
            </button>
          </div>
        </div>
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
    if (selectedCourse) return <CourseDetail course={selectedCourse} lang={lang} t={t} pColor={pColor} onBack={() => setSelectedCourse(null)} />;
    if (currentSection === 'home') return <StudentHome lang={lang} t={t} pColor={pColor} onNavigate={setCurrentSection} onCourseSelect={setSelectedCourse} />;
    if (currentSection === 'courses') return <StudentCourses lang={lang} t={t} pColor={pColor} onCourseSelect={setSelectedCourse} />;
    if (currentSection === 'assignments') return <StudentAssignments lang={lang} t={t} pColor={pColor} />;
    if (currentSection === 'grades') return <StudentGrades lang={lang} t={t} pColor={pColor} />;
    if (currentSection === 'resources') return <StudentResources lang={lang} t={t} pColor={pColor} />;
    if (currentSection === 'schedule') return (
      <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: 60, textAlign: 'center', color: T.textMuted }}>
        <Icon name="calendar" size={40} color={T.border} />
        <div style={{ marginTop: 12, fontSize: 14 }}>{t('Thời khoá biểu tuần này', "This week's timetable")}</div>
      </div>
    );
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
