// ── Exam Bank + Exam Builder (Kho đề thi + Tạo đề thi) ──────────────────────
// Routes:   /teacher/exam-bank           — TEACHER list (own)
//           /teacher/exam-bank/create    — TEACHER builder (create / edit)
//           /admin/exam-bank             — ADMIN / principal aggregate
// Epic:     US-E13.4 (FE)  /  US-054 + US-055 (BE, E05-deferred)
//
// Two exported components on window:
//   • ExamBankScreen    — list view (filter + cards) + handles routing to builder
//   • ExamBuilderScreen — full-screen 2-col builder (questions list ⟷ editor)
//
// They share state inside a thin wrapper so navigation between list/builder is
// instant. ExamBankScreen exposes a `mode` prop ('list' | 'builder') the host
// (app.jsx) can drive, OR drives itself when no host control is provided.
//
// Visual references:
//   • exam.jsx — student MCQ option layout (used in preview modal)
//   • subjects.jsx — master/detail split
//   • lesson-bank.jsx — filter bar + dropdowns + toast pattern

// ── Domain vocabulary ───────────────────────────────────────────────────────

const EB_SUBJECTS = [
  { id: 'sub-math', vi: 'Toán học',  en: 'Mathematics', color: '#5D87FF' },
  { id: 'sub-phys', vi: 'Vật Lý',    en: 'Physics',     color: '#13DEB9' },
  { id: 'sub-chem', vi: 'Hoá Học',   en: 'Chemistry',   color: '#FFAE1F' },
  { id: 'sub-lit',  vi: 'Ngữ Văn',   en: 'Literature',  color: '#7B5EA7' },
  { id: 'sub-eng',  vi: 'Tiếng Anh', en: 'English',     color: '#1FAFC0' },
  { id: 'sub-hist', vi: 'Lịch Sử',   en: 'History',     color: '#FA896B' },
];

const EB_GRADES = [10, 11, 12];

// Loại đề — exam types
const EB_EXAM_TYPES = {
  midterm: { vi: 'Giữa kỳ',       en: 'Midterm',  color: '#5D87FF', icon: 'calendarDays' },
  final:   { vi: 'Cuối kỳ',       en: 'Final',    color: '#7B5EA7', icon: 'award' },
  quiz:    { vi: 'Thường xuyên',  en: 'Quiz',     color: '#13DEB9', icon: 'clock' },
  other:   { vi: 'Khác',          en: 'Other',    color: '#8898A9', icon: 'fileText' },
};

const EB_STATUS = {
  draft:     { vi: 'Nháp',          en: 'Draft',     color: '#FFAE1F', bg: '#FEF5E5', icon: 'penLine' },
  published: { vi: 'Đã phát hành',  en: 'Published', color: '#13DEB9', bg: '#E6FFFA', icon: 'check' },
};

const EB_OWNERS = {
  me:      { id: 'me',    name: 'Bạn',              en: 'You',             initials: 'NH' },
  'tch-2': { id: 'tch-2', name: 'Trần Văn Minh',    en: 'Tran V. Minh',    initials: 'TM' },
  'tch-3': { id: 'tch-3', name: 'Lê Thị Hoa',       en: 'Le T. Hoa',       initials: 'LH' },
  'tch-4': { id: 'tch-4', name: 'Phạm Quốc Bảo',    en: 'Pham Q. Bao',     initials: 'PB' },
};

// MCQ option letter labels
const EB_OPT_LETTERS = ['A', 'B', 'C', 'D'];

// ── Helpers ─────────────────────────────────────────────────────────────────

const ebSubject = (id) => EB_SUBJECTS.find(s => s.id === id) || EB_SUBJECTS[0];
const ebOwner   = (id) => EB_OWNERS[id] || EB_OWNERS.me;
const ebTotalPoints = (questions) => (questions || []).reduce((s, q) => s + (q.points || 0), 0);
const ebCountByType = (questions, type) => (questions || []).filter(q => q.type === type).length;

