// ── Cụm B: Làm bài thi + Kết quả thi ────────────────────────────────────────

// ── Mock data ─────────────────────────────────────────────────────────────────

const AVAILABLE_EXAMS = [
  {
    id: 1, subject: 'Toán học', subjectEn: 'Mathematics', color: T.primary,
    title: 'Kiểm tra giữa kỳ I — Toán 11', titleEn: 'Midterm Exam I — Math 11',
    duration: 45, totalQ: 30, type: 'Trắc nghiệm', typeEn: 'Multiple Choice',
    dueDate: '30/04/2026', startTime: '08:00', teacher: 'Nguyễn Thị Hương',
    status: 'available', attempts: 0, maxAttempts: 1, hasEssay: false,
    description: 'Bao gồm các nội dung: Hàm số, Đạo hàm, Tích phân cơ bản',
    descriptionEn: 'Covers: Functions, Derivatives, Basic Integrals',
  },
  {
    id: 2, subject: 'Vật Lý', subjectEn: 'Physics', color: T.success,
    title: 'Kiểm tra 15 phút — Điện từ trường', titleEn: '15-min Quiz — EM Fields',
    duration: 15, totalQ: 10, type: 'Trắc nghiệm', typeEn: 'Multiple Choice',
    dueDate: '28/04/2026', startTime: '10:00', teacher: 'Trần Văn Minh',
    status: 'completed', attempts: 1, maxAttempts: 1, score: 8.5, hasEssay: false,
    description: 'Nội dung: Định luật Faraday, Cảm ứng điện từ',
    descriptionEn: 'Content: Faraday\'s Law, Electromagnetic Induction',
  },
  {
    id: 3, subject: 'Tiếng Anh', subjectEn: 'English', color: T.teal,
    title: 'Unit 7–8 Vocabulary Quiz', titleEn: 'Unit 7–8 Vocabulary Quiz',
    duration: 20, totalQ: 20, type: 'Trắc nghiệm', typeEn: 'Multiple Choice',
    dueDate: '02/05/2026', startTime: '14:00', teacher: 'Đỗ Thị Mai',
    status: 'available', attempts: 0, maxAttempts: 2, hasEssay: false,
    description: 'Từ vựng và ngữ pháp Unit 7-8',
    descriptionEn: 'Vocabulary and grammar Units 7-8',
  },
  {
    id: 4, subject: 'Hóa Học', subjectEn: 'Chemistry', color: T.warning,
    title: 'Kiểm tra 1 tiết — Phản ứng oxi hoá', titleEn: '45-min Test — Redox Reactions',
    duration: 45, totalQ: 25, type: 'Trắc nghiệm', typeEn: 'Multiple Choice',
    dueDate: '26/04/2026', startTime: '09:00', teacher: 'Lê Thị Hoa',
    status: 'expired', attempts: 0, maxAttempts: 1, hasEssay: false,
    description: 'Phản ứng oxi hoá khử, cân bằng phương trình',
    descriptionEn: 'Redox reactions, balancing equations',
  },
  // Mixed-format exam: MCQ auto-graded, essay awaiting teacher.
  // Status `submitted_pending_essay` covers the Q4 G2b caveat — auto-grading
  // only covers MCQ, so the final score is partial until the teacher grades the
  // essay section. Wired to the warning banner in ExamResultScreen.
  {
    id: 5, subject: 'Ngữ Văn', subjectEn: 'Literature', color: T.purple,
    title: 'Kiểm tra cuối kỳ I — Ngữ văn 11', titleEn: 'Final Exam I — Literature 11',
    duration: 90, totalQ: 24, type: 'Hỗn hợp (TN + Tự luận)', typeEn: 'Mixed (MCQ + Essay)',
    dueDate: '22/04/2026', startTime: '07:30', teacher: 'Phạm Quốc Bảo',
    status: 'submitted_pending_essay', attempts: 1, maxAttempts: 1,
    mcqScore: 6.0, mcqMax: 7.0, essayMax: 3.0,
    submittedAt: '22/04/2026 09:08', hasEssay: true, essayCount: 2,
    description: '20 câu trắc nghiệm + 2 câu tự luận phân tích tác phẩm “Chiếc thuyền ngoài xa”.',
    descriptionEn: '20 MCQ + 2 essay questions on “The Boat Outside the Distance”.',
  },
];

