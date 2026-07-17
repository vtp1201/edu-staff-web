// ── Question Bank (Ngân hàng câu hỏi) ───────────────────────────────────────
// Routes:   /teacher/question-bank          — TEACHER: own DRAFT+PUBLISHED
//                                              (list) + cross-teacher PUBLISHED
//                                              search (mandatory filter, 422 gate)
//           /teacher/question-bank/create    — TEACHER builder (create)
//           /teacher/question-bank/:id/edit  — TEACHER builder (edit, DRAFT only)
// Epic:     US-E18.16 (FE design) / DR-021, BE contract `exercisebank` (core service)
// NOT the existing exam-bank.jsx (MCQ exam papers, `exambank` service — different
// domain) and NOT the per-lesson Q&A comment thread in lesson-player.
//
// Two exported components on window:
//   • QuestionBankScreen        — list view (mandatory-filter search + own list)
//   • QuestionBankBuilderScreen — single-col builder (type ⟷ body ⟷ answer)
//
// Visual references:
//   • exam-bank.jsx  — row-card list layout, StatusBadge draft/published
//                      2-value convention, one-way publish confirm
//   • states.jsx      — EduSkeleton / EduEmpty / EduError
//
// BE contract note: GET /questions (own, no filter required) vs
// GET /questions/search (staff-only, PUBLISHED only, cross-teacher, REQUIRES
// ≥1 of subjectId/tag — 422 QUESTION_SEARCH_FILTER_REQUIRED otherwise). This
// screen models both as an owner/scope toggle: "Của tôi" (own, unrestricted)
// vs "Tìm kiếm" (cross-teacher search, mandatory filter).

// ── Domain vocabulary ───────────────────────────────────────────────────────

const QB_SUBJECTS = [
  { id: 'sub-math', vi: 'Toán học',  en: 'Mathematics', color: '#5D87FF' },
  { id: 'sub-phys', vi: 'Vật Lý',    en: 'Physics',     color: '#13DEB9' },
  { id: 'sub-chem', vi: 'Hoá Học',   en: 'Chemistry',   color: '#FFAE1F' },
  { id: 'sub-lit',  vi: 'Ngữ Văn',   en: 'Literature',  color: '#7B5EA7' },
  { id: 'sub-eng',  vi: 'Tiếng Anh', en: 'English',     color: '#1FAFC0' },
  { id: 'sub-hist', vi: 'Lịch Sử',   en: 'History',     color: '#FA896B' },
];

const QB_GRADES = [10, 11, 12];

// Only 3 types on the wire — NO MCQ options array. Do not design an
// options-editor UI (cross-repo ask #24, out of scope here).
const QB_TYPES = {
  ESSAY:        { vi: 'Tự luận',       en: 'Essay',       color: '#7B5EA7', icon: 'scrollText' },
  SHORT_ANSWER: { vi: 'Trả lời ngắn',  en: 'Short answer', color: '#5D87FF', icon: 'edit' },
  FILL_IN:      { vi: 'Điền khuyết',   en: 'Fill-in-the-blank', color: '#13DEB9', icon: 'list' },
};

// 3-tier difficulty — reuses the EXISTING GPA-tier success/warning/error
// convention (design-system.md §Score/performance màu). Not a new token.
const QB_DIFFICULTY = {
  EASY:   { vi: 'Dễ',          en: 'Easy',   color: '#13DEB9', bg: '#E6FFFA', icon: 'check' },
  MEDIUM: { vi: 'Trung bình',  en: 'Medium', color: '#FFAE1F', bg: '#FEF5E5', icon: 'percent', fg: '#2A3547' },
  HARD:   { vi: 'Khó',         en: 'Hard',   color: '#FA896B', bg: '#FFF5F2', icon: 'flag' },
};

// DRAFT/PUBLISHED — same 2-value convention as exam-bank / lesson-plan.
const QB_STATUS = {
  DRAFT:     { vi: 'Nháp',          en: 'Draft',     color: '#FFAE1F', bg: '#FEF5E5', icon: 'penLine' },
  PUBLISHED: { vi: 'Đã phát hành',  en: 'Published', color: '#13DEB9', bg: '#E6FFFA', icon: 'check' },
};