// Make a blank MCQ / Essay question.
const ebBlankMCQ = () => ({
  id: `q${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'mcq', prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  points: 1,
});
const ebBlankEssay = () => ({
  id: `q${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: 'essay', prompt: '', hint: '',
  points: 2,
});

// ── Seed exams ──────────────────────────────────────────────────────────────

const EB_SAMPLE_QUESTIONS_MATH = [
  { id: 'sq1', type: 'mcq', prompt: 'Đạo hàm của hàm số f(x) = x³ − 3x² + 2x − 1 tại x = 2 là:',
    options: ['2', '4', '6', '8'], correctIndex: 1, points: 1 },
  { id: 'sq2', type: 'mcq', prompt: 'Hàm số y = sin(x) có chu kỳ là:',
    options: ['π', '2π', 'π/2', '4π'], correctIndex: 1, points: 1 },
  { id: 'sq3', type: 'mcq', prompt: 'Giá trị lớn nhất của hàm số y = −x² + 4x − 3 trên đoạn [0, 3] là:',
    options: ['1', '2', '3', '4'], correctIndex: 0, points: 1 },
  { id: 'sq4', type: 'mcq', prompt: 'Tích phân ∫₀¹ (2x + 1) dx bằng:',
    options: ['1', '2', '3', '4'], correctIndex: 1, points: 1 },
  { id: 'sq5', type: 'mcq', prompt: 'Phương trình x² − 5x + 6 = 0 có nghiệm là:',
    options: ['x=1, x=6', 'x=2, x=3', 'x=−2, x=−3', 'x=1, x=5'], correctIndex: 1, points: 1 },
  { id: 'sq6', type: 'mcq', prompt: 'Giới hạn lim(x→0) sin(x)/x bằng:',
    options: ['0', '∞', '1', '−1'], correctIndex: 2, points: 1 },
  { id: 'sq7', type: 'mcq', prompt: 'Đạo hàm của f(x) = eˣ là:',
    options: ['eˣ⁻¹', 'xeˣ', 'eˣ', 'e'], correctIndex: 2, points: 1 },
  { id: 'sq8', type: 'essay',
    prompt: 'Giải phương trình lượng giác: 2sin²x − 3sinx + 1 = 0, với x ∈ [0, 2π]. Trình bày rõ các bước biến đổi.',
    hint: 'Đặt t = sin(x), giải phương trình bậc hai theo t, sau đó tìm x trong khoảng đã cho.',
    points: 3 },
];

const EB_SEED = [
  {
    id: 'ex1', ownerId: 'me', title: 'Kiểm tra Giữa kỳ 1 — Toán lớp 10',
    subjectId: 'sub-math', gradeLevel: 10, examType: 'midterm',
    durationMin: 45, status: 'published',
    createdAt: '15/05/2026', updatedAt: '20/05/2026',
    usedCount: 3, questions: EB_SAMPLE_QUESTIONS_MATH,
    description: 'Bao gồm các nội dung: Mệnh đề, Tập hợp, Hàm số bậc nhất.',
  },
  {
    id: 'ex2', ownerId: 'me', title: 'Đề thi Cuối kỳ 2 — Toán lớp 11',
    subjectId: 'sub-math', gradeLevel: 11, examType: 'final',
    durationMin: 90, status: 'published',
    createdAt: '02/05/2026', updatedAt: '02/05/2026',
    usedCount: 1, questions: EB_SAMPLE_QUESTIONS_MATH.slice(0, 6),
  },
  {
    id: 'ex3', ownerId: 'me', title: 'Kiểm tra 15 phút — Đạo hàm',
    subjectId: 'sub-math', gradeLevel: 12, examType: 'quiz',
    durationMin: 15, status: 'draft',
    createdAt: '28/05/2026', updatedAt: '30/05/2026',
    usedCount: 0, questions: EB_SAMPLE_QUESTIONS_MATH.slice(0, 4),
  },
  {
    id: 'ex4', ownerId: 'tch-2', title: 'Đề thi Cuối kỳ — Vật Lý 11',
    subjectId: 'sub-phys', gradeLevel: 11, examType: 'final',
    durationMin: 60, status: 'published',
    createdAt: '20/05/2026', updatedAt: '20/05/2026',
    usedCount: 2, questions: EB_SAMPLE_QUESTIONS_MATH.slice(0, 7),
  },
  {
    id: 'ex5', ownerId: 'tch-3', title: 'Kiểm tra Giữa kỳ — Hoá 10',
    subjectId: 'sub-chem', gradeLevel: 10, examType: 'midterm',
    durationMin: 45, status: 'published',
    createdAt: '10/05/2026', updatedAt: '10/05/2026',
    usedCount: 1, questions: EB_SAMPLE_QUESTIONS_MATH.slice(0, 5),
  },
  {
    id: 'ex6', ownerId: 'tch-4', title: 'Đề kiểm tra văn nghị luận — Truyện Kiều',
    subjectId: 'sub-lit', gradeLevel: 11, examType: 'quiz',
    durationMin: 30, status: 'draft',
    createdAt: '01/06/2026', updatedAt: '01/06/2026',
    usedCount: 0, questions: [
      { id: 'sql1', type: 'essay',
        prompt: 'Phân tích đoạn trích "Trao duyên" trong Truyện Kiều của Nguyễn Du, làm rõ tâm trạng của Thuý Kiều.',
        hint: 'Chú ý phân tích cả phương diện nội dung và nghệ thuật; liên hệ bối cảnh xã hội phong kiến.',
        points: 10 },
    ],
  },
];

// ── Shared sub-components ───────────────────────────────────────────────────

const ebStyles = {
  cardShell: {
    background: T.card, borderRadius: 12, border: `1px solid ${T.border}`,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  fieldLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: T.textMuted, marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.07em',
  },
  input: {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit',
    color: T.textPrimary, background: '#fff', outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1.5px solid ${T.border}`, fontSize: 13, lineHeight: 1.55,
    fontFamily: 'inherit', color: T.textPrimary, background: '#fff', outline: 'none',
    resize: 'vertical', boxSizing: 'border-box', minHeight: 80,
  },
};

const EBStatusChip = ({ status, t, size = 'md' }) => {
  const s = EB_STATUS[status] || EB_STATUS.draft;
  const px = size === 'sm' ? '3px 8px' : '4px 11px';
  const fs = size === 'sm' ? 10.5 : 11.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: px, borderRadius: 99, background: s.bg, color: s.color,
      fontSize: fs, fontWeight: 700, letterSpacing: '0.01em',
    }}>
      <Icon name={s.icon} size={fs - 1} color={s.color} strokeWidth={2.2} />
      {t(s.vi, s.en)}
    </span>
  );
};

const EBTypeBadge = ({ type, t }) => {
  const meta = EB_EXAM_TYPES[type] || EB_EXAM_TYPES.other;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 6,
      background: meta.color + '15', color: meta.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <Icon name={meta.icon} size={11} color={meta.color} strokeWidth={2.2} />
      {t(meta.vi, meta.en)}
    </span>
  );
};

const EBDropdown = ({ label, value, options, onChange, icon, minWidth = 160 }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', minWidth }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.border}`,
        background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
        color: T.textPrimary, fontWeight: 600, cursor: 'pointer',
      }}>
        {icon && <Icon name={icon} size={12} color={T.textMuted} />}
        <span style={{ color: T.textMuted, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{current?.label || '—'}</span>
        <Icon name="chevronDown" size={11} color={T.textMuted} />
      </button>
      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 51,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, maxHeight: 280, overflowY: 'auto',
          }}>
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6,
                  border: 'none', cursor: 'pointer',
                  background: o.value === value ? T.primary + '12' : 'transparent',
                  color: o.value === value ? T.primary : T.textPrimary,
                  fontSize: 12.5, fontWeight: o.value === value ? 700 : 500, fontFamily: 'inherit',
                }}>
                {o.label}
              </button>
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
};

// ── Exam card (list view) ──────────────────────────────────────────────────