// Generate 30 questions for exam id=1
const generateQuestions = (total) => {
  const topics = [
    { q: 'Đạo hàm của hàm số f(x) = x³ − 3x² + 2x − 1 tại x = 2 là:', qEn: 'The derivative of f(x) = x³ − 3x² + 2x − 1 at x = 2 is:', opts: ['2', '4', '6', '8'], correct: 0 },
    { q: 'Hàm số y = sin(x) có chu kỳ là:', qEn: 'The period of y = sin(x) is:', opts: ['π', '2π', 'π/2', '4π'], correct: 1 },
    { q: 'Giá trị lớn nhất của hàm số y = −x² + 4x − 3 trên [0,3] là:', qEn: 'The maximum of y = −x² + 4x − 3 on [0,3] is:', opts: ['1', '2', '3', '4'], correct: 0 },
    { q: 'Tích phân ∫₀¹ (2x + 1) dx bằng:', qEn: 'The integral ∫₀¹ (2x + 1) dx equals:', opts: ['1', '2', '3', '4'], correct: 1 },
    { q: 'Phương trình x² − 5x + 6 = 0 có nghiệm là:', qEn: 'The roots of x² − 5x + 6 = 0 are:', opts: ['x=1, x=6', 'x=2, x=3', 'x=−2, x=−3', 'x=1, x=5'], correct: 1 },
    { q: 'Giới hạn lim(x→0) sin(x)/x bằng:', qEn: 'The limit lim(x→0) sin(x)/x equals:', opts: ['0', '∞', '1', '−1'], correct: 2 },
    { q: 'Đạo hàm của f(x) = eˣ là:', qEn: 'The derivative of f(x) = eˣ is:', opts: ['eˣ⁻¹', 'xeˣ', 'eˣ', 'e'], correct: 2 },
    { q: 'Hàm số f(x) = ln(x) có tập xác định là:', qEn: 'The domain of f(x) = ln(x) is:', opts: ['ℝ', '(0, +∞)', '[0, +∞)', 'ℝ \\ {0}'], correct: 1 },
    { q: 'Số phức z = 3 + 4i có môđun là:', qEn: 'The modulus of z = 3 + 4i is:', opts: ['3', '4', '5', '7'], correct: 2 },
    { q: 'Diện tích hình tròn bán kính r = 3 là:', qEn: 'The area of a circle with radius r = 3 is:', opts: ['6π', '9π', '12π', '3π'], correct: 1 },
  ];
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    ...topics[i % topics.length],
    difficulty: i < total * 0.4 ? 'easy' : i < total * 0.8 ? 'medium' : 'hard',
  }));
};

const EXAM_QUESTIONS = generateQuestions(30);

// Completed exam result data (for exam id=2)
const COMPLETED_RESULT = {
  examId: 2, score: 8.5, totalQ: 10, correct: 9, incorrect: 1, unanswered: 0,
  timeTaken: '12:34', rank: 3, totalStudents: 32, percentile: 91,
  answers: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    q: `Câu ${i + 1}: Nội dung câu hỏi kiểm tra Vật Lý ${i + 1}`,
    opts: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
    correct: (i * 3 + 1) % 4,
    selected: i === 5 ? (i * 3 + 2) % 4 : (i * 3 + 1) % 4,
  })),
};

// ── Exam List (Student exams page) ───────────────────────────────────────────