const QB_OWNERS = {
  me:      { id: 'me',    name: 'Bạn',              en: 'You',           initials: 'NH' },
  'tch-2': { id: 'tch-2', name: 'Trần Văn Minh',    en: 'Tran V. Minh',  initials: 'TM' },
  'tch-3': { id: 'tch-3', name: 'Lê Thị Hoa',       en: 'Le T. Hoa',     initials: 'LH' },
  'tch-4': { id: 'tch-4', name: 'Phạm Quốc Bảo',    en: 'Pham Q. Bao',   initials: 'PB' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const qbSubject = (id) => QB_SUBJECTS.find(s => s.id === id) || QB_SUBJECTS[0];
const qbOwner   = (id) => QB_OWNERS[id] || QB_OWNERS.me;
const qbToday   = () => new Date().toLocaleDateString('vi-VN');
const qbTruncate = (s, n) => (s || '').length > n ? `${s.slice(0, n).trim()}…` : (s || '');

const useQBIsMobile = () => {
  const [mobile, setMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 860 : false);
  React.useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 860);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

// ── Seed data ───────────────────────────────────────────────────────────────

const QB_SEED = [
  {
    id: 'q1', authorId: 'me', questionType: 'ESSAY', subjectId: 'sub-math', gradeLevel: 12,
    difficulty: 'HARD', status: 'PUBLISHED',
    body: 'Giải phương trình lượng giác: 2sin²x − 3sinx + 1 = 0, với x ∈ [0, 2π]. Trình bày rõ các bước biến đổi.',
    expectedAnswer: 'Đặt t = sin(x), giải phương trình bậc hai theo t (t = 1 hoặc t = 1/2), sau đó tìm x trong khoảng đã cho.',
    tags: ['Lượng giác', 'Chương 1'], createdAt: '10/05/2026', updatedAt: '18/05/2026', publishedAt: '18/05/2026',
  },
  {
    id: 'q2', authorId: 'me', questionType: 'SHORT_ANSWER', subjectId: 'sub-math', gradeLevel: 11,
    difficulty: 'EASY', status: 'PUBLISHED',
    body: 'Đạo hàm của hàm số f(x) = x³ − 3x² + 2x − 1 tại x = 2 là bao nhiêu?',
    expectedAnswer: '2',
    tags: ['Đạo hàm'], createdAt: '02/05/2026', updatedAt: '02/05/2026', publishedAt: '02/05/2026',
  },
  {
    id: 'q3', authorId: 'me', questionType: 'FILL_IN', subjectId: 'sub-math', gradeLevel: 10,
    difficulty: 'MEDIUM', status: 'DRAFT',
    body: 'Phương trình x² − 5x + 6 = 0 có hai nghiệm là x₁ = ___ và x₂ = ___.',
    expectedAnswer: 'x₁ = 2, x₂ = 3',
    tags: ['Phương trình'], createdAt: '28/05/2026', updatedAt: '30/05/2026', publishedAt: null,
  },
  {
    id: 'q4', authorId: 'tch-2', questionType: 'ESSAY', subjectId: 'sub-phys', gradeLevel: 11,
    difficulty: 'HARD', status: 'PUBLISHED',
    body: 'Trình bày nguyên lý chồng chất điện trường và áp dụng tính cường độ điện trường tổng hợp tại một điểm do hai điện tích điểm gây ra.',
    expectedAnswer: 'Vectơ cường độ điện trường tổng hợp bằng tổng vectơ của từng điện trường thành phần; áp dụng công thức cộng vectơ theo quy tắc hình bình hành.',
    tags: ['Điện trường'], createdAt: '15/05/2026', updatedAt: '20/05/2026', publishedAt: '20/05/2026',
  },
  {
    id: 'q5', authorId: 'tch-3', questionType: 'SHORT_ANSWER', subjectId: 'sub-chem', gradeLevel: 10,
    difficulty: 'MEDIUM', status: 'PUBLISHED',
    body: 'Cân bằng phương trình phản ứng: Fe + HCl → FeCl₂ + H₂. Hệ số của Fe là bao nhiêu?',
    expectedAnswer: '1',
    tags: ['Oxi hoá khử'], createdAt: '08/05/2026', updatedAt: '10/05/2026', publishedAt: '10/05/2026',
  },
  {
    id: 'q6', authorId: 'tch-4', questionType: 'ESSAY', subjectId: 'sub-lit', gradeLevel: 11,
    difficulty: 'MEDIUM', status: 'PUBLISHED',
    body: 'Phân tích diễn biến tâm trạng của Thuý Kiều trong đoạn trích "Trao duyên" (Truyện Kiều — Nguyễn Du).',
    expectedAnswer: 'Chú ý phân tích cả nội dung và nghệ thuật; liên hệ bối cảnh xã hội phong kiến.',
    tags: ['Văn học VN'], createdAt: '14/05/2026', updatedAt: '20/05/2026', publishedAt: '20/05/2026',
  },
  {
    id: 'q7', authorId: 'me', questionType: 'FILL_IN', subjectId: 'sub-eng', gradeLevel: 10,
    difficulty: 'EASY', status: 'DRAFT',
    body: 'She ___ (go) to school every day.',
    expectedAnswer: 'goes',
    tags: ['Grammar', 'Present simple'], createdAt: '01/06/2026', updatedAt: '01/06/2026', publishedAt: null,
  },
];

// ── Shared sub-components ───────────────────────────────────────────────────

const qbStyles = {
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
    resize: 'vertical', boxSizing: 'border-box', minHeight: 96,
  },
};

const QBStatusChip = ({ status, t, size = 'md' }) => {
  const s = QB_STATUS[status] || QB_STATUS.DRAFT;
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

const QBTypeBadge = ({ type, t }) => {
  const meta = QB_TYPES[type] || QB_TYPES.ESSAY;
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

// Status not color-only: icon + label always shown (WCAG 2.1 AA).
const QBDifficultyBadge = ({ difficulty, t }) => {
  const meta = QB_DIFFICULTY[difficulty] || QB_DIFFICULTY.MEDIUM;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 6,
      background: meta.bg, color: meta.fg || meta.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <Icon name={meta.icon} size={11} color={meta.fg || meta.color} strokeWidth={2.2} />
      {t(meta.vi, meta.en)}
    </span>
  );
};

// Shared tag-chips input (same shape as lesson-plan.jsx LPTagChipsInput).
const QBTagChipsInput = ({ tags, onChange, t, disabled }) => {
  const [draft, setDraft] = React.useState('');
  const commit = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  };
  const remove = (tag) => onChange(tags.filter(x => x !== tag));
  return (
    <div style={{
      ...qbStyles.input, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
      padding: '7px 10px', minHeight: 40, background: disabled ? T.bg : '#fff',
    }}>
      {tags.map(tag => (
        <span key={tag} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6, background: T.primary + '12', color: T.primary,
          fontSize: 11.5, fontWeight: 700,
        }}>
          {tag}
          {!disabled && (
            <button type="button" onClick={() => remove(tag)}
              aria-label={t(`Xoá thẻ ${tag}`, `Remove tag ${tag}`)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
              <Icon name="x" size={11} color={T.primary} strokeWidth={2.4} />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
          onBlur={commit}
          placeholder={tags.length === 0 ? t('Nhập thẻ, Enter để thêm…', 'Type a tag, Enter to add…') : ''}
          style={{ flex: '1 1 100px', minWidth: 100, border: 'none', outline: 'none', fontSize: 12.5, fontFamily: 'inherit', background: 'transparent', color: T.textPrimary }} />
      )}
    </div>
  );
};

const QBDropdown = ({ label, value, options, onChange, icon, minWidth = 150 }) => {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <div style={{ position: 'relative', minWidth }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${T.border}`,
        background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
        color: T.textPrimary, fontWeight: 600, cursor: 'pointer', minHeight: 40,
      }}>
        {icon && <Icon name={icon} size={12} color={T.textMuted} />}
        <span style={{ color: T.textMuted, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 700 }}>{current?.label || '—'}</span>
        <Icon name="chevronDown" size={11} color={T.textMuted} />
      </button>
      {open && (
        <React.Fragment>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div role="listbox" style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 51,
            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 4, maxHeight: 280, overflowY: 'auto',
          }}>
            {options.map(o => (
              <button key={o.value} role="option" aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
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

// ── Question card (row list — mirrors exam-bank.jsx list layout) ───────────

const QBQuestionCard = ({ q, t, pColor, isMine, onOpen }) => {
  const subj = qbSubject(q.subjectId);
  const owner = qbOwner(q.authorId);
  const typeMeta = QB_TYPES[q.questionType] || QB_TYPES.ESSAY;

  return (
    <div style={{
      ...qbStyles.cardShell, padding: '18px 20px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
      transition: 'box-shadow 0.15s, transform 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 22px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${typeMeta.color}1A 0%, ${typeMeta.color}33 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={typeMeta.icon} size={22} color={typeMeta.color} strokeWidth={1.7} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, lineHeight: 1.45 }}>
              {qbTruncate(q.body, 140) || t('(Chưa nhập nội dung câu hỏi)', '(Empty question body)')}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: subj.color }}>{t(subj.vi, subj.en)}</span>
              <span style={{ color: T.border }}>·</span>
              <span>{t(`Lớp ${q.gradeLevel}`, `Grade ${q.gradeLevel}`)}</span>
              <span style={{ color: T.border }}>·</span>
              <QBTypeBadge type={q.questionType} t={t} />
              <QBDifficultyBadge difficulty={q.difficulty} t={t} />
              {!isMine && (
                <React.Fragment>
                  <span style={{ color: T.border }}>·</span>
                  <span>{t('Tác giả:', 'By:')} {t(owner.name, owner.en)}</span>
                </React.Fragment>
              )}
            </div>
            {q.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                {q.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '2px 8px', borderRadius: 99, background: T.bg, color: T.textSecondary,
                    fontSize: 10, fontWeight: 700,
                  }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <QBStatusChip status={q.status} t={t} />
        </div>

        <div style={{
          marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <button onClick={() => onOpen(q)} style={{
            padding: '6px 11px', borderRadius: 7,
            border: `1px solid ${pColor}25`, background: pColor + '08', color: pColor,
            fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 32,
          }}>
            <Icon name={isMine ? 'penLine' : 'eye'} size={11} color={pColor} strokeWidth={2.2} />
            {isMine ? t('Xem / Sửa', 'View / Edit') : t('Xem chi tiết', 'View detail')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Required-filter prompt state (distinct from generic empty-state) ──────
// BE returns 422 QUESTION_SEARCH_FILTER_REQUIRED when neither subjectId nor
// tag is set on /questions/search — this is a required-input prompt, not
// "no results found".

const QBFilterRequiredPrompt = ({ t, pColor }) => (
  <div style={{
    ...qbStyles.cardShell, padding: '64px 24px', textAlign: 'center',
    border: `1px dashed ${T.border}`,
  }}>
    <div style={{
      width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
      background: pColor + '0E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name="search" size={32} color={pColor + 'B0'} strokeWidth={1.6} />
    </div>
    <div style={{ fontSize: 15.5, fontWeight: 800, color: T.textPrimary, marginBottom: 6 }}>
      {t('Chọn môn học hoặc thẻ để tìm', 'Select a subject or tag to search')}
    </div>
    <div style={{ fontSize: 12.5, color: T.textMuted, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
      {t('Tìm kiếm ngân hàng câu hỏi toàn trường cần ít nhất một điều kiện lọc — chọn môn học hoặc nhập một thẻ để bắt đầu.',
         'Searching the school-wide question bank requires at least one filter — pick a subject or enter a tag to get started.')}
    </div>
  </div>
);

// ── List screen ─────────────────────────────────────────────────────────────

const QuestionBankScreen = ({ lang, primaryColor, role = 'teacher', mode = 'list', onModeChange, onNavigate }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isMobile = useQBIsMobile();

  const [questions, setQuestions] = React.useState(QB_SEED);
  const [scope, setScope] = React.useState('mine'); // 'mine' | 'search'
  const [filters, setFilters] = React.useState({ q: '', subject: 'all', grade: 'all', type: 'all', difficulty: 'all', status: 'all' });
  const [editingId, setEditingId] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [internalMode, setInternalMode] = React.useState('list');

  // Loading / error state machine — bộ chuẩn states.jsx.
  const [status, setStatus] = React.useState('ready'); // loading | error | ready (search resets to ready once filter satisfied)
  const failedOnce = React.useRef(false);

  const hasSearchFilter = filters.subject !== 'all' || filters.q.trim().length > 0;

  // Simulate a search fetch whenever scope='search' and the mandatory filter
  // becomes satisfied (subjectId or tag present) — mirrors the 422 gate: no
  // request is fired at all until the filter requirement is met client-side.
  React.useEffect(() => {
    if (scope !== 'search' || !hasSearchFilter) return;
    setStatus('loading');
    const id = window.setTimeout(() => setStatus('ready'), 550);
    return () => window.clearTimeout(id);
  }, [scope, filters.subject, filters.q, filters.grade, filters.type, filters.difficulty]);

  const refresh = () => {
    setStatus('loading');
    window.setTimeout(() => {
      if (!failedOnce.current) { failedOnce.current = true; setStatus('error'); }
      else setStatus('ready');
    }, 600);
  };

  const currentMode = onModeChange ? mode : internalMode;
  const setMode = (m) => { if (onModeChange) onModeChange(m); else setInternalMode(m); };

  const showToast = (msg) => { setToast(msg); window.setTimeout(() => setToast(null), 2400); };

  const visible = React.useMemo(() => {
    let arr = questions;
    arr = scope === 'mine' ? arr.filter(q => q.authorId === 'me') : arr.filter(q => q.status === 'PUBLISHED');
    if (filters.subject !== 'all') arr = arr.filter(q => q.subjectId === filters.subject);
    if (filters.grade !== 'all')   arr = arr.filter(q => String(q.gradeLevel) === filters.grade);
    if (filters.type !== 'all')    arr = arr.filter(q => q.questionType === filters.type);
    if (filters.difficulty !== 'all') arr = arr.filter(q => q.difficulty === filters.difficulty);
    if (filters.status !== 'all' && scope === 'mine') arr = arr.filter(q => q.status === filters.status);
    if (filters.q.trim()) {
      const qq = filters.q.toLowerCase();
      arr = arr.filter(q => q.body.toLowerCase().includes(qq) || q.tags.some(tag => tag.toLowerCase().includes(qq)));
    }
    return arr;
  }, [questions, filters, scope]);

  const handleCreateNew = () => { setEditingId(null); setMode('builder'); };
  const handleOpen = (q) => { setEditingId(q.id); setMode('builder'); };
  const handleSave = (payload) => {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === payload.id);
      if (idx === -1) return [{ ...payload, authorId: 'me' }, ...prev];
      const next = [...prev];
      next[idx] = { ...next[idx], ...payload };
      return next;
    });
    setMode('list');
    setEditingId(null);
    showToast(payload.status === 'PUBLISHED'
      ? t('Đã phát hành câu hỏi.', 'Question published.')
      : t('Đã lưu nháp.', 'Draft saved.'));
  };

  const filtersDirty = filters.grade !== 'all' || filters.type !== 'all' || filters.difficulty !== 'all' || (scope === 'mine' && filters.status !== 'all');
  const ownCount = questions.filter(q => q.authorId === 'me').length;
  const pubCount = questions.filter(q => q.status === 'PUBLISHED').length;

  const clearFilters = () => setFilters({ q: '', subject: 'all', grade: 'all', type: 'all', difficulty: 'all', status: 'all' });

  if (currentMode === 'builder') {
    const editing = editingId ? questions.find(q => q.id === editingId) : null;
    return (
      <QuestionBankBuilderScreen
        lang={lang} primaryColor={primaryColor}
        question={editing}
        onCancel={() => { setMode('list'); setEditingId(null); }}
        onSave={handleSave}
      />
    );
  }

  const showSearchGate = scope === 'search' && !hasSearchFilter;

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px' : '24px 32px', background: T.bg, position: 'relative' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              US-E18.16 · {t('Ngân hàng câu hỏi', 'Question Bank')}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.textPrimary, marginTop: 4 }}>
              {scope === 'mine' ? t('Câu hỏi của tôi', 'My Questions') : t('Tìm kiếm ngân hàng câu hỏi toàn trường', 'Search School-wide Question Bank')}
            </div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              {scope === 'mine'
                ? t(`Bạn có ${ownCount} câu hỏi.`, `You have ${ownCount} questions.`)
                : t('Chỉ hiển thị câu hỏi đã phát hành từ toàn trường.', 'Only published questions from the whole school are shown.')}
            </div>
          </div>
          <div style={{ display: 'flex', borderRadius: 9, border: `1.5px solid ${T.border}`, overflow: 'hidden', background: '#fff' }} role="group" aria-label={t('Phạm vi xem', 'View scope')}>
            {[
              { id: 'mine',   label: t('Của tôi', 'Mine'), count: ownCount },
              { id: 'search', label: t('Tìm kiếm', 'Search'), count: pubCount },
            ].map(o => (
              <button key={o.id} onClick={() => setScope(o.id)} aria-pressed={scope === o.id}
                style={{
                  padding: '8px 14px', border: 'none',
                  background: scope === o.id ? pColor + '14' : 'transparent',
                  color: scope === o.id ? pColor : T.textSecondary,
                  fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40,
                }}>
                {o.label}
                <span style={{
                  padding: '1px 7px', borderRadius: 99,
                  background: scope === o.id ? pColor : T.border,
                  color: scope === o.id ? '#fff' : T.textSecondary,
                  fontSize: 10, fontWeight: 800,
                }}>{o.count}</span>
              </button>
            ))}
          </div>
          <Button onClick={handleCreateNew} icon="plus">{t('Tạo câu hỏi mới', 'Create question')}</Button>
        </div>

        {/* Filter bar */}
        <div style={{ ...qbStyles.cardShell, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
            <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              aria-label={scope === 'search'
                ? t('Tìm theo thẻ hoặc nội dung câu hỏi (bắt buộc nếu không chọn môn)', 'Search by tag or question body (required if subject is not set)')
                : t('Tìm theo nội dung hoặc thẻ', 'Search by body or tag')}
              placeholder={scope === 'search'
                ? t('Nhập thẻ hoặc từ khoá…', 'Enter a tag or keyword…')
                : t('Tìm theo nội dung hoặc thẻ…', 'Search by body or tag…')}
              style={{
                width: '100%', padding: '9px 12px 9px 34px', borderRadius: 9,
                border: `1.5px solid ${T.border}`, fontSize: 12.5, fontFamily: 'inherit',
                background: '#fff', color: T.textPrimary, outline: 'none', boxSizing: 'border-box', minHeight: 40,
              }} />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
              <Icon name="search" size={14} color={T.textMuted} />
            </span>
          </div>
          <QBDropdown label={t('Môn', 'Subject')} icon="bookOpen" value={filters.subject}
            onChange={v => setFilters(f => ({ ...f, subject: v }))}
            options={[{ value: 'all', label: t('Tất cả môn', 'All subjects') }, ...QB_SUBJECTS.map(s => ({ value: s.id, label: t(s.vi, s.en) }))]}
            minWidth={170} />
          <QBDropdown label={t('Khối', 'Grade')} icon="graduationCap" value={filters.grade}
            onChange={v => setFilters(f => ({ ...f, grade: v }))}
            options={[{ value: 'all', label: t('Tất cả khối', 'All grades') }, ...QB_GRADES.map(g => ({ value: String(g), label: t(`Lớp ${g}`, `Grade ${g}`) }))]}
            minWidth={130} />
          <QBDropdown label={t('Loại', 'Type')} icon="layers" value={filters.type}
            onChange={v => setFilters(f => ({ ...f, type: v }))}
            options={[{ value: 'all', label: t('Tất cả loại', 'All types') }, ...Object.entries(QB_TYPES).map(([k, v]) => ({ value: k, label: t(v.vi, v.en) }))]}
            minWidth={150} />
          <QBDropdown label={t('Độ khó', 'Difficulty')} icon="flag" value={filters.difficulty}
            onChange={v => setFilters(f => ({ ...f, difficulty: v }))}
            options={[{ value: 'all', label: t('Tất cả độ khó', 'All difficulty') }, ...Object.entries(QB_DIFFICULTY).map(([k, v]) => ({ value: k, label: t(v.vi, v.en) }))]}
            minWidth={150} />
          {scope === 'mine' && (
            <QBDropdown label={t('Trạng thái', 'Status')} icon="checkSquare" value={filters.status}
              onChange={v => setFilters(f => ({ ...f, status: v }))}
              options={[
                { value: 'all', label: t('Tất cả', 'All') },
                { value: 'DRAFT', label: t('Nháp', 'Draft') },
                { value: 'PUBLISHED', label: t('Đã phát hành', 'Published') },
              ]} minWidth={150} />
          )}
          {scope === 'search' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: hasSearchFilter ? T.success : T.warningText, fontWeight: 700 }}>
              <Icon name={hasSearchFilter ? 'check' : 'alertTriangle'} size={12} color={hasSearchFilter ? T.success : T.warningText} />
              {hasSearchFilter
                ? t('Đủ điều kiện tìm kiếm', 'Search filter satisfied')
                : t('Cần chọn môn hoặc nhập thẻ', 'Subject or tag required')}
            </div>
          )}
        </div>

        {/* States */}
        {showSearchGate ? (
          <QBFilterRequiredPrompt t={t} pColor={pColor} />
        ) : status === 'loading' ? (
          <EduSkeleton variant="rows" count={4} lang={lang} />
        ) : status === 'error' ? (
          <EduError lang={lang} onRetry={refresh}
            title={t('Không tải được ngân hàng câu hỏi', 'Could not load the question bank')}
            desc={t('Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại.', 'Something went wrong while contacting the server. Please try again.')} />
        ) : visible.length === 0 ? (
          filtersDirty || filters.q.trim() || filters.subject !== 'all' ? (
            <EduEmpty lang={lang} icon="search" color={T.textMuted}
              title={t('Không có câu hỏi nào phù hợp.', 'No questions match these filters.')}
              desc={t('Thử bỏ chọn bộ lọc hoặc đổi từ khoá/thẻ tìm kiếm.', 'Try clearing filters or changing the search query/tag.')}
              action={{ label: t('Bỏ lọc', 'Clear filters'), icon: 'x', onClick: clearFilters }} />
          ) : (
            <EduEmpty lang={lang} icon="clipboardList" color={pColor}
              title={t('Chưa có câu hỏi nào.', 'No questions yet.')}
              desc={t('Bắt đầu tạo câu hỏi đầu tiên — chọn loại câu hỏi, nhập nội dung và đáp án, lưu nháp hoặc phát hành.', 'Start your first question — pick a type, fill in the body and expected answer, save a draft or publish.')}
              action={{ label: t('Tạo câu hỏi mới', 'Create question'), icon: 'plus', onClick: handleCreateNew }} />
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map(q => (
              <QBQuestionCard key={q.id} q={q} t={t} pColor={pColor}
                isMine={scope === 'mine'} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1F2937', color: '#fff', padding: '10px 18px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'qb-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="check" size={14} color={T.success} strokeWidth={2.6} />
          {toast}
        </div>
      )}

      <style>{`
        @keyframes qb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes qb-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  );
};

// ── Builder — single column ──────────────────────────────────────────────────

const QuestionBankBuilderScreen = ({ lang, primaryColor, question, onCancel, onSave }) => {
  const t = (vi, en) => lang === 'en' ? en : vi;
  const pColor = primaryColor || T.primary;
  const isEdit = !!question;
  const isMobile = useQBIsMobile();

  const initial = question || {
    id: `q${Date.now()}`,
    questionType: 'ESSAY', subjectId: 'sub-math', gradeLevel: 10, difficulty: 'MEDIUM',
    status: 'DRAFT', body: '', expectedAnswer: '', tags: [],
    createdAt: qbToday(), updatedAt: qbToday(), publishedAt: null,
  };

  const [draft, setDraft] = React.useState(initial);
  const [touched, setTouched] = React.useState({});
  const [isDirty, setIsDirty] = React.useState(false);
  const [confirmPublish, setConfirmPublish] = React.useState(false);
  const [flash, setFlash] = React.useState(null);

  const isLocked = draft.status === 'PUBLISHED'; // one-way DRAFT→PUBLISHED — locked once published

  const updateField = (k, v) => { if (isLocked) return; setDraft(d => ({ ...d, [k]: v })); setIsDirty(true); };
  const markTouched = (k) => setTouched(tt => ({ ...tt, [k]: true }));

  const bodyOk = draft.body.trim().length >= 4;
  const answerOk = draft.expectedAnswer.trim().length > 0;
  const canPublish = bodyOk && answerOk;

  const handleSaveDraft = () => {
    onSave({ ...draft, status: 'DRAFT', updatedAt: qbToday() });
    setIsDirty(false);
  };
  const handlePublishClick = () => {
    setTouched({ body: true, expectedAnswer: true });
    if (!canPublish) {
      setFlash({ kind: 'error', msg: t('Cần điền nội dung câu hỏi và đáp án mong đợi trước khi phát hành.', 'Question body and expected answer must be filled before publishing.') });
      window.setTimeout(() => setFlash(null), 3200);
      return;
    }
    setConfirmPublish(true);
  };
  const handleConfirmPublish = () => {
    onSave({ ...draft, status: 'PUBLISHED', publishedAt: qbToday(), updatedAt: qbToday() });
    setIsDirty(false);
    setConfirmPublish(false);
  };

  const typeMeta = QB_TYPES[draft.questionType] || QB_TYPES.ESSAY;
  const bodyRows = draft.questionType === 'ESSAY' ? 6 : draft.questionType === 'FILL_IN' ? 3 : 4;
  const answerRows = draft.questionType === 'ESSAY' ? 4 : 2;

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        background: T.card, borderBottom: `1px solid ${T.border}`,
        padding: isMobile ? '12px 16px' : '14px 24px', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <button onClick={onCancel} style={{
          padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
          background: '#fff', color: T.textSecondary, fontSize: 12.5, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <Icon name="chevronLeft" size={12} color={T.textSecondary} />
          {t('Về ngân hàng câu hỏi', 'Back to question bank')}
        </button>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            US-E18.16 · {isEdit ? t('Chỉnh sửa câu hỏi', 'Edit question') : t('Tạo câu hỏi mới', 'Create question')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.textPrimary, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {qbTruncate(draft.body, 60) || t('— Chưa nhập câu hỏi —', '— Empty question —')}
          </div>
        </div>
        <QBStatusChip status={draft.status} t={t} />
        {!isLocked && (
          <React.Fragment>
            <button onClick={handleSaveDraft} style={{
              padding: '9px 16px', borderRadius: 8, border: `1.5px solid ${T.border}`,
              background: '#fff', color: T.textSecondary, fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="penLine" size={12} color={T.textSecondary} strokeWidth={2.2} />
              {t('Lưu nháp', 'Save draft')}
            </button>
            <button onClick={handlePublishClick} style={{
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: canPublish ? T.success : T.textMuted,
              color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: canPublish ? 'pointer' : 'not-allowed', minHeight: 40,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />
              {t('Phát hành', 'Publish')}
            </button>
          </React.Fragment>
        )}
      </div>

      {isLocked && (
        <div role="status" style={{
          background: T.successLight, borderBottom: `1px solid ${T.border}`,
          padding: '10px 24px', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.textSecondary,
        }}>
          <Icon name="lock" size={13} color={T.success} strokeWidth={2.2} />
          {t('Câu hỏi đã phát hành và không thể chỉnh sửa (một chiều DRAFT → PUBLISHED).',
             'This question is published and read-only (one-way DRAFT → PUBLISHED).')}
        </div>
      )}

      {isDirty && !isLocked && (
        <div style={{
          background: T.warning + '0E', borderBottom: `1px solid ${T.border}`,
          padding: '6px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.warning, boxShadow: `0 0 0 3px ${T.warning}25` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: T.warningText }}>{t('Chưa lưu', 'Unsaved changes')}</span>
        </div>
      )}

      {/* Single-column form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px 16px' : '20px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Question type selector */}
          <div style={qbStyles.cardShell}>
            <div style={{ padding: 18 }}>
              <label style={qbStyles.fieldLabel}>{t('Loại câu hỏi', 'Question type')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(QB_TYPES).map(([k, meta]) => {
                  const active = draft.questionType === k;
                  return (
                    <button key={k} disabled={isLocked} onClick={() => updateField('questionType', k)}
                      style={{
                        flex: '1 1 140px', padding: '10px 12px', borderRadius: 9,
                        border: `1.5px solid ${active ? meta.color + '55' : T.border}`,
                        background: active ? meta.color + '12' : '#fff',
                        color: active ? meta.color : T.textSecondary,
                        fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                        cursor: isLocked ? 'not-allowed' : 'pointer', minHeight: 44,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      <Icon name={meta.icon} size={13} color={active ? meta.color : T.textSecondary} strokeWidth={2.2} />
                      {t(meta.vi, meta.en)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subject / grade / difficulty */}
          <div style={qbStyles.cardShell}>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr 1fr', gap: 14 }}>
              <div>
                <label htmlFor="qb-subject" style={qbStyles.fieldLabel}>{t('Môn học', 'Subject')}</label>
                <select id="qb-subject" value={draft.subjectId} disabled={isLocked}
                  onChange={e => updateField('subjectId', e.target.value)}
                  style={{ ...qbStyles.input, background: isLocked ? T.bg : '#fff' }}>
                  {QB_SUBJECTS.map(s => <option key={s.id} value={s.id}>{t(s.vi, s.en)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="qb-grade" style={qbStyles.fieldLabel}>{t('Khối lớp', 'Grade')}</label>
                <select id="qb-grade" value={draft.gradeLevel} disabled={isLocked}
                  onChange={e => updateField('gradeLevel', +e.target.value)}
                  style={{ ...qbStyles.input, background: isLocked ? T.bg : '#fff' }}>
                  {QB_GRADES.map(g => <option key={g} value={g}>{t(`Lớp ${g}`, `Grade ${g}`)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="qb-difficulty" style={qbStyles.fieldLabel}>{t('Độ khó', 'Difficulty')}</label>
                <select id="qb-difficulty" value={draft.difficulty} disabled={isLocked}
                  onChange={e => updateField('difficulty', e.target.value)}
                  style={{ ...qbStyles.input, background: isLocked ? T.bg : '#fff' }}>
                  {Object.entries(QB_DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{t(v.vi, v.en)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={qbStyles.cardShell}>
            <div style={{ padding: 18 }}>
              <label htmlFor="qb-body" style={qbStyles.fieldLabel}>
                {t('Nội dung câu hỏi', 'Question body')} <span style={{ color: T.error }}>*</span>
                {draft.questionType === 'FILL_IN' && (
                  <span style={{ marginLeft: 6, color: T.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'none', letterSpacing: 'normal' }}>
                    · {t('Dùng ___ để đánh dấu chỗ trống', 'Use ___ to mark blanks')}
                  </span>
                )}
              </label>
              <textarea id="qb-body" value={draft.body} disabled={isLocked}
                onChange={e => updateField('body', e.target.value)} onBlur={() => markTouched('body')}
                aria-invalid={touched.body && !bodyOk} aria-describedby={touched.body && !bodyOk ? 'qb-body-err' : undefined}
                rows={bodyRows}
                placeholder={draft.questionType === 'FILL_IN'
                  ? t('VD: Phương trình x² − 5x + 6 = 0 có hai nghiệm là x₁ = ___ và x₂ = ___.', 'e.g. The equation x² − 5x + 6 = 0 has two roots x₁ = ___ and x₂ = ___.')
                  : t('VD: Trình bày nguyên lý chồng chất điện trường…', 'e.g. Explain the principle of electric field superposition…')}
                style={{ ...qbStyles.textarea, borderColor: touched.body && !bodyOk ? T.error : T.border, background: isLocked ? T.bg : '#fff' }} />
              {touched.body && !bodyOk && (
                <div id="qb-body-err" role="alert" style={{ marginTop: 6, fontSize: 11, color: T.errorText, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alertTriangle" size={11} color={T.errorText} />
                  {t('Nội dung câu hỏi cần tối thiểu 4 ký tự.', 'Question body must be at least 4 characters.')}
                </div>
              )}
            </div>
          </div>

          {/* Expected answer */}
          <div style={qbStyles.cardShell}>
            <div style={{ padding: 18 }}>
              <label htmlFor="qb-answer" style={qbStyles.fieldLabel}>
                {t('Đáp án mong đợi', 'Expected answer')} <span style={{ color: T.error }}>*</span>
                <span style={{ marginLeft: 6, color: T.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'none', letterSpacing: 'normal' }}>
                  · {t('Dùng để chấm/tham khảo', 'Used for grading reference')}
                </span>
              </label>
              <textarea id="qb-answer" value={draft.expectedAnswer} disabled={isLocked}
                onChange={e => updateField('expectedAnswer', e.target.value)} onBlur={() => markTouched('expectedAnswer')}
                aria-invalid={touched.expectedAnswer && !answerOk} aria-describedby={touched.expectedAnswer && !answerOk ? 'qb-answer-err' : undefined}
                rows={answerRows}
                placeholder={t('VD: t = sin(x); t = 1 hoặc t = 1/2…', 'e.g. t = sin(x); t = 1 or t = 1/2…')}
                style={{ ...qbStyles.textarea, minHeight: 60, borderColor: touched.expectedAnswer && !answerOk ? T.error : T.border, background: isLocked ? T.bg : '#fff' }} />
              {touched.expectedAnswer && !answerOk && (
                <div id="qb-answer-err" role="alert" style={{ marginTop: 6, fontSize: 11, color: T.errorText, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="alertTriangle" size={11} color={T.errorText} />
                  {t('Cần điền đáp án mong đợi.', 'Expected answer is required.')}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div style={qbStyles.cardShell}>
            <div style={{ padding: 18 }}>
              <label style={qbStyles.fieldLabel}>{t('Thẻ', 'Tags')}</label>
              <QBTagChipsInput tags={draft.tags} onChange={v => updateField('tags', v)} t={t} disabled={isLocked} />
              <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted }}>
                {t('Thẻ giúp giáo viên khác tìm được câu hỏi này khi tìm kiếm toàn trường.', 'Tags help other teachers find this question when searching school-wide.')}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span>{t('Tạo:', 'Created:')} {draft.createdAt}</span>
            {draft.publishedAt && <span>{t('Phát hành:', 'Published:')} {draft.publishedAt}</span>}
          </div>
        </div>
      </div>

      {confirmPublish && (
        <QBConfirmDialog t={t} pColor={pColor}
          title={t('Phát hành câu hỏi?', 'Publish question?')}
          message={t('Câu hỏi sẽ chuyển sang trạng thái Đã phát hành và không thể chỉnh sửa thêm (một chiều). Giáo viên khác trong trường có thể tìm thấy và sử dụng câu hỏi này.',
                     'The question will move to Published and can no longer be edited (one-way). Other teachers in the school will be able to find and use it.')}
          confirmLabel={t('Phát hành', 'Publish')} confirmIcon="check"
          onCancel={() => setConfirmPublish(false)}
          onConfirm={handleConfirmPublish} />
      )}

      {flash && (
        <div role="alert" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: flash.kind === 'error' ? T.error : '#1F2937', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 1100,
          animation: 'qb-toast-in 0.2s ease-out', display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          <Icon name="alertTriangle" size={14} color="#fff" strokeWidth={2.4} />
          {flash.msg}
        </div>
      )}

      <style>{`
        @keyframes qb-toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes qb-fadein   { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </main>
  );
};

// ── Confirm dialog (publish — one-way) ─────────────────────────────────────

const QBConfirmDialog = ({ title, message, confirmLabel, confirmIcon, t, pColor, onCancel, onConfirm }) => (
  <React.Fragment>
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(20,30,50,0.55)', zIndex: 1100, backdropFilter: 'blur(2px)' }} />
    <div role="dialog" aria-modal="true" aria-label={title} style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      width: 440, maxWidth: 'calc(100vw - 32px)', background: T.card,
      borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.24)', zIndex: 1101,
      padding: 24, animation: 'qb-fadein 0.18s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: (pColor || T.primary) + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="check" size={20} color={pColor || T.primary} strokeWidth={2.2} />
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
          background: pColor || T.primary, color: '#fff', fontSize: 13, fontWeight: 700,
          fontFamily: 'inherit', cursor: 'pointer', minHeight: 40,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name={confirmIcon || 'check'} size={12} color="#fff" strokeWidth={2.4} />
          {confirmLabel}
        </button>
      </div>
    </div>
  </React.Fragment>
);

Object.assign(window, { QuestionBankScreen, QuestionBankBuilderScreen });