const EBExamCard = ({ exam, t, pColor, isMine, onView, onDuplicate, onDelete, onAssign }) => {
  const subj = ebSubject(exam.subjectId);
  const owner = ebOwner(exam.ownerId);
  const typeMeta = EB_EXAM_TYPES[exam.examType] || EB_EXAM_TYPES.other;
  const totalPts = ebTotalPoints(exam.questions);
  const mcqCount = ebCountByType(exam.questions, 'mcq');
  const essayCount = ebCountByType(exam.questions, 'essay');

  return (
    <div style={{
      ...ebStyles.cardShell,
      padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
      transition: 'box-shadow 0.15s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Icon block */}
      <div style={{
        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${typeMeta.color}1A 0%, ${typeMeta.color}33 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="clipboardList" size={24} color={typeMeta.color} strokeWidth={1.7} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, lineHeight: 1.35 }}>
              {exam.title}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: subj.color }}>{t(subj.vi, subj.en)}</span>
              <span style={{ color: T.border }}>·</span>
              <span>{t(`Lớp ${exam.gradeLevel}`, `Grade ${exam.gradeLevel}`)}</span>
              <span style={{ color: T.border }}>·</span>
              <EBTypeBadge type={exam.examType} t={t} />
              <span style={{ color: T.border }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="clock" size={11} color={T.textMuted} />
                {exam.durationMin} {t('phút', 'min')}
              </span>
              <span style={{ color: T.border }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="clipboard" size={11} color={T.textMuted} />
                {exam.questions.length} {t('câu', 'Qs')}
              </span>
              <span style={{ color: T.border }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="award" size={11} color={T.textMuted} />
                {totalPts.toFixed(1)} {t('điểm', 'pts')}
              </span>
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{t('Tạo:', 'Created:')} {exam.createdAt}</span>
              <span style={{ color: T.border }}>·</span>
              <span>{t(`Đã dùng: ${exam.usedCount} lần`, `Used ${exam.usedCount} times`)}</span>
              {mcqCount > 0 && essayCount > 0 && (
                <React.Fragment>
                  <span style={{ color: T.border }}>·</span>
                  <span>{mcqCount} {t('trắc nghiệm', 'MCQ')} · {essayCount} {t('tự luận', 'essay')}</span>
                </React.Fragment>
              )}
              {!isMine && (
                <React.Fragment>
                  <span style={{ color: T.border }}>·</span>
                  <span>{t('Tác giả:', 'By:')} {t(owner.name, owner.en)}</span>
                </React.Fragment>
              )}
            </div>
          </div>
          <EBStatusChip status={exam.status} t={t} />
        </div>

        {/* Actions */}
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <button onClick={() => onView(exam)} style={ebActionBtn(pColor)}>
            <Icon name={isMine ? 'penLine' : 'eye'} size={11} color={pColor} strokeWidth={2.2} />
            {isMine ? t('Xem / Sửa', 'View / Edit') : t('Xem chi tiết', 'View detail')}
          </button>
          <button onClick={() => onDuplicate(exam)} style={ebActionBtn(T.textSecondary)}>
            <Icon name="copy" size={11} color={T.textSecondary} strokeWidth={2.2} />
            {t('Nhân bản', 'Duplicate')}
          </button>
          {isMine && (
            <button onClick={() => onDelete(exam)} style={ebActionBtn(T.error)}>
              <Icon name="trash" size={11} color={T.error} strokeWidth={2.2} />
              {t('Xoá', 'Delete')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {isMine && exam.status === 'published' && (
            <button onClick={() => onAssign(exam)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none',
                background: pColor, color: '#fff', fontSize: 12, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <Icon name="send" size={12} color="#fff" strokeWidth={2.4} />
              {t('Giao bài', 'Assign')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ebActionBtn = (color) => ({
  padding: '6px 11px', borderRadius: 7,
  border: `1px solid ${color}25`, background: color + '08', color,
  fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 5,
});

// ── Empty state ────────────────────────────────────────────────────────────

const EBEmptyState = ({ variant, t, pColor, onCreate, onReset }) => (
  <div style={{
    ...ebStyles.cardShell, padding: '80px 24px', textAlign: 'center',
    border: `1px dashed ${T.border}`,
  }}>
    <div style={{
      width: 96, height: 96, borderRadius: 24, margin: '0 auto 18px',
      background: pColor + '0E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="clipboardList" size={44} color={pColor + 'B0'} strokeWidth={1.4} />
    </div>
    <div style={{ fontSize: 17, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
      {variant === 'all'
        ? t('Chưa có đề thi nào.', 'No exams yet.')
        : t('Không có đề thi nào phù hợp.', 'No exams match these filters.')}
    </div>
    <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 22, maxWidth: 460, margin: '0 auto 22px', lineHeight: 1.6 }}>
      {variant === 'all'
        ? t('Bắt đầu tạo đề đầu tiên — trộn câu hỏi trắc nghiệm và tự luận, lưu nháp hoặc phát hành để giao cho lớp.',
            'Start your first exam — mix MCQ and essay questions, save a draft or publish to assign.')
        : t('Thử bỏ chọn bộ lọc hoặc đổi từ khoá tìm kiếm.', 'Try clearing filters or changing the search query.')}
    </div>
    {variant === 'all'
      ? <Button onClick={onCreate} icon="plus">{t('Tạo đề thi mới', 'Create exam')}</Button>
      : <Button variant="secondary" onClick={onReset} icon="x">{t('Bỏ lọc', 'Clear filters')}</Button>}
  </div>
);

// ── Exam Bank list screen ──────────────────────────────────────────────────

const ExamBankScreen = ({ lang, primaryColor, role = 'teacher', mode = 'list', onModeChange, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isTeacher = role === 'teacher';

  // Persisted list of exams — internal state. In production this would be
  // server-backed; here we keep it local so the demo round-trips.
  const [exams, setExams] = React.useState(EB_SEED);
  const [filters, setFilters] = React.useState({
    q: '', subject: 'all', grade: 'all', type: 'all',
    owner: isTeacher ? 'me' : 'all',
  });
  const [editingExamId, setEditingExamId] = React.useState(null); // null for "new"
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [assignTarget, setAssignTarget] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [internalMode, setInternalMode] = React.useState('list');

  // Resolve the current mode — host-driven takes precedence.
  const currentMode = onModeChange ? mode : internalMode;
  const setMode = (m) => {
    if (onModeChange) onModeChange(m);
    else setInternalMode(m);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // ── Filter pipeline ─────────────────────────────────────────────────────
  const visible = React.useMemo(() => {
    let arr = exams;
    if (filters.owner === 'me') arr = arr.filter(e => e.ownerId === 'me');
    if (filters.subject !== 'all') arr = arr.filter(e => e.subjectId === filters.subject);
    if (filters.grade !== 'all')   arr = arr.filter(e => String(e.gradeLevel) === filters.grade);
    if (filters.type !== 'all')    arr = arr.filter(e => e.examType === filters.type);
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      arr = arr.filter(e => e.title.toLowerCase().includes(q));
    }
    return arr;
  }, [exams, filters]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCreateNew = () => { setEditingExamId(null); setMode('builder'); };
  const handleEdit = (exam) => { setEditingExamId(exam.id); setMode('builder'); };
  const handleDuplicate = (exam) => {
    const next = {
      ...exam, id: `ex${Date.now()}`, ownerId: 'me',
      title: t(`${exam.title} (Bản sao)`, `${exam.title} (Copy)`),
      status: 'draft', usedCount: 0,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      updatedAt: new Date().toLocaleDateString('vi-VN'),
      questions: exam.questions.map(q => ({ ...q, id: `q${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
    };
    setExams(prev => [next, ...prev]);
    showToast(t('Đã nhân bản đề thi.', 'Exam duplicated.'));
  };
  const handleConfirmDelete = () => {
    setExams(prev => prev.filter(e => e.id !== confirmDelete.id));
    setConfirmDelete(null);
    showToast(t('Đã xoá đề thi.', 'Exam deleted.'));
  };
  const handleSaveExam = (payload) => {
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === payload.id);
      if (idx === -1) return [{ ...payload, ownerId: 'me' }, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...payload };
      return next;
    });
    setMode('list');
    setEditingExamId(null);
    showToast(payload.status === 'published'
      ? t('Đã phát hành đề thi.', 'Exam published.')
      : t('Đã lưu nháp.', 'Draft saved.'));
  };

  // ── Filter dirty / counters ─────────────────────────────────────────────
  const filtersDirty = filters.q || filters.subject !== 'all' || filters.grade !== 'all' || filters.type !== 'all';
  const ownCount = exams.filter(e => e.ownerId === 'me').length;
  const totalCount = exams.length;
  const draftCount = visible.filter(e => e.status === 'draft').length;
  const pubCount   = visible.filter(e => e.status === 'published').length;

  // ── Render: builder route ──────────────────────────────────────────────
  if (currentMode === 'builder') {
    const editing = editingExamId ? exams.find(e => e.id === editingExamId) : null;
    return (
      <ExamBuilderScreen
        lang={lang} primaryColor={primaryColor}
        exam={editing}
        onCancel={() => { setMode('list'); setEditingExamId(null); }}
        onSave={handleSaveExam}
      />
    );
  }

  // ── Render: list ────────────────────────────────────────────────────────
  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: T.bg, position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              US-E13.4 · {t('Kho đề thi', 'Exam Bank')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {isTeacher ? t('Kho đề thi của tôi', 'My Exam Bank') : t('Kho đề thi toàn trường', 'School-wide Exam Bank')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {isTeacher
                ? t(`Bạn có ${ownCount} đề · Toàn trường ${totalCount} đề.`,
                    `You own ${ownCount} exams · ${totalCount} school-wide.`)
                : t(`${totalCount} đề từ tất cả giáo viên trong trường.`,
                    `${totalCount} exams across all teachers.`)}
            </div>
          </div>
          {isTeacher && (
            <div style={{ display: 'flex', borderRadius: 9, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: '#fff' }}>
              {[
                { id: 'me',  label: t('Của tôi', 'Mine'), count: ownCount },
                { id: 'all', label: t('Toàn trường', 'School'), count: totalCount },
              ].map(o => (
                <button key={o.id} onClick={() => setFilters(f => ({ ...f, owner: o.id }))}
                  style={{
                    padding: '8px 14px', border: 'none',
                    background: filters.owner === o.id ? pColor + '14' : 'transparent',
                    color: filters.owner === o.id ? pColor : T.textSecondary,
                    fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                  {o.label}
                  <span style={{
                    padding: '1px 7px', borderRadius: 99,
                    background: filters.owner === o.id ? pColor : T.border,
                    color: filters.owner === o.id ? '#fff' : T.textSecondary,
                    fontSize: 10, fontWeight: 800,
                  }}>{o.count}</span>
                </button>
              ))}
            </div>
          )}
          <Button onClick={handleCreateNew} icon="plus">{t('Tạo đề mới', 'Create exam')}</Button>
        </div>

        {/* Filter bar */}
        <div style={{
          ...ebStyles.cardShell, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 220 }}>
            <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              placeholder={t('Tìm theo tên đề thi…', 'Search by exam title…')}
              style={{
                width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9,
                border: `1.5px solid ${T.border}`, fontSize: 12.5, fontFamily: 'inherit',
                background: '#fff', color: T.textPrimary, outline: 'none', boxSizing: 'border-box',
              }} />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
              <Icon name="search" size={14} color={T.textMuted} />
            </span>
          </div>
          <EBDropdown label={t('Môn', 'Subject')} icon="bookOpen" value={filters.subject}
            onChange={v => setFilters(f => ({ ...f, subject: v }))}
            options={[
              { value: 'all', label: t('Tất cả môn', 'All subjects') },
              ...EB_SUBJECTS.map(s => ({ value: s.id, label: t(s.vi, s.en) })),
            ]} minWidth={170} />
          <EBDropdown label={t('Khối', 'Grade')} icon="graduationCap" value={filters.grade}
            onChange={v => setFilters(f => ({ ...f, grade: v }))}
            options={[
              { value: 'all', label: t('Tất cả khối', 'All grades') },
              ...EB_GRADES.map(g => ({ value: String(g), label: t(`Lớp ${g}`, `Grade ${g}`) })),
            ]} minWidth={140} />
          <EBDropdown label={t('Loại đề', 'Type')} icon="layers" value={filters.type}
            onChange={v => setFilters(f => ({ ...f, type: v }))}
            options={[
              { value: 'all', label: t('Tất cả loại', 'All types') },
              ...Object.entries(EB_EXAM_TYPES).map(([k, v]) => ({ value: k, label: t(v.vi, v.en) })),
            ]} minWidth={150} />
          <div style={{ flex: 1 }} />
          {(pubCount > 0 || draftCount > 0) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: T.textMuted }}>
              {pubCount > 0 && <EBStatusChip status="published" t={t} size="sm" />}
              <span style={{ fontWeight: 700, color: T.textSecondary }}>{pubCount}</span>
              {draftCount > 0 && <EBStatusChip status="draft" t={t} size="sm" />}
              <span style={{ fontWeight: 700, color: T.textSecondary }}>{draftCount}</span>
            </div>
          )}
        </div>

        {/* List */}
        {visible.length === 0 ? (
          <EBEmptyState
            variant={filtersDirty ? 'filter' : 'all'} t={t} pColor={pColor}
            onCreate={handleCreateNew}
            onReset={() => setFilters(f => ({ ...f, q: '', subject: 'all', grade: 'all', type: 'all' }))} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map(exam => (
              <EBExamCard key={exam.id} exam={exam} t={t} pColor={pColor}
                isMine={isTeacher && exam.ownerId === 'me'}
                onView={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={(e) => setConfirmDelete(e)}
                onAssign={(e) => setAssignTarget(e)} />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <EBConfirmDialog t={t}
          title={t('Xoá đề thi?', 'Delete exam?')}
          message={t(`Đề thi "${confirmDelete.title}" sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác.`,
                     `"${confirmDelete.title}" will be permanently deleted. This cannot be undone.`)}
          confirmLabel={t('Xoá đề thi', 'Delete exam')}
          confirmIcon="trash" danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleConfirmDelete} />
      )}

      {/* Assign dialog (light placeholder — full flow lives in classops/exam mgmt) */}
      {assignTarget && (
        <EBConfirmDialog t={t} pColor={pColor}
          title={t('Giao bài kiểm tra', 'Assign exam')}
          message={t(`Sẽ giao đề "${assignTarget.title}" — bạn sẽ chọn lớp, thời điểm bắt đầu / kết thúc và thời gian làm bài ở bước tiếp theo.`,
                     `You'll assign "${assignTarget.title}" — pick class, start/end window and duration on the next step.`)}
          confirmLabel={t('Tiếp tục giao bài', 'Continue to assign')}
          confirmIcon="arrowRight"
          onCancel={() => setAssignTarget(null)}
          onConfirm={() => {
            setAssignTarget(null);
            showToast(t('Đã chuyển sang luồng giao bài.', 'Switched to assignment flow.'));
          }} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'eb-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={14} color={T.success} strokeWidth={2.6} />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes eb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes eb-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
};

// ── Builder ────────────────────────────────────────────────────────────────

const ExamBuilderScreen = ({ lang, primaryColor, exam, onCancel, onSave }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isEdit = !!exam;

  // Initial state — clone the exam if editing, else blank metadata + one MCQ.
  const initial = exam || {
    id: `ex${Date.now()}`,
    title: '', subjectId: 'sub-math', gradeLevel: 10, examType: 'midterm',
    durationMin: 45, status: 'draft',
    createdAt: new Date().toLocaleDateString('vi-VN'),
    updatedAt: new Date().toLocaleDateString('vi-VN'),
    usedCount: 0, questions: [ebBlankMCQ()],
  };

  const [draft, setDraft] = React.useState(initial);
  const [activeQid, setActiveQid] = React.useState(initial.questions[0]?.id || null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [saveFlash, setSaveFlash] = React.useState(null);
  // Unsaved indicator (LMS-03): flips true on any edit, clears on save.
  const [isDirty, setIsDirty] = React.useState(false);

  const activeQ = draft.questions.find(q => q.id === activeQid) || draft.questions[0];
  const totalPts = ebTotalPoints(draft.questions);

  // ── Mutators ────────────────────────────────────────────────────────────
  // Every mutator routes through this so the dirty flag stays in lockstep with state.
  const updateMeta = (k, v) => { setDraft(d => ({ ...d, [k]: v })); setIsDirty(true); };
  const updateQ = (qid, patch) => { setDraft(d => ({
    ...d,
    questions: d.questions.map(q => q.id === qid ? { ...q, ...patch } : q),
  })); setIsDirty(true); };
  const addQuestion = (type) => {
    const newQ = type === 'essay' ? ebBlankEssay() : ebBlankMCQ();
    setDraft(d => ({ ...d, questions: [...d.questions, newQ] }));
    setActiveQid(newQ.id);
    setIsDirty(true);
  };
  const deleteQuestion = (qid) => {
    setDraft(d => {
      const next = d.questions.filter(q => q.id !== qid);
      if (next.length === 0) next.push(ebBlankMCQ());
      return { ...d, questions: next };
    });
    if (activeQid === qid) {
      const remaining = draft.questions.filter(q => q.id !== qid);
      setActiveQid(remaining[0]?.id || null);
    }
    setIsDirty(true);
  };
  const setQType = (qid, type) => {
    setDraft(d => ({
      ...d,
      questions: d.questions.map(q => {
        if (q.id !== qid) return q;
        if (type === 'mcq')   return { ...ebBlankMCQ(), id: q.id, prompt: q.prompt, points: q.points || 1 };
        if (type === 'essay') return { ...ebBlankEssay(), id: q.id, prompt: q.prompt, points: q.points || 2 };
        return q;
      }),
    }));
    setIsDirty(true);
  };

  // ── Validation ──────────────────────────────────────────────────────────
  const titleOk = draft.title.trim().length >= 4 && draft.title.length <= 200;
  const durationOk = draft.durationMin > 0 && draft.durationMin <= 240;
  const allQuestionsOk = draft.questions.length > 0 && draft.questions.every(q => {
    if (!q.prompt.trim()) return false;
    if (q.type === 'mcq') return q.options.every(o => o.trim()) && q.options.length >= 2;
    return true;
  });
  const canPublish = titleOk && durationOk && allQuestionsOk;

  // ── Save handlers ───────────────────────────────────────────────────────
  // Both save paths clear the dirty flag so the "Chưa lưu" indicator hides.
  const handleSaveDraft = () => {
    onSave({ ...draft, status: 'draft', updatedAt: new Date().toLocaleDateString('vi-VN') });
    setIsDirty(false);
  };
  const handlePublish = () => {
    if (!canPublish) {
      setSaveFlash({ kind: 'error', msg: t('Cần điền tiêu đề, thời gian và tất cả câu hỏi.', 'Title, duration and all questions must be filled.') });
      setTimeout(() => setSaveFlash(null), 3200);
      return;
    }
    onSave({ ...draft, status: 'published', updatedAt: new Date().toLocaleDateString('vi-VN') });
    setIsDirty(false);
  };

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: '14px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onCancel}
          style={{
            padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: '#fff', color: T.textSecondary, fontSize: 12.5, fontWeight: 700,
            fontFamily: 'inherit', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          <Icon name="chevronLeft" size={12} color={T.textSecondary} />
          {t('Về kho đề', 'Back to bank')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            US-E13.4 · {isEdit ? t('Chỉnh sửa đề thi', 'Edit exam') : t('Tạo đề mới', 'Create new exam')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {draft.title || t('— Chưa đặt tên đề —', '— Untitled exam —')}
          </div>
        </div>
        <EBStatusChip status={draft.status} t={t} />
        <button onClick={() => setShowPreview(true)}
          style={{
            padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${pColor}40`,
            background: pColor + '0E', color: pColor, fontSize: 13, fontWeight: 700,
            fontFamily: 'inherit', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <Icon name="eye" size={13} color={pColor} strokeWidth={2.2} />
          {t('Xem trước đề', 'Preview exam')}
        </button>
        <button onClick={handleSaveDraft}
          style={{
            padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${T.border}`,
            background: '#fff', color: T.textSecondary, fontSize: 13, fontWeight: 700,
            fontFamily: 'inherit', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <Icon name="penLine" size={12} color={T.textSecondary} strokeWidth={2.2} />
          {t('Lưu nháp', 'Save draft')}
        </button>
        <button onClick={handlePublish}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: canPublish ? T.success : T.textMuted,
            color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            cursor: canPublish ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
          {t('Lưu & Phát hành', 'Save & publish')}
        </button>
      </div>

      {/* Metadata header */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: '14px 24px', flexShrink: 0,
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 14,
        position: 'relative',
      }}>
        {isDirty && (
          <div title={t('Có thay đổi chưa lưu', 'You have unsaved changes')}
            style={{
              position: 'absolute', top: 8, right: 14,
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 99,
              background: T.warning + '18', color: T.warning,
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em',
            }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: T.warning,
              boxShadow: `0 0 0 3px ${T.warning}25`,
            }} />
            {t('Chưa lưu', 'Unsaved')}
          </div>
        )}
        <div>
          <label style={ebStyles.fieldLabel}>{t('Tên đề thi', 'Exam title')} <span style={{ color: T.error }}>*</span></label>
          <input value={draft.title} onChange={e => updateMeta('title', e.target.value)}
            placeholder={t('VD: Kiểm tra Giữa kỳ 1 — Toán lớp 10', 'e.g. Midterm 1 — Math Grade 10')}
            maxLength={200} style={ebStyles.input} />
        </div>
        <div>
          <label style={ebStyles.fieldLabel}>{t('Môn', 'Subject')}</label>
          <select value={draft.subjectId} onChange={e => updateMeta('subjectId', e.target.value)}
            style={ebStyles.input}>
            {EB_SUBJECTS.map(s => <option key={s.id} value={s.id}>{t(s.vi, s.en)}</option>)}
          </select>
        </div>
        <div>
          <label style={ebStyles.fieldLabel}>{t('Khối', 'Grade')}</label>
          <select value={draft.gradeLevel} onChange={e => updateMeta('gradeLevel', +e.target.value)}
            style={ebStyles.input}>
            {EB_GRADES.map(g => <option key={g} value={g}>{t(`Lớp ${g}`, `Grade ${g}`)}</option>)}
          </select>
        </div>
        <div>
          <label style={ebStyles.fieldLabel}>{t('Loại đề', 'Exam type')}</label>
          <select value={draft.examType} onChange={e => updateMeta('examType', e.target.value)}
            style={ebStyles.input}>
            {Object.entries(EB_EXAM_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{t(v.vi, v.en)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={ebStyles.fieldLabel}>{t('Thời gian (phút)', 'Duration (min)')}</label>
          <input type="number" min={5} max={240} value={draft.durationMin}
            onChange={e => updateMeta('durationMin', Math.max(5, +e.target.value || 5))}
            style={{ ...ebStyles.input, fontVariantNumeric: 'tabular-nums' }} />
        </div>
        <div>
          <label style={ebStyles.fieldLabel}>{t('Tổng điểm', 'Total points')}</label>
          <div style={{
            padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`,
            background: T.bg, fontSize: 14, fontWeight: 800, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="award" size={14} color={T.success} strokeWidth={2.2} />
            {totalPts.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {/* Left — question list (30%) */}
        <aside style={{
          width: '30%', minWidth: 280, maxWidth: 380, flexShrink: 0,
          background: T.card, borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {t('Danh sách câu hỏi', 'Questions')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, marginTop: 2 }}>
                {draft.questions.length} {t('câu', 'questions')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 700 }}>
                {ebCountByType(draft.questions, 'mcq')} {t('TN', 'MCQ')} · {ebCountByType(draft.questions, 'essay')} {t('TL', 'Essay')}
              </span>
              <span style={{ fontSize: 11.5, color: T.success, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {totalPts.toFixed(1)} {t('điểm', 'pts')}
              </span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {draft.questions.map((q, i) => (
              <EBQuestionListItem key={q.id} q={q} idx={i + 1}
                active={q.id === activeQid}
                onSelect={() => setActiveQid(q.id)}
                onDelete={() => deleteQuestion(q.id)}
                t={t} pColor={pColor} />
            ))}
          </div>
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => addQuestion('mcq')}
              style={{
                flex: 1, padding: '9px 10px', borderRadius: 8,
                border: `1.5px dashed ${pColor}55`, background: pColor + '08', color: pColor,
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <Icon name="plus" size={12} color={pColor} strokeWidth={2.4} />
              {t('Thêm trắc nghiệm', 'Add MCQ')}
            </button>
            <button onClick={() => addQuestion('essay')}
              style={{
                flex: 1, padding: '9px 10px', borderRadius: 8,
                border: `1.5px dashed ${T.purple}55`, background: T.purple + '08', color: T.purple,
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <Icon name="plus" size={12} color={T.purple} strokeWidth={2.4} />
              {t('Thêm tự luận', 'Add essay')}
            </button>
          </div>
        </aside>

        {/* Right — editor (70%) */}
        <section style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeQ ? (
            <EBQuestionEditor
              question={activeQ}
              index={draft.questions.findIndex(q => q.id === activeQ.id) + 1}
              onChange={(patch) => updateQ(activeQ.id, patch)}
              onTypeChange={(type) => setQType(activeQ.id, type)}
              t={t} pColor={pColor} />
          ) : (
            <div style={{ textAlign: 'center', padding: 80, color: T.textMuted }}>
              {t('Chọn một câu hỏi từ danh sách bên trái.', 'Select a question from the left.')}
            </div>
          )}
        </section>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <EBPreviewModal exam={draft} t={t} pColor={pColor} onClose={() => setShowPreview(false)} />
      )}

      {/* Save error flash */}
      {saveFlash && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: saveFlash.kind === 'error' ? T.error : '#1F2937', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'eb-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alertTriangle" size={14} color="#fff" strokeWidth={2.4} />
          {saveFlash.msg}
        </div>
      )}

      <style>{`
        @keyframes eb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes eb-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
};

// ── Builder — Question list item ────────────────────────────────────────────

const EBQuestionListItem = ({ q, idx, active, onSelect, onDelete, t, pColor }) => {
  const isMCQ = q.type === 'mcq';
  const typeColor = isMCQ ? pColor : T.purple;
  const preview = q.prompt.trim() || t('(Chưa nhập câu hỏi)', '(Empty question)');
  // Visual drag affordance only (LMS-03 spec line ~454). The grip icon
  // reveals on row hover; no real DnD wiring in the prototype.
  const [hover, setHover] = React.useState(false);

  return (
    <div onClick={onSelect}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        padding: '11px 12px 11px 28px', borderRadius: 9,
        background: active ? pColor + '0E' : '#fff',
        border: `1.5px solid ${active ? pColor + '55' : T.border}`,
        cursor: 'pointer', marginBottom: 6,
        transition: 'background 0.12s, border-color 0.12s',
      }}>
      {/* Drag handle — visible on hover/active row; cursor:grab signals intent. */}
      <div
        title={t('Kéo để sắp xếp lại', 'Drag to reorder')}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left: 6, top: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 18, cursor: 'grab',
          opacity: (hover || active) ? 0.7 : 0,
          transition: 'opacity 0.12s',
        }}>
        <Icon name="gripVertical" size={14} color={T.textMuted} strokeWidth={2} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, borderRadius: '50%',
          background: active ? pColor : T.bg, color: active ? '#fff' : T.textSecondary,
          fontSize: 11, fontWeight: 800, flexShrink: 0,
        }}>{idx}</span>
        <span style={{
          padding: '2px 7px', borderRadius: 5,
          background: typeColor + '14', color: typeColor,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
        }}>
          {isMCQ ? t('TRẮC NGHIỆM', 'MCQ') : t('TỰ LUẬN', 'ESSAY')}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: 11.5, fontWeight: 800, color: T.success,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {q.points.toFixed(1)} {t('đ', 'pt')}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            background: 'transparent', border: 'none', padding: 3, cursor: 'pointer',
            borderRadius: 4, display: 'inline-flex',
          }}
          title={t('Xoá câu hỏi', 'Delete question')}>
          <Icon name="trash" size={12} color={T.textMuted} />
        </button>
      </div>
      <div style={{
        fontSize: 12, color: T.textSecondary, lineHeight: 1.45,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {preview}
      </div>
    </div>
  );
};

// ── Builder — Question editor ──────────────────────────────────────────────

const EBQuestionEditor = ({ question: q, index, onChange, onTypeChange, t, pColor }) => {
  const isMCQ = q.type === 'mcq';
  const updateOption = (i, val) => {
    const next = [...q.options];
    next[i] = val;
    onChange({ options: next });
  };

  return (
    <div style={{ maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%',
          background: pColor + '14', color: pColor, fontWeight: 800, fontSize: 15,
        }}>{index}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>
            {t(`Câu ${index}`, `Question ${index}`)}
          </div>
          <div style={{ fontSize: 11.5, color: T.textMuted }}>
            {t('Soạn nội dung câu hỏi và chấm điểm.', 'Compose the question and assign points.')}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Question type radio */}
        <div style={{ display: 'flex', borderRadius: 9, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: '#fff' }}>
          {[
            { id: 'mcq',   label: t('Trắc nghiệm', 'MCQ'),   color: pColor,    icon: 'checkSquare' },
            { id: 'essay', label: t('Tự luận', 'Essay'),     color: T.purple,  icon: 'penLine' },
          ].map(o => {
            const active = q.type === o.id;
            return (
              <button key={o.id} onClick={() => onTypeChange(o.id)}
                style={{
                  padding: '8px 14px', border: 'none',
                  background: active ? o.color + '14' : 'transparent',
                  color: active ? o.color : T.textSecondary,
                  fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <Icon name={o.icon} size={12} color={active ? o.color : T.textSecondary} strokeWidth={2.2} />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prompt */}
      <div style={ebStyles.cardShell}>
        <div style={{ padding: 18 }}>
          <label style={ebStyles.fieldLabel}>{t('Nội dung câu hỏi', 'Question prompt')} <span style={{ color: T.error }}>*</span></label>
          <textarea value={q.prompt} onChange={e => onChange({ prompt: e.target.value })}
            rows={3}
            placeholder={t('VD: Đạo hàm của hàm số f(x) = x³ − 3x² + 2x − 1 tại x = 2 là?',
                           'e.g. The derivative of f(x) = x³ − 3x² + 2x − 1 at x = 2 is?')}
            style={ebStyles.textarea} />
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              style={{
                padding: '7px 12px', borderRadius: 7, border: `1px dashed ${T.border}`,
                background: 'transparent', color: T.textSecondary, fontSize: 11.5, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}>
              <Icon name="image" size={12} color={T.textSecondary} />
              {t('Thêm hình ảnh', 'Add image')}
            </button>
            <div style={{ flex: 1 }} />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('Điểm:', 'Points:')}
            </label>
            <input type="number" min={0.25} step={0.25} max={20} value={q.points}
              onChange={e => onChange({ points: Math.max(0, +e.target.value || 0) })}
              style={{
                width: 80, padding: '7px 10px', borderRadius: 7,
                border: `1.5px solid ${T.border}`, fontSize: 13, fontWeight: 700,
                color: T.textPrimary, background: '#fff', outline: 'none', fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums', textAlign: 'right',
              }} />
          </div>
        </div>
      </div>

      {/* MCQ options OR essay hint */}
      {isMCQ ? (
        <div style={ebStyles.cardShell}>
          <div style={{ padding: 18 }}>
            {/* LMS-03 spec line ~464: options are now stateful (2–6),
                with a "Thêm lựa chọn" ghost button and per-row remove X. */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ ...ebStyles.fieldLabel, marginBottom: 0 }}>
                {t(`${q.options.length} phương án trả lời`,
                   `${q.options.length} answer options`)}
              </label>
              <div style={{ fontSize: 11, color: T.textMuted }}>
                {t('Chọn 1 đáp án đúng · tối đa 6', 'Pick 1 correct answer · max 6')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, i) => {
                const isCorrect = q.correctIndex === i;
                const canRemove = q.options.length > 2;
                return (
                  <div key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      border: `1.5px solid ${isCorrect ? T.success : T.border}`,
                      background: isCorrect ? T.successLight : '#fff',
                      transition: 'all 0.12s',
                    }}>
                    <button onClick={() => onChange({ correctIndex: i })}
                      title={t('Đặt làm đáp án đúng', 'Mark as correct')}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isCorrect ? T.success : T.border}`,
                        background: isCorrect ? T.success : '#fff',
                        color: isCorrect ? '#fff' : T.textSecondary,
                        fontSize: 12, fontWeight: 800,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                      {isCorrect ? <Icon name="check" size={12} color="#fff" strokeWidth={2.6} /> : EB_OPT_LETTERS[i]}
                    </button>
                    <input value={opt} onChange={e => updateOption(i, e.target.value)}
                      placeholder={t(`Phương án ${EB_OPT_LETTERS[i]}…`, `Option ${EB_OPT_LETTERS[i]}…`)}
                      style={{
                        flex: 1, padding: '6px 8px', border: 'none', background: 'transparent',
                        fontSize: 13, fontFamily: 'inherit',
                        color: isCorrect ? T.success : T.textPrimary,
                        fontWeight: isCorrect ? 700 : 500, outline: 'none',
                      }} />
                    {isCorrect && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 99,
                        background: T.success, color: '#fff',
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                      }}>
                        {t('ĐÁP ÁN ĐÚNG', 'CORRECT')}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (!canRemove) return;
                        const nextOpts = q.options.filter((_, j) => j !== i);
                        // Reanchor correctIndex if we removed/shifted past it.
                        let nextCorrect = q.correctIndex;
                        if (i === q.correctIndex) nextCorrect = 0;
                        else if (i < q.correctIndex) nextCorrect = q.correctIndex - 1;
                        onChange({ options: nextOpts, correctIndex: nextCorrect });
                      }}
                      disabled={!canRemove}
                      title={canRemove
                        ? t('Xoá phương án', 'Remove option')
                        : t('Tối thiểu 2 phương án', 'Minimum 2 options')}
                      style={{
                        background: 'transparent', border: 'none', padding: 4,
                        cursor: canRemove ? 'pointer' : 'not-allowed',
                        opacity: canRemove ? 0.6 : 0.25,
                        borderRadius: 6, display: 'inline-flex',
                      }}>
                      <Icon name="x" size={13} color={T.textMuted} strokeWidth={2.2} />
                    </button>
                  </div>
                );
              })}
            </div>
            {q.options.length < 6 && (
              <button
                onClick={() => onChange({ options: [...q.options, ''] })}
                style={{
                  marginTop: 10,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  border: `1px dashed ${T.border}`, background: 'transparent',
                  color: pColor, fontSize: 12, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>
                <Icon name="plus" size={12} color={pColor} strokeWidth={2.4} />
                {t('Thêm lựa chọn', 'Add option')}
                <span style={{ color: T.textMuted, fontWeight: 600, marginLeft: 4 }}>
                  ({q.options.length}/6)
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={ebStyles.cardShell}>
          <div style={{ padding: 18 }}>
            <label style={ebStyles.fieldLabel}>
              {t('Gợi ý đáp án / Tiêu chí chấm', 'Answer hint / Grading criteria')}
              <span style={{ marginLeft: 6, color: T.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'none', letterSpacing: 'normal' }}>
                · {t('Ẩn khi HS làm bài', 'Hidden during exam')}
              </span>
            </label>
            <textarea value={q.hint} onChange={e => onChange({ hint: e.target.value })}
              rows={4}
              placeholder={t('VD: HS cần trình bày các bước: (1) Đặt ẩn phụ; (2) Quy về phương trình bậc 2; (3) Tìm nghiệm trong khoảng…',
                             'e.g. Students should show steps: (1) Substitute; (2) Reduce to quadratic; (3) Find roots in range…')}
              style={{ ...ebStyles.textarea, minHeight: 100, background: T.bg }} />
            <div style={{ marginTop: 8, fontSize: 11.5, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="info" size={11} color={T.textMuted} />
              {t('Gợi ý chỉ hiển thị khi giáo viên chấm bài, không hiển thị cho học sinh.',
                 'Hint is only shown to graders, never to students.')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Preview modal (student-facing render) ──────────────────────────────────

const EBPreviewModal = ({ exam, t, pColor, onClose }) => {
  const subj = ebSubject(exam.subjectId);
  const totalPts = ebTotalPoints(exam.questions);
  return (
    <React.Fragment>
      <div onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.55)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 24, bottom: 24, left: '50%',
        transform: 'translateX(-50%)', width: 880, maxWidth: 'calc(100vw - 48px)',
        background: T.card, borderRadius: 16, zIndex: 1101,
        boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'eb-fadein 0.2s ease-out',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '14px 22px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: pColor + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="eye" size={16} color={pColor} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {t('Xem trước đề thi · Hiển thị như học sinh thấy', 'Exam preview · Student-facing view')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary, marginTop: 2 }}>
              {exam.title || t('— Chưa đặt tên đề —', '— Untitled exam —')}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Icon name="x" size={18} color={T.textMuted} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', background: T.bg, padding: '28px 32px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Paper header */}
            <div style={{
              background: '#fff', borderRadius: 14, border: `1px solid ${T.border}`,
              padding: '22px 26px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t('THPT Nguyễn Du · Năm học 2025–2026', 'Nguyen Du High School · Academic Year 2025–2026')}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.textPrimary, marginTop: 8, lineHeight: 1.35 }}>
                {exam.title || t('— Chưa đặt tên đề —', '— Untitled exam —')}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Badge color={subj.color}>{t(subj.vi, subj.en)}</Badge>
                <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>{t(`Lớp ${exam.gradeLevel}`, `Grade ${exam.gradeLevel}`)}</span>
                <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="clock" size={12} color={T.textMuted} /> {exam.durationMin} {t('phút', 'min')}
                </span>
                <span style={{ fontSize: 12, color: T.textMuted }}>·</span>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 600 }}>
                  {exam.questions.length} {t('câu', 'questions')} · {totalPts.toFixed(1)} {t('điểm', 'pts')}
                </span>
              </div>
            </div>

            {/* Questions */}
            {exam.questions.map((q, i) => (
              <EBPreviewQuestion key={q.id} q={q} idx={i + 1} subj={subj} pColor={pColor} t={t} />
            ))}

            {/* End-of-paper marker */}
            <div style={{ textAlign: 'center', padding: '14px 0', color: T.textMuted, fontSize: 12, fontStyle: 'italic' }}>
              — {t('Hết —', 'End —')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11.5, color: T.textMuted, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="info" size={11} color={T.textMuted} />
            {t('Đáp án đúng và gợi ý chấm chỉ hiển thị ở chế độ này — học sinh sẽ không thấy.',
               'Correct answers and grading hints are only shown in preview — students won\'t see them.')}
          </div>
          <button onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              background: pColor, color: '#fff', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>
            {t('Đóng xem trước', 'Close preview')}
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};

// ── Preview — single question ──────────────────────────────────────────────

const EBPreviewQuestion = ({ q, idx, subj, pColor, t }) => {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: `1px solid ${T.border}`,
      padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    }}>
      {/* Question header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: '50%',
          background: pColor + '14', color: pColor, fontWeight: 800, fontSize: 13,
          flexShrink: 0,
        }}>{idx}</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, color: T.textPrimary, lineHeight: 1.6, margin: 0 }}>
            {q.prompt.trim() || t('(Chưa nhập nội dung câu hỏi)', '(Empty question)')}
          </p>
        </div>
        <span style={{
          padding: '3px 10px', borderRadius: 99,
          background: T.successLight, color: T.success,
          fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {q.points.toFixed(1)} {t('đ', 'pt')}
        </span>
      </div>

      {/* MCQ options */}
      {q.type === 'mcq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 44 }}>
          {q.options.map((opt, i) => {
            const isCorrect = q.correctIndex === i;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10,
                border: `2px solid ${isCorrect ? T.success : T.border}`,
                background: isCorrect ? T.successLight : '#fff',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: isCorrect ? T.success : T.bg,
                  border: `1.5px solid ${isCorrect ? T.success : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  color: isCorrect ? '#fff' : T.textMuted,
                }}>{EB_OPT_LETTERS[i]}</div>
                <span style={{
                  fontSize: 13.5, color: isCorrect ? T.success : T.textPrimary,
                  fontWeight: isCorrect ? 700 : 500, lineHeight: 1.4, flex: 1,
                }}>
                  {opt || t(`Phương án ${EB_OPT_LETTERS[i]}`, `Option ${EB_OPT_LETTERS[i]}`)}
                </span>
                {isCorrect && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 99,
                    background: T.success, color: '#fff',
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                  }}>
                    <Icon name="check" size={10} color="#fff" strokeWidth={2.6} />
                    {t('ĐÁP ÁN', 'KEY')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Essay — show answer area + hint */}
      {q.type === 'essay' && (
        <div style={{ paddingLeft: 44 }}>
          <div style={{
            padding: '18px 16px', borderRadius: 10,
            border: `1.5px dashed ${T.border}`, background: T.bg,
            fontSize: 12.5, color: T.textMuted, fontStyle: 'italic',
            minHeight: 80,
          }}>
            {t('Học sinh trình bày bài làm tại đây…', 'Students compose their answer here…')}
          </div>
          {q.hint && (
            <div style={{
              marginTop: 10, padding: '11px 14px', borderRadius: 9,
              background: T.warning + '0E', border: `1px solid ${T.warning}33`,
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: T.warning, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="info" size={11} color={T.warning} />
                {t('Gợi ý chấm (ẩn với HS)', 'Grading hint (hidden from students)')}
              </div>
              <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>
                {q.hint}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Confirm dialog (used for delete + assign) ──────────────────────────────

const EBConfirmDialog = ({ title, message, confirmLabel, confirmIcon, danger, t, pColor, onCancel, onConfirm }) => (
  <React.Fragment>
    <div onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.55)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 440, maxWidth: 'calc(100vw - 32px)', background: T.card,
      borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.24)', zIndex: 1101,
      padding: 24, animation: 'eb-fadein 0.18s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: danger ? T.errorLight : (pColor || T.primary) + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name={danger ? 'trash' : 'send'} size={20}
            color={danger ? T.error : (pColor || T.primary)} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary }}>{title}</div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 6, lineHeight: 1.55 }}>{message}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost" onClick={onCancel}>{t('Huỷ', 'Cancel')}</Button>
        <button onClick={onConfirm} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: danger ? T.error : (pColor || T.primary),
          color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name={confirmIcon || 'check'} size={12} color="#fff" strokeWidth={2.4} />
          {confirmLabel}
        </button>
      </div>
    </div>
  </React.Fragment>
);

Object.assign(window, { ExamBankScreen, ExamBuilderScreen });