const ExamListScreen = ({ lang, primaryColor, onStartExam, onViewResult }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const [filter, setFilter] = React.useState('all');

  const STATUS_CONFIG = {
    available: { vi: 'Có thể làm', en: 'Available', color: T.primary, bg: T.primaryLight },
    completed: { vi: 'Đã hoàn thành', en: 'Completed', color: T.success, bg: T.successLight },
    expired:   { vi: 'Hết hạn', en: 'Expired', color: T.textMuted, bg: T.bg },
    submitted_pending_essay: { vi: 'Chờ chấm tự luận', en: 'Awaiting essay grade', color: T.warning, bg: T.warningLight },
  };

  const filtered = AVAILABLE_EXAMS.filter(e => filter === 'all' || e.status === filter);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary }}>{t('Bài kiểm tra & Thi', 'Exams & Quizzes')}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{t('Danh sách các bài kiểm tra được giao', 'Your assigned tests and quizzes')}</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          <StatCard icon="clipboard" iconColor={pColor} label={t('Cần làm', 'To Do')} value={AVAILABLE_EXAMS.filter(e => e.status === 'available').length} lang={lang} />
          <StatCard icon="check" iconColor={T.success} label={t('Đã hoàn thành', 'Completed')} value={AVAILABLE_EXAMS.filter(e => e.status === 'completed').length} lang={lang} />
          <StatCard icon="award" iconColor={T.warning} label={t('Điểm TB các bài', 'Avg Score')} value="8.5" lang={lang} />
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { id: 'all', vi: 'Tất cả', en: 'All' },
            { id: 'available', vi: 'Có thể làm', en: 'Available' },
            { id: 'completed', vi: 'Đã xong', en: 'Done' },
            { id: 'submitted_pending_essay', vi: 'Chờ chấm', en: 'Pending grade' },
            { id: 'expired', vi: 'Hết hạn', en: 'Expired' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 16px', border: `1.5px solid ${filter === f.id ? pColor : T.border}`,
              borderRadius: 8, background: filter === f.id ? pColor : T.card,
              color: filter === f.id ? '#fff' : T.textSecondary,
              fontSize: 12.5, fontWeight: filter === f.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t(f.vi, f.en)}</button>
          ))}
        </div>

        {/* Exam cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {filtered.map((exam) => {
            const sc = STATUS_CONFIG[exam.status];
            const isAvailable = exam.status === 'available';
            const isDone = exam.status === 'completed';
            const isPendingEssay = exam.status === 'submitted_pending_essay';
            return (
              <div key={exam.id} style={{
                background: T.card, borderRadius: 14, border: `1px solid ${isAvailable ? exam.color + '30' : isPendingEssay ? T.warning + '40' : T.border}`,
                boxShadow: isAvailable ? `0 4px 20px ${exam.color}14` : '0 2px 8px rgba(0,0,0,0.03)',
                overflow: 'hidden', transition: 'all 0.18s',
                opacity: exam.status === 'expired' ? 0.65 : 1,
              }}>
                {/* Top color bar */}
                <div style={{ height: 5, background: exam.color }} />
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginBottom: 4, lineHeight: 1.3 }}>
                        {lang === 'en' ? exam.titleEn : exam.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge color={exam.color}>{lang === 'en' ? exam.subjectEn : exam.subject}</Badge>
                        <span style={{ fontSize: 11, color: T.textMuted }}>{exam.teacher}</span>
                      </div>
                    </div>
                    <Badge color={sc.color} bg={sc.bg} style={{ flexShrink: 0 }}>{t(sc.vi, sc.en)}</Badge>
                  </div>

                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14, lineHeight: 1.5 }}>
                    {lang === 'en' ? exam.descriptionEn : exam.description}
                  </div>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    {[
                      { icon: 'clock', val: t(`${exam.duration} phút`, `${exam.duration} min`) },
                      { icon: 'clipboard', val: t(`${exam.totalQ} câu`, `${exam.totalQ} Qs`) },
                      { icon: 'calendar', val: t(`Hạn: ${exam.dueDate}`, `Due: ${exam.dueDate}`) },
                    ].map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name={m.icon} size={12} color={T.textMuted} />
                        <span style={{ fontSize: 12, color: T.textMuted }}>{m.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Score (if completed) */}
                  {isDone && exam.score && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.successLight, borderRadius: 8, marginBottom: 14, border: `1px solid ${T.success}20` }}>
                      <Icon name="award" size={18} color={T.success} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: T.success }}>{exam.score}/10</span>
                      <span style={{ fontSize: 12, color: T.textSecondary }}>{t('Điểm đạt được', 'Score achieved')}</span>
                    </div>
                  )}

                  {/* Partial-score banner (MCQ done, essay pending) */}
                  {isPendingEssay && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.warningLight, borderRadius: 8, marginBottom: 14, border: `1px solid ${T.warning}30` }}>
                      <Icon name="clock" size={18} color={T.warning} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.45 }}>
                          <span style={{ fontWeight: 800, color: T.warning }}>{exam.mcqScore}/{exam.mcqMax}</span>
                          <span style={{ margin: '0 4px' }}>•</span>
                          {t('Trắc nghiệm đã chấm tự động', 'MCQ auto-graded')}
                          <span style={{ margin: '0 4px' }}>•</span>
                          {t(`đợi chấm ${exam.essayCount} câu tự luận`, `awaiting ${exam.essayCount} essay`)} ({exam.essayMax}đ)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isAvailable && (
                      <button onClick={() => onStartExam(exam)}
                        style={{ flex: 1, padding: '10px', background: exam.color, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <Icon name="play" size={13} color="#fff" />
                        {t('Bắt đầu làm bài', 'Start Exam')}
                      </button>
                    )}
                    {isDone && (
                      <button onClick={() => onViewResult(exam)}
                        style={{ flex: 1, padding: '10px', background: T.successLight, color: T.success, border: `1px solid ${T.success}30`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon name="eye" size={13} color={T.success} />
                        {t('Xem kết quả', 'View Results')}
                      </button>
                    )}
                    {isPendingEssay && (
                      <button onClick={() => onViewResult(exam)}
                        style={{ flex: 1, padding: '10px', background: T.warningLight, color: T.warning, border: `1px solid ${T.warning}40`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Icon name="clock" size={13} color={T.warning} />
                        {t('Xem điểm sơ bộ', 'View partial result')}
                      </button>
                    )}
                    {exam.status === 'expired' && (
                      <div style={{ flex: 1, padding: '10px', background: T.bg, color: T.textMuted, borderRadius: 9, fontSize: 13, fontWeight: 600, textAlign: 'center', border: `1px solid ${T.border}` }}>
                        {t('Đã hết hạn', 'Expired')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Pre-exam briefing ─────────────────────────────────────────────────────────

const ExamBriefing = ({ exam, lang, onStart, onBack }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const [agreed, setAgreed] = React.useState(false);

  const rules = [
    { vi: 'Bài thi có giới hạn thời gian. Đồng hồ sẽ tự đếm ngược và nộp bài khi hết giờ.', en: 'The exam is timed. The countdown will auto-submit when time runs out.' },
    { vi: 'Không được thoát ra ngoài hoặc chuyển tab trong khi làm bài.', en: 'Do not exit or switch tabs during the exam.' },
    { vi: 'Bạn có thể đánh dấu câu để xem lại trước khi nộp.', en: 'You can flag questions to review before submitting.' },
    { vi: 'Sau khi nộp bài, kết quả sẽ hiển thị ngay lập tức.', en: 'After submission, your results will be shown immediately.' },
    { vi: `Bài thi này chỉ được làm ${exam.maxAttempts} lần.`, en: `This exam allows ${exam.maxAttempts} attempt(s) only.` },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: T.bg }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        {/* Header */}
        <div style={{ background: exam.color, borderRadius: 16, padding: '28px 32px', color: '#fff', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, bottom: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <Badge color="#fff" bg="rgba(255,255,255,0.2)" style={{ marginBottom: 12 }}>{lang === 'en' ? exam.subjectEn : exam.subject}</Badge>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, position: 'relative' }}>{lang === 'en' ? exam.titleEn : exam.title}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{exam.teacher}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20, position: 'relative' }}>
            {[
              { label: t('Thời gian', 'Duration'), value: t(`${exam.duration} phút`, `${exam.duration} min`) },
              { label: t('Số câu', 'Questions'), value: exam.totalQ },
              { label: t('Loại bài', 'Type'), value: t(exam.type, exam.typeEn) },
            ].map((m, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{m.value}</div>
                <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '22px 26px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, marginBottom: 14 }}>{t('Hướng dẫn làm bài', 'Exam Instructions')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rules.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: exam.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: exam.color }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5, margin: 0 }}>{t(r.vi, r.en)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Agree + start */}
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: '16px 22px', marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div onClick={() => setAgreed(a => !a)}
              style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${agreed ? exam.color : T.border}`, background: agreed ? exam.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer' }}>
              {agreed && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 13, color: T.textPrimary }}>{t('Tôi đã đọc và đồng ý với các quy định của bài thi.', 'I have read and agree to the exam rules.')}</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={{ padding: '11px 20px', border: `1px solid ${T.border}`, borderRadius: 10, background: T.card, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('← Quay lại', '← Back')}
          </button>
          <button onClick={onStart} disabled={!agreed}
            style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 10, background: agreed ? exam.color : T.textMuted, color: '#fff', fontSize: 14, fontWeight: 800, cursor: agreed ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
            <Icon name="play" size={15} color="#fff" />
            {t('Bắt đầu làm bài ngay', 'Start Exam Now')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Exam Taking screen ────────────────────────────────────────────────────────

const ExamTakingScreen = ({ exam, lang, onSubmit }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const TOTAL = exam.totalQ;
  const questions = EXAM_QUESTIONS.slice(0, TOTAL);
  const OPTS = ['A', 'B', 'C', 'D'];

  const [currentQ, setCurrentQ] = React.useState(0);
  const [answers, setAnswers] = React.useState({});   // { qId: optIndex }
  const [flagged, setFlagged] = React.useState({});   // { qId: bool }
  const [timeLeft, setTimeLeft] = React.useState(exam.duration * 60);
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);

  // Timer
  React.useEffect(() => {
    if (timeLeft <= 0) { onSubmit(answers); return; }
    const id = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerColor = timeLeft < 300 ? T.error : timeLeft < 600 ? T.warning : T.success;

  const q = questions[currentQ];
  const answered = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  const toggleFlag = () => setFlagged(f => ({ ...f, [q.id]: !f[q.id] }));
  const selectAnswer = (idx) => setAnswers(a => ({ ...a, [q.id]: idx }));
  const goTo = (i) => setCurrentQ(i);

  // Question nav button style
  const qBtnStyle = (i) => {
    const qId = questions[i].id;
    const isAnswered = answers[qId] !== undefined;
    const isFlagged = flagged[qId];
    const isCurrent = i === currentQ;
    let bg = T.bg, border = T.border, color = T.textMuted;
    if (isCurrent)  { bg = exam.color; border = exam.color; color = '#fff'; }
    else if (isFlagged && isAnswered) { bg = T.warning + '22'; border = T.warning; color = T.warning; }
    else if (isFlagged) { bg = T.warning + '15'; border = T.warning + '60'; color = T.warning; }
    else if (isAnswered) { bg = T.success + '18'; border = T.success + '60'; color = T.success; }
    return { width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0 };
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F0F4FF', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {/* Exam title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lang === 'en' ? exam.titleEn : exam.title}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{lang === 'en' ? exam.subjectEn : exam.subject} · {exam.teacher}</div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <Icon name="clipboard" size={13} color={T.textMuted} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary }}>{answered}/{TOTAL}</span>
          <span style={{ fontSize: 11, color: T.textMuted }}>{t('đã trả lời', 'answered')}</span>
        </div>

        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: timerColor + '15', border: `1.5px solid ${timerColor}40`, borderRadius: 9 }}>
          <Icon name="clock" size={15} color={timerColor} />
          <span style={{ fontSize: 16, fontWeight: 800, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </span>
        </div>

        {/* Submit button */}
        <button onClick={() => setShowSubmitModal(true)}
          style={{ padding: '8px 18px', background: exam.color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
          {t('Nộp bài', 'Submit')}
        </button>
      </div>

      {/* Main body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 240px', gap: 0, overflow: 'hidden' }}>

        {/* Question area */}
        <div style={{ overflowY: 'auto', padding: '28px 32px 28px 28px' }}>
          <div style={{ maxWidth: 700 }}>
            {/* Question header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: exam.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{currentQ + 1}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: T.textMuted }}>{t(`Câu ${currentQ + 1} / ${TOTAL}`, `Question ${currentQ + 1} of ${TOTAL}`)}</span>
                  <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                    <Badge color={q.difficulty === 'easy' ? T.success : q.difficulty === 'medium' ? T.warning : T.error} style={{ fontSize: 10 }}>
                      {q.difficulty === 'easy' ? t('Dễ','Easy') : q.difficulty === 'medium' ? t('TB','Medium') : t('Khó','Hard')}
                    </Badge>
                    {flagged[q.id] && <Badge color={T.warning} style={{ fontSize: 10 }}>⚑ {t('Đánh dấu','Flagged')}</Badge>}
                  </div>
                </div>
              </div>
              <button onClick={toggleFlag}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', border: `1.5px solid ${flagged[q.id] ? T.warning : T.border}`, borderRadius: 8, background: flagged[q.id] ? T.warningLight : 'transparent', color: flagged[q.id] ? T.warning : T.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                <Icon name="star" size={13} color={flagged[q.id] ? T.warning : T.textMuted} />
                {t('Đánh dấu', 'Flag')}
              </button>
            </div>

            {/* Question text */}
            <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: '22px 26px', marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, lineHeight: 1.7, margin: 0 }}>
                {lang === 'en' ? q.qEn : q.q}
              </p>
            </div>

            {/* Answer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.opts.map((opt, i) => {
                const isSelected = answers[q.id] === i;
                return (
                  <button key={i} onClick={() => selectAnswer(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px', borderRadius: 12,
                      border: `2px solid ${isSelected ? exam.color : T.border}`,
                      background: isSelected ? exam.color + '10' : T.card,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      boxShadow: isSelected ? `0 2px 12px ${exam.color}22` : 'none',
                    }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = exam.color + '60'; e.currentTarget.style.background = exam.color + '05'; }}}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.card; }}}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: isSelected ? exam.color : T.bg,
                      border: `1.5px solid ${isSelected ? exam.color : T.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, color: isSelected ? '#fff' : T.textMuted,
                      transition: 'all 0.15s',
                    }}>{OPTS[i]}</div>
                    <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? exam.color : T.textPrimary, lineHeight: 1.4 }}>{opt}</span>
                    {isSelected && (
                      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <Icon name="check" size={16} color={exam.color} strokeWidth={2.5} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Prev / Next */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <button onClick={() => goTo(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.card, color: currentQ === 0 ? T.textMuted : T.textPrimary, fontWeight: 600, fontSize: 13, cursor: currentQ === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: currentQ === 0 ? 0.45 : 1 }}>
                <Icon name="chevronLeft" size={14} color={currentQ === 0 ? T.textMuted : T.textPrimary} />
                {t('Câu trước', 'Previous')}
              </button>
              <button onClick={() => goTo(Math.min(TOTAL - 1, currentQ + 1))} disabled={currentQ === TOTAL - 1}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: 'none', borderRadius: 9, background: currentQ === TOTAL - 1 ? T.bg : exam.color, color: currentQ === TOTAL - 1 ? T.textMuted : '#fff', fontWeight: 700, fontSize: 13, cursor: currentQ === TOTAL - 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: currentQ === TOTAL - 1 ? 0.6 : 1 }}>
                {t('Câu tiếp', 'Next')}
                <Icon name="chevronRight" size={14} color={currentQ === TOTAL - 1 ? T.textMuted : '#fff'} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: question navigator */}
        <div style={{ background: T.card, borderLeft: `1px solid ${T.border}`, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Legend */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t('Bảng câu hỏi', 'Questions')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
              {[
                { bg: exam.color, color: '#fff', label: t('Câu hiện tại', 'Current') },
                { bg: T.success + '18', border: T.success, color: T.success, label: t('Đã trả lời', 'Answered') },
                { bg: T.warning + '15', border: T.warning, color: T.warning, label: t('Đã đánh dấu', 'Flagged') },
                { bg: T.bg, border: T.border, color: T.textMuted, label: t('Chưa làm', 'Unanswered') },
              ].map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: l.bg, border: `1.5px solid ${l.border || l.bg}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: T.textMuted }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
            {questions.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} style={qBtnStyle(i)}>{i + 1}</button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}`, marginTop: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, marginBottom: 8 }}>{t('Tiến độ', 'Progress')}</div>
            <ProgressBar value={(answered / TOTAL) * 100} color={exam.color} height={6} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: T.textMuted }}>{answered}/{TOTAL} {t('câu', 'Qs')}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: exam.color }}>{Math.round(answered / TOTAL * 100)}%</span>
            </div>
            {flaggedCount > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: T.warning }}>⚑ {flaggedCount} {t('câu đã đánh dấu', 'flagged')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: T.card, borderRadius: 18, padding: 32, maxWidth: 420, width: '100%', margin: '0 16px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: exam.color + '18', border: `2px solid ${exam.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Icon name="fileText" size={26} color={exam.color} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>{t('Xác nhận nộp bài?', 'Ready to Submit?')}</div>
              <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.6 }}>
                {t('Bạn đã trả lời', 'You have answered')} <strong style={{ color: T.textPrimary }}>{answered}/{TOTAL}</strong> {t('câu.', 'questions.')}
                {answered < TOTAL && <span style={{ color: T.warning }}> {TOTAL - answered} {t('câu chưa làm.', 'questions unanswered.')}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSubmitModal(false)}
                style={{ flex: 1, padding: '11px', border: `1px solid ${T.border}`, borderRadius: 10, background: T.bg, color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Xem lại', 'Review')}
              </button>
              <button onClick={() => onSubmit(answers)}
                style={{ flex: 1, padding: '11px', border: 'none', borderRadius: 10, background: exam.color, color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Nộp bài ngay', 'Submit Now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Exam Result screen ────────────────────────────────────────────────────────

const ExamResultScreen = ({ exam, answers, lang, onBack, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const questions = EXAM_QUESTIONS.slice(0, exam.totalQ);
  const OPTS = ['A', 'B', 'C', 'D'];
  const [filter, setFilter] = React.useState('all');
  const [showConfetti, setShowConfetti] = React.useState(true);

  // Use provided answers or completed result
  const isCompleted = !answers;
  const result = isCompleted ? COMPLETED_RESULT : (() => {
    let correct = 0, incorrect = 0, unanswered = 0;
    questions.forEach(q => {
      if (answers[q.id] === undefined) unanswered++;
      else if (answers[q.id] === q.correct) correct++;
      else incorrect++;
    });
    const score = parseFloat(((correct / questions.length) * 10).toFixed(1));
    return { correct, incorrect, unanswered, score, timeTaken: '32:15', rank: 7, totalStudents: 32, percentile: 81 };
  })();

  const score = isCompleted ? COMPLETED_RESULT.score : result.score;
  const isPassing = score >= 5;
  const scoreColor = score >= 8 ? T.success : score >= 5 ? T.primary : T.error;

  const reviewAnswers = isCompleted ? COMPLETED_RESULT.answers : questions.map(q => ({
    id: q.id, q: q.q, opts: q.opts, correct: q.correct,
    selected: answers?.[q.id],
  }));

  const filteredReview = reviewAnswers.filter(a => {
    if (filter === 'correct') return a.selected === a.correct;
    if (filter === 'incorrect') return a.selected !== a.correct && a.selected !== undefined;
    if (filter === 'unanswered') return a.selected === undefined;
    return true;
  });

  React.useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 3000); return () => clearTimeout(t); }, []);

  // Pending-essay scenario (US-E11.5 / Q4 G2b caveat):
  // Auto-grading only covers MCQ. If the exam has essays, the displayed score
  // is partial — surface a warning banner explaining the teacher still needs
  // to grade the essay section.
  const isPendingEssay = exam.status === 'submitted_pending_essay' || exam.hasEssay;
  const partialScore = exam.mcqScore != null ? exam.mcqScore : null;
  const partialMax   = exam.mcqMax   != null ? exam.mcqMax   : null;
  const essayMax     = exam.essayMax != null ? exam.essayMax : null;

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, padding: '28px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Back button */}
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          <Icon name="chevronLeft" size={14} color={T.textMuted} /> {t('Quay lại danh sách bài thi', 'Back to Exams')}
        </button>

        {/* Score hero */}
        <div style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ background: `linear-gradient(135deg, ${scoreColor} 0%, ${scoreColor}CC 100%)`, padding: '32px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', right: 60, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'center', position: 'relative' }}>
              {/* Score circle */}
              <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                {isPendingEssay && partialScore != null ? (
                  <React.Fragment>
                    <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{partialScore}</span>
                    <span style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>/{partialMax} • {t('TN', 'MCQ')}</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <span style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{score}</span>
                    <span style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>/10</span>
                  </React.Fragment>
                )}
              </div>
              <div>
                <Badge color="#fff" bg="rgba(255,255,255,0.2)" style={{ marginBottom: 10 }}>
                  {isPendingEssay
                    ? `⏱ ${t('CHƯA CÓ ĐIỂM TỔNG', 'PARTIAL RESULT')}`
                    : isPassing ? `✓ ${t('ĐẠT', 'PASSED')}` : `✗ ${t('CHƯA ĐẠT', 'FAILED')}`}
                </Badge>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{lang === 'en' ? exam.titleEn : exam.title}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{lang === 'en' ? exam.subjectEn : exam.subject} · {exam.teacher}</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
                  {[
                    { label: t('Xếp hạng', 'Rank'), value: `${result.rank}/${result.totalStudents}` },
                    { label: t('Vượt hơn', 'Percentile'), value: `${result.percentile}%` },
                    { label: t('Thời gian', 'Time'), value: result.timeTaken },
                  ].map((m, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{m.value}</div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { count: result.correct, label: t('Câu đúng', 'Correct'), color: T.success, icon: 'check' },
              { count: result.incorrect, label: t('Câu sai', 'Incorrect'), color: T.error, icon: 'x' },
              { count: result.unanswered, label: t('Bỏ qua', 'Skipped'), color: T.textMuted, icon: 'clock' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '18px 24px', borderRight: i < 2 ? `1px solid ${T.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={s.icon} size={18} color={s.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pending-essay banner (US-E11.5 / Q4 G2b) ──────────────────────────── */}
        {isPendingEssay && (
          <div style={{
            background: T.warningLight,
            border: `1px solid ${T.warning}40`,
            borderRadius: 12, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: T.warning + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Icon name="clock" size={18} color={T.warning} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.warning }}>
                {t('Điểm tự luận đang chờ giáo viên chấm', 'Essay score awaiting teacher grading')}
              </div>
              <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 4, lineHeight: 1.55 }}>
                {t(
                  `Phần trắc nghiệm đã được chấm tự động — ${partialScore != null ? partialScore : score}/${partialMax != null ? partialMax : 10}đ. Phần tự luận (tối đa ${essayMax != null ? essayMax : '—'}đ) sẽ được ${exam.teacher} chấm thủ công và cộng vào điểm tổng trong vòng 3 ngày làm việc.`,
                  `Multiple-choice section auto-graded — ${partialScore != null ? partialScore : score}/${partialMax != null ? partialMax : 10}. The essay section (max ${essayMax != null ? essayMax : '—'} pts) will be manually graded by ${exam.teacher} within 3 working days.`
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Grade-book deep link (Award icon → section=grades) ────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button onClick={() => onNavigate && onNavigate('grades')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 9,
              background: 'transparent', border: `1.5px solid ${T.border}`,
              color: T.textSecondary, fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = scoreColor; e.currentTarget.style.color = scoreColor; e.currentTarget.style.background = scoreColor + '08'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecondary; e.currentTarget.style.background = 'transparent'; }}>
            <Icon name="award" size={14} color="currentColor" strokeWidth={2.1} />
            {t('Xem điểm trong bảng điểm', 'View in grade book')}
            <Icon name="chevronRight" size={13} color="currentColor" strokeWidth={2.4} />
          </button>
        </div>

        {/* Question review */}
        <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, flex: 1 }}>{t('Chi tiết từng câu', 'Question Review')}</div>
            {[
              { id: 'all', vi: 'Tất cả', en: 'All' },
              { id: 'correct', vi: 'Đúng', en: 'Correct' },
              { id: 'incorrect', vi: 'Sai', en: 'Wrong' },
              { id: 'unanswered', vi: 'Bỏ qua', en: 'Skipped' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '5px 14px', border: `1.5px solid ${filter === f.id ? scoreColor : T.border}`,
                borderRadius: 7, background: filter === f.id ? scoreColor + '12' : 'transparent',
                color: filter === f.id ? scoreColor : T.textMuted,
                fontSize: 12, fontWeight: filter === f.id ? 700 : 500, cursor: 'pointer',
              }}>{t(f.vi, f.en)}</button>
            ))}
          </div>

          <div style={{ padding: '8px 0' }}>
            {filteredReview.map((a, i) => {
              const isCorrect = a.selected === a.correct;
              const isSkipped = a.selected === undefined;
              const statusColor = isSkipped ? T.textMuted : isCorrect ? T.success : T.error;
              const statusLabel = isSkipped ? t('Bỏ qua', 'Skipped') : isCorrect ? t('Đúng', 'Correct') : t('Sai', 'Wrong');
              const statusIcon = isSkipped ? 'clock' : isCorrect ? 'check' : 'x';
              return (
                <div key={a.id} style={{ padding: '16px 22px', borderBottom: i < filteredReview.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: statusColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={statusIcon} size={12} color={statusColor} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: 12, color: T.textMuted }}>{t(`Câu ${a.id}`, `Q${a.id}`)}</span>
                    </div>
                    <Badge color={statusColor}>{statusLabel}</Badge>
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary, marginBottom: 12, lineHeight: 1.5, margin: '0 0 12px' }}>{a.q}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {a.opts.map((opt, j) => {
                      const isCorrectOpt = j === a.correct;
                      const isSelectedOpt = j === a.selected;
                      let bg = T.bg, border = T.border, color = T.textSecondary;
                      if (isCorrectOpt) { bg = T.success + '12'; border = T.success + '50'; color = T.success; }
                      if (isSelectedOpt && !isCorrectOpt) { bg = T.error + '12'; border = T.error + '50'; color = T.error; }
                      return (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{OPTS[j]}</span>
                          <span style={{ fontSize: 12.5, color, fontWeight: (isCorrectOpt || isSelectedOpt) ? 600 : 400, flex: 1 }}>{opt}</span>
                          {isCorrectOpt && <Icon name="check" size={13} color={T.success} strokeWidth={2.5} />}
                          {isSelectedOpt && !isCorrectOpt && <Icon name="x" size={13} color={T.error} strokeWidth={2.5} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Exam Router (injected into StudentScreen) ────────────────────────────

const ExamScreen = ({ lang, primaryColor, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;

  // examFlow: 'list' | 'briefing' | 'taking' | 'result'
  const [examFlow, setExamFlow] = React.useState('list');
  const [selectedExam, setSelectedExam] = React.useState(null);
  const [submittedAnswers, setSubmittedAnswers] = React.useState(null);

  const handleStartExam = (exam) => { setSelectedExam(exam); setExamFlow('briefing'); };
  const handleViewResult = (exam) => { setSelectedExam(exam); setExamFlow('result'); };
  const handleBegin = () => setExamFlow('taking');
  const handleSubmit = (answers) => { setSubmittedAnswers(answers); setExamFlow('result'); };
  const handleBackToList = () => { setExamFlow('list'); setSelectedExam(null); setSubmittedAnswers(null); };

  if (examFlow === 'list') return <ExamListScreen lang={lang} primaryColor={pColor} onStartExam={handleStartExam} onViewResult={handleViewResult} />;
  if (examFlow === 'briefing') return <ExamBriefing exam={selectedExam} lang={lang} onStart={handleBegin} onBack={handleBackToList} />;
  if (examFlow === 'taking') return <ExamTakingScreen exam={selectedExam} lang={lang} onSubmit={handleSubmit} />;
  if (examFlow === 'result') return <ExamResultScreen exam={selectedExam} answers={submittedAnswers} lang={lang} onBack={handleBackToList} onNavigate={onNavigate} />;
  return null;
};

Object.assign(window, { ExamScreen });
